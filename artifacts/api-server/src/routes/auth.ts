import { Router, type IRouter } from "express";
import { eq, and, isNull, gt } from "drizzle-orm";
import {
  db,
  usersTable,
  otpChallengesTable,
} from "@workspace/db";
import {
  SignupBody,
  LoginBody,
  VerifyOtpBody,
} from "@workspace/api-zod";
import {
  createSession,
  destroySession,
  generateOtp,
  generateToken,
  hashPassword,
  verifyPassword,
} from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { toApiUser } from "../lib/serializers";

const router: IRouter = Router();

const OTP_TTL_MS = 10 * 60 * 1000;

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, phone, password } = parsed.data;
  const normEmail = email.trim().toLowerCase();

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normEmail))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ name: name.trim(), email: normEmail, phone: phone.trim(), passwordHash })
    .returning();

  const challengeId = generateToken(16);
  const code = generateOtp();
  await db.insert(otpChallengesTable).values({
    id: challengeId,
    userId: user.id,
    code,
    purpose: "signup",
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  req.log.info({ userId: user.id, challengeId }, "Signup OTP generated");
  res.json({ challengeId, devOtp: code });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const normEmail = email.trim().toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normEmail))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const challengeId = generateToken(16);
  const code = generateOtp();
  await db.insert(otpChallengesTable).values({
    id: challengeId,
    userId: user.id,
    code,
    purpose: "login",
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  req.log.info({ userId: user.id, challengeId }, "Login OTP generated");
  res.json({ challengeId, devOtp: code });
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { challengeId, code } = parsed.data;
  const now = new Date();

  const [challenge] = await db
    .select()
    .from(otpChallengesTable)
    .where(
      and(
        eq(otpChallengesTable.id, challengeId),
        isNull(otpChallengesTable.consumedAt),
        gt(otpChallengesTable.expiresAt, now),
      ),
    )
    .limit(1);
  if (!challenge) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }
  if (challenge.code !== code.trim()) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }

  await db
    .update(otpChallengesTable)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallengesTable.id, challengeId));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, challenge.userId))
    .limit(1);
  if (!user) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  const token = await createSession(user.id);
  res.json({ token, user: toApiUser(user) });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  if (req.sessionToken) await destroySession(req.sessionToken);
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  res.json(toApiUser(req.user!));
});

export default router;
