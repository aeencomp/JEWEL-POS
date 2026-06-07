import type { Express, Response } from "express";
import { z } from "zod";
import { getVapidPublicKey, savePushSubscription, initPushService } from "./push-service";

export function registerPushRoutes(app: Express, helpers: { sendValidationError: (res: Response, error: z.ZodError) => Response }) {
  const { sendValidationError } = helpers;

  app.get("/api/push/vapid-public-key", async (_req, res) => {
    await initPushService();
    const key = await getVapidPublicKey();
    if (!key) return res.status(503).json({ message: "Push not configured" });
    res.json({ publicKey: key });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    const schema = z.object({
      role: z.enum(["customer", "driver", "staff"]),
      refKey: z.string().min(1),
      subscription: z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

    await initPushService();
    await savePushSubscription(parsed.data.role, parsed.data.refKey, parsed.data.subscription);
    res.status(201).json({ ok: true });
  });
}
