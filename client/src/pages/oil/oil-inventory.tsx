import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { OilProduct } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, AlertTriangle, Edit2, Search } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  category: z.enum(["finished_oil", "raw_material", "packaging", "spare_part", "other"]),
  unit: z.enum(["liter", "kg", "piece", "barrel", "ton"]),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  currentStock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  description: z.string().optional(),
});

const categoryColors: Record<string, string> = {
  finished_oil: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  raw_material: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  packaging: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  spare_part: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  other: "bg-muted text-muted-foreground",
};

const categoryLabels: Record<string, { en: string; ar: string }> = {
  finished_oil: { en: "Finished Oil", ar: "زيت جاهز" },
  raw_material: { en: "Raw Material", ar: "مادة خام" },
  packaging: { en: "Packaging", ar: "تعبئة" },
  spare_part: { en: "Spare Part", ar: "قطعة غيار" },
  other: { en: "Other", ar: "أخرى" },
};

export default function OilInventory() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<OilProduct | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const { data: products = [], isLoading } = useQuery<OilProduct[]>({
    queryKey: ["/api/oil/products"],
    queryFn: () => fetch("/api/oil/products", { credentials: "include" }).then(r => r.json()),
  });

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", nameAr: "", category: "finished_oil" as const, unit: "liter" as const, purchasePrice: 0, salePrice: 0, currentStock: 0, minStock: 0, description: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PATCH", `/api/oil/products/${editing.id}`, data)
      : apiRequest("POST", "/api/oil/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: editing ? (isAr ? "تم التحديث" : "Updated") : (isAr ? "تمت الإضافة" : "Added") });
      setShowDialog(false);
      setEditing(null);
      form.reset();
    },
  });

  const openEdit = (p: OilProduct) => {
    setEditing(p);
    form.reset({
      name: p.name, nameAr: p.nameAr || "", category: p.category as any, unit: p.unit as any,
      purchasePrice: parseFloat(p.purchasePrice), salePrice: parseFloat(p.salePrice),
      currentStock: parseFloat(p.currentStock), minStock: parseFloat(p.minStock),
      description: p.description || "",
    });
    setShowDialog(true);
  };

  const filtered = products.filter(p => {
    const matchCat = catFilter === "all" || p.category === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.nameAr || "").includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-500" />
          <h1 className="text-xl font-semibold">{isAr ? "المخزون" : "Inventory"}</h1>
          <Badge variant="secondary">{products.length}</Badge>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); form.reset(); setShowDialog(true); }} data-testid="button-add-product">
          <Plus className="h-4 w-4 me-1" />{isAr ? "إضافة منتج" : "Add Product"}
        </Button>
      </div>

      <div className="px-6 py-3 border-b flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="ps-9" placeholder={isAr ? "بحث..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44" data-testid="select-category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الفئات" : "All Categories"}</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{isAr ? v.ar : v.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{isAr ? "لا توجد منتجات" : "No products found"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => {
              const isLow = parseFloat(p.currentStock) <= parseFloat(p.minStock) && parseFloat(p.minStock) > 0;
              const catLabel = categoryLabels[p.category];
              return (
                <Card key={p.id} className={`overflow-hidden ${isLow ? "border-amber-300 dark:border-amber-700" : ""}`} data-testid={`card-product-${p.id}`}>
                  <div className={`h-1.5 ${p.category === "finished_oil" ? "bg-blue-500" : p.category === "raw_material" ? "bg-orange-500" : "bg-muted"}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        {p.nameAr && <p className="text-xs text-muted-foreground">{p.nameAr}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => openEdit(p)} data-testid={`button-edit-product-${p.id}`}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{isAr ? "المخزون" : "Stock"}</span>
                        <span className={`font-bold ${isLow ? "text-amber-600" : "text-foreground"}`}>
                          {parseFloat(p.currentStock).toLocaleString()} {p.unit}
                          {isLow && <AlertTriangle className="h-3.5 w-3.5 inline ms-1 text-amber-500" />}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{isAr ? "سعر البيع" : "Sale Price"}</span>
                        <span className="font-medium text-green-600">{parseFloat(p.salePrice).toLocaleString()} IQD/{p.unit}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{isAr ? "سعر الشراء" : "Purchase Price"}</span>
                        <span className="font-medium text-blue-600">{parseFloat(p.purchasePrice).toLocaleString()} IQD/{p.unit}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Badge className={`text-[10px] ${categoryColors[p.category]}`}>{isAr ? catLabel.ar : catLabel.en}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg" data-testid="dialog-product">
          <DialogHeader>
            <DialogTitle>{editing ? (isAr ? "تعديل منتج" : "Edit Product") : (isAr ? "إضافة منتج" : "Add Product")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMutation.mutate(v))} className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>{isAr ? "الاسم (إنجليزي)" : "Name (English)"}</FormLabel>
                  <FormControl><Input {...field} data-testid="input-product-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nameAr" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>{isAr ? "الاسم (عربي)" : "Name (Arabic)"}</FormLabel>
                  <FormControl><Input {...field} data-testid="input-product-name-ar" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "الفئة" : "Category"}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-product-category"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{isAr ? v.ar : v.en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "الوحدة" : "Unit"}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-product-unit"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["liter", "kg", "piece", "barrel", "ton"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "سعر الشراء (IQD)" : "Purchase Price (IQD)"}</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-purchase-price" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="salePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "سعر البيع (IQD)" : "Sale Price (IQD)"}</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-sale-price" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currentStock" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "المخزون الحالي" : "Current Stock"}</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-current-stock" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="minStock" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "الحد الأدنى" : "Min Stock"}</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-min-stock" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>{isAr ? "ملاحظات" : "Notes"}</FormLabel>
                  <FormControl><Textarea {...field} rows={2} className="resize-none" data-testid="input-product-description" /></FormControl>
                </FormItem>
              )} />
              <div className="col-span-2 flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-submit-product">{isAr ? "حفظ" : "Save"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
