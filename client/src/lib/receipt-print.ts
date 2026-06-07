import JsBarcode from "jsbarcode";
import type { InventoryItem, Order, OrderItem } from "@shared/schema";

export type ReceiptLabels = {
  orderNumber: string;
  date: string;
  customer: string;
  phone: string;
  item: string;
  qty: string;
  price: string;
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
  metalType: string;
  purity: string;
  weight: string;
};

export type ReceiptPrintInput = {
  order: Order & { items?: OrderItem[] };
  items: OrderItem[];
  inventory: InventoryItem[];
  labels: ReceiptLabels;
  isAr: boolean;
  isFashion: boolean;
  storeName: string;
  storeAddress?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentLabel: string;
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function itemDetails(
  item: OrderItem,
  inv: (InventoryItem & { size?: string; color?: string; brand?: string }) | undefined,
  labels: ReceiptLabels,
  isFashion: boolean,
): string {
  const parts: string[] = [];
  if (item.sku) parts.push(`${labels.sku}: ${item.sku}`);
  if (isFashion) {
    if (inv?.size) parts.push(`${labels.size}: ${inv.size}`);
    if (inv?.color) parts.push(`${labels.color}: ${inv.color}`);
    if (inv?.brand) parts.push(`${labels.brand}: ${inv.brand}`);
    if (inv?.barcode) parts.push(`${labels.barcode}: ${inv.barcode}`);
  } else {
    if (inv?.metalType && inv.metalType !== "other") parts.push(`${labels.metalType}: ${inv.metalType}`);
    if (inv?.purity) parts.push(`${labels.purity}: ${inv.purity}`);
    if (inv?.weightGrams) parts.push(`${labels.weight}: ${inv.weightGrams}g`);
  }
  return parts.join(" | ");
}

function orderBarcodeSvg(orderNumber: string): string {
  if (typeof document === "undefined" || !orderNumber) return "";
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, orderNumber, {
      format: "CODE128",
      width: 2.2,
      height: 52,
      displayValue: true,
      fontOptions: "bold",
      font: "Arial",
      fontSize: 14,
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

const RECEIPT_CSS = `
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
  -moz-osx-font-smoothing: grayscale !important;
  text-rendering: optimizeSpeed !important;
  filter: contrast(1.25);
}
*, *::before, *::after {
  color: #000 !important;
  background: transparent !important;
  font-family: Arial, Helvetica, Tahoma, sans-serif !important;
  font-weight: 900 !important;
  box-sizing: border-box;
  opacity: 1 !important;
  -webkit-text-stroke: 0.35px #000;
}
b, strong, th, td, .store, .thanks, .grand td {
  font-weight: 900 !important;
}
.center { text-align: center; }
.store {
  font-size: 20px !important;
  font-weight: 900 !important;
  letter-spacing: 0.5px;
  padding: 8px 4px;
  border: 4px solid #000;
  margin-bottom: 8px;
  background: #fff !important;
}
.meta { font-size: 14px !important; margin: 3px 0; }
.sep { border: none; border-top: 4px solid #000; margin: 10px 0; }
table { width: 100%; border-collapse: collapse; background: #fff !important; }
th, td {
  border: 3px solid #000;
  padding: 6px 4px;
  font-size: 14px !important;
  vertical-align: top;
  background: #fff !important;
}
th { font-size: 13px !important; }
.c { text-align: center; width: 26px; }
.r { text-align: right; white-space: nowrap; }
.details { font-size: 12px !important; margin-top: 4px; display: block; }
.totals td { border: 3px solid #000; padding: 6px 4px; }
.grand td {
  font-size: 19px !important;
  font-weight: 900 !important;
  padding: 10px 4px !important;
  border: 4px solid #000 !important;
}
.barcode { text-align: center; margin: 10px 0 6px; }
.barcode svg { max-width: 100%; height: auto; }
.barcode text, .barcode rect { fill: #000 !important; stroke: #000 !important; }
.footer { text-align: center; margin-top: 12px; font-size: 14px !important; }
.thanks { font-size: 17px !important; font-weight: 900 !important; margin: 10px 0; }
@media print {
  html, body, * {
    color: #000 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;

export function buildReceiptHtml(input: ReceiptPrintInput): string {
  const {
    order, items, inventory, labels, isAr, isFashion,
    storeName, storeAddress, receiptHeader, receiptFooter,
    customerName, customerPhone, paymentLabel,
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

  const rows = items.map((item) => {
    const inv = inventory.find((i) => i.id === item.inventoryItemId) as
      (InventoryItem & { size?: string; color?: string; brand?: string; barcode?: string }) | undefined;
    const details = itemDetails(item, inv, labels, isFashion);
    const lineTotal = Number(item.price) * item.quantity;
    return `<tr>
      <td><b>${esc(item.name)}</b>${details ? `<span class="details">${esc(details)}</span>` : ""}</td>
      <td class="c"><b>${item.quantity}</b></td>
      <td class="r"><b>${Number(item.price).toLocaleString()}</b><br><span class="details">${lineTotal.toLocaleString()} ${labels.currency}</span></td>
    </tr>`;
  }).join("");

  const discountRow =
    Number(order.discount) > 0
      ? `<tr><td colspan="2"><b>${esc(labels.discount)}</b></td><td class="r"><b>-${Number(order.discount).toLocaleString()} ${labels.currency}</b></td></tr>`
      : "";

  return `<!DOCTYPE html>
<html dir="${isAr ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<title>${esc(order.orderNumber)}</title>
<style>${RECEIPT_CSS}</style>
</head>
<body>
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
${orderBarcodeSvg(order.orderNumber)}
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
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
}

export function openReceiptPrint(html: string) {
  const w = window.open("", "_blank", "width=320,height=720");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}
