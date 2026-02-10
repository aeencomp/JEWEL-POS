import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import type { Order } from "@shared/schema";

export default function PosHistory() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const completedOrders = orders?.filter((o) => o.status === "completed") || [];
  const todayOrders = completedOrders.filter((o) => {
    const today = new Date();
    const orderDate = new Date(o.createdAt);
    return orderDate.toDateString() === today.toDateString();
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
  const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);

  const stats = [
    {
      title: "Today's Orders",
      value: todayOrders.length,
      icon: ShoppingCart,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Today's Revenue",
      value: `${Math.round(todayRevenue).toLocaleString()} IQD`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Total Revenue",
      value: `${Math.round(totalRevenue).toLocaleString()} IQD`,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  const statusColors: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    preparing: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    ready: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  };

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Order History</h1>
        <p className="text-sm text-muted-foreground mt-1">View all past orders and revenue</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <div className={`w-8 h-8 rounded-md ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">All Orders</CardTitle>
          <Badge variant="secondary">{orders?.length || 0} total</Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No orders yet</p>
              <p className="text-sm text-muted-foreground mt-1">Orders will appear here after checkout</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell className="font-bold">#{order.orderNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{order.tableNumber || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{order.customerName || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[order.status] || ""}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{order.paymentMethod || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{parseInt(order.total).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
