import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Bike, Phone, Loader2, ExternalLink } from "lucide-react";
import { RestoPageHeader } from "./restaurant-shared";
import { cn } from "@/lib/utils";

type DriverRow = {
  id: number;
  name: string;
  phone: string;
  vehicleType: string;
  isActive: boolean;
  status: string;
  isPlatform: boolean;
};

export default function RestaurantDrivers() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", pin: "", vehicleType: "motorcycle" });

  const { data: drivers = [] } = useQuery<DriverRow[]>({
    queryKey: ["/api/restaurant/drivers"],
    refetchInterval: 10000,
  });

  const addDriver = useMutation({
    mutationFn: () => apiRequest("POST", "/api/restaurant/drivers", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/drivers"] });
      setForm({ name: "", phone: "", pin: "", vehicleType: "motorcycle" });
      setShowForm(false);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/restaurant/drivers/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/restaurant/drivers"] }),
  });

  const statusColor: Record<string, string> = {
    online: "bg-emerald-100 text-emerald-700",
    busy: "bg-orange-100 text-orange-700",
    offline: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <RestoPageHeader
        title={isAr ? "إدارة السائقين" : "Driver Management"}
        subtitle={isAr ? "أضف سائقين لتوصيل طلبات IQ Order" : "Add drivers to deliver IQ Order requests"}
        isAr={isAr}
        action={
          <div className="flex gap-2">
            <a href="/driver-login" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3.5 w-3.5" />{isAr ? "تطبيق السائق" : "Driver App"}
              </Button>
            </a>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 gap-1" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" />{isAr ? "سائق جديد" : "Add Driver"}
            </Button>
          </div>
        }
      />

      {showForm && (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">{isAr ? "إضافة سائق" : "New Driver"}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isAr ? "الاسم" : "Name"} />
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={isAr ? "الهاتف" : "Phone"} dir="ltr" />
            <Input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} placeholder={isAr ? "رمز PIN (4-8)" : "PIN (4-8)"} type="password" />
            <select className="h-10 rounded-md border px-3 bg-background text-sm" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              <option value="motorcycle">{isAr ? "دراجة" : "Motorcycle"}</option>
              <option value="car">{isAr ? "سيارة" : "Car"}</option>
              <option value="bicycle">{isAr ? "دراجة هوائية" : "Bicycle"}</option>
            </select>
          </div>
          <Button className="bg-orange-600 hover:bg-orange-700" disabled={!form.name || !form.phone || !form.pin || addDriver.isPending} onClick={() => addDriver.mutate()}>
            {addDriver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "حفظ" : "Save")}
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-sky-300 bg-sky-50/50 dark:bg-sky-950/20 p-4 text-sm">
        <p className="font-semibold text-sky-800 dark:text-sky-300">{isAr ? "سائق تجريبي (منصة IQ)" : "Platform demo driver"}</p>
        <p className="text-muted-foreground mt-1" dir="ltr">07700000001 / PIN: 1234</p>
        <p className="text-xs text-muted-foreground mt-2">{isAr ? "السائقون يستخدمون تطبيق /driver-login" : "Drivers use the app at /driver-login"}</p>
      </div>

      <div className="space-y-3">
        {drivers.map((d) => (
          <div key={d.id} className={cn("rounded-2xl border bg-card p-4 flex items-center gap-4", !d.isActive && "opacity-60")}>
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center shrink-0">
              <Bike className="h-6 w-6 text-sky-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{d.name}</p>
                {d.isPlatform && <Badge variant="outline" className="text-[10px]">IQ Platform</Badge>}
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", statusColor[d.status] || statusColor.offline)}>
                  {d.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5" dir="ltr"><Phone className="h-3 w-3" />{d.phone}</p>
              <p className="text-xs text-muted-foreground capitalize">{d.vehicleType}</p>
            </div>
            {!d.isPlatform && (
              <Switch checked={d.isActive} onCheckedChange={(v) => toggleActive.mutate({ id: d.id, isActive: v })} />
            )}
          </div>
        ))}
        {drivers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{isAr ? "لا سائقين — أضف سائقاً أو استخدم الحساب التجريبي" : "No drivers — add one or use the demo account"}</p>
        )}
      </div>
    </div>
  );
}
