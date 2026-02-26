import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { insertStoreSchema, insertInventoryItemSchema, insertCustomerSchema, updateBrandingSchema, insertPurchaseSchema } from "@shared/schema";

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

  app.get("/api/stores", requireAuth, async (req, res) => {
    if (req.user!.role === "admin") {
      const storesList = await storage.getStores();
      res.json(storesList);
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
    const updated = await storage.updateOrder(id, { status: req.body.status });
    res.json(updated);
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

  return httpServer;
}
