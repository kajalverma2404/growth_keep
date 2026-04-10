import express from "express";
import { sql } from "./db.js";
import { authenticate } from "./middleware.js";

const router = express.Router();

// Get all goals
router.get("/", authenticate, async (req: any, res) => {
  try {
    const goals = await sql(`
      SELECT * FROM goals 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [req.userId]);
    res.json(goals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a goal
router.post("/", authenticate, async (req: any, res) => {
  const { title, description, target_date } = req.body;
  try {
    const [goal] = await sql(`
      INSERT INTO goals (user_id, title, description, target_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.userId, title, description, target_date]);
    res.json(goal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a goal
router.put("/:id", authenticate, async (req: any, res) => {
  const { title, description, target_date, status } = req.body;
  try {
    const [goal] = await sql(`
      UPDATE goals 
      SET title = $1, description = $2, target_date = $3, status = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [title, description, target_date, status, req.params.id, req.userId]);
    res.json(goal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a goal
router.delete("/:id", authenticate, async (req: any, res) => {
  try {
    await sql(`
      DELETE FROM goals 
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
