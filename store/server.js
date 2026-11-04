// Forge Labs — storefront + pre-order backoffice. No dependencies: `node server.js`.
// Env: PORT (default 3000), ADMIN_PASSWORD (required for /admin), DATA_DIR (default ./data)
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PRODUCTS, unitPrice, bulkRate } = require("./products.js");

const PORT = +process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const DB = path.join(DATA_DIR, "orders.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const SESSION_TTL = 12 * 3600 * 1000;

if (!ADMIN_PASSWORD) console.warn("⚠  ADMIN_PASSWORD não está definida — o acesso ao backoffice fica desativado até a definir.");

// ---------- storage (atomic JSON file) ----------
fs.mkdirSync(DATA_DIR, { recursive: true });
let orders = [];
try { orders = JSON.parse(fs.readFileSync(DB, "utf8")); } catch { orders = []; }
function persist() {
  const tmp = DB + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(orders, null, 2));
  fs.renameSync(tmp, DB);
}
function nextNumber() {
  const max = orders.reduce((m, o) => Math.max(m, +o.number.split("-")[1] || 0), 1000);
  return "FL-" + (max + 1);
}

// ---------- order building (prices always computed server-side) ----------
const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
function buildOrder(body, source) {
  const c = body.customer || {};
  const customer = {
    name: str(c.name, 120), email: str(c.email, 160), phone: str(c.phone, 40),
    address: str(c.address, 300), city: str(c.city, 80), postcode: str(c.postcode, 20), country: str(c.country, 60),
  };
  if (!customer.name) throw new Error("O nome é obrigatório");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) throw new Error("É necessário um email válido");
  if (!Array.isArray(body.items) || !body.items.length) throw new Error("A encomenda não tem artigos");
  if (body.items.length > 100) throw new Error("Demasiados artigos");

  const merged = {};
  for (const it of body.items) {
    const q = Math.floor(+it.qty);
    if (!byId[it.id] || !(q >= 1 && q <= 999)) throw new Error("Artigo inválido: " + String(it.id).slice(0, 40));
    merged[it.id] = (merged[it.id] || 0) + q;
  }
  const items = Object.entries(merged).map(([id, qty]) => {
    const p = byId[id], unit = unitPrice(p), gross = unit * qty, disc = +(gross * bulkRate(qty)).toFixed(2);
    return { id, name: p.name, sub: p.sub, qty, unit, discount: disc, total: +(gross - disc).toFixed(2) };
  });
  const subtotal = +items.reduce((s, i) => s + i.unit * i.qty, 0).toFixed(2);
  const discount = +items.reduce((s, i) => s + i.discount, 0).toFixed(2);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), number: nextNumber(), createdAt: now, updatedAt: now, status: "pending", source,
    customer, notes: str(body.notes, 1000), items, subtotal, discount, total: +(subtotal - discount).toFixed(2),
    history: [{ at: now, status: "pending", by: source }],
  };
}

// ---------- auth ----------
const sessions = new Map(); // token -> expiry
function checkPassword(pw) {
  if (!ADMIN_PASSWORD || typeof pw !== "string") return false;
  const a = crypto.createHash("sha256").update(pw).digest(), b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}
function authed(req) {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "");
  const exp = sessions.get(t);
  if (!exp || exp < Date.now()) { sessions.delete(t); return false; }
  return true;
}
const loginAttempts = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now(), list = (loginAttempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  list.push(now); loginAttempts.set(ip, list);
  return list.length > 10;
}
const orderPosts = new Map();
function orderRateLimited(ip) {
  const now = Date.now(), list = (orderPosts.get(ip) || []).filter(t => now - t < 60 * 1000);
  list.push(now); orderPosts.set(ip, list);
  return list.length > 10;
}

