import JsBarcode from "jsbarcode";
import { hasArabicText, inferBarcodeFormat } from "@/lib/barcode";

export type LinearBarcodeOptions = {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
};

export const LABEL_BARCODE_DEFAULTS: LinearBarcodeOptions = {
  width: 3,
  height: 70,
  displayValue: false,
  fontSize: 14,
  margin: 10,
};

const PRINT_SCALE = 4;

export function getPrintBarcodeOptions(code: string): LinearBarcodeOptions {
  const digits = code.replace(/\D/g, "");
  if (digits.length <= 8) {
    return { width: 4, height: 85, displayValue: false, margin: 14 };
  }
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
    displayValue: options.displayValue ?? false,
    fontSize: options.fontSize ?? LABEL_BARCODE_DEFAULTS.fontSize,
    margin: options.margin ?? LABEL_BARCODE_DEFAULTS.margin,
  });
}

export function linearBarcodeToDataUrl(value: string, options: LinearBarcodeOptions = {}): string {
  const format = inferBarcodeFormat(value);
  const payload = format === "EAN13" ? value.replace(/\D/g, "").slice(0, 12) : value;
  const base = { ...getPrintBarcodeOptions(value), ...options };
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, payload, {
    format,
    width: (base.width ?? 3) * PRINT_SCALE,
    height: (base.height ?? 85) * PRINT_SCALE,
    displayValue: false,
    margin: (base.margin ?? 10) * PRINT_SCALE,
  });
  return canvas.toDataURL("image/png");
}

/**
 * Reference label style: Arabic name top, wide barcode, ID under bars left, big serif price bottom.
 */
export function buildFashionLabelPrintHtml(opts: {
  name: string;
  price: string;
  barcodeDataUrl: string;
  barcodeValue: string;
}): string {
  const { name, price, barcodeDataUrl, barcodeValue } = opts;
  const bcNum = esc(barcodeValue.replace(/\D/g, "") || barcodeValue);
  const nameDir = hasArabicText(name) ? "rtl" : "ltr";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label</title><style>
@page{size:50mm 30mm;margin:0}
@media print{html,body{height:30mm;overflow:hidden}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:50mm;height:30mm;overflow:hidden}
body{display:flex;flex-direction:column;justify-content:space-between;padding:2mm 3.5mm 2.5mm;font-family:Arial,Helvetica,sans-serif}
.name{font-size:10.5pt;line-height:1.15;text-align:center;max-height:2.4em;overflow:hidden;direction:${nameDir};flex-shrink:0}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;padding:1mm 0}
.bc{width:100%;height:11mm;display:block;object-fit:fill;image-rendering:pixelated;image-rendering:crisp-edges}
.bc-num{font-size:8.5pt;text-align:left;padding-left:1.5mm;margin-top:0.6mm;line-height:1}
.price{font-family:"Times New Roman",Times,serif;font-size:24pt;font-weight:bold;text-align:center;line-height:1;flex-shrink:0;padding-bottom:0.5mm}
</style></head><body>
<div class="name">${esc(name)}</div>
<div class="mid">
<img class="bc" src="${barcodeDataUrl}" alt="" onload="setTimeout(function(){window.print();window.close();},80)" />
<div class="bc-num">${bcNum}</div>
</div>
<div class="price">${esc(price)}</div>
</body></html>`;
}
