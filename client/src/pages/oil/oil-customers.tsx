import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { OilCustomer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Phone, MapPin, Edit2, Search, Trash2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(["dealer", "distributor", "retail", "factory"]),
  creditLimit: z.coerce.number().min(0),
  notes: z.string().optional(),
});

const typeColors: Record<string, string> = {
  dealer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  distributor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  retail: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  factory: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

export default function OilCustomers() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<OilCustomer | null>(null);
  const [search, setSearch] = useState("");
  const [deleteToConfirm, setDeleteToConfirm] = useState<OilCustomer | null>(null);

  const { data: customers = [], isLoading } = useQuery<OilCustomer[]>({
    queryKey: ["/api/oil/customers"],
    queryFn: () => fetch("/api/oil/customers", { credentials: "include" }).then(r => r.json()),
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", address: "", type: "dealer" as const, creditLimit: 0, notes: "" } });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PATCH", `/api/oil/customers/${editing.id}`, data) : apiRequest("POST", "/api/oil/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/customers"] });
      toast({ title: editing ? (isAr ? "تم التحديث" : "Updated") : (isAr ? "تمت الإضافة" : "Added") });
      setShowDialog(false); setEditing(null); form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/oil/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/customers"] });
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
      setDeleteToConfirm(null);
    },
    onError: (err: any) => {
      let msg = isAr ? "فشل الحذف" : "Delete failed";
      try { const p = JSON.parse(err.message.replace(/^\d+:\s*/, "")); if (p.message) msg = p.message; } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const openEdit = (c: OilCustomer) => {
    setEditing(c);
    form.reset({ name: c.name, phone: c.phone || "", address: c.address || "", type: c.type as any, creditLimit: parseFloat(c.creditLimit), notes: c.notes || "" });
    setShowDialog(true);
  };

  const filtered = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search));

  const typeLabels = { dealer: { en: "Dealer", ar: "وكيل" }, distributor: { en: "Distributor", ar: "موزع" }, retail: { en: "Retail", ar: "تجزئة" }, factory: { en: "Factory", ar: "مصنع" } };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">{isAr ? "العملاء" : "Customers"}</h1>
            <p className="text-xs text-slate-400">{customers.length} {isAr ? "عميل" : "customers"}</p>
          </div>
        </div>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => { setEditing(null); form.reset(); setShowDialog(true); }} data-testid="button-add-customer">
          <Plus className="h-4 w-4 me-1" />{isAr ? "إضافة عميل" : "Add Customer"}
        </Button>
      </div>

      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative"><Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="ps-9" placeholder={isAr ? "بحث..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}</div> :
          filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>{isAr ? "لا يوجد عملاء" : "No customers yet"}</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => (
                <Card key={c.id} data-testid={`card-customer-${c.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <Badge className={`text-[10px] mt-1 ${typeColors[c.type]}`}>{isAr ? typeLabels[c.type].ar : typeLabels[c.type].en}</Badge>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => openEdit(c)} data-testid={`button-edit-customer-${c.id}`}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeleteToConfirm(c)} data-testid={`button-delete-customer-${c.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {c.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.phone}</p>}
                      {c.address && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{c.address}</p>}
                      {parseFloat(c.creditLimit) > 0 && <p className="text-amber-600 font-medium">{isAr ? "الحد الائتماني:" : "Credit:"} {parseFloat(c.creditLimit).toLocaleString()} IQD</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </div>

      <Dialog open={!!deleteToConfirm} onOpenChange={o => !o && setDeleteToConfirm(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-delete-customer">
          <DialogHeader><DialogTitle className="text-red-600">{isAr ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle></DialogHeader>
          {deleteToConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{isAr ? "هل أنت متأكد من حذف" : "Delete"} <span className="font-semibold text-foreground">"{deleteToConfirm.name}"</span>? {isAr ? "لا يمكن التراجع." : "This cannot be undone."}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteToConfirm(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteToConfirm.id)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-customer">
                  {deleteMutation.isPending ? "..." : (isAr ? "حذف" : "Delete")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-customer">
          <DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل عميل" : "Edit Customer") : (isAr ? "إضافة عميل" : "Add Customer")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMutation.mutate(v))} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{isAr ? "الاسم" : "Name"}</FormLabel><FormControl><Input {...field} data-testid="input-customer-name" /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{isAr ? "الهاتف" : "Phone"}</FormLabel><FormControl><Input {...field} data-testid="input-customer-phone" /></FormControl></FormItem>)} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? "النوع" : "Type"}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-customer-type"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{isAr ? v.ar : v.en}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>{isAr ? "العنوان" : "Address"}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="creditLimit" render={({ field }) => (<FormItem><FormLabel>{isAr ? "الحد الائتماني (IQD)" : "Credit Limit (IQD)"}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{isAr ? "ملاحظات" : "Notes"}</FormLabel><FormControl><Textarea {...field} rows={2} className="resize-none" /></FormControl></FormItem>)} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-submit-customer">{isAr ? "حفظ" : "Save"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
