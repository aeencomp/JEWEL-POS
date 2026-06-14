import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Droplets, User, Lock, Loader2, ArrowRight, Factory, BarChart3, Package, Truck } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: BarChart3, label: "Live Dashboard", labelAr: "لوحة تحكم لحظية" },
  { icon: Factory, label: "Production Tracking", labelAr: "تتبع الإنتاج" },
  { icon: Package, label: "Inventory Control", labelAr: "إدارة المخزون" },
  { icon: Truck, label: "Purchase & Sales", labelAr: "مشتريات ومبيعات" },
];

export default function OilLogin() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [error, setError] = useState("");

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) =>
      apiRequest("POST", "/api/login", { ...data, portal: "store", posSystem: "oil" }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      if (data.requires2FA) {
        setError(isAr ? "هذا الحساب يتطلب بريد إلكتروني للتحقق" : "This account requires email verification.");
        return;
      }
      queryClient.setQueryData(["/api/user"], data);
      localStorage.setItem(`posSystem_${data.id}`, "oil");
      navigate("/oil");
    },
    onError: () => {
      setError(isAr ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Invalid username or password.");
    },
  });

  function onSubmit(values: LoginForm) {
    setError("");
    loginMutation.mutate(values);
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-10"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)" }}>
        {/* Glow blobs */}
        <div className="absolute top-1/4 start-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 end-1/4 w-64 h-64 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-xl shadow-blue-900/40">
            <Droplets className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white tracking-tight">FACTORY ERP SYSTEM</p>
            <p className="text-xs text-blue-300">{isAr ? "نظام مصنع الزيوت" : "Oil Factory ERP"}</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
              {isAr ? (
                <>إدارة مصنعك<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">بذكاء وسهولة</span></>
              ) : (
                <>Manage your factory<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">smarter & faster</span></>
              )}
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              {isAr
                ? "منصة متكاملة لإدارة الإنتاج والمبيعات والمشتريات والمصاريف والمحاسبة."
                : "An all-in-one platform for production, sales, purchases, expenses and accounting."}
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, labelAr }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <span className="text-sm text-slate-300">{isAr ? labelAr : label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="relative text-xs text-slate-600">{isAr ? "IQ-POS Platform · جميع الحقوق محفوظة" : "IQ-POS Platform · All rights reserved"}</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Droplets className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">FACTORY ERP SYSTEM</span>
          </div>
          <div className="lg:hidden" />
          <div className="flex items-center gap-2 ms-auto">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {isAr ? "تسجيل الدخول" : "Sign In"}
              </h2>
              <p className="text-slate-400 text-sm">
                {isAr ? "أدخل بيانات حسابك للوصول إلى النظام" : "Enter your credentials to access Factory ERP System"}
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">
                  {isAr ? "اسم المستخدم" : "Username"}
                </label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    {...form.register("username")}
                    placeholder={isAr ? "أدخل اسم المستخدم" : "Enter username"}
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoComplete="username"
                    data-testid="input-username"
                  />
                </div>
                {form.formState.errors.username && (
                  <p className="text-xs text-red-400">{isAr ? "مطلوب" : "Required"}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">
                  {isAr ? "كلمة المرور" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    {...form.register("password")}
                    type="password"
                    placeholder={isAr ? "أدخل كلمة المرور" : "Enter password"}
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoComplete="current-password"
                    data-testid="input-password"
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-400">{isAr ? "مطلوب" : "Required"}</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-blue-900/40 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isAr ? "دخول إلى النظام" : "Sign In to Factory ERP System"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Back to landing */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                >
                  {isAr ? "← العودة إلى الصفحة الرئيسية" : "← Back to landing page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
