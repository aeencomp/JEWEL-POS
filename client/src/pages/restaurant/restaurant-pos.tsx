import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Send, Loader2, ShoppingBag, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_TYPES } from "./restaurant-shared";
import type { RestaurantTable, MenuItem, MenuCategory } from "@shared/schema";

type CartLine = { menuItemId: number; name: string; price: number; quantity: number };

export default function RestaurantPos() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [newTableNum, setNewTableNum] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "pickup" | "delivery">("dine_in");
  const [orderNotes, setOrderNotes] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  const { data: tables = [] } = useQuery<RestaurantTable[]>({ queryKey: ["/api/restaurant/tables"] });
  const { data: categories = [] } = useQuery<MenuCategory[]>({ queryKey: ["/api/restaurant/menu/categories"] });
  const { data: items = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/restaurant/menu/items"] });

  const addTable = useMutation({
    mutationFn: (n: number) => apiRequest("POST", "/api/restaurant/tables", { tableNumber: n }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); setNewTableNum(""); },
  });

  const placeOrder = useMutation({
    mutationFn: () => apiRequest("POST", "/api/restaurant/orders", {
      tableId: orderType === "dine_in" ? (selectedTable?.id ?? null) : null,
      orderType,
      source: "staff",
      notes: orderNotes.trim() || undefined,
      items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
      setCart([]);
      setOrderNotes("");
    },
  });

  const filteredItems = useMemo(() => {
    let list = items.filter((i) => i.isAvailable);
    if (activeCategory !== "all") list = list.filter((i) => i.categoryId === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.nameAr?.toLowerCase().includes(q)));
    }
    return list;
  }, [items, activeCategory, search]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const ex = prev.find((c) => c.menuItemId === item.id);
      if (ex) return prev.map((c) => (c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { menuItemId: item.id, name: isAr && item.nameAr ? item.nameAr : item.name, price: parseFloat(item.price), quantity: 1 }];
    });
  }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const statusStyle: Record<string, string> = {
    free: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30",
    occupied: "border-orange-400 bg-orange-50 dark:bg-orange-950/30",
    reserved: "border-blue-400 bg-blue-50 dark:bg-blue-950/30",
  };

  return (
    <div className="h-full min-h-0 w-full max-w-full overflow-hidden bg-slate-50/50 dark:bg-background">
      <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)] xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_minmax(0,20rem)]">
        {/* Tables */}
        <section className="min-h-0 min-w-0 flex flex-col border-b lg:border-b-0 lg:border-e border-border bg-card">
          <div className="shrink-0 px-4 py-3 border-b border-border">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{isAr ? "الطاولات" : "Floor Plan"}</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            <div className="flex gap-2">
              <Input value={newTableNum} onChange={(e) => setNewTableNum(e.target.value)} type="number" placeholder="#" className="h-9" />
              <Button size="icon" className="shrink-0 h-9 w-9 bg-orange-600 hover:bg-orange-700" onClick={() => { const n = parseInt(newTableNum); if (n) addTable.mutate(n); }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelectedTable(t); setOrderType("dine_in"); }}
                  className={cn(
                    "aspect-[4/3] rounded-xl border-2 flex flex-col items-center justify-center transition-all",
                    statusStyle[t.status] || "border-border bg-background",
                    selectedTable?.id === t.id && "ring-2 ring-orange-500 ring-offset-2",
                  )}
                >
                  <span className="font-bold text-lg">#{t.tableNumber}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{t.status}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Menu */}
        <section className="min-h-0 min-w-0 flex flex-col">
          <div className="shrink-0 px-4 py-3 border-b border-border bg-card space-y-3">
            <div className="flex flex-wrap gap-2">
              {ORDER_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOrderType(t.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                    orderType === t.id
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-background text-muted-foreground border-border hover:border-orange-300",
                  )}
                >
                  {isAr ? t.ar : t.en}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAr ? "بحث في القائمة..." : "Search menu..."} className="ps-9 h-9" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button type="button" onClick={() => setActiveCategory("all")} className={cn("px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0", activeCategory === "all" ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" : "text-muted-foreground hover:bg-muted")}>
                {isAr ? "الكل" : "All"}
              </button>
              {categories.map((cat) => (
                <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)} className={cn("px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0", activeCategory === cat.id ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" : "text-muted-foreground hover:bg-muted")}>
                  {isAr && cat.nameAr ? cat.nameAr : cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className="group p-4 rounded-2xl border border-border bg-card text-start hover:border-orange-400 hover:shadow-md transition-all"
                >
                  <p className="font-semibold text-sm leading-snug group-hover:text-orange-700">{isAr && item.nameAr ? item.nameAr : item.name}</p>
                  <p className="text-sm font-bold text-orange-600 mt-2 tabular-nums">{parseFloat(item.price).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{isAr ? "د.ع" : "IQD"}</span></p>
                </button>
              ))}
            </div>
            {filteredItems.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">{isAr ? "لا أصناف" : "No items found"}</p>
            )}
          </div>
        </section>

        {/* Cart */}
        <section className="min-h-0 min-w-0 flex flex-col border-t lg:border-t-0 lg:border-s border-border bg-card shadow-lg lg:shadow-none">
          <div className="shrink-0 px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">{isAr ? "الطلب الحالي" : "Current Order"}</h3>
            {cart.length > 0 && (
              <button type="button" onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                <Trash2 className="h-3 w-3" />{isAr ? "مسح" : "Clear"}
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[10rem] text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">{isAr ? "أضف أصنافاً من القائمة" : "Add items from the menu"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.menuItemId} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{(c.price * c.quantity).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x).filter((x) => x.quantity > 0))}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">{c.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x))}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border p-4 space-y-3 bg-muted/20">
            <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder={isAr ? "ملاحظات الطلب (اختياري)" : "Order notes (optional)"} rows={2} className="text-sm resize-none" />
            {orderType === "dine_in" && selectedTable && (
              <Badge variant="outline" className="w-full justify-center py-1.5">{isAr ? "طاولة" : "Table"} #{selectedTable.tableNumber}</Badge>
            )}
            <div className="flex justify-between items-center">
              <span className="font-semibold">{isAr ? "المجموع" : "Total"}</span>
              <span className="text-xl font-bold text-orange-600 tabular-nums">{total.toLocaleString()} {isAr ? "د.ع" : "IQD"}</span>
            </div>
            <Button
              className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-base font-semibold"
              disabled={cart.length === 0 || placeOrder.isPending || (orderType === "dine_in" && !selectedTable)}
              onClick={() => placeOrder.mutate()}
            >
              {placeOrder.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4 me-2" />{isAr ? "إرسال للمطبخ" : "Send to Kitchen"}</>}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
