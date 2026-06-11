import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { CreditCard, RefreshCcw, Loader2, Check, Pencil, Bell } from "lucide-react";
import type { Store, Subscription } from "@shared/schema";
import { useQueryParam } from "@/hooks/use-query-param";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [renewTarget, setRenewTarget] = useState<{ id: number; storeName: string } | null>(null);

  const { data: stores, isLoading: loadingStores } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  const filter = useQueryParam("filter");

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const displayedSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    if (filter !== "expiring") return subscriptions;
    return subscriptions.filter((s) => {
      if (!s.endDate || s.status !== "active") return false;
      const daysLeft = Math.ceil(
        (new Date(s.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      return daysLeft <= 7 && daysLeft > 0;
    });
  }, [subscriptions, filter]);

  const priceMutation = useMutation({
    mutationFn: async ({ id, pricePerMonth }: { id: number; pricePerMonth: string }) => {
      const res = await apiRequest("PATCH", `/api/subscriptions/${id}`, { pricePerMonth });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setEditingPrice(null);
      toast({ title: language === "ar" ? "تم تحديث السعر بنجاح" : "Price updated successfully" });
    },
    onError: (error: Error) => {
      const is403 = error.message.startsWith("403");
      toast({
        title: language === "ar" ? "فشل التحديث" : "Update failed",
        description: is403
          ? (language === "ar" ? "انتهت الجلسة. يرجى تسجيل الخروج وإعادة الدخول." : "Session expired. Please log out and log in again.")
          : error.message,
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
      setRenewTarget(null);
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

      {filter === "expiring" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive">{t("admin.expiringSoon")}</Badge>
          <Link href="/subscriptions" className="text-sm text-primary hover:underline">
            {t("inventory.showAll")}
          </Link>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">{t("admin.subscriptions")}</CardTitle>
          <Badge variant="secondary">{displayedSubscriptions.length}</Badge>
        </CardHeader>
        <CardContent>
          {displayedSubscriptions.length === 0 ? (
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
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Bell className="h-3.5 w-3.5" />
                        {language === "ar" ? "طلب التجديد" : "Renewal Request"}
                      </div>
                    </TableHead>
                    <TableHead className="text-end">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedSubscriptions.map((sub) => {
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
                            {t("common.standard")}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-sub-price-${sub.id}`}>
                          {editingPrice === sub.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={priceValue}
                                onChange={(e) => setPriceValue(e.target.value)}
                                className="w-28"
                                data-testid={`input-price-${sub.id}`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && priceValue) {
                                    priceMutation.mutate({ id: sub.id, pricePerMonth: priceValue });
                                  }
                                  if (e.key === "Escape") setEditingPrice(null);
                                }}
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (priceValue) priceMutation.mutate({ id: sub.id, pricePerMonth: priceValue });
                                }}
                                disabled={priceMutation.isPending || !priceValue}
                                data-testid={`button-save-price-${sub.id}`}
                              >
                                {priceMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-1.5 hover:underline cursor-pointer text-start group"
                              onClick={() => {
                                setEditingPrice(sub.id);
                                setPriceValue(parseInt(sub.pricePerMonth).toString());
                              }}
                              data-testid={`button-edit-price-${sub.id}`}
                            >
                              {parseInt(sub.pricePerMonth).toLocaleString()}{" "}
                              {t("common.currency")}
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
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
                        <TableCell data-testid={`text-renewal-req-${sub.id}`}>
                          {(sub as any).renewalRequestedAt ? (
                            <div className="space-y-0.5">
                              <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30 gap-1 text-[11px]">
                                <Bell className="h-3 w-3" />
                                {language === "ar" ? "طلب مُرسَل" : "Requested"}
                              </Badge>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDate((sub as any).renewalRequestedAt)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRenewTarget({ id: sub.id, storeName: getStoreName(sub.storeId) })
                            }
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

      <AlertDialog open={!!renewTarget} onOpenChange={(open) => !open && setRenewTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.renew")} — {renewTarget?.storeName}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("admin.renewConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-renew">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => renewTarget && renewMutation.mutate(renewTarget.id)}
              disabled={renewMutation.isPending}
              data-testid="button-confirm-renew"
            >
              {renewMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("admin.renew")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
