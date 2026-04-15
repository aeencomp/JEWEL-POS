import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

export default function StorePortal() {
  const { t } = useLanguage();
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
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
        <div className="absolute top-4 end-4 flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-md bg-amber-600 flex items-center justify-center">
                <Gem className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg">JewelPOS</span>
            </div>
            {!pending2FA ? (
              <>
                <h1 className="text-2xl font-bold mt-4" data-testid="text-store-login-title">
                  {t("auth.storeLoginTitle")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-store-login-subtitle">
                  {t("auth.storeLoginSubtitle")}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold mt-4" data-testid="text-2fa-title">
                  {t("auth.verifyTitle")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-2fa-subtitle">
                  {t("auth.verifySubtitle")}
                </p>
              </>
            )}
          </div>

          {!pending2FA ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.username")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder={t("auth.username")}
                            className="ps-9"
                            data-testid="input-login-username"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder={t("auth.password")}
                            className="ps-9"
                            data-testid="input-login-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-amber-600 text-white border-amber-600"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("auth.loginButton")}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <Mail className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-foreground" data-testid="text-2fa-email-sent">
                    {t("auth.codeSentTo")} <span className="font-medium">{pending2FA.maskedEmail}</span>
                  </p>
                </div>
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
                <p className="text-xs text-muted-foreground">{t("auth.codeExpiry")}</p>
              </div>

              <Button
                onClick={onVerify}
                className="w-full bg-amber-600 text-white border-amber-600"
                disabled={verificationCode.length !== 6 || verify2FAMutation.isPending}
                data-testid="button-verify-code"
              >
                {verify2FAMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                <Shield className="me-2 h-4 w-4" />
                {t("auth.verifyButton")}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="h-3 w-3" />
                  {t("auth.backToLogin")}
                </button>
                <button
                  type="button"
                  onClick={() => resend2FAMutation.mutate()}
                  disabled={resend2FAMutation.isPending}
                  className="text-sm text-amber-600 hover:text-amber-700 transition-colors"
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
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-amber-600 p-10 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800" />
        <div className="relative z-10 w-full max-w-sm text-white">
          <h2 className="text-2xl font-bold mb-1">{t("pos.selectTerminal")}</h2>
          <p className="text-white/70 text-sm mb-6">{t("pos.selectTerminalHint")}</p>

          {loadingTerminals ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          ) : terminals.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {terminals.map((terminal) => {
                const isSelected = selectedTerminalId === terminal.id;
                return (
                  <button
                    key={terminal.id}
                    type="button"
                    onClick={() => selectTerminal(terminal.id)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center cursor-pointer
                      ${isSelected
                        ? "border-white bg-white/25 shadow-lg shadow-black/20 scale-[1.03]"
                        : "border-white/20 bg-white/10 hover:bg-white/18 hover:border-white/40"
                      }`}
                    data-testid={`button-terminal-${terminal.id}`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-2 end-2 h-4 w-4 text-white" />
                    )}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)" }}
                    >
                      <TerminalIcon iconName={terminal.icon} size={22} />
                    </div>
                    <span className="font-semibold text-sm leading-tight">{terminal.name}</span>
                    {terminal.description && (
                      <span className="text-white/60 text-xs leading-tight">{terminal.description}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : usernameValue.trim() ? (
            <div className="flex flex-col items-center gap-3 py-10 text-white/60">
              <Monitor className="h-10 w-10" />
              <p className="text-sm text-center">{t("pos.noTerminals")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-white/60">
              <User className="h-10 w-10" />
              <p className="text-sm text-center">{t("pos.enterUsernameForTerminals")}</p>
            </div>
          )}

          {selectedTerminalId && (
            <p className="mt-5 text-center text-sm text-white/80 font-medium">
              ✓ {terminals.find((t) => t.id === selectedTerminalId)?.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
