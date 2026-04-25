import {
  users, stores, subscriptions, categories, inventoryItems, customers, orders, orderItems,
  repairOrders, layawayPlans, layawayPayments, purchases, verificationCodes, debts, debtPayments,
  posTerminals,
  oilProducts, oilCustomers, oilSuppliers, oilSales, oilSaleItems,
  oilPurchases, oilPurchaseItems, oilProductionBatches, oilProductionInputs,
  oilExpenses, oilDebts, oilDebtPayments,
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
  type Debt, type InsertDebt,
  type DebtPayment, type InsertDebtPayment,
  type PosTerminal, type InsertPosTerminal,
  type OilProduct, type OilCustomer, type OilSupplier,
  type OilSale, type OilSaleItem, type OilPurchase, type OilPurchaseItem,
  type OilProductionBatch, type OilProductionInput, type OilExpense,
  type OilDebt, type OilDebtPayment,
  insertOilProductSchema, insertOilCustomerSchema, insertOilSupplierSchema,
  insertOilSaleSchema, insertOilPurchaseSchema, insertOilProductionBatchSchema,
  insertOilExpenseSchema, insertOilDebtSchema,
  settings,
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
  updateUsername(userId: number, username: string): Promise<void>;
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

  getDebts(storeId: number): Promise<Debt[]>;
  getDebt(id: number): Promise<Debt | undefined>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, data: Partial<InsertDebt>): Promise<Debt | undefined>;
  getDebtPayments(debtId: number): Promise<DebtPayment[]>;
  createDebtPayment(payment: InsertDebtPayment): Promise<DebtPayment>;

  createVerificationCode(userId: number, code: string, expiresAt: Date): Promise<void>;
  getValidVerificationCode(userId: number, code: string): Promise<boolean>;
  deleteVerificationCodes(userId: number): Promise<void>;
  updateUserEmail(userId: number, email: string): Promise<void>;

  getPosTerminals(storeId: number): Promise<PosTerminal[]>;
  getPosTerminal(id: number): Promise<PosTerminal | undefined>;
  createPosTerminal(terminal: InsertPosTerminal): Promise<PosTerminal>;
  updatePosTerminal(id: number, data: Partial<InsertPosTerminal>): Promise<PosTerminal | undefined>;
  deletePosTerminal(id: number): Promise<void>;
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

  async updateUsername(userId: number, username: string): Promise<void> {
    await db.update(users).set({ username }).where(eq(users.id, userId));
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

  async getDebts(storeId: number): Promise<Debt[]> {
    return db.select().from(debts).where(eq(debts.storeId, storeId)).orderBy(desc(debts.createdAt));
  }

  async getDebt(id: number): Promise<Debt | undefined> {
    const [debt] = await db.select().from(debts).where(eq(debts.id, id));
    return debt || undefined;
  }

  async createDebt(debt: InsertDebt): Promise<Debt> {
    const [created] = await db.insert(debts).values(debt).returning();
    return created;
  }

  async updateDebt(id: number, data: Partial<InsertDebt>): Promise<Debt | undefined> {
    const [updated] = await db.update(debts).set(data).where(eq(debts.id, id)).returning();
    return updated || undefined;
  }

  async getDebtPayments(debtId: number): Promise<DebtPayment[]> {
    return db.select().from(debtPayments).where(eq(debtPayments.debtId, debtId)).orderBy(desc(debtPayments.createdAt));
  }

  async createDebtPayment(payment: InsertDebtPayment): Promise<DebtPayment> {
    const [created] = await db.insert(debtPayments).values(payment).returning();
    return created;
  }

  async getPosTerminals(storeId: number): Promise<PosTerminal[]> {
    return db.select().from(posTerminals).where(eq(posTerminals.storeId, storeId)).orderBy(posTerminals.sortOrder);
  }

  async getPosTerminal(id: number): Promise<PosTerminal | undefined> {
    const [terminal] = await db.select().from(posTerminals).where(eq(posTerminals.id, id));
    return terminal || undefined;
  }

  async createPosTerminal(terminal: InsertPosTerminal): Promise<PosTerminal> {
    const [created] = await db.insert(posTerminals).values(terminal).returning();
    return created;
  }

  async updatePosTerminal(id: number, data: Partial<InsertPosTerminal>): Promise<PosTerminal | undefined> {
    const [updated] = await db.update(posTerminals).set(data).where(eq(posTerminals.id, id)).returning();
    return updated || undefined;
  }

  async deletePosTerminal(id: number): Promise<void> {
    await db.delete(posTerminals).where(eq(posTerminals.id, id));
  }

  // ── OilPOS ──────────────────────────────────────────────────────
  async getOilProducts(storeId: number): Promise<OilProduct[]> {
    return db.select().from(oilProducts).where(and(eq(oilProducts.storeId, storeId), eq(oilProducts.isActive, 1)));
  }
  async getOilProduct(id: number): Promise<OilProduct | undefined> {
    const [p] = await db.select().from(oilProducts).where(eq(oilProducts.id, id));
    return p || undefined;
  }
  async createOilProduct(data: any): Promise<OilProduct> {
    const [p] = await db.insert(oilProducts).values(data).returning();
    return p;
  }
  async updateOilProduct(id: number, data: any): Promise<OilProduct | undefined> {
    const [p] = await db.update(oilProducts).set(data).where(eq(oilProducts.id, id)).returning();
    return p || undefined;
  }

  async getOilCustomers(storeId: number): Promise<OilCustomer[]> {
    return db.select().from(oilCustomers).where(eq(oilCustomers.storeId, storeId)).orderBy(oilCustomers.name);
  }
  async createOilCustomer(data: any): Promise<OilCustomer> {
    const [c] = await db.insert(oilCustomers).values(data).returning();
    return c;
  }
  async updateOilCustomer(id: number, data: any): Promise<OilCustomer | undefined> {
    const [c] = await db.update(oilCustomers).set(data).where(eq(oilCustomers.id, id)).returning();
    return c || undefined;
  }

  async getOilSuppliers(storeId: number): Promise<OilSupplier[]> {
    return db.select().from(oilSuppliers).where(eq(oilSuppliers.storeId, storeId)).orderBy(oilSuppliers.name);
  }
  async createOilSupplier(data: any): Promise<OilSupplier> {
    const [s] = await db.insert(oilSuppliers).values(data).returning();
    return s;
  }
  async updateOilSupplier(id: number, data: any): Promise<OilSupplier | undefined> {
    const [s] = await db.update(oilSuppliers).set(data).where(eq(oilSuppliers.id, id)).returning();
    return s || undefined;
  }

  async getOilSales(storeId: number): Promise<OilSale[]> {
    return db.select().from(oilSales).where(eq(oilSales.storeId, storeId)).orderBy(desc(oilSales.createdAt));
  }
  async getOilSale(id: number): Promise<OilSale | undefined> {
    const [s] = await db.select().from(oilSales).where(eq(oilSales.id, id));
    return s || undefined;
  }
  async createOilSale(data: any): Promise<OilSale> {
    const [s] = await db.insert(oilSales).values(data).returning();
    return s;
  }
  async updateOilSale(id: number, data: any): Promise<OilSale | undefined> {
    const [s] = await db.update(oilSales).set(data).where(eq(oilSales.id, id)).returning();
    return s || undefined;
  }
  async deleteOilSale(id: number, storeId: number): Promise<void> {
    await db.delete(oilSaleItems).where(eq(oilSaleItems.saleId, id));
    await db.delete(oilSales).where(and(eq(oilSales.id, id), eq(oilSales.storeId, storeId)));
  }
  async getOilSaleItems(saleId: number): Promise<OilSaleItem[]> {
    return db.select().from(oilSaleItems).where(eq(oilSaleItems.saleId, saleId));
  }
  async createOilSaleItem(data: any): Promise<OilSaleItem> {
    const [i] = await db.insert(oilSaleItems).values(data).returning();
    return i;
  }

  async getOilPurchases(storeId: number): Promise<OilPurchase[]> {
    return db.select().from(oilPurchases).where(eq(oilPurchases.storeId, storeId)).orderBy(desc(oilPurchases.createdAt));
  }
  async getOilPurchase(id: number): Promise<OilPurchase | undefined> {
    const [p] = await db.select().from(oilPurchases).where(eq(oilPurchases.id, id));
    return p || undefined;
  }
  async createOilPurchase(data: any): Promise<OilPurchase> {
    const [p] = await db.insert(oilPurchases).values(data).returning();
    return p;
  }
  async updateOilPurchase(id: number, data: any): Promise<OilPurchase | undefined> {
    const [p] = await db.update(oilPurchases).set(data).where(eq(oilPurchases.id, id)).returning();
    return p || undefined;
  }
  async getOilPurchaseItems(purchaseId: number): Promise<OilPurchaseItem[]> {
    return db.select().from(oilPurchaseItems).where(eq(oilPurchaseItems.purchaseId, purchaseId));
  }
  async createOilPurchaseItem(data: any): Promise<OilPurchaseItem> {
    const [i] = await db.insert(oilPurchaseItems).values(data).returning();
    return i;
  }

  async getOilBatches(storeId: number): Promise<OilProductionBatch[]> {
    return db.select().from(oilProductionBatches).where(eq(oilProductionBatches.storeId, storeId)).orderBy(desc(oilProductionBatches.createdAt));
  }
  async createOilBatch(data: any): Promise<OilProductionBatch> {
    const [b] = await db.insert(oilProductionBatches).values(data).returning();
    return b;
  }
  async updateOilBatch(id: number, data: any): Promise<OilProductionBatch | undefined> {
    const [b] = await db.update(oilProductionBatches).set(data).where(eq(oilProductionBatches.id, id)).returning();
    return b || undefined;
  }
  async getOilBatchInputs(batchId: number): Promise<OilProductionInput[]> {
    return db.select().from(oilProductionInputs).where(eq(oilProductionInputs.batchId, batchId));
  }
  async createOilBatchInput(data: any): Promise<OilProductionInput> {
    const [i] = await db.insert(oilProductionInputs).values(data).returning();
    return i;
  }

  async getOilExpenses(storeId: number): Promise<OilExpense[]> {
    return db.select().from(oilExpenses).where(eq(oilExpenses.storeId, storeId)).orderBy(desc(oilExpenses.createdAt));
  }
  async createOilExpense(data: any): Promise<OilExpense> {
    const [e] = await db.insert(oilExpenses).values(data).returning();
    return e;
  }
  async updateOilExpense(id: number, data: any): Promise<OilExpense | undefined> {
    const [e] = await db.update(oilExpenses).set(data).where(eq(oilExpenses.id, id)).returning();
    return e || undefined;
  }
  async deleteOilExpense(id: number): Promise<void> {
    await db.delete(oilExpenses).where(eq(oilExpenses.id, id));
  }

  async getOilDebts(storeId: number): Promise<OilDebt[]> {
    return db.select().from(oilDebts).where(eq(oilDebts.storeId, storeId)).orderBy(desc(oilDebts.createdAt));
  }
  async getOilDebt(id: number): Promise<OilDebt | undefined> {
    const [d] = await db.select().from(oilDebts).where(eq(oilDebts.id, id));
    return d || undefined;
  }
  async createOilDebt(data: any): Promise<OilDebt> {
    const [d] = await db.insert(oilDebts).values(data).returning();
    return d;
  }
  async updateOilDebt(id: number, data: any): Promise<OilDebt | undefined> {
    const [d] = await db.update(oilDebts).set(data).where(eq(oilDebts.id, id)).returning();
    return d || undefined;
  }
  async getOilDebtPayments(debtId: number): Promise<OilDebtPayment[]> {
    return db.select().from(oilDebtPayments).where(eq(oilDebtPayments.debtId, debtId)).orderBy(desc(oilDebtPayments.createdAt));
  }
  async createOilDebtPayment(data: any): Promise<OilDebtPayment> {
    const [p] = await db.insert(oilDebtPayments).values(data).returning();
    return p;
  }

  async getSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(settings).where(eq(settings.key, key));
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(settings).values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}

export const storage = new DatabaseStorage();
