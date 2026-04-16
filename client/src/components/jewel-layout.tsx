import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, Package, Users, ClipboardList, Wrench,
  Clock, Palette, LogOut, Menu, X, Gem, ChevronRight,
  ShoppingBag, HandCoins, ClipboardCheck, HardDrive, ArrowLeft,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type BrandingData = {
  brandColor: string | null;
  logoUrl: string | null;
  name: string;
};

const navItems = [
  { path: "/", icon: ShoppingCart, label: "POS Terminal", labelAr: "نقطة البيع", exact: true },
  { path: "/inventory", icon: Package, label: "Inventory", labelAr: "المخزون" },
  { path: "/customers", icon: Users, label: "Customers", labelAr: "العملاء" },
  { path: "/orders", icon: ClipboardList, label: "Orders", labelAr: "الطلبات" },
  { path: "/repairs", icon: Wrench, label: "Repairs", labelAr: "الإصلاحات" },
  { path: "/purchases", icon: ShoppingBag, label: "Buy Jewel", labelAr: "شراء مجوهرات" },
  { path: "/layaway", icon: Clock, label: "Layaway", labelAr: "التقسيط" },
  { path: "/debts", icon: HandCoins, label: "Debts", labelAr: "الديون" },
  { path: "/stock-audit", icon: ClipboardCheck, label: "Stock Audit", labelAr: "جرد المخزون" },
  { path: "/branding", icon: Palette, label: "Branding", labelAr: "العلامة التجارية" },
  { path: "/backup", icon: HardDrive, label: "Backup", labelAr: "النسخ الاحتياطي" },
];

function NavLabel({ label, labelAr, isAr }: { label: string; labelAr: string; isAr: boolean }) {
  return <span>{isAr ? labelAr : label}</span>;
}

export default function JewelLayout({
  children,
  impersonationBanner,
  onStopImpersonate,
  isImpersonating,
  impersonatingStoreName,
}: {
  children: React.ReactNode;
  impersonationBanner?: boolean;
  onStopImpersonate?: () => void;
  isImpersonating?: boolean;
  impersonatingStoreName?: string | null;
}) {
  const [location] = useLocation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: branding } = useQuery<BrandingData>({
    queryKey: ["/api/store/branding"],
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  const brandColor = branding?.brandColor || "#f97316";

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? location === item.path : location.startsWith(item.path);

  const currentPage = navItems.find((i) => isActive(i));

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="w-10 h-10 rounded-2xl object-contain bg-white p-0.5"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${brandColor}cc, ${brandColor})`, boxShadow: `0 4px 14px ${brandColor}40` }}
            >
              <Gem className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <p className="font-bold text-base tracking-tight text-white">
              {branding?.name || "JewelPOS"}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {isAr ? "نظام إدارة المجوهرات" : "Jewelry Store Management"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">
          {isAr ? "القائمة" : "Navigation"}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer
                  ${active
                    ? "text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                style={active ? { backgroundColor: brandColor, boxShadow: `0 4px 12px ${brandColor}30` } : {}}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                <NavLabel label={item.label} labelAr={item.labelAr} isAr={isAr} />
                {active && <ChevronRight className="h-3.5 w-3.5 ms-auto text-white/60" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700/60 space-y-3">
        {/* User pill */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${brandColor}cc, ${brandColor})` }}
          >
            {(user?.username?.[0] ?? "J").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.username ?? "store"}</p>
            <p className="text-[10px] text-slate-500">{isAr ? "مدير المتجر" : "Store Manager"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-center text-slate-400 hover:text-red-400 hover:bg-red-900/20 text-xs gap-1.5"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isAr ? "خروج" : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 shadow-xl">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute start-0 top-0 bottom-0 w-64 flex flex-col shadow-2xl">
            <Sidebar />
          </aside>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 end-4 text-white bg-slate-800 rounded-full p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Impersonation banner */}
        {isImpersonating && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-500 text-white flex-shrink-0">
            <span className="text-sm font-medium">{isAr ? "تصفح باسم:" : "Viewing as:"} {impersonatingStoreName}</span>
            <Button
              size="sm"
              variant="outline"
              className="bg-white/20 border-white/40 text-white h-7 text-xs"
              onClick={onStopImpersonate}
              data-testid="button-stop-impersonate"
            >
              <ArrowLeft className="h-3.5 w-3.5 me-1" />
              {isAr ? "العودة للإدارة" : "Back to Admin"}
            </Button>
          </div>
        )}

        {/* Topbar */}
        <header className="flex items-center gap-3 px-5 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1 rounded-lg"
            data-testid="button-sidebar-toggle"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <Gem className="h-4 w-4 hidden md:block" style={{ color: brandColor }} />
            <span className="text-slate-400 hidden md:block">{branding?.name || "JewelPOS"}</span>
            <span className="text-slate-300 hidden md:block">/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isAr ? currentPage?.labelAr : currentPage?.label}
            </span>
          </div>

          <div className="ms-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isAr ? "متصل" : "Online"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
