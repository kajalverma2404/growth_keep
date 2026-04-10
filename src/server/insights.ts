import express from "express";
import { sql } from "./db.js";
import { authenticate, checkAiUsage, incrementAiUsage } from "./middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/history", async (req: any, res) => {
  try {
    const history = await sql(
      "SELECT * FROM journal_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [req.userId]
    );
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch insight history" });
  }
});

router.get("/check-limit", checkAiUsage, (req: any, res) => {
  res.json({ success: true, message: "Limit not reached" });
});

router.post("/increment-usage", async (req: any, res) => {
  try {
    await incrementAiUsage(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to increment usage" });
  }
});

router.get("/latest", async (req: any, res) => {
  try {
    const types = [
      'daily_insight',
      'weekly_review',
      'monthly_review',
      'three_month_analysis',
      'six_month_review',
      'annual_reflection'
    ];
    
    const results: any = {};
    
    for (const type of types) {
      const existing = (await sql(
        "SELECT insight FROM journal_insights WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1",
        [req.userId, type]
      ))[0];
      
      if (existing) {
        results[type] = JSON.parse(existing.insight);
      }
    }
    
    res.json(results);
  } catch (err) {
    console.error("Failed to fetch latest insights:", err);
    res.status(500).json({ error: "Failed to fetch latest insights" });
  }
});

router.get("/:type", checkAiUsage, async (req: any, res) => {
  const { type } = req.params;
  const force = req.query.force === 'true';
  const clientDate = req.query.date as string; // Expected format: YYYY-MM-DD
  
  try {
    if (!force) {
      let existingQuery = "SELECT * FROM journal_insights WHERE user_id = $1 AND type = $2 ";
      let params: any[] = [req.userId, type];

      if (type === 'daily_insight') {
        if (clientDate) {
          existingQuery += "AND created_at::date = $3 ";
          params.push(clientDate);
        } else {
          existingQuery += "AND created_at >= CURRENT_DATE ";
        }
      } else if (type === 'weekly_review') {
        existingQuery += "AND created_at >= CURRENT_DATE - INTERVAL '7 days' ";
      } else if (type === 'monthly_review') {
        existingQuery += "AND created_at >= CURRENT_DATE - INTERVAL '30 days' ";
      } else if (type === 'three_month_analysis') {
        existingQuery += "AND created_at >= CURRENT_DATE - INTERVAL '90 days' ";
      } else if (type === 'six_month_review') {
        existingQuery += "AND created_at >= CURRENT_DATE - INTERVAL '180 days' ";
      } else if (type === 'annual_reflection') {
        existingQuery += "AND created_at >= CURRENT_DATE - INTERVAL '365 days' ";
      }
      existingQuery += "ORDER BY created_at DESC LIMIT 1";
      
      const existing = (await sql(existingQuery, params))[0];
      if (existing) return res.json({ insight: JSON.parse(existing.insight) });
    }

    let entriesQuery = "SELECT content FROM journals WHERE user_id = $1 AND deleted_at IS NULL AND archived_at IS NULL ";
    let entryParams: any[] = [req.userId];

    if (type === 'daily_insight') {
      // For daily insight, we fetch the last 365 days to provide context for all potential reviews (weekly, monthly, etc.)
      entriesQuery += "AND date >= CURRENT_DATE - INTERVAL '365 days'";
    } else if (type === 'weekly_review') {
      entriesQuery += "AND date >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (type === 'monthly_review') {
      entriesQuery += "AND date >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (type === 'three_month_analysis') {
      entriesQuery += "AND date >= CURRENT_DATE - INTERVAL '90 days'";
    } else if (type === 'six_month_review') {
      entriesQuery += "AND date >= CURRENT_DATE - INTERVAL '180 days'";
    } else if (type === 'annual_reflection') {
      entriesQuery += "AND date >= CURRENT_DATE - INTERVAL '365 days'";
    }
    
    entriesQuery += " ORDER BY date ASC";
    
    const entries = await sql(entriesQuery, entryParams);
    console.log(`[BACKEND] Found ${entries.length} entries for ${type} insight generation.`);
    
    const combinedContent = entries.map(e => {
      const dateStr = e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date);
      return `DATE: ${dateStr}\nCONTENT: ${e.content}`;
    }).join("\n\n---\n\n");
    if (entries.length > 0) {
      console.log(`[BACKEND] Combined content length: ${combinedContent.length}`);
    }
    
    res.json({ combinedContent, entriesCount: entries.length });
  } catch (err) {
    console.error(`Error fetching ${type} data:`, err);
    res.status(500).json({ error: `Failed to fetch ${type} data` });
  }
});

router.post("/:type", async (req: any, res) => {
  const { type } = req.params;
  const { insight } = req.body;
  try {
    // Save the primary insight requested
    let primaryInsight = insight;
    if (type === 'daily_insight' && insight.daily_insight) {
      primaryInsight = insight.daily_insight;
    }

    await sql(
      "INSERT INTO journal_insights (user_id, type, insight) VALUES ($1, $2, $3)",
      [req.userId, type, JSON.stringify(primaryInsight)]
    );

    // If this is a daily insight and contains other reviews, save them too
    if (type === 'daily_insight' && typeof insight === 'object' && insight !== null) {
      const otherTypes = [
        'weekly_review', 
        'monthly_review', 
        'three_month_analysis', 
        'six_month_review', 
        'annual_reflection'
      ];

      for (const t of otherTypes) {
        if (insight[t]) {
          await sql(
            "INSERT INTO journal_insights (user_id, type, insight) VALUES ($1, $2, $3)",
            [req.userId, t, JSON.stringify(insight[t])]
          );
        }
      }
    }

    await incrementAiUsage(req.userId);
    console.log(`[AI USAGE] Incremented AI usage for user ${req.userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`Failed to save ${type}:`, err);
    res.status(500).json({ error: `Failed to save ${type}` });
  }
});

export default router;
