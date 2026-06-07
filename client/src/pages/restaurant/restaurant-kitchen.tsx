import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, CheckCircle } from "lucide-react";

type OrderItem = { id: number; name: string; quantity: number; price?: string; notes: string | null };
type Order = {
  id: number;
  orderNumber: string;
  status: string;
  source: string;
  total: string;
  customerName: string | null;
  table: { tableNumber: number } | null;
  items?: OrderItem[];
};

const STATUS_FLOW = ["pending", "accepted", "preparing", "ready", "served", "completed"] as const;

export default function RestaurantKitchen() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/restaurant/orders"],
    refetchInterval: 5000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/restaurant/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
    },
  });

  const active = orders.filter((o) => !["completed", "cancelled"].includes(o.status));

  function nextStatus(current: string) {
    const idx = STATUS_FLOW.indexOf(current as (typeof STATUS_FLOW)[number]);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : "completed";
  }

  const statusLabel: Record<string, { en: string; ar: string; color: string }> = {
    pending: { en: "New", ar: "جديد", color: "bg-red-500" },
    accepted: { en: "Accepted", ar: "مقبول", color: "bg-blue-500" },
    preparing: { en: "Preparing", ar: "قيد التحضير", color: "bg-orange-500" },
    ready: { en: "Ready", ar: "جاهز", color: "bg-emerald-500" },
    served: { en: "Served", ar: "تم التقديم", color: "bg-purple-500" },
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ChefHat className="h-6 w-6 text-orange-600" />
        <h1 className="text-xl font-bold">{isAr ? "شاشة المطبخ" : "Kitchen Display"}</h1>
        <Badge variant="secondary">{active.length} {isAr ? "نشط" : "active"}</Badge>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {active.map((order) => {
          const sl = statusLabel[order.status] || statusLabel.pending;
          const lineItems = order.items ?? [];
          return (
            <Card key={order.id} className="border-2 border-orange-200 dark:border-orange-900">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.table
                        ? `${isAr ? "طاولة" : "Table"} #${order.table.tableNumber}`
                        : order.customerName || (isAr ? "طلب QR" : "QR Order")}
                      {order.source === "qr" && <Badge className="ms-2 text-[10px]">QR</Badge>}
                    </p>
                  </div>
                  <Badge className={`${sl.color} text-white shrink-0`}>{isAr ? sl.ar : sl.en}</Badge>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    {isAr ? "الأصناف المطلوبة" : "Order Items"}
                  </p>
                  {lineItems.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {lineItems.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-2">
                          <span className="font-medium">
                            <span className="text-orange-600 font-bold me-1">{item.quantity}×</span>
                            {item.name}
                          </span>
                          {item.price && (
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                              {(parseFloat(item.price) * item.quantity).toLocaleString()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {isAr ? "لا توجد أصناف مسجلة لهذا الطلب" : "No items recorded for this order"}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-end mt-2 pt-2 border-t border-border/60 tabular-nums">
                    {isAr ? "المجموع:" : "Total:"} {parseFloat(order.total || "0").toLocaleString()} {isAr ? "د.ع" : "IQD"}
                  </p>
                </div>

                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus(order.status) })}
                >
                  <CheckCircle className="h-4 w-4 me-2" />
                  {order.status === "ready" ? (isAr ? "تم التقديم" : "Mark Served") : (isAr ? "التالي" : "Next Step")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {active.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-12">
            {isAr ? "لا طلبات نشطة" : "No active orders"}
          </p>
        )}
      </div>
    </div>
  );
}
