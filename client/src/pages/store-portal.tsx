import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Gem, Lock, User, Loader2, ShoppingCart, Package, Wrench, CreditCard } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function StorePortal() {
  const { t } = useLanguage();
  const { loginMutation } = useAuth();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(data: LoginForm) {
    loginMutation.mutate({ ...data, portal: "store" });
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
            <h1 className="text-2xl font-bold mt-4" data-testid="text-store-login-title">
              {t("auth.storeLoginTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-store-login-subtitle">
              {t("auth.storeLoginSubtitle")}
            </p>
          </div>

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
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-amber-600 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800" />
        <div className="relative z-10 max-w-md text-white">
          <h2 className="text-3xl font-bold mb-3">
            JewelPOS
          </h2>
          <p className="text-white/80 mb-10 text-sm leading-relaxed">
            {t("auth.storeLoginSubtitle")}
          </p>
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t("pos.terminal")}</h3>
                <p className="text-white/70 text-xs mt-0.5">{t("auth.storeLoginSubtitle")}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t("inventory.title")}</h3>
                <p className="text-white/70 text-xs mt-0.5">{t("inventory.title")}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t("repairs.title")}</h3>
                <p className="text-white/70 text-xs mt-0.5">{t("repairs.title")}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t("layaway.title")}</h3>
                <p className="text-white/70 text-xs mt-0.5">{t("layaway.title")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
