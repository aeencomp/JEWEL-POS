import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CreditCard, Smartphone } from "lucide-react";
import { RestoPageHeader, OrderStatusBadge } from "./restaurant-shared";
import { cn } from "@/lib/utils";

type OrderItem = { id: number; name: string; quantity: number; price?: string };
type Order = {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  customerName: string | null;
  source: string;
  orderType: string;
  createdAt: string;
  notes: string | null;
  table: { tableNumber: number } | null;
  items?: OrderItem[];
};

const FILTERS = [
  { id: "all", en: "All", ar: "الكل" },
  { id: "active", en: "Active", ar: "نشط" },
  { id: "completed", en: "Completed", ar: "مكتمل" },
  { id: "unpaid", en: "Unpaid", ar: "غير مدفوع" },
] as const;

export default function RestaurantOrders() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [search, setSearch] = useState("");

  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/restaurant/orders"] });

  const markPaid = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/restaurant/orders/${id}/status`, { status: "completed", paymentStatus: "paid" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
    },
  });

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === "active") list = list.filter((o) => !["completed", "cancelled"].includes(o.status));
    if (filter === "completed") list = list.filter((o) => o.status === "completed");
    if (filter === "unpaid") list = list.filter((o) => o.paymentStatus === "unpaid" && o.status !== "cancelled");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [orders, filter, search]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <RestoPageHeader
        title={isAr ? "سجل الطلبات" : "Order History"}
        subtitle={isAr ? `${orders.length} طلب إجمالي` : `${orders.length} total orders`}
        isAr={isAr}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAr ? "بحث برقم الطلب أو الزبون..." : "Search order # or customer..."} className="ps-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors",
                filter === f.id ? "bg-orange-600 text-white border-orange-600" : "border-border text-muted-foreground hover:border-orange-300",
              )}
            >
              {isAr ? f.ar : f.en}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((o) => {
          const lineItems = o.items ?? [];
          return (
            <div key={o.id} className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-base">{o.orderNumber}</p>
                    <OrderStatusBadge status={o.status} isAr={isAr} />
                    {o.source === "qr" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground border rounded-full px-2 py-0.5">
                        <Smartphone className="h-3 w-3" /> QR
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {o.table
                      ? `${isAr ? "طاولة" : "Table"} #${o.table.tableNumber}`
                      : o.customerName || (isAr ? "زبون" : "Guest")}
                    {" · "}
                    <span className="font-semibold text-foreground tabular-nums">{parseFloat(o.total).toLocaleString()} {isAr ? "د.ع" : "IQD"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full",
                    o.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                  )}>
                    {o.paymentStatus === "paid" ? (isAr ? "مدفوع" : "Paid") : (isAr ? "غير مدفوع" : "Unpaid")}
                  </span>
                  {o.paymentStatus === "unpaid" && o.status !== "cancelled" && (
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 gap-1" onClick={() => markPaid.mutate(o.id)}>
                      <CreditCard className="h-3.5 w-3.5" />
                      {isAr ? "تم الدفع" : "Mark Paid"}
                    </Button>
                  )}
                </div>
              </div>
              {lineItems.length > 0 ? (
                <ul className="text-sm space-y-1.5 rounded-xl bg-muted/30 p-3">
                  {lineItems.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        <span className="font-bold text-orange-600 tabular-nums">{item.quantity}×</span> {item.name}
                      </span>
                      {item.price && (
                        <span className="text-muted-foreground tabular-nums shrink-0">
                          {(parseFloat(item.price) * item.quantity).toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">{isAr ? "لا توجد أصناف" : "No items recorded"}</p>
              )}
              {o.notes && <p className="text-xs text-amber-700 dark:text-amber-400">📝 {o.notes}</p>}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{isAr ? "لا توجد طلبات" : "No orders found"}</p>
      )}
    </div>
  );
}
