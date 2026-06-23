import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { Gem, Droplets, Shirt, CheckCircle, XCircle, Clock, Trash2, Search, UserCheck } from "lucide-react";
import { posSystemLabel } from "@/lib/pos-system";
import type { SignupRequest } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function AdminSignupRequests() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: requests = [], isLoading } = useQuery<SignupRequest[]>({
    queryKey: ["/api/signup-requests"],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/signup-requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signup-requests"] });
      toast({ title: isAr ? "تم التحديث" : "Status updated" });
    },
    onError: () => {
      toast({ title: isAr ? "حدث خطأ" : "Error", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/signup-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signup-requests"] });
      setDeleteId(null);
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
    },
  });

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.businessName.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search);
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-amber-600" />
            {isAr ? "طلبات الاشتراك" : "Signup Requests"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isAr
              ? `${requests.length} طلب إجمالي — ${pendingCount} في الانتظار`
              : `${requests.length} total — ${pendingCount} pending`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث بالاسم أو الهاتف..." : "Search by name or phone..."}
            className="ps-9"
            data-testid="input-search-requests"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
            <SelectItem value="pending">{isAr ? "في الانتظار" : "Pending"}</SelectItem>
            <SelectItem value="approved">{isAr ? "موافق عليه" : "Approved"}</SelectItem>
            <SelectItem value="rejected">{isAr ? "مرفوض" : "Rejected"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>{isAr ? "الاسم" : "Name"}</TableHead>
              <TableHead>{isAr ? "العمل" : "Business"}</TableHead>
              <TableHead>{isAr ? "الهاتف" : "Phone"}</TableHead>
              <TableHead>{isAr ? "النظام" : "POS System"}</TableHead>
              <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
              <TableHead>{isAr ? "ملاحظات" : "Notes"}</TableHead>
              <TableHead className="text-end">{isAr ? "الإجراء" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {isAr ? "جاري التحميل..." : "Loading..."}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {isAr ? "لا توجد طلبات" : "No requests found"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => {
                const StatusIcon = statusIcons[req.status];
                return (
                  <TableRow key={req.id} data-testid={`row-request-${req.id}`}>
                    <TableCell className="font-medium">{req.name}</TableCell>
                    <TableCell>{req.businessName}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-sm">{req.phone}</TableCell>
                    <TableCell>
                      <span className="text-sm">{posSystemLabel(req.posSystem as any, isAr)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={`text-[11px] px-2 py-0.5 flex items-center gap-1 w-fit ${statusColors[req.status]}`}>
                          <StatusIcon className="h-3 w-3" />
                          {req.status === "pending"
                            ? (isAr ? "انتظار" : "Pending")
                            : req.status === "approved"
                            ? (isAr ? "موافق" : "Approved")
                            : (isAr ? "مرفوض" : "Rejected")}
                        </Badge>
                        {(req as { paidAt?: string | null }).paidAt && (
                          <Badge className="text-[10px] w-fit bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                            {isAr ? "مدفوع" : "Paid"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString(isAr ? "ar-IQ" : "en-GB")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-32 truncate">
                      {req.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status !== "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950/30"
                            onClick={() => statusMutation.mutate({ id: req.id, status: "approved" })}
                            disabled={statusMutation.isPending}
                            data-testid={`button-approve-${req.id}`}
                          >
                            <CheckCircle className="h-3 w-3 me-1" />
                            {isAr ? "قبول" : "Approve"}
                          </Button>
                        )}
                        {req.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950/30"
                            onClick={() => statusMutation.mutate({ id: req.id, status: "rejected" })}
                            disabled={statusMutation.isPending}
                            data-testid={`button-reject-${req.id}`}
                          >
                            <XCircle className="h-3 w-3 me-1" />
                            {isAr ? "رفض" : "Reject"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(req.id)}
                          data-testid={`button-delete-${req.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr ? "هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع." : "Are you sure you want to delete this request? This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {isAr ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
