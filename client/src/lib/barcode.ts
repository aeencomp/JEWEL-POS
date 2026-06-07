export function generateInventoryBarcode(
  storeId: number,
  posSystem: string | null | undefined,
  suffix = "",
): string {
  const prefix = posSystem === "fashion" ? "FSH" : posSystem === "oil" ? "OIL" : "JWL";
  const tail = suffix.replace(/[^A-Z0-9]/gi, "").substring(0, 8).toUpperCase();
  return `${prefix}${storeId}${Date.now().toString(36).toUpperCase()}${tail}`;
}
