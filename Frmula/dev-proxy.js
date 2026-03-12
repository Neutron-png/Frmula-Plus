const http = require("http");
const httpProxy = require("http-proxy");
const { Pool } = require("pg");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const EXPO_PORT = 8081;
const PROXY_PORT = 5000;
const JWT_SECRET = process.env.SESSION_SECRET || "frmula-admin-secret-key-2026";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + JWT_SECRET).digest('hex');
}
function createToken(id, username) {
  const payload = JSON.stringify({ id, username, exp: Date.now() + 24*60*60*1000 });
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + sig;
}
function verifyToken(token) {
  try {
    const [b64, sig] = token.split('.');
    const payload = Buffer.from(b64, 'base64').toString();
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (sig !== expected) return null;
    const d = JSON.parse(payload);
    return d.exp > Date.now() ? d : null;
  } catch { return null; }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}
function sendFile(res, filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function getAuth(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

// Seed admin on startup
(async () => {
  try {
    const h = hashPassword('admin123');
    await pool.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING', ['admin', h]);
  } catch (e) { console.error('Admin seed:', e.message); }
})();

const proxy = httpProxy.createProxyServer({ target: `http://127.0.0.1:${EXPO_PORT}`, ws: true, changeOrigin: true });
proxy.on("error", (err, req, res) => {
  if (res.writeHead) { res.writeHead(502, { "Content-Type": "text/plain" }); res.end("Waiting for Expo to start..."); }
});

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
    return res.end();
  }

  // Admin HTML pages
  if (url === '/admin' || url === '/admin/') {
    return sendFile(res, path.join(__dirname, 'server/admin/dashboard.html'));
  }
  if (url === '/admin/login') {
    return sendFile(res, path.join(__dirname, 'server/admin/login.html'));
  }

  // Public API
  if (url === '/api/learn-f1' && req.method === 'GET') {
    try {
      const r = await pool.query('SELECT id, title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order FROM learn_f1_topics WHERE published = true ORDER BY sort_order ASC');
      return sendJson(res, 200, r.rows);
    } catch { return sendJson(res, 500, { error: 'DB error' }); }
  }
  if (url === '/api/announcements' && req.method === 'GET') {
    try {
      const r = await pool.query('SELECT id, title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active, created_at FROM announcements WHERE active = true ORDER BY created_at DESC');
      return sendJson(res, 200, r.rows);
    } catch { return sendJson(res, 500, { error: 'DB error' }); }
  }
  if (url === '/api/config' && req.method === 'GET') {
    try {
      const r = await pool.query('SELECT key, value FROM app_config');
      const cfg = {}; r.rows.forEach(r => cfg[r.key] = r.value);
      return sendJson(res, 200, cfg);
    } catch { return sendJson(res, 500, { error: 'DB error' }); }
  }

  // Admin API - Login
  if (url === '/admin/api/login' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.username || !body.password) return sendJson(res, 400, { error: 'Credentials required' });
    try {
      const r = await pool.query('SELECT id, username, password_hash FROM admin_users WHERE username = $1', [body.username]);
      if (!r.rows.length) return sendJson(res, 401, { error: 'Invalid credentials' });
      if (hashPassword(body.password) !== r.rows[0].password_hash) return sendJson(res, 401, { error: 'Invalid credentials' });
      return sendJson(res, 200, { token: createToken(r.rows[0].id, r.rows[0].username), username: r.rows[0].username });
    } catch { return sendJson(res, 500, { error: 'Server error' }); }
  }

  // Admin API - Protected routes
  if (url.startsWith('/admin/api/')) {
    const user = getAuth(req);
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = req.method !== 'GET' ? await parseBody(req) : {};
    const idMatch = url.match(/\/admin\/api\/(\w+)\/(\d+)/);
    const listMatch = url.match(/\/admin\/api\/(\w+)$/);

    // News CRUD
    if (listMatch && listMatch[1] === 'news' && req.method === 'GET') {
      const r = await pool.query('SELECT * FROM news_articles ORDER BY created_at DESC');
      return sendJson(res, 200, r.rows);
    }
    if (listMatch && listMatch[1] === 'news' && req.method === 'POST') {
      const { title, description, link, image_url, category, source, published, featured } = body;
      const r = await pool.query('INSERT INTO news_articles (title, description, link, image_url, category, source, published, featured) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [title, description, link, image_url, category||'Formula 1', source, published!==false, featured===true]);
      return sendJson(res, 200, r.rows[0]);
    }
    if (idMatch && idMatch[1] === 'news' && req.method === 'PUT') {
      const { title, description, link, image_url, category, source, published, featured } = body;
      const r = await pool.query('UPDATE news_articles SET title=$1, description=$2, link=$3, image_url=$4, category=$5, source=$6, published=$7, featured=$8, updated_at=NOW() WHERE id=$9 RETURNING *', [title, description, link, image_url, category, source, published, featured, idMatch[2]]);
      return sendJson(res, 200, r.rows[0]);
    }
    if (idMatch && idMatch[1] === 'news' && req.method === 'DELETE') {
      await pool.query('DELETE FROM news_articles WHERE id=$1', [idMatch[2]]);
      return sendJson(res, 200, { success: true });
    }

    // Learn F1 CRUD
    if (listMatch && listMatch[1] === 'learn' && req.method === 'GET') {
      const r = await pool.query('SELECT * FROM learn_f1_topics ORDER BY sort_order ASC');
      return sendJson(res, 200, r.rows);
    }
    if (listMatch && listMatch[1] === 'learn' && req.method === 'POST') {
      const { title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order, published } = body;
      const r = await pool.query('INSERT INTO learn_f1_topics (title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order, published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon||'book-outline', sort_order||0, published!==false]);
      return sendJson(res, 200, r.rows[0]);
    }
    if (idMatch && idMatch[1] === 'learn' && req.method === 'PUT') {
      const { title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order, published } = body;
      const r = await pool.query('UPDATE learn_f1_topics SET title_en=$1, title_fr=$2, title_ar=$3, content_en=$4, content_fr=$5, content_ar=$6, icon=$7, sort_order=$8, published=$9, updated_at=NOW() WHERE id=$10 RETURNING *', [title_en, title_fr, title_ar, content_en, content_fr, content_ar, icon, sort_order, published, idMatch[2]]);
      return sendJson(res, 200, r.rows[0]);
    }
    if (idMatch && idMatch[1] === 'learn' && req.method === 'DELETE') {
      await pool.query('DELETE FROM learn_f1_topics WHERE id=$1', [idMatch[2]]);
      return sendJson(res, 200, { success: true });
    }

    // Announcements CRUD
    if (listMatch && listMatch[1] === 'announcements' && req.method === 'GET') {
      const r = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
      return sendJson(res, 200, r.rows);
    }
    if (listMatch && listMatch[1] === 'announcements' && req.method === 'POST') {
      const { title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active } = body;
      const r = await pool.query('INSERT INTO announcements (title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [title_en, title_fr, title_ar, body_en, body_fr, body_ar, type||'info', active!==false]);
      return sendJson(res, 200, r.rows[0]);
    }
    if (idMatch && idMatch[1] === 'announcements' && req.method === 'PUT') {
      const { title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active } = body;
      const r = await pool.query('UPDATE announcements SET title_en=$1, title_fr=$2, title_ar=$3, body_en=$4, body_fr=$5, body_ar=$6, type=$7, active=$8 WHERE id=$9 RETURNING *', [title_en, title_fr, title_ar, body_en, body_fr, body_ar, type, active, idMatch[2]]);
      return sendJson(res, 200, r.rows[0]);
    }
    if (idMatch && idMatch[1] === 'announcements' && req.method === 'DELETE') {
      await pool.query('DELETE FROM announcements WHERE id=$1', [idMatch[2]]);
      return sendJson(res, 200, { success: true });
    }

    // Config
    if (listMatch && listMatch[1] === 'config' && req.method === 'GET') {
      const r = await pool.query('SELECT key, value, updated_at FROM app_config ORDER BY key');
      return sendJson(res, 200, r.rows);
    }
    if (listMatch && listMatch[1] === 'config' && req.method === 'PUT') {
      for (const [key, value] of Object.entries(body)) {
        await pool.query('INSERT INTO app_config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()', [key, value]);
      }
      return sendJson(res, 200, { success: true });
    }

    return sendJson(res, 404, { error: 'Not found' });
  }

  // Everything else -> Expo proxy
  proxy.web(req, res);
});

server.on("upgrade", (req, socket, head) => { proxy.ws(req, socket, head); });

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`Dev proxy listening on port ${PROXY_PORT}, forwarding to Expo on ${EXPO_PORT}`);
  console.log(`Admin dashboard: http://localhost:${PROXY_PORT}/admin`);
});
