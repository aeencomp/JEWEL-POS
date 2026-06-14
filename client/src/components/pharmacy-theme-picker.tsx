import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Check } from "lucide-react";

export const PHARMACY_THEME_STORAGE_KEY = "pharmacy-theme-color";
export const PHARMACY_DEFAULT_COLOR = "#0d9488";

export const PHARMACY_PRESET_COLORS = [
  "#0d9488",
  "#0891b2",
  "#059669",
  "#0284c7",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
];

type PharmacyThemePickerProps = {
  color: string;
  onChange: (color: string) => void;
  onSave?: (color: string) => void;
  saving?: boolean;
  variant?: "dark" | "light";
};

export function PharmacyThemePicker({
  color,
  onChange,
  onSave,
  saving,
  variant = "dark",
}: PharmacyThemePickerProps) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);

  function apply(colorHex: string) {
    onChange(colorHex);
    onSave?.(colorHex);
  }

  const triggerClass =
    variant === "dark"
      ? "text-white/60 hover:text-white hover:bg-white/10 border-white/10"
      : "text-muted-foreground hover:text-foreground";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-8 gap-1.5 px-2.5 ${triggerClass}`}
          title={isAr ? "لون السمة" : "Theme color"}
        >
          <span
            className="w-4 h-4 rounded-full ring-1 ring-white/20 shrink-0"
            style={{ background: color }}
          />
          <Palette className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <p className="text-sm font-semibold mb-3">{isAr ? "لون السمة" : "Theme Color"}</p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border bg-transparent"
          />
          <Input
            value={color}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
            }}
            className="font-mono text-xs flex-1"
            maxLength={7}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{isAr ? "ألوان جاهزة" : "Presets"}</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PHARMACY_PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="relative h-8 rounded-lg ring-1 ring-border transition-transform hover:scale-105"
              style={{ background: preset }}
              onClick={() => apply(preset)}
            >
              {color.toLowerCase() === preset && (
                <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow" />
              )}
            </button>
          ))}
        </div>
        {onSave && (
          <Button
            size="sm"
            className="w-full"
            style={{ background: color }}
            disabled={saving || !/^#[0-9a-fA-F]{6}$/.test(color)}
            onClick={() => {
              apply(color);
              setOpen(false);
            }}
          >
            {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ اللون" : "Save Color")}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function loadPharmacyThemeColor(): string {
  if (typeof window === "undefined") return PHARMACY_DEFAULT_COLOR;
  const stored = localStorage.getItem(PHARMACY_THEME_STORAGE_KEY);
  return stored && /^#[0-9a-fA-F]{6}$/.test(stored) ? stored : PHARMACY_DEFAULT_COLOR;
}

export function savePharmacyThemeColor(color: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    localStorage.setItem(PHARMACY_THEME_STORAGE_KEY, color);
  }
}
