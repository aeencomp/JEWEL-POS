import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import type { Order, InventoryItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, Package, AlertTriangle,   TrendingUp, ShoppingBasket, ArrowRight, FileText, Truck, Building2,
} from "lucide-react";

type ExpiryData = { expired: number; expiringSoon: number };

export default function GroceryDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: inventory = [] } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: expiry } = useQuery<ExpiryData>({ queryKey: ["/api/grocery/expiry-alerts?days=90"] });

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => o.status !== "cancelled" && new Date(o.createdAt) >= today);
    const todaySales = todayOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const lowStock = inventory.filter((i) => i.quantity > 0 && i.quantity <= 5).length;
    return { todaySales, todayOrders: todayOrders.length, totalProducts: inventory.length, lowStock };
  }, [orders, inventory]);

  const kpis = [
    { label: isAr ? "مبيعات اليوم" : "Today's Sales", value: stats.todaySales.toLocaleString(), sub: `${stats.todayOrders} ${isAr ? "طلب" : "orders"}`, icon: TrendingUp, border: "border-s-emerald-500", iconBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" },
    { label: isAr ? "المنتجات" : "Products", value: String(stats.totalProducts), sub: isAr ? "في المخزون" : "in stock", icon: Package, border: "border-s-green-500", iconBg: "bg-green-100 dark:bg-green-900/30 text-green-600" },
    { label: isAr ? "صلاحية" : "Expiry Alerts", value: String((expiry?.expired ?? 0) + (expiry?.expiringSoon ?? 0)), sub: isAr ? "منتهية أو قريبة" : "expired or soon", icon: AlertTriangle, border: "border-s-orange-500", iconBg: "bg-orange-100 dark:bg-orange-900/30 text-orange-600" },
    { label: isAr ? "مخزون منخفض" : "Low Stock", value: String(stats.lowStock), sub: isAr ? "منتجات تحتاج تعبئة" : "need restocking", icon: ShoppingBasket, border: "border-s-lime-500", iconBg: "bg-lime-100 dark:bg-lime-900/30 text-lime-600" },
  ];

  const quickActions = [
    { href: "/grocery/pos", icon: ShoppingCart, label: isAr ? "نقطة البيع" : "Open POS", color: "#16a34a" },
    { href: "/grocery/inventory", icon: Package, label: isAr ? "إدارة المنتجات" : "Manage Products", color: "#059669" },
    { href: "/grocery/expiry", icon: AlertTriangle, label: isAr ? "تنبيهات الصلاحية" : "Expiry Alerts", color: "#ea580c" },
    { href: "/grocery/purchases", icon: Truck, label: isAr ? "فواتير الشراء" : "Purchase Invoices", color: "#0d9488" },
    { href: "/grocery/suppliers", icon: Building2, label: isAr ? "الموردون" : "Suppliers", color: "#0284c7" },
    { href: "/grocery/reports", icon: FileText, label: isAr ? "التقارير" : "Reports", color: "#0891b2" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBasket className="h-7 w-7 text-green-500" />
            {isAr ? "لوحة تحكم البقالة" : "Grocery Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "مبيعات سريعة، باركود، مخزون، وصلاحية المنتجات" : "Fast checkout, barcode scanning, stock & expiry tracking"}
          </p>
        </div>
        <Link href="/grocery/pos">
          <Button className="bg-green-600 hover:bg-green-700">
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
                <div className={`p-2.5 rounded-full ${kpi.iconBg}`}><Icon className="h-5 w-5" /></div>
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

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
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

      {stats.lowStock > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-600" />
              {isAr ? `${stats.lowStock} منتج بمخزون منخفض` : `${stats.lowStock} products low on stock`}
            </p>
            <Link href="/grocery/inventory"><Button variant="outline" size="sm">{isAr ? "عرض المخزون" : "View Inventory"}</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
