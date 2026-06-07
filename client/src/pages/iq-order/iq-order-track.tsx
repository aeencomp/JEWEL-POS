import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MapPin, Phone, RefreshCw } from "lucide-react";
import { IqOrderShell, TrackingTimeline, IQ_ORDER_BRAND } from "./iq-order-shared";

type TrackData = {
  orderNumber: string;
  status: string;
  total: string;
  subtotal: string;
  deliveryFee: string;
  deliveryAddress: string | null;
  deliveryArea: string | null;
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: string | null;
  createdAt: string;
  estMinutes: number;
  isCancelled: boolean;
  timeline: { key: string; en: string; ar: string; done: boolean }[];
  items: { id: number; name: string; quantity: number; price: string }[];
  store: { name: string; brandColor: string | null; phone: string } | null;
};

export default function IqOrderTrack() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [, params] = useRoute("/app/track/:token");
  const [, navigate] = useLocation();
  const token = params?.token || "";

  const { data, isLoading, error, refetch, isFetching } = useQuery<TrackData>({
    queryKey: [`/api/public/iq-order/track/${token}`],
    enabled: !!token,
    refetchInterval: 5000,
  });

  const brandColor = data?.store?.brandColor || IQ_ORDER_BRAND.color;

  if (!token) return null;

  return (
    <IqOrderShell
      isAr={isAr}
      title={isAr ? "تتبع الطلب" : "Track Order"}
      subtitle={data?.orderNumber}
      back={
        <button type="button" onClick={() => navigate("/app")} className="p-2 rounded-xl hover:bg-muted shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
      }
    >
      <div className="p-4 space-y-5 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColor }} /></div>
        ) : error || !data ? (
          <p className="text-center text-destructive py-12">{isAr ? "الطلب غير موجود" : "Order not found"}</p>
        ) : (
          <>
            <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
              {data.isCancelled ? (
                <p className="text-lg font-bold text-destructive">{isAr ? "تم إلغاء الطلب" : "Order Cancelled"}</p>
              ) : data.status === "completed" || data.status === "delivered" ? (
                <p className="text-lg font-bold text-emerald-600">{isAr ? "تم التوصيل!" : "Delivered!"}</p>
              ) : (
                <>
                  <p className="text-lg font-bold" style={{ color: brandColor }}>
                    {isAr ? "طلبك قيد التحضير" : "Your order is on the way"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAr ? `الوقت المتوقع ~${data.estMinutes} دقيقة` : `Estimated ~${data.estMinutes} min`}
                  </p>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-2">{data.store?.name}</p>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">{isAr ? "حالة الطلب" : "Order Status"}</h3>
                <button type="button" onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-muted">
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
                </button>
              </div>
              <TrackingTimeline steps={data.timeline} isAr={isAr} isCancelled={data.isCancelled} />
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm">{isAr ? "تفاصيل الطلب" : "Order Details"}</h3>
              <ul className="text-sm space-y-1.5">
                {data.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span><strong style={{ color: brandColor }}>{item.quantity}×</strong> {item.name}</span>
                    <span className="text-muted-foreground tabular-nums">{(parseFloat(item.price) * item.quantity).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t text-sm space-y-1">
                <div className="flex justify-between text-muted-foreground"><span>{isAr ? "التوصيل" : "Delivery"}</span><span className="tabular-nums">{parseFloat(data.deliveryFee).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>{isAr ? "الإجمالي" : "Total"}</span><span className="tabular-nums" style={{ color: brandColor }}>{parseFloat(data.total).toLocaleString()} {isAr ? "د.ع" : "IQD"}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-2 text-sm">
              <h3 className="font-semibold">{isAr ? "عنوان التوصيل" : "Delivery Address"}</h3>
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{data.deliveryAddress}{data.deliveryArea ? `, ${data.deliveryArea}` : ""}</span>
              </p>
              {data.customerPhone && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span dir="ltr">{data.customerPhone}</span>
                </p>
              )}
            </div>

            <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/app")}>
              {isAr ? "طلب من مطعم آخر" : "Order from another restaurant"}
            </Button>
          </>
        )}
      </div>
    </IqOrderShell>
  );
}
