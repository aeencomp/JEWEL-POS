import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import type { InventoryItem } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Loader2 } from "lucide-react";

type AlertItem = InventoryItem & { daysLeft: number; expired: boolean };
type ExpiryResponse = { alerts: AlertItem[]; expired: number; expiringSoon: number; daysWindow: number };

export default function GroceryExpiry() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data, isLoading } = useQuery<ExpiryResponse>({ queryKey: ["/api/grocery/expiry-alerts?days=90"] });

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          {isAr ? "تنبيهات الصلاحية" : "Expiry Alerts"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAr ? "منتجات منتهية أو تنتهي خلال 90 يوماً" : "Products expired or expiring within 90 days"}
        </p>
      </div>

      {!isLoading && data && (
        <div className="flex gap-3">
          <Badge variant="destructive">{isAr ? `منتهية: ${data.expired}` : `Expired: ${data.expired}`}</Badge>
          <Badge className="bg-orange-500">{isAr ? `قريبة: ${data.expiringSoon}` : `Expiring soon: ${data.expiringSoon}`}</Badge>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "المنتج" : "Product"}</TableHead>
                <TableHead>{isAr ? "الدفعة" : "Batch"}</TableHead>
                <TableHead>{isAr ? "الصلاحية" : "Expiry"}</TableHead>
                <TableHead>{isAr ? "الأيام" : "Days left"}</TableHead>
                <TableHead>{isAr ? "الكمية" : "Qty"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.alerts ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.batchNumber || "—"}</TableCell>
                  <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    {item.expired ? (
                      <Badge variant="destructive">{isAr ? "منتهي" : "Expired"}</Badge>
                    ) : (
                      <Badge className="bg-orange-500">{item.daysLeft} {isAr ? "يوم" : "days"}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                </TableRow>
              ))}
              {(data?.alerts ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{isAr ? "لا توجد تنبيهات" : "No expiry alerts"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
