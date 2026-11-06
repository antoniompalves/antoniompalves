// Guards the contract between the browser code and api.php (a renamed header once broke every save).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/inc/bootstrap.php', 'utf8') + fs.readFileSync('app/api.php', 'utf8');
const front = { 'assets/app.js': fs.readFileSync('app/assets/app.js', 'utf8'), 'inc/bridge.html': fs.readFileSync('app/inc/bridge.html', 'utf8') };

test('browser sends exactly the security headers the server reads', () => {
  const serverHeaders = [...api.matchAll(/HTTP_(X_[A-Z_]+)/g)].map((m) => m[1].replace(/_/g, '-').toLowerCase());
  assert.ok(serverHeaders.includes('x-vroom') && serverHeaders.includes('x-vroom-token'));
  for (const [file, src] of Object.entries(front)) {
    const sent = [...src.matchAll(/'(X-[A-Za-z-]+)':/g)].map((m) => m[1].toLowerCase());
    assert.ok(sent.length, `${file} sends no X- headers`);
    for (const h of sent) assert.ok(serverHeaders.includes(h), `${file} sends ${h}, which api.php never reads`);
    assert.match(src, /[?&]t=/, `${file} must also send the token in the URL`);
  }
});

test('the token meta tag the pages inject is the one the browser reads', () => {
  const idx = fs.readFileSync('app/index.php', 'utf8') + fs.readFileSync('app/bridge.php', 'utf8');
  assert.equal((idx.match(/meta name="vroom-token"/g) || []).length, 2);
  for (const src of Object.values(front)) assert.match(src, /meta\[name="vroom-token"\]/);
});
