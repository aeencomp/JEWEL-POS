import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, ShoppingBag, CheckCircle, Loader2, UtensilsCrossed } from "lucide-react";
import type { MenuCategory, MenuItem, RestaurantTable } from "@shared/schema";

type PublicMenu = {
  store: { id: number; name: string; brandColor: string | null; logoUrl: string | null };
  categories: MenuCategory[];
  items: MenuItem[];
  tables: RestaurantTable[];
};

type CartLine = { menuItemId: number; name: string; price: number; quantity: number };

export default function PublicOrderPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [, paramsStore] = useRoute("/order/:storeId");
  const [, paramsTable] = useRoute("/order/:storeId/t/:tableNum");
  const storeId = parseInt(paramsStore?.storeId || paramsTable?.storeId || "0");
  const tableNum = paramsTable?.tableNum ? parseInt(paramsTable.tableNum) : null;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const { data, isLoading, error } = useQuery<PublicMenu>({
    queryKey: [`/api/public/restaurant/${storeId}/menu`],
    enabled: storeId > 0,
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/restaurant/${storeId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: tableNum,
          orderType: tableNum ? "qr" : "pickup",
          customerName: customerName.trim(),
          items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: (order) => {
      setSubmitted(true);
      setOrderNumber(order.orderNumber);
      setCart([]);
    },
  });

  const brandColor = data?.store.brandColor || "#ea580c";
  const itemsByCategory = useMemo(() => {
    if (!data) return [];
    return data.categories.map((cat) => ({
      cat,
      items: data.items.filter((i) => i.categoryId === cat.id),
    }));
  }, [data]);

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  function addItem(item: MenuItem) {
    setCart((prev) => {
      const ex = prev.find((c) => c.menuItemId === item.id);
      if (ex) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: parseFloat(item.price), quantity: 1 }];
    });
  }

  if (!storeId) return <div className="p-8 text-center">Invalid link</div>;
  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error || !data) return <div className="p-8 text-center text-destructive">{isAr ? "المطعم غير موجود" : "Restaurant not found"}</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-orange-50 to-background" dir={isAr ? "rtl" : "ltr"}>
        <Card className="max-w-sm w-full text-center">
          <CardContent className="p-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-bold">{isAr ? "تم إرسال طلبك!" : "Order Sent!"}</h1>
            <p className="text-muted-foreground text-sm">{isAr ? "رقم الطلب" : "Order"}: <strong>{orderNumber}</strong></p>
            <p className="text-sm text-muted-foreground">{isAr ? "سيتم تحضير طلبك قريباً" : "Your order will be prepared shortly"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: brandColor }}>
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-sm">{data.store.name}</p>
            {tableNum && <p className="text-xs text-muted-foreground">{isAr ? `طاولة ${tableNum}` : `Table ${tableNum}`}</p>}
          </div>
        </div>
        <LanguageToggle />
      </header>

      <div className="max-w-lg mx-auto p-4 pb-32 space-y-6">
        <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${brandColor}, #c2410c)` }}>
          <h1 className="text-lg font-bold">{isAr ? "اطلب من هاتفك" : "Order from your phone"}</h1>
          <p className="text-sm text-white/80 mt-1">{isAr ? "اختر أطباقك وأرسل الطلب مباشرة للمطبخ" : "Pick your dishes and send directly to the kitchen"}</p>
        </div>

        {itemsByCategory.map(({ cat, items }) => items.length > 0 && (
          <div key={cat.id}>
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">{isAr && cat.nameAr ? cat.nameAr : cat.name}</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <button key={item.id} onClick={() => addItem(item)} className="w-full flex items-center justify-between p-4 rounded-xl border bg-card hover:border-orange-300 transition-colors text-start">
                  <div>
                    <p className="font-medium">{isAr && item.nameAr ? item.nameAr : item.name}</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: brandColor }}>{parseFloat(item.price).toLocaleString()} IQD</p>
                  </div>
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 border-t bg-background p-4 shadow-2xl">
          <div className="max-w-lg mx-auto space-y-3">
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={isAr ? "اسمك *" : "Your name *"} />
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {cart.map((c) => (
                <div key={c.menuItemId} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x).filter((x) => x.quantity > 0))}><Minus className="h-3 w-3" /></button>
                    <span>{c.quantity}</span>
                    <button onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x))}><Plus className="h-3 w-3" /></button>
                    <span className="w-16 text-end">{(c.price * c.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full h-12 text-white font-semibold"
              style={{ background: brandColor }}
              disabled={!customerName.trim() || placeOrder.isPending}
              onClick={() => placeOrder.mutate()}
            >
              {placeOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingBag className="h-4 w-4 me-2" />{isAr ? "إرسال الطلب" : "Place Order"} · {total.toLocaleString()} IQD</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
