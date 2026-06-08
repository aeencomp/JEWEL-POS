/** Short retail code like 10028 — store digit + 4-digit sequence. */
export function nextFashionBarcode(
  storeId: number,
  inventory: { barcode?: string | null }[] = [],
): string {
  const storeDigit = String(Math.min(Math.max(storeId, 1), 9));
  const prefix = storeDigit;
  const floor = parseInt(`${prefix}0000`, 10);
  const nums = inventory
    .map((i) => (i.barcode || "").replace(/\D/g, ""))
    .filter((b) => b.length === 5 && b.startsWith(prefix))
    .map((b) => parseInt(b, 10))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : floor) + 1;
  return String(next).padStart(5, "0");
}

export function inferBarcodeFormat(code: string): "EAN13" | "CODE128" {
  const digits = code.replace(/\D/g, "");
  if (digits.length === 12 || digits.length === 13) return "EAN13";
  return "CODE128";
}

/** Normalize scanner input for lookup. */
export function normalizeBarcodeForScan(code: string): string {
  const trimmed = code.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 5) return digits;
  if (digits.length === 12) return digits + ean13CheckDigit(digits);
  if (digits.length === 13) return digits;
  return trimmed;
}

export function ean13CheckDigit(code12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code12[i]!, 10) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

export function generateInventoryBarcode(
  storeId: number,
  posSystem: string | null | undefined,
  _suffix = "",
  inventory: { barcode?: string | null }[] = [],
): string {
  if (posSystem === "fashion") {
    return nextFashionBarcode(storeId, inventory);
  }
  const prefix = posSystem === "oil" ? "OIL" : "JWL";
  const tail = _suffix.replace(/[^A-Z0-9]/gi, "").substring(0, 8).toUpperCase();
  return `${prefix}${storeId}${Date.now().toString(36).toUpperCase()}${tail}`;
}

export function hasArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}
