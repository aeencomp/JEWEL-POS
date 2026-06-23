import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StoreSubscriptionPanel } from "@/components/store-subscription-panel";
import { posSystemLabel } from "@/lib/pos-system";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, UtensilsCrossed, ChefHat, ClipboardList, QrCode,
  LogOut, Menu, X, ArrowLeft, BookOpen, BarChart3, Bell, Bike, Users,
} from "lucide-react";

type BrandingData = { brandColor: string | null; logoUrl: string | null; name: string };
type Stats = { pendingOrders?: number };

const navItems = [
  { path: "/restaurant", icon: LayoutDashboard, label: "Dashboard", labelAr: "لوحة التحكم", exact: true },
  { path: "/restaurant/pos", icon: UtensilsCrossed, label: "POS & Tables", labelAr: "نقطة البيع والطاولات" },
  { path: "/restaurant/kitchen", icon: ChefHat, label: "Kitchen (KDS)", labelAr: "شاشة المطبخ" },
  { path: "/restaurant/delivery", icon: Bike, label: "IQ Order Delivery", labelAr: "توصيل IQ Order" },
  { path: "/restaurant/drivers", icon: Users, label: "Drivers", labelAr: "السائقون" },
  { path: "/restaurant/menu", icon: BookOpen, label: "Menu", labelAr: "القائمة" },
  { path: "/restaurant/orders", icon: ClipboardList, label: "Orders", labelAr: "الطلبات" },
  { path: "/restaurant/reports", icon: BarChart3, label: "Reports", labelAr: "التقارير" },
  { path: "/restaurant/qr", icon: QrCode, label: "QR Ordering", labelAr: "طلب QR" },
];

export default function RestaurantLayout({
  children,
  onStopImpersonate,
  isImpersonating,
  impersonatingStoreName,
}: {
  children: React.ReactNode;
  onStopImpersonate?: () => void;
  isImpersonating?: boolean;
  impersonatingStoreName?: string | null;
}) {
  const [location] = useLocation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: branding } = useQuery<BrandingData>({ queryKey: ["/api/store/branding"] });
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/restaurant/stats"], refetchInterval: 20000 });
  const brandColor = branding?.brandColor || "#ea580c";

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/restaurant-login";
    },
  });

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? location === item.path : location.startsWith(item.path);
  const currentPage = navItems.find((i) => isActive(i));
  const pending = stats?.pendingOrders ?? 0;

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-card border-e border-border">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
            style={{ background: `linear-gradient(135deg, ${brandColor}, #c2410c)` }}
          >
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="w-8 h-8 object-contain rounded-lg" />
            ) : (
              <UtensilsCrossed className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate text-foreground">{branding?.name || posSystemLabel("restaurant", isAr)}</p>
            <p className="text-[11px] text-muted-foreground font-medium">RestoPOS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-2">
          {isAr ? "القائمة" : "Menu"}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          const showBadge = item.path === "/restaurant/kitchen" && pending > 0;
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all",
                  active
                    ? "bg-orange-50 text-orange-700 shadow-sm border border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 min-w-0 truncate">{isAr ? item.labelAr : item.label}</span>
                {showBadge && (
                  <Badge className="h-5 min-w-5 px-1.5 bg-orange-600 text-white text-[10px]">{pending}</Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border shrink-0 space-y-3">
        <StoreSubscriptionPanel
          posSystem="restaurant"
          variant="light"
          buttonClassName="bg-orange-600 hover:bg-orange-500 text-white"
        />
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-700 text-xs font-bold uppercase">
            {user?.username?.slice(0, 2) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.username}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? "موظف" : "Staff"}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/80 dark:bg-background" dir={isAr ? "rtl" : "ltr"}>
      <aside className="hidden md:flex flex-col w-64 shrink-0 z-20">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute start-0 top-0 bottom-0 w-72 flex flex-col shadow-2xl z-10 bg-card">
            <Sidebar />
          </aside>
          <button type="button" onClick={() => setSidebarOpen(false)} className="absolute top-4 end-4 p-2 rounded-full bg-background shadow z-20">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isImpersonating && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-orange-600 text-white text-sm shrink-0">
            <span className="truncate">{isAr ? `عرض: ${impersonatingStoreName}` : `Viewing: ${impersonatingStoreName}`}</span>
            <Button size="sm" variant="secondary" onClick={onStopImpersonate} className="h-7 text-xs shrink-0">
              <ArrowLeft className="h-3 w-3 me-1" />{isAr ? "عودة" : "Back"}
            </Button>
          </div>
        )}

        <header className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card/80 backdrop-blur-md shrink-0 z-10">
          <button type="button" className="md:hidden p-2 rounded-lg hover:bg-muted shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base truncate text-foreground">
              {currentPage ? (isAr ? currentPage.labelAr : currentPage.label) : "RestoPOS"}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 h-8 text-xs"
              onClick={() => { window.open("/app", "_blank"); }}
            >
              <Bike className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? "طلب IQ" : "IQ Order"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/30 h-8 text-xs"
              onClick={() => { window.open("/driver-login", "_blank"); }}
            >
              <span className="hidden sm:inline">{isAr ? "تطبيق السائق" : "Driver App"}</span>
              <span className="sm:hidden">{isAr ? "السائق" : "Driver"}</span>
            </Button>
          </div>
          {pending > 0 && (
            <Link href="/restaurant/kitchen">
              <Button variant="outline" size="sm" className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">{isAr ? "طلبات نشطة" : "Active"}</span>
                <Badge className="bg-orange-600 text-white">{pending}</Badge>
              </Button>
            </Link>
          )}
        </header>

        <main className="flex-1 min-h-0 min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
