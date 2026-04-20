import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { OilBatchRecord, OilBatchRecordItem, OilCustomer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpen, Plus, ChevronDown, Trash2, Printer } from "lucide-react";

function fmt(n: string | number | null | undefined) {
  if (n == null || n === "") return "—";
  const v = parseFloat(String(n));
  if (isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const EMPTY_ROW = {
  brand: "", grade: "", containerSize: "", quantity: "", wholesalePrice: "", retailPrice: "", total: "",
};
const NUM_ROWS = 10;

type FormRow = typeof EMPTY_ROW;

export default function OilBatch() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState("");
  const [rows, setRows] = useState<FormRow[]>(Array.from({ length: NUM_ROWS }, () => ({ ...EMPTY_ROW })));

  const { data: records = [], isLoading } = useQuery<OilBatchRecord[]>({
    queryKey: ["/api/oil/batch-records"],
    queryFn: () => fetch("/api/oil/batch-records", { credentials: "include" }).then(r => r.json()),
  });

  const { data: customers = [] } = useQuery<OilCustomer[]>({
    queryKey: ["/api/oil/customers"],
    queryFn: () => fetch("/api/oil/customers", { credentials: "include" }).then(r => r.json()),
  });

  const { data: storeInfo } = useQuery<any>({
    queryKey: ["/api/oil/store-info"],
    queryFn: () => fetch("/api/oil/store-info", { credentials: "include" }).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/oil/batch-records", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/batch-records"] });
      toast({ title: isAr ? "تم حفظ السجل" : "Record saved" });
      setShowDialog(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: e.message || "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/oil/batch-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/batch-records"] });
      setDeleteId(null);
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
    },
  });

  function resetForm() {
    setFormCustomerId(""); setFormCustomerName("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormNotes("");
    setRows(Array.from({ length: NUM_ROWS }, () => ({ ...EMPTY_ROW })));
  }

  function updateRow(idx: number, field: keyof FormRow, value: string) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      const qty = parseFloat(next[idx].quantity) || 0;
      const price = parseFloat(next[idx].retailPrice) || 0;
      next[idx].total = qty && price ? String(qty * price) : "";
      return next;
    });
  }

  const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

  function handleSubmit() {
    const validRows = rows.filter(r => r.brand || r.quantity || r.retailPrice);
    if (validRows.length === 0) {
      toast({ title: isAr ? "أضف صفاً واحداً على الأقل" : "Add at least one row", variant: "destructive" });
      return;
    }
    const customer = customers.find(c => c.id === Number(formCustomerId));
    createMutation.mutate({
      customerId: formCustomerId && formCustomerId !== "0" ? Number(formCustomerId) : null,
      customerName: customer?.name || formCustomerName || null,
      date: new Date(formDate).toISOString(),
      totalAmount: grandTotal.toFixed(2),
      notes: formNotes || null,
      items: rows.map(r => ({
        brand: r.brand || null,
        grade: r.grade || null,
        containerSize: r.containerSize || null,
        quantity: r.quantity || null,
        wholesalePrice: r.wholesalePrice || null,
        retailPrice: r.retailPrice || null,
        total: r.total || null,
      })),
    });
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isAr ? "سجل المنتجات" : "Product Records"}
            </h1>
            <p className="text-xs text-slate-400">{records.length} {isAr ? "سجل" : "records"}</p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          onClick={() => { resetForm(); setShowDialog(true); }}
          data-testid="button-new-batch"
        >
          <Plus className="h-4 w-4 me-1" />
          {isAr ? "سجل جديد" : "New Record"}
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading
          ? [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)
          : records.length === 0
          ? (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{isAr ? "لا توجد سجلات بعد" : "No records yet"}</p>
            </div>
          )
          : records.map(rec => {
            const expanded = expandedId === rec.id;
            return (
              <Card key={rec.id} className="overflow-hidden" data-testid={`card-batch-${rec.id}`}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedId(expanded ? null : rec.id)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm">{rec.recordNumber}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 text-emerald-700 border-emerald-300">
                          {isAr ? "سجل منتجات" : "Product Record"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rec.customerName || (isAr ? "غير محدد" : "No customer")}
                        {" · "}
                        {new Date(rec.date).toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}
                      </p>
                    </div>
                    <div className="text-end me-2">
                      <p className="font-bold text-emerald-600">
                        {fmt(rec.totalAmount)} {isAr ? "د.ع" : "IQD"}
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`} />
                  </div>

                  {expanded && (
                    <div className="border-t bg-muted/20 px-4 py-3">
                      <BatchItemsView recordId={rec.id} isAr={isAr} />
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                          onClick={() => printBatchRecord(rec, storeInfo, isAr)}
                          data-testid={`button-print-batch-${rec.id}`}
                        >
                          <Printer className="h-3.5 w-3.5 me-1" />
                          {isAr ? "طباعة" : "Print"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => setDeleteId(rec.id)}
                          data-testid={`button-delete-batch-${rec.id}`}
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
          })}
      </div>

      {/* New Record Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" data-testid="dialog-new-batch">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              {isAr ? "سجل منتجات جديد" : "New Product Record"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
              <div>
                <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-1 block">
                  {isAr ? "اسم الزبون" : "Customer Name"}
                </label>
                <Select value={formCustomerId} onValueChange={v => {
                  setFormCustomerId(v);
                  const c = customers.find(x => x.id === Number(v));
                  setFormCustomerName(c?.name || "");
                }}>
                  <SelectTrigger data-testid="select-batch-customer" className="bg-white dark:bg-slate-800">
                    <SelectValue placeholder={isAr ? "اختر زبون" : "Select customer"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{isAr ? "بدون زبون" : "No customer"}</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(!formCustomerId || formCustomerId === "0") && (
                  <Input
                    className="mt-1.5 bg-white dark:bg-slate-800"
                    value={formCustomerName}
                    onChange={e => setFormCustomerName(e.target.value)}
                    placeholder={isAr ? "أو اكتب اسم الزبون" : "Or type name"}
                    data-testid="input-batch-customer-name"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-1 block">
                  {isAr ? "التاريخ" : "Date"}
                </label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                  data-testid="input-batch-date"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-1 block">
                  {isAr ? "ملاحظات" : "Notes"}
                </label>
                <Input
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder={isAr ? "الصنف / ملاحظات..." : "Product type / notes..."}
                  className="bg-white dark:bg-slate-800"
                  data-testid="input-batch-notes"
                />
              </div>
            </div>

            {/* Items table — 6 columns matching the physical ledger */}
            <div className="border border-emerald-200 dark:border-emerald-800/40 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]" dir={isAr ? "rtl" : "ltr"}>
                  <thead>
                    <tr className="bg-emerald-700 text-white">
                      <th className="py-3 px-3 text-center font-bold text-xs w-10">#</th>
                      <th className="py-3 px-3 font-bold text-xs">
                        {isAr ? "الماركة" : "Brand"}
                      </th>
                      <th className="py-3 px-3 text-center font-bold text-xs w-20">
                        {isAr ? "القياس" : "Grade"}
                      </th>
                      <th className="py-3 px-3 text-center font-bold text-xs w-24">
                        {isAr ? "النقدة / الحجم" : "Container"}
                      </th>
                      <th className="py-3 px-3 text-center font-bold text-xs w-20">
                        {isAr ? "العدد" : "Qty"}
                      </th>
                      <th className="py-3 px-3 text-center font-bold text-xs w-28">
                        {isAr ? "السعر الزرادي" : "Wholesale"}
                      </th>
                      <th className="py-3 px-3 text-end font-bold text-xs w-28">
                        {isAr ? "السعر الإفصالي" : "Retail/Total"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-emerald-50/40 dark:bg-slate-800/40"}>
                        <td className="text-center text-xs text-muted-foreground py-1.5 px-2 border-b dark:border-slate-700">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-1 border-b dark:border-slate-700">
                          <Input
                            value={row.brand}
                            onChange={e => updateRow(idx, "brand", e.target.value)}
                            className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2"
                            placeholder={isAr ? "الماركة..." : "Brand..."}
                            data-testid={`input-brand-${idx}`}
                          />
                        </td>
                        <td className="py-1 px-1 border-b dark:border-slate-700">
                          <Input
                            value={row.grade}
                            onChange={e => updateRow(idx, "grade", e.target.value)}
                            className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2 text-center"
                            placeholder="68..."
                            data-testid={`input-grade-${idx}`}
                          />
                        </td>
                        <td className="py-1 px-1 border-b dark:border-slate-700">
                          <Input
                            value={row.containerSize}
                            onChange={e => updateRow(idx, "containerSize", e.target.value)}
                            className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2 text-center"
                            placeholder={isAr ? "18 لتر..." : "18L..."}
                            data-testid={`input-container-${idx}`}
                          />
                        </td>
                        <td className="py-1 px-1 border-b dark:border-slate-700">
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={e => updateRow(idx, "quantity", e.target.value)}
                            className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2 text-center"
                            placeholder="0"
                            data-testid={`input-qty-${idx}`}
                          />
                        </td>
                        <td className="py-1 px-1 border-b dark:border-slate-700">
                          <Input
                            type="number"
                            value={row.wholesalePrice}
                            onChange={e => updateRow(idx, "wholesalePrice", e.target.value)}
                            className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2 text-center"
                            placeholder="0"
                            data-testid={`input-wholesale-${idx}`}
                          />
                        </td>
                        <td className="py-1 px-1 border-b dark:border-slate-700">
                          <Input
                            type="number"
                            value={row.retailPrice}
                            onChange={e => updateRow(idx, "retailPrice", e.target.value)}
                            className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2 text-end"
                            placeholder="0"
                            data-testid={`input-retail-${idx}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-700 text-white">
                      <td colSpan={6} className="py-3 px-4 font-bold text-sm text-start">
                        {isAr ? "وامل كامل الحساب" : "Grand Total"}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-base text-end">
                        {fmt(grandTotal)} {isAr ? "د.ع" : "IQD"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                data-testid="button-save-batch"
              >
                {isAr ? "حفظ السجل" : "Save Record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr ? "هل تريد حذف هذا السجل؟ لا يمكن التراجع." : "Delete this record? This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {isAr ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BatchItemsView({ recordId, isAr }: { recordId: number; isAr: boolean }) {
  const { data: items = [] } = useQuery<OilBatchRecordItem[]>({
    queryKey: ["/api/oil/batch-records", recordId, "items"],
    queryFn: () => fetch(`/api/oil/batch-records/${recordId}/items`, { credentials: "include" }).then(r => r.json()),
  });
  const filled = items.filter(i => i.brand || i.quantity || i.retailPrice);
  if (filled.length === 0) return <p className="text-xs text-muted-foreground">{isAr ? "لا توجد بنود" : "No items"}</p>;
  return (
    <div className="rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-800/40 overflow-x-auto">
      <table className="w-full text-xs min-w-[600px]" dir={isAr ? "rtl" : "ltr"}>
        <thead>
          <tr className="bg-emerald-100 dark:bg-emerald-900/30">
            <th className="py-2 px-3 text-start text-emerald-800 dark:text-emerald-400">{isAr ? "الماركة" : "Brand"}</th>
            <th className="py-2 px-2 text-center text-emerald-800 dark:text-emerald-400">{isAr ? "القياس" : "Grade"}</th>
            <th className="py-2 px-2 text-center text-emerald-800 dark:text-emerald-400">{isAr ? "النقدة" : "Container"}</th>
            <th className="py-2 px-2 text-center text-emerald-800 dark:text-emerald-400">{isAr ? "العدد" : "Qty"}</th>
            <th className="py-2 px-2 text-center text-emerald-800 dark:text-emerald-400">{isAr ? "السعر الزرادي" : "Wholesale"}</th>
            <th className="py-2 px-2 text-end text-emerald-800 dark:text-emerald-400">{isAr ? "السعر الإفصالي" : "Retail"}</th>
          </tr>
        </thead>
        <tbody>
          {filled.map((item, idx) => (
            <tr key={item.id} className="border-t border-emerald-100 dark:border-emerald-800/20">
              <td className="py-1.5 px-3 font-semibold">{item.brand || "—"}</td>
              <td className="py-1.5 px-2 text-center">{item.grade || "—"}</td>
              <td className="py-1.5 px-2 text-center">{item.containerSize || "—"}</td>
              <td className="py-1.5 px-2 text-center">{item.quantity ? parseFloat(item.quantity).toLocaleString() : "—"}</td>
              <td className="py-1.5 px-2 text-center">{item.wholesalePrice ? parseFloat(item.wholesalePrice).toLocaleString() : "—"}</td>
              <td className="py-1.5 px-2 text-end font-bold text-emerald-700 dark:text-emerald-400">
                {item.retailPrice ? parseFloat(item.retailPrice).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function printBatchRecord(rec: OilBatchRecord, store: any, isAr: boolean) {
  const dir = isAr ? "rtl" : "ltr";

  fetch(`/api/oil/batch-records/${rec.id}/items`, { credentials: "include" })
    .then(r => r.json())
    .then((items: OilBatchRecordItem[]) => {
      const filled = items.filter(i => i.brand || i.quantity || i.retailPrice);
      const blankCount = Math.max(0, 10 - filled.length);
      const allRows = [
        ...filled,
        ...Array.from({ length: blankCount }, () => ({ brand: "", grade: "", containerSize: "", quantity: null, wholesalePrice: null, retailPrice: null, total: null } as any)),
      ];

      const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${isAr ? "سجل منتجات" : "Product Record"} ${rec.recordNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:${isAr ? "'Segoe UI',Tahoma,Arial,sans-serif" : "'Segoe UI',Arial,sans-serif"};font-size:12px;color:#1a1a1a;background:#fff;}
    @page{size:A4 landscape;margin:12mm 15mm;}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}.no-print{display:none!important;}}
    .page{max-width:100%;margin:0 auto;padding:12px;}
    .header{display:flex;justify-content:space-between;align-items:center;border:2px solid #059669;border-radius:6px;padding:10px 14px;margin-bottom:10px;}
    .store-name{font-size:18px;font-weight:800;color:#059669;}
    .store-sub{font-size:10px;color:#6b7280;margin-top:2px;}
    .doc-title{font-size:14px;font-weight:800;color:#059669;}
    .rec-badge{font-size:11px;font-weight:700;background:#059669;color:white;padding:3px 12px;border-radius:4px;display:inline-block;margin-top:4px;}
    .meta-row{display:flex;gap:16px;margin-bottom:8px;padding:6px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;font-size:11px;}
    .meta-label{color:#059669;font-weight:700;margin-${isAr ? "left" : "right"}:5px;}
    .meta-value{font-weight:700;color:#1a1a1a;}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;}
    thead tr{background:#059669;}
    thead th{padding:8px 8px;font-size:11px;font-weight:700;color:white;text-align:center;}
    thead th.text-start{text-align:${isAr ? "right" : "left"};}
    tbody tr{border-bottom:1px solid #d1fae5;height:26px;}
    tbody tr:nth-child(even){background:#f0fdf4;}
    tbody td{padding:4px 8px;font-size:11px;color:#374151;text-align:center;}
    tbody td.text-start{text-align:${isAr ? "right" : "left"};}
    tbody td.text-end{text-align:${isAr ? "left" : "right"};}
    tfoot tr{background:#059669;}
    tfoot td{padding:9px 12px;color:white;font-weight:800;font-size:13px;}
    tfoot td.text-end{text-align:${isAr ? "left" : "right"};}
    .print-btn{position:fixed;top:14px;${isAr ? "left" : "right"}:14px;background:#059669;color:white;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;z-index:999;}
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ ${isAr ? "طباعة" : "Print"}</button>
  <div class="page">
    <div class="header">
      <div style="flex:1;">
        <div class="store-name">${store?.name || "FactoryPOS"}</div>
        ${store?.receiptHeader ? `<div class="store-sub" style="white-space:pre-line;">${store.receiptHeader}</div>` : ""}
        ${store?.address ? `<div class="store-sub">${store.address}</div>` : ""}
        ${store?.phone ? `<div class="store-sub">📞 ${store.phone}</div>` : ""}
      </div>
      <div style="text-align:center;flex-shrink:0;padding:0 12px;">
        ${store?.logoUrl ? `<img src="${store.logoUrl}" style="height:60px;width:60px;object-fit:contain;border-radius:6px;"/>` : ""}
        <div style="margin-top:5px;font-size:10px;font-weight:700;color:#059669;">${isAr ? "سجل المنتجات" : "Product Record"}</div>
        <div class="rec-badge">No. ${rec.recordNumber}</div>
      </div>
      <div style="flex:1;text-align:right;direction:rtl;">
        <div class="store-name">${store?.name || ""}</div>
        ${store?.receiptFooter ? `<div class="store-sub" style="white-space:pre-line;">${store.receiptFooter}</div>` : ""}
      </div>
    </div>

    <div class="meta-row">
      <div><span class="meta-label">${isAr ? "التاريخ:" : "Date:"}</span><span class="meta-value">${new Date(rec.date).toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}</span></div>
      <div style="flex:1;"><span class="meta-label">${isAr ? "اسم الزبون:" : "Customer:"}</span><span class="meta-value">${rec.customerName || "—"}</span></div>
      ${rec.notes ? `<div><span class="meta-label">${isAr ? "الصنف:" : "Type:"}</span><span class="meta-value">${rec.notes}</span></div>` : ""}
    </div>

    <table>
      <thead>
        <tr>
          <th class="text-start" style="width:35%;">${isAr ? "الماركة" : "Brand"}</th>
          <th style="width:10%;">${isAr ? "القياس" : "Grade"}</th>
          <th style="width:12%;">${isAr ? "النقدة / الحجم" : "Container"}</th>
          <th style="width:10%;">${isAr ? "العدد" : "Qty"}</th>
          <th style="width:15%;">${isAr ? "السعر الزرادي" : "Wholesale"}</th>
          <th class="text-end" style="width:18%;">${isAr ? "السعر الإفصالي" : "Retail Price"}</th>
        </tr>
      </thead>
      <tbody>
        ${allRows.map(item => `
        <tr>
          <td class="text-start">${item.brand || ""}</td>
          <td>${item.grade || ""}</td>
          <td>${item.containerSize || ""}</td>
          <td>${item.quantity ? parseFloat(item.quantity).toLocaleString() : ""}</td>
          <td>${item.wholesalePrice ? parseFloat(item.wholesalePrice).toLocaleString() : ""}</td>
          <td class="text-end" style="font-weight:700;color:#065f46;">${item.retailPrice ? parseFloat(item.retailPrice).toLocaleString() : ""}</td>
        </tr>`).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="text-align:${isAr ? "right" : "left"};">${isAr ? "وامل كامل الحساب" : "Grand Total"}</td>
          <td class="text-end">${parseFloat(rec.totalAmount).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${isAr ? "د.ع" : "IQD"}</td>
        </tr>
      </tfoot>
    </table>

    <div style="display:flex;justify-content:space-between;padding-top:16px;border-top:1px solid #d1fae5;">
      <div style="border-top:1px solid #374151;padding-top:4px;text-align:center;min-width:120px;font-size:10px;">${isAr ? "التوقيع / المستلم" : "Received By"}</div>
      <div style="text-align:center;font-size:10px;color:#9ca3af;">${store?.name || "FactoryPOS"}</div>
      <div style="border-top:1px solid #374151;padding-top:4px;text-align:center;min-width:120px;font-size:10px;">${isAr ? "التوقيع / المسلِّم" : "Issued By"}</div>
    </div>
  </div>
</body>
</html>`;
      const win = window.open("", "_blank", "width=1050,height=700");
      if (win) { win.document.write(html); win.document.close(); }
    });
}
