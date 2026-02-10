import { useRef, useCallback } from "react";
import { useLanguage } from "@/hooks/use-language";
import type { Order, OrderItem } from "@shared/schema";

type BrandingData = {
  brandColor: string | null;
  logoUrl: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  name: string;
};

interface PrintableReceiptProps {
  order: Order;
  items: OrderItem[];
  branding?: BrandingData | null;
}

export function usePrintReceipt() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=320,height=600");
    if (!printWindow) return;

    const dir = document.documentElement.dir || "ltr";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <title>Receipt</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 8px;
            font-size: 12px;
            color: #000;
            background: #fff;
            direction: ${dir};
          }
          .receipt-header {
            text-align: center;
            padding-bottom: 8px;
            border-bottom: 1px dashed #000;
            margin-bottom: 8px;
          }
          .receipt-header .logo {
            max-height: 48px;
            max-width: 120px;
            margin: 0 auto 6px;
            display: block;
            object-fit: contain;
          }
          .receipt-header .restaurant-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .receipt-header .header-text {
            font-size: 11px;
            white-space: pre-line;
          }
          .order-info {
            padding: 6px 0;
            border-bottom: 1px dashed #000;
            margin-bottom: 8px;
            font-size: 11px;
          }
          .order-info .row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 2px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          .items-table th {
            text-align: start;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 0;
            border-bottom: 1px solid #000;
          }
          .items-table th:last-child {
            text-align: end;
          }
          .items-table td {
            font-size: 11px;
            padding: 3px 0;
            vertical-align: top;
          }
          .items-table td:last-child {
            text-align: end;
            white-space: nowrap;
          }
          .items-table td:first-child {
            width: 28px;
            text-align: center;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 6px;
            margin-bottom: 8px;
          }
          .totals .row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 2px;
            font-size: 11px;
          }
          .totals .row.grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 4px;
            margin-top: 4px;
          }
          .receipt-footer {
            text-align: center;
            border-top: 1px dashed #000;
            padding-top: 8px;
            font-size: 10px;
          }
          .receipt-footer .footer-text {
            white-space: pre-line;
            margin-bottom: 4px;
          }
          .receipt-footer .powered-by {
            font-size: 9px;
            color: #888;
            margin-top: 6px;
          }
          @media print {
            body {
              width: 80mm;
              max-width: 80mm;
            }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }, []);

  return { printRef, handlePrint };
}

export function PrintableReceipt({ order, items, branding }: PrintableReceiptProps) {
  const { t } = useLanguage();
  const restaurantName = branding?.name || "";
  const brandColor = branding?.brandColor || "#000000";

  return (
    <div>
      <div className="receipt-header">
        {branding?.logoUrl && (
          <img src={branding.logoUrl} alt="" className="logo" />
        )}
        <div className="restaurant-name" style={{ color: brandColor }}>
          {restaurantName}
        </div>
        {branding?.receiptHeader && (
          <div className="header-text">{branding.receiptHeader}</div>
        )}
      </div>

      <div className="order-info">
        <div className="row">
          <span>{t("pos.receipt")} #:</span>
          <span><strong>{order.orderNumber}</strong></span>
        </div>
        <div className="row">
          <span>{t("pos.orderDate")}:</span>
          <span>{new Date(order.createdAt).toLocaleString()}</span>
        </div>
        {order.tableNumber && (
          <div className="row">
            <span>{t("pos.table")}:</span>
            <span>{order.tableNumber}</span>
          </div>
        )}
        {order.customerName && (
          <div className="row">
            <span>{t("pos.customer")}:</span>
            <span>{order.customerName}</span>
          </div>
        )}
        <div className="row">
          <span>{t("pos.payment")}:</span>
          <span>{order.paymentMethod === "cash" ? t("pos.cash") : t("pos.card")}</span>
        </div>
      </div>

      <table className="items-table">
        <thead>
          <tr>
            <th>{t("pos.qty")}</th>
            <th>{t("pos.item")}</th>
            <th>{t("pos.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.quantity}</td>
              <td>{item.name}</td>
              <td>{(parseInt(item.price) * item.quantity).toLocaleString()} IQD</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <div className="row">
          <span>{t("pos.subtotal")}:</span>
          <span>{parseInt(order.subtotal).toLocaleString()} IQD</span>
        </div>
        <div className="row">
          <span>{t("pos.tax")}:</span>
          <span>{parseInt(order.tax).toLocaleString()} IQD</span>
        </div>
        <div className="row grand-total">
          <span>{t("pos.total")}:</span>
          <span>{parseInt(order.total).toLocaleString()} IQD</span>
        </div>
      </div>

      <div className="receipt-footer">
        {branding?.receiptFooter ? (
          <div className="footer-text">{branding.receiptFooter}</div>
        ) : (
          <div className="footer-text">{t("pos.thankYou")}</div>
        )}
        <div className="powered-by">{t("pos.poweredBy")}</div>
      </div>
    </div>
  );
}
