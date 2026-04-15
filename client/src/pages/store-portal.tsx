import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Gem,
  Lock,
  User,
  Loader2,
  Mail,
  ArrowLeft,
  Shield,
  ShoppingCart,
  Tag,
  Box,
  Star,
  Sparkles,
  Crown,
  Layers,
  Monitor,
  CheckCircle2,
  Wrench,
  CreditCard,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

type LoginForm = z.infer<typeof loginSchema>;

type TerminalPreview = {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string | null;
};

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart,
  Gem,
  Tag,
  Box,
  Star,
  Sparkles,
  Crown,
  Layers,
  Monitor,
};

function TerminalIcon({ iconName, size = 20 }: { iconName: string; size?: number }) {
  const Icon = ICON_MAP[iconName] ?? ShoppingCart;
  return <Icon style={{ width: size, height: size }} />;
}

const features = [
  { icon: Gem, label: "Inventory & Pricing", labelAr: "المخزون والأسعار" },
  { icon: Wrench, label: "Repair Orders", labelAr: "أوامر الإصلاح" },
  { icon: CreditCard, label: "Layaway & Installments", labelAr: "التقسيط والدفع المؤجل" },
  { icon: Users, label: "Customer Tracking", labelAr: "متابعة العملاء" },
];

export default function StorePortal() {
  const { t } = useLanguage();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [, navigate] = useLocation();
  const { loginMutation, verify2FAMutation, resend2FAMutation, pending2FA, clearPending2FA } = useAuth();
  const [verificationCode, setVerificationCode] = useState("");
  const [terminals, setTerminals] = useState<TerminalPreview[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | null>(null);
  const [loadingTerminals, setLoadingTerminals] = useState(false);
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const usernameValue = form.watch("username");

  useEffect(() => {
    if (fetchRef.current) clearTimeout(fetchRef.current);
    const trimmed = usernameValue.trim();
    if (!trimmed) {
      setTerminals([]);
      setSelectedTerminalId(null);
      return;
    }
    fetchRef.current = setTimeout(async () => {
      setLoadingTerminals(true);
      try {
        const res = await fetch(`/api/public/terminals?username=${encodeURIComponent(trimmed)}`);
        const data: TerminalPreview[] = await res.json();
        setTerminals(data);
        if (data.length === 1) {
          setSelectedTerminalId(data[0].id);
          sessionStorage.setItem("selectedTerminalId", String(data[0].id));
        }
      } catch {
        setTerminals([]);
      } finally {
        setLoadingTerminals(false);
      }
    }, 400);
    return () => { if (fetchRef.current) clearTimeout(fetchRef.current); };
  }, [usernameValue]);

  function selectTerminal(id: number) {
    setSelectedTerminalId(id);
    sessionStorage.setItem("selectedTerminalId", String(id));
  }

  function onSubmit(data: LoginForm) {
    loginMutation.mutate({ ...data, portal: "store" });
  }

  function onVerify() {
    if (verificationCode.length === 6) {
      verify2FAMutation.mutate(verificationCode);
    }
  }

  function onBack() {
    clearPending2FA();
    setVerificationCode("");
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "#0c0a09" }} dir={isAr ? "rtl" : "ltr"}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-10"
        style={{ background: "linear-gradient(135deg, #1c0a00 0%, #78350f 50%, #1c0a00 100%)" }}
      >
        {/* Glow blobs */}
        <div className="absolute top-1/4 start-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 end-1/4 w-64 h-64 bg-yellow-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-xl shadow-amber-900/40">
            <Gem className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white tracking-tight">JewelPOS</p>
            <p className="text-xs text-amber-300">{isAr ? "نظام إدارة المجوهرات" : "Jewelry Store Management"}</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
              {isAr ? (
                <>أدر محلك<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">باحترافية وسهولة</span></>
              ) : (
                <>Run your jewelry store<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">smarter & faster</span></>
              )}
            </h1>
            <p className="text-amber-200/70 text-base leading-relaxed max-w-sm">
              {isAr
                ? "منصة متكاملة لإدارة المخزون، الإصلاحات، التقسيط، المبيعات ومتابعة العملاء."
                : "An all-in-one platform for inventory, repairs, layaway, sales and customer tracking."}
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, labelAr }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <span className="text-sm text-amber-100/80">{isAr ? labelAr : label}</span>
              </div>
            ))}
          </div>

          {/* Terminal selection panel — desktop */}
          {(terminals.length > 0 || loadingTerminals || usernameValue.trim()) && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white mb-1">{t("pos.selectTerminal")}</p>
              <p className="text-xs text-amber-200/60 mb-4">{t("pos.selectTerminalHint")}</p>

              {loadingTerminals ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400/60" />
                </div>
              ) : terminals.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {terminals.map((terminal) => {
                    const isSelected = selectedTerminalId === terminal.id;
                    return (
                      <button
                        key={terminal.id}
                        type="button"
                        onClick={() => selectTerminal(terminal.id)}
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center cursor-pointer
                          ${isSelected
                            ? "border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-900/30 scale-[1.03]"
                            : "border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30"
                          }`}
                        data-testid={`button-terminal-${terminal.id}`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute top-2 end-2 h-3.5 w-3.5 text-amber-400" />
                        )}
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300">
                          <TerminalIcon iconName={terminal.icon} size={18} />
                        </div>
                        <span className="font-semibold text-xs leading-tight text-white">{terminal.name}</span>
                        {terminal.description && (
                          <span className="text-amber-200/50 text-xs leading-tight">{terminal.description}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-5 text-amber-200/40">
                  <Monitor className="h-8 w-8" />
                  <p className="text-xs text-center">{t("pos.noTerminals")}</p>
                </div>
              )}

              {selectedTerminalId && (
                <p className="mt-4 text-center text-xs text-amber-300 font-medium">
                  ✓ {terminals.find((t) => t.id === selectedTerminalId)?.name} {isAr ? "محدد" : "selected"}
                </p>
              )}
            </div>
          )}

          {!usernameValue.trim() && terminals.length === 0 && (
            <div className="flex items-center gap-2 text-amber-200/40">
              <Monitor className="h-4 w-4" />
              <p className="text-xs">{t("pos.enterUsernameForTerminals")}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="relative text-xs text-amber-900/60">{isAr ? "IQ-POS Platform · جميع الحقوق محفوظة" : "IQ-POS Platform · All rights reserved"}</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col" style={{ background: "#0c0a09" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
              <Gem className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">JewelPOS</span>
          </div>
          <div className="lg:hidden" />
          <div className="flex items-center gap-2 ms-auto">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm space-y-8">
            {!pending2FA ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-store-login-title">
                    {t("auth.storeLoginTitle")}
                  </h2>
                  <p className="text-stone-400 text-sm" data-testid="text-store-login-subtitle">
                    {t("auth.storeLoginSubtitle")}
                  </p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-300">{t("auth.username")}</label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                      <input
                        {...form.register("username")}
                        placeholder={t("auth.username")}
                        className="w-full bg-stone-900 border border-stone-700 text-white placeholder-stone-500 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        autoComplete="username"
                        data-testid="input-login-username"
                      />
                    </div>
                    {form.formState.errors.username && (
                      <p className="text-xs text-red-400">{isAr ? "مطلوب" : "Required"}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-300">{t("auth.password")}</label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                      <input
                        {...form.register("password")}
                        type="password"
                        placeholder={t("auth.password")}
                        className="w-full bg-stone-900 border border-stone-700 text-white placeholder-stone-500 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        autoComplete="current-password"
                        data-testid="input-login-password"
                      />
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-xs text-red-400">{isAr ? "مطلوب" : "Required"}</p>
                    )}
                  </div>

                  {/* Mobile terminal picker */}
                  {terminals.length > 0 && (
                    <div className="lg:hidden space-y-2">
                      <label className="text-sm font-medium text-stone-300">{t("pos.selectTerminal")}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {terminals.map((terminal) => {
                          const isSelected = selectedTerminalId === terminal.id;
                          return (
                            <button
                              key={terminal.id}
                              type="button"
                              onClick={() => selectTerminal(terminal.id)}
                              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center
                                ${isSelected
                                  ? "border-amber-500 bg-amber-500/10"
                                  : "border-stone-700 bg-stone-800 hover:border-stone-600"
                                }`}
                              data-testid={`button-terminal-mobile-${terminal.id}`}
                            >
                              {isSelected && <CheckCircle2 className="absolute top-1.5 end-1.5 h-3.5 w-3.5 text-amber-400" />}
                              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                                <TerminalIcon iconName={terminal.icon} size={15} />
                              </div>
                              <span className="text-xs font-medium text-white">{terminal.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Error from login */}
                  {loginMutation.isError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                      <p className="text-sm text-red-400">{isAr ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Invalid username or password."}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-amber-900/40 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {isAr ? "دخول إلى النظام" : "Sign In to JewelPOS"}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
                    >
                      {isAr ? "← العودة إلى الصفحة الرئيسية" : "← Back to landing page"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* 2FA panel */
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-2fa-title">
                    {t("auth.verifyTitle")}
                  </h2>
                  <p className="text-stone-400 text-sm" data-testid="text-2fa-subtitle">
                    {t("auth.verifySubtitle")}
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/25">
                    <Mail className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-stone-300" data-testid="text-2fa-email-sent">
                      {t("auth.codeSentTo")} <span className="font-medium text-white">{pending2FA.maskedEmail}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={(value) => setVerificationCode(value)}
                      data-testid="input-verification-code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <p className="text-xs text-stone-500">{t("auth.codeExpiry")}</p>
                  </div>

                  <button
                    onClick={onVerify}
                    disabled={verificationCode.length !== 6 || verify2FAMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    data-testid="button-verify-code"
                  >
                    {verify2FAMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        {t("auth.verifyButton")}
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={onBack}
                      className="text-sm text-stone-500 hover:text-stone-400 transition-colors flex items-center gap-1"
                      data-testid="button-back-to-login"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      {t("auth.backToLogin")}
                    </button>
                    <button
                      type="button"
                      onClick={() => resend2FAMutation.mutate()}
                      disabled={resend2FAMutation.isPending}
                      className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
                      data-testid="button-resend-code"
                    >
                      {resend2FAMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        t("auth.resendCode")
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
