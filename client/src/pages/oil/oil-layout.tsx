import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Factory,
  Users, Building2, Receipt, HandCoins, LogOut, Menu, X,
  Droplets, ChevronRight, ScanLine, Palette, ClipboardList, BookOpen,
  AlertTriangle, CalendarDays, RefreshCcw,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const ALL_NAV_ITEMS = [
  { path: "/oil", icon: LayoutDashboard, label: "Dashboard", labelAr: "لوحة التحكم", featureKey: null, exact: true },
  { path: "/oil/pos", icon: ScanLine, label: "POS", labelAr: "نقطة البيع", featureKey: "pos" },
  { path: "/oil/inventory", icon: Package, label: "Inventory", labelAr: "المخزون", featureKey: "inventory" },
  { path: "/oil/sales", icon: ShoppingCart, label: "Sales", labelAr: "المبيعات", featureKey: "sales" },
  { path: "/oil/purchases", icon: Truck, label: "Purchases", labelAr: "المشتريات", featureKey: "purchases" },
  { path: "/oil/production", icon: Factory, label: "Production", labelAr: "الإنتاج", featureKey: "production" },
  { path: "/oil/customers", icon: Users, label: "Customers", labelAr: "العملاء", featureKey: "customers" },
  { path: "/oil/suppliers", icon: Building2, label: "Suppliers", labelAr: "الموردون", featureKey: "suppliers" },
  { path: "/oil/expenses", icon: Receipt, label: "Expenses", labelAr: "المصاريف", featureKey: "expenses" },
  { path: "/oil/debts", icon: HandCoins, label: "Debts", labelAr: "الديون", featureKey: "debts" },
  { path: "/oil/delivery", icon: ClipboardList, label: "Delivery Notes", labelAr: "وصولات التسليم", featureKey: "delivery" },
  { path: "/oil/batch", icon: BookOpen, label: "Product Records", labelAr: "سجل المنتجات", featureKey: "batch" },
  { path: "/oil/branding", icon: Palette, label: "Branding", labelAr: "العلامة التجارية", featureKey: null },
];

function NavLabel({ label, labelAr, isAr }: { label: string; labelAr: string; isAr: boolean }) {
  return <span>{isAr ? labelAr : label}</span>;
}

