import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Gem,
  Droplets,
  ShoppingBasket,
  Utensils,
  Shirt,
  Pill,
  ArrowRight,
  CheckCircle,
  Globe,
  Zap,
  Shield,
  BarChart3,
  Star,
  UserPlus,
  Send,
  LogIn,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function IqPosLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#iqpos-grad)" />
      <rect x="7" y="8" width="15" height="11" rx="2.5" fill="white" fillOpacity="0.95" />
      <rect x="25" y="8" width="8" height="11" rx="2.5" fill="white" fillOpacity="0.55" />
      <rect x="7" y="22" width="26" height="10" rx="2.5" fill="white" fillOpacity="0.85" />
      <rect x="10" y="25" width="6" height="2" rx="1" fill="#d97706" fillOpacity="0.6" />
      <rect x="18" y="25" width="4" height="2" rx="1" fill="#d97706" fillOpacity="0.6" />
      <rect x="24" y="25" width="6" height="2" rx="1" fill="#d97706" fillOpacity="0.6" />
      <defs>
        <linearGradient id="iqpos-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type Product = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ElementType;
  gradient: string;
  available: boolean;
  href?: string;
  tags: string[];
  tagsAr: string[];
};

const products: Product[] = [
  {
    id: "jewel",
    name: "JewelPOS",
    nameAr: "نقطة مجوهرات",
    description: "Complete jewelry store management — inventory, repairs, layaway, sales & customer tracking.",
    descriptionAr: "إدارة شاملة لمحلات المجوهرات — المخزون، الإصلاحات، التقسيط، المبيعات وتتبع العملاء.",
    icon: Gem,
    gradient: "from-amber-500 to-yellow-600",
    available: true,
    href: "/store-portal",
    tags: ["Jewelry", "Repairs", "Layaway"],
    tagsAr: ["مجوهرات", "إصلاحات", "تقسيط"],
  },
  {
    id: "oil",
    name: "FactoryPOS",
    nameAr: "نقطة بيع المصنع",
    description: "Complete oil factory management — production, inventory, sales, purchases, expenses & accounting.",
    descriptionAr: "إدارة شاملة لمصنع الزيوت — الإنتاج، المخزون، المبيعات، المشتريات، المصاريف والمحاسبة.",
    icon: Droplets,
    gradient: "from-blue-600 to-cyan-600",
    available: true,
    href: "/oil-login",
    tags: ["Factory", "Production", "Accounting"],
    tagsAr: ["مصنع", "إنتاج", "محاسبة"],
  },
  {
    id: "grocery",
    name: "GroceryPOS",
    nameAr: "نقطة بيع البقالة",
    description: "Fast-checkout grocery & supermarket POS with barcode scanning, expiry tracking and suppliers.",
    descriptionAr: "نقطة بيع سريعة للبقالة والسوبرماركت مع قراءة الباركود وتتبع الصلاحية والموردين.",
    icon: ShoppingBasket,
    gradient: "from-green-500 to-emerald-600",
    available: false,
    tags: ["Grocery", "Barcode", "Expiry"],
    tagsAr: ["بقالة", "باركود", "صلاحية"],
  },
  {
    id: "restaurant",
    name: "RestoPOS",
    nameAr: "نقطة بيع المطاعم",
    description: "Restaurant & café POS with table management, kitchen display, orders and menu control.",
    descriptionAr: "نقطة بيع للمطاعم والمقاهي مع إدارة الطاولات، شاشة المطبخ والقوائم.",
    icon: Utensils,
    gradient: "from-orange-500 to-red-500",
    available: false,
    tags: ["Restaurant", "Tables", "Kitchen"],
    tagsAr: ["مطعم", "طاولات", "مطبخ"],
  },
  {
    id: "fashion",
    name: "FashionPOS",
    nameAr: "نقطة بيع الأزياء",
    description: "Apparel & fashion store management with size/color variants, returns and loyalty programs.",
    descriptionAr: "إدارة محلات الملابس والأزياء مع متغيرات الحجم واللون والإرجاع وبرامج الولاء.",
    icon: Shirt,
    gradient: "from-pink-500 to-purple-600",
    available: true,
    href: "/fashion-login",
    tags: ["Fashion", "Variants", "Loyalty"],
    tagsAr: ["أزياء", "متغيرات", "ولاء"],
  },
  {
    id: "pharmacy",
    name: "PharmaPOS",
    nameAr: "نقطة بيع الصيدلية",
    description: "Pharmacy management with prescriptions, drug expiry, insurance and stock alerts.",
    descriptionAr: "إدارة الصيدليات مع الوصفات وصلاحية الدواء والتأمين وتنبيهات المخزون.",
    icon: Pill,
    gradient: "from-teal-500 to-cyan-500",
    available: false,
    tags: ["Pharmacy", "Prescriptions", "Stock"],
    tagsAr: ["صيدلية", "وصفات", "مخزون"],
  },
];

