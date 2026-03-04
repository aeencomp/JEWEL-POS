import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Download,
  Upload,
  FileJson,
  AlertTriangle,
  DatabaseBackup,
  Store,
  Package,
  Users,
  ClipboardList,
  Wrench,
  Clock,
  ShoppingBag,
  HandCoins,
  FolderOpen,
} from "lucide-react";

type BackupPreview = {
  exportedAt: string;
  storeCount: number;
  stores: {
    name: string;
    categories: number;
    inventoryItems: number;
    customers: number;
    orders: number;
    repairOrders: number;
    layawayPlans: number;
    purchases: number;
    debts: number;
  }[];
};

export default function AdminBackup() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<any>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadBackup = async () => {
    setDownloading(true);
    try {
      const res = await apiRequest("GET", "/api/admin/backup");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jewelpos_full_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t("adminBackup.backupSuccess") });
    } catch (error: any) {
      toast({ title: error.message || "Backup failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.version !== 2 || data.type !== "admin_full_backup") {
          toast({ title: t("adminBackup.invalidFile"), variant: "destructive" });
          return;
        }
        setPendingBackup(data);
        setPreview({
          exportedAt: data.exportedAt,
          storeCount: data.stores?.length || 0,
          stores: (data.stores || []).map((s: any) => ({
            name: s.store?.name || "Unknown",
            categories: s.categories?.length || 0,
            inventoryItems: s.inventoryItems?.length || 0,
            customers: s.customers?.length || 0,
            orders: s.orders?.length || 0,
            repairOrders: s.repairOrders?.length || 0,
            layawayPlans: s.layawayPlans?.length || 0,
            purchases: s.purchases?.length || 0,
            debts: s.debts?.length || 0,
          })),
        });
      } catch {
        toast({ title: t("adminBackup.parseFailed"), variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const restoreMutation = useMutation({
    mutationFn: async (backup: any) => {
      const res = await apiRequest("POST", "/api/admin/restore", backup);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || t("adminBackup.restoreSuccess") });
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setPendingBackup(null);
      setPreview(null);
      setShowConfirm(false);
    },
    onError: (err: any) => {
      toast({ title: err.message || t("adminBackup.restoreFailed"), variant: "destructive" });
      setShowConfirm(false);
    },
  });

  const statIcons = [
    { key: "categories", icon: FolderOpen },
    { key: "inventoryItems", icon: Package },
    { key: "customers", icon: Users },
    { key: "orders", icon: ClipboardList },
    { key: "repairOrders", icon: Wrench },
    { key: "layawayPlans", icon: Clock },
    { key: "purchases", icon: ShoppingBag },
    { key: "debts", icon: HandCoins },
  ];

  const statLabels: Record<string, string> = {
    categories: t("adminBackup.totalCategories"),
    inventoryItems: t("adminBackup.totalItems"),
    customers: t("adminBackup.totalCustomers"),
    orders: t("adminBackup.totalOrders"),
    repairOrders: t("adminBackup.totalRepairs"),
    layawayPlans: t("adminBackup.totalLayaways"),
    purchases: t("adminBackup.totalPurchases"),
    debts: t("adminBackup.totalDebts"),
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-backup-title">
          {t("adminBackup.title")}
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-backup-subtitle">
          {t("adminBackup.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              {t("adminBackup.downloadBackup")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("adminBackup.downloadDesc")}
            </p>
            <Button
              onClick={downloadBackup}
              disabled={downloading}
              className="w-full"
              data-testid="button-download-backup"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  {t("adminBackup.downloading")}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 me-2" />
                  {t("adminBackup.downloadBackup")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-primary" />
              {t("adminBackup.restoreBackup")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("adminBackup.restoreDesc")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-restore-file"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              data-testid="button-select-backup-file"
            >
              <FileJson className="h-4 w-4 me-2" />
              {t("adminBackup.selectFile")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {preview && (
        <Card data-testid="card-backup-preview">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DatabaseBackup className="h-5 w-5 text-primary" />
              {t("adminBackup.previewTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(preview.exportedAt).toLocaleString(language === "ar" ? "ar-IQ" : "en-US")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("adminBackup.storesCount")}:</span>
              <Badge variant="secondary" data-testid="text-stores-count">{preview.storeCount}</Badge>
            </div>

            <div className="space-y-3">
              {preview.stores.map((store, idx) => (
                <Card key={idx} className="border-dashed">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3" data-testid={`text-store-name-${idx}`}>
                      {store.name}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {statIcons.map(({ key, icon: Icon }) => {
                        const count = store[key as keyof typeof store] as number;
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
                            data-testid={`stat-${key}-${idx}`}
                          >
                            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{statLabels[key]}:</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={restoreMutation.isPending}
                className="flex-1"
                data-testid="button-restore-backup"
              >
                {restoreMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {t("adminBackup.restoring")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 me-2" />
                    {t("adminBackup.restoreBackup")}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingBackup(null);
                  setPreview(null);
                }}
                data-testid="button-cancel-restore"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("adminBackup.confirmRestore")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminBackup.confirmRestoreMsg")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreMutation.mutate(pendingBackup)}
              disabled={restoreMutation.isPending}
              data-testid="button-confirm-restore"
            >
              {restoreMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : null}
              {t("adminBackup.confirmRestore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
