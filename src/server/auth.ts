import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { sql } from "./db.js";
import { signupSchema, loginSchema } from "../types/schemas.js";

import { authenticate } from "./middleware.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "growth-keep-secret-key";

router.get("/me", authenticate, async (req: any, res) => {
  try {
    const user = (await sql("SELECT id, email, name, profile_picture FROM users WHERE id = $1", [req.userId]))[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "dummy",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy",
    callbackURL: `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`,
    scope: ['profile', 'email'],
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("No email found in Google profile"));

      let user = (await sql("SELECT * FROM users WHERE google_id = $1 OR email = $2", [profile.id, email]))[0];

      if (!user) {
        user = (await sql(
          "INSERT INTO users (email, name, google_id, profile_picture) VALUES ($1, $2, $3, $4) RETURNING *",
          [email, profile.displayName, profile.id, profile.photos?.[0]?.value]
        ))[0];
      } else if (!user.google_id) {
        user = (await sql(
          "UPDATE users SET google_id = $1, profile_picture = $2 WHERE id = $3 RETURNING *",
          [profile.id, profile.photos?.[0]?.value, user.id]
        ))[0];
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

router.get('/google', passport.authenticate('google'));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req: any, res) => {
    const token = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: "7d" });
    const user = { id: req.user.id, email: req.user.email, name: req.user.name };
    res.send(`
      <script>
        window.opener.postMessage({ 
          type: 'OAUTH_AUTH_SUCCESS', 
          token: '${token}',
          user: ${JSON.stringify(user)}
        }, '*');
        window.close();
      </script>
    `);
  }
);

router.post("/signup", async (req, res) => {
  const result = signupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { email, password, name } = result.data;

  try {
    const existing = await sql("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = (await sql(
      "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, hashedPassword, name]
    ))[0];

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    console.log(`[AUTH] User signed up: ${email} (ID: ${user.id})`);
    res.json({ token, user });
  } catch (err) {
    console.error(`[AUTH] Signup error for ${req.body.email}:`, err);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { email, password } = result.data;

  try {
    const user = (await sql("SELECT * FROM users WHERE email = $1", [email]))[0];
    if (!user || !user.password) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    console.log(`[AUTH] User logged in: ${email} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(`[AUTH] Login error for ${req.body.email}:`, err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
