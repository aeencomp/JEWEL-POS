import { db } from "./db";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { menuCategories, menuItems, restaurantTables, users, grocerySuppliers } from "@shared/schema";
import { GROCERY_DEFAULT_CATEGORIES } from "@shared/grocery-defaults";
import { eq } from "drizzle-orm";

export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "demo123";

export type DemoPosSystem = "jewel" | "oil" | "fashion" | "restaurant" | "pharmacy" | "grocery";

const DEMO_STORE_NAMES: Record<DemoPosSystem, string> = {
  jewel: "IQ-POS Demo — Jewel",
  fashion: "IQ-POS Demo — Fashion",
  oil: "IQ-POS Demo — Factory",
  restaurant: "IQ-POS Demo — Restaurant",
  pharmacy: "IQ-POS Demo — Pharmacy",
  grocery: "IQ-POS Demo — Grocery",
};

const DEMO_BRAND_COLORS: Record<DemoPosSystem, string> = {
  jewel: "#d4a574",
  fashion: "#db2777",
  oil: "#2563eb",
  restaurant: "#ea580c",
  pharmacy: "#0d9488",
  grocery: "#16a34a",
};

export function isDemoUser(user: { username?: string } | null | undefined): boolean {
  return user?.username === DEMO_USERNAME;
}

export function normalizeDemoPosSystem(value: unknown): DemoPosSystem {
  if (value === "oil" || value === "fashion" || value === "restaurant" || value === "pharmacy" || value === "grocery") return value;
  return "jewel";
}

const demoStoreIdBySystem: Partial<Record<DemoPosSystem, number>> = {};

export async function resolveDemoStoreId(posSystem: DemoPosSystem): Promise<number | null> {
  if (demoStoreIdBySystem[posSystem]) return demoStoreIdBySystem[posSystem]!;
  const stores = await storage.getStores();
  const store = stores.find((s) => s.name === DEMO_STORE_NAMES[posSystem] && s.posSystem === posSystem);
  if (store) demoStoreIdBySystem[posSystem] = store.id;
  return store?.id ?? null;
}

export async function refreshDemoStoreIdCache() {
  for (const ps of ["jewel", "fashion", "oil", "restaurant", "pharmacy", "grocery"] as DemoPosSystem[]) {
    const id = await resolveDemoStoreId(ps);
    if (id) demoStoreIdBySystem[ps] = id;
  }
}

/** Resolve demo store from session — never fall back to users.store_id for demo. */
export function getDemoSessionStoreId(session: {
  demoStoreId?: number;
  demoPosSystem?: DemoPosSystem;
}): number | null {
  if (session.demoStoreId) return session.demoStoreId;
  if (session.demoPosSystem && demoStoreIdBySystem[session.demoPosSystem]) {
    return demoStoreIdBySystem[session.demoPosSystem]!;
  }
  return null;
}

/** Effective store for API handlers (admin impersonation + universal demo user). */
export function getEffectiveStoreId(req: {
  user?: { role?: string; storeId?: number | null; username?: string };
  session: {
    impersonatingStoreId?: number;
    demoStoreId?: number;
    demoPosSystem?: DemoPosSystem;
  };
}): number | null {
  if (!req.user) return null;
  if (req.user.role === "admin" && req.session.impersonatingStoreId) {
    return req.session.impersonatingStoreId;
  }
  if (isDemoUser(req.user)) {
    return getDemoSessionStoreId(req.session);
  }
  return req.user.storeId ?? null;
}

async function ensureSubscription(storeId: number) {
  const existing = await storage.getSubscriptionByStore(storeId);
  if (existing) return;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 365);
  await storage.createSubscription({
    storeId,
    plan: "standard",
    pricePerMonth: "45000",
    status: "active",
    startDate: new Date(),
    endDate,
    lastPaymentDate: new Date(),
  });
}

async function seedJewelDemo(storeId: number) {
  const cats = await storage.getCategories(storeId);
  if (cats.length > 0) return;
  const rings = await storage.createCategory({ storeId, name: "Rings", sortOrder: 0 });
  await storage.createInventoryItem({
    storeId,
    categoryId: rings.id,
    sku: "DEMO-RNG-01",
    name: "Demo Gold Ring",
    metalType: "gold",
    purity: "21K",
    weightGrams: "5.0",
    costPrice: "500000",
    sellingPrice: "650000",
    quantity: 3,
    isAvailable: true,
  });
}

async function seedFashionDemo(storeId: number) {
  const cats = await storage.getCategories(storeId);
  if (cats.length > 0) return;
  for (const [i, name] of ["Men", "Women", "Kids"].entries()) {
    await storage.createCategory({ storeId, name, sortOrder: i });
  }
}

