import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, randomInt } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendVerificationEmail } from "./resend";

declare module "express-session" {
  interface SessionData {
    impersonatingStoreId?: number;
    impersonatingStoreName?: string;
    pendingUserId?: number;
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

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
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
        if (!user.email) {
          req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            res.status(200).json(user);
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
          console.error("Failed to send verification email:", emailErr);
          return res.status(500).json({ message: "Failed to send verification email. Please try again." });
        }
        return;
      }

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/verify-2fa", async (req, res, next) => {
    const { code } = req.body;
    const pendingUserId = req.session.pendingUserId;

    if (!pendingUserId) {
      return res.status(400).json({ message: "No pending verification. Please log in again." });
    }

    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Verification code is required." });
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
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.status(200).json(user);
    });
  });

  app.post("/api/resend-2fa", async (req, res, next) => {
    const pendingUserId = req.session.pendingUserId;

    if (!pendingUserId) {
      return res.status(400).json({ message: "No pending verification. Please log in again." });
    }

    const user = await storage.getUser(pendingUserId);
    if (!user || !user.email) {
      return res.status(400).json({ message: "User not found or email not configured." });
    }

    try {
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.createVerificationCode(user.id, code, expiresAt);
      await sendVerificationEmail(user.email, code);
      res.status(200).json({ message: "Verification code resent." });
    } catch (emailErr: any) {
      console.error("Failed to resend verification email:", emailErr);
      return res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userData: any = { ...req.user };
    if (req.session.impersonatingStoreId) {
      userData.impersonatingStoreId = req.session.impersonatingStoreId;
      userData.impersonatingStoreName = req.session.impersonatingStoreName;
    }
    res.json(userData);
  });
}
