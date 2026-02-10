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
import { useLanguage } from "@/hooks/use-language";
import { CreditCard, RefreshCcw, Loader2, Calendar } from "lucide-react";
import type { Restaurant, Subscription } from "@shared/schema";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const { t, language } = useLanguage();

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
      toast({ title: t("subscriptions.updated") });
    },
    onError: (error: Error) => {
      toast({ title: t("subscriptions.updateFailed"), description: error.message, variant: "destructive" });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/subscriptions/${id}/renew`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: t("subscriptions.renewed30") });
    },
    onError: (error: Error) => {
      toast({ title: t("subscriptions.renewFailed"), description: error.message, variant: "destructive" });
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

  const statusLabels: Record<string, string> = {
    active: t("subscriptions.active"),
    expired: t("subscriptions.expired"),
    cancelled: t("subscriptions.cancelled"),
    trial: t("subscriptions.trial"),
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString(language === "ar" ? "ar-IQ" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const plans = [
    { label: t("subscriptions.basicPlan"), price: "35,000 IQD", desc: t("subscriptions.basicDesc") },
    { label: t("subscriptions.standardPlan"), price: "75,000 IQD", desc: t("subscriptions.standardDesc") },
    { label: t("subscriptions.premiumPlan"), price: "125,000 IQD", desc: t("subscriptions.premiumDesc") },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("subscriptions.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subscriptions.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
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
          <CardTitle className="text-base">{t("subscriptions.allSubscriptions")}</CardTitle>
          <Badge variant="secondary">{subscriptions?.length || 0} {t("dashboard.total")}</Badge>
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
              <p className="text-lg font-medium text-muted-foreground">{t("subscriptions.noSubscriptions")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("subscriptions.createdWhenAdd")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("subscriptions.restaurant")}</TableHead>
                    <TableHead>{t("subscriptions.plan")}</TableHead>
                    <TableHead>{t("subscriptions.price")}</TableHead>
                    <TableHead>{t("subscriptions.status")}</TableHead>
                    <TableHead>{t("subscriptions.startDate")}</TableHead>
                    <TableHead>{t("subscriptions.endDate")}</TableHead>
                    <TableHead className="text-end">{t("subscriptions.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                      <TableCell className="font-medium">{getRestaurantName(sub.restaurantId)}</TableCell>
                      <TableCell className="capitalize">{sub.plan}</TableCell>
                      <TableCell>{parseInt(sub.pricePerMonth).toLocaleString()} IQD</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[sub.status] || ""}>
                          {statusLabels[sub.status] || sub.status}
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
                              <SelectItem value="active">{t("subscriptions.active")}</SelectItem>
                              <SelectItem value="expired">{t("subscriptions.expired")}</SelectItem>
                              <SelectItem value="cancelled">{t("subscriptions.cancelled")}</SelectItem>
                              <SelectItem value="trial">{t("subscriptions.trial")}</SelectItem>
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
                              <><RefreshCcw className="h-3 w-3 me-1" />{t("subscriptions.renew")}</>
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
