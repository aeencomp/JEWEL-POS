import { useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  publishableKey: string;
  clientSecret: string;
  isAr: boolean;
  onBack: () => void;
  onHostedFallback: () => void;
  hostedFallbackPending?: boolean;
};

export function SignupEmbeddedCheckout({
  publishableKey,
  clientSecret,
  isAr,
  onBack,
  onHostedFallback,
  hostedFallbackPending,
}: Props) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-foreground">
            {isAr ? "تحقق من البنك (3D Secure)" : "Bank verification (3D Secure)"}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {isAr
              ? "بعد الضغط على Subscribe، قد يطلب البنك رمز SMS أو موافقة من التطبيق. أكمل هذه الخطوة — إذا لم تظهر، جرّب Chrome على الكمبيوتر مع تعطيل مانع الإعلانات."
              : "After you subscribe, your bank may ask for an SMS code or app approval. Complete that step. If nothing appears, try Chrome on desktop with ad blockers disabled."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 me-1.5" />
          {isAr ? "رجوع للنموذج" : "Back to form"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onHostedFallback}
          disabled={hostedFallbackPending}
        >
          <ExternalLink className="h-4 w-4 me-1.5" />
          {hostedFallbackPending
            ? isAr
              ? "جاري الفتح..."
              : "Opening..."
            : isAr
              ? "فتح صفحة Stripe بدلاً من ذلك"
              : "Open Stripe page instead"}
        </Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden min-h-[520px]">
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
