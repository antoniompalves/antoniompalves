import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lbcAd, lbcPage } from './fixtures/make-lbc.js';

const PORT = 3900 + Math.floor(Math.random() * 90);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vroom-'));
const base = `http://127.0.0.1:${PORT}/vroom`;
let proc;

test.before(async () => {
  proc = spawn(process.execPath, ['app.js'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, APP_PASSWORD: 'secret', BASE_PATH: '/vroom', FIRECRAWL_API_KEY: '' }, stdio: 'pipe' });
  for (let i = 0; i < 50; i++) { try { await fetch(`${base}/healthz`); return; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error('server did not start');
});
test.after(() => { proc.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); });

test('auth, import, update, export under a sub-path', async () => {
  assert.equal((await fetch(`${base}/api/state`)).status, 401);
  assert.equal((await fetch(`${base}/`, { redirect: 'manual' })).headers.get('location'), '/vroom/login');
  const bad = await fetch(`${base}/login`, { method: 'POST', body: 'password=nope', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  assert.match(bad.headers.get('location'), /e=1/);
  const ok = await fetch(`${base}/login`, { method: 'POST', body: 'password=secret', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  const cookie = ok.headers.get('set-cookie').split(';')[0];
  const h = { Cookie: cookie, 'Content-Type': 'application/json' };

  const html = (await fetch(`${base}/`, { headers: h })).status;
  assert.equal(html, 200);
  assert.equal((await fetch(`${base}/lib/costs.js`, { headers: h })).status, 200);
  assert.equal((await fetch(`${base}/lib/store.js`, { headers: h })).status, 404);
  assert.equal((await fetch(`${base}/..%2F.env`, { headers: h })).status, 404);

  const imp = await (await fetch(`${base}/api/import/paste`, { method: 'POST', headers: h, body: JSON.stringify({ content: lbcPage([lbcAd(), lbcAd({ id: 5, price: 9000 })]) }) })).json();
  assert.equal(imp.created, 2);
  // re-import with a price drop → update + history
  const again = await (await fetch(`${base}/api/import/paste`, { method: 'POST', headers: h, body: JSON.stringify({ content: lbcPage([lbcAd({ price: 18500 })]) }) })).json();
  assert.equal(again.updated, 1);
  const st = await (await fetch(`${base}/api/state`, { headers: h })).json();
  const k = st.deals.find((d) => d.sourceId === '3114606705');
  assert.equal(k.price, 18500);
  assert.equal(k.priceHistory[0].price, 19300);

  const upd = await (await fetch(`${base}/api/deals/${k.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ ...k, status: 'shortlist' }) })).json();
  assert.equal(upd.status, 'shortlist');
  const exp = await (await fetch(`${base}/api/export`, { headers: h })).json();
  assert.equal(exp.deals.length, 2);
  assert.ok(fs.existsSync(path.join(dataDir, 'db.json')));
});
