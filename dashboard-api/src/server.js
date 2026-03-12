import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "data", "content.json");
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = process.env.ADMIN_KEY || "frmula-admin-key";

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "10mb" }));

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function requireAdmin(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/feed", (_req, res) => {
  const data = readData();
  const items = [...data.feedItems].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  res.json({ items, section: data.sections.feed });
});
app.get("/api/sections", (_req, res) => res.json(readData().sections));
app.get("/api/media", (_req, res) => res.json(readData().mediaLibrary));
app.get("/api/admin/bootstrap", requireAdmin, (_req, res) => res.json(readData()));

app.put("/api/admin/sections", requireAdmin, (req, res) => {
  const data = readData();
  data.sections = { ...data.sections, ...req.body };
  writeData(data);
  res.json({ ok: true, sections: data.sections });
});

app.post("/api/admin/feed", requireAdmin, (req, res) => {
  const data = readData();
  const item = { id: `feed_${Date.now()}`, likes: 0, comments: 0, reposts: 0, verified: false, ...req.body };
  data.feedItems.unshift(item);
  writeData(data);
  res.json(item);
});

app.put("/api/admin/feed/:id", requireAdmin, (req, res) => {
  const data = readData();
  const index = data.feedItems.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Feed item not found" });
  data.feedItems[index] = { ...data.feedItems[index], ...req.body };
  writeData(data);
  res.json(data.feedItems[index]);
});

app.delete("/api/admin/feed/:id", requireAdmin, (req, res) => {
  const data = readData();
  data.feedItems = data.feedItems.filter((item) => item.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

app.post("/api/admin/media", requireAdmin, (req, res) => {
  const data = readData();
  const item = { id: `media_${Date.now()}`, ...req.body };
  data.mediaLibrary.unshift(item);
  writeData(data);
  res.json(item);
});

app.post("/api/admin/push", requireAdmin, async (req, res) => {
  const data = readData();
  const payload = {
    id: `push_${Date.now()}`,
    title: req.body.title,
    body: req.body.body,
    sentAt: new Date().toISOString(),
    target: req.body.target || "all"
  };
  data.pushNotifications.unshift(payload);
  writeData(data);

  const expoTokens = (process.env.EXPO_PUSH_TOKENS || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (expoTokens.length) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expoTokens.map((to) => ({ to, title: payload.title, body: payload.body, sound: "default" })))
      });
    } catch (error) {
      console.error("Expo push failed", error);
    }
  }

  res.json({ ok: true, payload, sentToExpo: expoTokens.length > 0 });
});

app.listen(PORT, () => {
  console.log(`Dashboard API listening on http://localhost:${PORT}`);
});
