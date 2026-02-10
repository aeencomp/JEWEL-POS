import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setLanguage(language === "en" ? "ar" : "en")}
      data-testid="button-language-toggle"
    >
      <span className="text-xs font-bold">{language === "en" ? "ع" : "EN"}</span>
    </Button>
  );
}
