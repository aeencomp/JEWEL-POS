import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  ShoppingCart, Truck, Receipt, Calendar, ChevronDown, ChevronUp,
  FileText,
} from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function startOf(unit: "day" | "week" | "month", d = new Date()) {
  const x = new Date(d);
  if (unit === "day") { x.setHours(0, 0, 0, 0); return x; }
  if (unit === "week") {
    const day = x.getDay();
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

type Period = "daily" | "weekly" | "monthly" | "custom";

const PERIOD_LABELS = {
  daily:   { en: "Today", ar: "اليوم" },
  weekly:  { en: "This Week", ar: "هذا الأسبوع" },
  monthly: { en: "This Month", ar: "هذا الشهر" },
  custom:  { en: "Custom Range", ar: "تاريخ مخصص" },
};

export default function OilReports() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [period, setPeriod] = useState<Period>("daily");
  const [customFrom, setCustomFrom] = useState(new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [expandSection, setExpandSection] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (period === "daily") return { from: startOf("day", now), to: endOfDay(now) };
    if (period === "weekly") return { from: startOf("week", now), to: endOfDay(now) };
    if (period === "monthly") return { from: startOf("month", now), to: endOfDay(now) };
    return {
      from: new Date(customFrom + "T00:00:00"),
      to: new Date(customTo + "T23:59:59"),
    };
  }, [period, customFrom, customTo]);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/oil/reports", from.toISOString(), to.toISOString()],
    queryFn: () =>
      fetch(`/api/oil/reports?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: "include" })
        .then(r => r.json()),
    enabled: !!from && !!to,
  });

  const totalRevenue = data?.totalRevenue ?? 0;
  const totalPurchases = data?.totalPurchases ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const netProfit = data?.netProfit ?? 0;
  const profitable = netProfit >= 0;

  const periodLabel = (p: Period) => isAr ? PERIOD_LABELS[p].ar : PERIOD_LABELS[p].en;

  function toggle(sec: string) {
    setExpandSection(prev => prev === sec ? null : sec);
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isAr ? "التقارير" : "Reports"}
            </h1>
            <p className="text-xs text-slate-400">
              {periodLabel(period)} ·{" "}
              {from.toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}
              {period !== "daily" && ` — ${to.toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Period selector */}
        <div className="flex flex-wrap gap-2">
          {(["daily", "weekly", "monthly", "custom"] as Period[]).map(p => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
              data-testid={`button-period-${p}`}
              className={period === p ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
            >
              <Calendar className="h-3.5 w-3.5 me-1.5" />
              {periodLabel(p)}
            </Button>
          ))}
        </div>

        {/* Custom date inputs */}
        {period === "custom" && (
          <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-900 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {isAr ? "من" : "From"}
              </label>
              <Input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="w-40"
                data-testid="input-date-from"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {isAr ? "إلى" : "To"}
              </label>
              <Input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="w-40"
                data-testid="input-date-to"
              />
            </div>
          </div>
        )}

        {/* Summary cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-emerald-200 dark:border-emerald-800/40">
              <CardContent className="p-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 mb-0.5">{isAr ? "الإيرادات" : "Revenue"}</p>
                <p className="text-xl font-extrabold text-emerald-600" data-testid="report-revenue">{fmt(totalRevenue)}</p>
                <p className="text-[10px] text-slate-400">IQD</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800/40">
              <CardContent className="p-4">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-xs text-slate-500 mb-0.5">{isAr ? "المشتريات" : "Purchases"}</p>
                <p className="text-xl font-extrabold text-blue-600" data-testid="report-purchases">{fmt(totalPurchases)}</p>
                <p className="text-[10px] text-slate-400">IQD</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-800/40">
              <CardContent className="p-4">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2">
                  <DollarSign className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-xs text-slate-500 mb-0.5">{isAr ? "المصاريف" : "Expenses"}</p>
                <p className="text-xl font-extrabold text-orange-600" data-testid="report-expenses">{fmt(totalExpenses)}</p>
                <p className="text-[10px] text-slate-400">IQD</p>
              </CardContent>
            </Card>
            <Card className={profitable ? "border-emerald-200 dark:border-emerald-800/40" : "border-red-200 dark:border-red-800/40"}>
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${profitable ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <BarChart3 className={`h-4 w-4 ${profitable ? "text-emerald-500" : "text-red-500"}`} />
                </div>
                <p className="text-xs text-slate-500 mb-0.5">{isAr ? "صافي الربح" : "Net Profit"}</p>
                <p className={`text-xl font-extrabold ${profitable ? "text-emerald-600" : "text-red-600"}`} data-testid="report-profit">
                  {profitable ? "+" : "-"}{fmt(Math.abs(netProfit))}
                </p>
                <p className="text-[10px] text-slate-400">IQD</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Visual bar breakdown */}
        {!isLoading && (totalRevenue > 0 || totalPurchases > 0 || totalExpenses > 0) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isAr ? "توزيع الفترة" : "Period Breakdown"}
            </p>
            {[
              { label: isAr ? "الإيرادات" : "Revenue", value: totalRevenue, color: "bg-emerald-500", max: Math.max(totalRevenue, totalPurchases, totalExpenses) },
              { label: isAr ? "المشتريات" : "Purchases", value: totalPurchases, color: "bg-blue-500", max: Math.max(totalRevenue, totalPurchases, totalExpenses) },
              { label: isAr ? "المصاريف" : "Expenses", value: totalExpenses, color: "bg-orange-500", max: Math.max(totalRevenue, totalPurchases, totalExpenses) },
            ].map(bar => (
              <div key={bar.label} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{bar.label}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(bar.value)} IQD</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                    style={{ width: bar.max > 0 ? `${(bar.value / bar.max) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transactions sections */}
        {!isLoading && (
          <div className="space-y-3">
            {/* Sales */}
            <TransactionSection
              title={isAr ? "المبيعات" : "Sales"}
              count={data?.sales?.length ?? 0}
              icon={ShoppingCart}
              color="text-emerald-600"
              bgColor="bg-emerald-500/10"
              borderColor="border-emerald-200 dark:border-emerald-800/40"
              expanded={expandSection === "sales"}
              onToggle={() => toggle("sales")}
              isAr={isAr}
            >
              {(data?.sales ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium">{s.customerName || s.invoiceNumber}</p>
                    <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleString(isAr ? "ar-IQ" : "en-GB")}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-emerald-600">{fmt(parseFloat(s.totalAmount))} IQD</p>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 ${s.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {s.paymentStatus === "paid" ? (isAr ? "مدفوع" : "Paid") : (isAr ? "آجل" : "Pending")}
                    </Badge>
                  </div>
                </div>
              ))}
            </TransactionSection>

            {/* Purchases */}
            <TransactionSection
              title={isAr ? "المشتريات" : "Purchases"}
              count={data?.purchases?.length ?? 0}
              icon={Truck}
              color="text-blue-600"
              bgColor="bg-blue-500/10"
              borderColor="border-blue-200 dark:border-blue-800/40"
              expanded={expandSection === "purchases"}
              onToggle={() => toggle("purchases")}
              isAr={isAr}
            >
              {(data?.purchases ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium">{p.supplierName || p.invoiceNumber || `PO-${p.id}`}</p>
                    <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleString(isAr ? "ar-IQ" : "en-GB")}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-blue-600">{fmt(parseFloat(p.totalAmount))} IQD</p>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 ${p.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {p.paymentStatus === "paid" ? (isAr ? "مدفوع" : "Paid") : (isAr ? "آجل" : "Pending")}
                    </Badge>
                  </div>
                </div>
              ))}
            </TransactionSection>

            {/* Expenses */}
            <TransactionSection
              title={isAr ? "المصاريف" : "Expenses"}
              count={data?.expenses?.length ?? 0}
              icon={Receipt}
              color="text-orange-600"
              bgColor="bg-orange-500/10"
              borderColor="border-orange-200 dark:border-orange-800/40"
              expanded={expandSection === "expenses"}
              onToggle={() => toggle("expenses")}
              isAr={isAr}
            >
              {(data?.expenses ?? []).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium">{e.description || (isAr ? "مصروف" : "Expense")}</p>
                    <p className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString(isAr ? "ar-IQ" : "en-GB")}</p>
                  </div>
                  <p className="text-sm font-bold text-orange-600">{fmt(parseFloat(e.amount))} IQD</p>
                </div>
              ))}
            </TransactionSection>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !data?.sales?.length && !data?.purchases?.length && !data?.expenses?.length && (
          <div className="text-center py-16 text-slate-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{isAr ? "لا توجد بيانات في هذه الفترة" : "No data for this period"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionSection({
  title, count, icon: Icon, color, bgColor, borderColor,
  expanded, onToggle, children, isAr,
}: {
  title: string; count: number; icon: any; color: string; bgColor: string;
  borderColor: string; expanded: boolean; onToggle: () => void;
  children: React.ReactNode; isAr: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${borderColor} overflow-hidden`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={onToggle}
        data-testid={`section-${title.toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${bgColor} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{title}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {count} {isAr ? "سجل" : "records"}
          </Badge>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {expanded && count > 0 && (
        <div className="px-4 pb-2 max-h-72 overflow-y-auto">
          {children}
        </div>
      )}
      {expanded && count === 0 && (
        <div className="px-4 pb-4 text-center text-xs text-slate-400">
          {isAr ? "لا توجد سجلات" : "No records in this period"}
        </div>
      )}
    </div>
  );
}
