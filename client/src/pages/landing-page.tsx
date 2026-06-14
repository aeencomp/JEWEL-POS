import { useState, useEffect } from "react";
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
  Check,
  Globe,
  Zap,
  Shield,
  BarChart3,
  Star,
  UserPlus,
  Send,
  LogIn,
  Cloud,
  Headphones,
  RefreshCw,
  BadgeCheck,
  User,
  Building2,
  Phone,
  Mail,
  Loader2,
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
    description: "Restaurant POS + IQ Order delivery app — tables, kitchen, QR ordering & Toters-style food delivery.",
    descriptionAr: "نقطة بيع مطاعم + تطبيق طلب IQ للتوصيل — طاولات، مطبخ، QR وتوصيل طعام.",
    icon: Utensils,
    gradient: "from-orange-500 to-red-500",
    available: true,
    href: "/restaurant-login",
    tags: ["Restaurant", "IQ Order", "Delivery"],
    tagsAr: ["مطعم", "طلب IQ", "توصيل"],
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
    available: true,
    href: "/pharmacy-login",
    tags: ["Pharmacy", "Prescriptions", "Stock"],
    tagsAr: ["صيدلية", "وصفات", "مخزون"],
  },
];

const features = [
  { icon: Globe, label: "Bilingual (EN/AR) + RTL", labelAr: "ثنائي اللغة + RTL" },
  { icon: Zap, label: "Fast cloud performance", labelAr: "أداء سريع عبر الإنترنت" },
  { icon: Shield, label: "Secure & Cloud-backed", labelAr: "آمن ومدعوم بالسحابة" },
  { icon: BarChart3, label: "Built-in Analytics", labelAr: "تحليلات مدمجة" },
];

type SignupForm = {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  posSystem: "jewel" | "oil" | "fashion" | "restaurant" | "pharmacy";
  notes: string;
};

type Pricing = { monthly: number };

const DEFAULT_PRICING: Pricing = { monthly: 45000 };

type PosPricingPlan = {
  id: "jewel" | "fashion" | "oil" | "restaurant" | "pharmacy";
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
  {
    id: "restaurant",
    name: "RestoPOS",
    nameAr: "نقطة بيع المطاعم",
    subtitle: "Restaurants & Cafés",
    subtitleAr: "المطاعم والمقاهي",
    icon: Utensils,
    gradient: "from-orange-500 to-red-500",
    accent: "text-orange-500",
    features: [
      "Table management & floor plan",
      "Staff POS — take orders at the table",
      "QR ordering — guests order from their phone",
      "Kitchen display system (KDS)",
      "Menu categories & item management",
      "Order status flow (new → preparing → ready → served)",
      "Order history & payment tracking",
      "QR code links per table",
      "Custom store branding (logo & colors)",
      "Bilingual interface (English / Arabic + RTL)",
    ],
    featuresAr: [
      "إدارة الطاولات ومخطط الصالة",
      "نقطة بيع للموظفين — أخذ الطلبات من الطاولة",
      "طلب عبر QR — الضيوف يطلبون من هواتفهم",
      "شاشة عرض المطبخ (KDS)",
      "إدارة فئات القائمة والأطباق",
      "تدفق حالة الطلب (جديد → تحضير → جاهز → تقديم)",
      "سجل الطلبات ومتابعة الدفع",
      "روابط QR لكل طاولة",
      "علامة تجارية مخصصة (شعار وألوان)",
      "واجهة ثنائية اللغة (عربي / إنجليزي + RTL)",
    ],
  },
  {
    id: "pharmacy",
    name: "PharmaPOS",
    nameAr: "نقطة بيع الصيدلية",
    subtitle: "Pharmacies & Drug Stores",
    subtitleAr: "الصيدليات ومحلات الأدوية",
    icon: Pill,
    gradient: "from-teal-500 to-cyan-500",
    accent: "text-teal-500",
    features: [
      "Pharmacy POS with barcode scanning",
      "Drug inventory with batch & expiry tracking",
      "Prescription registration & dispensing",
      "Expiry alerts (expired & expiring soon)",
      "Rx-only drug flagging",
      "Customer management",
      "Sales history & order tracking",
      "Stock audit & inventory counts",
      "Pharmacy reports & top sellers",
      "Custom store branding (logo & colors)",
      "Cloud backup & data export",
      "Receipt printing (thermal + A4)",
      "Bilingual interface (English / Arabic + RTL)",
    ],
    featuresAr: [
      "نقطة بيع صيدلية مع مسح الباركود",
      "مخزون أدوية مع تتبع الدفعات والصلاحية",
      "تسجيل وصرف الوصفات الطبية",
      "تنبيهات الصلاحية (منتهية وقريبة الانتهاء)",
      "تمييز الأدوية التي تتطلب وصفة",
      "إدارة العملاء",
      "سجل المبيعات ومتابعة الطلبات",
      "جرد المخزون والعد الدوري",
      "تقارير الصيدلية وأكثر الأدوية مبيعاً",
      "علامة تجارية مخصصة (شعار وألوان)",
      "نسخ احتياطي سحابي وتصدير البيانات",
      "طباعة الفواتير (حرارية + A4)",
      "واجهة ثنائية اللغة (عربي / إنجليزي + RTL)",
    ],
  },
];

