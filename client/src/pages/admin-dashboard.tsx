import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store as StoreIcon, Users, DollarSign, AlertTriangle, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { Store, Subscription } from "@shared/schema";

export default function AdminDashboard() {
  const { t } = useLanguage();

  const { data: stores, isLoading: loadingStores } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const isLoading = loadingStores || loadingSubs;

  const totalStores = stores?.length || 0;
  const activeStores = stores?.filter((s) => s.isActive).length || 0;
  const monthlyRevenue =
    subscriptions
      ?.filter((s) => s.status === "active")
      .reduce((sum, s) => sum + parseFloat(s.pricePerMonth), 0) || 0;
  const expiringSoon =
    subscriptions?.filter((s) => {
      if (!s.endDate) return false;
      const daysLeft = Math.ceil(
        (new Date(s.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysLeft <= 7 && daysLeft > 0 && s.status === "active";
    }).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-spinner" />
      </div>
    );
  }

  const stats = [
    {
      title: t("admin.totalStores"),
      value: totalStores,
      icon: StoreIcon,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      testId: "stat-total-stores",
    },
    {
      title: t("admin.activeStores"),
      value: activeStores,
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      testId: "stat-active-stores",
    },
    {
      title: t("admin.revenue"),
      value: `${monthlyRevenue.toLocaleString()} ${t("common.currency")}`,
      icon: DollarSign,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      testId: "stat-revenue",
    },
    {
      title: t("admin.expiringSoon"),
      value: expiringSoon,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      testId: "stat-expiring-soon",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">
        {t("admin.dashboard")}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.testId}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm text-muted-foreground font-medium">
                  {stat.title}
                </p>
                <div
                  className={`w-8 h-8 rounded-md ${stat.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold" data-testid={`text-${stat.testId}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">{t("admin.recentStores")}</CardTitle>
          <Badge variant="secondary">{totalStores}</Badge>
        </CardHeader>
        <CardContent>
          {stores?.length === 0 ? (
            <div className="text-center py-8">
              <StoreIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.storeName")}</TableHead>
                    <TableHead>{t("admin.owner")}</TableHead>
                    <TableHead>{t("admin.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores?.slice(0, 10).map((store) => (
                    <TableRow key={store.id} data-testid={`row-store-${store.id}`}>
                      <TableCell className="font-medium" data-testid={`text-store-name-${store.id}`}>
                        {store.name}
                      </TableCell>
                      <TableCell data-testid={`text-store-owner-${store.id}`}>
                        {store.ownerName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={store.isActive ? "default" : "secondary"}
                          data-testid={`badge-store-status-${store.id}`}
                        >
                          {store.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
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
