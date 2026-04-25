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
import {
  Boxes, Plus, AlertTriangle, Edit2, Search, Trash2,
  TrendingDown, ShoppingCart, FlaskConical, ChevronDown, ChevronUp,
  Package,
} from "lucide-react";

function fmt(n: string | number) {
  return parseFloat(String(n || 0)).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const RAW_CATEGORIES = ["raw_material", "packaging", "spare_part", "other"] as const;

const categoryColors: Record<string, string> = {
  raw_material: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  packaging:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  spare_part:   "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  other:        "bg-muted text-muted-foreground",
};

const categoryLabels: Record<string, { en: string; ar: string }> = {
  raw_material: { en: "Raw Material", ar: "مادة خام" },
  packaging:    { en: "Packaging",    ar: "تعبئة" },
  spare_part:   { en: "Spare Part",   ar: "قطعة غيار" },
  other:        { en: "Other",        ar: "أخرى" },
};

const productSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  category: z.enum(RAW_CATEGORIES),
  unit: z.enum(["liter", "kg", "piece", "barrel", "ton"]),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  currentStock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  description: z.string().optional(),
});

type Tab = "raw" | "purchases";

export default function OilMaterials() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [tab, setTab] = useState<Tab>("raw");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<OilProduct | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteToConfirm, setDeleteToConfirm] = useState<OilProduct | null>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery<OilProduct[]>({
    queryKey: ["/api/oil/products"],
    queryFn: () => fetch("/api/oil/products", { credentials: "include" }).then(r => r.json()),
  });

  const { data: summary = [], isLoading: summaryLoading } = useQuery<any[]>({
    queryKey: ["/api/oil/materials-summary"],
    queryFn: () => fetch("/api/oil/materials-summary", { credentials: "include" }).then(r => r.json()),
    enabled: tab === "purchases",
  });

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", nameAr: "", category: "raw_material" as const, unit: "kg" as const,
      purchasePrice: 0, salePrice: 0, currentStock: 0, minStock: 0, description: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PATCH", `/api/oil/products/${editing.id}`, data)
      : apiRequest("POST", "/api/oil/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/materials-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: editing ? (isAr ? "تم التحديث" : "Updated") : (isAr ? "تمت الإضافة" : "Added") });
      setShowDialog(false); setEditing(null); form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/oil/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/materials-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
      setDeleteToConfirm(null);
    },
    onError: () => toast({ title: isAr ? "فشل الحذف" : "Delete failed", variant: "destructive" }),
  });

  function openEdit(p: OilProduct) {
    setEditing(p);
    form.reset({
      name: p.name, nameAr: p.nameAr || "", category: p.category as any, unit: p.unit as any,
      purchasePrice: parseFloat(p.purchasePrice), salePrice: parseFloat(p.salePrice),
      currentStock: parseFloat(p.currentStock), minStock: parseFloat(p.minStock),
      description: p.description || "",
    });
    setShowDialog(true);
  }

  function openAdd() {
    setEditing(null);
    form.reset({ name: "", nameAr: "", category: "raw_material", unit: "kg", purchasePrice: 0, salePrice: 0, currentStock: 0, minStock: 0, description: "" });
    setShowDialog(true);
  }

  // Raw materials tab: products filtered to raw categories
  const rawProducts = products.filter(p => RAW_CATEGORIES.includes(p.category as any));
  const filteredRaw = rawProducts.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.nameAr || "").includes(search)
  );

  // Purchase summary tab
  const filteredSummary = summary.filter((s: any) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.nameAr || "").includes(search)
  );

  // Totals for purchases tab
  const totalPurchasedValue = summary.reduce((acc: number, s: any) => acc + (s.totalPurchasedValue || 0), 0);
  const totalCurrentStock = summary.reduce((acc: number, s: any) => acc + parseFloat(s.currentStock || 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Boxes className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isAr ? "مخزون المواد" : "Materials Inventory"}
            </h1>
            <p className="text-xs text-slate-400">
              {tab === "raw"
                ? `${rawProducts.length} ${isAr ? "مادة" : "materials"}`
                : `${summary.length} ${isAr ? "منتج مشترى" : "purchased products"}`}
            </p>
          </div>
        </div>
        {tab === "raw" && (
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm" onClick={openAdd} data-testid="button-add-material">
            <Plus className="h-4 w-4 me-1" />{isAr ? "إضافة مادة" : "Add Material"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 pb-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex gap-1">
        <button
          data-testid="tab-raw"
          onClick={() => { setTab("raw"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-colors ${
            tab === "raw"
              ? "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          {isAr ? "مواد خام" : "Raw Materials"}
          <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 px-1.5 rounded-full font-bold">
            {rawProducts.length}
          </span>
        </button>
        <button
          data-testid="tab-purchases"
          onClick={() => { setTab("purchases"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-colors ${
            tab === "purchases"
              ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          {isAr ? "مخزون المشتريات" : "Purchase Stock"}
          <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-1.5 rounded-full font-bold">
            {summary.length}
          </span>
        </button>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={isAr ? "بحث..." : "Search..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-materials"
          />
        </div>
      </div>

      {/* ── TAB: Raw Materials ────────────────────────────── */}
      {tab === "raw" && (
        <div className="flex-1 overflow-y-auto p-5">
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : filteredRaw.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{isAr ? "لا توجد مواد خام" : "No raw materials yet"}</p>
              <Button size="sm" className="mt-4 bg-orange-600 hover:bg-orange-700 text-white" onClick={openAdd}>
                <Plus className="h-4 w-4 me-1" />{isAr ? "إضافة مادة" : "Add Material"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRaw.map(p => {
                const isLow = parseFloat(p.currentStock) <= parseFloat(p.minStock) && parseFloat(p.minStock) > 0;
                const catLabel = categoryLabels[p.category];
                return (
                  <Card key={p.id} className={`overflow-hidden ${isLow ? "border-amber-300 dark:border-amber-700" : ""}`} data-testid={`card-material-${p.id}`}>
                    <div className={`h-1.5 ${p.category === "raw_material" ? "bg-orange-500" : p.category === "packaging" ? "bg-purple-500" : "bg-slate-300"}`} />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          {p.nameAr && <p className="text-xs text-muted-foreground">{p.nameAr}</p>}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => openEdit(p)} data-testid={`button-edit-material-${p.id}`}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeleteToConfirm(p)} data-testid={`button-delete-material-${p.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{isAr ? "المخزون الحالي" : "Current Stock"}</span>
                          <span className={`font-bold ${isLow ? "text-amber-600" : "text-foreground"}`}>
                            {fmt(p.currentStock)} {p.unit}
                            {isLow && <AlertTriangle className="h-3.5 w-3.5 inline ms-1 text-amber-500" />}
                          </span>
                        </div>
                        {parseFloat(p.minStock) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{isAr ? "الحد الأدنى" : "Min Stock"}</span>
                            <span className="text-slate-500">{fmt(p.minStock)} {p.unit}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{isAr ? "سعر الشراء" : "Purchase Price"}</span>
                          <span className="font-medium text-blue-600">{fmt(p.purchasePrice)} IQD/{p.unit}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        {catLabel && <Badge className={`text-[10px] ${categoryColors[p.category]}`}>{isAr ? catLabel.ar : catLabel.en}</Badge>}
                        {isLow && (
                          <Badge className="text-[10px] ms-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {isAr ? "مخزون منخفض" : "Low Stock"}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Purchase Stock ────────────────────────────── */}
      {tab === "purchases" && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary totals */}
          {!summaryLoading && summary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800/40 p-4">
                <p className="text-xs text-slate-500 mb-1">{isAr ? "إجمالي قيمة المشتريات" : "Total Purchased Value"}</p>
                <p className="text-lg font-extrabold text-blue-600">{fmt(totalPurchasedValue)}</p>
                <p className="text-[10px] text-slate-400">IQD</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-orange-200 dark:border-orange-800/40 p-4">
                <p className="text-xs text-slate-500 mb-1">{isAr ? "عدد المواد المشتراة" : "Purchased Products"}</p>
                <p className="text-lg font-extrabold text-orange-600">{summary.length}</p>
                <p className="text-[10px] text-slate-400">{isAr ? "صنف" : "items"}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/40 p-4">
                <p className="text-xs text-slate-500 mb-1">{isAr ? "منخفض المخزون" : "Low Stock Items"}</p>
                <p className="text-lg font-extrabold text-amber-600">
                  {summary.filter((s: any) => parseFloat(s.currentStock) <= parseFloat(s.minStock) && parseFloat(s.minStock) > 0).length}
                </p>
                <p className="text-[10px] text-slate-400">{isAr ? "صنف" : "items"}</p>
              </div>
            </div>
          )}

          {summaryLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)
          ) : filteredSummary.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{isAr ? "لا توجد مشتريات بعد" : "No purchase data yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSummary.map((s: any) => {
                const isLow = parseFloat(s.currentStock) <= parseFloat(s.minStock) && parseFloat(s.minStock) > 0;
                const expanded = expandedId === s.productId;
                const catLabel = categoryLabels[s.category] || { en: s.category, ar: s.category };
                const stockPct = s.totalPurchasedQty > 0
                  ? Math.min(100, Math.round((parseFloat(s.currentStock) / s.totalPurchasedQty) * 100))
                  : 0;
                return (
                  <div key={s.productId} className={`bg-white dark:bg-slate-900 rounded-xl border ${isLow ? "border-amber-300 dark:border-amber-700" : "border-slate-200 dark:border-slate-800"} overflow-hidden`} data-testid={`card-purchase-stock-${s.productId}`}>
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => setExpandedId(expanded ? null : s.productId)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Package className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          {s.nameAr && <p className="text-xs text-slate-400 truncate">{s.nameAr}</p>}
                          <Badge className={`text-[10px] px-1.5 ${categoryColors[s.category] || "bg-muted text-muted-foreground"}`}>
                            {isAr ? catLabel.ar : catLabel.en}
                          </Badge>
                          {isLow && (
                            <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <AlertTriangle className="h-2.5 w-2.5 me-0.5" />{isAr ? "منخفض" : "Low"}
                            </Badge>
                          )}
                        </div>
                        {/* Mini progress bar */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stockPct < 20 ? "bg-red-400" : stockPct < 50 ? "bg-amber-400" : "bg-emerald-400"}`}
                              style={{ width: `${stockPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {fmt(s.currentStock)} / {fmt(s.totalPurchasedQty)} {s.unit}
                          </span>
                        </div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <p className="text-sm font-bold text-blue-600">{fmt(s.currentStock)} {s.unit}</p>
                        <p className="text-[10px] text-slate-400">{isAr ? "المخزون الحالي" : "In stock"}</p>
                      </div>
                      {expanded ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                    </div>

                    {expanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 space-y-3">
                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-1.5">
                              <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <p className="text-[10px] text-slate-500 mb-0.5">{isAr ? "إجمالي المشترى" : "Total Purchased"}</p>
                            <p className="font-bold text-sm text-blue-600">{fmt(s.totalPurchasedQty)}</p>
                            <p className="text-[10px] text-slate-400">{s.unit}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-1.5">
                              <FlaskConical className="h-3.5 w-3.5 text-violet-600" />
                            </div>
                            <p className="text-[10px] text-slate-500 mb-0.5">{isAr ? "مستخدم في الإنتاج" : "Used in Production"}</p>
                            <p className="font-bold text-sm text-violet-600">{fmt(s.totalUsedInProduction)}</p>
                            <p className="text-[10px] text-slate-400">{s.unit}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5 ${isLow ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                              <Package className={`h-3.5 w-3.5 ${isLow ? "text-amber-600" : "text-emerald-600"}`} />
                            </div>
                            <p className="text-[10px] text-slate-500 mb-0.5">{isAr ? "المخزون الحالي" : "Current Stock"}</p>
                            <p className={`font-bold text-sm ${isLow ? "text-amber-600" : "text-emerald-600"}`}>{fmt(s.currentStock)}</p>
                            <p className="text-[10px] text-slate-400">{s.unit}</p>
                          </div>
                        </div>

                        {/* Purchase price + total value */}
                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm">
                          <span className="text-slate-500">{isAr ? "إجمالي قيمة المشتريات" : "Total Purchase Value"}</span>
                          <span className="font-bold text-blue-700 dark:text-blue-400">{fmt(s.totalPurchasedValue)} IQD</span>
                        </div>

                        {/* Recent purchase entries */}
                        {s.purchaseEntries && s.purchaseEntries.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">{isAr ? "آخر عمليات الشراء" : "Purchase History"}</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {[...s.purchaseEntries].reverse().slice(0, 8).map((entry: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <TrendingDown className="h-3 w-3 text-blue-500" />
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {entry.purchaseDate ? new Date(entry.purchaseDate).toLocaleDateString(isAr ? "ar-IQ" : "en-GB") : "—"}
                                    </span>
                                  </div>
                                  <div className="text-end">
                                    <span className="font-semibold text-blue-600 me-2">+{fmt(entry.quantity)} {s.unit}</span>
                                    <span className="text-slate-400">{fmt(entry.total)} IQD</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!deleteToConfirm} onOpenChange={o => !o && setDeleteToConfirm(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-delete-material">
          <DialogHeader><DialogTitle className="text-red-600">{isAr ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle></DialogHeader>
          {deleteToConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{isAr ? "هل أنت متأكد من حذف" : "Delete"} <span className="font-semibold text-foreground">"{deleteToConfirm.name}"</span>? {isAr ? "لا يمكن التراجع." : "This cannot be undone."}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteToConfirm(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteToConfirm.id)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-material">
                  {deleteMutation.isPending ? "..." : (isAr ? "حذف" : "Delete")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg" data-testid="dialog-material">
          <DialogHeader>
            <DialogTitle>{editing ? (isAr ? "تعديل مادة" : "Edit Material") : (isAr ? "إضافة مادة خام" : "Add Raw Material")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMutation.mutate(v))} className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>{isAr ? "الاسم (إنجليزي)" : "Name (English)"}</FormLabel>
                  <FormControl><Input {...field} data-testid="input-material-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nameAr" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>{isAr ? "الاسم (عربي)" : "Name (Arabic)"}</FormLabel>
                  <FormControl><Input {...field} data-testid="input-material-name-ar" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "الفئة" : "Category"}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-material-category"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RAW_CATEGORIES.map(k => (
                        <SelectItem key={k} value={k}>{isAr ? categoryLabels[k].ar : categoryLabels[k].en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "الوحدة" : "Unit"}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-material-unit"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["liter", "kg", "piece", "barrel", "ton"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "سعر الشراء (IQD)" : "Purchase Price (IQD)"}</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-material-purchase-price" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="salePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "سعر البيع (IQD)" : "Sale Price (IQD)"}</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-material-sale-price" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currentStock" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "المخزون الحالي" : "Current Stock"}</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-material-stock" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="minStock" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? "الحد الأدنى" : "Min Stock"}</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-material-min-stock" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>{isAr ? "ملاحظات" : "Notes"}</FormLabel>
                  <FormControl><Textarea {...field} rows={2} className="resize-none" data-testid="input-material-description" /></FormControl>
                </FormItem>
              )} />
              <div className="col-span-2 flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="button-submit-material">
                  {isAr ? "حفظ" : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
