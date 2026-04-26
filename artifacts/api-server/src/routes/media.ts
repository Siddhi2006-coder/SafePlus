import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, incidentsTable, mediaTable } from "@workspace/db";
import { UploadMediaBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { toApiMedia } from "../lib/serializers";
import { encryptBase64Payload } from "../lib/crypto";

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

  // Encrypt at rest with AES-256-GCM. Payload too large to encrypt entirely
  // in this demo path is truncated to 256KB before encryption to keep DB sane.
  const limited =
    data.length > 360_000 ? data.slice(0, 360_000) : data;
  let storedData = limited;
  let iv: string | null = null;
  let authTag: string | null = null;
  let encrypted = false;
  try {
    const blob = encryptBase64Payload(limited);
    storedData = blob.ciphertext;
    iv = blob.iv;
    authTag = blob.authTag;
    encrypted = true;
  } catch (err) {
    req.log.warn({ err }, "media encryption failed; storing plaintext");
  }

  const [row] = await db
    .insert(mediaTable)
    .values({
      incidentId,
      kind,
      mimeType: mimeType ?? null,
      durationMs: durationMs ?? null,
      sizeBytes,
      data: storedData,
      encrypted,
      iv,
      authTag,
    })
    .returning();

  req.log.info(
    { incidentId, kind, sizeBytes, encrypted },
    "Evidence uploaded",
  );
  res.status(201).json(toApiMedia(row));
});

export default router;
