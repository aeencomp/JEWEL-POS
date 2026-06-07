import { useLanguage } from "@/hooks/use-language";

export function DemoLoginHint() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  return (
    <p className="text-center text-xs text-muted-foreground/70 mt-3">
      {isAr ? "حساب تجريبي لكل الأنظمة: demo / demo123" : "Universal demo account: demo / demo123"}
    </p>
  );
}
