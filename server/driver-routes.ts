import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import { hashPassword, comparePasswords } from "./auth";
import {
  deliveryDrivers,
  restaurantOrders,
  restaurantOrderItems,
  stores,
} from "@shared/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import { notifyOrderEvent } from "./push-service";

type AuthHelpers = {
  sendValidationError: (res: Response, error: z.ZodError) => Response;
  getEffectiveStoreId: (req: Request) => number | null;
  requireAuth: (req: Request, res: Response, next: () => void) => void;
};

function requireDriver(req: Request, res: Response, next: () => void) {
  if (!req.session?.driverId) return res.status(401).json({ message: "Driver login required" });
  next();
}

async function getDriver(req: Request) {
  const id = req.session?.driverId;
  if (!id) return null;
  const [driver] = await db.select().from(deliveryDrivers).where(eq(deliveryDrivers.id, id));
  if (!driver || !driver.isActive) return null;
  return driver;
}

async function enrichDriverOrder(row: typeof restaurantOrders.$inferSelect) {
  const itemRows = await db.select().from(restaurantOrderItems).where(eq(restaurantOrderItems.orderId, row.id));
  const store = await storage.getStore(row.storeId);
  let driver = null;
  if (row.driverId) {
    const [d] = await db.select().from(deliveryDrivers).where(eq(deliveryDrivers.id, row.driverId));
    if (d) driver = { id: d.id, name: d.name, phone: d.phone, vehicleType: d.vehicleType };
  }
  return {
    ...row,
    subtotal: String(row.subtotal),
    total: String(row.total),
    deliveryFee: row.deliveryFee ? String(row.deliveryFee) : "0",
    items: itemRows.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: String(i.price),
    })),
    store: store ? {
      id: store.id,
      name: store.name,
      address: store.address,
      phone: store.phone,
      brandColor: store.brandColor,
      logoUrl: store.logoUrl,
    } : null,
    driver,
  };
}

