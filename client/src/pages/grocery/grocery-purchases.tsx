import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { GroceryPurchase, GroceryPurchaseItem, GrocerySupplier, InventoryItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Plus, Trash2, ChevronDown, Banknote, Printer } from "lucide-react";
import { printHtmlDocument } from "@/lib/print-window";

function fmt(n: string | number) {
  return parseFloat(String(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type PurchaseLine = {
  inventoryItemId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  total: number;
};

function payStatusColor(s: string) {
  return s === "paid"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : s === "partial"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

function printPurchaseInvoice(
  purchase: GroceryPurchase,
  items: GroceryPurchaseItem[],
  storeName: string,
  isAr: boolean,
) {
  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${fmt(i.unitCost)}</td><td>${fmt(i.total)}</td></tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html dir="${isAr ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${purchase.invoiceNumber}</title>
<style>body{font-family:sans-serif;padding:24px;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:${isAr ? "right" : "left"}}h1{font-size:18px;margin:0}</style></head>
<body><h1>${storeName}</h1><p><strong>${isAr ? "فاتورة شراء" : "Purchase Invoice"}:</strong> ${purchase.invoiceNumber}</p>
<p><strong>${isAr ? "المورد" : "Supplier"}:</strong> ${purchase.supplierName || "—"}</p>
<p><strong>${isAr ? "التاريخ" : "Date"}:</strong> ${new Date(purchase.createdAt).toLocaleDateString()}</p>
<table><thead><tr><th>${isAr ? "المنتج" : "Product"}</th><th>${isAr ? "الكمية" : "Qty"}</th><th>${isAr ? "التكلفة" : "Cost"}</th><th>${isAr ? "الإجمالي" : "Total"}</th></tr></thead><tbody>${rows}</tbody></table>
<p style="margin-top:16px;font-weight:bold">${isAr ? "الإجمالي" : "Total"}: ${fmt(purchase.totalAmount)} IQD</p>
<p>${isAr ? "المدفوع" : "Paid"}: ${fmt(purchase.amountPaid)} IQD · ${isAr ? "الحالة" : "Status"}: ${purchase.paymentStatus}</p></body></html>`;
  printHtmlDocument(html);
}

export default function GroceryPurchases() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [paymentPurchase, setPaymentPurchase] = useState<GroceryPurchase | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [deleteToConfirm, setDeleteToConfirm] = useState<GroceryPurchase | null>(null);

  const { data: purchases = [], isLoading } = useQuery<GroceryPurchase[]>({
    queryKey: ["/api/grocery/purchases"],
  });
  const { data: products = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });
  const { data: suppliers = [] } = useQuery<GrocerySupplier[]>({
    queryKey: ["/api/grocery/suppliers"],
  });
  const { data: branding } = useQuery<{ name: string }>({ queryKey: ["/api/store/branding"] });

  const [formSupplierId, setFormSupplierId] = useState("");
  const [formSupplierName, setFormSupplierName] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formAmountPaid, setFormAmountPaid] = useState(0);
  const [items, setItems] = useState<PurchaseLine[]>([
    { inventoryItemId: 0, productName: "", sku: "", quantity: 1, unitCost: 0, total: 0 },
  ]);

  const createMutation = useMutation({
    mutationFn: (data: unknown) => apiRequest("POST", "/api/grocery/purchases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: isAr ? "تمت إضافة فاتورة الشراء" : "Purchase recorded" });
      setShowDialog(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: isAr ? "فشل الحفظ" : "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) =>
      apiRequest("PATCH", `/api/grocery/purchases/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery/purchases"] });
      toast({ title: isAr ? "تم تسجيل الدفعة" : "Payment recorded" });
      setPaymentPurchase(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/grocery/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
      setDeleteToConfirm(null);
    },
    onError: (err: Error) => {
      toast({ title: isAr ? "فشل الحذف" : "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormSupplierId("");
    setFormSupplierName("");
    setFormInvoiceNumber("");
    setFormNotes("");
    setFormAmountPaid(0);
    setItems([{ inventoryItemId: 0, productName: "", sku: "", quantity: 1, unitCost: 0, total: 0 }]);
  }

  function updateItem(idx: number, field: keyof PurchaseLine, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "inventoryItemId") {
        const prod = products.find((p) => p.id === Number(value));
        if (prod) {
          next[idx].productName = prod.name;
          next[idx].sku = prod.sku || "";
          next[idx].unitCost = parseFloat(prod.costPrice || "0");
        }
      }
      next[idx].total = next[idx].quantity * next[idx].unitCost;
      return next;
    });
  }

  const total = items.reduce((s, i) => s + i.total, 0);

  function handleSubmit() {
    if (!items.some((i) => i.inventoryItemId > 0 && i.quantity > 0)) {
      toast({ title: isAr ? "أضف منتجاً على الأقل" : "Add at least one item", variant: "destructive" });
      return;
    }
    const supplierIdNum = Number(formSupplierId);
    const supplier = suppliers.find((s) => s.id === supplierIdNum);
    createMutation.mutate({
      supplierId: supplierIdNum > 0 ? supplierIdNum : null,
      supplierName: supplier?.name || formSupplierName || null,
      invoiceNumber: formInvoiceNumber || null,
      totalAmount: total.toFixed(2),
      amountPaid: formAmountPaid.toFixed(2),
      paymentStatus: formAmountPaid >= total ? "paid" : formAmountPaid > 0 ? "partial" : "unpaid",
      notes: formNotes || null,
      items: items
        .filter((i) => i.inventoryItemId > 0 && i.quantity > 0)
        .map((i) => ({
          inventoryItemId: i.inventoryItemId,
          productName: i.productName,
          sku: i.sku,
          quantity: i.quantity,
          unitCost: i.unitCost.toFixed(2),
          total: i.total.toFixed(2),
        })),
    });
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Truck className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isAr ? "فواتير الشراء" : "Purchase Invoices"}
            </h1>
            <p className="text-xs text-slate-400">
              {purchases.length} {isAr ? "فاتورة" : "invoices"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
        >
          <Plus className="h-4 w-4 me-1" />
          {isAr ? "فاتورة جديدة" : "New Invoice"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)
        ) : purchases.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{isAr ? "لا توجد فواتير شراء" : "No purchase invoices yet"}</p>
          </div>
        ) : (
          purchases.map((purchase) => {
            const expanded = expandedId === purchase.id;
            const remaining = parseFloat(purchase.totalAmount) - parseFloat(purchase.amountPaid);
            return (
              <Card key={purchase.id}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedId(expanded ? null : purchase.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{purchase.invoiceNumber}</p>
                        <Badge className={`text-[10px] px-1.5 ${payStatusColor(purchase.paymentStatus)}`}>
                          {purchase.paymentStatus === "paid"
                            ? isAr
                              ? "مدفوعة"
                              : "paid"
                            : purchase.paymentStatus === "partial"
                              ? isAr
                                ? "جزئي"
                                : "partial"
                              : isAr
                                ? "غير مدفوعة"
                                : "unpaid"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {purchase.supplierName || "—"} · {new Date(purchase.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-bold text-green-600">{fmt(purchase.totalAmount)} IQD</p>
                      {remaining > 0 && <p className="text-xs text-red-500">-{fmt(remaining)} IQD</p>}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                  {expanded && (
                    <div className="border-t bg-muted/20 px-4 py-3">
                      <PurchaseItemsView purchaseId={purchase.id} />
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {purchase.paymentStatus !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300"
                            onClick={() => {
                              setPaymentPurchase(purchase);
                              setPaymentAmount(0);
                            }}
                          >
                            <Banknote className="h-3.5 w-3.5 me-1" />
                            {isAr ? "تسجيل دفعة" : "Record Payment"}
                          </Button>
                        )}
                        <PrintButton purchase={purchase} storeName={branding?.name || "GroceryPOS"} isAr={isAr} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setDeleteToConfirm(purchase)}
                        >
                          <Trash2 className="h-3.5 w-3.5 me-1" />
                          {isAr ? "حذف" : "Delete"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? "فاتورة شراء جديدة" : "New Purchase Invoice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "المورد" : "Supplier"}</label>
                <Select
                  value={formSupplierId}
                  onValueChange={(v) => {
                    setFormSupplierId(v);
                    const s = suppliers.find((x) => x.id === Number(v));
                    setFormSupplierName(s?.name || "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر مورد" : "Select supplier"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{isAr ? "مورد آخر" : "Other supplier"}</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "رقم الفاتورة" : "Invoice #"}</label>
                <Input
                  value={formInvoiceNumber}
                  onChange={(e) => setFormInvoiceNumber(e.target.value)}
                  placeholder={isAr ? "يُولَّد تلقائياً إن تُرك فارغاً" : "Auto-generated if empty"}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{isAr ? "المنتجات" : "Items"}</label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setItems((p) => [
                      ...p,
                      { inventoryItemId: 0, productName: "", sku: "", quantity: 1, unitCost: 0, total: 0 },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 me-1" />
                  {isAr ? "إضافة" : "Add"}
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Select
                        value={String(item.inventoryItemId)}
                        onValueChange={(v) => updateItem(idx, "inventoryItemId", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={isAr ? "اختر منتج" : "Product"} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        className="h-9"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        className="h-9"
                        value={item.unitCost}
                        onChange={(e) => updateItem(idx, "unitCost", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1 text-sm font-medium text-end">{fmt(item.total)}</div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t">
                <span className="font-bold">{isAr ? "الإجمالي" : "Total"}</span>
                <span className="font-bold text-green-600 text-lg">{fmt(total)} IQD</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "المبلغ المدفوع (IQD)" : "Amount Paid (IQD)"}</label>
                <Input
                  type="number"
                  value={formAmountPaid}
                  onChange={(e) => setFormAmountPaid(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? (isAr ? "جاري الحفظ..." : "Saving...") : isAr ? "حفظ" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteToConfirm} onOpenChange={(o) => !o && setDeleteToConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">{isAr ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle>
          </DialogHeader>
          {deleteToConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isAr ? "هل أنت متأكد من حذف الفاتورة" : "Delete invoice"}{" "}
                <span className="font-semibold text-foreground">"{deleteToConfirm.invoiceNumber}"</span>?{" "}
                {isAr ? "سيتم خصم الكميات من المخزون." : "Stock quantities will be reversed."}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteToConfirm(null)}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteToConfirm.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "..." : isAr ? "حذف" : "Delete"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentPurchase} onOpenChange={(o) => !o && setPaymentPurchase(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isAr ? "تسجيل دفعة" : "Record Payment"}</DialogTitle>
          </DialogHeader>
          {paymentPurchase && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">{paymentPurchase.supplierName || paymentPurchase.invoiceNumber}</p>
                <p className="text-muted-foreground">
                  {isAr ? "المتبقي:" : "Remaining:"}{" "}
                  {fmt(parseFloat(paymentPurchase.totalAmount) - parseFloat(paymentPurchase.amountPaid))} IQD
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "المبلغ (IQD)" : "Amount (IQD)"}</label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaymentPurchase(null)}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  onClick={() => {
                    const newPaid = parseFloat(paymentPurchase.amountPaid) + paymentAmount;
                    paymentMutation.mutate({
                      id: paymentPurchase.id,
                      data: {
                        amountPaid: newPaid.toFixed(2),
                        paymentStatus:
                          newPaid >= parseFloat(paymentPurchase.totalAmount) ? "paid" : "partial",
                      },
                    });
                  }}
                  disabled={paymentMutation.isPending}
                >
                  {isAr ? "تأكيد" : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrintButton({
  purchase,
  storeName,
  isAr,
}: {
  purchase: GroceryPurchase;
  storeName: string;
  isAr: boolean;
}) {
  const { data: lineItems = [] } = useQuery<GroceryPurchaseItem[]>({
    queryKey: [`/api/grocery/purchases/${purchase.id}/items`],
    enabled: !!purchase.id,
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-green-700 border-green-300"
      onClick={() => printPurchaseInvoice(purchase, lineItems, storeName, isAr)}
    >
      <Printer className="h-3.5 w-3.5 me-1" />
      {isAr ? "طباعة" : "Print"}
    </Button>
  );
}

function PurchaseItemsView({ purchaseId }: { purchaseId: number }) {
  const { data: items = [] } = useQuery<GroceryPurchaseItem[]>({
    queryKey: [`/api/grocery/purchases/${purchaseId}/items`],
  });
  return (
    <div className="space-y-1">
      {items.map((i) => (
        <div key={i.id} className="flex justify-between text-sm text-muted-foreground">
          <span>
            {i.productName} × {i.quantity.toLocaleString()}
          </span>
          <span>{fmt(i.total)} IQD</span>
        </div>
      ))}
    </div>
  );
}
