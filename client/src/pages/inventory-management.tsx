import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, Category } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  Gem,
  Barcode,
  Percent,
  Upload,
  ImageIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import QRCode from "qrcode";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const inventoryFormSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.coerce.number().min(1, "Category is required"),
  metalType: z.enum(["gold", "silver", "platinum", "white_gold", "rose_gold", "other"]),
  purity: z.string().optional(),
  weightGrams: z.string().optional(),
  gemstone: z.string().optional(),
  caratWeight: z.string().optional(),
  costPrice: z.string().min(1, "Cost price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  quantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
  imageUrl: z.string().optional(),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

function generateSku(categories: Category[], categoryId: number, items: InventoryItem[]): string {
  const cat = categories.find((c) => c.id === categoryId);
  const prefix = cat ? cat.name.substring(0, 3).toUpperCase() : "ITM";
  const catItems = items.filter((i) => i.categoryId === categoryId);
  const num = String(catItems.length + 1).padStart(3, "0");
  return `${prefix}-${num}`;
}

function getMetalGradient(metalType: string): string {
  switch (metalType) {
    case "gold":
      return "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600";
    case "silver":
      return "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400";
    case "platinum":
      return "bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-500";
    case "white_gold":
      return "bg-gradient-to-br from-gray-100 via-gray-300 to-gray-400";
    case "rose_gold":
      return "bg-gradient-to-br from-rose-200 via-rose-300 to-rose-400";
    default:
      return "bg-gradient-to-br from-purple-200 via-purple-300 to-purple-400";
  }
}

function BarcodeDisplay({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: 120,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      }).catch(() => {});
    }
  }, [value]);
  return <canvas ref={canvasRef} data-testid="img-barcode" className="rounded" />;
}

