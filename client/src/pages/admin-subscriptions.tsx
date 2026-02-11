import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CreditCard, RefreshCcw, Loader2 } from "lucide-react";
import type { Store, Subscription } from "@shared/schema";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const { data: stores, isLoading: loadingStores } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, plan }: { id: number; plan: string }) => {
      const res = await apiRequest("PATCH", `/api/subscriptions/${id}`, { plan });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: t("admin.subscriptions") });
    },
    onError: (error: Error) => {
      toast({
        title: t("admin.subscriptions"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/subscriptions/${id}/renew`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: t("admin.renew") });
    },
    onError: (error: Error) => {
      toast({
        title: t("admin.renew"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingStores || loadingSubs;

  const getStoreName = (storeId: number) =>
    stores?.find((s) => s.id === storeId)?.name || "—";

  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(
      language === "ar" ? "ar-IQ" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
  };

  const getDaysRemaining = (endDate: string | Date | null) => {
    if (!endDate) return "—";
    const days = Math.ceil(
      (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? days : 0;
  };

  const planLabels: Record<string, string> = {
    basic: t("common.basic"),
    standard: t("common.standard"),
    premium: t("common.premium"),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">
        {t("admin.subscriptions")}
      </h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">{t("admin.subscriptions")}</CardTitle>
          <Badge variant="secondary">{subscriptions?.length || 0}</Badge>
        </CardHeader>
        <CardContent>
          {subscriptions?.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {t("common.noData")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.storeName")}</TableHead>
                    <TableHead>{t("admin.plan")}</TableHead>
                    <TableHead>{t("admin.revenue")}</TableHead>
                    <TableHead>{t("admin.status")}</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>{t("admin.daysLeft")}</TableHead>
                    <TableHead className="text-end">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => {
                    const daysLeft = getDaysRemaining(sub.endDate);
                    return (
                      <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                        <TableCell
                          className="font-medium"
                          data-testid={`text-sub-store-${sub.id}`}
                        >
                          {getStoreName(sub.storeId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-plan-${sub.id}`}>
                            {planLabels[sub.plan] || sub.plan}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-sub-price-${sub.id}`}>
                          {parseInt(sub.pricePerMonth).toLocaleString()}{" "}
                          {t("common.currency")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={sub.status === "active" ? "default" : "secondary"}
                            data-testid={`badge-sub-status-${sub.id}`}
                          >
                            {sub.status === "active"
                              ? t("common.active")
                              : t("common.expired")}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground"
                          data-testid={`text-start-date-${sub.id}`}
                        >
                          {formatDate(sub.startDate)}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground"
                          data-testid={`text-end-date-${sub.id}`}
                        >
                          {formatDate(sub.endDate)}
                        </TableCell>
                        <TableCell data-testid={`text-days-left-${sub.id}`}>
                          {daysLeft}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={sub.plan}
                              onValueChange={(plan) =>
                                updateMutation.mutate({ id: sub.id, plan })
                              }
                            >
                              <SelectTrigger
                                className="w-28"
                                data-testid={`select-plan-${sub.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic">
                                  {t("common.basic")}
                                </SelectItem>
                                <SelectItem value="standard">
                                  {t("common.standard")}
                                </SelectItem>
                                <SelectItem value="premium">
                                  {t("common.premium")}
                                </SelectItem>
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
                                <>
                                  <RefreshCcw className="h-3 w-3 me-1" />
                                  {t("admin.renew")}
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
