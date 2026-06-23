import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  UserPlus,
  Send,
  User,
  Building2,
  Phone,
  Mail,
  Loader2,
  CreditCard,
  CheckCircle,
  Shield,
  KeyRound,
  LogIn,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DualPriceDisplay,
  PoweredByStripe,
  type LandingPricing,
  fmtIqd,
  fmtStripeMoney,
} from "@/components/landing-stripe-pricing";
import {
  SIGNUP_POS_OPTIONS,
  parseSignupPosSystem,
  validateSignupForm,
  type SignupForm,
} from "@/lib/signup-shared";
import { SignupEmbeddedCheckout } from "@/components/signup-embedded-checkout";

function IqPosLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#iqpos-grad-signup)" />
      <rect x="7" y="8" width="15" height="11" rx="2.5" fill="white" fillOpacity="0.95" />
      <rect x="25" y="8" width="8" height="11" rx="2.5" fill="white" fillOpacity="0.55" />
      <rect x="7" y="22" width="26" height="10" rx="2.5" fill="white" fillOpacity="0.85" />
      <rect x="10" y="25" width="6" height="2" rx="1" fill="#d97706" fillOpacity="0.6" />
      <rect x="18" y="25" width="4" height="2" rx="1" fill="#d97706" fillOpacity="0.6" />
      <rect x="24" y="25" width="6" height="2" rx="1" fill="#d97706" fillOpacity="0.6" />
      <defs>
        <linearGradient id="iqpos-grad-signup" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const DEFAULT_PRICING: LandingPricing = { monthly: 45000, stripe: null };

