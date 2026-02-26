import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateBrandingSchema, type UpdateBranding } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Palette, Mail, Shield } from "lucide-react";
import { z } from "zod";

type BrandingData = UpdateBranding & { name?: string };

const emailSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
});

type EmailForm = z.infer<typeof emailSchema>;

export default function StoreBranding() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const { data: branding, isLoading } = useQuery<BrandingData>({
    queryKey: ["/api/store/branding"],
  });

  const { data: emailData, isLoading: emailLoading } = useQuery<{ email: string }>({
    queryKey: ["/api/store/email"],
  });

  const form = useForm<UpdateBranding>({
    resolver: zodResolver(updateBrandingSchema),
    defaultValues: {
      brandColor: "#d4a574",
      logoUrl: "",
      receiptHeader: "",
      receiptFooter: "",
    },
  });

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (branding) {
      form.reset({
        brandColor: branding.brandColor || "#d4a574",
        logoUrl: branding.logoUrl || "",
        receiptHeader: branding.receiptHeader || "",
        receiptFooter: branding.receiptFooter || "",
      });
    }
  }, [branding, form]);

  useEffect(() => {
    if (emailData) {
      emailForm.reset({ email: emailData.email || "" });
    }
  }, [emailData, emailForm]);

  const saveMutation = useMutation({
    mutationFn: async (values: UpdateBranding) => {
      const res = await apiRequest("PATCH", "/api/store/branding", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/branding"] });
      toast({ title: t("branding.saved") });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (values: EmailForm) => {
      const res = await apiRequest("PATCH", "/api/store/email", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/email"] });
      toast({ title: t("branding.emailSaved") });
    },
    onError: (error: Error) => {
      toast({
        title: t("branding.saveEmail"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const watchedColor = form.watch("brandColor");
  const watchedHeader = form.watch("receiptHeader");
  const watchedFooter = form.watch("receiptFooter");
  const watchedLogo = form.watch("logoUrl");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold" data-testid="text-branding-title">
        {t("branding.title")}
      </h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold" data-testid="text-email-settings-title">
              {t("branding.emailTitle")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-email-description">
            {t("branding.emailDescription")}
          </p>
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit((v) => emailMutation.mutate(v))}
              className="space-y-4"
              data-testid="form-email"
            >
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.email")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder={t("branding.emailPlaceholder")}
                          className="ps-9"
                          data-testid="input-store-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={emailMutation.isPending}
                  data-testid="button-save-email"
                >
                  {emailMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("branding.saveEmail")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
              className="space-y-4"
              data-testid="form-branding"
            >
              <FormField
                control={form.control}
                name="brandColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.brandColor")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={field.value || "#d4a574"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-9 w-14 cursor-pointer rounded-md border"
                          data-testid="input-brand-color"
                        />
                        <Input
                          value={field.value || ""}
                          onChange={field.onChange}
                          className="flex-1"
                          data-testid="input-brand-color-text"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.logoUrl")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-logo-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptHeader"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.receiptHeader")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-receipt-header" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptFooter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.receiptFooter")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-receipt-footer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="flex justify-end">
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-branding">
                  {saveMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("branding.save")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4" data-testid="text-receipt-preview-title">
            {t("receipt.receipt")} Preview
          </h2>
          <div
            className="border rounded-md p-6 text-center space-y-3"
            style={{ borderTopColor: watchedColor || "#d4a574", borderTopWidth: "4px" }}
            data-testid="receipt-preview"
          >
            {watchedLogo && (
              <img
                src={watchedLogo}
                alt="Logo"
                className="h-12 mx-auto object-contain"
                data-testid="img-receipt-logo"
              />
            )}
            <div className="flex items-center justify-center gap-2">
              <Palette className="h-5 w-5" style={{ color: watchedColor || "#d4a574" }} />
              <h3
                className="text-xl font-bold"
                style={{ color: watchedColor || "#d4a574" }}
                data-testid="text-receipt-store-name"
              >
                {branding?.name || "Store"}
              </h3>
            </div>
            {watchedHeader && (
              <p className="text-sm text-muted-foreground" data-testid="text-receipt-header-preview">
                {watchedHeader}
              </p>
            )}
            <Separator />
            <div className="py-4 text-muted-foreground text-sm">
              <p>{t("receipt.date")}: {new Date().toLocaleDateString()}</p>
              <p>{t("receipt.orderNo")}: INV-XXXXX</p>
            </div>
            <Separator />
            {watchedFooter && (
              <p className="text-sm text-muted-foreground" data-testid="text-receipt-footer-preview">
                {watchedFooter}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t("receipt.thankYou")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
