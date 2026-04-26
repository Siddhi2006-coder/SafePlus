import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import {
  db,
  alertsTable,
  contactsTable,
  incidentsTable,
  locationsTable,
  respondersTable,
  usersTable,
} from "@workspace/db";
import { TriggerSosBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { toApiIncident, toApiResponder } from "../lib/serializers";
import { computeRisk, generateAlias } from "../lib/risk";
import { locationDigest } from "../lib/crypto";

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

  // Count triggers in last 24h for risk scoring
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db
    .select({ id: incidentsTable.id })
    .from(incidentsTable)
    .where(
      and(eq(incidentsTable.userId, userId), gte(incidentsTable.createdAt, since)),
    );
  const triggerCount24h = recent.length + 1;

  const risk = computeRisk({
    trigger,
    triggerCount24h,
    discreet: !!discreet,
  });

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
      riskScore: risk.score,
      riskLevel: risk.level,
      triggerCount24h,
    })
    .returning();

  // Initial location point (encrypted-at-rest digest)
  await db.insert(locationsTable).values({
    incidentId: incident.id,
    lat,
    lng,
    accuracy: accuracy ?? null,
    encrypted: true,
    digest: locationDigest(incident.id, lat, lng),
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
  // Simulated multi-channel delivery: each channel transitions through states.
  // SMS + push almost always deliver; calls/whatsapp may need a retry.
  const alertRows = contacts.flatMap((c) =>
    channels.map((channel) => {
      const failureChance =
        channel === "call" ? 0.18 : channel === "whatsapp" ? 0.12 : 0.04;
      const deliveredFirstTry = Math.random() > failureChance;
      const finalDelivered = deliveredFirstTry || Math.random() > 0.4;
      const status = finalDelivered ? "delivered" : "failed";
      return {
        incidentId: incident.id,
        channel,
        target: c.phone,
        status,
        priority: "circle" as const,
        attempts: deliveredFirstTry ? 1 : 2,
        lastError: deliveredFirstTry
          ? null
          : finalDelivered
            ? null
            : channel === "call"
              ? "carrier busy"
              : "network unreachable",
        deliveredAt: finalDelivered ? new Date() : null,
      };
    }),
  );

  if (alertRows.length > 0) {
    await db.insert(alertsTable).values(alertRows);
  }

  // For HIGH/CRITICAL risk OR no contacts, immediately fan out to nearby helpers.
  let nearbyInvited = 0;
  if (risk.level === "critical" || risk.level === "high" || contacts.length === 0) {
    nearbyInvited = await inviteNearbyHelpers({
      incidentId: incident.id,
      victimUserId: userId,
      lat,
      lng,
      riskLevel: risk.level,
    });
  }

  const [updated] = await db
    .update(incidentsTable)
    .set({
      alertsSent: alertRows.length,
      escalated: nearbyInvited > 0,
    })
    .where(eq(incidentsTable.id, incident.id))
    .returning();

  req.log.info(
    {
      incidentId: incident.id,
      alertsSent: alertRows.length,
      contacts: contacts.length,
      risk,
      nearbyInvited,
    },
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
  // Cancel any open responder invitations
  await db
    .update(respondersTable)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(respondersTable.incidentId, id),
        eq(respondersTable.status, "invited"),
      ),
    );
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
  await db
    .update(respondersTable)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(respondersTable.incidentId, id),
        eq(respondersTable.status, "invited"),
      ),
    );
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

  const nearbyAlerted = await inviteNearbyHelpers({
    incidentId: id,
    victimUserId: userId,
    lat: centerLat,
    lng: centerLng,
    riskLevel: incident.riskLevel,
  });

  // Re-notify trusted contacts as well (priority: emergency)
  const contacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId));
  const newAlerts = contacts.map((c) => ({
    incidentId: id,
    channel: "escalation",
    target: c.phone,
    status: "delivered",
    attempts: 1,
    priority: "emergency" as const,
    deliveredAt: new Date(),
  }));

  if (newAlerts.length > 0) {
    await db.insert(alertsTable).values(newAlerts);
  }

  await db
    .update(incidentsTable)
    .set({
      escalated: true,
      alertsSent: incident.alertsSent + newAlerts.length + nearbyAlerted,
      riskLevel:
        incident.riskLevel === "low" || incident.riskLevel === "medium"
          ? "high"
          : incident.riskLevel,
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

router.post("/sos/:id/motion", async (req, res): Promise<void> => {
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const speed = Number(req.body?.speed ?? 0);
  const accel = req.body?.accel != null ? Number(req.body.accel) : null;
  const repeated = !!req.body?.repeated;

  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(
      and(eq(incidentsTable.id, id), eq(incidentsTable.userId, req.user!.id)),
    )
    .limit(1);
  if (!incident) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const risk = computeRisk({
    trigger: incident.trigger,
    triggerCount24h: incident.triggerCount24h,
    discreet: incident.discreet,
    speed,
    accel,
    repeated,
  });

  const newMaxSpeed = Math.max(incident.motionMaxSpeed ?? 0, speed);
  await db
    .update(incidentsTable)
    .set({
      riskScore: Math.max(incident.riskScore, risk.score),
      riskLevel:
        rankLevel(risk.level) >= rankLevel(incident.riskLevel)
          ? risk.level
          : incident.riskLevel,
      motionMaxSpeed: newMaxSpeed,
    })
    .where(eq(incidentsTable.id, id));

  res.json({
    incidentId: id,
    riskScore: Math.max(incident.riskScore, risk.score),
    riskLevel:
      rankLevel(risk.level) >= rankLevel(incident.riskLevel)
        ? risk.level
        : incident.riskLevel,
    escalationSeconds: risk.escalationSeconds,
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

router.get("/sos/:id/responders", async (req, res): Promise<void> => {
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(
      and(eq(incidentsTable.id, id), eq(incidentsTable.userId, req.user!.id)),
    )
    .limit(1);
  if (!incident) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await db
    .select()
    .from(respondersTable)
    .where(eq(respondersTable.incidentId, id))
    .orderBy(desc(respondersTable.createdAt));
  res.json(rows.map(toApiResponder));
});

function rankLevel(level: string): number {
  switch (level) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

async function inviteNearbyHelpers(opts: {
  incidentId: number;
  victimUserId: number;
  lat: number;
  lng: number;
  riskLevel: string;
}): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const candidates = await db
    .select()
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, opts.victimUserId),
        eq(usersTable.responderStatus, "available"),
        sql`${usersTable.lastLat} IS NOT NULL`,
        sql`${usersTable.lastLng} IS NOT NULL`,
        sql`${usersTable.lastLocationAt} >= ${cutoff.toISOString()}`,
      ),
    );

  const radius = opts.riskLevel === "critical" ? 8 : 5;
  const invited: Array<{
    incidentId: number;
    helperUserId: number;
    distanceKm: number;
    alias: string;
    status: string;
  }> = [];
  for (const u of candidates) {
    if (u.lastLat == null || u.lastLng == null) continue;
    const d = distanceKm(opts.lat, opts.lng, u.lastLat, u.lastLng);
    if (d > radius) continue;
    invited.push({
      incidentId: opts.incidentId,
      helperUserId: u.id,
      distanceKm: Number(d.toFixed(2)),
      alias: u.helperAlias ?? generateAlias(u.id),
      status: "invited",
    });
  }
  if (invited.length === 0) return 0;
  await db.insert(respondersTable).values(invited);

  // Also write nearby alert rows so the dispatch list reflects them
  const alertRows = invited.map((i) => ({
    incidentId: opts.incidentId,
    channel: "nearby",
    target: `helper:${i.alias}`,
    status: "delivered",
    attempts: 1,
    priority: "nearby" as const,
    deliveredAt: new Date(),
  }));
  await db.insert(alertsTable).values(alertRows);

  return invited.length;
}

export default router;
