import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  incidentsTable,
  respondersTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { toApiResponder } from "../lib/serializers";
import { generateAlias } from "../lib/risk";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/responders/availability/me", async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  let alias = u.helperAlias;
  if (!alias) {
    alias = generateAlias(userId);
    await db
      .update(usersTable)
      .set({ helperAlias: alias })
      .where(eq(usersTable.id, userId));
  }
  res.json({
    status: u.responderStatus ?? "available",
    alias,
  });
});

router.post("/responders/availability", async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const status = String(req.body?.status ?? "");
  if (status !== "available" && status !== "unavailable") {
    res.status(400).json({ error: "status must be 'available' or 'unavailable'" });
    return;
  }
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const alias = u.helperAlias ?? generateAlias(userId);
  await db
    .update(usersTable)
    .set({ responderStatus: status, helperAlias: alias })
    .where(eq(usersTable.id, userId));
  res.json({ status, alias });
});

router.get("/responders/invitations", async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const rows = await db
    .select({
      r: respondersTable,
      i: incidentsTable,
      u: usersTable,
    })
    .from(respondersTable)
    .innerJoin(
      incidentsTable,
      eq(incidentsTable.id, respondersTable.incidentId),
    )
    .innerJoin(usersTable, eq(usersTable.id, incidentsTable.userId))
    .where(eq(respondersTable.helperUserId, userId))
    .orderBy(desc(respondersTable.createdAt))
    .limit(50);

  res.json(
    rows.map(({ r, i, u }) => ({
      id: r.id,
      incidentId: r.incidentId,
      alias: r.alias,
      status: r.status,
      distanceKm: r.distanceKm,
      etaMinutes: r.etaMinutes ?? null,
      createdAt: r.createdAt.toISOString(),
      respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
      victimAlias: u.helperAlias ?? generateAlias(u.id),
      incidentLat: i.startLat,
      incidentLng: i.startLng,
      riskLevel: i.riskLevel ?? "medium",
    })),
  );
});

router.post(
  "/responders/invitations/:id/accept",
  async (req, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const eta =
      req.body?.etaMinutes != null
        ? Math.max(1, Math.min(60, parseInt(String(req.body.etaMinutes), 10) || 5))
        : null;
    const [row] = await db
      .update(respondersTable)
      .set({
        status: "accepted",
        respondedAt: new Date(),
        etaMinutes: eta,
      })
      .where(
        and(
          eq(respondersTable.id, id),
          eq(respondersTable.helperUserId, req.user!.id),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Invitation not found" });
      return;
    }
    res.json(toApiResponder(row));
  },
);

router.post(
  "/responders/invitations/:id/decline",
  async (req, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .update(respondersTable)
      .set({ status: "declined", respondedAt: new Date() })
      .where(
        and(
          eq(respondersTable.id, id),
          eq(respondersTable.helperUserId, req.user!.id),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Invitation not found" });
      return;
    }
    res.json(toApiResponder(row));
  },
);

export default router;
