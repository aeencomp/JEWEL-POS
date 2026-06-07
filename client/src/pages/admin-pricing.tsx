import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Gem, Droplets, Shirt, Loader2, Save, Tag } from "lucide-react";

type PricingPlan = { basic: number; standard: number; premium: number };
type Pricing = { jewel: PricingPlan; oil: PricingPlan; fashion: PricingPlan };

const DEFAULT: Pricing = {
  jewel: { basic: 35000, standard: 55000, premium: 85000 },
  oil: { basic: 50000, standard: 75000, premium: 110000 },
  fashion: { basic: 30000, standard: 45000, premium: 65000 },
};

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
    if (pricing) setDraft({ ...DEFAULT, ...pricing, fashion: { ...DEFAULT.fashion, ...pricing.fashion } });
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

  function handleChange(system: keyof Pricing, plan: keyof PricingPlan, raw: string) {
    const val = parseInt(raw.replace(/,/g, ""), 10);
    if (!isNaN(val)) {
      setDraft(prev => ({ ...prev, [system]: { ...prev[system], [plan]: val } }));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const planLabels = isAr
    ? { basic: "أساسي", standard: "قياسي", premium: "مميز" }
    : { basic: "Basic", standard: "Standard", premium: "Premium" };

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
              {isAr ? "تحديث أسعار خطط الاشتراك على الصفحة الرئيسية" : "Update subscription plan prices shown on the landing page"}
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

      {/* JewelPOS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
              <Gem className="h-4 w-4 text-white" />
            </div>
            JewelPOS
            <span className="text-sm text-muted-foreground font-normal">
              {isAr ? "— لمحلات المجوهرات" : "— Jewelry Stores"}
            </span>
          </CardTitle>
          <CardDescription>
            {isAr ? "أسعار الخطط الشهرية لنظام إدارة محلات المجوهرات" : "Monthly plan prices for the jewelry store management system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["basic", "standard", "premium"] as const).map((plan) => (
              <div key={plan} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`jewel-${plan}`} className="text-sm font-semibold capitalize">
                    {planLabels[plan]}
                  </Label>
                  {plan === "standard" && (
                    <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                      {isAr ? "الأشهر" : "Popular"}
                    </Badge>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id={`jewel-${plan}`}
                    data-testid={`input-price-jewel-${plan}`}
                    type="number"
                    value={draft.jewel[plan]}
                    onChange={(e) => handleChange("jewel", plan, e.target.value)}
                    className="pe-16"
                    min={0}
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    {isAr ? "د.ع/شهر" : "IQD/mo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "العرض:" : "Preview:"} <span className="font-mono font-semibold">{fmt(draft.jewel[plan])}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FashionPOS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Shirt className="h-4 w-4 text-white" />
            </div>
            FashionPOS
            <span className="text-sm text-muted-foreground font-normal">
              {isAr ? "— لمحلات الملابس" : "— Clothing Stores"}
            </span>
          </CardTitle>
          <CardDescription>
            {isAr ? "أسعار الخطط الشهرية لنظام محلات الأزياء والملابس" : "Monthly plan prices for apparel and fashion stores"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["basic", "standard", "premium"] as const).map((plan) => (
              <div key={plan} className="space-y-2">
                <Label htmlFor={`fashion-${plan}`} className="text-sm font-semibold capitalize">
                  {planLabels[plan]}
                </Label>
                <div className="relative">
                  <Input
                    id={`fashion-${plan}`}
                    data-testid={`input-price-fashion-${plan}`}
                    type="number"
                    value={draft.fashion[plan]}
                    onChange={(e) => handleChange("fashion", plan, e.target.value)}
                    className="pe-16"
                    min={0}
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    {isAr ? "د.ع/شهر" : "IQD/mo"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FactoryPOS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
              <Droplets className="h-4 w-4 text-white" />
            </div>
            FactoryPOS
            <span className="text-sm text-muted-foreground font-normal">
              {isAr ? "— لمصانع الزيوت" : "— Oil Factories"}
            </span>
          </CardTitle>
          <CardDescription>
            {isAr ? "أسعار الخطط الشهرية لنظام إدارة مصانع الزيوت" : "Monthly plan prices for the oil factory management system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["basic", "standard", "premium"] as const).map((plan) => (
              <div key={plan} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`oil-${plan}`} className="text-sm font-semibold capitalize">
                    {planLabels[plan]}
                  </Label>
                  {plan === "standard" && (
                    <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">
                      {isAr ? "الأشهر" : "Popular"}
                    </Badge>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id={`oil-${plan}`}
                    data-testid={`input-price-oil-${plan}`}
                    type="number"
                    value={draft.oil[plan]}
                    onChange={(e) => handleChange("oil", plan, e.target.value)}
                    className="pe-16"
                    min={0}
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    {isAr ? "د.ع/شهر" : "IQD/mo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "العرض:" : "Preview:"} <span className="font-mono font-semibold">{fmt(draft.oil[plan])}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