const features = [
  { icon: Globe, label: "Bilingual (EN/AR) + RTL", labelAr: "ثنائي اللغة + RTL" },
  { icon: Zap, label: "Fast & Offline-ready", labelAr: "سريع وجاهز بدون إنترنت" },
  { icon: Shield, label: "Secure & Cloud-backed", labelAr: "آمن ومدعوم بالسحابة" },
  { icon: BarChart3, label: "Built-in Analytics", labelAr: "تحليلات مدمجة" },
];

type SignupForm = {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  posSystem: "jewel" | "oil" | "fashion";
  notes: string;
};

type Pricing = { monthly: number };

const DEFAULT_PRICING: Pricing = { monthly: 45000 };

type PosPricingPlan = {
  id: "jewel" | "fashion" | "oil";
  name: string;
  nameAr: string;
  subtitle: string;
  subtitleAr: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
  features: string[];
  featuresAr: string[];
};

const POS_PRICING_PLANS: PosPricingPlan[] = [
  {
    id: "jewel",
    name: "JewelPOS",
    nameAr: "نقطة مجوهرات",
    subtitle: "Jewelry Stores",
    subtitleAr: "محلات المجوهرات",
    icon: Gem,
    gradient: "from-amber-500 to-yellow-600",
    accent: "text-amber-500",
    features: [
      "POS terminal with gold weight & karat pricing",
      "Full inventory management (gold, silver, stones)",
      "Customer profiles & purchase history",
      "Sales orders & receipt printing (thermal + A4)",
      "Repair order tracking",
      "Layaway & installment plans",
      "Purchases & supplier records",
      "Debt & credit sales management",
      "Stock audit & inventory counts",
      "Custom store branding (logo & colors)",
      "Cloud backup & data export",
      "Bilingual interface (English / Arabic + RTL)",
    ],
    featuresAr: [
      "نقطة بيع مع تسعير الوزن والعيار",
      "إدارة مخزون كاملة (ذهب، فضة، أحجار)",
      "ملفات العملاء وسجل المشتريات",
      "طلبات البيع وطباعة الفواتير (حرارية + A4)",
      "متابعة أوامر الإصلاح",
      "نظام التقسيط والدفع المؤجل",
      "المشتريات وسجل الموردين",
      "إدارة الديون والمبيعات الآجلة",
      "جرد المخزون والعد الدوري",
      "علامة تجارية مخصصة (شعار وألوان)",
      "نسخ احتياطي سحابي وتصدير البيانات",
      "واجهة ثنائية اللغة (عربي / إنجليزي + RTL)",
    ],
  },
  {
    id: "fashion",
    name: "FashionPOS",
    nameAr: "نقطة بيع الأزياء",
    subtitle: "Clothing & Apparel Stores",
    subtitleAr: "محلات الملابس والأزياء",
    icon: Shirt,
    gradient: "from-pink-500 to-purple-600",
    accent: "text-pink-500",
    features: [
      "Fast POS with barcode & SKU scanning",
      "Inventory with size, color, brand & style variants",
      "Auto barcode & SKU generation",
      "Customer management & loyalty points",
      "Sales history & order tracking",
      "Returns & refunds processing",
      "Sales reports & analytics",
      "Stock audit & inventory counts",
      "Credit sales & debt tracking",
      "Custom store branding (logo & colors)",
      "Cloud backup & data export",
      "Receipt printing (thermal + A4)",
      "Bilingual interface (English / Arabic + RTL)",
    ],
    featuresAr: [
      "نقطة بيع سريعة مع مسح الباركود و SKU",
      "مخزون بمتغيرات الحجم واللون والماركة والموديل",
      "توليد تلقائي للباركود و SKU",
      "إدارة العملاء ونقاط الولاء",
      "سجل المبيعات ومتابعة الطلبات",
      "معالجة المرتجعات والاسترداد",
      "تقارير المبيعات والتحليلات",
      "جرد المخزون والعد الدوري",
      "مبيعات آجلة ومتابعة الديون",
      "علامة تجارية مخصصة (شعار وألوان)",
      "نسخ احتياطي سحابي وتصدير البيانات",
      "طباعة الفواتير (حرارية + A4)",
      "واجهة ثنائية اللغة (عربي / إنجليزي + RTL)",
    ],
  },
  {
    id: "oil",
    name: "FactoryPOS",
    nameAr: "نقطة بيع المصنع",
    subtitle: "Oil Factories & Production",
    subtitleAr: "مصانع الزيوت والإنتاج",
    icon: Droplets,
    gradient: "from-blue-600 to-cyan-600",
    accent: "text-blue-500",
    features: [
      "Dashboard with business overview",
      "POS sales terminal",
      "Finished product inventory",
      "Raw materials & supplies inventory",
      "Sales management & invoicing",
      "Purchase orders & supplier tracking",
      "Production batch tracking",
      "Customer management",
      "Supplier management",
      "Expense tracking & categorization",
      "Debt management (payables & receivables)",
      "Financial & sales reports",
      "Delivery notes & dispatch records",
      "Product batch records & traceability",
      "Custom store branding (logo & colors)",
      "Bilingual interface (English / Arabic + RTL)",
    ],
    featuresAr: [
      "لوحة تحكم بنظرة شاملة على العمل",
      "نقطة بيع للمبيعات",
      "مخزون المنتجات النهائية",
      "مخزون المواد الخام والمستلزمات",
      "إدارة المبيعات والفواتير",
      "أوامر الشراء ومتابعة الموردين",
      "تتبع دفعات الإنتاج",
      "إدارة العملاء",
      "إدارة الموردين",
      "تسجيل المصاريف وتصنيفها",
      "إدارة الديون (لنا وعلينا)",
      "تقارير مالية وتقارير المبيعات",
      "وصولات التسليم وسجلات الإرسال",
      "سجل دفعات المنتجات والتتبع",
      "علامة تجارية مخصصة (شعار وألوان)",
      "واجهة ثنائية اللغة (عربي / إنجليزي + RTL)",
    ],
  },
];

