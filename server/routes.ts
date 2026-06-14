import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { insertStoreSchema, insertInventoryItemSchema, insertCustomerSchema, updateBrandingSchema, insertPurchaseSchema, insertDebtSchema, insertDebtPaymentSchema, insertSignupRequestSchema, signupRequests } from "@shared/schema";
import { db } from "./db";
import { categories, customers, inventoryItems, orders, orderItems, repairOrders, layawayPlans, layawayPayments, purchases, stores, debts, debtPayments, users, oilDeliveryNotes, oilDeliveryNoteItems, oilBatchRecords, oilBatchRecordItems, oilProducts, oilCustomers, oilSuppliers, oilSales, oilSaleItems, oilPurchases, oilPurchaseItems, oilProductionBatches, oilProductionInputs, oilDebts, oilDebtPayments } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { calcLoyaltyEarned } from "@shared/loyalty";
import { registerRestaurantRoutes } from "./restaurant-routes";
import { registerPharmacyRoutes } from "./pharmacy-routes";
import { registerIqOrderRoutes } from "./iq-order-routes";
import { registerDriverRoutes, ensureDemoDriver } from "./driver-routes";
import { registerPushRoutes } from "./push-routes";
import { initPushService } from "./push-service";
import { getEffectiveStoreId, isDemoUser, resolveDemoStoreId, type DemoPosSystem } from "./demo";
import { menuCategories, restaurantTables } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.sendStatus(403);
  }
  next();
}

function nextFashionBarcode(
  storeId: number,
  inventory: { barcode?: string | null }[] = [],
): string {
  const storeDigit = String(Math.min(Math.max(storeId, 1), 9));
  const floor = parseInt(`${storeDigit}0000`, 10);
  const nums = inventory
    .map((i) => (i.barcode || "").replace(/\D/g, ""))
    .filter((b) => b.length === 5 && b.startsWith(storeDigit))
    .map((b) => parseInt(b, 10))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : floor) + 1;
  return String(next).padStart(5, "0");
}

function generateInventoryBarcode(
  storeId: number,
  posSystem: string | null | undefined,
  _suffix = "",
  inventory: { barcode?: string | null }[] = [],
): string {
  if (posSystem === "fashion" || posSystem === "pharmacy") return nextFashionBarcode(storeId, inventory);
  const prefix = posSystem === "oil" ? "OIL" : "JWL";
  const tail = _suffix.replace(/[^A-Z0-9]/gi, "").substring(0, 8).toUpperCase();
  return `${prefix}${storeId}${Date.now().toString(36).toUpperCase()}${tail}`;
}

const debtCreateBodySchema = z.object({
  personName: z.string().trim().min(1, "Person name is required"),
  personPhone: z.string().nullable().optional(),
  type: z.enum(["money", "gold"]),
  direction: z.enum(["lent", "borrowed"]).optional().default("lent"),
  totalAmount: z.coerce.string().min(1, "Amount is required"),
  description: z.string().nullable().optional(),
});

const debtPaymentBodySchema = z.object({
  amount: z.coerce.string().min(1, "Amount is required"),
  paymentMethod: z.enum(["cash", "card", "transfer"]).optional().default("cash"),
  notes: z.string().nullable().optional(),
});

function sendValidationError(res: Response, error: z.ZodError) {
  const first = error.errors[0];
  const message = first ? `${first.path.join(".") || "field"}: ${first.message}` : "Invalid data";
  return res.status(400).json({ message, errors: error.errors });
}

function defaultStoreUsername(storeName: string, storeId: number): string {
  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 32);
  return slug || `store${storeId}`;
}

