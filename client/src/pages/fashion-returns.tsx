import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order, OrderItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RotateCcw, Search } from "lucide-react";

type ReturnableOrder = Order & { returnableQty?: number; itemCount?: number };

export default function FashionReturnsPage() {
  const { t, language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});

  const { data: returnableOrders = [], isLoading: loadingOrders, refetch } = useQuery<ReturnableOrder[]>({
    queryKey: ["/api/orders/returnable"],
    refetchOnMount: "always",
  });

  const { data: orderItems = [], isLoading: loadingItems } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", selectedOrderId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${selectedOrderId}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load order items");
      return res.json();
    },
    enabled: selectedOrderId !== null,
  });

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return returnableOrders;
    return returnableOrders.filter((o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      (o.customerName || "").toLowerCase().includes(q) ||
      (o.customerPhone || "").toLowerCase().includes(q),
    );
  }, [returnableOrders, search]);

  const selectedOrder = returnableOrders.find((o) => o.id === selectedOrderId) ?? null;

  const returnMutation = useMutation({
    mutationFn: async (payload: { orderId: number; items: { orderItemId: number; quantity: number }[] }) => {
      const res = await apiRequest("POST", `/api/orders/${payload.orderId}/return`, {
        items: payload.items,
      });
      return res.json() as Promise<{ refundAmount: string; fullyReturned: boolean }>;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/orders/returnable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (selectedOrderId) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "items"] });
      }
      setReturnQtys({});
      if (data.fullyReturned) {
        setSelectedOrderId(null);
      } else {
        refetch();
      }
      toast({
        title: t("returns.success"),
        description: `${parseFloat(data.refundAmount).toLocaleString()} ${t("common.currency")}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  function selectOrder(order: ReturnableOrder) {
    setSelectedOrderId(order.id);
    setReturnQtys({});
  }

  function handleProcessReturn() {
    if (!selectedOrderId) return;
    const items = Object.entries(returnQtys)
      .filter(([, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({
        orderItemId: parseInt(orderItemId),
        quantity,
      }));
    if (items.length === 0) {
      toast({ title: t("returns.noItems"), variant: "destructive" });
      return;
    }
    returnMutation.mutate({ orderId: selectedOrderId, items });
  }

  const estimatedRefund = orderItems.reduce((sum, oi) => {
    const qty = returnQtys[oi.id] || 0;
    return sum + parseFloat(oi.price) * qty;
  }, 0);

  if (loadingOrders) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-returns-title">
          <RotateCcw className="h-6 w-6" />
          {t("returns.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("returns.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("returns.searchOrder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
              data-testid="input-search-returns"
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground" data-testid="text-no-returnable-orders">
              <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("returns.noOrders")}</p>
              <p className="text-sm mt-1">{t("returns.noOrdersHint")}</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pos.orderNumber")}</TableHead>
                    <TableHead>{t("pos.customer")}</TableHead>
                    <TableHead>{t("receipt.date")}</TableHead>
                    <TableHead>{t("pos.grandTotal")}</TableHead>
                    <TableHead>{t("returns.returnQty")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className={selectedOrderId === order.id ? "bg-muted/50" : "cursor-pointer"}
                      onClick={() => selectOrder(order)}
                      data-testid={`row-return-order-${order.id}`}
                    >
                      <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName || t("pos.walkIn")}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString(isAr ? "ar-IQ" : "en-GB") : "—"}
                      </TableCell>
                      <TableCell>
                        {parseFloat(order.total).toLocaleString()} {t("common.currency")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.returnableQty ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          size="sm"
                          variant={selectedOrderId === order.id ? "default" : "outline"}
                          onClick={(e) => { e.stopPropagation(); selectOrder(order); }}
                          data-testid={`button-select-return-${order.id}`}
                        >
                          {t("returns.selectOrder")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold">
                {selectedOrder.orderNumber} — {selectedOrder.customerName || t("pos.walkIn")}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedOrderId(null); setReturnQtys({}); }}>
                {isAr ? "إلغاء" : "Clear"}
              </Button>
            </div>

            {loadingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orderItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">{t("returns.noItems")}</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("inventory.name")}</TableHead>
                        <TableHead>{t("inventory.sku")}</TableHead>
                        <TableHead>{t("pos.price")}</TableHead>
                        <TableHead>{t("inventory.quantity")}</TableHead>
                        <TableHead>{t("returns.returnQty")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((oi) => {
                        const remaining = oi.quantity - (oi.returnedQuantity || 0);
                        return (
                          <TableRow key={oi.id} data-testid={`row-return-item-${oi.id}`}>
                            <TableCell>{oi.name}</TableCell>
                            <TableCell className="text-muted-foreground">{oi.sku || "—"}</TableCell>
                            <TableCell>
                              {parseFloat(oi.price).toLocaleString()} {t("common.currency")}
                            </TableCell>
                            <TableCell>
                              {remaining <= 0 ? (
                                <span className="text-muted-foreground">{t("returns.fullyReturned")}</span>
                              ) : (
                                <span>{remaining} / {oi.quantity}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {remaining > 0 && (
                                <Input
                                  type="number"
                                  min={0}
                                  max={remaining}
                                  value={returnQtys[oi.id] || ""}
                                  onChange={(e) => {
                                    const v = Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0));
                                    setReturnQtys((prev) => ({ ...prev, [oi.id]: v }));
                                  }}
                                  className="w-20"
                                  data-testid={`input-return-qty-${oi.id}`}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm">
                    {t("returns.refundAmount")}:{" "}
                    <span className="font-bold">
                      {estimatedRefund.toLocaleString()} {t("common.currency")}
                    </span>
                  </p>
                  <Button
                    onClick={handleProcessReturn}
                    disabled={returnMutation.isPending || estimatedRefund <= 0}
                    data-testid="button-process-return"
                  >
                    {returnMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    {t("returns.processReturn")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
