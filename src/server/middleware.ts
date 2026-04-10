import jwt from "jsonwebtoken";
import { sql } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "growth-keep-secret-key";

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const checkAiUsage = async (req: any, res: any, next: any) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const today = new Date().toLocaleDateString('en-CA');
    const usage = (await sql(
      "SELECT count FROM ai_usage WHERE user_id = $1 AND usage_date = $2",
      [userId, today]
    ))[0];

    if (usage && usage.count >= 5) {
      return res.status(429).json({ 
        error: "AI insight limit reached (5 per day). Please try again tomorrow.",
        limitReached: true
      });
    }
    next();
  } catch (err) {
    console.error("[AI USAGE] Error checking usage:", err);
    next(); // Proceed anyway if DB check fails, but log it
  }
};

export const incrementAiUsage = async (userId: number) => {
  try {
    const today = new Date().toLocaleDateString('en-CA');
    await sql(`
      INSERT INTO ai_usage (user_id, usage_date, count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET count = ai_usage.count + 1
    `, [userId, today]);
  } catch (err) {
    console.error("[AI USAGE] Error incrementing usage:", err);
  }
};
