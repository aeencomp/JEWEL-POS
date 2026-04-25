import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { OilSupplier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Phone, MapPin, Edit2, Search, Trash2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export default function OilSuppliers() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<OilSupplier | null>(null);
  const [search, setSearch] = useState("");
  const [deleteToConfirm, setDeleteToConfirm] = useState<OilSupplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery<OilSupplier[]>({
    queryKey: ["/api/oil/suppliers"],
    queryFn: () => fetch("/api/oil/suppliers", { credentials: "include" }).then(r => r.json()),
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", address: "", notes: "" } });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PATCH", `/api/oil/suppliers/${editing.id}`, data) : apiRequest("POST", "/api/oil/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/suppliers"] });
      toast({ title: editing ? (isAr ? "تم التحديث" : "Updated") : (isAr ? "تمت الإضافة" : "Added") });
      setShowDialog(false); setEditing(null); form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/oil/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/suppliers"] });
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
      setDeleteToConfirm(null);
    },
    onError: (err: any) => {
      let msg = isAr ? "فشل الحذف" : "Delete failed";
      try { const p = JSON.parse(err.message.replace(/^\d+:\s*/, "")); if (p.message) msg = p.message; } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const openEdit = (s: OilSupplier) => {
    setEditing(s);
    form.reset({ name: s.name, phone: s.phone || "", address: s.address || "", notes: s.notes || "" });
    setShowDialog(true);
  };

  const filtered = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || "").includes(search));

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">{isAr ? "الموردون" : "Suppliers"}</h1>
            <p className="text-xs text-slate-400">{suppliers.length} {isAr ? "مورد" : "suppliers"}</p>
          </div>
        </div>
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm" onClick={() => { setEditing(null); form.reset(); setShowDialog(true); }} data-testid="button-add-supplier">
          <Plus className="h-4 w-4 me-1" />{isAr ? "إضافة مورد" : "Add Supplier"}
        </Button>
      </div>

      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative"><Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="ps-9" placeholder={isAr ? "بحث..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}</div> :
          filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>{isAr ? "لا يوجد موردون" : "No suppliers yet"}</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(s => (
                <Card key={s.id} data-testid={`card-supplier-${s.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{s.name}</p>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => openEdit(s)} data-testid={`button-edit-supplier-${s.id}`}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeleteToConfirm(s)} data-testid={`button-delete-supplier-${s.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {s.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{s.phone}</p>}
                      {s.address && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{s.address}</p>}
                      {s.notes && <p className="text-xs italic truncate">{s.notes}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </div>

      <Dialog open={!!deleteToConfirm} onOpenChange={o => !o && setDeleteToConfirm(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-delete-supplier">
          <DialogHeader><DialogTitle className="text-red-600">{isAr ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle></DialogHeader>
          {deleteToConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{isAr ? "هل أنت متأكد من حذف" : "Delete"} <span className="font-semibold text-foreground">"{deleteToConfirm.name}"</span>? {isAr ? "لا يمكن التراجع." : "This cannot be undone."}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteToConfirm(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteToConfirm.id)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-supplier">
                  {deleteMutation.isPending ? "..." : (isAr ? "حذف" : "Delete")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-supplier">
          <DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل مورد" : "Edit Supplier") : (isAr ? "إضافة مورد" : "Add Supplier")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMutation.mutate(v))} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{isAr ? "الاسم" : "Name"}</FormLabel><FormControl><Input {...field} data-testid="input-supplier-name" /></FormControl></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{isAr ? "الهاتف" : "Phone"}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>{isAr ? "العنوان" : "Address"}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{isAr ? "ملاحظات" : "Notes"}</FormLabel><FormControl><Textarea {...field} rows={2} className="resize-none" /></FormControl></FormItem>)} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-submit-supplier">{isAr ? "حفظ" : "Save"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
