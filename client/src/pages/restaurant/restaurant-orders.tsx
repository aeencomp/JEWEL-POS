import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Order = {
  id: number; orderNumber: string; status: string; paymentStatus: string;
  total: string; customerName: string | null; source: string; createdAt: string;
  table: { tableNumber: number } | null;
  items: { name: string; quantity: number }[];
};

export default function RestaurantOrders() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/restaurant/orders"] });

  const markPaid = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/restaurant/orders/${id}/status`, { status: "completed", paymentStatus: "paid" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] }),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">{isAr ? "سجل الطلبات" : "Order History"}</h1>
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">{o.orderNumber}</p>
              <p className="text-sm text-muted-foreground">
                {o.table ? `#${o.table.tableNumber}` : o.customerName} · {parseFloat(o.total).toLocaleString()} IQD
              </p>
              <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{o.status}</Badge>
              <Badge variant={o.paymentStatus === "paid" ? "default" : "secondary"}>{o.paymentStatus}</Badge>
              {o.paymentStatus === "unpaid" && o.status !== "cancelled" && (
                <Button size="sm" onClick={() => markPaid.mutate(o.id)}>{isAr ? "تم الدفع" : "Mark Paid"}</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
