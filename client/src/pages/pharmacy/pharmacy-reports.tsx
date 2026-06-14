import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Package, FilePlus2, AlertTriangle, Loader2, FileText } from "lucide-react";

type ReportData = {
  grossSales: number;
  orderCount: number;
  itemsSold: number;
  avgOrderValue: number;
  expiringCount: number;
  rxPending: number;
  rxDispensed: number;
  lowStock: number;
  outOfStock: number;
  topProducts: { name: string; sku: string; qty: number; revenue: number }[];
};

export default function PharmacyReports() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data, isLoading } = useQuery<ReportData>({ queryKey: ["/api/pharmacy/reports"] });

  const kpis = data ? [
    { label: isAr ? "إجمالي المبيعات" : "Gross Sales", value: data.grossSales.toLocaleString(), icon: TrendingUp, color: "text-emerald-600" },
    { label: isAr ? "الطلبات" : "Orders", value: String(data.orderCount), icon: Package, color: "text-teal-600" },
    { label: isAr ? "وصفات معلقة" : "Pending Rx", value: String(data.rxPending), icon: FilePlus2, color: "text-cyan-600" },
    { label: isAr ? "تنبيهات صلاحية" : "Expiry Alerts", value: String(data.expiringCount), icon: AlertTriangle, color: "text-orange-600" },
  ] : [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-teal-500" />{isAr ? "تقارير الصيدلية" : "Pharmacy Reports"}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? "ملخص المبيعات والمخزون والوصفات" : "Sales, stock, and prescription summary"}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Icon className={`h-8 w-8 ${kpi.color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold">{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3">{isAr ? "أكثر الأدوية مبيعاً" : "Top Selling Drugs"}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? "الدواء" : "Drug"}</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>{isAr ? "الكمية" : "Qty"}</TableHead>
                    <TableHead>{isAr ? "الإيراد" : "Revenue"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.topProducts ?? []).map((p) => (
                    <TableRow key={p.sku}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>{p.qty}</TableCell>
                      <TableCell>{p.revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
