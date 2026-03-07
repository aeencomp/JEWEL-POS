import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { insertStoreSchema, insertInventoryItemSchema, insertCustomerSchema, updateBrandingSchema, insertPurchaseSchema, insertDebtSchema, insertDebtPaymentSchema } from "@shared/schema";
import { db } from "./db";
import { categories, customers, inventoryItems, orders, orderItems, repairOrders, layawayPlans, layawayPayments, purchases, stores, debts, debtPayments, users } from "@shared/schema";
import { eq } from "drizzle-orm";
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

function getEffectiveStoreId(req: any): number | null {
  if (req.user.role === "admin" && req.session.impersonatingStoreId) {
    return req.session.impersonatingStoreId;
  }
  return req.user.storeId;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  const express = await import("express");
  app.use("/uploads", express.default.static(uploadsDir));

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
      const { username, password, plan, ...storeData } = req.body;

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
      });

      const planPrices: Record<string, string> = {
        basic: "35000",
        standard: "75000",
        premium: "125000",
      };

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await storage.createSubscription({
        storeId: store.id,
        plan: plan || "basic",
        pricePerMonth: planPrices[plan || "basic"],
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

      res.status(201).json(store);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/stores/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { password, ...storeData } = req.body;

    const storeUsers = await storage.getUsersByStoreId(id);

    if (password && password.length > 0) {
      if (storeUsers.length > 0) {
        const hashedPassword = await hashPassword(password);
        for (const u of storeUsers) {
          await storage.updateUserPassword(u.id, hashedPassword);
        }
      }
    }

    if (storeData.email) {
      for (const u of storeUsers) {
        await storage.updateUserEmail(u.id, storeData.email);
      }
    }

    const updated = await storage.updateStore(id, storeData);
    if (!updated) return res.status(404).json({ message: "Store not found" });
    res.json(updated);
  });

  app.delete("/api/stores/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const store = await storage.getStore(id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    await storage.deleteStore(id);
    res.sendStatus(200);
  });

  app.get("/api/subscriptions", requireAdmin, async (req, res) => {
    const subs = await storage.getSubscriptions();
    res.json(subs);
  });

  app.patch("/api/subscriptions/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateSubscription(id, req.body);
    if (!updated) return res.status(404).json({ message: "Subscription not found" });
    res.json(updated);
  });

  app.post("/api/subscriptions/:id/renew", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const sub = await storage.getSubscription(id);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const updated = await storage.updateSubscription(id, {
      status: "active",
      endDate,
      lastPaymentDate: new Date(),
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
    if (!body.barcode) {
      body.barcode = `JWL${storeId}${Date.now().toString(36).toUpperCase()}`;
    }
    const item = await storage.createInventoryItem({
      ...body,
      storeId,
    });
    res.status(201).json(item);
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
    const updated = await storage.updateInventoryItem(id, body);
    res.json(updated);
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

  app.post("/api/orders", requireAuth, async (req, res) => {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(400).json({ message: "No store assigned" });

    const orderNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { items, ...orderData } = req.body;

    if (orderData.paymentMethod === "debit" && !orderData.customerId) {
      return res.status(400).json({ message: "Debit payment requires a customer" });
    }

    const order = await storage.createOrder({
      ...orderData,
      storeId,
      orderNumber,
      status: "completed",
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
        const oi = await storage.getOrderItems(id);
        for (const item of oi) {
          const invItem = await storage.getInventoryItem(item.inventoryItemId);
          if (invItem) {
            await storage.updateInventoryItem(item.inventoryItemId, {
              quantity: invItem.quantity + item.quantity,
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
      }
    }

    const updated = await storage.updateOrder(id, { status: newStatus });
    res.json(updated);
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
    const bodySchema = insertDebtSchema.pick({
      personName: true,
      personPhone: true,
      type: true,
      direction: true,
      totalAmount: true,
      description: true,
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
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
    const paymentSchema = insertDebtPaymentSchema.pick({
      amount: true,
      paymentMethod: true,
      notes: true,
    });
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
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

  return httpServer;
}
