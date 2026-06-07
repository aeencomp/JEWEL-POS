import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Bike, MapPin, Phone, Copy, ExternalLink, ArrowRight, Settings, Loader2,
} from "lucide-react";
import { RestoPageHeader, OrderStatusBadge, ElapsedTimer } from "./restaurant-shared";
import { useToast } from "@/hooks/use-toast";

type OrderItem = { id: number; name: string; quantity: number };
type DeliveryOrder = {
  id: number; orderNumber: string; status: string; source: string; total: string;
  customerName: string | null; customerPhone: string | null; createdAt: string;
  deliveryAddress: string | null; deliveryArea: string | null; deliveryFee: string | null;
  trackingToken: string | null; notes: string | null; items?: OrderItem[];
};

type DeliverySettings = {
  deliveryEnabled: boolean;
  deliveryFee: number;
  minOrder: number;
  estMinutes: number;
  appUrl: string;
  storeUrl: string;
};

const COLUMNS = [
  { key: "new", statuses: ["pending", "accepted"], en: "New", ar: "جديد" },
  { key: "prep", statuses: ["preparing", "ready"], en: "Kitchen", ar: "المطبخ" },
  { key: "delivery", statuses: ["out_for_delivery"], en: "On the Way", ar: "في الطريق" },
  { key: "done", statuses: ["delivered", "completed"], en: "Delivered", ar: "تم التوصيل" },
] as const;

function nextDeliveryAction(status: string, isAr: boolean) {
  if (status === "pending") return { status: "accepted", label: isAr ? "قبول" : "Accept" };
  if (status === "accepted") return { status: "preparing", label: isAr ? "تحضير" : "Prepare" };
  if (status === "preparing") return { status: "ready", label: isAr ? "جاهز" : "Ready" };
  if (status === "ready") return { status: "out_for_delivery", label: isAr ? "إرسال للتوصيل" : "Out for Delivery" };
  if (status === "out_for_delivery") return { status: "delivered", label: isAr ? "تم التوصيل" : "Delivered" };
  if (status === "delivered") return { status: "completed", label: isAr ? "إنهاء" : "Complete" };
  return null;
}

