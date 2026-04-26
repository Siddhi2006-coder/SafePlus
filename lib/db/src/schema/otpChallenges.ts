import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const otpChallengesTable = pgTable("otp_challenges", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OtpChallenge = typeof otpChallengesTable.$inferSelect;
