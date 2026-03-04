import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LayawayPlan, LayawayPayment, InventoryItem } from "@shared/schema";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Plus, CreditCard, History, Printer } from "lucide-react";

type StatusFilter = "all" | "active" | "completed";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  completed: "outline",
  cancelled: "destructive",
  defaulted: "destructive",
};

const layawayFormSchema = z.object({
  customerName: z.string().min(1, "Required"),
  customerPhone: z.string().optional(),
  inventoryItemId: z.string().min(1, "Required"),
  totalPrice: z.string().min(1, "Required"),
  initialPayment: z.string().min(1, "Required"),
  paymentMethod: z.enum(["cash", "card", "transfer"]),
  numberOfMonths: z.string().min(1, "Required"),
});

type LayawayFormValues = z.infer<typeof layawayFormSchema>;

const paymentFormSchema = z.object({
  amount: z.string().min(1, "Required"),
  paymentMethod: z.enum(["cash", "card", "transfer"]),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function LayawayPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentPlanId, setPaymentPlanId] = useState<number | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyPlanId, setHistoryPlanId] = useState<number | null>(null);

  const { data: layaways = [], isLoading } = useQuery<LayawayPlan[]>({
    queryKey: ["/api/layaways"],
  });

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: branding } = useQuery<{ brandColor: string; name: string; receiptHeader: string | null; receiptFooter: string | null }>({
    queryKey: ["/api/store/branding"],
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery<LayawayPayment[]>({
    queryKey: ["/api/layaways", historyPlanId, "payments"],
    enabled: historyPlanId !== null,
    queryFn: async () => {
      const res = await fetch(`/api/layaways/${historyPlanId}/payments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  const form = useForm<LayawayFormValues>({
    resolver: zodResolver(layawayFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      inventoryItemId: "",
      totalPrice: "",
      initialPayment: "",
      paymentMethod: "cash",
      numberOfMonths: "",
    },
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "",
      paymentMethod: "cash",
    },
  });

  const watchTotalPrice = form.watch("totalPrice");
  const watchInitialPayment = form.watch("initialPayment");
  const watchNumberOfMonths = form.watch("numberOfMonths");

  const monthlyInstallment = (() => {
    const total = parseFloat(watchTotalPrice) || 0;
    const initial = parseFloat(watchInitialPayment) || 0;
    const months = parseInt(watchNumberOfMonths) || 0;
    if (months <= 0) return 0;
    const remaining = total - initial;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / months);
  })();

  const createMutation = useMutation({
    mutationFn: async (values: LayawayFormValues) => {
      const totalPrice = parseFloat(values.totalPrice);
      const initialPayment = parseFloat(values.initialPayment);
      const remainingBalance = totalPrice - initialPayment;
      const months = parseInt(values.numberOfMonths) || 1;
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + months);

      const body: Record<string, unknown> = {
        customerName: values.customerName,
        customerPhone: values.customerPhone || null,
        inventoryItemId: parseInt(values.inventoryItemId),
        totalPrice: values.totalPrice,
        amountPaid: values.initialPayment,
        remainingBalance: remainingBalance.toString(),
        dueDate: dueDate.toISOString(),
      };
      const res = await apiRequest("POST", "/api/layaways", body);
      const plan = await res.json();

      if (initialPayment > 0) {
        await apiRequest("POST", `/api/layaways/${plan.id}/payments`, {
          amount: values.initialPayment,
          paymentMethod: values.paymentMethod,
        });
      }

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layaways"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setNewDialogOpen(false);
      form.reset();
      toast({ title: t("layaway.addPlan"), description: "OK" });
    },
  });

  const makePaymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      if (paymentPlanId === null) return;
      const res = await apiRequest("POST", `/api/layaways/${paymentPlanId}/payments`, {
        amount: values.amount,
        paymentMethod: values.paymentMethod,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layaways"] });
      if (historyPlanId !== null) {
        queryClient.invalidateQueries({ queryKey: ["/api/layaways", historyPlanId, "payments"] });
      }
      setPaymentDialogOpen(false);
      setPaymentPlanId(null);
      paymentForm.reset();
      toast({ title: t("layaway.makePayment"), description: "OK" });
    },
  });

  const filteredLayaways = useMemo(() => {
    if (statusFilter === "all") return layaways;
    return layaways.filter((l) => l.status === statusFilter);
  }, [layaways, statusFilter]);

  const getItemName = (itemId: number) => {
    const item = inventory.find((i) => i.id === itemId);
    return item?.name || `#${itemId}`;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: "layaway.active",
      completed: "layaway.completed",
      cancelled: "layaway.cancelled",
      defaulted: "layaway.defaulted",
    };
    return t(map[status] as any) || status;
  };

  const selectedItemId = form.watch("inventoryItemId");
  const selectedItem = inventory.find((i) => i.id === parseInt(selectedItemId || "0"));

  function printInstallmentReceipt(payment: LayawayPayment, paymentIndex: number) {
    const plan = layaways.find((l) => l.id === payment.layawayId);
    if (!plan) return;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;

    const brandColor = branding?.brandColor || "#d4a574";
    const storeName = branding?.name || "Store";
    const header = branding?.receiptHeader || "";
    const footer = branding?.receiptFooter || "";
    const item = inventory.find((i) => i.id === plan.inventoryItemId);

    const allPayments = payments.filter((p) => p.layawayId === plan.id);
    const paidBefore = allPayments
      .filter((p) => new Date(p.createdAt) <= new Date(payment.createdAt) && p.id !== payment.id)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const paidSoFar = paidBefore + Number(payment.amount);
    const remainingAfter = Number(plan.totalPrice) - paidSoFar;

    const methodLabel = payment.paymentMethod === "cash" ? t("pos.payByCash")
      : payment.paymentMethod === "card" ? t("pos.payByCard") : t("pos.payByTransfer");

    w.document.write(`<!DOCTYPE html>
<html dir="${document.documentElement.dir || 'ltr'}"><head><title>${t("layaway.installmentReceipt")}</title>
<style>
body{font-family:monospace;max-width:350px;margin:0 auto;padding:20px}
.header{text-align:center;border-bottom:2px solid ${brandColor};padding-bottom:10px;margin-bottom:10px}
.store-name{font-size:20px;font-weight:bold;color:${brandColor}}
.section{margin-bottom:12px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px}
.section-title{font-weight:bold;color:${brandColor};margin-bottom:6px;font-size:14px}
.row{display:flex;justify-content:space-between;padding:3px 0}
.row-label{color:#555}
.row-value{font-weight:bold}
.highlight{background:${brandColor}15;border-color:${brandColor};padding:10px;border-radius:6px;border:2px solid ${brandColor};margin:12px 0;text-align:center}
.highlight .amount{font-size:22px;font-weight:bold;color:${brandColor}}
.footer{text-align:center;margin-top:16px;border-top:2px solid ${brandColor};padding-top:10px;font-size:12px}
@media print{button{display:none}}
</style></head><body>
<div class="header">
<div class="store-name">${storeName}</div>
${header ? `<div style="font-size:12px;margin-top:4px">${header}</div>` : ""}
<div style="font-size:14px;font-weight:bold;margin-top:6px;color:${brandColor}">${t("layaway.installmentReceipt")}</div>
</div>

<div class="section">
<div class="row"><span class="row-label">${t("layaway.planNumber")}</span><span class="row-value">${plan.id}</span></div>
<div class="row"><span class="row-label">${t("layaway.paymentNo")}</span><span class="row-value">${paymentIndex}</span></div>
<div class="row"><span class="row-label">${t("receipt.date")}</span><span class="row-value">${new Date(payment.createdAt).toLocaleString()}</span></div>
</div>

<div class="section">
<div class="section-title">${t("layaway.customerName")}</div>
<div>${plan.customerName}</div>
${plan.customerPhone ? `<div>${t("layaway.customerPhone")}: ${plan.customerPhone}</div>` : ""}
</div>

<div class="section">
<div class="section-title">${t("layaway.item")}</div>
<div>${item?.name || "#" + plan.inventoryItemId}</div>
${item?.metalType ? `<div style="font-size:11px;color:#666">${t("inventory.metalType")}: ${item.metalType}${item.purity ? ` | ${t("inventory.purity")}: ${item.purity}` : ""}${item.weightGrams ? ` | ${t("inventory.weight")}: ${item.weightGrams}g` : ""}</div>` : ""}
</div>

<div class="highlight">
<div style="font-size:12px;color:#555;margin-bottom:4px">${t("layaway.paymentAmount")}</div>
<div class="amount">${Number(payment.amount).toLocaleString()} ${t("common.currency")}</div>
<div style="font-size:12px;margin-top:4px">${methodLabel}</div>
</div>

<div class="section">
<div class="row"><span class="row-label">${t("layaway.totalPrice")}</span><span class="row-value">${Number(plan.totalPrice).toLocaleString()} ${t("common.currency")}</span></div>
<div class="row"><span class="row-label">${t("layaway.paidSoFar")}</span><span class="row-value">${paidSoFar.toLocaleString()} ${t("common.currency")}</span></div>
<div class="row" style="border-top:1px dashed #ccc;padding-top:6px;margin-top:4px"><span class="row-label">${t("layaway.remainingAfter")}</span><span class="row-value" style="color:${remainingAfter <= 0 ? '#22c55e' : '#ef4444'}">${remainingAfter <= 0 ? "0" : remainingAfter.toLocaleString()} ${t("common.currency")}</span></div>
</div>

<div class="footer">
${footer ? `<div style="margin-bottom:6px">${footer}</div>` : ""}
<div>${t("receipt.thankYou")}</div>
</div>
<div style="text-align:center;margin-top:16px">
<button onclick="window.print()" style="padding:8px 24px;background:${brandColor};color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px">${t("receipt.print")}</button>
</div>
</body></html>`);
    w.document.close();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-layaway-title">
          {t("layaway.title")}
        </h1>
        <Button data-testid="button-new-layaway" onClick={() => setNewDialogOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t("layaway.addPlan")}
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList data-testid="tabs-layaway-status-filter">
          <TabsTrigger value="all" data-testid="tab-filter-all">All</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-filter-active">{t("layaway.active")}</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-filter-completed">{t("layaway.completed")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {filteredLayaways.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4" />
              <p data-testid="text-no-layaways">{t("layaway.noPlans")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("layaway.customerName")}</TableHead>
                  <TableHead>{t("layaway.customerPhone")}</TableHead>
                  <TableHead>{t("layaway.item")}</TableHead>
                  <TableHead>{t("layaway.totalPrice")}</TableHead>
                  <TableHead>{t("layaway.amountPaid")}</TableHead>
                  <TableHead>{t("layaway.remaining")}</TableHead>
                  <TableHead>{t("layaway.status")}</TableHead>
                  <TableHead>{t("layaway.dueDate")}</TableHead>
                  <TableHead>{t("admin.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLayaways.map((plan) => (
                  <TableRow key={plan.id} data-testid={`row-layaway-${plan.id}`}>
                    <TableCell data-testid={`text-layaway-customer-${plan.id}`}>{plan.customerName}</TableCell>
                    <TableCell data-testid={`text-layaway-phone-${plan.id}`}>{plan.customerPhone || "—"}</TableCell>
                    <TableCell data-testid={`text-layaway-item-${plan.id}`}>
                      {getItemName(plan.inventoryItemId)}
                    </TableCell>
                    <TableCell data-testid={`text-layaway-total-${plan.id}`}>
                      {Number(plan.totalPrice).toLocaleString()} {t("common.currency")}
                    </TableCell>
                    <TableCell data-testid={`text-layaway-paid-${plan.id}`}>
                      {Number(plan.amountPaid).toLocaleString()} {t("common.currency")}
                    </TableCell>
                    <TableCell data-testid={`text-layaway-remaining-${plan.id}`}>
                      {Number(plan.remainingBalance).toLocaleString()} {t("common.currency")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariants[plan.status] || "default"}
                        data-testid={`badge-layaway-status-${plan.id}`}
                      >
                        {statusLabel(plan.status)}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-layaway-due-${plan.id}`}>
                      {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {plan.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-make-payment-${plan.id}`}
                            onClick={() => {
                              setPaymentPlanId(plan.id);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <CreditCard className="me-1 h-3 w-3" />
                            {t("layaway.makePayment")}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-view-payments-${plan.id}`}
                          onClick={() => {
                            setHistoryPlanId(plan.id);
                            setHistoryDialogOpen(true);
                          }}
                        >
                          <History />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("layaway.addPlan")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
              data-testid="form-new-layaway"
            >
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.customerName")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-layaway-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.customerPhone")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-layaway-customer-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inventoryItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.item")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        const item = inventory.find((i) => i.id === parseInt(val));
                        if (item) {
                          form.setValue("totalPrice", item.sellingPrice);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-layaway-item">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventory
                          .filter((i) => i.isAvailable && i.quantity > 0)
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.name} — {Number(item.sellingPrice).toLocaleString()} {t("common.currency")}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.totalPrice")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-layaway-total-price" readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.paymentAmount")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-layaway-initial-payment" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.paymentMethod")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-layaway-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">{t("pos.payByCash")}</SelectItem>
                        <SelectItem value="card">{t("pos.payByCard")}</SelectItem>
                        <SelectItem value="transfer">{t("pos.payByTransfer")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.numberOfMonths")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="1" data-testid="input-layaway-months" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {monthlyInstallment > 0 && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3" data-testid="installment-summary">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t("layaway.monthlyInstallment")}</span>
                    <span className="text-lg font-bold text-primary" data-testid="text-monthly-installment">
                      {monthlyInstallment.toLocaleString()} {t("common.currency")}
                    </span>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">{t("layaway.installmentSchedule")}</span>
                    <div className="grid gap-1 max-h-32 overflow-y-auto">
                      {Array.from({ length: parseInt(watchNumberOfMonths) || 0 }, (_, i) => {
                        const date = new Date();
                        date.setMonth(date.getMonth() + i + 1);
                        return (
                          <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background">
                            <span className="text-muted-foreground">
                              {t("layaway.month")} {i + 1} — {date.toLocaleDateString()}
                            </span>
                            <span className="font-medium">{monthlyInstallment.toLocaleString()} {t("common.currency")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <Separator />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewDialogOpen(false)}
                  data-testid="button-cancel-layaway"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-layaway">
                  {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("layaway.makePayment")}</DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form
              onSubmit={paymentForm.handleSubmit((v) => makePaymentMutation.mutate(v))}
              className="space-y-4"
              data-testid="form-make-payment"
            >
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.paymentAmount")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-payment-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("layaway.paymentMethod")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">{t("pos.payByCash")}</SelectItem>
                        <SelectItem value="card">{t("pos.payByCard")}</SelectItem>
                        <SelectItem value="transfer">{t("pos.payByTransfer")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                  data-testid="button-cancel-payment"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={makePaymentMutation.isPending} data-testid="button-submit-payment">
                  {makePaymentMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("layaway.payments")}</DialogTitle>
          </DialogHeader>
          {loadingPayments ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8" data-testid="text-no-payments">
              {t("common.noData")}
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, idx) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  data-testid={`row-payment-${payment.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold" data-testid={`text-payment-amount-${payment.id}`}>
                        {Number(payment.amount).toLocaleString()} {t("common.currency")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span data-testid={`text-payment-method-${payment.id}`}>{payment.paymentMethod}</span>
                        {" · "}
                        <span data-testid={`text-payment-date-${payment.id}`}>{new Date(payment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`button-print-receipt-${payment.id}`}
                    onClick={() => printInstallmentReceipt(payment, idx + 1)}
                  >
                    <Printer className="me-2 h-4 w-4" />
                    {t("receipt.print")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
