import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order, OrderItem, InventoryItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShoppingBag, Eye, Ban, Pencil, Plus, Trash2, X, Printer } from "lucide-react";

type BrandingData = {
  name: string;
  brandColor: string | null;
  logoUrl: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  address: string | null;
};

type StatusFilter = "all" | "completed" | "cancelled" | "refunded";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  pending: "secondary",
  cancelled: "destructive",
  refunded: "outline",
};

const paymentVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  cash: "secondary",
  card: "default",
  transfer: "outline",
  debit: "destructive",
};

type EditItem = {
  inventoryItemId: number;
  name: string;
  sku: string;
  price: string;
  quantity: number;
};

export default function OrdersHistory() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [voidOrderId, setVoidOrderId] = useState<number | null>(null);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editDiscount, setEditDiscount] = useState("0");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: branding } = useQuery<BrandingData>({
    queryKey: ["/api/store/branding"],
  });

  async function printOrderReceipt(order: Order) {
    const res = await fetch(`/api/orders/${order.id}/items`, { credentials: "include" });
    if (!res.ok) return;
    const items: OrderItem[] = await res.json();

    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;

    const brandColor = branding?.brandColor || "#d4a574";
    const storeName = branding?.name || "Store";
    const storeAddress = branding?.address || "";
    const logoUrlRaw = branding?.logoUrl || "";
    const logoUrl = logoUrlRaw && logoUrlRaw.startsWith("/") ? `${window.location.origin}${logoUrlRaw}` : logoUrlRaw;
    const header = branding?.receiptHeader || "";
    const footer = branding?.receiptFooter || "";

    const customerHtml = order.customerName && order.customerName !== t("pos.walkIn")
      ? `<div class="customer-block"><div class="customer-label">${t("pos.customer")}</div><div class="customer-name">${order.customerName}</div></div>`
      : "";

    const itemsHtml = items.map((item, idx) => {
      const invItem = inventory.find((inv) => inv.id === item.inventoryItemId);
      const details: string[] = [];
      if (item.sku) details.push(`${t("inventory.sku")}: ${item.sku}`);
      if (invItem?.metalType) details.push(`${t("inventory.metalType")}: ${invItem.metalType}`);
      if (invItem?.purity) details.push(`${t("inventory.purity")}: ${invItem.purity}`);
      if (invItem?.weightGrams) details.push(`${t("inventory.weight")}: ${invItem.weightGrams}g`);
      if (invItem?.gemstone) details.push(`${t("inventory.gemstone")}: ${invItem.gemstone}`);
      const detailsStr = details.length > 0 ? `<div class="item-details">${details.join(" &middot; ")}</div>` : "";
      const lineTotal = Number(item.price) * item.quantity;
      const rowBg = idx % 2 === 0 ? "#fafafa" : "#fff";
      return `
      <tr style="background:${rowBg}">
        <td class="item-cell"><div class="item-name">${item.name}</div>${detailsStr}</td>
        <td class="item-cell" style="text-align:center">${item.quantity}</td>
        <td class="item-cell" style="text-align:right;white-space:nowrap">
          ${Number(item.price).toLocaleString()} ${t("common.currency")}
          ${item.quantity > 1 ? `<div class="item-details">${t("pos.total")}: ${lineTotal.toLocaleString()} ${t("common.currency")}</div>` : ""}
        </td>
      </tr>`;
    }).join("");

    w.document.write(`<!DOCTYPE html>
<html><head><title>Receipt</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:350px;margin:0 auto;padding:16px;color:#1a1a1a;font-size:13px;line-height:1.4}
.header{text-align:center;background:${brandColor};color:#fff;padding:16px 12px;border-radius:8px;margin-bottom:14px}
.store-name{font-size:22px;font-weight:700;letter-spacing:0.5px}
.header-sub{font-size:11px;margin-top:4px;opacity:0.9}
.divider{border:none;border-top:1px dashed #ccc;margin:12px 0}
.order-info{display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:2px}
.order-info strong{color:#1a1a1a}
.customer-block{margin:10px 0;padding:10px 12px;background:#f7f7f7;border-radius:6px;border-left:3px solid ${brandColor}}
.customer-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${brandColor};font-weight:700;margin-bottom:4px}
.customer-name{font-weight:600;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:2px}
thead th{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;padding:6px 4px;border-bottom:2px solid #e0e0e0;text-align:left}
.item-cell{padding:8px 4px;border-bottom:1px solid #eee;vertical-align:top;font-size:12px}
.item-name{font-weight:600;font-size:12px}
.item-details{font-size:10px;color:#777;margin-top:2px}
.totals{margin-top:12px;padding-top:10px;border-top:2px solid #e0e0e0}
.total-line{display:flex;justify-content:space-between;font-size:12px;color:#555;padding:3px 0}
.grand-total{display:flex;justify-content:space-between;margin-top:6px;padding:10px 12px;background:${brandColor};color:#fff;border-radius:6px;font-size:16px;font-weight:700}
.payment-method{font-size:11px;color:#777;margin-top:8px;text-align:center}
.footer{text-align:center;margin-top:14px;padding-top:12px;border-top:1px dashed #ccc}
.footer-text{font-size:11px;color:#666;margin-bottom:4px}
.thank-you{font-size:13px;font-weight:600;color:${brandColor};margin-bottom:6px}
.website{font-size:10px;color:#999;margin-top:8px;letter-spacing:0.5px}
.print-btn{display:block;margin:16px auto 0;width:100%;padding:10px;font-size:13px;font-weight:600;background:${brandColor};color:#fff;border:none;border-radius:6px;cursor:pointer}
.print-btn:hover{opacity:0.9}
@media print{.print-btn{display:none}}
</style></head><body>
<div class="header">
${logoUrl ? `<img src="${logoUrl}" alt="logo" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:8px;border-radius:4px">` : ""}
<div class="store-name">${storeName}</div>
${storeAddress ? `<div class="header-sub">${storeAddress}</div>` : ""}
${header ? `<div class="header-sub">${header}</div>` : ""}
</div>
<div class="order-info"><span><strong>${t("pos.orderNumber")}</strong> ${order.orderNumber}</span></div>
<div class="order-info"><span><strong>${t("receipt.date")}:</strong> ${new Date(order.createdAt!).toLocaleString()}</span></div>
<hr class="divider">
${customerHtml}
<table>
<thead><tr><th>${t("pos.item")}</th><th style="text-align:center">${t("pos.qty")}</th><th style="text-align:right">${t("pos.price")}</th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<div class="totals">
<div class="total-line"><span>${t("pos.total")}:</span><span>${Number(order.subtotal).toLocaleString()} ${t("common.currency")}</span></div>
${Number(order.discount) > 0 ? `<div class="total-line"><span>${t("pos.discount")}:</span><span style="color:#e53e3e">-${Number(order.discount).toLocaleString()} ${t("common.currency")}</span></div>` : ""}
<div class="grand-total"><span>${t("pos.grandTotal")}:</span><span>${Number(order.total).toLocaleString()} ${t("common.currency")}</span></div>
${order.paymentMethod ? `<div class="payment-method">${t("pos.payment")}: ${order.paymentMethod}</div>` : ""}
</div>
<div class="footer">
${footer ? `<div class="footer-text">${footer}</div>` : ""}
<div class="thank-you">${t("receipt.thankYou")}</div>
<div class="website">www.IQ-pos.com</div>
</div>
<button class="print-btn" onclick="window.print()">${t("receipt.print")}</button>
</body></html>`);
    w.document.close();
  }

  const { data: orderItems = [], isLoading: loadingItems } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", selectedOrderId, "items"],
    enabled: selectedOrderId !== null,
    queryFn: async () => {
      const res = await fetch(`/api/orders/${selectedOrderId}/items`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const { data: editOrderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", editOrderId, "items"],
    enabled: editOrderId !== null,
    queryFn: async () => {
      const res = await fetch(`/api/orders/${editOrderId}/items`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const voidMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { status: "cancelled" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setVoidOrderId(null);
      toast({ title: t("orders.voidSuccess") });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ orderId, items, discount }: { orderId: number; items: EditItem[]; discount: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/items`, { items, discount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setEditOrderId(null);
      toast({ title: t("orders.editSuccess") });
    },
  });

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const editOrder = orders.find((o) => o.id === editOrderId);

  const openEditDialog = (order: Order) => {
    setEditOrderId(order.id);
    setEditDiscount(order.discount || "0");
  };

  const initEditItems = () => {
    if (editOrderItems.length > 0 && editItems.length === 0) {
      setEditItems(editOrderItems.map((oi) => ({
        inventoryItemId: oi.inventoryItemId,
        name: oi.name,
        sku: oi.sku || "",
        price: oi.price,
        quantity: oi.quantity,
      })));
    }
  };

  const editSubtotal = editItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  const editTotal = editSubtotal - parseFloat(editDiscount || "0");

  const addItemToEdit = (item: InventoryItem) => {
    const existing = editItems.find((ei) => ei.inventoryItemId === item.id);
    if (existing) {
      setEditItems(editItems.map((ei) =>
        ei.inventoryItemId === item.id ? { ...ei, quantity: ei.quantity + 1 } : ei
      ));
    } else {
      setEditItems([...editItems, {
        inventoryItemId: item.id,
        name: item.name,
        sku: item.sku,
        price: item.sellingPrice,
        quantity: 1,
      }]);
    }
  };

  const removeEditItem = (inventoryItemId: number) => {
    setEditItems(editItems.filter((ei) => ei.inventoryItemId !== inventoryItemId));
  };

  const updateEditItemQty = (inventoryItemId: number, qty: number) => {
    if (qty < 1) return;
    setEditItems(editItems.map((ei) =>
      ei.inventoryItemId === inventoryItemId ? { ...ei, quantity: qty } : ei
    ));
  };

  const updateEditItemPrice = (inventoryItemId: number, price: string) => {
    setEditItems(editItems.map((ei) =>
      ei.inventoryItemId === inventoryItemId ? { ...ei, price } : ei
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold" data-testid="text-orders-title">
        {t("orders.title")}
      </h1>

      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
      >
        <TabsList data-testid="tabs-status-filter">
          <TabsTrigger value="all" data-testid="tab-all">
            {t("pos.allCategories")}
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            {t("orders.completed")}
          </TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled">
            {t("orders.cancelled")}
          </TabsTrigger>
          <TabsTrigger value="refunded" data-testid="tab-refunded">
            {t("orders.refunded")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground" data-testid="text-no-orders">
              {t("orders.noOrders")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orders.orderNumber")}</TableHead>
                <TableHead>{t("orders.customer")}</TableHead>
                <TableHead>{t("orders.total")}</TableHead>
                <TableHead>{t("orders.payment")}</TableHead>
                <TableHead>{t("orders.status")}</TableHead>
                <TableHead>{t("orders.date")}</TableHead>
                <TableHead>{t("orders.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                  <TableCell className="font-mono text-sm" data-testid={`text-order-number-${order.id}`}>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell data-testid={`text-order-customer-${order.id}`}>
                    {order.customerName || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-order-total-${order.id}`}>
                    {parseFloat(order.total).toLocaleString()} {t("common.currency")}
                  </TableCell>
                  <TableCell>
                    {order.paymentMethod && (
                      <Badge
                        variant={paymentVariants[order.paymentMethod] || "secondary"}
                        className="no-default-active-elevate"
                        data-testid={`badge-payment-${order.id}`}
                      >
                        {order.paymentMethod === "cash"
                          ? t("pos.payByCash")
                          : order.paymentMethod === "card"
                            ? t("pos.payByCard")
                            : order.paymentMethod === "debit"
                              ? t("pos.payByDebit")
                              : t("pos.payByTransfer")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariants[order.status] || "secondary"}
                      className="no-default-active-elevate"
                      data-testid={`badge-status-${order.id}`}
                    >
                      {t(`orders.${order.status}` as any)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-order-date-${order.id}`}>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedOrderId(order.id)}
                        data-testid={`button-view-items-${order.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => printOrderReceipt(order)}
                        data-testid={`button-print-order-${order.id}`}
                        title={t("pos.printReceipt")}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {order.status === "completed" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(order)}
                            data-testid={`button-edit-order-${order.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setVoidOrderId(order.id)}
                            data-testid={`button-void-order-${order.id}`}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={selectedOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("orders.items")} - {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {loadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orderItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {t("orders.noOrders")}
            </p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("inventory.sku")}</TableHead>
                    <TableHead>{t("inventory.name")}</TableHead>
                    <TableHead>{t("pos.qty")}</TableHead>
                    <TableHead>{t("pos.price")}</TableHead>
                    <TableHead>{t("pos.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id} data-testid={`row-order-item-${item.id}`}>
                      <TableCell className="font-mono text-sm">{item.sku || "-"}</TableCell>
                      <TableCell data-testid={`text-item-name-${item.id}`}>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {parseFloat(item.price).toLocaleString()} {t("common.currency")}
                      </TableCell>
                      <TableCell data-testid={`text-item-total-${item.id}`}>
                        {(parseFloat(item.price) * item.quantity).toLocaleString()} {t("common.currency")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {selectedOrder && (
            <div className="flex justify-between items-center pt-2 text-sm font-medium">
              <span>{t("pos.grandTotal")}</span>
              <span data-testid="text-order-detail-total">
                {parseFloat(selectedOrder.total).toLocaleString()} {t("common.currency")}
              </span>
            </div>
          )}
          {selectedOrder && (
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => printOrderReceipt(selectedOrder)}
                data-testid="button-print-order-dialog"
              >
                <Printer className="h-4 w-4 me-2" />
                {t("pos.printReceipt")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={voidOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setVoidOrderId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("orders.void")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground" data-testid="text-void-confirm">
            {t("orders.voidConfirm")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOrderId(null)} data-testid="button-void-cancel">
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => voidOrderId && voidMutation.mutate(voidOrderId)}
              disabled={voidMutation.isPending}
              data-testid="button-void-confirm"
            >
              {voidMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("orders.void")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOrderId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditOrderId(null);
            setEditItems([]);
          } else {
            initEditItems();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={() => initEditItems()}>
          <DialogHeader>
            <DialogTitle data-testid="text-edit-order-title">
              {t("orders.editOrder")} - {editOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {inventory.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant="outline"
                  onClick={() => addItemToEdit(item)}
                  data-testid={`button-add-edit-item-${item.id}`}
                >
                  <Plus className="h-3 w-3 me-1" />
                  {item.name}
                </Button>
              ))}
            </div>

            {editItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t("orders.noOrders")}</p>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("inventory.name")}</TableHead>
                      <TableHead>{t("pos.qty")}</TableHead>
                      <TableHead>{t("pos.price")}</TableHead>
                      <TableHead>{t("pos.amount")}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editItems.map((item) => (
                      <TableRow key={item.inventoryItemId} data-testid={`row-edit-item-${item.inventoryItemId}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateEditItemQty(item.inventoryItemId, parseInt(e.target.value) || 1)}
                            className="w-16"
                            data-testid={`input-edit-qty-${item.inventoryItemId}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateEditItemPrice(item.inventoryItemId, e.target.value)}
                            className="w-28"
                            data-testid={`input-edit-price-${item.inventoryItemId}`}
                          />
                        </TableCell>
                        <TableCell>
                          {(parseFloat(item.price) * item.quantity).toLocaleString()} {t("common.currency")}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeEditItem(item.inventoryItemId)}
                            data-testid={`button-remove-edit-item-${item.inventoryItemId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">{t("pos.discount")}</label>
              <Input
                type="number"
                min="0"
                value={editDiscount}
                onChange={(e) => setEditDiscount(e.target.value)}
                className="w-32"
                data-testid="input-edit-discount"
              />
            </div>

            <div className="flex justify-between items-center text-sm font-medium border-t pt-2">
              <span>{t("pos.grandTotal")}</span>
              <span data-testid="text-edit-total">
                {editTotal.toLocaleString()} {t("common.currency")}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditOrderId(null); setEditItems([]); }}
              data-testid="button-edit-cancel"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => editOrderId && editMutation.mutate({ orderId: editOrderId, items: editItems, discount: editDiscount })}
              disabled={editMutation.isPending || editItems.length === 0}
              data-testid="button-edit-save"
            >
              {editMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
