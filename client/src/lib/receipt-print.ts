import JsBarcode from "jsbarcode";
import type { Category, InventoryItem, Order, OrderItem } from "@shared/schema";

export type ReceiptFormat = "thermal" | "a4";

export type ReceiptLabels = {
  orderNumber: string;
  date: string;
  customer: string;
  phone: string;
  item: string;
  details: string;
  qty: string;
  price: string;
  unitPrice: string;
  lineTotal: string;
  total: string;
  discount: string;
  grandTotal: string;
  payment: string;
  notes: string;
  thankYou: string;
  currency: string;
  walkIn: string;
  sku: string;
  size: string;
  color: string;
  brand: string;
  barcode: string;
  styleCode: string;
  category: string;
  description: string;
  metalType: string;
  purity: string;
  weight: string;
  gemstone: string;
  caratWeight: string;
};

export type ReceiptPrintInput = {
  order: Order & { items?: OrderItem[] };
  items: OrderItem[];
  inventory: InventoryItem[];
  categories?: Category[];
  labels: ReceiptLabels;
  isAr: boolean;
  isFashion: boolean;
  format?: ReceiptFormat;
  storeName: string;
  storeAddress?: string;
  brandColor?: string;
  logoUrl?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentLabel: string;
};

type InvExtra = InventoryItem & {
  size?: string;
  color?: string;
  brand?: string;
  barcode?: string;
  styleCode?: string;
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function detailLine(label: string, value: string) {
  return `<div class="detail-line"><span class="detail-lbl">${esc(label)}:</span> ${esc(value)}</div>`;
}

function itemDetailLines(
  item: OrderItem,
  inv: InvExtra | undefined,
  labels: ReceiptLabels,
  isFashion: boolean,
  categoryName?: string,
): string {
  const lines: string[] = [];
  const sku = item.sku || inv?.sku;
  if (sku) lines.push(detailLine(labels.sku, sku));
  if (categoryName) lines.push(detailLine(labels.category, categoryName));

  if (isFashion) {
    if (inv?.styleCode) lines.push(detailLine(labels.styleCode, inv.styleCode));
    if (inv?.size) lines.push(detailLine(labels.size, inv.size));
    if (inv?.color) lines.push(detailLine(labels.color, inv.color));
    if (inv?.brand) lines.push(detailLine(labels.brand, inv.brand));
    if (inv?.barcode) lines.push(detailLine(labels.barcode, inv.barcode));
  } else {
    if (inv?.metalType) lines.push(detailLine(labels.metalType, inv.metalType));
    if (inv?.purity) lines.push(detailLine(labels.purity, inv.purity));
    if (inv?.weightGrams) lines.push(detailLine(labels.weight, `${inv.weightGrams}g`));
    if (inv?.gemstone) lines.push(detailLine(labels.gemstone, inv.gemstone));
    if (inv?.caratWeight) lines.push(detailLine(labels.caratWeight, String(inv.caratWeight)));
  }

  const desc = inv?.description?.trim();
  if (desc) lines.push(detailLine(labels.description, desc));

  return lines.length ? `<div class="item-details">${lines.join("")}</div>` : "";
}

function orderBarcodeSvg(orderNumber: string, format: ReceiptFormat): string {
  if (typeof document === "undefined" || !orderNumber) return "";
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, orderNumber, {
      format: "CODE128",
      width: format === "a4" ? 2.5 : 2.2,
      height: format === "a4" ? 64 : 52,
      displayValue: true,
      fontOptions: "bold",
      font: "Arial",
      fontSize: format === "a4" ? 16 : 14,
      textAlign: "center",
      textMargin: 4,
      margin: 2,
      lineColor: "#000000",
      background: "#ffffff",
    });
    return `<div class="barcode">${svg.outerHTML}</div>`;
  } catch {
    return `<div class="barcode"><b>${esc(orderNumber)}</b></div>`;
  }
}