type SignupProvision = {
  storeId: number;
  username: string;
  tempPassword: string | null;
  loginPath: string;
  emailSent: boolean;
  alreadyProvisioned: boolean;
};

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const { data: pricing = DEFAULT_PRICING } = useQuery<LandingPricing>({
    queryKey: ["/api/pricing"],
    staleTime: 5 * 60 * 1000,
  });

  const stripeEnabled = !!pricing.stripe?.enabled;

  const { data: stripeConfig } = useQuery<{ enabled: boolean; publishableKey: string | null }>({
    queryKey: ["/api/stripe/config"],
    enabled: stripeEnabled,
  });

  const [submitted, setSubmitted] = useState(false);
  const [provision, setProvision] = useState<SignupProvision | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [form, setForm] = useState<SignupForm>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      name: "",
      businessName: "",
      phone: "",
      email: "",
      posSystem: parseSignupPosSystem(params.get("pos")),
      notes: "",
    };
  });
  const [errors, setErrors] = useState<Partial<SignupForm>>({});

  useEffect(() => {
    document.documentElement.classList.add("landing-scroll");
    return () => document.documentElement.classList.remove("landing-scroll");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const signup = params.get("signup");
    const sessionId = params.get("session_id");

    function cleanSignupParams() {
      params.delete("signup");
      params.delete("session_id");
      const pos = params.get("pos");
      const clean = params.toString();
      window.history.replaceState({}, "", clean ? `/signup?${clean}` : pos ? `/signup?pos=${pos}` : "/signup");
    }

    if (signup === "cancelled") {
      toast({
        title: isAr ? "تم إلغاء الدفع" : "Payment cancelled",
        description: isAr ? "يمكنك المحاولة مرة أخرى في أي وقت." : "You can try again anytime.",
      });
      cleanSignupParams();
      return;
    }

    if (signup !== "success" || !sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stripe/signup-session/${encodeURIComponent(sessionId)}`);
        const data = (await res.json()) as {
          paid?: boolean;
          provision?: SignupProvision | null;
        };
        if (cancelled) return;

        if (data.paid) {
          setSubmitted(true);
          if (data.provision) setProvision(data.provision);
          toast({
            title: isAr ? "تم الدفع بنجاح" : "Payment successful",
            description: data.provision
              ? isAr
                ? "تم إنشاء متجرك وتفعيل الاشتراك. استخدم بيانات الدخول أدناه."
                : "Your store is ready and your subscription is active. Use the login details below."
              : isAr
                ? "تم الدفع. جاري تجهيز حسابك..."
                : "Payment received. Setting up your account...",
          });
        } else {
          toast({
            title: isAr ? "الدفع قيد المعالجة" : "Payment pending",
            description: isAr
              ? "إذا تم خصم المبلغ، سنتواصل معك قريباً. وإلا حاول مرة أخرى ببطاقة فيزا أو ماستركارد دولية."
              : "If you were charged, we will contact you soon. Otherwise retry with an international Visa or Mastercard.",
            variant: "destructive",
          });
        }
      } catch {
        if (!cancelled) {
          toast({
            title: isAr ? "تعذّر التحقق من الدفع" : "Could not verify payment",
            description: isAr
              ? "إذا تم الدفع، تواصل معنا — وإلا حاول مرة أخرى."
              : "If payment went through, contact us — otherwise please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) cleanSignupParams();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAr, toast]);

  const mutation = useMutation({
    mutationFn: (data: SignupForm) => apiRequest("POST", "/api/signup-requests", data),
    onSuccess: () => setSubmitted(true),
    onError: () => {
      toast({
        title: isAr ? "حدث خطأ" : "Something went wrong",
        description: isAr ? "يرجى المحاولة مرة أخرى" : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const stripeCheckoutMutation = useMutation({
    mutationFn: async (data: SignupForm & { checkoutMode?: "embedded" | "hosted" }) => {
      const { checkoutMode, ...formData } = data;
      const res = await apiRequest("POST", "/api/stripe/signup-checkout", {
        ...formData,
        checkoutMode: checkoutMode ?? "embedded",
      });
      const json = (await res.json()) as {
        clientSecret?: string | null;
        url?: string | null;
        mode?: string;
      };
      if (checkoutMode === "hosted") {
        if (!json.url) throw new Error("No checkout URL");
        window.location.href = json.url;
        return json;
      }
      if (!json.clientSecret) throw new Error("No checkout client secret");
      return json;
    },
    onSuccess: (json, variables) => {
      if (variables.checkoutMode === "hosted") return;
      if (json.clientSecret) setCheckoutClientSecret(json.clientSecret);
    },
    onError: () => {
      toast({
        title: isAr ? "فشل الدفع" : "Checkout failed",
        description: isAr ? "يرجى المحاولة مرة أخرى" : "Please try again.",
        variant: "destructive",
      });
    },
  });

  function validate(): boolean {
    const e = validateSignupForm(form, isAr);
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleStripeCheckout() {
    if (!validate()) return;
    if (!stripeConfig?.publishableKey) {
      toast({
        title: isAr ? "Stripe غير مهيأ" : "Stripe not configured",
        description: isAr ? "مفتاح Stripe Publishable مفقود على الخادم." : "STRIPE_PUBLISHABLE_KEY is missing on the server.",
        variant: "destructive",
      });
      return;
    }
    stripeCheckoutMutation.mutate({ ...form, checkoutMode: "embedded" });
  }

  function handleHostedFallback() {
    stripeCheckoutMutation.mutate({ ...form, checkoutMode: "hosted" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  if (submitted) {
    const paidWithStore = !!provision?.storeId;
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={isAr ? "rtl" : "ltr"}>
        <header className="border-b bg-background/90 backdrop-blur-lg">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              {isAr ? "العودة للرئيسية" : "Back to home"}
            </Link>
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto ring-4 ring-green-500/10">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {paidWithStore
                  ? isAr
                    ? "متجرك جاهز!"
                    : "Your Store Is Ready!"
                  : isAr
                    ? "تم إرسال طلبك!"
                    : "Request Sent!"}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {paidWithStore
                  ? isAr
                    ? "تم إنشاء متجرك وتفعيل الاشتراك. يمكنك تسجيل الدخول الآن."
                    : "Your store has been created and your subscription is active. You can log in now."
                  : isAr
                    ? "شكراً لك. سيتواصل معك فريقنا قريباً عبر الهاتف أو البريد الإلكتروني لتفعيل حسابك."
                    : "Thank you! Our team will contact you soon via phone or email to activate your account."}
              </p>
            </div>

            {paidWithStore && provision && (
              <div className="rounded-2xl border bg-card text-start p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  {isAr ? "بيانات الدخول" : "Login credentials"}
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">{isAr ? "اسم المستخدم:" : "Username:"}</span>{" "}
                    <span className="font-mono font-semibold" dir="ltr">{provision.username}</span>
                  </p>
                  {provision.tempPassword && !provision.emailSent && (
                    <p>
                      <span className="text-muted-foreground">{isAr ? "كلمة المرور:" : "Password:"}</span>{" "}
                      <span className="font-mono font-semibold" dir="ltr">{provision.tempPassword}</span>
                    </p>
                  )}
                  {provision.emailSent ? (
                    <p className="text-muted-foreground text-xs">
                      {isAr
                        ? "أرسلنا اسم المستخدم وكلمة المرور إلى بريدك الإلكتروني."
                        : "We emailed your username and password to your inbox."}
                    </p>
                  ) : (
                    <p className="text-amber-700 dark:text-amber-400 text-xs">
                      {isAr
                        ? "احفظ بيانات الدخول أدناه — لم نتمكن من إرسالها بالبريد."
                        : "Save the login details below — we could not email them."}
                    </p>
                  )}
                </div>
                <Link href={provision.loginPath}>
                  <Button className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
                    <LogIn className="h-4 w-4 me-2" />
                    {isAr ? "تسجيل الدخول إلى المتجر" : "Log in to your store"}
                  </Button>
                </Link>
              </div>
            )}

            <Button variant="outline" className="rounded-xl" onClick={() => navigate("/")}>
              {isAr ? "العودة للرئيسية" : "Back to Home"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-lg shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <IqPosLogo size={34} />
            <span className="font-bold text-lg tracking-tight">IQ-POS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex">
                <ArrowLeft className="h-4 w-4 me-1.5" />
                {isAr ? "الرئيسية" : "Home"}
              </Button>
            </Link>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {checkoutClientSecret && stripeConfig?.publishableKey ? (
            <div className="max-w-3xl mx-auto">
              <SignupEmbeddedCheckout
                publishableKey={stripeConfig.publishableKey}
                clientSecret={checkoutClientSecret}
                isAr={isAr}
                onBack={() => setCheckoutClientSecret(null)}
                onHostedFallback={handleHostedFallback}
                hostedFallbackPending={stripeCheckoutMutation.isPending}
              />
            </div>
          ) : (
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-10 items-start">
            {/* Form column */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-6 py-6 sm:py-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <UserPlus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight">
                        {isAr ? "طلب الاشتراك في IQ-POS" : "Request Access to IQ-POS"}
                      </h1>
                      <p className="text-amber-100/90 text-sm sm:text-base mt-1.5 leading-relaxed">
                        {isAr
                          ? "أرسل طلبك وسيتواصل معك فريقنا في أقرب وقت."
                          : "Submit your request and our team will get back to you shortly."}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {isAr ? "اختر نظام نقطة البيع" : "Choose POS System"}
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {SIGNUP_POS_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = form.posSystem === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, posSystem: opt.id }))}
                            data-testid={`pos-select-${opt.id}`}
                            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                              isSelected
                                ? `${opt.activeBorder} ${opt.activeBg} shadow-md ring-2 ring-offset-2 ring-offset-background ${opt.ring}`
                                : `border-border bg-background ${opt.hoverBorder} hover:shadow-sm`
                            }`}
                          >
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center shadow-sm`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xs sm:text-sm font-bold leading-tight text-center">{opt.label}</span>
                            <span className="text-[11px] text-muted-foreground">{isAr ? opt.subAr : opt.subEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="req-name" className="text-sm font-medium">
                        {isAr ? "الاسم الكامل" : "Full Name"} <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="req-name"
                          data-testid="input-signup-name"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder={isAr ? "محمد علي" : "John Smith"}
                          className={`h-11 ps-10 rounded-xl ${errors.name ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="req-business" className="text-sm font-medium">
                        {isAr ? "اسم المحل / الشركة" : "Business Name"} <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="req-business"
                          data-testid="input-signup-business"
                          value={form.businessName}
                          onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                          placeholder={isAr ? "مجوهرات النور" : "Golden Jewelers"}
                          className={`h-11 ps-10 rounded-xl ${errors.businessName ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="req-phone" className="text-sm font-medium">
                        {isAr ? "رقم الهاتف" : "Phone Number"} <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="req-phone"
                          data-testid="input-signup-phone"
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="+964 7xx xxx xxxx"
                          dir="ltr"
                          className={`h-11 ps-10 rounded-xl ${errors.phone ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="req-email" className="text-sm font-medium">
                        {isAr ? "البريد الإلكتروني" : "Email Address"} <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="req-email"
                          data-testid="input-signup-email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="you@example.com"
                          dir="ltr"
                          className={`h-11 ps-10 rounded-xl ${errors.email ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="req-notes" className="text-sm font-medium">
                      {isAr ? "ملاحظات" : "Additional Notes"}{" "}
                      <span className="text-muted-foreground font-normal">({isAr ? "اختياري" : "optional"})</span>
                    </Label>
                    <Textarea
                      id="req-notes"
                      data-testid="input-signup-notes"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder={isAr ? "أي تفاصيل إضافية..." : "Any additional details..."}
                      rows={4}
                      className="rounded-xl resize-none min-h-[6rem]"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    {stripeEnabled && pricing.stripe && (
                      <>
                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                          {isAr
                            ? "قد يطلب البنك تحقق 3D Secure (رمز SMS أو موافقة بالتطبيق). استخدم Chrome على الكمبيوتر وتأكد أن مانع النوافذ المنبثقة معطّل."
                            : "Your bank may require 3D Secure (SMS code or app approval). Use Chrome on desktop and allow pop-ups if prompted."}
                        </div>
                        <Button
                          type="button"
                          size="lg"
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#635BFF] to-indigo-600 hover:from-[#5851ea] hover:to-indigo-700 text-white font-semibold shadow-sm"
                          disabled={stripeCheckoutMutation.isPending}
                          onClick={handleStripeCheckout}
                          data-testid="button-stripe-signup"
                        >
                          {stripeCheckoutMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 me-2 animate-spin" />
                              {isAr ? "جاري تحميل الدفع..." : "Loading checkout..."}
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 me-2" />
                              {isAr ? "اشترك وادفع بالبطاقة" : "Subscribe & Pay with Card"}
                            </>
                          )}
                        </Button>
                        <div className="flex justify-center">
                          <PoweredByStripe isAr={isAr} variant="muted" />
                        </div>
                      </>
                    )}
                    <Button
                      type="submit"
                      size="lg"
                      variant={stripeEnabled ? "outline" : "default"}
                      className={`w-full h-12 rounded-xl font-semibold text-sm ${
                        stripeEnabled
                          ? "border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/20 border-0"
                      }`}
                      disabled={mutation.isPending}
                      data-testid="button-signup-submit"
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                          {isAr ? "جاري الإرسال..." : "Sending..."}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 me-2" />
                          {isAr ? "إرسال الطلب" : "Send Request"}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Pricing sidebar */}
            <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-24">
              <div className="rounded-2xl border bg-card shadow-md overflow-hidden">
                <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-6 sm:p-8">
                  <p className="text-[11px] uppercase tracking-widest text-amber-100/70 font-semibold mb-4">
                    {isAr ? "الخطة القياسية" : "Standard Plan"}
                  </p>
                  <DualPriceDisplay pricing={pricing} isAr={isAr} variant="hero" />
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isAr
                      ? "سعر موحّد لجميع أنظمة نقاط البيع — JewelPOS و FashionPOS و FactoryPOS و RestoPOS و PharmaPOS و GroceryPOS."
                      : "One flat price for every POS — JewelPOS, FashionPOS, FactoryPOS, RestoPOS, PharmaPOS, and GroceryPOS."}
                  </p>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    {(isAr
                      ? ["استضافة سحابية", "دعم فني مخصص", "تحديثات مجانية", "ثنائي اللغة EN/AR"]
                      : ["Cloud hosting", "Dedicated support", "Free updates", "Bilingual EN/AR"]
                    ).map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {stripeEnabled && pricing.stripe && (
                    <div className="rounded-xl bg-muted/50 border px-4 py-3 text-sm">
                      <p className="font-medium text-foreground mb-1">{isAr ? "الأسعار" : "Pricing"}</p>
                      <p className="text-muted-foreground">
                        {fmtIqd(pricing.monthly)} {isAr ? "د.ع / شهر" : "IQD / mo"}
                        {" · "}
                        <span className="text-[#635BFF] font-semibold">
                          {fmtStripeMoney(pricing.stripe.amount, pricing.stripe.currency)} {isAr ? "بالبطاقة" : "by card"}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
