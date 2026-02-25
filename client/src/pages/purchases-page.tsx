import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Purchase, Customer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Search, Plus, Loader2, ShoppingBag, XCircle } from "lucide-react";

const purchaseFormSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerId: z.coerce.number().optional(),
  metalType: z.enum(["gold", "silver", "platinum", "white_gold", "rose_gold", "other"]),
  purity: z.string().optional(),
  weightGrams: z.string().optional(),
  itemDescription: z.string().min(1, "Item description is required"),
  purchasePrice: z.string().min(1, "Purchase price is required"),
  paymentMethod: z.enum(["cash", "card", "transfer"]),
  notes: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export default function PurchasesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      metalType: "gold",
      purity: "",
      weightGrams: "",
      itemDescription: "",
      purchasePrice: "",
      paymentMethod: "cash",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseFormValues) => {
      const res = await apiRequest("POST", "/api/purchases", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: t("purchases.addPurchase") });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/purchases/${id}`, { status: "cancelled" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
  });

  const metalTypeLabels: Record<string, string> = {
    gold: "inventory.gold",
    silver: "inventory.silver",
    platinum: "inventory.platinum",
    white_gold: "inventory.whiteGold",
    rose_gold: "inventory.roseGold",
    other: "inventory.other",
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.purchaseNumber.toLowerCase().includes(q) ||
      p.itemDescription.toLowerCase().includes(q) ||
      (p.customerName && p.customerName.toLowerCase().includes(q))
    );
  });

  function openNewPurchase() {
    form.reset({
      customerName: "",
      customerPhone: "",
      metalType: "gold",
      purity: "",
      weightGrams: "",
      itemDescription: "",
      purchasePrice: "",
      paymentMethod: "cash",
      notes: "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: PurchaseFormValues) {
    createMutation.mutate(values);
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
        <h1 className="text-2xl font-bold" data-testid="text-purchases-title">
          {t("purchases.title")}
        </h1>
        <Button onClick={openNewPurchase} data-testid="button-add-purchase">
          <Plus className="h-4 w-4 me-2" />
          {t("purchases.addPurchase")}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-search-purchases"
          />
        </div>
      </div>

      {filteredPurchases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground" data-testid="text-no-purchases">
              {t("purchases.noPurchases")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("purchases.purchaseNumber")}</TableHead>
                <TableHead>{t("purchases.date")}</TableHead>
                <TableHead>{t("purchases.customerName")}</TableHead>
                <TableHead>{t("purchases.itemDescription")}</TableHead>
                <TableHead>{t("purchases.metalType")}</TableHead>
                <TableHead>{t("purchases.purity")}</TableHead>
                <TableHead>{t("purchases.weight")}</TableHead>
                <TableHead>{t("purchases.purchasePrice")}</TableHead>
                <TableHead>{t("purchases.paymentMethod")}</TableHead>
                <TableHead>{t("purchases.status")}</TableHead>
                <TableHead>{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id} data-testid={`row-purchase-${purchase.id}`}>
                  <TableCell className="font-mono text-sm" data-testid={`text-purchase-number-${purchase.id}`}>
                    {purchase.purchaseNumber}
                  </TableCell>
                  <TableCell>
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{purchase.customerName || "-"}</TableCell>
                  <TableCell data-testid={`text-purchase-desc-${purchase.id}`}>
                    {purchase.itemDescription}
                  </TableCell>
                  <TableCell>
                    {t(metalTypeLabels[purchase.metalType] as any)}
                  </TableCell>
                  <TableCell>{purchase.purity || "-"}</TableCell>
                  <TableCell>{purchase.weightGrams ? `${purchase.weightGrams}g` : "-"}</TableCell>
                  <TableCell data-testid={`text-purchase-price-${purchase.id}`}>
                    {parseFloat(purchase.purchasePrice).toLocaleString()} {t("common.currency")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="no-default-active-elevate">
                      {purchase.paymentMethod === "cash" ? t("pos.payByCash") :
                       purchase.paymentMethod === "card" ? t("pos.payByCard") :
                       t("pos.payByTransfer")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={purchase.status === "completed" ? "default" : "destructive"}
                      className="no-default-active-elevate"
                      data-testid={`badge-purchase-status-${purchase.id}`}
                    >
                      {purchase.status === "completed" ? t("purchases.completed") : t("purchases.cancelled")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {purchase.status === "completed" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => cancelMutation.mutate(purchase.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`button-cancel-purchase-${purchase.id}`}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("purchases.addPurchase")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("purchases.customerName")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-purchase-seller-name" />
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
                      <FormLabel>{t("purchases.customerPhone")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-purchase-seller-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="itemDescription"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>{t("purchases.itemDescription")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-purchase-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("purchases.metalType")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-purchase-metal">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gold">{t("inventory.gold")}</SelectItem>
                          <SelectItem value="silver">{t("inventory.silver")}</SelectItem>
                          <SelectItem value="platinum">{t("inventory.platinum")}</SelectItem>
                          <SelectItem value="white_gold">{t("inventory.whiteGold")}</SelectItem>
                          <SelectItem value="rose_gold">{t("inventory.roseGold")}</SelectItem>
                          <SelectItem value="other">{t("inventory.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("purchases.purity")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 24K, 18K" data-testid="input-purchase-purity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weightGrams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("purchases.weight")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.001" data-testid="input-purchase-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("purchases.purchasePrice")} ({t("common.currency")})</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" data-testid="input-purchase-price" />
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
                      <FormLabel>{t("purchases.paymentMethod")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-purchase-payment">
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>{t("purchases.notes")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-purchase-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-purchase"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-purchase"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
