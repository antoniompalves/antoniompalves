#!/usr/bin/env node
// Builds dist/vroom-pt.zip from app/ (without data) — upload it in cPanel File Manager and Extract.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
fs.mkdirSync('dist', { recursive: true });
fs.rmSync('dist/vroom-pt.zip', { force: true });
execFileSync('zip', ['-qr', '../dist/vroom-pt.zip', '.', '-x', 'data/db.json', 'data/auth.json', 'data/secrets.json', 'data/attempts.json', 'data/.lock', 'data/sessions/*', 'data/backups/*', 'config.php'], { cwd: 'app', stdio: 'inherit' });
console.log('Created dist/vroom-pt.zip');
