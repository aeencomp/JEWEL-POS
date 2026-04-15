import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { OilDebt, OilDebtPayment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HandCoins, Plus, TrendingUp, TrendingDown, ChevronDown, Banknote, CheckCircle2, XCircle, History, Phone } from "lucide-react";

const debtSchema = z.object({
  entityName: z.string().min(1),
  entityPhone: z.string().optional(),
  entityType: z.enum(["customer", "supplier", "other"]),
  direction: z.enum(["owe_us", "we_owe"]),
  totalAmount: z.coerce.number().positive(),
  description: z.string().optional(),
});

function fmt(n: string | number) { return parseFloat(String(n)).toLocaleString("en-US", { maximumFractionDigits: 0 }); }

function DebtPaymentsView({ debtId }: { debtId: number }) {
  const { data: payments = [] } = useQuery<OilDebtPayment[]>({
    queryKey: ["/api/oil/debts", debtId, "payments"],
    queryFn: () => fetch(`/api/oil/debts/${debtId}/payments`, { credentials: "include" }).then(r => r.json()),
  });
  if (!payments.length) return <p className="text-xs text-muted-foreground text-center py-2">No payments yet</p>;
  return (
    <div className="space-y-1.5">
      {payments.map(p => (
        <div key={p.id} className="flex justify-between text-sm bg-muted/50 rounded px-2 py-1">
          <span className="text-green-600 font-medium">+{fmt(p.amount)} IQD</span>
          <span className="text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString()}{p.notes ? ` · ${p.notes}` : ""}</span>
        </div>
      ))}
    </div>
  );
}

