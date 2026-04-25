import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { OilProductionBatch, OilProduct, OilProductionInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Factory, Plus, Trash2, ChevronDown, FlaskConical } from "lucide-react";

function fmt(n: string | number) { return parseFloat(String(n)).toLocaleString(); }
type InputItem = { productId: number; productName: string; quantityUsed: number };

export default function OilProduction() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteToConfirm, setDeleteToConfirm] = useState<OilProductionBatch | null>(null);

  const { data: batches = [], isLoading } = useQuery<OilProductionBatch[]>({
    queryKey: ["/api/oil/production"],
    queryFn: () => fetch("/api/oil/production", { credentials: "include" }).then(r => r.json()),
  });
  const { data: products = [] } = useQuery<OilProduct[]>({
    queryKey: ["/api/oil/products"],
    queryFn: () => fetch("/api/oil/products", { credentials: "include" }).then(r => r.json()),
  });

  const [formOutputProductId, setFormOutputProductId] = useState("");
  const [formOutputQty, setFormOutputQty] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [inputs, setInputs] = useState<InputItem[]>([{ productId: 0, productName: "", quantityUsed: 0 }]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/oil/production", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/production"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تم تسجيل دفعة الإنتاج" : "Batch recorded" });
      setShowDialog(false);
      setFormOutputProductId(""); setFormOutputQty(0); setFormNotes("");
      setInputs([{ productId: 0, productName: "", quantityUsed: 0 }]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/oil/production/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oil/production"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/dashboard"] });
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
      setDeleteToConfirm(null);
    },
    onError: (err: any) => {
      let msg = isAr ? "فشل الحذف" : "Delete failed";
      try { const p = JSON.parse(err.message.replace(/^\d+:\s*/, "")); if (p.message) msg = p.message; } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  function updateInput(idx: number, field: keyof InputItem, value: any) {
    setInputs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "productId") {
        const prod = products.find(p => p.id === Number(value));
        if (prod) next[idx].productName = prod.name;
      }
      return next;
    });
  }

  function handleSubmit() {
    if (!formOutputProductId || formOutputQty <= 0) {
      toast({ title: isAr ? "حدد المنتج الناتج والكمية" : "Set output product and quantity", variant: "destructive" }); return;
    }
    const outProd = products.find(p => p.id === Number(formOutputProductId));
    createMutation.mutate({
      outputProductId: Number(formOutputProductId),
      outputQuantity: formOutputQty.toFixed(2),
      notes: formNotes || null,
      inputs: inputs.filter(i => i.productId > 0 && i.quantityUsed > 0).map(i => ({
        productId: i.productId, productName: i.productName, quantityUsed: String(i.quantityUsed),
      })),
    });
  }

  const finishedOilProducts = products.filter(p => p.category === "finished_oil");
  const otherOutputProducts = products.filter(p => p.category !== "finished_oil");
  const rawMaterials = products.filter(p => ["raw_material", "other"].includes(p.category));

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Factory className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">{isAr ? "الإنتاج" : "Production"}</h1>
            <p className="text-xs text-slate-400">{batches.length} {isAr ? "دفعة" : "batches"}</p>
          </div>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm" onClick={() => setShowDialog(true)} data-testid="button-new-batch">
          <Plus className="h-4 w-4 me-1" />{isAr ? "دفعة إنتاج" : "New Batch"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />) :
          batches.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Factory className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>{isAr ? "لا توجد دفعات إنتاج" : "No production batches yet"}</p></div>
          ) : batches.map(batch => {
            const expanded = expandedId === batch.id;
            const outputProd = products.find(p => p.id === batch.outputProductId);
            return (
              <Card key={batch.id} data-testid={`card-batch-${batch.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(expanded ? null : batch.id)}>
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm">{batch.batchNumber}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5">{batch.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {outputProd?.name || "—"} · {new Date(batch.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-bold text-violet-600">{fmt(batch.outputQuantity)} {outputProd?.unit || ""}</p>
                      <p className="text-xs text-muted-foreground">{isAr ? "إنتاج" : "output"}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                  {expanded && (
                    <div className="border-t bg-muted/20 px-4 py-3">
                      <BatchInputsView batchId={batch.id} />
                      {batch.notes && <p className="text-xs text-muted-foreground mt-2 italic">{batch.notes}</p>}
                      <div className="mt-3">
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeleteToConfirm(batch)} data-testid={`button-delete-batch-${batch.id}`}>
                          <Trash2 className="h-3.5 w-3.5 me-1" />{isAr ? "حذف الدفعة" : "Delete Batch"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        }
      </div>

      <Dialog open={!!deleteToConfirm} onOpenChange={o => !o && setDeleteToConfirm(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-delete-batch">
          <DialogHeader><DialogTitle className="text-red-600">{isAr ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle></DialogHeader>
          {deleteToConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{isAr ? "هل أنت متأكد من حذف الدفعة" : "Delete batch"} <span className="font-semibold text-foreground">"{deleteToConfirm.batchNumber}"</span>? {isAr ? "لا يمكن التراجع." : "This cannot be undone."}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteToConfirm(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteToConfirm.id)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-batch">
                  {deleteMutation.isPending ? "..." : (isAr ? "حذف" : "Delete")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-new-batch">
          <DialogHeader><DialogTitle>{isAr ? "دفعة إنتاج جديدة" : "New Production Batch"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">{isAr ? "المنتج الناتج" : "Output Product"}</label>
                <Select value={formOutputProductId} onValueChange={setFormOutputProductId}>
                  <SelectTrigger data-testid="select-output-product"><SelectValue placeholder={isAr ? "اختر منتج" : "Select product"} /></SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-center text-muted-foreground">
                        {isAr ? "لا توجد منتجات. أضف منتجات من المخزون أولاً." : "No products found. Add products in Inventory first."}
                      </div>
                    ) : (
                      <>
                        {finishedOilProducts.length > 0 && finishedOilProducts.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                        {otherOutputProducts.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">{isAr ? "الكمية المنتجة" : "Output Quantity"}</label>
                <Input type="number" value={formOutputQty} onChange={e => setFormOutputQty(parseFloat(e.target.value) || 0)} data-testid="input-output-qty" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{isAr ? "المواد الخام المستخدمة" : "Raw Materials Used"}</label>
                <Button type="button" size="sm" variant="outline" onClick={() => setInputs(p => [...p, { productId: 0, productName: "", quantityUsed: 0 }])}>
                  <Plus className="h-3.5 w-3.5 me-1" />{isAr ? "إضافة" : "Add"}
                </Button>
              </div>
              <div className="space-y-2">
                {inputs.map((input, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select value={String(input.productId)} onValueChange={v => updateInput(idx, "productId", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={isAr ? "اختر مادة" : "Material"} /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({fmt(p.currentStock)} {p.unit})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input type="number" className="h-9 w-32" placeholder={isAr ? "كمية" : "Qty"} value={input.quantityUsed} onChange={e => updateInput(idx, "quantityUsed", parseFloat(e.target.value) || 0)} />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => setInputs(p => p.filter((_, i) => i !== idx))} disabled={inputs.length === 1}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} className="resize-none" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-batch">{isAr ? "حفظ الدفعة" : "Save Batch"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BatchInputsView({ batchId }: { batchId: number }) {
  const { data: inputs = [] } = useQuery<OilProductionInput[]>({
    queryKey: ["/api/oil/production", batchId, "inputs"],
    queryFn: () => fetch(`/api/oil/production/${batchId}/inputs`, { credentials: "include" }).then(r => r.json()),
  });
  if (!inputs.length) return <p className="text-xs text-muted-foreground">{""}</p>;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">Raw materials used:</p>
      <div className="space-y-0.5">
        {inputs.map(i => (
          <div key={i.id} className="flex justify-between text-sm text-muted-foreground">
            <span>{i.productName}</span>
            <span>−{parseFloat(i.quantityUsed).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
