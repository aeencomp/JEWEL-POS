import QRCode from "qrcode";
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
  } else {
    if (inv?.metalType && inv.metalType !== "other") lines.push(detailLine(labels.metalType, inv.metalType));
    if (inv?.purity) lines.push(detailLine(labels.purity, inv.purity));
    if (inv?.weightGrams) lines.push(detailLine(labels.weight, `${inv.weightGrams}g`));
    if (inv?.gemstone) lines.push(detailLine(labels.gemstone, inv.gemstone));
    if (inv?.caratWeight) lines.push(detailLine(labels.caratWeight, String(inv.caratWeight)));
  }

  const desc = inv?.description?.trim();
  if (desc) lines.push(detailLine(labels.description, desc));

  return lines.length ? `<div class="item-details">${lines.join("")}</div>` : "";
}

async function orderQrBlock(orderNumber: string): Promise<string> {
  if (!orderNumber) return "";
  try {
    const dataUrl = await QRCode.toDataURL(orderNumber, {
      width: 140,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
    return `<div class="qr-block">
      <img src="${dataUrl}" alt="QR" width="70" height="70">
      <div class="qr-label">${esc(orderNumber)}</div>
    </div>`;
  } catch {
    return "";
  }
}

const THERMAL_CSS = `
@page { size: 80mm auto; margin: 2mm; }
html, body {
  margin: 0; padding: 0;
  width: 76mm; max-width: 76mm;
  background: #fff !important;
  color: #000 !important;
  font-family: Arial, Helvetica, Tahoma, sans-serif !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  line-height: 1.4 !important;
  -webkit-font-smoothing: antialiased !important;
}
* { box-sizing: border-box; color: #000 !important; background: transparent !important; }
.center { text-align: center; }
.store {
  font-size: 17px !important;
  font-weight: 700 !important;
  padding: 6px 0 8px;
  border-bottom: 2px solid #000;
  margin-bottom: 8px;
}
.meta { font-size: 12px !important; margin: 2px 0; font-weight: 400 !important; }
.sep { border: none; border-top: 1px dashed #000; margin: 8px 0; }
table { width: 100%; border-collapse: collapse; }
th, td {
  border: 1px solid #000;
  padding: 5px 4px;
  font-size: 12px !important;
  font-weight: 400 !important;
  vertical-align: top;
}
th { font-weight: 600 !important; font-size: 11px !important; }
.c { text-align: center; width: 24px; }
.r { text-align: right; white-space: nowrap; }
.item-name { font-weight: 600 !important; }
.item-details { margin-top: 4px; }
.detail-line { font-size: 10px !important; font-weight: 400 !important; margin: 1px 0; line-height: 1.3; }
.detail-lbl { font-weight: 600 !important; }
.totals td { padding: 5px 4px; }
.grand td { font-size: 15px !important; font-weight: 700 !important; padding: 7px 4px !important; }
.qr-block { text-align: center; margin: 12px 0 8px; padding: 8px 0; border-top: 1px dashed #000; }
.qr-block img { display: inline-block; }
.qr-label { font-size: 10px !important; font-weight: 600 !important; margin-top: 4px; letter-spacing: 0.3px; }
.footer { text-align: center; margin-top: 8px; font-size: 12px !important; }
.thanks { font-size: 13px !important; font-weight: 600 !important; margin: 6px 0; }
@media print {
  html, body, * {
    color: #000 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
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
    ? `<table class="totals"><tr><td><span class="detail-lbl">${esc(labels.customer)}</span><br>${customerName && customerName !== labels.walkIn ? esc(customerName) : ""}${customerPhone ? `${customerName && customerName !== labels.walkIn ? "<br>" : ""}${esc(labels.phone)}: ${esc(customerPhone)}` : ""}</td></tr></table>`
    : "";

  const notesBlock = order.notes?.trim()
    ? `<table class="totals"><tr><td><span class="detail-lbl">${esc(labels.notes)}</span><br>${esc(order.notes.trim())}</td></tr></table>`
    : "";

  const discountRow =
    Number(order.discount) > 0
      ? `<tr><td${input.format === "a4" ? "" : ' colspan="2"'}><span class="detail-lbl">${esc(labels.discount)}</span></td><td class="r">-${Number(order.discount).toLocaleString()} ${labels.currency}</td></tr>`
      : "";

  return {
    order, items, inventory, categories, labels, isAr, isFashion,
    storeName, storeAddress, receiptHeader, receiptFooter,
    customerName, customerPhone, paymentLabel, dateStr,
    customerBlock, notesBlock, discountRow, logoUrl,
  };
}

function buildThermalBody(ctx: ReturnType<typeof buildContext>, qrHtml: string) {
  const {
    order, items, inventory, categories, labels, isFashion,
    storeName, storeAddress, receiptHeader, receiptFooter,
    paymentLabel, dateStr, customerBlock, notesBlock, discountRow,
  } = ctx;

  const rows = items.map((item) => {
    const inv = inventory.find((i) => i.id === item.inventoryItemId) as InvExtra | undefined;
    const cat = inv ? categories?.find((c) => c.id === inv.categoryId) : undefined;
    const detailsHtml = itemDetailLines(item, inv, labels, isFashion, cat?.name);
    const lineTotal = Number(item.price) * item.quantity;
    return `<tr>
      <td><span class="item-name">${esc(item.name)}</span>${detailsHtml}</td>
      <td class="c">${item.quantity}</td>
      <td class="r">${Number(item.price).toLocaleString()}<br><span class="detail-line">${lineTotal.toLocaleString()} ${labels.currency}</span></td>
    </tr>`;
  }).join("");

  return `
<div class="center">
  <div class="store">${esc(storeName)}</div>
  ${storeAddress ? `<div class="meta">${esc(storeAddress)}</div>` : ""}
  ${receiptHeader ? `<div class="meta">${esc(receiptHeader)}</div>` : ""}
</div>
<hr class="sep">
<table class="totals">
  <tr><td><span class="detail-lbl">${esc(labels.orderNumber)}</span></td><td class="r">${esc(order.orderNumber)}</td></tr>
  <tr><td><span class="detail-lbl">${esc(labels.date)}</span></td><td class="r">${esc(dateStr)}</td></tr>
</table>
${customerBlock}
${notesBlock}
<table>
  <thead><tr>
    <th>${esc(labels.item)}</th>
    <th class="c">${esc(labels.qty)}</th>
    <th class="r">${esc(labels.price)}</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="totals">
  <tr><td colspan="2"><span class="detail-lbl">${esc(labels.total)}</span></td><td class="r">${Number(order.subtotal).toLocaleString()} ${labels.currency}</td></tr>
  ${discountRow}
  <tr class="grand"><td colspan="2"><span class="detail-lbl">${esc(labels.grandTotal)}</span></td><td class="r">${Number(order.total).toLocaleString()} ${labels.currency}</td></tr>
  <tr><td colspan="2"><span class="detail-lbl">${esc(labels.payment)}</span></td><td class="r">${esc(paymentLabel)}</td></tr>
</table>
${qrHtml}
<div class="footer">
  ${receiptFooter ? `<div>${esc(receiptFooter)}</div>` : ""}
  <div class="thanks">${esc(labels.thankYou)}</div>
  <div>www.iq-pos.com</div>
</div>`;
}

function buildA4Body(ctx: ReturnType<typeof buildContext>) {
  const {
    order, items, inventory, categories, labels, isFashion,
    storeName, storeAddress, receiptHeader, receiptFooter,
    customerName, customerPhone, paymentLabel, dateStr, discountRow, logoUrl,
  } = ctx;

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

export async function buildReceiptHtml(input: ReceiptPrintInput): Promise<string> {
  const format = input.format ?? "thermal";
  const ctx = buildContext(input);
  const qrHtml = format === "thermal" ? await orderQrBlock(input.order.orderNumber) : "";
  const body = format === "a4" ? buildA4Body(ctx) : buildThermalBody(ctx, qrHtml);
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

export async function printReceipt(input: ReceiptPrintInput, format: ReceiptFormat = "thermal") {
  const html = await buildReceiptHtml({ ...input, format });
  openReceiptPrint(html, format);
}
