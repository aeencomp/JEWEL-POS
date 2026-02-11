import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
        <Button onClick={openAddItem} data-testid="button-add-item">
          <Plus className="h-4 w-4 mr-2" />
          {t("inventory.addItem")}
        </Button>
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
            <Plus className="h-4 w-4 mr-1" />
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
                  className="ml-1 rounded-full"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
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
                      <div>
                        <span data-testid={`text-name-${item.id}`}>{item.name}</span>
                        {catName && (
                          <Badge variant="outline" className="ml-2 text-xs no-default-active-elevate">
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
                  {createCategoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                      <FormLabel>{t("inventory.imageUrl")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-item-image" />
                      </FormControl>
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
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
