import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import type { InventoryItem, Category } from "@shared/schema";
import { apiRequest, queryClient, parseApiErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateInventoryBarcode } from "@/lib/barcode";
import { buildPharmacyLabelPrintHtml } from "@/lib/linear-barcode";
import { FashionLabelPreview } from "@/components/fashion-label-preview";
import { getEffectiveStoreId } from "@/lib/pos-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Pill, Loader2, RefreshCw, Barcode, Printer } from "lucide-react";

type DrugForm = {
  name: string;
  sku: string;
  barcode: string;
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
  name: "", sku: "", barcode: "", categoryId: "", genericName: "", activeIngredient: "",
  dosageForm: "", strength: "", batchNumber: "", expiryDate: "",
  costPrice: "", sellingPrice: "", quantity: "0", requiresPrescription: false,
};

function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toIsoExpiry(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizePrice(value: string): string {
  const cleaned = value.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("invalid price");
  }
  return n.toFixed(2);
}

export default function PharmacyInventory() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<DrugForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [barcodeItem, setBarcodeItem] = useState<InventoryItem | null>(null);

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const categoryId = parseInt(form.categoryId, 10);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        throw new Error(isAr ? "اختر فئة صحيحة" : "Select a valid category");
      }
      const qty = parseInt(form.quantity, 10);
      if (!Number.isFinite(qty) || qty < 0) {
        throw new Error(isAr ? "الكمية يجب أن تكون رقمًا صحيحًا" : "Quantity must be a whole number");
      }
      let costPrice: string;
      let sellingPrice: string;
      try {
        costPrice = normalizePrice(form.costPrice);
        sellingPrice = normalizePrice(form.sellingPrice);
      } catch {
        throw new Error(isAr ? "أدخل أسعارًا صحيحة" : "Enter valid prices");
      }
      const expiryDate = toIsoExpiry(form.expiryDate);
      if (form.expiryDate.trim() && !expiryDate) {
        throw new Error(isAr ? "تاريخ الصلاحية غير صالح" : "Invalid expiry date");
      }
      const body = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        categoryId,
        genericName: form.genericName.trim() || null,
        activeIngredient: form.activeIngredient.trim() || null,
        dosageForm: form.dosageForm.trim() || null,
        strength: form.strength.trim() || null,
        batchNumber: form.batchNumber.trim() || null,
        expiryDate,
        costPrice,
        sellingPrice,
        quantity: qty,
        requiresPrescription: form.requiresPrescription,
        metalType: "other" as const,
        isAvailable: true,
      };
      if (editing) {
        await apiRequest("PATCH", `/api/inventory/${editing.id}`, body);
      } else {
        await apiRequest("POST", "/api/inventory", body);
      }
    },
    onSuccess: () => {
      const wasEdit = !!editing;
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({
        title: isAr ? "تم الحفظ" : "Saved",
        description: wasEdit
          ? (isAr ? "تم تحديث الدواء بنجاح" : "Drug updated successfully")
          : (isAr ? "تمت إضافة الدواء بنجاح" : "Drug added successfully"),
      });
    },
    onError: (err: Error) => {
      toast({
        title: isAr ? "فشل الحفظ" : "Save failed",
        description: parseApiErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()),
  );

  function nextPharmacySku(list: InventoryItem[]) {
    const nums = list
      .map((i) => i.sku.match(/^PHM-(\d+)$/i)?.[1])
      .filter(Boolean)
      .map((n) => parseInt(n!, 10));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `PHM-${String(next).padStart(4, "0")}`;
  }

  function generateBarcode(sku: string, list: InventoryItem[] = items) {
    const storeId = getEffectiveStoreId(user);
    if (!storeId) return "";
    return generateInventoryBarcode(storeId, "pharmacy", sku, list);
  }

  function openNew() {
    setEditing(null);
    const sku = nextPharmacySku(items);
    const barcode = generateBarcode(sku);
    setForm({
      ...emptyForm,
      categoryId: categories[0] ? String(categories[0].id) : "",
      sku,
      barcode,
    });
    setOpen(true);
  }

  function printBarcodeLabel(item: InventoryItem) {
    const code = item.barcode || item.sku;
    if (!code) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const labelHtml = buildPharmacyLabelPrintHtml({
      name: item.name,
      price: parseFloat(item.sellingPrice).toLocaleString(),
      barcodeValue: code,
      strength: item.strength,
      dosageForm: item.dosageForm,
    });
    printWindow.document.write(labelHtml);
    printWindow.document.close();
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || "",
      categoryId: String(item.categoryId),
      genericName: item.genericName || "",
      activeIngredient: item.activeIngredient || "",
      dosageForm: item.dosageForm || "",
      strength: item.strength || "",
      batchNumber: item.batchNumber || "",
      expiryDate: toDateInputValue(item.expiryDate),
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
                <TableHead>{isAr ? "الباركود" : "Barcode"}</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>{isAr ? "الشكل" : "Form"}</TableHead>
                <TableHead>{isAr ? "الصلاحية" : "Expiry"}</TableHead>
                <TableHead>{isAr ? "الكمية" : "Qty"}</TableHead>
                <TableHead>{isAr ? "السعر" : "Price"}</TableHead>
                <TableHead className="w-[140px] text-end">{isAr ? "إجراءات" : "Actions"}</TableHead>
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
                  <TableCell>
                    {(item.barcode || item.sku) ? (
                      <button
                        type="button"
                        className="font-mono text-xs flex items-center gap-1.5 text-teal-400 hover:text-teal-300 hover:underline transition-colors"
                        title={isAr ? "طباعة باركود" : "Print barcode label"}
                        onClick={() => setBarcodeItem(item)}
                      >
                        <Barcode className="h-3.5 w-3.5 shrink-0" />
                        {item.barcode || item.sku}
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell>{item.dosageForm || "—"} {item.strength && `/ ${item.strength}`}</TableCell>
                  <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{parseFloat(item.sellingPrice).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      {(item.barcode || item.sku) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
                          title={isAr ? "طباعة باركود" : "Print barcode"}
                          onClick={() => setBarcodeItem(item)}
                          data-testid={`button-print-barcode-${item.id}`}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          {isAr ? "طباعة" : "Print"}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)} title={isAr ? "تعديل" : "Edit"}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditing(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل دواء" : "Edit Drug") : (isAr ? "دواء جديد" : "New Drug")}</DialogTitle></DialogHeader>
          <form
            className="grid gap-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <Input placeholder={isAr ? "اسم الدواء" : "Drug name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                readOnly
                placeholder={isAr ? "الباركود" : "Barcode"}
                value={form.barcode}
                className="font-mono bg-muted/50"
              />
              {!editing && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={isAr ? "توليد باركود جديد" : "Regenerate barcode"}
                  onClick={() => setForm((f) => ({ ...f, barcode: generateBarcode(f.sku) }))}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              placeholder="SKU"
              value={form.sku}
              readOnly={!editing}
              className={!editing ? "font-mono bg-muted/50" : "font-mono"}
              onChange={(e) => {
                const sku = e.target.value;
                setForm((f) => ({
                  ...f,
                  sku,
                  barcode: editing ? f.barcode : generateBarcode(sku),
                }));
              }}
            />
            <Select value={form.categoryId || undefined} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
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
            <DialogFooter className="px-0 pb-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || !form.name.trim() || !form.sku.trim() || !form.categoryId || !form.costPrice.trim() || !form.sellingPrice.trim()}
                className="bg-teal-600"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "حفظ" : "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!barcodeItem} onOpenChange={(open) => !open && setBarcodeItem(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{isAr ? "طباعة باركود الدواء" : "Drug Barcode Label"}</DialogTitle>
          </DialogHeader>
          {barcodeItem && (
            <div className="flex flex-col items-center gap-4">
              <FashionLabelPreview
                className="mx-auto rounded-lg border border-dashed border-teal-300/50 shadow-sm"
                name={barcodeItem.name}
                price={parseFloat(barcodeItem.sellingPrice).toLocaleString()}
                barcodeValue={barcodeItem.barcode || barcodeItem.sku}
              />
              {(barcodeItem.dosageForm || barcodeItem.strength) && (
                <p className="text-xs text-muted-foreground text-center">
                  {[barcodeItem.dosageForm, barcodeItem.strength].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="text-[10px] text-center text-muted-foreground">
                {isAr ? "ملصق حراري 50×25 مم" : "Thermal label 50×25 mm"}
              </p>
              <Button variant="outline" onClick={() => printBarcodeLabel(barcodeItem)} className="gap-2">
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة الملصق" : "Print Label"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  printBarcodeLabel(barcodeItem);
                  setBarcodeItem(null);
                }}
              >
                {isAr ? "طباعة وإغلاق" : "Print & close"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
