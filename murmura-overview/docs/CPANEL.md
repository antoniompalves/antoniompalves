# Putting Kataru on cPanel

Kataru runs on cPanel hosting **when the host offers "Setup Node.js App"**
(CloudLinux's Node.js Selector, running apps with Phusion Passenger) and MySQL,
which most business cPanel plans include. One Node app serves everything: the
app, sign-in, the shared workspace and publishing, at one address, with the data
in a MySQL database.

Look for **Setup Node.js App** in cPanel's Software section. Without it, cPanel
can only host the demo (the `dist` folder as a static site); the accounts need a
host that runs Node (a small VPS, or a Node host with MySQL).

What's needed:

- Node.js 18.17 or newer (pick 20 or 22 when offered)
- a MySQL or MariaDB database (cPanel → MySQL Databases)
- a domain or subdomain with SSL (AutoSSL is fine), e.g. `kataru.example.com`
- optionally an email account for invitations and password resets

## 1. Build the package

On your computer, in the project:

```bash
npm ci
npm run build:cpanel
```

This makes `deploy/kataru/` (and `deploy/kataru.zip`):

| | |
| --- | --- |
| `app.js` | the startup file: reads `.env`, starts the server |
| `server.mjs` | the server, bundled into one file |
| `public/` | the app |
| `package.json` | one dependency, the MySQL driver |
| `.env.example` | the settings to fill in |

## 2. Create the database

cPanel → **MySQL Databases**:

1. Create a database, e.g. `kataru` (cPanel names it `cpuser_kataru`).
2. Create a user with a strong password (`cpuser_kataru`).
3. **Add user to database** with **All privileges**.

The tables are created when Kataru first starts.

## 3. Upload

cPanel → **File Manager**: upload `kataru.zip` to your home folder (not inside
`public_html`) and **Extract** it into a folder, e.g. `/home/cpuser/kataru`.
Keeping it outside `public_html` keeps `.env` and the data off the web.

## 4. Create the Node.js app

cPanel → **Setup Node.js App** → **Create application**:

| | |
| --- | --- |
| Node.js version | 20 or 22 |
| Application mode | Production |
| Application root | `kataru` (the folder from step 3) |
| Application URL | `kataru.example.com` (or a path such as `example.com/kataru`) |
| Application startup file | `app.js` |

Create it, then **Run NPM Install** (installs the MySQL driver).

## 5. Settings

In the app folder, copy `.env.example` to `.env` and fill it in (File Manager →
Edit), or enter the same names under **Environment variables** in the app's page
(those win over `.env`). At least:

```bash
KATARU_PUBLIC_URL=https://kataru.example.com
KATARU_SECRET=…                 # 32+ random characters; keep a copy somewhere safe
DATABASE_URL=mysql://cpuser_kataru:PASSWORD@localhost:3306/cpuser_kataru
KATARU_STATIC_DIR=./public
KATARU_SETUP_CODE=…             # anything; asked once on the setup screen
```

- For the secret, `openssl rand -base64 32` (or any password generator, 32+ characters).
- If the password has `@`, `:` or `/`, write them as `%40`, `%3A`, `%2F` in `DATABASE_URL`.
- If MySQL only listens on a socket: `mysql://user:pass@localhost/db?socket=/var/lib/mysql/mysql.sock`.
- Under a path (Application URL `example.com/kataru`): `KATARU_PUBLIC_URL=https://example.com`
  and `KATARU_BASE_PATH=/kataru`.

Email (invitations, password resets), with a mailbox from cPanel → Email Accounts:

```bash
SMTP_URL=smtps://no-reply%40example.com:MAILBOX_PASSWORD@mail.example.com:465
MAIL_FROM=Kataru <no-reply@example.com>
```

Single sign-on and the networks' keys are optional; see [`ACCOUNTS.md`](ACCOUNTS.md)
and [`PUBLISHING.md`](PUBLISHING.md).

**Restart** the app after any change.

## 6. Set up the workspace

Open `https://kataru.example.com`. **Set up Kataru** asks for the setup code, the
company, its brands (or the sample data to try things first), and you. You're the
owner; invite the team from the account menu → **Team & access**.

If you left `KATARU_SETUP_CODE` empty, the code is in the app's log: `stderr.log`
in the app folder (or the app page's log, depending on the host).

## 7. Keep it awake (scheduled posts)

Passenger stops an app that gets no visits for a while, and scheduled posts go out
from the running app. cPanel → **Cron Jobs**, every 5 minutes:

```
*/5 * * * * curl -fsS https://kataru.example.com/health > /dev/null
```

(Under a path, `https://example.com/kataru/health`.)

## Updating

Build again (`npm run build:cpanel`), upload `server.mjs` and the `public` folder
over the old ones (or the whole zip, keeping your `.env`), and **Restart**. The
data stays in the database; new tables are added on start.

## When something's wrong

| | |
| --- | --- |
| "Incomplete response" or 503 | Open `stderr.log` in the app folder. Usually a missing `KATARU_SECRET`, a wrong `DATABASE_URL`, or NPM Install not run. |
| `Access denied for user` | The user isn't added to the database, or the password in `DATABASE_URL` needs `%`-encoding. |
| Links in emails point to the wrong place | `KATARU_PUBLIC_URL` (and `KATARU_BASE_PATH` under a path). |
| Changes from others take a few seconds | The host buffers live connections; the app notices and checks every 5 seconds instead. Nothing to fix. |
| Signed out after every visit | Open the `https://` address in `KATARU_PUBLIC_URL`: over plain `http` the sign-in cookie isn't sent. |
| Lost the owner's phone and recovery codes | Another admin can turn two-step off for you (Team & access). If you are the only admin, clear it in phpMyAdmin: `UPDATE kt_users SET totp_secret = NULL, recovery = NULL WHERE email = 'you@…'`. |

Passenger may run more than one copy of the app; Kataru keeps them in step through
the database, so nothing needs configuring for that.

## Backups

cPanel → **Backup** (or phpMyAdmin → Export) covers the database; also keep `.env`
(above all `KATARU_SECRET`) and, if you publish to the networks, the app's `data`
folder.
