import { db } from "./db";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { menuCategories, menuItems, restaurantTables } from "@shared/schema";
import { eq } from "drizzle-orm";

export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "demo123";

export type DemoPosSystem = "jewel" | "oil" | "fashion" | "restaurant";

const DEMO_STORE_NAMES: Record<DemoPosSystem, string> = {
  jewel: "IQ-POS Demo — Jewel",
  fashion: "IQ-POS Demo — Fashion",
  oil: "IQ-POS Demo — Factory",
  restaurant: "IQ-POS Demo — Restaurant",
};

const DEMO_BRAND_COLORS: Record<DemoPosSystem, string> = {
  jewel: "#d4a574",
  fashion: "#db2777",
  oil: "#2563eb",
  restaurant: "#ea580c",
};

export function isDemoUser(user: { username?: string } | null | undefined): boolean {
  return user?.username === DEMO_USERNAME;
}

export function normalizeDemoPosSystem(value: unknown): DemoPosSystem {
  if (value === "oil" || value === "fashion" || value === "restaurant") return value;
  return "jewel";
}

export async function resolveDemoStoreId(posSystem: DemoPosSystem): Promise<number | null> {
  const stores = await storage.getStores();
  const store = stores.find((s) => s.name === DEMO_STORE_NAMES[posSystem] && s.posSystem === posSystem);
  return store?.id ?? null;
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
    if (req.session.demoStoreId) return req.session.demoStoreId;
    // demoStoreId is set on login; demoPosSystem is a fallback marker only
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
  return store;
}

/** Idempotent — safe on every server start and production deploy. */
export async function seedDemoEnvironment() {
  const systems: DemoPosSystem[] = ["jewel", "fashion", "oil", "restaurant"];
  for (const ps of systems) {
    await ensureDemoStore(ps);
  }

  const existing = await storage.getUserByUsername(DEMO_USERNAME);
  if (!existing) {
    await storage.createUser({
      username: DEMO_USERNAME,
      password: await hashPassword(DEMO_PASSWORD),
      role: "store",
      storeId: null,
    });
    console.log(`[demo] Universal test login: ${DEMO_USERNAME} / ${DEMO_PASSWORD}`);
  }
}
