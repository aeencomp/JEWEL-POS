import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, RotateCcw, ShoppingCart, Heart, Calendar, FileText,
  ChevronDown, ChevronUp, Printer, BarChart3, Tag, Banknote,
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

type ReportData = {
  grossSales: number;
  totalDiscount: number;
  returnsTotal: number;
  netSales: number;
  orderCount: number;
  itemsSold: number;
  avgOrderValue: number;
  refundedCount: number;
  cancelledCount: number;
  loyaltyEarned: number;
  loyaltyRedeemed: number;
  paymentBreakdown: Record<string, { count: number; total: number }>;
  topProducts: { name: string; sku: string; qty: number; revenue: number }[];
  topCategories: { name: string; qty: number; revenue: number }[];
  dailyBreakdown: { date: string; sales: number; orders: number; returns: number }[];
  orders: { id: number; orderNumber: string; customerName: string | null; total: string; discount: string; paymentMethod: string | null; createdAt: string }[];
  refundedOrders: { id: number; orderNumber: string; customerName: string | null; total: string; createdAt: string }[];
};

const PERIOD_LABELS = {
  daily: { en: "Daily Report", ar: "تقرير اليوم" },
  weekly: { en: "Weekly Report", ar: "تقرير الأسبوع" },
  monthly: { en: "Monthly Report", ar: "تقرير الشهر" },
  custom: { en: "Custom Range", ar: "فترة مخصصة" },
};

const PAYMENT_LABELS: Record<string, { en: string; ar: string }> = {
  cash: { en: "Cash", ar: "نقدي" },
  card: { en: "Card", ar: "بطاقة" },
  transfer: { en: "Transfer", ar: "تحويل" },
  debit: { en: "Credit", ar: "آجل" },
};

