import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { Pool } from "pg";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const F1_NEWS_HOST = "f1-latest-news.p.rapidapi.com";
const JWT_SECRET = process.env.SESSION_SECRET || "frmula-admin-secret-key-2026";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let newsCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

function createToken(userId: number, username: string): string {
  const payload = JSON.stringify({ id: userId, username, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + sig;
}

function verifyToken(token: string): { id: number; username: string } | null {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    const payload = Buffer.from(payloadB64, 'base64').toString();
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return null;
    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    return { id: data.id, username: data.username };
  } catch { return null; }
}

function adminAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const user = verifyToken(auth.slice(7));
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.adminUser = user;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed admin user on startup
  try {
    const defaultHash = hashPassword('admin123');
    await pool.query(
      `INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
      ['admin', defaultHash]
    );
  } catch (e) { console.error('Admin seed error:', e); }

  // ===== Public API endpoints =====

  app.get("/api/f1-news", async (_req, res) => {
    try {
      if (!RAPIDAPI_KEY) {
        return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });
      }
      if (newsCache && Date.now() - newsCache.timestamp < CACHE_TTL) {
        return res.json(newsCache.data);
      }
      const response = await fetch(`https://${F1_NEWS_HOST}/news`, {
        headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": F1_NEWS_HOST },
      });
      if (!response.ok) {
        if (newsCache) return res.json(newsCache.data);
        return res.status(response.status).json({ error: "Failed to fetch news" });
      }
      const raw = await response.json();
      const data = Array.isArray(raw) ? raw.filter((i: any) => i?.title && i?.url?.startsWith('http')).map((i: any) => ({
        title: i.title, url: i.url, source: i.source || 'unknown'
      })) : [];
      newsCache = { data, timestamp: Date.now() };
      res.json(data);
    } catch (err) {
      console.error("F1 news fetch error:", err);
      if (newsCache) return res.json(newsCache.data);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/learn-f1", async (_req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order FROM learn_f1_topics WHERE published = true ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Learn F1 fetch error:", err);
      res.status(500).json({ error: "Failed to fetch topics" });
    }
  });

  app.get("/api/announcements", async (_req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active, created_at FROM announcements WHERE active = true ORDER BY created_at DESC'
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.get("/api/config", async (_req, res) => {
    try {
      const result = await pool.query('SELECT key, value FROM app_config');
      const config: Record<string, string> = {};
      result.rows.forEach((r: any) => { config[r.key] = r.value; });
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  // ===== Admin Dashboard HTML =====

  app.get("/admin/login", (_req, res) => {
    const loginPath = path.resolve(process.cwd(), "server", "admin", "login.html");
    res.sendFile(loginPath);
  });

  app.get("/admin", (_req, res) => {
    const dashPath = path.resolve(process.cwd(), "server", "admin", "dashboard.html");
    res.sendFile(dashPath);
  });

  // ===== Admin API endpoints =====

  app.post("/admin/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
      const result = await pool.query('SELECT id, username, password_hash FROM admin_users WHERE username = $1', [username]);
      if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      const user = result.rows[0];
      const hash = hashPassword(password);
      if (hash !== user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
      const token = createToken(user.id, user.username);
      res.json({ token, username: user.username });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- News CRUD ---
  app.get("/admin/api/news", adminAuth, async (_req, res) => {
    const result = await pool.query('SELECT * FROM news_articles ORDER BY created_at DESC');
    res.json(result.rows);
  });

  app.post("/admin/api/news", adminAuth, async (req, res) => {
    const { title, description, link, image_url, category, source, published, featured } = req.body;
    const result = await pool.query(
      'INSERT INTO news_articles (title, description, link, image_url, category, source, published, featured) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title, description, link, image_url, category || 'Formula 1', source, published !== false, featured === true]
    );
    res.json(result.rows[0]);
  });

  app.put("/admin/api/news/:id", adminAuth, async (req, res) => {
    const { title, description, link, image_url, category, source, published, featured } = req.body;
    const result = await pool.query(
      'UPDATE news_articles SET title=$1, description=$2, link=$3, image_url=$4, category=$5, source=$6, published=$7, featured=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [title, description, link, image_url, category, source, published, featured, req.params.id]
    );
    res.json(result.rows[0]);
  });

  app.delete("/admin/api/news/:id", adminAuth, async (req, res) => {
    await pool.query('DELETE FROM news_articles WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  // --- Learn F1 CRUD ---
  app.get("/admin/api/learn", adminAuth, async (_req, res) => {
    const result = await pool.query('SELECT * FROM learn_f1_topics ORDER BY sort_order ASC');
    res.json(result.rows);
  });

  app.post("/admin/api/learn", adminAuth, async (req, res) => {
    const { title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order, published } = req.body;
    const result = await pool.query(
      'INSERT INTO learn_f1_topics (title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order, published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon || 'book-outline', sort_order || 0, published !== false]
    );
    res.json(result.rows[0]);
  });

  app.put("/admin/api/learn/:id", adminAuth, async (req, res) => {
    const { title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order, published } = req.body;
    const result = await pool.query(
      'UPDATE learn_f1_topics SET title_en=$1, title_fr=$2, title_ar=$3, content_en=$4, content_fr=$5, content_ar=$6, icon=$7, sort_order=$8, published=$9, updated_at=NOW() WHERE id=$10 RETURNING *',
      [title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order, published, req.params.id]
    );
    res.json(result.rows[0]);
  });

  app.delete("/admin/api/learn/:id", adminAuth, async (req, res) => {
    await pool.query('DELETE FROM learn_f1_topics WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  // --- Announcements CRUD ---
  app.get("/admin/api/announcements", adminAuth, async (_req, res) => {
    const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(result.rows);
  });

  app.post("/admin/api/announcements", adminAuth, async (req, res) => {
    const { title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active } = req.body;
    const result = await pool.query(
      'INSERT INTO announcements (title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title_en, title_fr, title_ar, body_en, body_fr, body_ar, type || 'info', active !== false]
    );
    res.json(result.rows[0]);
  });

  app.put("/admin/api/announcements/:id", adminAuth, async (req, res) => {
    const { title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active } = req.body;
    const result = await pool.query(
      'UPDATE announcements SET title_en=$1, title_fr=$2, title_ar=$3, body_en=$4, body_fr=$5, body_ar=$6, type=$7, active=$8 WHERE id=$9 RETURNING *',
      [title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active, req.params.id]
    );
    res.json(result.rows[0]);
  });

  app.delete("/admin/api/announcements/:id", adminAuth, async (req, res) => {
    await pool.query('DELETE FROM announcements WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  // --- App Config ---
  app.get("/admin/api/config", adminAuth, async (_req, res) => {
    const result = await pool.query('SELECT key, value, updated_at FROM app_config ORDER BY key');
    res.json(result.rows);
  });

  app.put("/admin/api/config", adminAuth, async (req, res) => {
    const configs = req.body;
    for (const [key, value] of Object.entries(configs)) {
      await pool.query(
        'INSERT INTO app_config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()',
        [key, value]
      );
    }
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
