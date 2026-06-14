import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import type { InventoryItem, Category } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Pill, Loader2 } from "lucide-react";

type DrugForm = {
  name: string;
  sku: string;
  categoryId: string;
  genericName: string;
  activeIngredient: string;
  dosageForm: string;
  strength: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: string;
  sellingPrice: string;
  quantity: string;
  requiresPrescription: boolean;
};

const emptyForm: DrugForm = {
  name: "", sku: "", categoryId: "", genericName: "", activeIngredient: "",
  dosageForm: "", strength: "", batchNumber: "", expiryDate: "",
  costPrice: "", sellingPrice: "", quantity: "0", requiresPrescription: false,
};

export default function PharmacyInventory() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<DrugForm>(emptyForm);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        sku: form.sku,
        categoryId: Number(form.categoryId),
        genericName: form.genericName || null,
        activeIngredient: form.activeIngredient || null,
        dosageForm: form.dosageForm || null,
        strength: form.strength || null,
        batchNumber: form.batchNumber || null,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        costPrice: form.costPrice,
        sellingPrice: form.sellingPrice,
        quantity: parseInt(form.quantity, 10) || 0,
        requiresPrescription: form.requiresPrescription,
        metalType: "other",
        isAvailable: true,
      };
      if (editing) {
        return apiRequest("PATCH", `/api/inventory/${editing.id}`, body);
      }
      return apiRequest("POST", "/api/inventory", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()),
  );

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0] ? String(categories[0].id) : "" });
    setOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      sku: item.sku,
      categoryId: String(item.categoryId),
      genericName: item.genericName || "",
      activeIngredient: item.activeIngredient || "",
      dosageForm: item.dosageForm || "",
      strength: item.strength || "",
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      quantity: String(item.quantity),
      requiresPrescription: item.requiresPrescription || false,
    });
    setOpen(true);
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Pill className="h-6 w-6 text-teal-500" />{isAr ? "مخزون الأدوية" : "Drug Inventory"}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? "إدارة الأدوية، الدفعات، والصلاحية" : "Manage drugs, batches, and expiry dates"}</p>
        </div>
        <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700"><Plus className="h-4 w-4 me-2" />{isAr ? "دواء جديد" : "Add Drug"}</Button>
      </div>

      <Input placeholder={isAr ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "الدواء" : "Drug"}</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>{isAr ? "الشكل" : "Form"}</TableHead>
                <TableHead>{isAr ? "الصلاحية" : "Expiry"}</TableHead>
                <TableHead>{isAr ? "الكمية" : "Qty"}</TableHead>
                <TableHead>{isAr ? "السعر" : "Price"}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    {item.genericName && <div className="text-xs text-muted-foreground">{item.genericName}</div>}
                    {item.requiresPrescription && <Badge variant="outline" className="mt-1 text-xs">Rx</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell>{item.dosageForm || "—"} {item.strength && `/ ${item.strength}`}</TableCell>
                  <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{parseFloat(item.sellingPrice).toLocaleString()}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل دواء" : "Edit Drug") : (isAr ? "دواء جديد" : "New Drug")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder={isAr ? "اسم الدواء" : "Drug name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder={isAr ? "الفئة" : "Category"} /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder={isAr ? "الاسم العلمي" : "Generic name"} value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
            <Input placeholder={isAr ? "المادة الفعالة" : "Active ingredient"} value={form.activeIngredient} onChange={(e) => setForm({ ...form, activeIngredient: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={isAr ? "الشكل الدوائي" : "Dosage form"} value={form.dosageForm} onChange={(e) => setForm({ ...form, dosageForm: e.target.value })} />
              <Input placeholder={isAr ? "التركيز" : "Strength"} value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={isAr ? "رقم الدفعة" : "Batch no."} value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder={isAr ? "التكلفة" : "Cost"} value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
              <Input placeholder={isAr ? "سعر البيع" : "Price"} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              <Input placeholder={isAr ? "الكمية" : "Qty"} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.requiresPrescription} onCheckedChange={(v) => setForm({ ...form, requiresPrescription: !!v })} />
              {isAr ? "يتطلب وصفة طبية" : "Requires prescription (Rx)"}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.sku || !form.categoryId} className="bg-teal-600">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