export default function OilDebts() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payingDebt, setPayingDebt] = useState<OilDebt | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("active");
  const [dirFilter, setDirFilter] = useState("all");

  const { data: debts = [], isLoading } = useQuery<OilDebt[]>({
    queryKey: ["/api/oil/debts"],
    queryFn: () => fetch("/api/oil/debts", { credentials: "include" }).then(r => r.json()),
  });

  const form = useForm({ resolver: zodResolver(debtSchema), defaultValues: { entityName: "", entityPhone: "", entityType: "customer" as const, direction: "owe_us" as const, totalAmount: 0, description: "" } });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/oil/debts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/debts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تمت الإضافة" : "Debt added" });
      setShowAdd(false); form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/oil/debts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/debts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("POST", `/api/oil/debts/${id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/debts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      if (payingDebt) queryClient.invalidateQueries({ queryKey: ["/api/oil/debts", payingDebt.id, "payments"] });
      toast({ title: isAr ? "تم تسجيل الدفعة" : "Payment recorded" });
      setPayingDebt(null);
    },
  });

  const filtered = debts.filter(d => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (dirFilter !== "all" && d.direction !== dirFilter) return false;
    return true;
  });

  const active = debts.filter(d => d.status === "active");
  const totalOweUs = active.filter(d => d.direction === "owe_us").reduce((s, d) => s + parseFloat(d.remainingBalance), 0);
  const totalWeOwe = active.filter(d => d.direction === "we_owe").reduce((s, d) => s + parseFloat(d.remainingBalance), 0);

  const entityTypeLabels = { customer: { en: "Customer", ar: "عميل" }, supplier: { en: "Supplier", ar: "مورد" }, other: { en: "Other", ar: "أخرى" } };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <HandCoins className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">{isAr ? "الديون" : "Debts"}</h1>
            <p className="text-xs text-slate-400">{active.length} {isAr ? "دين نشط" : "active debts"}</p>
          </div>
        </div>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm" onClick={() => { form.reset(); setShowAdd(true); }} data-testid="button-add-debt">
          <Plus className="h-4 w-4 me-1" />{isAr ? "إضافة دين" : "Add Debt"}
        </Button>
      </div>

      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-green-500" />{isAr ? "مديونون لنا" : "They Owe Us"}</p>
            <p className="font-bold text-green-600 text-lg" data-testid="stat-owe-us">{fmt(totalOweUs)} IQD</p>
          </div>
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5 text-red-500" />{isAr ? "ندين لهم" : "We Owe Them"}</p>
            <p className="font-bold text-red-600 text-lg" data-testid="stat-we-owe">{fmt(totalWeOwe)} IQD</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "paid", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-muted-foreground"}`}>{s}</button>
          ))}
          <div className="w-px bg-border mx-1" />
          {["all", "owe_us", "we_owe"].map(d => (
            <button key={d} onClick={() => setDirFilter(d)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${dirFilter === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-muted-foreground"}`}>{d === "owe_us" ? (isAr ? "مديونون لنا" : "Owe Us") : d === "we_owe" ? (isAr ? "ندين لهم" : "We Owe") : "all"}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />) :
          filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><HandCoins className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>{isAr ? "لا توجد ديون" : "No debts"}</p></div>
          ) : filtered.map(debt => {
            const expanded = expandedId === debt.id;
            const isOwedToUs = debt.direction === "owe_us";
            const remaining = parseFloat(debt.remainingBalance);
            const total = parseFloat(debt.totalAmount);
            const paidPct = total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 0;
            return (
              <Card key={debt.id} className={debt.status === "cancelled" ? "opacity-60" : ""} data-testid={`card-debt-${debt.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(expanded ? null : debt.id)}>
                    <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isOwedToUs ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                      {isOwedToUs ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{debt.entityName}</p>
                          {debt.entityPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{debt.entityPhone}</p>}
                          {debt.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{debt.description}</p>}
                        </div>
                        <div className="text-end">
                          <p className={`font-bold ${isOwedToUs ? "text-green-600" : "text-red-600"}`}>{fmt(remaining)} IQD</p>
                          <p className="text-xs text-muted-foreground">/ {fmt(total)} IQD</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${paidPct}%` }} /></div>
                        <span className="text-[10px] text-muted-foreground">{Math.round(paidPct)}%</span>
                        <Badge variant="outline" className="text-[10px] px-1.5">{isAr ? entityTypeLabels[debt.entityType].ar : entityTypeLabels[debt.entityType].en}</Badge>
                        {debt.status === "active" && <Badge className="text-[10px] px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">active</Badge>}
                        {debt.status === "paid" && <Badge className="text-[10px] px-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">paid</Badge>}
                        {debt.status === "cancelled" && <Badge variant="secondary" className="text-[10px] px-1.5">cancelled</Badge>}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
                      {debt.status === "active" && (
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => { setPayingDebt(debt); setPayAmount(0); }} data-testid={`button-pay-debt-${debt.id}`}><Banknote className="h-3.5 w-3.5 me-1" />{isAr ? "تسجيل دفعة" : "Record Payment"}</Button>
                          <Button size="sm" variant="outline" className="text-blue-700 border-blue-300" onClick={() => updateMutation.mutate({ id: debt.id, data: { status: "paid" } })} disabled={updateMutation.isPending} data-testid={`button-mark-paid-${debt.id}`}><CheckCircle2 className="h-3.5 w-3.5 me-1" />{isAr ? "تم السداد" : "Mark Paid"}</Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => updateMutation.mutate({ id: debt.id, data: { status: "cancelled" } })} disabled={updateMutation.isPending}><XCircle className="h-3.5 w-3.5 me-1" />Cancel</Button>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><History className="h-3.5 w-3.5" />Payment History</p>
                        <DebtPaymentsView debtId={debt.id} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        }
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md" data-testid="dialog-add-debt">
          <DialogHeader><DialogTitle>{isAr ? "إضافة دين" : "Add Debt"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-3">
              <FormField control={form.control} name="direction" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "الاتجاه" : "Direction"}</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => field.onChange("owe_us")} className={`p-3 rounded-lg border text-start ${field.value === "owe_us" ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-border"}`} data-testid="btn-owe-us">
                      <TrendingUp className="h-4 w-4 text-green-600 mb-1" />
                      <p className="text-xs font-medium">{isAr ? "مديونون لنا" : "They Owe Us"}</p>
                    </button>
                    <button type="button" onClick={() => field.onChange("we_owe")} className={`p-3 rounded-lg border text-start ${field.value === "we_owe" ? "border-red-500 bg-red-50 dark:bg-red-950" : "border-border"}`} data-testid="btn-we-owe">
                      <TrendingDown className="h-4 w-4 text-red-600 mb-1" />
                      <p className="text-xs font-medium">{isAr ? "ندين لهم" : "We Owe Them"}</p>
                    </button>
                  </div>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="entityName" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>{isAr ? "الاسم" : "Name"}</FormLabel><FormControl><Input {...field} data-testid="input-entity-name" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="entityPhone" render={({ field }) => (<FormItem><FormLabel>{isAr ? "الهاتف" : "Phone"}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="entityType" render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? "النوع" : "Type"}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(entityTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{isAr ? v.ar : v.en}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="totalAmount" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>{isAr ? "المبلغ (IQD)" : "Amount (IQD)"}</FormLabel><FormControl><Input type="number" {...field} data-testid="input-debt-amount" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>{isAr ? "ملاحظات" : "Notes"}</FormLabel><FormControl><Textarea {...field} rows={2} className="resize-none" /></FormControl></FormItem>)} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-debt">{isAr ? "حفظ" : "Save"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payingDebt} onOpenChange={o => !o && setPayingDebt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{isAr ? "تسجيل دفعة" : "Record Payment"}</DialogTitle></DialogHeader>
          {payingDebt && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p className="font-medium">{payingDebt.entityName}</p>
                <p className="text-muted-foreground">{isAr ? "المتبقي:" : "Remaining:"} {fmt(payingDebt.remainingBalance)} IQD</p>
              </div>
              <div><label className="text-sm font-medium mb-1 block">{isAr ? "المبلغ (IQD)" : "Amount (IQD)"}</label><Input type="number" value={payAmount} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)} data-testid="input-pay-amount" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayingDebt(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button onClick={() => paymentMutation.mutate({ id: payingDebt.id, data: { amount: payAmount.toFixed(2) } })} disabled={paymentMutation.isPending} data-testid="button-confirm-payment">{isAr ? "تأكيد" : "Confirm"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