export default function InventoryManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [barcodeItem, setBarcodeItem] = useState<InventoryItem | null>(null);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkAdjustType, setBulkAdjustType] = useState<"increase" | "decrease">("increase");
  const [bulkPercentage, setBulkPercentage] = useState("");
  const [bulkApplyTo, setBulkApplyTo] = useState<"cost" | "selling" | "both">("selling");
  const [bulkCategoryId, setBulkCategoryId] = useState<number | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: inventory = [], isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const categoryForm = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const itemForm = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      categoryId: 0,
      metalType: "gold",
      purity: "",
      weightGrams: "",
      gemstone: "",
      caratWeight: "",
      costPrice: "",
      sellingPrice: "",
      quantity: 1,
      imageUrl: "",
    },
  });

  const metalTypeLabels: Record<string, string> = {
    gold: "inventory.gold",
    silver: "inventory.silver",
    platinum: "inventory.platinum",
    white_gold: "inventory.whiteGold",
    rose_gold: "inventory.roseGold",
    other: "inventory.other",
  };

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", "/api/categories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setCategoryDialogOpen(false);
      categoryForm.reset();
      toast({ title: t("inventory.addCategory") });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      if (selectedCategory) setSelectedCategory(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: InventoryFormValues) => {
      const res = await apiRequest("POST", "/api/inventory", { ...data, isAvailable: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setItemDialogOpen(false);
      itemForm.reset();
      toast({ title: t("inventory.addItem") });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InventoryFormValues> }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setItemDialogOpen(false);
      setEditingItem(null);
      itemForm.reset();
      toast({ title: t("inventory.editItem") });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: number; isAvailable: boolean }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, { isAvailable });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: async (data: { adjustmentType: string; percentage: number; applyTo: string; categoryId?: number }) => {
      const res = await apiRequest("PATCH", "/api/inventory/bulk-price", data);
      return res.json();
    },
    onSuccess: (data: { updatedCount: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setBulkPriceOpen(false);
      setBulkConfirmOpen(false);
      setBulkPercentage("");
      toast({ title: `${t("inventory.adjustSuccess")} (${data.updatedCount})` });
    },
  });

  const handleBulkPriceSubmit = () => {
    const pct = parseFloat(bulkPercentage);
    if (!pct || pct <= 0) return;
    setBulkConfirmOpen(true);
  };

  const confirmBulkPrice = () => {
    const pct = parseFloat(bulkPercentage);
    bulkPriceMutation.mutate({
      adjustmentType: bulkAdjustType,
      percentage: pct,
      applyTo: bulkApplyTo,
      ...(bulkCategoryId ? { categoryId: bulkCategoryId } : {}),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type. Use JPG, PNG, GIF, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large. Maximum 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      itemForm.setValue("imageUrl", data.url);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesCategory = selectedCategory ? item.categoryId === selectedCategory : true;
      const matchesSearch = search
        ? item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.sku.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [inventory, selectedCategory, search]);

  function openAddItem() {
    setEditingItem(null);
    const defaultCategoryId = categories.length > 0 ? categories[0].id : 0;
    const sku = defaultCategoryId ? generateSku(categories, defaultCategoryId, inventory) : "";
    itemForm.reset({
      sku,
      name: "",
      description: "",
      categoryId: defaultCategoryId,
      metalType: "gold",
      purity: "",
      weightGrams: "",
      gemstone: "",
      caratWeight: "",
      costPrice: "",
      sellingPrice: "",
      quantity: 1,
      imageUrl: "",
    });
    setItemDialogOpen(true);
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    itemForm.reset({
      sku: item.sku,
      name: item.name,
      description: item.description || "",
      categoryId: item.categoryId,
      metalType: item.metalType as InventoryFormValues["metalType"],
      purity: item.purity || "",
      weightGrams: item.weightGrams || "",
      gemstone: item.gemstone || "",
      caratWeight: item.caratWeight || "",
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      quantity: item.quantity,
      imageUrl: item.imageUrl || "",
    });
    setItemDialogOpen(true);
  }

  function onItemSubmit(values: InventoryFormValues) {
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: values });
    } else {
      createItemMutation.mutate(values);
    }
  }

  function handleCategoryChange(val: string) {
    const catId = Number(val);
    itemForm.setValue("categoryId", catId);
    if (!editingItem) {
      const sku = generateSku(categories, catId, inventory);
      itemForm.setValue("sku", sku);
    }
  }

  const isSubmitting = createItemMutation.isPending || updateItemMutation.isPending;

  if (loadingCategories || loadingInventory) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-card border-b border-slate-200 dark:border-border shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground" data-testid="text-inventory-title">
            {t("inventory.title")}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkPriceOpen(true)}
              className="border-[#d4a574] text-[#d4a574] hover:bg-[#d4a574]/10"
              data-testid="button-bulk-price"
            >
              <Percent className="h-4 w-4 me-2" />
              {t("inventory.bulkPriceAdjust")}
            </Button>
            <Button
              onClick={openAddItem}
              className="bg-[#d4a574] hover:bg-[#c39462] text-white shadow-md"
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4 me-2" />
              {t("inventory.addItem")}
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 space-y-5">
        {/* Category Filter + Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === null
                  ? "bg-[#d4a574] text-white shadow-sm"
                  : "bg-white dark:bg-card text-slate-600 dark:text-muted-foreground border border-slate-200 dark:border-border hover:bg-slate-50"
              }`}
              data-testid="badge-category-all"
            >
              {t("pos.allCategories")} ({inventory.length})
            </button>
            {categories.map((cat) => {
              const count = inventory.filter((i) => i.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-[#d4a574] text-white shadow-sm"
                      : "bg-white dark:bg-card text-slate-600 dark:text-muted-foreground border border-slate-200 dark:border-border hover:bg-slate-50"
                  }`}
                  data-testid={`badge-category-${cat.id}`}
                >
                  {cat.name} ({count})
                  <span
                    role="button"
                    className="ms-0.5 rounded-full opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCategoryMutation.mutate(cat.id);
                    }}
                    data-testid={`button-delete-category-${cat.id}`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                categoryForm.reset();
                setCategoryDialogOpen(true);
              }}
              className="text-[#d4a574] hover:bg-[#d4a574]/10 rounded-full px-3"
              data-testid="button-add-category"
            >
              <Plus className="h-3.5 w-3.5 me-1" />
              {t("inventory.addCategory")}
            </Button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 bg-white dark:bg-card border-slate-200 dark:border-border"
              data-testid="input-search-inventory"
            />
          </div>
        </div>

        {/* Card Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-card rounded-xl border border-dashed border-slate-300 dark:border-border">
            <Gem className="w-12 h-12 text-slate-300 dark:text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-foreground">{t("inventory.noItems")}</h3>
            <p className="text-slate-500 dark:text-muted-foreground mt-1 text-sm" data-testid="text-no-items">
              {t("common.search")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map((item) => {
              const cost = parseFloat(item.costPrice);
              const sell = parseFloat(item.sellingPrice);
              const margin = cost > 0 ? Math.round(((sell - cost) / cost) * 100) : 0;
              const catName = categories.find((c) => c.id === item.categoryId)?.name;

              return (
                <Card
                  key={item.id}
                  className="overflow-hidden border-slate-200 dark:border-border hover:border-[#d4a574]/60 hover:shadow-lg transition-all duration-300 bg-white dark:bg-card group"
                  data-testid={`card-item-${item.id}`}
                >
                  {/* Image / Gradient Header */}
                  <div className={`h-36 w-full relative flex items-center justify-center ${item.imageUrl ? "" : getMetalGradient(item.metalType)}`}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        data-testid={`img-item-${item.id}`}
                      />
                    ) : (
                      <Gem className="w-10 h-10 text-white/50" />
                    )}
                    {/* Metal badge top-start */}
                    <div className="absolute top-2.5 start-2.5">
                      <span className="bg-white/85 backdrop-blur-sm text-slate-900 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                        {t(metalTypeLabels[item.metalType] as any)}
                      </span>
                    </div>
                    {/* Purity badge top-end */}
                    {item.purity && (
                      <div className="absolute top-2.5 end-2.5">
                        <span className="bg-white/85 backdrop-blur-sm text-slate-900 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                          {item.purity}
                        </span>
                      </div>
                    )}
                    {/* Out of stock overlay */}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded">
                          {t("inventory.available") === "Available" ? "Unavailable" : "غير متاح"}
                        </span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Name + Weight */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-foreground truncate" data-testid={`text-name-${item.id}`}>
                          {item.name}
                        </p>
                        {catName && (
                          <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">{catName}</p>
                        )}
                      </div>
                      {item.weightGrams && (
                        <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-muted-foreground bg-slate-100 dark:bg-muted px-2 py-0.5 rounded-md">
                          {parseFloat(item.weightGrams).toLocaleString()}g
                        </span>
                      )}
                    </div>

                    {/* Selling Price */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 dark:text-muted-foreground">{t("inventory.sellingPrice")}</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-foreground tabular-nums" data-testid={`text-sell-${item.id}`}>
                        {sell.toLocaleString()} {t("common.currency")}
                      </span>
                    </div>

                    {/* Cost + Margin */}
                    <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-border pt-2.5">
                      <span className="text-slate-500 dark:text-muted-foreground" data-testid={`text-cost-${item.id}`}>
                        {t("inventory.costPrice")}: {cost.toLocaleString()}
                      </span>
                      <span className="text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded" data-testid={`text-margin-${item.id}`}>
                        {margin}%
                      </span>
                    </div>

                    {/* Quantity + Availability */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          item.quantity > 0
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                        }`}
                        data-testid={`text-qty-${item.id}`}
                      >
                        {item.quantity > 0 ? `${item.quantity} ${t("inventory.quantity")}` : t("pos.outOfStock")}
                      </span>
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={(checked) =>
                          toggleAvailabilityMutation.mutate({ id: item.id, isAvailable: checked })
                        }
                        className="data-[state=checked]:bg-[#d4a574]"
                        data-testid={`switch-available-${item.id}`}
                      />
                    </div>
                  </CardContent>

                  {/* Action Footer */}
                  <CardFooter className="px-4 py-3 border-t border-slate-100 dark:border-border bg-slate-50/60 dark:bg-muted/20 flex justify-between">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-[#d4a574] hover:bg-[#d4a574]/10"
                        onClick={() => openEditItem(item)}
                        data-testid={`button-edit-item-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {item.barcode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-200 dark:hover:bg-muted"
                          onClick={() => setBarcodeItem(item)}
                          data-testid={`button-view-barcode-${item.id}`}
                        >
                          <Barcode className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                      data-testid={`button-delete-item-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Add Category Dialog ── */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("inventory.addCategory")}</DialogTitle>
          </DialogHeader>
          <Form {...categoryForm}>
            <form
              onSubmit={categoryForm.handleSubmit((values) => createCategoryMutation.mutate(values))}
              className="space-y-4"
            >
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)} data-testid="button-cancel-category">
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending} data-testid="button-save-category">
                  {createCategoryMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Item Dialog ── */}
      <Dialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t("inventory.editItem") : t("inventory.addItem")}
            </DialogTitle>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={itemForm.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.sku")}</FormLabel>
                    <FormControl><Input {...field} data-testid="input-item-sku" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.name")}</FormLabel>
                    <FormControl><Input {...field} data-testid="input-item-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.category")}</FormLabel>
                    <Select value={field.value ? String(field.value) : ""} onValueChange={handleCategoryChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-category"><SelectValue placeholder={t("inventory.category")} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="metalType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.metalType")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-metal"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gold">{t("inventory.gold")}</SelectItem>
                        <SelectItem value="silver">{t("inventory.silver")}</SelectItem>
                        <SelectItem value="platinum">{t("inventory.platinum")}</SelectItem>
                        <SelectItem value="white_gold">{t("inventory.whiteGold")}</SelectItem>
                        <SelectItem value="rose_gold">{t("inventory.roseGold")}</SelectItem>
                        <SelectItem value="other">{t("inventory.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="purity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.purity")}</FormLabel>
                    <FormControl><Input {...field} data-testid="input-item-purity" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="weightGrams" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.weight")}</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.001" data-testid="input-item-weight" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="gemstone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.gemstone")}</FormLabel>
                    <FormControl><Input {...field} data-testid="input-item-gemstone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="caratWeight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.caratWeight")}</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" data-testid="input-item-carat" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="costPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.costPrice")}</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" data-testid="input-item-cost" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="sellingPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.sellingPrice")}</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" data-testid="input-item-selling" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.quantity")}</FormLabel>
                    <FormControl><Input {...field} type="number" data-testid="input-item-quantity" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.uploadImage")}</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          className="hidden"
                          data-testid="input-file-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          data-testid="button-browse-image"
                        >
                          {uploading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Upload className="h-4 w-4 me-2" />}
                          {uploading ? t("inventory.uploading") : t("inventory.browseFile")}
                        </Button>
                        {field.value && (
                          <div className="flex items-center gap-2">
                            <img src={field.value} alt="" className="h-8 w-8 rounded object-cover border" data-testid="img-preview" />
                            <Button type="button" variant="ghost" size="sm" onClick={() => itemForm.setValue("imageUrl", "")} data-testid="button-remove-image">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t("inventory.orEnterUrl")}</span>
                      </div>
                      <FormControl>
                        <Input {...field} placeholder="https://..." data-testid="input-item-image" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={itemForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.description")}</FormLabel>
                  <FormControl><Input {...field} data-testid="input-item-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setItemDialogOpen(false); setEditingItem(null); }}
                  data-testid="button-cancel-item"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-save-item">
                  {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Barcode Dialog ── */}
      <Dialog open={!!barcodeItem} onOpenChange={(open) => !open && setBarcodeItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("inventory.barcode")}</DialogTitle>
          </DialogHeader>
          {barcodeItem && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm font-medium">{barcodeItem.name}</p>
              <p className="text-xs text-muted-foreground">{barcodeItem.sku}</p>
              <BarcodeDisplay value={barcodeItem.barcode || barcodeItem.sku} />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const qrValue = barcodeItem.barcode || barcodeItem.sku;
                  const qrDataUrl = await QRCode.toDataURL(qrValue, {
                    width: 200,
                    margin: 1,
                    color: { dark: "#000000", light: "#ffffff" },
                  });
                  const weight = barcodeItem.weightGrams ? `${parseFloat(barcodeItem.weightGrams).toLocaleString()}g` : "";
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    printWindow.document.write(`<html><head><title>Label - ${barcodeItem.name}</title><style>@page{size:60mm 12mm;margin:0}*{box-sizing:border-box;font-family:'Courier New',Courier,monospace}body{margin:0;padding:0;width:60mm;height:12mm;overflow:hidden;position:relative}.info{position:absolute;left:0;top:0;width:48mm;height:12mm;padding:0.3mm 1mm;display:flex;flex-direction:column;justify-content:space-around;border-right:0.3mm solid #ddd}.name{font-size:11pt;font-weight:900;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.weight{font-size:12pt;font-weight:900}.qr{position:absolute;left:48mm;top:0;width:12mm;height:12mm}img{display:block;width:12mm;height:12mm}</style></head><body><div class="info"><div class="name">${barcodeItem.name}</div><div class="weight">${weight}</div></div><div class="qr"><img src="${qrDataUrl}"></div></body></html>`);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                data-testid="button-print-barcode"
              >
                {t("receipt.print")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Price Dialog ── */}
      <Dialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-bulk-price-title">{t("inventory.bulkPriceAdjust")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("inventory.adjustType")}</label>
              <Select value={bulkAdjustType} onValueChange={(v: "increase" | "decrease") => setBulkAdjustType(v)}>
                <SelectTrigger data-testid="select-adjust-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase" data-testid="option-increase">{t("inventory.increase")}</SelectItem>
                  <SelectItem value="decrease" data-testid="option-decrease">{t("inventory.decrease")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("inventory.percentage")}</label>
              <div className="relative">
                <Input
                  type="number"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  value={bulkPercentage}
                  onChange={(e) => setBulkPercentage(e.target.value)}
                  placeholder="10"
                  data-testid="input-bulk-percentage"
                />
                <Percent className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("inventory.applyTo")}</label>
              <Select value={bulkApplyTo} onValueChange={(v: "cost" | "selling" | "both") => setBulkApplyTo(v)}>
                <SelectTrigger data-testid="select-apply-to"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="selling" data-testid="option-selling">{t("inventory.sellingPriceOnly")}</SelectItem>
                  <SelectItem value="cost" data-testid="option-cost">{t("inventory.costPriceOnly")}</SelectItem>
                  <SelectItem value="both" data-testid="option-both">{t("inventory.bothPrices")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("inventory.categories")}</label>
              <Select value={bulkCategoryId?.toString() || "all"} onValueChange={(v) => setBulkCategoryId(v === "all" ? null : parseInt(v))}>
                <SelectTrigger data-testid="select-bulk-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-all-categories">{t("inventory.allCategories")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()} data-testid={`option-category-${cat.id}`}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkPercentage && parseFloat(bulkPercentage) > 0 && (
              <div className="rounded-md bg-muted p-3 text-sm" data-testid="text-bulk-preview">
                <span className="font-medium">{t("inventory.adjustPreview")}: </span>
                {bulkAdjustType === "increase" ? t("inventory.increase") : t("inventory.decrease")}{" "}
                {bulkApplyTo === "cost" ? t("inventory.costPriceOnly") : bulkApplyTo === "selling" ? t("inventory.sellingPriceOnly") : t("inventory.bothPrices")}{" "}
                {bulkPercentage}%
                {bulkCategoryId ? ` — ${categories.find((c) => c.id === bulkCategoryId)?.name}` : ""}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPriceOpen(false)} data-testid="button-bulk-cancel">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleBulkPriceSubmit} disabled={!bulkPercentage || parseFloat(bulkPercentage) <= 0} data-testid="button-bulk-submit">
              {t("inventory.bulkPriceAdjust")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Price Confirm Dialog ── */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("inventory.bulkPriceAdjust")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground" data-testid="text-bulk-confirm">
            {t("inventory.adjustConfirm")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} data-testid="button-confirm-cancel">
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmBulkPrice} disabled={bulkPriceMutation.isPending} data-testid="button-confirm-submit">
              {bulkPriceMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
