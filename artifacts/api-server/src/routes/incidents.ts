import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  alertsTable,
  contactsTable,
  incidentsTable,
  locationsTable,
  mediaTable,
  respondersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  toApiAlert,
  toApiIncident,
  toApiLocation,
  toApiMedia,
  toApiResponder,
} from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/incidents/history", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.userId, req.user!.id))
    .orderBy(desc(incidentsTable.createdAt));
  res.json(rows.map(toApiIncident));
});

router.get("/incidents/stats", async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const all = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.userId, userId));

  const totalIncidents = all.length;
  const resolvedIncidents = all.filter((i) => i.status === "resolved").length;
  const cancelledIncidents = all.filter((i) => i.status === "cancelled").length;
  const activeIncidents = all.filter((i) => i.status === "active").length;
  const totalAlerts = all.reduce((sum, i) => sum + i.alertsSent, 0);

  const [{ contactCount }] = await db
    .select({ contactCount: sql<number>`COUNT(*)::int` })
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId));

  // last 7 days bucket
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last7Days: Array<{ day: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const count = all.filter(
      (it) => it.createdAt >= day && it.createdAt < next,
    ).length;
    last7Days.push({
      day: day.toISOString().slice(0, 10),
      count,
    });
  }

  res.json({
    totalIncidents,
    resolvedIncidents,
    cancelledIncidents,
    activeIncidents,
    totalAlerts,
    totalContacts: Number(contactCount) || 0,
    last7Days,
  });
});

router.get("/incidents/:id", async (req, res): Promise<void> => {
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
      and(
        eq(incidentsTable.id, id),
        eq(incidentsTable.userId, req.user!.id),
      ),
    )
    .limit(1);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const [alerts, locations, media, responders] = await Promise.all([
    db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.incidentId, id))
      .orderBy(asc(alertsTable.createdAt)),
    db
      .select()
      .from(locationsTable)
      .where(eq(locationsTable.incidentId, id))
      .orderBy(asc(locationsTable.createdAt)),
    db
      .select()
      .from(mediaTable)
      .where(eq(mediaTable.incidentId, id))
      .orderBy(asc(mediaTable.createdAt)),
    db
      .select()
      .from(respondersTable)
      .where(eq(respondersTable.incidentId, id))
      .orderBy(asc(respondersTable.createdAt)),
  ]);

  res.json({
    incident: toApiIncident(incident),
    alerts: alerts.map(toApiAlert),
    locations: locations.map(toApiLocation),
    media: media.map(toApiMedia),
    responders: responders.map(toApiResponder),
  });
});

router.get("/incidents/:id/share", async (req, res): Promise<void> => {
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
      and(
        eq(incidentsTable.id, id),
        eq(incidentsTable.userId, req.user!.id),
      ),
    )
    .limit(1);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const [alertCount] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(alertsTable)
    .where(eq(alertsTable.incidentId, id));
  const [locCount] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(locationsTable)
    .where(eq(locationsTable.incidentId, id));
  const [mediaCount] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(mediaTable)
    .where(eq(mediaTable.incidentId, id));

  const lastLoc = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.incidentId, id))
    .orderBy(desc(locationsTable.createdAt))
    .limit(1);
  const point = lastLoc[0];
  const lat = point?.lat ?? incident.startLat;
  const lng = point?.lng ?? incident.startLng;
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  const summary =
    `SafeSphere incident #${incident.id}\n` +
    `Status: ${incident.status} (risk: ${incident.riskLevel})\n` +
    `Triggered ${incident.createdAt.toISOString()}\n` +
    `Trigger: ${incident.trigger}\n` +
    `Alerts dispatched: ${Number(alertCount?.n ?? 0)}\n` +
    `Location pings: ${Number(locCount?.n ?? 0)}\n` +
    `Evidence files: ${Number(mediaCount?.n ?? 0)} (encrypted at rest)\n` +
    `Last known location: ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
    `Map: ${mapsUrl}`;

  res.json({ incidentId: id, summary, mapsUrl });
});

export default router;
