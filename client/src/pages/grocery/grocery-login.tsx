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
import {
  GroceryThemePicker,
  loadGroceryThemeColor,
  saveGroceryThemeColor,
  GROCERY_DEFAULT_COLOR,
} from "@/components/grocery-theme-picker";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  ShoppingBasket, User, Lock, Loader2, ArrowRight, ArrowLeft, AlertTriangle, Package, Barcode, Mail, Shield,
} from "lucide-react";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Barcode, label: "Barcode Scanning", labelAr: "مسح الباركود" },
  { icon: AlertTriangle, label: "Expiry Alerts", labelAr: "تنبيهات الصلاحية" },
  { icon: Package, label: "Product Inventory", labelAr: "مخزون المنتجات" },
  { icon: ShoppingBasket, label: "Fast Checkout", labelAr: "بيع سريع" },
];

export default function GroceryLogin() {
  const [, navigate] = useLocation();
  const { t, language } = useLanguage();
  const isAr = language === "ar";
  const [error, setError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [themeColor, setThemeColor] = useState(GROCERY_DEFAULT_COLOR);
  const { user, loginMutation, verify2FAMutation, resend2FAMutation, pending2FA, clearPending2FA } = useAuth();

  const brandStyle = { "--grocery-brand": themeColor } as React.CSSProperties;

  useEffect(() => {
    setThemeColor(loadGroceryThemeColor());
  }, []);

  function handleThemeChange(color: string) {
    setThemeColor(color);
    saveGroceryThemeColor(color);
  }

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (!user || pending2FA) return;
    const ps = (user as { posSystem?: string }).posSystem;
    if (ps !== "grocery") {
      setError(isAr ? "هذا الحساب ليس بقالة. استخدم GroceryPOS أو غيّر نوع المتجر من الإدارة." : "This account is not a grocery store. Use GroceryPOS login or change store type in admin.");
      void apiRequest("POST", "/api/logout").then(() => queryClient.setQueryData(["/api/user"], null));
    }
  }, [user, pending2FA, isAr]);

  function onSubmit(values: LoginForm) {
    setError("");
    loginMutation.mutate({ ...values, portal: "store", posSystem: "grocery" });
  }

  const panelGradient = `linear-gradient(135deg, color-mix(in srgb, ${themeColor} 22%, #052e16) 0%, color-mix(in srgb, ${themeColor} 75%, #000) 50%, color-mix(in srgb, ${themeColor} 22%, #052e16) 100%)`;

  return (
    <div
      className="min-h-screen flex overflow-hidden bg-slate-950 pharmacy-scroll pharmacy-scroll-dark"
      style={brandStyle}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-y-auto pharmacy-scroll pharmacy-scroll-dark p-10"
        style={{ background: panelGradient }}
      >
        <div
          className="absolute top-1/4 start-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ background: themeColor }}
        />

        <div className="relative flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${themeColor} 70%, white), ${themeColor})` }}
          >
            <ShoppingBasket className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">GroceryPOS</p>
            <p className="text-xs" style={{ color: `color-mix(in srgb, ${themeColor} 40%, white)` }}>
              {isAr ? "نظام نقطة بيع البقالة" : "Grocery & Supermarket POS"}
            </p>
          </div>
        </div>

        <div className="relative space-y-6 my-10">
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            {isAr ? (
              <>أدر بقالتك<br /><span style={{ color: `color-mix(in srgb, ${themeColor} 35%, white)` }}>بسرعة واحترافية</span></>
            ) : (
              <>Run your grocery store<br /><span style={{ color: `color-mix(in srgb, ${themeColor} 35%, white)` }}>fast & professionally</span></>
            )}
          </h1>
          <p className="text-white/60 text-base max-w-sm">
            {isAr ? "باركود، صلاحية، مخزون، وبيع سريع — نظام متكامل للبقالة والسوبرماركت." : "Barcode scanning, expiry tracking, inventory, and fast checkout — a complete grocery POS."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, labelAr }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <Icon className="h-4 w-4" style={{ color: `color-mix(in srgb, ${themeColor} 50%, white)` }} />
                <span className="text-sm text-white/75">{isAr ? labelAr : label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-600">IQ-POS Platform</p>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pharmacy-scroll pharmacy-scroll-dark">
        <div className="flex items-center justify-between px-6 py-4 gap-2">
          <div className="flex items-center gap-2 lg:hidden">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${themeColor}, color-mix(in srgb, ${themeColor} 70%, #000))` }}
            >
              <ShoppingBasket className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">GroceryPOS</span>
          </div>
          <div className="flex items-center gap-2 ms-auto">
            <GroceryThemePicker color={themeColor} onChange={handleThemeChange} variant="dark" />
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm space-y-8">
            {!pending2FA ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{isAr ? "تسجيل الدخول" : "Sign In"}</h2>
                  <p className="text-slate-400 text-sm">{isAr ? "أدخل بيانات حساب البقالة" : "Enter your GroceryPOS credentials"}</p>
                </div>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">{isAr ? "اسم المستخدم" : "Username"}</label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        {...form.register("username")}
                        className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--grocery-brand)] backdrop-blur-sm"
                        autoComplete="username"
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
                        className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--grocery-brand)] backdrop-blur-sm"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                  {(error || loginMutation.isError) && <p className="text-sm text-red-400">{error || (isAr ? "بيانات الدخول غير صحيحة" : "Invalid credentials")}</p>}
                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full text-white rounded-xl py-6 font-semibold border-0 shadow-lg"
                    style={{ background: `linear-gradient(to right, ${themeColor}, color-mix(in srgb, ${themeColor} 75%, #059669))` }}
                  >
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
                  <div
                    className="flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm"
                    style={{ background: `color-mix(in srgb, ${themeColor} 12%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)` }}
                  >
                    <Mail className="h-5 w-5" style={{ color: themeColor }} />
                    <p className="text-sm text-slate-300">{t("auth.codeSentTo")} <span className="font-medium text-white">{pending2FA.maskedEmail}</span></p>
                  </div>
                  <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button
                    onClick={() => verificationCode.length === 6 && verify2FAMutation.mutate(verificationCode)}
                    disabled={verify2FAMutation.isPending || verificationCode.length !== 6}
                    className="w-full text-white"
                    style={{ background: themeColor }}
                  >
                    {verify2FAMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Shield className="h-4 w-4 me-2" />{t("auth.verify")}</>}
                  </Button>
                  <Button variant="ghost" onClick={() => { clearPending2FA(); setVerificationCode(""); }} className="w-full text-slate-400">
                    <ArrowLeft className="h-4 w-4 me-2" />{t("auth.backToLogin")}
                  </Button>
                  <button type="button" onClick={() => resend2FAMutation.mutate()} className="text-xs hover:underline w-full text-center" style={{ color: themeColor }}>
                    {t("auth.resendCode")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
