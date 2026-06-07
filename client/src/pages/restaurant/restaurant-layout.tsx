import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { posSystemLabel, posSystemSubtitle } from "@/lib/pos-system";
import {
  LayoutDashboard, UtensilsCrossed, ChefHat, ClipboardList, QrCode,
  LogOut, Menu, X, ChevronRight, ArrowLeft, BookOpen,
} from "lucide-react";

type BrandingData = { brandColor: string | null; logoUrl: string | null; name: string };

const navItems = [
  { path: "/restaurant", icon: LayoutDashboard, label: "Dashboard", labelAr: "لوحة التحكم", exact: true },
  { path: "/restaurant/pos", icon: UtensilsCrossed, label: "Tables & POS", labelAr: "الطاولات ونقطة البيع" },
  { path: "/restaurant/kitchen", icon: ChefHat, label: "Kitchen", labelAr: "شاشة المطبخ" },
  { path: "/restaurant/menu", icon: BookOpen, label: "Menu", labelAr: "إدارة القائمة" },
  { path: "/restaurant/orders", icon: ClipboardList, label: "Orders", labelAr: "الطلبات" },
  { path: "/restaurant/qr", icon: QrCode, label: "QR Ordering", labelAr: "طلب عبر QR" },
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

  const Sidebar = () => (
    <div className="flex flex-col h-full text-white" style={{ background: "linear-gradient(180deg, #431407 0%, #1c0a04 100%)" }}>
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${brandColor}, #c2410c)` }}>
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{branding?.name || posSystemLabel("restaurant", isAr)}</p>
            <p className="text-[11px] text-orange-200/60 truncate">{posSystemSubtitle("restaurant", isAr)}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                  active ? "bg-orange-500/20 text-orange-100" : "text-white/55 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 min-w-0 truncate">{isAr ? item.labelAr : item.label}</span>
                {active && <ChevronRight className={`h-3.5 w-3.5 opacity-50 shrink-0 ${isAr ? "rotate-180" : ""}`} />}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-1 mb-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="flex-1 text-xs text-white/70" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-3.5 w-3.5 me-1" />
            {isAr ? "خروج" : "Sign Out"}
          </Button>
        </div>
        <p className="text-[10px] text-white/40 px-1 truncate">{user?.username}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background" dir={isAr ? "rtl" : "ltr"}>
      <aside className="hidden md:flex flex-col w-60 shrink-0 z-20 shadow-xl">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute start-0 top-0 bottom-0 w-64 flex flex-col shadow-2xl z-10">
            <Sidebar />
          </aside>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 end-4 text-white p-1.5 rounded-full bg-white/15 z-20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isImpersonating && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-orange-600 text-white text-sm shrink-0">
            <span className="truncate">{isAr ? `عرض: ${impersonatingStoreName}` : `Viewing: ${impersonatingStoreName}`}</span>
            <Button size="sm" variant="secondary" onClick={onStopImpersonate} className="h-7 text-xs shrink-0">
              <ArrowLeft className="h-3 w-3 me-1" />
              {isAr ? "عودة" : "Back"}
            </Button>
          </div>
        )}

        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0 z-10">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-muted shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {currentPage ? (isAr ? currentPage.labelAr : currentPage.label) : "RestoPOS"}
            </h2>
          </div>
        </header>

        <main className="flex-1 min-h-0 min-w-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
