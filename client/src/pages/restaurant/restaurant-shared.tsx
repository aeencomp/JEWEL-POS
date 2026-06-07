import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const RESTO_ACCENT = "#ea580c";

export function RestoPageHeader({
  title,
  subtitle,
  isAr,
  action,
}: {
  title: string;
  subtitle?: string;
  isAr?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function RestoStatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "orange",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: "orange" | "emerald" | "blue" | "violet" | "rose";
}) {
  const accents = {
    orange: "bg-orange-500/10 text-orange-600 border-orange-200/60",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-200/60",
    blue: "bg-blue-500/10 text-blue-600 border-blue-200/60",
    violet: "bg-violet-500/10 text-violet-600 border-violet-200/60",
    rose: "bg-rose-500/10 text-rose-600 border-rose-200/60",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl border flex items-center justify-center shrink-0", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, { en: string; ar: string; className: string }> = {
  pending: { en: "New", ar: "جديد", className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
  accepted: { en: "Accepted", ar: "مقبول", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  preparing: { en: "Preparing", ar: "تحضير", className: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300" },
  ready: { en: "Ready", ar: "جاهز", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  served: { en: "Served", ar: "مقدّم", className: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
  completed: { en: "Done", ar: "مكتمل", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  cancelled: { en: "Cancelled", ar: "ملغي", className: "bg-slate-100 text-slate-500" },
};

export function OrderStatusBadge({ status, isAr }: { status: string; isAr?: boolean }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", s.className)}>
      {isAr ? s.ar : s.en}
    </span>
  );
}

export function ElapsedTimer({ since, isAr }: { since: string; isAr?: boolean }) {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    const tick = () => setMins(Math.floor((Date.now() - new Date(since).getTime()) / 60000));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [since]);
  const urgent = mins >= 15;
  return (
    <span className={cn("text-xs font-medium tabular-nums", urgent ? "text-red-600" : "text-muted-foreground")}>
      {mins < 1 ? (isAr ? "الآن" : "Just now") : `${mins}${isAr ? " د" : "m"}`}
    </span>
  );
}

export const ORDER_TYPES = [
  { id: "dine_in", en: "Dine-in", ar: "داخل المطعم" },
  { id: "pickup", en: "Takeaway", ar: "استلام" },
  { id: "delivery", en: "Delivery", ar: "توصيل" },
] as const;
