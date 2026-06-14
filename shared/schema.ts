import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, serial, json } from "drizzle-orm/pg-core";
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
  posSystem: text("pos_system", { enum: ["jewel", "oil", "fashion", "restaurant", "pharmacy"] }).notNull().default("jewel"),
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
  plan: text("plan", { enum: ["basic", "standard", "premium", "custom"] }).notNull().default("standard"),
  pricePerMonth: decimal("price_per_month", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["active", "expired", "cancelled", "trial"] }).notNull().default("trial"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  lastPaymentDate: timestamp("last_payment_date"),
  renewalRequestedAt: timestamp("renewal_requested_at"),
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

export const inventoryBrands = pgTable("inventory_brands", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  shippingPrice: decimal("shipping_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryBrandsRelations = relations(inventoryBrands, ({ one }) => ({
  store: one(stores, {
    fields: [inventoryBrands.storeId],
    references: [stores.id],
  }),
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
  size: text("size"),
  color: text("color"),
  brand: text("brand"),
  styleCode: text("style_code"),
  genericName: text("generic_name"),
  activeIngredient: text("active_ingredient"),
  dosageForm: text("dosage_form"),
  strength: text("strength"),
  expiryDate: timestamp("expiry_date"),
  batchNumber: text("batch_number"),
  requiresPrescription: boolean("requires_prescription").notNull().default(false),
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
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
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
  customerPhone: text("customer_phone"),
  status: text("status", { enum: ["pending", "completed", "cancelled", "refunded"] }).notNull().default("pending"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "transfer"] }),
  notes: text("notes"),
  loyaltyPointsEarned: integer("loyalty_points_earned").notNull().default(0),
  loyaltyPointsRedeemed: integer("loyalty_points_redeemed").notNull().default(0),
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
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sku: text("sku"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  returnedQuantity: integer("returned_quantity").notNull().default(0),
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
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
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
  posSystem: text("pos_system", { enum: ["jewel", "oil", "fashion", "restaurant", "pharmacy"] }).notNull().default("jewel"),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSignupRequestSchema = createInsertSchema(signupRequests).omit({
  id: true,
  status: true,
  createdAt: true,
}).extend({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
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

export const insertInventoryBrandSchema = createInsertSchema(inventoryBrands).omit({
  id: true,
  createdAt: true,
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
  receiptHeader: z.string().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  receiptFooter: z.string().max(500).nullable().optional().or(z.literal("").transform(() => null)),
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
export type InventoryBrand = typeof inventoryBrands.$inferSelect;
export type InsertInventoryBrand = z.infer<typeof insertInventoryBrandSchema>;
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

// Delivery Notes (وصل تسليم) — matches physical paper invoice format
export const oilDeliveryNotes = pgTable("oil_delivery_notes", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  noteNumber: text("note_number").notNull(),
  customerId: integer("customer_id").references(() => oilCustomers.id),
  customerName: text("customer_name"),
  date: timestamp("date").notNull().defaultNow(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilDeliveryNoteItems = pgTable("oil_delivery_note_items", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull().references(() => oilDeliveryNotes.id),
  rowNumber: integer("row_number").notNull(),
  description: text("description"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  total: decimal("total", { precision: 12, scale: 2 }),
});

export const insertOilDeliveryNoteSchema = createInsertSchema(oilDeliveryNotes).omit({ id: true, createdAt: true });
export type OilDeliveryNote = typeof oilDeliveryNotes.$inferSelect;
export type OilDeliveryNoteItem = typeof oilDeliveryNoteItems.$inferSelect;

// Oil Batch Records (سجل المنتجات) — matches physical handwritten ledger:
// columns: الماركة, القياس, النقدة, العدد, السعر الزرادي, السعر الإفصالي
export const oilBatchRecords = pgTable("oil_batch_records", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  recordNumber: text("record_number").notNull(),
  customerId: integer("customer_id").references(() => oilCustomers.id),
  customerName: text("customer_name"),
  date: timestamp("date").notNull().defaultNow(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oilBatchRecordItems = pgTable("oil_batch_record_items", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull().references(() => oilBatchRecords.id),
  brand: text("brand"),
  grade: text("grade"),
  containerSize: text("container_size"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }),
  wholesalePrice: decimal("wholesale_price", { precision: 12, scale: 2 }),
  retailPrice: decimal("retail_price", { precision: 12, scale: 2 }),
  total: decimal("total", { precision: 12, scale: 2 }),
});

export type OilBatchRecord = typeof oilBatchRecords.$inferSelect;
export type OilBatchRecordItem = typeof oilBatchRecordItems.$inferSelect;

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

// ── Restaurant / RestoPOS ─────────────────────────────────────
export const restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  tableNumber: integer("table_number").notNull(),
  name: text("name"),
  section: text("section").default("main"),
  status: text("status", { enum: ["free", "occupied", "reserved"] }).notNull().default("free"),
});

export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  categoryId: integer("category_id").notNull().references(() => menuCategories.id),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const restaurantOrders = pgTable("restaurant_orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  orderNumber: text("order_number").notNull(),
  tableId: integer("table_id").references(() => restaurantTables.id),
  orderType: text("order_type", { enum: ["dine_in", "pickup", "delivery", "qr"] }).notNull().default("dine_in"),
  status: text("status", {
    enum: ["pending", "accepted", "preparing", "ready", "served", "out_for_delivery", "delivered", "completed", "cancelled"],
  }).notNull().default("pending"),
  source: text("source", { enum: ["staff", "qr", "online"] }).notNull().default("staff"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  notes: text("notes"),
  deliveryAddress: text("delivery_address"),
  deliveryArea: text("delivery_area"),
  destLat: decimal("dest_lat", { precision: 10, scale: 7 }),
  destLng: decimal("dest_lng", { precision: 10, scale: 7 }),
  deliveryFee: decimal("delivery_fee", { precision: 12, scale: 2 }).default("0"),
  trackingToken: text("tracking_token"),
  driverId: integer("driver_id"),
  driverAcceptedAt: timestamp("driver_accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  paymentMethod: text("payment_method", { enum: ["cash", "card"] }).default("cash"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: text("payment_status", { enum: ["unpaid", "paid"] }).notNull().default("unpaid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const restaurantOrderItems = pgTable("restaurant_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => restaurantOrders.id),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  name: text("name").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
});

export const insertRestaurantTableSchema = createInsertSchema(restaurantTables).omit({ id: true });
export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertRestaurantOrderSchema = createInsertSchema(restaurantOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRestaurantOrderItemSchema = createInsertSchema(restaurantOrderItems).omit({ id: true });

export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type RestaurantOrder = typeof restaurantOrders.$inferSelect;
export type RestaurantOrderItem = typeof restaurantOrderItems.$inferSelect;

export const deliveryDrivers = pgTable("delivery_drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  vehicleType: text("vehicle_type", { enum: ["motorcycle", "car", "bicycle"] }).notNull().default("motorcycle"),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status", { enum: ["offline", "online", "busy"] }).notNull().default("offline"),
  storeId: integer("store_id").references(() => stores.id),
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
  locationUpdatedAt: timestamp("location_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliveryDriverSchema = createInsertSchema(deliveryDrivers).omit({ id: true, createdAt: true });
export type DeliveryDriver = typeof deliveryDrivers.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  role: text("role", { enum: ["customer", "driver", "staff"] }).notNull(),
  refKey: text("ref_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ── Pharmacy ──────────────────────────────────────────────────
export const pharmacyPrescriptions = pgTable("pharmacy_prescriptions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  prescriptionNumber: text("prescription_number").notNull(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone"),
  doctorName: text("doctor_name"),
  doctorLicense: text("doctor_license"),
  status: text("status", { enum: ["pending", "dispensed", "cancelled"] }).notNull().default("pending"),
  notes: text("notes"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pharmacyPrescriptionItems = pgTable("pharmacy_prescription_items", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").notNull().references(() => pharmacyPrescriptions.id),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id),
  drugName: text("drug_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  dosageInstructions: text("dosage_instructions"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const pharmacyPrescriptionsRelations = relations(pharmacyPrescriptions, ({ one, many }) => ({
  store: one(stores, { fields: [pharmacyPrescriptions.storeId], references: [stores.id] }),
  items: many(pharmacyPrescriptionItems),
}));

export const pharmacyPrescriptionItemsRelations = relations(pharmacyPrescriptionItems, ({ one }) => ({
  prescription: one(pharmacyPrescriptions, {
    fields: [pharmacyPrescriptionItems.prescriptionId],
    references: [pharmacyPrescriptions.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [pharmacyPrescriptionItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const insertPharmacyPrescriptionSchema = createInsertSchema(pharmacyPrescriptions).omit({
  id: true,
  createdAt: true,
});

export const insertPharmacyPrescriptionItemSchema = createInsertSchema(pharmacyPrescriptionItems).omit({
  id: true,
});

export type PharmacyPrescription = typeof pharmacyPrescriptions.$inferSelect;
export type PharmacyPrescriptionItem = typeof pharmacyPrescriptionItems.$inferSelect;
export type InsertPharmacyPrescription = z.infer<typeof insertPharmacyPrescriptionSchema>;
export type InsertPharmacyPrescriptionItem = z.infer<typeof insertPharmacyPrescriptionItemSchema>;

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** express-session table (connect-pg-simple) — keep in schema so db:push does not drop it */
export const sessionTable = pgTable("session", {
  sid: varchar("sid").primaryKey().notNull(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
});

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
