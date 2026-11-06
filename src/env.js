// Minimal .env loader (KEY=value per line) so cPanel users can configure without the env-var UI.
import fs from 'node:fs';
export function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
