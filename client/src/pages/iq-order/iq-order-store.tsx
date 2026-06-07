import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Plus, Minus, ShoppingBag, Loader2, Search, MapPin, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { IqOrderShell, IQ_ORDER_BRAND } from "./iq-order-shared";
import type { MenuCategory, MenuItem } from "@shared/schema";

type CartLine = { menuItemId: number; name: string; price: number; quantity: number };

type MenuData = {
  store: { id: number; name: string; address: string | null; phone: string; brandColor: string | null; logoUrl: string | null };
  categories: MenuCategory[];
  items: MenuItem[];
  delivery: { deliveryFee: number; minOrder: number; estMinutes: number };
};

export default function IqOrderStore() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [, params] = useRoute("/app/store/:storeId");
  const [, navigate] = useLocation();
  const storeId = parseInt(params?.storeId || "0");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [form, setForm] = useState({ name: "", phone: "", address: "", area: "", notes: "" });

  const { data, isLoading, error } = useQuery<MenuData>({
    queryKey: [`/api/public/iq-order/${storeId}/menu`],
    enabled: storeId > 0,
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/iq-order/${storeId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          deliveryAddress: form.address.trim(),
          deliveryArea: form.area.trim() || undefined,
          notes: form.notes.trim() || undefined,
          paymentMethod: "cash",
          items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: (order) => {
      if (order.trackingToken) navigate(`/app/track/${order.trackingToken}`);
    },
  });

  const brandColor = data?.store.brandColor || IQ_ORDER_BRAND.color;
  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const deliveryFee = data?.delivery.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;
  const minOrder = data?.delivery.minOrder ?? 0;
  const belowMin = subtotal > 0 && subtotal < minOrder;

  const filteredItems = useMemo(() => {
    if (!data) return [];
    let list = data.items;
    if (activeCategory !== "all") list = list.filter((i) => i.categoryId === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.nameAr?.toLowerCase().includes(q));
    }
    return list;
  }, [data, activeCategory, search]);

  function addItem(item: MenuItem) {
    const name = isAr && item.nameAr ? item.nameAr : item.name;
    setCart((prev) => {
      const ex = prev.find((c) => c.menuItemId === item.id);
      if (ex) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name, price: parseFloat(item.price), quantity: 1 }];
    });
  }

  if (!storeId) return null;
  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColor }} /></div>;
  if (error || !data) return <div className="p-8 text-center text-destructive">{isAr ? "المطعم غير متاح" : "Restaurant unavailable"}</div>;

  return (
    <IqOrderShell
      isAr={isAr}
      title={data.store.name}
      subtitle={isAr ? `${data.delivery.estMinutes} دقيقة توصيل` : `${data.delivery.estMinutes} min delivery`}
      back={
        <button type="button" onClick={() => navigate("/app")} className="p-2 rounded-xl hover:bg-muted shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
      }
    >
      <div className="p-4 pb-28 space-y-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAr ? "بحث..." : "Search..."} className="ps-9 rounded-xl" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" onClick={() => setActiveCategory("all")} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap", activeCategory === "all" ? "text-white" : "bg-muted text-muted-foreground")} style={activeCategory === "all" ? { background: brandColor } : undefined}>
            {isAr ? "الكل" : "All"}
          </button>
          {data.categories.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap", activeCategory === cat.id ? "text-white" : "bg-muted text-muted-foreground")} style={activeCategory === cat.id ? { background: brandColor } : undefined}>
              {isAr && cat.nameAr ? cat.nameAr : cat.name}
            </button>
          ))}
        </div>

        <div className="grid gap-2">
          {filteredItems.map((item) => (
            <button key={item.id} type="button" onClick={() => addItem(item)} className="flex items-center justify-between p-4 rounded-2xl border bg-card hover:shadow-sm text-start transition-all">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{isAr && item.nameAr ? item.nameAr : item.name}</p>
                <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: brandColor }}>{parseFloat(item.price).toLocaleString()} {isAr ? "د.ع" : "IQD"}</p>
              </div>
              <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ms-3" style={{ borderColor: `${brandColor}50`, color: brandColor }}>
                <Plus className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-card/95 backdrop-blur border-t shadow-lg">
          <div className="max-w-lg mx-auto">
            {belowMin && (
              <p className="text-xs text-amber-700 text-center mb-2">
                {isAr ? `الحد الأدنى ${minOrder.toLocaleString()} د.ع` : `Minimum order ${minOrder.toLocaleString()} IQD`}
              </p>
            )}
            <Button
              className="w-full h-12 rounded-xl font-semibold text-white"
              style={{ background: brandColor }}
              disabled={belowMin}
              onClick={() => setCheckoutOpen(true)}
            >
              <ShoppingBag className="h-4 w-4 me-2" />
              {isAr ? "عرض السلة" : "View Cart"} · {total.toLocaleString()} {isAr ? "د.ع" : "IQD"}
              <span className="ms-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">{cart.reduce((s, c) => s + c.quantity, 0)}</span>
            </Button>
          </div>
        </div>
      )}

      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isAr ? "إتمام الطلب" : "Checkout"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-8">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cart.map((c) => (
                <div key={c.menuItemId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{c.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" className="w-7 h-7 rounded-lg border flex items-center justify-center" onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x).filter((x) => x.quantity > 0))}><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center font-bold">{c.quantity}</span>
                    <button type="button" className="w-7 h-7 rounded-lg border flex items-center justify-center" onClick={() => setCart((p) => p.map((x) => x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x))}><Plus className="h-3 w-3" /></button>
                  </div>
                  <span className="w-16 text-end tabular-nums">{(c.price * c.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-muted/40 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>{isAr ? "المجموع" : "Subtotal"}</span><span className="tabular-nums">{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>{isAr ? "التوصيل" : "Delivery"}</span><span className="tabular-nums">{deliveryFee.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold pt-1 border-t"><span>{isAr ? "الإجمالي" : "Total"}</span><span className="tabular-nums" style={{ color: brandColor }}>{total.toLocaleString()} {isAr ? "د.ع" : "IQD"}</span></div>
            </div>

            <div className="space-y-3">
              <div className="relative"><User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isAr ? "الاسم *" : "Name *"} className="ps-9" /></div>
              <div className="relative"><Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={isAr ? "رقم الهاتف *" : "Phone *"} className="ps-9" /></div>
              <div className="relative"><MapPin className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={isAr ? "عنوان التوصيل الكامل *" : "Full delivery address *"} rows={2} className="ps-9 resize-none" /></div>
              <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder={isAr ? "المنطقة / الحي" : "Area / Neighborhood"} />
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={isAr ? "ملاحظات للمطعم" : "Notes for restaurant"} rows={2} className="resize-none" />
            </div>

            <div className="rounded-xl border p-3 text-sm">
              <p className="font-semibold">{isAr ? "الدفع عند الاستلام" : "Cash on Delivery"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "ادفع نقداً عند وصول الطلب" : "Pay cash when your order arrives"}</p>
            </div>

            {placeOrder.isError && (
              <p className="text-sm text-destructive text-center">{(placeOrder.error as Error).message}</p>
            )}

            <Button
              className="w-full h-12 rounded-xl font-semibold text-white"
              style={{ background: brandColor }}
              disabled={!form.name.trim() || !form.phone.trim() || !form.address.trim() || placeOrder.isPending || belowMin}
              onClick={() => placeOrder.mutate()}
            >
              {placeOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "تأكيد الطلب" : "Place Order")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </IqOrderShell>
  );
}
