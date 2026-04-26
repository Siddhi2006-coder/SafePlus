import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const respondersTable = pgTable("incident_responders", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  helperUserId: integer("helper_user_id").notNull(),
  status: text("status").notNull().default("invited"),
  distanceKm: doublePrecision("distance_km").notNull(),
  etaMinutes: integer("eta_minutes"),
  alias: text("alias").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export type Responder = typeof respondersTable.$inferSelect;
