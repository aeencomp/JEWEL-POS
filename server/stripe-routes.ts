import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { storage } from "./storage";
import { signupRequests, insertSignupRequestSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  activateSubscriptionFromStripe,
  appBaseUrl,
  extendSubscriptionOneMonth,
  getStripe,
  getStripePriceId,
  getStripeSettings,
  isStripeConfigured,
  saveStripeSettings,
} from "./stripe-service";

type StripeHelpers = {
  requireAuth: (req: Request, res: Response, next: () => void) => void;
  requireAdmin: (req: Request, res: Response, next: () => void) => void;
  getEffectiveStoreId: (req: Request) => number | null;
};

async function createCheckoutSession(opts: {
  req: Request;
  storeId: number;
  subscriptionId: number;
  customerEmail?: string | null;
  successPath: string;
  cancelPath: string;
}) {
  const stripe = getStripe();
  const priceId = await getStripePriceId();
  const sub = await storage.getSubscription(opts.subscriptionId);
  if (!sub || sub.storeId !== opts.storeId) {
    throw new Error("Subscription not found");
  }

  const base = appBaseUrl(opts.req);
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}${opts.successPath}?session_id={CHECKOUT_SESSION_ID}&checkout=success`,
    cancel_url: `${base}${opts.cancelPath}?checkout=cancelled`,
    metadata: {
      storeId: String(opts.storeId),
      subscriptionId: String(opts.subscriptionId),
      type: "store_subscription",
    },
    subscription_data: {
      metadata: {
        storeId: String(opts.storeId),
        subscriptionId: String(opts.subscriptionId),
      },
    },
  };

  if (sub.stripeCustomerId) {
    sessionParams.customer = sub.stripeCustomerId;
  } else if (opts.customerEmail) {
    sessionParams.customer_email = opts.customerEmail;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

export function registerStripeRoutes(app: Express, helpers: StripeHelpers) {
  const { requireAuth, requireAdmin, getEffectiveStoreId } = helpers;

  app.get("/api/stripe/config", async (_req, res) => {
    res.json({
      enabled: await isStripeConfigured(),
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    });
  });

  app.get("/api/admin/stripe", requireAdmin, async (_req, res) => {
    const settings = await getStripeSettings();
    let priceLabel: string | null = null;
    if (settings.priceId && process.env.STRIPE_SECRET_KEY) {
      try {
        const price = await getStripe().prices.retrieve(settings.priceId);
        if (price.unit_amount != null && price.currency) {
          const amount = (price.unit_amount / 100).toLocaleString("en-US", {
            minimumFractionDigits: price.currency === "iqd" ? 0 : 2,
          });
          const interval = price.recurring?.interval ?? "month";
          priceLabel = `${amount} ${price.currency.toUpperCase()} / ${interval}`;
        }
      } catch {
        priceLabel = null;
      }
    }
    res.json({
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY?.trim(),
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET?.trim(),
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
      priceId: settings.priceId,
      priceLabel,
      enabled: await isStripeConfigured(),
      webhookUrl: `${appBaseUrl()}/api/stripe/webhook`,
    });
  });

  app.patch("/api/admin/stripe", requireAdmin, async (req, res) => {
    const priceId = String(req.body?.priceId ?? "").trim();
    if (!priceId.startsWith("price_")) {
      return res.status(400).json({
        message: "Invalid Price ID — copy the Price ID from Stripe (starts with price_), not the Product ID (prod_).",
      });
    }
    await saveStripeSettings({ priceId });
    res.json({ priceId, enabled: await isStripeConfigured() });
  });

  app.post("/api/stripe/create-checkout-session", requireAuth, async (req, res) => {
    if (!(await isStripeConfigured())) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "No store assigned" });

    const sub = await storage.getSubscriptionByStore(storeId);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    const store = await storage.getStore(storeId);
    const successPath = String(req.body?.successPath || storeHomePathFromPos(store?.posSystem));
    const cancelPath = String(req.body?.cancelPath || successPath);

    try {
      const session = await createCheckoutSession({
        req,
        storeId,
        subscriptionId: sub.id,
        customerEmail: store?.email,
        successPath,
        cancelPath,
      });
      res.json({ url: session.url, sessionId: session.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create checkout session";
      console.error("[stripe checkout]", err);
      res.status(500).json({ message });
    }
  });

  app.post("/api/stripe/signup-checkout", async (req, res) => {
    if (!(await isStripeConfigured())) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    try {
      const parsed = insertSignupRequestSchema.parse(req.body);
      const priceId = await getStripePriceId();
      const [signup] = await db
        .insert(signupRequests)
        .values({
          name: parsed.name,
          businessName: parsed.businessName,
          phone: parsed.phone,
          email: parsed.email,
          posSystem: parsed.posSystem ?? "jewel",
          notes: parsed.notes ?? null,
          status: "pending",
        })
        .returning();

      const stripe = getStripe();
      const base = appBaseUrl(req);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: parsed.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${base}/?signup=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/?signup=cancelled`,
        metadata: {
          type: "signup_subscription",
          signupRequestId: String(signup.id),
          posSystem: signup.posSystem,
        },
        subscription_data: {
          metadata: {
            signupRequestId: String(signup.id),
            posSystem: signup.posSystem,
          },
        },
      });

      await db
        .update(signupRequests)
        .set({ stripeCheckoutSessionId: session.id })
        .where(eq(signupRequests.id, signup.id));

      res.json({ url: session.url, sessionId: session.id, signupRequestId: signup.id });
    } catch (err: unknown) {
      console.error("[stripe signup checkout]", err);
      if (err && typeof err === "object" && "issues" in err) {
        return res.status(400).json({ message: "Invalid signup data" });
      }
      const message = err instanceof Error ? err.message : "Failed to create checkout session";
      res.status(500).json({ message });
    }
  });

  app.get("/api/stripe/checkout-session/:sessionId", requireAuth, async (req, res) => {
    if (!(await isStripeConfigured())) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const storeId = getEffectiveStoreId(req);
    if (!storeId) return res.status(403).json({ message: "No store assigned" });

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(String(req.params.sessionId), {
        expand: ["subscription"],
      });

      if (session.metadata?.storeId !== String(storeId)) {
        return res.status(403).json({ message: "Session does not belong to this store" });
      }

      const stripeSub = session.subscription;
      if (stripeSub && typeof stripeSub !== "string") {
        await activateSubscriptionFromStripe(storeId, stripeSub);
      } else if (session.payment_status === "paid") {
        await extendSubscriptionOneMonth(storeId);
      }

      const sub = await storage.getSubscriptionByStore(storeId);
      res.json({ status: session.payment_status, subscription: sub });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to verify session";
      res.status(500).json({ message });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    if (!(await isStripeConfigured())) {
      return res.status(503).send("Stripe not configured");
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !webhookSecret) {
      return res.status(400).send("Missing webhook signature or secret");
    }

    let event: Stripe.Event;
    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) return res.status(400).send("Missing raw body");
      event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Webhook error";
      console.error("[stripe webhook]", message);
      return res.status(400).send(`Webhook Error: ${message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.metadata?.type === "signup_subscription" && session.metadata.signupRequestId) {
            await db
              .update(signupRequests)
              .set({ paidAt: new Date(), stripeCheckoutSessionId: session.id })
              .where(eq(signupRequests.id, parseInt(session.metadata.signupRequestId, 10)));
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
      res.json({ received: true });
    } catch (err) {
      console.error("[stripe webhook handler]", err);
      res.status(500).json({ message: "Webhook handler failed" });
    }
  });
}

function storeHomePathFromPos(posSystem?: string | null): string {
  if (posSystem === "oil") return "/oil";
  if (posSystem === "fashion") return "/fashion";
  if (posSystem === "restaurant") return "/restaurant";
  if (posSystem === "pharmacy") return "/pharmacy";
  if (posSystem === "grocery") return "/grocery";
  return "/";
}
