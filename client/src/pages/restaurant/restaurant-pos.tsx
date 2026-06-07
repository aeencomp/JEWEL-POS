import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Send, Loader2, ShoppingBag } from "lucide-react";
import type { RestaurantTable, MenuItem, MenuCategory } from "@shared/schema";

type CartLine = { menuItemId: number; name: string; price: number; quantity: number };

export default function RestaurantPos() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [newTableNum, setNewTableNum] = useState("");

  const { data: tables = [] } = useQuery<RestaurantTable[]>({ queryKey: ["/api/restaurant/tables"] });
  const { data: categories = [] } = useQuery<MenuCategory[]>({ queryKey: ["/api/restaurant/menu/categories"] });
  const { data: items = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/restaurant/menu/items"] });

  const addTable = useMutation({
    mutationFn: (n: number) => apiRequest("POST", "/api/restaurant/tables", { tableNumber: n }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
      setNewTableNum("");
    },
  });

  const placeOrder = useMutation({
    mutationFn: () => apiRequest("POST", "/api/restaurant/orders", {
      tableId: selectedTable?.id ?? null,
      orderType: "dine_in",
      source: "staff",
      items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
      setCart([]);
    },
  });

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const ex = prev.find((c) => c.menuItemId === item.id);
      if (ex) return prev.map((c) => (c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { menuItemId: item.id, name: isAr && item.nameAr ? item.nameAr : item.name, price: parseFloat(item.price), quantity: 1 }];
    });
  }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const statusColor: Record<string, string> = {
    free: "bg-emerald-500",
    occupied: "bg-orange-500",
    reserved: "bg-blue-500",
  };

  return (
    <div className="h-full min-h-0 w-full max-w-full overflow-hidden">
      <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,16rem)] xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,18rem)]">
        {/* Tables */}
        <section className="min-h-0 min-w-0 flex flex-col border-b lg:border-b-0 lg:border-e border-border bg-muted/20">
          <div className="shrink-0 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">{isAr ? "الطاولات" : "Tables"}</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newTableNum}
                onChange={(e) => setNewTableNum(e.target.value)}
                type="number"
                placeholder="#"
                className="h-9 min-w-0 flex-1"
              />
              <Button
                size="icon"
                className="shrink-0 h-9 w-9 bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  const n = parseInt(newTableNum);
                  if (n) addTable.mutate(n);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTable(t)}
                  className={`p-3 rounded-xl border text-start transition-all ${
                    selectedTable?.id === t.id
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-1 ring-orange-500/30"
                      : "border-border bg-background hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">#{t.tableNumber}</span>
                    <span className={`w-2 h-2 shrink-0 rounded-full ${statusColor[t.status] || "bg-gray-400"}`} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 capitalize">{t.status}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Menu */}
        <section className="min-h-0 min-w-0 flex flex-col bg-background">
          <div className="shrink-0 px-4 py-3 border-b border-border bg-background">
            <p className="text-sm font-medium text-foreground">
              {selectedTable
                ? `${isAr ? "طاولة" : "Table"} #${selectedTable.tableNumber}`
                : isAr
                  ? "اختر طاولة أو أضف طلباً سريعاً"
                  : "Select a table or quick order"}
            </p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.categoryId === cat.id && i.isAvailable);
              if (catItems.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 px-0.5">
                    {isAr && cat.nameAr ? cat.nameAr : cat.name}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {catItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addToCart(item)}
                        className="p-3 rounded-xl border border-border bg-card text-start hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors"
                      >
                        <p className="font-medium text-sm leading-snug">
                          {isAr && item.nameAr ? item.nameAr : item.name}
                        </p>
                        <p className="text-xs font-semibold text-orange-600 mt-1">
                          {parseFloat(item.price).toLocaleString()} {isAr ? "د.ع" : "IQD"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cart */}
        <section className="min-h-0 min-w-0 flex flex-col border-t lg:border-t-0 lg:border-s border-border bg-muted/10">
          <div className="shrink-0 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">{isAr ? "السلة" : "Cart"}</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[8rem] text-center text-muted-foreground">
                <ShoppingBag className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">{isAr ? "السلة فارغة" : "Cart is empty"}</p>
                <p className="text-xs mt-1 opacity-70">{isAr ? "اضغط على صنف لإضافته" : "Tap a menu item to add"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.menuItemId} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/60 last:border-0">
                    <span className="flex-1 min-w-0 truncate font-medium">{c.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        className="p-1 rounded-md hover:bg-muted"
                        onClick={() =>
                          setCart((p) =>
                            p
                              .map((x) =>
                                x.menuItemId === c.menuItemId ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x,
                              )
                              .filter((x) => x.quantity > 0),
                          )
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center tabular-nums">{c.quantity}</span>
                      <button
                        type="button"
                        className="p-1 rounded-md hover:bg-muted"
                        onClick={() =>
                          setCart((p) =>
                            p.map((x) => (x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x)),
                          )
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 w-16 text-end tabular-nums">
                      {(c.price * c.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border p-4 space-y-3 bg-background">
            <div className="flex justify-between items-center font-bold text-sm">
              <span>{isAr ? "المجموع" : "Total"}</span>
              <span className="text-orange-600 tabular-nums">
                {total.toLocaleString()} {isAr ? "د.ع" : "IQD"}
              </span>
            </div>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={cart.length === 0 || placeOrder.isPending}
              onClick={() => placeOrder.mutate()}
            >
              {placeOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 me-2" />
                  {isAr ? "إرسال للمطبخ" : "Send to Kitchen"}
                </>
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
