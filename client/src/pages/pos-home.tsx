import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PosTerminal, Category } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

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
  const { toast } = useToast();
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Header */}
      <div
        className="px-6 pt-8 pb-10"
        style={{ background: `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}08 100%)` }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain border bg-white" />
              ) : (
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor }}>
                  <Gem className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-pos-home-title">
                  {branding?.name || "JewelPOS"}
                </h1>
                <p className="text-sm text-muted-foreground">{t("pos.selectTerminal")}</p>
              </div>
            </div>
            <Button
              variant={manageMode ? "default" : "outline"}
              size="sm"
              onClick={() => setManageMode(!manageMode)}
              data-testid="button-manage-terminals"
              className="gap-2"
            >
              {manageMode ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
              {manageMode ? t("common.cancel") : t("pos.manageTerminals")}
            </Button>
          </div>
        </div>
      </div>

      {/* Terminal Grid */}
      <div className="max-w-5xl mx-auto px-6 -mt-4 pb-10">
        {terminals.length === 0 && !manageMode ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1" data-testid="text-no-terminals">{t("pos.noTerminals")}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t("pos.noTerminalsHint")}</p>
            <Button onClick={() => { setManageMode(true); openAdd(); }} data-testid="button-create-first-terminal">
              <Plus className="h-4 w-4 me-2" />
              {t("pos.addTerminal")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {terminals.map((terminal) => {
              const catName = categories.find((c) => c.id === terminal.categoryId)?.name;
              return (
                <Card
                  key={terminal.id}
                  className={`group relative overflow-hidden border-0 shadow-md transition-all duration-200 ${!manageMode ? "cursor-pointer hover:shadow-xl hover:-translate-y-1" : ""}`}
                  onClick={() => !manageMode && navigate(`/pos/${terminal.id}`)}
                  data-testid={`card-terminal-${terminal.id}`}
                  style={{ background: `linear-gradient(135deg, ${terminal.color}18 0%, ${terminal.color}08 100%)` }}
                >
                  {/* Colored left accent bar */}
                  <div className="absolute start-0 top-0 bottom-0 w-1 rounded-s-lg" style={{ backgroundColor: terminal.color }} />

                  <CardContent className="ps-5 pe-4 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: terminal.color + "25", color: terminal.color }}
                        >
                          <TerminalIcon iconName={terminal.icon} size={22} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base leading-tight" data-testid={`text-terminal-name-${terminal.id}`}>
                            {terminal.name}
                          </h3>
                          {terminal.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{terminal.description}</p>
                          )}
                          {catName && (
                            <Badge variant="outline" className="mt-1.5 text-xs px-1.5 py-0 h-5" data-testid={`badge-terminal-cat-${terminal.id}`}>
                              {catName}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {manageMode ? (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-white/80 dark:hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); openEdit(terminal); }}
                            data-testid={`button-edit-terminal-${terminal.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(terminal.id); }}
                            data-testid={`button-delete-terminal-${terminal.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: terminal.color + "20", color: terminal.color }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add New Card (manage mode) */}
            {manageMode && (
              <Card
                className="border-2 border-dashed border-muted-foreground/20 cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/30 transition-all duration-200 shadow-none"
                onClick={openAdd}
                data-testid="card-add-terminal"
              >
                <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{t("pos.addTerminal")}</span>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingTerminal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTerminal ? t("pos.editTerminal") : t("pos.addTerminal")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("pos.terminalName")} *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("pos.terminalName")}
                data-testid="input-terminal-name"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("pos.terminalDescription")}</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("pos.terminalDescription")}
                data-testid="input-terminal-description"
              />
            </div>

            {/* Category Filter */}
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

            {/* Icon Picker */}
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

            {/* Color Picker */}
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

            {/* Live Preview */}
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
