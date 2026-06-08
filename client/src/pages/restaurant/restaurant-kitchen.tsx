import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient, parseApiErrorMessage } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, CheckCircle, Smartphone, ArrowRight, Loader2 } from "lucide-react";
import { RestoPageHeader, ElapsedTimer } from "./restaurant-shared";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type OrderItem = { id: number; name: string; quantity: number; price?: string; notes: string | null };
type Order = {
  id: number; orderNumber: string; status: string; source: string; orderType?: string; total: string;
  customerName: string | null; createdAt: string; notes: string | null;
  table: { tableNumber: number } | null; items?: OrderItem[];
};

const COLUMNS = [
  { key: "new", statuses: ["pending", "accepted"], en: "New Orders", ar: "طلبات جديدة", color: "border-red-200 bg-red-50/50 dark:bg-red-950/20" },
  { key: "prep", statuses: ["preparing"], en: "Preparing", ar: "قيد التحضير", color: "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20" },
  { key: "ready", statuses: ["ready"], en: "Ready to Serve", ar: "جاهز للتقديم", color: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20" },
] as const;

function nextAction(order: Order, isAr: boolean) {
  if (order.status === "pending") return { status: "accepted", label: isAr ? "قبول" : "Accept" };
  if (order.status === "accepted") return { status: "preparing", label: isAr ? "بدء التحضير" : "Start Prep" };
  if (order.status === "preparing") return { status: "ready", label: isAr ? "جاهز" : "Mark Ready" };
  if (order.status === "ready" && order.orderType === "delivery") return null;
  if (order.status === "ready") return { status: "served", label: isAr ? "تم التقديم" : "Served" };
  return null;
}

export default function RestaurantKitchen() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/restaurant/orders"],
    refetchInterval: 4000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/restaurant/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
    },
    onError: (err: Error) => {
      toast({ title: isAr ? "فشل التحديث" : "Update failed", description: parseApiErrorMessage(err), variant: "destructive" });
    },
  });

  const active = orders.filter((o) => !["completed", "cancelled", "served"].includes(o.status));

  return (
    <div className="p-6 flex flex-col max-w-[1600px] mx-auto min-h-0">
      <RestoPageHeader
        title={isAr ? "شاشة المطبخ (KDS)" : "Kitchen Display (KDS)"}
        subtitle={isAr ? "تتبع الطلبات — جديد → تحضير → جاهز" : "Track orders — New → Preparing → Ready"}
        isAr={isAr}
        action={<Badge variant="secondary" className="text-sm px-3 py-1">{active.length} {isAr ? "نشط" : "active"}</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => (col.statuses as readonly string[]).includes(o.status));
          return (
            <div key={col.key} className={cn("rounded-2xl border-2 flex flex-col min-h-[320px]", col.color)}>
              <div className="px-4 py-3 border-b border-inherit flex items-center justify-between shrink-0">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  {isAr ? col.ar : col.en}
                </h3>
                <Badge className="bg-background text-foreground">{colOrders.length}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 overscroll-contain">
                {colOrders.map((order) => {
                  const action = nextAction(order, isAr);
                  const lineItems = order.items ?? [];
                  const isUpdating = updateStatus.isPending && updateStatus.variables?.id === order.id;
                  return (
                    <div key={order.id} className="rounded-xl border bg-card shadow-sm p-4 space-y-3 relative z-10">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-base">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {order.table ? `${isAr ? "طاولة" : "T"}#${order.table.tableNumber}` : order.customerName || "—"}
                          </p>
                        </div>
                        <div className="text-end shrink-0 space-y-1">
                          <ElapsedTimer since={order.createdAt} isAr={isAr} />
                          {order.source === "qr" && <Badge variant="outline" className="text-[10px]"><Smartphone className="h-3 w-3" /></Badge>}
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                        {lineItems.length > 0 ? lineItems.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span><strong className="text-orange-600">{item.quantity}×</strong> {item.name}</span>
                          </div>
                        )) : (
                          <p className="text-xs text-muted-foreground italic">{isAr ? "لا أصناف" : "No items"}</p>
                        )}
                        {order.notes && <p className="text-xs text-amber-700 dark:text-amber-400 pt-1 border-t border-border/50">📝 {order.notes}</p>}
                      </div>

                      {action ? (
                        <Button
                          type="button"
                          size="sm"
                          className="w-full bg-orange-600 hover:bg-orange-700 gap-2 touch-manipulation relative z-20 cursor-pointer"
                          disabled={isUpdating}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus.mutate({ id: order.id, status: action.status });
                          }}
                        >
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          {action.label}
                          <ArrowRight className="h-3 w-3 ms-auto" />
                        </Button>
                      ) : order.orderType === "delivery" && order.status === "ready" ? (
                        <p className="text-xs text-center text-muted-foreground py-2">
                          {isAr ? "بانتظار السائق — راجع توصيل IQ Order" : "Waiting for driver — see IQ Order Delivery"}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {colOrders.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-8">{isAr ? "فارغ" : "Empty"}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
