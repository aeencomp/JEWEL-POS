export type PosSystem = "jewel" | "oil" | "fashion" | "restaurant" | "pharmacy" | "grocery";

export const DEMO_USERNAME = "demo";

/** Demo user: infer POS from login URL when API omits posSystem. */
export function resolveUserPosSystem(
  user: { username?: string; posSystem?: string } | null | undefined,
  pathname: string,
): PosSystem | undefined {
  const ps = user?.posSystem;
  if (ps === "oil" || ps === "fashion" || ps === "restaurant" || ps === "pharmacy" || ps === "grocery" || ps === "jewel") return ps;
  if (user?.username !== DEMO_USERNAME) return undefined;
  if (pathname.startsWith("/restaurant")) return "restaurant";
  if (pathname.startsWith("/pharmacy")) return "pharmacy";
  if (pathname.startsWith("/grocery")) return "grocery";
  if (pathname.startsWith("/fashion")) return "fashion";
  if (pathname.startsWith("/oil")) return "oil";
  return "jewel";
}

export const POS_SYSTEMS: PosSystem[] = ["jewel", "oil", "fashion", "restaurant", "pharmacy", "grocery"];

export function normalizePosSystem(value: unknown): PosSystem {
  if (value === "oil" || value === "fashion" || value === "restaurant" || value === "pharmacy" || value === "grocery") return value;
  return "jewel";
}

export function posSystemLabel(system: PosSystem, isAr: boolean): string {
  if (system === "oil") return isAr ? "FactoryPOS" : "FactoryPOS";
  if (system === "fashion") return isAr ? "FashionPOS" : "FashionPOS";
  if (system === "restaurant") return isAr ? "RestoPOS" : "RestoPOS";
  if (system === "pharmacy") return isAr ? "PharmaPOS" : "PharmaPOS";
  if (system === "grocery") return isAr ? "GroceryPOS" : "GroceryPOS";
  return isAr ? "JewelPOS" : "JewelPOS";
}

export function posSystemSubtitle(system: PosSystem, isAr: boolean): string {
  if (system === "oil") return isAr ? "نظام إدارة المصنع" : "Factory Management";
  if (system === "fashion") return isAr ? "نظام إدارة الملابس" : "Fashion & Apparel";
  if (system === "restaurant") return isAr ? "نظام المطاعم والمقاهي" : "Restaurant & Café";
  if (system === "pharmacy") return isAr ? "نظام إدارة الصيدلية" : "Pharmacy Management";
  if (system === "grocery") return isAr ? "نظام إدارة البقالة" : "Grocery & Supermarket";
  return isAr ? "نظام إدارة المجوهرات" : "Jewelry Management";
}

export function defaultBrandColor(system: PosSystem): string {
  if (system === "oil") return "#2563eb";
  if (system === "fashion") return "#db2777";
  if (system === "restaurant") return "#ea580c";
  if (system === "pharmacy") return "#0d9488";
  if (system === "grocery") return "#16a34a";
  return "#d4a574";
}

export function isRestaurantStore(posSystem: unknown): boolean {
  return posSystem === "restaurant";
}

/** Jewel-only menu paths hidden for fashion stores */
export const JEWEL_ONLY_PATHS = ["/repairs", "/purchases", "/layaway"];

/** Fashion-only features */
export const FASHION_ONLY_PATHS: string[] = [];

export { LOYALTY_EARN_PER_IQD, LOYALTY_REDEEM_IQD, calcLoyaltyEarned, calcLoyaltyDiscount } from "@shared/loyalty";

export function isFashionStore(posSystem: unknown): boolean {
  return posSystem === "fashion";
}

export function isPharmacyStore(posSystem: unknown): boolean {
  return posSystem === "pharmacy";
}

export function isGroceryStore(posSystem: unknown): boolean {
  return posSystem === "grocery";
}

/** storeId for real users; demoStoreId / impersonation for demo & admin. */
export function getEffectiveStoreId(
  user: {
    storeId?: number | null;
    demoStoreId?: number;
    impersonatingStoreId?: number;
  } | null | undefined,
): number | undefined {
  if (!user) return undefined;
  const id = user.impersonatingStoreId ?? user.demoStoreId ?? user.storeId ?? undefined;
  return id != null && id > 0 ? id : undefined;
}

export function isJewelStore(posSystem: unknown): boolean {
  return posSystem !== "oil" && posSystem !== "fashion" && posSystem !== "restaurant" && posSystem !== "pharmacy" && posSystem !== "grocery";
}

export function storeHomePath(posSystem?: string | null): string {
  if (posSystem === "oil") return "/oil";
  if (posSystem === "fashion") return "/fashion";
  if (posSystem === "restaurant") return "/restaurant";
  if (posSystem === "pharmacy") return "/pharmacy";
  if (posSystem === "grocery") return "/grocery";
  return "/";
}

export function isRetailScanStore(posSystem: unknown): boolean {
  return posSystem === "fashion" || posSystem === "pharmacy" || posSystem === "grocery";
}
