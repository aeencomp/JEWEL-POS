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
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandColor}, #c2410c)` }}>
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{branding?.name || posSystemLabel("restaurant", isAr)}</p>
            <p className="text-[11px] text-orange-200/60">{posSystemSubtitle("restaurant", isAr)}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${active ? "bg-orange-500/20 text-orange-100" : "text-white/55 hover:text-white/80"}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{isAr ? item.labelAr : item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-1 mb-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="flex-1 text-xs text-white/70" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-3.5 w-3.5 me-1" />
            {isAr ? "خروج" : "Sign Out"}
          </Button>
        </div>
        <p className="text-[10px] text-white/40 px-1">{user?.username}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir={isAr ? "rtl" : "ltr"}>
      <aside className="hidden md:flex w-60 flex-shrink-0"><Sidebar /></aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute start-0 top-0 bottom-0 w-64"><Sidebar /></aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {isImpersonating && (
          <div className="flex items-center justify-between px-4 py-2 bg-orange-600 text-white text-sm">
            <span>{isAr ? `عرض: ${impersonatingStoreName}` : `Viewing: ${impersonatingStoreName}`}</span>
            <Button size="sm" variant="secondary" onClick={onStopImpersonate} className="h-7 text-xs">
              <ArrowLeft className="h-3 w-3 me-1" />{isAr ? "عودة" : "Back"}
            </Button>
          </div>
        )}
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-40">
          <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <h2 className="font-semibold text-sm">{currentPage ? (isAr ? currentPage.labelAr : currentPage.label) : "RestoPOS"}</h2>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
