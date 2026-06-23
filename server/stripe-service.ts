import Stripe from "stripe";
import { storage } from "./storage";
import type { Subscription } from "@shared/schema";

const STRIPE_SETTINGS_KEY = "stripe";

let stripeClient: Stripe | null = null;

export type StripeSettings = {
  priceId: string | null;
};

export async function getStripeSettings(): Promise<StripeSettings> {
  const raw = await storage.getSetting(STRIPE_SETTINGS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { priceId?: string };
      if (parsed.priceId?.startsWith("price_")) {
        return { priceId: parsed.priceId };
      }
    } catch {
      /* ignore */
    }
  }
  const envPrice = process.env.STRIPE_PRICE_ID?.trim();
  return { priceId: envPrice?.startsWith("price_") ? envPrice : null };
}

export async function saveStripeSettings(data: StripeSettings): Promise<void> {
  await storage.setSetting(STRIPE_SETTINGS_KEY, JSON.stringify(data));
}

export async function isStripeConfigured(): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return false;
  const { priceId } = await getStripeSettings();
  return !!priceId;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export async function getStripePriceId(): Promise<string> {
  const { priceId } = await getStripeSettings();
  if (!priceId) {
    throw new Error("Stripe Price ID is not configured — add it in Admin → Pricing or STRIPE_PRICE_ID in .env");
  }
  return priceId;
}

/** Card-only checkout — avoids Cash App / bank methods that often hang for Iraq-region customers. */
export const CHECKOUT_SESSION_DEFAULTS: Pick<
  Stripe.Checkout.SessionCreateParams,
  "payment_method_types" | "billing_address_collection" | "wallet_options"
> = {
  payment_method_types: ["card"],
  billing_address_collection: "auto",
  wallet_options: {
    link: { display: "never" },
  },
};

/** Signup checkout — prefill contact fields from the linked Stripe Customer. */
export const SIGNUP_CHECKOUT_SESSION_DEFAULTS: Pick<
  Stripe.Checkout.SessionCreateParams,
  "payment_method_types" | "billing_address_collection" | "phone_number_collection" | "customer_update"
> = {
  ...CHECKOUT_SESSION_DEFAULTS,
  phone_number_collection: { enabled: true },
  customer_update: {
    name: "auto",
    address: "auto",
  },
};

export type SignupCheckoutCustomerInput = {
  email: string;
  name: string;
  phone: string;
  businessName: string;
  signupRequestId: number;
  posSystem: string;
};

function normalizePhoneForStripe(phone: string): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return undefined;

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return digits.length >= 8 ? digits : undefined;
  }
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("964")) return `+${digits}`;
  if (digits.startsWith("0")) return `+964${digits.slice(1)}`;
  if (digits.length >= 9 && digits.length <= 12) return `+964${digits}`;
  return undefined;
}

/** Create or update a Stripe Customer from signup form data so Checkout prefills email, name, and phone. */
export async function upsertSignupStripeCustomer(input: SignupCheckoutCustomerInput): Promise<Stripe.Customer> {
  const stripe = getStripe();
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhoneForStripe(input.phone);
  const metadata: Stripe.MetadataParam = {
    businessName: input.businessName.trim(),
    signupRequestId: String(input.signupRequestId),
    posSystem: input.posSystem,
    source: "iq-pos-signup",
  };

  const existing = await stripe.customers.list({ email, limit: 1 });
  const found = existing.data[0];

  if (found) {
    return stripe.customers.update(found.id, {
      name: input.name.trim(),
      email,
      ...(phone ? { phone } : {}),
      metadata: { ...found.metadata, ...metadata },
    });
  }

  return stripe.customers.create({
    email,
    name: input.name.trim(),
    ...(phone ? { phone } : {}),
    metadata,
  });
}

export async function getPublicStripePrice(): Promise<{
  amount: number;
  currency: string;
  interval: string;
  enabled: true;
} | null> {
  if (!(await isStripeConfigured())) return null;
  try {
    const price = await getStripe().prices.retrieve(await getStripePriceId());
    if (price.unit_amount == null || !price.currency) return null;
    const zeroDecimal = new Set([
      "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
    ]);
    const amount = zeroDecimal.has(price.currency) ? price.unit_amount : price.unit_amount / 100;
    return {
      amount,
      currency: price.currency,
      interval: price.recurring?.interval ?? "month",
      enabled: true,
    };
  } catch {
    return null;
  }
}

export function appBaseUrl(req?: { protocol?: string; get?: (name: string) => string | undefined }): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (req?.get?.("host")) {
    const proto = req.protocol || "https";
    return `${proto}://${req.get("host")}`;
  }
  return "http://localhost:5000";
}

export function subscriptionDaysLeft(sub: Subscription): number | null {
  if (!sub.endDate) return null;
  return Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function subscriptionPayload(sub: Subscription) {
  return { ...sub, daysLeft: subscriptionDaysLeft(sub) };
}

export async function activateSubscriptionFromStripe(
  storeId: number,
  stripeSubscription: Stripe.Subscription,
): Promise<Subscription | undefined> {
  const sub = await storage.getSubscriptionByStore(storeId);
  if (!sub) return undefined;

  const endDate = new Date(stripeSubscription.current_period_end * 1000);
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id ?? null;

  return storage.updateSubscription(sub.id, {
    status: stripeSubscription.status === "active" || stripeSubscription.status === "trialing" ? "active" : "expired",
    endDate,
    lastPaymentDate: new Date(),
    renewalRequestedAt: null,
    stripeCustomerId: customerId,
    stripeSubscriptionId: stripeSubscription.id,
  });
}

export async function extendSubscriptionOneMonth(storeId: number): Promise<Subscription | undefined> {
  const sub = await storage.getSubscriptionByStore(storeId);
  if (!sub) return undefined;

  const base = sub.endDate && new Date(sub.endDate) > new Date() ? new Date(sub.endDate) : new Date();
  const endDate = new Date(base);
  endDate.setDate(endDate.getDate() + 30);

  return storage.updateSubscription(sub.id, {
    status: "active",
    endDate,
    lastPaymentDate: new Date(),
    renewalRequestedAt: null,
  });
}