/** Set or create the store portal login password. Returns the login username. */
async function setStoreLoginPassword(
  storeId: number,
  password: string,
  preferredUsername?: string,
): Promise<string> {
  if (password.length < 6) {
    throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
  }

  const store = await storage.getStore(storeId);
  if (!store) {
    throw Object.assign(new Error("Store not found"), { status: 404 });
  }

  const hashedPassword = await hashPassword(password);
  const storeUsers = await storage.getUsersByStoreId(storeId);

  if (storeUsers.length > 0) {
    for (const u of storeUsers) {
      await storage.updateUserPassword(u.id, hashedPassword);
    }
    return storeUsers[0].username;
  }

  const username =
    (typeof preferredUsername === "string" && preferredUsername.trim()) ||
    defaultStoreUsername(store.name, storeId);

  const existing = await storage.getUserByUsername(username);
  if (existing) {
    if (existing.storeId != null && existing.storeId !== storeId) {
      throw Object.assign(
        new Error(`Username "${username}" is already used by another store.`),
        { status: 400 },
      );
    }
    if (existing.storeId !== storeId) {
      await storage.updateUserStoreId(existing.id, storeId);
    }
    await storage.updateUserPassword(existing.id, hashedPassword);
    return username;
  }

  await storage.createUser({
    username,
    password: hashedPassword,
    email: store.email || null,
    role: "store",
    storeId,
  });
  return username;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  const express = await import("express");
  app.use("/uploads", express.default.static(uploadsDir));

  app.get("/api/public/terminals", async (req, res) => {
    const username = req.query.username as string;
    if (!username) return res.json([]);
    const user = await storage.getUserByUsername(username);
    if (!user) return res.json([]);
    let storeId = user.storeId;
    if (!storeId && isDemoUser(user)) {
      storeId = await resolveDemoStoreId((req.query.posSystem as DemoPosSystem) || "jewel");
    }
    if (!storeId) return res.json([]);
    const terminals = await storage.getPosTerminals(storeId);
    res.json(terminals.map((t) => ({ id: t.id, name: t.name, icon: t.icon, color: t.color, description: t.description })));
  });

  app.post("/api/upload", requireAuth, upload.single("image"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No valid image file provided" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  app.post("/api/admin/impersonate/:storeId", requireAdmin, async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    const store = await storage.getStore(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    req.session.impersonatingStoreId = storeId;
    req.session.impersonatingStoreName = store.name;
    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Failed to save session" });
      const userData: any = { ...req.user };
      userData.impersonatingStoreId = storeId;
      userData.impersonatingStoreName = store.name;
      res.json(userData);
    });
  });

  app.post("/api/admin/stop-impersonate", requireAdmin, async (req, res) => {
    delete req.session.impersonatingStoreId;
    delete req.session.impersonatingStoreName;
    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Failed to save session" });
      res.json(req.user);
    });
  });

  app.get("/api/admin/backup", requireAdmin, async (req, res) => {
    try {
      const storesList = await storage.getStores();
      const allStoresData = [];

      for (const store of storesList) {
        const storeUsers = await storage.getUsersByStoreId(store.id);
        const [cats, items, custs, ords, repairs, layaways, purchasesList, debtsList] = await Promise.all([
          storage.getCategories(store.id),
          storage.getInventoryItems(store.id),
          storage.getCustomers(store.id),
          storage.getOrders(store.id),
          storage.getRepairOrders(store.id),
          storage.getLayawayPlans(store.id),
          storage.getPurchases(store.id),
          storage.getDebts(store.id),
        ]);

        const orderItemsMap: Record<number, any[]> = {};
        for (const ord of ords) {
          orderItemsMap[ord.id] = await storage.getOrderItems(ord.id);
        }

        const layawayPaymentsMap: Record<number, any[]> = {};
        for (const lay of layaways) {
          layawayPaymentsMap[lay.id] = await storage.getLayawayPayments(lay.id);
        }

        const debtPaymentsMap: Record<number, any[]> = {};
        for (const debt of debtsList) {
          debtPaymentsMap[debt.id] = await storage.getDebtPayments(debt.id);
        }

        allStoresData.push({
          store: {
            name: store.name,
            ownerName: store.ownerName,
            phone: store.phone,
            email: store.email,
            address: store.address,
            isActive: store.isActive,
            brandColor: store.brandColor,
            logoUrl: store.logoUrl,
            receiptHeader: store.receiptHeader,
            receiptFooter: store.receiptFooter,
          },
          users: storeUsers.map((u) => ({
            username: u.username,
            password: u.password,
            email: u.email,
          })),
          categories: cats,
          inventoryItems: items,
          customers: custs,
          orders: ords.map((o) => ({ ...o, items: orderItemsMap[o.id] || [] })),
          repairOrders: repairs,
          layawayPlans: layaways.map((l) => ({ ...l, payments: layawayPaymentsMap[l.id] || [] })),
          purchases: purchasesList,
          debts: debtsList.map((d) => ({ ...d, payments: debtPaymentsMap[d.id] || [] })),
        });
      }

      const backup = {
        version: 2,
        type: "admin_full_backup",
        exportedAt: new Date().toISOString(),
        stores: allStoresData,
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="jewelpos_full_backup_${new Date().toISOString().split("T")[0]}.json"`);
      res.json(backup);
    } catch (error: any) {
      console.error("Admin backup error:", error);
      res.status(500).json({ message: `Backup failed: ${error.message}` });
    }
  });

  app.post("/api/internal/reset-store-data", async (req, res) => {
    const { token, storeId: rawStoreId } = req.body;
    if (token !== "RESET_OIL_STORE_2026_ONCE") return res.status(403).json({ message: "Forbidden" });
    const storeId = parseInt(rawStoreId);
    if (isNaN(storeId)) return res.status(400).json({ message: "Invalid storeId" });
    try {
      await db.transaction(async (tx) => {
        const batchIds = (await tx.select({ id: oilProductionBatches.id }).from(oilProductionBatches).where(eq(oilProductionBatches.storeId, storeId))).map(r => r.id);
        for (const bid of batchIds) await tx.delete(oilProductionInputs).where(eq(oilProductionInputs.batchId, bid));
        await tx.delete(oilProductionBatches).where(eq(oilProductionBatches.storeId, storeId));
        const saleIds = (await tx.select({ id: oilSales.id }).from(oilSales).where(eq(oilSales.storeId, storeId))).map(r => r.id);
        for (const sid of saleIds) await tx.delete(oilSaleItems).where(eq(oilSaleItems.saleId, sid));
        await tx.delete(oilSales).where(eq(oilSales.storeId, storeId));
        const purchaseIds = (await tx.select({ id: oilPurchases.id }).from(oilPurchases).where(eq(oilPurchases.storeId, storeId))).map(r => r.id);
        for (const pid of purchaseIds) await tx.delete(oilPurchaseItems).where(eq(oilPurchaseItems.purchaseId, pid));
        await tx.delete(oilPurchases).where(eq(oilPurchases.storeId, storeId));
        const debtIds = (await tx.select({ id: oilDebts.id }).from(oilDebts).where(eq(oilDebts.storeId, storeId))).map(r => r.id);
        for (const did of debtIds) await tx.delete(oilDebtPayments).where(eq(oilDebtPayments.debtId, did));
        await tx.delete(oilDebts).where(eq(oilDebts.storeId, storeId));
        const batchRecordIds = (await tx.select({ id: oilBatchRecords.id }).from(oilBatchRecords).where(eq(oilBatchRecords.storeId, storeId))).map(r => r.id);
        for (const bid of batchRecordIds) await tx.delete(oilBatchRecordItems).where(eq(oilBatchRecordItems.recordId, bid));
        await tx.delete(oilBatchRecords).where(eq(oilBatchRecords.storeId, storeId));
        await tx.delete(oilProducts).where(eq(oilProducts.storeId, storeId));
        await tx.delete(oilCustomers).where(eq(oilCustomers.storeId, storeId));
        await tx.delete(oilSuppliers).where(eq(oilSuppliers.storeId, storeId));
      });
      res.json({ message: `Store ${storeId} reset successfully.` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/reset-oil-store/:storeId", requireAdmin, async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) return res.status(400).json({ message: "Invalid storeId" });
    try {
      await db.transaction(async (tx) => {
        // production inputs → production batches
        const batchIds = (await tx.select({ id: oilProductionBatches.id }).from(oilProductionBatches).where(eq(oilProductionBatches.storeId, storeId))).map(r => r.id);
        for (const bid of batchIds) await tx.delete(oilProductionInputs).where(eq(oilProductionInputs.batchId, bid));
        await tx.delete(oilProductionBatches).where(eq(oilProductionBatches.storeId, storeId));
        // sale items → sales
        const saleIds = (await tx.select({ id: oilSales.id }).from(oilSales).where(eq(oilSales.storeId, storeId))).map(r => r.id);
        for (const sid of saleIds) await tx.delete(oilSaleItems).where(eq(oilSaleItems.saleId, sid));
        await tx.delete(oilSales).where(eq(oilSales.storeId, storeId));
        // purchase items → purchases
        const purchaseIds = (await tx.select({ id: oilPurchases.id }).from(oilPurchases).where(eq(oilPurchases.storeId, storeId))).map(r => r.id);
        for (const pid of purchaseIds) await tx.delete(oilPurchaseItems).where(eq(oilPurchaseItems.purchaseId, pid));
        await tx.delete(oilPurchases).where(eq(oilPurchases.storeId, storeId));
        // debt payments → debts
        const debtIds = (await tx.select({ id: oilDebts.id }).from(oilDebts).where(eq(oilDebts.storeId, storeId))).map(r => r.id);
        for (const did of debtIds) await tx.delete(oilDebtPayments).where(eq(oilDebtPayments.debtId, did));
        await tx.delete(oilDebts).where(eq(oilDebts.storeId, storeId));
        // batch record items → batch records (references customers)
        const batchRecordIds = (await tx.select({ id: oilBatchRecords.id }).from(oilBatchRecords).where(eq(oilBatchRecords.storeId, storeId))).map(r => r.id);
        for (const bid of batchRecordIds) await tx.delete(oilBatchRecordItems).where(eq(oilBatchRecordItems.recordId, bid));
        await tx.delete(oilBatchRecords).where(eq(oilBatchRecords.storeId, storeId));
        // delivery note items → delivery notes (references customers)
        const noteIds = (await tx.select({ id: oilDeliveryNotes.id }).from(oilDeliveryNotes).where(eq(oilDeliveryNotes.storeId, storeId))).map(r => r.id);
        for (const nid of noteIds) await tx.delete(oilDeliveryNoteItems).where(eq(oilDeliveryNoteItems.noteId, nid));
        await tx.delete(oilDeliveryNotes).where(eq(oilDeliveryNotes.storeId, storeId));
        // now safe to delete products, customers, suppliers
        await tx.delete(oilProducts).where(eq(oilProducts.storeId, storeId));
        await tx.delete(oilCustomers).where(eq(oilCustomers.storeId, storeId));
        await tx.delete(oilSuppliers).where(eq(oilSuppliers.storeId, storeId));
      });
      res.json({ message: `Store ${storeId} oil data reset successfully.` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/restore", requireAdmin, async (req, res) => {
    const backup = req.body;
    if (!backup || backup.version !== 2 || backup.type !== "admin_full_backup") {
      return res.status(400).json({ message: "Invalid backup file. Must be a full admin backup (version 2)." });
    }

    if (!backup.stores || !Array.isArray(backup.stores)) {
      return res.status(400).json({ message: "Invalid backup: no stores data found" });
    }

    try {
      let restoredCount = 0;

      await db.transaction(async (tx) => {
        for (const storeBackup of backup.stores) {
          const [createdStore] = await tx.insert(stores).values({
            name: storeBackup.store.name,
            ownerName: storeBackup.store.ownerName,
            phone: storeBackup.store.phone,
            email: storeBackup.store.email || null,
            address: storeBackup.store.address || null,
            isActive: storeBackup.store.isActive ?? true,
            brandColor: storeBackup.store.brandColor || "#d4a574",
            logoUrl: storeBackup.store.logoUrl || null,
            receiptHeader: storeBackup.store.receiptHeader || null,
            receiptFooter: storeBackup.store.receiptFooter || null,
          }).returning();

          const storeId = createdStore.id;

          if (storeBackup.users?.length) {
            for (const u of storeBackup.users) {
              await tx.insert(users).values({
                username: u.username + "_restored_" + storeId,
                password: u.password,
                email: u.email || null,
                role: "store",
                storeId,
              });
            }
          }

          const oldCategoryIdMap: Record<number, number> = {};
          const oldCustomerIdMap: Record<number, number> = {};
          const oldInventoryIdMap: Record<number, number> = {};

          if (storeBackup.categories?.length) {
            for (const cat of storeBackup.categories) {
              const [created] = await tx.insert(categories).values({
                storeId, name: cat.name, sortOrder: cat.sortOrder || 0,
              }).returning();
              oldCategoryIdMap[cat.id] = created.id;
            }
          }

          if (storeBackup.customers?.length) {
            for (const cust of storeBackup.customers) {
              const [created] = await tx.insert(customers).values({
                storeId, name: cust.name, phone: cust.phone || null, email: cust.email || null,
                address: cust.address || null, idNumber: cust.idNumber || null, notes: cust.notes || null,
                balance: cust.balance || "0",
              }).returning();
              oldCustomerIdMap[cust.id] = created.id;
            }
          }

          if (storeBackup.inventoryItems?.length) {
            for (const item of storeBackup.inventoryItems) {
              const newCatId = oldCategoryIdMap[item.categoryId];
              if (!newCatId) continue;
              const [created] = await tx.insert(inventoryItems).values({
                storeId, categoryId: newCatId, sku: item.sku, barcode: item.barcode || null,
                name: item.name, description: item.description || null, metalType: item.metalType || "gold",
                purity: item.purity || null, weightGrams: item.weightGrams || null, gemstone: item.gemstone || null,
                caratWeight: item.caratWeight || null, costPrice: item.costPrice, sellingPrice: item.sellingPrice,
                quantity: item.quantity ?? 1, isAvailable: item.isAvailable ?? true, imageUrl: item.imageUrl || null,
              }).returning();
              oldInventoryIdMap[item.id] = created.id;
            }
          }

          if (storeBackup.orders?.length) {
            for (const ord of storeBackup.orders) {
              const newCustId = ord.customerId ? (oldCustomerIdMap[ord.customerId] || null) : null;
              const [createdOrder] = await tx.insert(orders).values({
                storeId, customerId: newCustId, orderNumber: ord.orderNumber,
                customerName: ord.customerName || null, status: ord.status || "completed",
                subtotal: ord.subtotal, discount: ord.discount || "0",
                total: ord.total, paymentMethod: ord.paymentMethod || null, notes: ord.notes || null,
              }).returning();
              if (ord.items?.length) {
                for (const oi of ord.items) {
                  const newItemId = oldInventoryIdMap[oi.inventoryItemId];
                  if (!newItemId) continue;
                  await tx.insert(orderItems).values({
                    orderId: createdOrder.id, inventoryItemId: newItemId,
                    name: oi.name, sku: oi.sku || null, price: oi.price, quantity: oi.quantity ?? 1,
                  });
                }
              }
            }
          }

          if (storeBackup.repairOrders?.length) {
            for (const rep of storeBackup.repairOrders) {
              const newCustId = rep.customerId ? (oldCustomerIdMap[rep.customerId] || null) : null;
              await tx.insert(repairOrders).values({
                storeId, customerId: newCustId, ticketNumber: rep.ticketNumber,
                customerName: rep.customerName, customerPhone: rep.customerPhone || null,
                itemDescription: rep.itemDescription, issueDescription: rep.issueDescription,
                estimatedCost: rep.estimatedCost || null, finalCost: rep.finalCost || null,
                status: rep.status || "received", estimatedDate: rep.estimatedDate || null,
              });
            }
          }

          if (storeBackup.layawayPlans?.length) {
            for (const lay of storeBackup.layawayPlans) {
              const newCustId = lay.customerId ? (oldCustomerIdMap[lay.customerId] || null) : null;
              const newItemId = lay.inventoryItemId ? oldInventoryIdMap[lay.inventoryItemId] : null;
              if (!newItemId) continue;
              const [createdLayaway] = await tx.insert(layawayPlans).values({
                storeId, customerId: newCustId, inventoryItemId: newItemId,
                customerName: lay.customerName, customerPhone: lay.customerPhone || null,
                totalPrice: lay.totalPrice, amountPaid: lay.amountPaid || "0",
                remainingBalance: lay.remainingBalance, status: lay.status || "active",
                dueDate: lay.dueDate || null,
              }).returning();
              if (lay.payments?.length) {
                for (const pmt of lay.payments) {
                  await tx.insert(layawayPayments).values({
                    layawayId: createdLayaway.id, amount: pmt.amount, paymentMethod: pmt.paymentMethod || "cash",
                  });
                }
              }
            }
          }

          if (storeBackup.purchases?.length) {
            for (const pur of storeBackup.purchases) {
              const newCustId = pur.customerId ? (oldCustomerIdMap[pur.customerId] || null) : null;
              await tx.insert(purchases).values({
                storeId, customerId: newCustId, purchaseNumber: pur.purchaseNumber,
                customerName: pur.customerName || null, customerPhone: pur.customerPhone || null,
                metalType: pur.metalType || "gold", purity: pur.purity || null,
                weightGrams: pur.weightGrams || null, itemDescription: pur.itemDescription,
                purchasePrice: pur.purchasePrice, paymentMethod: pur.paymentMethod || "cash",
                notes: pur.notes || null, status: pur.status || "completed",
              });
            }
          }

          if (storeBackup.debts?.length) {
            for (const debt of storeBackup.debts) {
              const [createdDebt] = await tx.insert(debts).values({
                storeId, personName: debt.personName, personPhone: debt.personPhone || null,
                type: debt.type || "money", direction: debt.direction || "lent", description: debt.description || null,
                totalAmount: debt.totalAmount, amountPaid: debt.amountPaid || "0",
                remainingBalance: debt.remainingBalance, status: debt.status || "active",
              }).returning();
              if (debt.payments?.length) {
                for (const pmt of debt.payments) {
                  await tx.insert(debtPayments).values({
                    debtId: createdDebt.id, amount: pmt.amount,
                    paymentMethod: pmt.paymentMethod || "cash", notes: pmt.notes || null,
                  });
                }
              }
            }
          }

          restoredCount++;
        }
      });

      res.json({ message: `Restore completed successfully. ${restoredCount} store(s) restored.` });
    } catch (error: any) {
      console.error("Admin restore error:", error);
      res.status(500).json({ message: `Restore failed: ${error.message}` });
    }
  });

  app.get("/api/stores", requireAuth, async (req, res) => {
    if (req.user!.role === "admin") {
      const storesList = await storage.getStores();
      const storesWithUsernames = await Promise.all(
        storesList.map(async (store) => {
          const storeUsers = await storage.getUsersByStoreId(store.id);
          return {
            ...store,
            storeUsername: storeUsers.length > 0 ? storeUsers[0].username : null,
          };
        })
      );
      res.json(storesWithUsernames);
    } else {
      const effectiveStoreId = getEffectiveStoreId(req);
      if (effectiveStoreId) {
        const store = await storage.getStore(effectiveStoreId);
        res.json(store ? [store] : []);
      } else {
        res.json([]);
      }
    }
  });

  app.post("/api/stores", requireAdmin, async (req, res) => {
    try {
      const { username, password, ...storeData } = req.body;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const store = await storage.createStore({
        name: storeData.name,
        ownerName: storeData.ownerName,
        phone: storeData.phone,
        email: storeData.email || null,
        address: storeData.address || null,
        isActive: true,
        posSystem:
          storeData.posSystem === "oil"
            ? "oil"
            : storeData.posSystem === "fashion"
              ? "fashion"
              : storeData.posSystem === "restaurant"
                ? "restaurant"
                : storeData.posSystem === "pharmacy"
                  ? "pharmacy"
                  : "jewel",
        brandColor:
          storeData.posSystem === "fashion"
            ? "#db2777"
            : storeData.posSystem === "oil"
              ? "#2563eb"
              : storeData.posSystem === "restaurant"
                ? "#ea580c"
                : storeData.posSystem === "pharmacy"
                  ? "#0d9488"
                  : "#d4a574",
      });

      const standardPrice = String(await getStandardMonthlyPrice());

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await storage.createSubscription({
        storeId: store.id,
        plan: "standard",
        pricePerMonth: standardPrice,
        status: "active",
        startDate: new Date(),
        endDate,
        lastPaymentDate: new Date(),
      });

      await storage.createUser({
        username,
        password: await hashPassword(password),
        email: storeData.email || null,
        role: "store",
        storeId: store.id,
      });

      if (store.posSystem === "fashion") {
        const fashionCategories = ["Men", "Women", "Kids", "Accessories"];
        for (let i = 0; i < fashionCategories.length; i++) {
          await storage.createCategory({ storeId: store.id, name: fashionCategories[i], sortOrder: i });
        }
      }

      if (store.posSystem === "pharmacy") {
        const pharmacyCategories = ["Tablets", "Syrups", "Injections", "OTC", "Vitamins", "Cosmetics"];
        for (let i = 0; i < pharmacyCategories.length; i++) {
          await storage.createCategory({ storeId: store.id, name: pharmacyCategories[i], sortOrder: i });
        }
      }

      if (store.posSystem === "restaurant") {
        const menuCats = [
          { name: "Appetizers", nameAr: "المقبلات" },
          { name: "Main Dishes", nameAr: "الأطباق الرئيسية" },
          { name: "Drinks", nameAr: "المشروبات" },
          { name: "Desserts", nameAr: "الحلويات" },
        ];
        for (let i = 0; i < menuCats.length; i++) {
          await db.insert(menuCategories).values({ storeId: store.id, name: menuCats[i].name, nameAr: menuCats[i].nameAr, sortOrder: i });
        }
        for (let n = 1; n <= 8; n++) {
          await db.insert(restaurantTables).values({ storeId: store.id, tableNumber: n, name: `Table ${n}`, section: "main", status: "free" });
        }
      }

      res.status(201).json(store);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/stores/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const password = String(req.body?.password ?? "");
      const username = await setStoreLoginPassword(id, password, req.body?.username);
      const store = await storage.getStore(id);
      if (!store) return res.status(404).json({ message: "Store not found" });
      res.json({ ...store, storeUsername: username });
    } catch (err: any) {
      const status = err?.status || 500;
      if (status >= 500) console.error("[POST /api/stores/:id/reset-password]", err);
      res.status(status).json({ message: err?.message || "Failed to reset password" });
    }
  });

  app.patch("/api/stores/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { password, username: newUsername, ...rest } = req.body;

      const store = await storage.getStore(id);
      if (!store) return res.status(404).json({ message: "Store not found" });

      let storeUsers = await storage.getUsersByStoreId(id);

      if (password && String(password).length > 0) {
        await setStoreLoginPassword(id, String(password), newUsername);
        storeUsers = await storage.getUsersByStoreId(id);
      }

      if (rest.email) {
        for (const u of storeUsers) {
          await storage.updateUserEmail(u.id, rest.email);
        }
      }

      const storePatch: Record<string, unknown> = {};
      for (const key of [
        "name",
        "ownerName",
        "phone",
        "email",
        "address",
        "isActive",
        "brandColor",
        "logoUrl",
        "receiptHeader",
        "receiptFooter",
        "posSystem",
        "features",
      ] as const) {
        if (rest[key] !== undefined) storePatch[key] = rest[key];
      }

      if (Object.keys(storePatch).length > 0) {
        const updated = await storage.updateStore(id, storePatch as any);
        if (!updated) return res.status(404).json({ message: "Store not found" });
        return res.json(updated);
      }

      res.json(store);
    } catch (err: any) {
      const status = err?.status || 500;
      if (status >= 500) console.error("[PATCH /api/stores/:id]", err);
      res.status(status).json({ message: err?.message || "Failed to update store" });
    }
  });

  app.delete("/api/stores/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const store = await storage.getStore(id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    await storage.deleteStore(id);
    res.sendStatus(200);
  });

  const DEFAULT_PRICING = { monthly: 45000 };

  async function getStandardMonthlyPrice(): Promise<number> {
    try {
      const raw = await storage.getSetting("pricing");
      if (!raw) return DEFAULT_PRICING.monthly;
      const parsed = JSON.parse(raw);
      if (typeof parsed.monthly === "number") return parsed.monthly;
      const legacy =
        parsed.jewel?.standard ??
        parsed.fashion?.standard ??
        parsed.oil?.standard ??
        DEFAULT_PRICING.monthly;
      return legacy;
    } catch {
      return DEFAULT_PRICING.monthly;
    }
  }

  app.get("/api/pricing", async (_req, res) => {
    try {
      const raw = await storage.getSetting("pricing");
      if (!raw) return res.json(DEFAULT_PRICING);
      const parsed = JSON.parse(raw);
      if (typeof parsed.monthly === "number") return res.json(parsed);
      // Legacy tiered pricing — use standard plan or fall back to 45,000 IQD
      const legacy =
        parsed.jewel?.standard ??
        parsed.fashion?.standard ??
        parsed.oil?.standard ??
        DEFAULT_PRICING.monthly;
      res.json({ monthly: legacy });
    } catch {
      res.json(DEFAULT_PRICING);
    }
  });

  app.patch("/api/admin/pricing", requireAdmin, async (req, res) => {
    try {
      await storage.setSetting("pricing", JSON.stringify(req.body));
      res.json(req.body);
    } catch (err: any) {
      console.error("[PATCH /api/admin/pricing]", err);
      res.status(500).json({ message: err?.message || "Failed to save pricing" });
    }
  });

  app.get("/api/subscriptions", requireAdmin, async (req, res) => {
    const subs = await storage.getSubscriptions();
    res.json(subs);
  });

  app.patch("/api/subscriptions/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid subscription id" });
      const updated = await storage.updateSubscription(id, req.body);
      if (!updated) return res.status(404).json({ message: "Subscription not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("[PATCH /api/subscriptions/:id]", err);
      res.status(500).json({ message: err?.message || "Failed to update subscription" });
    }
  });

  app.post("/api/subscriptions/:id/renew", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const sub = await storage.getSubscription(id);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const standardPrice = String(await getStandardMonthlyPrice());

    const updated = await storage.updateSubscription(id, {
      status: "active",
      plan: "standard",
      pricePerMonth: standardPrice,
      endDate,
      lastPaymentDate: new Date(),
      renewalRequestedAt: null,
    });
    res.json(updated);
  });

  app.get("/api/store/branding", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const store = await storage.getStore(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({
      brandColor: store.brandColor,
      logoUrl: store.logoUrl,
      receiptHeader: store.receiptHeader,
      receiptFooter: store.receiptFooter,
      name: store.name,
      address: store.address,
    });
  });

  app.patch("/api/store/branding", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const parsed = updateBrandingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid branding data" });
    }
    const { brandColor, logoUrl, receiptHeader, receiptFooter } = parsed.data;
    const updated = await storage.updateStore(storeId, {
      brandColor,
      logoUrl,
      receiptHeader,
      receiptFooter,
    });
    if (!updated) return res.status(404).json({ message: "Store not found" });
    res.json({
      brandColor: updated.brandColor,
      logoUrl: updated.logoUrl,
      receiptHeader: updated.receiptHeader,
      receiptFooter: updated.receiptFooter,
      name: updated.name,
    });
  });

  app.get("/api/store/email", requireAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admin users cannot modify store email" });
    }
    res.json({ email: req.user.email || "" });
  });

  app.patch("/api/store/email", requireAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admin users cannot modify store email" });
    }
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    await storage.updateUserEmail(req.user.id, email);
    if (req.user.storeId) {
      await storage.updateStore(req.user.storeId, { email });
    }
    res.json({ email });
  });

  app.patch("/api/store/username", requireAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admin users cannot modify store username" });
    }
    const { username } = req.body;
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }
    const existing = await storage.getUserByUsername(username.trim());
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ message: "Username already taken" });
    }
    await storage.updateUsername(req.user.id, username.trim());
    res.json({ username: username.trim() });
  });

  app.patch("/api/store/password", requireAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admin users cannot modify store password" });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    const isValid = await comparePasswords(currentPassword, req.user.password);
    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    const hashed = await hashPassword(newPassword);
    await storage.updateUserPassword(req.user.id, hashed);
    res.json({ message: "Password updated successfully" });
  });

  app.get("/api/store/stock-audit", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });

    const fromDate = req.query.from ? new Date(req.query.from as string) : null;
    const toDate = req.query.to ? new Date(req.query.to as string) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const [cats, items, allOrders, allPurchases] = await Promise.all([
      storage.getCategories(storeId),
      storage.getInventoryItems(storeId),
      storage.getOrders(storeId),
      storage.getPurchases(storeId),
    ]);

    const filteredOrders = allOrders.filter((o) => {
      if (o.status === "cancelled" || o.status === "refunded") return false;
      const d = new Date(o.createdAt);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });

    const filteredPurchases = allPurchases.filter((p) => {
      if (p.status === "cancelled") return false;
      const d = new Date(p.createdAt);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });

    const orderItemArrays = await Promise.all(filteredOrders.map((ord) => storage.getOrderItems(ord.id)));
    const allOrderItems = orderItemArrays.flat();

    const itemSalesMap: Record<number, number> = {};
    const itemRevenueMap: Record<number, number> = {};
    for (const oi of allOrderItems) {
      itemSalesMap[oi.inventoryItemId] = (itemSalesMap[oi.inventoryItemId] || 0) + oi.quantity;
      itemRevenueMap[oi.inventoryItemId] = (itemRevenueMap[oi.inventoryItemId] || 0) + (parseFloat(oi.price) * oi.quantity);
    }

    const totalSoldQty = Object.values(itemSalesMap).reduce((s, v) => s + v, 0);
    const totalRevenue = Object.values(itemRevenueMap).reduce((s, v) => s + v, 0);

    const totalPurchasesCount = filteredPurchases.length;
    const totalPurchasesSpent = filteredPurchases.reduce((s, p) => s + parseFloat(p.purchasePrice), 0);

    const totalStockQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalCostValue = items.reduce((s, i) => s + (parseFloat(i.costPrice) * i.quantity), 0);
    const totalRetailValue = items.reduce((s, i) => s + (parseFloat(i.sellingPrice) * i.quantity), 0);

    const soldCostTotal = allOrderItems.reduce((s, oi) => {
      const inv = items.find((i) => i.id === oi.inventoryItemId);
      if (!inv) return s;
      return s + (parseFloat(inv.costPrice) * oi.quantity);
    }, 0);

    const categoryMap = new Map(cats.map((c) => [c.id, c.name]));

    const categorySummary = cats.map((cat) => {
      const catItems = items.filter((i) => i.categoryId === cat.id);
      return {
        id: cat.id,
        name: cat.name,
        itemCount: catItems.length,
        totalQty: catItems.reduce((s, i) => s + i.quantity, 0),
        costValue: catItems.reduce((s, i) => s + (parseFloat(i.costPrice) * i.quantity), 0),
        retailValue: catItems.reduce((s, i) => s + (parseFloat(i.sellingPrice) * i.quantity), 0),
      };
    });

    const itemDetails = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      categoryName: categoryMap.get(item.categoryId) || "",
      quantity: item.quantity,
      costPrice: parseFloat(item.costPrice),
      sellingPrice: parseFloat(item.sellingPrice),
      soldQty: itemSalesMap[item.id] || 0,
      soldRevenue: itemRevenueMap[item.id] || 0,
      profitMargin: parseFloat(item.sellingPrice) > 0
        ? (((parseFloat(item.sellingPrice) - parseFloat(item.costPrice)) / parseFloat(item.sellingPrice)) * 100).toFixed(1)
        : "0.0",
    }));

    res.json({
      stock: { totalQty: totalStockQty, costValue: totalCostValue, retailValue: totalRetailValue },
      sales: { orderCount: filteredOrders.length, totalQty: totalSoldQty, revenue: totalRevenue, costOfSold: soldCostTotal },
      purchases: { count: totalPurchasesCount, totalSpent: totalPurchasesSpent },
      netProfit: totalRevenue - soldCostTotal,
      categorySummary,
      itemDetails,
    });
  });

  app.get("/api/store/backup", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const store = await storage.getStore(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const [cats, items, custs, ords, repairs, layaways, purchasesList] = await Promise.all([
      storage.getCategories(storeId),
      storage.getInventoryItems(storeId),
      storage.getCustomers(storeId),
      storage.getOrders(storeId),
      storage.getRepairOrders(storeId),
      storage.getLayawayPlans(storeId),
      storage.getPurchases(storeId),
    ]);

    const orderItemsMap: Record<number, any[]> = {};
    for (const ord of ords) {
      orderItemsMap[ord.id] = await storage.getOrderItems(ord.id);
    }

    const layawayPaymentsMap: Record<number, any[]> = {};
    for (const lay of layaways) {
      layawayPaymentsMap[lay.id] = await storage.getLayawayPayments(lay.id);
    }

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      storeName: store.name,
      branding: {
        brandColor: store.brandColor,
        logoUrl: store.logoUrl,
        receiptHeader: store.receiptHeader,
        receiptFooter: store.receiptFooter,
      },
      categories: cats,
      inventoryItems: items,
      customers: custs,
      orders: ords.map((o) => ({ ...o, items: orderItemsMap[o.id] || [] })),
      repairOrders: repairs,
      layawayPlans: layaways.map((l) => ({ ...l, payments: layawayPaymentsMap[l.id] || [] })),
      purchases: purchasesList,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="backup_${store.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json"`);
    res.json(backup);
  });

  app.post("/api/store/restore", requireAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.role === "admin" && !req.session.impersonatingStoreId) {
      return res.status(403).json({ message: "Admin must impersonate a store to restore" });
    }
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });

    const backup = req.body;
    if (!backup || backup.version !== 1) {
      return res.status(400).json({ message: "Invalid backup file" });
    }

    try {
      await db.transaction(async (tx) => {
        const oldCategoryIdMap: Record<number, number> = {};
        const oldCustomerIdMap: Record<number, number> = {};
        const oldInventoryIdMap: Record<number, number> = {};

        if (backup.categories?.length) {
          for (const cat of backup.categories) {
            const [created] = await tx.insert(categories).values({ storeId, name: cat.name, sortOrder: cat.sortOrder || 0 }).returning();
            oldCategoryIdMap[cat.id] = created.id;
          }
        }

        if (backup.customers?.length) {
          for (const cust of backup.customers) {
            const [created] = await tx.insert(customers).values({
              storeId, name: cust.name, phone: cust.phone || null, email: cust.email || null,
              address: cust.address || null, idNumber: cust.idNumber || null, notes: cust.notes || null,
            }).returning();
            oldCustomerIdMap[cust.id] = created.id;
          }
        }

        if (backup.inventoryItems?.length) {
          for (const item of backup.inventoryItems) {
            const newCatId = oldCategoryIdMap[item.categoryId];
            if (!newCatId) continue;
            const [created] = await tx.insert(inventoryItems).values({
              storeId, categoryId: newCatId, sku: item.sku, barcode: item.barcode || null,
              name: item.name, description: item.description || null, metalType: item.metalType || "gold",
              purity: item.purity || null, weightGrams: item.weightGrams || null, gemstone: item.gemstone || null,
              caratWeight: item.caratWeight || null, costPrice: item.costPrice, sellingPrice: item.sellingPrice,
              quantity: item.quantity ?? 1, isAvailable: item.isAvailable ?? true, imageUrl: item.imageUrl || null,
            }).returning();
            oldInventoryIdMap[item.id] = created.id;
          }
        }

        if (backup.orders?.length) {
          for (const ord of backup.orders) {
            const newCustId = ord.customerId ? (oldCustomerIdMap[ord.customerId] || null) : null;
            const [createdOrder] = await tx.insert(orders).values({
              storeId, customerId: newCustId, orderNumber: ord.orderNumber,
              customerName: ord.customerName || null, status: ord.status || "completed",
              subtotal: ord.subtotal, discount: ord.discount || "0",
              total: ord.total, paymentMethod: ord.paymentMethod || null, notes: ord.notes || null,
            }).returning();
            if (ord.items?.length) {
              for (const oi of ord.items) {
                const newItemId = oldInventoryIdMap[oi.inventoryItemId];
                if (!newItemId) continue;
                await tx.insert(orderItems).values({
                  orderId: createdOrder.id, inventoryItemId: newItemId,
                  name: oi.name, sku: oi.sku || null, price: oi.price, quantity: oi.quantity ?? 1,
                });
              }
            }
          }
        }

        if (backup.repairOrders?.length) {
          for (const rep of backup.repairOrders) {
            const newCustId = rep.customerId ? (oldCustomerIdMap[rep.customerId] || null) : null;
            await tx.insert(repairOrders).values({
              storeId, customerId: newCustId, ticketNumber: rep.ticketNumber,
              customerName: rep.customerName, customerPhone: rep.customerPhone || null,
              itemDescription: rep.itemDescription, issueDescription: rep.issueDescription,
              estimatedCost: rep.estimatedCost || null, finalCost: rep.finalCost || null,
              status: rep.status || "received", estimatedDate: rep.estimatedDate || null,
            });
          }
        }

        if (backup.layawayPlans?.length) {
          for (const lay of backup.layawayPlans) {
            const newCustId = lay.customerId ? (oldCustomerIdMap[lay.customerId] || null) : null;
            const newItemId = oldInventoryIdMap[lay.inventoryItemId];
            if (!newItemId) continue;
            const [createdLayaway] = await tx.insert(layawayPlans).values({
              storeId, customerId: newCustId, inventoryItemId: newItemId,
              customerName: lay.customerName, customerPhone: lay.customerPhone || null,
              totalPrice: lay.totalPrice, amountPaid: lay.amountPaid || "0",
              remainingBalance: lay.remainingBalance, status: lay.status || "active",
              dueDate: lay.dueDate || null,
            }).returning();
            if (lay.payments?.length) {
              for (const pmt of lay.payments) {
                await tx.insert(layawayPayments).values({
                  layawayId: createdLayaway.id, amount: pmt.amount, paymentMethod: pmt.paymentMethod || "cash",
                });
              }
            }
          }
        }

        if (backup.purchases?.length) {
          for (const pur of backup.purchases) {
            const newCustId = pur.customerId ? (oldCustomerIdMap[pur.customerId] || null) : null;
            await tx.insert(purchases).values({
              storeId, customerId: newCustId, purchaseNumber: pur.purchaseNumber,
              customerName: pur.customerName || null, customerPhone: pur.customerPhone || null,
              metalType: pur.metalType || "gold", purity: pur.purity || null,
              weightGrams: pur.weightGrams || null, itemDescription: pur.itemDescription,
              purchasePrice: pur.purchasePrice, paymentMethod: pur.paymentMethod || "cash",
              notes: pur.notes || null, status: pur.status || "completed",
            });
          }
        }

        if (backup.branding) {
          await tx.update(stores).set({
            brandColor: backup.branding.brandColor,
            logoUrl: backup.branding.logoUrl,
            receiptHeader: backup.branding.receiptHeader,
            receiptFooter: backup.branding.receiptFooter,
          }).where(eq(stores.id, storeId));
        }
      });

      res.json({ message: "Restore completed successfully" });
    } catch (error: any) {
      console.error("Restore error:", error);
      res.status(500).json({ message: `Restore failed: ${error.message}` });
    }
  });

  app.get("/api/categories", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const cats = await storage.getCategories(storeId);
    res.json(cats);
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const category = await storage.createCategory({
      ...req.body,
      storeId,
      sortOrder: 0,
    });
    res.status(201).json(category);
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const cats = await storage.getCategories(storeId);
    if (!cats.find((c) => c.id === id)) return res.status(404).json({ message: "Category not found" });
    try {
      await storage.deleteCategory(id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ message: "Cannot delete category with items" });
    }
  });

  app.get("/api/inventory-brands", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    res.json(await storage.getInventoryBrands(storeId));
  });

  app.post("/api/inventory-brands", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Brand name is required" });
    const shippingPrice = req.body.shippingPrice != null ? String(req.body.shippingPrice) : "0";
    const existing = await storage.getInventoryBrands(storeId);
    if (existing.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ message: "Brand already exists" });
    }
    const brand = await storage.createInventoryBrand({
      storeId,
      name,
      shippingPrice,
      sortOrder: existing.length,
    });
    res.status(201).json(brand);
  });

  app.patch("/api/inventory-brands/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    const brands = await storage.getInventoryBrands(storeId);
    const existing = brands.find((b) => b.id === id);
    if (!existing) return res.status(404).json({ message: "Brand not found" });
    const updates: Record<string, unknown> = {};
    if (req.body.name != null) updates.name = String(req.body.name).trim();
    if (req.body.shippingPrice != null) updates.shippingPrice = String(req.body.shippingPrice);
    const updated = await storage.updateInventoryBrand(id, updates);
    res.json(updated);
  });

  app.patch("/api/inventory/bulk-brand", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const brand = String(req.body.brand || "").trim();
    if (!brand) return res.status(400).json({ message: "Brand name is required" });

    const storeBrands = await storage.getInventoryBrands(storeId);
    const brandRecord = storeBrands.find((b) => b.name.toLowerCase() === brand.toLowerCase());
    if (!brandRecord) {
      return res.status(400).json({ message: "Create the brand first (Brands & Shipping)" });
    }

    const itemIds: number[] | undefined = Array.isArray(req.body.itemIds)
      ? req.body.itemIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id))
      : undefined;
    const categoryId = req.body.categoryId != null ? Number(req.body.categoryId) : undefined;

    let rows = await storage.getInventoryItems(storeId);
    if (itemIds?.length) {
      rows = rows.filter((i) => itemIds.includes(i.id));
    } else if (categoryId) {
      rows = rows.filter((i) => i.categoryId === categoryId);
    } else {
      return res.status(400).json({ message: "Provide itemIds or categoryId" });
    }

    let updatedCount = 0;
    for (const row of rows) {
      await storage.updateInventoryItem(row.id, { brand: brandRecord.name });
      updatedCount++;
    }
    res.json({ updatedCount, brand: brandRecord.name, shippingPrice: brandRecord.shippingPrice });
  });

  app.delete("/api/inventory-brands/:id", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    const brands = await storage.getInventoryBrands(storeId);
    const brand = brands.find((b) => b.id === id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    const items = await storage.getInventoryItems(storeId);
    if (items.some((i) => i.brand?.toLowerCase() === brand.name.toLowerCase())) {
      return res.status(400).json({ message: "Cannot delete brand with assigned items" });
    }
    await storage.deleteInventoryBrand(id);
    res.sendStatus(204);
  });

  app.get("/api/inventory", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const items = await storage.getInventoryItems(storeId);
    res.json(items);
  });

  app.patch("/api/inventory/bulk-price", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });

    const { adjustmentType, percentage, applyTo, categoryId } = req.body;
    if (!adjustmentType || !percentage || !applyTo) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (typeof percentage !== "number" || !isFinite(percentage) || percentage <= 0) {
      return res.status(400).json({ message: "Percentage must be greater than 0" });
    }
    if (percentage > 1000) {
      return res.status(400).json({ message: "Percentage cannot exceed 1000%" });
    }
    if (adjustmentType === "decrease" && percentage > 100) {
      return res.status(400).json({ message: "Decrease percentage cannot exceed 100%" });
    }
    if (!["increase", "decrease"].includes(adjustmentType)) {
      return res.status(400).json({ message: "Invalid adjustment type" });
    }
    if (!["cost", "selling", "both"].includes(applyTo)) {
      return res.status(400).json({ message: "Invalid applyTo value" });
    }

    let items = await storage.getInventoryItems(storeId);
    if (categoryId) {
      items = items.filter((i) => i.categoryId === categoryId);
    }

    const multiplier = adjustmentType === "increase" ? 1 + percentage / 100 : 1 - percentage / 100;
    let updatedCount = 0;

    for (const item of items) {
      const updates: any = {};
      if (applyTo === "cost" || applyTo === "both") {
        updates.costPrice = (parseFloat(item.costPrice) * multiplier).toFixed(2);
      }
      if (applyTo === "selling" || applyTo === "both") {
        updates.sellingPrice = (parseFloat(item.sellingPrice) * multiplier).toFixed(2);
      }
      await storage.updateInventoryItem(item.id, updates);
      updatedCount++;
    }

    res.json({ updatedCount });
  });

  app.post("/api/inventory", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const body = { ...req.body };
    if (body.weightGrams === "" || body.weightGrams === undefined) body.weightGrams = null;
    if (body.caratWeight === "" || body.caratWeight === undefined) body.caratWeight = null;
    if (body.costPrice === "") body.costPrice = "0";
    if (body.sellingPrice === "") body.sellingPrice = "0";
    if (body.description === "") body.description = null;
    if (body.purity === "") body.purity = null;
    if (body.gemstone === "") body.gemstone = null;
    if (body.imageUrl === "") body.imageUrl = null;
    if (body.size === "") body.size = null;
    if (body.color === "") body.color = null;
    if (body.brand === "") body.brand = null;
    if (body.styleCode === "") body.styleCode = null;
    if (body.genericName === "") body.genericName = null;
    if (body.activeIngredient === "") body.activeIngredient = null;
    if (body.dosageForm === "") body.dosageForm = null;
    if (body.strength === "") body.strength = null;
    if (body.batchNumber === "") body.batchNumber = null;
    if (body.expiryDate === "") body.expiryDate = null;
    const store = await storage.getStore(storeId);
    const existingItems = await storage.getInventoryItems(storeId);
    if (!body.barcode || String(body.barcode).trim() === "") {
      body.barcode = generateInventoryBarcode(storeId, store?.posSystem, body.sku || "", existingItems);
    }
    try {
      const item = await storage.createInventoryItem({
        ...body,
        storeId,
      });
      res.status(201).json(item);
    } catch (err) {
      console.error("POST /api/inventory failed:", err);
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.post("/api/inventory/variants", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const store = await storage.getStore(storeId);
    if (!store || store.posSystem !== "fashion") {
      return res.status(400).json({ message: "Variants are for fashion stores only" });
    }

    const { baseName, brand, categoryId, costPrice, sellingPrice, styleCode, sizes, colors, defaultQuantity } = req.body;
    if (!baseName || !categoryId || !costPrice || !sellingPrice) {
      return res.status(400).json({ message: "baseName, categoryId, costPrice, and sellingPrice are required" });
    }
    const sizeList: string[] = Array.isArray(sizes)
      ? sizes.map((s: string) => String(s).trim()).filter(Boolean)
      : String(sizes || "").split(",").map((s) => s.trim()).filter(Boolean);
    const colorList: string[] = Array.isArray(colors)
      ? colors.map((c: string) => String(c).trim()).filter(Boolean)
      : String(colors || "").split(",").map((c) => c.trim()).filter(Boolean);
    if (sizeList.length === 0 || colorList.length === 0) {
      return res.status(400).json({ message: "At least one size and one color are required" });
    }

    const style = (styleCode || baseName.substring(0, 8)).toUpperCase().replace(/[^A-Z0-9]/g, "") || "STYLE";
    const existingItems = await storage.getInventoryItems(storeId);
    const defaultQty = Math.max(0, parseInt(String(defaultQuantity ?? 1), 10) || 0);
    const created: Awaited<ReturnType<typeof storage.createInventoryItem>>[] = [];

    for (const size of sizeList) {
      for (const color of colorList) {
        const colorCode = color.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 4) || "CLR";
        let sku = `${style}-${size}-${colorCode}`;
        let suffix = 1;
        while (existingItems.some((i) => i.sku === sku) || created.some((c) => c.sku === sku)) {
          sku = `${style}-${size}-${colorCode}-${suffix++}`;
        }
        const name = `${baseName} (${size} / ${color})`;
        const barcode = generateInventoryBarcode(storeId, "fashion", `${size}${colorCode}`, [...existingItems, ...created]);
        const item = await storage.createInventoryItem({
          storeId,
          sku,
          name,
          categoryId: Number(categoryId),
          metalType: "other",
          costPrice: String(costPrice),
          sellingPrice: String(sellingPrice),
          quantity: defaultQty,
          brand: brand || null,
          size,
          color,
          styleCode: style,
          barcode,
        });
        created.push(item);
        existingItems.push(item);
      }
    }

    res.status(201).json({ created, count: created.length });
  });

  app.patch("/api/inventory/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const items = await storage.getInventoryItems(storeId);
    if (!items.find((i) => i.id === id)) return res.status(404).json({ message: "Item not found" });
    const body = { ...req.body };
    if (body.weightGrams === "") body.weightGrams = null;
    if (body.caratWeight === "") body.caratWeight = null;
    if (body.description === "") body.description = null;
    if (body.purity === "") body.purity = null;
    if (body.gemstone === "") body.gemstone = null;
    if (body.imageUrl === "") body.imageUrl = null;
    if (body.size === "") body.size = null;
    if (body.color === "") body.color = null;
    if (body.brand === "") body.brand = null;
    if (body.styleCode === "") body.styleCode = null;
    if (body.genericName === "") body.genericName = null;
    if (body.activeIngredient === "") body.activeIngredient = null;
    if (body.dosageForm === "") body.dosageForm = null;
    if (body.strength === "") body.strength = null;
    if (body.batchNumber === "") body.batchNumber = null;
    if (body.expiryDate === "") body.expiryDate = null;
    if (body.costPrice === "") body.costPrice = "0";
    if (body.sellingPrice === "") body.sellingPrice = "0";
    if (body.categoryId !== undefined) {
      const categoryId = Number(body.categoryId);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return res.status(400).json({ message: "Invalid category" });
      }
      body.categoryId = categoryId;
    }
    if (body.quantity !== undefined) {
      const qty = Number(body.quantity);
      if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) {
        return res.status(400).json({ message: "Quantity must be a whole number 0 or greater" });
      }
      body.quantity = qty;
    }
    try {
      const updated = await storage.updateInventoryItem(id, body);
      if (!updated) return res.status(404).json({ message: "Item not found" });
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/inventory/:id failed:", err);
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const items = await storage.getInventoryItems(storeId);
    if (!items.find((i) => i.id === id)) return res.status(404).json({ message: "Item not found" });
    await storage.deleteInventoryItem(id);
    res.sendStatus(204);
  });

  app.get("/api/customers", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const customerList = await storage.getCustomers(storeId);
    res.json(customerList);
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const customer = await storage.createCustomer({ ...req.body, storeId });
    res.status(201).json(customer);
  });

  app.patch("/api/customers/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const custs = await storage.getCustomers(storeId);
    if (!custs.find((c) => c.id === id)) return res.status(404).json({ message: "Customer not found" });
    const updated = await storage.updateCustomer(id, req.body);
    res.json(updated);
  });

  app.post("/api/customers/:id/payment", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const cust = await storage.getCustomer(id);
    if (!cust || cust.storeId !== storeId) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    const currentBalance = parseFloat(cust.balance || "0");
    if (amount > currentBalance) {
      return res.status(400).json({ message: "Amount exceeds balance" });
    }
    const newBalance = (currentBalance - amount).toFixed(2);
    await db.update(customers).set({ balance: newBalance }).where(eq(customers.id, id));
    const updated = await storage.getCustomer(id);
    res.json(updated);
  });

  app.get("/api/orders", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const ordersList = await storage.getOrders(storeId);
    res.json(ordersList);
  });

  app.get("/api/orders/returnable", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const store = await storage.getStore(storeId);
    if (!store || store.posSystem === "oil") {
      return res.json([]);
    }

    const ordersList = await storage.getOrders(storeId);
    const result = [];

    for (const order of ordersList) {
      if (order.status !== "completed") continue;
      const items = await storage.getOrderItems(order.id);
      const returnableQty = items.reduce(
        (sum, oi) => sum + Math.max(0, oi.quantity - (oi.returnedQuantity || 0)),
        0,
      );
      if (returnableQty <= 0) continue;
      result.push({
        ...order,
        returnableQty,
        itemCount: items.length,
      });
    }

    res.json(result);
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });

    const orderNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { items, loyaltyPointsRedeemed: loyaltyRedeemedRaw, ...orderData } = req.body;
    const store = await storage.getStore(storeId);

    if (orderData.paymentMethod === "debit" && !orderData.customerId) {
      return res.status(400).json({ message: "Debit payment requires a customer" });
    }

    let loyaltyPointsRedeemed = 0;
    let loyaltyPointsEarned = 0;
    if (store?.posSystem === "fashion" && orderData.customerId) {
      loyaltyPointsRedeemed = Math.max(0, parseInt(String(loyaltyRedeemedRaw || 0), 10) || 0);
      const cust = await storage.getCustomer(orderData.customerId);
      if (!cust || cust.storeId !== storeId) {
        return res.status(400).json({ message: "Customer not found" });
      }
      if (loyaltyPointsRedeemed > (cust.loyaltyPoints || 0)) {
        return res.status(400).json({ message: "Insufficient loyalty points" });
      }
      loyaltyPointsEarned = calcLoyaltyEarned(parseFloat(orderData.total || "0"));
    }

    const order = await storage.createOrder({
      ...orderData,
      storeId,
      orderNumber,
      status: "completed",
      loyaltyPointsEarned,
      loyaltyPointsRedeemed,
    });

    const createdItems = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const orderItem = await storage.createOrderItem({
          orderId: order.id,
          inventoryItemId: item.inventoryItemId,
          name: item.name,
          sku: item.sku || null,
          price: item.price,
          quantity: item.quantity,
        });
        createdItems.push(orderItem);

        const invItem = await storage.getInventoryItem(item.inventoryItemId);
        if (invItem && invItem.quantity > 0) {
          await storage.updateInventoryItem(item.inventoryItemId, {
            quantity: invItem.quantity - item.quantity,
          });
        }
      }
    }

    if (orderData.paymentMethod === "debit" && orderData.customerId) {
      const cust = await storage.getCustomer(orderData.customerId);
      if (cust) {
        await db.update(customers).set({
          balance: (parseFloat(cust.balance || "0") + parseFloat(orderData.total)).toFixed(2),
        }).where(eq(customers.id, cust.id));
      }
    }

    if (store?.posSystem === "fashion" && orderData.customerId) {
      const cust = await storage.getCustomer(orderData.customerId);
      if (cust) {
        const newPoints = Math.max(0, (cust.loyaltyPoints || 0) - loyaltyPointsRedeemed + loyaltyPointsEarned);
        await storage.updateCustomer(cust.id, { loyaltyPoints: newPoints });
      }
    }

    res.status(201).json({ ...order, items: createdItems });
  });

  app.get("/api/orders/:id/items", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const order = await storage.getOrder(id);
    if (!order || order.storeId !== storeId) {
      return res.status(404).json({ message: "Order not found" });
    }
    const items = await storage.getOrderItems(id);
    res.json(items);
  });

  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const order = await storage.getOrder(id);
    if (!order || order.storeId !== storeId) {
      return res.status(404).json({ message: "Order not found" });
    }

    const newStatus = req.body.status;
    if (newStatus === "cancelled" || newStatus === "refunded") {
      if (order.status === "completed") {
        const store = await storage.getStore(storeId);
        const oi = await storage.getOrderItems(id);
        for (const item of oi) {
          const returnableQty = item.quantity - (item.returnedQuantity || 0);
          if (returnableQty <= 0) continue;
          const invItem = await storage.getInventoryItem(item.inventoryItemId);
          if (invItem) {
            await storage.updateInventoryItem(item.inventoryItemId, {
              quantity: invItem.quantity + returnableQty,
            });
          }
        }

        if (order.paymentMethod === "debit" && order.customerId) {
          const cust = await storage.getCustomer(order.customerId);
          if (cust) {
            const newBalance = Math.max(0, parseFloat(cust.balance || "0") - parseFloat(order.total));
            await db.update(customers).set({ balance: newBalance.toFixed(2) }).where(eq(customers.id, cust.id));
          }
        }

        if (store?.posSystem === "fashion" && order.customerId) {
          const cust = await storage.getCustomer(order.customerId);
          if (cust) {
            const earned = order.loyaltyPointsEarned || 0;
            const redeemed = order.loyaltyPointsRedeemed || 0;
            const newPoints = Math.max(0, (cust.loyaltyPoints || 0) - earned + redeemed);
            await storage.updateCustomer(cust.id, { loyaltyPoints: newPoints });
          }
        }
      }
    }

    const updated = await storage.updateOrder(id, { status: newStatus });
    res.json(updated);
  });

  app.post("/api/orders/:id/return", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const store = await storage.getStore(storeId);
    if (!store || store.posSystem === "oil") {
      return res.status(400).json({ message: "Returns are not available for this store type" });
    }

    const order = await storage.getOrder(id);
    if (!order || order.storeId !== storeId) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "completed") {
      return res.status(400).json({ message: "Only completed orders can be returned" });
    }

    const { items: returnItems } = req.body;
    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return res.status(400).json({ message: "Items array required" });
    }

    const orderItemsList = await storage.getOrderItems(id);
    let refundAmount = 0;
    let pointsToReverse = 0;
    const updatedItems = [];

    for (const ri of returnItems) {
      const orderItemId = parseInt(String(ri.orderItemId));
      const qty = parseInt(String(ri.quantity), 10);
      if (!orderItemId || !qty || qty <= 0) {
        return res.status(400).json({ message: "Each item needs orderItemId and positive quantity" });
      }
      const oi = orderItemsList.find((x) => x.id === orderItemId);
      if (!oi) return res.status(400).json({ message: `Order item ${orderItemId} not found` });
      const remaining = oi.quantity - (oi.returnedQuantity || 0);
      if (qty > remaining) {
        return res.status(400).json({ message: `Cannot return more than ${remaining} for ${oi.name}` });
      }

      const lineRefund = parseFloat(oi.price) * qty;
      refundAmount += lineRefund;
      pointsToReverse += calcLoyaltyEarned(lineRefund);

      const invItem = await storage.getInventoryItem(oi.inventoryItemId);
      if (invItem) {
        await storage.updateInventoryItem(oi.inventoryItemId, {
          quantity: invItem.quantity + qty,
        });
      }

      const updatedOi = await storage.updateOrderItem(orderItemId, {
        returnedQuantity: (oi.returnedQuantity || 0) + qty,
      });
      if (updatedOi) updatedItems.push(updatedOi);
    }

    const allItems = await storage.getOrderItems(id);
    const fullyReturned = allItems.every((oi) => (oi.returnedQuantity || 0) >= oi.quantity);
    const earnedReversal = Math.min(pointsToReverse, order.loyaltyPointsEarned || 0);
    const newEarned = Math.max(0, (order.loyaltyPointsEarned || 0) - earnedReversal);

    if (order.customerId && earnedReversal > 0) {
      const cust = await storage.getCustomer(order.customerId);
      if (cust) {
        await storage.updateCustomer(cust.id, {
          loyaltyPoints: Math.max(0, (cust.loyaltyPoints || 0) - earnedReversal),
        });
      }
    }

    if (fullyReturned) {
      await storage.updateOrder(id, { status: "refunded", loyaltyPointsEarned: newEarned });
    } else {
      await storage.updateOrder(id, { loyaltyPointsEarned: newEarned });
    }

    res.json({
      refundAmount: refundAmount.toFixed(2),
      loyaltyPointsReversed: earnedReversal,
      fullyReturned,
      items: updatedItems,
    });
  });

  app.get("/api/fashion/reports", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const store = await storage.getStore(storeId);
    if (!store || store.posSystem !== "fashion") {
      return res.status(400).json({ message: "Reports are for fashion stores only" });
    }

    const { from, to } = req.query as { from?: string; to?: string };
    const fromDate = from ? new Date(from) : undefined;
    let toDate = to ? new Date(to) : undefined;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    function inRange(d: Date) {
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    }

    const [allOrders, items, categories] = await Promise.all([
      storage.getOrders(storeId),
      storage.getInventoryItems(storeId),
      storage.getCategories(storeId),
    ]);

    const filteredOrders = allOrders.filter((o) => inRange(new Date(o.createdAt)));
    const completedOrders = filteredOrders.filter((o) => o.status === "completed");
    const refundedOrders = filteredOrders.filter((o) => o.status === "refunded");
    const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelled");

    const grossSales = completedOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const totalDiscount = completedOrders.reduce((s, o) => s + parseFloat(o.discount || "0"), 0);
    const returnsTotal = refundedOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const netSales = grossSales - returnsTotal;
    const loyaltyEarned = completedOrders.reduce((s, o) => s + (o.loyaltyPointsEarned || 0), 0);
    const loyaltyRedeemed = completedOrders.reduce((s, o) => s + (o.loyaltyPointsRedeemed || 0), 0);

    const orderItemArrays = await Promise.all(
      completedOrders.map((ord) => storage.getOrderItems(ord.id)),
    );
    const allOrderItems = orderItemArrays.flat();
    const itemsSold = allOrderItems.reduce((s, oi) => s + oi.quantity, 0);

    const paymentBreakdown: Record<string, { count: number; total: number }> = {};
    for (const o of completedOrders) {
      const method = o.paymentMethod || "cash";
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 };
      paymentBreakdown[method].count += 1;
      paymentBreakdown[method].total += parseFloat(o.total);
    }

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
    const topProducts = Object.values(itemSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const categorySales: Record<number, { name: string; qty: number; revenue: number }> = {};
    for (const oi of allOrderItems) {
      const inv = items.find((i) => i.id === oi.inventoryItemId);
      if (!inv) continue;
      const catId = inv.categoryId;
      if (!categorySales[catId]) {
        categorySales[catId] = {
          name: categories.find((c) => c.id === catId)?.name || "Other",
          qty: 0,
          revenue: 0,
        };
      }
      categorySales[catId].qty += oi.quantity;
      categorySales[catId].revenue += parseFloat(oi.price) * oi.quantity;
    }
    const topCategories = Object.values(categorySales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const dailyMap: Record<string, { date: string; sales: number; orders: number; returns: number }> = {};
    for (const o of filteredOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!dailyMap[key]) dailyMap[key] = { date: key, sales: 0, orders: 0, returns: 0 };
      if (o.status === "completed") {
        dailyMap[key].sales += parseFloat(o.total);
        dailyMap[key].orders += 1;
      }
      if (o.status === "refunded") {
        dailyMap[key].returns += parseFloat(o.total);
      }
    }
    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      grossSales,
      totalDiscount,
      returnsTotal,
      netSales,
      orderCount: completedOrders.length,
      itemsSold,
      avgOrderValue: completedOrders.length > 0 ? grossSales / completedOrders.length : 0,
      refundedCount: refundedOrders.length,
      cancelledCount: cancelledOrders.length,
      loyaltyEarned,
      loyaltyRedeemed,
      paymentBreakdown,
      topProducts,
      topCategories,
      dailyBreakdown,
      orders: completedOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: o.total,
        discount: o.discount,
        paymentMethod: o.paymentMethod,
        loyaltyPointsEarned: o.loyaltyPointsEarned,
        loyaltyPointsRedeemed: o.loyaltyPointsRedeemed,
        createdAt: o.createdAt,
      })),
      refundedOrders: refundedOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: o.total,
        createdAt: o.createdAt,
      })),
    });
  });

  app.patch("/api/orders/:id/items", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const order = await storage.getOrder(id);
    if (!order || order.storeId !== storeId) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "completed") {
      return res.status(400).json({ message: "Can only edit completed orders" });
    }

    const { items, discount, notes } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Items array required" });
    }

    const oldItems = await storage.getOrderItems(id);
    for (const oi of oldItems) {
      const invItem = await storage.getInventoryItem(oi.inventoryItemId);
      if (invItem) {
        await storage.updateInventoryItem(oi.inventoryItemId, {
          quantity: invItem.quantity + oi.quantity,
        });
      }
    }

    await db.delete(orderItems).where(eq(orderItems.orderId, id));

    let subtotal = 0;
    const createdItems = [];
    for (const item of items) {
      const orderItem = await storage.createOrderItem({
        orderId: id,
        inventoryItemId: item.inventoryItemId,
        name: item.name,
        sku: item.sku || null,
        price: item.price,
        quantity: item.quantity,
      });
      createdItems.push(orderItem);
      subtotal += parseFloat(item.price) * item.quantity;

      const invItem = await storage.getInventoryItem(item.inventoryItemId);
      if (invItem) {
        await storage.updateInventoryItem(item.inventoryItemId, {
          quantity: invItem.quantity - item.quantity,
        });
      }
    }

    const discountVal = parseFloat(discount || "0");
    const total = subtotal - discountVal;
    const updated = await storage.updateOrder(id, {
      subtotal: subtotal.toFixed(2),
      discount: discountVal.toFixed(2),
      total: total.toFixed(2),
      notes: notes || order.notes,
    });

    res.json({ ...updated, items: createdItems });
  });

  app.get("/api/repairs", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const repairs = await storage.getRepairOrders(storeId);
    res.json(repairs);
  });

  app.post("/api/repairs", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const ticketNumber = `RPR-${Date.now().toString(36).toUpperCase()}`;
    const repair = await storage.createRepairOrder({
      ...req.body,
      storeId,
      ticketNumber,
      status: "received",
    });
    res.status(201).json(repair);
  });

  app.patch("/api/repairs/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const repair = await storage.getRepairOrder(id);
    if (!repair || repair.storeId !== storeId) {
      return res.status(404).json({ message: "Repair order not found" });
    }
    const updated = await storage.updateRepairOrder(id, req.body);
    res.json(updated);
  });

  app.get("/api/layaways", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const plans = await storage.getLayawayPlans(storeId);
    res.json(plans);
  });

  app.post("/api/layaways", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const body = { ...req.body };
    if (body.dueDate && typeof body.dueDate === "string") {
      body.dueDate = new Date(body.dueDate);
    }
    const plan = await storage.createLayawayPlan({
      ...body,
      storeId,
      status: "active",
    });

    if (body.inventoryItemId) {
      const invItem = await storage.getInventoryItem(body.inventoryItemId);
      if (invItem && invItem.quantity > 0) {
        await storage.updateInventoryItem(body.inventoryItemId, {
          quantity: invItem.quantity - 1,
        });
      }
    }

    res.status(201).json(plan);
  });

  app.patch("/api/layaways/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const plan = await storage.getLayawayPlan(id);
    if (!plan || plan.storeId !== storeId) {
      return res.status(404).json({ message: "Layaway plan not found" });
    }
    const updateBody = { ...req.body };
    if (updateBody.dueDate && typeof updateBody.dueDate === "string") {
      updateBody.dueDate = new Date(updateBody.dueDate);
    }

    if (updateBody.status === "cancelled" && plan.status === "active" && plan.inventoryItemId) {
      const invItem = await storage.getInventoryItem(plan.inventoryItemId);
      if (invItem) {
        await storage.updateInventoryItem(plan.inventoryItemId, {
          quantity: invItem.quantity + 1,
        });
      }
    }

    const updated = await storage.updateLayawayPlan(id, updateBody);
    res.json(updated);
  });

  app.get("/api/layaways/:id/payments", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const plan = await storage.getLayawayPlan(id);
    if (!plan || plan.storeId !== storeId) {
      return res.status(404).json({ message: "Layaway plan not found" });
    }
    const payments = await storage.getLayawayPayments(id);
    res.json(payments);
  });

  app.post("/api/layaways/:id/payments", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const plan = await storage.getLayawayPlan(id);
    if (!plan || plan.storeId !== storeId) {
      return res.status(404).json({ message: "Layaway plan not found" });
    }

    const payment = await storage.createLayawayPayment({
      layawayId: id,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
    });

    const newPaid = parseFloat(plan.amountPaid) + parseFloat(req.body.amount);
    const newRemaining = parseFloat(plan.totalPrice) - newPaid;

    await storage.updateLayawayPlan(id, {
      amountPaid: newPaid.toString(),
      remainingBalance: newRemaining.toString(),
      status: newRemaining <= 0 ? "completed" : "active",
    });

    res.status(201).json(payment);
  });

  app.get("/api/purchases", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const purchaseList = await storage.getPurchases(storeId);
    res.json(purchaseList);
  });

  app.post("/api/purchases", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const purchaseNumber = `BUY-${Date.now().toString(36).toUpperCase()}`;
    const body = { ...req.body };
    if (body.weightGrams === "" || body.weightGrams === undefined) body.weightGrams = null;
    if (body.purity === "") body.purity = null;
    if (body.notes === "") body.notes = null;
    if (body.customerName === "") body.customerName = null;
    if (body.customerPhone === "") body.customerPhone = null;
    const purchase = await storage.createPurchase({
      ...body,
      storeId,
      purchaseNumber,
      status: "completed",
    });
    res.status(201).json(purchase);
  });

  app.patch("/api/purchases/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const purchase = await storage.getPurchase(id);
    if (!purchase || purchase.storeId !== storeId) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    const updated = await storage.updatePurchase(id, req.body);
    res.json(updated);
  });

  app.get("/api/debts", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.json([]);
    const debtList = await storage.getDebts(storeId);
    res.json(debtList);
  });

  app.post("/api/debts", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });
    const parsed = debtCreateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const total = parseFloat(parsed.data.totalAmount);
    if (!total || total <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    const debt = await storage.createDebt({
      personName: parsed.data.personName,
      personPhone: parsed.data.personPhone || null,
      type: parsed.data.type,
      direction: parsed.data.direction || "lent",
      description: parsed.data.description || null,
      storeId,
      totalAmount: total.toFixed(2),
      amountPaid: "0",
      remainingBalance: total.toFixed(2),
      status: "active",
    });
    res.status(201).json(debt);
  });

  app.patch("/api/debts/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const debt = await storage.getDebt(id);
    if (!debt || debt.storeId !== storeId) {
      return res.status(404).json({ message: "Debt not found" });
    }

    // Amount adjustment mode
    if (req.body.totalAmount !== undefined) {
      const newTotal = parseFloat(req.body.totalAmount);
      if (isNaN(newTotal) || newTotal < 0) {
        return res.status(400).json({ message: "Invalid totalAmount" });
      }
      const paid = parseFloat(debt.amountPaid);
      if (newTotal < paid) {
        return res.status(400).json({ message: "Total amount cannot be less than amount already paid" });
      }
      const newRemaining = (newTotal - paid).toFixed(2);
      const updateData: any = {
        totalAmount: newTotal.toFixed(2),
        remainingBalance: newRemaining,
      };
      if (req.body.description !== undefined) updateData.description = req.body.description;
      const updated = await storage.updateDebt(id, updateData);
      return res.json(updated);
    }

    // Status update mode
    const allowedStatuses = ["active", "paid", "cancelled"];
    const { status } = req.body;
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateDebt(id, { status });
    res.json(updated);
  });

  app.get("/api/debts/:id/payments", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const debt = await storage.getDebt(id);
    if (!debt || debt.storeId !== storeId) {
      return res.status(404).json({ message: "Debt not found" });
    }
    const payments = await storage.getDebtPayments(id);
    res.json(payments);
  });

  app.post("/api/debts/:id/payments", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "Forbidden" });
    const debt = await storage.getDebt(id);
    if (!debt || debt.storeId !== storeId) {
      return res.status(404).json({ message: "Debt not found" });
    }
    if (debt.status !== "active") {
      return res.status(400).json({ message: "Debt is not active" });
    }
    const parsed = debtPaymentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const amount = parseFloat(parsed.data.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    const remaining = parseFloat(debt.remainingBalance);
    if (amount > remaining) {
      return res.status(400).json({ message: "Amount exceeds remaining balance" });
    }

    const payment = await storage.createDebtPayment({
      debtId: id,
      amount: amount.toFixed(2),
      paymentMethod: parsed.data.paymentMethod || "cash",
      notes: parsed.data.notes || null,
    });

    const newPaid = (parseFloat(debt.amountPaid) + amount).toFixed(2);
    const newRemaining = (remaining - amount).toFixed(2);
    const newStatus = parseFloat(newRemaining) <= 0 ? "paid" : "active";

    await storage.updateDebt(id, {
      amountPaid: newPaid,
      remainingBalance: newRemaining,
      status: newStatus,
    });

    res.status(201).json(payment);
  });

  // ── POS Terminals ──────────────────────────────────────────────
  app.get("/api/pos-terminals", requireAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const terminals = await storage.getPosTerminals(storeId);
    res.json(terminals);
  });

  app.post("/api/pos-terminals", requireAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const terminal = await storage.createPosTerminal({ ...req.body, storeId });
    res.status(201).json(terminal);
  });

  app.get("/api/pos-terminals/:id", requireAuth, async (req, res) => {
    const terminal = await storage.getPosTerminal(parseInt(req.params.id));
    if (!terminal || terminal.storeId !== req.user!.storeId!) return res.status(404).json({ message: "Not found" });
    res.json(terminal);
  });

  app.patch("/api/pos-terminals/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPosTerminal(id);
    if (!existing || existing.storeId !== req.user!.storeId!) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updatePosTerminal(id, req.body);
    res.json(updated);
  });

  app.delete("/api/pos-terminals/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPosTerminal(id);
    if (!existing || existing.storeId !== req.user!.storeId!) return res.status(404).json({ message: "Not found" });
    await storage.deletePosTerminal(id);
    res.sendStatus(200);
  });

  // ── OilPOS Routes ────────────────────────────────────────────────
  const requireOilAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const effectiveStoreId = getEffectiveStoreId(req);
    if (!effectiveStoreId) return res.status(401).json({ message: "Unauthorized" });
    req.user.storeId = effectiveStoreId;
    next();
  };

  // Store info (branding) for OilPOS
  app.get("/api/oil/store-info", requireOilAuth, async (req, res) => {
    const store = await storage.getStore(req.user!.storeId!);
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  });

  app.get("/api/oil/subscription", requireOilAuth, async (req, res) => {
    const sub = await storage.getSubscriptionByStore(req.user!.storeId!);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });
    const now = new Date();
    const endDate = sub.endDate ? new Date(sub.endDate) : null;
    const daysLeft = endDate
      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    res.json({ ...sub, daysLeft });
  });

  app.post("/api/oil/subscription/request-renewal", requireOilAuth, async (req, res) => {
    const sub = await storage.getSubscriptionByStore(req.user!.storeId!);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });
    const updated = await storage.updateSubscription(sub.id, { renewalRequestedAt: new Date() } as any);
    res.json(updated);
  });

  // Products
  app.get("/api/oil/products", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilProducts(req.user!.storeId!));
  });
  app.post("/api/oil/products", requireOilAuth, async (req, res) => {
    const data = { ...req.body, storeId: req.user!.storeId! };
    res.json(await storage.createOilProduct(data));
  });
  app.patch("/api/oil/products/:id", requireOilAuth, async (req, res) => {
    res.json(await storage.updateOilProduct(parseInt(req.params.id), req.body));
  });
  app.delete("/api/oil/products/:id", requireOilAuth, async (req, res) => {
    try {
      await storage.deleteOilProduct(parseInt(req.params.id), req.user!.storeId!);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err?.message || "Error" }); }
  });

  // Customers
  app.get("/api/oil/customers", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilCustomers(req.user!.storeId!));
  });
  app.post("/api/oil/customers", requireOilAuth, async (req, res) => {
    res.json(await storage.createOilCustomer({ ...req.body, storeId: req.user!.storeId! }));
  });
  app.patch("/api/oil/customers/:id", requireOilAuth, async (req, res) => {
    res.json(await storage.updateOilCustomer(parseInt(req.params.id), req.body));
  });
  app.delete("/api/oil/customers/:id", requireOilAuth, async (req, res) => {
    try {
      await storage.deleteOilCustomer(parseInt(req.params.id), req.user!.storeId!);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err?.message || "Error" }); }
  });

  // Suppliers
  app.get("/api/oil/suppliers", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilSuppliers(req.user!.storeId!));
  });
  app.post("/api/oil/suppliers", requireOilAuth, async (req, res) => {
    res.json(await storage.createOilSupplier({ ...req.body, storeId: req.user!.storeId! }));
  });
  app.patch("/api/oil/suppliers/:id", requireOilAuth, async (req, res) => {
    res.json(await storage.updateOilSupplier(parseInt(req.params.id), req.body));
  });
  app.delete("/api/oil/suppliers/:id", requireOilAuth, async (req, res) => {
    try {
      await storage.deleteOilSupplier(parseInt(req.params.id), req.user!.storeId!);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err?.message || "Error" }); }
  });

  // Sales
  app.get("/api/oil/sales", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilSales(req.user!.storeId!));
  });
  app.get("/api/oil/sales/:id/items", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilSaleItems(parseInt(req.params.id)));
  });
  app.post("/api/oil/sales", requireOilAuth, async (req, res) => {
    const { items, ...saleData } = req.body;
    const storeId = req.user!.storeId!;
    // Generate invoice number
    const count = (await storage.getOilSales(storeId)).length + 1;
    const invoiceNumber = `OIL-${String(count).padStart(5, "0")}`;
    const sale = await storage.createOilSale({ ...saleData, storeId, invoiceNumber });
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await storage.createOilSaleItem({ ...item, saleId: sale.id });
        // Update stock
        const prod = await storage.getOilProduct(item.productId);
        if (prod) {
          await storage.updateOilProduct(item.productId, {
            currentStock: (parseFloat(prod.currentStock) - parseFloat(item.quantity)).toFixed(2),
          });
        }
      }
    }
    res.json(sale);
  });
  app.patch("/api/oil/sales/:id", requireOilAuth, async (req, res) => {
    const sale = await storage.getOilSale(parseInt(req.params.id));
    if (!sale) return res.status(404).json({ message: "Not found" });
    res.json(await storage.updateOilSale(parseInt(req.params.id), req.body));
  });

  app.delete("/api/oil/sales/:id", requireOilAuth, async (req, res) => {
    try {
      const storeId = req.user!.storeId!;
      const saleId = parseInt(req.params.id);
      await storage.deleteOilSale(saleId, storeId);
      res.json({ success: true });
    } catch (err: any) {
      console.error("DELETE /api/oil/sales error:", err);
      res.status(500).json({ message: err?.message || "Server error" });
    }
  });

  // Purchases
  app.get("/api/oil/purchases", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilPurchases(req.user!.storeId!));
  });
  app.get("/api/oil/purchases/:id/items", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilPurchaseItems(parseInt(req.params.id)));
  });
  app.post("/api/oil/purchases", requireOilAuth, async (req, res) => {
    try {
      const { items, ...purchaseData } = req.body;
      // Ensure supplierId is null (not 0) when no real supplier is selected
      if (!purchaseData.supplierId || Number(purchaseData.supplierId) === 0) {
        purchaseData.supplierId = null;
      }
      const purchase = await storage.createOilPurchase({ ...purchaseData, storeId: req.user!.storeId! });
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createOilPurchaseItem({ ...item, purchaseId: purchase.id });
          // Update stock
          const prod = await storage.getOilProduct(item.productId);
          if (prod) {
            await storage.updateOilProduct(item.productId, {
              currentStock: (parseFloat(prod.currentStock) + parseFloat(item.quantity)).toFixed(2),
            });
          }
        }
      }
      res.json(purchase);
    } catch (err: any) {
      console.error("Error creating oil purchase:", err);
      res.status(500).json({ message: err.message || "Failed to save purchase" });
    }
  });
  app.patch("/api/oil/purchases/:id", requireOilAuth, async (req, res) => {
    res.json(await storage.updateOilPurchase(parseInt(req.params.id), req.body));
  });
  app.delete("/api/oil/purchases/:id", requireOilAuth, async (req, res) => {
    try {
      await storage.deleteOilPurchase(parseInt(req.params.id), req.user!.storeId!);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err?.message || "Error" }); }
  });

  // Production Batches
  app.get("/api/oil/production", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilBatches(req.user!.storeId!));
  });
  app.get("/api/oil/production/:id/inputs", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilBatchInputs(parseInt(req.params.id)));
  });
  app.post("/api/oil/production", requireOilAuth, async (req, res) => {
    const { inputs, ...batchData } = req.body;
    const storeId = req.user!.storeId!;
    const count = (await storage.getOilBatches(storeId)).length + 1;
    const batchNumber = `BATCH-${String(count).padStart(4, "0")}`;
    const batch = await storage.createOilBatch({ ...batchData, storeId, batchNumber });
    if (inputs && Array.isArray(inputs)) {
      for (const input of inputs) {
        await storage.createOilBatchInput({ ...input, batchId: batch.id });
        // Deduct raw material stock
        const prod = await storage.getOilProduct(input.productId);
        if (prod) {
          await storage.updateOilProduct(input.productId, {
            currentStock: (parseFloat(prod.currentStock) - parseFloat(input.quantityUsed)).toFixed(2),
          });
        }
      }
    }
    // Add output to stock
    const outProd = await storage.getOilProduct(batchData.outputProductId);
    if (outProd) {
      await storage.updateOilProduct(batchData.outputProductId, {
        currentStock: (parseFloat(outProd.currentStock) + parseFloat(batchData.outputQuantity)).toFixed(2),
      });
    }
    res.json(batch);
  });
  app.patch("/api/oil/production/:id", requireOilAuth, async (req, res) => {
    res.json(await storage.updateOilBatch(parseInt(req.params.id), req.body));
  });
  app.delete("/api/oil/production/:id", requireOilAuth, async (req, res) => {
    try {
      await storage.deleteOilProductionBatch(parseInt(req.params.id), req.user!.storeId!);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err?.message || "Error" }); }
  });

  // Expenses
  app.get("/api/oil/expenses", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilExpenses(req.user!.storeId!));
  });
  app.post("/api/oil/expenses", requireOilAuth, async (req, res) => {
    res.json(await storage.createOilExpense({ ...req.body, storeId: req.user!.storeId! }));
  });
  app.patch("/api/oil/expenses/:id", requireOilAuth, async (req, res) => {
    res.json(await storage.updateOilExpense(parseInt(req.params.id), req.body));
  });
  app.delete("/api/oil/expenses/:id", requireOilAuth, async (req, res) => {
    await storage.deleteOilExpense(parseInt(req.params.id));
    res.sendStatus(200);
  });

  // Debts
  app.get("/api/oil/debts", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilDebts(req.user!.storeId!));
  });
  app.post("/api/oil/debts", requireOilAuth, async (req, res) => {
    const { totalAmount, ...rest } = req.body;
    const amt = parseFloat(totalAmount);
    res.json(await storage.createOilDebt({
      ...rest,
      storeId: req.user!.storeId!,
      totalAmount: amt.toFixed(2),
      amountPaid: "0.00",
      remainingBalance: amt.toFixed(2),
    }));
  });
  app.patch("/api/oil/debts/:id", requireOilAuth, async (req, res) => {
    res.json(await storage.updateOilDebt(parseInt(req.params.id), req.body));
  });
  app.delete("/api/oil/debts/:id", requireOilAuth, async (req, res) => {
    try {
      await storage.deleteOilDebt(parseInt(req.params.id), req.user!.storeId!);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err?.message || "Error" }); }
  });
  app.get("/api/oil/debts/:id/payments", requireOilAuth, async (req, res) => {
    res.json(await storage.getOilDebtPayments(parseInt(req.params.id)));
  });
  app.post("/api/oil/debts/:id/payments", requireOilAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const debt = await storage.getOilDebt(id);
    if (!debt) return res.status(404).json({ message: "Not found" });
    const amount = parseFloat(req.body.amount);
    if (amount > parseFloat(debt.remainingBalance)) {
      return res.status(400).json({ message: "Exceeds remaining balance" });
    }
    const payment = await storage.createOilDebtPayment({ debtId: id, amount: amount.toFixed(2), notes: req.body.notes || null });
    const newPaid = (parseFloat(debt.amountPaid) + amount).toFixed(2);
    const newRemaining = (parseFloat(debt.remainingBalance) - amount).toFixed(2);
    await storage.updateOilDebt(id, {
      amountPaid: newPaid,
      remainingBalance: newRemaining,
      status: parseFloat(newRemaining) <= 0 ? "paid" : "active",
    });
    res.json(payment);
  });

  // Dashboard summary
  app.get("/api/oil/dashboard", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const [products, sales, purchases, expenses, debts] = await Promise.all([
      storage.getOilProducts(storeId),
      storage.getOilSales(storeId),
      storage.getOilPurchases(storeId),
      storage.getOilExpenses(storeId),
      storage.getOilDebts(storeId),
    ]);
    const totalRevenue = sales.filter(s => s.status !== "cancelled").reduce((s, i) => s + parseFloat(i.totalAmount), 0);
    const totalCOGS = purchases.filter(p => p.status !== "cancelled").reduce((s, i) => s + parseFloat(i.totalAmount), 0);
    const totalExpenses = expenses.reduce((s, i) => s + parseFloat(i.amount), 0);
    const totalReceivable = debts.filter(d => d.direction === "owe_us" && d.status === "active").reduce((s, i) => s + parseFloat(i.remainingBalance), 0);
    const totalPayable = debts.filter(d => d.direction === "we_owe" && d.status === "active").reduce((s, i) => s + parseFloat(i.remainingBalance), 0);
    const lowStock = products.filter(p => parseFloat(p.currentStock) <= parseFloat(p.minStock) && parseFloat(p.minStock) > 0);
    const capitalRaw = await storage.getSetting(`oil_capital_${storeId}`);
    const capitalAmount = capitalRaw ? parseFloat(JSON.parse(capitalRaw).amount) : 0;
    const capitalRemaining = capitalAmount - totalCOGS;
    res.json({
      totalRevenue,
      totalCOGS,
      totalExpenses,
      netProfit: totalRevenue - totalCOGS - totalExpenses,
      totalReceivable,
      totalPayable,
      productCount: products.length,
      lowStockCount: lowStock.length,
      recentSales: sales.slice(0, 5),
      recentPurchases: purchases.slice(0, 5),
      capital: capitalAmount,
      capitalSpent: totalCOGS,
      capitalRemaining,
    });
  });

  // ── Capital (رأس المال) ────────────────────────────
  app.get("/api/oil/capital", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const raw = await storage.getSetting(`oil_capital_${storeId}`);
    const capital = raw ? parseFloat(JSON.parse(raw).amount) : 0;
    const purchases = await storage.getOilPurchases(storeId);
    const totalCOGS = purchases.filter(p => p.status !== "cancelled").reduce((s, i) => s + parseFloat(i.totalAmount), 0);
    res.json({ capital, capitalSpent: totalCOGS, capitalRemaining: capital - totalCOGS });
  });

  app.patch("/api/oil/capital", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const { amount } = req.body;
    if (typeof amount !== "number" || amount < 0) return res.status(400).json({ error: "Invalid amount" });
    await storage.setSetting(`oil_capital_${storeId}`, JSON.stringify({ amount }));
    res.json({ success: true, amount });
  });

  // ── Materials Summary (مخزون المشتريات + مواد خام) ───────────
  app.get("/api/oil/materials-summary", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const [products, purchases, batches] = await Promise.all([
      storage.getOilProducts(storeId),
      storage.getOilPurchases(storeId),
      storage.getOilBatches(storeId),
    ]);
    // Get all purchase items
    const purchaseItems: any[] = [];
    for (const p of purchases.filter(p => p.status !== "cancelled")) {
      const items = await storage.getOilPurchaseItems(p.id);
      purchaseItems.push(...items.map(i => ({ ...i, purchaseDate: p.createdAt })));
    }
    // Get all production inputs
    const productionInputs: any[] = [];
    for (const b of batches.filter(b => b.status !== "cancelled")) {
      const inputs = await storage.getOilBatchInputs(b.id);
      productionInputs.push(...inputs);
    }
    // Group purchase items by productId
    const purchasedQtyMap: Record<number, { qty: number; value: number; entries: any[] }> = {};
    for (const item of purchaseItems) {
      const pid = item.productId;
      if (!purchasedQtyMap[pid]) purchasedQtyMap[pid] = { qty: 0, value: 0, entries: [] };
      purchasedQtyMap[pid].qty += parseFloat(item.quantity);
      purchasedQtyMap[pid].value += parseFloat(item.total);
      purchasedQtyMap[pid].entries.push(item);
    }
    // Group production inputs by productId
    const usedQtyMap: Record<number, number> = {};
    for (const input of productionInputs) {
      usedQtyMap[input.productId] = (usedQtyMap[input.productId] || 0) + parseFloat(input.quantityUsed);
    }
    // Build summary: all products that were ever purchased OR are raw_material/packaging
    const relevantProductIds = new Set([
      ...products.filter(p => ["raw_material", "packaging", "spare_part", "other"].includes(p.category)).map(p => p.id),
      ...Object.keys(purchasedQtyMap).map(Number),
    ]);
    const summary = Array.from(relevantProductIds).map(pid => {
      const prod = products.find(p => p.id === pid);
      if (!prod) return null;
      const purchased = purchasedQtyMap[pid] || { qty: 0, value: 0, entries: [] };
      const used = usedQtyMap[pid] || 0;
      return {
        productId: pid,
        name: prod.name,
        nameAr: prod.nameAr,
        category: prod.category,
        unit: prod.unit,
        purchasePrice: prod.purchasePrice,
        currentStock: prod.currentStock,
        minStock: prod.minStock,
        totalPurchasedQty: purchased.qty,
        totalPurchasedValue: purchased.value,
        totalUsedInProduction: used,
        purchaseEntries: purchased.entries,
      };
    }).filter(Boolean);
    res.json(summary);
  });

  // ── Reports ────────────────────────────────────────────────
  app.get("/api/oil/reports", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const { from, to } = req.query as { from?: string; to?: string };
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const [sales, purchases, expenses] = await Promise.all([
      storage.getOilSales(storeId),
      storage.getOilPurchases(storeId),
      storage.getOilExpenses(storeId),
    ]);
    function inRange(d: Date) {
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    }
    const filteredSales = sales.filter(s => s.status !== "cancelled" && inRange(new Date(s.createdAt)));
    const filteredPurchases = purchases.filter(p => p.status !== "cancelled" && inRange(new Date(p.createdAt)));
    const filteredExpenses = expenses.filter(e => inRange(new Date(e.createdAt)));
    const totalRevenue = filteredSales.reduce((s, i) => s + parseFloat(i.totalAmount), 0);
    const totalPurchases = filteredPurchases.reduce((s, i) => s + parseFloat(i.totalAmount), 0);
    const totalExpenses = filteredExpenses.reduce((s, i) => s + parseFloat(i.amount), 0);
    res.json({
      totalRevenue,
      totalPurchases,
      totalExpenses,
      netProfit: totalRevenue - totalPurchases - totalExpenses,
      sales: filteredSales,
      purchases: filteredPurchases,
      expenses: filteredExpenses,
    });
  });

  // ── Batch Records (سجل المنتجات) ────────────────────────────
  app.get("/api/oil/batch-records", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const records = await db.select().from(oilBatchRecords)
      .where(eq(oilBatchRecords.storeId, storeId))
      .orderBy(desc(oilBatchRecords.createdAt));
    res.json(records);
  });

  app.get("/api/oil/batch-records/:id/items", requireOilAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const items = await db.select().from(oilBatchRecordItems)
      .where(eq(oilBatchRecordItems.recordId, id));
    res.json(items);
  });

  app.post("/api/oil/batch-records", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const { items: rawItems, ...recordData } = req.body;
    const count = (await db.select().from(oilBatchRecords).where(eq(oilBatchRecords.storeId, storeId))).length + 1;
    const recordNumber = `BR-${String(count).padStart(4, "0")}`;
    try {
      const [record] = await db.insert(oilBatchRecords).values({
        ...recordData, storeId, recordNumber, date: new Date(recordData.date)
      }).returning();
      if (rawItems && Array.isArray(rawItems)) {
        for (const item of rawItems) {
          if (item.brand || item.quantity || item.retailPrice) {
            await db.insert(oilBatchRecordItems).values({ ...item, recordId: record.id });
          }
        }
      }
      res.status(201).json(record);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/oil/batch-records/:id", requireOilAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(oilBatchRecordItems).where(eq(oilBatchRecordItems.recordId, id));
    await db.delete(oilBatchRecords).where(eq(oilBatchRecords.id, id));
    res.sendStatus(204);
  });

  // ── Delivery Notes ──────────────────────────────────────────
  app.get("/api/oil/delivery-notes", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const notes = await db.select().from(oilDeliveryNotes)
      .where(eq(oilDeliveryNotes.storeId, storeId))
      .orderBy(desc(oilDeliveryNotes.createdAt));
    res.json(notes);
  });

  app.get("/api/oil/delivery-notes/:id/items", requireOilAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const items = await db.select().from(oilDeliveryNoteItems)
      .where(eq(oilDeliveryNoteItems.noteId, id))
      .orderBy(oilDeliveryNoteItems.rowNumber);
    res.json(items);
  });

  app.post("/api/oil/delivery-notes", requireOilAuth, async (req, res) => {
    const storeId = req.user!.storeId!;
    const { items: rawItems, ...noteData } = req.body;
    const count = (await db.select().from(oilDeliveryNotes).where(eq(oilDeliveryNotes.storeId, storeId))).length + 1;
    const noteNumber = `DN-${String(count).padStart(4, "0")}`;
    try {
      const [note] = await db.insert(oilDeliveryNotes).values({ ...noteData, storeId, noteNumber, date: new Date(noteData.date) }).returning();
      if (rawItems && Array.isArray(rawItems)) {
        for (const item of rawItems) {
          if (item.description || item.quantity || item.unitPrice) {
            await db.insert(oilDeliveryNoteItems).values({ ...item, noteId: note.id });
          }
        }
      }
      res.status(201).json(note);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/oil/delivery-notes/:id", requireOilAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(oilDeliveryNoteItems).where(eq(oilDeliveryNoteItems.noteId, id));
    await db.delete(oilDeliveryNotes).where(eq(oilDeliveryNotes.id, id));
    res.sendStatus(204);
  });

  // ── Signup Requests (public) ────────────────────────────────
  app.post("/api/signup-requests", async (req, res) => {
    const parsed = insertSignupRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const [created] = await db.insert(signupRequests).values(parsed.data).returning();
    res.status(201).json(created);
  });

  // ── Signup Requests (admin only) ────────────────────────────
  app.get("/api/signup-requests", requireAdmin, async (_req, res) => {
    const rows = await db.select().from(signupRequests).orderBy(desc(signupRequests.createdAt));
    res.json(rows);
  });

  app.patch("/api/signup-requests/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [updated] = await db.update(signupRequests).set({ status }).where(eq(signupRequests.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/signup-requests/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(signupRequests).where(eq(signupRequests.id, id));
    res.sendStatus(204);
  });

  registerRestaurantRoutes(app, { requireAuth, getEffectiveStoreId, sendValidationError });
  registerPharmacyRoutes(app, { requireAuth, getEffectiveStoreId, sendValidationError });
  registerIqOrderRoutes(app, { sendValidationError });
  registerDriverRoutes(app, { requireAuth, getEffectiveStoreId, sendValidationError });
  registerPushRoutes(app, { sendValidationError });
  void ensureDemoDriver();
  void initPushService();

  return httpServer;
}
