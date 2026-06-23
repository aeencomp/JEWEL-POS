import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Loader2, Save, Tag, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

type Pricing = { monthly: number };

type StripeAdminConfig = {
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  publishableKey: string | null;
  priceId: string | null;
  priceLabel: string | null;
  enabled: boolean;
  webhookUrl: string;
};

const DEFAULT: Pricing = { monthly: 45000 };

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default function AdminPricing() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data: pricing, isLoading } = useQuery<Pricing>({
    queryKey: ["/api/pricing"],
    staleTime: 0,
  });

  const { data: stripeConfig, isLoading: loadingStripe } = useQuery<StripeAdminConfig>({
    queryKey: ["/api/admin/stripe"],
  });

  const [draft, setDraft] = useState<Pricing>(DEFAULT);
  const [priceId, setPriceId] = useState("");

  useEffect(() => {
    if (pricing) setDraft({ monthly: pricing.monthly ?? DEFAULT.monthly });
  }, [pricing]);

  useEffect(() => {
    if (stripeConfig?.priceId) setPriceId(stripeConfig.priceId);
  }, [stripeConfig?.priceId]);

  const saveMutation = useMutation({
    mutationFn: async (data: Pricing) => {
      const res = await apiRequest("PATCH", "/api/admin/pricing", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/pricing"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({ title: isAr ? "تم حفظ الأسعار بنجاح" : "Pricing saved successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: isAr ? "فشل الحفظ" : "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveStripeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", "/api/admin/stripe", { priceId: id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stripe"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/config"] });
      toast({ title: isAr ? "تم ربط Stripe بنجاح" : "Stripe connected successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: isAr ? "فشل ربط Stripe" : "Stripe setup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || loadingStripe) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stripeReady = stripeConfig?.enabled === true;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">
              {isAr ? "إعدادات الأسعار" : "Pricing Settings"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAr ? "أسعار العرض وربط Stripe للدفع" : "Display pricing and Stripe payment setup"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate(draft)}
          disabled={saveMutation.isPending}
          data-testid="button-save-pricing"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Save className="h-4 w-4 me-2" />
          )}
          {isAr ? "حفظ الأسعار" : "Save Prices"}
        </Button>
      </div>

      <Card className="border-violet-200 dark:border-violet-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-violet-600" />
              <CardTitle className="text-base">{isAr ? "ربط Stripe" : "Stripe Integration"}</CardTitle>
            </div>
            <Badge variant={stripeReady ? "default" : "secondary"} className={stripeReady ? "bg-emerald-600" : ""}>
              {stripeReady ? (
                <>
                  <CheckCircle2 className="h-3 w-3 me-1" />
                  {isAr ? "جاهز للدفع" : "Ready"}
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 me-1" />
                  {isAr ? "غير مكتمل" : "Not configured"}
                </>
              )}
            </Badge>
          </div>
          <CardDescription>
            {isAr
              ? "الصق معرّف السعر (Price ID) من لوحة Stripe — يبدأ بـ price_"
              : "Paste the Price ID from your Stripe product — it starts with price_"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripe-price-id">{isAr ? "معرّف السعر (Price ID)" : "Stripe Price ID"}</Label>
            <Input
              id="stripe-price-id"
              data-testid="input-stripe-price-id"
              value={priceId}
              onChange={(e) => setPriceId(e.target.value.trim())}
              placeholder="price_1ABC..."
              className="font-mono text-sm"
            />
            {stripeConfig?.priceLabel && (
              <p className="text-xs text-muted-foreground">
                {isAr ? "السعر في Stripe:" : "Stripe price:"}{" "}
                <span className="font-semibold text-foreground">{stripeConfig.priceLabel}</span>
              </p>
            )}
          </div>

          <Button
            onClick={() => saveStripeMutation.mutate(priceId)}
            disabled={saveStripeMutation.isPending || !priceId.startsWith("price_")}
            className="bg-violet-600 hover:bg-violet-700"
            data-testid="button-save-stripe"
          >
            {saveStripeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <CreditCard className="h-4 w-4 me-2" />
            )}
            {isAr ? "حفظ وربط Stripe" : "Save & Connect Stripe"}
          </Button>

          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-2 text-muted-foreground">
            <p className="font-semibold text-foreground">{isAr ? "خطوات الإعداد:" : "Setup checklist:"}</p>
            <ul className="list-disc ps-4 space-y-1">
              <li className={stripeConfig?.hasSecretKey ? "text-emerald-600" : ""}>
                {isAr ? "STRIPE_SECRET_KEY في ملف .env" : "STRIPE_SECRET_KEY in .env file"}
                {stripeConfig?.hasSecretKey ? " ✓" : ""}
              </li>
              <li className={priceId.startsWith("price_") ? "text-emerald-600" : ""}>
                {isAr ? "Price ID من Stripe → أعلاه" : "Price ID from Stripe → above"}
              </li>
              <li className={stripeConfig?.hasWebhookSecret ? "text-emerald-600" : ""}>
                {isAr ? "Webhook في Stripe → " : "Stripe webhook → "}
                <code className="text-[10px] break-all">{stripeConfig?.webhookUrl}</code>
                {stripeConfig?.hasWebhookSecret ? " ✓" : ""}
              </li>
            </ul>
            <p>
              {isAr
                ? "أحداث Webhook: checkout.session.completed, invoice.paid, customer.subscription.updated, customer.subscription.deleted"
                : "Webhook events: checkout.session.completed, invoice.paid, customer.subscription.updated, customer.subscription.deleted"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isAr ? "الاشتراك الشهري القياسي (عرض)" : "Standard Monthly Subscription (display)"}
          </CardTitle>
          <CardDescription>
            {isAr
              ? "يُعرض على الصفحة الرئيسية بالدينار — الدفع الفعلي عبر Stripe"
              : "Shown on landing page in IQD — actual payment goes through Stripe"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="monthly-price" className="text-sm font-semibold">
              {isAr ? "السعر الشهري" : "Monthly Price"}
            </Label>
            <div className="relative">
              <Input
                id="monthly-price"
                data-testid="input-price-monthly"
                type="number"
                value={draft.monthly}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/,/g, ""), 10);
                  if (!isNaN(val)) setDraft({ monthly: val });
                }}
                className="pe-16"
                min={0}
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {isAr ? "د.ع/شهر" : "IQD/mo"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? "العرض:" : "Preview:"}{" "}
              <span className="font-mono font-semibold">{fmt(draft.monthly)}</span>{" "}
              {isAr ? "د.ع / شهر" : "IQD / month"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