async function seedRestaurantDemo(storeId: number) {
  const [existing] = await db.select().from(menuCategories).where(eq(menuCategories.storeId, storeId)).limit(1);
  if (existing) return;

  const menuCats = [
    { name: "Appetizers", nameAr: "المقبلات" },
    { name: "Main Dishes", nameAr: "الأطباق الرئيسية" },
    { name: "Drinks", nameAr: "المشروبات" },
    { name: "Desserts", nameAr: "الحلويات" },
  ];
  const catIds: number[] = [];
  for (let i = 0; i < menuCats.length; i++) {
    const [cat] = await db.insert(menuCategories).values({
      storeId,
      name: menuCats[i].name,
      nameAr: menuCats[i].nameAr,
      sortOrder: i,
    }).returning();
    catIds.push(cat.id);
  }

  const samples = [
    { name: "Hummus", nameAr: "حمص", price: "5000", categoryId: catIds[0] },
    { name: "Grilled Chicken", nameAr: "دجاج مشوي", price: "15000", categoryId: catIds[1] },
    { name: "Fresh Juice", nameAr: "عصير طازج", price: "4000", categoryId: catIds[2] },
    { name: "Kunafa", nameAr: "كنافة", price: "8000", categoryId: catIds[3] },
  ];
  for (const item of samples) {
    await db.insert(menuItems).values({ storeId, ...item, isAvailable: true });
  }

  for (let n = 1; n <= 8; n++) {
    await db.insert(restaurantTables).values({
      storeId,
      tableNumber: n,
      name: `Table ${n}`,
      section: "main",
      status: "free",
    });
  }
}

async function seedPharmacyDemo(storeId: number) {
  const cats = await storage.getCategories(storeId);
  if (cats.length > 0) return;

  const categoryNames = ["Tablets", "Syrups", "Injections", "OTC", "Vitamins"];
  const catIds: number[] = [];
  for (let i = 0; i < categoryNames.length; i++) {
    const cat = await storage.createCategory({ storeId, name: categoryNames[i], sortOrder: i });
    catIds.push(cat.id);
  }

  const samples = [
    {
      sku: "PHM-PAR500",
      name: "Paracetamol 500mg",
      genericName: "Paracetamol",
      activeIngredient: "Paracetamol",
      dosageForm: "Tablet",
      strength: "500mg",
      batchNumber: "B2026-001",
      categoryId: catIds[0],
      costPrice: "500",
      sellingPrice: "1000",
      quantity: 200,
      requiresPrescription: false,
    },
    {
      sku: "PHM-AMOX500",
      name: "Amoxicillin 500mg",
      genericName: "Amoxicillin",
      activeIngredient: "Amoxicillin",
      dosageForm: "Capsule",
      strength: "500mg",
      batchNumber: "B2026-002",
      categoryId: catIds[0],
      costPrice: "3000",
      sellingPrice: "5000",
      quantity: 80,
      requiresPrescription: true,
    },
    {
      sku: "PHM-COUGH",
      name: "Cough Syrup 120ml",
      genericName: "Dextromethorphan",
      activeIngredient: "Dextromethorphan",
      dosageForm: "Syrup",
      strength: "120ml",
      batchNumber: "B2026-003",
      categoryId: catIds[1],
      costPrice: "4000",
      sellingPrice: "7000",
      quantity: 45,
      requiresPrescription: false,
    },
    {
      sku: "PHM-VITC",
      name: "Vitamin C 1000mg",
      genericName: "Ascorbic Acid",
      activeIngredient: "Vitamin C",
      dosageForm: "Tablet",
      strength: "1000mg",
      batchNumber: "B2026-004",
      categoryId: catIds[4],
      costPrice: "2000",
      sellingPrice: "3500",
      quantity: 120,
      requiresPrescription: false,
    },
  ];

  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 8);

  for (const sample of samples) {
    const barcode = `${storeId}${String(Math.floor(Math.random() * 9000) + 1000)}`;
    await storage.createInventoryItem({
      storeId,
      categoryId: sample.categoryId,
      sku: sample.sku,
      barcode,
      name: sample.name,
      genericName: sample.genericName,
      activeIngredient: sample.activeIngredient,
      dosageForm: sample.dosageForm,
      strength: sample.strength,
      batchNumber: sample.batchNumber,
      expiryDate: expiry,
      requiresPrescription: sample.requiresPrescription,
      metalType: "other",
      costPrice: sample.costPrice,
      sellingPrice: sample.sellingPrice,
      quantity: sample.quantity,
      isAvailable: true,
    });
  }
}

