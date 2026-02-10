import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Clock, ChefHat, Check, Loader2, Ban } from "lucide-react";
import type { Order } from "@shared/schema";

export default function PosOrders() {
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order updated" });
    },
  });

  const activeOrders = orders?.filter((o) => !["completed", "cancelled"].includes(o.status)) || [];
  const completedOrders = orders?.filter((o) => ["completed", "cancelled"].includes(o.status)).slice(0, 10) || [];

  const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
    pending: { color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400", icon: Clock },
    preparing: { color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400", icon: ChefHat },
    ready: { color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", icon: Check },
    completed: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400", icon: Check },
    cancelled: { color: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400", icon: Ban },
  };

  const formatTime = (date: string | Date) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Active Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage incoming and in-progress orders</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No active orders</p>
            <p className="text-sm text-muted-foreground mt-1">New orders will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeOrders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            return (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-lg">#{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className={config.color}>
                      <config.icon className="h-3 w-3 mr-1" />
                      {order.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 mb-3">
                    {order.tableNumber && (
                      <p className="text-xs text-muted-foreground">Table: {order.tableNumber}</p>
                    )}
                    {order.customerName && (
                      <p className="text-xs text-muted-foreground">Customer: {order.customerName}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-muted/50 mb-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold">${order.total}</span>
                  </div>

                  <Select
                    value={order.status}
                    onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}
                  >
                    <SelectTrigger data-testid={`select-order-status-${order.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {completedOrders.length > 0 && (
        <>
          <div>
            <h2 className="text-lg font-semibold">Recent Completed</h2>
            <p className="text-sm text-muted-foreground mt-1">Last 10 completed or cancelled orders</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.completed;
              return (
                <Card key={order.id} className="opacity-70" data-testid={`card-completed-${order.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-bold">#{order.orderNumber}</p>
                      <Badge variant="outline" className={config.color}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
                      <p className="font-bold text-sm">${order.total}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
