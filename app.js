// Vroom.pt — car import analysis platform.
// Entry point. Works locally (`npm start`) and on cPanel "Setup Node.js App" (Passenger).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Store } from './src/store.js';
import { fetchLeboncoin, parseLeboncoinPayload, buildSearchUrl } from './src/leboncoin.js';
import { parseJsonLdCars } from './src/generic.js';
import { loadEnv } from './src/env.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(ROOT, '.env'));

const PORT = Number(process.env.PORT) || 3000;
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, ''); // e.g. "/vroom" when the app URL is a sub-path
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data');
const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(`vroom:${PASSWORD}:${DATA_DIR}`).digest('hex');
const store = new Store(DATA_DIR);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const STATIC = { '/': 'public/index.html', '/login': 'public/login.html', '/bridge': 'public/bridge.html' };

// ---- auth (single shared password; cookie = signed expiry) ----
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
const makeToken = () => { const exp = String(Date.now() + 30 * 864e5); return `${exp}.${sign(exp)}`; };
function authed(req) {
  if (!PASSWORD) return true;
  const c = Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map((p) => { const i = p.indexOf('='); return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))]; }));
  const [exp, sig] = String(c.vroom_session || '').split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return good.length === sig.length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}
const loginAttempts = new Map();

function send(res, status, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, { 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}

async function readBody(req, limit = 15e6) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('Pedido demasiado grande'), { status: 413 }); chunks.push(c); }
  const raw = Buffer.concat(chunks).toString('utf8');
  if ((req.headers['content-type'] || '').includes('application/json')) return raw ? JSON.parse(raw) : {};
  if ((req.headers['content-type'] || '').includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  return raw;
}

function serveFile(res, rel) {
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Não encontrado');
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}

function importDeals(list) {
  let created = 0, updated = 0;
  const ids = [];
  for (const d of list) {
    if (!d || (!d.price && !d.title)) continue;
    const r = store.upsert(d);
    r.created ? created++ : updated++;
    ids.push(r.deal.id);
  }
  return { created, updated, ids };
}

function parsePasted(content, url = '') {
  const lbc = parseLeboncoinPayload(content);
  if (lbc.length) return lbc;
  return typeof content === 'string' ? parseJsonLdCars(content, url) : [];
}

async function api(req, res, p) {
  const m = req.method;
  if (p === '/api/state' && m === 'GET') return send(res, 200, { deals: store.deals, settings: store.data.settings, firecrawl: !!process.env.FIRECRAWL_API_KEY });
  if (p === '/api/deals' && m === 'POST') {
    const body = await readBody(req);
    const r = store.upsert({ source: 'manual', ...body, sourceId: body.sourceId || (body.source && body.source !== 'manual' ? body.url : undefined) });
    return send(res, 201, r.deal);
  }
  const dm = p.match(/^\/api\/deals\/([\w-]+)$/);
  if (dm && m === 'PUT') { const d = store.update(dm[1], await readBody(req)); return d ? send(res, 200, d) : send(res, 404, { error: 'não encontrado' }); }
  if (dm && m === 'DELETE') return store.remove(dm[1]) ? send(res, 200, { ok: true }) : send(res, 404, { error: 'não encontrado' });
  if (p === '/api/settings' && m === 'PUT') { store.data.settings = await readBody(req); store.save(); return send(res, 200, store.data.settings); }
  if (p === '/api/import/leboncoin' && m === 'POST') {
    const { url } = await readBody(req);
    try { return send(res, 200, importDeals(await fetchLeboncoin(String(url || '').trim()))); }
    catch (e) { return send(res, 502, { error: e.message }); }
  }
  if (p === '/api/import/paste' && m === 'POST') {
    const { content, url, country } = await readBody(req);
    const deals = parsePasted(content, url).map((d) => (country && d.source !== 'leboncoin' ? { ...d, country } : d));
    if (!deals.length) return send(res, 422, { error: 'Não foi encontrado nenhum anúncio no que colou. Cole o código-fonte completo da página (Ctrl+U → Ctrl+A → Ctrl+C).' });
    return send(res, 200, importDeals(deals));
  }
  if (p === '/api/leboncoin/search-url' && m === 'POST') return send(res, 200, { url: buildSearchUrl(await readBody(req)) });
  if (p === '/api/export' && m === 'GET') return send(res, 200, store.data, { 'Content-Disposition': `attachment; filename="vroom-backup-${new Date().toISOString().slice(0, 10)}.json"` });
  if (p === '/api/restore' && m === 'POST') {
    const body = await readBody(req);
    if (!Array.isArray(body?.deals)) return send(res, 400, { error: 'Não é um ficheiro de cópia de segurança do Vroom' });
    store.backup(); store.data = { deals: body.deals, settings: body.settings || {} }; store.save();
    return send(res, 200, { ok: true, deals: body.deals.length });
  }
  return send(res, 404, { error: 'endpoint desconhecido' });
}

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (BASE_PATH && p === BASE_PATH) return send(res, 302, '', { Location: `${BASE_PATH}/` });
    if (BASE_PATH && p.startsWith(`${BASE_PATH}/`)) p = p.slice(BASE_PATH.length);
    if (p === '/healthz') return send(res, 200, 'ok');
    if (p === '/login' && req.method === 'POST') {
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      const a = loginAttempts.get(ip) || { n: 0, t: Date.now() };
      if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
      if (a.n >= 10) return send(res, 429, 'Demasiadas tentativas, tente novamente daqui a 15 minutos');
      const { password = '' } = await readBody(req);
      const ok = PASSWORD && password.length === PASSWORD.length && crypto.timingSafeEqual(Buffer.from(password), Buffer.from(PASSWORD));
      if (!ok) { a.n++; loginAttempts.set(ip, a); return send(res, 302, '', { Location: `${BASE_PATH}/login?e=1` }); }
      const secure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted ? '; Secure' : '';
      return send(res, 302, '', { Location: `${BASE_PATH}/`, 'Set-Cookie': `vroom_session=${makeToken()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}${secure}` });
    }
    if (p === '/logout') return send(res, 302, '', { Location: `${BASE_PATH}/login`, 'Set-Cookie': 'vroom_session=; Path=/; Max-Age=0' });
    const isPublic = p === '/login' || p.startsWith('/assets/') || p === '/styles.css';
    if (!isPublic && !authed(req)) return p.startsWith('/api/') ? send(res, 401, { error: 'sessão necessária' }) : send(res, 302, '', { Location: `${BASE_PATH}/login` });
    if (p.startsWith('/api/')) return await api(req, res, p);
    if (STATIC[p]) return serveFile(res, STATIC[p]);
    if (p === '/lib/tax.js' || p === '/lib/costs.js') return serveFile(res, path.join('src', path.basename(p)));
    return serveFile(res, path.join('public', path.normalize(p).replace(/^([/\\])+/, '')));
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, { error: e.message });
  }
});

server.listen(PORT, () => console.log(`Vroom.pt a correr em http://localhost:${PORT}${BASE_PATH || ''}  (dados: ${DATA_DIR}${PASSWORD ? ', com palavra-passe' : ', SEM PALAVRA-PASSE'})`));
