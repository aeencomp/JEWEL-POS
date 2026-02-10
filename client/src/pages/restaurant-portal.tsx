import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UtensilsCrossed, ChefHat, ClipboardList, History, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function RestaurantPortal() {
  const { user, loginMutation } = useAuth();
  const { t } = useLanguage();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (values: LoginValues) => {
    loginMutation.mutate(values);
  };

  const features = [
    { icon: ChefHat, title: t("portal.featureMenu"), desc: t("portal.featureMenuDesc") },
    { icon: ClipboardList, title: t("portal.featureOrders"), desc: t("portal.featureOrdersDesc") },
    { icon: CreditCard, title: t("portal.featureCheckout"), desc: t("portal.featureCheckoutDesc") },
    { icon: History, title: t("portal.featureTracking"), desc: t("portal.featureTrackingDesc") },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-emerald-700 dark:bg-emerald-900 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 dark:from-emerald-900 dark:via-emerald-800 dark:to-teal-900" />
        <div className="relative z-10 max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-md bg-white/10 flex items-center justify-center">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl">RestoPOS</span>
              <p className="text-white/70 text-xs">{t("portal.restaurantEdition")}</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-3">
            {t("portal.heroTitle")}
          </h2>
          <p className="text-white/80 mb-10 text-sm leading-relaxed">
            {t("portal.heroDesc")}
          </p>
          <div className="space-y-5">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-white/60 text-xs mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
        <div className="absolute top-4 end-4 flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 lg:hidden">
              <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg">RestoPOS</span>
            </div>
            <h1 className="text-2xl font-bold mt-4" data-testid="text-portal-title">
              {t("portal.welcomeTitle")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("portal.welcomeDesc")}
            </p>
          </div>

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.username")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("portal.usernamePlaceholder")}
                        data-testid="input-portal-username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("auth.enterPassword")}
                        data-testid="input-portal-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-emerald-600 text-white border-emerald-600"
                disabled={loginMutation.isPending}
                data-testid="button-portal-login"
              >
                {loginMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("portal.signIn")}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {t("portal.contactAdmin")}
          </p>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground mb-2">{t("portal.adminQuestion")}</p>
            <Link href="/auth">
              <Button variant="outline" size="sm" data-testid="link-admin-login">
                {t("portal.goToAdmin")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
