import {
  Gem,
  Droplets,
  ShoppingBasket,
  Utensils,
  Shirt,
  Pill,
} from "lucide-react";

export type SignupForm = {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  posSystem: "jewel" | "oil" | "fashion" | "restaurant" | "pharmacy" | "grocery";
  notes: string;
};

export const SIGNUP_POS_OPTIONS = [
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
    ring: "ring-amber-500/40",
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
    ring: "ring-pink-500/40",
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
    ring: "ring-blue-500/40",
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
    ring: "ring-orange-500/40",
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
    ring: "ring-teal-500/40",
  },
  {
    id: "grocery" as const,
    label: "GroceryPOS",
    subEn: "Grocery",
    subAr: "بقالة",
    icon: ShoppingBasket,
    gradient: "from-green-500 to-emerald-600",
    activeBorder: "border-green-500",
    activeBg: "bg-green-50 dark:bg-green-950/30",
    hoverBorder: "hover:border-green-300",
    ring: "ring-green-500/40",
  },
];

export function parseSignupPosSystem(value: string | null): SignupForm["posSystem"] {
  const valid = SIGNUP_POS_OPTIONS.map((o) => o.id);
  if (value && valid.includes(value as SignupForm["posSystem"])) {
    return value as SignupForm["posSystem"];
  }
  return "jewel";
}

export function validateSignupForm(form: SignupForm, isAr: boolean): Partial<SignupForm> {
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
  return e;
}
