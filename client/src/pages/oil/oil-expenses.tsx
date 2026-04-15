import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { OilExpense } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Plus, Trash2, Calendar } from "lucide-react";

const schema = z.object({
  category: z.enum(["wages", "electricity", "transport", "maintenance", "rent", "other"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  paymentMethod: z.enum(["cash", "transfer", "card"]),
});

const catLabels: Record<string, { en: string; ar: string; color: string }> = {
  wages: { en: "Wages", ar: "رواتب", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  electricity: { en: "Electricity", ar: "كهرباء", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  transport: { en: "Transport", ar: "نقل", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  maintenance: { en: "Maintenance", ar: "صيانة", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  rent: { en: "Rent", ar: "إيجار", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  other: { en: "Other", ar: "أخرى", color: "bg-muted text-muted-foreground" },
};

export default function OilExpenses() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [catFilter, setCatFilter] = useState("all");

  const { data: expenses = [], isLoading } = useQuery<OilExpense[]>({
    queryKey: ["/api/oil/expenses"],
    queryFn: () => fetch("/api/oil/expenses", { credentials: "include" }).then(r => r.json()),
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { category: "other" as const, amount: 0, description: "", paymentMethod: "cash" as const } });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/oil/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تمت إضافة المصروف" : "Expense added" });
      setShowDialog(false); form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/oil/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
    },
  });

  const filtered = expenses.filter(e => catFilter === "all" || e.category === catFilter);
  const total = filtered.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Monthly totals
  const monthlyTotals = expenses.reduce((acc, e) => {
    const month = new Date(e.createdAt).toLocaleString("default", { month: "short", year: "numeric" });
    acc[month] = (acc[month] || 0) + parseFloat(e.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-orange-500" />
          <h1 className="text-xl font-semibold">{isAr ? "المصاريف" : "Expenses"}</h1>
          <Badge variant="secondary">{expenses.length}</Badge>
        </div>
        <Button size="sm" onClick={() => { form.reset(); setShowDialog(true); }} data-testid="button-add-expense">
          <Plus className="h-4 w-4 me-1" />{isAr ? "إضافة مصروف" : "Add Expense"}
        </Button>
      </div>

      <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44" data-testid="select-expense-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الفئات" : "All Categories"}</SelectItem>
            {Object.entries(catLabels).map(([k, v]) => <SelectItem key={k} value={k}>{isAr ? v.ar : v.en}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ms-auto text-sm font-semibold text-orange-600">{isAr ? "الإجمالي:" : "Total:"} {total.toLocaleString()} IQD</div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {isLoading ? [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />) :
          filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>{isAr ? "لا توجد مصاريف" : "No expenses yet"}</p></div>
          ) : filtered.map(e => {
            const cat = catLabels[e.category];
            return (
              <Card key={e.id} data-testid={`card-expense-${e.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Badge className={`text-[10px] px-2 flex-shrink-0 ${cat.color}`}>{isAr ? cat.ar : cat.en}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{new Date(e.createdAt).toLocaleDateString()} · {e.paymentMethod}
                    </p>
                  </div>
                  <p className="font-bold text-orange-600 text-sm flex-shrink-0">{parseFloat(e.amount).toLocaleString()} IQD</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(e.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-expense-${e.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })
        }
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-expense">
          <DialogHeader><DialogTitle>{isAr ? "إضافة مصروف" : "Add Expense"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? "الفئة" : "Category"}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-expense-category"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(catLabels).map(([k, v]) => <SelectItem key={k} value={k}>{isAr ? v.ar : v.en}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? "طريقة الدفع" : "Payment"}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="transfer">Transfer</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>{isAr ? "المبلغ (IQD)" : "Amount (IQD)"}</FormLabel><FormControl><Input type="number" {...field} data-testid="input-expense-amount" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{isAr ? "الوصف" : "Description"}</FormLabel><FormControl><Input {...field} data-testid="input-expense-description" /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-expense">{isAr ? "حفظ" : "Save"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
