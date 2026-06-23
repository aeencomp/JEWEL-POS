import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { storage } from "./storage";
import { signupRequests, insertSignupRequestSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  activateSubscriptionFromStripe,
  appBaseUrl,
  CHECKOUT_SESSION_DEFAULTS,
  SIGNUP_CHECKOUT_SESSION_DEFAULTS,
  extendSubscriptionOneMonth,
  getStripe,
  getStripePriceId,
  getStripeSettings,
  isStripeConfigured,
  saveStripeSettings,
  upsertSignupStripeCustomer,
} from "./stripe-service";

async function markSignupPaidFromSession(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.metadata?.type !== "signup_subscription" || !session.metadata.signupRequestId) {
    return false;
  }
  const paid =
    session.payment_status === "paid" ||
    session.status === "complete";
  if (!paid) return false;

  await db
    .update(signupRequests)
    .set({ paidAt: new Date(), stripeCheckoutSessionId: session.id })
    .where(eq(signupRequests.id, parseInt(session.metadata.signupRequestId, 10)));
  return true;
}

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
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL?.trim()) {
    console.warn("[stripe] APP_URL is not set — checkout redirect URLs may be wrong. Set APP_URL=https://iq-pos.com in .env");
  }
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    ...CHECKOUT_SESSION_DEFAULTS,
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
      if (process.env.NODE_ENV === "production" && !process.env.APP_URL?.trim()) {
        console.warn("[stripe] APP_URL is not set — signup checkout redirect URLs may be wrong. Set APP_URL=https://iq-pos.com in .env");
      }

      const customer = await upsertSignupStripeCustomer({
        email: parsed.email,
        name: parsed.name,
        phone: parsed.phone,
        businessName: parsed.businessName,
        signupRequestId: signup.id,
        posSystem: signup.posSystem,
      });

      const useHosted = req.body?.checkoutMode === "hosted";
      const shared = {
        ...SIGNUP_CHECKOUT_SESSION_DEFAULTS,
        mode: "subscription" as const,
        customer: customer.id,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          type: "signup_subscription",
          signupRequestId: String(signup.id),
          posSystem: signup.posSystem,
          customerName: parsed.name.trim(),
          businessName: parsed.businessName.trim(),
          phone: parsed.phone.trim(),
        },
        subscription_data: {
          metadata: {
            signupRequestId: String(signup.id),
            posSystem: signup.posSystem,
            customerName: parsed.name.trim(),
            businessName: parsed.businessName.trim(),
          },
        },
      };

      const session = useHosted
        ? await stripe.checkout.sessions.create({
            ...shared,
            success_url: `${base}/signup?signup=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${base}/signup?signup=cancelled`,
          })
        : await stripe.checkout.sessions.create({
            ...shared,
            ui_mode: "embedded",
            return_url: `${base}/signup?signup=success&session_id={CHECKOUT_SESSION_ID}`,
          });

      await db
        .update(signupRequests)
        .set({ stripeCheckoutSessionId: session.id })
        .where(eq(signupRequests.id, signup.id));

      res.json({
        clientSecret: session.client_secret ?? null,
        url: session.url ?? null,
        sessionId: session.id,
        signupRequestId: signup.id,
        mode: useHosted ? "hosted" : "embedded",
      });
    } catch (err: unknown) {
      console.error("[stripe signup checkout]", err);
      if (err && typeof err === "object" && "issues" in err) {
        return res.status(400).json({ message: "Invalid signup data" });
      }
      const message = err instanceof Error ? err.message : "Failed to create checkout session";
      res.status(500).json({ message });
    }
  });

  app.get("/api/stripe/signup-session/:sessionId", async (req, res) => {
    if (!(await isStripeConfigured())) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const sessionId = String(req.params.sessionId ?? "").trim();
    if (!sessionId.startsWith("cs_")) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.type !== "signup_subscription") {
        return res.status(403).json({ message: "Not a signup checkout session" });
      }

      const paid = await markSignupPaidFromSession(session);
      res.json({
        status: session.status,
        paymentStatus: session.payment_status,
        paid: paid || session.payment_status === "paid" || session.status === "complete",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to verify session";
      console.error("[stripe signup session]", err);
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
}

function storeHomePathFromPos(posSystem?: string | null): string {
  if (posSystem === "oil") return "/oil";
  if (posSystem === "fashion") return "/fashion";
  if (posSystem === "restaurant") return "/restaurant";
  if (posSystem === "pharmacy") return "/pharmacy";
  if (posSystem === "grocery") return "/grocery";
  return "/";
}
