import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertRestaurantSchema, insertMenuCategorySchema, insertMenuItemSchema } from "@shared/schema";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.get("/api/restaurants", requireAuth, async (req, res) => {
    if (req.user!.role === "admin") {
      const restaurants = await storage.getRestaurants();
      res.json(restaurants);
    } else {
      if (req.user!.restaurantId) {
        const restaurant = await storage.getRestaurant(req.user!.restaurantId);
        res.json(restaurant ? [restaurant] : []);
      } else {
        res.json([]);
      }
    }
  });

  app.post("/api/restaurants", requireAdmin, async (req, res) => {
    try {
      const { username, password, plan, ...restaurantData } = req.body;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const restaurant = await storage.createRestaurant({
        name: restaurantData.name,
        ownerName: restaurantData.ownerName,
        phone: restaurantData.phone,
        email: restaurantData.email || null,
        address: restaurantData.address || null,
        isActive: true,
      });

      const planPrices: Record<string, string> = {
        basic: "29.99",
        standard: "59.99",
        premium: "99.99",
      };

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await storage.createSubscription({
        restaurantId: restaurant.id,
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
        role: "restaurant",
        restaurantId: restaurant.id,
      });

      res.status(201).json(restaurant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/restaurants/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateRestaurant(id, req.body);
    if (!updated) return res.status(404).json({ message: "Restaurant not found" });
    res.json(updated);
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

  app.get("/api/menu-categories", requireAuth, async (req, res) => {
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.json([]);
    const categories = await storage.getMenuCategories(restaurantId);
    res.json(categories);
  });

  app.post("/api/menu-categories", requireAuth, async (req, res) => {
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.status(400).json({ message: "No restaurant assigned" });

    const category = await storage.createMenuCategory({
      ...req.body,
      restaurantId,
      sortOrder: 0,
    });
    res.status(201).json(category);
  });

  app.delete("/api/menu-categories/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.status(403).json({ message: "Forbidden" });
    const cats = await storage.getMenuCategories(restaurantId);
    if (!cats.find((c) => c.id === id)) return res.status(404).json({ message: "Category not found" });
    try {
      await storage.deleteMenuCategory(id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ message: "Cannot delete category with items" });
    }
  });

  app.get("/api/menu-items", requireAuth, async (req, res) => {
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.json([]);
    const items = await storage.getMenuItems(restaurantId);
    res.json(items);
  });

  app.post("/api/menu-items", requireAuth, async (req, res) => {
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.status(400).json({ message: "No restaurant assigned" });

    const item = await storage.createMenuItem({
      ...req.body,
      restaurantId,
      isAvailable: true,
    });
    res.status(201).json(item);
  });

  app.patch("/api/menu-items/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.status(403).json({ message: "Forbidden" });
    const items = await storage.getMenuItems(restaurantId);
    if (!items.find((i) => i.id === id)) return res.status(404).json({ message: "Item not found" });
    const updated = await storage.updateMenuItem(id, req.body);
    res.json(updated);
  });

  app.delete("/api/menu-items/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.status(403).json({ message: "Forbidden" });
    const items = await storage.getMenuItems(restaurantId);
    if (!items.find((i) => i.id === id)) return res.status(404).json({ message: "Item not found" });
    await storage.deleteMenuItem(id);
    res.sendStatus(204);
  });

  app.get("/api/orders", requireAuth, async (req, res) => {
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.json([]);
    const ordersList = await storage.getOrders(restaurantId);
    res.json(ordersList);
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.status(400).json({ message: "No restaurant assigned" });

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { items, ...orderData } = req.body;

    const order = await storage.createOrder({
      ...orderData,
      restaurantId,
      orderNumber,
      status: "pending",
    });

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await storage.createOrderItem({
          orderId: order.id,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        });
      }
    }

    res.status(201).json(order);
  });

  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) return res.status(403).json({ message: "Forbidden" });
    const order = await storage.getOrder(id);
    if (!order || order.restaurantId !== restaurantId) {
      return res.status(404).json({ message: "Order not found" });
    }
    const updated = await storage.updateOrder(id, { status: req.body.status });
    res.json(updated);
  });

  return httpServer;
}
