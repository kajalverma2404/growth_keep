import express from "express";
import { sql } from "./db.js";
import { journalSaveSchema } from "../types/schemas.js";
import { authenticate, incrementAiUsage } from "./middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", async (req: any, res) => {
  try {
    const entries = await sql(
      "SELECT * FROM journals WHERE user_id = $1 AND deleted_at IS NULL AND archived_at IS NULL ORDER BY created_at DESC",
      [req.userId]
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

router.post("/", async (req: any, res) => {
  try {
    const result = journalSaveSchema.safeParse(req.body);
    if (!result.success) {
      console.warn(`[JOURNAL] Validation failed: ${result.error.issues[0].message}`);
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    const { content, id, date, mood } = result.data;

    if (!content || !content.trim()) {
      console.warn(`[JOURNAL] Attempted to save empty content (User: ${req.userId}, ID: ${id})`);
      return res.status(400).json({ error: "Content cannot be empty" });
    }

    // Check for duplicate content in the last 5 minutes to prevent accidental double-saves
    if (!id) {
      const duplicate = (await sql(
        "SELECT id FROM journals WHERE user_id = $1 AND content = $2 AND created_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes' LIMIT 1",
        [req.userId, content]
      ))[0];
      if (duplicate) {
        console.warn(`[JOURNAL] Duplicate entry detected for user ${req.userId}`);
        return res.status(409).json({ error: "Duplicate entry detected", id: duplicate.id });
      }
    }

    if (id) {
      console.log(`[JOURNAL] Updating entry ${id} for user ${req.userId}`);
      const entry = (await sql(
        "UPDATE journals SET content = $1, mood = $2, is_draft = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *",
        [content, mood, id, req.userId]
      ))[0];
      if (!entry) {
        console.warn(`[JOURNAL] Entry ${id} not found for update (User: ${req.userId})`);
        return res.status(404).json({ error: "Entry not found" });
      }
      return res.json(entry);
    }

    console.log(`[JOURNAL] Creating new entry for user ${req.userId}`);
    const entry = (await sql(
      "INSERT INTO journals (user_id, content, mood, date, is_draft) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), 0) RETURNING *",
      [req.userId, content, mood, date]
    ))[0];
    res.json(entry);
  } catch (err) {
    console.error(`[JOURNAL] Error saving entry:`, err);
    res.status(500).json({ error: "Failed to save entry" });
  }
});

router.patch("/:id", async (req: any, res) => {
  const { content } = req.body;
  try {
    const entry = (await sql(
      "UPDATE journals SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *",
      [content, req.params.id, req.userId]
    ))[0];
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: "Failed to update entry" });
  }
});

router.get("/:id/insight", async (req: any, res) => {
  try {
    const insight = (await sql(
      "SELECT * FROM journal_insights WHERE journal_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1",
      [req.params.id, req.userId]
    ))[0];
    res.json(insight || null);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch insight" });
  }
});

router.post("/:id/insight", async (req: any, res) => {
  const { insight, scores } = req.body;
  const journalId = req.params.id;
  try {
    // Save the full individual insight tied to the journal entry
    await sql(
      "INSERT INTO journal_insights (user_id, journal_id, type, insight) VALUES ($1, $2, 'individual', $3)",
      [req.userId, journalId, JSON.stringify(insight)]
    );

    // Save individual components as aggregated types so they appear in trend sections
    const types = [
      'daily_insight', 
      'weekly_review', 
      'monthly_review', 
      'three_month_analysis', 
      'six_month_review', 
      'annual_reflection'
    ];

    for (const type of types) {
      if (insight[type]) {
        await sql(
          "INSERT INTO journal_insights (user_id, journal_id, type, insight) VALUES ($1, $2, $3, $4)",
          [req.userId, journalId, type, JSON.stringify(insight[type])]
        );
      }
    }

    // Save scores if provided
    if (scores) {
      await sql(
        "INSERT INTO scores (user_id, journal_id, emotional_stability, productivity, consistency, life_balance) VALUES ($1, $2, $3, $4, $5, $6)",
        [req.userId, journalId, scores.emotional_stability, scores.productivity, scores.consistency, scores.life_balance]
      );
    }

    // Update journal entry with analysis
    await sql(
      "UPDATE journals SET analysis = $1 WHERE id = $2 AND user_id = $3",
      [JSON.stringify(insight), journalId, req.userId]
    );

    await incrementAiUsage(req.userId);
    console.log(`[AI USAGE] Incremented AI usage for user ${req.userId} (Individual Insight)`);

    res.json({ success: true });
  } catch (err) {
    console.error("[DB] Failed to save insight:", err);
    res.status(500).json({ error: "Failed to save insight" });
  }
});

router.post("/autosave", async (req: any, res) => {
  try {
    const { content, id, date, mood } = req.body;

    if (!content || !content.trim()) {
      // For autosave, we don't want to error out if it's empty, but we shouldn't save it as a new entry
      if (!id) return res.status(200).json({ status: "skipped", reason: "empty content" });
      // If it has an ID, we might want to update it to empty? 
      // Actually, requirement says "Ensure that journal entries with empty or whitespace-only content are not saved"
      // So we skip saving if empty.
      return res.status(200).json({ status: "skipped", reason: "empty content" });
    }

    if (id) {
      console.log(`[JOURNAL] Autosaving entry ${id} for user ${req.userId}`);
      const entry = (await sql(
        "UPDATE journals SET content = $1, mood = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *",
        [content, mood, id, req.userId]
      ))[0];
      if (!entry) return res.status(404).json({ error: "Entry not found" });
      return res.json(entry);
    }
    
    console.log(`[JOURNAL] Creating new entry via autosave for user ${req.userId}`);
    const entry = (await sql(
      "INSERT INTO journals (user_id, content, mood, date, is_draft) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), 1) RETURNING *",
      [req.userId, content, mood, date]
    ))[0];
    res.json(entry);
  } catch (err) {
    console.error(`[JOURNAL] Autosave error:`, err);
    res.status(500).json({ error: "Failed to auto-save" });
  }
});

router.delete("/:id", async (req: any, res) => {
  try {
    await sql(
      "UPDATE journals SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

router.post("/:id/archive", async (req: any, res) => {
  try {
    await sql(
      "UPDATE journals SET archived_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to archive entry" });
  }
});

router.post("/:id/restore", async (req: any, res) => {
  try {
    await sql(
      "UPDATE journals SET deleted_at = NULL, archived_at = NULL WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to restore entry" });
  }
});

router.get("/trash", async (req: any, res) => {
  try {
    const entries = await sql(
      "SELECT * FROM journals WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
      [req.userId]
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trash" });
  }
});

router.get("/archived", async (req: any, res) => {
  try {
    const entries = await sql(
      "SELECT * FROM journals WHERE user_id = $1 AND archived_at IS NOT NULL ORDER BY archived_at DESC",
      [req.userId]
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch archive" });
  }
});

router.delete("/trash/empty", async (req: any, res) => {
  try {
    await sql("DELETE FROM journals WHERE user_id = $1 AND deleted_at IS NOT NULL", [req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to empty trash" });
  }
});

router.delete("/:id/permanent", async (req: any, res) => {
  try {
    await sql("DELETE FROM journals WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to permanently delete entry" });
  }
});

export default router;