export default function RestaurantDelivery() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<DeliverySettings | null>(null);

  const { data: orders = [] } = useQuery<DeliveryOrder[]>({
    queryKey: ["/api/restaurant/delivery/orders", "active"],
    queryFn: async () => {
      const res = await fetch("/api/restaurant/delivery/orders?status=active", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: settings } = useQuery<DeliverySettings>({
    queryKey: ["/api/restaurant/delivery/settings"],
  });

  useEffect(() => {
    if (settings) setSettingsForm(settings);
  }, [settings]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/restaurant/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/delivery/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
    },
  });

  const saveSettings = useMutation({
    mutationFn: (data: Partial<DeliverySettings>) =>
      apiRequest("PATCH", "/api/restaurant/delivery/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/delivery/settings"] });
      toast({ title: isAr ? "تم الحفظ" : "Saved" });
      setShowSettings(false);
    },
  });

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: isAr ? "تم النسخ" : "Copied" });
  }

  const form = settingsForm ?? settings;

  return (
    <div className="p-6 h-full min-h-0 flex flex-col max-w-[1600px] mx-auto">
      <RestoPageHeader
        title={isAr ? "توصيل IQ Order" : "IQ Order Delivery"}
        subtitle={isAr ? "إدارة طلبات التوصيل — مثل تطبيقات التوصيل" : "Manage delivery orders — like Toters"}
        isAr={isAr}
        action={
          <div className="flex gap-2">
            <Badge variant="secondary" className="gap-1"><Bike className="h-3 w-3" />{orders.length} {isAr ? "نشط" : "active"}</Badge>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => { setSettingsForm(settings ?? null); setShowSettings(!showSettings); }}>
              <Settings className="h-4 w-4" />{isAr ? "الإعدادات" : "Settings"}
            </Button>
          </div>
        }
      />

      {showSettings && form && (
        <div className="rounded-2xl border bg-card p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-sm">{isAr ? "إعدادات التوصيل" : "Delivery Settings"}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Switch checked={form.deliveryEnabled} onCheckedChange={(v) => setSettingsForm({ ...form, deliveryEnabled: v })} />
              <span className="text-sm">{isAr ? "تفعيل التوصيل" : "Enable delivery"}</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "رسوم التوصيل (د.ع)" : "Delivery fee (IQD)"}</label>
              <Input type="number" value={form.deliveryFee} onChange={(e) => setSettingsForm({ ...form, deliveryFee: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "الحد الأدنى (د.ع)" : "Min order (IQD)"}</label>
              <Input type="number" value={form.minOrder} onChange={(e) => setSettingsForm({ ...form, minOrder: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "وقت التوصيل (دقيقة)" : "Est. minutes"}</label>
              <Input type="number" value={form.estMinutes} onChange={(e) => setSettingsForm({ ...form, estMinutes: parseInt(e.target.value) || 30 })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{form.storeUrl}</code>
            <Button size="sm" variant="outline" onClick={() => copy(form.storeUrl)}><Copy className="h-3 w-3" /></Button>
            <a href={form.storeUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="h-3 w-3" /></Button></a>
          </div>
          <Button className="bg-orange-600 hover:bg-orange-700" disabled={saveSettings.isPending} onClick={() => form && saveSettings.mutate(form)}>
            {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "حفظ" : "Save")}
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-hidden">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => (col.statuses as readonly string[]).includes(o.status));
          return (
            <div key={col.key} className="rounded-2xl border bg-card flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
                <h3 className="font-bold text-sm">{isAr ? col.ar : col.en}</h3>
                <Badge variant="secondary">{colOrders.length}</Badge>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {colOrders.map((order) => {
                  const action = nextDeliveryAction(order.status, isAr);
                  const mapsUrl = order.deliveryAddress
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`
                    : null;
                  return (
                    <div key={order.id} className="rounded-xl border p-4 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{order.orderNumber}</p>
                          <p className="text-sm font-medium">{order.customerName}</p>
                          {order.source === "online" && <Badge className="mt-1 text-[10px] bg-violet-100 text-violet-700">IQ Order</Badge>}
                        </div>
                        <ElapsedTimer since={order.createdAt} isAr={isAr} />
                      </div>

                      <div className="text-xs space-y-1 text-muted-foreground">
                        {order.customerPhone && (
                          <p className="flex items-center gap-1"><Phone className="h-3 w-3" /><span dir="ltr">{order.customerPhone}</span></p>
                        )}
                        {order.deliveryAddress && (
                          <p className="flex items-start gap-1"><MapPin className="h-3 w-3 shrink-0 mt-0.5" /><span>{order.deliveryAddress}{order.deliveryArea ? `, ${order.deliveryArea}` : ""}</span></p>
                        )}
                      </div>

                      <div className="rounded-lg bg-muted/40 p-2 space-y-1 text-sm">
                        {(order.items ?? []).map((item) => (
                          <p key={item.id}><strong className="text-orange-600">{item.quantity}×</strong> {item.name}</p>
                        ))}
                        <p className="font-bold text-orange-600 pt-1 border-t border-border/50 tabular-nums">{parseFloat(order.total).toLocaleString()} {isAr ? "د.ع" : "IQD"}</p>
                      </div>

                      <div className="flex gap-2">
                        {mapsUrl && (
                          <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex-1">
                            <Button size="sm" variant="outline" className="w-full gap-1"><MapPin className="h-3 w-3" />{isAr ? "الخريطة" : "Map"}</Button>
                          </a>
                        )}
                        {order.trackingToken && (
                          <Button size="sm" variant="outline" onClick={() => copy(`${window.location.origin}/app/track/${order.trackingToken}`)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {action && (
                        <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700 gap-2" onClick={() => updateStatus.mutate({ id: order.id, status: action.status })}>
                          {action.label}<ArrowRight className="h-3 w-3 ms-auto" />
                        </Button>
                      )}
                      <OrderStatusBadge status={order.status} isAr={isAr} />
                    </div>
                  );
                })}
                {colOrders.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">{isAr ? "فارغ" : "Empty"}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
