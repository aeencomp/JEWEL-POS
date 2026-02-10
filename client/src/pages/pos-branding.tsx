import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Loader2, Palette, Image, Receipt, RotateCcw } from "lucide-react";

type BrandingData = {
  brandColor: string | null;
  logoUrl: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  name: string;
};

const brandingFormSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
  logoUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  receiptHeader: z.string().max(200),
  receiptFooter: z.string().max(200),
});

type BrandingFormValues = z.infer<typeof brandingFormSchema>;

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#6366f1", "#14b8a6", "#d946ef",
];

export default function PosBranding() {
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: branding, isLoading } = useQuery<BrandingData>({
    queryKey: ["/api/restaurant/branding"],
  });

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: {
      brandColor: "#10b981",
      logoUrl: "",
      receiptHeader: "",
      receiptFooter: "",
    },
  });

  useEffect(() => {
    if (branding) {
      form.reset({
        brandColor: branding.brandColor || "#10b981",
        logoUrl: branding.logoUrl || "",
        receiptHeader: branding.receiptHeader || "",
        receiptFooter: branding.receiptFooter || "",
      });
    }
  }, [branding, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: BrandingFormValues) => {
      const res = await apiRequest("PATCH", "/api/restaurant/branding", {
        brandColor: values.brandColor,
        logoUrl: values.logoUrl || null,
        receiptHeader: values.receiptHeader || null,
        receiptFooter: values.receiptFooter || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/branding"] });
      toast({ title: t("branding.saved"), description: t("branding.savedDesc") });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: BrandingFormValues) => {
    saveMutation.mutate(values);
  };

  const watchedColor = form.watch("brandColor");
  const watchedLogoUrl = form.watch("logoUrl");
  const watchedReceiptHeader = form.watch("receiptHeader");
  const watchedReceiptFooter = form.watch("receiptFooter");

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-branding-title">{t("branding.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("branding.subtitle")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Palette className="h-4 w-4" />
                    {t("branding.brandColor")}
                  </CardTitle>
                  <CardDescription>{t("branding.brandColorDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="brandColor"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-md border flex-shrink-0"
                            style={{ backgroundColor: field.value }}
                            data-testid="div-color-preview"
                          />
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="#10b981"
                              data-testid="input-brand-color"
                            />
                          </FormControl>
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                            data-testid="input-color-picker"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-8 h-8 rounded-md border transition-transform"
                        style={{
                          backgroundColor: color,
                          outline: watchedColor === color ? "2px solid currentColor" : "none",
                          outlineOffset: "2px",
                        }}
                        onClick={() => form.setValue("brandColor", color)}
                        data-testid={`button-preset-color-${color.replace("#", "")}`}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue("brandColor", "#10b981")}
                    data-testid="button-reset-color"
                  >
                    <RotateCcw className="h-3 w-3 me-1" />
                    {t("branding.resetColor")}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Image className="h-4 w-4" />
                    {t("branding.logoUrl")}
                  </CardTitle>
                  <CardDescription>{t("branding.logoUrlDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://example.com/logo.png"
                            data-testid="input-logo-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchedLogoUrl && (
                    <div className="mt-3 p-3 border rounded-md bg-muted/30">
                      <img
                        src={watchedLogoUrl}
                        alt="Logo preview"
                        className="max-h-16 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        data-testid="img-logo-preview"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-4 w-4" />
                    {t("branding.receiptHeader")}
                  </CardTitle>
                  <CardDescription>{t("branding.receiptHeaderDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="receiptHeader"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={branding?.name || "Restaurant Name"}
                            rows={2}
                            data-testid="input-receipt-header"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-4 w-4" />
                    {t("branding.receiptFooter")}
                  </CardTitle>
                  <CardDescription>{t("branding.receiptFooterDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="receiptFooter"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Thank you for dining with us!"
                            rows={2}
                            data-testid="input-receipt-footer"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full"
                disabled={saveMutation.isPending}
                data-testid="button-save-branding"
              >
                {saveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("branding.saving")}</>
                ) : (
                  t("branding.saveChanges")
                )}
              </Button>
            </div>

            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle className="text-base">{t("branding.preview")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">{t("sidebar.posTerminal")}</Label>
                      <div className="border rounded-md p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          {watchedLogoUrl ? (
                            <img src={watchedLogoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
                          ) : (
                            <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: watchedColor }}>
                              <span className="text-white text-xs font-bold">{branding?.name?.charAt(0) || "R"}</span>
                            </div>
                          )}
                          <span className="font-semibold text-sm">{branding?.name || "Restaurant"}</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="px-3 py-1 rounded-md text-xs text-white" style={{ backgroundColor: watchedColor }}>All</div>
                          <div className="px-3 py-1 rounded-md text-xs border bg-muted/30">Mains</div>
                          <div className="px-3 py-1 rounded-md text-xs border bg-muted/30">Drinks</div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">{t("branding.previewReceipt")}</Label>
                      <div className="border rounded-md p-4 bg-white dark:bg-zinc-900 font-mono text-xs space-y-2">
                        <div className="text-center border-b pb-2">
                          <p className="font-bold" style={{ color: watchedColor }}>
                            {watchedReceiptHeader || branding?.name || "Restaurant Name"}
                          </p>
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Item 1</span>
                            <span>5,000 IQD</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Item 2</span>
                            <span>8,000 IQD</span>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span>13,000 IQD</span>
                        </div>
                        {watchedReceiptFooter && (
                          <div className="text-center border-t pt-2 text-muted-foreground">
                            <p>{watchedReceiptFooter}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
