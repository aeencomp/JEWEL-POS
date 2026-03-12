import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
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
import { Loader2, Palette, Mail, Shield, User, Lock, Upload, X, ImageIcon } from "lucide-react";
import { z } from "zod";

type BrandingData = UpdateBranding & { name?: string };

const emailSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
});
type EmailForm = z.infer<typeof emailSchema>;

const usernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
});
type UsernameForm = z.infer<typeof usernameSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type PasswordForm = z.infer<typeof passwordSchema>;

export default function StoreBranding() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Only JPG, PNG, GIF, WEBP allowed", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      form.setValue("logoUrl", data.url);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  const { data: branding, isLoading } = useQuery<BrandingData>({
    queryKey: ["/api/store/branding"],
  });

  const { data: emailData } = useQuery<{ email: string }>({
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
    defaultValues: { email: "" },
  });

  const usernameForm = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
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

  useEffect(() => {
    if (user) {
      usernameForm.reset({ username: user.username || "" });
    }
  }, [user, usernameForm]);

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
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const usernameMutation = useMutation({
    mutationFn: async (values: UsernameForm) => {
      const res = await apiRequest("PATCH", "/api/store/username", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: t("branding.usernameSaved") });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordForm) => {
      const res = await apiRequest("PATCH", "/api/store/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: t("branding.passwordSaved") });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
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
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold" data-testid="text-username-title">
              {t("branding.usernameTitle")}
            </h2>
          </div>
          <Form {...usernameForm}>
            <form
              onSubmit={usernameForm.handleSubmit((v) => usernameMutation.mutate(v))}
              className="space-y-4"
              data-testid="form-username"
            >
              <FormField
                control={usernameForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.username")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          className="ps-9"
                          data-testid="input-store-username"
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
                  disabled={usernameMutation.isPending}
                  data-testid="button-save-username"
                >
                  {usernameMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("branding.saveUsername")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold" data-testid="text-password-title">
              {t("branding.passwordTitle")}
            </h2>
          </div>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))}
              className="space-y-4"
              data-testid="form-password"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.currentPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        data-testid="input-current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.newPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        data-testid="input-new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branding.confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  data-testid="button-save-password"
                >
                  {passwordMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("branding.savePassword")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

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
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            id="logo-upload-input"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleLogoUpload}
                            data-testid="input-logo-file"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingLogo}
                            onClick={() => document.getElementById("logo-upload-input")?.click()}
                            data-testid="button-browse-logo"
                          >
                            {uploadingLogo ? (
                              <Loader2 className="h-4 w-4 me-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 me-2" />
                            )}
                            {uploadingLogo ? t("inventory.uploading") : t("inventory.browseFile")}
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => form.setValue("logoUrl", "")}
                              data-testid="button-remove-logo"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {field.value ? (
                          <div className="relative w-fit">
                            <img
                              src={field.value}
                              alt="Store logo"
                              className="h-16 rounded-md object-contain border"
                              data-testid="img-logo-preview"
                            />
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 h-16 w-32 rounded-md border border-dashed text-muted-foreground justify-center"
                            data-testid="div-logo-placeholder"
                          >
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="https://..."
                          className="text-xs text-muted-foreground"
                          data-testid="input-logo-url"
                        />
                      </div>
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
