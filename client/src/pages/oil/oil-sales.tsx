import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { OilSale, OilProduct, OilCustomer, OilSaleItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Trash2, ChevronDown, Banknote, Eye } from "lucide-react";

function fmt(n: string | number) { return parseFloat(String(n)).toLocaleString("en-US", { maximumFractionDigits: 0 }); }

type SaleItem = { productId: number; productName: string; quantity: number; unitPrice: number; total: number };

export default function OilSales() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [paymentSale, setPaymentSale] = useState<OilSale | null>(null);

  const { data: sales = [], isLoading } = useQuery<OilSale[]>({
    queryKey: ["/api/oil/sales"],
    queryFn: () => fetch("/api/oil/sales", { credentials: "include" }).then(r => r.json()),
  });
  const { data: products = [] } = useQuery<OilProduct[]>({
    queryKey: ["/api/oil/products"],
    queryFn: () => fetch("/api/oil/products", { credentials: "include" }).then(r => r.json()),
  });
  const { data: customers = [] } = useQuery<OilCustomer[]>({
    queryKey: ["/api/oil/customers"],
    queryFn: () => fetch("/api/oil/customers", { credentials: "include" }).then(r => r.json()),
  });

  // Sale form state
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formPaymentStatus, setFormPaymentStatus] = useState("unpaid");
  const [formAmountPaid, setFormAmountPaid] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([{ productId: 0, productName: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/oil/sales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تمت إضافة الفاتورة" : "Sale recorded" });
      setShowDialog(false);
      resetForm();
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/oil/sales/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تم تسجيل الدفعة" : "Payment recorded" });
      setPaymentSale(null);
    },
  });

  function resetForm() {
    setFormCustomerId(""); setFormCustomerName(""); setFormPaymentStatus("unpaid");
    setFormAmountPaid(0); setFormNotes("");
    setItems([{ productId: 0, productName: "", quantity: 1, unitPrice: 0, total: 0 }]);
  }

  function updateItem(idx: number, field: keyof SaleItem, value: any) {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "productId") {
        const prod = products.find(p => p.id === Number(value));
        if (prod) { next[idx].productName = prod.name; next[idx].unitPrice = parseFloat(prod.salePrice); }
      }
      next[idx].total = next[idx].quantity * next[idx].unitPrice;
      return next;
    });
  }

  const total = items.reduce((s, i) => s + i.total, 0);

  function handleSubmit() {
    if (!items.some(i => i.productId > 0 && i.quantity > 0)) {
      toast({ title: isAr ? "أضف منتجاً على الأقل" : "Add at least one item", variant: "destructive" }); return;
    }
    const validItems = items.filter(i => i.productId > 0 && i.quantity > 0);
    const customer = customers.find(c => c.id === Number(formCustomerId));
    createMutation.mutate({
      customerId: formCustomerId ? Number(formCustomerId) : null,
      customerName: customer?.name || formCustomerName || null,
      totalAmount: total.toFixed(2),
      discountAmount: "0",
      amountPaid: formAmountPaid.toFixed(2),
      paymentStatus: formAmountPaid >= total ? "paid" : formAmountPaid > 0 ? "partial" : "unpaid",
      notes: formNotes || null,
      items: validItems.map(i => ({ productId: i.productId, productName: i.productName, quantity: String(i.quantity), unitPrice: i.unitPrice.toFixed(2), total: i.total.toFixed(2) })),
    });
  }

  const paymentStatusColor = (s: string) => s === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : s === "partial" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">{isAr ? "المبيعات" : "Sales"}</h1>
            <p className="text-xs text-slate-400">{sales.length} {isAr ? "فاتورة" : "invoices"}</p>
          </div>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => { resetForm(); setShowDialog(true); }} data-testid="button-new-sale">
          <Plus className="h-4 w-4 me-1" />{isAr ? "فاتورة جديدة" : "New Sale"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />) :
          sales.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>{isAr ? "لا توجد مبيعات" : "No sales yet"}</p></div>
          ) : sales.map(sale => {
            const expanded = expandedId === sale.id;
            const remaining = parseFloat(sale.totalAmount) - parseFloat(sale.amountPaid);
            return (
              <Card key={sale.id} data-testid={`card-sale-${sale.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(expanded ? null : sale.id)}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{sale.invoiceNumber}</p>
                        <Badge className={`text-[10px] px-1.5 ${paymentStatusColor(sale.paymentStatus)}`}>{sale.paymentStatus}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5">{sale.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{sale.customerName || "—"} · {new Date(sale.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-end">
                      <p className="font-bold text-green-600">{fmt(sale.totalAmount)} IQD</p>
                      {remaining > 0 && <p className="text-xs text-red-500">-{fmt(remaining)} IQD</p>}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                  {expanded && (
                    <div className="border-t bg-muted/20 px-4 py-3">
                      <SaleItemsView saleId={sale.id} />
                      {sale.paymentStatus !== "paid" && sale.status !== "cancelled" && (
                        <Button size="sm" variant="outline" className="mt-3 text-green-700 border-green-300" onClick={() => { setPaymentSale(sale); setPaymentAmount(0); }} data-testid={`button-pay-sale-${sale.id}`}>
                          <Banknote className="h-3.5 w-3.5 me-1" />{isAr ? "تسجيل دفعة" : "Record Payment"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        }
      </div>

      {/* New Sale Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-new-sale">
          <DialogHeader><DialogTitle>{isAr ? "فاتورة بيع جديدة" : "New Sale Invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "العميل" : "Customer"}</label>
                <Select value={formCustomerId} onValueChange={v => { setFormCustomerId(v); const c = customers.find(x => x.id === Number(v)); setFormCustomerName(c?.name || ""); }}>
                  <SelectTrigger data-testid="select-customer"><SelectValue placeholder={isAr ? "اختر عميل" : "Select customer"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{isAr ? "عميل نقدي" : "Cash customer"}</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!formCustomerId || formCustomerId === "0" ? (
                <div>
                  <label className="text-sm font-medium mb-1 block">{isAr ? "اسم العميل" : "Customer Name"}</label>
                  <Input value={formCustomerName} onChange={e => setFormCustomerName(e.target.value)} data-testid="input-customer-name" />
                </div>
              ) : <div />}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{isAr ? "المنتجات" : "Items"}</label>
                <Button type="button" size="sm" variant="outline" onClick={() => setItems(p => [...p, { productId: 0, productName: "", quantity: 1, unitPrice: 0, total: 0 }])}>
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
                          {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({parseFloat(p.currentStock).toLocaleString()} {p.unit})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Input type="number" className="h-9" placeholder={isAr ? "كمية" : "Qty"} value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-3"><Input type="number" className="h-9" placeholder={isAr ? "سعر" : "Price"} value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-1 text-sm font-medium text-end">{fmt(item.total)}</div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setItems(p => p.filter((_, i) => i !== idx))} disabled={items.length === 1}>
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
                <Input type="number" value={formAmountPaid} onChange={e => setFormAmountPaid(parseFloat(e.target.value) || 0)} data-testid="input-amount-paid" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} data-testid="input-sale-notes" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-sale">{isAr ? "حفظ الفاتورة" : "Save Invoice"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!paymentSale} onOpenChange={o => !o && setPaymentSale(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{isAr ? "تسجيل دفعة" : "Record Payment"}</DialogTitle></DialogHeader>
          {paymentSale && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p className="font-medium">{paymentSale.invoiceNumber}</p>
                <p className="text-muted-foreground">{isAr ? "المتبقي:" : "Remaining:"} {fmt(parseFloat(paymentSale.totalAmount) - parseFloat(paymentSale.amountPaid))} IQD</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "المبلغ (IQD)" : "Amount (IQD)"}</label>
                <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} data-testid="input-payment-amount" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaymentSale(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button onClick={() => {
                  const remaining = parseFloat(paymentSale.totalAmount) - parseFloat(paymentSale.amountPaid);
                  const newPaid = parseFloat(paymentSale.amountPaid) + paymentAmount;
                  paymentMutation.mutate({
                    id: paymentSale.id,
                    data: { amountPaid: newPaid.toFixed(2), paymentStatus: newPaid >= parseFloat(paymentSale.totalAmount) ? "paid" : "partial" }
                  });
                }} disabled={paymentMutation.isPending} data-testid="button-confirm-payment">{isAr ? "تأكيد" : "Confirm"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SaleItemsView({ saleId }: { saleId: number }) {
  const { data: items = [] } = useQuery<OilSaleItem[]>({
    queryKey: ["/api/oil/sales", saleId, "items"],
    queryFn: () => fetch(`/api/oil/sales/${saleId}/items`, { credentials: "include" }).then(r => r.json()),
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
