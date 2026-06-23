import { randomBytes } from "crypto";
import type Stripe from "stripe";
import { db } from "./db";
import { signupRequests, menuCategories, restaurantTables, type SignupRequest } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { GROCERY_DEFAULT_CATEGORIES } from "@shared/grocery-defaults";
import { activateSubscriptionFromStripe, getStripe } from "./stripe-service";
import { isResendConfigured, sendStoreWelcomeEmail } from "./resend";

const DEFAULT_PRICING_MONTHLY = 45000;

function stripeSubscriptionId(session: Stripe.Checkout.Session): string | null {
  const sub = session.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return sub.id;
  return null;
}

export type SignupProvisionResult = {
  signupRequestId: number;
  storeId: number;
  username: string;
  tempPassword?: string;
  loginPath: string;
  alreadyProvisioned: boolean;
  emailSent: boolean;
};

async function getStandardMonthlyPrice(): Promise<number> {
  try {
    const raw = await storage.getSetting("pricing");
    if (!raw) return DEFAULT_PRICING_MONTHLY;
    const parsed = JSON.parse(raw) as { monthly?: number; jewel?: { standard?: number } };
    if (typeof parsed.monthly === "number") return parsed.monthly;
    return parsed.jewel?.standard ?? DEFAULT_PRICING_MONTHLY;
  } catch {
    return DEFAULT_PRICING_MONTHLY;
  }
}

function brandColorForPos(posSystem: SignupRequest["posSystem"]): string {
  if (posSystem === "fashion") return "#db2777";
  if (posSystem === "oil") return "#2563eb";
  if (posSystem === "restaurant") return "#ea580c";
  if (posSystem === "pharmacy") return "#0d9488";
  if (posSystem === "grocery") return "#16a34a";
  return "#d4a574";
}

export function storeLoginPath(posSystem: SignupRequest["posSystem"]): string {
  if (posSystem === "oil") return "/oil-login";
  if (posSystem === "fashion") return "/fashion-login";
  if (posSystem === "restaurant") return "/restaurant-login";
  if (posSystem === "pharmacy") return "/pharmacy-login";
  if (posSystem === "grocery") return "/grocery-login";
  return "/store-portal";
}

function slugUsername(base: string, fallback: string): string {
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 28);
  return slug.length >= 3 ? slug : fallback;
}

