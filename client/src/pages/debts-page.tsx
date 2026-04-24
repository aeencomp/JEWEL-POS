import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Debt, DebtPayment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, Plus, HandCoins, Banknote, CheckCircle, Ban, Eye, ArrowUpRight, ArrowDownLeft, Pencil } from "lucide-react";

type StatusFilter = "all" | "active" | "paid" | "cancelled";
type DirectionFilter = "all" | "lent" | "borrowed";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  paid: "secondary",
  cancelled: "destructive",
};

const typeVariants: Record<string, "default" | "outline"> = {
  money: "outline",
  gold: "default",
};

export default function DebtsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [viewDebt, setViewDebt] = useState<Debt | null>(null);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formType, setFormType] = useState("money");
  const [formDirection, setFormDirection] = useState("lent");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const { data: debts = [], isLoading } = useQuery<Debt[]>({
    queryKey: ["/api/debts"],
  });

  const { data: debtPayments = [] } = useQuery<DebtPayment[]>({
    queryKey: ["/api/debts", viewDebt?.id, "payments"],
    enabled: viewDebt !== null,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/debts/${viewDebt!.id}/payments`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/debts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      setAddOpen(false);
      resetForm();
      toast({ title: t("debts.debtCreated") });
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ debtId, amount, paymentMethod, notes }: any) => {
      const res = await apiRequest("POST", `/api/debts/${debtId}/payments`, { amount, paymentMethod, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      setPaymentDebt(null);
      setPaymentAmount("");
      setPaymentNotes("");
      toast({ title: t("debts.paymentSuccess") });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/debts/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, totalAmount, description }: { id: number; totalAmount: string; description: string }) => {
      const res = await apiRequest("PATCH", `/api/debts/${id}`, { totalAmount, description });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      setEditDebt(null);
      toast({ title: t("debts.debtUpdated") });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormName("");
    setFormPhone("");
    setFormType("money");
    setFormDirection("lent");
    setFormAmount("");
    setFormDesc("");
  }

  const filteredDebts = useMemo(() => {
    let result = debts;
    if (statusFilter !== "all") result = result.filter((d) => d.status === statusFilter);
    if (directionFilter !== "all") result = result.filter((d) => (d.direction || "lent") === directionFilter);
    return result;
  }, [debts, statusFilter, directionFilter]);

  const activeDebts = debts.filter((d) => d.status === "active");
  const activeLent = activeDebts.filter((d) => (d.direction || "lent") === "lent");
  const activeBorrowed = activeDebts.filter((d) => (d.direction || "lent") === "borrowed");
  const totalLentMoney = activeLent
    .filter((d) => d.type === "money")
    .reduce((s, d) => s + parseFloat(d.remainingBalance), 0);
  const totalBorrowedMoney = activeBorrowed
    .filter((d) => d.type === "money")
    .reduce((s, d) => s + parseFloat(d.remainingBalance), 0);
  const totalLentGold = activeLent
    .filter((d) => d.type === "gold")
    .reduce((s, d) => s + parseFloat(d.remainingBalance), 0);
  const totalBorrowedGold = activeBorrowed
    .filter((d) => d.type === "gold")
    .reduce((s, d) => s + parseFloat(d.remainingBalance), 0);

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
        <h1 className="text-2xl font-bold" data-testid="text-debts-title">
          {t("debts.title")}
        </h1>
        <Button onClick={() => { resetForm(); setAddOpen(true); }} data-testid="button-add-debt">
          <Plus className="h-4 w-4 me-2" />
          {t("debts.addDebt")}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t("debts.totalDebts")}</div>
            <div className="text-2xl font-bold" data-testid="text-total-debts">{activeDebts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
              {t("debts.totalLent")} ({t("debts.money")})
            </div>
            <div className="text-2xl font-bold text-red-600" data-testid="text-total-lent">
              {totalLentMoney.toLocaleString()} {t("common.currency")}
            </div>
            <div className="text-xs text-muted-foreground">{activeLent.filter(d => d.type === "money").length} {t("debts.active")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />
              {t("debts.totalBorrowed")} ({t("debts.money")})
            </div>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-borrowed">
              {totalBorrowedMoney.toLocaleString()} {t("common.currency")}
            </div>
            <div className="text-xs text-muted-foreground">{activeBorrowed.filter(d => d.type === "money").length} {t("debts.active")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t("debts.totalOwed")} ({t("debts.money")})</div>
            <div className="text-2xl font-bold" data-testid="text-net-balance">
              {(totalLentMoney - totalBorrowedMoney).toLocaleString()} {t("common.currency")}
            </div>
            <div className="text-xs text-muted-foreground">
              {totalLentMoney - totalBorrowedMoney >= 0 ? t("debts.lentDesc") : t("debts.borrowedDesc")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-yellow-500" />
              {t("debts.totalLentGold")}
            </div>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-total-lent-gold">
              {totalLentGold.toLocaleString()} {t("debts.goldUnit")}
            </div>
            <div className="text-xs text-muted-foreground">{activeLent.filter(d => d.type === "gold").length} {t("debts.active")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowDownLeft className="h-3.5 w-3.5 text-purple-500" />
              {t("debts.totalBorrowedGold")}
            </div>
            <div className="text-2xl font-bold text-purple-600" data-testid="text-total-borrowed-gold">
              {totalBorrowedGold.toLocaleString()} {t("debts.goldUnit")}
            </div>
            <div className="text-xs text-muted-foreground">{activeBorrowed.filter(d => d.type === "gold").length} {t("debts.active")}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tabs value={directionFilter} onValueChange={(v) => setDirectionFilter(v as DirectionFilter)}>
          <TabsList data-testid="tabs-direction-filter">
            <TabsTrigger value="all" data-testid="tab-direction-all">{t("pos.allCategories")}</TabsTrigger>
            <TabsTrigger value="lent" data-testid="tab-direction-lent">
              <ArrowUpRight className="h-3.5 w-3.5 me-1" />
              {t("debts.lent")}
            </TabsTrigger>
            <TabsTrigger value="borrowed" data-testid="tab-direction-borrowed">
              <ArrowDownLeft className="h-3.5 w-3.5 me-1" />
              {t("debts.borrowed")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList data-testid="tabs-debt-filter">
            <TabsTrigger value="all" data-testid="tab-debt-all">{t("pos.allCategories")}</TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-debt-active">{t("debts.active")}</TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-debt-paid">{t("debts.paid")}</TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-debt-cancelled">{t("orders.cancelled")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredDebts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HandCoins className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground" data-testid="text-no-debts">
              {t("orders.noOrders")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("debts.personName")}</TableHead>
                <TableHead>{t("debts.direction")}</TableHead>
                <TableHead>{t("debts.type")}</TableHead>
                <TableHead>{t("debts.totalAmount")}</TableHead>
                <TableHead>{t("debts.amountPaid")}</TableHead>
                <TableHead>{t("debts.remaining")}</TableHead>
                <TableHead>{t("orders.status")}</TableHead>
                <TableHead>{t("orders.date")}</TableHead>
                <TableHead>{t("orders.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.map((debt) => (
                <TableRow key={debt.id} data-testid={`row-debt-${debt.id}`}>
                  <TableCell className="font-medium" data-testid={`text-debt-name-${debt.id}`}>
                    {debt.personName}
                    {debt.personPhone && <div className="text-xs text-muted-foreground">{debt.personPhone}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={(debt.direction || "lent") === "lent" ? "destructive" : "default"}
                      className="no-default-active-elevate"
                      data-testid={`badge-debt-direction-${debt.id}`}
                    >
                      {(debt.direction || "lent") === "lent" ? (
                        <><ArrowUpRight className="h-3 w-3 me-1" />{t("debts.lent").split(" (")[0]}</>
                      ) : (
                        <><ArrowDownLeft className="h-3 w-3 me-1" />{t("debts.borrowed").split(" (")[0]}</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariants[debt.type] || "outline"} className="no-default-active-elevate text-nowrap" data-testid={`badge-debt-type-${debt.id}`}>
                      {debt.type === "money" ? t("debts.money") : t("debts.gold")}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-debt-total-${debt.id}`}>
                    {parseFloat(debt.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>{parseFloat(debt.amountPaid).toLocaleString()}</TableCell>
                  <TableCell data-testid={`text-debt-remaining-${debt.id}`}>
                    {parseFloat(debt.remainingBalance).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[debt.status] || "secondary"} className="no-default-active-elevate" data-testid={`badge-debt-status-${debt.id}`}>
                      {debt.status === "active" ? t("debts.active") : debt.status === "paid" ? t("debts.paid") : t("orders.cancelled")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {debt.createdAt ? new Date(debt.createdAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setViewDebt(debt)}
                        data-testid={`button-view-debt-${debt.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {debt.status === "active" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-600"
                            onClick={() => {
                              setEditDebt(debt);
                              setEditAmount(parseFloat(debt.totalAmount).toString());
                              setEditDesc(debt.description || "");
                            }}
                            data-testid={`button-edit-debt-${debt.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-green-600 hover:text-green-600"
                            onClick={() => { setPaymentDebt(debt); setPaymentAmount(""); setPaymentNotes(""); setPaymentMethod("cash"); }}
                            data-testid={`button-record-payment-${debt.id}`}
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => statusMutation.mutate({ id: debt.id, status: "paid" })}
                            data-testid={`button-mark-paid-${debt.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => statusMutation.mutate({ id: debt.id, status: "cancelled" })}
                            data-testid={`button-cancel-debt-${debt.id}`}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-add-debt-title">{t("debts.addDebt")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("debts.personName")}</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1"
                data-testid="input-debt-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("debts.personPhone")}</label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="mt-1"
                data-testid="input-debt-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("debts.direction")}</label>
              <Select value={formDirection} onValueChange={setFormDirection}>
                <SelectTrigger className="mt-1" data-testid="select-debt-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lent" data-testid="option-debt-lent">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                      {t("debts.lent")}
                    </span>
                  </SelectItem>
                  <SelectItem value="borrowed" data-testid="option-debt-borrowed">
                    <span className="flex items-center gap-1">
                      <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />
                      {t("debts.borrowed")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("debts.type")}</label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1" data-testid="select-debt-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="money" data-testid="option-debt-money">{t("debts.money")}</SelectItem>
                  <SelectItem value="gold" data-testid="option-debt-gold">{t("debts.gold")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("debts.totalAmount")}</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="mt-1"
                data-testid="input-debt-amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("debts.description")}</label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="mt-1 resize-none"
                data-testid="input-debt-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-add-debt">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => createMutation.mutate({
                personName: formName,
                personPhone: formPhone || null,
                type: formType,
                direction: formDirection,
                totalAmount: formAmount,
                description: formDesc || null,
              })}
              disabled={createMutation.isPending || !formName || !formAmount}
              data-testid="button-save-debt"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Debt Dialog ── */}
      <Dialog open={editDebt !== null} onOpenChange={(open) => { if (!open) setEditDebt(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-debt-title">{t("debts.editDebt")}</DialogTitle>
          </DialogHeader>
          {editDebt && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="font-medium">{editDebt.personName}</div>
                <div className="text-muted-foreground">
                  {t("debts.amountPaid")}: <span className="font-mono">{parseFloat(editDebt.amountPaid).toLocaleString()}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t("debts.totalAmount")}</label>
                <Input
                  type="number"
                  min={parseFloat(editDebt.amountPaid)}
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="mt-1"
                  data-testid="input-edit-debt-amount"
                />
                {editAmount && parseFloat(editAmount) >= parseFloat(editDebt.amountPaid) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("debts.remaining")}: <span className="font-mono font-semibold">
                      {(parseFloat(editAmount) - parseFloat(editDebt.amountPaid)).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">{t("debts.description")}</label>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="mt-1 resize-none"
                  rows={2}
                  data-testid="input-edit-debt-description"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDebt(null)} data-testid="button-cancel-edit-debt">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => editDebt && editMutation.mutate({
                id: editDebt.id,
                totalAmount: editAmount,
                description: editDesc,
              })}
              disabled={editMutation.isPending || !editAmount || (editDebt !== null && parseFloat(editAmount) < parseFloat(editDebt.amountPaid))}
              data-testid="button-save-edit-debt"
            >
              {editMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentDebt !== null}
        onOpenChange={(open) => { if (!open) setPaymentDebt(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle data-testid="text-record-payment-title">{t("debts.recordPayment")}</DialogTitle>
          </DialogHeader>
          {paymentDebt && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">{paymentDebt.personName}</span>
                <span className="text-muted-foreground ms-2">
                  {t("debts.remaining")}: {parseFloat(paymentDebt.remainingBalance).toLocaleString()}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium">{t("customers.paymentAmount")}</label>
                <Input
                  type="number"
                  min="0"
                  max={paymentDebt.remainingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1"
                  data-testid="input-debt-payment-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("orders.payment")}</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1" data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("pos.payByCash")}</SelectItem>
                    <SelectItem value="card">{t("pos.payByCard")}</SelectItem>
                    <SelectItem value="transfer">{t("pos.payByTransfer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("customers.notes")}</label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="mt-1"
                  data-testid="input-debt-payment-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDebt(null)} data-testid="button-cancel-debt-payment">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => paymentDebt && payMutation.mutate({
                debtId: paymentDebt.id,
                amount: paymentAmount,
                paymentMethod,
                notes: paymentNotes || null,
              })}
              disabled={payMutation.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
              data-testid="button-confirm-debt-payment"
            >
              {payMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("debts.recordPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewDebt !== null}
        onOpenChange={(open) => { if (!open) setViewDebt(null); }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-view-debt-title">
              {viewDebt?.personName} - {viewDebt?.type === "money" ? t("debts.money") : t("debts.gold")}
              <Badge
                variant={(viewDebt?.direction || "lent") === "lent" ? "destructive" : "default"}
                className="no-default-active-elevate ms-2 text-xs"
              >
                {(viewDebt?.direction || "lent") === "lent" ? t("debts.lent").split(" (")[0] : t("debts.borrowed").split(" (")[0]}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewDebt && (
            <div className="space-y-3">
              {viewDebt.description && (
                <p className="text-sm text-muted-foreground">{viewDebt.description}</p>
              )}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("debts.totalAmount")}</span>
                  <div className="font-medium">{parseFloat(viewDebt.totalAmount).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("debts.amountPaid")}</span>
                  <div className="font-medium">{parseFloat(viewDebt.amountPaid).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("debts.remaining")}</span>
                  <div className="font-medium">{parseFloat(viewDebt.remainingBalance).toLocaleString()}</div>
                </div>
              </div>
              {debtPayments.length > 0 && (
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("customers.paymentAmount")}</TableHead>
                        <TableHead>{t("orders.payment")}</TableHead>
                        <TableHead>{t("customers.notes")}</TableHead>
                        <TableHead>{t("orders.date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debtPayments.map((p) => (
                        <TableRow key={p.id} data-testid={`row-debt-payment-${p.id}`}>
                          <TableCell>{parseFloat(p.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            {p.paymentMethod === "cash" ? t("pos.payByCash") : p.paymentMethod === "card" ? t("pos.payByCard") : t("pos.payByTransfer")}
                          </TableCell>
                          <TableCell>{p.notes || "-"}</TableCell>
                          <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
