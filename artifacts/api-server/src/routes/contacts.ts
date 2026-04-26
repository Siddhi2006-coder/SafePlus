import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, contactsTable } from "@workspace/db";
import { CreateContactBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { toApiContact } from "../lib/serializers";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/contacts", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, req.user!.id))
    .orderBy(desc(contactsTable.createdAt));
  res.json(rows.map(toApiContact));
});

router.post("/contacts", async (req, res): Promise<void> => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(contactsTable)
    .values({
      userId: req.user!.id,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone.trim(),
      relation: parsed.data.relation.trim(),
    })
    .returning();
  res.status(201).json(toApiContact(row));
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .delete(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, req.user!.id)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