export default function FashionReports() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [period, setPeriod] = useState<Period>("daily");
  const [customFrom, setCustomFrom] = useState(new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [expandSection, setExpandSection] = useState<string | null>("orders");

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

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/fashion/reports", from.toISOString(), to.toISOString()],
    queryFn: () =>
      fetch(`/api/fashion/reports?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: "include" })
        .then((r) => r.json()),
    enabled: !!from && !!to,
  });

  const periodLabel = (p: Period) => (isAr ? PERIOD_LABELS[p].ar : PERIOD_LABELS[p].en);

  function toggle(sec: string) {
    setExpandSection((prev) => (prev === sec ? null : sec));
  }

  function printReport() {
    const w = window.open("", "_blank");
    if (!w || !data) return;
    const title = periodLabel(period);
    const dateStr = from.toLocaleDateString(isAr ? "ar-IQ" : "en-GB");
    w.document.write(`<!DOCTYPE html><html dir="${isAr ? "rtl" : "ltr"}"><head><title>${title}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto}
      h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;color:#666;margin-top:20px}
      table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:8px;text-align:${isAr ? "right" : "left"};font-size:12px}
      th{background:#fdf2f8}.kpi{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0}
      .kpi div{flex:1;min-width:120px;padding:12px;background:#f9fafb;border-radius:8px}
      .kpi strong{display:block;font-size:18px;color:#db2777}</style></head><body>
      <h1>FashionPOS — ${title}</h1>
      <p>${dateStr}${period !== "daily" ? ` — ${to.toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}` : ""}</p>
      <div class="kpi">
        <div><span>${isAr ? "إجمالي المبيعات" : "Gross Sales"}</span><strong>${fmt(data.grossSales)} IQD</strong></div>
        <div><span>${isAr ? "المرتجعات" : "Returns"}</span><strong>${fmt(data.returnsTotal)} IQD</strong></div>
        <div><span>${isAr ? "صافي المبيعات" : "Net Sales"}</span><strong>${fmt(data.netSales)} IQD</strong></div>
        <div><span>${isAr ? "الطلبات" : "Orders"}</span><strong>${data.orderCount}</strong></div>
      </div>
      <h2>${isAr ? "أفضل المنتجات" : "Top Products"}</h2>
      <table><tr><th>${isAr ? "المنتج" : "Product"}</th><th>${isAr ? "الكمية" : "Qty"}</th><th>${isAr ? "الإيراد" : "Revenue"}</th></tr>
      ${data.topProducts.map((p) => `<tr><td>${p.name}</td><td>${p.qty}</td><td>${fmt(p.revenue)}</td></tr>`).join("")}
      </table>
      <script>window.print();window.close()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 bg-background border-b flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-pink-500" />
          </div>
          <div>
            <h1 className="text-base font-bold" data-testid="text-fashion-reports-title">
              {isAr ? "التقارير" : "Reports"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {periodLabel(period)} · {from.toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}
              {period !== "daily" && ` — ${to.toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={printReport} disabled={!data} data-testid="button-print-report">
          <Printer className="h-4 w-4 me-2" />
          {isAr ? "طباعة" : "Print"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex flex-wrap gap-2">
          {(["daily", "weekly", "monthly", "custom"] as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
              className={period === p ? "bg-pink-600 hover:bg-pink-700 text-white" : ""}
              data-testid={`button-period-${p}`}
            >
              <Calendar className="h-3.5 w-3.5 me-1.5" />
              {periodLabel(p)}
            </Button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap gap-3 items-center bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">{isAr ? "من" : "From"}</label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">{isAr ? "إلى" : "To"}</label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: isAr ? "إجمالي المبيعات" : "Gross Sales", value: fmt(data?.grossSales ?? 0), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                { label: isAr ? "المرتجعات" : "Returns", value: fmt(data?.returnsTotal ?? 0), icon: RotateCcw, color: "text-rose-600", bg: "bg-rose-500/10" },
                { label: isAr ? "صافي المبيعات" : "Net Sales", value: fmt(data?.netSales ?? 0), icon: BarChart3, color: "text-pink-600", bg: "bg-pink-500/10" },
                { label: isAr ? "الطلبات" : "Orders", value: String(data?.orderCount ?? 0), icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-500/10" },
                { label: isAr ? "قطع مباعة" : "Items Sold", value: String(data?.itemsSold ?? 0), icon: Tag, color: "text-purple-600", bg: "bg-purple-500/10" },
                { label: isAr ? "متوسط الطلب" : "Avg Order", value: fmt(data?.avgOrderValue ?? 0), icon: Banknote, color: "text-amber-600", bg: "bg-amber-500/10" },
              ].map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card key={kpi.label}>
                    <CardContent className="p-4">
                      <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center mb-2`}>
                        <Icon className={`h-4 w-4 ${kpi.color}`} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                      <p className={`text-lg font-extrabold ${kpi.color}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    {isAr ? "برنامج الولاء" : "Loyalty"}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isAr ? "نقاط مكتسبة" : "Points earned"}</span>
                    <span className="font-bold">{data?.loyaltyEarned ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isAr ? "نقاط مستبدلة" : "Points redeemed"}</span>
                    <span className="font-bold">{data?.loyaltyRedeemed ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isAr ? "خصومات" : "Discounts"}</span>
                    <span className="font-bold">{fmt(data?.totalDiscount ?? 0)} IQD</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold">{isAr ? "طرق الدفع" : "Payment Methods"}</p>
                  {Object.entries(data?.paymentBreakdown ?? {}).map(([method, info]) => (
                    <div key={method} className="flex justify-between text-sm">
                      <span>{isAr ? (PAYMENT_LABELS[method]?.ar ?? method) : (PAYMENT_LABELS[method]?.en ?? method)} ({info.count})</span>
                      <span className="font-bold">{fmt(info.total)} IQD</span>
                    </div>
                  ))}
                  {Object.keys(data?.paymentBreakdown ?? {}).length === 0 && (
                    <p className="text-sm text-muted-foreground">{isAr ? "لا توجد مبيعات" : "No sales in period"}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {(data?.dailyBreakdown?.length ?? 0) > 1 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">{isAr ? "المبيعات اليومية" : "Daily Sales Breakdown"}</p>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
                          <TableHead className="text-end">{isAr ? "الطلبات" : "Orders"}</TableHead>
                          <TableHead className="text-end">{isAr ? "المبيعات" : "Sales"}</TableHead>
                          <TableHead className="text-end">{isAr ? "المرتجعات" : "Returns"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data!.dailyBreakdown.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell>{new Date(row.date + "T12:00:00").toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}</TableCell>
                            <TableCell className="text-end">{row.orders}</TableCell>
                            <TableCell className="text-end font-medium text-emerald-600">{fmt(row.sales)}</TableCell>
                            <TableCell className="text-end text-rose-600">{fmt(row.returns)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">{isAr ? "أفضل المنتجات" : "Top Products"}</p>
                  {(data?.topProducts ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{isAr ? "لا توجد بيانات" : "No data"}</p>
                  ) : (
                    <div className="space-y-2">
                      {data!.topProducts.map((p, i) => (
                        <div key={p.sku + i} className="flex justify-between text-sm border-b pb-2 last:border-0">
                          <div>
                            <p className="font-medium truncate max-w-[180px]">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.qty} {isAr ? "قطعة" : "sold"}</p>
                          </div>
                          <span className="font-bold text-pink-600">{fmt(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">{isAr ? "أفضل الفئات" : "Top Categories"}</p>
                  {(data?.topCategories ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{isAr ? "لا توجد بيانات" : "No data"}</p>
                  ) : (
                    <div className="space-y-2">
                      {data!.topCategories.map((c) => (
                        <div key={c.name} className="flex justify-between text-sm border-b pb-2 last:border-0">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.qty} {isAr ? "قطعة" : "items"}</p>
                          </div>
                          <span className="font-bold text-purple-600">{fmt(c.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <ReportSection
              title={isAr ? "طلبات المبيعات" : "Sales Orders"}
              count={data?.orders?.length ?? 0}
              expanded={expandSection === "orders"}
              onToggle={() => toggle("orders")}
            >
              {(data?.orders ?? []).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.customerName || (isAr ? "زائر" : "Walk-in")} · {new Date(o.createdAt).toLocaleString(isAr ? "ar-IQ" : "en-GB")}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-emerald-600">{fmt(parseFloat(o.total))} IQD</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {isAr ? (PAYMENT_LABELS[o.paymentMethod || "cash"]?.ar) : (PAYMENT_LABELS[o.paymentMethod || "cash"]?.en)}
                    </Badge>
                  </div>
                </div>
              ))}
            </ReportSection>

            {(data?.refundedOrders?.length ?? 0) > 0 && (
              <ReportSection
                title={isAr ? "المرتجعات" : "Refunded Orders"}
                count={data?.refundedOrders?.length ?? 0}
                expanded={expandSection === "returns"}
                onToggle={() => toggle("returns")}
              >
                {data!.refundedOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString(isAr ? "ar-IQ" : "en-GB")}</p>
                    </div>
                    <p className="text-sm font-bold text-rose-600">{fmt(parseFloat(o.total))} IQD</p>
                  </div>
                ))}
              </ReportSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReportSection({
  title, count, expanded, onToggle, children,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-start"
        onClick={onToggle}
      >
        <span className="text-sm font-semibold">{title} ({count})</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && <CardContent className="pt-0 px-4 pb-4">{children}</CardContent>}
    </Card>
  );
}
