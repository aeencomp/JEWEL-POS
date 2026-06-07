import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order, OrderItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RotateCcw, Search } from "lucide-react";

export default function FashionReturnsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});

  const { data: orders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const orderIdNum = selectedOrderId ? parseInt(selectedOrderId) : null;

  const { data: orderItems = [], isLoading: loadingItems } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", orderIdNum, "items"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders/${orderIdNum}/items`);
      return res.json();
    },
    enabled: !!orderIdNum,
  });

  const returnableOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status !== "completed") return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  const returnMutation = useMutation({
    mutationFn: async (payload: { orderId: number; items: { orderItemId: number; quantity: number }[] }) => {
      const res = await apiRequest("POST", `/api/orders/${payload.orderId}/return`, {
        items: payload.items,
      });
      return res.json() as Promise<{ refundAmount: string; fullyReturned: boolean }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (orderIdNum) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", orderIdNum, "items"] });
      }
      setReturnQtys({});
      toast({
        title: t("returns.success"),
        description: `${parseFloat(data.refundAmount).toLocaleString()} ${t("common.currency")}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  function handleProcessReturn() {
    if (!orderIdNum) return;
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
    returnMutation.mutate({ orderId: orderIdNum, items });
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("returns.searchOrder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
                data-testid="input-search-returns"
              />
            </div>
            <Select
              value={selectedOrderId}
              onValueChange={(v) => {
                setSelectedOrderId(v);
                setReturnQtys({});
              }}
            >
              <SelectTrigger className="sm:w-72" data-testid="select-return-order">
                <SelectValue placeholder={t("returns.selectOrder")} />
              </SelectTrigger>
              <SelectContent>
                {returnableOrders.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.orderNumber} — {o.customerName || t("pos.walkIn")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {orderIdNum && (
            loadingItems ? (
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
                        <TableHead>{t("pos.total")}</TableHead>
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
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
