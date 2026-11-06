// End-to-end test of the PHP app (app/) through PHP's built-in web server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lbcAd, lbcPage } from './fixtures/make-lbc.js';

const PORT = 8100 + Math.floor(Math.random() * 800);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vroom-data-'));
const base = `http://127.0.0.1:${PORT}`;
let proc;
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

test.before(async () => {
  proc = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', 'app'], { env: { ...process.env, VROOM_DATA_DIR: dataDir }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`${base}/login.php`); return; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error('php server did not start');
});
test.after(() => { proc.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); });

async function form(url, fields, cookie = '') {
  return fetch(url, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie }, body: new URLSearchParams(fields) });
}
const csrfOf = (html) => html.match(/name="csrf" value="([^"]+)"/)[1];

test('first-run password, login, import, update, ledger, export', async () => {
  assert.equal((await fetch(`${base}/api.php?r=state`)).status, 401);
  assert.equal((await fetch(`${base}/index.php`, { redirect: 'manual' })).headers.get('location'), 'login.php');

  // first use: choose password
  let r = await fetch(`${base}/login.php`);
  let cookie = r.headers.get('set-cookie').split(';')[0];
  let html = await r.text();
  assert.match(html, /Primeira utilização/);
  r = await form(`${base}/login.php`, { csrf: csrfOf(html), password: 'segredo123', password2: 'segredo123' }, cookie);
  assert.equal(r.status, 302);
  assert.ok(fs.existsSync(path.join(dataDir, 'auth.json')));
  assert.ok(!fs.readFileSync(path.join(dataDir, 'auth.json'), 'utf8').includes('segredo123'), 'password must be hashed');

  // log out, wrong password, right password
  await fetch(`${base}/logout.php`, { headers: { Cookie: cookie }, redirect: 'manual' });
  r = await fetch(`${base}/login.php`); cookie = r.headers.get('set-cookie').split(';')[0]; html = await r.text();
  r = await form(`${base}/login.php`, { csrf: csrfOf(html), password: 'errada' }, cookie);
  assert.match(await r.text(), /Palavra-passe errada/);
  r = await form(`${base}/login.php`, { csrf: csrfOf(html), password: 'segredo123' }, cookie);
  assert.equal(r.status, 302);
  cookie = (r.headers.get('set-cookie') || '').split(';')[0] || cookie;
  const h = { Cookie: cookie, 'Content-Type': 'application/json', 'X-Vroom': '1' };

  assert.equal((await fetch(`${base}/index.php`, { headers: h })).status, 200);
  // CSRF: a write without any proof is refused…
  assert.equal((await fetch(`${base}/api.php?r=deals`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  // …and from another site even with the header
  assert.equal((await fetch(`${base}/api.php?r=deals`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Vroom': '1', Origin: 'https://evil.example' }, body: '{"title":"x"}' })).status, 403);
  // the token works even when a host strips custom headers (sent in the URL)
  const page = await (await fetch(`${base}/index.php`, { headers: { Cookie: cookie } })).text();
  const token = page.match(/name="vroom-token" content="([a-f0-9]+)"/)[1];
  assert.equal((await (await fetch(`${base}/api.php?r=state`, { headers: { Cookie: cookie } })).json()).csrf, token);
  const viaToken = await fetch(`${base}/api.php?r=deals&t=${token}`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{"title":"token test"}' });
  assert.equal(viaToken.status, 201);
  const tokDeal = await viaToken.json();
  // same-site Origin alone is also accepted (browsers always send it on POST)
  assert.equal((await fetch(`${base}/api.php?r=deals/${tokDeal.id}&_method=DELETE`, { method: 'POST', headers: { Cookie: cookie, Origin: base } })).status, 200);
  assert.equal((await fetch(`${base}/api.php?r=deals&t=wrongtoken`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);

  const imp = await (await fetch(`${base}/api.php?r=import/paste`, { method: 'POST', headers: h, body: JSON.stringify({ content_b64: b64(lbcPage([lbcAd(), lbcAd({ id: 5, price: 9000 })])) }) })).json();
  assert.equal(imp.created, 2);
  const again = await (await fetch(`${base}/api.php?r=import/paste`, { method: 'POST', headers: h, body: JSON.stringify({ content_b64: b64(lbcPage([lbcAd({ price: 18500 })])) }) })).json();
  assert.equal(again.updated, 1);
  let st = await (await fetch(`${base}/api.php?r=state`, { headers: h })).json();
  const k = st.deals.find((d) => d.sourceId === '3114606705');
  assert.equal(k.price, 18500);
  assert.equal(k.priceHistory[0].price, 19300);
  assert.equal(Array.isArray(k.overrides), false, 'empty objects must stay objects');

  const upd = await (await fetch(`${base}/api.php?r=deals/${k.id}&_method=PUT`, { method: 'POST', headers: h, body: JSON.stringify({ ...k, status: 'shortlist', overrides: { flight: 99 } }) })).json();
  assert.equal(upd.status, 'shortlist');
  assert.equal(upd.overrides.flight, 99);

  const led = await (await fetch(`${base}/api.php?r=ledger&_method=PUT`, { method: 'POST', headers: h, body: JSON.stringify({ general: [{ type: 'other', amount: 60, payer: 'Caixa' }], settlements: [] }) })).json();
  assert.equal(led.general[0].amount, 60);

  // receipts: upload, serve only when logged in, reject unsafe types, removed with the deal
  const up = async (name, type, bytes) => { const fd = new FormData(); fd.append('file', new Blob([bytes], { type }), name); return fetch(`${base}/api.php?r=receipts`, { method: 'POST', headers: { Cookie: cookie, 'X-Vroom': '1' }, body: fd }); };
  const pdf = await (await up('Fatura IPO.pdf', 'application/pdf', '%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF')).json();
  assert.match(pdf.id, /^[a-f0-9]{24}$/);
  assert.equal(pdf.mime, 'application/pdf');
  assert.equal(pdf.name, 'Fatura IPO.pdf');
  const svg = await up('x.svg', 'image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal(svg.status, 400);
  assert.equal((await up('x.pdf', 'application/pdf', 'MZ not really a pdf')).status, 400, 'type is checked from the content, not the name');
  assert.equal((await fetch(`${base}/api.php?r=receipts`, { method: 'POST', headers: { Cookie: cookie }, body: new FormData() })).status, 403, 'CSRF header required');
  const got = await fetch(`${base}/api.php?r=receipt&id=${pdf.id}`, { headers: { Cookie: cookie } });
  assert.equal(got.status, 200);
  assert.equal(got.headers.get('content-type'), 'application/pdf');
  assert.match(await got.text(), /^%PDF/);
  assert.equal((await fetch(`${base}/api.php?r=receipt&id=${pdf.id}`)).status, 401, 'not without login');
  assert.equal((await fetch(`${base}/api.php?r=receipt&id=../auth`, { headers: { Cookie: cookie } })).status, 404);
  const target = st.deals[1];
  await fetch(`${base}/api.php?r=deals/${target.id}&_method=PUT`, { method: 'POST', headers: h, body: JSON.stringify({ ...target, expenses: [{ type: 'inspection', amount: 100, payer: 'Tono', receipts: [pdf] }] }) });
  assert.ok(fs.readdirSync(path.join(dataDir, 'receipts')).some((f) => f.startsWith(pdf.id)));

  const del = await fetch(`${base}/api.php?r=deals/${st.deals[1].id}&_method=DELETE`, { method: 'POST', headers: h });
  assert.ok(!fs.readdirSync(path.join(dataDir, 'receipts')).some((f) => f.startsWith(pdf.id)), 'receipt file removed with the deal');
  assert.equal(del.status, 200);
  const exp = await (await fetch(`${base}/api.php?r=export`, { headers: h })).json();
  assert.equal(exp.deals.length, 1);
  assert.equal(exp.ledger.general.length, 1);
  assert.ok(fs.existsSync(path.join(dataDir, 'db.json')));
});
