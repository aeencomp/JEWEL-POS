import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Send, Loader2 } from "lucide-react";
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); setNewTableNum(""); },
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
      if (ex) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: parseFloat(item.price), quantity: 1 }];
    });
  }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const statusColor: Record<string, string> = { free: "bg-emerald-500", occupied: "bg-orange-500", reserved: "bg-blue-500" };

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)]">
      <div className="w-72 border-e p-4 space-y-4 overflow-y-auto">
        <h2 className="font-bold text-sm">{isAr ? "الطاولات" : "Tables"}</h2>
        <div className="flex gap-2">
          <Input value={newTableNum} onChange={(e) => setNewTableNum(e.target.value)} type="number" placeholder="#" className="h-9" />
          <Button size="sm" onClick={() => { const n = parseInt(newTableNum); if (n) addTable.mutate(n); }}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tables.map((t) => (
            <button key={t.id} onClick={() => setSelectedTable(t)} className={`p-3 rounded-xl border text-start transition-all ${selectedTable?.id === t.id ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30" : "hover:border-orange-300"}`}>
              <div className="flex items-center justify-between"><span className="font-bold">#{t.tableNumber}</span><span className={`w-2 h-2 rounded-full ${statusColor[t.status] || "bg-gray-400"}`} /></div>
              <p className="text-[10px] text-muted-foreground mt-1">{t.status}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="font-bold mb-3">{selectedTable ? `${isAr ? "طاولة" : "Table"} #${selectedTable.tableNumber}` : (isAr ? "اختر طاولة أو طلب سريع" : "Select table or quick order")}</h2>
        {categories.map((cat) => (
          <div key={cat.id} className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{cat.name}</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {items.filter((i) => i.categoryId === cat.id && i.isAvailable).map((item) => (
                <button key={item.id} onClick={() => addToCart(item)} className="p-3 rounded-xl border text-start hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/20">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-orange-600">{parseFloat(item.price).toLocaleString()} IQD</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="w-80 border-s p-4 flex flex-col">
        <h2 className="font-bold text-sm mb-3">{isAr ? "السلة" : "Cart"}</h2>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {cart.map((c) => (
            <div key={c.menuItemId} className="flex items-center justify-between text-sm">
              <span className="flex-1 truncate">{c.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x).filter((x) => x.quantity > 0))}><Minus className="h-3 w-3" /></button>
                <span>{c.quantity}</span>
                <button onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x))}><Plus className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 mt-3 space-y-2">
          <div className="flex justify-between font-bold"><span>{isAr ? "المجموع" : "Total"}</span><span>{total.toLocaleString()} IQD</span></div>
          <Button className="w-full bg-orange-600 hover:bg-orange-700" disabled={cart.length === 0 || placeOrder.isPending} onClick={() => placeOrder.mutate()}>
            {placeOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 me-2" />{isAr ? "إرسال للمطبخ" : "Send to Kitchen"}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
