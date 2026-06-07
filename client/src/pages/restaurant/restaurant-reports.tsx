import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { RestoPageHeader, RestoStatCard } from "./restaurant-shared";
import {
  TrendingUp, Receipt, Smartphone, Users, ChefHat, UtensilsCrossed, BarChart3,
} from "lucide-react";

type Stats = {
  todayOrders: number;
  todaySales: number;
  pendingOrders: number;
  occupiedTables: number;
  totalTables: number;
  menuItems: number;
  avgTicket: number;
  qrOrdersToday: number;
  staffOrdersToday: number;
  popularItems: { name: string; quantity: number }[];
  hourlySales: { hour: number; count: number; total: number }[];
};

export default function RestaurantReports() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/restaurant/stats"] });

  const maxHourly = Math.max(...(stats?.hourlySales?.map((h) => h.total) ?? [1]), 1);
  const maxPopular = Math.max(...(stats?.popularItems?.map((p) => p.quantity) ?? [1]), 1);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <RestoPageHeader
        title={isAr ? "التقارير والتحليلات" : "Reports & Analytics"}
        subtitle={isAr ? "أداء اليوم — مبيعات، قنوات الطلب، وأصناف الأكثر مبيعاً" : "Today's performance — sales, channels & top sellers"}
        isAr={isAr}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RestoStatCard
          label={isAr ? "مبيعات اليوم" : "Today's Sales"}
          value={`${(stats?.todaySales ?? 0).toLocaleString()}`}
          sub={isAr ? "دينار عراقي" : "IQD"}
          icon={TrendingUp}
          accent="orange"
        />
        <RestoStatCard
          label={isAr ? "طلبات اليوم" : "Orders Today"}
          value={String(stats?.todayOrders ?? 0)}
          sub={`${isAr ? "متوسط" : "Avg"} ${Math.round(stats?.avgTicket ?? 0).toLocaleString()} IQD`}
          icon={Receipt}
          accent="emerald"
        />
        <RestoStatCard
          label={isAr ? "طلبات QR" : "QR Orders"}
          value={String(stats?.qrOrdersToday ?? 0)}
          sub={`${stats?.staffOrdersToday ?? 0} ${isAr ? "من الموظفين" : "staff"}`}
          icon={Smartphone}
          accent="blue"
        />
        <RestoStatCard
          label={isAr ? "الطاولات" : "Tables"}
          value={`${stats?.occupiedTables ?? 0}/${stats?.totalTables ?? 0}`}
          sub={`${stats?.pendingOrders ?? 0} ${isAr ? "طلب نشط" : "active orders"}`}
          icon={UtensilsCrossed}
          accent="violet"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-orange-600" />
            {isAr ? "المبيعات حسب الساعة" : "Hourly Sales"}
          </h3>
          {(stats?.hourlySales?.length ?? 0) > 0 ? (
            <div className="flex items-end gap-1.5 h-40">
              {stats!.hourlySales.map((h) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className="w-full rounded-t-md bg-orange-500/80 hover:bg-orange-600 transition-colors min-h-[4px]"
                    style={{ height: `${Math.max(8, (h.total / maxHourly) * 100)}%` }}
                    title={`${h.count} orders · ${h.total.toLocaleString()} IQD`}
                  />
                  <span className="text-[9px] text-muted-foreground tabular-nums">{h.hour}:00</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">{isAr ? "لا بيانات بعد" : "No data yet today"}</p>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <ChefHat className="h-4 w-4 text-orange-600" />
            {isAr ? "الأكثر مبيعاً اليوم" : "Top Sellers Today"}
          </h3>
          {(stats?.popularItems?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {stats!.popularItems.map((item, i) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium truncate me-2">
                      <span className="text-muted-foreground me-1.5">#{i + 1}</span>
                      {item.name}
                    </span>
                    <span className="text-orange-600 font-bold tabular-nums shrink-0">{item.quantity}×</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${(item.quantity / maxPopular) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">{isAr ? "لا مبيعات بعد" : "No sales yet today"}</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-orange-600" />
          {isAr ? "ملخص سريع" : "Quick Summary"}
        </h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-muted-foreground text-xs">{isAr ? "أصناف القائمة" : "Menu Items"}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{stats?.menuItems ?? 0}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-muted-foreground text-xs">{isAr ? "متوسط الفاتورة" : "Avg Ticket"}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{Math.round(stats?.avgTicket ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-muted-foreground text-xs">{isAr ? "نسبة QR" : "QR Share"}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              {stats?.todayOrders ? Math.round(((stats.qrOrdersToday ?? 0) / stats.todayOrders) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
