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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, RefreshCcw, Loader2, Calendar } from "lucide-react";
import type { Restaurant, Subscription } from "@shared/schema";

export default function AdminSubscriptions() {
  const { toast } = useToast();

  const { data: restaurants, isLoading: loadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/subscriptions/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Subscription updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/subscriptions/${id}/renew`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Subscription renewed for 30 days" });
    },
    onError: (error: Error) => {
      toast({ title: "Renewal failed", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = loadingRestaurants || loadingSubs;

  const getRestaurantName = (restaurantId: number) =>
    restaurants?.find((r) => r.id === restaurantId)?.name || "Unknown";

  const statusColors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    expired: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400",
    trial: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage monthly subscription plans</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Basic Plan", price: "$29.99/mo", desc: "Essential POS features" },
          { label: "Standard Plan", price: "$59.99/mo", desc: "Advanced reporting & analytics" },
          { label: "Premium Plan", price: "$99.99/mo", desc: "Full features with priority support" },
        ].map((plan) => (
          <Card key={plan.label}>
            <CardContent className="p-5 text-center">
              <p className="text-sm font-medium">{plan.label}</p>
              <p className="text-2xl font-bold mt-1">{plan.price}</p>
              <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">All Subscriptions</CardTitle>
          <Badge variant="secondary">{subscriptions?.length || 0} total</Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : subscriptions?.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No subscriptions</p>
              <p className="text-sm text-muted-foreground mt-1">
                Subscriptions are created when you add restaurants
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                      <TableCell className="font-medium">{getRestaurantName(sub.restaurantId)}</TableCell>
                      <TableCell className="capitalize">{sub.plan}</TableCell>
                      <TableCell>${sub.pricePerMonth}/mo</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[sub.status] || ""}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(sub.startDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(sub.endDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={sub.status}
                            onValueChange={(status) => updateStatusMutation.mutate({ id: sub.id, status })}
                          >
                            <SelectTrigger className="w-28" data-testid={`select-status-${sub.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="trial">Trial</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => renewMutation.mutate(sub.id)}
                            disabled={renewMutation.isPending}
                            data-testid={`button-renew-${sub.id}`}
                          >
                            {renewMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <><RefreshCcw className="h-3 w-3 mr-1" />Renew</>
                            )}
                          </Button>
                        </div>
                      </TableCell>
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