// ---------- http helpers ----------
const send = (res, code, data) => {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [];
    req.on("data", c => { size += c.length; if (size > 100_000) { reject(new Error("Pedido demasiado grande")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}); } catch { reject(new Error("JSON inválido")); } });
  });
}
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
const PUBLIC = new Set(["/index.html", "/styles.css", "/app.js", "/products.js", "/admin/index.html", "/admin/admin.css", "/admin/admin.js"]);
function serveStatic(req, res, pathname) {
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin" || pathname === "/admin/") pathname = "/admin/index.html";
  if (!PUBLIC.has(pathname)) { res.writeHead(404); return res.end("Não encontrado"); }
  fs.readFile(path.join(ROOT, pathname), (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Não encontrado"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(pathname)] || "application/octet-stream" });
    res.end(buf);
  });
}
const csvCell = v => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ---------- routes ----------
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname, ip = req.socket.remoteAddress;
  try {
    // public: create pre-order from the storefront
    if (p === "/api/orders" && req.method === "POST" && !req.headers.authorization) {
      if (orderRateLimited(ip)) return send(res, 429, { error: "Demasiados pedidos, tente novamente dentro de um minuto" });
      const order = buildOrder(await readBody(req), "storefront");
      orders.push(order); persist();
      return send(res, 201, { number: order.number, total: order.total });
    }
    if (p === "/api/login" && req.method === "POST") {
      if (rateLimited(ip)) return send(res, 429, { error: "Demasiadas tentativas, tente novamente mais tarde" });
      const { password } = await readBody(req);
      if (!checkPassword(password)) return send(res, 401, { error: ADMIN_PASSWORD ? "Palavra-passe incorreta" : "ADMIN_PASSWORD não está configurada no servidor" });
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, Date.now() + SESSION_TTL);
      return send(res, 200, { token });
    }

    if (p.startsWith("/api/")) {
      if (!authed(req)) return send(res, 401, { error: "Não autorizado" });
      if (p === "/api/logout" && req.method === "POST") {
        sessions.delete((req.headers.authorization || "").replace(/^Bearer /, "")); return send(res, 200, { ok: true });
      }
      if (p === "/api/orders" && req.method === "GET") return send(res, 200, [...orders].reverse());
      if (p === "/api/orders" && req.method === "POST") { // manual order entered in backoffice
        const order = buildOrder(await readBody(req), "backoffice");
        orders.push(order); persist();
        return send(res, 201, order);
      }
      if (p === "/api/orders.csv" && req.method === "GET") {
        const head = ["numero", "data", "estado", "origem", "nome", "email", "telefone", "morada", "localidade", "codigo_postal", "pais", "artigos", "subtotal", "desconto", "total", "observacoes"];
        const lines = orders.map(o => [o.number, o.createdAt, o.status, o.source, o.customer.name, o.customer.email, o.customer.phone, o.customer.address, o.customer.city, o.customer.postcode, o.customer.country,
          o.items.map(i => `${i.qty}x ${i.name}`).join("; "), o.subtotal, o.discount, o.total, o.notes].map(csvCell).join(","));
        res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pre-encomendas.csv"' });
        return res.end([head.join(","), ...lines].join("\n"));
      }
      const m = p.match(/^\/api\/orders\/([\w-]+)$/);
      if (m) {
        const o = orders.find(x => x.id === m[1]);
        if (!o) return send(res, 404, { error: "Encomenda não encontrada" });
        if (req.method === "PATCH") {
          const b = await readBody(req), now = new Date().toISOString();
          if (b.status !== undefined) {
            if (!STATUSES.includes(b.status)) return send(res, 400, { error: "Estado inválido" });
            if (b.status !== o.status) { o.status = b.status; o.history.push({ at: now, status: b.status, by: "admin" }); }
          }
          if (b.internalNote !== undefined) o.internalNote = str(b.internalNote, 2000);
          o.updatedAt = now; persist();
          return send(res, 200, o);
        }
        if (req.method === "DELETE") {
          orders = orders.filter(x => x !== o); persist();
          return send(res, 200, { ok: true });
        }
      }
      return send(res, 404, { error: "Não encontrado" });
    }

    if (req.method === "GET") return serveStatic(req, res, p);
    res.writeHead(405); res.end();
  } catch (e) {
    send(res, 400, { error: e.message });
  }
}).listen(PORT, () => console.log(`Loja:       http://localhost:${PORT}\nBackoffice: http://localhost:${PORT}/admin`));
