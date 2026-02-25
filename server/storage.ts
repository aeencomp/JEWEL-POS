import {
  users, stores, subscriptions, categories, inventoryItems, customers, orders, orderItems,
  repairOrders, layawayPlans, layawayPayments, purchases, verificationCodes,
  type User, type InsertUser,
  type Store, type InsertStore,
  type Subscription, type InsertSubscription,
  type Category, type InsertCategory,
  type InventoryItem, type InsertInventoryItem,
  type Customer, type InsertCustomer,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type RepairOrder, type InsertRepairOrder,
  type LayawayPlan, type InsertLayawayPlan,
  type LayawayPayment, type InsertLayawayPayment,
  type Purchase, type InsertPurchase,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, gt } from "drizzle-orm";
import { pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getUsersByStoreId(storeId: number): Promise<User[]>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  getStores(): Promise<Store[]>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined>;
  deleteStore(id: number): Promise<void>;

  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByStore(storeId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  getCategories(storeId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  getInventoryItems(storeId: number): Promise<InventoryItem[]>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<void>;

  getCustomers(storeId: number): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined>;

  getOrders(storeId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order | undefined>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;

  getRepairOrders(storeId: number): Promise<RepairOrder[]>;
  getRepairOrder(id: number): Promise<RepairOrder | undefined>;
  createRepairOrder(repair: InsertRepairOrder): Promise<RepairOrder>;
  updateRepairOrder(id: number, data: Partial<InsertRepairOrder>): Promise<RepairOrder | undefined>;

  getLayawayPlans(storeId: number): Promise<LayawayPlan[]>;
  getLayawayPlan(id: number): Promise<LayawayPlan | undefined>;
  createLayawayPlan(plan: InsertLayawayPlan): Promise<LayawayPlan>;
  updateLayawayPlan(id: number, data: Partial<InsertLayawayPlan>): Promise<LayawayPlan | undefined>;
  getLayawayPayments(layawayId: number): Promise<LayawayPayment[]>;
  createLayawayPayment(payment: InsertLayawayPayment): Promise<LayawayPayment>;

  getPurchases(storeId: number): Promise<Purchase[]>;
  getPurchase(id: number): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: number, data: Partial<InsertPurchase>): Promise<Purchase | undefined>;

  createVerificationCode(userId: number, code: string, expiresAt: Date): Promise<void>;
  getValidVerificationCode(userId: number, code: string): Promise<boolean>;
  deleteVerificationCodes(userId: number): Promise<void>;
  updateUserEmail(userId: number, email: string): Promise<void>;
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

  async getUsersByStoreId(storeId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.storeId, storeId));
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }

  async getStores(): Promise<Store[]> {
    return db.select().from(stores).orderBy(desc(stores.createdAt));
  }

  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store || undefined;
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [created] = await db.insert(stores).values(store).returning();
    return created;
  }

  async updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined> {
    const [updated] = await db.update(stores).set(data).where(eq(stores.id, id)).returning();
    return updated || undefined;
  }

  async deleteStore(id: number): Promise<void> {
    await db.delete(layawayPayments).where(
      inArray(layawayPayments.layawayId, db.select({ id: layawayPlans.id }).from(layawayPlans).where(eq(layawayPlans.storeId, id)))
    );
    await db.delete(layawayPlans).where(eq(layawayPlans.storeId, id));
    await db.delete(orderItems).where(
      inArray(orderItems.orderId, db.select({ id: orders.id }).from(orders).where(eq(orders.storeId, id)))
    );
    await db.delete(orders).where(eq(orders.storeId, id));
    await db.delete(repairOrders).where(eq(repairOrders.storeId, id));
    await db.delete(purchases).where(eq(purchases.storeId, id));
    await db.delete(customers).where(eq(customers.storeId, id));
    await db.delete(inventoryItems).where(eq(inventoryItems.storeId, id));
    await db.delete(categories).where(eq(categories.storeId, id));
    await db.delete(subscriptions).where(eq(subscriptions.storeId, id));
    await db.delete(users).where(eq(users.storeId, id));
    await db.delete(stores).where(eq(stores.id, id));
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.startDate));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub || undefined;
  }

  async getSubscriptionByStore(storeId: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.storeId, storeId));
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

  async getCategories(storeId: number): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.storeId, storeId)).orderBy(categories.sortOrder);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getInventoryItems(storeId: number): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.storeId, storeId)).orderBy(desc(inventoryItems.createdAt));
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [created] = await db.insert(inventoryItems).values(item).returning();
    return created;
  }

  async updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id)).returning();
    return updated || undefined;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async getCustomers(storeId: number): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.storeId, storeId)).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return updated || undefined;
  }

  async getOrders(storeId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.storeId, storeId)).orderBy(desc(orders.createdAt));
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

  async getRepairOrders(storeId: number): Promise<RepairOrder[]> {
    return db.select().from(repairOrders).where(eq(repairOrders.storeId, storeId)).orderBy(desc(repairOrders.createdAt));
  }

  async getRepairOrder(id: number): Promise<RepairOrder | undefined> {
    const [repair] = await db.select().from(repairOrders).where(eq(repairOrders.id, id));
    return repair || undefined;
  }

  async createRepairOrder(repair: InsertRepairOrder): Promise<RepairOrder> {
    const [created] = await db.insert(repairOrders).values(repair).returning();
    return created;
  }

  async updateRepairOrder(id: number, data: Partial<InsertRepairOrder>): Promise<RepairOrder | undefined> {
    const [updated] = await db.update(repairOrders).set(data).where(eq(repairOrders.id, id)).returning();
    return updated || undefined;
  }

  async getLayawayPlans(storeId: number): Promise<LayawayPlan[]> {
    return db.select().from(layawayPlans).where(eq(layawayPlans.storeId, storeId)).orderBy(desc(layawayPlans.createdAt));
  }

  async getLayawayPlan(id: number): Promise<LayawayPlan | undefined> {
    const [plan] = await db.select().from(layawayPlans).where(eq(layawayPlans.id, id));
    return plan || undefined;
  }

  async createLayawayPlan(plan: InsertLayawayPlan): Promise<LayawayPlan> {
    const [created] = await db.insert(layawayPlans).values(plan).returning();
    return created;
  }

  async updateLayawayPlan(id: number, data: Partial<InsertLayawayPlan>): Promise<LayawayPlan | undefined> {
    const [updated] = await db.update(layawayPlans).set(data).where(eq(layawayPlans.id, id)).returning();
    return updated || undefined;
  }

  async getLayawayPayments(layawayId: number): Promise<LayawayPayment[]> {
    return db.select().from(layawayPayments).where(eq(layawayPayments.layawayId, layawayId)).orderBy(desc(layawayPayments.createdAt));
  }

  async createLayawayPayment(payment: InsertLayawayPayment): Promise<LayawayPayment> {
    const [created] = await db.insert(layawayPayments).values(payment).returning();
    return created;
  }

  async getPurchases(storeId: number): Promise<Purchase[]> {
    return db.select().from(purchases).where(eq(purchases.storeId, storeId)).orderBy(desc(purchases.createdAt));
  }

  async getPurchase(id: number): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase || undefined;
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [created] = await db.insert(purchases).values(purchase).returning();
    return created;
  }

  async updatePurchase(id: number, data: Partial<InsertPurchase>): Promise<Purchase | undefined> {
    const [updated] = await db.update(purchases).set(data).where(eq(purchases.id, id)).returning();
    return updated || undefined;
  }

  async createVerificationCode(userId: number, code: string, expiresAt: Date): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.userId, userId));
    await db.insert(verificationCodes).values({ userId, code, expiresAt });
  }

  async getValidVerificationCode(userId: number, code: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.userId, userId),
          eq(verificationCodes.code, code),
          gt(verificationCodes.expiresAt, new Date())
        )
      );
    return !!result;
  }

  async deleteVerificationCodes(userId: number): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.userId, userId));
  }

  async updateUserEmail(userId: number, email: string): Promise<void> {
    await db.update(users).set({ email }).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
