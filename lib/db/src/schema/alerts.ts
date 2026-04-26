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
  channel: text("channel").notNull(), // sms | call | whatsapp | push
  target: text("target").notNull(), // phone or user id
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Alert = typeof alertsTable.$inferSelect;