export default function OilLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  const { data: storeInfo } = useQuery<{ name: string; features?: string | null }>({
    queryKey: ["/api/oil/store-info"],
    queryFn: () => fetch("/api/oil/store-info", { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
  });

  const { data: subscription } = useQuery<{ daysLeft: number | null; endDate: string | null; startDate: string | null; status: string; plan: string; pricePerMonth: string; renewalRequestedAt: string | null }>({
    queryKey: ["/api/oil/subscription"],
    queryFn: () => fetch("/api/oil/subscription", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (!subscription) return;
    const { daysLeft, status } = subscription;
    if (status === "expired" || (daysLeft !== null && daysLeft <= 2)) {
      const dismissKey = `sub_reminder_dismissed_${new Date().toDateString()}`;
      if (!localStorage.getItem(dismissKey)) {
        setShowReminderDialog(true);
      }
    }
  }, [subscription]);

  function dismissReminder() {
    const dismissKey = `sub_reminder_dismissed_${new Date().toDateString()}`;
    localStorage.setItem(dismissKey, "1");
    setShowReminderDialog(false);
  }

  const allowedFeatures: string[] | null = storeInfo?.features
    ? JSON.parse(storeInfo.features) as string[]
    : null;

  const navItems = ALL_NAV_ITEMS.filter(item =>
    item.featureKey === null || allowedFeatures === null || allowedFeatures.includes(item.featureKey)
  );

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/oil-login";
    },
  });

  const renewalMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/oil/subscription/request-renewal"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/subscription"] });
      toast({
        title: isAr ? "تم إرسال طلب التجديد" : "Renewal Request Sent",
        description: isAr
          ? "سيتواصل معك المسؤول قريباً لتجديد اشتراكك."
          : "The administrator will contact you shortly to renew your subscription.",
      });
    },
    onError: () => {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "حدث خطأ. يرجى المحاولة مجدداً." : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isActive = (item: (typeof ALL_NAV_ITEMS)[0]) =>
    item.exact ? location === item.path : location.startsWith(item.path);

  const currentPage = ALL_NAV_ITEMS.find((i) => isActive(i));

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg shadow-blue-900/40">
            {storeInfo?.logoUrl
              ? <img src={storeInfo.logoUrl} alt="logo" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center"><Droplets className="h-5 w-5 text-white" /></div>
            }
          </div>
          <div>
            <p className="font-bold text-base tracking-tight text-white">{storeInfo?.name || "OilPOS"}</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {isAr ? "نظام مصنع الزيوت" : "Oil Factory ERP"}
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
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                <NavLabel label={item.label} labelAr={item.labelAr} isAr={isAr} />
                {active && <ChevronRight className="h-3.5 w-3.5 ms-auto text-blue-300" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700/60 space-y-3">

        {/* Subscription card */}
        {subscription && (
          <div className="rounded-xl bg-slate-800 border border-slate-700 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
                {isAr ? "الاشتراك" : "Subscription"}
              </div>
              <Badge
                className={`text-[10px] px-1.5 py-0 h-4 ${
                  subscription.status === "active"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : subscription.status === "trial"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
                variant="outline"
              >
                {subscription.status === "active"
                  ? (isAr ? "فعّال" : "Active")
                  : subscription.status === "trial"
                  ? (isAr ? "تجريبي" : "Trial")
                  : subscription.status === "expired"
                  ? (isAr ? "منتهي" : "Expired")
                  : subscription.status}
              </Badge>
            </div>

            <div className="space-y-1 text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span>{isAr ? "البداية:" : "Start:"}</span>
                <span className="text-slate-300">
                  {subscription.startDate
                    ? new Date(subscription.startDate).toLocaleDateString(isAr ? "ar-IQ" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? "الانتهاء:" : "Expires:"}</span>
                <span className={`font-medium ${
                  subscription.daysLeft !== null && subscription.daysLeft <= 2
                    ? "text-red-400"
                    : subscription.daysLeft !== null && subscription.daysLeft <= 7
                    ? "text-amber-400"
                    : "text-slate-300"
                }`}>
                  {subscription.endDate
                    ? new Date(subscription.endDate).toLocaleDateString(isAr ? "ar-IQ" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : (isAr ? "غير محدد" : "No limit")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? "السعر:" : "Price:"}</span>
                <span className="text-slate-300">
                  {parseFloat(subscription.pricePerMonth || "0").toLocaleString()} {isAr ? "د.ع / شهر" : "IQD/mo"}
                </span>
              </div>
              {subscription.daysLeft !== null && subscription.daysLeft > 0 && (
                <div className="flex justify-between">
                  <span>{isAr ? "المتبقي:" : "Remaining:"}</span>
                  <span className={`font-semibold ${subscription.daysLeft <= 2 ? "text-red-400" : subscription.daysLeft <= 7 ? "text-amber-400" : "text-emerald-400"}`}>
                    {subscription.daysLeft} {isAr ? "يوم" : "days"}
                  </span>
                </div>
              )}
            </div>

            <Button
              size="sm"
              className="w-full h-7 text-[11px] gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
              onClick={() => renewalMutation.mutate()}
              disabled={renewalMutation.isPending || !!subscription.renewalRequestedAt}
              data-testid="button-request-renewal"
            >
              <RefreshCcw className="h-3 w-3" />
              {renewalMutation.isPending
                ? (isAr ? "جارٍ الإرسال..." : "Sending...")
                : subscription.renewalRequestedAt
                ? (isAr ? "تم إرسال الطلب ✓" : "Request Sent ✓")
                : (isAr ? "طلب تجديد" : "Request Renewal")}
            </Button>
          </div>
        )}

        {/* User pill */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {(user?.username?.[0] ?? "O").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.username ?? "oiluser"}</p>
            <p className="text-[10px] text-slate-500">{isAr ? "مشغّل المصنع" : "Factory Operator"}</p>
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

  const isExpired = subscription?.status === "expired";
  const daysLeft = subscription?.daysLeft ?? null;
  const endDateStr = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString(isAr ? "ar-IQ" : "en-GB", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950" dir={isAr ? "rtl" : "ltr"}>

      {/* Subscription Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={(open) => { if (!open) dismissReminder(); }}>
        <DialogContent className="max-w-md" data-testid="subscription-reminder-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              {isExpired
                ? (isAr ? "انتهت صلاحية الاشتراك" : "Subscription Expired")
                : (isAr ? "تنبيه: اشتراكك على وشك الانتهاء" : "Subscription Expiring Soon")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-sm">
                  {isExpired ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        {isAr ? "لقد انتهت صلاحية اشتراكك." : "Your subscription has expired."}
                      </p>
                      <p className="text-amber-700 dark:text-amber-400">
                        {isAr
                          ? "بعض الميزات قد تكون محدودة. يرجى التواصل مع المسؤول لتجديد الاشتراك."
                          : "Some features may be limited. Please contact the administrator to renew your subscription."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        {isAr
                          ? `ينتهي اشتراكك خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}.`
                          : `Your subscription expires in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`}
                      </p>
                      {endDateStr && (
                        <p className="text-amber-700 dark:text-amber-400">
                          {isAr ? `تاريخ الانتهاء: ${endDateStr}` : `Expiry date: ${endDateStr}`}
                        </p>
                      )}
                      <p className="text-amber-700 dark:text-amber-400 mt-2">
                        {isAr
                          ? "يرجى التواصل مع المسؤول لتجديد اشتراكك وضمان استمرارية الخدمة."
                          : "Please contact the administrator to renew your subscription and ensure uninterrupted service."}
                      </p>
                    </div>
                  )}
                </div>

                <div className={`text-xs text-slate-500 dark:text-slate-400 ${isAr ? "text-right" : "text-left"}`}>
                  {isAr ? "سيتم تذكيرك مرة واحدة يومياً." : "You will be reminded once per day."}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={`flex gap-2 ${isAr ? "flex-row-reverse" : ""}`}>
            <Button
              variant="outline"
              onClick={dismissReminder}
              data-testid="button-dismiss-reminder"
              className="flex-1"
            >
              {isAr ? "إغلاق" : "Dismiss for Today"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-5 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <Droplets className="h-4 w-4 text-blue-500 hidden md:block" />
            <span className="text-slate-400 hidden md:block">{storeInfo?.name || "OilPOS"}</span>
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
