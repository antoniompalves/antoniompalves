#!/usr/bin/env node
// Fetch leboncoin searches/ads into the local Vroom.pt data file.
//   node bin/fetch-leboncoin.js "https://www.leboncoin.fr/recherche?category=2&…" [more urls]
//   node bin/fetch-leboncoin.js --list data/searches.txt      (one URL per line, # comments) — good for a cPanel cron job
//   node bin/fetch-leboncoin.js --file saved-page.html         (parse a page you saved from the browser)
// Leboncoin often blocks servers (HTTP 403). Set FIRECRAWL_API_KEY (in .env) to fetch through Firecrawl.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../src/store.js';
import { fetchLeboncoin, parseLeboncoinHtml } from '../src/leboncoin.js';
import { loadEnv } from '../src/env.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnv(path.join(ROOT, '.env'));
const store = new Store(path.resolve(ROOT, process.env.DATA_DIR || 'data'));
const args = process.argv.slice(2);
if (!args.length) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 7).join('\n').replace(/^\/\/ ?/gm, '')); process.exit(1); }

const urls = [], files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--list') urls.push(...fs.readFileSync(args[++i], 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
  else if (args[i] === '--file') files.push(args[++i]);
  else urls.push(args[i]);
}
let created = 0, updated = 0, failed = 0;
const save = (deals) => { for (const d of deals) store.upsert(d).created ? created++ : updated++; };
for (const f of files) { const deals = parseLeboncoinHtml(fs.readFileSync(f, 'utf8')); console.log(`${f}: ${deals.length} ads`); save(deals); }
for (const u of urls) {
  try { const deals = await fetchLeboncoin(u, { log: (m) => console.log(`  ${m}`) }); console.log(`${u}: ${deals.length} ads`); save(deals); }
  catch (e) { failed++; console.error(`${u}: ${e.message}`); }
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500)); // be polite
}
console.log(`Done: ${created} new, ${updated} updated, ${failed} failed.`);
process.exit(failed && !created && !updated ? 2 : 0);
