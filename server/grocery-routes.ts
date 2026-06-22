import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { grocerySuppliers, groceryPurchases, groceryPurchaseItems } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

function paymentStatusFromAmounts(total: number, paid: number): "unpaid" | "partial" | "paid" {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

type AuthHelpers = {
  requireAuth: (req: Request, res: Response, next: NextFunction) => void;
  getEffectiveStoreId: (req: Request) => number | null;
  sendValidationError: (res: Response, error: unknown) => void;
};

async function requireGroceryStore(req: Request, res: Response) {
  const storeId = AuthHelpers_getStoreId(req);
  if (!storeId) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }
  const store = await storage.getStore(storeId);
  if (!store || store.posSystem !== "grocery") {
    res.status(400).json({ message: "Grocery endpoints are for grocery stores only" });
    return null;
  }
  return storeId;
}

function AuthHelpers_getStoreId(req: Request): number | null {
  return (req as Request & { _storeId?: number | null })._storeId ?? null;
}

export function registerGroceryRoutes(app: Express, helpers: AuthHelpers) {
  const { requireAuth, getEffectiveStoreId, sendValidationError } = helpers;

  const withGrocery = async (req: Request, res: Response, next: NextFunction) => {
    (req as Request & { _storeId?: number | null })._storeId = getEffectiveStoreId(req);
    const storeId = await requireGroceryStore(req, res);
    if (!storeId) return;
    next();
  };

  app.get("/api/grocery/expiry-alerts", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const days = Math.max(1, parseInt(String(req.query.days ?? 90), 10) || 90);
    const now = new Date();

    const items = await storage.getInventoryItems(storeId);
    const alerts = items
      .filter((i) => i.expiryDate && i.quantity > 0)
      .map((i) => {
        const expiry = new Date(i.expiryDate!);
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...i, daysLeft, expired: daysLeft < 0 };
      })
      .filter((i) => i.expired || i.daysLeft <= days)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const expired = alerts.filter((a) => a.expired).length;
    const expiringSoon = alerts.filter((a) => !a.expired).length;

    res.json({ alerts, expired, expiringSoon, daysWindow: days });
  });

  app.get("/api/grocery/suppliers", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const rows = await db
      .select()
      .from(grocerySuppliers)
      .where(eq(grocerySuppliers.storeId, storeId))
      .orderBy(desc(grocerySuppliers.createdAt));
    res.json(rows);
  });

  app.post("/api/grocery/suppliers", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const { name, phone, address, notes } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Supplier name is required" });
    }
    try {
      const [row] = await db
        .insert(grocerySuppliers)
        .values({
          storeId,
          name: String(name).trim(),
          phone: phone ? String(phone) : null,
          address: address ? String(address) : null,
          notes: notes ? String(notes) : null,
        })
        .returning();
      res.status(201).json(row);
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  app.patch("/api/grocery/suppliers/:id", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const id = parseInt(req.params.id);
    const [existing] = await db
      .select()
      .from(grocerySuppliers)
      .where(and(eq(grocerySuppliers.id, id), eq(grocerySuppliers.storeId, storeId)))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Supplier not found" });

    const { name, phone, address, notes } = req.body;
    const updates: Partial<typeof existing> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = phone || null;
    if (address !== undefined) updates.address = address || null;
    if (notes !== undefined) updates.notes = notes || null;

    const [updated] = await db
      .update(grocerySuppliers)
      .set(updates)
      .where(eq(grocerySuppliers.id, id))
      .returning();
    res.json(updated);
  });

  app.delete("/api/grocery/suppliers/:id", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const id = parseInt(req.params.id);
    const [existing] = await db
      .select()
      .from(grocerySuppliers)
      .where(and(eq(grocerySuppliers.id, id), eq(grocerySuppliers.storeId, storeId)))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Supplier not found" });
    await db.delete(grocerySuppliers).where(eq(grocerySuppliers.id, id));
    res.sendStatus(204);
  });

  app.get("/api/grocery/purchases", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const rows = await db
      .select()
      .from(groceryPurchases)
      .where(eq(groceryPurchases.storeId, storeId))
      .orderBy(desc(groceryPurchases.createdAt));
    res.json(rows);
  });

  app.get("/api/grocery/purchases/:id/items", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const purchaseId = parseInt(String(req.params.id), 10);
    const [purchase] = await db
      .select()
      .from(groceryPurchases)
      .where(and(eq(groceryPurchases.id, purchaseId), eq(groceryPurchases.storeId, storeId)))
      .limit(1);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    const items = await db
      .select()
      .from(groceryPurchaseItems)
      .where(eq(groceryPurchaseItems.purchaseId, purchaseId));
    res.json(items);
  });

  app.post("/api/grocery/purchases", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const { items, ...raw } = req.body as {
      items?: Array<{
        inventoryItemId: number;
        productName?: string;
        sku?: string;
        quantity: number;
        unitCost: string | number;
        total: string | number;
      }>;
      supplierId?: number | null;
      supplierName?: string | null;
      invoiceNumber?: string | null;
      totalAmount?: string | number;
      amountPaid?: string | number;
      paymentStatus?: "unpaid" | "partial" | "paid";
      paymentMethod?: "cash" | "card" | "transfer";
      notes?: string | null;
    };

    const lineItems = Array.isArray(items) ? items.filter((i) => i.inventoryItemId && i.quantity > 0) : [];
    if (lineItems.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    const inventory = await storage.getInventoryItems(storeId);
    const computedTotal = lineItems.reduce(
      (sum, i) => sum + parseFloat(String(i.total ?? parseFloat(String(i.unitCost)) * i.quantity)),
      0,
    );
    const totalAmount = raw.totalAmount !== undefined ? parseFloat(String(raw.totalAmount)) : computedTotal;
    const amountPaid = raw.amountPaid !== undefined ? parseFloat(String(raw.amountPaid)) : 0;

    let supplierId: number | null = raw.supplierId ? Number(raw.supplierId) : null;
    if (!supplierId || supplierId === 0) supplierId = null;

    let supplierName = raw.supplierName ? String(raw.supplierName).trim() : null;
    if (supplierId) {
      const [sup] = await db
        .select()
        .from(grocerySuppliers)
        .where(and(eq(grocerySuppliers.id, supplierId), eq(grocerySuppliers.storeId, storeId)))
        .limit(1);
      if (sup) supplierName = sup.name;
    }

    const existing = await db.select().from(groceryPurchases).where(eq(groceryPurchases.storeId, storeId));
    const invoiceNumber =
      raw.invoiceNumber && String(raw.invoiceNumber).trim()
        ? String(raw.invoiceNumber).trim()
        : `PUR-${String(existing.length + 1).padStart(5, "0")}`;

    try {
      const [purchase] = await db
        .insert(groceryPurchases)
        .values({
          storeId,
          supplierId,
          supplierName,
          invoiceNumber,
          totalAmount: totalAmount.toFixed(2),
          amountPaid: amountPaid.toFixed(2),
          paymentStatus: raw.paymentStatus ?? paymentStatusFromAmounts(totalAmount, amountPaid),
          paymentMethod: raw.paymentMethod ?? "cash",
          notes: raw.notes ? String(raw.notes) : null,
        })
        .returning();

      for (const line of lineItems) {
        const itemId = Number(line.inventoryItemId);
        const inv = inventory.find((i) => i.id === itemId);
        if (!inv) {
          return res.status(400).json({ message: `Product #${itemId} not found` });
        }
        const qty = parseInt(String(line.quantity), 10);
        const unitCost = parseFloat(String(line.unitCost));
        const lineTotal = parseFloat(String(line.total ?? unitCost * qty));

        await db.insert(groceryPurchaseItems).values({
          purchaseId: purchase.id,
          inventoryItemId: itemId,
          productName: line.productName || inv.name,
          sku: line.sku || inv.sku || null,
          quantity: qty,
          unitCost: unitCost.toFixed(2),
          total: lineTotal.toFixed(2),
        });

        const updates: { quantity: number; costPrice?: string } = { quantity: inv.quantity + qty };
        if (Number.isFinite(unitCost) && unitCost >= 0) {
          updates.costPrice = unitCost.toFixed(2);
        }
        await storage.updateInventoryItem(itemId, updates);
      }

      res.status(201).json(purchase);
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  app.patch("/api/grocery/purchases/:id", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db
      .select()
      .from(groceryPurchases)
      .where(and(eq(groceryPurchases.id, id), eq(groceryPurchases.storeId, storeId)))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Purchase not found" });

    const updates: Partial<typeof existing> = {};
    if (req.body.amountPaid !== undefined) {
      const paid = parseFloat(String(req.body.amountPaid));
      updates.amountPaid = paid.toFixed(2);
      updates.paymentStatus = paymentStatusFromAmounts(parseFloat(existing.totalAmount), paid);
    }
    if (req.body.paymentStatus !== undefined) updates.paymentStatus = req.body.paymentStatus;
    if (req.body.notes !== undefined) updates.notes = req.body.notes || null;

    const [updated] = await db.update(groceryPurchases).set(updates).where(eq(groceryPurchases.id, id)).returning();
    res.json(updated);
  });

  app.delete("/api/grocery/purchases/:id", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db
      .select()
      .from(groceryPurchases)
      .where(and(eq(groceryPurchases.id, id), eq(groceryPurchases.storeId, storeId)))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Purchase not found" });

    const lines = await db
      .select()
      .from(groceryPurchaseItems)
      .where(eq(groceryPurchaseItems.purchaseId, id));

    const inventory = await storage.getInventoryItems(storeId);
    for (const line of lines) {
      const inv = inventory.find((i) => i.id === line.inventoryItemId);
      if (inv) {
        await storage.updateInventoryItem(line.inventoryItemId, {
          quantity: Math.max(0, inv.quantity - line.quantity),
        });
      }
    }

    await db.delete(groceryPurchaseItems).where(eq(groceryPurchaseItems.purchaseId, id));
    await db.delete(groceryPurchases).where(eq(groceryPurchases.id, id));
    res.json({ success: true });
  });

  app.post("/api/grocery/stock-in", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const { inventoryItemId, quantity, costPrice } = req.body;
    const itemId = parseInt(String(inventoryItemId), 10);
    const qty = parseInt(String(quantity), 10);
    if (!itemId || !qty || qty <= 0) {
      return res.status(400).json({ message: "Valid inventoryItemId and quantity are required" });
    }

    const items = await storage.getInventoryItems(storeId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ message: "Product not found" });

    const updates: { quantity: number; costPrice?: string } = {
      quantity: item.quantity + qty,
    };
    if (costPrice !== undefined && costPrice !== "") {
      const cost = parseFloat(String(costPrice));
      if (Number.isFinite(cost) && cost >= 0) {
        updates.costPrice = cost.toFixed(2);
      }
    }

    const updated = await storage.updateInventoryItem(itemId, updates);
    res.json(updated);
  });

  app.get("/api/grocery/reports", requireAuth, withGrocery, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const { from, to } = req.query as { from?: string; to?: string };
    const fromDate = from ? new Date(from) : undefined;
    let toDate = to ? new Date(to) : undefined;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    function inRange(d: Date) {
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    }

    const [allOrders, items, categories, suppliers] = await Promise.all([
      storage.getOrders(storeId),
      storage.getInventoryItems(storeId),
      storage.getCategories(storeId),
      db.select().from(grocerySuppliers).where(eq(grocerySuppliers.storeId, storeId)),
    ]);

    const filteredOrders = allOrders.filter((o) => inRange(new Date(o.createdAt)));
    const completedOrders = filteredOrders.filter((o) => o.status === "completed");
    const grossSales = completedOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const orderItemArrays = await Promise.all(completedOrders.map((ord) => storage.getOrderItems(ord.id)));
    const allOrderItems = orderItemArrays.flat();
    const itemsSold = allOrderItems.reduce((s, oi) => s + oi.quantity, 0);

    const now = new Date();
    const in90 = new Date();
    in90.setDate(in90.getDate() + 90);
    const expiringCount = items.filter(
      (i) => i.expiryDate && i.quantity > 0 && new Date(i.expiryDate) <= in90,
    ).length;

    const itemSalesMap: Record<number, { name: string; sku: string; qty: number; revenue: number }> = {};
    for (const oi of allOrderItems) {
      if (!oi.inventoryItemId) continue;
      if (!itemSalesMap[oi.inventoryItemId]) {
        const inv = items.find((i) => i.id === oi.inventoryItemId);
        itemSalesMap[oi.inventoryItemId] = {
          name: oi.name,
          sku: oi.sku || inv?.sku || "",
          qty: 0,
          revenue: 0,
        };
      }
      itemSalesMap[oi.inventoryItemId].qty += oi.quantity;
      itemSalesMap[oi.inventoryItemId].revenue += parseFloat(oi.price) * oi.quantity;
    }
    const topProducts = Object.values(itemSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    res.json({
      grossSales,
      netSales: grossSales,
      orderCount: completedOrders.length,
      itemsSold,
      avgOrderValue: completedOrders.length > 0 ? grossSales / completedOrders.length : 0,
      expiringCount,
      supplierCount: suppliers.length,
      topProducts,
      lowStock: items.filter((i) => i.quantity > 0 && i.quantity <= 5).length,
      outOfStock: items.filter((i) => i.quantity === 0).length,
      categories: categories.map((c) => ({
        name: c.name,
        count: items.filter((i) => i.categoryId === c.id).length,
      })),
    });
  });
}