export function registerDriverRoutes(app: Express, helpers: AuthHelpers) {
  const { sendValidationError, getEffectiveStoreId, requireAuth } = helpers;

  // ── Driver auth ─────────────────────────────────────────────
  app.post("/api/driver/login", async (req, res) => {
    const schema = z.object({
      phone: z.string().trim().min(7),
      pin: z.string().trim().min(4).max(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

    const normalizedPhone = parsed.data.phone.replace(/\s/g, "");
    const [driver] = await db.select().from(deliveryDrivers)
      .where(eq(deliveryDrivers.phone, normalizedPhone));
    if (!driver || !driver.isActive) {
      return res.status(401).json({ message: "Invalid phone or PIN" });
    }
    if (!(await comparePasswords(parsed.data.pin, driver.pinHash))) {
      return res.status(401).json({ message: "Invalid phone or PIN" });
    }

    req.session.driverId = driver.id;
    res.json({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      status: driver.status,
      vehicleType: driver.vehicleType,
    });
  });

  app.post("/api/driver/logout", (req, res) => {
    delete req.session.driverId;
    res.sendStatus(204);
  });

  app.get("/api/driver/me", requireDriver, async (req, res) => {
    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });
    res.json({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      status: driver.status,
      vehicleType: driver.vehicleType,
    });
  });

  app.patch("/api/driver/location", requireDriver, async (req, res) => {
    const schema = z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });

    const now = new Date();
    await db.update(deliveryDrivers).set({
      currentLat: String(parsed.data.lat),
      currentLng: String(parsed.data.lng),
      locationUpdatedAt: now,
    }).where(eq(deliveryDrivers.id, driver.id));

    res.json({ ok: true, updatedAt: now });
  });

  app.patch("/api/driver/status", requireDriver, async (req, res) => {
    const schema = z.object({ status: z.enum(["online", "offline", "busy"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });

    if (parsed.data.status === "offline" || parsed.data.status === "online") {
      const [active] = await db.select().from(restaurantOrders)
        .where(and(
          eq(restaurantOrders.driverId, driver.id),
          or(
            eq(restaurantOrders.status, "ready"),
            eq(restaurantOrders.status, "out_for_delivery"),
          ),
        ));
      if (active) {
        return res.status(400).json({ message: "Complete active delivery first" });
      }
    }

    const [updated] = await db.update(deliveryDrivers)
      .set({ status: parsed.data.status })
      .where(eq(deliveryDrivers.id, driver.id))
      .returning();
    res.json(updated);
  });

  // ── Driver orders ───────────────────────────────────────────
  app.get("/api/driver/orders/available", requireDriver, async (req, res) => {
    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });
    if (driver.status !== "online") {
      return res.json([]);
    }

    let rows = await db.select().from(restaurantOrders)
      .where(and(
        eq(restaurantOrders.orderType, "delivery"),
        eq(restaurantOrders.status, "ready"),
        isNull(restaurantOrders.driverId),
      ))
      .orderBy(desc(restaurantOrders.createdAt));

    if (driver.storeId) {
      rows = rows.filter((o) => o.storeId === driver.storeId);
    }

    res.json(await Promise.all(rows.map(enrichDriverOrder)));
  });

  app.get("/api/driver/orders/active", requireDriver, async (req, res) => {
    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });

    const rows = await db.select().from(restaurantOrders)
      .where(and(
        eq(restaurantOrders.driverId, driver.id),
        or(
          eq(restaurantOrders.status, "ready"),
          eq(restaurantOrders.status, "out_for_delivery"),
        ),
      ))
      .orderBy(desc(restaurantOrders.createdAt));

    res.json(await Promise.all(rows.map(enrichDriverOrder)));
  });

  app.get("/api/driver/orders/history", requireDriver, async (req, res) => {
    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });

    const rows = await db.select().from(restaurantOrders)
      .where(and(
        eq(restaurantOrders.driverId, driver.id),
        or(
          eq(restaurantOrders.status, "delivered"),
          eq(restaurantOrders.status, "completed"),
        ),
      ))
      .orderBy(desc(restaurantOrders.createdAt))
      .limit(30);

    res.json(await Promise.all(rows.map(enrichDriverOrder)));
  });

  app.post("/api/driver/orders/:id/accept", requireDriver, async (req, res) => {
    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });
    if (driver.status !== "online") {
      return res.status(400).json({ message: "Go online to accept orders" });
    }

    const orderId = parseInt(req.params.id);
    const [order] = await db.select().from(restaurantOrders).where(eq(restaurantOrders.id, orderId));
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.orderType !== "delivery" || order.status !== "ready" || order.driverId) {
      return res.status(400).json({ message: "Order not available" });
    }
    if (driver.storeId && order.storeId !== driver.storeId) {
      return res.status(403).json({ message: "Not your delivery zone" });
    }

    const [existing] = await db.select().from(restaurantOrders)
      .where(and(
        eq(restaurantOrders.driverId, driver.id),
        or(eq(restaurantOrders.status, "ready"), eq(restaurantOrders.status, "out_for_delivery")),
      ));
    if (existing) {
      return res.status(400).json({ message: "You already have an active delivery" });
    }

    const now = new Date();
    const [updated] = await db.update(restaurantOrders).set({
      driverId: driver.id,
      driverAcceptedAt: now,
      updatedAt: now,
    }).where(and(
      eq(restaurantOrders.id, orderId),
      isNull(restaurantOrders.driverId),
    )).returning();

    if (!updated) return res.status(409).json({ message: "Order already taken" });

    await db.update(deliveryDrivers).set({ status: "busy" }).where(eq(deliveryDrivers.id, driver.id));
    void notifyOrderEvent("driver_assigned", {
      storeId: updated.storeId,
      orderNumber: updated.orderNumber,
      trackingToken: updated.trackingToken,
    });
    res.json(await enrichDriverOrder(updated));
  });

  app.post("/api/driver/orders/:id/pickup", requireDriver, async (req, res) => {
    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });

    const orderId = parseInt(req.params.id);
    const now = new Date();
    const [updated] = await db.update(restaurantOrders).set({
      status: "out_for_delivery",
      pickedUpAt: now,
      updatedAt: now,
    }).where(and(
      eq(restaurantOrders.id, orderId),
      eq(restaurantOrders.driverId, driver.id),
      eq(restaurantOrders.status, "ready"),
    )).returning();

    if (!updated) return res.status(400).json({ message: "Cannot pick up this order" });
    void notifyOrderEvent("pickup", {
      storeId: updated.storeId,
      orderNumber: updated.orderNumber,
      trackingToken: updated.trackingToken,
    });
    res.json(await enrichDriverOrder(updated));
  });

  app.post("/api/driver/orders/:id/deliver", requireDriver, async (req, res) => {
    const driver = await getDriver(req);
    if (!driver) return res.status(401).json({ message: "Session expired" });

    const orderId = parseInt(req.params.id);
    const now = new Date();
    const [updated] = await db.update(restaurantOrders).set({
      status: "delivered",
      deliveredAt: now,
      updatedAt: now,
    }).where(and(
      eq(restaurantOrders.id, orderId),
      eq(restaurantOrders.driverId, driver.id),
      eq(restaurantOrders.status, "out_for_delivery"),
    )).returning();

    if (!updated) return res.status(400).json({ message: "Cannot complete this order" });

    await db.update(deliveryDrivers).set({ status: "online" }).where(eq(deliveryDrivers.id, driver.id));
    void notifyOrderEvent("delivered", {
      storeId: updated.storeId,
      orderNumber: updated.orderNumber,
      trackingToken: updated.trackingToken,
    });
    res.json(await enrichDriverOrder(updated));
  });

  // ── Restaurant: manage drivers ────────────────────────────────
  app.get("/api/restaurant/drivers", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });

    const rows = await db.select().from(deliveryDrivers)
      .where(or(isNull(deliveryDrivers.storeId), eq(deliveryDrivers.storeId, storeId)));
    res.json(rows.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      vehicleType: d.vehicleType,
      isActive: d.isActive,
      status: d.status,
      storeId: d.storeId,
      isPlatform: d.storeId === null,
    })));
  });

  app.post("/api/restaurant/drivers", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });

    const schema = z.object({
      name: z.string().trim().min(1),
      phone: z.string().trim().min(7),
      pin: z.string().trim().min(4).max(8),
      vehicleType: z.enum(["motorcycle", "car", "bicycle"]).default("motorcycle"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

    const phone = parsed.data.phone.replace(/\s/g, "");
    const pinHash = await hashPassword(parsed.data.pin);
    const [created] = await db.insert(deliveryDrivers).values({
      name: parsed.data.name,
      phone,
      pinHash,
      vehicleType: parsed.data.vehicleType,
      storeId,
    }).returning();

    res.status(201).json({
      id: created.id,
      name: created.name,
      phone: created.phone,
      vehicleType: created.vehicleType,
      isActive: created.isActive,
      status: created.status,
    });
  });

  app.patch("/api/restaurant/drivers/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);

    const [existing] = await db.select().from(deliveryDrivers).where(eq(deliveryDrivers.id, id));
    if (!existing || (existing.storeId !== null && existing.storeId !== storeId)) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const updates: Partial<typeof deliveryDrivers.$inferInsert> = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.isActive !== undefined) updates.isActive = !!req.body.isActive;
    if (req.body.vehicleType) updates.vehicleType = req.body.vehicleType;
    if (req.body.pin) updates.pinHash = await hashPassword(String(req.body.pin));

    const [updated] = await db.update(deliveryDrivers).set(updates).where(eq(deliveryDrivers.id, id)).returning();
    res.json(updated);
  });

  app.delete("/api/restaurant/drivers/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);

    const [existing] = await db.select().from(deliveryDrivers).where(eq(deliveryDrivers.id, id));
    if (!existing || existing.storeId !== storeId) {
      return res.status(404).json({ message: "Driver not found" });
    }

    await db.update(deliveryDrivers).set({ isActive: false, status: "offline" }).where(eq(deliveryDrivers.id, id));
    res.sendStatus(204);
  });
}

/** Seed platform demo driver if missing */
export async function ensureDemoDriver() {
  const demoPhone = "07700000001";
  const [existing] = await db.select().from(deliveryDrivers).where(eq(deliveryDrivers.phone, demoPhone));
  if (existing) return;

  const pinHash = await hashPassword("1234");
  await db.insert(deliveryDrivers).values({
    name: "IQ Demo Driver",
    phone: demoPhone,
    pinHash,
    vehicleType: "motorcycle",
    status: "offline",
    storeId: null,
  });
}
