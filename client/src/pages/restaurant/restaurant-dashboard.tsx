import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ChefHat, UtensilsCrossed, BookOpen, ArrowRight } from "lucide-react";

type Stats = { todayOrders: number; todaySales: number; pendingOrders: number; occupiedTables: number; totalTables: number; menuItems: number };

export default function RestaurantDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/restaurant/stats"], refetchInterval: 15000 });

  const kpis = [
    { label: isAr ? "مبيعات اليوم" : "Today's Sales", value: (stats?.todaySales ?? 0).toLocaleString(), sub: `${stats?.todayOrders ?? 0} ${isAr ? "طلب" : "orders"}`, icon: TrendingUp, color: "text-emerald-600" },
    { label: isAr ? "طلبات معلقة" : "Pending Orders", value: String(stats?.pendingOrders ?? 0), sub: isAr ? "تحتاج إجراء" : "need action", icon: ChefHat, color: "text-orange-600" },
    { label: isAr ? "الطاولات" : "Tables", value: `${stats?.occupiedTables ?? 0}/${stats?.totalTables ?? 0}`, sub: isAr ? "مشغولة" : "occupied", icon: UtensilsCrossed, color: "text-blue-600" },
    { label: isAr ? "أصناف القائمة" : "Menu Items", value: String(stats?.menuItems ?? 0), sub: isAr ? "في القائمة" : "on menu", icon: BookOpen, color: "text-purple-600" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? "لوحة المطعم" : "Restaurant Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? "نظرة عامة على الطلبات والطاولات" : "Overview of orders and tables"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/restaurant/kitchen"><Button variant="outline"><ChefHat className="h-4 w-4 me-2" />{isAr ? "المطبخ" : "Kitchen"}</Button></Link>
          <Link href="/restaurant/pos"><Button className="bg-orange-600 hover:bg-orange-700 text-white"><UtensilsCrossed className="h-4 w-4 me-2" />{isAr ? "نقطة البيع" : "Open POS"}</Button></Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}><CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><Icon className={`h-5 w-5 ${k.color}`} /></div>
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className={`text-xl font-bold ${k.color}`}>{k.value}</p><p className="text-[11px] text-muted-foreground">{k.sub}</p></div>
            </CardContent></Card>
          );
        })}
      </div>
      <Card><CardContent className="p-4 flex items-center justify-between">
        <div><p className="font-semibold">{isAr ? "طلب عبر QR (مثل Belly)" : "QR Table Ordering (Belly-style)"}</p><p className="text-sm text-muted-foreground">{isAr ? "أنشئ روابط QR للطاولات" : "Generate QR links for each table"}</p></div>
        <Link href="/restaurant/qr"><Button variant="outline">{isAr ? "إدارة QR" : "Manage QR"}<ArrowRight className="h-4 w-4 ms-2" /></Button></Link>
      </CardContent></Card>
    </div>
  );
}
