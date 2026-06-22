import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isFashionStore, isPharmacyStore, isGroceryStore, calcLoyaltyDiscount, LOYALTY_EARN_PER_IQD, LOYALTY_REDEEM_IQD } from "@/lib/pos-system";
import { normalizeBarcodeForScan, scanCodeVariants } from "@/lib/barcode";
import { printReceipt, type ReceiptFormat, type ReceiptLabels } from "@/lib/receipt-print";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, Category, Customer, Order, OrderItem, PosTerminal } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Shirt,
  Pill,
  ShoppingBasket,
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

export default function PosTerminal({ variant = "jewel" }: { variant?: "jewel" | "fashion" | "pharmacy" | "grocery" }) {
  const { t } = useLanguage();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const { user } = useAuth();
  const isFashion = variant === "fashion" || isFashionStore((user as { posSystem?: string })?.posSystem);
  const isPharmacy = variant === "pharmacy" || isPharmacyStore((user as { posSystem?: string })?.posSystem);
  const isGrocery = variant === "grocery" || isGroceryStore((user as { posSystem?: string })?.posSystem);
  const isRetailScan = isFashion || isPharmacy || isGrocery;
  const ItemIcon = isPharmacy ? Pill : isGrocery ? ShoppingBasket : isFashion ? Shirt : Gem;
  useLocation();
  const [match, params] = useRoute("/pos/:id");
  const terminalId = match && params?.id ? parseInt(params.id) : null;

  const { data: terminalsAll = [] } = useQuery<PosTerminal[]>({
    queryKey: ["/api/pos-terminals"],
    enabled: terminalId === null,
  });

  const { data: terminalConfig } = useQuery<PosTerminal>({
    queryKey: ["/api/pos-terminals", terminalId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pos-terminals/${terminalId}`);
      return res.json();
    },
    enabled: terminalId !== null,
  });

  const effectiveTerminalConfig = terminalConfig ?? (terminalsAll.length > 0 ? terminalsAll[0] : undefined);

  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("walk-in");
  const [cartCustomerName, setCartCustomerName] = useState("");
  const [cartCustomerPhone, setCartCustomerPhone] = useState("");
  const [cartNotes, setCartNotes] = useState("");
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
      customerPhone?: string | null;
      notes?: string | null;
      subtotal: string;
      discount: string;
      total: string;
      paymentMethod: string;
      items: { inventoryItemId: number; name: string; sku: string; price: string; quantity: number }[];
      loyaltyPointsRedeemed?: number;
    }) => {
      const res = await apiRequest("POST", "/api/orders", payload);
      return (await res.json()) as OrderResponse;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/returnable"] });
      setCompletedOrder(order);
      setOrderDialog(true);
      setCart([]);
      setDiscount(0);
      setManualDiscount(0);
      setLoyaltyRedeem(0);
      setSelectedCustomerId("walk-in");
      setCartCustomerName("");
      setCartCustomerPhone("");
      setCartNotes("");
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
    const q = search.trim().toLowerCase();
    return inventory.filter((item) => {
      const barcode = (item as InventoryItem & { barcode?: string }).barcode;
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (barcode && barcode.toLowerCase().includes(q));
      const terminalCategoryId = effectiveTerminalConfig?.categoryId ?? null;
      const effectiveCategory = terminalCategoryId !== null ? terminalCategoryId : selectedCategory;
      const matchesCategory = effectiveCategory === null || item.categoryId === effectiveCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, search, selectedCategory, effectiveTerminalConfig]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedCustomer = customers.find((c) => c.id === Number(selectedCustomerId));
  const maxLoyaltyRedeem = selectedCustomer?.loyaltyPoints || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const pointsToEarn = isFashion ? Math.floor(grandTotal / LOYALTY_EARN_PER_IQD) : 0;

  function applyLoyaltyRedeem(points: number) {
    const capped = Math.min(Math.max(0, points), maxLoyaltyRedeem);
    setLoyaltyRedeem(capped);
    setDiscount(manualDiscount + calcLoyaltyDiscount(capped));
  }

  function applyManualDiscount(value: number) {
    const v = Math.max(0, value);
    setManualDiscount(v);
    setDiscount(v + calcLoyaltyDiscount(loyaltyRedeem));
  }

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

  const findItemByScanCode = useCallback((code: string): InventoryItem | undefined => {
    const variants = scanCodeVariants(code);
    if (variants.length === 0) return undefined;
    return inventory.find((item) => {
      const barcode = (item as InventoryItem & { barcode?: string }).barcode;
      const sku = item.sku.toLowerCase();
      if (variants.includes(sku)) return true;
      if (!barcode) return false;
      const bcVariants = scanCodeVariants(barcode);
      return bcVariants.some((v) => variants.includes(v));
    });
  }, [inventory]);

  function handleBarcodeScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    const item = findItemByScanCode(trimmed);
    if (!item) {
      toast({
        title: isAr ? "لم يُعثر على المنتج" : "Item not found",
        description: normalizeBarcodeForScan(trimmed) || trimmed,
        variant: "destructive",
      });
      setSearch("");
      return;
    }
    if (!item.isAvailable || item.quantity <= 0) {
      toast({
        title: isAr ? "المنتج غير متوفر" : "Out of stock",
        description: item.name,
        variant: "destructive",
      });
      setSearch("");
      return;
    }
    addToCart(item);
    setSearch("");
    toast({ title: isAr ? "تمت الإضافة" : "Added to cart", description: item.name });
  }

  const scannerCaptureActive = isRetailScan && !orderDialog && !newCustomerDialog;

  useEffect(() => {
    if (!scannerCaptureActive) return;
    const refocus = () => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      scannerInputRef.current?.focus();
    };
    refocus();
    const timer = window.setInterval(refocus, 800);
    return () => clearInterval(timer);
  }, [scannerCaptureActive]);

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
    const trimmedName = cartCustomerName.trim();
    const trimmedPhone = cartCustomerPhone.trim();
    const trimmedNotes = cartNotes.trim();
    const customerName = trimmedName || selectedCustomer?.name || t("pos.walkIn");
    const customerPhone = trimmedPhone || selectedCustomer?.phone || null;

    orderMutation.mutate({
      customerId: selectedCustomer ? selectedCustomer.id : null,
      customerName,
      customerPhone: customerPhone || null,
      notes: trimmedNotes || null,
      subtotal: subtotal.toString(),
      discount: discount.toString(),
      total: grandTotal.toString(),
      paymentMethod: method,
      loyaltyPointsRedeemed: isFashion && loyaltyRedeem > 0 ? loyaltyRedeem : undefined,
      items: cart.map((c) => ({
        inventoryItemId: c.inventoryItemId,
        name: c.name,
        sku: c.sku,
        price: c.price.toString(),
        quantity: c.quantity,
      })),
    });
  }

  function receiptLabels(): ReceiptLabels {
    return {
      orderNumber: t("pos.orderNumber"),
      date: t("receipt.date"),
      customer: t("pos.customer"),
      phone: t("customers.phone"),
      item: t("pos.item"),
      details: t("receipt.details"),
      qty: t("pos.qty"),
      price: t("pos.price"),
      unitPrice: t("receipt.unitPrice"),
      lineTotal: t("receipt.lineTotal"),
      total: t("pos.total"),
      discount: t("pos.discount"),
      grandTotal: t("pos.grandTotal"),
      payment: t("pos.payment"),
      notes: t("receipt.notes"),
      thankYou: t("receipt.thankYou"),
      currency: t("common.currency"),
      walkIn: t("pos.walkIn"),
      sku: t("inventory.sku"),
      size: t("inventory.size"),
      color: t("inventory.color"),
      brand: t("inventory.brand"),
      barcode: t("inventory.barcode"),
      styleCode: t("inventory.styleCode"),
      category: t("inventory.category"),
      description: t("inventory.description"),
      metalType: t("inventory.metalType"),
      purity: t("inventory.purity"),
      weight: t("inventory.weight"),
      gemstone: t("inventory.gemstone"),
      caratWeight: t("inventory.caratWeight"),
      genericName: isAr ? "الاسم العلمي" : "Generic",
      strength: isAr ? "التركيز" : "Strength",
      dosageForm: isAr ? "الشكل الدوائي" : "Form",
      batchNumber: isAr ? "رقم الدفعة" : "Batch",
      expiryDate: isAr ? "الصلاحية" : "Expiry",
    };
  }

  function receiptPrintInput() {
    if (!completedOrder) return null;
    const customer = completedOrder.customerId
      ? customers.find((c) => c.id === completedOrder.customerId)
      : null;
    const logoUrlRaw = branding?.logoUrl || "";
    const logoUrl = logoUrlRaw && logoUrlRaw.startsWith("/")
      ? `${window.location.origin}${logoUrlRaw}`
      : logoUrlRaw;
    return {
      order: completedOrder,
      items: completedOrder.items || [],
      inventory,
      categories,
      labels: receiptLabels(),
      isAr,
      isFashion: isFashion && !isPharmacy && !isGrocery,
      isPharmacy,
      isGrocery: isGrocery && !isPharmacy,
      storeName: branding?.name || "Store",
      storeAddress: branding?.address || "",
      brandColor: branding?.brandColor || "#333",
      logoUrl: logoUrl || undefined,
      receiptHeader: branding?.receiptHeader || "",
      receiptFooter: branding?.receiptFooter || "",
      customerName: completedOrder.customerName || customer?.name,
      customerPhone: completedOrder.customerPhone || customer?.phone || null,
      paymentLabel: paymentLabels[completedOrder.paymentMethod || "cash"] || completedOrder.paymentMethod || "cash",
    };
  }

  const paymentLabels: Record<string, string> = {
    cash: isAr ? "نقدي" : "Cash",
    card: isAr ? "بطاقة" : "Card",
    transfer: isAr ? "تحويل" : "Transfer",
    debit: isAr ? "آجل" : "Credit",
  };

  async function handlePrintReceipt(format: ReceiptFormat) {
    const input = receiptPrintInput();
    if (!input) {
      toast({
        title: isAr ? "لا يوجد إيصال" : "No receipt",
        description: isAr ? "أكمل عملية البيع أولاً." : "Complete a sale first.",
        variant: "destructive",
      });
      return;
    }
    try {
      const ok = await printReceipt(input, format);
      if (!ok) {
        toast({
          title: isAr ? "فشلت الطباعة" : "Print failed",
          description: isAr ? "اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى." : "Allow pop-ups for this site, then try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: isAr ? "فشلت الطباعة" : "Print failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  const terminalCatLocked = effectiveTerminalConfig?.categoryId != null;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-100 dark:bg-slate-950 overflow-hidden" data-testid="pos-terminal" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Category Sidebar */}
        {!terminalCatLocked && (
          <aside className="w-20 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex flex-col gap-1 py-3 px-2 overflow-y-auto flex-shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === null
                  ? ""
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              style={selectedCategory === null ? { backgroundColor: brandColor + "18", color: brandColor } : {}}
              data-testid="button-category-all"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={
                  selectedCategory === null
                    ? { backgroundColor: brandColor, boxShadow: `0 4px 10px ${brandColor}40` }
                    : {}
                }
              >
                <Layers
                  className={`h-4 w-4 ${selectedCategory === null ? "text-white" : "text-slate-400 dark:text-slate-500"}`}
                />
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
                    ? ""
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: brandColor + "18", color: brandColor } : {}}
                data-testid={`button-category-${cat.id}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={
                    selectedCategory === cat.id
                      ? { backgroundColor: brandColor, boxShadow: `0 4px 10px ${brandColor}40` }
                      : {}
                  }
                >
                  <Tag
                    className={`h-4 w-4 ${selectedCategory === cat.id ? "text-white" : "text-slate-400 dark:text-slate-500"}`}
                  />
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
          {isRetailScan && (
            <input
              ref={scannerInputRef}
              type="text"
              inputMode="none"
              autoComplete="off"
              aria-hidden
              tabIndex={-1}
              className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const v = (e.currentTarget as HTMLInputElement).value;
                  (e.currentTarget as HTMLInputElement).value = "";
                  handleBarcodeScan(v);
                }
              }}
            />
          )}
          {/* Search */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBarcodeScan(search);
                  }
                }}
                placeholder={isAr ? "بحث أو مسح الباركود..." : "Search or scan barcode..."}
                autoComplete="off"
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
                          <ItemIcon className="h-8 w-8" style={{ color: brandColor + "80" }} />
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
        <aside className="w-72 xl:w-80 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 flex-shrink-0">

          {/* Cart Header */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
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
                onClick={() => {
                  setCart([]);
                  setDiscount(0);
                  setManualDiscount(0);
                  setLoyaltyRedeem(0);
                  setCartNotes("");
                }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                data-testid="button-clear-cart"
              >
                <X className="h-3 w-3" />
                {isAr ? "مسح" : "Clear"}
              </button>
            )}
          </div>

          {/* Customer selector */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <Select
                value={selectedCustomerId}
                onValueChange={(v) => {
                  setSelectedCustomerId(v);
                  setLoyaltyRedeem(0);
                  setDiscount(manualDiscount);
                  if (v === "walk-in") {
                    setCartCustomerName("");
                    setCartCustomerPhone("");
                  } else {
                    const c = customers.find((x) => x.id === Number(v));
                    setCartCustomerName(c?.name || "");
                    setCartCustomerPhone(c?.phone || "");
                  }
                }}
              >
                <SelectTrigger className="flex-1 h-8 text-xs" data-testid="select-customer">
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
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-foreground hover:border-slate-300 transition-colors flex-shrink-0"
                data-testid="button-new-customer-pos"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {isFashion && selectedCustomer && (
              <p className="text-[11px] text-slate-500 mt-1.5" data-testid="text-loyalty-balance">
                {t("loyalty.available")}: <span className="font-semibold text-foreground">{selectedCustomer.loyaltyPoints || 0}</span> {t("loyalty.points")}
              </p>
            )}
            <div className="mt-1.5 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={cartCustomerName}
                  onChange={(e) => setCartCustomerName(e.target.value)}
                  placeholder={t("customers.name")}
                  className="h-8 text-xs"
                  data-testid="input-cart-customer-name"
                />
                <Input
                  value={cartCustomerPhone}
                  onChange={(e) => setCartCustomerPhone(e.target.value)}
                  placeholder={t("customers.phone")}
                  className="h-8 text-xs"
                  dir="ltr"
                  data-testid="input-cart-customer-phone"
                />
              </div>
              <Textarea
                value={cartNotes}
                onChange={(e) => setCartNotes(e.target.value)}
                placeholder={t("pos.notes")}
                rows={1}
                className="text-xs resize-none min-h-8 py-1.5"
                data-testid="input-cart-notes"
              />
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                  <div key={item.inventoryItemId} className="px-3 py-2" data-testid={`cart-item-${item.inventoryItemId}`}>
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: brandColor + "15" }}>
                        <ItemIcon className="h-3.5 w-3.5" style={{ color: brandColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs text-foreground leading-tight truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.price.toLocaleString()} {t("common.currency")}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.inventoryItemId)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex-shrink-0"
                        data-testid={`button-remove-${item.inventoryItemId}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-1.5 ps-10">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => updateQty(item.inventoryItemId, -1)}
                          className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          data-testid={`button-qty-minus-${item.inventoryItemId}`}
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-foreground" data-testid={`text-cart-qty-${item.inventoryItemId}`}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.inventoryItemId, 1)}
                          className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          data-testid={`button-qty-plus-${item.inventoryItemId}`}
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-foreground" data-testid={`text-line-total-${item.inventoryItemId}`}>
                        {(item.price * item.quantity).toLocaleString()}
                        <span className="text-[10px] font-normal text-slate-400 ms-0.5">{t("common.currency")}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + Payment */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-2.5 space-y-2 shrink-0 bg-white dark:bg-slate-900">
            {/* Subtotal + Discount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{t("pos.total")}</span>
                <span className="font-medium" data-testid="text-subtotal">
                  {subtotal.toLocaleString()} {t("common.currency")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 shrink-0">{t("pos.discount")}</span>
                <input
                  type="number"
                  min={0}
                  value={manualDiscount || ""}
                  onChange={(e) => applyManualDiscount(Number(e.target.value) || 0)}
                  className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs text-foreground focus:outline-none focus:ring-1 transition-all"
                  data-testid="input-discount"
                />
              </div>
              {isFashion && selectedCustomer && maxLoyaltyRedeem > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 shrink-0">{t("loyalty.redeem")}</span>
                  <input
                    type="number"
                    min={0}
                    max={maxLoyaltyRedeem}
                    value={loyaltyRedeem || ""}
                    onChange={(e) => applyLoyaltyRedeem(Number(e.target.value) || 0)}
                    className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 transition-all"
                    data-testid="input-loyalty-redeem"
                  />
                  <span className="text-xs text-slate-400 shrink-0">
                    −{calcLoyaltyDiscount(loyaltyRedeem).toLocaleString()}
                  </span>
                </div>
              )}
              {isFashion && pointsToEarn > 0 && selectedCustomer && (
                <p className="text-xs text-emerald-600" data-testid="text-loyalty-earn">
                  +{pointsToEarn} {t("loyalty.points")} ({t("loyalty.earn")})
                </p>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-sm">{t("pos.grandTotal")}</span>
                <span className="font-bold text-base" style={{ color: brandColor }} data-testid="text-grand-total">
                  {grandTotal.toLocaleString()} {t("common.currency")}
                </span>
              </div>
            </div>

            {/* Payment buttons 2×2 grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                disabled={cart.length === 0 || orderMutation.isPending}
                onClick={() => handlePayment("cash")}
                className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg font-semibold text-white text-[10px] leading-tight transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                data-testid="button-pay-cash"
              >
                <Banknote className="h-4 w-4" />
                {t("pos.payByCash")}
              </button>
              <button
                disabled={cart.length === 0 || orderMutation.isPending}
                onClick={() => handlePayment("card")}
                className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg font-semibold text-white text-[10px] leading-tight transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 shadow-sm"
                data-testid="button-pay-card"
              >
                <CreditCard className="h-4 w-4" />
                {t("pos.payByCard")}
              </button>
              <button
                disabled={cart.length === 0 || orderMutation.isPending}
                onClick={() => handlePayment("transfer")}
                className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg font-semibold text-white text-[10px] leading-tight transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-violet-500 hover:bg-violet-600 shadow-sm"
                data-testid="button-pay-transfer"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {t("pos.payByTransfer")}
              </button>
              <button
                disabled={cart.length === 0 || orderMutation.isPending}
                onClick={() => handlePayment("debit")}
                className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg font-semibold text-white text-[10px] leading-tight transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-600 shadow-sm"
                data-testid="button-pay-debit"
              >
                <Clock className="h-4 w-4" />
                {t("pos.payByDebit")}
              </button>
            </div>

            {completedOrder && (
              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] px-2"
                  onClick={() => handlePrintReceipt("thermal")}
                  data-testid="button-cart-print-thermal"
                >
                  <Printer className="h-3 w-3 me-1 shrink-0" />
                  <span className="truncate">{t("receipt.printThermal")}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] px-2"
                  onClick={() => handlePrintReceipt("a4")}
                  data-testid="button-cart-print-a4"
                >
                  <Printer className="h-3 w-3 me-1 shrink-0" />
                  <span className="truncate">{t("receipt.printA4")}</span>
                </Button>
              </div>
            )}

            {orderMutation.isPending && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 py-0.5">
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
          <DialogFooter className="gap-2 flex-wrap">
            <Button type="button" variant="outline" onClick={() => handlePrintReceipt("thermal")} data-testid="button-print-receipt-thermal">
              <Printer className="w-4 h-4 me-2" />
              {t("receipt.printThermal")}
            </Button>
            <Button type="button" variant="outline" onClick={() => handlePrintReceipt("a4")} data-testid="button-print-receipt-a4">
              <Printer className="w-4 h-4 me-2" />
              {t("receipt.printA4")}
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
