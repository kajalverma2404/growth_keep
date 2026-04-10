import express from "express";
import { sql } from "./db.js";
import { authenticate } from "./middleware.js";

const router = express.Router();

// Get all resources
router.get("/", authenticate, async (req: any, res) => {
  try {
    const resources = await sql(`
      SELECT * FROM resources 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [req.userId]);
    res.json(resources);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a resource
router.post("/", authenticate, async (req: any, res) => {
  const { title, url, type, description } = req.body;
  try {
    const [resource] = await sql(`
      INSERT INTO resources (user_id, title, url, type, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.userId, title, url, type, description]);
    res.json(resource);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a resource
router.delete("/:id", authenticate, async (req: any, res) => {
  try {
    await sql(`
      DELETE FROM resources 
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
