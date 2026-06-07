import type { Express, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import {
  restaurantTables,
  menuCategories,
  menuItems,
  restaurantOrders,
  restaurantOrderItems,
  stores,
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

type AuthHelpers = {
  requireAuth: (req: any, res: any, next: any) => void;
  getEffectiveStoreId: (req: any) => number | null;
  sendValidationError: (res: Response, error: z.ZodError) => Response;
};

async function requireRestaurantStore(storeId: number) {
  const store = await storage.getStore(storeId);
  if (!store || store.posSystem !== "restaurant") return null;
  return store;
}

function genOrderNumber() {
  return `RST-${Date.now().toString(36).toUpperCase()}`;
}

type SerializedOrderItem = {
  id: number;
  menuItemId: number | null;
  name: string;
  quantity: number;
  price: string;
  notes: string | null;
};

function serializeOrderItem(row: typeof restaurantOrderItems.$inferSelect): SerializedOrderItem {
  return {
    id: row.id,
    menuItemId: row.menuItemId,
    name: row.name,
    quantity: row.quantity,
    price: String(row.price),
    notes: row.notes,
  };
}

async function enrichOrders(rows: (typeof restaurantOrders.$inferSelect)[]) {
  if (rows.length === 0) return [];

  const orderIds = rows.map((o) => o.id);
  const tableIds = [...new Set(rows.map((o) => o.tableId).filter((id): id is number => id != null))];

  const itemRows = await db.select().from(restaurantOrderItems).where(inArray(restaurantOrderItems.orderId, orderIds));
  const itemsByOrderId = new Map<number, SerializedOrderItem[]>();
  for (const item of itemRows) {
    const list = itemsByOrderId.get(item.orderId) ?? [];
    list.push(serializeOrderItem(item));
    itemsByOrderId.set(item.orderId, list);
  }

  const tablesById = new Map<number, typeof restaurantTables.$inferSelect>();
  if (tableIds.length > 0) {
    const tableRows = await db.select().from(restaurantTables).where(inArray(restaurantTables.id, tableIds));
    for (const t of tableRows) tablesById.set(t.id, t);
  }

  return rows.map((o) => ({
    ...o,
    subtotal: String(o.subtotal),
    total: String(o.total),
    items: itemsByOrderId.get(o.id) ?? [],
    table: o.tableId ? tablesById.get(o.tableId) ?? null : null,
  }));
}

async function createOrderWithItems(
  orderValues: typeof restaurantOrders.$inferInsert,
  lineItems: { menuItemId: number; name: string; price: string; quantity: number; notes?: string | null }[],
  occupyTableId?: number | null,
) {
  return db.transaction(async (tx) => {
    const [order] = await tx.insert(restaurantOrders).values(orderValues).returning();
    const items: SerializedOrderItem[] = [];
    for (const li of lineItems) {
      const [row] = await tx.insert(restaurantOrderItems).values({
        orderId: order.id,
        menuItemId: li.menuItemId,
        name: li.name,
        price: li.price,
        quantity: li.quantity,
        notes: li.notes || null,
      }).returning();
      items.push(serializeOrderItem(row));
    }
    if (occupyTableId) {
      await tx.update(restaurantTables).set({ status: "occupied" }).where(eq(restaurantTables.id, occupyTableId));
    }
    return { order, items };
  });
}

const publicOrderSchema = z.object({
  tableId: z.number().int().positive().optional(),
  tableNumber: z.number().int().positive().optional(),
  orderType: z.enum(["dine_in", "pickup", "delivery", "qr"]).default("qr"),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  items: z.array(z.object({
    menuItemId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1),
});

const staffOrderSchema = z.object({
  tableId: z.number().int().positive().nullable().optional(),
  orderType: z.enum(["dine_in", "pickup", "delivery", "qr"]).default("dine_in"),
  source: z.enum(["staff", "qr", "online"]).default("staff"),
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  items: z.array(z.object({
    menuItemId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1),
});

export function registerRestaurantRoutes(app: Express, helpers: AuthHelpers) {
  const { requireAuth, getEffectiveStoreId, sendValidationError } = helpers;

  // ── Public (Belly-style guest ordering) ─────────────────────
  app.get("/api/public/restaurant/:storeId/menu", async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    if (!storeId) return res.status(400).json({ message: "Invalid store" });
    const store = await requireRestaurantStore(storeId);
    if (!store || !store.isActive) return res.status(404).json({ message: "Restaurant not found" });

    const categories = await db.select().from(menuCategories)
      .where(and(eq(menuCategories.storeId, storeId), eq(menuCategories.isActive, true)))
      .orderBy(menuCategories.sortOrder);

    const items = await db.select().from(menuItems)
      .where(and(eq(menuItems.storeId, storeId), eq(menuItems.isAvailable, true)))
      .orderBy(menuItems.sortOrder);

    const tables = await db.select().from(restaurantTables)
      .where(eq(restaurantTables.storeId, storeId))
      .orderBy(restaurantTables.tableNumber);

    res.json({
      store: {
        id: store.id,
        name: store.name,
        brandColor: store.brandColor,
        logoUrl: store.logoUrl,
      },
      categories,
      items,
      tables,
    });
  });

  app.post("/api/public/restaurant/:storeId/orders", async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    if (!storeId) return res.status(400).json({ message: "Invalid store" });
    const store = await requireRestaurantStore(storeId);
    if (!store || !store.isActive) return res.status(404).json({ message: "Restaurant not found" });

    const parsed = publicOrderSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

    let tableId = parsed.data.tableId ?? null;
    if (!tableId && parsed.data.tableNumber) {
      const [tbl] = await db.select().from(restaurantTables)
        .where(and(eq(restaurantTables.storeId, storeId), eq(restaurantTables.tableNumber, parsed.data.tableNumber)));
      if (tbl) tableId = tbl.id;
    }

    const menuIds = parsed.data.items.map((i) => i.menuItemId);
    const menuRows = await db.select().from(menuItems)
      .where(and(eq(menuItems.storeId, storeId), inArray(menuItems.id, menuIds)));
    const menuMap = new Map(menuRows.map((m) => [m.id, m]));

    let subtotal = 0;
    const lineItems: { menuItemId: number; name: string; price: string; quantity: number; notes?: string }[] = [];
    for (const item of parsed.data.items) {
      const menu = menuMap.get(item.menuItemId);
      if (!menu || !menu.isAvailable) {
        return res.status(400).json({ message: `Item unavailable: ${item.menuItemId}` });
      }
      const price = parseFloat(menu.price);
      subtotal += price * item.quantity;
      lineItems.push({
        menuItemId: menu.id,
        name: menu.name,
        price: menu.price,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    const { order, items } = await createOrderWithItems(
      {
        storeId,
        orderNumber: genOrderNumber(),
        tableId,
        orderType: parsed.data.orderType,
        status: "pending",
        source: "qr",
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone || null,
        notes: parsed.data.notes || null,
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2),
        paymentStatus: "unpaid",
      },
      lineItems,
      tableId,
    );

    const [enriched] = await enrichOrders([order]);
    res.status(201).json({ ...enriched, items });
  });

  // ── Staff: dashboard stats ──────────────────────────────────
  app.get("/api/restaurant/stats", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    if (!(await requireRestaurantStore(storeId))) return res.status(400).json({ message: "Not a restaurant store" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allOrders = await db.select().from(restaurantOrders).where(eq(restaurantOrders.storeId, storeId));
    const todayOrders = allOrders.filter((o) => new Date(o.createdAt) >= today && o.status !== "cancelled");
    const pending = allOrders.filter((o) => ["pending", "accepted", "preparing"].includes(o.status));
    const tables = await db.select().from(restaurantTables).where(eq(restaurantTables.storeId, storeId));
    const menuCount = await db.select().from(menuItems).where(eq(menuItems.storeId, storeId));

    res.json({
      todayOrders: todayOrders.length,
      todaySales: todayOrders.reduce((s, o) => s + parseFloat(o.total), 0),
      pendingOrders: pending.length,
      occupiedTables: tables.filter((t) => t.status === "occupied").length,
      totalTables: tables.length,
      menuItems: menuCount.length,
    });
  });

  // ── Tables ──────────────────────────────────────────────────
  app.get("/api/restaurant/tables", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const rows = await db.select().from(restaurantTables)
      .where(eq(restaurantTables.storeId, storeId))
      .orderBy(restaurantTables.tableNumber);
    res.json(rows);
  });

  app.post("/api/restaurant/tables", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const tableNumber = parseInt(String(req.body.tableNumber), 10);
    if (!tableNumber) return res.status(400).json({ message: "tableNumber required" });
    const [created] = await db.insert(restaurantTables).values({
      storeId,
      tableNumber,
      name: req.body.name || `Table ${tableNumber}`,
      section: req.body.section || "main",
      status: "free",
    }).returning();
    res.status(201).json(created);
  });

  app.patch("/api/restaurant/tables/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    const [updated] = await db.update(restaurantTables).set({
      status: req.body.status,
      name: req.body.name,
      section: req.body.section,
    }).where(and(eq(restaurantTables.id, id), eq(restaurantTables.storeId, storeId))).returning();
    if (!updated) return res.status(404).json({ message: "Table not found" });
    res.json(updated);
  });

  app.delete("/api/restaurant/tables/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    await db.delete(restaurantTables).where(and(eq(restaurantTables.id, id), eq(restaurantTables.storeId, storeId)));
    res.sendStatus(204);
  });

  // ── Menu categories ─────────────────────────────────────────
  app.get("/api/restaurant/menu/categories", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const rows = await db.select().from(menuCategories)
      .where(eq(menuCategories.storeId, storeId))
      .orderBy(menuCategories.sortOrder);
    res.json(rows);
  });

  app.post("/api/restaurant/menu/categories", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const [created] = await db.insert(menuCategories).values({
      storeId,
      name: req.body.name,
      nameAr: req.body.nameAr || null,
      sortOrder: req.body.sortOrder ?? 0,
      isActive: req.body.isActive ?? true,
    }).returning();
    res.status(201).json(created);
  });

  app.patch("/api/restaurant/menu/categories/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    const [updated] = await db.update(menuCategories).set(req.body)
      .where(and(eq(menuCategories.id, id), eq(menuCategories.storeId, storeId))).returning();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/restaurant/menu/categories/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    await db.delete(menuItems).where(and(eq(menuItems.categoryId, id), eq(menuItems.storeId, storeId)));
    await db.delete(menuCategories).where(and(eq(menuCategories.id, id), eq(menuCategories.storeId, storeId)));
    res.sendStatus(204);
  });

  // ── Menu items ──────────────────────────────────────────────
  app.get("/api/restaurant/menu/items", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const rows = await db.select().from(menuItems)
      .where(eq(menuItems.storeId, storeId))
      .orderBy(menuItems.sortOrder);
    res.json(rows);
  });

  app.post("/api/restaurant/menu/items", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const [created] = await db.insert(menuItems).values({
      storeId,
      categoryId: req.body.categoryId,
      name: req.body.name,
      nameAr: req.body.nameAr || null,
      description: req.body.description || null,
      descriptionAr: req.body.descriptionAr || null,
      price: String(req.body.price),
      imageUrl: req.body.imageUrl || null,
      isAvailable: req.body.isAvailable ?? true,
      sortOrder: req.body.sortOrder ?? 0,
    }).returning();
    res.status(201).json(created);
  });

  app.patch("/api/restaurant/menu/items/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    const data = { ...req.body };
    if (data.price !== undefined) data.price = String(data.price);
    const [updated] = await db.update(menuItems).set(data)
      .where(and(eq(menuItems.id, id), eq(menuItems.storeId, storeId))).returning();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/restaurant/menu/items/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.storeId, storeId)));
    res.sendStatus(204);
  });

  // ── Orders ──────────────────────────────────────────────────
  app.get("/api/restaurant/orders", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const status = req.query.status as string | undefined;
    let rows = await db.select().from(restaurantOrders)
      .where(eq(restaurantOrders.storeId, storeId))
      .orderBy(desc(restaurantOrders.createdAt));
    if (status) rows = rows.filter((o) => o.status === status);
    res.json(await enrichOrders(rows));
  });

  app.post("/api/restaurant/orders", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const parsed = staffOrderSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

    const menuIds = parsed.data.items.map((i) => i.menuItemId);
    const menuRows = await db.select().from(menuItems)
      .where(and(eq(menuItems.storeId, storeId), inArray(menuItems.id, menuIds)));

    let subtotal = 0;
    const lineItems: { menuItemId: number; name: string; price: string; quantity: number; notes?: string }[] = [];
    for (const item of parsed.data.items) {
      const menu = menuRows.find((m) => m.id === item.menuItemId);
      if (!menu) return res.status(400).json({ message: "Invalid menu item" });
      subtotal += parseFloat(menu.price) * item.quantity;
      lineItems.push({ menuItemId: menu.id, name: menu.name, price: menu.price, quantity: item.quantity, notes: item.notes });
    }

    const { order, items } = await createOrderWithItems(
      {
        storeId,
        orderNumber: genOrderNumber(),
        tableId: parsed.data.tableId ?? null,
        orderType: parsed.data.orderType,
        status: "accepted",
        source: parsed.data.source,
        customerName: parsed.data.customerName || null,
        customerPhone: parsed.data.customerPhone || null,
        notes: parsed.data.notes || null,
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2),
        paymentStatus: "unpaid",
      },
      lineItems,
      parsed.data.tableId ?? null,
    );

    const [enriched] = await enrichOrders([order]);
    res.status(201).json({ ...enriched, items });
  });

  app.patch("/api/restaurant/orders/:id/status", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    const status = req.body.status;
    const paymentStatus = req.body.paymentStatus;
    const validStatuses = ["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled"];
    if (!validStatuses.includes(status) && !paymentStatus) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const [existing] = await db.select().from(restaurantOrders)
      .where(and(eq(restaurantOrders.id, id), eq(restaurantOrders.storeId, storeId)));
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    const [updated] = await db.update(restaurantOrders).set(updates)
      .where(eq(restaurantOrders.id, id)).returning();

    if (status === "completed" || status === "cancelled") {
      if (existing.tableId) {
        await db.update(restaurantTables).set({ status: "free" }).where(eq(restaurantTables.id, existing.tableId));
      }
    }

    const [enriched] = await enrichOrders([updated]);
    res.json(enriched);
  });

  // QR link helper
  app.get("/api/restaurant/qr-links", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const tables = await db.select().from(restaurantTables).where(eq(restaurantTables.storeId, storeId));
    const base = `${req.protocol}://${req.get("host")}`;
    res.json({
      general: `${base}/order/${storeId}`,
      tables: tables.map((t) => ({
        tableId: t.id,
        tableNumber: t.tableNumber,
        url: `${base}/order/${storeId}/t/${t.tableNumber}`,
      })),
    });
  });
}
