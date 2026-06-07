import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { subscribeToPush } from "@/lib/push-notifications";

export function PushEnableButton({
  role,
  refKey,
  isAr,
}: {
  role: "customer" | "driver" | "staff";
  refKey: string;
  isAr?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!("Notification" in window)) return null;

  async function enable() {
    setLoading(true);
    const ok = await subscribeToPush(role, refKey);
    if (ok) setEnabled(true);
    setLoading(false);
  }

  if (enabled || Notification.permission === "granted") return null;

  return (
    <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={enable} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      {isAr ? "تفعيل الإشعارات" : "Enable notifications"}
    </Button>
  );
}
