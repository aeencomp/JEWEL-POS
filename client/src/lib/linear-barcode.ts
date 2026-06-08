import JsBarcode from "jsbarcode";
import { inferBarcodeFormat } from "@/lib/barcode";

export type LinearBarcodeOptions = {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
};

export const LABEL_BARCODE_DEFAULTS: LinearBarcodeOptions = {
  width: 2.5,
  height: 100,
  displayValue: true,
  fontSize: 16,
  margin: 8,
};

const PRINT_SCALE = 4;

/** Optimized for 50×30mm sticker + USB scanner (EAN-13). */
export function getPrintBarcodeOptions(code: string): LinearBarcodeOptions {
  if (inferBarcodeFormat(code) === "EAN13") {
    return { width: 2.8, height: 140, displayValue: false, margin: 8 };
  }
  const len = code.length;
  const width = len > 18 ? 1.5 : len > 14 ? 1.8 : 2;
  return { width, height: 130, displayValue: false, margin: 4 };
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderLinearBarcode(
  element: SVGSVGElement | HTMLCanvasElement,
  value: string,
  options: LinearBarcodeOptions = {},
) {
  const format = inferBarcodeFormat(value);
  const payload = format === "EAN13" ? value.replace(/\D/g, "").slice(0, 12) : value;
  JsBarcode(element, payload, {
    format,
    width: options.width ?? LABEL_BARCODE_DEFAULTS.width,
    height: options.height ?? LABEL_BARCODE_DEFAULTS.height,
    displayValue: options.displayValue ?? true,
    fontSize: options.fontSize ?? LABEL_BARCODE_DEFAULTS.fontSize,
    margin: options.margin ?? LABEL_BARCODE_DEFAULTS.margin,
  });
}

/** High-resolution PNG for crisp thermal printing. */
export function linearBarcodeToDataUrl(value: string, options: LinearBarcodeOptions = {}): string {
  const format = inferBarcodeFormat(value);
  const payload = format === "EAN13" ? value.replace(/\D/g, "").slice(0, 12) : value;
  const base = { ...getPrintBarcodeOptions(value), ...options };
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, payload, {
    format,
    width: (base.width ?? 2.5) * PRINT_SCALE,
    height: (base.height ?? 120) * PRINT_SCALE,
    displayValue: false,
    margin: (base.margin ?? 6) * PRINT_SCALE,
  });
  return canvas.toDataURL("image/png");
}

/** One-page fashion label HTML (50mm × 30mm). */
export function buildFashionLabelPrintHtml(opts: {
  name: string;
  meta?: string;
  price: string;
  currency: string;
  barcodeDataUrl: string;
  barcodeValue: string;
}): string {
  const { name, meta, price, currency, barcodeDataUrl, barcodeValue } = opts;
  const digits = barcodeValue.replace(/\D/g, "");
  const bcNum = digits.length >= 12 ? digits.slice(0, 13) : esc(barcodeValue);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label</title><style>
@page{size:50mm 30mm;margin:0}
@media print{html,body{height:30mm;overflow:hidden}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:50mm;height:30mm;overflow:hidden;font-family:Arial,Helvetica,sans-serif}
body{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:0.6mm 1mm}
.bc{height:17mm;width:auto;max-width:48mm;display:block;flex-shrink:0;image-rendering:pixelated;image-rendering:crisp-edges}
.bc-num{font-size:6.5pt;font-family:Consolas,Monaco,monospace;letter-spacing:0.5px;margin-top:0.2mm;line-height:1}
.name{font-size:7pt;font-weight:700;line-height:1.05;max-height:2em;overflow:hidden;width:100%;margin-top:0.3mm}
.meta{font-size:6pt;color:#222;line-height:1;margin-top:0.15mm}
.price{font-size:9pt;font-weight:800;line-height:1;margin-top:0.25mm}
</style></head><body>
<img class="bc" src="${barcodeDataUrl}" alt="" onload="setTimeout(function(){window.print();window.close();},80)" />
<div class="bc-num">${bcNum}</div>
<div class="name">${esc(name)}</div>
${meta ? `<div class="meta">${esc(meta)}</div>` : ""}
<div class="price">${esc(price)} ${esc(currency)}</div>
</body></html>`;
}
