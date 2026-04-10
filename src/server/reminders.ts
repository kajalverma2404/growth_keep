import express from "express";
import { sql } from "./db.js";
import { reminderSchema, reminderStatusSchema } from "../types/schemas.js";
import { authenticate } from "./middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", async (req: any, res) => {
  try {
    const reminders = await sql("SELECT * FROM reminders WHERE user_id = $1 ORDER BY created_at DESC", [req.userId]);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

router.post("/", async (req: any, res) => {
  const result = reminderSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { title, time } = result.data;

  try {
    const reminder = (await sql(
      "INSERT INTO reminders (user_id, title, time) VALUES ($1, $2, $3) RETURNING *",
      [req.userId, title, time]
    ))[0];
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

router.put("/:id", async (req: any, res) => {
  const result = reminderStatusSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { completed } = result.data;

  try {
    const reminder = (await sql(
      "UPDATE reminders SET completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *",
      [completed, req.params.id, req.userId]
    ))[0];
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ error: "Failed to update reminder" });
  }
});

router.delete("/:id", async (req: any, res) => {
  try {
    await sql("DELETE FROM reminders WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete reminder" });
  }
});

export default router;
