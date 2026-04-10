import express from "express";
console.log("[SERVER] Starting server execution...");
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import passport from "passport";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { sql } from "./src/server/db.js";

// Routes
import authRoutes from "./src/server/auth.js";
import journalRoutes from "./src/server/journal.js";
import habitRoutes from "./src/server/habits.js";
import reminderRoutes from "./src/server/reminders.js";
import insightRoutes from "./src/server/insights.js";
import scoreRoutes from "./src/server/scores.js";
import goalRoutes from "./src/server/goals.js";
import affirmationRoutes from "./src/server/affirmations.js";
import resourceRoutes from "./src/server/resources.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  console.log("[DB] Initializing PostgreSQL schema...");
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("[DB] DATABASE_URL is not set. Skipping schema initialization.");
    return;
  }
  try {
    console.log("[DB] Executing schema SQL...");
    await sql(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT,
        google_id TEXT UNIQUE,
        profile_picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT,
        content TEXT DEFAULT '',
        analysis TEXT,
        mood TEXT,
        date DATE NOT NULL,
        is_draft INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        archived_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        journal_id INTEGER REFERENCES journals(id),
        emotional_stability INTEGER,
        productivity INTEGER,
        consistency INTEGER,
        life_balance INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        status INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_insights (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        journal_id INTEGER REFERENCES journals(id),
        type TEXT NOT NULL DEFAULT 'daily',
        insight TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure 'type' and 'journal_id' columns exist if table was created earlier
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_insights' AND column_name='type') THEN
          ALTER TABLE journal_insights ADD COLUMN type TEXT NOT NULL DEFAULT 'daily';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_insights' AND column_name='journal_id') THEN
          ALTER TABLE journal_insights ADD COLUMN journal_id INTEGER REFERENCES journals(id);
        END IF;
        
        -- Migration for journals table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journals' AND column_name='mood') THEN
          ALTER TABLE journals ADD COLUMN mood TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journals' AND column_name='deleted_at') THEN
          ALTER TABLE journals ADD COLUMN deleted_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journals' AND column_name='archived_at') THEN
          ALTER TABLE journals ADD COLUMN archived_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journals' AND column_name='is_draft') THEN
          ALTER TABLE journals ADD COLUMN is_draft INTEGER DEFAULT 1;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        time TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        target_date DATE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS affirmations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        url TEXT,
        type TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
        count INTEGER DEFAULT 0,
        UNIQUE(user_id, usage_date)
      );

      -- Cleanup empty journal entries
      DELETE FROM journals WHERE (content IS NULL OR TRIM(content) = '') AND is_draft = 1;
      
      -- Auto-delete trash older than 7 days
      DELETE FROM journals WHERE deleted_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    `);
    console.log("[DB] Schema initialized successfully.");
  } catch (err) {
    console.error("[DB] Failed to initialize schema:", err);
  }
}

async function startServer() {
  console.log("[SERVER] startServer() called...");
  console.log("[SERVER] DATABASE_URL is", process.env.DATABASE_URL ? "DEFINED" : "UNDEFINED");
  const app = express();
  const PORT = 3000;

  // Trust proxy is required for express-rate-limit to work correctly behind Cloud Run/Nginx
  app.set('trust proxy', 1);

  // Security Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(passport.initialize());

  // Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many requests, please try again after 15 minutes" },
    validate: { xForwardedForHeader: false },
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10, // limit each IP to 10 requests per hour for auth
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again after an hour" },
    validate: { xForwardedForHeader: false },
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20, // limit each IP to 20 AI requests per hour
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "AI request limit reached for this hour, please try again later" },
    validate: { xForwardedForHeader: false },
  });

  app.use("/api/", generalLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/signup", authLimiter);
  app.use("/api/insights", aiLimiter);

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/journal", journalRoutes);
  app.use("/api/habits", habitRoutes);
  app.use("/api/reminders", reminderRoutes);
  app.use("/api/insights", insightRoutes);
  app.use("/api/scores", scoreRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/affirmations", affirmationRoutes);
  app.use("/api/resources", resourceRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[SERVER] Creating Vite server...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("[SERVER] Vite server created.");
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Initialize DB in background
    initDb().then(() => {
      // Periodic cleanup every 24 hours
      setInterval(async () => {
        try {
          console.log("[DB] Running periodic cleanup...");
          await sql("DELETE FROM journals WHERE (content IS NULL OR TRIM(content) = '') AND is_draft = 1");
          await sql("DELETE FROM journals WHERE deleted_at < CURRENT_TIMESTAMP - INTERVAL '7 days'");
          console.log("[DB] Periodic cleanup completed.");
        } catch (err) {
          console.error("[DB] Periodic cleanup failed:", err);
        }
      }, 24 * 60 * 60 * 1000);
    }).catch(err => console.error("[DB] Background initialization failed:", err));
  });

  // Global error handler for Express
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(`[SERVER] Unhandled error in ${req.method} ${req.url}:`, err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  // Global process error handlers
  process.on('uncaughtException', (err) => {
    console.error('[SERVER] Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

startServer();
