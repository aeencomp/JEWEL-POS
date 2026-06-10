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

export const FASHION_LABEL_MM = { width: 50, height: 25 } as const;

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

/** Compact barcode tuned for 50×25 mm thermal labels. */
export function getFashionLabelBarcodeOptions(code: string): LinearBarcodeOptions {
  const format = inferBarcodeFormat(code);
  if (format === "CODE39") {
    return { width: 1.85, height: 44, displayValue: false, margin: 2 };
  }
  if (format === "EAN13") {
    return { width: 1.9, height: 40, displayValue: false, margin: 2 };
  }
  return { width: 1.6, height: 42, displayValue: false, margin: 2 };
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
  const { width, height } = FASHION_LABEL_MM;
  const bcSvg = linearBarcodeToPrintSvg(barcodeValue, getFashionLabelBarcodeOptions(barcodeValue));
  const nameDir = hasArabicText(name) ? "rtl" : "ltr";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label</title><style>
@page{size:${width}mm ${height}mm;margin:0}
@media print{html,body{height:${height}mm;overflow:hidden}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${width}mm;height:${height}mm;overflow:hidden}
body{display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:0.8mm 1.5mm 0.6mm;font-family:Arial,Helvetica,sans-serif}
.name{width:100%;font-size:6.5pt;font-weight:600;line-height:1.05;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:${nameDir};flex-shrink:0}
.bc-box{width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:0.2mm 0}
.bc-box svg{width:100%!important;height:auto!important;max-height:15mm}
.price{width:100%;font-family:"Times New Roman",Times,serif;font-size:10pt;font-weight:bold;text-align:center;line-height:1;flex-shrink:0}
</style></head><body>
<div class="name">${esc(name)}</div>
<div class="bc-box">${bcSvg}</div>
<div class="price">${esc(price)}</div>
<script>setTimeout(function(){window.print();window.close();},120)</script>
</body></html>`;
}
