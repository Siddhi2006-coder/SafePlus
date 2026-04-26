import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, incidentsTable, mediaTable } from "@workspace/db";
import { UploadMediaBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { toApiMedia } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/media/upload", async (req, res): Promise<void> => {
  const parsed = UploadMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { incidentId, kind, data, mimeType, durationMs } = parsed.data;

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

  const sizeBytes = Math.floor((data.length * 3) / 4); // approx base64 -> bytes

  const [row] = await db
    .insert(mediaTable)
    .values({
      incidentId,
      kind,
      mimeType: mimeType ?? null,
      durationMs: durationMs ?? null,
      sizeBytes,
      data,
    })
    .returning();

  req.log.info(
    { incidentId, kind, sizeBytes },
    "Evidence uploaded",
  );
  res.status(201).json(toApiMedia(row));
});

export default router;
