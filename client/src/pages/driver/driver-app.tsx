import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useDriverAuth } from "@/hooks/use-driver-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Bike, MapPin, Phone, LogOut, Loader2, Package, Navigation,
  CheckCircle, Store, Clock, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DriverOrder = {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryArea: string | null;
  createdAt: string;
  items: { id: number; name: string; quantity: number }[];
  store: { name: string; address: string | null; phone: string } | null;
};

type Tab = "available" | "active" | "history";

export default function DriverApp() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [, navigate] = useLocation();
  const { driver, isLoading, isAuthenticated, logoutMutation, setStatusMutation } = useDriverAuth();
  const [tab, setTab] = useState<Tab>("available");

  const isOnline = driver?.status === "online" || driver?.status === "busy";

  const { data: available = [], refetch: refetchAvailable } = useQuery<DriverOrder[]>({
    queryKey: ["/api/driver/orders/available"],
    enabled: isAuthenticated && isOnline,
    refetchInterval: 4000,
  });

  const { data: active = [], refetch: refetchActive } = useQuery<DriverOrder[]>({
    queryKey: ["/api/driver/orders/active"],
    enabled: isAuthenticated,
    refetchInterval: 4000,
  });

  const { data: history = [] } = useQuery<DriverOrder[]>({
    queryKey: ["/api/driver/orders/history"],
    enabled: isAuthenticated && tab === "history",
  });

  const acceptOrder = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/driver/orders/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/me"] });
      setTab("active");
    },
  });

  const pickupOrder = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/driver/orders/${id}/pickup`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/driver/orders"] }),
  });

  const deliverOrder = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/driver/orders/${id}/deliver`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/me"] });
      setTab("available");
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>;
  }

  if (!isAuthenticated) {
    navigate("/driver-login");
    return null;
  }

  function mapsUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  function OrderCard({ order, mode }: { order: DriverOrder; mode: Tab }) {
    const dest = order.deliveryAddress
      ? `${order.deliveryAddress}${order.deliveryArea ? `, ${order.deliveryArea}` : ""}`
      : null;

    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-white">{order.orderNumber}</p>
            <p className="text-sm text-slate-400">{order.store?.name}</p>
          </div>
          <Badge className="bg-sky-600">{parseFloat(order.total).toLocaleString()} {isAr ? "د.ع" : "IQD"}</Badge>
        </div>

        <div className="text-sm space-y-1.5 text-slate-300">
          <p className="flex items-center gap-2"><Store className="h-3.5 w-3.5 text-sky-400 shrink-0" />{order.store?.address || "—"}</p>
          <p className="font-medium text-white">{order.customerName}</p>
          {order.customerPhone && (
            <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 text-sky-400">
              <Phone className="h-3.5 w-3.5" />{order.customerPhone}
            </a>
          )}
          {dest && (
            <p className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />{dest}</p>
          )}
        </div>

        <div className="rounded-lg bg-slate-800/80 p-2 text-xs space-y-0.5">
          {order.items.map((i) => (
            <p key={i.id}><strong className="text-orange-400">{i.quantity}×</strong> {i.name}</p>
          ))}
        </div>

        <div className="flex gap-2">
          {dest && (
            <a href={mapsUrl(dest)} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="outline" size="sm" className="w-full border-slate-600 text-slate-200 gap-1">
                <Navigation className="h-3.5 w-3.5" />{isAr ? "الخريطة" : "Navigate"}
              </Button>
            </a>
          )}
          {mode === "available" && (
            <Button
              size="sm"
              className="flex-1 bg-sky-600 hover:bg-sky-700 gap-1"
              disabled={acceptOrder.isPending}
              onClick={() => acceptOrder.mutate(order.id)}
            >
              {acceptOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Package className="h-3.5 w-3.5" />{isAr ? "قبول الطلب" : "Accept"}</>}
            </Button>
          )}
          {mode === "active" && order.status === "ready" && (
            <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700 gap-1" disabled={pickupOrder.isPending} onClick={() => pickupOrder.mutate(order.id)}>
              {pickupOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>{isAr ? "استلمت الطلب" : "Picked Up"}</>}
            </Button>
          )}
          {mode === "active" && order.status === "out_for_delivery" && (
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1" disabled={deliverOrder.isPending} onClick={() => deliverOrder.mutate(order.id)}>
              {deliverOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle className="h-3.5 w-3.5" />{isAr ? "تم التوصيل" : "Delivered"}</>}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; en: string; ar: string; icon: typeof Package; count?: number }[] = [
    { id: "available", en: "Available", ar: "متاحة", icon: Package, count: available.length },
    { id: "active", en: "My Delivery", ar: "طلبي", icon: Bike, count: active.length },
    { id: "history", en: "History", ar: "السجل", icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shrink-0">
            <Bike className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{driver?.name}</p>
            <p className="text-[11px] text-slate-400 capitalize">{driver?.vehicleType} · {driver?.status}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5">
              <span className="text-[10px] text-slate-400">{isOnline ? (isAr ? "متصل" : "Online") : (isAr ? "غير متصل" : "Offline")}</span>
              <Switch
                checked={isOnline}
                disabled={setStatusMutation.isPending || driver?.status === "busy"}
                onCheckedChange={(v) => setStatusMutation.mutate(v ? "online" : "offline")}
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => logoutMutation.mutate(undefined, { onSuccess: () => navigate("/driver-login") })}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {!isOnline && tab === "available" && (
        <div className="bg-amber-950/50 border-b border-amber-800/50 px-4 py-2 text-center text-xs text-amber-300">
          {isAr ? "فعّل وضع المتصل لرؤية الطلبات المتاحة" : "Go online to see available orders"}
        </div>
      )}

      <div className="max-w-lg mx-auto w-full px-4 pt-3">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-colors",
                  tab === t.id ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {isAr ? t.ar : t.en}
                {t.count !== undefined && t.count > 0 && (
                  <span className="bg-white/20 px-1.5 rounded-full text-[10px]">{t.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-3 pb-8">
        {tab === "available" && (
          available.length > 0 ? available.map((o) => <OrderCard key={o.id} order={o} mode="available" />)
            : <EmptyState isAr={isAr} msg={isOnline ? (isAr ? "لا طلبات متاحة الآن" : "No orders available") : (isAr ? "أنت غير متصل" : "You are offline")} />
        )}
        {tab === "active" && (
          active.length > 0 ? active.map((o) => <OrderCard key={o.id} order={o} mode="active" />)
            : <EmptyState isAr={isAr} msg={isAr ? "لا طلب نشط — اقبل طلباً من المتاحة" : "No active delivery — accept from Available"} />
        )}
        {tab === "history" && (
          history.length > 0 ? history.map((o) => <OrderCard key={o.id} order={o} mode="history" />)
            : <EmptyState isAr={isAr} msg={isAr ? "لا سجل بعد" : "No history yet"} />
        )}
      </main>

      <footer className="text-center text-[10px] text-slate-600 py-3 border-t border-slate-800">
        IQ Order Driver · IQ-POS
      </footer>
    </div>
  );
}

function EmptyState({ isAr, msg }: { isAr?: boolean; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Clock className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}
