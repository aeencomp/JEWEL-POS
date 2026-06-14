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

/** Thermal label: 50 mm عرض (width) × 25 mm طول (length). */
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

/** Barcode sizing for 50×25 mm labels — tall bars for reliable USB scanner reads. */
export function getFashionLabelBarcodeOptions(code: string): LinearBarcodeOptions {
  const format = inferBarcodeFormat(code);
  if (format === "CODE39") {
    return { width: 2.35, height: 62, displayValue: false, margin: 4 };
  }
  if (format === "EAN13") {
    return { width: 2.4, height: 55, displayValue: false, margin: 4 };
  }
  return { width: 2.0, height: 58, displayValue: false, margin: 4 };
}

/** Shared print/preview CSS — never stretch barcode SVG height (breaks scanning). */
export const FASHION_LABEL_CSS = `
.label{width:50mm;height:25mm;overflow:hidden;padding:1.5mm 2.5mm 1.2mm;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;justify-content:flex-start;background:#fff;color:#000}
.name{font-size:9pt;line-height:1.1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 0 auto;margin-bottom:0.4mm}
.mid{flex:0 0 auto;display:flex;flex-direction:column;align-items:stretch;width:100%}
.bc-wrap{width:100%;display:flex;justify-content:center;align-items:center;overflow:hidden}
.bc-wrap svg{width:100%!important;height:auto!important;max-width:45mm;display:block}
.bc-num{font-size:7.5pt;text-align:left;padding-left:1mm;margin-top:0.3mm;line-height:1;font-family:Arial,sans-serif;flex:0 0 auto}
.price{font-family:"Times New Roman",Times,serif;font-size:14pt;font-weight:bold;text-align:center;line-height:1;margin-top:0.6mm;flex:0 0 auto}
`;

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

/** Vector SVG for print — native aspect ratio, width-only scaling. */
export function linearBarcodeToPrintSvg(value: string, options: LinearBarcodeOptions = {}): string {
  const format = inferBarcodeFormat(value);
  const payload = barcodePayload(value);
  const base = options.width != null ? options : { ...getPrintBarcodeOptions(value), ...options };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, payload, {
      format,
      width: base.width ?? 2.2,
      height: base.height ?? 70,
      displayValue: false,
      margin: base.margin ?? 16,
      xmlDocument: document,
      ...(format === "CODE39" ? { mod43: false } : {}),
    });
  } catch {
    JsBarcode(svg, payload, {
      format: "CODE128",
      width: base.width ?? 2.2,
      height: base.height ?? 70,
      displayValue: false,
      margin: base.margin ?? 16,
      xmlDocument: document,
    });
  }
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";
  return svg.outerHTML;
}

export function linearBarcodeToDataUrl(value: string, options: LinearBarcodeOptions = {}): string {
  const canvas = document.createElement("canvas");
  renderLinearBarcode(canvas, value, { ...getPrintBarcodeOptions(value), ...options });
  return canvas.toDataURL("image/png");
}

export function buildPharmacyLabelPrintHtml(opts: {
  name: string;
  price: string;
  barcodeValue: string;
  strength?: string | null;
  dosageForm?: string | null;
}): string {
  const subtitle = [opts.dosageForm, opts.strength].filter(Boolean).join(" · ");
  return buildFashionLabelPrintHtml({
    name: opts.name,
    price: opts.price,
    barcodeValue: opts.barcodeValue,
    subtitle: subtitle || undefined,
  });
}

export function buildFashionLabelPrintHtml(opts: {
  name: string;
  price: string;
  barcodeValue: string;
  subtitle?: string;
}): string {
  const { name, price, barcodeValue, subtitle } = opts;
  const { width, height } = FASHION_LABEL_MM;
  const bcSvg = linearBarcodeToPrintSvg(barcodeValue, getFashionLabelBarcodeOptions(barcodeValue));
  const bcNum = esc(barcodePayload(barcodeValue));
  const nameDir = hasArabicText(name) ? "rtl" : "ltr";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label ${width}×${height}</title><style>
@page{size:${width}mm ${height}mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${width}mm;height:${height}mm;overflow:hidden;background:#fff}
@media print{
@page{size:${width}mm ${height}mm;margin:0}
html,body{width:${width}mm!important;height:${height}mm!important;margin:0!important;padding:0!important}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.label{position:absolute;top:0;left:0}
}
${FASHION_LABEL_CSS}
.name{direction:${nameDir}}
</style></head><body>
<div class="label">
<div class="name">${esc(name)}</div>
${subtitle ? `<div class="sub" style="font-size:7pt;text-align:center;opacity:0.85;margin-bottom:0.3mm">${esc(subtitle)}</div>` : ""}
<div class="mid">
<div class="bc-wrap">${bcSvg}</div>
<div class="bc-num">${bcNum}</div>
</div>
<div class="price">${esc(price)}</div>
</div>
<script>setTimeout(function(){window.print();window.close();},150)</script>
</body></html>`;
}
