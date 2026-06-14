import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import type { InventoryItem, PharmacyPrescription, PharmacyPrescriptionItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FilePlus2, Loader2, CheckCircle2 } from "lucide-react";

type RxWithItems = PharmacyPrescription & { items: PharmacyPrescriptionItem[] };

export default function PharmacyPrescriptions() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorLicense, setDoctorLicense] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([{ inventoryItemId: "", drugName: "", quantity: "1", dosageInstructions: "", unitPrice: "0" }]);

  const { data: prescriptions = [], isLoading } = useQuery<RxWithItems[]>({ queryKey: ["/api/pharmacy/prescriptions"] });
  const { data: inventory = [] } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/pharmacy/prescriptions", {
        patientName,
        patientPhone,
        doctorName,
        doctorLicense,
        notes,
        items: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId ? Number(l.inventoryItemId) : null,
          drugName: l.drugName,
          quantity: parseInt(l.quantity, 10) || 1,
          dosageInstructions: l.dosageInstructions,
          unitPrice: l.unitPrice,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] });
      setOpen(false);
      setPatientName("");
      setPatientPhone("");
      setDoctorName("");
      setDoctorLicense("");
      setNotes("");
      setLines([{ inventoryItemId: "", drugName: "", quantity: "1", dosageInstructions: "", unitPrice: "0" }]);
    },
  });

  const dispenseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/pharmacy/prescriptions/${id}`, { status: "dispensed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] }),
  });

  function statusBadge(status: string) {
    if (status === "dispensed") return <Badge className="bg-emerald-600">{isAr ? "مصروف" : "Dispensed"}</Badge>;
    if (status === "cancelled") return <Badge variant="destructive">{isAr ? "ملغى" : "Cancelled"}</Badge>;
    return <Badge variant="outline">{isAr ? "معلق" : "Pending"}</Badge>;
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><FilePlus2 className="h-6 w-6 text-teal-500" />{isAr ? "الوصفات الطبية" : "Prescriptions"}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? "تسجيل وصرف الوصفات" : "Register and dispense prescriptions"}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="h-4 w-4 me-2" />{isAr ? "وصفة جديدة" : "New Prescription"}</Button>
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
                <TableHead></TableHead>
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
                    {rx.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => dispenseMutation.mutate(rx.id)} disabled={dispenseMutation.isPending}>
                        <CheckCircle2 className="h-4 w-4 me-1" />{isAr ? "صرف" : "Dispense"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isAr ? "وصفة جديدة" : "New Prescription"}</DialogTitle></DialogHeader>
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
            <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { inventoryItemId: "", drugName: "", quantity: "1", dosageInstructions: "", unitPrice: "0" }])}>
              {isAr ? "+ دواء" : "+ Add drug"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!patientName || createMutation.isPending} className="bg-teal-600">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
