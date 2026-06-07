import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <QrCode className="h-6 w-6 text-orange-600" />
        <h1 className="text-xl font-bold">{isAr ? "روابط طلب QR" : "QR Ordering Links"}</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {isAr ? "اطبع هذه الروابط كـ QR على كل طاولة — العملاء يطلبون مباشرة من هواتفهم" : "Print these as QR codes on each table — customers order directly from their phones"}
      </p>
      <Card>
        <CardHeader><CardTitle className="text-base">{isAr ? "رابط عام" : "General Link"}</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <code className="flex-1 text-xs bg-muted p-2 rounded break-all">{data?.general}</code>
          <Button size="icon" variant="outline" onClick={() => data?.general && copy(data.general)}><Copy className="h-4 w-4" /></Button>
          {data?.general && <a href={data.general} target="_blank" rel="noreferrer"><Button size="icon" variant="outline"><ExternalLink className="h-4 w-4" /></Button></a>}
        </CardContent>
      </Card>
      <div className="space-y-3">
        <h2 className="font-semibold">{isAr ? "روابط الطاولات" : "Table Links"}</h2>
        {data?.tables.map((t) => (
          <Card key={t.tableId}>
            <CardContent className="p-3 flex items-center gap-2">
              <span className="font-bold w-16">{isAr ? "طاولة" : "Table"} #{t.tableNumber}</span>
              <code className="flex-1 text-xs bg-muted p-2 rounded truncate">{t.url}</code>
              <Button size="icon" variant="outline" onClick={() => copy(t.url)}><Copy className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
