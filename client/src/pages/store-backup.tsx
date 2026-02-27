import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { Loader2, Download, Upload, FileJson, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export default function StoreBackup() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<any>(null);
  const [backupInfo, setBackupInfo] = useState<{ storeName: string; date: string; counts: Record<string, number> } | null>(null);

  const downloadBackup = async () => {
    try {
      const res = await apiRequest("GET", "/api/store/backup");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${data.storeName?.replace(/\s+/g, "_") || "store"}_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t("backup.downloadSuccess") });
    } catch (error: any) {
      toast({ title: error.message || t("backup.downloadError"), variant: "destructive" });
    }
  };

  const restoreMutation = useMutation({
    mutationFn: async (backup: any) => {
      const res = await apiRequest("POST", "/api/store/restore", backup);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: t("backup.restoreSuccess") });
      setBackupInfo(null);
      setPendingBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.version !== 1) {
          toast({ title: t("backup.invalidFile"), variant: "destructive" });
          return;
        }
        setPendingBackup(data);
        setBackupInfo({
          storeName: data.storeName || "Unknown",
          date: data.exportedAt ? new Date(data.exportedAt).toLocaleString() : "Unknown",
          counts: {
            categories: data.categories?.length || 0,
            inventoryItems: data.inventoryItems?.length || 0,
            customers: data.customers?.length || 0,
            orders: data.orders?.length || 0,
            repairOrders: data.repairOrders?.length || 0,
            layawayPlans: data.layawayPlans?.length || 0,
            purchases: data.purchases?.length || 0,
          },
        });
      } catch {
        toast({ title: t("backup.invalidFile"), variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = () => {
    setShowConfirm(true);
  };

  const confirmRestore = () => {
    setShowConfirm(false);
    if (pendingBackup) {
      restoreMutation.mutate(pendingBackup);
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold" data-testid="text-backup-title">
        {t("backup.title")}
      </h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Download className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold" data-testid="text-backup-download-title">
              {t("backup.downloadTitle")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-backup-download-desc">
            {t("backup.downloadDescription")}
          </p>
          <Button onClick={downloadBackup} data-testid="button-download-backup">
            <FileJson className="me-2 h-4 w-4" />
            {t("backup.downloadButton")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold" data-testid="text-backup-restore-title">
              {t("backup.restoreTitle")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-backup-restore-desc">
            {t("backup.restoreDescription")}
          </p>

          <div className="space-y-4">
            <div>
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
                data-testid="button-select-file"
              >
                <FileJson className="me-2 h-4 w-4" />
                {t("backup.selectFile")}
              </Button>
            </div>

            {backupInfo && (
              <div className="border rounded-md p-4 space-y-3 bg-muted/30" data-testid="backup-file-info">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">{t("backup.fileInfo")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">{t("backup.storeName")}:</span>
                  <span data-testid="text-backup-store-name">{backupInfo.storeName}</span>
                  <span className="text-muted-foreground">{t("backup.exportDate")}:</span>
                  <span data-testid="text-backup-date">{backupInfo.date}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-muted-foreground">{t("backup.categories")}:</span>
                  <span data-testid="text-count-categories">{backupInfo.counts.categories}</span>
                  <span className="text-muted-foreground">{t("backup.inventoryItems")}:</span>
                  <span data-testid="text-count-inventory">{backupInfo.counts.inventoryItems}</span>
                  <span className="text-muted-foreground">{t("backup.customers")}:</span>
                  <span data-testid="text-count-customers">{backupInfo.counts.customers}</span>
                  <span className="text-muted-foreground">{t("backup.orders")}:</span>
                  <span data-testid="text-count-orders">{backupInfo.counts.orders}</span>
                  <span className="text-muted-foreground">{t("backup.repairOrders")}:</span>
                  <span data-testid="text-count-repairs">{backupInfo.counts.repairOrders}</span>
                  <span className="text-muted-foreground">{t("backup.layawayPlans")}:</span>
                  <span data-testid="text-count-layaway">{backupInfo.counts.layawayPlans}</span>
                  <span className="text-muted-foreground">{t("backup.purchases")}:</span>
                  <span data-testid="text-count-purchases">{backupInfo.counts.purchases}</span>
                </div>
                <Separator />
                <Button
                  onClick={handleRestore}
                  disabled={restoreMutation.isPending}
                  variant="destructive"
                  data-testid="button-restore-backup"
                >
                  {restoreMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  <Upload className="me-2 h-4 w-4" />
                  {t("backup.restoreButton")}
                </Button>
              </div>
            )}

            {restoreMutation.isSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm" data-testid="text-restore-success">
                <CheckCircle2 className="h-4 w-4" />
                {t("backup.restoreSuccess")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("backup.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("backup.confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} data-testid="button-confirm-restore">
              {t("backup.restoreButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
