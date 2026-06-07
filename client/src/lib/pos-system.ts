export type PosSystem = "jewel" | "oil" | "fashion";

export const POS_SYSTEMS: PosSystem[] = ["jewel", "oil", "fashion"];

export function normalizePosSystem(value: unknown): PosSystem {
  if (value === "oil" || value === "fashion") return value;
  return "jewel";
}

export function posSystemLabel(system: PosSystem, isAr: boolean): string {
  if (system === "oil") return isAr ? "FactoryPOS" : "FactoryPOS";
  if (system === "fashion") return isAr ? "FashionPOS" : "FashionPOS";
  return isAr ? "JewelPOS" : "JewelPOS";
}

export function posSystemSubtitle(system: PosSystem, isAr: boolean): string {
  if (system === "oil") return isAr ? "نظام إدارة المصنع" : "Factory Management";
  if (system === "fashion") return isAr ? "نظام إدارة الملابس" : "Fashion & Apparel";
  return isAr ? "نظام إدارة المجوهرات" : "Jewelry Management";
}

export function defaultBrandColor(system: PosSystem): string {
  if (system === "oil") return "#2563eb";
  if (system === "fashion") return "#db2777";
  return "#d4a574";
}

/** Jewel-only menu paths hidden for fashion stores */
export const JEWEL_ONLY_PATHS = ["/repairs", "/purchases", "/layaway"];

/** Fashion-only features */
export const FASHION_ONLY_PATHS = ["/returns"];

export { LOYALTY_EARN_PER_IQD, LOYALTY_REDEEM_IQD, calcLoyaltyEarned, calcLoyaltyDiscount } from "@shared/loyalty";

export function isFashionStore(posSystem: unknown): boolean {
  return posSystem === "fashion";
}

export function isJewelStore(posSystem: unknown): boolean {
  return posSystem !== "oil" && posSystem !== "fashion";
}
