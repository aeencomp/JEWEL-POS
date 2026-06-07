import type { Express, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import {
  stores,
  menuCategories,
  menuItems,
  restaurantOrders,
  restaurantOrderItems,
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

export type DeliverySettings = {
  deliveryEnabled: boolean;
  deliveryFee: number;
  minOrder: number;
  estMinutes: number;
};

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  deliveryEnabled: true,
  deliveryFee: 3000,
  minOrder: 10000,
  estMinutes: 35,
};

export function deliverySettingsKey(storeId: number) {
  return `restaurant:delivery:${storeId}`;
}

export async function getDeliverySettings(storeId: number): Promise<DeliverySettings> {
  const raw = await storage.getSetting(deliverySettingsKey(storeId));
  if (!raw) return { ...DEFAULT_DELIVERY_SETTINGS };
  try {
    return { ...DEFAULT_DELIVERY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DELIVERY_SETTINGS };
  }
}

async function requireRestaurantStore(storeId: number) {
  const store = await storage.getStore(storeId);
  if (!store || store.posSystem !== "restaurant") return null;
  return store;
}

function genOrderNumber() {
  return `IQ-${Date.now().toString(36).toUpperCase()}`;
}

function genTrackingToken() {
  return crypto.randomBytes(16).toString("hex");
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

async function enrichOrder(row: typeof restaurantOrders.$inferSelect) {
  const itemRows = await db.select().from(restaurantOrderItems).where(eq(restaurantOrderItems.orderId, row.id));
  const store = await storage.getStore(row.storeId);
  return {
    ...row,
    subtotal: String(row.subtotal),
    total: String(row.total),
    deliveryFee: row.deliveryFee ? String(row.deliveryFee) : "0",
    items: itemRows.map(serializeOrderItem),
    store: store ? { id: store.id, name: store.name, brandColor: store.brandColor, logoUrl: store.logoUrl, phone: store.phone } : null,
  };
}

const iqOrderSchema = z.object({
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(7),
  deliveryAddress: z.string().trim().min(5),
  deliveryArea: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paymentMethod: z.enum(["cash", "card"]).default("cash"),
  items: z.array(z.object({
    menuItemId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1),
});

const TRACK_STEPS = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "delivered", "completed"] as const;

export function registerIqOrderRoutes(app: Express, helpers: { sendValidationError: (res: Response, error: z.ZodError) => Response }) {
  const { sendValidationError } = helpers;

  // ── Public: IQ Order marketplace ─────────────────────────────
  app.get("/api/public/iq-order/stores", async (_req, res) => {
    const allStores = await db.select().from(stores)
      .where(and(eq(stores.posSystem, "restaurant"), eq(stores.isActive, true)));

    const result = [];
    for (const store of allStores) {
      const settings = await getDeliverySettings(store.id);
      if (!settings.deliveryEnabled) continue;

      const items = await db.select().from(menuItems)
        .where(and(eq(menuItems.storeId, store.id), eq(menuItems.isAvailable, true)));
      const categories = await db.select().from(menuCategories)
        .where(and(eq(menuCategories.storeId, store.id), eq(menuCategories.isActive, true)));

      result.push({
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        brandColor: store.brandColor,
        logoUrl: store.logoUrl,
        menuCount: items.length,
        categoryCount: categories.length,
        deliveryFee: settings.deliveryFee,
        minOrder: settings.minOrder,
        estMinutes: settings.estMinutes,
      });
    }
    res.json(result);
  });

  app.get("/api/public/iq-order/:storeId/menu", async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    if (!storeId) return res.status(400).json({ message: "Invalid store" });
    const store = await requireRestaurantStore(storeId);
    if (!store || !store.isActive) return res.status(404).json({ message: "Restaurant not found" });

    const settings = await getDeliverySettings(storeId);
    if (!settings.deliveryEnabled) return res.status(403).json({ message: "Delivery not available" });

    const categories = await db.select().from(menuCategories)
      .where(and(eq(menuCategories.storeId, storeId), eq(menuCategories.isActive, true)))
      .orderBy(menuCategories.sortOrder);

    const items = await db.select().from(menuItems)
      .where(and(eq(menuItems.storeId, storeId), eq(menuItems.isAvailable, true)))
      .orderBy(menuItems.sortOrder);

    res.json({
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        brandColor: store.brandColor,
        logoUrl: store.logoUrl,
      },
      categories,
      items,
      delivery: settings,
    });
  });

  app.post("/api/public/iq-order/:storeId/orders", async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    if (!storeId) return res.status(400).json({ message: "Invalid store" });
    const store = await requireRestaurantStore(storeId);
    if (!store || !store.isActive) return res.status(404).json({ message: "Restaurant not found" });

    const settings = await getDeliverySettings(storeId);
    if (!settings.deliveryEnabled) return res.status(403).json({ message: "Delivery not available" });

    const parsed = iqOrderSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

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

    if (subtotal < settings.minOrder) {
      return res.status(400).json({
        message: `Minimum order is ${settings.minOrder} IQD`,
        minOrder: settings.minOrder,
      });
    }

    const deliveryFee = settings.deliveryFee;
    const total = subtotal + deliveryFee;
    const trackingToken = genTrackingToken();

    const [order] = await db.insert(restaurantOrders).values({
      storeId,
      orderNumber: genOrderNumber(),
      tableId: null,
      orderType: "delivery",
      status: "pending",
      source: "online",
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      notes: parsed.data.notes || null,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryArea: parsed.data.deliveryArea || null,
      deliveryFee: deliveryFee.toFixed(2),
      trackingToken,
      paymentMethod: parsed.data.paymentMethod,
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      paymentStatus: "unpaid",
    }).returning();

    const items: SerializedOrderItem[] = [];
    for (const li of lineItems) {
      const [row] = await db.insert(restaurantOrderItems).values({
        orderId: order.id,
        menuItemId: li.menuItemId,
        name: li.name,
        price: li.price,
        quantity: li.quantity,
        notes: li.notes || null,
      }).returning();
      items.push(serializeOrderItem(row));
    }

    const enriched = await enrichOrder(order);
    res.status(201).json({ ...enriched, items, trackingUrl: `/app/track/${trackingToken}` });
  });

  app.get("/api/public/iq-order/track/:token", async (req, res) => {
    const token = req.params.token;
    if (!token) return res.status(400).json({ message: "Invalid token" });

    const [order] = await db.select().from(restaurantOrders).where(eq(restaurantOrders.trackingToken, token));
    if (!order) return res.status(404).json({ message: "Order not found" });

    const enriched = await enrichOrder(order);
    const stepIndex = TRACK_STEPS.indexOf(order.status as typeof TRACK_STEPS[number]);
    const timeline = [
      { key: "placed", en: "Order Placed", ar: "تم الطلب", done: true },
      { key: "confirmed", en: "Confirmed", ar: "تم التأكيد", done: stepIndex >= TRACK_STEPS.indexOf("accepted") },
      { key: "preparing", en: "Preparing", ar: "قيد التحضير", done: stepIndex >= TRACK_STEPS.indexOf("preparing") },
      { key: "ready", en: "Ready", ar: "جاهز", done: stepIndex >= TRACK_STEPS.indexOf("ready") },
      { key: "delivery", en: "On the Way", ar: "في الطريق", done: stepIndex >= TRACK_STEPS.indexOf("out_for_delivery") },
      { key: "delivered", en: "Delivered", ar: "تم التوصيل", done: stepIndex >= TRACK_STEPS.indexOf("delivered") || order.status === "completed" },
    ];

    if (order.status === "cancelled") {
      timeline.forEach((t) => { t.done = false; });
    }

    const settings = await getDeliverySettings(order.storeId);
    res.json({ ...enriched, timeline, estMinutes: settings.estMinutes, isCancelled: order.status === "cancelled" });
  });
}
