import express from "express";
import { sql } from "./db.js";
import { authenticate } from "./middleware.js";

const router = express.Router();

// Get all affirmations
router.get("/", authenticate, async (req: any, res) => {
  try {
    const affirmations = await sql(`
      SELECT * FROM affirmations 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [req.userId]);
    res.json(affirmations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create an affirmation
router.post("/", authenticate, async (req: any, res) => {
  const { text } = req.body;
  try {
    const [affirmation] = await sql(`
      INSERT INTO affirmations (user_id, text)
      VALUES ($1, $2)
      RETURNING *
    `, [req.userId, text]);
    res.json(affirmation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an affirmation
router.delete("/:id", authenticate, async (req: any, res) => {
  try {
    await sql(`
      DELETE FROM affirmations 
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