const THERMAL_CSS = `
@page { size: 80mm auto; margin: 0; }
html, body {
  margin: 0; padding: 0;
  width: 80mm; max-width: 80mm;
  background: #fff !important;
  color: #000 !important;
  font-family: Arial, Helvetica, Tahoma, sans-serif !important;
  font-size: 15px !important;
  font-weight: 900 !important;
  line-height: 1.45 !important;
  -webkit-font-smoothing: none !important;
  text-rendering: optimizeSpeed !important;
  filter: contrast(1.25);
}
*, *::before, *::after {
  color: #000 !important;
  background: transparent !important;
  font-family: Arial, Helvetica, Tahoma, sans-serif !important;
  font-weight: 700 !important;
  box-sizing: border-box;
  opacity: 1 !important;
  -webkit-text-stroke: 0.35px #000;
}
b, strong, th, td, .store, .thanks, .grand td { font-weight: 900 !important; }
.center { text-align: center; }
.store {
  font-size: 20px !important; padding: 8px 4px;
  border: 4px solid #000; margin-bottom: 8px; background: #fff !important;
}
.meta { font-size: 14px !important; margin: 3px 0; }
.sep { border: none; border-top: 4px solid #000; margin: 10px 0; }
table { width: 100%; border-collapse: collapse; background: #fff !important; }
th, td {
  border: 3px solid #000; padding: 6px 4px;
  font-size: 14px !important; vertical-align: top; background: #fff !important;
}
.c { text-align: center; width: 26px; }
.r { text-align: right; white-space: nowrap; }
.item-details { margin-top: 5px; }
.detail-line { font-size: 12px !important; font-weight: 700 !important; margin: 2px 0; line-height: 1.35; }
.detail-lbl { font-weight: 900 !important; }
.totals td { border: 3px solid #000; padding: 6px 4px; }
.grand td { font-size: 19px !important; padding: 10px 4px !important; border: 4px solid #000 !important; }
.barcode { text-align: center; margin: 10px 0 6px; }
.barcode svg { max-width: 100%; height: auto; }
.barcode text, .barcode rect { fill: #000 !important; stroke: #000 !important; }
.footer { text-align: center; margin-top: 12px; font-size: 14px !important; }
.thanks { font-size: 17px !important; font-weight: 900 !important; margin: 10px 0; }
@media print {
  html, body, * {
    color: #000 !important; background: #fff !important;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
  }
}
`;

function a4Css(brandColor: string) {
  const accent = brandColor || "#333";
  return `
@page { size: A4; margin: 12mm; }
html, body {
  margin: 0; padding: 0;
  background: #fff; color: #111;
  font-family: Arial, Helvetica, Tahoma, sans-serif;
  font-size: 13px; line-height: 1.5;
}
* { box-sizing: border-box; }
.sheet { max-width: 186mm; margin: 0 auto; padding: 4mm; }
.header {
  text-align: center; padding: 16px 20px; margin-bottom: 20px;
  border: 2px solid ${accent}; border-radius: 8px;
}
.logo { max-height: 56px; max-width: 180px; object-fit: contain; margin-bottom: 8px; }
.store-name { font-size: 26px; font-weight: 800; color: ${accent}; margin: 0; }
.meta { font-size: 13px; color: #444; margin: 4px 0; }
.info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;
}
.info-box {
  border: 1px solid #ddd; border-radius: 6px; padding: 12px 14px; background: #fafafa;
}
.info-box h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${accent}; }
.info-box p { margin: 3px 0; font-size: 13px; }
.barcode { text-align: center; margin: 12px 0; }
.items-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
.items-table th {
  background: ${accent}; color: #fff; font-size: 12px; font-weight: 700;
  padding: 10px 8px; text-align: left; border: 1px solid ${accent};
}
.items-table th.c, .items-table td.c { text-align: center; width: 50px; }
.items-table th.r, .items-table td.r { text-align: right; white-space: nowrap; }
.items-table td {
  padding: 10px 8px; border: 1px solid #ddd; vertical-align: top; font-size: 13px;
}
.items-table tbody tr:nth-child(even) { background: #f9f9f9; }
.item-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
.item-details { margin-top: 6px; }
.detail-line { font-size: 11px; color: #555; margin: 2px 0; }
.detail-lbl { font-weight: 700; color: #333; }
.totals-table { width: 100%; max-width: 320px; margin-left: auto; border-collapse: collapse; }
.totals-table td { padding: 8px 10px; border: 1px solid #ddd; font-size: 13px; }
.totals-table .grand td {
  font-size: 18px; font-weight: 800; background: ${accent}; color: #fff; border-color: ${accent};
}
.footer { text-align: center; margin-top: 28px; padding-top: 16px; border-top: 2px dashed #ccc; }
.thanks { font-size: 16px; font-weight: 700; color: ${accent}; margin: 8px 0; }
@media print { .sheet { padding: 0; } }
`;
}

