import type { OilPurchase, OilPurchaseItem } from "@shared/schema";

interface StoreInfo {
  name: string;
  ownerName: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  logoUrl?: string | null;
}

interface Props {
  purchase: OilPurchase;
  items: OilPurchaseItem[];
  store: StoreInfo | null;
  isAr?: boolean;
}

function fmt(n: string | number) {
  return parseFloat(String(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function printOilPurchaseInvoice({ purchase, items, store, isAr = false }: Props) {
  const total = parseFloat(purchase.totalAmount);
  const paid = parseFloat(purchase.amountPaid);
  const remaining = total - paid;

  const payStatusLabel =
    purchase.paymentStatus === "paid"
      ? isAr ? "مدفوع" : "Paid"
      : purchase.paymentStatus === "partial"
      ? isAr ? "جزئي" : "Partial"
      : isAr ? "غير مدفوع" : "Unpaid";

  const payStatusColor =
    purchase.paymentStatus === "paid"
      ? "#16a34a"
      : purchase.paymentStatus === "partial"
      ? "#d97706"
      : "#dc2626";

  const dir = isAr ? "rtl" : "ltr";

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head>
  <meta charset="UTF-8" />
  <title>${isAr ? "فاتورة شراء" : "Purchase Invoice"} #${purchase.invoiceNumber || `PO-${purchase.id}`}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${isAr ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};
      font-size: 13px;
      color: #1a1a2e;
      background: white;
    }
    @page { size: A4; margin: 15mm 20mm; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    .page { max-width: 780px; margin: 0 auto; padding: 20px; }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid #0891b2;
      margin-bottom: 24px;
      gap: 16px;
    }
    .store-name { font-size: 22px; font-weight: 800; color: #0891b2; margin-bottom: 4px; }
    .store-sub { font-size: 11px; color: #64748b; }
    .invoice-meta { text-align: ${isAr ? "left" : "right"}; }
    .invoice-title { font-size: 18px; font-weight: 700; color: #0891b2; margin-bottom: 6px; }
    .invoice-num { font-size: 13px; font-weight: 600; color: #334155; }
    .invoice-date { font-size: 11px; color: #64748b; margin-top: 2px; }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: white;
      background: ${payStatusColor};
      margin-top: 6px;
    }

    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .info-box-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .info-row { font-size: 12px; color: #334155; margin-bottom: 3px; }
    .info-row span { color: #94a3b8; font-size: 11px; }

    /* Items table */
    .table-wrap { margin-bottom: 24px; }
    .table-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #0891b2; }
    thead th {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      color: white;
      text-align: ${isAr ? "right" : "left"};
    }
    thead th:last-child { text-align: ${isAr ? "left" : "right"}; }
    tbody tr { border-bottom: 1px solid #e2e8f0; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td {
      padding: 9px 12px;
      font-size: 12px;
      color: #334155;
      text-align: ${isAr ? "right" : "left"};
    }
    tbody td:last-child { text-align: ${isAr ? "left" : "right"}; font-weight: 600; }
    tfoot td { padding: 8px 12px; font-size: 12px; }

    /* Totals */
    .totals {
      display: flex;
      justify-content: ${isAr ? "flex-start" : "flex-end"};
      margin-top: 8px;
    }
    .totals-box { min-width: 240px; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.total-row {
      font-weight: 800;
      font-size: 15px;
      color: #0891b2;
      padding-top: 10px;
      border-top: 2px solid #0891b2;
      border-bottom: none;
      margin-top: 4px;
    }
    .totals-row.remaining-row { color: #dc2626; font-weight: 700; }

    /* Notes */
    .notes {
      margin-top: 20px;
      padding: 12px 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      font-size: 12px;
      color: #78350f;
    }
    .notes-title { font-weight: 700; margin-bottom: 4px; font-size: 11px; color: #b45309; }

    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }

    /* ─── Watermark ─── */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      opacity: 0.07;
      pointer-events: none;
      z-index: 0;
      text-align: center;
      user-select: none;
    }
    .watermark img {
      width: 180px;
      height: 180px;
      object-fit: contain;
      display: block;
      margin: 0 auto 10px;
    }
    .watermark-name {
      font-size: 54px;
      font-weight: 900;
      color: #0891b2;
      white-space: nowrap;
      letter-spacing: -1px;
    }
    .page { position: relative; z-index: 1; }

    /* Print button */
    .print-btn {
      position: fixed;
      top: 16px;
      ${isAr ? "left" : "right"}: 16px;
      background: #0891b2;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      z-index: 999;
    }
    .print-btn:hover { background: #0e7490; }
  </style>
</head>
<body>
  <!-- Watermark -->
  <div class="watermark" aria-hidden="true">
    ${store?.logoUrl ? `<img src="${store.logoUrl}" alt="" />` : ""}
    <div class="watermark-name">${store?.name || "FactoryPOS"}</div>
  </div>

  <button class="print-btn no-print" onclick="window.print()">${isAr ? "🖨️ طباعة" : "🖨️ Print"}</button>

  <div class="page">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="store-name">${store?.name || "FactoryPOS"}</div>
        ${store?.address ? `<div class="store-sub">${store.address}</div>` : ""}
        ${store?.phone ? `<div class="store-sub">${isAr ? "هاتف" : "Tel"}: ${store.phone}</div>` : ""}
        ${store?.email ? `<div class="store-sub">${store.email}</div>` : ""}
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">${isAr ? "فاتورة شراء" : "Purchase Invoice"}</div>
        <div class="invoice-num">${purchase.invoiceNumber || `PO-${purchase.id}`}</div>
        <div class="invoice-date">${new Date(purchase.createdAt).toLocaleDateString(isAr ? "ar-IQ" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
        <div class="status-badge">${payStatusLabel}</div>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">${isAr ? "معلومات المورد" : "Supplier Information"}</div>
        <div class="info-row"><b>${purchase.supplierName || (isAr ? "مورد غير محدد" : "N/A")}</b></div>
      </div>
      <div class="info-box">
        <div class="info-box-title">${isAr ? "تفاصيل الفاتورة" : "Invoice Details"}</div>
        <div class="info-row"><span>${isAr ? "رقم الفاتورة:" : "Invoice #:"}</span> ${purchase.invoiceNumber || "-"}</div>
        <div class="info-row"><span>${isAr ? "التاريخ:" : "Date:"}</span> ${new Date(purchase.createdAt).toLocaleDateString()}</div>
        <div class="info-row"><span>${isAr ? "حالة الدفع:" : "Payment:"}</span> ${payStatusLabel}</div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-wrap">
      <div class="table-title">${isAr ? "المنتجات" : "Items"}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${isAr ? "المنتج" : "Product"}</th>
            <th>${isAr ? "الكمية" : "Qty"}</th>
            <th>${isAr ? "سعر الوحدة" : "Unit Cost"}</th>
            <th>${isAr ? "الإجمالي" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.productName}</td>
            <td>${fmt(item.quantity)}</td>
            <td>${fmt(item.unitCost)} IQD</td>
            <td>${fmt(item.total)} IQD</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>${isAr ? "المبلغ المدفوع:" : "Amount Paid:"}</span>
          <span>${fmt(paid)} IQD</span>
        </div>
        ${remaining > 0 ? `<div class="totals-row remaining-row">
          <span>${isAr ? "المبلغ المتبقي:" : "Remaining:"}</span>
          <span>${fmt(remaining)} IQD</span>
        </div>` : ""}
        <div class="totals-row total-row">
          <span>${isAr ? "الإجمالي الكلي:" : "Grand Total:"}</span>
          <span>${fmt(total)} IQD</span>
        </div>
      </div>
    </div>

    ${purchase.notes ? `
    <!-- Notes -->
    <div class="notes">
      <div class="notes-title">${isAr ? "ملاحظات:" : "Notes:"}</div>
      ${purchase.notes}
    </div>` : ""}

    <!-- Footer -->
    <div class="footer">
      <p>${store?.name || "FactoryPOS"} · ${isAr ? "نظام إدارة المصنع" : "Factory Management System"}</p>
      <p>${isAr ? "شكراً لتعاملكم معنا" : "Thank you for your business"}</p>
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
