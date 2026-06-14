import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { storage } from "./storage";
import {
  pharmacyPrescriptions,
  pharmacyPrescriptionItems,
  type InsertPharmacyPrescriptionItem,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

type AuthHelpers = {
  requireAuth: (req: Request, res: Response, next: NextFunction) => void;
  getEffectiveStoreId: (req: Request) => number | null;
  sendValidationError: (res: Response, error: unknown) => void;
};

async function requirePharmacyStore(req: Request, res: Response) {
  const storeId = AuthHelpers_getStoreId(req);
  if (!storeId) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }
  const store = await storage.getStore(storeId);
  if (!store || store.posSystem !== "pharmacy") {
    res.status(400).json({ message: "Pharmacy endpoints are for pharmacy stores only" });
    return null;
  }
  return storeId;
}

function AuthHelpers_getStoreId(req: Request): number | null {
  return (req as Request & { _storeId?: number | null })._storeId ?? null;
}

export function registerPharmacyRoutes(app: Express, helpers: AuthHelpers) {
  const { requireAuth, getEffectiveStoreId, sendValidationError } = helpers;

  const withPharmacy = async (req: Request, res: Response, next: NextFunction) => {
    (req as Request & { _storeId?: number | null })._storeId = getEffectiveStoreId(req);
    const storeId = await requirePharmacyStore(req, res);
    if (!storeId) return;
    next();
  };

  app.get("/api/pharmacy/expiry-alerts", requireAuth, withPharmacy, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const days = Math.max(1, parseInt(String(req.query.days ?? 90), 10) || 90);
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

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

  app.get("/api/pharmacy/prescriptions", requireAuth, withPharmacy, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const status = req.query.status as string | undefined;

    let rows = await db
      .select()
      .from(pharmacyPrescriptions)
      .where(eq(pharmacyPrescriptions.storeId, storeId))
      .orderBy(desc(pharmacyPrescriptions.createdAt));

    if (status) {
      rows = await db
        .select()
        .from(pharmacyPrescriptions)
        .where(and(eq(pharmacyPrescriptions.storeId, storeId), eq(pharmacyPrescriptions.status, status as "pending" | "dispensed" | "cancelled")))
        .orderBy(desc(pharmacyPrescriptions.createdAt));
    }

    const withItems = await Promise.all(
      rows.map(async (rx) => {
        const items = await db
          .select()
          .from(pharmacyPrescriptionItems)
          .where(eq(pharmacyPrescriptionItems.prescriptionId, rx.id));
        return { ...rx, items };
      }),
    );

    res.json(withItems);
  });

  app.post("/api/pharmacy/prescriptions", requireAuth, withPharmacy, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    try {
      const {
        patientName,
        patientPhone,
        doctorName,
        doctorLicense,
        notes,
        items = [],
      } = req.body;

      if (!patientName) {
        return res.status(400).json({ message: "patientName is required" });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one prescription item is required" });
      }

      const count = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(pharmacyPrescriptions)
        .where(eq(pharmacyPrescriptions.storeId, storeId));
      const num = (count[0]?.c ?? 0) + 1;
      const prescriptionNumber = `RX-${String(num).padStart(5, "0")}`;

      let totalAmount = 0;
      for (const item of items) {
        totalAmount += parseFloat(String(item.unitPrice ?? 0)) * (parseInt(String(item.quantity ?? 1), 10) || 1);
      }

      const [rx] = await db
        .insert(pharmacyPrescriptions)
        .values({
          storeId,
          prescriptionNumber,
          patientName,
          patientPhone: patientPhone || null,
          doctorName: doctorName || null,
          doctorLicense: doctorLicense || null,
          notes: notes || null,
          totalAmount: String(totalAmount),
          status: "pending",
        })
        .returning();

      const itemRows: InsertPharmacyPrescriptionItem[] = items.map((item: Record<string, unknown>) => ({
        prescriptionId: rx.id,
        inventoryItemId: item.inventoryItemId ? Number(item.inventoryItemId) : null,
        drugName: String(item.drugName || item.name || "Drug"),
        quantity: Math.max(1, parseInt(String(item.quantity ?? 1), 10) || 1),
        dosageInstructions: item.dosageInstructions ? String(item.dosageInstructions) : null,
        unitPrice: String(item.unitPrice ?? 0),
      }));

      await db.insert(pharmacyPrescriptionItems).values(itemRows);

      const createdItems = await db
        .select()
        .from(pharmacyPrescriptionItems)
        .where(eq(pharmacyPrescriptionItems.prescriptionId, rx.id));

      res.status(201).json({ ...rx, items: createdItems });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  app.patch("/api/pharmacy/prescriptions/:id", requireAuth, withPharmacy, async (req, res) => {
    const storeId = getEffectiveStoreId(req)!;
    const id = parseInt(req.params.id);
    const [existing] = await db
      .select()
      .from(pharmacyPrescriptions)
      .where(and(eq(pharmacyPrescriptions.id, id), eq(pharmacyPrescriptions.storeId, storeId)))
      .limit(1);

    if (!existing) return res.status(404).json({ message: "Prescription not found" });

    const { status, notes } = req.body;
    const updates: Partial<typeof existing> = {};
    if (status === "pending" || status === "dispensed" || status === "cancelled") updates.status = status;
    if (notes !== undefined) updates.notes = notes || null;

    const [updated] = await db
      .update(pharmacyPrescriptions)
      .set(updates)
      .where(eq(pharmacyPrescriptions.id, id))
      .returning();

    res.json(updated);
  });

  app.get("/api/pharmacy/reports", requireAuth, withPharmacy, async (req, res) => {
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

    const [allOrders, items, categories, prescriptions] = await Promise.all([
      storage.getOrders(storeId),
      storage.getInventoryItems(storeId),
      storage.getCategories(storeId),
      db.select().from(pharmacyPrescriptions).where(eq(pharmacyPrescriptions.storeId, storeId)),
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
    const rxPending = prescriptions.filter((p) => p.status === "pending").length;
    const rxDispensed = prescriptions.filter(
      (p) => p.status === "dispensed" && inRange(new Date(p.createdAt)),
    ).length;

    const itemSalesMap: Record<number, { name: string; sku: string; qty: number; revenue: number }> = {};
    for (const oi of allOrderItems) {
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
      rxPending,
      rxDispensed,
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
