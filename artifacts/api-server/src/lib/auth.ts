import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq, gt } from "drizzle-orm";
import {
  db,
  sessionsTable,
  usersTable,
  type User,
} from "@workspace/db";
import type { Request } from "express";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function generateOtp(): string {
  // 6-digit zero-padded numeric OTP
  const n = randomBytes(3).readUIntBE(0, 3) % 1000000;
  return n.toString().padStart(6, "0");
}

const SESSION_TTL_DAYS = 30;

export async function createSession(userId: number): Promise<string> {
  const token = generateToken(32);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function getUserBySessionToken(
  token: string,
): Promise<User | null> {
  const [row] = await db
    .select({ user: usersTable, session: sessionsTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(eq(sessionsTable.token, token))
    .limit(1);
  if (!row) return null;
  if (row.session.expiresAt.getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }
  return row.user;
}

export function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1] : null;
}