const PLATFORM_INCLUDES = {
  en: [
    "Cloud-hosted — access from any device",
    "Secure login with optional email verification (2FA)",
    "Dedicated technical support",
    "Free updates & new features",
    "One flat monthly price — no hidden fees",
  ],
  ar: [
    "استضافة سحابية — الوصول من أي جهاز",
    "تسجيل دخول آمن مع تحقق بالبريد الإلكتروني (اختياري)",
    "دعم فني مخصص",
    "تحديثات مجانية وميزات جديدة",
    "سعر شهري ثابت — بدون رسوم خفية",
  ],
};

function fmtPrice(n: number) {
  return n.toLocaleString("en-US");
}

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const { data: pricing = DEFAULT_PRICING } = useQuery<Pricing>({
    queryKey: ["/api/pricing"],
    staleTime: 5 * 60 * 1000,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<SignupForm>({
    name: "",
    businessName: "",
    phone: "",
    email: "",
    posSystem: "jewel",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<SignupForm>>({});

  const mutation = useMutation({
    mutationFn: (data: SignupForm) =>
      apiRequest("POST", "/api/signup-requests", data),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      toast({
        title: isAr ? "حدث خطأ" : "Something went wrong",
        description: isAr ? "يرجى المحاولة مرة أخرى" : "Please try again.",
        variant: "destructive",
      });
    },
  });

  function validate(): boolean {
    const e: Partial<SignupForm> = {};
    if (!form.name.trim()) e.name = isAr ? "الاسم مطلوب" : "Name is required";
    if (!form.businessName.trim()) e.businessName = isAr ? "اسم العمل مطلوب" : "Business name is required";
    if (!form.phone.trim()) e.phone = isAr ? "رقم الهاتف مطلوب" : "Phone is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  function handleOpen(preselect?: "jewel" | "oil" | "fashion") {
    setSubmitted(false);
    setErrors({});
    setForm({ name: "", businessName: "", phone: "", email: "", posSystem: preselect ?? "jewel", notes: "" });
    setDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <IqPosLogo size={32} />
            <span className="font-bold text-lg tracking-tight">IQ-POS</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 hidden sm:flex">Platform</Badge>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 via-background to-background dark:from-amber-950/20 dark:via-background" />
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
          <Badge className="mb-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700 text-xs px-3 py-1">
            {isAr ? "منصة نقاط البيع العراقية" : "Iraqi POS Platform"}
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
            {isAr ? (
              <>نقطة البيع المثالية<br /><span className="text-amber-600">لكل قطاع</span></>
            ) : (
              <>The Perfect POS<br /><span className="text-amber-600">for Every Business</span></>
            )}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            {isAr
              ? "اختر نظام نقطة البيع المناسب لعملك. مصمم للسوق العراقي، ثنائي اللغة، وسهل الاستخدام."
              : "Choose the right POS system for your business. Designed for the Iraqi market, bilingual, and easy to use."}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            {features.map(({ icon: Icon, label, labelAr }) => (
              <div key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span>{isAr ? labelAr : label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
          {isAr ? "اختر قطاع عملك" : "Select Your Industry"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => {
            const Icon = product.icon;
            const name = isAr ? product.nameAr : product.name;
            const desc = isAr ? product.descriptionAr : product.description;
            const tags = isAr ? product.tagsAr : product.tags;

            return (
              <div
                key={product.id}
                className={`relative group rounded-2xl border bg-card overflow-hidden flex flex-col transition-all duration-200
                  ${product.available
                    ? "hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-300 dark:hover:border-amber-700 cursor-pointer"
                    : "opacity-75"
                  }`}
                data-testid={`card-product-${product.id}`}
              >
                <div className={`h-2 w-full bg-gradient-to-r ${product.gradient}`} />

                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${product.gradient} shadow-sm`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    {product.available ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800 text-[10px] px-2">
                        {isAr ? "متاح الآن" : "Live"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-2">
                        {isAr ? "قريباً" : "Coming Soon"}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-1">{name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {product.available ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <Button
                        className={`w-full bg-gradient-to-r ${product.gradient} text-white border-0 group-hover:opacity-90`}
                        onClick={() => navigate(product.href!)}
                        data-testid={`button-product-${product.id}`}
                      >
                        <LogIn className="h-4 w-4 me-2" />
                        {isAr ? "تسجيل الدخول" : "Sign In"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-sm"
                        onClick={() => handleOpen(product.id as "jewel" | "oil" | "fashion")}
                        data-testid={`button-request-${product.id}`}
                      >
                        <UserPlus className="h-4 w-4 me-2" />
                        {isAr ? "طلب الاشتراك" : "Request Access"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full mt-1 text-muted-foreground"
                      disabled
                      data-testid={`button-product-${product.id}`}
                    >
                      {isAr ? "قريباً..." : "Coming Soon..."}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Pricing Section ─────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            {isAr ? "الأسعار" : "Pricing"}
          </h2>
          <p className="text-3xl font-extrabold">
            {isAr ? "اشتراك شهري قياسي واحد" : "One Standard Monthly Plan"}
          </p>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
            {isAr
              ? "سعر موحّد لجميع أنظمة نقاط البيع — اختر النظام المناسب لقطاعك واحصل على كل المزايا"
              : "One flat price for every POS system — pick the right system for your industry and get full access"}
          </p>
        </div>

        {/* Unified price banner */}
        <div
          className="rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-8 mb-10 text-center shadow-lg"
          data-testid="pricing-standard-banner"
        >
          <Badge className="bg-amber-500 text-white px-3 py-0.5 text-[11px] mb-4">
            <Star className="h-3 w-3 me-1" />
            {isAr ? "الخطة القياسية" : "Standard Plan"}
          </Badge>
          <div className="flex items-end justify-center gap-2 mb-2">
            <span className="text-5xl font-extrabold tracking-tight" data-testid="price-monthly">
              {fmtPrice(pricing.monthly)}
            </span>
            <span className="text-lg text-muted-foreground mb-2">
              {isAr ? "د.ع / شهر" : "IQD / month"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            {isAr
              ? "ينطبق على JewelPOS و FashionPOS و FactoryPOS وجميع الأنظمة القادمة"
              : "Applies to JewelPOS, FashionPOS, FactoryPOS, and all upcoming systems"}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground max-w-3xl mx-auto text-start">
            {(isAr ? PLATFORM_INCLUDES.ar : PLATFORM_INCLUDES.en).map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Per-system feature details */}
        <h3 className="text-center text-lg font-bold mb-6">
          {isAr ? "ما يشمله كل نظام" : "What's Included in Each System"}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {POS_PRICING_PLANS.map((plan) => {
            const Icon = plan.icon;
            const features = isAr ? plan.featuresAr : plan.features;
            return (
              <div
                key={plan.id}
                className="rounded-2xl border bg-card overflow-hidden flex flex-col"
                data-testid={`pricing-plan-${plan.id}`}
              >
                <div className={`h-2 w-full bg-gradient-to-r ${plan.gradient}`} />
                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${plan.gradient} shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{isAr ? plan.nameAr : plan.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {isAr ? plan.subtitleAr : plan.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end gap-1 py-2 border-y">
                    <span className="text-2xl font-extrabold" data-testid={`price-${plan.id}`}>
                      {fmtPrice(pricing.monthly)}
                    </span>
                    <span className="text-xs text-muted-foreground mb-1">
                      {isAr ? "د.ع/شهر" : "IQD/mo"}
                    </span>
                  </div>

                  <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle className={`h-4 w-4 ${plan.accent} flex-shrink-0 mt-0.5`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full bg-gradient-to-r ${plan.gradient} text-white border-0`}
                    onClick={() => handleOpen(plan.id)}
                    data-testid={`button-pricing-${plan.id}`}
                  >
                    <UserPlus className="h-4 w-4 me-2" />
                    {isAr ? "اطلب الاشتراك" : "Request Subscription"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <IqPosLogo size={22} />
          <span className="font-semibold text-sm">IQ-POS</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isAr ? "جميع الحقوق محفوظة © 2026 IQ-POS" : "© 2026 IQ-POS Platform. All rights reserved."}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">www.IQ-pos.com</p>
        <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">+964 781 624 4402</p>
      </footer>

      {/* Sign-up Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir={isAr ? "rtl" : "ltr"}>
          {!submitted ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                  {isAr ? "طلب الاشتراك في IQ-POS" : "Request Access to IQ-POS"}
                </DialogTitle>
                <DialogDescription>
                  {isAr
                    ? "أرسل طلبك وسيتواصل معك فريقنا في أقرب وقت."
                    : "Submit your request and our team will get back to you shortly."}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                {/* POS System selector */}
                <div className="space-y-1.5">
                  <Label>{isAr ? "اختر نظام نقطة البيع" : "Choose POS System"}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, posSystem: "jewel" }))}
                      data-testid="pos-select-jewel"
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        form.posSystem === "jewel"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-border hover:border-amber-300 bg-card"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                        <Gem className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-semibold">JewelPOS</span>
                      <span className="text-[10px] text-muted-foreground">{isAr ? "مجوهرات" : "Jewelry"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, posSystem: "fashion" }))}
                      data-testid="pos-select-fashion"
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        form.posSystem === "fashion"
                          ? "border-pink-500 bg-pink-50 dark:bg-pink-950/30"
                          : "border-border hover:border-pink-300 bg-card"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <Shirt className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-semibold">FashionPOS</span>
                      <span className="text-[10px] text-muted-foreground">{isAr ? "ملابس" : "Clothing"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, posSystem: "oil" }))}
                      data-testid="pos-select-oil"
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        form.posSystem === "oil"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-border hover:border-blue-300 bg-card"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                        <Droplets className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-semibold">FactoryPOS</span>
                      <span className="text-[10px] text-muted-foreground">{isAr ? "زيوت" : "Factory"}</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="req-name">{isAr ? "الاسم الكامل" : "Full Name"} *</Label>
                  <Input
                    id="req-name"
                    data-testid="input-signup-name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={isAr ? "محمد علي" : "John Smith"}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                {/* Business Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="req-business">{isAr ? "اسم المحل / الشركة" : "Business Name"} *</Label>
                  <Input
                    id="req-business"
                    data-testid="input-signup-business"
                    value={form.businessName}
                    onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                    placeholder={isAr ? "مجوهرات النور" : "Golden Jewelers"}
                  />
                  {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="req-phone">{isAr ? "رقم الهاتف" : "Phone Number"} *</Label>
                  <Input
                    id="req-phone"
                    data-testid="input-signup-phone"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+964 7xx xxx xxxx"
                    dir="ltr"
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                {/* Email (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="req-email">
                    {isAr ? "البريد الإلكتروني" : "Email"}{" "}
                    <span className="text-muted-foreground text-xs">({isAr ? "اختياري" : "optional"})</span>
                  </Label>
                  <Input
                    id="req-email"
                    data-testid="input-signup-email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    dir="ltr"
                  />
                </div>

                {/* Notes (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="req-notes">
                    {isAr ? "ملاحظات" : "Additional Notes"}{" "}
                    <span className="text-muted-foreground text-xs">({isAr ? "اختياري" : "optional"})</span>
                  </Label>
                  <Textarea
                    id="req-notes"
                    data-testid="input-signup-notes"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={isAr ? "أي تفاصيل إضافية..." : "Any additional details..."}
                    rows={2}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={mutation.isPending}
                  data-testid="button-signup-submit"
                >
                  {mutation.isPending ? (
                    <>{isAr ? "جاري الإرسال..." : "Sending..."}</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 me-2" />
                      {isAr ? "إرسال الطلب" : "Send Request"}
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold text-xl">
                {isAr ? "تم إرسال طلبك!" : "Request Sent!"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                {isAr
                  ? "شكراً لك. سيتواصل معك فريقنا قريباً على الرقم الذي قدمته."
                  : "Thank you! Our team will contact you soon on the phone number you provided."}
              </p>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-testid="button-signup-close"
                className="mt-2"
              >
                {isAr ? "إغلاق" : "Close"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
