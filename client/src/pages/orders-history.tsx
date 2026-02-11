import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import type { Order, OrderItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShoppingBag, Eye } from "lucide-react";

type StatusFilter = "all" | "completed" | "cancelled" | "refunded";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  pending: "secondary",
  cancelled: "destructive",
  refunded: "outline",
};

const paymentVariants: Record<string, "default" | "secondary" | "outline"> = {
  cash: "secondary",
  card: "default",
  transfer: "outline",
};

export default function OrdersHistory() {
  const { t } = useLanguage();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: orderItems = [], isLoading: loadingItems } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", selectedOrderId, "items"],
    enabled: selectedOrderId !== null,
    queryFn: async () => {
      const res = await fetch(`/api/orders/${selectedOrderId}/items`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold" data-testid="text-orders-title">
        {t("orders.title")}
      </h1>

      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
      >
        <TabsList data-testid="tabs-status-filter">
          <TabsTrigger value="all" data-testid="tab-all">
            {t("pos.allCategories")}
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            {t("orders.completed")}
          </TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled">
            {t("orders.cancelled")}
          </TabsTrigger>
          <TabsTrigger value="refunded" data-testid="tab-refunded">
            {t("orders.refunded")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground" data-testid="text-no-orders">
              {t("orders.noOrders")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orders.orderNumber")}</TableHead>
                <TableHead>{t("orders.customer")}</TableHead>
                <TableHead>{t("orders.total")}</TableHead>
                <TableHead>{t("orders.payment")}</TableHead>
                <TableHead>{t("orders.status")}</TableHead>
                <TableHead>{t("orders.date")}</TableHead>
                <TableHead>{t("orders.items")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                  <TableCell className="font-mono text-sm" data-testid={`text-order-number-${order.id}`}>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell data-testid={`text-order-customer-${order.id}`}>
                    {order.customerName || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-order-total-${order.id}`}>
                    {parseFloat(order.total).toLocaleString()} {t("common.currency")}
                  </TableCell>
                  <TableCell>
                    {order.paymentMethod && (
                      <Badge
                        variant={paymentVariants[order.paymentMethod] || "secondary"}
                        className="no-default-active-elevate"
                        data-testid={`badge-payment-${order.id}`}
                      >
                        {order.paymentMethod === "cash"
                          ? t("pos.payByCash")
                          : order.paymentMethod === "card"
                            ? t("pos.payByCard")
                            : t("pos.payByTransfer")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariants[order.status] || "secondary"}
                      className="no-default-active-elevate"
                      data-testid={`badge-status-${order.id}`}
                    >
                      {t(`orders.${order.status}` as any)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-order-date-${order.id}`}>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSelectedOrderId(order.id)}
                      data-testid={`button-view-items-${order.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={selectedOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("orders.items")} - {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {loadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orderItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {t("orders.noOrders")}
            </p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("inventory.sku")}</TableHead>
                    <TableHead>{t("inventory.name")}</TableHead>
                    <TableHead>{t("pos.qty")}</TableHead>
                    <TableHead>{t("pos.price")}</TableHead>
                    <TableHead>{t("pos.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id} data-testid={`row-order-item-${item.id}`}>
                      <TableCell className="font-mono text-sm">{item.sku || "-"}</TableCell>
                      <TableCell data-testid={`text-item-name-${item.id}`}>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {parseFloat(item.price).toLocaleString()} {t("common.currency")}
                      </TableCell>
                      <TableCell data-testid={`text-item-total-${item.id}`}>
                        {(parseFloat(item.price) * item.quantity).toLocaleString()} {t("common.currency")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {selectedOrder && (
            <div className="flex justify-between items-center pt-2 text-sm font-medium">
              <span>{t("pos.grandTotal")}</span>
              <span data-testid="text-order-detail-total">
                {parseFloat(selectedOrder.total).toLocaleString()} {t("common.currency")}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
