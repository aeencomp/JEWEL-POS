import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PwaInstallBanner({ label, labelAr, isAr }: { label: string; labelAr: string; isAr?: boolean }) {
  const { canShow, install, dismiss } = useInstallPrompt();
  if (!canShow) return null;

  return (
    <div className="mx-4 mb-3 rounded-xl border bg-card p-3 flex items-center gap-3 shadow-sm">
      <Download className="h-5 w-5 text-orange-600 shrink-0" />
      <p className="text-xs flex-1 text-muted-foreground">{isAr ? labelAr : label}</p>
      <Button size="sm" className="h-8 bg-orange-600 hover:bg-orange-700 shrink-0" onClick={() => install()}>
        {isAr ? "تثبيت" : "Install"}
      </Button>
      <button type="button" onClick={dismiss} className="p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
