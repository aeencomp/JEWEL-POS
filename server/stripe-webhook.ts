import type { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { signupRequests } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import {
  activateSubscriptionFromStripe,
  extendSubscriptionOneMonth,
  getStripe,
  isStripeConfigured,
} from "./stripe-service";

async function markSignupPaidFromSession(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.metadata?.type !== "signup_subscription" || !session.metadata.signupRequestId) {
    return false;
  }
  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) return false;

  await db
    .update(signupRequests)
    .set({ paidAt: new Date(), stripeCheckoutSessionId: session.id })
    .where(eq(signupRequests.id, parseInt(session.metadata.signupRequestId, 10)));
  return true;
}

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === "signup_subscription") {
        await markSignupPaidFromSession(session);
      } else if (session.metadata?.type === "store_subscription" && session.metadata.storeId) {
        const storeId = parseInt(session.metadata.storeId, 10);
        const stripeSubId = session.subscription;
        if (typeof stripeSubId === "string") {
          const stripeSub = await getStripe().subscriptions.retrieve(stripeSubId);
          await activateSubscriptionFromStripe(storeId, stripeSub);
        } else {
          await extendSubscriptionOneMonth(storeId);
        }
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId = invoice.subscription;
      if (typeof stripeSubId !== "string") break;
      const stripeSub = await getStripe().subscriptions.retrieve(stripeSubId);
      const storeId = parseInt(stripeSub.metadata?.storeId || "0", 10);
      if (storeId > 0) {
        await activateSubscriptionFromStripe(storeId, stripeSub);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const storeId = parseInt(stripeSub.metadata?.storeId || "0", 10);
      if (storeId <= 0) break;
      if (event.type === "customer.subscription.deleted" || stripeSub.status === "canceled") {
        const local = await storage.getSubscriptionByStore(storeId);
        if (local) {
          await storage.updateSubscription(local.id, { status: "cancelled" });
        }
      } else {
        await activateSubscriptionFromStripe(storeId, stripeSub);
      }
      break;
    }
    default:
      break;
  }
}

/** Stripe Checkout waits for this webhook to return 2xx before redirecting — respond immediately. */
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!(await isStripeConfigured())) {
    res.status(503).send("Stripe not configured");
    return;
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    console.error("[stripe webhook] Missing signature or STRIPE_WEBHOOK_SECRET");
    res.status(400).send("Missing webhook signature or secret");
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    console.error("[stripe webhook] Body is not raw buffer — check middleware order");
    res.status(400).send("Webhook requires raw body");
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error("[stripe webhook] Signature verification failed:", message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  // ACK immediately so Checkout can finish and redirect (Stripe waits up to ~10s otherwise).
  res.status(200).json({ received: true });

  void processStripeEvent(event).catch((err) => {
    console.error(`[stripe webhook] Async handler failed for ${event.type} (${event.id}):`, err);
  });
}
