import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, ChefHat, UtensilsCrossed, BookOpen, QrCode, ArrowRight,
  Clock, Smartphone, Users,
} from "lucide-react";
import { RestoPageHeader, RestoStatCard, OrderStatusBadge, ElapsedTimer } from "./restaurant-shared";

type OrderPreview = {
  id: number; orderNumber: string; status: string; source: string; total: string;
  customerName: string | null; createdAt: string;
  table: { tableNumber: number } | null;
  items?: { name: string; quantity: number }[];
};

type Stats = {
  todayOrders: number; todaySales: number; pendingOrders: number;
  occupiedTables: number; totalTables: number; menuItems: number;
  avgTicket: number; qrOrdersToday: number; staffOrdersToday: number;
  popularItems: { name: string; quantity: number }[];
  recentOrders: OrderPreview[];
  tables: { id: number; tableNumber: number; status: string; section: string | null }[];
  hourlySales: { hour: number; count: number; total: number }[];
};

export default function RestaurantDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/restaurant/stats"], refetchInterval: 12000 });

  const maxHourly = Math.max(...(stats?.hourlySales?.map((h) => h.total) ?? [1]), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <RestoPageHeader
        title={isAr ? "لوحة التحكم" : "Dashboard"}
        subtitle={isAr ? "نظرة لحظية على المطعم — مبيعات، طاولات، ومطبخ" : "Real-time overview — sales, tables & kitchen"}
        isAr={isAr}
        action={
          <div className="flex gap-2">
            <Link href="/restaurant/kitchen">
              <Button variant="outline" className="gap-2">
                <ChefHat className="h-4 w-4" />
                {isAr ? "المطبخ" : "Kitchen"}
                {(stats?.pendingOrders ?? 0) > 0 && (
                  <Badge className="bg-orange-600">{stats?.pendingOrders}</Badge>
                )}
              </Button>
            </Link>
            <Link href="/restaurant/pos">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                {isAr ? "فتح نقطة البيع" : "Open POS"}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <RestoStatCard label={isAr ? "مبيعات اليوم" : "Today's Revenue"} value={`${(stats?.todaySales ?? 0).toLocaleString()} ${isAr ? "د.ع" : "IQD"}`} sub={`${stats?.todayOrders ?? 0} ${isAr ? "طلب" : "orders"}`} icon={TrendingUp} accent="emerald" />
        <RestoStatCard label={isAr ? "متوسط الفاتورة" : "Avg. Ticket"} value={`${Math.round(stats?.avgTicket ?? 0).toLocaleString()} ${isAr ? "د.ع" : "IQD"}`} sub={isAr ? "لكل طلب اليوم" : "per order today"} icon={Users} accent="blue" />
        <RestoStatCard label={isAr ? "طلبات المطبخ" : "Kitchen Queue"} value={String(stats?.pendingOrders ?? 0)} sub={isAr ? "تحتاج تحضير" : "need prep"} icon={ChefHat} accent="orange" />
        <RestoStatCard label={isAr ? "الطاولات" : "Floor Status"} value={`${stats?.occupiedTables ?? 0}/${stats?.totalTables ?? 0}`} sub={isAr ? "مشغولة" : "occupied"} icon={UtensilsCrossed} accent="violet" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live orders */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{isAr ? "طلبات نشطة" : "Live Orders"}</CardTitle>
            <Link href="/restaurant/orders"><Button variant="ghost" size="sm">{isAr ? "الكل" : "View all"}<ArrowRight className="h-3 w-3 ms-1" /></Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.recentOrders ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{isAr ? "لا طلبات نشطة حالياً" : "No active orders right now"}</p>
            ) : (
              stats?.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{o.orderNumber}</span>
                      <OrderStatusBadge status={o.status} isAr={isAr} />
                      {o.source === "qr" && <Badge variant="outline" className="text-[10px]"><Smartphone className="h-3 w-3 me-1" />QR</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {o.table ? `${isAr ? "طاولة" : "Table"} #${o.table.tableNumber}` : o.customerName || "—"}
                      {(o.items?.length ?? 0) > 0 && ` · ${o.items!.map((i) => `${i.quantity}× ${i.name}`).join(", ")}`}
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-bold tabular-nums">{parseFloat(o.total).toLocaleString()}</p>
                    <ElapsedTimer since={o.createdAt} isAr={isAr} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Floor plan */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{isAr ? "مخطط الطاولات" : "Table Floor"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(stats?.tables ?? []).map((t) => (
                <div
                  key={t.id}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-center p-1 transition-colors ${
                    t.status === "occupied"
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30"
                      : t.status === "reserved"
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                        : "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20"
                  }`}
                >
                  <span className="font-bold text-lg">#{t.tableNumber}</span>
                  <span className="text-[9px] uppercase text-muted-foreground">{t.status}</span>
                </div>
              ))}
            </div>
            <Link href="/restaurant/pos" className="block mt-4">
              <Button variant="outline" className="w-full" size="sm">{isAr ? "إدارة الطاولات" : "Manage Tables"}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Hourly chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {isAr ? "المبيعات حسب الساعة" : "Sales by Hour"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.hourlySales?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isAr ? "لا مبيعات اليوم بعد" : "No sales yet today"}</p>
            ) : (
              <div className="flex items-end gap-1.5 h-32">
                {stats?.hourlySales.map((h) => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-orange-600 to-orange-400 min-h-[4px] transition-all"
                      style={{ height: `${Math.max(8, (h.total / maxHourly) * 100)}%` }}
                      title={`${h.total.toLocaleString()} IQD`}
                    />
                    <span className="text-[9px] text-muted-foreground tabular-nums">{h.hour}:00</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular items + quick links */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{isAr ? "الأكثر مبيعاً اليوم" : "Top Sellers Today"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(stats?.popularItems?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{isAr ? "لا بيانات بعد" : "No data yet"}</p>
            ) : (
              <ul className="space-y-2">
                {stats?.popularItems.map((item, i) => (
                  <li key={item.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      {item.name}
                    </span>
                    <Badge variant="secondary">{item.quantity}×</Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <Link href="/restaurant/qr"><Button variant="outline" size="sm" className="w-full gap-1"><QrCode className="h-3.5 w-3.5" />QR</Button></Link>
              <Link href="/restaurant/menu"><Button variant="outline" size="sm" className="w-full gap-1"><BookOpen className="h-3.5 w-3.5" />{isAr ? "قائمة" : "Menu"}</Button></Link>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? `طلبات QR: ${stats?.qrOrdersToday ?? 0} · موظفين: ${stats?.staffOrdersToday ?? 0}` : `QR: ${stats?.qrOrdersToday ?? 0} · Staff: ${stats?.staffOrdersToday ?? 0}`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
