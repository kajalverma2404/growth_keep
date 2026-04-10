import express from "express";
import { sql } from "./db.js";
import { habitSchema, habitStatusSchema } from "../types/schemas.js";
import { authenticate } from "./middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", async (req: any, res) => {
  try {
    const habits = await sql("SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC", [req.userId]);
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

router.post("/", async (req: any, res) => {
  const result = habitSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { name } = result.data;

  try {
    const habit = (await sql(
      "INSERT INTO habits (user_id, name) VALUES ($1, $2) RETURNING *",
      [req.userId, name]
    ))[0];
    res.json(habit);
  } catch (err) {
    res.status(500).json({ error: "Failed to create habit" });
  }
});

router.put("/:id", async (req: any, res) => {
  const result = habitStatusSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { status } = result.data;

  try {
    const habit = (await sql(
      "UPDATE habits SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *",
      [status ? 1 : 0, req.params.id, req.userId]
    ))[0];
    res.json(habit);
  } catch (err) {
    res.status(500).json({ error: "Failed to update habit" });
  }
});

router.delete("/:id", async (req: any, res) => {
  try {
    await sql("DELETE FROM habits WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete habit" });
  }
});

export default router;