function buildThermalBody(ctx: ReturnType<typeof buildContext>) {
  const { order, items, inventory, categories, labels, isAr, isFashion, storeName, storeAddress, receiptHeader, receiptFooter, customerName, customerPhone, paymentLabel, dateStr, customerBlock, notesBlock, discountRow } = ctx;

  const rows = items.map((item) => {
    const inv = inventory.find((i) => i.id === item.inventoryItemId) as InvExtra | undefined;
    const cat = inv ? categories?.find((c) => c.id === inv.categoryId) : undefined;
    const detailsHtml = itemDetailLines(item, inv, labels, isFashion, cat?.name);
    const lineTotal = Number(item.price) * item.quantity;
    return `<tr>
      <td><b>${esc(item.name)}</b>${detailsHtml}</td>
      <td class="c"><b>${item.quantity}</b></td>
      <td class="r"><b>${Number(item.price).toLocaleString()}</b><br><span class="detail-line">${lineTotal.toLocaleString()} ${labels.currency}</span></td>
    </tr>`;
  }).join("");

  return `
<div class="center">
  <div class="store"><b>${esc(storeName)}</b></div>
  ${storeAddress ? `<div class="meta"><b>${esc(storeAddress)}</b></div>` : ""}
  ${receiptHeader ? `<div class="meta"><b>${esc(receiptHeader)}</b></div>` : ""}
</div>
<hr class="sep">
<table class="totals">
  <tr><td><b>${esc(labels.orderNumber)}</b></td><td class="r"><b>${esc(order.orderNumber)}</b></td></tr>
  <tr><td><b>${esc(labels.date)}</b></td><td class="r"><b>${esc(dateStr)}</b></td></tr>
</table>
${orderBarcodeSvg(order.orderNumber, "thermal")}
${customerBlock}
${notesBlock}
<table>
  <thead><tr>
    <th><b>${esc(labels.item)}</b></th>
    <th class="c"><b>${esc(labels.qty)}</b></th>
    <th class="r"><b>${esc(labels.price)}</b></th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="totals">
  <tr><td colspan="2"><b>${esc(labels.total)}</b></td><td class="r"><b>${Number(order.subtotal).toLocaleString()} ${labels.currency}</b></td></tr>
  ${discountRow}
  <tr class="grand"><td colspan="2"><b>${esc(labels.grandTotal)}</b></td><td class="r"><b>${Number(order.total).toLocaleString()} ${labels.currency}</b></td></tr>
  <tr><td colspan="2"><b>${esc(labels.payment)}</b></td><td class="r"><b>${esc(paymentLabel)}</b></td></tr>
</table>
<div class="footer">
  ${receiptFooter ? `<div><b>${esc(receiptFooter)}</b></div>` : ""}
  <div class="thanks"><b>${esc(labels.thankYou)}</b></div>
  <div><b>www.iq-pos.com</b></div>
</div>`;
}

