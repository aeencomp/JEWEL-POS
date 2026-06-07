import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, ExternalLink, Smartphone, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RestoPageHeader } from "./restaurant-shared";

type QrLinks = { general: string; tables: { tableId: number; tableNumber: number; url: string }[] };

export default function RestaurantQr() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const { data } = useQuery<QrLinks>({ queryKey: ["/api/restaurant/qr-links"] });

  function copy(url: string) {
    navigator.clipboard.writeText(url);
    toast({ title: isAr ? "تم النسخ" : "Copied!" });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <RestoPageHeader
        title={isAr ? "طلب عبر QR" : "QR Table Ordering"}
        subtitle={isAr ? "اطبع رمز QR لكل طاولة — العملاء يطلبون من هواتفهم مباشرة" : "Print a QR code per table — guests order from their phones"}
        isAr={isAr}
      />

      <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-card dark:from-orange-950/20 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center">
            <Link2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold">{isAr ? "رابط عام (استلام / توصيل)" : "General Link (Pickup / Delivery)"}</p>
            <p className="text-xs text-muted-foreground">{isAr ? "للطلب بدون تحديد طاولة" : "For orders without a specific table"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <code className="flex-1 text-xs bg-background border rounded-xl p-3 break-all font-mono">{data?.general ?? "..."}</code>
          <Button size="icon" variant="outline" className="shrink-0" onClick={() => data?.general && copy(data.general)}><Copy className="h-4 w-4" /></Button>
          {data?.general && (
            <a href={data.general} target="_blank" rel="noreferrer">
              <Button size="icon" variant="outline" className="shrink-0"><ExternalLink className="h-4 w-4" /></Button>
            </a>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <QrCode className="h-4 w-4 text-orange-600" />
          {isAr ? "روابط الطاولات" : "Table QR Links"}
          {data?.tables.length ? <span className="text-muted-foreground font-normal">({data.tables.length})</span> : null}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {data?.tables.map((t) => (
            <div key={t.tableId} className="rounded-2xl border bg-card p-4 space-y-3 hover:border-orange-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center font-bold text-orange-700">
                    #{t.tableNumber}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{isAr ? `طاولة ${t.tableNumber}` : `Table ${t.tableNumber}`}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Smartphone className="h-3 w-3" />{isAr ? "طلب مباشر" : "Direct order"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => copy(t.url)}><Copy className="h-3.5 w-3.5" /></Button>
                  <a href={t.url} target="_blank" rel="noreferrer">
                    <Button size="icon" variant="outline" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button>
                  </a>
                </div>
              </div>
              <code className="block text-[10px] bg-muted/50 rounded-lg p-2 truncate font-mono">{t.url}</code>
            </div>
          ))}
        </div>
        {(!data?.tables || data.tables.length === 0) && (
          <p className="text-center text-muted-foreground py-8 text-sm">{isAr ? "أضف طاولات من نقطة البيع أولاً" : "Add tables from POS first"}</p>
        )}
      </div>
    </div>
  );
}
