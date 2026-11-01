# Accounts and the shared workspace

Kataru runs in one of two ways, from the same build:

| | Demo | Server |
| --- | --- | --- |
| Who | one person, in one browser | a company's team, each with their own sign-in |
| Data | saved in the browser (`kataru-workspace`) | one shared workspace in a database |
| Sign-in | pick anyone on the sample team | email and password, two-step codes, single sign-on |
| Changes by others | other tabs of the same browser | everyone's, live |

The app decides at start-up (`src/data/server.ts`): it asks `api/session` next
to the page. When the Kataru server (`server/`) serves the app, it answers and the
app runs in server mode; anywhere else (a static host, `npm run dev`) it is the
demo. `VITE_KATARU_API` overrides this at build time: an address
(`https://kataru.example.com`) when the app is hosted separately from the server,
or `off` to always build the demo.

One server is one company: one workspace, any number of brands. People are given
a role (what they may do) and brands (what they see).

To put it on shared hosting, see [`CPANEL.md`](CPANEL.md).

## Running it

```bash
cp server/.env.example server/.env   # set KATARU_SECRET at least
npm run build                         # the app, into dist/
KATARU_STATIC_DIR=dist npm run server # the server, serving the app: http://localhost:8787
```

Without `DATABASE_URL` it uses SQLite (`.publisher-data/kataru.db`, Node 22.13+).
For MySQL or MariaDB: `DATABASE_URL=mysql://user:password@localhost:3306/kataru`.

While working on the app, run the server as above and `npm run dev` with
`VITE_KATARU_API=http://localhost:8787` (the server must list
`http://localhost:5173` in `PUBLISHER_APP_ORIGIN`, which is the default).

## First run

The first visit shows **Set up Kataru**: the setup code, the company, its brands,
and you, who become the owner. The setup code is `KATARU_SETUP_CODE`, or, when
that's empty, a code the server prints in its log at start-up; it stops anyone who
finds the address first from taking the workspace. It is asked for once.

**Start with** offers your brands (an empty workspace) or the sample data: the
demo's five brands, posts, inbox and creators, with every date moved to today
(whole days, so weekdays and times of day stay) and you in the sample owner's
place. The sample's other people have no accounts; remove them or leave them as
examples.

Analytics start at zero in an empty workspace: until the networks report in
(live data is a separate step), the charts are flat and rates show 0.

## Signing in

- **Passwords**: at least 10 characters, not just one character repeated, not the
  email's name. Stored as scrypt hashes (N = 2¹⁵, r = 8, p = 1).
- **Sessions**: an `HttpOnly`, `SameSite=Lax` cookie (`Secure` over HTTPS), valid
  for 30 days and renewed while used. The database keeps only a SHA-256 of it.
  *Account & security* lists the devices signed in and signs any of them out.
- **Two-step verification**: codes from an authenticator app (TOTP, RFC 6238:
  6 digits, 30 seconds, one step of clock drift either way, each code works
  once), turned on by scanning a QR code; ten single-use recovery codes are
  shown once. The secret is sealed with `KATARU_SECRET` (AES-256-GCM).
  *Team & access → Sign-in → Require two-step verification* makes it
  compulsory: people without it are taken to turn it on, right away if they're
  signed in.
- **Single sign-on** (OpenID Connect, below): people with an account sign in with
  one click; matched by the provider's account, or the first time by their
  verified email. Two-step codes are left to the provider.
- **Forgotten password**: an emailed link (30 minutes, once). A new password signs
  every other device out. The form answers the same for unknown addresses.
- **Limits**: 10 wrong passwords per email, or 30 per address, in 15 minutes;
  8 wrong codes per person; 3 reset emails per address an hour. Then `429` with
  `Retry-After`.

## The team

*Team & access* (account menu; needs **Manage team** or **Workspace settings**):

- **Invite** with a name, email, role and brands (every brand, or some). They get
  an email with a link (7 days, once) to choose a password, or sign in with SSO.
  Without email set up, the link is shown to copy and send. Resending replaces
  the link; withdrawing removes the invitation.