function buildA4Body(ctx: ReturnType<typeof buildContext>) {
  const { order, items, inventory, categories, labels, isFashion, storeName, storeAddress, receiptHeader, receiptFooter, customerName, customerPhone, paymentLabel, dateStr, customerBlock, notesBlock, discountRow, logoUrl } = ctx;

  const rows = items.map((item) => {
    const inv = inventory.find((i) => i.id === item.inventoryItemId) as InvExtra | undefined;
    const cat = inv ? categories?.find((c) => c.id === inv.categoryId) : undefined;
    const detailsHtml = itemDetailLines(item, inv, labels, isFashion, cat?.name);
    const lineTotal = Number(item.price) * item.quantity;
    return `<tr>
      <td><div class="item-name">${esc(item.name)}</div>${detailsHtml}</td>
      <td class="c">${item.quantity}</td>
      <td class="r">${Number(item.price).toLocaleString()} ${labels.currency}</td>
      <td class="r"><b>${lineTotal.toLocaleString()} ${labels.currency}</b></td>
    </tr>`;
  }).join("");

  const customerInfo = (customerName && customerName !== labels.walkIn) || customerPhone
    ? `<p><b>${esc(labels.customer)}:</b> ${customerName && customerName !== labels.walkIn ? esc(customerName) : "—"}</p>
       ${customerPhone ? `<p><b>${esc(labels.phone)}:</b> ${esc(customerPhone)}</p>` : ""}`
    : `<p>${esc(labels.walkIn)}</p>`;

  return `
<div class="sheet">
  <div class="header">
    ${logoUrl ? `<img class="logo" src="${esc(logoUrl)}" alt="logo">` : ""}
    <h1 class="store-name">${esc(storeName)}</h1>
    ${storeAddress ? `<p class="meta">${esc(storeAddress)}</p>` : ""}
    ${receiptHeader ? `<p class="meta">${esc(receiptHeader)}</p>` : ""}
  </div>
  <div class="info-grid">
    <div class="info-box">
      <h3>${esc(labels.orderNumber)}</h3>
      <p><b>${esc(order.orderNumber)}</b></p>
      <p>${esc(labels.date)}: ${esc(dateStr)}</p>
      <p>${esc(labels.payment)}: ${esc(paymentLabel)}</p>
    </div>
    <div class="info-box">
      <h3>${esc(labels.customer)}</h3>
      ${customerInfo}
      ${order.notes?.trim() ? `<p><b>${esc(labels.notes)}:</b> ${esc(order.notes.trim())}</p>` : ""}
    </div>
  </div>
  ${orderBarcodeSvg(order.orderNumber, "a4")}
  <table class="items-table">
    <thead><tr>
      <th>${esc(labels.item)} / ${esc(labels.details)}</th>
      <th class="c">${esc(labels.qty)}</th>
      <th class="r">${esc(labels.unitPrice)}</th>
      <th class="r">${esc(labels.lineTotal)}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals-table">
    <tr><td>${esc(labels.total)}</td><td class="r">${Number(order.subtotal).toLocaleString()} ${labels.currency}</td></tr>
    ${discountRow}
    <tr class="grand"><td>${esc(labels.grandTotal)}</td><td class="r">${Number(order.total).toLocaleString()} ${labels.currency}</td></tr>
  </table>
  <div class="footer">
    ${receiptFooter ? `<p>${esc(receiptFooter)}</p>` : ""}
    <p class="thanks">${esc(labels.thankYou)}</p>
    <p>www.iq-pos.com</p>
  </div>
</div>`;
}

function buildContext(input: ReceiptPrintInput) {
  const {
    order, items, inventory, categories, labels, isAr, isFashion,
    storeName, storeAddress, receiptHeader, receiptFooter,
    customerName, customerPhone, paymentLabel, logoUrl,
  } = input;

  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleString(isAr ? "ar-IQ" : "en-GB")
    : "";

  const showCustomer =
    (customerName && customerName !== labels.walkIn) || !!customerPhone;
  const customerBlock = showCustomer
    ? `<table class="totals"><tr><td><b>${esc(labels.customer)}</b><br>${customerName && customerName !== labels.walkIn ? esc(customerName) : ""}${customerPhone ? `${customerName && customerName !== labels.walkIn ? "<br>" : ""}${esc(labels.phone)}: ${esc(customerPhone)}` : ""}</td></tr></table>`
    : "";

  const notesBlock = order.notes?.trim()
    ? `<table class="totals"><tr><td><b>${esc(labels.notes)}</b><br>${esc(order.notes.trim())}</td></tr></table>`
    : "";

  const discountRow =
    Number(order.discount) > 0
      ? `<tr><td${input.format === "a4" ? "" : ' colspan="2"'}><b>${esc(labels.discount)}</b></td><td class="r"><b>-${Number(order.discount).toLocaleString()} ${labels.currency}</b></td></tr>`
      : "";

  return {
    order, items, inventory, categories, labels, isAr, isFashion,
    storeName, storeAddress, receiptHeader, receiptFooter,
    customerName, customerPhone, paymentLabel, dateStr,
    customerBlock, notesBlock, discountRow, logoUrl,
  };
}

export function buildReceiptHtml(input: ReceiptPrintInput): string {
  const format = input.format ?? "thermal";
  const ctx = buildContext(input);
  const body = format === "a4" ? buildA4Body(ctx) : buildThermalBody(ctx);
  const css = format === "a4" ? a4Css(input.brandColor || "#333") : THERMAL_CSS;

  return `<!DOCTYPE html>
<html dir="${input.isAr ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<title>${esc(input.order.orderNumber)}</title>
<style>${css}</style>
</head>
<body>
${body}
<script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
}

export function openReceiptPrint(html: string, format: ReceiptFormat = "thermal") {
  const size = format === "a4" ? "width=900,height=1100" : "width=320,height=720";
  const w = window.open("", "_blank", size);
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}

export function printReceipt(input: ReceiptPrintInput, format: ReceiptFormat = "thermal") {
  openReceiptPrint(buildReceiptHtml({ ...input, format }), format);
}
