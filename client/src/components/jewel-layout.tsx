import { useState, useEffect } from "react";
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
  Wifi,
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

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
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
  const isDark = useIsDark();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: branding } = useQuery<BrandingData>({
    queryKey: ["/api/store/branding"],
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/store-portal";
    },
  });

  const brandColor = branding?.brandColor || "#d4a574";

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? location === item.path : location.startsWith(item.path);

  const currentPage = navItems.find((i) => isActive(i));

  // ── Sidebar theme tokens ──────────────────────────────────────────────────
  // Light mode → warm rich dark (luxury jewelry feel)
  // Dark mode  → cool slate dark (sleek modern feel)
  const sidebarBg = isDark
    ? "linear-gradient(180deg, #0f172a 0%, #0f172a 100%)"
    : `linear-gradient(160deg, #1a0e06 0%, #261508 60%, #1a0e06 100%)`;

  const sidebarBorder = isDark ? "rgba(255,255,255,0.06)" : `${brandColor}22`;

  const inactiveText  = isDark ? "rgba(148,163,184,1)"  : "rgba(255,255,255,0.55)";
  const inactiveHover = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)";
  const inactiveIconBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)";
  const sectionLabel  = isDark ? "rgba(100,116,139,1)"  : "rgba(255,255,255,0.3)";
  const userPillBg    = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)";
  const userPillBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)";
  const footerBorder  = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)";

  const Sidebar = () => (
    <div
      className="flex flex-col h-full"
      style={{
        background: sidebarBg,
        borderInlineEnd: `1px solid ${sidebarBorder}`,
      }}
    >
      {/* ── Logo ── */}
      <div
        className="px-5 pt-6 pb-5"
        style={{ borderBottom: `1px solid ${footerBorder}` }}
      >
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-white/10 shadow-lg">
              <img
                src={branding.logoUrl}
                alt=""
                className="w-full h-full object-contain bg-white/10"
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${brandColor}dd, ${brandColor})`,
                boxShadow: `0 4px 18px ${brandColor}50`,
              }}
            >
              <Gem className="h-5 w-5 text-white drop-shadow" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-tight text-white truncate leading-tight">
              {branding?.name || "JewelPOS"}
            </p>
            <p className="text-[11px] leading-tight mt-0.5" style={{ color: inactiveText }}>
              {isAr ? "نظام إدارة المجوهرات" : "Jewelry Management"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p
          className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3"
          style={{ color: sectionLabel }}
        >
          {isAr ? "القائمة" : "Main Menu"}
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer select-none transition-all duration-150"
                style={
                  active
                    ? {
                        background: `linear-gradient(90deg, ${brandColor}28, ${brandColor}18)`,
                        color: brandColor,
                        borderInlineStart: `2.5px solid ${brandColor}`,
                      }
                    : { color: inactiveText }
                }
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = inactiveHover;
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "";
                }}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                {/* icon box */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={
                    active
                      ? { background: `${brandColor}30`, color: brandColor }
                      : { background: inactiveIconBg, color: inactiveText }
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <span className={`flex-1 ${active ? "font-semibold" : ""}`}>
                  {isAr ? item.labelAr : item.label}
                </span>

                {active && (
                  <ChevronRight className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div
        className="px-3 py-4 space-y-2"
        style={{ borderTop: `1px solid ${footerBorder}` }}
      >
        {/* User card */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: userPillBg, border: `1px solid ${userPillBorder}` }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${brandColor}cc, ${brandColor})`,
              boxShadow: `0 2px 8px ${brandColor}40`,
            }}
          >
            {(user?.username?.[0] ?? "J").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.username ?? "store"}
            </p>
            <p className="text-[10px]" style={{ color: inactiveText }}>
              {isAr ? "مدير المتجر" : "Store Manager"}
            </p>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-1">
          <div className="[&_button]:text-white/50 [&_button:hover]:text-white [&_button:hover]:bg-white/10">
            <LanguageToggle />
          </div>
          <div className="[&_button]:text-white/50 [&_button:hover]:text-white [&_button:hover]:bg-white/10">
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-center text-xs gap-1.5 hover:bg-red-500/20 hover:text-red-300 transition-colors"
            style={{ color: inactiveText }}
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
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: isDark ? "#020617" : "#f5f5f4" }}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0" style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.18)" }}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute start-0 top-0 bottom-0 w-64 flex flex-col" style={{ boxShadow: "8px 0 32px rgba(0,0,0,0.4)" }}>
            <Sidebar />
          </aside>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 end-4 text-white rounded-full p-1.5"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Impersonation banner */}
        {isImpersonating && (
          <div
            className="flex items-center justify-between gap-2 px-4 py-2 flex-shrink-0 text-white"
            style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}cc)` }}
          >
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
        <header
          className="flex items-center gap-3 px-5 h-14 flex-shrink-0"
          style={{
            background: isDark ? "#0f172a" : "#ffffff",
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)",
            boxShadow: isDark ? "none" : "0 1px 8px rgba(0,0,0,0.06)",
          }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: isDark ? "rgba(148,163,184,1)" : "rgba(100,116,139,1)" }}
            data-testid="button-sidebar-toggle"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className="hidden md:block font-medium text-sm"
              style={{ color: isDark ? "rgba(100,116,139,1)" : "rgba(156,163,175,1)" }}
            >
              {branding?.name || "JewelPOS"}
            </span>
            <ChevronRight
              className="h-3.5 w-3.5 hidden md:block"
              style={{ color: isDark ? "rgba(71,85,105,1)" : "rgba(209,213,219,1)" }}
            />
            <div className="flex items-center gap-2">
              {currentPage && (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: `${brandColor}20`, color: brandColor }}
                >
                  <currentPage.icon className="h-3.5 w-3.5" />
                </div>
              )}
              <span
                className="font-semibold"
                style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}
              >
                {isAr ? currentPage?.labelAr : currentPage?.label}
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="ms-auto flex items-center gap-2">
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(34,197,94,0.12)",
                color: "#16a34a",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <Wifi className="h-3 w-3" />
              {isAr ? "متصل" : "Online"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ background: isDark ? "#020617" : "#f5f5f4" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
