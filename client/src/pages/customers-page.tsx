import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { isFashionStore } from "@/lib/pos-system";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Loader2, Users, Banknote } from "lucide-react";

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  idNumber: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function CustomersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const isFashion = isFashionStore((user as { posSystem?: string })?.posSystem);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      idNumber: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: t("customers.addCustomer") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormValues }) => {
      const res = await apiRequest("PATCH", `/api/customers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
      toast({ title: t("customers.editCustomer") });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: string }) => {
      const res = await apiRequest("POST", `/api/customers/${id}/payment`, { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setPaymentCustomer(null);
      setPaymentAmount("");
      toast({ title: t("customers.paymentSuccess") });
    },
  });

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, search]);

  function openAdd() {
    setEditingCustomer(null);
    form.reset({ name: "", phone: "", email: "", address: "", idNumber: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      idNumber: customer.idNumber || "",
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: CustomerFormValues) {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
        <h1 className="text-2xl font-bold" data-testid="text-customers-title">
          {t("customers.title")}
        </h1>
        <Button onClick={openAdd} data-testid="button-add-customer">
          <Plus className="h-4 w-4 me-2" />
          {t("customers.addCustomer")}
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
            data-testid="input-search-customers"
          />
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground" data-testid="text-no-customers">
              {t("customers.noCustomers")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customers.name")}</TableHead>
                <TableHead>{t("customers.phone")}</TableHead>
                <TableHead>{t("customers.email")}</TableHead>
                <TableHead>{t("customers.idNumber")}</TableHead>
                <TableHead>{t("customers.balance")}</TableHead>
                {isFashion && <TableHead>{t("loyalty.points")}</TableHead>}
                <TableHead>{t("orders.date")}</TableHead>
                <TableHead>{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const balance = parseFloat(customer.balance || "0");
                return (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell data-testid={`text-customer-name-${customer.id}`}>
                      {customer.name}
                    </TableCell>
                    <TableCell data-testid={`text-customer-phone-${customer.id}`}>
                      {customer.phone || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-customer-email-${customer.id}`}>
                      {customer.email || "-"}
                    </TableCell>
                    <TableCell>{customer.idNumber || "-"}</TableCell>
                    <TableCell data-testid={`text-customer-balance-${customer.id}`}>
                      {balance > 0 ? (
                        <Badge variant="destructive" className="no-default-active-elevate">
                          {balance.toLocaleString()} {t("common.currency")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    {isFashion && (
                      <TableCell data-testid={`text-customer-loyalty-${customer.id}`}>
                        {(customer.loyaltyPoints || 0).toLocaleString()}
                      </TableCell>
                    )}
                    <TableCell>
                      {customer.createdAt
                        ? new Date(customer.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(customer)}
                          data-testid={`button-edit-customer-${customer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {balance > 0 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-green-600 hover:text-green-600"
                            onClick={() => { setPaymentCustomer(customer); setPaymentAmount(""); }}
                            data-testid={`button-collect-payment-${customer.id}`}
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCustomer(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? t("customers.editCustomer") : t("customers.addCustomer")}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.email")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-customer-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.idNumber")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-id-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.address")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.notes")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="resize-none" data-testid="input-customer-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingCustomer(null);
                  }}
                  data-testid="button-cancel-customer"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-save-customer">
                  {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentCustomer !== null}
        onOpenChange={(open) => {
          if (!open) { setPaymentCustomer(null); setPaymentAmount(""); }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle data-testid="text-collect-payment-title">{t("customers.collectPayment")}</DialogTitle>
          </DialogHeader>
          {paymentCustomer && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">{paymentCustomer.name}</span>
                <span className="text-muted-foreground ms-2">
                  {t("customers.balance")}: {parseFloat(paymentCustomer.balance || "0").toLocaleString()} {t("common.currency")}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium">{t("customers.paymentAmount")}</label>
                <Input
                  type="number"
                  min="0"
                  max={paymentCustomer.balance || "0"}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1"
                  data-testid="input-payment-amount"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPaymentCustomer(null); setPaymentAmount(""); }}
              data-testid="button-cancel-payment"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => paymentCustomer && paymentMutation.mutate({ id: paymentCustomer.id, amount: paymentAmount })}
              disabled={paymentMutation.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
              data-testid="button-confirm-payment"
            >
              {paymentMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("customers.collectPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
