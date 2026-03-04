import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, Category, Customer, Order, OrderItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
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
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  ShoppingCart,
  Printer,
  X,
  Loader2,
  Clock,
} from "lucide-react";

type CartItem = {
  inventoryItemId: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
};

type BrandingData = {
  name: string;
  brandColor: string | null;
  logoUrl: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
};

type OrderResponse = Order & { items: OrderItem[] };

export default function PosTerminal() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("walk-in");
  const [orderDialog, setOrderDialog] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderResponse | null>(null);
  const [newCustomerDialog, setNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerIdNumber, setNewCustomerIdNumber] = useState("");

  const { data: inventory = [], isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: branding } = useQuery<BrandingData>({
    queryKey: ["/api/store/branding"],
  });

  const orderMutation = useMutation({
    mutationFn: async (payload: {
      customerId: number | null;
      customerName: string;
      subtotal: string;
      discount: string;
      total: string;
      paymentMethod: string;
      items: { inventoryItemId: number; name: string; sku: string; price: string; quantity: number }[];
    }) => {
      const res = await apiRequest("POST", "/api/orders", payload);
      return (await res.json()) as OrderResponse;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setCompletedOrder(order);
      setOrderDialog(true);
      setCart([]);
      setDiscount(0);
      setSelectedCustomerId("walk-in");
      toast({ title: t("pos.orderPlaced") });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; address: string; idNumber: string }) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return (await res.json()) as Customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSelectedCustomerId(String(customer.id));
      setNewCustomerDialog(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setNewCustomerIdNumber("");
      toast({ title: t("customers.addCustomer"), description: customer.name });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === null || item.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, search, selectedCategory]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  function addToCart(item: InventoryItem) {
    const existing = cart.find((c) => c.inventoryItemId === item.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= item.quantity) return;

    if (existing) {
      setCart(cart.map((c) => (c.inventoryItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([
        ...cart,
        {
          inventoryItemId: item.id,
          name: item.name,
          sku: item.sku,
          price: parseFloat(item.sellingPrice),
          quantity: 1,
        },
      ]);
    }
  }

  function updateQty(inventoryItemId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.inventoryItemId !== inventoryItemId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          const invItem = inventory.find((i) => i.id === inventoryItemId);
          if (invItem && newQty > invItem.quantity) return c;
          return { ...c, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function removeFromCart(inventoryItemId: number) {
    setCart((prev) => prev.filter((c) => c.inventoryItemId !== inventoryItemId));
  }

  function handlePayment(method: "cash" | "card" | "transfer" | "debit") {
    if (cart.length === 0) return;

    if (method === "debit" && (!selectedCustomerId || selectedCustomerId === "walk-in")) {
      toast({ title: t("pos.debitRequiresCustomer"), variant: "destructive" });
      return;
    }

    const customer = customers.find((c) => c.id === Number(selectedCustomerId));

    orderMutation.mutate({
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : t("pos.walkIn"),
      subtotal: subtotal.toString(),
      discount: discount.toString(),
      total: grandTotal.toString(),
      paymentMethod: method,
      items: cart.map((c) => ({
        inventoryItemId: c.inventoryItemId,
        name: c.name,
        sku: c.sku,
        price: c.price.toString(),
        quantity: c.quantity,
      })),
    });
  }

  function printReceipt() {
    if (!completedOrder) return;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;

    const brandColor = branding?.brandColor || "#d4a574";
    const storeName = branding?.name || "Store";
    const header = branding?.receiptHeader || "";
    const footer = branding?.receiptFooter || "";

    const customer = completedOrder.customerId
      ? customers.find((c) => c.id === completedOrder.customerId)
      : null;

    const customerHtml = customer
      ? `<div style="margin-bottom:10px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px">
<div style="font-weight:bold;margin-bottom:4px;color:${brandColor}">${t("pos.customer")}</div>
<div>${customer.name}</div>
${customer.phone ? `<div>${t("customers.phone")}: ${customer.phone}</div>` : ""}
${customer.idNumber ? `<div>${t("customers.idNumber")}: ${customer.idNumber}</div>` : ""}
${customer.address ? `<div>${t("customers.address")}: ${customer.address}</div>` : ""}
</div>`
      : completedOrder.customerName && completedOrder.customerName !== t("pos.walkIn")
        ? `<div style="margin-bottom:10px;font-size:12px"><strong>${t("pos.customer")}:</strong> ${completedOrder.customerName}</div>`
        : "";

    const itemsHtml = (completedOrder.items || [])
      .map((item) => {
        const invItem = inventory.find((inv) => inv.id === item.inventoryItemId);
        const details: string[] = [];
        if (item.sku) details.push(`${t("inventory.sku")}: ${item.sku}`);
        if (invItem?.metalType) details.push(`${t("inventory.metalType")}: ${invItem.metalType}`);
        if (invItem?.purity) details.push(`${t("inventory.purity")}: ${invItem.purity}`);
        if (invItem?.weightGrams) details.push(`${t("inventory.weight")}: ${invItem.weightGrams}g`);
        if (invItem?.gemstone) details.push(`${t("inventory.gemstone")}: ${invItem.gemstone}`);
        const detailsStr = details.length > 0 ? `<div style="font-size:10px;color:#666;margin-top:2px">${details.join(" | ")}</div>` : "";
        const lineTotal = Number(item.price) * item.quantity;
        return `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;vertical-align:top">
          <div style="font-weight:500">${item.name}</div>
          ${detailsStr}
        </td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;vertical-align:top">${item.quantity}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;vertical-align:top;white-space:nowrap">
          ${Number(item.price).toLocaleString()} ${t("common.currency")}
          ${item.quantity > 1 ? `<div style="font-size:10px;color:#666">${t("pos.total")}: ${lineTotal.toLocaleString()} ${t("common.currency")}</div>` : ""}
        </td>
      </tr>`;
      })
      .join("");

    w.document.write(`<!DOCTYPE html>
<html><head><title>Receipt</title>
<style>body{font-family:monospace;max-width:350px;margin:0 auto;padding:20px}
.header{text-align:center;border-bottom:2px solid ${brandColor};padding-bottom:10px;margin-bottom:10px}
.store-name{font-size:20px;font-weight:bold;color:${brandColor}}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:4px 0;border-bottom:2px solid #333}
.total-row{font-weight:bold;font-size:14px}
.footer{text-align:center;margin-top:16px;border-top:2px solid ${brandColor};padding-top:10px}
@media print{button{display:none}}</style></head><body>
<div class="header">
<div class="store-name">${storeName}</div>
${header ? `<div style="font-size:12px;margin-top:4px">${header}</div>` : ""}
</div>
<div style="margin-bottom:8px">
<div><strong>${t("pos.orderNumber")}</strong>${completedOrder.orderNumber}</div>
<div><strong>${t("receipt.date")}:</strong> ${new Date(completedOrder.createdAt).toLocaleString()}</div>
</div>
${customerHtml}
<table>
<thead><tr><th>${t("pos.item")}</th><th style="text-align:center">${t("pos.qty")}</th><th style="text-align:right">${t("pos.price")}</th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<div style="margin-top:10px;padding-top:8px;border-top:1px solid #333">
<div style="display:flex;justify-content:space-between"><span>${t("pos.total")}:</span><span>${Number(completedOrder.subtotal).toLocaleString()} ${t("common.currency")}</span></div>
${Number(completedOrder.discount) > 0 ? `<div style="display:flex;justify-content:space-between"><span>${t("pos.discount")}:</span><span>-${Number(completedOrder.discount).toLocaleString()} ${t("common.currency")}</span></div>` : ""}
<div class="total-row" style="display:flex;justify-content:space-between;margin-top:4px;padding-top:4px;border-top:2px solid #333"><span>${t("pos.grandTotal")}:</span><span>${Number(completedOrder.total).toLocaleString()} ${t("common.currency")}</span></div>
<div style="margin-top:6px;font-size:12px">${t("pos.payment")}: ${completedOrder.paymentMethod}</div>
</div>
<div class="footer">
${footer ? `<div style="font-size:12px;margin-bottom:4px">${footer}</div>` : ""}
<div style="font-size:12px">${t("receipt.thankYou")}</div>
</div>
<button onclick="window.print()" style="margin-top:16px;width:100%;padding:8px;cursor:pointer">${t("receipt.print")}</button>
</body></html>`);
    w.document.close();
  }

  return (
    <div className="flex h-full" data-testid="pos-terminal">
      <div className="flex-[2] flex flex-col p-4 gap-4 overflow-auto">
        <h1 className="text-xl font-bold" data-testid="text-pos-title">{t("pos.terminal")}</h1>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pos.searchItems")}
            className="ps-9"
            data-testid="input-search-items"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            data-testid="button-category-all"
          >
            {t("pos.allCategories")}
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              data-testid={`button-category-${cat.id}`}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {loadingInventory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-12" data-testid="text-no-items">
            {t("pos.noItems")}
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`cursor-pointer hover-elevate active-elevate-2 transition-colors ${item.quantity <= 0 ? "opacity-50" : ""}`}
                onClick={() => item.quantity > 0 && addToCart(item)}
                data-testid={`card-item-${item.id}`}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="font-medium text-sm truncate" data-testid={`text-item-name-${item.id}`}>
                    {item.name}
                  </div>
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-sku-${item.id}`}>
                    {item.sku}
                  </Badge>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>{item.metalType}{item.purity ? ` - ${item.purity}` : ""}</div>
                    {item.weightGrams && <div>{item.weightGrams}g</div>}
                  </div>
                  <div className="font-bold text-sm" data-testid={`text-item-price-${item.id}`}>
                    {Number(item.sellingPrice).toLocaleString()} {t("common.currency")}
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid={`text-item-qty-${item.id}`}>
                    {t("pos.qty")}: {item.quantity}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator orientation="vertical" />

      <div className="flex-[1] flex flex-col border-s bg-muted/30">
        <div className="p-4 flex-1 overflow-auto space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <h2 className="font-bold text-lg">{t("pos.cart")}</h2>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger data-testid="select-customer" className="flex-1">
                <SelectValue placeholder={t("pos.selectCustomer")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">{t("pos.walkIn")}</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setNewCustomerDialog(true)}
              data-testid="button-new-customer-pos"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm" data-testid="text-empty-cart">
              {t("pos.emptyCart")}
            </p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <Card key={item.inventoryItemId} data-testid={`cart-item-${item.inventoryItemId}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.price.toLocaleString()} {t("common.currency")}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(item.inventoryItemId)}
                        data-testid={`button-remove-${item.inventoryItemId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQty(item.inventoryItemId, -1)}
                          data-testid={`button-qty-minus-${item.inventoryItemId}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium" data-testid={`text-cart-qty-${item.inventoryItemId}`}>
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQty(item.inventoryItemId, 1)}
                          data-testid={`button-qty-plus-${item.inventoryItemId}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-medium text-sm" data-testid={`text-line-total-${item.inventoryItemId}`}>
                        {(item.price * item.quantity).toLocaleString()} {t("common.currency")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t space-y-3 bg-background">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{t("pos.total")}</span>
              <span data-testid="text-subtotal">{subtotal.toLocaleString()} {t("common.currency")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm shrink-0">{t("pos.discount")}</span>
              <Input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="text-sm"
                data-testid="input-discount"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-2 font-bold">
              <span>{t("pos.grandTotal")}</span>
              <span data-testid="text-grand-total">{grandTotal.toLocaleString()} {t("common.currency")}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="bg-green-600 text-white border-green-600"
              disabled={cart.length === 0 || orderMutation.isPending}
              onClick={() => handlePayment("cash")}
              data-testid="button-pay-cash"
            >
              <Banknote className="w-4 h-4 me-2" />
              {t("pos.payByCash")}
            </Button>
            <Button
              className="bg-blue-600 text-white border-blue-600"
              disabled={cart.length === 0 || orderMutation.isPending}
              onClick={() => handlePayment("card")}
              data-testid="button-pay-card"
            >
              <CreditCard className="w-4 h-4 me-2" />
              {t("pos.payByCard")}
            </Button>
            <Button
              className="bg-purple-600 text-white border-purple-600"
              disabled={cart.length === 0 || orderMutation.isPending}
              onClick={() => handlePayment("transfer")}
              data-testid="button-pay-transfer"
            >
              <ArrowRightLeft className="w-4 h-4 me-2" />
              {t("pos.payByTransfer")}
            </Button>
            <Button
              className="bg-orange-600 text-white border-orange-600"
              disabled={cart.length === 0 || orderMutation.isPending}
              onClick={() => handlePayment("debit")}
              data-testid="button-pay-debit"
            >
              <Clock className="w-4 h-4 me-2" />
              {t("pos.payByDebit")}
            </Button>
          </div>

          {cart.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setCart([]); setDiscount(0); }}
              data-testid="button-clear-cart"
            >
              <X className="w-4 h-4 me-2" />
              {t("pos.clearCart")}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-order-placed">{t("pos.orderPlaced")}</DialogTitle>
          </DialogHeader>
          {completedOrder && (
            <div className="space-y-4">
              <div className="text-sm" data-testid="text-order-number">
                <strong>{t("pos.orderNumber")}</strong>{completedOrder.orderNumber}
              </div>
              {completedOrder.customerId && customers.find((c) => c.id === completedOrder.customerId) && (
                <div className="rounded-md border p-3 text-sm space-y-1" data-testid="text-order-customer-info">
                  <div className="font-semibold text-primary">{t("pos.customer")}</div>
                  <div>{customers.find((c) => c.id === completedOrder.customerId)!.name}</div>
                  {customers.find((c) => c.id === completedOrder.customerId)!.phone && <div className="text-muted-foreground">{t("customers.phone")}: {customers.find((c) => c.id === completedOrder.customerId)!.phone}</div>}
                  {customers.find((c) => c.id === completedOrder.customerId)!.idNumber && <div className="text-muted-foreground">{t("customers.idNumber")}: {customers.find((c) => c.id === completedOrder.customerId)!.idNumber}</div>}
                  {customers.find((c) => c.id === completedOrder.customerId)!.address && <div className="text-muted-foreground">{t("customers.address")}: {customers.find((c) => c.id === completedOrder.customerId)!.address}</div>}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pos.item")}</TableHead>
                    <TableHead className="text-center">{t("pos.qty")}</TableHead>
                    <TableHead className="text-end">{t("pos.price")}</TableHead>
                    <TableHead className="text-end">{t("pos.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(completedOrder.items || []).map((item, idx) => {
                    const invItem = inventory.find((inv) => inv.id === item.inventoryItemId);
                    return (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground space-x-1">
                          {item.sku && <span>{t("inventory.sku")}: {item.sku}</span>}
                          {invItem?.metalType && <span>| {invItem.metalType}</span>}
                          {invItem?.purity && <span>| {invItem.purity}</span>}
                          {invItem?.weightGrams && <span>| {invItem.weightGrams}g</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-end">{Number(item.price).toLocaleString()}</TableCell>
                      <TableCell className="text-end" data-testid={`text-order-item-total-${idx}`}>
                        {(Number(item.price) * item.quantity).toLocaleString()} {t("common.currency")}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t("pos.total")}</span>
                  <span>{Number(completedOrder.subtotal).toLocaleString()} {t("common.currency")}</span>
                </div>
                {Number(completedOrder.discount) > 0 && (
                  <div className="flex justify-between">
                    <span>{t("pos.discount")}</span>
                    <span>-{Number(completedOrder.discount).toLocaleString()} {t("common.currency")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>{t("pos.grandTotal")}</span>
                  <span data-testid="text-order-grand-total">{Number(completedOrder.total).toLocaleString()} {t("common.currency")}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={printReceipt} data-testid="button-print-receipt">
              <Printer className="w-4 h-4 me-2" />
              {t("pos.printReceipt")}
            </Button>
            <Button onClick={() => setOrderDialog(false)} data-testid="button-close-dialog">
              {t("pos.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={newCustomerDialog} onOpenChange={setNewCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customers.addCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("customers.name")}</label>
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                data-testid="input-new-customer-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("customers.phone")}</label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                data-testid="input-new-customer-phone"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("customers.idNumber")}</label>
              <Input
                value={newCustomerIdNumber}
                onChange={(e) => setNewCustomerIdNumber(e.target.value)}
                data-testid="input-new-customer-id-number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("customers.address")}</label>
              <Input
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                data-testid="input-new-customer-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!newCustomerName.trim()) return;
                createCustomerMutation.mutate({
                  name: newCustomerName.trim(),
                  phone: newCustomerPhone.trim() || "",
                  address: newCustomerAddress.trim() || "",
                  idNumber: newCustomerIdNumber.trim() || "",
                });
              }}
              disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
              data-testid="button-save-new-customer"
            >
              {createCustomerMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("customers.addCustomer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