async function uniqueUsername(preferred: string, storeId: number): Promise<string> {
  let candidate = preferred;
  let suffix = 0;
  while (true) {
    const existing = await storage.getUserByUsername(candidate);
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${preferred.slice(0, 24)}${storeId}${suffix > 1 ? suffix : ""}`;
    if (suffix > 20) {
      candidate = `store${storeId}${suffix}`;
    }
  }
}

function generateTempPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 14);
}

async function seedStoreDefaults(storeId: number, posSystem: SignupRequest["posSystem"]) {
  if (posSystem === "fashion") {
    const names = ["Men", "Women", "Kids", "Accessories"];
    for (let i = 0; i < names.length; i++) {
      await storage.createCategory({ storeId, name: names[i], sortOrder: i });
    }
  }
  if (posSystem === "pharmacy") {
    const names = ["Tablets", "Syrups", "Injections", "OTC", "Vitamins", "Cosmetics"];
    for (let i = 0; i < names.length; i++) {
      await storage.createCategory({ storeId, name: names[i], sortOrder: i });
    }
  }
  if (posSystem === "grocery") {
    for (let i = 0; i < GROCERY_DEFAULT_CATEGORIES.length; i++) {
      await storage.createCategory({ storeId, name: GROCERY_DEFAULT_CATEGORIES[i], sortOrder: i });
    }
  }
  if (posSystem === "restaurant") {
    const menuCats = [
      { name: "Appetizers", nameAr: "المقبلات" },
      { name: "Main Dishes", nameAr: "الأطباق الرئيسية" },
      { name: "Drinks", nameAr: "المشروبات" },
      { name: "Desserts", nameAr: "الحلويات" },
    ];
    for (let i = 0; i < menuCats.length; i++) {
      await db.insert(menuCategories).values({
        storeId,
        name: menuCats[i].name,
        nameAr: menuCats[i].nameAr,
        sortOrder: i,
      });
    }
    for (let n = 1; n <= 8; n++) {
      await db.insert(restaurantTables).values({
        storeId,
        tableNumber: n,
        name: `Table ${n}`,
        section: "main",
        status: "free",
      });
    }
  }
}

async function emailStoreCredentials(opts: {
  signup: SignupRequest;
  username: string;
  tempPassword: string;
  loginPath: string;
}): Promise<boolean> {
  const email = opts.signup.email?.trim();
  if (!email) {
    console.warn(`[signup provision] No email on signup ${opts.signup.id} — credentials not emailed`);
    return false;
  }

  if (!isResendConfigured()) {
    console.warn(
      `[signup provision] RESEND_API_KEY not configured — credentials NOT emailed to ${email}. Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env`,
    );
    return false;
  }

  const appUrl = (process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "");
  try {
    await sendStoreWelcomeEmail({
      to: email,
      ownerName: opts.signup.name,
      businessName: opts.signup.businessName,
      username: opts.username,
      password: opts.tempPassword,
      loginUrl: `${appUrl}${opts.loginPath}`,
    });
    console.log(`[signup provision] Login credentials emailed to ${email} for signup ${opts.signup.id}`);
    return true;
  } catch (err) {
    console.error(`[signup provision] Failed to email credentials to ${email}:`, err);
    return false;
  }
}

async function linkStripeSubscription(opts: {
  storeId: number;
  localSubscriptionId: number;
  signupRequestId: number;
  stripeSubscriptionId: string;
  stripeCustomerId?: string | null;
}) {
  const stripe = getStripe();
  const stripeSub = await stripe.subscriptions.retrieve(opts.stripeSubscriptionId);
  await stripe.subscriptions.update(opts.stripeSubscriptionId, {
    metadata: {
      ...stripeSub.metadata,
      type: "store_subscription",
      storeId: String(opts.storeId),
      subscriptionId: String(opts.localSubscriptionId),
      signupRequestId: String(opts.signupRequestId),
    },
  });
  await activateSubscriptionFromStripe(opts.storeId, stripeSub);
}

async function provisionNewStoreFromSignup(
  signup: SignupRequest,
  stripeSession?: Stripe.Checkout.Session,
): Promise<SignupProvisionResult> {
  const store = await storage.createStore({
    name: signup.businessName,
    ownerName: signup.name,
    phone: signup.phone,
    email: signup.email || null,
    address: null,
    isActive: true,
    posSystem: signup.posSystem,
    brandColor: brandColorForPos(signup.posSystem),
  });

  const standardPrice = String(await getStandardMonthlyPrice());
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const subscription = await storage.createSubscription({
    storeId: store.id,
    plan: "standard",
    pricePerMonth: standardPrice,
    status: "active",
    startDate: new Date(),
    endDate,
    lastPaymentDate: new Date(),
    stripeCustomerId:
      typeof stripeSession?.customer === "string"
        ? stripeSession.customer
        : stripeSession?.customer && typeof stripeSession.customer !== "string"
          ? stripeSession.customer.id
          : null,
  });

  const preferredUsername = signup.email
    ? slugUsername(signup.email.split("@")[0], `store${store.id}`)
    : slugUsername(signup.businessName, `store${store.id}`);
  const username = await uniqueUsername(preferredUsername, store.id);
  const tempPassword = generateTempPassword();

  await storage.createUser({
    username,
    password: await hashPassword(tempPassword),
    email: signup.email || null,
    role: "store",
    storeId: store.id,
  });

  await seedStoreDefaults(store.id, signup.posSystem);

  await db
    .update(signupRequests)
    .set({
      status: "approved",
      paidAt: signup.paidAt ?? new Date(),
      storeId: store.id,
      stripeCheckoutSessionId: stripeSession?.id ?? signup.stripeCheckoutSessionId,
    })
    .where(eq(signupRequests.id, signup.id));

  const stripeSubId = stripeSession ? stripeSubscriptionId(stripeSession) : null;
  if (stripeSubId) {
    await linkStripeSubscription({
      storeId: store.id,
      localSubscriptionId: subscription.id,
      signupRequestId: signup.id,
      stripeSubscriptionId: stripeSubId,
      stripeCustomerId: subscription.stripeCustomerId,
    });
  }

  const loginPath = storeLoginPath(signup.posSystem);
  const emailSent = await emailStoreCredentials({
    signup,
    username,
    tempPassword,
    loginPath,
  });

  console.log(`[signup provision] Created store ${store.id} for signup ${signup.id} (${username})`);

  return {
    signupRequestId: signup.id,
    storeId: store.id,
    username,
    tempPassword: emailSent ? undefined : tempPassword,
    loginPath,
    alreadyProvisioned: false,
    emailSent,
  };
}

/** Mark signup paid and auto-create store + active subscription (idempotent). */
const signupProvisionLocks = new Map<number, Promise<SignupProvisionResult | null>>();

export async function finalizeSignupPayment(
  session: Stripe.Checkout.Session,
): Promise<SignupProvisionResult | null> {
  if (session.metadata?.type !== "signup_subscription" || !session.metadata.signupRequestId) {
    return null;
  }

  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) return null;

  const signupRequestId = parseInt(session.metadata.signupRequestId, 10);
  const inFlight = signupProvisionLocks.get(signupRequestId);
  if (inFlight) return inFlight;

  const work = finalizeSignupPaymentInner(session, signupRequestId);
  signupProvisionLocks.set(signupRequestId, work);
  try {
    return await work;
  } finally {
    if (signupProvisionLocks.get(signupRequestId) === work) {
      signupProvisionLocks.delete(signupRequestId);
    }
  }
}

async function finalizeSignupPaymentInner(
  session: Stripe.Checkout.Session,
  signupRequestId: number,
): Promise<SignupProvisionResult | null> {
  const [signup] = await db.select().from(signupRequests).where(eq(signupRequests.id, signupRequestId));
  if (!signup) return null;

  if (signup.storeId) {
    const users = await storage.getUsersByStoreId(signup.storeId);
    const stripeSubId = stripeSubscriptionId(session);
    if (stripeSubId) {
      const localSub = await storage.getSubscriptionByStore(signup.storeId);
      if (localSub) {
        await linkStripeSubscription({
          storeId: signup.storeId,
          localSubscriptionId: localSub.id,
          signupRequestId: signup.id,
          stripeSubscriptionId: stripeSubId,
        });
      }
    }
    await db
      .update(signupRequests)
      .set({ paidAt: signup.paidAt ?? new Date(), status: "approved", stripeCheckoutSessionId: session.id })
      .where(eq(signupRequests.id, signup.id));
    return {
      signupRequestId: signup.id,
      storeId: signup.storeId,
      username: users[0]?.username ?? "",
      loginPath: storeLoginPath(signup.posSystem),
      alreadyProvisioned: true,
      emailSent: false,
    };
  }

  await db
    .update(signupRequests)
    .set({ paidAt: new Date(), stripeCheckoutSessionId: session.id })
    .where(eq(signupRequests.id, signup.id));

  return provisionNewStoreFromSignup({ ...signup, paidAt: new Date() }, session);
}
