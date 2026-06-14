import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import type { InventoryItem, PharmacyPrescription, PharmacyPrescriptionItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FilePlus2, Loader2, CheckCircle2, Printer, Pencil, Trash2 } from "lucide-react";

type RxWithItems = PharmacyPrescription & { items: PharmacyPrescriptionItem[] };

type LineForm = {
  inventoryItemId: string;
  drugName: string;
  quantity: string;
  dosageInstructions: string;
  unitPrice: string;
};

const emptyLine: LineForm = { inventoryItemId: "", drugName: "", quantity: "1", dosageInstructions: "", unitPrice: "0" };

function fmt(n: string | number) {
  return parseFloat(String(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function PharmacyPrescriptions() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<RxWithItems | null>(null);
  const [deleteRx, setDeleteRx] = useState<RxWithItems | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorLicense, setDoctorLicense] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineForm[]>([{ ...emptyLine }]);

  const { data: prescriptions = [], isLoading } = useQuery<RxWithItems[]>({ queryKey: ["/api/pharmacy/prescriptions"] });
  const { data: inventory = [] } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: branding } = useQuery<{ name: string }>({ queryKey: ["/api/store/branding"] });

  function resetForm() {
    setEditingRx(null);
    setPatientName("");
    setPatientPhone("");
    setDoctorName("");
    setDoctorLicense("");
    setNotes("");
    setLines([{ ...emptyLine }]);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(rx: RxWithItems) {
    setEditingRx(rx);
    setPatientName(rx.patientName);
    setPatientPhone(rx.patientPhone || "");
    setDoctorName(rx.doctorName || "");
    setDoctorLicense(rx.doctorLicense || "");
    setNotes(rx.notes || "");
    setLines(
      rx.items.length > 0
        ? rx.items.map((item) => ({
            inventoryItemId: item.inventoryItemId ? String(item.inventoryItemId) : "",
            drugName: item.drugName,
            quantity: String(item.quantity),
            dosageInstructions: item.dosageInstructions || "",
            unitPrice: item.unitPrice,
          }))
        : [{ ...emptyLine }],
    );
    setOpen(true);
  }

  function buildPayload() {
    return {
      patientName,
      patientPhone,
      doctorName,
      doctorLicense,
      notes,
      items: lines.map((l) => ({
        inventoryItemId: l.inventoryItemId ? Number(l.inventoryItemId) : null,
        drugName: l.drugName || inventory.find((i) => String(i.id) === l.inventoryItemId)?.name || "Drug",
        quantity: parseInt(l.quantity, 10) || 1,
        dosageInstructions: l.dosageInstructions,
        unitPrice: l.unitPrice,
      })),
    };
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (editingRx) {
        return apiRequest("PATCH", `/api/pharmacy/prescriptions/${editingRx.id}`, payload);
      }
      return apiRequest("POST", "/api/pharmacy/prescriptions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] });
      setOpen(false);
      resetForm();
    },
  });

  const dispenseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/pharmacy/prescriptions/${id}`, { status: "dispensed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pharmacy/prescriptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] });
      setDeleteRx(null);
    },
  });

  function statusBadge(status: string) {
    if (status === "dispensed") return <Badge className="bg-emerald-600">{isAr ? "مصروف" : "Dispensed"}</Badge>;
    if (status === "cancelled") return <Badge variant="destructative">{isAr ? "ملغى" : "Cancelled"}</Badge>;
    return <Badge variant="outline">{isAr ? "معلق" : "Pending"}</Badge>;
  }

  function statusLabel(status: string) {
    if (status === "dispensed") return isAr ? "مصروف" : "Dispensed";
    if (status === "cancelled") return isAr ? "ملغى" : "Cancelled";
    return isAr ? "معلق" : "Pending";
  }

  function printPrescription(rx: RxWithItems) {
    const w = window.open("", "_blank");
    if (!w) return;
    const storeName = branding?.name || "PharmaPOS";
    const dateStr = new Date(rx.createdAt).toLocaleString(isAr ? "ar-IQ" : "en-GB");
    const align = isAr ? "right" : "left";
    const itemsHtml = rx.items
      .map(
        (item) =>
          `<tr><td>${item.drugName}</td><td>${item.quantity}</td><td>${item.dosageInstructions || "—"}</td><td>${fmt(item.unitPrice)}</td><td>${fmt(parseFloat(item.unitPrice) * item.quantity)}</td></tr>`,
      )
      .join("");

    w.document.write(`<!DOCTYPE html><html dir="${isAr ? "rtl" : "ltr"}"><head><title>${rx.prescriptionNumber}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;max-width:720px;margin:0 auto;color:#111}
        h1{font-size:20px;margin:0 0 4px;color:#0d9488}h2{font-size:13px;color:#666;font-weight:normal;margin:0 0 20px}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
        .meta div{padding:10px;background:#f0fdfa;border-radius:8px;font-size:13px}
        .meta strong{display:block;font-size:11px;color:#666;margin-bottom:4px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ddd;padding:8px;text-align:${align};font-size:12px}
        th{background:#ccfbf1}
        .total{text-align:${isAr ? "left" : "right"};margin-top:16px;font-size:16px;font-weight:bold}
        .notes{margin-top:16px;padding:10px;background:#fafafa;border-radius:8px;font-size:12px}
      </style></head><body>
      <h1>${storeName}</h1>
      <h2>${isAr ? "وصفة طبية" : "Medical Prescription"} — ${rx.prescriptionNumber}</h2>
      <div class="meta">
        <div><strong>${isAr ? "المريض" : "Patient"}</strong>${rx.patientName}${rx.patientPhone ? `<br>${rx.patientPhone}` : ""}</div>
        <div><strong>${isAr ? "الطبيب" : "Doctor"}</strong>${rx.doctorName || "—"}${rx.doctorLicense ? `<br>${rx.doctorLicense}` : ""}</div>
        <div><strong>${isAr ? "التاريخ" : "Date"}</strong>${dateStr}</div>
        <div><strong>${isAr ? "الحالة" : "Status"}</strong>${statusLabel(rx.status)}</div>
      </div>
      <table>
        <tr><th>${isAr ? "الدواء" : "Drug"}</th><th>${isAr ? "الكمية" : "Qty"}</th><th>${isAr ? "التعليمات" : "Instructions"}</th><th>${isAr ? "السعر" : "Price"}</th><th>${isAr ? "المجموع" : "Total"}</th></tr>
        ${itemsHtml}
      </table>
      <div class="total">${isAr ? "الإجمالي" : "Total"}: ${fmt(rx.totalAmount)} IQD</div>
      ${rx.notes ? `<div class="notes"><strong>${isAr ? "ملاحظات" : "Notes"}:</strong> ${rx.notes}</div>` : ""}
      <script>window.onload=function(){setTimeout(function(){window.print();window.close();},300);}</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><FilePlus2 className="h-6 w-6 text-teal-500" />{isAr ? "الوصفات الطبية" : "Prescriptions"}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? "تسجيل وصرف الوصفات" : "Register and dispense prescriptions"}</p>
        </div>
        <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700"><Plus className="h-4 w-4 me-2" />{isAr ? "وصفة جديدة" : "New Prescription"}</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "الرقم" : "Rx #"}</TableHead>
                <TableHead>{isAr ? "المريض" : "Patient"}</TableHead>
                <TableHead>{isAr ? "الطبيب" : "Doctor"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
                <TableHead className="text-end">{isAr ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell className="font-mono">{rx.prescriptionNumber}</TableCell>
                  <TableCell><div>{rx.patientName}</div>{rx.patientPhone && <div className="text-xs text-muted-foreground">{rx.patientPhone}</div>}</TableCell>
                  <TableCell>{rx.doctorName || "—"}</TableCell>
                  <TableCell>{statusBadge(rx.status)}</TableCell>
                  <TableCell>{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" title={isAr ? "طباعة" : "Print"} onClick={() => printPrescription(rx)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title={isAr ? "تعديل" : "Edit"} onClick={() => openEdit(rx)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" title={isAr ? "حذف" : "Delete"} onClick={() => setDeleteRx(rx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {rx.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => dispenseMutation.mutate(rx.id)} disabled={dispenseMutation.isPending}>
                          <CheckCircle2 className="h-4 w-4 me-1" />{isAr ? "صرف" : "Dispense"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {prescriptions.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{isAr ? "لا توجد وصفات" : "No prescriptions yet"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingRx ? (isAr ? "تعديل الوصفة" : "Edit Prescription") : (isAr ? "وصفة جديدة" : "New Prescription")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder={isAr ? "اسم المريض" : "Patient name"} value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            <Input placeholder={isAr ? "هاتف المريض" : "Patient phone"} value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} />
            <Input placeholder={isAr ? "اسم الطبيب" : "Doctor name"} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            <Input placeholder={isAr ? "رقم ترخيص الطبيب" : "Doctor license"} value={doctorLicense} onChange={(e) => setDoctorLicense(e.target.value)} />
            <Input placeholder={isAr ? "ملاحظات" : "Notes"} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <p className="text-sm font-medium">{isAr ? "الأدوية" : "Medications"}</p>
            {lines.map((line, idx) => (
              <div key={idx} className="grid gap-2 border rounded-lg p-3">
                <Select
                  value={line.inventoryItemId}
                  onValueChange={(v) => {
                    const drug = inventory.find((i) => String(i.id) === v);
                    const next = [...lines];
                    next[idx] = {
                      ...line,
                      inventoryItemId: v,
                      drugName: drug?.name || line.drugName,
                      unitPrice: drug?.sellingPrice || line.unitPrice,
                    };
                    setLines(next);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={isAr ? "اختر دواء" : "Select drug"} /></SelectTrigger>
                  <SelectContent>{inventory.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={isAr ? "الكمية" : "Qty"} value={line.quantity} onChange={(e) => { const next = [...lines]; next[idx].quantity = e.target.value; setLines(next); }} />
                  <Input placeholder={isAr ? "التعليمات" : "Instructions"} value={line.dosageInstructions} onChange={(e) => { const next = [...lines]; next[idx].dosageInstructions = e.target.value; setLines(next); }} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { ...emptyLine }])}>
              {isAr ? "+ دواء" : "+ Add drug"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!patientName || saveMutation.isPending} className="bg-teal-600">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRx} onOpenChange={(v) => !v && setDeleteRx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? "حذف الوصفة؟" : "Delete prescription?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? `سيتم حذف الوصفة ${deleteRx?.prescriptionNumber} نهائياً.`
                : `This will permanently delete ${deleteRx?.prescriptionNumber}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRx && deleteMutation.mutate(deleteRx.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "حذف" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
