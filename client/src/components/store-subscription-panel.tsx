import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { Subscription } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CalendarDays, CreditCard, RefreshCcw } from "lucide-react";
import { storeHomePath } from "@/lib/pos-system";

export type StoreSubscriptionView = Subscription & {
  daysLeft: number | null;
};

type StripeConfig = { enabled: boolean; publishableKey: string | null };

type Props = {
  posSystem?: string | null;
  variant?: "dark" | "light";
  buttonClassName?: string;
  showReminder?: boolean;
};

function formatDate(value: string | Date | null | undefined, isAr: boolean) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(isAr ? "ar-IQ" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function useStoreSubscription(enabled = true) {
  return useQuery<StoreSubscriptionView | null>({
    queryKey: ["/api/subscription"],
    enabled,
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/subscription", { credentials: "include" });
      if (res.status === 404 || res.status === 400 || res.status === 403) return null;
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

export function StoreSubscriptionPanel({
  posSystem,
  variant = "dark",
  buttonClassName,
  showReminder = true,
}: Props) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  const { data: subscription } = useStoreSubscription();
  const { data: stripeConfig } = useQuery<StripeConfig>({
    queryKey: ["/api/stripe/config"],
  });

  useEffect(() => {
    if (!showReminder || !subscription) return;
    const { daysLeft, status } = subscription;
    if (status === "expired" || (daysLeft !== null && daysLeft <= 2)) {
      const dismissKey = `sub_reminder_dismissed_${new Date().toDateString()}`;
      if (!localStorage.getItem(dismissKey)) setShowReminderDialog(true);
    }
  }, [subscription, showReminder]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const home = storeHomePath(posSystem);
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        successPath: home,
        cancelPath: home,
      });
      const data = await res.json();
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({
        title: isAr ? "فشل الدفع" : "Checkout failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const renewalMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/request-renewal"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oil/subscription"] });
      toast({
        title: isAr ? "تم إرسال طلب التجديد" : "Renewal Request Sent",
        description: isAr
          ? "سيتواصل معك المسؤول قريباً لتجديد اشتراكك."
          : "The administrator will contact you shortly to renew your subscription.",
      });
    },
  });

  if (!subscription) return null;

  const isDark = variant === "dark";
  const cardClass = isDark
    ? "rounded-xl bg-slate-800 border border-slate-700 p-3 space-y-2"
    : "rounded-xl bg-muted/50 border p-3 space-y-2";
  const labelClass = isDark ? "text-[11px] font-semibold text-slate-300" : "text-[11px] font-semibold text-muted-foreground";
  const metaClass = isDark ? "text-[10px] text-slate-400" : "text-[10px] text-muted-foreground";
  const valueClass = isDark ? "text-slate-300" : "text-foreground/80";

  const isExpired = subscription.status === "expired";
  const daysLeft = subscription.daysLeft;
  const stripeEnabled = stripeConfig?.enabled === true;

  function dismissReminder() {
    localStorage.setItem(`sub_reminder_dismissed_${new Date().toDateString()}`, "1");
    setShowReminderDialog(false);
  }

  return (
    <>
      <div className={cardClass} data-testid="store-subscription-panel">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 ${labelClass}`}>
            <CalendarDays className="h-3.5 w-3.5" />
            {isAr ? "الاشتراك" : "Subscription"}
          </div>
          <Badge
            className={`text-[10px] px-1.5 py-0 h-4 ${
              subscription.status === "active"
                ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                : subscription.status === "trial"
                  ? "bg-blue-500/20 text-blue-500 border-blue-500/30"
                  : "bg-red-500/20 text-red-500 border-red-500/30"
            }`}
            variant="outline"
          >
            {subscription.status === "active"
              ? isAr
                ? "فعّال"
                : "Active"
              : subscription.status === "trial"
                ? isAr
                  ? "تجريبي"
                  : "Trial"
                : subscription.status === "expired"
                  ? isAr
                    ? "منتهي"
                    : "Expired"
                  : subscription.status}
          </Badge>
        </div>

        <div className={`space-y-1 ${metaClass}`}>
          <div className="flex justify-between">
            <span>{isAr ? "الانتهاء:" : "Expires:"}</span>
            <span
              className={`font-medium ${
                daysLeft !== null && daysLeft <= 2
                  ? "text-red-500"
                  : daysLeft !== null && daysLeft <= 7
                    ? "text-amber-500"
                    : valueClass
              }`}
            >
              {formatDate(subscription.endDate, isAr)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{isAr ? "السعر:" : "Price:"}</span>
            <span className={valueClass}>
              {parseFloat(subscription.pricePerMonth || "0").toLocaleString()}{" "}
              {isAr ? "د.ع / شهر" : "IQD/mo"}
            </span>
          </div>
          {daysLeft !== null && daysLeft > 0 && (
            <div className="flex justify-between">
              <span>{isAr ? "المتبقي:" : "Remaining:"}</span>
              <span
                className={`font-semibold ${
                  daysLeft <= 2 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-emerald-500"
                }`}
              >
                {daysLeft} {isAr ? "يوم" : "days"}
              </span>
            </div>
          )}
        </div>

        {stripeEnabled ? (
          <Button
            size="sm"
            className={`w-full h-7 text-[11px] gap-1.5 ${buttonClassName || "bg-primary hover:bg-primary/90 text-primary-foreground"}`}
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            data-testid="button-stripe-checkout"
          >
            <CreditCard className="h-3 w-3" />
            {checkoutMutation.isPending
              ? isAr
                ? "جاري التحويل..."
                : "Redirecting..."
              : isAr
                ? "ادفع بالبطاقة"
                : "Pay with Card"}
          </Button>
        ) : (
          <Button
            size="sm"
            className={`w-full h-7 text-[11px] gap-1.5 ${buttonClassName || ""}`}
            onClick={() => renewalMutation.mutate()}
            disabled={renewalMutation.isPending || !!subscription.renewalRequestedAt}
            data-testid="button-request-renewal"
          >
            <RefreshCcw className="h-3 w-3" />
            {renewalMutation.isPending
              ? isAr
                ? "جارٍ الإرسال..."
                : "Sending..."
              : subscription.renewalRequestedAt
                ? isAr
                  ? "تم إرسال الطلب"
                  : "Request Sent"
                : isAr
                  ? "طلب تجديد"
                  : "Request Renewal"}
          </Button>
        )}
      </div>

      {showReminder && (
        <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
          <DialogContent className="max-w-md" data-testid="subscription-reminder-dialog">
            <DialogHeader>
              <DialogTitle>{isAr ? "تذكير الاشتراك" : "Subscription Reminder"}</DialogTitle>
              <DialogDescription>
                {isExpired
                  ? isAr
                    ? "انتهت صلاحية اشتراكك. يرجى التجديد للاستمرار."
                    : "Your subscription has expired. Please renew to continue."
                  : isAr
                    ? `ينتهي اشتراكك خلال ${daysLeft} يوم.`
                    : `Your subscription expires in ${daysLeft} day(s).`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end flex-wrap">
              <Button variant="outline" onClick={dismissReminder}>
                {isAr ? "لاحقاً" : "Later"}
              </Button>
              {stripeEnabled ? (
                <Button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending}>
                  <CreditCard className="h-4 w-4 me-1" />
                  {isAr ? "ادفع الآن" : "Pay Now"}
                </Button>
              ) : (
                <Button onClick={() => renewalMutation.mutate()} disabled={renewalMutation.isPending}>
                  {isAr ? "طلب تجديد" : "Request Renewal"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function useStripeCheckoutSuccess(posSystem?: string | null) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === "ar";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkout !== "success" || !sessionId) return;

    params.delete("checkout");
    params.delete("session_id");
    const clean = params.toString();
    const path = storeHomePath(posSystem) + (clean ? `?${clean}` : "");
    window.history.replaceState({}, "", path);

    fetch(`/api/stripe/checkout-session/${encodeURIComponent(sessionId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Verification failed"))))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        queryClient.invalidateQueries({ queryKey: ["/api/oil/subscription"] });
        toast({
          title: isAr ? "تم الدفع بنجاح" : "Payment successful",
          description: isAr ? "تم تفعيل اشتراكك." : "Your subscription is now active.",
        });
      })
      .catch(() => {
        toast({
          title: isAr ? "جاري تفعيل الاشتراك" : "Activating subscription",
          description: isAr
            ? "قد يستغرق التفعيل دقيقة. حدّث الصفحة إن لزم."
            : "Activation may take a moment. Refresh if needed.",
        });
      });
  }, [isAr, posSystem, toast]);
}
