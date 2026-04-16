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
  posSystem: text("pos_system", { enum: ["jewel", "oil"] }).notNull().default("jewel"),
  features: text("features"),
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

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  personName: text("person_name").notNull(),
  personPhone: text("person_phone"),
  type: text("type", { enum: ["money", "gold"] }).notNull().default("money"),
  direction: text("direction", { enum: ["lent", "borrowed"] }).notNull().default("lent"),
  description: text("description"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  remainingBalance: decimal("remaining_balance", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["active", "paid", "cancelled"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const debtsRelations = relations(debts, ({ one, many }) => ({
  store: one(stores, {
    fields: [debts.storeId],
    references: [stores.id],
  }),
}));

export const debtPayments = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  debtId: integer("debt_id").notNull().references(() => debts.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "transfer"] }).notNull().default("cash"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const debtPaymentsRelations = relations(debtPayments, ({ one }) => ({
  debt: one(debts, {
    fields: [debtPayments.debtId],
    references: [debts.id],
  }),
}));

// ── Signup Requests ───────────────────────────────────────────
export const signupRequests = pgTable("signup_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  businessName: text("business_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  posSystem: text("pos_system", { enum: ["jewel", "oil"] }).notNull().default("jewel"),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSignupRequestSchema = createInsertSchema(signupRequests).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type SignupRequest = typeof signupRequests.$inferSelect;
export type InsertSignupRequest = z.infer<typeof insertSignupRequestSchema>;

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
  logoUrl: z.string().nullable().optional().or(z.literal("").transform(() => null)),
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
export const insertDebtSchema = createInsertSchema(debts).omit({
  id: true,
  createdAt: true,
});

export const insertDebtPaymentSchema = createInsertSchema(debtPayments).omit({
  id: true,
  createdAt: true,
});

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;
export type DebtPayment = typeof debtPayments.$inferSelect;
export type InsertDebtPayment = z.infer<typeof insertDebtPaymentSchema>;

// ── POS Terminals ──────────────────────────────────────────────
export const posTerminals = pgTable("pos_terminals", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("ShoppingCart"),
  color: text("color").notNull().default("#d4a574"),
  categoryId: integer("category_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const posTerminalsRelations = relations(posTerminals, ({ one }) => ({
  store: one(stores, { fields: [posTerminals.storeId], references: [stores.id] }),
}));

export const insertPosTerminalSchema = createInsertSchema(posTerminals).omit({ id: true });
export type PosTerminal = typeof posTerminals.$inferSelect;
export type InsertPosTerminal = z.infer<typeof insertPosTerminalSchema>;

// ── OilPOS ─────────────────────────────────────────────────────

export const oilProducts = pgTable("oil_products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  category: text("category", { enum: ["finished_oil", "raw_material", "packaging", "spare_part", "other"] }).notNull().default("finished_oil"),
  unit: text("unit", { enum: ["liter", "kg", "piece", "barrel", "ton"] }).notNull().default("liter"),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
  salePrice: decimal("sale_price", { precision: 12, scale: 2 }).notNull().default("0"),
  currentStock: decimal("current_stock", { precision: 12, scale: 2 }).notNull().default("0"),
  minStock: decimal("min_stock", { precision: 12, scale: 2 }).notNull().default("0"),
  description: text("description"),
  isActive: integer("is_active").notNull().default(1),
});

export const oilCustomers = pgTable("oil_customers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  type: text("type", { enum: ["dealer", "distributor", "retail", "factory"] }).notNull().default("dealer"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilSuppliers = pgTable("oil_suppliers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilSales = pgTable("oil_sales", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  customerId: integer("customer_id").references(() => oilCustomers.id),
  customerName: text("customer_name"),
  invoiceNumber: text("invoice_number").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status", { enum: ["draft", "confirmed", "delivered", "cancelled"] }).notNull().default("confirmed"),
  paymentStatus: text("payment_status", { enum: ["unpaid", "partial", "paid"] }).notNull().default("unpaid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilSaleItems = pgTable("oil_sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => oilSales.id),
  productId: integer("product_id").notNull().references(() => oilProducts.id),
  productName: text("product_name").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const oilPurchases = pgTable("oil_purchases", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  supplierId: integer("supplier_id").references(() => oilSuppliers.id),
  supplierName: text("supplier_name"),
  invoiceNumber: text("invoice_number"),
  date: timestamp("date").notNull().defaultNow(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status", { enum: ["pending", "received", "cancelled"] }).notNull().default("received"),
  paymentStatus: text("payment_status", { enum: ["unpaid", "partial", "paid"] }).notNull().default("unpaid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilPurchaseItems = pgTable("oil_purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull().references(() => oilPurchases.id),
  productId: integer("product_id").notNull().references(() => oilProducts.id),
  productName: text("product_name").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const oilProductionBatches = pgTable("oil_production_batches", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  batchNumber: text("batch_number").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  outputProductId: integer("output_product_id").notNull().references(() => oilProducts.id),
  outputQuantity: decimal("output_quantity", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["in_progress", "completed", "cancelled"] }).notNull().default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilProductionInputs = pgTable("oil_production_inputs", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => oilProductionBatches.id),
  productId: integer("product_id").notNull().references(() => oilProducts.id),
  productName: text("product_name").notNull(),
  quantityUsed: decimal("quantity_used", { precision: 12, scale: 2 }).notNull(),
});

export const oilExpenses = pgTable("oil_expenses", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  category: text("category", { enum: ["wages", "electricity", "transport", "maintenance", "rent", "other"] }).notNull().default("other"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  paymentMethod: text("payment_method", { enum: ["cash", "transfer", "card"] }).notNull().default("cash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilDebts = pgTable("oil_debts", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  entityName: text("entity_name").notNull(),
  entityPhone: text("entity_phone"),
  entityType: text("entity_type", { enum: ["customer", "supplier", "other"] }).notNull().default("customer"),
  direction: text("direction", { enum: ["owe_us", "we_owe"] }).notNull().default("owe_us"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  remainingBalance: decimal("remaining_balance", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "paid", "cancelled"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilDebtPayments = pgTable("oil_debt_payments", {
  id: serial("id").primaryKey(),
  debtId: integer("debt_id").notNull().references(() => oilDebts.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Oil insert schemas & types
export const insertOilProductSchema = createInsertSchema(oilProducts).omit({ id: true });
export const insertOilCustomerSchema = createInsertSchema(oilCustomers).omit({ id: true, createdAt: true });
export const insertOilSupplierSchema = createInsertSchema(oilSuppliers).omit({ id: true, createdAt: true });
export const insertOilSaleSchema = createInsertSchema(oilSales).omit({ id: true, createdAt: true });
export const insertOilSaleItemSchema = createInsertSchema(oilSaleItems).omit({ id: true });
export const insertOilPurchaseSchema = createInsertSchema(oilPurchases).omit({ id: true, createdAt: true });
export const insertOilPurchaseItemSchema = createInsertSchema(oilPurchaseItems).omit({ id: true });
export const insertOilProductionBatchSchema = createInsertSchema(oilProductionBatches).omit({ id: true, createdAt: true });
export const insertOilProductionInputSchema = createInsertSchema(oilProductionInputs).omit({ id: true });
export const insertOilExpenseSchema = createInsertSchema(oilExpenses).omit({ id: true, createdAt: true });
export const insertOilDebtSchema = createInsertSchema(oilDebts).omit({ id: true, createdAt: true });
export const insertOilDebtPaymentSchema = createInsertSchema(oilDebtPayments).omit({ id: true, createdAt: true });

export type OilProduct = typeof oilProducts.$inferSelect;
export type OilCustomer = typeof oilCustomers.$inferSelect;
export type OilSupplier = typeof oilSuppliers.$inferSelect;
export type OilSale = typeof oilSales.$inferSelect;
export type OilSaleItem = typeof oilSaleItems.$inferSelect;
export type OilPurchase = typeof oilPurchases.$inferSelect;
export type OilPurchaseItem = typeof oilPurchaseItems.$inferSelect;
export type OilProductionBatch = typeof oilProductionBatches.$inferSelect;
export type OilProductionInput = typeof oilProductionInputs.$inferSelect;
export type OilExpense = typeof oilExpenses.$inferSelect;
export type OilDebt = typeof oilDebts.$inferSelect;
export type OilDebtPayment = typeof oilDebtPayments.$inferSelect;
