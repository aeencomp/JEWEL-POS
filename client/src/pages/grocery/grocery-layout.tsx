import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { posSystemLabel, posSystemSubtitle } from "@/lib/pos-system";
import { GroceryThemePicker } from "@/components/grocery-theme-picker";
import {
  LayoutDashboard, ShoppingCart, Package, Users, ClipboardList, FileText,
  AlertTriangle, ClipboardCheck, Palette, HardDrive, LogOut, Menu, ChevronRight, ArrowLeft, ShoppingBasket,
  Building2, RotateCcw, HandCoins, Truck,
} from "lucide-react";

type BrandingData = { brandColor: string | null; logoUrl: string | null; name: string };

const navItems = [
  { path: "/grocery", icon: LayoutDashboard, label: "Dashboard", labelAr: "لوحة التحكم", exact: true },
  { path: "/grocery/pos", icon: ShoppingCart, label: "POS", labelAr: "نقطة البيع" },
  { path: "/grocery/inventory", icon: Package, label: "Products", labelAr: "المنتجات" },
  { path: "/grocery/expiry", icon: AlertTriangle, label: "Expiry Alerts", labelAr: "تنبيهات الصلاحية" },
  { path: "/grocery/suppliers", icon: Building2, label: "Suppliers", labelAr: "الموردون" },
  { path: "/grocery/purchases", icon: Truck, label: "Purchases", labelAr: "فواتير الشراء" },
  { path: "/grocery/customers", icon: Users, label: "Customers", labelAr: "العملاء" },
  { path: "/grocery/orders", icon: ClipboardList, label: "Sales", labelAr: "المبيعات" },
  { path: "/grocery/returns", icon: RotateCcw, label: "Returns", labelAr: "المرتجعات" },
  { path: "/grocery/reports", icon: FileText, label: "Reports", labelAr: "التقارير" },
  { path: "/grocery/debts", icon: HandCoins, label: "Debts", labelAr: "الديون" },
  { path: "/grocery/stock-audit", icon: ClipboardCheck, label: "Stock Audit", labelAr: "جرد المخزون" },
  { path: "/grocery/branding", icon: Palette, label: "Branding", labelAr: "العلامة التجارية" },
  { path: "/grocery/backup", icon: HardDrive, label: "Backup", labelAr: "النسخ الاحتياطي" },
];

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export default function GroceryLayout({
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
  const isDark = useIsDark();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: branding } = useQuery<BrandingData>({ queryKey: ["/api/store/branding"] });
  const brandColor = branding?.brandColor || "#16a34a";
  const brandStyle = { "--grocery-brand": brandColor } as React.CSSProperties;

  const saveColorMutation = useMutation({
    mutationFn: (brandColor: string) => apiRequest("PATCH", "/api/store/branding", { brandColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/branding"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/grocery-login";
    },
  });

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? location === item.path : location.startsWith(item.path);
  const currentPage = navItems.find((i) => isActive(i));
  const isPosPage = location.startsWith("/grocery/pos");

  const sidebarBg = isDark
    ? `linear-gradient(180deg, color-mix(in srgb, ${brandColor} 25%, #052e16) 0%, #0a0f0f 100%)`
    : `linear-gradient(160deg, color-mix(in srgb, ${brandColor} 85%, #000) 0%, ${brandColor} 60%, color-mix(in srgb, ${brandColor} 85%, #000) 100%)`;

  const Sidebar = () => (
    <div
      className="flex flex-col h-full"
      style={{ ...brandStyle, background: sidebarBg, borderInlineEnd: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <div className="w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-white/10">
              <img src={branding.logoUrl} alt="" className="w-full h-full object-contain bg-white/10" />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${brandColor}dd, ${brandColor})` }}
            >
              <ShoppingBasket className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">{branding?.name || posSystemLabel("grocery", isAr)}</p>
            <p className="text-[11px] text-green-200/60">{posSystemSubtitle("grocery", isAr)}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto pharmacy-scroll pharmacy-scroll-dark">
        <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3 text-green-200/40">
          {isAr ? "القائمة" : "Menu"}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
                style={
                  active
                    ? {
                        background: `linear-gradient(90deg, ${brandColor}35, ${brandColor}15)`,
                        color: "#86efac",
                        borderInlineStart: `2.5px solid ${brandColor}`,
                      }
                    : { color: "rgba(255,255,255,0.55)" }
                }
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={active ? { background: `${brandColor}30` } : { background: "rgba(255,255,255,0.07)" }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1">{isAr ? item.labelAr : item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: `linear-gradient(135deg, ${brandColor}cc, ${brandColor})` }}
          >
            {(user?.username?.[0] ?? "G").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
            <p className="text-[10px] text-green-200/50">{isAr ? "بقالة" : "Grocery"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="[&_button]:text-white/50 [&_button:hover]:text-white"><LanguageToggle /></div>
          <div className="[&_button]:text-white/50 [&_button:hover]:text-white"><ThemeToggle /></div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs gap-1.5 hover:bg-red-500/20 hover:text-red-300 text-white/55"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-3.5 w-3.5" />
            {isAr ? "خروج" : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="flex h-screen overflow-hidden pharmacy-scroll"
      style={{ ...brandStyle, background: isDark ? "#0a0f0f" : "#f0fdf4" }}
      dir={isAr ? "rtl" : "ltr"}
    >
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 shadow-xl"><Sidebar /></aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute start-0 top-0 bottom-0 w-64 flex flex-col shadow-2xl"><Sidebar /></aside>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {isImpersonating && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-green-600 text-white text-sm">
            <span>{isAr ? `عرض: ${impersonatingStoreName}` : `Viewing: ${impersonatingStoreName}`}</span>
            <Button size="sm" variant="secondary" onClick={onStopImpersonate} className="h-7 text-xs">
              <ArrowLeft className="h-3 w-3 me-1" />
              {isAr ? "عودة للإدارة" : "Back to Admin"}
            </Button>
          </div>
        )}
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-40">
          <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {currentPage ? (isAr ? currentPage.labelAr : currentPage.label) : "GroceryPOS"}
            </h2>
          </div>
          <GroceryThemePicker
            color={brandColor}
            onChange={(c) => {
              queryClient.setQueryData(["/api/store/branding"], (old: BrandingData | undefined) =>
                old ? { ...old, brandColor: c } : old,
              );
            }}
            onSave={(c) => saveColorMutation.mutate(c)}
            saving={saveColorMutation.isPending}
            variant="light"
          />
        </header>
        <main className={`flex-1 min-h-0 flex flex-col pharmacy-scroll pharmacy-scroll-light ${isPosPage ? "overflow-hidden" : "overflow-y-auto"}`}>{children}</main>
      </div>
    </div>
  );
}
