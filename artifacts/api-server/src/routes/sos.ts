import { Router, type IRouter } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  db,
  alertsTable,
  contactsTable,
  incidentsTable,
  locationsTable,
  usersTable,
} from "@workspace/db";
import { TriggerSosBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { toApiIncident } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

router.post("/sos/trigger", async (req, res): Promise<void> => {
  const parsed = TriggerSosBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;
  const { trigger, lat, lng, discreet, message, accuracy } = parsed.data;

  // Mark prior active incidents as resolved (only one active at a time)
  await db
    .update(incidentsTable)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(
      and(eq(incidentsTable.userId, userId), eq(incidentsTable.status, "active")),
    );

  const [incident] = await db
    .insert(incidentsTable)
    .values({
      userId,
      status: "active",
      trigger,
      startLat: lat,
      startLng: lng,
      discreet: !!discreet,
      message: message ?? null,
    })
    .returning();

  // Initial location point
  await db.insert(locationsTable).values({
    incidentId: incident.id,
    lat,
    lng,
    accuracy: accuracy ?? null,
  });

  // Update last known location on user
  await db
    .update(usersTable)
    .set({ lastLat: lat, lastLng: lng, lastLocationAt: new Date() })
    .where(eq(usersTable.id, userId));

  // Build alert fan-out: SMS + Call + WhatsApp + Push for each contact
  const contacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId));

  const channels = ["sms", "call", "whatsapp", "push"] as const;
  const alertRows = contacts.flatMap((c) =>
    channels.map((channel) => ({
      incidentId: incident.id,
      channel,
      target: c.phone,
      status: "sent",
    })),
  );

  if (alertRows.length > 0) {
    await db.insert(alertsTable).values(alertRows);
  }

  const [updated] = await db
    .update(incidentsTable)
    .set({ alertsSent: alertRows.length })
    .where(eq(incidentsTable.id, incident.id))
    .returning();

  req.log.info(
    { incidentId: incident.id, alertsSent: alertRows.length, contacts: contacts.length },
    "SOS triggered",
  );

  res.status(201).json(toApiIncident(updated));
});

router.post("/sos/:id/cancel", async (req, res): Promise<void> => {
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .update(incidentsTable)
    .set({ status: "cancelled", resolvedAt: new Date() })
    .where(
      and(
        eq(incidentsTable.id, id),
        eq(incidentsTable.userId, req.user!.id),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toApiIncident(row));
});

router.post("/sos/:id/resolve", async (req, res): Promise<void> => {
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .update(incidentsTable)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(
      and(
        eq(incidentsTable.id, id),
        eq(incidentsTable.userId, req.user!.id),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toApiIncident(row));
});

router.post("/sos/:id/escalate-nearby", async (req, res): Promise<void> => {
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.user!.id;
  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(
      and(eq(incidentsTable.id, id), eq(incidentsTable.userId, userId)),
    )
    .limit(1);
  if (!incident) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Most recent location for this incident
  const [latest] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.incidentId, id))
    .orderBy(desc(locationsTable.createdAt))
    .limit(1);
  const centerLat = latest?.lat ?? incident.startLat;
  const centerLng = latest?.lng ?? incident.startLng;

  // Find users with a recent known location within ~5km (excluding self)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const nearby = await db
    .select()
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, userId),
        sql`${usersTable.lastLat} IS NOT NULL`,
        sql`${usersTable.lastLng} IS NOT NULL`,
        sql`${usersTable.lastLocationAt} >= ${cutoff.toISOString()}`,
      ),
    );

  let nearbyAlerted = 0;
  const newAlerts: Array<{
    incidentId: number;
    channel: string;
    target: string;
    status: string;
  }> = [];
  for (const u of nearby) {
    if (u.lastLat == null || u.lastLng == null) continue;
    const d = distanceKm(centerLat, centerLng, u.lastLat, u.lastLng);
    if (d <= 5) {
      newAlerts.push({
        incidentId: id,
        channel: "nearby",
        target: `user:${u.id}`,
        status: "sent",
      });
      nearbyAlerted++;
    }
  }

  // Re-notify trusted contacts as well
  const contacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId));
  for (const c of contacts) {
    newAlerts.push({
      incidentId: id,
      channel: "escalation",
      target: c.phone,
      status: "sent",
    });
  }

  if (newAlerts.length > 0) {
    await db.insert(alertsTable).values(newAlerts);
  }

  await db
    .update(incidentsTable)
    .set({
      escalated: true,
      alertsSent: incident.alertsSent + newAlerts.length,
    })
    .where(eq(incidentsTable.id, id));

  req.log.info(
    { incidentId: id, nearbyAlerted, contactsNotified: contacts.length },
    "Escalation broadcast",
  );

  res.json({
    incidentId: id,
    nearbyAlerted,
    contactsNotified: contacts.length,
  });
});

router.get("/sos/active", async (req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(incidentsTable)
    .where(
      and(
        eq(incidentsTable.userId, req.user!.id),
        eq(incidentsTable.status, "active"),
      ),
    )
    .orderBy(desc(incidentsTable.createdAt))
    .limit(1);
  res.json({ incident: row ? toApiIncident(row) : null });
});

export default router;
