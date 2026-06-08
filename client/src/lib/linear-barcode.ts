import JsBarcode from "jsbarcode";
import { barcodePayload, hasArabicText, inferBarcodeFormat } from "@/lib/barcode";

export type LinearBarcodeOptions = {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
};

export const LABEL_BARCODE_DEFAULTS: LinearBarcodeOptions = {
  width: 2.5,
  height: 60,
  displayValue: false,
  fontSize: 14,
  margin: 12,
};

export function getPrintBarcodeOptions(code: string): LinearBarcodeOptions {
  const format = inferBarcodeFormat(code);
  if (format === "CODE39") {
    return { width: 2.2, height: 70, displayValue: false, margin: 16 };
  }
  if (format === "EAN13") {
    return { width: 2.8, height: 140, displayValue: false, margin: 8 };
  }
  return { width: 2, height: 100, displayValue: false, margin: 8 };
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
  const payload = barcodePayload(value);
  JsBarcode(element, payload, {
    format,
    width: options.width ?? LABEL_BARCODE_DEFAULTS.width,
    height: options.height ?? LABEL_BARCODE_DEFAULTS.height,
    displayValue: options.displayValue ?? false,
    fontSize: options.fontSize ?? LABEL_BARCODE_DEFAULTS.fontSize,
    margin: options.margin ?? LABEL_BARCODE_DEFAULTS.margin,
    ...(format === "CODE39" ? { mod43: false } : {}),
  });
}

/** Vector SVG for print — avoids PNG stretch that breaks scanning. */
export function linearBarcodeToPrintSvg(value: string, options: LinearBarcodeOptions = {}): string {
  const format = inferBarcodeFormat(value);
  const payload = barcodePayload(value);
  const base = { ...getPrintBarcodeOptions(value), ...options };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, payload, {
    format,
    width: base.width ?? 2.2,
    height: base.height ?? 70,
    displayValue: false,
    margin: base.margin ?? 16,
    xmlDocument: document,
    ...(format === "CODE39" ? { mod43: false } : {}),
  });
  return svg.outerHTML;
}

export function linearBarcodeToDataUrl(value: string, options: LinearBarcodeOptions = {}): string {
  const canvas = document.createElement("canvas");
  renderLinearBarcode(canvas, value, { ...getPrintBarcodeOptions(value), ...options });
  return canvas.toDataURL("image/png");
}

export function buildFashionLabelPrintHtml(opts: {
  name: string;
  price: string;
  barcodeValue: string;
}): string {
  const { name, price, barcodeValue } = opts;
  const bcSvg = linearBarcodeToPrintSvg(barcodeValue);
  const bcNum = esc(barcodePayload(barcodeValue));
  const nameDir = hasArabicText(name) ? "rtl" : "ltr";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label</title><style>
@page{size:50mm 30mm;margin:0}
@media print{html,body{height:30mm;overflow:hidden}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:50mm;height:30mm;overflow:hidden}
body{display:flex;flex-direction:column;justify-content:space-between;padding:2mm 3.5mm 2.5mm;font-family:Arial,Helvetica,sans-serif}
.name{font-size:10.5pt;line-height:1.15;text-align:center;max-height:2.4em;overflow:hidden;direction:${nameDir};flex-shrink:0}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0.5mm 0;min-height:0}
.bc-box{width:100%;height:12mm;display:flex;align-items:center;justify-content:center;overflow:hidden}
.bc-box svg{width:100%!important;height:100%!important;max-height:12mm}
.bc-num{font-size:8.5pt;text-align:left;padding-left:1.5mm;margin-top:0.5mm;line-height:1;font-family:Arial,sans-serif}
.price{font-family:"Times New Roman",Times,serif;font-size:24pt;font-weight:bold;text-align:center;line-height:1;flex-shrink:0;padding-bottom:0.5mm}
</style></head><body>
<div class="name">${esc(name)}</div>
<div class="mid">
<div class="bc-box">${bcSvg}</div>
<div class="bc-num">${bcNum}</div>
</div>
<div class="price">${esc(price)}</div>
<script>setTimeout(function(){window.print();window.close();},120)</script>
</body></html>`;
}
