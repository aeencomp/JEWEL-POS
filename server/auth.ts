import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, randomInt } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { isResendConfigured, isStore2FAEnabled, sendVerificationEmail } from "./resend";
import {
  isDemoUser,
  normalizeDemoPosSystem,
  resolveDemoStoreId,
  type DemoPosSystem,
} from "./demo";

declare module "express-session" {
  interface SessionData {
    impersonatingStoreId?: number;
    impersonatingStoreName?: string;
    pendingUserId?: number;
    demoStoreId?: number;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateVerificationCode(): string {
  return randomInt(100000, 999999).toString();
}

const verifyAttempts = new Map<number, { count: number; lastAttempt: number }>();
const MAX_VERIFY_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

/** Attach store posSystem so portal logins (Jewel / Fashion / Oil / Restaurant) can route correctly */
async function enrichUserResponse(
  user: SelectUser,
  session?: { demoStoreId?: number },
): Promise<Record<string, unknown>> {
  const userData: Record<string, unknown> = { ...user };
  if (isDemoUser(user) && session?.demoStoreId) {
    const store = await storage.getStore(session.demoStoreId);
    if (store) {
      userData.posSystem = store.posSystem;
      userData.demoStoreId = store.id;
      userData.demoStoreName = store.name;
    }
  } else if (user.storeId) {
    const store = await storage.getStore(user.storeId);
    if (store) userData.posSystem = store.posSystem;
  }
  return userData;
}

async function bindDemoStoreSession(
  req: { session: { demoStoreId?: number } },
  posSystem: DemoPosSystem,
): Promise<number | null> {
  const demoStoreId = await resolveDemoStoreId(posSystem);
  if (demoStoreId) req.session.demoStoreId = demoStoreId;
  return demoStoreId;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      username: req.body.username,
      password: await hashPassword(req.body.password),
      role: "admin",
      storeId: null,
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", (req, res, next) => {
    const portal = req.body.portal;
    passport.authenticate("local", async (err: any, user: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      if (portal === "store" && user.role !== "store") {
        return res.status(403).json({ message: "This login is for store staff only. Please use the admin portal." });
      }
      if (portal === "admin" && user.role !== "admin") {
        return res.status(403).json({ message: "This login is for administrators only. Please use the store portal." });
      }

      if (portal === "store" && user.role === "store") {
        if (isDemoUser(user)) {
          const posSystem = normalizeDemoPosSystem(req.body.posSystem);
          const demoStoreId = await bindDemoStoreSession(req, posSystem);
          if (!demoStoreId) {
            return res.status(503).json({
              message: "Demo stores are not ready yet. Restart the server or run db:push, then try again.",
            });
          }
        }

        const skip2FA = isDemoUser(user) || !user.email || !isStore2FAEnabled();
        if (skip2FA) {
          if (user.email && !isStore2FAEnabled() && !isDemoUser(user)) {
            console.warn(
              `[2FA] Email OTP disabled — logging in ${user.username} (set STORE_REQUIRE_2FA=true + RESEND to enable)`,
            );
          }
          req.login(user, async (loginErr) => {
            if (loginErr) return next(loginErr);
            res.status(200).json(await enrichUserResponse(user, req.session));
          });
          return;
        }

        try {
          const code = generateVerificationCode();
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
          await storage.createVerificationCode(user.id, code, expiresAt);
          await sendVerificationEmail(user.email, code);

          req.session.pendingUserId = user.id;
          req.session.save((saveErr) => {
            if (saveErr) return next(saveErr);
            const maskedEmail = user.email!.replace(/(.{2})(.*)(@.*)/, "$1***$3");
            res.status(200).json({
              requires2FA: true,
              maskedEmail,
              message: "Verification code sent to your email",
            });
          });
        } catch (emailErr: any) {
          console.error("[2FA] Email send failed:", emailErr?.message || emailErr);
          try {
            await storage.deleteVerificationCodes(user.id);
          } catch {
            /* ignore */
          }
          return res.status(503).json({
            message:
              emailErr?.message ||
              "Failed to send verification email. Check RESEND_API_KEY and RESEND_FROM_EMAIL on the server.",
          });
        }
        return;
      }

      req.login(user, async (loginErr) => {
        if (loginErr) return next(loginErr);
        res.status(200).json(await enrichUserResponse(user, req.session));
      });
    })(req, res, next);
  });

