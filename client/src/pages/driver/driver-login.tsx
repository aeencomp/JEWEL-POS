import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useDriverAuth } from "@/hooks/use-driver-auth";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bike, Phone, Lock, Loader2 } from "lucide-react";
import { usePwaManifest } from "@/lib/use-pwa-manifest";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

export default function DriverLogin() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [, navigate] = useLocation();
  const { driver, isLoading, isAuthenticated, loginMutation } = useDriverAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  usePwaManifest("/manifest-driver.json");

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/driver");
  }, [isLoading, isAuthenticated, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await loginMutation.mutateAsync({ phone, pin });
      navigate("/driver");
    } catch {
      setError(isAr ? "رقم الهاتف أو الرمز غير صحيح" : "Invalid phone or PIN");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex justify-end p-4"><LanguageToggle /></div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/30">
              <Bike className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">{isAr ? "تطبيق السائق" : "Driver App"}</h1>
            <p className="text-sm text-slate-400">{isAr ? "طلب IQ — استلم ووصّل الطلبات" : "IQ Order — pick up & deliver orders"}</p>
          </div>

          <PwaInstallBanner
            isAr={isAr}
            label="Install IQ Driver app on your phone"
            labelAr="ثبّت تطبيق السائق على هاتفك"
          />

          <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="relative">
              <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isAr ? "رقم الهاتف" : "Phone number"}
                className="ps-9 bg-slate-800 border-slate-700 text-white h-12"
                dir="ltr"
              />
            </div>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                placeholder={isAr ? "رمز PIN" : "PIN code"}
                className="ps-9 bg-slate-800 border-slate-700 text-white h-12"
                maxLength={8}
              />
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <Button type="submit" className="w-full h-12 bg-sky-600 hover:bg-sky-700 text-white font-semibold" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "تسجيل الدخول" : "Sign In")}
            </Button>
          </form>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-400">{isAr ? "حساب تجريبي" : "Demo account"}</p>
            <p dir="ltr">07700000001 / 1234</p>
          </div>

          <p className="text-center text-[10px] text-slate-600">IQ Order · IQ-POS Platform</p>
        </div>
      </div>
    </div>
  );
}
