import {
  users, restaurants, subscriptions, menuCategories, menuItems, orders, orderItems,
  type User, type InsertUser,
  type Restaurant, type InsertRestaurant,
  type Subscription, type InsertSubscription,
  type MenuCategory, type InsertMenuCategory,
  type MenuItem, type InsertMenuItem,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;

  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByRestaurant(restaurantId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  getMenuCategories(restaurantId: number): Promise<MenuCategory[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  deleteMenuCategory(id: number): Promise<void>;

  getMenuItems(restaurantId: number): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<void>;

  getOrders(restaurantId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order | undefined>;

  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getRestaurants(): Promise<Restaurant[]> {
    return db.select().from(restaurants).orderBy(desc(restaurants.createdAt));
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant || undefined;
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [created] = await db.insert(restaurants).values(restaurant).returning();
    return created;
  }

  async updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [updated] = await db.update(restaurants).set(data).where(eq(restaurants.id, id)).returning();
    return updated || undefined;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.startDate));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub || undefined;
  }

  async getSubscriptionByRestaurant(restaurantId: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.restaurantId, restaurantId));
    return sub || undefined;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(subscription).returning();
    return created;
  }

  async updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return updated || undefined;
  }

  async getMenuCategories(restaurantId: number): Promise<MenuCategory[]> {
    return db.select().from(menuCategories).where(eq(menuCategories.restaurantId, restaurantId)).orderBy(menuCategories.sortOrder);
  }

  async createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    const [created] = await db.insert(menuCategories).values(category).returning();
    return created;
  }

  async deleteMenuCategory(id: number): Promise<void> {
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  async getMenuItems(restaurantId: number): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  async updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db.update(menuItems).set(data).where(eq(menuItems.id, id)).returning();
    return updated || undefined;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async getOrders(restaurantId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.restaurantId, restaurantId)).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return updated || undefined;
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }
}

export const storage = new DatabaseStorage();
