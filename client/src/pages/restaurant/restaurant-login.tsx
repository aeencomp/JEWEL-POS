import { useState, useEffect } from "react";
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
import { UtensilsCrossed, User, Lock, Loader2, ChefHat, QrCode, ClipboardList, Shield } from "lucide-react";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

export default function RestaurantLogin() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [error, setError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const { user, loginMutation, verify2FAMutation, resend2FAMutation, pending2FA, clearPending2FA } = useAuth();
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });

  useEffect(() => {
    if (!user || pending2FA) return;
    if ((user as { posSystem?: string }).posSystem !== "restaurant") {
      setError(isAr ? "هذا الحساب ليس مطعماً. غيّر نوع المتجر إلى RestoPOS من لوحة الإدارة." : "This account is not a restaurant. Set store type to RestoPOS in admin.");
      void apiRequest("POST", "/api/logout").then(() => queryClient.setQueryData(["/api/user"], null));
    }
  }, [user, pending2FA, isAr]);

  const features = [
    { icon: UtensilsCrossed, en: "Table management", ar: "إدارة الطاولات" },
    { icon: ChefHat, en: "Kitchen display", ar: "شاشة المطبخ" },
    { icon: QrCode, en: "QR table ordering", ar: "طلب عبر QR" },
    { icon: ClipboardList, en: "Real-time orders", ar: "طلبات فورية" },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
      <div className="hidden lg:flex flex-col justify-between w-[52%] p-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0a04 0%, #9a3412 50%, #1a0a04 100%)" }}>
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center">
            <UtensilsCrossed className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">RestoPOS</p>
            <p className="text-xs text-orange-200">{isAr ? "نظام المطاعم والمقاهي" : "Restaurant & Café System"}</p>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            {isAr ? <>أدر مطعمك<br /><span className="text-orange-400">بطلبات QR فورية</span></> : <>Run your restaurant<br /><span className="text-orange-400">with instant QR orders</span></>}
          </h1>
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, en, ar }) => (
              <div key={en} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <Icon className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-orange-100/80">{isAr ? ar : en}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-orange-200/40">© IQ-POS RestoPOS</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-4 end-4 flex gap-1"><LanguageToggle /><ThemeToggle /></div>
        <div className="w-full max-w-sm">
          {pending2FA ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-orange-500" /><h2 className="font-bold text-lg">{isAr ? "تحقق بالبريد" : "Email Verification"}</h2></div>
              <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
                <InputOTPGroup>{[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
              </InputOTP>
              <Button className="w-full bg-orange-600" onClick={() => verificationCode.length === 6 && verify2FAMutation.mutate(verificationCode)} disabled={verify2FAMutation.isPending}>
                {verify2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "تحقق" : "Verify")}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { clearPending2FA(); setVerificationCode(""); }}>{isAr ? "رجوع" : "Back"}</Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit((v) => { setError(""); loginMutation.mutate({ ...v, portal: "store", posSystem: "restaurant" }); })} className="space-y-4">
              <h2 className="font-bold text-xl">{isAr ? "تسجيل الدخول" : "Sign In"}</h2>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="relative"><User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input {...form.register("username")} className="w-full h-11 ps-10 rounded-xl border bg-background px-3" placeholder={isAr ? "اسم المستخدم" : "Username"} /></div>
              <div className="relative"><Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input {...form.register("password")} type="password" className="w-full h-11 ps-10 rounded-xl border bg-background px-3" placeholder={isAr ? "كلمة المرور" : "Password"} /></div>
              <Button type="submit" className="w-full h-11 bg-orange-600 hover:bg-orange-700" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "دخول" : "Sign In")}
              </Button>
              <DemoLoginHint />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
