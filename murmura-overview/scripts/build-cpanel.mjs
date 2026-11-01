// Builds a folder to upload to cPanel ("Setup Node.js App"): the app, the
// server bundled into one file, a startup file, and an example .env.
// `npm run build:cpanel` → deploy/kataru (and deploy/kataru.zip when `zip` exists).
// See docs/CPANEL.md.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'rolldown'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'deploy', 'kataru')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

console.log('1/4 Building the app…')
execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit' })

rmSync(join(root, 'deploy'), { recursive: true, force: true })
mkdirSync(out, { recursive: true })

console.log('2/4 Bundling the server…')
await build({
  input: join(root, 'server', 'index.ts'),
  platform: 'node',
  // The database drivers are installed on the server (npm install), not bundled.
  external: [/^mysql2(\/.*)?$/, /^node:/],
  transform: { target: 'node18' },
  output: { file: join(out, 'server.mjs'), format: 'esm', codeSplitting: false, banner: '// Kataru server, bundled by scripts/build-cpanel.mjs. Configure with .env (see .env.example).' },
  logLevel: 'warn',
})

console.log('3/4 Writing the startup file and package.json…')
cpSync(join(root, 'dist'), join(out, 'public'), { recursive: true })
writeFileSync(
  join(out, 'app.js'),
  `// Startup file for cPanel's "Setup Node.js App" (Phusion Passenger), or \`node app.js\`.
// Reads .env next to this file (variables set in cPanel win), then starts the server.
const fs = require('fs')
const path = require('path')
process.chdir(__dirname)
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\\r?\\n/)) {
    const m = line.match(/^\\s*(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*?)\\s*$/)
    if (!m || m[1] in process.env) continue
    let v = m[2]
    if (/^(['"]).*\\1$/.test(v)) v = v.slice(1, -1)
    else v = v.replace(/\\s+#.*$/, '')
    process.env[m[1]] = v
  }
} catch (e) {
  if (e.code !== 'ENOENT') throw e
}
import('./server.mjs').catch((e) => {
  console.error(e)
  process.exit(1)
})
`,
)
writeFileSync(
  join(out, 'package.json'),
  `${JSON.stringify(
    {
      name: 'kataru-server',
      version: pkg.version,
      private: true,
      description: 'Kataru: accounts, the shared workspace and publishing. Start with app.js.',
      main: 'app.js',
      scripts: { start: 'node app.js' },
      engines: { node: '>=18.17' },
      dependencies: { mysql2: pkg.dependencies.mysql2 },
    },
    null,
    2,
  )}\n`,
)
writeFileSync(
  join(out, '.env.example'),
  `# Kataru on cPanel: copy to .env (or enter these in "Setup Node.js App" → Environment variables).
# See docs/CPANEL.md and docs/ACCOUNTS.md.

# The address people open, without a trailing slash.
KATARU_PUBLIC_URL=https://kataru.example.com
# Encrypts two-step secrets and network tokens. At least 32 characters: openssl rand -base64 32
KATARU_SECRET=
# The MySQL database and user from cPanel → MySQL Databases (prefixed with your cPanel user).
DATABASE_URL=mysql://cpuser_kataru:PASSWORD@localhost:3306/cpuser_kataru
# The built app, served by the same Node app.
KATARU_STATIC_DIR=./public
# Asked once, on the setup screen. If empty, a code is printed in the app's log (stderr.log).
KATARU_SETUP_CODE=

# Email for invitations and password resets (a mailbox from cPanel → Email Accounts works).
# Encode @ in the user name as %40.
SMTP_URL=smtps://no-reply%40example.com:MAILBOX_PASSWORD@mail.example.com:465
MAIL_FROM=Kataru <no-reply@example.com>

# Optional single sign-on (docs/ACCOUNTS.md): Google Workspace, Microsoft Entra ID, or any OpenID provider.
# Redirect URI to register: https://kataru.example.com/api/auth/sso/<google|microsoft|oidc>/callback
KATARU_SSO_GOOGLE_CLIENT_ID=
KATARU_SSO_GOOGLE_CLIENT_SECRET=
KATARU_SSO_MICROSOFT_TENANT=
KATARU_SSO_MICROSOFT_CLIENT_ID=
KATARU_SSO_MICROSOFT_CLIENT_SECRET=
# People with these email domains may join through SSO without an invitation, with this role.
KATARU_SSO_DOMAINS=
KATARU_SSO_ROLE=analyst

# Publishing to the networks (docs/PUBLISHING.md); leave empty until you set up each network's app.
PUBLISHER_DATA_DIR=./data
META_APP_ID=
META_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
`,
)

console.log('4/4 Packing…')
let zipped = false
try {
  execFileSync('zip', ['-qr', '../kataru.zip', '.'], { cwd: out })
  zipped = true
} catch {
  /* no zip command: upload the folder, or compress it yourself */
}
console.log(`\nReady: deploy/kataru${zipped ? ' (and deploy/kataru.zip)' : ''}. Next steps: docs/CPANEL.md`)
if (!existsSync(join(out, 'public', 'index.html'))) throw new Error('The app build is missing')
