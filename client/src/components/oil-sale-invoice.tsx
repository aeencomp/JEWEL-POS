import type { OilSale, OilSaleItem } from "@shared/schema";

interface StoreInfo {
  name: string;
  ownerName?: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
}

interface PosItem {
  productId: number;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

interface SaleInvoiceProps {
  sale: OilSale;
  items: (OilSaleItem | PosItem)[];
  store: StoreInfo | null;
  paymentMethod?: string;
  isAr?: boolean;
}

interface PosInvoiceProps {
  invoiceNumber: string;
  date: Date;
  customerName: string | null;
  items: PosItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: "cash" | "transfer";
  store: StoreInfo | null;
  isAr?: boolean;
}

function fmt(n: string | number) {
  return parseFloat(String(n || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function buildHtml({
  invoiceNumber,
  date,
  customerName,
  items,
  subtotal,
  discount,
  total,
  amountPaid,
  paymentStatus,
  paymentMethod,
  notes,
  store,
  isAr = false,
}: {
  invoiceNumber: string;
  date: Date;
  customerName: string | null;
  items: Array<{ productName: string; quantity: string | number; unitPrice: string | number; total: string | number; unit?: string }>;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  paymentStatus: string;
  paymentMethod?: string;
  notes?: string | null;
  store: StoreInfo | null;
  isAr: boolean;
}) {
  const remaining = total - amountPaid;

  const payStatusLabel =
    paymentStatus === "paid"
      ? isAr ? "مدفوع" : "Paid"
      : paymentStatus === "partial"
      ? isAr ? "جزئي" : "Partial"
      : isAr ? "غير مدفوع" : "Unpaid";

  const payStatusColor =
    paymentStatus === "paid"
      ? "#16a34a"
      : paymentStatus === "partial"
      ? "#d97706"
      : "#dc2626";

  const payMethodLabel =
    paymentMethod === "cash"
      ? isAr ? "نقداً" : "Cash"
      : paymentMethod === "transfer"
      ? isAr ? "تحويل" : "Transfer"
      : "";

  const dir = isAr ? "rtl" : "ltr";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head>
  <meta charset="UTF-8" />
  <title>${isAr ? "فاتورة مبيعات" : "Sales Invoice"} #${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${isAr ? "'Segoe UI', Tahoma, 'Arial', sans-serif" : "'Segoe UI', Arial, sans-serif"};
      font-size: 13px;
      color: #1e293b;
      background: white;
    }
    @page { size: A4; margin: 12mm 18mm; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    .page { max-width: 800px; margin: 0 auto; padding: 24px 20px; }

    /* ─── Top accent bar ─── */
    .accent-bar {
      height: 6px;
      background: linear-gradient(90deg, #16a34a 0%, #0891b2 50%, #7c3aed 100%);
      border-radius: 3px;
      margin-bottom: 24px;
    }

    /* ─── Header ─── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      gap: 20px;
    }
    .store-logo-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .store-logo {
      width: 56px;
      height: 56px;
      object-fit: contain;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .store-name {
      font-size: 22px;
      font-weight: 800;
      color: #16a34a;
      letter-spacing: -0.3px;
      margin-bottom: 3px;
    }
    .store-sub {
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    .invoice-meta { text-align: ${isAr ? "left" : "right"}; }
    .invoice-title {
      font-size: 20px;
      font-weight: 800;
      color: #16a34a;
      margin-bottom: 6px;
      letter-spacing: -0.3px;
    }
    .invoice-num {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      display: inline-block;
      padding: 3px 10px;
      margin-bottom: 4px;
    }
    .invoice-date {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: white;
      background: ${payStatusColor};
      margin-top: 6px;
    }

    /* ─── Divider ─── */
    .divider { height: 1px; background: #e2e8f0; margin: 0 0 24px; }

    /* ─── Info grid ─── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .info-box-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row {
      font-size: 12px;
      color: #334155;
      margin-bottom: 4px;
      display: flex;
      gap: 6px;
    }
    .info-row .label { color: #94a3b8; font-size: 11px; white-space: nowrap; }
    .info-row .value { font-weight: 600; }
    .big-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }

    /* ─── Items table ─── */
    .table-section { margin-bottom: 24px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    table { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; }
    thead tr { background: linear-gradient(90deg, #16a34a, #15803d); }
    thead th {
      padding: 11px 14px;
      font-size: 11px;
      font-weight: 700;
      color: white;
      text-align: ${isAr ? "right" : "left"};
      letter-spacing: 0.04em;
    }
    thead th.num-col { text-align: center; width: 36px; }
    thead th.amount-col { text-align: ${isAr ? "left" : "right"}; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #f0fdf4; }
    tbody td {
      padding: 10px 14px;
      font-size: 12px;
      color: #334155;
      text-align: ${isAr ? "right" : "left"};
    }
    tbody td.num-col { text-align: center; color: #94a3b8; font-size: 11px; }
    tbody td.amount-col { text-align: ${isAr ? "left" : "right"}; font-weight: 700; color: #16a34a; }
    tbody td .product-unit { font-size: 10px; color: #94a3b8; font-weight: 400; }

    /* ─── Totals ─── */
    .totals-wrap {
      display: flex;
      justify-content: ${isAr ? "flex-start" : "flex-end"};
      margin-bottom: 20px;
    }
    .totals-box {
      min-width: 260px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-row .t-label { color: #64748b; }
    .totals-row .t-value { font-weight: 600; color: #334155; }
    .totals-row.discount-row .t-value { color: #dc2626; }
    .totals-row.paid-row .t-value { color: #16a34a; }
    .totals-row.remaining-row .t-value { color: #dc2626; font-weight: 700; }
    .totals-row.grand-total {
      background: linear-gradient(90deg, #16a34a, #15803d);
      padding: 13px 16px;
    }
    .totals-row.grand-total .t-label { color: rgba(255,255,255,0.85); font-weight: 700; font-size: 13px; }
    .totals-row.grand-total .t-value { color: white; font-weight: 800; font-size: 16px; }

    /* ─── Payment info strip ─── */
    .payment-strip {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .payment-chip {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 11px;
      color: #15803d;
      font-weight: 600;
    }
    .payment-chip .chip-label { color: #94a3b8; font-weight: 400; display: block; font-size: 10px; margin-bottom: 2px; }

    /* ─── Notes ─── */
    .notes {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 12px;
      color: #78350f;
      margin-bottom: 20px;
    }
    .notes-title { font-weight: 700; font-size: 10px; color: #b45309; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }

    /* ─── Footer ─── */
    .footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-left { font-size: 10px; color: #94a3b8; line-height: 1.6; }
    .footer-right {
      font-size: 11px;
      color: #16a34a;
      font-weight: 700;
      text-align: ${isAr ? "left" : "right"};
    }

    /* ─── Print button ─── */
    .print-btn {
      position: fixed;
      top: 16px;
      ${isAr ? "left" : "right"}: 16px;
      background: #16a34a;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 22px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      z-index: 999;
      box-shadow: 0 4px 12px rgba(22,163,74,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover { background: #15803d; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    ${isAr ? "طباعة" : "Print"}
  </button>

  <div class="page">
    <div class="accent-bar"></div>

    <!-- Bilingual Header -->
    <div class="header" style="display:flex;align-items:center;gap:12px;">
      <div style="flex:1;">
        <div class="store-name">${store?.name || "FactoryPOS"}</div>
        ${store?.receiptHeader ? `<div class="store-sub" style="white-space:pre-line;margin-top:3px;">${store.receiptHeader}</div>` : ""}
        ${store?.address ? `<div class="store-sub">${store.address}</div>` : ""}
        ${store?.phone ? `<div class="store-sub">📞 ${store.phone}</div>` : ""}
      </div>
      <div style="text-align:center;flex-shrink:0;padding:0 10px;">
        ${store?.logoUrl ? `<img class="store-logo" src="${store.logoUrl}" alt="logo" style="height:60px;width:60px;object-fit:contain;" />` : ""}
      </div>
      <div style="flex:1;text-align:right;direction:rtl;">
        <div class="store-name">${store?.name || ""}</div>
        ${store?.receiptFooter ? `<div class="store-sub" style="white-space:pre-line;margin-top:3px;">${store.receiptFooter}</div>` : ""}
      </div>
    </div>
    <div class="invoice-meta" style="display:flex;justify-content:space-between;align-items:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 14px;margin-top:8px;">
      <div>
        <div class="invoice-title">${isAr ? "فاتورة مبيعات" : "Sales Invoice"}</div>
        <div class="invoice-num">${invoiceNumber}</div>
      </div>
      <div style="text-align:center;">
        <div class="invoice-date">${date.toLocaleDateString(isAr ? "ar-IQ" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
        <div><span class="status-badge">${payStatusLabel}</span></div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">${isAr ? "معلومات العميل" : "Customer"}</div>
        <div class="big-name">${customerName || (isAr ? "عميل نقدي" : "Cash Customer")}</div>
      </div>
      <div class="info-box">
        <div class="info-box-title">${isAr ? "تفاصيل الفاتورة" : "Invoice Details"}</div>
        <div class="info-row">
          <span class="label">${isAr ? "رقم الفاتورة:" : "Invoice #:"}</span>
          <span class="value">${invoiceNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">${isAr ? "التاريخ:" : "Date:"}</span>
          <span class="value">${date.toLocaleDateString()}</span>
        </div>
        <div class="info-row">
          <span class="label">${isAr ? "الوقت:" : "Time:"}</span>
          <span class="value">${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        ${paymentMethod ? `<div class="info-row">
          <span class="label">${isAr ? "طريقة الدفع:" : "Payment:"}</span>
          <span class="value">${payMethodLabel}</span>
        </div>` : ""}
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-section">
      <div class="section-title">${isAr ? "تفاصيل المنتجات" : "Order Items"}</div>
      <table>
        <thead>
          <tr>
            <th class="num-col">#</th>
            <th>${isAr ? "المنتج" : "Product"}</th>
            <th>${isAr ? "الكمية" : "Qty"}</th>
            <th>${isAr ? "سعر الوحدة" : "Unit Price"}</th>
            <th class="amount-col">${isAr ? "الإجمالي" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => `
          <tr>
            <td class="num-col">${idx + 1}</td>
            <td>
              ${item.productName}
              ${"unit" in item && item.unit ? `<span class="product-unit"> / ${item.unit}</span>` : ""}
            </td>
            <td>${fmt(item.quantity)}</td>
            <td>${fmt(item.unitPrice)} IQD</td>
            <td class="amount-col">${fmt(item.total)} IQD</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals-wrap">
      <div class="totals-box">
        ${discount > 0 ? `
        <div class="totals-row">
          <span class="t-label">${isAr ? "المجموع الفرعي:" : "Subtotal:"}</span>
          <span class="t-value">${fmt(subtotal)} IQD</span>
        </div>
        <div class="totals-row discount-row">
          <span class="t-label">${isAr ? "الخصم:" : "Discount:"}</span>
          <span class="t-value">- ${fmt(discount)} IQD</span>
        </div>` : ""}
        ${amountPaid < total ? `
        <div class="totals-row paid-row">
          <span class="t-label">${isAr ? "المدفوع:" : "Paid:"}</span>
          <span class="t-value">${fmt(amountPaid)} IQD</span>
        </div>
        <div class="totals-row remaining-row">
          <span class="t-label">${isAr ? "المتبقي:" : "Remaining:"}</span>
          <span class="t-value">${fmt(remaining)} IQD</span>
        </div>` : ""}
        <div class="totals-row grand-total">
          <span class="t-label">${isAr ? "الإجمالي الكلي:" : "Grand Total:"}</span>
          <span class="t-value">${fmt(total)} IQD</span>
        </div>
      </div>
    </div>

    ${notes ? `
    <div class="notes">
      <div class="notes-title">${isAr ? "ملاحظات" : "Notes"}</div>
      ${notes}
    </div>` : ""}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        <div>${store?.name || "FactoryPOS"} · ${isAr ? "نظام إدارة المبيعات" : "Sales Management System"}</div>
        <div>${isAr ? "تاريخ الطباعة:" : "Printed:"} ${new Date().toLocaleString(isAr ? "ar-IQ" : "en-US")}</div>
      </div>
      <div class="footer-right">
        ${isAr ? "شكراً لتعاملكم معنا 🌟" : "Thank you for your business 🌟"}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printOilSaleInvoice({ sale, items, store, paymentMethod, isAr = false }: SaleInvoiceProps) {
  const total = parseFloat(sale.totalAmount);
  const paid = parseFloat(sale.amountPaid);
  const discount = parseFloat(sale.discountAmount || "0");
  const subtotal = total + discount;

  const normalizedItems = items.map(item => ({
    productName: item.productName,
    quantity: "quantity" in item ? item.quantity : (item as PosItem).quantity,
    unitPrice: "unitPrice" in item ? item.unitPrice : (item as OilSaleItem).unitPrice,
    total: item.total,
    unit: "unit" in item ? (item as PosItem).unit : undefined,
  }));

  const html = buildHtml({
    invoiceNumber: sale.invoiceNumber,
    date: new Date(sale.createdAt),
    customerName: sale.customerName,
    items: normalizedItems,
    subtotal,
    discount,
    total,
    amountPaid: paid,
    paymentStatus: sale.paymentStatus,
    paymentMethod,
    notes: sale.notes,
    store,
    isAr,
  });

  const win = window.open("", "_blank", "width=920,height=720");
  if (win) { win.document.write(html); win.document.close(); }
}

export function printOilPosInvoice({
  invoiceNumber,
  date,
  customerName,
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
  store,
  isAr = false,
}: PosInvoiceProps) {
  const html = buildHtml({
    invoiceNumber,
    date,
    customerName,
    items: items.map(i => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
      unit: i.unit,
    })),
    subtotal,
    discount,
    total,
    amountPaid: total,
    paymentStatus: "paid",
    paymentMethod,
    notes: null,
    store,
    isAr,
  });

  const win = window.open("", "_blank", "width=920,height=720");
  if (win) { win.document.write(html); win.document.close(); }
}