- **Role and brands** change at once: their screens follow without reloading.
  Nobody can be given ownership here, the owner can't be changed or suspended,
  and nobody changes their own role or access.
- **Suspend** signs someone out everywhere and stops them signing in; their posts
  and history stay. **Reactivate** lets them back.
- **Copy a password reset link** for someone without email; **turn off two-step
  verification** for someone who lost both phone and recovery codes.
- **Brands**: add and rename (needs **Workspace settings**).

## How the shared workspace works

Everything a page changes is an action (`src/data/reducer.ts`), the same ones
the demo uses. In server mode:

1. The browser applies the action at once and sends it (`POST
   /api/workspace/actions`), several made together as one batch, one batch at a
   time, in order (`src/data/syncEngine.ts`).
2. The server checks it (`server/workspace/policy.ts`): the role must allow that
   kind of change (moving a post needs **Edit calendar**, closing a conversation
   **Reply in inbox**, and so on), and every item it touches must belong to a
   brand that person works on. Audit entries are stamped with who made them;
   people and roles change only through the team endpoints.
3. It is applied with the same reducer, stored as a numbered event, and sent to
   everyone connected as a patch of what changed, cut to the brands each person
   sees (`src/data/sync.ts`). A client never receives another brand's posts.
4. Refused changes are taken back on screen with a short explanation. While
   offline, changes wait and go when the connection is back (a batch lost on the
   way is sent again with the same id and applied once).

Undo puts back only the items an action changed (`revertOf`), so it never
undoes what a teammate did in the meantime.

Live updates use Server-Sent Events (`/api/workspace/stream`); when a proxy holds
the stream back, the app polls every 5 seconds instead. The whole workspace is
saved as a snapshot every few seconds (or every 50 changes); a restart loads it
and replays the events after it.

Several processes may run the app on one database (Passenger does this on
cPanel): event numbers are unique in the database, each process catches up
before changing anything, and, while someone is connected, every two seconds.

Still per workspace rather than per person: whether a notification was read.

## Single sign-on

Register Kataru with the provider as a web application with this redirect URI,
then set the variables and restart:

```
https://kataru.example.com/api/auth/sso/<google|microsoft|oidc>/callback
```

| Provider | Variables |
| --- | --- |
| Google Workspace | `KATARU_SSO_GOOGLE_CLIENT_ID`, `KATARU_SSO_GOOGLE_CLIENT_SECRET` (Google Cloud → APIs & Services → Credentials → OAuth client, Web application) |
| Microsoft Entra ID | `KATARU_SSO_MICROSOFT_TENANT` (your tenant ID or domain, not `common`), `KATARU_SSO_MICROSOFT_CLIENT_ID`, `KATARU_SSO_MICROSOFT_CLIENT_SECRET` |
| Any OpenID Connect provider (Okta, Auth0, Keycloak…) | `KATARU_SSO_OIDC_ISSUER`, `KATARU_SSO_OIDC_CLIENT_ID`, `KATARU_SSO_OIDC_CLIENT_SECRET`, `KATARU_SSO_OIDC_NAME` (the button's label) |

The sign-in uses the authorization code flow with PKCE, a one-time state and a
nonce; the ID token's signature (RS256 or ES256, keys from the provider's JWKS),
issuer, audience, expiry and nonce are checked. Google must say the email is
verified.

`KATARU_SSO_DOMAINS=lumen.pt,lumen.com` lets people with those addresses join
through SSO without an invitation, with `KATARU_SSO_ROLE` (default **Analyst**)
and every brand. Anyone else needs an invitation first. People can link or unlink
a provider from *Account & security*.

## Email

