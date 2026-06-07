import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type OrderItem = { id: number; name: string; quantity: number; price?: string };
type Order = {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  customerName: string | null;
  source: string;
  createdAt: string;
  table: { tableNumber: number } | null;
  items?: OrderItem[];
};

export default function RestaurantOrders() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/restaurant/orders"] });

  const markPaid = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/restaurant/orders/${id}/status`, { status: "completed", paymentStatus: "paid" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] }),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">{isAr ? "سجل الطلبات" : "Order History"}</h1>
      {orders.map((o) => {
        const lineItems = o.items ?? [];
        return (
          <Card key={o.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{o.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {o.table
                      ? `${isAr ? "طاولة" : "Table"} #${o.table.tableNumber}`
                      : o.customerName || (isAr ? "زبون" : "Guest")}
                    {" · "}
                    {parseFloat(o.total).toLocaleString()} {isAr ? "د.ع" : "IQD"}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{o.status}</Badge>
                  <Badge variant={o.paymentStatus === "paid" ? "default" : "secondary"}>{o.paymentStatus}</Badge>
                  {o.source === "qr" && <Badge variant="outline">QR</Badge>}
                  {o.paymentStatus === "unpaid" && o.status !== "cancelled" && (
                    <Button size="sm" onClick={() => markPaid.mutate(o.id)}>
                      {isAr ? "تم الدفع" : "Mark Paid"}
                    </Button>
                  )}
                </div>
              </div>
              {lineItems.length > 0 ? (
                <ul className="text-sm space-y-1 rounded-lg border bg-muted/20 p-3">
                  {lineItems.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        <span className="font-semibold text-orange-600">{item.quantity}×</span> {item.name}
                      </span>
                      {item.price && (
                        <span className="text-muted-foreground tabular-nums shrink-0">
                          {(parseFloat(item.price) * item.quantity).toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {isAr ? "لا توجد أصناف مسجلة" : "No items recorded"}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
      {orders.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{isAr ? "لا توجد طلبات بعد" : "No orders yet"}</p>
      )}
    </div>
  );
}
