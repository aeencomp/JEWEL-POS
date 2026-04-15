import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PosTerminal, Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Gem,
  Store,
  Star,
  Tag,
  CreditCard,
  Package,
  Crown,
  Scissors,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowRight,
  Settings,
  X,
  Watch,
  Coins,
  Layers,
  LogOut,
  Monitor,
} from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

const ICON_OPTIONS = [
  { value: "ShoppingCart", label: "Cart", Icon: ShoppingCart },
  { value: "Gem", label: "Gem", Icon: Gem },
  { value: "Store", label: "Store", Icon: Store },
  { value: "Star", label: "Star", Icon: Star },
  { value: "Tag", label: "Tag", Icon: Tag },
  { value: "CreditCard", label: "Card", Icon: CreditCard },
  { value: "Package", label: "Package", Icon: Package },
  { value: "Crown", label: "Crown", Icon: Crown },
  { value: "Scissors", label: "Scissors", Icon: Scissors },
  { value: "Sparkles", label: "Sparkles", Icon: Sparkles },
  { value: "Watch", label: "Watch", Icon: Watch },
  { value: "Coins", label: "Coins", Icon: Coins },
  { value: "Layers", label: "Layers", Icon: Layers },
];

const COLOR_PRESETS = [
  "#d4a574", "#c49a3c", "#2563eb", "#16a34a",
  "#dc2626", "#9333ea", "#0891b2", "#ea580c",
  "#be185d", "#059669", "#7c3aed", "#475569",
];

function TerminalIcon({ iconName, size = 24 }: { iconName: string; size?: number }) {
  const found = ICON_OPTIONS.find((o) => o.value === iconName);
  const Icon = found?.Icon ?? ShoppingCart;
  return <Icon size={size} />;
}

type FormState = {
  name: string;
  description: string;
  icon: string;
  color: string;
  categoryId: string;
};

const defaultForm: FormState = {
  name: "",
  description: "",
  icon: "ShoppingCart",
  color: "#d4a574",
  categoryId: "all",
};

