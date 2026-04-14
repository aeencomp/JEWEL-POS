import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, Category } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  Package,
  TrendingUp,
  AlertTriangle,
  Percent,
  Upload,
  ChevronDown,
  ChevronRight,
  Barcode,
  Power,
  Gem,
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
  quantity: z.coerce.number().min(0),
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

function getStockStatus(qty: number, isAvailable: boolean): { label: string; className: string } {
  if (!isAvailable || qty === 0) return { label: "Out of Stock", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" };
  if (qty <= 2) return { label: "Low Stock", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  return { label: "In Stock", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
}

export default function InventoryManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
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

  // KPI stats
  const totalValue = inventory.reduce((s, i) => s + parseFloat(i.sellingPrice) * i.quantity, 0);
  const lowStockCount = inventory.filter((i) => i.quantity <= 2 && i.quantity > 0 && i.isAvailable).length;
  const outOfStock = inventory.filter((i) => !i.isAvailable || i.quantity === 0).length;
  const avgMargin = inventory.length > 0
    ? Math.round(inventory.reduce((s, i) => {
        const cost = parseFloat(i.costPrice);
        const sell = parseFloat(i.sellingPrice);
        return s + (cost > 0 ? ((sell - cost) / cost) * 100 : 0);
      }, 0) / inventory.length)
    : 0;

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
    <div className="p-6 space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-inventory-title">
            {t("inventory.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("inventory.title")} — {t("inventory.quantity")} & {t("inventory.sellingPrice")}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-s-4 border-s-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("inventory.title")}</p>
              <p className="text-2xl font-bold" data-testid="text-stat-total">{inventory.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-s-4 border-s-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("inventory.sellingPrice")}</p>
              <p className="text-lg font-bold tabular-nums" data-testid="text-stat-value">
                {totalValue.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{t("common.currency")}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-s-4 border-s-orange-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("pos.outOfStock")}</p>
              <p className="text-2xl font-bold" data-testid="text-stat-lowstock">
                {lowStockCount + outOfStock}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-s-4 border-s-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("inventory.costPrice")} %</p>
              <p className="text-2xl font-bold" data-testid="text-stat-margin">{avgMargin}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Categories + Search + Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-slate-100 dark:border-border">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className={`cursor-pointer text-sm px-3 py-1.5 ${
              selectedCategory === null
                ? "bg-slate-800 dark:bg-slate-200 hover:bg-slate-700 text-white dark:text-slate-900"
                : "bg-slate-50 dark:bg-muted hover:bg-slate-100 text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border"
            }`}
            onClick={() => setSelectedCategory(null)}
            data-testid="badge-category-all"
          >
            {t("pos.allCategories")} <span className="ms-1.5 opacity-60 text-xs">({inventory.length})</span>
          </Badge>
          {categories.map((cat) => {
            const count = inventory.filter((i) => i.categoryId === cat.id).length;
            return (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                className={`cursor-pointer text-sm px-3 py-1.5 flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-slate-800 dark:bg-slate-200 hover:bg-slate-700 text-white dark:text-slate-900"
                    : "bg-slate-50 dark:bg-muted hover:bg-slate-100 text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border"
                }`}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                data-testid={`badge-category-${cat.id}`}
              >
                {cat.name} <span className="opacity-60 text-xs">({count})</span>
                <span
                  role="button"
                  className="opacity-60 hover:opacity-100 ms-0.5"
                  onClick={(e) => { e.stopPropagation(); deleteCategoryMutation.mutate(cat.id); }}
                  data-testid={`button-delete-category-${cat.id}`}
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { categoryForm.reset(); setCategoryDialogOpen(true); }}
            className="text-muted-foreground hover:text-foreground h-8 px-2"
            data-testid="button-add-category"
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {t("inventory.addCategory")}
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 bg-slate-50 dark:bg-muted border-slate-200 dark:border-border"
              data-testid="input-search-inventory"
            />
          </div>
          <Button
            variant="outline"
            className="border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:bg-slate-50 shrink-0"
            onClick={() => setBulkPriceOpen(true)}
            data-testid="button-bulk-price"
          >
            <Percent className="h-4 w-4 me-2" />
            {t("inventory.bulkPriceAdjust")}
          </Button>
          <Button
            onClick={openAddItem}
            className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 shrink-0"
            data-testid="button-add-item"
          >
            <Plus className="h-4 w-4 me-2" />
            {t("inventory.addItem")}
          </Button>
        </div>
      </div>

      {/* Expandable Table */}
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-border overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Gem className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm" data-testid="text-no-items">{t("inventory.noItems")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-muted-foreground">{t("inventory.name")}</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-muted-foreground">{t("inventory.metalType")}</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-muted-foreground text-end">{t("inventory.sellingPrice")}</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-muted-foreground text-end">{t("inventory.quantity")}</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-muted-foreground">{t("admin.status")}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const cost = parseFloat(item.costPrice);
                const sell = parseFloat(item.sellingPrice);
                const margin = cost > 0 ? Math.round(((sell - cost) / cost) * 100) : 0;
                const catName = categories.find((c) => c.id === item.categoryId)?.name;
                const stock = getStockStatus(item.quantity, item.isAvailable);
                const isExpanded = expandedRow === item.id;

                return (
                  <>
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-muted/20 ${isExpanded ? "bg-slate-50 dark:bg-muted/10 border-b-0" : ""}`}
                      onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                      data-testid={`row-item-${item.id}`}
                    >
                      <TableCell className="py-3">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium" data-testid={`text-name-${item.id}`}>{item.name}</span>
                          {catName && <span className="text-xs text-muted-foreground">{catName}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground" data-testid={`text-metal-${item.id}`}>
                          {t(metalTypeLabels[item.metalType] as any)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-end font-semibold tabular-nums" data-testid={`text-sell-${item.id}`}>
                        {sell.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{t("common.currency")}</span>
                      </TableCell>
                      <TableCell className="py-3 text-end text-muted-foreground" data-testid={`text-qty-${item.id}`}>
                        {item.quantity}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className={`text-xs border-0 ${stock.className}`} data-testid={`badge-status-${item.id}`}>
                          {stock.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3"></TableCell>
                    </TableRow>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <TableRow key={`${item.id}-detail`} className="bg-slate-50/50 dark:bg-muted/5 hover:bg-slate-50/50 border-t-0">
                        <TableCell colSpan={7} className="p-0 border-b border-slate-200 dark:border-border">
                          <div className="px-8 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                              {/* Specifications */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("inventory.sku")}</h4>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                  <div className="text-muted-foreground">{t("inventory.sku")}</div>
                                  <div className="font-mono font-medium" data-testid={`text-sku-${item.id}`}>{item.sku}</div>
                                  {item.purity && <>
                                    <div className="text-muted-foreground">{t("inventory.purity")}</div>
                                    <div className="font-medium">{item.purity}</div>
                                  </>}
                                  {item.weightGrams && <>
                                    <div className="text-muted-foreground">{t("inventory.weight")}</div>
                                    <div className="font-medium">{parseFloat(item.weightGrams).toLocaleString()}g</div>
                                  </>}
                                  {item.gemstone && <>
                                    <div className="text-muted-foreground">{t("inventory.gemstone")}</div>
                                    <div className="font-medium">{item.gemstone}</div>
                                  </>}
                                </div>
                              </div>

                              {/* Financials */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("inventory.costPrice")}</h4>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                  <div className="text-muted-foreground">{t("inventory.costPrice")}</div>
                                  <div className="font-medium tabular-nums" data-testid={`text-cost-${item.id}`}>
                                    {cost.toLocaleString()} {t("common.currency")}
                                  </div>
                                  <div className="text-muted-foreground">{t("inventory.sellingPrice")}</div>
                                  <div className="font-medium tabular-nums">{sell.toLocaleString()} {t("common.currency")}</div>
                                  <div className="text-muted-foreground">Margin</div>
                                  <div className="font-semibold text-blue-600" data-testid={`text-margin-${item.id}`}>{margin}%</div>
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                                    <span className="font-medium text-foreground">{t("inventory.description")}: </span>
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {/* Quick Actions */}
                              <div className="space-y-3 md:border-s md:border-slate-200 dark:md:border-border md:ps-6 flex flex-col justify-between">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("admin.actions")}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-slate-600 dark:text-muted-foreground hover:text-foreground border-slate-200 dark:border-border"
                                    onClick={(e) => { e.stopPropagation(); openEditItem(item); }}
                                    data-testid={`button-edit-item-${item.id}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5 me-2" />
                                    {t("inventory.editItem")}
                                  </Button>
                                  {item.barcode && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-slate-600 dark:text-muted-foreground hover:text-foreground border-slate-200 dark:border-border"
                                      onClick={(e) => { e.stopPropagation(); setBarcodeItem(item); }}
                                      data-testid={`button-view-barcode-${item.id}`}
                                    >
                                      <Barcode className="h-3.5 w-3.5 me-2" />
                                      {t("inventory.barcode")}
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-slate-600 dark:text-muted-foreground hover:text-foreground border-slate-200 dark:border-border"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAvailabilityMutation.mutate({ id: item.id, isAvailable: !item.isAvailable });
                                    }}
                                    data-testid={`switch-available-${item.id}`}
                                  >
                                    <Power className="h-3.5 w-3.5 me-2" />
                                    {item.isAvailable ? t("inventory.available") : t("inventory.available")}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-100 dark:border-rose-900/30"
                                    onClick={(e) => { e.stopPropagation(); deleteItemMutation.mutate(item.id); }}
                                    data-testid={`button-delete-item-${item.id}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 me-2" />
                                    {t("common.delete")}
                                  </Button>
                                </div>
                                {item.imageUrl && (
                                  <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-lg object-cover border border-slate-200 dark:border-border mt-2" data-testid={`img-item-${item.id}`} />
                                )}
                              </div>

                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Add Category Dialog ── */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("inventory.addCategory")}</DialogTitle>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit((v) => createCategoryMutation.mutate(v))} className="space-y-4">
              <FormField control={categoryForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.name")}</FormLabel>
                  <FormControl><Input {...field} data-testid="input-category-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
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
      <Dialog open={itemDialogOpen} onOpenChange={(open) => { setItemDialogOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? t("inventory.editItem") : t("inventory.addItem")}</DialogTitle>
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
                        {categories.map((cat) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
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
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" ref={fileInputRef} onChange={handleImageUpload} className="hidden" data-testid="input-file-upload" />
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-browse-image">
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
                      <p className="text-xs text-muted-foreground">{t("inventory.orEnterUrl")}</p>
                      <FormControl><Input {...field} placeholder="https://..." data-testid="input-item-image" /></FormControl>
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
                <Button type="button" variant="outline" onClick={() => { setItemDialogOpen(false); setEditingItem(null); }} data-testid="button-cancel-item">
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
          <DialogHeader><DialogTitle>{t("inventory.barcode")}</DialogTitle></DialogHeader>
          {barcodeItem && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm font-medium">{barcodeItem.name}</p>
              <p className="text-xs text-muted-foreground">{barcodeItem.sku}</p>
              <BarcodeDisplay value={barcodeItem.barcode || barcodeItem.sku} />
              <Button variant="outline" size="sm" onClick={async () => {
                const qrValue = barcodeItem.barcode || barcodeItem.sku;
                const qrDataUrl = await QRCode.toDataURL(qrValue, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
                const weight = barcodeItem.weightGrams ? `${parseFloat(barcodeItem.weightGrams).toLocaleString()}g` : "";
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  printWindow.document.write(`<html><head><title>Label - ${barcodeItem.name}</title><style>@page{size:60mm 12mm;margin:0}*{box-sizing:border-box;font-family:'Courier New',Courier,monospace}body{margin:0;padding:0;width:60mm;height:12mm;overflow:hidden;position:relative}.info{position:absolute;left:0;top:0;width:48mm;height:12mm;padding:0.3mm 1mm;display:flex;flex-direction:column;justify-content:space-around;border-right:0.3mm solid #ddd}.name{font-size:11pt;font-weight:900;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.weight{font-size:12pt;font-weight:900}.qr{position:absolute;left:48mm;top:0;width:12mm;height:12mm}img{display:block;width:12mm;height:12mm}</style></head><body><div class="info"><div class="name">${barcodeItem.name}</div><div class="weight">${weight}</div></div><div class="qr"><img src="${qrDataUrl}" onload="window.print();window.close()"></div></body></html>`);
                  printWindow.document.close();
                }
              }} data-testid="button-print-barcode">
                {t("receipt.print")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Price Dialog ── */}
      <Dialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle data-testid="text-bulk-price-title">{t("inventory.bulkPriceAdjust")}</DialogTitle></DialogHeader>
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
                <Input type="number" min="0.01" max="1000" step="0.01" value={bulkPercentage} onChange={(e) => setBulkPercentage(e.target.value)} placeholder="10" data-testid="input-bulk-percentage" />
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
                  {categories.map((cat) => <SelectItem key={cat.id} value={cat.id.toString()} data-testid={`option-category-${cat.id}`}>{cat.name}</SelectItem>)}
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
            <Button variant="outline" onClick={() => setBulkPriceOpen(false)} data-testid="button-bulk-cancel">{t("common.cancel")}</Button>
            <Button onClick={handleBulkPriceSubmit} disabled={!bulkPercentage || parseFloat(bulkPercentage) <= 0} data-testid="button-bulk-submit">{t("inventory.bulkPriceAdjust")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Confirm Dialog ── */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("inventory.bulkPriceAdjust")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground" data-testid="text-bulk-confirm">{t("inventory.adjustConfirm")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} data-testid="button-confirm-cancel">{t("common.cancel")}</Button>
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
