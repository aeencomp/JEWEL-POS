import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { GrocerySupplier, InventoryItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Phone, MapPin, Edit2, Search, Trash2, PackagePlus } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export default function GrocerySuppliers() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editing, setEditing] = useState<GrocerySupplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GrocerySupplier | null>(null);
  const [search, setSearch] = useState("");
  const [stockItemId, setStockItemId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockCost, setStockCost] = useState("");

  const { data: suppliers = [], isLoading } = useQuery<GrocerySupplier[]>({
    queryKey: ["/api/grocery/suppliers"],
  });

  const { data: products = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", address: "", notes: "" } });

  const saveMutation = useMutation({
    mutationFn: (data: z.infer<typeof schema>) =>
      editing
        ? apiRequest("PATCH", `/api/grocery/suppliers/${editing.id}`, data)
        : apiRequest("POST", "/api/grocery/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery/suppliers"] });
      toast({ title: editing ? (isAr ? "تم التحديث" : "Updated") : (isAr ? "تمت الإضافة" : "Added") });
      setShowDialog(false);
      setEditing(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/grocery/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery/suppliers"] });
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
      setDeleteTarget(null);
    },
  });

  const stockInMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/grocery/stock-in", {
        inventoryItemId: parseInt(stockItemId, 10),
        quantity: parseInt(stockQty, 10),
        costPrice: stockCost || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: isAr ? "تمت إضافة المخزون" : "Stock received" });
      setStockOpen(false);
      setStockItemId("");
      setStockQty("");
      setStockCost("");
    },
    onError: (err: Error) => {
      toast({ title: isAr ? "فشل استلام المخزون" : "Stock-in failed", description: err.message, variant: "destructive" });
    },
  });

  const filtered = suppliers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || "").includes(search),
  );

  function openEdit(s: GrocerySupplier) {
    setEditing(s);
    form.reset({ name: s.name, phone: s.phone || "", address: s.address || "", notes: s.notes || "" });
    setShowDialog(true);
  }

  function openNew() {
    setEditing(null);
    form.reset({ name: "", phone: "", address: "", notes: "" });
    setShowDialog(true);
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-green-500" />
            {isAr ? "الموردون" : "Suppliers"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? "إدارة الموردين واستلام المخزون" : "Manage suppliers and receive stock"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStockOpen(true)}>
            <PackagePlus className="h-4 w-4 me-2" />
            {isAr ? "استلام مخزون" : "Receive Stock"}
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={openNew}>
            <Plus className="h-4 w-4 me-2" />
            {isAr ? "مورد جديد" : "Add Supplier"}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="ps-9" placeholder={isAr ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  {s.phone && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3.5 w-3.5" />{s.phone}</p>}
                  {s.address && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" />{s.address}</p>}
                  {s.notes && <p className="text-xs text-muted-foreground mt-2">{s.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">{isAr ? "لا يوجد موردون" : "No suppliers yet"}</p>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل مورد" : "Edit Supplier") : (isAr ? "مورد جديد" : "New Supplier")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{isAr ? "الاسم" : "Name"}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>{isAr ? "الهاتف" : "Phone"}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>{isAr ? "العنوان" : "Address"}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>{isAr ? "ملاحظات" : "Notes"}</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
              )} />
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={saveMutation.isPending}>
                {isAr ? "حفظ" : "Save"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? "استلام مخزون من المورد" : "Receive Stock"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={stockItemId} onValueChange={setStockItemId}>
              <SelectTrigger><SelectValue placeholder={isAr ? "اختر المنتج" : "Select product"} /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" min={1} placeholder={isAr ? "الكمية" : "Quantity"} value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
            <Input placeholder={isAr ? "سعر التكلفة (اختياري)" : "Cost price (optional)"} value={stockCost} onChange={(e) => setStockCost(e.target.value)} />
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!stockItemId || !stockQty || stockInMutation.isPending}
              onClick={() => stockInMutation.mutate()}
            >
              {isAr ? "تأكيد الاستلام" : "Confirm Receipt"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? "حذف المورد؟" : "Delete supplier?"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{deleteTarget?.name}</p>
          <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
            {isAr ? "حذف" : "Delete"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
