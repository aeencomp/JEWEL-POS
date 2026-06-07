import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import type { Order, InventoryItem, Customer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, Package, RotateCcw, Heart,   TrendingUp, AlertTriangle,
  ArrowRight, Shirt, Tag, FileText,
} from "lucide-react";

export default function FashionDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: inventory = [] } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => {
      if (o.status === "cancelled") return false;
      return new Date(o.createdAt) >= today;
    });
    const todaySales = todayOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const lowStock = inventory.filter((i) => i.quantity > 0 && i.quantity <= 3).length;
    const outOfStock = inventory.filter((i) => i.quantity === 0).length;
    const returns = orders.filter((o) => o.status === "refunded").length;
    const totalLoyalty = customers.reduce((s, c) => s + (c.loyaltyPoints || 0), 0);
    const variantCount = inventory.filter((i) => (i as InventoryItem & { size?: string }).size).length;

    return { todaySales, todayOrders: todayOrders.length, lowStock, outOfStock, returns, totalLoyalty, variantCount, totalItems: inventory.length };
  }, [orders, inventory, customers]);

  const kpis = [
    { label: isAr ? "مبيعات اليوم" : "Today's Sales", value: stats.todaySales.toLocaleString(), sub: `${stats.todayOrders} ${isAr ? "طلب" : "orders"}`, icon: TrendingUp, border: "border-s-emerald-500", iconBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" },
    { label: isAr ? "المنتجات" : "Products", value: String(stats.totalItems), sub: `${stats.variantCount} ${isAr ? "بمقاس/لون" : "with size/color"}`, icon: Package, border: "border-s-pink-500", iconBg: "bg-pink-100 dark:bg-pink-900/30 text-pink-600" },
    { label: isAr ? "مخزون منخفض" : "Low Stock", value: String(stats.lowStock + stats.outOfStock), sub: isAr ? "يحتاج إعادة تخزين" : "needs restock", icon: AlertTriangle, border: "border-s-orange-500", iconBg: "bg-orange-100 dark:bg-orange-900/30 text-orange-600" },
    { label: isAr ? "نقاط الولاء" : "Loyalty Points", value: stats.totalLoyalty.toLocaleString(), sub: `${customers.length} ${isAr ? "عميل" : "customers"}`, icon: Heart, border: "border-s-rose-500", iconBg: "bg-rose-100 dark:bg-rose-900/30 text-rose-600" },
  ];

  const quickActions = [
    { href: "/fashion/pos", icon: ShoppingCart, label: isAr ? "نقطة البيع" : "Open POS", color: "#db2777" },
    { href: "/fashion/reports", icon: FileText, label: isAr ? "تقرير اليوم" : "Daily Report", color: "#7c3aed" },
    { href: "/fashion/inventory", icon: Tag, label: isAr ? "إضافة منتجات" : "Manage Inventory", color: "#9333ea" },
    { href: "/fashion/returns", icon: RotateCcw, label: isAr ? "معالجة مرتجع" : "Process Return", color: "#e11d48" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-fashion-dashboard-title">
            <Shirt className="h-7 w-7 text-pink-500" />
            {isAr ? "لوحة تحكم الأزياء" : "Fashion Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "نظرة سريعة على مبيعاتك ومخزونك وعملائك" : "Quick overview of sales, stock, and customers"}
          </p>
        </div>
        <Link href="/fashion/pos">
          <Button className="bg-pink-600 hover:bg-pink-700" data-testid="button-dashboard-pos">
            <ShoppingCart className="h-4 w-4 me-2" />
            {isAr ? "فتح نقطة البيع" : "Open POS"}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={`border-s-4 ${kpi.border} shadow-sm`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${kpi.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ background: action.color }}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{action.label}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      {isAr ? "انتقل" : "Go"} <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {stats.returns > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm">
              {isAr ? `${stats.returns} طلب مُرجَع` : `${stats.returns} refunded orders`}
            </p>
            <Link href="/fashion/returns">
              <Button variant="outline" size="sm">{isAr ? "عرض المرتجعات" : "View Returns"}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
