import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("[DB] DATABASE_URL is not set. Database operations will fail.");
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

// Migration to make journal_id nullable for aggregated insights
(async () => {
  try {
    await sql("ALTER TABLE journal_insights ALTER COLUMN journal_id DROP NOT NULL");
    console.log("[DB] Migration: journal_id is now nullable in journal_insights");
  } catch (err) {
    // Ignore if it's already nullable or table doesn't exist yet
    if (err instanceof Error && !err.message.includes('does not exist')) {
      console.warn("[DB] Migration failed (journal_id nullable):", err.message);
    }
  }
})();

export const sql = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log('[DB] Slow query:', { text, duration, rows: res.rowCount });
    }
    return res.rows;
  } catch (err) {
    console.error('[DB] Query error:', { text, err });
    throw err;
  }
};