  app.post("/api/verify-2fa", async (req, res, next) => {
    try {
      const code = String(req.body?.code ?? "").trim().replace(/\s+/g, "");
      const pendingUserId = req.session.pendingUserId;

      if (!pendingUserId) {
        return res.status(400).json({ message: "No pending verification. Please log in again." });
      }

      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ message: "Enter the 6-digit verification code." });
      }

      const now = Date.now();
      const attempts = verifyAttempts.get(pendingUserId);
      if (attempts && (now - attempts.lastAttempt) < ATTEMPT_WINDOW_MS && attempts.count >= MAX_VERIFY_ATTEMPTS) {
        await storage.deleteVerificationCodes(pendingUserId);
        delete req.session.pendingUserId;
        return res.status(429).json({ message: "Too many attempts. Please log in again." });
      }

      const isValid = await storage.getValidVerificationCode(pendingUserId, code);
      if (!isValid) {
        const current = verifyAttempts.get(pendingUserId);
        if (current && (now - current.lastAttempt) < ATTEMPT_WINDOW_MS) {
          verifyAttempts.set(pendingUserId, { count: current.count + 1, lastAttempt: now });
        } else {
          verifyAttempts.set(pendingUserId, { count: 1, lastAttempt: now });
        }
        return res.status(401).json({ message: "Invalid or expired verification code." });
      }

      verifyAttempts.delete(pendingUserId);
      await storage.deleteVerificationCodes(pendingUserId);
      const user = await storage.getUser(pendingUserId);
      if (!user) {
        return res.status(400).json({ message: "User not found." });
      }

      delete req.session.pendingUserId;
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error("[verify-2fa] req.login failed:", loginErr);
          return res.status(500).json({ message: "Login session failed. Please try again." });
        }
        res.status(200).json(await enrichUserResponse(user, req.session));
      });
    } catch (err: any) {
      console.error("[verify-2fa]", err);
      const msg = err?.message || "Verification failed";
      if (err?.code === "42P01" || /verification_codes/i.test(msg)) {
        return res.status(503).json({
          message: "Database table verification_codes is missing. On the VPS run: npm run db:push",
        });
      }
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/resend-2fa", async (req, res, next) => {
    try {
      const pendingUserId = req.session.pendingUserId;

      if (!pendingUserId) {
        return res.status(400).json({ message: "No pending verification. Please log in again." });
      }

      if (!isResendConfigured()) {
        return res.status(503).json({
          message: "RESEND_API_KEY is not configured on the server. Contact the administrator.",
        });
      }

      const user = await storage.getUser(pendingUserId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User not found or email not configured." });
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.createVerificationCode(user.id, code, expiresAt);
      await sendVerificationEmail(user.email, code);
      res.status(200).json({ message: "Verification code resent." });
    } catch (emailErr: any) {
      console.error("Failed to resend verification email:", emailErr);
      return res.status(503).json({
        message: emailErr?.message || "Failed to send verification email.",
      });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    delete req.session.demoStoreId;
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userData: any = { ...req.user };
    if (req.session.impersonatingStoreId) {
      userData.impersonatingStoreId = req.session.impersonatingStoreId;
      userData.impersonatingStoreName = req.session.impersonatingStoreName;
      const impStore = await storage.getStore(req.session.impersonatingStoreId);
      if (impStore) userData.posSystem = impStore.posSystem;
    } else if (isDemoUser(req.user) && req.session.demoStoreId) {
      const store = await storage.getStore(req.session.demoStoreId);
      if (store) {
        userData.posSystem = store.posSystem;
        userData.demoStoreId = store.id;
        userData.demoStoreName = store.name;
      }
    } else if (req.user?.storeId) {
      const store = await storage.getStore(req.user.storeId);
      if (store) userData.posSystem = store.posSystem;
    }
    res.json(userData);
  });
}
