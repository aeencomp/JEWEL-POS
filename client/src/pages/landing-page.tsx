import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

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
  iconBg: string;
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
    iconBg: "bg-amber-500",
    available: true,
    href: "/store-portal",
    tags: ["Jewelry", "Repairs", "Layaway"],
    tagsAr: ["مجوهرات", "إصلاحات", "تقسيط"],
  },
  {
    id: "oil",
    name: "OilPOS",
    nameAr: "نقطة بيع الزيوت",
    description: "Complete oil factory management — production, inventory, sales, purchases, expenses & accounting.",
    descriptionAr: "إدارة شاملة لمصنع الزيوت — الإنتاج، المخزون، المبيعات، المشتريات، المصاريف والمحاسبة.",
    icon: Droplets,
    gradient: "from-blue-600 to-cyan-600",
    iconBg: "bg-blue-600",
    available: true,
    href: "/oil",
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
    iconBg: "bg-green-500",
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
    iconBg: "bg-orange-500",
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
    iconBg: "bg-pink-500",
    available: false,
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
    iconBg: "bg-teal-500",
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

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const isAr = language === "ar";

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
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/store-portal")}
              data-testid="button-header-login"
            >
              {isAr ? "تسجيل الدخول" : "Sign In"}
            </Button>
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
                onClick={() => product.available && product.href && navigate(product.href)}
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
                    <Button
                      className={`w-full bg-gradient-to-r ${product.gradient} text-white border-0 mt-1 group-hover:opacity-90`}
                      onClick={(e) => { e.stopPropagation(); navigate(product.href!); }}
                      data-testid={`button-product-${product.id}`}
                    >
                      {isAr ? "ابدأ الآن" : "Get Started"}
                      <ArrowRight className="h-4 w-4 ms-2" />
                    </Button>
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

      <footer className="border-t py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <IqPosLogo size={22} />
          <span className="font-semibold text-sm">IQ-POS</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isAr ? "جميع الحقوق محفوظة © 2025 IQ-POS" : "© 2025 IQ-POS Platform. All rights reserved."}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">www.IQ-pos.com</p>
      </footer>
    </div>
  );
}
