#!/usr/bin/env node
// Builds dist/vroom-pt.tar.gz with only what the server needs (upload & extract in cPanel File Manager).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const files = ['app.js', 'server.cjs', 'package.json', 'src', 'public', 'bin', '.env.example', 'DEPLOY-CPANEL.md', 'README.md'];
fs.mkdirSync('dist', { recursive: true });
execFileSync('tar', ['-czf', 'dist/vroom-pt.tar.gz', ...files.filter((f) => fs.existsSync(f))], { stdio: 'inherit' });
console.log('Created dist/vroom-pt.tar.gz');
