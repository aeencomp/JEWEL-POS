import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, ShoppingCart, TrendingUp, DollarSign, Search } from "lucide-react";

type StockAuditData = {
  stock: { totalQty: number; costValue: number; retailValue: number };
  sales: { orderCount: number; totalQty: number; revenue: number; costOfSold: number };
  purchases: { count: number; totalSpent: number };
  netProfit: number;
  categorySummary: { id: number; name: string; itemCount: number; totalQty: number; costValue: number; retailValue: number }[];
  itemDetails: { id: number; name: string; sku: string; categoryName: string; quantity: number; costPrice: number; sellingPrice: number; soldQty: number; soldRevenue: number; profitMargin: string }[];
};

function formatIQD(amount: number): string {
  return `${amount.toLocaleString()} IQD`;
}

export default function StockAudit() {
  const { t } = useLanguage();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [search, setSearch] = useState("");

  const queryParams = new URLSearchParams();
  if (appliedFrom) queryParams.set("from", appliedFrom);
  if (appliedTo) queryParams.set("to", appliedTo);
  const queryString = queryParams.toString();

  const { data, isLoading } = useQuery<StockAuditData>({
    queryKey: ["/api/store/stock-audit", queryString],
    queryFn: async () => {
      const url = queryString ? `/api/store/stock-audit?${queryString}` : "/api/store/stock-audit";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit data");
      return res.json();
    },
  });

  const applyFilter = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const clearFilter = () => {
    setFromDate("");
    setToDate("");
    setAppliedFrom("");
    setAppliedTo("");
  };

  const filteredItems = data?.itemDetails.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.name.toLowerCase().includes(s) || item.sku.toLowerCase().includes(s) || item.categoryName.toLowerCase().includes(s);
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-stock-audit-title">
        {t("stockAudit.title")}
      </h1>

      <div className="flex flex-wrap items-end gap-3" data-testid="filter-section">
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t("stockAudit.dateFrom")}</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
            data-testid="input-date-from"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t("stockAudit.dateTo")}</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
            data-testid="input-date-to"
          />
        </div>
        <Button onClick={applyFilter} data-testid="button-apply-filter">
          {t("stockAudit.filter")}
        </Button>
        {(appliedFrom || appliedTo) && (
          <Button variant="outline" onClick={clearFilter} data-testid="button-clear-filter">
            {t("stockAudit.clearFilter")}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-stock">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">{t("stockAudit.totalStock")}</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-stock-qty">
              {data?.stock.totalQty || 0} <span className="text-sm font-normal text-muted-foreground">{t("stockAudit.items")}</span>
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stockAudit.costValue")}</span>
                <span data-testid="text-stock-cost">{formatIQD(data?.stock.costValue || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stockAudit.retailValue")}</span>
                <span data-testid="text-stock-retail">{formatIQD(data?.stock.retailValue || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-sold">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">{t("stockAudit.totalSold")}</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-sold-qty">
              {data?.sales.totalQty || 0} <span className="text-sm font-normal text-muted-foreground">{t("stockAudit.items")}</span>
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stockAudit.orders")}</span>
                <span data-testid="text-order-count">{data?.sales.orderCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stockAudit.revenue")}</span>
                <span data-testid="text-revenue">{formatIQD(data?.sales.revenue || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-purchased">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-muted-foreground">{t("stockAudit.totalPurchased")}</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-purchased-count">
              {data?.purchases.count || 0} <span className="text-sm font-normal text-muted-foreground">{t("stockAudit.items")}</span>
            </p>
            <div className="mt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stockAudit.totalSpent")}</span>
                <span data-testid="text-purchased-spent">{formatIQD(data?.purchases.totalSpent || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-net-profit">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-muted-foreground">{t("stockAudit.netProfit")}</span>
            </div>
            <p className={`text-2xl font-bold ${(data?.netProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`} data-testid="text-net-profit">
              {formatIQD(data?.netProfit || 0)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("stockAudit.revenue")} - {t("stockAudit.costValue")}
            </p>
          </CardContent>
        </Card>
      </div>

      {data?.categorySummary && data.categorySummary.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-3" data-testid="text-category-breakdown-title">
              {t("stockAudit.categoryBreakdown")}
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("stockAudit.category")}</TableHead>
                    <TableHead className="text-center">{t("stockAudit.itemCount")}</TableHead>
                    <TableHead className="text-center">{t("stockAudit.qty")}</TableHead>
                    <TableHead className="text-end">{t("stockAudit.costValue")}</TableHead>
                    <TableHead className="text-end">{t("stockAudit.retailValue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categorySummary.map((cat) => (
                    <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                      <TableCell>
                        <Badge variant="secondary">{cat.name}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{cat.itemCount}</TableCell>
                      <TableCell className="text-center">{cat.totalQty}</TableCell>
                      <TableCell className="text-end">{formatIQD(cat.costValue)}</TableCell>
                      <TableCell className="text-end">{formatIQD(cat.retailValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold" data-testid="text-detailed-items-title">
              {t("stockAudit.detailedItems")}
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
                data-testid="input-search-items"
              />
            </div>
          </div>
          {filteredItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-data">
              {t("stockAudit.noData")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("stockAudit.itemName")}</TableHead>
                    <TableHead>{t("stockAudit.sku")}</TableHead>
                    <TableHead>{t("stockAudit.category")}</TableHead>
                    <TableHead className="text-center">{t("stockAudit.inStock")}</TableHead>
                    <TableHead className="text-center">{t("stockAudit.sold")}</TableHead>
                    <TableHead className="text-end">{t("stockAudit.costPrice")}</TableHead>
                    <TableHead className="text-end">{t("stockAudit.sellingPrice")}</TableHead>
                    <TableHead className="text-end">{t("stockAudit.soldRevenue")}</TableHead>
                    <TableHead className="text-end">{t("stockAudit.profitMargin")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.categoryName}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.quantity > 0 ? "default" : "destructive"}>
                          {item.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{item.soldQty}</TableCell>
                      <TableCell className="text-end">{formatIQD(item.costPrice)}</TableCell>
                      <TableCell className="text-end">{formatIQD(item.sellingPrice)}</TableCell>
                      <TableCell className="text-end">{formatIQD(item.soldRevenue)}</TableCell>
                      <TableCell className="text-end">
                        <Badge variant={parseFloat(item.profitMargin) > 0 ? "secondary" : "destructive"}>
                          {item.profitMargin}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
