import JsBarcode from "jsbarcode";

export type LinearBarcodeOptions = {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
};

export const LABEL_BARCODE_DEFAULTS: LinearBarcodeOptions = {
  width: 2.5,
  height: 120,
  displayValue: true,
  fontSize: 18,
  margin: 10,
};

/** Single 50×30mm thermal label — tall bars, no number under bars (saves height). */
export function getPrintBarcodeOptions(code: string): LinearBarcodeOptions {
  const len = code.length;
  const width = len > 18 ? 1.5 : len > 14 ? 1.8 : len > 10 ? 2 : 2.5;
  return {
    width,
    height: 130,
    displayValue: false,
    margin: 2,
  };
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** One-page fashion label HTML (50mm × 30mm — standard single sticker). */
export function buildFashionLabelPrintHtml(opts: {
  name: string;
  meta?: string;
  price: string;
  currency: string;
  barcodeDataUrl: string;
}): string {
  const { name, meta, price, currency, barcodeDataUrl } = opts;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label</title><style>
@page{size:50mm 30mm;margin:0}
@media print{html,body{height:30mm;overflow:hidden}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:50mm;height:30mm;overflow:hidden;font-family:Arial,Helvetica,sans-serif}
body{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:0.8mm 1mm}
.bc{height:15mm;width:auto;max-width:48mm;display:block;flex-shrink:0;object-fit:contain}
.name{font-size:7pt;font-weight:700;line-height:1.05;max-height:2.1em;overflow:hidden;width:100%;margin-top:0.4mm}
.meta{font-size:6pt;color:#222;line-height:1;margin-top:0.2mm}
.price{font-size:9pt;font-weight:800;line-height:1;margin-top:0.3mm}
</style></head><body>
<img class="bc" src="${barcodeDataUrl}" alt="" onload="setTimeout(function(){window.print();window.close();},80)" />
<div class="name">${esc(name)}</div>
${meta ? `<div class="meta">${esc(meta)}</div>` : ""}
<div class="price">${esc(price)} ${esc(currency)}</div>
</body></html>`;
}

export function renderLinearBarcode(
  element: SVGSVGElement | HTMLCanvasElement,
  value: string,
  options: LinearBarcodeOptions = {},
) {
  JsBarcode(element, value, {
    format: "CODE128",
    width: options.width ?? LABEL_BARCODE_DEFAULTS.width,
    height: options.height ?? LABEL_BARCODE_DEFAULTS.height,
    displayValue: options.displayValue ?? true,
    fontSize: options.fontSize ?? LABEL_BARCODE_DEFAULTS.fontSize,
    margin: options.margin ?? LABEL_BARCODE_DEFAULTS.margin,
  });
}

export function linearBarcodeToDataUrl(value: string, options: LinearBarcodeOptions = {}): string {
  const canvas = document.createElement("canvas");
  renderLinearBarcode(canvas, value, options);
  return canvas.toDataURL("image/png");
}
