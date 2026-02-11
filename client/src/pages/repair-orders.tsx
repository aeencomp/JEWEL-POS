import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RepairOrder } from "@shared/schema";
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
import { Loader2, Wrench, Plus } from "lucide-react";

type StatusFilter = "all" | "received" | "in_progress" | "ready" | "delivered";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  received: "default",
  in_progress: "secondary",
  ready: "default",
  delivered: "outline",
  cancelled: "destructive",
};

const repairFormSchema = z.object({
  customerName: z.string().min(1, "Required"),
  customerPhone: z.string().optional(),
  itemDescription: z.string().min(1, "Required"),
  issueDescription: z.string().min(1, "Required"),
  estimatedCost: z.string().optional(),
  estimatedDate: z.string().optional(),
});

type RepairFormValues = z.infer<typeof repairFormSchema>;

const finalCostSchema = z.object({
  finalCost: z.string().min(1, "Required"),
});

export default function RepairOrders() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false);
  const [deliverRepairId, setDeliverRepairId] = useState<number | null>(null);

  const { data: repairs = [], isLoading } = useQuery<RepairOrder[]>({
    queryKey: ["/api/repairs"],
  });

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      itemDescription: "",
      issueDescription: "",
      estimatedCost: "",
      estimatedDate: "",
    },
  });

  const finalCostForm = useForm<z.infer<typeof finalCostSchema>>({
    resolver: zodResolver(finalCostSchema),
    defaultValues: { finalCost: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (values: RepairFormValues) => {
      const body: Record<string, unknown> = {
        customerName: values.customerName,
        customerPhone: values.customerPhone || null,
        itemDescription: values.itemDescription,
        issueDescription: values.issueDescription,
        estimatedCost: values.estimatedCost || null,
        estimatedDate: values.estimatedDate ? new Date(values.estimatedDate).toISOString() : null,
      };
      const res = await apiRequest("POST", "/api/repairs", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      setNewDialogOpen(false);
      form.reset();
      toast({ title: t("repairs.addRepair"), description: "OK" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/repairs/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async ({ id, finalCost }: { id: number; finalCost: string }) => {
      const res = await apiRequest("PATCH", `/api/repairs/${id}`, {
        status: "delivered",
        finalCost,
        completedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      setDeliverDialogOpen(false);
      setDeliverRepairId(null);
      finalCostForm.reset();
    },
  });

  const filteredRepairs = useMemo(() => {
    if (statusFilter === "all") return repairs;
    return repairs.filter((r) => r.status === statusFilter);
  }, [repairs, statusFilter]);

  const handleStatusChange = (id: number, newStatus: string) => {
    if (newStatus === "delivered") {
      setDeliverRepairId(id);
      const repair = repairs.find((r) => r.id === id);
      if (repair?.estimatedCost) {
        finalCostForm.setValue("finalCost", repair.estimatedCost);
      }
      setDeliverDialogOpen(true);
    } else {
      updateStatusMutation.mutate({ id, status: newStatus });
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, keyof typeof t extends (k: infer K) => string ? K : never> = {
      received: "repairs.received",
      in_progress: "repairs.inProgress",
      ready: "repairs.ready",
      delivered: "repairs.delivered",
      cancelled: "repairs.cancelled",
    };
    return t(map[status] as any) || status;
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-repairs-title">
          {t("repairs.title")}
        </h1>
        <Button data-testid="button-new-repair" onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("repairs.addRepair")}
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList data-testid="tabs-repair-status-filter">
          <TabsTrigger value="all" data-testid="tab-filter-all">All</TabsTrigger>
          <TabsTrigger value="received" data-testid="tab-filter-received">{t("repairs.received")}</TabsTrigger>
          <TabsTrigger value="in_progress" data-testid="tab-filter-in-progress">{t("repairs.inProgress")}</TabsTrigger>
          <TabsTrigger value="ready" data-testid="tab-filter-ready">{t("repairs.ready")}</TabsTrigger>
          <TabsTrigger value="delivered" data-testid="tab-filter-delivered">{t("repairs.delivered")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {filteredRepairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Wrench className="h-12 w-12 mb-4" />
              <p data-testid="text-no-repairs">{t("repairs.noRepairs")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("repairs.ticketNumber")}</TableHead>
                  <TableHead>{t("repairs.customerName")}</TableHead>
                  <TableHead>{t("repairs.customerPhone")}</TableHead>
                  <TableHead>{t("repairs.itemDescription")}</TableHead>
                  <TableHead>{t("repairs.issueDescription")}</TableHead>
                  <TableHead>{t("repairs.estimatedCost")}</TableHead>
                  <TableHead>{t("repairs.status")}</TableHead>
                  <TableHead>{t("repairs.estimatedDate")}</TableHead>
                  <TableHead>{t("orders.date")}</TableHead>
                  <TableHead>{t("repairs.updateStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepairs.map((repair) => (
                  <TableRow key={repair.id} data-testid={`row-repair-${repair.id}`}>
                    <TableCell data-testid={`text-ticket-${repair.id}`}>{repair.ticketNumber}</TableCell>
                    <TableCell data-testid={`text-customer-name-${repair.id}`}>{repair.customerName}</TableCell>
                    <TableCell data-testid={`text-customer-phone-${repair.id}`}>{repair.customerPhone || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" data-testid={`text-item-desc-${repair.id}`}>
                      {repair.itemDescription}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" data-testid={`text-issue-desc-${repair.id}`}>
                      {repair.issueDescription}
                    </TableCell>
                    <TableCell data-testid={`text-estimated-cost-${repair.id}`}>
                      {repair.estimatedCost
                        ? `${Number(repair.estimatedCost).toLocaleString()} ${t("common.currency")}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariants[repair.status] || "default"}
                        data-testid={`badge-status-${repair.id}`}
                        className={repair.status === "ready" ? "bg-green-600 text-white" : ""}
                      >
                        {statusLabel(repair.status)}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-estimated-date-${repair.id}`}>
                      {repair.estimatedDate
                        ? new Date(repair.estimatedDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell data-testid={`text-created-date-${repair.id}`}>
                      {new Date(repair.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {repair.status !== "delivered" && repair.status !== "cancelled" && (
                        <Select
                          value={repair.status}
                          onValueChange={(val) => handleStatusChange(repair.id, val)}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-status-${repair.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="received">{t("repairs.received")}</SelectItem>
                            <SelectItem value="in_progress">{t("repairs.inProgress")}</SelectItem>
                            <SelectItem value="ready">{t("repairs.ready")}</SelectItem>
                            <SelectItem value="delivered">{t("repairs.delivered")}</SelectItem>
                            <SelectItem value="cancelled">{t("repairs.cancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
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
            <DialogTitle>{t("repairs.addRepair")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
              data-testid="form-new-repair"
            >
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("repairs.customerName")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-name" />
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
                    <FormLabel>{t("repairs.customerPhone")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="itemDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("repairs.itemDescription")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-item-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="issueDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("repairs.issueDescription")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-issue-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("repairs.estimatedCost")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-estimated-cost" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("repairs.estimatedDate")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-estimated-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewDialogOpen(false)}
                  data-testid="button-cancel-repair"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-repair">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deliverDialogOpen} onOpenChange={setDeliverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("repairs.finalCost")}</DialogTitle>
          </DialogHeader>
          <Form {...finalCostForm}>
            <form
              onSubmit={finalCostForm.handleSubmit((v) => {
                if (deliverRepairId !== null) {
                  deliverMutation.mutate({ id: deliverRepairId, finalCost: v.finalCost });
                }
              })}
              className="space-y-4"
              data-testid="form-deliver-repair"
            >
              <FormField
                control={finalCostForm.control}
                name="finalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("repairs.finalCost")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-final-cost" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeliverDialogOpen(false)}
                  data-testid="button-cancel-deliver"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={deliverMutation.isPending} data-testid="button-submit-deliver">
                  {deliverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("repairs.delivered")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
