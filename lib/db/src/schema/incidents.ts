import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  doublePrecision,
  boolean,
} from "drizzle-orm/pg-core";

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("active"),
  trigger: text("trigger").notNull(),
  startLat: doublePrecision("start_lat").notNull(),
  startLng: doublePrecision("start_lng").notNull(),
  alertsSent: integer("alerts_sent").notNull().default(0),
  escalated: boolean("escalated").notNull().default(false),
  discreet: boolean("discreet").notNull().default(false),
  message: text("message"),
  riskScore: integer("risk_score").notNull().default(15),
  riskLevel: text("risk_level").notNull().default("medium"),
  motionMaxSpeed: doublePrecision("motion_max_speed"),
  triggerCount24h: integer("trigger_count_24h").notNull().default(1),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Incident = typeof incidentsTable.$inferSelect;
