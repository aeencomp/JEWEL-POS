import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, Category, Customer, Order, OrderItem, PosTerminal } from "@shared/schema";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  Gem,
  Tag,
  Box,
  Star,
  Sparkles,
  Crown,
  Layers,
  Store,
  Package,
  Scissors,
  Watch,
  Coins,
  Monitor,
  User,
  ChevronRight,
  CheckCircle2,
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
  address: string | null;
};

type OrderResponse = Order & { items: OrderItem[] };

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart, Gem, Tag, Box, Star, Sparkles, Crown, Layers, Monitor,
  Store, Package, Scissors, Watch, Coins,
};

function TerminalIcon({ iconName, size = 20 }: { iconName: string; size?: number }) {
  const Icon = ICON_MAP[iconName] ?? ShoppingCart;
  return <Icon style={{ width: size, height: size }} />;
}

export default function PosTerminal() {
  const { t } = useLanguage();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/pos/:id");
  const terminalId = match && params?.id ? parseInt(params.id) : null;

  const { data: terminalConfig } = useQuery<PosTerminal>({
    queryKey: ["/api/pos-terminals", terminalId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pos-terminals/${terminalId}`);
      return res.json();
    },
    enabled: terminalId !== null,
  });

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
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: branding } = useQuery<BrandingData>({ queryKey: ["/api/store/branding"] });

  const brandColor = branding?.brandColor || "#d4a574";

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
      setNewCustomerName(""); setNewCustomerPhone("");
      setNewCustomerAddress(""); setNewCustomerIdNumber("");
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
      const terminalCategoryId = terminalConfig?.categoryId ?? null;
      const effectiveCategory = terminalCategoryId !== null ? terminalCategoryId : selectedCategory;
      const matchesCategory = effectiveCategory === null || item.categoryId === effectiveCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, search, selectedCategory, terminalConfig]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function addToCart(item: InventoryItem) {
    const existing = cart.find((c) => c.inventoryItemId === item.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= item.quantity) return;
    if (existing) {
      setCart(cart.map((c) => c.inventoryItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { inventoryItemId: item.id, name: item.name, sku: item.sku, price: parseFloat(item.sellingPrice), quantity: 1 }]);
    }
  }

  function updateQty(inventoryItemId: number, delta: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.inventoryItemId !== inventoryItemId) return c;
        const newQty = c.quantity + delta;
        if (newQty <= 0) return null as any;
        const invItem = inventory.find((i) => i.id === inventoryItemId);
        if (invItem && newQty > invItem.quantity) return c;
        return { ...c, quantity: newQty };
      }).filter(Boolean) as CartItem[]
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
    const bc = branding?.brandColor || "#d4a574";
    const storeName = branding?.name || "Store";
    const storeAddress = branding?.address || "";
    const logoUrlRaw = branding?.logoUrl || "";
    const logoUrl = logoUrlRaw && logoUrlRaw.startsWith("/") ? `${window.location.origin}${logoUrlRaw}` : logoUrlRaw;
    const header = branding?.receiptHeader || "";
    const footer = branding?.receiptFooter || "";
    const customer = completedOrder.customerId ? customers.find((c) => c.id === completedOrder.customerId) : null;
    const customerHtml = customer
      ? `<div class="customer-block"><div class="customer-label">${t("pos.customer")}</div><div class="customer-name">${customer.name}</div>${customer.phone ? `<div class="customer-detail">${t("customers.phone")}: ${customer.phone}</div>` : ""}${customer.idNumber ? `<div class="customer-detail">${t("customers.idNumber")}: ${customer.idNumber}</div>` : ""}</div>`
      : completedOrder.customerName && completedOrder.customerName !== t("pos.walkIn")
        ? `<div class="customer-block"><div class="customer-label">${t("pos.customer")}</div><div class="customer-name">${completedOrder.customerName}</div></div>`
        : "";
    const itemsHtml = (completedOrder.items || []).map((item, idx) => {
      const invItem = inventory.find((inv) => inv.id === item.inventoryItemId);
      const details: string[] = [];
      if (item.sku) details.push(`${t("inventory.sku")}: ${item.sku}`);
      if (invItem?.metalType) details.push(`${t("inventory.metalType")}: ${invItem.metalType}`);
      if (invItem?.purity) details.push(`${t("inventory.purity")}: ${invItem.purity}`);
      if (invItem?.weightGrams) details.push(`${t("inventory.weight")}: ${invItem.weightGrams}g`);
      if (invItem?.gemstone) details.push(`${t("inventory.gemstone")}: ${invItem.gemstone}`);
      const detailsStr = details.length > 0 ? `<div class="item-details">${details.join(" · ")}</div>` : "";
      const lineTotal = Number(item.price) * item.quantity;
      const rowBg = idx % 2 === 0 ? "#fafafa" : "#fff";
      return `<tr style="background:${rowBg}"><td class="item-cell"><div class="item-name">${item.name}</div>${detailsStr}</td><td class="item-cell" style="text-align:center">${item.quantity}</td><td class="item-cell" style="text-align:right;white-space:nowrap">${Number(item.price).toLocaleString()} ${t("common.currency")}${item.quantity > 1 ? `<div class="item-details">${t("pos.total")}: ${lineTotal.toLocaleString()} ${t("common.currency")}</div>` : ""}</td></tr>`;
    }).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Poppins',sans-serif;max-width:360px;margin:0 auto;padding:18px;color:#111;font-size:13.5px;line-height:1.5}.header{text-align:center;background:${bc};color:#fff;padding:18px 14px;border-radius:10px;margin-bottom:16px}.store-name{font-size:24px;font-weight:800;letter-spacing:0.5px}.header-sub{font-size:12px;margin-top:5px;opacity:0.92;font-weight:600}.divider{border:none;border-top:1.5px dashed #d0d0d0;margin:14px 0}.order-info{display:flex;justify-content:space-between;font-size:12.5px;color:#444;margin-bottom:3px}.order-info strong{color:#111;font-weight:700}.customer-block{margin:12px 0;padding:11px 14px;background:#f5f5f5;border-radius:8px;border-left:4px solid ${bc}}.customer-label{font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:${bc};font-weight:800;margin-bottom:5px}.customer-name{font-weight:700;font-size:14px}.customer-detail{font-size:12px;color:#555;margin-top:3px}table{width:100%;border-collapse:collapse;margin-top:4px}thead th{font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:#666;font-weight:700;padding:7px 5px;border-bottom:2px solid #ddd;text-align:left}.item-cell{padding:9px 5px;border-bottom:1px solid #eee;vertical-align:top;font-size:13px}.item-name{font-weight:700;font-size:13px}.item-details{font-size:11px;color:#777;margin-top:3px}.totals{margin-top:14px;padding-top:12px;border-top:2px solid #ddd}.total-line{display:flex;justify-content:space-between;font-size:13px;color:#444;padding:4px 0;font-weight:600}.grand-total{display:flex;justify-content:space-between;margin-top:8px;padding:12px 14px;background:${bc};color:#fff;border-radius:8px;font-size:18px;font-weight:800}.payment-method{font-size:12px;color:#666;margin-top:9px;text-align:center;font-weight:600}.footer{text-align:center;margin-top:16px;padding-top:13px;border-top:1.5px dashed #d0d0d0}.footer-text{font-size:12px;color:#555;margin-bottom:5px;font-weight:600}.thank-you{font-size:14px;font-weight:700;color:${bc};margin-bottom:6px}.website{font-size:11px;color:#aaa;margin-top:8px}.print-btn{display:block;margin:18px auto 0;width:100%;padding:11px;font-size:14px;font-weight:700;background:${bc};color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:'Poppins',sans-serif}@media print{.print-btn{display:none}}</style></head><body><div class="header">${logoUrl ? `<img src="${logoUrl}" alt="logo" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:8px;border-radius:4px">` : ""}<div class="store-name">${storeName}</div>${storeAddress ? `<div class="header-sub">${storeAddress}</div>` : ""}${header ? `<div class="header-sub">${header}</div>` : ""}</div><div class="order-info"><span><strong>${t("pos.orderNumber")}</strong> ${completedOrder.orderNumber}</span></div><div class="order-info"><span><strong>${t("receipt.date")}:</strong> ${new Date(completedOrder.createdAt).toLocaleString()}</span></div><hr class="divider">${customerHtml}<table><thead><tr><th>${t("pos.item")}</th><th style="text-align:center">${t("pos.qty")}</th><th style="text-align:right">${t("pos.price")}</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="totals"><div class="total-line"><span>${t("pos.total")}:</span><span>${Number(completedOrder.subtotal).toLocaleString()} ${t("common.currency")}</span></div>${Number(completedOrder.discount) > 0 ? `<div class="total-line"><span>${t("pos.discount")}:</span><span style="color:#e53e3e">-${Number(completedOrder.discount).toLocaleString()} ${t("common.currency")}</span></div>` : ""}<div class="grand-total"><span>${t("pos.grandTotal")}:</span><span>${Number(completedOrder.total).toLocaleString()} ${t("common.currency")}</span></div><div class="payment-method">${t("pos.payment")}: ${completedOrder.paymentMethod}</div></div><div class="footer">${footer ? `<div class="footer-text">${footer}</div>` : ""}<div class="thank-you">${t("receipt.thankYou")}</div><div class="website">www.IQ-pos.com</div></div><button class="print-btn" onclick="window.print()">${t("receipt.print")}</button></body></html>`);
    w.document.close();
  }

  const terminalCatLocked = terminalConfig?.categoryId != null;

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden" data-testid="pos-terminal" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors flex-shrink-0"
          data-testid="button-back-to-pos-home"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain bg-white p-0.5 flex-shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: brandColor }}>
            <Gem className="h-4 w-4 text-white" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white leading-none truncate" data-testid="text-pos-title">
            {terminalConfig?.name || t("pos.terminal")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{branding?.name}</p>
        </div>

        {/* Cart count badge */}
        {cartCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: brandColor }}>
            <ShoppingCart className="h-4 w-4" />
            {cartCount}
          </div>
        )}
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Category Sidebar */}
        {!terminalCatLocked && (
          <aside className="w-20 bg-slate-900 border-e border-slate-800 flex flex-col gap-1 py-3 px-2 overflow-y-auto flex-shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === null
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
              style={selectedCategory === null ? { backgroundColor: brandColor + "30", color: brandColor } : {}}
              data-testid="button-category-all"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={selectedCategory === null ? { backgroundColor: brandColor } : { backgroundColor: "#1e293b" }}>
                <Layers className="h-4 w-4 text-white" />
              </div>
              <span className="truncate w-full text-center leading-tight" style={{ fontSize: "10px" }}>
                {isAr ? "الكل" : "All"}
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                }`}
                style={selectedCategory === cat.id ? { color: brandColor } : {}}
                data-testid={`button-category-${cat.id}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={selectedCategory === cat.id ? { backgroundColor: brandColor } : { backgroundColor: "#1e293b" }}
                >
                  <Tag className="h-4 w-4 text-white" />
                </div>
                <span className="truncate w-full text-center leading-tight" style={{ fontSize: "10px" }}>
                  {cat.name}
                </span>
              </button>
            ))}
          </aside>
        )}

        {/* Product Grid */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
          {/* Search */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pos.searchItems")}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-2.5 text-sm text-foreground placeholder-slate-400 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': brandColor } as any}
                data-testid="input-search-items"
              />
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {loadingInventory ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColor }} />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm" data-testid="text-no-items">{t("pos.noItems")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredItems.map((item) => {
                  const inCart = cart.find((c) => c.inventoryItemId === item.id);
                  const outOfStock = item.quantity <= 0;
                  return (
                    <div
                      key={item.id}
                      onClick={() => !outOfStock && addToCart(item)}
                      className={`group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-150 ${
                        outOfStock
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg hover:-translate-y-0.5"
                      }`}
                      data-testid={`card-item-${item.id}`}
                    >
                      {/* Image or color block */}
                      {item.imageUrl ? (
                        <div className="w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            data-testid={`img-item-${item.id}`}
                          />
                        </div>
                      ) : (
                        <div
                          className="w-full aspect-[4/3] flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}08)` }}
                        >
                          <Gem className="h-8 w-8" style={{ color: brandColor + "80" }} />
                        </div>
                      )}

                      {/* In-cart badge */}
                      {inCart && (
                        <div
                          className="absolute top-2 end-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
                          style={{ backgroundColor: brandColor }}
                        >
                          {inCart.quantity}
                        </div>
                      )}

                      {/* Out of stock overlay */}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center">
                          <span className="text-xs font-bold text-red-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-red-200">
                            {isAr ? "نفد" : "Out"}
                          </span>
                        </div>
                      )}

                      <div className="p-3">
                        <p className="font-semibold text-sm text-foreground leading-tight truncate" data-testid={`text-item-name-${item.id}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate" data-testid={`badge-sku-${item.id}`}>
                          {item.sku}
                        </p>
                        {(item.metalType || item.weightGrams) && (
                          <p className="text-xs text-slate-400 truncate">
                            {item.metalType}{item.purity ? ` · ${item.purity}` : ""}{item.weightGrams ? ` · ${item.weightGrams}g` : ""}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold" style={{ color: brandColor }} data-testid={`text-item-price-${item.id}`}>
                            {Number(item.sellingPrice).toLocaleString()}
                            <span className="text-xs font-normal text-slate-400 ms-1">{t("common.currency")}</span>
                          </span>
                          <span className="text-xs text-slate-400" data-testid={`text-item-qty-${item.id}`}>
                            ×{item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ── Cart Panel ─────────────────────────────────────────── */}
        <aside className="w-80 xl:w-96 flex flex-col bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 flex-shrink-0">

          {/* Cart Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-slate-400" />
              <span className="font-bold text-sm">{t("pos.cart")}</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: brandColor }}>
                  {cartCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => { setCart([]); setDiscount(0); }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                data-testid="button-clear-cart"
              >
                <X className="h-3 w-3" />
                {isAr ? "مسح" : "Clear"}
              </button>
            )}
          </div>

          {/* Customer selector */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="flex-1 h-9 text-sm" data-testid="select-customer">
                  <SelectValue placeholder={t("pos.selectCustomer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {t("pos.walkIn")}
                    </div>
                  </SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => setNewCustomerDialog(true)}
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-foreground hover:border-slate-300 transition-colors flex-shrink-0"
                data-testid="button-new-customer-pos"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <ShoppingCart className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400" data-testid="text-empty-cart">{t("pos.emptyCart")}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {cart.map((item) => (
                  <div key={item.inventoryItemId} className="px-4 py-3" data-testid={`cart-item-${item.inventoryItemId}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: brandColor + "15" }}>
                        <Gem className="h-4 w-4" style={{ color: brandColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground leading-tight truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.price.toLocaleString()} {t("common.currency")}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.inventoryItemId)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex-shrink-0 mt-0.5"
                        data-testid={`button-remove-${item.inventoryItemId}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2 ps-12">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(item.inventoryItemId, -1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          data-testid={`button-qty-minus-${item.inventoryItemId}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-foreground" data-testid={`text-cart-qty-${item.inventoryItemId}`}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.inventoryItemId, 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          data-testid={`button-qty-plus-${item.inventoryItemId}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-foreground" data-testid={`text-line-total-${item.inventoryItemId}`}>
                        {(item.price * item.quantity).toLocaleString()}
                        <span className="text-xs font-normal text-slate-400 ms-1">{t("common.currency")}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + Payment */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3 flex-shrink-0">
            {/* Subtotal + Discount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t("pos.total")}</span>
                <span className="font-medium" data-testid="text-subtotal">
                  {subtotal.toLocaleString()} {t("common.currency")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 shrink-0">{t("pos.discount")}</span>
                <input
                  type="number"
                  min={0}
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 transition-all"
                  data-testid="input-discount"
                />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-base">{t("pos.grandTotal")}</span>
                <span className="font-bold text-lg" style={{ color: brandColor }} data-testid="text-grand-total">
                  {grandTotal.toLocaleString()} {t("common.currency")}
                </span>
              </div>
            </div>

            {/* Payment buttons 2×2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={cart.length === 0 || orderMutation.isPending}
                onClick={() => handlePayment("cash")}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-white text-xs transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                data-testid="button-pay-cash"
              >
                <Banknote className="h-5 w-5" />
                {t("pos.payByCash")}
              </button>
              <button
                disabled={cart.length === 0 || orderMutation.isPending}
                onClick={() => handlePayment("card")}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-white text-xs transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 shadow-sm"
                data-testid="button-pay-card"
              >
                <CreditCard className="h-5 w-5" />
                {t("pos.payByCard")}
              </button>
              <button
                disabled={cart.length === 0 || orderMutation.isPending}
                onClick={() => handlePayment("transfer")}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-white text-xs transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-violet-500 hover:bg-violet-600 shadow-sm"
                data-testid="button-pay-transfer"
              >
                <ArrowRightLeft className="h-5 w-5" />
                {t("pos.payByTransfer")}
              </button>
              <button
                disabled={cart.length === 0 || orderMutation.isPending}
                onClick={() => handlePayment("debit")}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-white text-xs transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-600 shadow-sm"
                data-testid="button-pay-debit"
              >
                <Clock className="h-5 w-5" />
                {t("pos.payByDebit")}
              </button>
            </div>

            {orderMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isAr ? "جارٍ المعالجة..." : "Processing..."}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Order Success Dialog ──────────────────────────────── */}
      <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <DialogTitle className="text-lg" data-testid="text-order-placed">{t("pos.orderPlaced")}</DialogTitle>
            </div>
          </DialogHeader>
          {completedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded-xl" data-testid="text-order-number">
                <span className="text-slate-500">{t("pos.orderNumber")}</span>
                <span className="font-bold text-foreground">{completedOrder.orderNumber}</span>
              </div>
              {completedOrder.customerId && customers.find((c) => c.id === completedOrder.customerId) && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 text-sm space-y-1" data-testid="text-order-customer-info">
                  <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider">{t("pos.customer")}</div>
                  <div className="font-medium">{customers.find((c) => c.id === completedOrder.customerId)!.name}</div>
                  {customers.find((c) => c.id === completedOrder.customerId)!.phone && (
                    <div className="text-slate-400">{t("customers.phone")}: {customers.find((c) => c.id === completedOrder.customerId)!.phone}</div>
                  )}
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
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-slate-400">
                            {[item.sku, invItem?.metalType, invItem?.purity, invItem?.weightGrams ? `${invItem.weightGrams}g` : null].filter(Boolean).join(" · ")}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-end">{Number(item.price).toLocaleString()}</TableCell>
                        <TableCell className="text-end font-medium" data-testid={`text-order-item-total-${idx}`}>
                          {(Number(item.price) * item.quantity).toLocaleString()} {t("common.currency")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>{t("pos.total")}</span>
                  <span>{Number(completedOrder.subtotal).toLocaleString()} {t("common.currency")}</span>
                </div>
                {Number(completedOrder.discount) > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>{t("pos.discount")}</span>
                    <span>−{Number(completedOrder.discount).toLocaleString()} {t("common.currency")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-200 dark:border-slate-700">
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

      {/* ── New Customer Dialog ──────────────────────────────── */}
      <Dialog open={newCustomerDialog} onOpenChange={setNewCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customers.addCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: t("customers.name"), value: newCustomerName, set: setNewCustomerName, id: "input-new-customer-name" },
              { label: t("customers.phone"), value: newCustomerPhone, set: setNewCustomerPhone, id: "input-new-customer-phone" },
              { label: t("customers.idNumber"), value: newCustomerIdNumber, set: setNewCustomerIdNumber, id: "input-new-customer-id-number" },
              { label: t("customers.address"), value: newCustomerAddress, set: setNewCustomerAddress, id: "input-new-customer-address" },
            ].map(({ label, value, set, id }) => (
              <div key={id} className="space-y-1.5">
                <label className="text-sm font-medium">{label}</label>
                <Input value={value} onChange={(e) => set(e.target.value)} data-testid={id} />
              </div>
            ))}
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
