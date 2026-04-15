import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle,
  ShoppingCart, Truck, HandCoins, BarChart3,
} from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function OilDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/oil/dashboard"],
    queryFn: () => fetch("/api/oil/dashboard", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: isAr ? "إجمالي الإيرادات" : "Total Revenue",
      value: `${fmt(data?.totalRevenue ?? 0)} IQD`,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-950/30",
      testId: "stat-revenue",
    },
    {
      label: isAr ? "تكلفة المشتريات" : "Total Purchases",
      value: `${fmt(data?.totalCOGS ?? 0)} IQD`,
      icon: Truck,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      testId: "stat-cogs",
    },
    {
      label: isAr ? "المصاريف" : "Expenses",
      value: `${fmt(data?.totalExpenses ?? 0)} IQD`,
      icon: DollarSign,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      testId: "stat-expenses",
    },
    {
      label: isAr ? "صافي الربح" : "Net Profit",
      value: `${fmt(data?.netProfit ?? 0)} IQD`,
      icon: BarChart3,
      color: (data?.netProfit ?? 0) >= 0 ? "text-emerald-500" : "text-red-500",
      bg: (data?.netProfit ?? 0) >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30",
      testId: "stat-profit",
    },
    {
      label: isAr ? "ذمم مدينة" : "Receivables",
      value: `${fmt(data?.totalReceivable ?? 0)} IQD`,
      icon: TrendingUp,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      testId: "stat-receivable",
    },
    {
      label: isAr ? "ذمم دائنة" : "Payables",
      value: `${fmt(data?.totalPayable ?? 0)} IQD`,
      icon: TrendingDown,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      testId: "stat-payable",
    },
    {
      label: isAr ? "عدد المنتجات" : "Products",
      value: data?.productCount ?? 0,
      icon: Package,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      testId: "stat-products",
    },
    {
      label: isAr ? "مخزون منخفض" : "Low Stock",
      value: data?.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: data?.lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground",
      bg: data?.lowStockCount > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted",
      testId: "stat-low-stock",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1">{isAr ? "لوحة التحكم" : "Dashboard"}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? "نظرة عامة على المصنع" : "Factory overview"}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.testId} data-testid={`card-${s.testId}`}>
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${s.color}`} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`} data-testid={s.testId}>{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-500" />
              {isAr ? "آخر المبيعات" : "Recent Sales"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(!data?.recentSales?.length) ? (
              <p className="text-sm text-muted-foreground text-center py-4">{isAr ? "لا توجد مبيعات بعد" : "No sales yet"}</p>
            ) : data.recentSales.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <p className="font-medium">{s.customerName || s.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-end">
                  <p className="font-semibold text-green-600">{fmt(parseFloat(s.totalAmount))} IQD</p>
                  <Badge variant="outline" className={`text-[10px] ${s.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}`}>
                    {s.paymentStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              {isAr ? "آخر المشتريات" : "Recent Purchases"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(!data?.recentPurchases?.length) ? (
              <p className="text-sm text-muted-foreground text-center py-4">{isAr ? "لا توجد مشتريات بعد" : "No purchases yet"}</p>
            ) : data.recentPurchases.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <p className="font-medium">{p.supplierName || p.invoiceNumber || `PO-${p.id}`}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-end">
                  <p className="font-semibold text-blue-600">{fmt(parseFloat(p.totalAmount))} IQD</p>
                  <Badge variant="outline" className={`text-[10px] ${p.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}`}>
                    {p.paymentStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
