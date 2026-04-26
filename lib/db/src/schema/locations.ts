import {
  pgTable,
  serial,
  integer,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const locationsTable = pgTable("locations", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  accuracy: doublePrecision("accuracy"),
  speed: doublePrecision("speed"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LocationRow = typeof locationsTable.$inferSelect;
