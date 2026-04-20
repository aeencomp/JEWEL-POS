import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { OilProduct, OilCustomer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printOilPosInvoice } from "@/components/oil-sale-invoice";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Banknote,
  ArrowRightLeft, Package, CheckCircle2, X, User, Tag, Printer, Clock,
} from "lucide-react";

function fmt(n: string | number) {
  return parseFloat(String(n || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type CartItem = {
  productId: number;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
  maxQty: number;
};

const CATEGORIES = [
  { value: "all", en: "All", ar: "الكل" },
  { value: "finished_oil", en: "Finished Oil", ar: "زيت جاهز" },
  { value: "raw_material", en: "Raw Material", ar: "مواد خام" },
  { value: "packaging", en: "Packaging", ar: "تغليف" },
  { value: "spare_part", en: "Spare Part", ar: "قطع غيار" },
  { value: "other", en: "Other", ar: "أخرى" },
];

const PAYMENT_METHODS = [
  { value: "cash", icon: Banknote, en: "Cash", ar: "نقداً", color: "bg-emerald-600 hover:bg-emerald-700" },
  { value: "transfer", icon: ArrowRightLeft, en: "Transfer", ar: "تحويل", color: "bg-blue-600 hover:bg-blue-700" },
  { value: "deferred", icon: Clock, en: "Deferred", ar: "آجل", color: "bg-amber-600 hover:bg-amber-700" },
];

export default function OilPos() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "deferred">("cash");
  const [successDialog, setSuccessDialog] = useState(false);

  // store last completed sale for printing
  const [lastSale, setLastSale] = useState<{
    invoiceNumber: string;
    date: Date;
    customerName: string | null;
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    amountPaid: number;
    paymentMethod: "cash" | "transfer" | "deferred";
  } | null>(null);

  const { data: products = [] } = useQuery<OilProduct[]>({
    queryKey: ["/api/oil/products"],
    queryFn: () => fetch("/api/oil/products", { credentials: "include" }).then(r => r.json()),
  });

  const { data: customers = [] } = useQuery<OilCustomer[]>({
    queryKey: ["/api/oil/customers"],
    queryFn: () => fetch("/api/oil/customers", { credentials: "include" }).then(r => r.json()),
  });

  const { data: storeInfo } = useQuery<any>({
    queryKey: ["/api/oil/store-info"],
    queryFn: () => fetch("/api/oil/store-info", { credentials: "include" }).then(r => r.json()),
  });

  const filtered = useMemo(() => {
    return products.filter(p => {
      const inStock = parseFloat(p.currentStock) > 0;
      const matchCat = category === "all" || p.category === category;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.nameAr && p.nameAr.includes(search));
      return inStock && matchCat && matchSearch;
    });
  }, [products, category, search]);

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const total = Math.max(0, subtotal - discount);

  function addToCart(product: OilProduct) {
    const price = parseFloat(product.salePrice);
    const max = parseFloat(product.currentStock);
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= max) {
          toast({ title: isAr ? "لا يوجد مخزون كافٍ" : "Insufficient stock", variant: "destructive" });
          return prev;
        }
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i);
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        unitPrice: price,
        quantity: 1,
        total: price,
        maxQty: max,
      }];
    });
  }

  function updateQty(productId: number, delta: number) {
    setCart(prev => prev
      .map(i => {
        if (i.productId !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return null as any;
        if (newQty > i.maxQty) {
          toast({ title: isAr ? "لا يوجد مخزون كافٍ" : "Insufficient stock", variant: "destructive" });
          return i;
        }
        return { ...i, quantity: newQty, total: newQty * i.unitPrice };
      })
      .filter(Boolean)
    );
  }

  function removeFromCart(productId: number) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  function clearCart() {
    setCart([]);
    setCustomerId("");
    setCustomerName("");
    setDiscount(0);
    setPaymentMethod("cash");
  }

  const saleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/oil/sales", data),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/oil/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });

      // snapshot the sale before clearing cart
      const customer = customers.find(c => c.id === Number(customerId));
      const paidNow = paymentMethod === "deferred" ? 0 : total;
      setLastSale({
        invoiceNumber: data.invoiceNumber || `INV-${data.id}`,
        date: new Date(),
        customerName: customer?.name || customerName || null,
        items: [...cart],
        subtotal,
        discount,
        total,
        amountPaid: paidNow,
        paymentMethod,
      });

      setSuccessDialog(true);
      clearCart();
    },
    onError: () => {
      toast({ title: isAr ? "حدث خطأ" : "Error processing sale", variant: "destructive" });
    },
  });

  function handleCheckout() {
    if (cart.length === 0) {
      toast({ title: isAr ? "السلة فارغة" : "Cart is empty", variant: "destructive" });
      return;
    }
    if (paymentMethod === "deferred" && (!customerId || customerId === "0") && !customerName.trim()) {
      toast({
        title: isAr ? "يرجى اختيار العميل" : "Customer required",
        description: isAr ? "يجب تحديد العميل للدفع الآجل" : "A customer must be selected for deferred payment",
        variant: "destructive",
      });
      return;
    }
    const isDeferred = paymentMethod === "deferred";
    const customer = customers.find(c => c.id === Number(customerId));
    saleMutation.mutate({
      customerId: customerId && customerId !== "0" ? Number(customerId) : null,
      customerName: customer?.name || customerName || null,
      totalAmount: subtotal.toFixed(2),
      discountAmount: discount.toFixed(2),
      amountPaid: isDeferred ? "0.00" : total.toFixed(2),
      paymentStatus: isDeferred ? "unpaid" : "paid",
      status: "confirmed",
      notes: null,
      items: cart.map(i => ({
        productId: i.productId,
        productName: i.productName,
        quantity: String(i.quantity),
        unitPrice: i.unitPrice.toFixed(2),
        total: i.total.toFixed(2),
      })),
    });
  }

  function handlePrintInvoice() {
    if (!lastSale) return;
    printOilPosInvoice({
      invoiceNumber: lastSale.invoiceNumber,
      date: lastSale.date,
      customerName: lastSale.customerName,
      items: lastSale.items,
      subtotal: lastSale.subtotal,
      discount: lastSale.discount,
      total: lastSale.total,
      amountPaid: lastSale.amountPaid,
      paymentStatus: lastSale.paymentMethod === "deferred" ? "unpaid" : "paid",
      paymentMethod: lastSale.paymentMethod,
      store: storeInfo || null,
      isAr,
    });
  }

  return (
    <div className="flex h-full overflow-hidden bg-slate-950" dir={isAr ? "rtl" : "ltr"} data-testid="oil-pos">
      {/* ── Product Panel ────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-e border-slate-800">
        {/* Search + Category */}
        <div className="px-4 pt-4 pb-3 bg-slate-900 border-b border-slate-800 space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="ps-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 h-9"
              placeholder={isAr ? "ابحث عن منتج..." : "Search products..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-pos-search"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  category === cat.value
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
                data-testid={`filter-category-${cat.value}`}
              >
                {isAr ? cat.ar : cat.en}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
              <Package className="h-12 w-12 opacity-20" />
              <p className="text-sm">{isAr ? "لا توجد منتجات" : "No products available"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(product => {
                const inCart = cart.find(i => i.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`relative text-start rounded-xl p-3 border transition-all duration-150 group ${
                      inCart
                        ? "bg-cyan-900/40 border-cyan-600 shadow-md shadow-cyan-900/30"
                        : "bg-slate-800/80 border-slate-700 hover:border-cyan-700 hover:bg-slate-800"
                    }`}
                    data-testid={`product-card-${product.id}`}
                  >
                    {inCart && (
                      <span className="absolute top-2 end-2 w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                        {inCart.quantity}
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mb-2 border border-cyan-700/30">
                      <Package className="h-5 w-5 text-cyan-400" />
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight mb-1 line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-[11px] text-cyan-400 font-bold">
                      {fmt(product.salePrice)} IQD/{product.unit}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isAr ? "المخزون:" : "Stock:"} {parseFloat(product.currentStock).toLocaleString()} {product.unit}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Cart Panel ───────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-slate-900" data-testid="cart-panel">
        {/* Cart Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-white text-sm">{isAr ? "السلة" : "Cart"}</span>
            {cart.length > 0 && (
              <Badge className="bg-cyan-600 text-white text-[10px] px-1.5">{cart.length}</Badge>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-slate-500 hover:text-red-400 transition-colors" data-testid="button-clear-cart">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2 py-12">
              <ShoppingCart className="h-10 w-10 opacity-30" />
              <p className="text-xs">{isAr ? "اختر منتجات للإضافة" : "Select products to add"}</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map(item => (
                <div key={item.productId} className="bg-slate-800 rounded-xl p-2.5 border border-slate-700" data-testid={`cart-item-${item.productId}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-white leading-tight flex-1">{item.productName}</p>
                    <button onClick={() => removeFromCart(item.productId)} className="text-slate-500 hover:text-red-400 flex-shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                        data-testid={`button-decrease-${item.productId}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                        data-testid={`button-increase-${item.productId}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="text-[10px] text-slate-500 ms-1">{item.unit}</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-400">{fmt(item.total)} IQD</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{fmt(item.unitPrice)} × {item.quantity}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="border-t border-slate-800 p-4 space-y-3">
            {/* Customer */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <User className="h-3 w-3" />{isAr ? "العميل" : "Customer"}
              </label>
              <Select value={customerId} onValueChange={v => {
                setCustomerId(v);
                const c = customers.find(x => x.id === Number(v));
                setCustomerName(c?.name || "");
              }}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-white" data-testid="select-pos-customer">
                  <SelectValue placeholder={isAr ? "عميل نقدي" : "Cash customer"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{isAr ? "عميل نقدي" : "Cash customer"}</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Tag className="h-3 w-3" />{isAr ? "الخصم (IQD)" : "Discount (IQD)"}
              </label>
              <Input
                type="number"
                min="0"
                max={subtotal}
                value={discount || ""}
                onChange={e => setDiscount(Math.max(0, Math.min(subtotal, parseFloat(e.target.value) || 0)))}
                className="h-8 text-xs bg-slate-800 border-slate-700 text-white"
                placeholder="0"
                data-testid="input-pos-discount"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              {discount > 0 && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{isAr ? "المجموع" : "Subtotal"}</span>
                  <span>{fmt(subtotal)} IQD</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>{isAr ? "الخصم" : "Discount"}</span>
                  <span>-{fmt(discount)} IQD</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">{isAr ? "الإجمالي" : "Total"}</span>
                <span className="text-lg font-extrabold text-cyan-400">{fmt(total)} IQD</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value as any)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] font-semibold transition-all ${
                    paymentMethod === pm.value
                      ? `${pm.color} text-white ring-2 ring-white/20`
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                  data-testid={`button-payment-${pm.value}`}
                >
                  <pm.icon className="h-4 w-4" />
                  {isAr ? pm.ar : pm.en}
                </button>
              ))}
            </div>

            {/* Deferred hint */}
            {paymentMethod === "deferred" && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-lg px-2.5 py-1.5">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                {isAr
                  ? "سيُسجَّل المبلغ كدَين على العميل — اختر عميلاً أولاً"
                  : "Amount will be recorded as debt — customer required"}
              </div>
            )}

            {/* Checkout */}
            <Button
              className={`w-full text-white font-bold h-11 text-sm shadow-lg ${
                paymentMethod === "deferred"
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-900/40"
                  : "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-900/40"
              }`}
              onClick={handleCheckout}
              disabled={saleMutation.isPending}
              data-testid="button-checkout"
            >
              {saleMutation.isPending ? (
                <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />{isAr ? "جارٍ..." : "Processing..."}</span>
              ) : paymentMethod === "deferred" ? (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {isAr ? "تسجيل — آجل" : "Record as Deferred"}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {isAr ? "إتمام البيع" : "Complete Sale"}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ── Success Dialog ───────────────────────────────── */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700" data-testid="dialog-sale-success">
          <DialogHeader>
            <DialogTitle className="sr-only">{isAr ? "تمت عملية البيع" : "Sale Complete"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center gap-4">
            {/* success icon — changes based on payment method */}
            {lastSale?.paymentMethod === "deferred" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{isAr ? "تم التسجيل — آجل" : "Recorded as Deferred!"}</h2>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{isAr ? "تمت عملية البيع!" : "Sale Complete!"}</h2>
              </>
            )}

            {/* invoice summary */}
            {lastSale && (
              <div className="w-full bg-slate-800 rounded-xl p-4 space-y-2 text-sm border border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAr ? "رقم الفاتورة:" : "Invoice:"}</span>
                  <span className="text-white font-semibold">{lastSale.invoiceNumber}</span>
                </div>
                {lastSale.customerName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? "العميل:" : "Customer:"}</span>
                    <span className="text-white">{lastSale.customerName}</span>
                  </div>
                )}
                {lastSale.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? "الخصم:" : "Discount:"}</span>
                    <span className="text-red-400">-{fmt(lastSale.discount)} IQD</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAr ? "طريقة الدفع:" : "Payment:"}</span>
                  <span className={`font-semibold ${
                    lastSale.paymentMethod === "cash" ? "text-emerald-400" :
                    lastSale.paymentMethod === "transfer" ? "text-blue-400" :
                    "text-amber-400"
                  }`}>
                    {lastSale.paymentMethod === "cash"
                      ? (isAr ? "نقداً" : "Cash")
                      : lastSale.paymentMethod === "transfer"
                      ? (isAr ? "تحويل" : "Transfer")
                      : (isAr ? "آجل" : "Deferred")}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-700">
                  <span className="text-slate-300 font-semibold">{isAr ? "الإجمالي:" : "Total:"}</span>
                  <span className="text-emerald-400 font-bold text-base">{fmt(lastSale.total)} IQD</span>
                </div>
                {lastSale.paymentMethod === "deferred" && (
                  <div className="flex justify-between bg-amber-950/40 rounded-lg px-2 py-1.5 border border-amber-800/40">
                    <span className="text-amber-300 font-semibold">{isAr ? "مبلغ الدَين:" : "Debt Amount:"}</span>
                    <span className="text-amber-400 font-bold">{fmt(lastSale.total)} IQD</span>
                  </div>
                )}
              </div>
            )}

            {/* action buttons */}
            <div className="w-full grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setSuccessDialog(false)}
                data-testid="button-success-ok"
              >
                {isAr ? "متابعة" : "Continue"}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={handlePrintInvoice}
                data-testid="button-print-invoice"
              >
                <Printer className="h-4 w-4 me-2" />
                {isAr ? "طباعة" : "Print"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