export default function PosHome() {
  const { t } = useLanguage();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const [manageMode, setManageMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<PosTerminal | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const { data: terminals = [], isLoading } = useQuery<PosTerminal[]>({
    queryKey: ["/api/pos-terminals"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: branding } = useQuery<{ name: string; brandColor: string | null; logoUrl: string | null }>({
    queryKey: ["/api/store/branding"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<FormState, "categoryId"> & { categoryId: number | null }) => {
      const res = await apiRequest("POST", "/api/pos-terminals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos-terminals"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: t("pos.addTerminal") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/pos-terminals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos-terminals"] });
      setDialogOpen(false);
      setEditingTerminal(null);
      setForm(defaultForm);
      toast({ title: t("pos.editTerminal") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/pos-terminals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos-terminals"] });
    },
  });

  function openAdd() {
    setEditingTerminal(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(terminal: PosTerminal) {
    setEditingTerminal(terminal);
    setForm({
      name: terminal.name,
      description: terminal.description || "",
      icon: terminal.icon,
      color: terminal.color,
      categoryId: terminal.categoryId ? String(terminal.categoryId) : "all",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const payload = {
      name: form.name,
      description: form.description || null,
      icon: form.icon,
      color: form.color,
      categoryId: form.categoryId === "all" ? null : parseInt(form.categoryId),
    };
    if (editingTerminal) {
      updateMutation.mutate({ id: editingTerminal.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const brandColor = branding?.brandColor || "#d4a574";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
      {/* Top bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-9 w-9 rounded-xl object-contain bg-white p-0.5" />
          ) : (
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: brandColor }}>
              <Gem className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-white leading-none" data-testid="text-pos-home-title">
              {branding?.name || "JewelPOS"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{isAr ? "اختر نقطة البيع" : t("pos.selectTerminal")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <button
            onClick={() => setManageMode(!manageMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              manageMode
                ? "bg-amber-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            data-testid="button-manage-terminals"
          >
            {manageMode ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            <span className="hidden sm:inline">{manageMode ? t("common.cancel") : t("pos.manageTerminals")}</span>
          </button>
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-slate-800 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("auth.logout")}</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {terminals.length === 0 && !manageMode ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center mb-6 shadow-xl">
              <Monitor className="h-10 w-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2" data-testid="text-no-terminals">{t("pos.noTerminals")}</h3>
            <p className="text-slate-400 text-sm mb-8 max-w-xs">{t("pos.noTerminalsHint")}</p>
            <button
              onClick={() => { setManageMode(true); openAdd(); }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white shadow-lg transition-all hover:opacity-90"
              style={{ backgroundColor: brandColor }}
              data-testid="button-create-first-terminal"
            >
              <Plus className="h-5 w-5" />
              {t("pos.addTerminal")}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                {manageMode ? t("pos.manageTerminals") : (isAr ? "اختر نقطة البيع" : "Choose a Terminal")}
              </h2>
              <p className="text-slate-400 text-sm">
                {manageMode
                  ? (isAr ? "قم بإضافة أو تعديل أو حذف نقاط البيع" : "Add, edit or remove POS terminals")
                  : (isAr ? "انقر على نقطة البيع لبدء البيع" : "Tap a terminal to start selling")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {terminals.map((terminal) => {
                const catName = categories.find((c) => c.id === terminal.categoryId)?.name;
                return (
                  <div
                    key={terminal.id}
                    className={`group relative rounded-2xl overflow-hidden border border-slate-800 transition-all duration-200 ${
                      !manageMode
                        ? "cursor-pointer hover:border-slate-600 hover:shadow-2xl hover:-translate-y-1"
                        : "border-slate-700"
                    }`}
                    onClick={() => !manageMode && navigate(`/pos/${terminal.id}`)}
                    style={{ background: `linear-gradient(135deg, ${terminal.color}18 0%, #0f172a 60%)` }}
                    data-testid={`card-terminal-${terminal.id}`}
                  >
                    {/* Top accent */}
                    <div className="h-1 w-full" style={{ backgroundColor: terminal.color }} />

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: terminal.color + "25", color: terminal.color }}
                        >
                          <TerminalIcon iconName={terminal.icon} size={26} />
                        </div>

                        {manageMode && (
                          <div className="flex gap-1">
                            <button
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                              onClick={(e) => { e.stopPropagation(); openEdit(terminal); }}
                              data-testid={`button-edit-terminal-${terminal.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(terminal.id); }}
                              data-testid={`button-delete-terminal-${terminal.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {!manageMode && (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ backgroundColor: terminal.color + "20", color: terminal.color }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-white mb-1 leading-tight" data-testid={`text-terminal-name-${terminal.id}`}>
                        {terminal.name}
                      </h3>
                      {terminal.description && (
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{terminal.description}</p>
                      )}
                      {catName && (
                        <div className="mt-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: terminal.color + "20", color: terminal.color }}
                            data-testid={`badge-terminal-cat-${terminal.id}`}
                          >
                            {catName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add New Card (manage mode) */}
              {manageMode && (
                <div
                  className="rounded-2xl border-2 border-dashed border-slate-700 cursor-pointer hover:border-slate-500 hover:bg-slate-800/30 transition-all duration-200 flex flex-col items-center justify-center p-8 gap-3"
                  onClick={openAdd}
                  data-testid="card-add-terminal"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
                    <Plus className="h-7 w-7 text-slate-500" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">{t("pos.addTerminal")}</span>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingTerminal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTerminal ? t("pos.editTerminal") : t("pos.addTerminal")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("pos.terminalName")} *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("pos.terminalName")}
                data-testid="input-terminal-name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("pos.terminalDescription")}</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("pos.terminalDescription")}
                data-testid="input-terminal-description"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("pos.filterCategory")}</label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger data-testid="select-terminal-category">
                  <SelectValue placeholder={t("pos.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("pos.allCategories")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Only show inventory from this category in the POS.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("pos.terminalIcon")}</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(({ value, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, icon: value })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all ${
                      form.icon === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                    data-testid={`button-icon-${value}`}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("pos.terminalColor")}</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    data-testid={`button-color-${c.replace("#", "")}`}
                  />
                ))}
                <div className="flex items-center gap-1.5 ms-1">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer border border-border"
                    data-testid="input-terminal-color"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{form.color}</span>
                </div>
              </div>
            </div>

            <div
              className="rounded-xl p-4 flex items-center gap-3 border"
              style={{ background: `linear-gradient(135deg, ${form.color}20 0%, ${form.color}08 100%)` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: form.color + "30", color: form.color }}
              >
                <TerminalIcon iconName={form.icon} size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">{form.name || t("pos.terminalName")}</p>
                {form.description && <p className="text-xs text-muted-foreground">{form.description}</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-terminal">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || isPending} data-testid="button-save-terminal">
              {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
