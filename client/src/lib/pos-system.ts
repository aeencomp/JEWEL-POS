export type PosSystem = "jewel" | "oil" | "fashion" | "restaurant";

export const DEMO_USERNAME = "demo";

/** Demo user: infer POS from login URL when API omits posSystem. */
export function resolveUserPosSystem(
  user: { username?: string; posSystem?: string } | null | undefined,
  pathname: string,
): PosSystem | undefined {
  const ps = user?.posSystem;
  if (ps === "oil" || ps === "fashion" || ps === "restaurant" || ps === "jewel") return ps;
  if (user?.username !== DEMO_USERNAME) return undefined;
  if (pathname.startsWith("/restaurant")) return "restaurant";
  if (pathname.startsWith("/fashion")) return "fashion";
  if (pathname.startsWith("/oil")) return "oil";
  return "jewel";
}

export const POS_SYSTEMS: PosSystem[] = ["jewel", "oil", "fashion", "restaurant"];

export function normalizePosSystem(value: unknown): PosSystem {
  if (value === "oil" || value === "fashion" || value === "restaurant") return value;
  return "jewel";
}

export function posSystemLabel(system: PosSystem, isAr: boolean): string {
  if (system === "oil") return isAr ? "FactoryPOS" : "FactoryPOS";
  if (system === "fashion") return isAr ? "FashionPOS" : "FashionPOS";
  if (system === "restaurant") return isAr ? "RestoPOS" : "RestoPOS";
  return isAr ? "JewelPOS" : "JewelPOS";
}

export function posSystemSubtitle(system: PosSystem, isAr: boolean): string {
  if (system === "oil") return isAr ? "نظام إدارة المصنع" : "Factory Management";
  if (system === "fashion") return isAr ? "نظام إدارة الملابس" : "Fashion & Apparel";
  if (system === "restaurant") return isAr ? "نظام المطاعم والمقاهي" : "Restaurant & Café";
  return isAr ? "نظام إدارة المجوهرات" : "Jewelry Management";
}

export function defaultBrandColor(system: PosSystem): string {
  if (system === "oil") return "#2563eb";
  if (system === "fashion") return "#db2777";
  if (system === "restaurant") return "#ea580c";
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

export function isJewelStore(posSystem: unknown): boolean {
  return posSystem !== "oil" && posSystem !== "fashion" && posSystem !== "restaurant";
}
