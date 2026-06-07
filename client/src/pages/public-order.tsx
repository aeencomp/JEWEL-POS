import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, ShoppingBag, CheckCircle, Loader2, UtensilsCrossed, Search } from "lucide-react";
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
  const [orderNotes, setOrderNotes] = useState("");
  const [search, setSearch] = useState("");
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
          notes: orderNotes.trim() || undefined,
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
    const q = search.toLowerCase();
    return data.categories.map((cat) => ({
      cat,
      items: data.items.filter((i) => {
        if (!i.isAvailable) return false;
        if (i.categoryId !== cat.id) return false;
        if (q) return i.name.toLowerCase().includes(q) || (i.nameAr?.toLowerCase().includes(q));
        return true;
      }),
    })).filter((g) => g.items.length > 0);
  }, [data, search]);

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  function addItem(item: MenuItem) {
    setCart((prev) => {
      const ex = prev.find((c) => c.menuItemId === item.id);
      if (ex) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: isAr && item.nameAr ? item.nameAr : item.name, price: parseFloat(item.price), quantity: 1 }];
    });
  }

  if (!storeId) return <div className="p-8 text-center">Invalid link</div>;
  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;
  if (error || !data) return <div className="p-8 text-center text-destructive">{isAr ? "المطعم غير موجود" : "Restaurant not found"}</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-background" dir={isAr ? "rtl" : "ltr"}>
        <div className="max-w-sm w-full rounded-3xl border bg-card shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold">{isAr ? "تم إرسال طلبك!" : "Order Sent!"}</h1>
          <p className="text-muted-foreground text-sm">{isAr ? "رقم الطلب" : "Order"}: <strong className="text-foreground">{orderNumber}</strong></p>
          <p className="text-sm text-muted-foreground">{isAr ? "سيتم تحضير طلبك قريباً — شكراً لزيارتكم" : "Your order is being prepared — thank you!"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-background" dir={isAr ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: `linear-gradient(135deg, ${brandColor}, #c2410c)` }}>
            {data.store.logoUrl ? <img src={data.store.logoUrl} alt="" className="w-7 h-7 object-contain rounded-lg" /> : <UtensilsCrossed className="h-4 w-4" />}
          </div>
          <div>
            <p className="font-bold text-sm">{data.store.name}</p>
            {tableNum && <p className="text-xs text-muted-foreground">{isAr ? `طاولة ${tableNum}` : `Table ${tableNum}`}</p>}
          </div>
        </div>
        <LanguageToggle />
      </header>

      <div className="max-w-lg mx-auto p-4 pb-36 space-y-5">
        <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${brandColor}, #9a3412)` }}>
          <h1 className="text-lg font-bold">{isAr ? "اطلب من هاتفك" : "Order from your phone"}</h1>
          <p className="text-sm text-white/85 mt-1">{isAr ? "اختر أطباقك — يصل الطلب مباشرة للمطبخ" : "Browse the menu — orders go straight to the kitchen"}</p>
        </div>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAr ? "بحث في القائمة..." : "Search menu..."} className="ps-9 rounded-xl bg-card" />
        </div>

        {itemsByCategory.map(({ cat, items }) => (
          <div key={cat.id}>
            <h2 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-2 px-1">{isAr && cat.nameAr ? cat.nameAr : cat.name}</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border bg-card hover:border-orange-300 hover:shadow-sm transition-all text-start"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{isAr && item.nameAr ? item.nameAr : item.name}</p>
                    <p className="text-sm font-bold mt-0.5 tabular-nums" style={{ color: brandColor }}>{parseFloat(item.price).toLocaleString()} {isAr ? "د.ع" : "IQD"}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ms-3" style={{ borderColor: `${brandColor}40`, color: brandColor }}>
                    <Plus className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {itemsByCategory.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">{isAr ? "لا أصناف متاحة" : "No items available"}</p>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 border-t bg-card/95 backdrop-blur-md p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
          <div className="max-w-lg mx-auto space-y-3">
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={isAr ? "اسمك *" : "Your name *"} className="rounded-xl" />
            <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder={isAr ? "ملاحظات (بدون بصل، إلخ)" : "Notes (no onions, etc.)"} rows={2} className="text-sm resize-none rounded-xl" />
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {cart.map((c) => (
                <div key={c.menuItemId} className="flex items-center justify-between text-sm">
                  <span className="truncate me-2">{c.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" className="w-7 h-7 rounded-lg border flex items-center justify-center" onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x).filter((x) => x.quantity > 0))}><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center font-bold tabular-nums">{c.quantity}</span>
                    <button type="button" className="w-7 h-7 rounded-lg border flex items-center justify-center" onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x))}><Plus className="h-3 w-3" /></button>
                    <span className="w-16 text-end tabular-nums text-muted-foreground">{(c.price * c.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full h-12 text-white font-semibold rounded-xl shadow-md"
              style={{ background: brandColor }}
              disabled={!customerName.trim() || placeOrder.isPending}
              onClick={() => placeOrder.mutate()}
            >
              {placeOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingBag className="h-4 w-4 me-2" />{isAr ? "إرسال الطلب" : "Place Order"} · {total.toLocaleString()} {isAr ? "د.ع" : "IQD"}</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
