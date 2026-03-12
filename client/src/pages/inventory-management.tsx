import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, Category } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Package,
  Eye,
  EyeOff,
  Barcode,
  Percent,
  Upload,
  ImageIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";
import JsBarcode from "jsbarcode";

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

  const metalTypeLabels: Record<string, keyof typeof t extends (k: infer K) => string ? K : never> = {
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
      if (selectedCategory) {
        const remaining = categories.filter((c) => c.id !== selectedCategory);
        if (!remaining.find((c) => c.id === selectedCategory)) {
          setSelectedCategory(null);
        }
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: InventoryFormValues) => {
      const res = await apiRequest("POST", "/api/inventory", {
        ...data,
        isAvailable: true,
      });
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

  const watchedCategoryId = itemForm.watch("categoryId");
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-inventory-title">
          {t("inventory.title")}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkPriceOpen(true)} data-testid="button-bulk-price">
            <Percent className="h-4 w-4 me-2" />
            {t("inventory.bulkPriceAdjust")}
          </Button>
          <Button onClick={openAddItem} data-testid="button-add-item">
            <Plus className="h-4 w-4 me-2" />
            {t("inventory.addItem")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">{t("inventory.categories")}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              categoryForm.reset();
              setCategoryDialogOpen(true);
            }}
            data-testid="button-add-category"
          >
            <Plus className="h-4 w-4 me-1" />
            {t("inventory.addCategory")}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
              data-testid="badge-category-all"
            >
              {t("pos.allCategories")}
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                className="cursor-pointer gap-1"
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                data-testid={`badge-category-${cat.id}`}
              >
                {cat.name}
                <button
                  className="ms-1 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCategoryMutation.mutate(cat.id);
                  }}
                  data-testid={`button-delete-category-${cat.id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-search-inventory"
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground" data-testid="text-no-items">
              {t("inventory.noItems")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("inventory.sku")}</TableHead>
                <TableHead>{t("inventory.barcode")}</TableHead>
                <TableHead>{t("inventory.name")}</TableHead>
                <TableHead>{t("inventory.metalType")}</TableHead>
                <TableHead>{t("inventory.purity")}</TableHead>
                <TableHead>{t("inventory.weight")}</TableHead>
                <TableHead>{t("inventory.gemstone")}</TableHead>
                <TableHead>{t("inventory.costPrice")}</TableHead>
                <TableHead>{t("inventory.sellingPrice")}</TableHead>
                <TableHead>{t("inventory.quantity")}</TableHead>
                <TableHead>{t("inventory.profit")}</TableHead>
                <TableHead>{t("inventory.available")}</TableHead>
                <TableHead>{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const cost = parseFloat(item.costPrice);
                const sell = parseFloat(item.sellingPrice);
                const margin = cost > 0 ? (((sell - cost) / cost) * 100).toFixed(1) : "0";
                const catName = categories.find((c) => c.id === item.categoryId)?.name;

                return (
                  <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                    <TableCell className="font-mono text-sm" data-testid={`text-sku-${item.id}`}>
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      {item.barcode ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs"
                          onClick={() => setBarcodeItem(item)}
                          data-testid={`button-view-barcode-${item.id}`}
                        >
                          <Barcode className="h-3.5 w-3.5" />
                          {t("inventory.viewBarcode")}
                        </Button>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span data-testid={`text-name-${item.id}`}>{item.name}</span>
                        {catName && (
                          <Badge variant="outline" className="ms-2 text-xs no-default-active-elevate">
                            {catName}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-metal-${item.id}`}>
                      {t(metalTypeLabels[item.metalType] as any)}
                    </TableCell>
                    <TableCell>{item.purity || "-"}</TableCell>
                    <TableCell>{item.weightGrams ? `${item.weightGrams}g` : "-"}</TableCell>
                    <TableCell>{item.gemstone || "-"}</TableCell>
                    <TableCell data-testid={`text-cost-${item.id}`}>
                      {parseFloat(item.costPrice).toLocaleString()} {t("common.currency")}
                    </TableCell>
                    <TableCell data-testid={`text-sell-${item.id}`}>
                      {parseFloat(item.sellingPrice).toLocaleString()} {t("common.currency")}
                    </TableCell>
                    <TableCell data-testid={`text-qty-${item.id}`}>{item.quantity}</TableCell>
                    <TableCell data-testid={`text-margin-${item.id}`}>{margin}%</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={(checked) =>
                          toggleAvailabilityMutation.mutate({ id: item.id, isAvailable: checked })
                        }
                        data-testid={`switch-available-${item.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditItem(item)}
                          data-testid={`button-edit-item-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          data-testid={`button-delete-item-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCategoryDialogOpen(false)}
                  data-testid="button-cancel-category"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  data-testid="button-save-category"
                >
                  {createCategoryMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                <FormField
                  control={itemForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.sku")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-item-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-item-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.category")}</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={handleCategoryChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-item-category">
                            <SelectValue placeholder={t("inventory.category")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="metalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.metalType")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-item-metal">
                            <SelectValue />
                          </SelectTrigger>
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
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="purity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.purity")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-item-purity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="weightGrams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.weight")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.001" data-testid="input-item-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="gemstone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.gemstone")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-item-gemstone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="caratWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.caratWeight")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-item-carat" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.costPrice")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-item-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.sellingPrice")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-item-selling" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.quantity")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" data-testid="input-item-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.uploadImage")}</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
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
                            {uploading ? (
                              <Loader2 className="h-4 w-4 me-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 me-2" />
                            )}
                            {uploading ? t("inventory.uploading") : t("inventory.browseFile")}
                          </Button>
                          {field.value && (
                            <div className="flex items-center gap-2">
                              <img
                                src={field.value}
                                alt=""
                                className="h-8 w-8 rounded object-cover border"
                                data-testid="img-preview"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => itemForm.setValue("imageUrl", "")}
                                data-testid="button-remove-image"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t("inventory.orEnterUrl")}</span>
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://..."
                            data-testid="input-item-image"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={itemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.description")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-item-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setItemDialogOpen(false);
                    setEditingItem(null);
                  }}
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

      <Dialog open={!!barcodeItem} onOpenChange={(open) => !open && setBarcodeItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("inventory.barcode")}</DialogTitle>
          </DialogHeader>
          {barcodeItem && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm font-medium">{barcodeItem.name}</p>
              <p className="text-xs text-muted-foreground">{barcodeItem.sku}</p>
              <BarcodeDisplay value={barcodeItem.barcode || barcodeItem.sku} displayText={barcodeItem.name} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const svg = document.getElementById("barcode-svg");
                  if (svg) {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`<html><head><title>Barcode - ${barcodeItem.name}</title><style>@page{size:60mm 12mm;margin:0}body{margin:0;padding:0;width:60mm;height:12mm;overflow:hidden}svg{display:block;width:60mm;height:12mm}</style></head><body>${svg.outerHTML}</body></html>`);
                      printWindow.document.close();
                      printWindow.print();
                    }
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

      <Dialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-bulk-price-title">{t("inventory.bulkPriceAdjust")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("inventory.adjustType")}</label>
              <Select value={bulkAdjustType} onValueChange={(v: "increase" | "decrease") => setBulkAdjustType(v)}>
                <SelectTrigger data-testid="select-adjust-type">
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger data-testid="select-apply-to">
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger data-testid="select-bulk-category">
                  <SelectValue />
                </SelectTrigger>
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
            <Button
              onClick={handleBulkPriceSubmit}
              disabled={!bulkPercentage || parseFloat(bulkPercentage) <= 0}
              data-testid="button-bulk-submit"
            >
              {t("inventory.bulkPriceAdjust")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button
              onClick={confirmBulkPrice}
              disabled={bulkPriceMutation.isPending}
              data-testid="button-confirm-submit"
            >
              {bulkPriceMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BarcodeDisplay({ value, displayText }: { value: string; displayText?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1,
          height: 22,
          displayValue: true,
          text: displayText || value,
          fontSize: 7,
          margin: 2,
        });
      } catch {
        // fallback - display text
      }
    }
  }, [value, displayText]);

  return <svg id="barcode-svg" ref={svgRef} data-testid="img-barcode" />;
}
