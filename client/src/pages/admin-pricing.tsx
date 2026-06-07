import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Loader2, Save, Tag } from "lucide-react";

type Pricing = { monthly: number };

const DEFAULT: Pricing = { monthly: 45000 };

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default function AdminPricing() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data: pricing, isLoading } = useQuery<Pricing>({
    queryKey: ["/api/pricing"],
    staleTime: 0,
  });

  const [draft, setDraft] = useState<Pricing>(DEFAULT);

  useEffect(() => {
    if (pricing) setDraft({ monthly: pricing.monthly ?? DEFAULT.monthly });
  }, [pricing]);

  const saveMutation = useMutation({
    mutationFn: async (data: Pricing) => {
      const res = await apiRequest("PATCH", "/api/admin/pricing", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/pricing"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({
        title: isAr ? "تم حفظ الأسعار بنجاح" : "Pricing saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: isAr ? "فشل الحفظ" : "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">
              {isAr ? "إعدادات الأسعار" : "Pricing Settings"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "سعر الاشتراك الشهري القياسي لجميع أنظمة نقاط البيع على الصفحة الرئيسية"
                : "Standard monthly subscription price for all POS systems on the landing page"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate(draft)}
          disabled={saveMutation.isPending}
          data-testid="button-save-pricing"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Save className="h-4 w-4 me-2" />
          )}
          {isAr ? "حفظ الأسعار" : "Save Prices"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isAr ? "الاشتراك الشهري القياسي" : "Standard Monthly Subscription"}
          </CardTitle>
          <CardDescription>
            {isAr
              ? "ينطبق على JewelPOS و FashionPOS و FactoryPOS وجميع الأنظمة القادمة"
              : "Applies to JewelPOS, FashionPOS, FactoryPOS, and all upcoming systems"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="monthly-price" className="text-sm font-semibold">
              {isAr ? "السعر الشهري" : "Monthly Price"}
            </Label>
            <div className="relative">
              <Input
                id="monthly-price"
                data-testid="input-price-monthly"
                type="number"
                value={draft.monthly}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/,/g, ""), 10);
                  if (!isNaN(val)) setDraft({ monthly: val });
                }}
                className="pe-16"
                min={0}
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {isAr ? "د.ع/شهر" : "IQD/mo"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? "العرض:" : "Preview:"}{" "}
              <span className="font-mono font-semibold">{fmt(draft.monthly)}</span>{" "}
              {isAr ? "د.ع / شهر" : "IQD / month"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
