import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  db,
  incidentsTable,
  locationsTable,
  usersTable,
} from "@workspace/db";
import { UpdateLocationBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { toApiLocation } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/location/update", async (req, res): Promise<void> => {
  const parsed = UpdateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { incidentId, lat, lng, accuracy, speed } = parsed.data;

  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(
      and(
        eq(incidentsTable.id, incidentId),
        eq(incidentsTable.userId, req.user!.id),
      ),
    )
    .limit(1);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  await db.insert(locationsTable).values({
    incidentId,
    lat,
    lng,
    accuracy: accuracy ?? null,
    speed: speed ?? null,
  });

  await db
    .update(usersTable)
    .set({ lastLat: lat, lastLng: lng, lastLocationAt: new Date() })
    .where(eq(usersTable.id, req.user!.id));

  res.json({ ok: true });
});

router.get("/location/incident/:id", async (req, res): Promise<void> => {
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
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const points = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.incidentId, id))
    .orderBy(asc(locationsTable.createdAt));
  res.json(points.map(toApiLocation));
});

export default router;
