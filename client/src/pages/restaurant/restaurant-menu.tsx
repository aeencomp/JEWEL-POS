import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Search, BookOpen } from "lucide-react";
import { RestoPageHeader } from "./restaurant-shared";
import { cn } from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@shared/schema";

export default function RestaurantMenu() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [newCat, setNewCat] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", categoryId: "" });
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  const { data: categories = [] } = useQuery<MenuCategory[]>({ queryKey: ["/api/restaurant/menu/categories"] });
  const { data: items = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/restaurant/menu/items"] });

  const addCat = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/restaurant/menu/categories", { name, nameAr: name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu/categories"] }); setNewCat(""); },
  });
  const addItem = useMutation({
    mutationFn: (data: { name: string; price: string; categoryId: number }) => apiRequest("POST", "/api/restaurant/menu/items", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu/items"] }); setNewItem({ name: "", price: "", categoryId: "" }); },
  });
  const toggleAvail = useMutation({
    mutationFn: ({ id, isAvailable }: { id: number; isAvailable: boolean }) =>
      apiRequest("PATCH", `/api/restaurant/menu/items/${id}`, { isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu/items"] }),
  });
  const delItem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/restaurant/menu/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu/items"] }),
  });

  const filtered = useMemo(() => {
    let list = items;
    if (activeCategory !== "all") list = list.filter((i) => i.categoryId === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.nameAr?.toLowerCase().includes(q)));
    }
    return list;
  }, [items, activeCategory, search]);

  const availableCount = items.filter((i) => i.isAvailable).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <RestoPageHeader
        title={isAr ? "إدارة القائمة" : "Menu Management"}
        subtitle={isAr ? `${items.length} صنف · ${availableCount} متاح` : `${items.length} items · ${availableCount} available`}
        isAr={isAr}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{isAr ? "قسم جديد" : "New Category"}</p>
          <div className="flex gap-2">
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={isAr ? "مثال: مشويات" : "e.g. Grills"} />
            <Button className="shrink-0 bg-orange-600 hover:bg-orange-700" onClick={() => newCat.trim() && addCat.mutate(newCat.trim())} disabled={addCat.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{isAr ? "صنف جديد" : "New Item"}</p>
          <div className="grid sm:grid-cols-4 gap-2">
            <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder={isAr ? "اسم الصنف" : "Item name"} />
            <Input value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder={isAr ? "السعر" : "Price"} type="number" />
            <select className="h-10 rounded-md border px-3 bg-background text-sm" value={newItem.categoryId} onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}>
              <option value="">{isAr ? "القسم" : "Category"}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => newItem.name && newItem.price && newItem.categoryId && addItem.mutate({ name: newItem.name, price: newItem.price, categoryId: parseInt(newItem.categoryId) })} disabled={addItem.isPending}>
              {addItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 me-1" />{isAr ? "إضافة" : "Add"}</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAr ? "بحث..." : "Search items..."} className="ps-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" onClick={() => setActiveCategory("all")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap", activeCategory === "all" ? "bg-orange-100 text-orange-800" : "text-muted-foreground hover:bg-muted")}>
            {isAr ? "الكل" : "All"}
          </button>
          {categories.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap", activeCategory === cat.id ? "bg-orange-100 text-orange-800" : "text-muted-foreground hover:bg-muted")}>
              {isAr && cat.nameAr ? cat.nameAr : cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((item) => (
          <div key={item.id} className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-3 transition-opacity", !item.isAvailable && "opacity-60")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{isAr && item.nameAr ? item.nameAr : item.name}</p>
                <p className="text-sm font-bold text-orange-600 mt-1 tabular-nums">{parseFloat(item.price).toLocaleString()} {isAr ? "د.ع" : "IQD"}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Switch
                  checked={item.isAvailable}
                  onCheckedChange={(v) => toggleAvail.mutate({ id: item.id, isAvailable: v })}
                />
                <span className="text-xs text-muted-foreground">{item.isAvailable ? (isAr ? "متاح" : "Available") : (isAr ? "غير متاح" : "86'd")}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => delItem.mutate(item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{isAr ? "لا أصناف" : "No items found"}</p>
      )}
    </div>
  );
}
