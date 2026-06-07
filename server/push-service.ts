import webpush from "web-push";
import { db } from "./db";
import { pushSubscriptions } from "@shared/schema";
import { storage } from "./storage";
import { eq, and } from "drizzle-orm";
const VAPID_SETTINGS_KEY = "push:vapid";

type VapidKeys = { publicKey: string; privateKey: string };

async function loadOrCreateVapid(): Promise<VapidKeys | null> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const raw = await storage.getSetting(VAPID_SETTINGS_KEY);
  if (raw) {
    try { return JSON.parse(raw) as VapidKeys; } catch { /* regenerate */ }
  }
  const keys = webpush.generateVAPIDKeys();
  await storage.setSetting(VAPID_SETTINGS_KEY, JSON.stringify(keys));
  return keys;
}

let vapidReady = false;

export async function initPushService() {
  const keys = await loadOrCreateVapid();
  if (!keys) return;
  webpush.setVapidDetails("mailto:notifications@iq-pos.com", keys.publicKey, keys.privateKey);
  vapidReady = true;
}

export async function getVapidPublicKey(): Promise<string | null> {
  const keys = await loadOrCreateVapid();
  return keys?.publicKey ?? null;
}

export async function savePushSubscription(
  role: "customer" | "driver" | "staff",
  refKey: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  await db.insert(pushSubscriptions).values({
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    role,
    refKey,
  }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, role, refKey },
  });
}

async function sendToSubs(
  subs: (typeof pushSubscriptions.$inferSelect)[],
  payload: { title: string; body: string; url?: string },
) {
  if (!vapidReady || subs.length === 0) return;
  const data = JSON.stringify(payload);
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data,
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
}

export async function notifyByRole(
  role: "customer" | "driver" | "staff",
  refKey: string,
  title: string,
  body: string,
  url?: string,
) {
  const subs = await db.select().from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.role, role), eq(pushSubscriptions.refKey, refKey)));
  await sendToSubs(subs, { title, body, url });
}

export async function notifyDriversBroadcast(title: string, body: string, url?: string) {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.role, "driver"));
  await sendToSubs(subs, { title, body, url });
}

export async function notifyOrderEvent(
  event: "new" | "ready" | "driver_assigned" | "pickup" | "delivered",
  order: {
    storeId: number;
    trackingToken?: string | null;
    orderNumber: string;
    customerName?: string | null;
  },
) {
  const trackUrl = order.trackingToken ? `/app/track/${order.trackingToken}` : undefined;

  switch (event) {
    case "new":
      await notifyByRole("staff", String(order.storeId), "New IQ Order", `${order.orderNumber} — ${order.customerName || "Guest"}`, "/restaurant/delivery");
      break;
    case "ready":
      await notifyDriversBroadcast("Delivery Available", `${order.orderNumber} is ready for pickup`, "/driver");
      break;
    case "driver_assigned":
      if (order.trackingToken) {
        await notifyByRole("customer", order.trackingToken, "Driver Assigned", `A driver accepted order ${order.orderNumber}`, trackUrl);
      }
      break;
    case "pickup":
      if (order.trackingToken) {
        await notifyByRole("customer", order.trackingToken, "On the Way", `Your order ${order.orderNumber} is heading to you`, trackUrl);
      }
      break;
    case "delivered":
      if (order.trackingToken) {
        await notifyByRole("customer", order.trackingToken, "Delivered!", `Order ${order.orderNumber} has arrived`, trackUrl);
      }
      await notifyByRole("staff", String(order.storeId), "Order Delivered", `${order.orderNumber} was delivered`, "/restaurant/delivery");
      break;
  }
}