const PLATFORM_INCLUDES = {
  en: [
    { icon: Cloud, text: "Cloud-hosted — access from any device" },
    { icon: Shield, text: "Secure login with optional email verification (2FA)" },
    { icon: Headphones, text: "Dedicated technical support" },
    { icon: RefreshCw, text: "Free updates & new features" },
    { icon: BadgeCheck, text: "One flat monthly price — no hidden fees" },
  ],
  ar: [
    { icon: Cloud, text: "استضافة سحابية — الوصول من أي جهاز" },
    { icon: Shield, text: "تسجيل دخول آمن مع تحقق بالبريد الإلكتروني (اختياري)" },
    { icon: Headphones, text: "دعم فني مخصص" },
    { icon: RefreshCw, text: "تحديثات مجانية وميزات جديدة" },
    { icon: BadgeCheck, text: "سعر شهري ثابت — بدون رسوم خفية" },
  ],
};

function fmtPrice(n: number) {
  return n.toLocaleString("en-US");
}

const SIGNUP_POS_OPTIONS = [
  {
    id: "jewel" as const,
    label: "JewelPOS",
    subEn: "Jewelry",
    subAr: "مجوهرات",
    icon: Gem,
    gradient: "from-amber-500 to-yellow-600",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-50 dark:bg-amber-950/30",
    hoverBorder: "hover:border-amber-300",
  },
  {
    id: "fashion" as const,
    label: "FashionPOS",
    subEn: "Clothing",
    subAr: "ملابس",
    icon: Shirt,
    gradient: "from-pink-500 to-purple-600",
    activeBorder: "border-pink-500",
    activeBg: "bg-pink-50 dark:bg-pink-950/30",
    hoverBorder: "hover:border-pink-300",
  },
  {
    id: "oil" as const,
    label: "FactoryPOS",
    subEn: "Factory",
    subAr: "زيوت",
    icon: Droplets,
    gradient: "from-blue-600 to-cyan-600",
    activeBorder: "border-blue-500",
    activeBg: "bg-blue-50 dark:bg-blue-950/30",
    hoverBorder: "hover:border-blue-300",
  },
  {
    id: "restaurant" as const,
    label: "RestoPOS",
    subEn: "Restaurant",
    subAr: "مطعم",
    icon: Utensils,
    gradient: "from-orange-500 to-red-500",
    activeBorder: "border-orange-500",
    activeBg: "bg-orange-50 dark:bg-orange-950/30",
    hoverBorder: "hover:border-orange-300",
  },
  {
    id: "pharmacy" as const,
    label: "PharmaPOS",
    subEn: "Pharmacy",
    subAr: "صيدلية",
    icon: Pill,
    gradient: "from-teal-500 to-cyan-500",
    activeBorder: "border-teal-500",
    activeBg: "bg-teal-50 dark:bg-teal-950/30",
    hoverBorder: "hover:border-teal-300",
  },
];

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
  const [activePlan, setActivePlan] = useState<"jewel" | "fashion" | "oil" | "restaurant" | "pharmacy">("jewel");
  const [form, setForm] = useState<SignupForm>({
    name: "",
    businessName: "",
    phone: "",
    email: "",
    posSystem: "jewel",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<SignupForm>>({});

  useEffect(() => {
    document.documentElement.classList.add("landing-scroll");
    return () => document.documentElement.classList.remove("landing-scroll");
  }, []);

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.name.trim()) e.name = isAr ? "الاسم مطلوب" : "Name is required";
    if (!form.businessName.trim()) e.businessName = isAr ? "اسم العمل مطلوب" : "Business name is required";
    if (!form.phone.trim()) e.phone = isAr ? "رقم الهاتف مطلوب" : "Phone is required";
    if (!form.email.trim()) {
      e.email = isAr ? "البريد الإلكتروني مطلوب" : "Email is required";
    } else if (!emailRegex.test(form.email.trim())) {
      e.email = isAr ? "بريد إلكتروني غير صالح" : "Invalid email address";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  function handleOpen(preselect?: "jewel" | "oil" | "fashion" | "restaurant") {
    setSubmitted(false);
    setErrors({});
    setForm({ name: "", businessName: "", phone: "", email: "", posSystem: preselect ?? "jewel", notes: "" });
    setDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-lg shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <IqPosLogo size={34} />
            <span className="font-bold text-lg tracking-tight">IQ-POS</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-muted-foreground"
              onClick={() => document.getElementById("industries")?.scrollIntoView({ behavior: "smooth" })}
            >
              {isAr ? "الأنظمة" : "Systems"}
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 hidden sm:inline-flex"
              onClick={() => handleOpen()}
            >
              {isAr ? "اطلب الاشتراك" : "Get Started"}
            </Button>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 end-0 w-[480px] h-[480px] bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-[360px] h-[360px] bg-orange-400/8 dark:bg-orange-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/30 px-3.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-6">
                <Star className="h-3.5 w-3.5" />
                {isAr ? "منصة نقاط البيع العراقية" : "Iraqi POS Platform"}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.15] mb-5">
                {isAr ? (
                  <>
                    نقطة البيع المثالية
                    <br />
                    <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                      لكل قطاع
                    </span>
                  </>
                ) : (
                  <>
                    The Perfect POS
                    <br />
                    <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                      for Every Business
                    </span>
                  </>
                )}
              </h1>

              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                {isAr
                  ? "أنظمة نقاط بيع متخصصة لمحلات المجوهرات والملابس والمصانع — مصممة للسوق العراقي والعالمي ، ثنائية اللغة، وجاهزة للعمل."
                  : "Specialized POS systems for jewelry, fashion, and factories — built for the Iraqi market, bilingual, and ready to run."}
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-10">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-amber-500/20 border-0"
                  onClick={() => handleOpen()}
                >
                  <UserPlus className="h-4 w-4 me-2" />
                  {isAr ? "اطلب الاشتراك" : "Request Access"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-6 rounded-xl"
                  onClick={() => document.getElementById("industries")?.scrollIntoView({ behavior: "smooth" })}
                >
                  {isAr ? "استكشف الأنظمة" : "Explore Systems"}
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto lg:mx-0">
                {features.map(({ icon: Icon, label, labelAr }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm p-3.5 text-start shadow-sm hover:shadow-md hover:border-amber-200/60 dark:hover:border-amber-800/40 transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground/90 leading-snug pt-1.5">
                      {isAr ? labelAr : label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-4 bg-gradient-to-br from-amber-500/20 to-orange-600/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl border border-border/80 bg-card shadow-2xl shadow-black/5 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-muted/40">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium ms-2">IQ-POS Dashboard</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Gem, label: "JewelPOS", color: "from-amber-500 to-yellow-600", sales: "2.4M" },
                      { icon: Shirt, label: "FashionPOS", color: "from-pink-500 to-purple-600", sales: "1.8M" },
                      { icon: Droplets, label: "FactoryPOS", color: "from-blue-600 to-cyan-600", sales: "5.1M" },
                    ].map(({ icon: Icon, label, color, sales }) => (
                      <div key={label} className="rounded-xl border border-border/60 p-3 bg-background/50">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-[10px] font-bold truncate">{label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{sales} IQD</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold">{isAr ? "مبيعات اليوم" : "Today's Sales"}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        +12%
                      </Badge>
                    </div>
                    <div className="flex items-end gap-1.5 h-16">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-amber-600 to-amber-400 opacity-80"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg border border-border/60 px-3 py-2 flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[10px] text-muted-foreground">{isAr ? "تقارير فورية" : "Live reports"}</span>
                    </div>
                    <div className="flex-1 rounded-lg border border-border/60 px-3 py-2 flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[10px] text-muted-foreground">{isAr ? "آمن وسحابي" : "Secure cloud"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="industries" className="max-w-6xl mx-auto px-4 pb-20 pt-4 scroll-mt-20">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
            {isAr ? "الأنظمة" : "Systems"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isAr ? "اختر قطاع عملك" : "Select Your Industry"}
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
            {isAr
              ? "ثلاثة أنظمة متخصصة جاهزة الآن — والمزيد قريباً"
              : "Three specialized systems live now — more coming soon"}
          </p>
        </div>

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
                        onClick={() => handleOpen(product.id as "jewel" | "oil" | "fashion" | "restaurant")}
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
      <section className="relative py-20 overflow-hidden border-t">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 via-background to-background dark:from-slate-950 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(251,191,36,0.18),transparent)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent dark:via-amber-500/40" />

        <div className="relative max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25 text-xs px-3 py-1">
              {isAr ? "الأسعار" : "Pricing"}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              {isAr ? "اشتراك شهري قياسي واحد" : "One Standard Monthly Plan"}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              {isAr
                ? "سعر موحّد لجميع أنظمة نقاط البيع — اختر النظام المناسب لقطاعك واحصل على كل المزايا"
                : "One flat price for every POS system — pick the right system for your industry and get full access"}
            </p>
          </div>

          {/* Hero pricing card */}
          <div
            className="grid lg:grid-cols-5 rounded-3xl overflow-hidden border border-border bg-card shadow-xl dark:border-white/10 dark:shadow-2xl dark:shadow-black/40 mb-14"
            data-testid="pricing-standard-banner"
          >
            <div className="lg:col-span-2 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-8 sm:p-10 flex flex-col justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-semibold text-white/90 mb-6">
                  <Star className="h-3 w-3" />
                  {isAr ? "الخطة القياسية" : "Standard Plan"}
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-none"
                    data-testid="price-monthly"
                  >
                    {fmtPrice(pricing.monthly)}
                  </span>
                  <span className="text-lg text-amber-100/80 font-medium">
                    {isAr ? "د.ع / شهر" : "IQD / mo"}
                  </span>
                </div>
                <p className="text-amber-100/70 text-sm mt-4 leading-relaxed">
                  {isAr
                    ? "ينطبق على JewelPOS و FashionPOS و FactoryPOS وجميع الأنظمة القادمة"
                    : "Applies to JewelPOS, FashionPOS, FactoryPOS, and all upcoming systems"}
                </p>
              </div>
              <Button
                size="lg"
                className="w-full bg-white text-amber-700 hover:bg-amber-50 font-semibold shadow-lg shadow-black/10 border-0"
                onClick={() => handleOpen()}
                data-testid="button-pricing-hero"
              >
                <UserPlus className="h-4 w-4 me-2" />
                {isAr ? "اطلب الاشتراك الآن" : "Request Subscription"}
                <ArrowRight className="h-4 w-4 ms-2" />
              </Button>
            </div>

            <div className="lg:col-span-3 bg-card dark:bg-slate-900/90 p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
                {isAr ? "يشمل كل اشتراك" : "Every subscription includes"}
              </p>
              <ul className="space-y-4">
                {(isAr ? PLATFORM_INCLUDES.ar : PLATFORM_INCLUDES.en).map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-4 group">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors">
                      <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm text-foreground/80 dark:text-slate-300 leading-relaxed pt-1.5">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Per-system details with tabs */}
          <div>
            <div className="text-center mb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {isAr ? "ما يشمله كل نظام" : "What's Included in Each System"}
              </h3>
              <p className="text-muted-foreground text-sm mt-2">
                {isAr ? "اختر نظامك لعرض المزايا الكاملة" : "Select your system to view the full feature list"}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-6 p-1.5 bg-muted border border-border dark:bg-slate-900/60 dark:border-white/10 rounded-2xl max-w-2xl mx-auto">
              {POS_PRICING_PLANS.map((plan) => {
                const Icon = plan.icon;
                const isActive = activePlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setActivePlan(plan.id)}
                    data-testid={`tab-pricing-${plan.id}`}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${plan.gradient} text-white shadow-lg`
                        : "text-muted-foreground hover:text-foreground hover:bg-background dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {isAr ? plan.nameAr : plan.name}
                  </button>
                );
              })}
            </div>

            {POS_PRICING_PLANS.filter((p) => p.id === activePlan).map((plan) => {
              const Icon = plan.icon;
              const features = isAr ? plan.featuresAr : plan.features;
              const mid = Math.ceil(features.length / 2);
              const col1 = features.slice(0, mid);
              const col2 = features.slice(mid);
              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-border bg-card shadow-sm dark:border-white/10 dark:bg-slate-900/60 overflow-hidden"
                  data-testid={`pricing-plan-${plan.id}`}
                >
                  <div className={`h-1 w-full bg-gradient-to-r ${plan.gradient}`} />
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border dark:border-white/10">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${plan.gradient} shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-foreground">{isAr ? plan.nameAr : plan.name}</h4>
                          <p className="text-sm text-muted-foreground">{isAr ? plan.subtitleAr : plan.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:text-end">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                            {isAr ? "الاشتراك الشهري" : "Monthly"}
                          </p>
                          <p className="text-2xl font-extrabold text-foreground" data-testid={`price-${plan.id}`}>
                            {fmtPrice(pricing.monthly)}{" "}
                            <span className="text-sm font-medium text-muted-foreground">
                              {isAr ? "د.ع" : "IQD"}
                            </span>
                          </p>
                        </div>
                        <Button
                          className={`bg-gradient-to-r ${plan.gradient} text-white border-0 shrink-0`}
                          onClick={() => handleOpen(plan.id)}
                          data-testid={`button-pricing-${plan.id}`}
                        >
                          {isAr ? "اطلب الآن" : "Get Started"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-x-10 gap-y-3">
                      {[col1, col2].map((col, ci) => (
                        <ul key={ci} className="space-y-3">
                          {col.map((feature) => (
                            <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gradient-to-br ${plan.gradient} opacity-90`}>
                                <Check className="h-3 w-3 text-white" strokeWidth={3} />
                              </div>
                              <span className="leading-relaxed">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-3">
              <IqPosLogo size={36} />
              <div className="text-start">
                <p className="font-bold text-base tracking-tight">IQ-POS</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "منصة نقاط البيع العراقية" : "Iraqi Point of Sale Platform"}
                </p>
              </div>
            </div>

            <a
              href="https://www.iq-pos.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors w-fit"
            >
              <Globe className="h-4 w-4" />
              <span dir="ltr">www.iq-pos.com</span>
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <p>
              {isAr ? "© 2026 IQ-POS. جميع الحقوق محفوظة." : "© 2026 IQ-POS Platform. All rights reserved."}
            </p>
            <p className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 opacity-60" />
              {isAr ? "آمن · سحابي · ثنائي اللغة" : "Secure · Cloud · Bilingual"}
            </p>
          </div>
        </div>
      </footer>

      {/* Sign-up Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-md w-[calc(100%-1.5rem)] p-0 gap-0 overflow-hidden border shadow-2xl max-h-[min(90dvh,640px)] !flex flex-col"
          dir={isAr ? "rtl" : "ltr"}
        >
          {!submitted ? (
            <>
              <div className="shrink-0 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-4 py-3">
                <DialogHeader className="space-y-0.5 text-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <UserPlus className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-white text-base font-bold leading-tight">
                        {isAr ? "طلب الاشتراك في IQ-POS" : "Request Access to IQ-POS"}
                      </DialogTitle>
                      <DialogDescription className="text-amber-100/85 text-xs mt-0.5 line-clamp-2">
                        {isAr
                          ? "أرسل طلبك وسيتواصل معك فريقنا في أقرب وقت."
                          : "Submit your request and our team will get back to you shortly."}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 bg-card overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3.5 landing-scroll">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {isAr ? "اختر نظام نقطة البيع" : "Choose POS System"}
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SIGNUP_POS_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = form.posSystem === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, posSystem: opt.id }))}
                            data-testid={`pos-select-${opt.id}`}
                            className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-200 ${
                              isSelected
                                ? `${opt.activeBorder} ${opt.activeBg} shadow-sm ring-1 ring-offset-1 ring-offset-background ${
                                    opt.id === "jewel" ? "ring-amber-500/40" : opt.id === "fashion" ? "ring-pink-500/40" : opt.id === "restaurant" ? "ring-orange-500/40" : "ring-blue-500/40"
                                  }`
                                : `border-border bg-background ${opt.hoverBorder} hover:shadow-sm`
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center shadow-sm`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-[10px] font-bold leading-tight text-center">{opt.label}</span>
                            <span className="text-[9px] text-muted-foreground">{isAr ? opt.subAr : opt.subEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="req-name" className="text-xs font-medium">
                        {isAr ? "الاسم الكامل" : "Full Name"} <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="req-name"
                          data-testid="input-signup-name"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder={isAr ? "محمد علي" : "John Smith"}
                          className={`h-9 ps-9 text-sm rounded-lg ${errors.name ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="req-business" className="text-xs font-medium">
                        {isAr ? "اسم المحل / الشركة" : "Business Name"} <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="req-business"
                          data-testid="input-signup-business"
                          value={form.businessName}
                          onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                          placeholder={isAr ? "مجوهرات النور" : "Golden Jewelers"}
                          className={`h-9 ps-9 text-sm rounded-lg ${errors.businessName ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.businessName && <p className="text-[11px] text-destructive">{errors.businessName}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="req-phone" className="text-xs font-medium">
                        {isAr ? "رقم الهاتف" : "Phone Number"} <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="req-phone"
                          data-testid="input-signup-phone"
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="+964 7xx xxx xxxx"
                          dir="ltr"
                          className={`h-9 ps-9 text-sm rounded-lg ${errors.phone ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="req-email" className="text-xs font-medium">
                        {isAr ? "البريد الإلكتروني" : "Email Address"} <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="req-email"
                          data-testid="input-signup-email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="you@example.com"
                          dir="ltr"
                          className={`h-9 ps-9 text-sm rounded-lg ${errors.email ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="req-notes" className="text-xs font-medium">
                      {isAr ? "ملاحظات" : "Additional Notes"}{" "}
                      <span className="text-muted-foreground font-normal">({isAr ? "اختياري" : "optional"})</span>
                    </Label>
                    <Textarea
                      id="req-notes"
                      data-testid="input-signup-notes"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder={isAr ? "أي تفاصيل إضافية..." : "Any additional details..."}
                      rows={2}
                      className="rounded-lg resize-none text-sm min-h-[4rem]"
                    />
                  </div>
                </div>

                <div className="shrink-0 border-t border-border bg-card p-3 pt-2">
                  <Button
                    type="submit"
                    className="w-full h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-md shadow-amber-500/20 border-0 text-sm"
                    disabled={mutation.isPending}
                    data-testid="button-signup-submit"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        {isAr ? "جاري الإرسال..." : "Sending..."}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 me-2" />
                        {isAr ? "إرسال الطلب" : "Send Request"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="py-10 px-6 text-center space-y-4 bg-card">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto ring-4 ring-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold text-xl">
                {isAr ? "تم إرسال طلبك!" : "Request Sent!"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                {isAr
                  ? "شكراً لك. سيتواصل معك فريقنا قريباً عبر الهاتف أو البريد الإلكتروني."
                  : "Thank you! Our team will contact you soon via phone or email."}
              </p>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-testid="button-signup-close"
                className="mt-2 rounded-xl"
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
