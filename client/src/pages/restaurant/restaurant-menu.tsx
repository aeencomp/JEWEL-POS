import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { MenuCategory, MenuItem } from "@shared/schema";

export default function RestaurantMenu() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [newCat, setNewCat] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", categoryId: "" });

  const { data: categories = [] } = useQuery<MenuCategory[]>({ queryKey: ["/api/restaurant/menu/categories"] });
  const { data: items = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/restaurant/menu/items"] });

  const addCat = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/restaurant/menu/categories", { name, nameAr: name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu/categories"] }); setNewCat(""); },
  });
  const addItem = useMutation({
    mutationFn: (data: { name: string; price: string; categoryId: number }) => apiRequest("POST", "/api/restaurant/menu/items", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu/items"] }); setNewItem({ name: "", price: "", categoryId: "" }); },
  });
  const delItem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/restaurant/menu/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu/items"] }),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">{isAr ? "إدارة القائمة" : "Menu Management"}</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">{isAr ? "إضافة قسم" : "Add Category"}</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={isAr ? "مثال: مشويات" : "e.g. Grills"} />
          <Button onClick={() => newCat.trim() && addCat.mutate(newCat.trim())} disabled={addCat.isPending}><Plus className="h-4 w-4" /></Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{isAr ? "إضافة صنف" : "Add Menu Item"}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-2">
          <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder={isAr ? "اسم الصنف" : "Item name"} />
          <Input value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder={isAr ? "السعر" : "Price"} type="number" />
          <select className="h-10 rounded-md border px-3 bg-background" value={newItem.categoryId} onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}>
            <option value="">{isAr ? "القسم" : "Category"}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button onClick={() => newItem.name && newItem.price && newItem.categoryId && addItem.mutate({ name: newItem.name, price: newItem.price, categoryId: parseInt(newItem.categoryId) })} disabled={addItem.isPending}>
            {addItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 me-1" />{isAr ? "إضافة" : "Add"}</>}
          </Button>
        </CardContent>
      </Card>
      {categories.map((cat) => (
        <Card key={cat.id}>
          <CardHeader><CardTitle className="text-base">{cat.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.filter((i) => i.categoryId === cat.id).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">{parseFloat(item.price).toLocaleString()} IQD</p></div>
                <Button size="icon" variant="ghost" onClick={() => delItem.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {items.filter((i) => i.categoryId === cat.id).length === 0 && <p className="text-sm text-muted-foreground">{isAr ? "لا أصناف" : "No items"}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
