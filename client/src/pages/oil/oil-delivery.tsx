import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { OilDeliveryNote, OilDeliveryNoteItem, OilCustomer } from "@shared/schema";
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
import { FileText, Plus, ChevronDown, Trash2, Printer, ClipboardList } from "lucide-react";

function fmt(n: string | number | null | undefined) {
  if (n == null || n === "") return "—";
  const v = parseFloat(String(n));
  if (isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function numToWordsAr(n: number): string {
  if (n === 0) return "صفر دينار";
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  function below1000(num: number): string {
    if (num === 0) return "";
    if (num < 20) return ones[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const o = num % 10;
      return o === 0 ? tens[t] : ones[o] + " و" + tens[t];
    }
    const h = Math.floor(num / 100);
    const rest = num % 100;
    return hundreds[h] + (rest > 0 ? " و" + below1000(rest) : "");
  }
  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions > 0) parts.push(below1000(millions) + " مليون");
  if (thousands > 0) parts.push(below1000(thousands) + " ألف");
  if (rest > 0) parts.push(below1000(rest));
  return parts.join(" و") + " دينار";
}

const EMPTY_ROW = () => ({ rowNumber: 0, description: "", quantity: "", unitPrice: "", total: "" });
const NUM_ROWS = 20;

type FormRow = { rowNumber: number; description: string; quantity: string; unitPrice: string; total: string };

export default function OilDelivery() {
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
  const [rows, setRows] = useState<FormRow[]>(
    Array.from({ length: NUM_ROWS }, (_, i) => ({ ...EMPTY_ROW(), rowNumber: i + 1 }))
  );

  const { data: notes = [], isLoading } = useQuery<OilDeliveryNote[]>({
    queryKey: ["/api/oil/delivery-notes"],
    queryFn: () => fetch("/api/oil/delivery-notes", { credentials: "include" }).then(r => r.json()),
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
    mutationFn: (data: any) => apiRequest("POST", "/api/oil/delivery-notes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/delivery-notes"] });
      toast({ title: isAr ? "تم حفظ الوصل" : "Delivery note saved" });
      setShowDialog(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: e.message || "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/oil/delivery-notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/delivery-notes"] });
      setDeleteId(null);
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
    },
  });

  function resetForm() {
    setFormCustomerId("");
    setFormCustomerName("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormNotes("");
    setRows(Array.from({ length: NUM_ROWS }, (_, i) => ({ ...EMPTY_ROW(), rowNumber: i + 1 })));
  }

  function updateRow(idx: number, field: keyof FormRow, value: string) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      const qty = parseFloat(next[idx].quantity) || 0;
      const price = parseFloat(next[idx].unitPrice) || 0;
      next[idx].total = qty && price ? String(qty * price) : "";
      return next;
    });
  }

  const rowTotal = rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

  function handleSubmit() {
    const validRows = rows.filter(r => r.description || r.quantity || r.unitPrice);
    if (validRows.length === 0) {
      toast({ title: isAr ? "أضف بند واحد على الأقل" : "Add at least one row", variant: "destructive" });
      return;
    }
    const customer = customers.find(c => c.id === Number(formCustomerId));
    createMutation.mutate({
      customerId: formCustomerId && formCustomerId !== "0" ? Number(formCustomerId) : null,
      customerName: customer?.name || formCustomerName || null,
      date: new Date(formDate).toISOString(),
      totalAmount: rowTotal.toFixed(2),
      notes: formNotes || null,
      items: rows.map((r, i) => ({
        rowNumber: i + 1,
        description: r.description || null,
        quantity: r.quantity ? r.quantity : null,
        unitPrice: r.unitPrice ? r.unitPrice : null,
        total: r.total ? r.total : null,
      })),
    });
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isAr ? "وصولات التسليم" : "Delivery Notes"}
            </h1>
            <p className="text-xs text-slate-400">
              {notes.length} {isAr ? "وصل" : "notes"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
          onClick={() => { resetForm(); setShowDialog(true); }}
          data-testid="button-new-delivery"
        >
          <Plus className="h-4 w-4 me-1" />
          {isAr ? "وصل جديد" : "New Note"}
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading
          ? [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)
          : notes.length === 0
          ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{isAr ? "لا توجد وصولات بعد" : "No delivery notes yet"}</p>
            </div>
          )
          : notes.map(note => {
            const expanded = expandedId === note.id;
            return (
              <Card key={note.id} className="overflow-hidden" data-testid={`card-note-${note.id}`}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedId(expanded ? null : note.id)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm">{note.noteNumber}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 text-amber-700 border-amber-300">
                          {isAr ? "وصل تسليم" : "Delivery"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {note.customerName || (isAr ? "غير محدد" : "No customer")}
                        {" · "}
                        {new Date(note.date).toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}
                      </p>
                    </div>
                    <div className="text-end me-2">
                      <p className="font-bold text-amber-600">
                        {fmt(note.totalAmount)} {isAr ? "د.ع" : "IQD"}
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`} />
                  </div>

                  {expanded && (
                    <div className="border-t bg-muted/20 px-4 py-3">
                      <NoteItemsView noteId={note.id} isAr={isAr} />
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                          onClick={() => printDeliveryNote(note, storeInfo, isAr)}
                          data-testid={`button-print-${note.id}`}
                        >
                          <Printer className="h-3.5 w-3.5 me-1" />
                          {isAr ? "طباعة الوصل" : "Print Note"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => setDeleteId(note.id)}
                          data-testid={`button-delete-${note.id}`}
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

      {/* New Delivery Note Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto" data-testid="dialog-new-delivery">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              {isAr ? "وصل تسليم جديد" : "New Delivery Note"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer + Date row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "العميل / حضرة السيد" : "Customer"}</label>
                <Select value={formCustomerId} onValueChange={v => {
                  setFormCustomerId(v);
                  const c = customers.find(x => x.id === Number(v));
                  setFormCustomerName(c?.name || "");
                }}>
                  <SelectTrigger data-testid="select-delivery-customer">
                    <SelectValue placeholder={isAr ? "اختر عميل" : "Select customer"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{isAr ? "بدون عميل" : "No customer"}</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(!formCustomerId || formCustomerId === "0") && (
                <div>
                  <label className="text-sm font-medium mb-1 block">{isAr ? "اسم العميل" : "Customer Name"}</label>
                  <Input
                    value={formCustomerName}
                    onChange={e => setFormCustomerName(e.target.value)}
                    placeholder={isAr ? "اكتب اسم العميل" : "Type customer name"}
                    data-testid="input-delivery-customer-name"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "التاريخ" : "Date"}</label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} data-testid="input-delivery-date" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder={isAr ? "ملاحظات اختيارية" : "Optional notes"} data-testid="input-delivery-notes" />
              </div>
            </div>

            {/* Items table — matching physical form */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm" dir={isAr ? "rtl" : "ltr"}>
                <thead>
                  <tr className="bg-amber-600 text-white">
                    <th className="w-10 py-2.5 px-2 text-center font-semibold text-xs">#</th>
                    <th className="py-2.5 px-3 text-start font-semibold text-xs">
                      {isAr ? "التفاصيل / البيان" : "Description / Particulars"}
                    </th>
                    <th className="w-24 py-2.5 px-2 text-center font-semibold text-xs">
                      {isAr ? "العدد" : "Qty"}
                    </th>
                    <th className="w-28 py-2.5 px-2 text-center font-semibold text-xs">
                      {isAr ? "السعر المفرد" : "Unit Price"}
                    </th>
                    <th className="w-28 py-2.5 px-2 text-end font-semibold text-xs">
                      {isAr ? "المبلغ الكلي" : "Total Amount"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-amber-50/40 dark:bg-slate-800/40"}>
                      <td className="text-center text-xs text-muted-foreground py-1 px-2 border-b dark:border-slate-700">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-1 border-b dark:border-slate-700">
                        <Input
                          value={row.description}
                          onChange={e => updateRow(idx, "description", e.target.value)}
                          className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2 rounded"
                          placeholder={isAr ? "البيان..." : "Description..."}
                          data-testid={`input-row-desc-${idx}`}
                        />
                      </td>
                      <td className="py-1 px-1 border-b dark:border-slate-700">
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={e => updateRow(idx, "quantity", e.target.value)}
                          className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2 rounded text-center"
                          placeholder="0"
                          data-testid={`input-row-qty-${idx}`}
                        />
                      </td>
                      <td className="py-1 px-1 border-b dark:border-slate-700">
                        <Input
                          type="number"
                          value={row.unitPrice}
                          onChange={e => updateRow(idx, "unitPrice", e.target.value)}
                          className="h-7 border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs px-2 rounded text-center"
                          placeholder="0"
                          data-testid={`input-row-price-${idx}`}
                        />
                      </td>
                      <td className="py-1 px-2 border-b dark:border-slate-700 text-end">
                        <span className={`text-xs font-semibold ${row.total ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {row.total ? fmt(row.total) : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-600 text-white">
                    <td colSpan={isAr ? 2 : 4} className="py-2.5 px-3 font-bold text-sm">
                      {isAr ? "المجموع الكلي" : "Grand Total"}
                    </td>
                    {!isAr && <td colSpan={1} />}
                    {isAr && <td colSpan={2} />}
                    <td className="py-2.5 px-3 font-extrabold text-base text-end">
                      {fmt(rowTotal)} {isAr ? "د.ع" : "IQD"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {rowTotal > 0 && (
              <p className="text-sm text-muted-foreground text-center italic" dir="rtl">
                {numToWordsAr(Math.round(rowTotal))}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                data-testid="button-save-delivery"
              >
                {isAr ? "حفظ الوصل" : "Save Note"}
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
              {isAr ? "هل تريد حذف هذا الوصل؟ لا يمكن التراجع." : "Delete this delivery note? This cannot be undone."}
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

function NoteItemsView({ noteId, isAr }: { noteId: number; isAr: boolean }) {
  const { data: items = [] } = useQuery<OilDeliveryNoteItem[]>({
    queryKey: ["/api/oil/delivery-notes", noteId, "items"],
    queryFn: () => fetch(`/api/oil/delivery-notes/${noteId}/items`, { credentials: "include" }).then(r => r.json()),
  });
  const filledItems = items.filter(i => i.description || i.quantity || i.unitPrice);
  if (filledItems.length === 0) return <p className="text-xs text-muted-foreground">{isAr ? "لا توجد بنود" : "No items"}</p>;
  return (
    <div className="rounded-lg overflow-hidden border border-amber-200 dark:border-amber-800/40">
      <table className="w-full text-xs" dir={isAr ? "rtl" : "ltr"}>
        <thead>
          <tr className="bg-amber-100 dark:bg-amber-900/30">
            <th className="w-8 py-2 px-2 text-center text-amber-800 dark:text-amber-400">#</th>
            <th className="py-2 px-3 text-start text-amber-800 dark:text-amber-400">{isAr ? "البيان" : "Description"}</th>
            <th className="w-20 py-2 px-2 text-center text-amber-800 dark:text-amber-400">{isAr ? "العدد" : "Qty"}</th>
            <th className="w-24 py-2 px-2 text-center text-amber-800 dark:text-amber-400">{isAr ? "السعر" : "Price"}</th>
            <th className="w-24 py-2 px-2 text-end text-amber-800 dark:text-amber-400">{isAr ? "الإجمالي" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          {filledItems.map(item => (
            <tr key={item.id} className="border-t border-amber-100 dark:border-amber-800/20">
              <td className="py-1.5 px-2 text-center text-muted-foreground">{item.rowNumber}</td>
              <td className="py-1.5 px-3">{item.description || "—"}</td>
              <td className="py-1.5 px-2 text-center">{item.quantity ? parseFloat(item.quantity).toLocaleString() : "—"}</td>
              <td className="py-1.5 px-2 text-center">{item.unitPrice ? parseFloat(item.unitPrice).toLocaleString() : "—"}</td>
              <td className="py-1.5 px-2 text-end font-semibold text-amber-700 dark:text-amber-400">
                {item.total ? parseFloat(item.total).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function printDeliveryNote(note: OilDeliveryNote, store: any, isAr: boolean) {
  const dir = isAr ? "rtl" : "ltr";
  const total = parseFloat(note.totalAmount) || 0;

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  function b1000(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) { const t = Math.floor(n / 10); const o = n % 10; return o === 0 ? tens[t] : ones[o] + " و" + tens[t]; }
    const h = Math.floor(n / 100); const r = n % 100;
    return hundreds[h] + (r > 0 ? " و" + b1000(r) : "");
  }
  function toWords(n: number): string {
    if (n === 0) return "صفر دينار";
    const m = Math.floor(n / 1000000); const th = Math.floor((n % 1000000) / 1000); const r = n % 1000;
    const p: string[] = [];
    if (m > 0) p.push(b1000(m) + " مليون");
    if (th > 0) p.push(b1000(th) + " ألف");
    if (r > 0) p.push(b1000(r));
    return p.join(" و") + " دينار";
  }

  fetch(`/api/oil/delivery-notes/${note.id}/items`, { credentials: "include" })
    .then(r => r.json())
    .then((items: OilDeliveryNoteItem[]) => {
      const filledRows = items.filter(i => i.description || i.quantity || i.unitPrice);
      const blankCount = Math.max(0, 20 - filledRows.length);
      const allRows = [
        ...filledRows.map(i => ({
          num: i.rowNumber,
          desc: i.description || "",
          qty: i.quantity ? parseFloat(i.quantity).toLocaleString() : "",
          price: i.unitPrice ? parseFloat(i.unitPrice).toLocaleString() : "",
          tot: i.total ? parseFloat(i.total).toLocaleString() : "",
        })),
        ...Array.from({ length: blankCount }, (_, i) => ({ num: filledRows.length + i + 1, desc: "", qty: "", price: "", tot: "" })),
      ];

      const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${isAr ? "وصل تسليم" : "Delivery Note"} ${note.noteNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:${isAr ? "'Segoe UI',Tahoma,Arial,sans-serif" : "'Segoe UI',Arial,sans-serif"};font-size:12px;color:#1a1a1a;background:#fff;}
    @page{size:A4;margin:12mm 15mm;}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}.no-print{display:none!important;}}
    .page{max-width:780px;margin:0 auto;padding:16px;}
    /* Header */
    .header{display:flex;justify-content:space-between;align-items:flex-start;border:2px solid #b45309;border-radius:6px;padding:10px 14px;margin-bottom:10px;}
    .store-name{font-size:18px;font-weight:800;color:#b45309;}
    .store-sub{font-size:10px;color:#6b7280;margin-top:2px;}
    .logo-box{text-align:center;}
    .doc-title{font-size:13px;font-weight:700;color:#b45309;margin-bottom:6px;}
    .note-badge{font-size:11px;font-weight:700;background:#b45309;color:white;padding:2px 10px;border-radius:4px;display:inline-block;}
    /* Meta row */
    .meta-row{display:flex;gap:10px;margin-bottom:8px;font-size:11px;border:1px solid #e5e7eb;border-radius:5px;padding:6px 10px;}
    .meta-item{display:flex;gap:5px;align-items:center;}
    .meta-label{color:#9ca3af;font-weight:600;}
    .meta-value{font-weight:700;color:#1a1a1a;}
    /* Table */
    table{width:100%;border-collapse:collapse;margin-bottom:8px;}
    thead tr{background:#b45309;}
    thead th{padding:8px 8px;font-size:10px;font-weight:700;color:white;text-align:${isAr ? "right" : "left"};}
    thead th.num-col,thead th.center-col{text-align:center;}
    thead th.amount-col{text-align:${isAr ? "left" : "right"};}
    tbody tr{border-bottom:1px solid #e5e7eb;height:22px;}
    tbody tr:nth-child(even){background:#fef3c7;}
    tbody td{padding:3px 8px;font-size:11px;color:#374151;}
    tbody td.num-col{text-align:center;color:#9ca3af;font-size:10px;}
    tbody td.center-col{text-align:center;}
    tbody td.amount-col{text-align:${isAr ? "left" : "right"};font-weight:700;color:#92400e;}
    tfoot tr{background:#b45309;}
    tfoot td{padding:8px 10px;color:white;font-weight:800;font-size:13px;}
    tfoot td.amount-col{text-align:${isAr ? "left" : "right"};}
    /* Total in words */
    .total-words{border:1px solid #fde68a;background:#fffbeb;border-radius:5px;padding:7px 12px;margin-bottom:10px;font-size:11px;}
    .total-words .label{color:#b45309;font-weight:700;font-size:10px;display:block;margin-bottom:2px;}
    .total-words .value{font-weight:700;color:#1a1a1a;font-size:13px;}
    /* Footer */
    .footer{display:flex;justify-content:space-between;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;}
    .sig-box{border-top:1px solid #374151;padding-top:4px;text-align:center;min-width:100px;font-size:10px;color:#374151;}
    /* Print button */
    .print-btn{position:fixed;top:14px;${isAr ? "left" : "right"}:14px;background:#b45309;color:white;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;z-index:999;box-shadow:0 4px 12px rgba(180,83,9,.3);}
    .print-btn:hover{background:#92400e;}
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ ${isAr ? "طباعة" : "Print"}</button>
  <div class="page">
    <!-- Bilingual Header — matches physical letterhead -->
    <div class="header">
      <div style="flex:1;">
        <div class="store-name">${store?.name || "FactoryPOS"}</div>
        ${store?.receiptHeader ? `<div class="store-sub" style="white-space:pre-line;">${store.receiptHeader}</div>` : ""}
        ${store?.address ? `<div class="store-sub">${store.address}</div>` : ""}
        ${store?.phone ? `<div class="store-sub">📞 ${store.phone}</div>` : ""}
      </div>
      <div style="text-align:center;flex-shrink:0;padding:0 12px;">
        ${store?.logoUrl ? `<img src="${store.logoUrl}" style="height:64px;width:64px;object-fit:contain;border-radius:6px;" />` : ""}
        <div style="margin-top:6px;font-size:11px;font-weight:700;color:#b45309;">${isAr ? "وصل تسليم" : "Delivery Note"}</div>
        <div class="note-badge">No. ${note.noteNumber}</div>
      </div>
      <div style="flex:1;text-align:right;direction:rtl;">
        <div class="store-name">${store?.name || ""}</div>
        ${store?.receiptFooter ? `<div class="store-sub" style="white-space:pre-line;">${store.receiptFooter}</div>` : ""}
      </div>
    </div>

    <!-- Meta row -->
    <div class="meta-row">
      <div class="meta-item">
        <span class="meta-label">${isAr ? "التاريخ:" : "Date:"}</span>
        <span class="meta-value">${new Date(note.date).toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}</span>
      </div>
      <div class="meta-item" style="flex:1;">
        <span class="meta-label">${isAr ? "حضرة السيد / العميل:" : "Customer:"}</span>
        <span class="meta-value">${note.customerName || "—"}</span>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th class="num-col" style="width:32px;">${isAr ? "ت" : "#"}</th>
          <th>${isAr ? "التفاصيل / البيان" : "Particulars / Description"}</th>
          <th class="center-col" style="width:60px;">${isAr ? "العدد" : "Qty"}</th>
          <th class="center-col" style="width:90px;">${isAr ? "السعر المفرد" : "Unit Price"}</th>
          <th class="amount-col" style="width:90px;">${isAr ? "المبلغ الكلي" : "Total Amount"}</th>
        </tr>
      </thead>
      <tbody>
        ${allRows.map(r => `
        <tr>
          <td class="num-col">${r.num}</td>
          <td>${r.desc}</td>
          <td class="center-col">${r.qty}</td>
          <td class="center-col">${r.price}</td>
          <td class="amount-col">${r.tot}</td>
        </tr>`).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="${isAr ? "3" : "4"}" style="text-align:${isAr ? "right" : "left"};">${isAr ? "المجموع الكلي" : "Grand Total"}</td>
          ${isAr ? '<td></td>' : ''}
          <td class="amount-col">${total.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${isAr ? "د.ع" : "IQD"}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Total in words -->
    <div class="total-words">
      <span class="label">${isAr ? "فقط:" : "Amount in words:"}</span>
      <span class="value">${toWords(Math.round(total))}</span>
    </div>

    ${note.notes ? `<div style="font-size:11px;color:#6b7280;margin-bottom:10px;"><b>${isAr ? "ملاحظات:" : "Notes:"}</b> ${note.notes}</div>` : ""}

    <!-- Footer / Signatures -->
    <div class="footer">
      <div>
        <div class="sig-box">${isAr ? "التوقيع / المستلم" : "Received By"}</div>
      </div>
      <div style="text-align:center;font-size:10px;color:#9ca3af;">
        <p>${store?.name || "FactoryPOS"}</p>
        <p>${isAr ? "الخطأ والسهو مرجوع للطرفين" : "Errors & omissions excepted"}</p>
      </div>
      <div>
        <div class="sig-box">${isAr ? "التوقيع / المسلِّم" : "Delivered By"}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
      const win = window.open("", "_blank", "width=920,height=720");
      if (win) { win.document.write(html); win.document.close(); }
    });
}
