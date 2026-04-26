import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const mediaTable = pgTable("media", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  kind: text("kind").notNull(), // audio | video | photo
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  durationMs: integer("duration_ms"),
  data: text("data").notNull(), // base64 stored inline (small evidence clips)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MediaRow = typeof mediaTable.$inferSelect;
