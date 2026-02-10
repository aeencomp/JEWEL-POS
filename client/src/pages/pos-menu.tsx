import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, ChefHat, Pencil, Trash2, GripVertical } from "lucide-react";
import type { MenuCategory, MenuItem } from "@shared/schema";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required").refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Must be a valid price"),
  categoryId: z.string().min(1, "Category is required"),
});

type CategoryValues = z.infer<typeof categorySchema>;
type ItemValues = z.infer<typeof itemSchema>;

export default function PosMenu() {
  const { toast } = useToast();
  const [catOpen, setCatOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);

  const { data: categories, isLoading: loadingCats } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu-categories"],
  });

  const { data: menuItems, isLoading: loadingItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const catForm = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  const itemForm = useForm<ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", description: "", price: "", categoryId: "" },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (values: CategoryValues) => {
      const res = await apiRequest("POST", "/api/menu-categories", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-categories"] });
      setCatOpen(false);
      catForm.reset();
      toast({ title: "Category created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (values: ItemValues) => {
      const res = await apiRequest("POST", "/api/menu-items", {
        ...values,
        categoryId: parseInt(values.categoryId),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setItemOpen(false);
      itemForm.reset();
      toast({ title: "Menu item created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: number; isAvailable: boolean }) => {
      const res = await apiRequest("PATCH", `/api/menu-items/${id}`, { isAvailable });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/menu-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Item deleted" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/menu-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Category deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot delete", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = loadingCats || loadingItems;

  const getCategoryItems = (catId: number) =>
    menuItems?.filter((item) => item.categoryId === catId) || [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Menu Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your categories and menu items</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-category">
                <Plus className="h-4 w-4 mr-2" />
                Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
              </DialogHeader>
              <Form {...catForm}>
                <form onSubmit={catForm.handleSubmit((v) => createCategoryMutation.mutate(v))} className="space-y-4 mt-2">
                  <FormField control={catForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Appetizers" data-testid="input-category-name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createCategoryMutation.isPending} data-testid="button-submit-category">
                    {createCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Category
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={itemOpen} onOpenChange={setItemOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-item" disabled={!categories || categories.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Menu Item</DialogTitle>
              </DialogHeader>
              <Form {...itemForm}>
                <form onSubmit={itemForm.handleSubmit((v) => createItemMutation.mutate(v))} className="space-y-4 mt-2">
                  <FormField control={itemForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Caesar Salad" data-testid="input-item-name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Brief description..." className="resize-none" data-testid="input-item-description" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="9.99" data-testid="input-item-price" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-item-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createItemMutation.isPending} data-testid="button-submit-item">
                    {createItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Item
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-32 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChefHat className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No categories yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first category to start adding items</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories?.map((category) => {
            const items = getCategoryItems(category.id);
            return (
              <Card key={category.id} data-testid={`card-category-${category.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <Badge variant="secondary">{items.length} items</Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (items.length > 0) {
                        toast({ title: "Cannot delete", description: "Remove all items first", variant: "destructive" });
                      } else {
                        deleteCategoryMutation.mutate(category.id);
                      }
                    }}
                    data-testid={`button-delete-category-${category.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No items in this category</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/30"
                          data-testid={`row-menu-item-${item.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{item.name}</p>
                              {!item.isAvailable && (
                                <Badge variant="secondary" className="text-xs">Unavailable</Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            )}
                          </div>
                          <p className="text-sm font-bold">${parseFloat(item.price).toFixed(2)}</p>
                          <Switch
                            checked={item.isAvailable}
                            onCheckedChange={(checked) =>
                              toggleAvailabilityMutation.mutate({ id: item.id, isAvailable: checked })
                            }
                            data-testid={`switch-available-${item.id}`}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
