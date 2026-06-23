import { ShieldCheck } from "lucide-react";

export type LandingStripePrice = {
  amount: number;
  currency: string;
  interval: string;
  enabled?: boolean;
};

export type LandingPricing = {
  monthly: number;
  stripe?: LandingStripePrice | null;
};

export function fmtIqd(n: number) {
  return n.toLocaleString("en-US");
}

export function fmtStripeMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: currency.toLowerCase() === "iqd" ? 0 : 2,
      maximumFractionDigits: currency.toLowerCase() === "iqd" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency.toUpperCase()}`;
  }
}

function intervalLabel(interval: string, isAr: boolean) {
  if (interval === "year") return isAr ? "سنة" : "yr";
  if (interval === "week") return isAr ? "أسبوع" : "wk";
  return isAr ? "شهر" : "mo";
}

export function PoweredByStripe({ isAr, variant = "light" }: { isAr: boolean; variant?: "light" | "dark" | "muted" }) {
  const shell =
    variant === "dark"
      ? "bg-white/10 border-white/20 text-white"
      : variant === "muted"
        ? "bg-muted/60 border-border text-muted-foreground"
        : "bg-[#635BFF]/5 border-[#635BFF]/20 text-foreground";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-wide ${shell}`}
      data-testid="powered-by-stripe"
    >
      <ShieldCheck className="h-3.5 w-3.5 text-[#635BFF] shrink-0" />
      <span className="opacity-80">{isAr ? "مدفوعات آمنة عبر" : "Secure payments by"}</span>
      <StripeWordmark className="h-3.5 w-auto" />
    </div>
  );
}

function StripeWordmark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 25" fill="none" aria-label="Stripe" role="img">
      <path
        fill="#635BFF"
        d="M59.64 13.04c0-4.07-1.98-7.3-5.76-7.3-3.82 0-6.1 3.23-6.1 7.26 0 4.78 2.7 7.22 6.63 7.22 1.92 0 3.36-.44 4.44-1.05v-3.2c-1.08.54-2.32.87-3.9.87-1.55 0-2.93-.54-3.1-2.38h7.65c.02-.2.04-.98.04-1.42Zm-7.72-1.52c0-1.78 1.09-2.53 2.96-2.53 1.84 0 2.83.75 2.83 2.53h-5.79ZM40.95 5.74c-1.55 0-2.55.73-3.12 1.24l-.21-1.01H33.5v18.46h3.87V12.8c.72-.53 1.84-1.03 3.08-1.03 1.55 0 1.98.97 1.98 2.52v10.28h3.87V13.9c0-3.28-1.76-5.16-4.45-5.16ZM25.97 5.74c-4.32 0-7.16 2.47-7.16 6.65 0 4.34 2.97 6.88 7.72 6.88 2.26 0 3.95-.5 5.22-1.2v-3.05c-1.27.64-2.72 1.03-4.55 1.03-1.8 0-3.4-.64-3.6-2.72h9.07c0-.24.04-1.2.04-1.95 0-4.05-2.3-6.64-6.74-6.64Zm-.07 2.4c1.84 0 2.76 1.12 2.9 2.97h-6.02c.28-1.68 1.35-2.97 3.12-2.97ZM13.05 5.74c-1.08 0-1.88.2-2.52.47V2.35L6.66 3.28v16.92h3.87V12.4c.5-.36 1.28-.68 2.32-.68 2.34 0 3.05 1.46 3.05 3.57v7.91h3.87V11.9c0-3.45-1.98-6.16-5.72-6.16ZM0 9.18h3.87V24.2H0V9.18Z"
      />
    </svg>
  );
}

export function DualPriceDisplay({
  pricing,
  isAr,
  variant = "hero",
}: {
  pricing: LandingPricing;
  isAr: boolean;
  variant?: "hero" | "compact" | "inline";
}) {
  const stripe = pricing.stripe;
  const iqdSuffix = isAr ? "د.ع / شهر" : "IQD / mo";
  const cardNote = isAr ? "الدفع بالبطاقة" : "Card payment";

  if (variant === "hero") {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-amber-100/60 font-semibold">
            {isAr ? "العرض المحلي" : "Local reference"}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-none" data-testid="price-monthly-iqd">
              {fmtIqd(pricing.monthly)}
            </span>
            <span className="text-lg text-amber-100/80 font-medium">{iqdSuffix}</span>
          </div>
        </div>

        {stripe && (
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-4 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">
              {cardNote} · {isAr ? "Stripe" : "Stripe checkout"}
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="price-monthly-usd">
                {fmtStripeMoney(stripe.amount, stripe.currency)}
              </span>
              <span className="text-sm text-amber-100/75 font-medium">
                / {intervalLabel(stripe.interval, isAr)}
              </span>
            </div>
            <p className="text-xs text-amber-100/60 leading-relaxed">
              {isAr
                ? "يُخصم بالعملة المعروضة عند الدفع بالبطاقة — تجديد تلقائي شهري"
                : "Billed in this currency when paying by card — auto-renews monthly"}
            </p>
          </div>
        )}

        {stripe && <PoweredByStripe isAr={isAr} variant="dark" />}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="space-y-1">
        <p className="text-2xl font-extrabold text-foreground" data-testid="price-compact-iqd">
          {fmtIqd(pricing.monthly)}{" "}
          <span className="text-sm font-medium text-muted-foreground">{isAr ? "د.ع" : "IQD"}</span>
        </p>
        {stripe && (
          <p className="text-sm font-semibold text-[#635BFF]" data-testid="price-compact-usd">
            {fmtStripeMoney(stripe.amount, stripe.currency)} / {intervalLabel(stripe.interval, isAr)}{" "}
            <span className="text-xs font-normal text-muted-foreground">({cardNote})</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span>
        {fmtIqd(pricing.monthly)} {isAr ? "د.ع" : "IQD"}
        {stripe && (
          <span className="text-muted-foreground">
            {" "}
            · {fmtStripeMoney(stripe.amount, stripe.currency)} {cardNote}
          </span>
        )}
      </span>
    </span>
  );
}
