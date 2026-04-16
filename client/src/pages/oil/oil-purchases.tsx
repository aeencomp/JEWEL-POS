import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { OilPurchase, OilProduct, OilSupplier, OilPurchaseItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Plus, Trash2, ChevronDown, Banknote, Printer } from "lucide-react";
import { useQuery as useQueryItems } from "@tanstack/react-query";
import { printOilPurchaseInvoice } from "@/components/oil-purchase-invoice";

function fmt(n: string | number) { return parseFloat(String(n)).toLocaleString("en-US", { maximumFractionDigits: 0 }); }
type PurchaseItem = { productId: number; productName: string; quantity: number; unitCost: number; total: number };

export default function OilPurchases() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [paymentPurchase, setPaymentPurchase] = useState<OilPurchase | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const { data: purchases = [], isLoading } = useQuery<OilPurchase[]>({
    queryKey: ["/api/oil/purchases"],
    queryFn: () => fetch("/api/oil/purchases", { credentials: "include" }).then(r => r.json()),
  });
  const { data: products = [] } = useQuery<OilProduct[]>({
    queryKey: ["/api/oil/products"],
    queryFn: () => fetch("/api/oil/products", { credentials: "include" }).then(r => r.json()),
  });
  const { data: suppliers = [] } = useQuery<OilSupplier[]>({
    queryKey: ["/api/oil/suppliers"],
    queryFn: () => fetch("/api/oil/suppliers", { credentials: "include" }).then(r => r.json()),
  });
  const { data: storeInfo } = useQuery<{ name: string; phone?: string | null; address?: string | null; email?: string | null; logoUrl?: string | null }>({
    queryKey: ["/api/oil/store-info"],
    queryFn: () => fetch("/api/oil/store-info", { credentials: "include" }).then(r => r.json()),
  });

  const [formSupplierId, setFormSupplierId] = useState("");
  const [formSupplierName, setFormSupplierName] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formAmountPaid, setFormAmountPaid] = useState(0);
  const [items, setItems] = useState<PurchaseItem[]>([{ productId: 0, productName: "", quantity: 1, unitCost: 0, total: 0 }]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/oil/purchases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تمت إضافة الشراء" : "Purchase recorded" });
      setShowDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: isAr ? "فشل الحفظ" : "Save failed", description: err.message || String(err), variant: "destructive" });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/oil/purchases/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تم تسجيل الدفعة" : "Payment recorded" });
      setPaymentPurchase(null);
    },
  });

  function resetForm() {
    setFormSupplierId(""); setFormSupplierName(""); setFormInvoiceNumber("");
    setFormNotes(""); setFormAmountPaid(0);
    setItems([{ productId: 0, productName: "", quantity: 1, unitCost: 0, total: 0 }]);
  }

  function updateItem(idx: number, field: keyof PurchaseItem, value: any) {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "productId") {
        const prod = products.find(p => p.id === Number(value));
        if (prod) { next[idx].productName = prod.name; next[idx].unitCost = parseFloat(prod.purchasePrice); }
      }
      next[idx].total = next[idx].quantity * next[idx].unitCost;
      return next;
    });
  }

  const total = items.reduce((s, i) => s + i.total, 0);

  function handleSubmit() {
    if (!items.some(i => i.productId > 0 && i.quantity > 0)) {
      toast({ title: isAr ? "أضف منتجاً على الأقل" : "Add at least one item", variant: "destructive" }); return;
    }
    const supplierIdNum = Number(formSupplierId);
    const supplier = suppliers.find(s => s.id === supplierIdNum);
    createMutation.mutate({
      supplierId: supplierIdNum > 0 ? supplierIdNum : null,
      supplierName: supplier?.name || formSupplierName || null,
      invoiceNumber: formInvoiceNumber || null,
      totalAmount: total.toFixed(2),
      amountPaid: formAmountPaid.toFixed(2),
      paymentStatus: formAmountPaid >= total ? "paid" : formAmountPaid > 0 ? "partial" : "unpaid",
      notes: formNotes || null,
      items: items.filter(i => i.productId > 0 && i.quantity > 0).map(i => ({
        productId: i.productId, productName: i.productName,
        quantity: String(i.quantity), unitCost: i.unitCost.toFixed(2), total: i.total.toFixed(2),
      })),
    });
  }

  const payStatusColor = (s: string) => s === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : s === "partial" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Truck className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">{isAr ? "المشتريات" : "Purchases"}</h1>
            <p className="text-xs text-slate-400">{purchases.length} {isAr ? "فاتورة" : "invoices"}</p>
          </div>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => { resetForm(); setShowDialog(true); }} data-testid="button-new-purchase">
          <Plus className="h-4 w-4 me-1" />{isAr ? "شراء جديد" : "New Purchase"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />) :
          purchases.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Truck className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>{isAr ? "لا توجد مشتريات" : "No purchases yet"}</p></div>
          ) : purchases.map(purchase => {
            const expanded = expandedId === purchase.id;
            const remaining = parseFloat(purchase.totalAmount) - parseFloat(purchase.amountPaid);
            return (
              <Card key={purchase.id} data-testid={`card-purchase-${purchase.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(expanded ? null : purchase.id)}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{purchase.invoiceNumber || `PO-${purchase.id}`}</p>
                        <Badge className={`text-[10px] px-1.5 ${payStatusColor(purchase.paymentStatus)}`}>{purchase.paymentStatus}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{purchase.supplierName || "—"} · {new Date(purchase.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-end">
                      <p className="font-bold text-blue-600">{fmt(purchase.totalAmount)} IQD</p>
                      {remaining > 0 && <p className="text-xs text-red-500">-{fmt(remaining)} IQD</p>}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                  {expanded && (
                    <div className="border-t bg-muted/20 px-4 py-3">
                      <PurchaseItemsView purchaseId={purchase.id} />
                      <div className="flex items-center gap-2 mt-3">
                        {purchase.paymentStatus !== "paid" && (
                          <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => { setPaymentPurchase(purchase); setPaymentAmount(0); }} data-testid={`button-pay-purchase-${purchase.id}`}>
                            <Banknote className="h-3.5 w-3.5 me-1" />{isAr ? "تسجيل دفعة" : "Record Payment"}
                          </Button>
                        )}
                        <PrintButton purchase={purchase} storeInfo={storeInfo || null} isAr={isAr} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        }
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-new-purchase">
          <DialogHeader><DialogTitle>{isAr ? "شراء جديد" : "New Purchase"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "المورد" : "Supplier"}</label>
                <Select value={formSupplierId} onValueChange={v => { setFormSupplierId(v); const s = suppliers.find(x => x.id === Number(v)); setFormSupplierName(s?.name || ""); }}>
                  <SelectTrigger><SelectValue placeholder={isAr ? "اختر مورد" : "Select supplier"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{isAr ? "مورد آخر" : "Other supplier"}</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "رقم الفاتورة" : "Invoice #"}</label>
                <Input value={formInvoiceNumber} onChange={e => setFormInvoiceNumber(e.target.value)} data-testid="input-invoice-number" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{isAr ? "المنتجات" : "Items"}</label>
                <Button type="button" size="sm" variant="outline" onClick={() => setItems(p => [...p, { productId: 0, productName: "", quantity: 1, unitCost: 0, total: 0 }])}>
                  <Plus className="h-3.5 w-3.5 me-1" />{isAr ? "إضافة" : "Add"}
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Select value={String(item.productId)} onValueChange={v => updateItem(idx, "productId", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={isAr ? "اختر منتج" : "Product"} /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Input type="number" className="h-9" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-3"><Input type="number" className="h-9" value={item.unitCost} onChange={e => updateItem(idx, "unitCost", parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-1 text-sm font-medium text-end">{fmt(item.total)}</div>
                    <div className="col-span-1"><Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setItems(p => p.filter((_, i) => i !== idx))} disabled={items.length === 1}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t">
                <span className="font-bold">{isAr ? "الإجمالي" : "Total"}</span>
                <span className="font-bold text-blue-600 text-lg">{fmt(total)} IQD</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "المبلغ المدفوع (IQD)" : "Amount Paid (IQD)"}</label>
                <Input type="number" value={formAmountPaid} onChange={e => setFormAmountPaid(parseFloat(e.target.value) || 0)} data-testid="input-amount-paid" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-purchase">
                {createMutation.isPending ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentPurchase} onOpenChange={o => !o && setPaymentPurchase(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{isAr ? "تسجيل دفعة" : "Record Payment"}</DialogTitle></DialogHeader>
          {paymentPurchase && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">{paymentPurchase.supplierName || `PO-${paymentPurchase.id}`}</p>
                <p className="text-muted-foreground">{isAr ? "المتبقي:" : "Remaining:"} {fmt(parseFloat(paymentPurchase.totalAmount) - parseFloat(paymentPurchase.amountPaid))} IQD</p>
              </div>
              <div><label className="text-sm font-medium mb-1 block">{isAr ? "المبلغ (IQD)" : "Amount (IQD)"}</label><Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaymentPurchase(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button onClick={() => {
                  const newPaid = parseFloat(paymentPurchase.amountPaid) + paymentAmount;
                  paymentMutation.mutate({ id: paymentPurchase.id, data: { amountPaid: newPaid.toFixed(2), paymentStatus: newPaid >= parseFloat(paymentPurchase.totalAmount) ? "paid" : "partial" } });
                }} disabled={paymentMutation.isPending}>{isAr ? "تأكيد" : "Confirm"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrintButton({ purchase, storeInfo, isAr }: { purchase: OilPurchase; storeInfo: { name: string; phone?: string | null; address?: string | null; email?: string | null; logoUrl?: string | null } | null; isAr: boolean }) {
  const { data: items = [] } = useQueryItems<OilPurchaseItem[]>({
    queryKey: ["/api/oil/purchases", purchase.id, "items"],
    queryFn: () => fetch(`/api/oil/purchases/${purchase.id}/items`, { credentials: "include" }).then(r => r.json()),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-blue-700 border-blue-300"
      onClick={() => printOilPurchaseInvoice({ purchase, items, store: storeInfo, isAr })}
      data-testid={`button-print-purchase-${purchase.id}`}
    >
      <Printer className="h-3.5 w-3.5 me-1" />
      {isAr ? "طباعة" : "Print"}
    </Button>
  );
}

function PurchaseItemsView({ purchaseId }: { purchaseId: number }) {
  const { data: items = [] } = useQueryItems<OilPurchaseItem[]>({
    queryKey: ["/api/oil/purchases", purchaseId, "items"],
    queryFn: () => fetch(`/api/oil/purchases/${purchaseId}/items`, { credentials: "include" }).then(r => r.json()),
  });
  return (
    <div className="space-y-1">
      {items.map(i => (
        <div key={i.id} className="flex justify-between text-sm text-muted-foreground">
          <span>{i.productName} × {parseFloat(i.quantity).toLocaleString()}</span>
          <span>{parseFloat(i.total).toLocaleString()} IQD</span>
        </div>
      ))}
    </div>
  );
}
