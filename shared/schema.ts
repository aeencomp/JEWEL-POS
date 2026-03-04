import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role", { enum: ["admin", "store"] }).notNull().default("store"),
  storeId: integer("store_id"),
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  store: one(stores, {
    fields: [users.storeId],
    references: [stores.id],
  }),
}));

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  brandColor: text("brand_color").default("#d4a574"),
  logoUrl: text("logo_url"),
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
});

export const storesRelations = relations(stores, ({ many, one }) => ({
  subscription: one(subscriptions),
  categories: many(categories),
  inventoryItems: many(inventoryItems),
  orders: many(orders),
  customers: many(customers),
  repairOrders: many(repairOrders),
  layawayPlans: many(layawayPlans),
  purchases: many(purchases),
  users: many(users),
}));

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  plan: text("plan", { enum: ["basic", "standard", "premium"] }).notNull().default("basic"),
  pricePerMonth: decimal("price_per_month", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["active", "expired", "cancelled", "trial"] }).notNull().default("trial"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  lastPaymentDate: timestamp("last_payment_date"),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  store: one(stores, {
    fields: [subscriptions.storeId],
    references: [stores.id],
  }),
}));

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  store: one(stores, {
    fields: [categories.storeId],
    references: [stores.id],
  }),
  items: many(inventoryItems),
}));

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  sku: text("sku").notNull(),
  barcode: text("barcode"),
  name: text("name").notNull(),
  description: text("description"),
  metalType: text("metal_type", { enum: ["gold", "silver", "platinum", "white_gold", "rose_gold", "other"] }).notNull().default("gold"),
  purity: text("purity"),
  weightGrams: decimal("weight_grams", { precision: 10, scale: 3 }),
  gemstone: text("gemstone"),
  caratWeight: decimal("carat_weight", { precision: 10, scale: 2 }),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  isAvailable: boolean("is_available").notNull().default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  store: one(stores, {
    fields: [inventoryItems.storeId],
    references: [stores.id],
  }),
  category: one(categories, {
    fields: [inventoryItems.categoryId],
    references: [categories.id],
  }),
}));

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  idNumber: text("id_number"),
  notes: text("notes"),
  balance: decimal("balance").notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  store: one(stores, {
    fields: [customers.storeId],
    references: [stores.id],
  }),
  orders: many(orders),
  repairOrders: many(repairOrders),
  layawayPlans: many(layawayPlans),
}));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  customerId: integer("customer_id").references(() => customers.id),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name"),
  status: text("status", { enum: ["pending", "completed", "cancelled", "refunded"] }).notNull().default("pending"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "transfer"] }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItems.id),
  name: text("name").notNull(),
  sku: text("sku"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [orderItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const repairOrders = pgTable("repair_orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  customerId: integer("customer_id").references(() => customers.id),
  ticketNumber: text("ticket_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  itemDescription: text("item_description").notNull(),
  issueDescription: text("issue_description").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  finalCost: decimal("final_cost", { precision: 12, scale: 2 }),
  status: text("status", { enum: ["received", "in_progress", "ready", "delivered", "cancelled"] }).notNull().default("received"),
  estimatedDate: timestamp("estimated_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const repairOrdersRelations = relations(repairOrders, ({ one }) => ({
  store: one(stores, {
    fields: [repairOrders.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [repairOrders.customerId],
    references: [customers.id],
  }),
}));

export const layawayPlans = pgTable("layaway_plans", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  customerId: integer("customer_id").references(() => customers.id),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItems.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  remainingBalance: decimal("remaining_balance", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["active", "completed", "cancelled", "defaulted"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
});

export const layawayPlansRelations = relations(layawayPlans, ({ one, many }) => ({
  store: one(stores, {
    fields: [layawayPlans.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [layawayPlans.customerId],
    references: [customers.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [layawayPlans.inventoryItemId],
    references: [inventoryItems.id],
  }),
  payments: many(layawayPayments),
}));

export const layawayPayments = pgTable("layaway_payments", {
  id: serial("id").primaryKey(),
  layawayId: integer("layaway_id").notNull().references(() => layawayPlans.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "transfer"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const layawayPaymentsRelations = relations(layawayPayments, ({ one }) => ({
  layaway: one(layawayPlans, {
    fields: [layawayPayments.layawayId],
    references: [layawayPlans.id],
  }),
}));

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  customerId: integer("customer_id").references(() => customers.id),
  purchaseNumber: text("purchase_number").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  metalType: text("metal_type", { enum: ["gold", "silver", "platinum", "white_gold", "rose_gold", "other"] }).notNull().default("gold"),
  purity: text("purity"),
  weightGrams: decimal("weight_grams", { precision: 10, scale: 3 }),
  itemDescription: text("item_description").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "transfer"] }).notNull().default("cash"),
  notes: text("notes"),
  status: text("status", { enum: ["completed", "cancelled"] }).notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchasesRelations = relations(purchases, ({ one }) => ({
  store: one(stores, {
    fields: [purchases.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [purchases.customerId],
    references: [customers.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
  storeId: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  balance: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertRepairOrderSchema = createInsertSchema(repairOrders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertLayawayPlanSchema = createInsertSchema(layawayPlans).omit({
  id: true,
  createdAt: true,
});

export const insertLayawayPaymentSchema = createInsertSchema(layawayPayments).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export const updateBrandingSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").nullable().optional(),
  logoUrl: z.string().url("Must be a valid URL").nullable().optional().or(z.literal("").transform(() => null)),
  receiptHeader: z.string().max(200).nullable().optional().or(z.literal("").transform(() => null)),
  receiptFooter: z.string().max(200).nullable().optional().or(z.literal("").transform(() => null)),
});

export type UpdateBranding = z.infer<typeof updateBrandingSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type RepairOrder = typeof repairOrders.$inferSelect;
export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;
export type LayawayPlan = typeof layawayPlans.$inferSelect;
export type InsertLayawayPlan = z.infer<typeof insertLayawayPlanSchema>;
export type LayawayPayment = typeof layawayPayments.$inferSelect;
export type InsertLayawayPayment = z.infer<typeof insertLayawayPaymentSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
