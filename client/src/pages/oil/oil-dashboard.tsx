import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle,
  ShoppingCart, Truck, HandCoins, BarChart3, ArrowRight, Activity,
  Wallet, Factory, Receipt, ScanLine, PiggyBank, Edit2, TrendingDown as SpendIcon,
} from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtFull(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const COLORS = {
  blue: { bg: "bg-blue-500/10", icon: "text-blue-500", border: "border-blue-500/20", glow: "shadow-blue-500/20" },
  green: { bg: "bg-emerald-500/10", icon: "text-emerald-500", border: "border-emerald-500/20", glow: "shadow-emerald-500/20" },
  red: { bg: "bg-red-500/10", icon: "text-red-500", border: "border-red-500/20", glow: "shadow-red-500/20" },
  amber: { bg: "bg-amber-500/10", icon: "text-amber-500", border: "border-amber-500/20", glow: "shadow-amber-500/20" },
  cyan: { bg: "bg-cyan-500/10", icon: "text-cyan-500", border: "border-cyan-500/20", glow: "shadow-cyan-500/20" },
  rose: { bg: "bg-rose-500/10", icon: "text-rose-500", border: "border-rose-500/20", glow: "shadow-rose-500/20" },
  violet: { bg: "bg-violet-500/10", icon: "text-violet-500", border: "border-violet-500/20", glow: "shadow-violet-500/20" },
  orange: { bg: "bg-orange-500/10", icon: "text-orange-500", border: "border-orange-500/20", glow: "shadow-orange-500/20" },
  teal: { bg: "bg-teal-500/10", icon: "text-teal-500", border: "border-teal-500/20", glow: "shadow-teal-500/20" },
};

export default function OilDashboard() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showCapitalDialog, setShowCapitalDialog] = useState(false);
  const [capitalInput, setCapitalInput] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/oil/dashboard"],
    queryFn: () => fetch("/api/oil/dashboard", { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 30000,
  });

  const capitalMutation = useMutation({
    mutationFn: (amount: number) => apiRequest("PATCH", "/api/oil/capital", { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تم تحديث رأس المال" : "Capital updated" });
      setShowCapitalDialog(false);
      setCapitalInput("");
    },
    onError: () => toast({ title: isAr ? "خطأ في التحديث" : "Update failed", variant: "destructive" }),
  });

  function openCapitalDialog() {
    setCapitalInput(String(data?.capital ?? 0));
    setShowCapitalDialog(true);
  }

  function saveCapital() {
    const val = parseFloat(capitalInput);
    if (isNaN(val) || val < 0) {
      toast({ title: isAr ? "أدخل مبلغاً صحيحاً" : "Enter a valid amount", variant: "destructive" });
      return;
    }
    capitalMutation.mutate(val);
  }

  const netProfit = data?.netProfit ?? 0;
  const profitable = netProfit >= 0;
  const capital = data?.capital ?? 0;
  const capitalSpent = data?.capitalSpent ?? 0;
  const capitalRemaining = data?.capitalRemaining ?? 0;
  const capitalSet = capital > 0;
  const capitalPct = capitalSet ? Math.min(100, Math.round((capitalSpent / capital) * 100)) : 0;

  const metrics = [
    {
      label: isAr ? "إجمالي الإيرادات" : "Revenue",
      value: fmt(data?.totalRevenue ?? 0),
      full: fmtFull(data?.totalRevenue ?? 0),
      icon: TrendingUp,
      color: COLORS.green,
      testId: "stat-revenue",
      href: "/oil/sales",
    },
    {
      label: isAr ? "المشتريات" : "Purchases",
      value: fmt(data?.totalCOGS ?? 0),
      full: fmtFull(data?.totalCOGS ?? 0),
      icon: Truck,
      color: COLORS.blue,
      testId: "stat-cogs",
      href: "/oil/purchases",
    },
    {
      label: isAr ? "المصاريف" : "Expenses",
      value: fmt(data?.totalExpenses ?? 0),
      full: fmtFull(data?.totalExpenses ?? 0),
      icon: DollarSign,
      color: COLORS.orange,
      testId: "stat-expenses",
      href: "/oil/expenses",
    },
    {
      label: isAr ? "صافي الربح" : "Net Profit",
      value: fmt(Math.abs(netProfit)),
      full: fmtFull(Math.abs(netProfit)),
      icon: BarChart3,
      color: profitable ? COLORS.green : COLORS.red,
      prefix: profitable ? "+" : "-",
      testId: "stat-profit",
      href: undefined,
    },
    {
      label: isAr ? "ذمم مدينة" : "Receivables",
      value: fmt(data?.totalReceivable ?? 0),
      full: fmtFull(data?.totalReceivable ?? 0),
      icon: Wallet,
      color: COLORS.cyan,
      testId: "stat-receivable",
      href: "/oil/debts",
    },
    {
      label: isAr ? "ذمم دائنة" : "Payables",
      value: fmt(data?.totalPayable ?? 0),
      full: fmtFull(data?.totalPayable ?? 0),
      icon: HandCoins,
      color: COLORS.rose,
      testId: "stat-payable",
      href: "/oil/debts",
    },
    {
      label: isAr ? "المنتجات" : "Products",
      value: String(data?.productCount ?? 0),
      full: String(data?.productCount ?? 0),
      icon: Package,
      color: COLORS.violet,
      testId: "stat-products",
      href: "/oil/inventory",
    },
    {
      label: isAr ? "مخزون منخفض" : "Low Stock",
      value: String(data?.lowStockCount ?? 0),
      full: String(data?.lowStockCount ?? 0),
      icon: AlertTriangle,
      color: (data?.lowStockCount ?? 0) > 0 ? COLORS.amber : COLORS.violet,
      testId: "stat-low-stock",
      href: "/oil/inventory",
      alert: (data?.lowStockCount ?? 0) > 0,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-8">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 40%)" }} />

        <div className="relative flex flex-col sm:flex-row sm:items-end gap-6 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">{isAr ? "مراقبة لحظية" : "Live Monitoring"}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{isAr ? "نظرة عامة" : "Factory Overview"}</h1>
            <p className="text-slate-400 text-sm">{isAr ? "ملخص أداء المصنع" : "Real-time performance summary"}</p>
          </div>

          {/* Hero profit pill */}
          <div className={`flex flex-col items-end gap-1 rounded-2xl px-5 py-3 border ${profitable ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <span className="text-xs text-slate-400">{isAr ? "صافي الربح" : "Net Profit"}</span>
            <span className={`text-2xl font-extrabold tracking-tight ${profitable ? "text-emerald-400" : "text-red-400"}`}>
              {profitable ? "+" : "-"}{fmtFull(Math.abs(netProfit))}
              <span className="text-sm font-normal ms-1 text-slate-400">IQD</span>
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 max-w-7xl">

        {/* ── رأس المال (Capital) Card ── */}
        {isLoading ? (
          <div className="h-36 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
        ) : (
          <div
            data-testid="card-capital"
            className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 rounded-2xl p-5 shadow-lg overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 60%)" }} />
            <div className="relative flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
              {/* Left: Title + 3 stats */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <PiggyBank className="h-4.5 w-4.5 text-white h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">{isAr ? "رأس المال" : "Capital"}</p>
                    <p className="text-teal-200 text-xs">{isAr ? "متابعة رأس مال المصنع" : "Factory working capital tracker"}</p>
                  </div>
                  <button
                    onClick={openCapitalDialog}
                    className="ms-2 w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                    data-testid="button-edit-capital"
                    title={isAr ? "تعديل رأس المال" : "Edit capital"}
                  >
                    <Edit2 className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Total capital */}
                  <div className="bg-white/10 rounded-xl px-3 py-2.5">
                    <p className="text-teal-200 text-[10px] mb-0.5">{isAr ? "رأس المال" : "Total Capital"}</p>
                    <p className="text-white font-extrabold text-lg leading-none" data-testid="capital-total">
                      {capitalSet ? fmt(capital) : "—"}
                    </p>
                    <p className="text-teal-300 text-[10px] mt-0.5">IQD</p>
                  </div>
                  {/* Spent on purchases */}
                  <div className="bg-white/10 rounded-xl px-3 py-2.5">
                    <p className="text-teal-200 text-[10px] mb-0.5">{isAr ? "المصروف على الموردين" : "Spent (Purchases)"}</p>
                    <p className="text-rose-300 font-extrabold text-lg leading-none" data-testid="capital-spent">
                      -{fmt(capitalSpent)}
                    </p>
                    <p className="text-teal-300 text-[10px] mt-0.5">IQD</p>
                  </div>
                  {/* Remaining */}
                  <div className="bg-white/10 rounded-xl px-3 py-2.5">
                    <p className="text-teal-200 text-[10px] mb-0.5">{isAr ? "المتبقي" : "Remaining"}</p>
                    <p className={`font-extrabold text-lg leading-none ${capitalRemaining >= 0 ? "text-emerald-300" : "text-red-300"}`} data-testid="capital-remaining">
                      {capitalSet ? fmt(Math.abs(capitalRemaining)) : "—"}
                    </p>
                    <p className="text-teal-300 text-[10px] mt-0.5">IQD</p>
                  </div>
                </div>
              </div>

              {/* Right: Progress bar */}
              {capitalSet && (
                <div className="sm:w-44 space-y-1.5">
                  <div className="flex justify-between text-xs text-teal-200">
                    <span>{isAr ? "نسبة الإنفاق" : "Spent"}</span>
                    <span>{capitalPct}%</span>
                  </div>
                  <div className="h-3 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${capitalPct >= 90 ? "bg-red-400" : capitalPct >= 70 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${capitalPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-teal-300 text-end">
                    {capitalPct >= 90
                      ? (isAr ? "⚠ تجاوزت 90% من رأس المال" : "⚠ Over 90% spent")
                      : capitalPct >= 70
                      ? (isAr ? "تجاوزت 70% من رأس المال" : "70%+ spent")
                      : (isAr ? "ضمن الحد الآمن" : "Within safe range")}
                  </p>
                </div>
              )}

              {/* No capital set */}
              {!capitalSet && !isLoading && (
                <button
                  onClick={openCapitalDialog}
                  className="sm:self-center flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
                  data-testid="button-set-capital"
                >
                  <PiggyBank className="h-4 w-4" />
                  {isAr ? "تعيين رأس المال" : "Set Capital"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Metric cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => {
              const Icon = m.icon;
              const c = m.color;
              const inner = (
                <div
                  key={m.testId}
                  data-testid={`card-${m.testId}`}
                  className={`relative group bg-white dark:bg-slate-900 rounded-2xl border ${c.border} p-4 shadow-sm hover:shadow-md transition-all duration-200 ${m.href ? "cursor-pointer hover:-translate-y-0.5" : ""} ${m.alert ? "ring-1 ring-amber-400/40" : ""}`}
                >
                  {m.alert && (
                    <span className="absolute top-3 end-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.bg}`}>
                    <Icon className={`h-4 w-4 ${c.icon}`} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{m.label}</p>
                  <p className={`text-xl font-extrabold tracking-tight ${c.icon}`} data-testid={m.testId} title={m.full + " IQD"}>
                    {m.prefix}{m.value}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">IQD</p>
                  {m.href && (
                    <ArrowRight className="absolute bottom-3 end-3 h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              );
              return m.href ? (
                <Link key={m.testId} href={m.href}>{inner}</Link>
              ) : (
                <div key={m.testId}>{inner}</div>
              );
            })}
          </div>
        )}

        {/* Quick nav links */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { href: "/oil/pos", icon: ScanLine, label: isAr ? "نقطة البيع" : "POS Terminal", color: "from-cyan-500 to-blue-600" },
            { href: "/oil/sales", icon: ShoppingCart, label: isAr ? "مبيعات جديدة" : "New Sale", color: "from-emerald-500 to-teal-600" },
            { href: "/oil/purchases", icon: Truck, label: isAr ? "فاتورة شراء" : "New Purchase", color: "from-blue-500 to-indigo-600" },
            { href: "/oil/production", icon: Factory, label: isAr ? "دفعة إنتاج" : "Production", color: "from-violet-500 to-purple-600" },
            { href: "/oil/expenses", icon: Receipt, label: isAr ? "مصروف جديد" : "New Expense", color: "from-orange-500 to-red-600" },
          ].map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.href} href={q.href}>
                <div className={`flex items-center gap-3 bg-gradient-to-r ${q.color} text-white rounded-xl px-4 py-3 cursor-pointer hover:opacity-90 hover:shadow-md transition-all`}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">{q.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Sales */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                  {isAr ? "آخر المبيعات" : "Recent Sales"}
                </span>
              </div>
              <Link href="/oil/sales">
                <span className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer">
                  {isAr ? "عرض الكل" : "View all"} <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                ))
              ) : !data?.recentSales?.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Activity className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">{isAr ? "لا توجد مبيعات بعد" : "No sales yet"}</p>
                </div>
              ) : data.recentSales.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {s.customerName || s.invoiceNumber}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-emerald-600">
                      {fmtFull(parseFloat(s.totalAmount))} IQD
                    </p>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 ${s.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}
                    >
                      {s.paymentStatus === "paid" ? (isAr ? "مدفوع" : "Paid") : (isAr ? "معلق" : "Pending")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-blue-500" />
                </div>
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                  {isAr ? "آخر المشتريات" : "Recent Purchases"}
                </span>
              </div>
              <Link href="/oil/purchases">
                <span className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer">
                  {isAr ? "عرض الكل" : "View all"} <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                ))
              ) : !data?.recentPurchases?.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Activity className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">{isAr ? "لا توجد مشتريات بعد" : "No purchases yet"}</p>
                </div>
              ) : data.recentPurchases.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {p.supplierName || p.invoiceNumber || `PO-${p.id}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-blue-600">
                      {fmtFull(parseFloat(p.totalAmount))} IQD
                    </p>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 ${p.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}
                    >
                      {p.paymentStatus === "paid" ? (isAr ? "مدفوع" : "Paid") : (isAr ? "معلق" : "Pending")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Capital Edit Dialog */}
      <Dialog open={showCapitalDialog} onOpenChange={setShowCapitalDialog}>
        <DialogContent className="max-w-sm" data-testid="dialog-capital">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-teal-600" />
              {isAr ? "تعيين رأس المال" : "Set Working Capital"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "أدخل إجمالي رأس المال المتاح للمصنع. سيتم خصم قيمة المشتريات من الموردين تلقائياً."
                : "Enter the total working capital available. Purchase amounts will be deducted automatically."}
            </p>
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "رأس المال (IQD)" : "Capital Amount (IQD)"}</label>
              <Input
                type="number"
                min={0}
                value={capitalInput}
                onChange={e => setCapitalInput(e.target.value)}
                placeholder="0"
                data-testid="input-capital"
                className="text-lg font-bold"
                onKeyDown={e => e.key === "Enter" && saveCapital()}
              />
            </div>
            {capitalInput && parseFloat(capitalInput) > 0 && capitalSpent > 0 && (
              <div className="rounded-xl bg-muted/50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isAr ? "رأس المال" : "Capital"}</span>
                  <span className="font-semibold">{fmtFull(parseFloat(capitalInput))} IQD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isAr ? "المصروف على الموردين" : "Spent on purchases"}</span>
                  <span className="font-semibold text-rose-600">-{fmtFull(capitalSpent)} IQD</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 mt-1">
                  <span className="font-medium">{isAr ? "المتبقي" : "Remaining"}</span>
                  <span className={`font-bold ${parseFloat(capitalInput) - capitalSpent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {fmtFull(Math.abs(parseFloat(capitalInput) - capitalSpent))} IQD
                    {parseFloat(capitalInput) - capitalSpent < 0 && (isAr ? " (عجز)" : " (deficit)")}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowCapitalDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button
                onClick={saveCapital}
                disabled={capitalMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
                data-testid="button-save-capital"
              >
                {capitalMutation.isPending ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
