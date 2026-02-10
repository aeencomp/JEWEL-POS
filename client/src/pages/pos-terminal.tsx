import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  ShoppingCart,
  Search,
  UtensilsCrossed,
  Loader2,
  Receipt,
  Check,
  X,
} from "lucide-react";
import type { MenuCategory, MenuItem, Order } from "@shared/schema";

type CartItem = {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
};

export default function PosTerminal() {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const { data: categories, isLoading: loadingCats } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu-categories"],
  });

  const { data: menuItems, isLoading: loadingItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: parseFloat(item.price), quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (menuItemId: number) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const filteredItems = useMemo(() => {
    let items = menuItems?.filter((item) => item.isAvailable) || [];
    if (activeCategory !== null) {
      items = items.filter((item) => item.categoryId === activeCategory);
    }
    if (search) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return items;
  }, [menuItems, activeCategory, search]);

  const placeOrderMutation = useMutation({
    mutationFn: async (paymentMethod: "cash" | "card") => {
      const orderData = {
        tableNumber: tableNumber || null,
        customerName: customerName || null,
        subtotal: Math.round(subtotal).toString(),
        tax: Math.round(tax).toString(),
        total: Math.round(total).toString(),
        paymentMethod,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          price: Math.round(c.price).toString(),
          quantity: c.quantity,
        })),
      };
      const res = await apiRequest("POST", "/api/orders", orderData);
      return await res.json();
    },
    onSuccess: (order: Order) => {
      setLastOrder(order);
      setShowReceipt(true);
      setCart([]);
      setTableNumber("");
      setCustomerName("");
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: `Order #${order.orderNumber} placed successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Order failed", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = loadingCats || loadingItems;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-menu"
              />
            </div>
          </div>

          {!isLoading && categories && categories.length > 0 && (
            <ScrollArea className="mt-3">
              <div className="flex gap-2 pb-1">
                <Button
                  variant={activeCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(null)}
                  data-testid="button-category-all"
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat.id)}
                    data-testid={`button-category-${cat.id}`}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16 mb-3" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No menu items</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "Try a different search" : "Add items from the Menu page"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                return (
                  <Card
                    key={item.id}
                    className="hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => addToCart(item)}
                    data-testid={`card-menu-item-${item.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="text-sm font-medium leading-tight">{item.name}</h3>
                        {inCart && (
                          <Badge variant="default" className="text-xs flex-shrink-0">
                            {inCart.quantity}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary">{parseInt(item.price).toLocaleString()} IQD</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="w-80 lg:w-96 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <h2 className="font-semibold text-sm">Current Order</h2>
            <Badge variant="secondary" className="ml-auto">{cart.length} items</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Input
              placeholder="Table #"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              data-testid="input-table-number"
            />
            <Input
              placeholder="Customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              data-testid="input-customer-name"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Tap items to add them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-2" data-testid={`cart-item-${item.menuItemId}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.price.toLocaleString()} IQD each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      data-testid={`button-decrease-${item.menuItemId}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      data-testid={`button-increase-${item.menuItemId}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm font-medium w-24 text-right">
                    {(item.price * item.quantity).toLocaleString()} IQD
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => removeItem(item.menuItemId)}
                    data-testid={`button-remove-${item.menuItemId}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {cart.length > 0 && (
          <div className="p-4 border-t bg-card">
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{subtotal.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span>{tax.toLocaleString()} IQD</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span data-testid="text-cart-total">{total.toLocaleString()} IQD</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => placeOrderMutation.mutate("cash")}
                disabled={placeOrderMutation.isPending}
                data-testid="button-pay-cash"
              >
                {placeOrderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Banknote className="h-4 w-4 mr-2" />Cash</>
                )}
              </Button>
              <Button
                onClick={() => placeOrderMutation.mutate("card")}
                disabled={placeOrderMutation.isPending}
                data-testid="button-pay-card"
              >
                {placeOrderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" />Card</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              Order Confirmed
            </DialogTitle>
          </DialogHeader>
          {lastOrder && (
            <div className="space-y-4">
              <div className="text-center py-4 border rounded-md bg-muted/30">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-bold text-lg" data-testid="text-order-number">#{lastOrder.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1.5">
                {lastOrder.tableNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Table</span>
                    <span>{lastOrder.tableNumber}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{parseInt(lastOrder.subtotal).toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{parseInt(lastOrder.tax).toLocaleString()} IQD</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{parseInt(lastOrder.total).toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant="secondary" className="capitalize">{lastOrder.paymentMethod}</Badge>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => setShowReceipt(false)}
                data-testid="button-close-receipt"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
