import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoLoginHint } from "@/components/demo-login-hint";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Shirt, User, Lock, Loader2, ArrowRight, ArrowLeft, Tag, RotateCcw, Heart, Barcode,
  Mail, Shield,
} from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Tag, label: "Size & Color Variants", labelAr: "متغيرات المقاس واللون" },
  { icon: RotateCcw, label: "Returns & Exchanges", labelAr: "المرتجعات والاستبدال" },
  { icon: Heart, label: "Loyalty Program", labelAr: "برنامج الولاء" },
  { icon: Barcode, label: "Barcode Labels", labelAr: "ملصقات الباركود" },
];

export default function FashionLogin() {
  const [, navigate] = useLocation();
  const { t, language } = useLanguage();
  const isAr = language === "ar";
  const [error, setError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const { user, loginMutation, verify2FAMutation, resend2FAMutation, pending2FA, clearPending2FA } = useAuth();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (!user || pending2FA) return;
    const ps = (user as { posSystem?: string }).posSystem;
    if (ps !== "fashion") {
      const kind = ps === "oil" ? (isAr ? "مصنع" : "factory") : (isAr ? "مجوهرات" : "jewelry");
      const portal = ps === "oil" ? "FactoryPOS" : "JewelPOS";
      setError(
        isAr
          ? `هذا الحساب لمحل ${kind} وليس أزياء. غيّر نوع المتجر إلى FashionPOS من لوحة الإدارة (/auth)، أو سجّل الدخول عبر ${portal}.`
          : `This is a ${kind} store, not fashion. Set store type to FashionPOS in admin (/auth), or use ${portal} login.`,
      );
      void apiRequest("POST", "/api/logout").then(() => {
        queryClient.setQueryData(["/api/user"], null);
      });
    }
  }, [user, pending2FA, isAr]);

  function onSubmit(values: LoginForm) {
    setError("");
    loginMutation.mutate({ ...values, portal: "store", posSystem: "fashion" });
  }

  function onVerify() {
    if (verificationCode.length === 6) {
      verify2FAMutation.mutate(verificationCode);
    }
  }

  function onBack() {
    clearPending2FA();
    setVerificationCode("");
    setError("");
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-10"
        style={{ background: "linear-gradient(135deg, #1a0510 0%, #831843 50%, #1a0510 100%)" }}
      >
        <div className="absolute top-1/4 start-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 end-1/4 w-64 h-64 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center shadow-xl shadow-pink-900/40">
            <Shirt className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white tracking-tight">FashionPOS</p>
            <p className="text-xs text-pink-300">{isAr ? "نظام محلات الملابس والأزياء" : "Apparel & Clothing Store"}</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
              {isAr ? (
                <>أدر محل الأزياء<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">باحترافية وسهولة</span></>
              ) : (
                <>Run your clothing store<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">smarter & faster</span></>
              )}
            </h1>
            <p className="text-pink-200/70 text-base leading-relaxed max-w-sm">
              {isAr
                ? "مخزون بالمقاس واللون، مرتجعات، برنامج ولاء، وملصقات باركود — كل ما يحتاجه محل الملابس."
                : "Size/color inventory, returns, loyalty rewards, and barcode labels — built for apparel retail."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, labelAr }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-pink-400" />
                </div>
                <span className="text-sm text-pink-100/80">{isAr ? labelAr : label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">IQ-POS Platform</p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
              <Shirt className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">FashionPOS</span>
          </div>
          <div className="lg:hidden" />
          <div className="flex items-center gap-2 ms-auto">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm space-y-8">
            {!pending2FA ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {isAr ? "تسجيل الدخول" : "Sign In"}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {isAr ? "أدخل بيانات حساب محل الأزياء" : "Enter your FashionPOS store credentials"}
                  </p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">{isAr ? "اسم المستخدم" : "Username"}</label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        {...form.register("username")}
                        className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        autoComplete="username"
                        data-testid="input-fashion-username"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">{isAr ? "كلمة المرور" : "Password"}</label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        {...form.register("password")}
                        type="password"
                        className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        autoComplete="current-password"
                        data-testid="input-fashion-password"
                      />
                    </div>
                  </div>

                  {(error || loginMutation.isError) && (
                    <p className="text-sm text-red-400" data-testid="text-fashion-login-error">
                      {error || (isAr ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Invalid username or password.")}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl py-6 font-semibold"
                    data-testid="button-fashion-login"
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {isAr ? "دخول" : "Sign In"}
                        <ArrowRight className="h-4 w-4 ms-2" />
                      </>
                    )}
                  </Button>
                  <DemoLoginHint />
                </form>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-fashion-2fa-title">
                    {t("auth.verifyTitle")}
                  </h2>
                  <p className="text-slate-400 text-sm">{t("auth.verifySubtitle")}</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-pink-500/10 rounded-xl border border-pink-500/25">
                    <Mail className="h-5 w-5 text-pink-400 flex-shrink-0" />
                    <p className="text-sm text-slate-300" data-testid="text-fashion-2fa-email">
                      {t("auth.codeSentTo")}{" "}
                      <span className="font-medium text-white">{pending2FA.maskedEmail}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={setVerificationCode}
                      data-testid="input-fashion-verification-code"
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
                    <p className="text-xs text-slate-500">{t("auth.codeExpiry")}</p>
                  </div>

                  <Button
                    onClick={onVerify}
                    disabled={verificationCode.length !== 6 || verify2FAMutation.isPending}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl py-6 font-semibold"
                    data-testid="button-fashion-verify-code"
                  >
                    {verify2FAMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Shield className="h-4 w-4 me-2" />
                        {t("auth.verifyButton")}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={onBack}
                      className="text-sm text-slate-500 hover:text-pink-400 transition-colors flex items-center gap-1"
                      data-testid="button-fashion-back-to-login"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      {t("auth.backToLogin")}
                    </button>
                    <button
                      type="button"
                      onClick={() => resend2FAMutation.mutate()}
                      disabled={resend2FAMutation.isPending}
                      className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
                      data-testid="button-fashion-resend-code"
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

            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm text-slate-500 hover:text-pink-400 transition-colors w-full text-center"
            >
              {isAr ? "← العودة للصفحة الرئيسية" : "← Back to home"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
