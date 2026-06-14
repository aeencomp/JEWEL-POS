import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Pill, User, Lock, Loader2, ArrowRight, ArrowLeft, FilePlus2, AlertTriangle, Package, Barcode, Mail, Shield,
} from "lucide-react";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: FilePlus2, label: "Prescriptions", labelAr: "إدارة الوصفات" },
  { icon: AlertTriangle, label: "Expiry Alerts", labelAr: "تنبيهات الصلاحية" },
  { icon: Package, label: "Drug Inventory", labelAr: "مخزون الأدوية" },
  { icon: Barcode, label: "Barcode Scanning", labelAr: "مسح الباركود" },
];

export default function PharmacyLogin() {
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
    if (ps !== "pharmacy") {
      setError(isAr ? "هذا الحساب ليس صيدلية. استخدم PharmaPOS أو غيّر نوع المتجر من الإدارة." : "This account is not a pharmacy store. Use PharmaPOS login or change store type in admin.");
      void apiRequest("POST", "/api/logout").then(() => queryClient.setQueryData(["/api/user"], null));
    }
  }, [user, pending2FA, isAr]);

  function onSubmit(values: LoginForm) {
    setError("");
    loginMutation.mutate({ ...values, portal: "store", posSystem: "pharmacy" });
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-10"
        style={{ background: "linear-gradient(135deg, #042f2e 0%, #0f766e 50%, #042f2e 100%)" }}
      >
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-xl">
            <Pill className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">PharmaPOS</p>
            <p className="text-xs text-teal-300">{isAr ? "نظام إدارة الصيدليات" : "Pharmacy Management System"}</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            {isAr ? (
              <>أدر صيدليتك<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">بأمان واحترافية</span></>
            ) : (
              <>Run your pharmacy<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">safely & professionally</span></>
            )}
          </h1>
          <p className="text-teal-200/70 text-base max-w-sm">
            {isAr ? "وصفات، صلاحية الأدوية، مخزون، وتنبيهات — نظام متكامل للصيدليات." : "Prescriptions, expiry tracking, inventory, and alerts — a complete pharmacy POS."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, labelAr }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <Icon className="h-4 w-4 text-teal-400" />
                <span className="text-sm text-teal-100/80">{isAr ? labelAr : label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600">IQ-POS Platform</p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-end px-6 py-4 gap-2">
          <LanguageToggle /><ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm space-y-8">
            {!pending2FA ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{isAr ? "تسجيل الدخول" : "Sign In"}</h2>
                  <p className="text-slate-400 text-sm">{isAr ? "أدخل بيانات حساب الصيدلية" : "Enter your PharmaPOS credentials"}</p>
                </div>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">{isAr ? "اسم المستخدم" : "Username"}</label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input {...form.register("username")} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" autoComplete="username" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">{isAr ? "كلمة المرور" : "Password"}</label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input {...form.register("password")} type="password" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" autoComplete="current-password" />
                    </div>
                  </div>
                  {(error || loginMutation.isError) && <p className="text-sm text-red-400">{error || (isAr ? "بيانات الدخول غير صحيحة" : "Invalid credentials")}</p>}
                  <Button type="submit" disabled={loginMutation.isPending} className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-xl py-6 font-semibold">
                    {loginMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{isAr ? "دخول" : "Sign In"}<ArrowRight className="h-4 w-4 ms-2" /></>}
                  </Button>
                  <div className="text-center pt-2">
                    <button type="button" onClick={() => navigate("/")} className="text-xs text-slate-500 hover:text-slate-400">
                      {isAr ? "← العودة إلى الصفحة الرئيسية" : "← Back to landing page"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{t("auth.verifyTitle")}</h2>
                  <p className="text-slate-400 text-sm">{t("auth.verifySubtitle")}</p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-teal-500/10 rounded-xl border border-teal-500/25">
                    <Mail className="h-5 w-5 text-teal-400" />
                    <p className="text-sm text-slate-300">{t("auth.codeSentTo")} <span className="font-medium text-white">{pending2FA.maskedEmail}</span></p>
                  </div>
                  <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button onClick={() => verificationCode.length === 6 && verify2FAMutation.mutate(verificationCode)} disabled={verify2FAMutation.isPending || verificationCode.length !== 6} className="w-full bg-teal-600">
                    {verify2FAMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Shield className="h-4 w-4 me-2" />{t("auth.verify")}</>}
                  </Button>
                  <Button variant="ghost" onClick={() => { clearPending2FA(); setVerificationCode(""); }} className="w-full text-slate-400">
                    <ArrowLeft className="h-4 w-4 me-2" />{t("auth.backToLogin")}
                  </Button>
                  <button type="button" onClick={() => resend2FAMutation.mutate()} className="text-xs text-teal-400 hover:underline w-full text-center">{t("auth.resendCode")}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