`SMTP_URL` and `MAIL_FROM` (see `server/.env.example`): `smtps://` for port 465,
`smtp://` for 587 with STARTTLS. The user name and password go in the URL, with
`@` written `%40`. Messages are sent in the language of whoever triggered them
(English or European Portuguese), as text and HTML. Without `SMTP_URL`, nothing
is sent: the message is written to the log and links are shown to copy.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `KATARU_SECRET` (or `PUBLISHER_SECRET`) | — | Required, 32+ characters. Seals two-step secrets and network tokens; keep it, or those can't be read. |
| `KATARU_PUBLIC_URL` (or `PUBLISHER_PUBLIC_URL`) | `http://localhost:8787` | Where the server is reached; links and SSO use it. |
| `DATABASE_URL` | `sqlite:<data dir>/kataru.db` | `sqlite:path` or `mysql://user:password@host:port/database` (`?socket=/path` for a socket). |
| `KATARU_STATIC_DIR` | — | The built app to serve (`dist`, or `./public` in the cPanel package). |
| `KATARU_BASE_PATH` | — | When the app lives under a path, e.g. `/kataru`. |
| `KATARU_APP_URL` | the public URL (+ base path) when serving the app | Where links in emails point. |
| `KATARU_SETUP_CODE` | printed in the log | Asked once, on the setup screen. |
| `KATARU_COOKIE_SECURE` | `true` over HTTPS | |
| `KATARU_TRUST_PROXY` | `true` under Passenger | Read the visitor's address from `X-Forwarded-For`, for the limits. |
| `KATARU_ACCOUNTS` | `on` | `off` runs only the publishing service. |
| `SMTP_URL`, `MAIL_FROM` | — | Email, above. |
| `KATARU_SSO_*` | — | Single sign-on, above. |
| `PUBLISHER_APP_ORIGIN` | `http://localhost:5173` | Other addresses the app may be opened from (CORS, with cookies). |
| `PUBLISHER_API_KEY` | — | Only for other services calling the publishing API; people signed in use their session. |
| `PORT` (or `PUBLISHER_PORT`) | `8787` | |

## API

All under `/api`. Changes need the header `X-Kataru: 1` (a site elsewhere can't
send it without asking first), and come from the app's own address or one in
`PUBLISHER_APP_ORIGIN`.

| | |
| --- | --- |
| `GET /session` | Setup needed?, company, SSO providers, email set up?, who is signed in |
| `POST /setup` | First run |
| `POST /auth/login` · `/auth/mfa` · `/auth/logout` | Sign in (then the code, when two-step is on), sign out |
| `POST /auth/forgot` · `/auth/reset` · `/auth/accept` | Reset link by email; new password from a link; accept an invitation |
| `GET /auth/link/{invite,reset}/:token` | Who a link is for, without using it |
| `GET /auth/sso/:provider/start` · `/callback` | Single sign-on |
| `GET /workspace` · `/workspace/changes?since=` · `/workspace/stream` | The workspace as you see it; changes since a version; live changes |
| `POST /workspace/actions` | Make changes `{ id, actions }` |
| `GET` · `PATCH /account` | Your account, devices and links; your name and title |
| `POST /account/password` · `/account/mfa/{start,confirm,disable,recovery}` · `/account/sessions/others` · `DELETE /account/sessions/:id` · `GET`/`DELETE /account/sso/:provider` | |
| `GET /team` · `POST /team/invite` · `PATCH`/`DELETE /team/:id` · `POST /team/:id/{resend,reset-link,mfa-off}` | Team & access |

The publishing endpoints (`docs/PUBLISHING.md`) accept a signed-in session too:
connecting accounts needs **Manage channels**, posting needs **Publish**.

## Backups

Everything lives in the database's `kt_*` tables (and, for publishing, the data
folder's sealed `store.sealed` and media). Back up the database (cPanel Backup or
phpMyAdmin export; for SQLite, copy the `.db` file with the server stopped) and
keep `KATARU_SECRET` somewhere safe.

## Tests

`npm run test:server` runs the server's tests, including the accounts flow end
to end (setup, sign-in, limits, two-step codes and recovery codes, invitations,
resets, brand-restricted access, live updates, restarts, two processes on one
database, SSO against a fake provider, SMTP against a fake mail server). With
`TEST_MYSQL_URL=mysql://user:password@127.0.0.1:3306/test_db` the same run
repeats on MySQL/MariaDB.
