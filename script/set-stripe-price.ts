import "dotenv/config";
import { storage } from "../server/storage";

const priceId = process.argv[2] || process.env.STRIPE_PRICE_ID;
if (!priceId?.startsWith("price_")) {
  console.error("Usage: tsx script/set-stripe-price.ts price_...");
  process.exit(1);
}

await storage.setSetting("stripe", JSON.stringify({ priceId }));
console.log(`Saved Stripe Price ID: ${priceId}`);
