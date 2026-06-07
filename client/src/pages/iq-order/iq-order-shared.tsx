import { cn } from "@/lib/utils";
import { UtensilsCrossed } from "lucide-react";

export const IQ_ORDER_BRAND = {
  gradient: "linear-gradient(135deg, #fbbf24 0%, #b45309 100%)",
  color: "#b45309",
};

export function IqOrderLogo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center shadow-md shrink-0"
      style={{ width: size, height: size, background: IQ_ORDER_BRAND.gradient }}
    >
      <UtensilsCrossed className="text-white" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}

export function IqOrderShell({
  children,
  isAr,
  title,
  subtitle,
  back,
}: {
  children: React.ReactNode;
  isAr?: boolean;
  title?: string;
  subtitle?: string;
  back?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background" dir={isAr ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {back}
          <IqOrderLogo size={40} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">{title ?? (isAr ? "طلب IQ" : "IQ Order")}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {subtitle ?? (isAr ? "توصيل طعام — من IQ-POS" : "Food delivery — powered by IQ-POS")}
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto">{children}</main>
    </div>
  );
}

export function RestaurantCard({
  store,
  isAr,
  onClick,
}: {
  store: {
    id: number;
    name: string;
    address: string | null;
    brandColor: string | null;
    logoUrl: string | null;
    menuCount: number;
    deliveryFee: number;
    estMinutes: number;
    minOrder: number;
  };
  isAr?: boolean;
  onClick: () => void;
}) {
  const color = store.brandColor || IQ_ORDER_BRAND.color;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border bg-card p-4 text-start hover:shadow-md hover:border-orange-300 transition-all flex gap-3"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}, #9a3412)` }}
      >
        {store.logoUrl ? (
          <img src={store.logoUrl} alt="" className="w-12 h-12 object-contain rounded-xl" />
        ) : (
          <UtensilsCrossed className="h-7 w-7 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-base truncate">{store.name}</p>
        {store.address && <p className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
            {store.estMinutes} {isAr ? "دقيقة" : "min"}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {store.deliveryFee.toLocaleString()} {isAr ? "د.ع توصيل" : "IQD delivery"}
          </span>
        </div>
      </div>
    </button>
  );
}

export function TrackingTimeline({
  steps,
  isAr,
  isCancelled,
}: {
  steps: { key: string; en: string; ar: string; done: boolean }[];
  isAr?: boolean;
  isCancelled?: boolean;
}) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const done = step.done && !isCancelled;
        const active = done && (i === steps.length - 1 || !steps[i + 1]?.done);
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                isCancelled ? "border-muted bg-muted text-muted-foreground" :
                done ? "border-emerald-500 bg-emerald-500 text-white" :
                "border-border bg-background text-muted-foreground",
                active && !isCancelled && "ring-2 ring-emerald-300",
              )}>
                {done ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn("w-0.5 flex-1 min-h-[2rem]", done && !isCancelled ? "bg-emerald-400" : "bg-border")} />
              )}
            </div>
            <div className="pb-6 pt-1">
              <p className={cn("text-sm font-semibold", done && !isCancelled ? "text-foreground" : "text-muted-foreground")}>
                {isAr ? step.ar : step.en}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
