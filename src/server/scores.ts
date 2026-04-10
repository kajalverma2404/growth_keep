import express from "express";
import { sql } from "./db.js";
import { authenticate } from "./middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/trends", async (req: any, res) => {
  try {
    const scores = await sql(
      "SELECT * FROM scores WHERE user_id = $1 ORDER BY created_at ASC LIMIT 30",
      [req.userId]
    );
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

router.post("/", async (req: any, res) => {
  const { emotional_stability, productivity, consistency, life_balance, journal_id } = req.body;
  try {
    const score = (await sql(
      "INSERT INTO scores (user_id, journal_id, emotional_stability, productivity, consistency, life_balance) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.userId, journal_id, emotional_stability, productivity, consistency, life_balance]
    ))[0];
    res.json(score);
  } catch (err) {
    res.status(500).json({ error: "Failed to save scores" });
  }
});

export default router;
