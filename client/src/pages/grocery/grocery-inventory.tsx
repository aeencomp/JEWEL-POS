import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import type { InventoryItem, Category } from "@shared/schema";
import { apiRequest, queryClient, parseApiErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateInventoryBarcode } from "@/lib/barcode";
import { buildPharmacyLabelPrintHtml } from "@/lib/linear-barcode";
import { printHtmlDocument } from "@/lib/print-window";
import { FashionLabelPreview } from "@/components/fashion-label-preview";
import { getEffectiveStoreId } from "@/lib/pos-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, ShoppingBasket, Loader2, RefreshCw, Barcode, Printer } from "lucide-react";

type ProductForm = {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  brand: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: string;
  sellingPrice: string;
  quantity: string;
};

const emptyForm: ProductForm = {
  name: "", sku: "", barcode: "", categoryId: "", brand: "", batchNumber: "", expiryDate: "",
  costPrice: "", sellingPrice: "", quantity: "0",
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
  if (!Number.isFinite(n) || n < 0) throw new Error("invalid price");
  return n.toFixed(2);
}

export default function GroceryInventory() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [barcodeItem, setBarcodeItem] = useState<InventoryItem | null>(null);

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const categoryId = parseInt(form.categoryId, 10);
      if (!categoryId) throw new Error(isAr ? "اختر الفئة" : "Select a category");
      const costPrice = normalizePrice(form.costPrice);
      const sellingPrice = normalizePrice(form.sellingPrice);
      const qty = Math.max(0, parseInt(form.quantity, 10) || 0);
      const expiryDate = toIsoExpiry(form.expiryDate);
      if (form.expiryDate.trim() && !expiryDate) {
        throw new Error(isAr ? "تاريخ الصلاحية غير صالح" : "Invalid expiry date");
      }
      const body = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        categoryId,
        brand: form.brand.trim() || null,
        batchNumber: form.batchNumber.trim() || null,
        expiryDate,
        costPrice,
        sellingPrice,
        quantity: qty,
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
          ? (isAr ? "تم تحديث المنتج" : "Product updated")
          : (isAr ? "تمت إضافة المنتج" : "Product added"),
      });
    },
    onError: (err: Error) => {
      toast({ title: isAr ? "فشل الحفظ" : "Save failed", description: parseApiErrorMessage(err), variant: "destructive" });
    },
  });

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()),
  );

  function nextGrocerySku(list: InventoryItem[]) {
    const nums = list.map((i) => i.sku.match(/^GRC-(\d+)$/i)?.[1]).filter(Boolean).map((n) => parseInt(n!, 10));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `GRC-${String(next).padStart(4, "0")}`;
  }

  function generateBarcode(sku: string, list: InventoryItem[] = items) {
    const storeId = getEffectiveStoreId(user);
    if (!storeId) return "";
    return generateInventoryBarcode(storeId, "grocery", sku, list);
  }

  function openNew() {
    setEditing(null);
    const sku = nextGrocerySku(items);
    setForm({ ...emptyForm, categoryId: categories[0] ? String(categories[0].id) : "", sku, barcode: generateBarcode(sku) });
    setOpen(true);
  }

  function printBarcodeLabel(item: InventoryItem): boolean {
    const code = item.barcode || item.sku;
    if (!code) {
      toast({ title: isAr ? "لا يوجد باركود" : "No barcode", variant: "destructive" });
      return false;
    }
    try {
      const labelHtml = buildPharmacyLabelPrintHtml({
        name: item.name,
        price: parseFloat(item.sellingPrice).toLocaleString(),
        barcodeValue: code,
        strength: item.brand || undefined,
      });
      return printHtmlDocument(labelHtml, "width=320,height=480");
    } catch {
      toast({ title: isAr ? "فشلت الطباعة" : "Print failed", variant: "destructive" });
      return false;
    }
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || "",
      categoryId: String(item.categoryId),
      brand: item.brand || "",
      batchNumber: item.batchNumber || "",
      expiryDate: toDateInputValue(item.expiryDate),
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      quantity: String(item.quantity),
    });
    setOpen(true);
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><ShoppingBasket className="h-6 w-6 text-green-500" />{isAr ? "مخزون المنتجات" : "Product Inventory"}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? "إدارة المنتجات، الباركود، والصلاحية" : "Manage products, barcodes, and expiry dates"}</p>
        </div>
        <Button onClick={openNew} className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 me-2" />{isAr ? "منتج جديد" : "Add Product"}</Button>
      </div>

      <Input placeholder={isAr ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "المنتج" : "Product"}</TableHead>
                <TableHead>{isAr ? "الباركود" : "Barcode"}</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>{isAr ? "الماركة" : "Brand"}</TableHead>
                <TableHead>{isAr ? "الصلاحية" : "Expiry"}</TableHead>
                <TableHead>{isAr ? "الكمية" : "Qty"}</TableHead>
                <TableHead>{isAr ? "السعر" : "Price"}</TableHead>
                <TableHead className="w-[140px] text-end">{isAr ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    {(item.barcode || item.sku) ? (
                      <button type="button" className="font-mono text-xs flex items-center gap-1.5 text-green-600 hover:underline" onClick={() => setBarcodeItem(item)}>
                        <Barcode className="h-3.5 w-3.5" />{item.barcode || item.sku}
                      </button>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell>{item.brand || "—"}</TableCell>
                  <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{parseFloat(item.sellingPrice).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      {(item.barcode || item.sku) && (
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => printBarcodeLabel(item)}>
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setEditing(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل منتج" : "Edit Product") : (isAr ? "منتج جديد" : "New Product")}</DialogTitle></DialogHeader>
          <form className="grid gap-3 py-2" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <Input placeholder={isAr ? "اسم المنتج" : "Product name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input readOnly placeholder={isAr ? "الباركود" : "Barcode"} value={form.barcode} className="font-mono bg-muted/50" />
              {!editing && (
                <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, barcode: generateBarcode(f.sku) }))}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input placeholder="SKU" value={form.sku} readOnly={!editing} className="font-mono" onChange={(e) => {
              const sku = e.target.value;
              setForm((f) => ({ ...f, sku, barcode: editing ? f.barcode : generateBarcode(sku) }));
            }} />
            <Select value={form.categoryId || undefined} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder={isAr ? "الفئة" : "Category"} /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder={isAr ? "الماركة" : "Brand"} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={isAr ? "رقم الدفعة" : "Batch no."} value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder={isAr ? "التكلفة" : "Cost"} value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
              <Input placeholder={isAr ? "سعر البيع" : "Price"} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              <Input placeholder={isAr ? "الكمية" : "Qty"} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "حفظ" : "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {barcodeItem && (
        <Dialog open={!!barcodeItem} onOpenChange={(open) => !open && setBarcodeItem(null)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{isAr ? "طباعة باركود المنتج" : "Product Barcode Label"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              <FashionLabelPreview
                className="mx-auto rounded-lg border border-dashed border-green-300/50 shadow-sm"
                name={barcodeItem.name}
                price={parseFloat(barcodeItem.sellingPrice).toLocaleString()}
                barcodeValue={barcodeItem.barcode || barcodeItem.sku}
              />
              {barcodeItem.brand && (
                <p className="text-xs text-muted-foreground text-center">{barcodeItem.brand}</p>
              )}
              <Button type="button" variant="outline" onClick={() => printBarcodeLabel(barcodeItem)} className="gap-2">
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة الملصق" : "Print Label"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
