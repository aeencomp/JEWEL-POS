export function ean13CheckDigit(code12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code12[i]!, 10) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

/** Standard 13-digit retail barcode — works with most USB/Bluetooth scanners. */
export function generateFashionEan13(storeId: number): string {
  const store = String(storeId).padStart(2, "0").slice(-2);
  const time = String(Date.now() % 10_000_000).padStart(7, "0");
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const base12 = `${store}${time}${rand}`.slice(0, 12);
  return base12 + ean13CheckDigit(base12);
}

export function inferBarcodeFormat(code: string): "EAN13" | "CODE128" {
  const digits = code.replace(/\D/g, "");
  if (digits.length === 12 || digits.length === 13) return "EAN13";
  return "CODE128";
}

/** Normalize scanner input for lookup (EAN padding / check digit). */
export function normalizeBarcodeForScan(code: string): string {
  const trimmed = code.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 12) return digits + ean13CheckDigit(digits);
  if (digits.length === 13) return digits;
  return trimmed;
}

export function generateInventoryBarcode(
  storeId: number,
  posSystem: string | null | undefined,
  suffix = "",
): string {
  if (posSystem === "fashion") {
    return generateFashionEan13(storeId);
  }
  const prefix = posSystem === "oil" ? "OIL" : "JWL";
  const tail = suffix.replace(/[^A-Z0-9]/gi, "").substring(0, 8).toUpperCase();
  return `${prefix}${storeId}${Date.now().toString(36).toUpperCase()}${tail}`;
}