async function seedGroceryDemo(storeId: number) {
  const cats = await storage.getCategories(storeId);
  if (cats.length > 0) return;

  const categoryNames = GROCERY_DEFAULT_CATEGORIES.slice(0, 6);
  const catIds: number[] = [];
  for (let i = 0; i < categoryNames.length; i++) {
    const cat = await storage.createCategory({ storeId, name: categoryNames[i], sortOrder: i });
    catIds.push(cat.id);
  }

  const samples = [
    { sku: "GRC-MILK1L", name: "حليب طازج 1 لتر", brand: "المراعي", categoryId: catIds[0], costPrice: "1500", sellingPrice: "2000", quantity: 48, batchNumber: "L2026-01" },
    { sku: "GRC-COLA", name: "كولا 330 مل", brand: "بيبسي", categoryId: catIds[1], costPrice: "500", sellingPrice: "750", quantity: 120, batchNumber: "B2026-02" },
    { sku: "GRC-CHIPS", name: "شيبس بطاطا 50 غ", brand: "لايز", categoryId: catIds[2], costPrice: "800", sellingPrice: "1250", quantity: 80, batchNumber: "S2026-03" },
    { sku: "GRC-DETERG", name: "مسحوق غسيل 1 كغ", brand: "تايد", categoryId: catIds[3], costPrice: "4000", sellingPrice: "5500", quantity: 30, batchNumber: "C2026-04" },
  ];

  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 6);

  for (const sample of samples) {
    const barcode = `${storeId}${String(Math.floor(Math.random() * 9000) + 1000)}`;
    await storage.createInventoryItem({
      storeId,
      categoryId: sample.categoryId,
      sku: sample.sku,
      barcode,
      name: sample.name,
      brand: sample.brand,
      batchNumber: sample.batchNumber,
      expiryDate: expiry,
      metalType: "other",
      costPrice: sample.costPrice,
      sellingPrice: sample.sellingPrice,
      quantity: sample.quantity,
      isAvailable: true,
    });
  }

  const existingSuppliers = await db.select().from(grocerySuppliers).where(eq(grocerySuppliers.storeId, storeId)).limit(1);
  if (existingSuppliers.length === 0) {
    await db.insert(grocerySuppliers).values([
      { storeId, name: "شركة الوطنية للتجارة", phone: "+964 770 111 2222", address: "بغداد" },
      { storeId, name: "شركة الأغذية الطازجة", phone: "+964 770 333 4444", address: "أربيل" },
    ]);
  }
}

async function ensureDemoStore(posSystem: DemoPosSystem) {
  const stores = await storage.getStores();
  let store = stores.find((s) => s.name === DEMO_STORE_NAMES[posSystem] && s.posSystem === posSystem);
  if (!store) {
    store = await storage.createStore({
      name: DEMO_STORE_NAMES[posSystem],
      ownerName: "IQ-POS Demo",
      phone: "+964 770 000 0000",
      email: "demo@iq-pos.com",
      address: "Demo Store",
      isActive: true,
      posSystem,
      brandColor: DEMO_BRAND_COLORS[posSystem],
    });
    console.log(`[demo] Created ${DEMO_STORE_NAMES[posSystem]} (id=${store.id})`);
  }
  await ensureSubscription(store.id);
  if (posSystem === "jewel") await seedJewelDemo(store.id);
  if (posSystem === "fashion") await seedFashionDemo(store.id);
  if (posSystem === "restaurant") await seedRestaurantDemo(store.id);
  if (posSystem === "pharmacy") await seedPharmacyDemo(store.id);
  if (posSystem === "grocery") await seedGroceryDemo(store.id);
  return store;
}

/** Idempotent — safe on every server start and production deploy. */
export async function seedDemoEnvironment() {
  const systems: DemoPosSystem[] = ["jewel", "fashion", "oil", "restaurant", "pharmacy", "grocery"];
  for (const ps of systems) {
    await ensureDemoStore(ps);
  }

  await refreshDemoStoreIdCache();

  const existing = await storage.getUserByUsername(DEMO_USERNAME);
  if (!existing) {
    await storage.createUser({
      username: DEMO_USERNAME,
      password: await hashPassword(DEMO_PASSWORD),
      role: "store",
      storeId: null,
    });
    console.log(`[demo] Universal test login: ${DEMO_USERNAME} / ${DEMO_PASSWORD}`);
  } else if (existing.storeId != null) {
    await db.update(users).set({ storeId: null }).where(eq(users.username, DEMO_USERNAME));
    console.log("[demo] Cleared storeId on demo user (must use session store per POS)");
  }
}
