import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  channel: text("channel").notNull(),
  target: text("target").notNull(),
  status: text("status").notNull().default("sending"),
  attempts: integer("attempts").notNull().default(1),
  priority: text("priority").notNull().default("circle"),
  lastError: text("last_error"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Alert = typeof alertsTable.$inferSelect;
