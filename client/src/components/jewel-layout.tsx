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
  onStopImpersonate,
  isImpersonating,
  impersonatingStoreName,
  children,
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-e border-slate-100 dark:border-slate-800">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="w-10 h-10 rounded-2xl object-contain border border-slate-100 dark:border-slate-700 bg-white p-0.5 shadow-sm"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${brandColor}e0, ${brandColor})` }}
            >
              <Gem className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate">
              {branding?.name || "JewelPOS"}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
              {isAr ? "نظام إدارة المجوهرات" : "Jewelry Store Management"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-3 mb-2">
          {isAr ? "القائمة" : "Menu"}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer`}
                style={
                  active
                    ? {
                        backgroundColor: brandColor + "18",
                        color: brandColor,
                      }
                    : {}
                }
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    active ? "" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                  }`}
                  style={active ? { backgroundColor: brandColor + "22", color: brandColor } : {}}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span
                  className={`flex-1 ${
                    active
                      ? "font-semibold"
                      : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                  }`}
                >
                  <NavLabel label={item.label} labelAr={item.labelAr} isAr={isAr} />
                </span>
                {active && (
                  <div
                    className="w-1.5 h-5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: brandColor }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        {/* User pill */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${brandColor}cc, ${brandColor})` }}
          >
            {(user?.username?.[0] ?? "J").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {user?.username ?? "store"}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {isAr ? "مدير المتجر" : "Store Manager"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs gap-1.5"
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
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 shadow-sm">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute start-0 top-0 bottom-0 w-64 flex flex-col shadow-2xl">
            <Sidebar />
          </aside>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 end-4 text-white bg-slate-800/80 rounded-full p-1.5 backdrop-blur"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Impersonation banner */}
        {isImpersonating && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 flex-shrink-0 text-white"
            style={{ backgroundColor: brandColor }}>
            <span className="text-sm font-medium">
              {isAr ? "تصفح باسم:" : "Viewing as:"} {impersonatingStoreName}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="bg-white/20 border-white/40 text-white h-7 text-xs hover:bg-white/30"
              onClick={onStopImpersonate}
              data-testid="button-stop-impersonate"
            >
              <ArrowLeft className="h-3.5 w-3.5 me-1" />
              {isAr ? "العودة للإدارة" : "Back to Admin"}
            </Button>
          </div>
        )}

        {/* Topbar */}
        <header className="flex items-center gap-3 px-5 h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            data-testid="button-sidebar-toggle"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 dark:text-slate-500 hidden md:block font-medium">
              {branding?.name || "JewelPOS"}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 hidden md:block" />
            <div className="flex items-center gap-1.5">
              {currentPage && (
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: brandColor + "18" }}
                >
                  <currentPage.icon className="h-3 w-3" style={{ color: brandColor }} />
                </div>
              )}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {isAr ? currentPage?.labelAr : currentPage?.label}
              </span>
            </div>
          </div>

          <div className="ms-auto flex items-center gap-2">
            {/* Online badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isAr ? "متصل" : "Online"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
