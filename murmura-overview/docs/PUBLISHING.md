# Publishing to Meta, LinkedIn, TikTok and YouTube

Kataru's composer, calendar and approvals have so far worked on demo data: a
"published" post never left the browser. This document reviews what real
publishing needs and describes the connectors that now exist for it:

- **Meta** — Facebook Pages and Instagram professional accounts (one sign-in), and **Threads** (its own sign-in)
- **LinkedIn** — a member's profile, and Company Pages once LinkedIn approves it
- **TikTok** — videos and photo posts, posted directly
- **YouTube** — video uploads

Everything below was checked against each network's developer documentation in
October 2026. These APIs change often; the version numbers sit in one place
(`server/.env`).

## Why a server

Posting can't happen from the browser alone:

| Need | Why |
| --- | --- |
| App secrets | Every network exchanges the sign-in code for a token with a client secret, which can't ship in a web page. |
| Cross-origin calls | LinkedIn's and TikTok's APIs don't accept calls from browsers. |
| Scheduling | A post scheduled for 9:00 tomorrow has to go out with every browser closed. |
| Tokens | Tokens must be kept (encrypted) and refreshed: TikTok's last 24 hours, Threads' 60 days, LinkedIn's 60 days. |
| Public media | Meta and Threads fetch photos and videos from a public URL; TikTok photo posts come from a verified domain. |

So the integration is a small service in this repository, `server/`, plus a
client for the app, `src/data/publisher.ts`. It has no dependencies beyond
Node 22 (which runs its TypeScript directly).

```
 Kataru (browser)                         Publishing service (server/)                 Networks
 ────────────────                         ────────────────────────────                 ────────
 Connect a channel ──POST /api/connect──▶ sign-in URL + state ──popup──────────────▶  Facebook / Threads /
                    ◀──postMessage──────── /auth/<provider>/callback ◀── code ──────  LinkedIn / TikTok / Google
                                           exchange · long-lived token · accounts
                                           store (AES-256-GCM, one file)
 Publish / Schedule ──POST /api/posts────▶ rules per network → jobs
                                           scheduler (15 s): refresh token → publish ─▶ Graph / Posts / Content
                    ◀──GET /api/posts/:id── status, link, error                         Posting / Data API
 Photos & videos ───POST /api/media──────▶ /media/<id> (public, unguessable) ◀── fetched by Meta / TikTok
```

## Running it

```bash
cp server/.env.example server/.env      # fill in (see below)
npm run publisher                       # http://localhost:8787 (PUBLISHER_PORT)
npm run test:publisher                  # 37 tests against mocked network APIs
npm run typecheck                       # app + server
```

| Variable | |
| --- | --- |
| `PUBLISHER_PUBLIC_URL` | The service's public HTTPS address. Each network's redirect URI is `<PUBLISHER_PUBLIC_URL>/auth/<meta\|threads\|linkedin\|tiktok\|youtube>/callback`. |
| `PUBLISHER_APP_ORIGIN` | Kataru's origin(s). Only these get CORS and the sign-in result. |
| `PUBLISHER_API_KEY` | What the app sends as `Authorization: Bearer …` (24+ characters). |
| `PUBLISHER_SECRET` | Encrypts the store (32+ characters). Losing it means connecting every account again. |
| `PUBLISHER_DATA_DIR` | Where the encrypted store and uploaded media live. Put it on a persistent volume and back it up. |
| per network | `META_*`, `THREADS_*`, `LINKEDIN_*`, `TIKTOK_*`, `GOOGLE_*`; a network without credentials is reported as off by `/health`. |

Deploy it as **one** instance (the store is a single file it owns) behind
HTTPS. The service refuses to start without the API key and the secret.

### API

| | |
| --- | --- |
| `GET /health` | `{ ok, version, providers: { meta, threads, linkedin, tiktok, youtube } }` — which sign-ins are configured |
| `POST /api/connect/:provider` | `{ url }` to open in a popup; the callback page posts `{ type: 'kataru:publisher', ok, accounts }` back to the app |
| `GET /api/accounts` | Pages, profiles and channels that can be posted to, with their sign-in status (never tokens) |
| `DELETE /api/connections/:id` | Forget a sign-in; its scheduled posts are cancelled |
| `POST /api/media` | Raw body (JPEG, PNG, WebP, GIF, MP4, MOV, WebM) → `{ id, url }` |
| `POST /api/posts` | `{ accountIds, post, publishAt?, ref? }` → `202 { batchId, jobs }`, or `422` with what each network would refuse |
| `GET /api/posts/:batchId`, `GET /api/jobs?status=&ref=` | Job status: `scheduled → publishing → (processing) → published \| failed \| canceled`, with the post's link or the error |
| `DELETE /api/jobs/:id` | Cancel a scheduled job |
| `GET /api/tiktok/:accountId/creator` | The creator's name, avatar and allowed audiences, which TikTok requires the composer to show |

Request and response types: `src/data/publishing.ts` (shared by the app and
the service).

### What happens to a post

1. **Checked first.** `server/rules.ts` rejects what a network would refuse (no photo for Instagram, more than 500 characters for Threads, no audience picked for TikTok, not exactly one video for YouTube…) before anything is sent, so a post doesn't go out on two networks and fail on the third.
2. **One job per account.** Due now: published immediately; later: picked up by the scheduler (every 15 s, one at a time, oldest first).
3. **Fresh token.** A token that lapses within 5 minutes is refreshed first. Once an hour, sign-ins lapsing within a week are refreshed or flagged `expiring`.
4. **Published.** Each connector follows its network's flow (below) and records the post's id and link.
5. **Failures.** Network hiccups and server errors retry after 1, 5 and 15 minutes; rate limits after an hour; a revoked or expired sign-in marks the connection `expired`. Errors are sorted into `auth`, `permission`, `rate_limit`, `invalid`, `media`, `transient`.
6. **No double posts.** If Instagram or Threads answers the final "publish" call with an error, the container is asked whether it went out before anything is retried.

## Meta: Facebook Pages and Instagram

**Connector:** `server/providers/meta.ts` · Graph API `v26.0` (`META_GRAPH_VERSION`)

**Set up**
1. [developers.facebook.com](https://developers.facebook.com/apps) → Create app → type **Business**.
2. Add **Facebook Login for Business**. Valid OAuth redirect URI: `<PUBLISHER_PUBLIC_URL>/auth/meta/callback`. Optionally create a Login configuration with the permissions below and set its id as `META_CONFIG_ID`.
3. Add the **Instagram** product → *API setup with Facebook login*.
4. Copy the App ID and App Secret to `META_APP_ID` / `META_APP_SECRET`.

**Permissions requested:** `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments` (first comment). People whose Page access comes through a Business Manager may also need `ads_management` / `ads_read` (Meta's note).

**Before real customers:** in development mode only people with a role on the app can connect. Everyone else needs **Advanced Access** for each permission through **App Review** (screencast of the flow, privacy policy, data deletion URL), and Meta generally asks for **Business Verification**. Instagram accounts linked to a Page that requires **Page Publishing Authorization** can't be posted to until it's done.

**Sign-in:** code → short-lived user token → long-lived user token (~60 days, `fb_exchange_token`) → `GET /me/accounts`: each Page with the *Create content* task and its Page token, plus the linked Instagram professional account. Page tokens derived this way have no expiry of their own; Meta has no refresh, so the connection shows `expiring` near day 60 and stays usable until the person loses access.

| Facebook post | Calls |
| --- | --- |
| Text (+ link card) | `POST /{page}/feed` `message`, `link` |
| One photo | `POST /{page}/photos` `url`, `message` |
| Several photos | `POST /{page}/photos` `published=false` each, then `POST /{page}/feed` with `attached_media[]` |
| Video | `POST graph-video…/{page}/videos` `file_url`, `description` |

| Instagram post | Calls |
| --- | --- |
| Quota check | `GET /{ig}/content_publishing_limit` — 100 API posts per account per 24 h (a carousel counts once) |
| Photo | `POST /{ig}/media` `image_url`, `caption`, `alt_text` → container |
| Video | `media_type=REELS`, `video_url`, `share_to_feed` |
| Carousel (2–20) | a container per item with `is_carousel_item`, then `media_type=CAROUSEL`, `children` |
| Wait | `GET /{container}?fields=status_code` until `FINISHED` (videos take a while; containers expire after 24 h) |
| Publish | `POST /{ig}/media_publish` `creation_id`, then the first comment and the permalink |

Rules: Instagram needs media, accepts **JPEG photos only**, 2,200-character
captions, 30 hashtags. Media must be on a public server when Meta fetches it.

## Threads

**Connector:** `server/providers/threads.ts` · `graph.threads.com/v1.0`

**Set up:** in the same Meta app (or a new one) add the **Access the Threads API** use case. Redirect callback URL: `<PUBLISHER_PUBLIC_URL>/auth/threads/callback`. Its *Threads App ID* and *Threads App secret* go in `THREADS_APP_ID` / `THREADS_APP_SECRET` (they differ from the Facebook ones).

**Permissions:** `threads_basic`, `threads_content_publish`. During development only people added as **Threads testers** (and who accept the invite in Threads) can connect; public use needs App Review.

**Tokens:** one hour → exchanged for 60 days (`th_exchange_token`) → refreshed (`th_refresh_token`) once at least a day old; the service does it in its hourly sweep.

| Threads post | Calls |
| --- | --- |
| Quota | `GET /{user}/threads_publishing_limit` — 250 posts per 24 h |
| Text (+ link card) | `POST /{user}/threads` `media_type=TEXT`, `text`, `link_attachment` |
| Photo / video | `media_type=IMAGE` + `image_url` (+ `alt_text`) / `VIDEO` + `video_url` |
| Carousel (2–20) | children with `is_carousel_item`, then `CAROUSEL` + `children` |
| Wait, publish | `GET /{container}?fields=status` until `FINISHED`, then `POST /{user}/threads_publish` `creation_id` |

Rules: 500 characters, up to 5 links. Images JPEG/PNG up to 8 MB; video MP4/MOV up to 1 GB and 5 minutes.

## LinkedIn

**Connector:** `server/providers/linkedin.ts` · versioned API `/rest`, `LinkedIn-Version: 202609` (`LINKEDIN_VERSION`)

**Set up**
1. [linkedin.com/developers](https://www.linkedin.com/developers/apps) → Create app (it must be associated with a LinkedIn Page you administer).
2. Products: **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn** (both self-serve) → scopes `openid`, `profile`, `w_member_social`.
3. Auth tab: redirect URL `<PUBLISHER_PUBLIC_URL>/auth/linkedin/callback`; Client ID/Secret → `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`.
4. **Company Pages:** request the **Community Management API** (an application reviewed by LinkedIn; it has to be the only product on its app). Once granted, set `LINKEDIN_ORGANIZATIONS=true`: the sign-in then also asks for `w_organization_social` and `r_organization_admin` and lists the Pages the person administers.

**Tokens:** 60 days. Refresh tokens (365 days) are only issued to approved partners; without one, people reconnect every 60 days — the connection shows `expiring` a week before.

| LinkedIn post | Calls |
| --- | --- |
| Text | `POST /rest/posts` `author` (`urn:li:person:…` or `urn:li:organization:…`), `commentary`, `visibility`, `distribution`, `lifecycleState=PUBLISHED`; the post URN comes back in `x-restli-id` |
| Link card | `content.article.source` + `title` |
| Photo(s) | per photo `POST /rest/images?action=initializeUpload` → `PUT` bytes to `uploadUrl` → `content.media` or `content.multiImage` (up to 20) |
| Video | `POST /rest/videos?action=initializeUpload` (`fileSizeBytes`) → `PUT` each byte range → `finalizeUpload` with the parts' ETags → wait for `AVAILABLE` → `content.media` |

Rules: 3,000 characters; one video on its own, or photos. The text is escaped
for LinkedIn's "little text" format (`( ) [ ] { } < > @ * _ ~ | \`), otherwise
text after a bracket can disappear; hashtags stay clickable. **Versions are
monthly and retire after about a year**: bump `LINKEDIN_VERSION` when LinkedIn
announces a sunset.

## TikTok

**Connector:** `server/providers/tiktok.ts` · Content Posting API, Direct Post

**Set up**
1. [developers.tiktok.com](https://developers.tiktok.com) → Manage apps → Connect an app; platform **Web**.
2. Products: **Login Kit** (redirect URI `<PUBLISHER_PUBLIC_URL>/auth/tiktok/callback`) and **Content Posting API** with **Direct Post** turned on.
3. Scopes: `user.info.basic`, `user.info.profile` (for the @handle in links), `video.publish`.
4. Client key/secret → `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`.
5. **Photo posts and pulled videos:** verify the URL prefix media is served from (e.g. `<PUBLISHER_PUBLIC_URL>/media/`) under *URL properties* and list it in `TIKTOK_PULL_PREFIXES`.
6. Submit the app for review, then the **Content Posting API audit**.

**Until the audit passes, every post is private** (`SELF_ONLY`) and TikTok
refuses public ones (`unaudited_client_can_only_post_to_private_accounts`).

**What the audit checks — the composer must do this before Kataru posts to TikTok:**
- show the creator's nickname and avatar from `GET /api/tiktok/:account/creator`, fetched for each post;
- let people pick the audience from the creator's allowed options, with **no default**;
- offer comment / duet / stitch switches (off when the creator disabled them) and say when the video is longer than the creator's maximum;
- ask about **commercial content** ("Your brand" / "Branded content") and show TikTok's music and branded-content confirmations;
- make it clear the post goes to TikTok once they press Post, and show its status afterwards.

The connector enforces the server side: audience required and checked against
the creator's options, the creator's interaction settings win.

**Tokens:** access 24 hours, refresh 365 days (the refresh token can change on each refresh; the new one is kept).

| TikTok post | Calls |
| --- | --- |
| Creator settings | `POST /v2/post/publish/creator_info/query/` before each post |
| Video, uploaded | `POST /v2/post/publish/video/init/` `source=FILE_UPLOAD`, size, chunks → `PUT upload_url` per chunk with `Content-Range` (10 MB chunks, the last takes the rest; under 5 MB in one) |
| Video, pulled | `source=PULL_FROM_URL`, `video_url` on a verified prefix |
| Photos (up to 35) | `POST /v2/post/publish/content/init/` `media_type=PHOTO`, `post_mode=DIRECT_POST`, `photo_images` (verified prefix), title ≤ 90 |
| Status | `POST /v2/post/publish/status/fetch/` until `PUBLISH_COMPLETE`; still processing → the job checks again every minute |

Public posts get a link once moderation makes them public; private ones never have one.

## YouTube

**Connector:** `server/providers/youtube.ts` · YouTube Data API v3

**Set up**
1. [console.cloud.google.com](https://console.cloud.google.com) → new project → enable **YouTube Data API v3**.
2. OAuth consent screen (External): scopes `…/auth/youtube.upload` and `…/auth/youtube.readonly`.
3. Credentials → OAuth client ID → *Web application*; redirect URI `<PUBLISHER_PUBLIC_URL>/auth/youtube/callback` → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. While the consent screen is in **Testing**, only listed test users can connect and their refresh tokens expire after 7 days. Publishing the app means **Google verification** (sensitive scopes).
5. Apply for the **YouTube API Services audit**: Google's revision history says uploads from projects created after 28 July 2020 stay **private** until it passes (the upload reference now says otherwise; the connector reports it when YouTube kept a video private).

**Quota:** since 1 June 2026, uploads have their own bucket — **100 uploads per project per day**, 1 unit each — separate from the 10,000 daily units for everything else. The quota is shared by every channel connected to the project.

**Sign-in:** authorization code with PKCE, `access_type=offline`, `prompt=consent` (so Google sends a refresh token), then `channels.list?mine=true`. Access tokens last an hour and are refreshed before each upload.

| YouTube post | Calls |
| --- | --- |
| Upload | `POST /upload/youtube/v3/videos?uploadType=resumable&part=snippet,status` with title, description, tags, category, `privacyStatus`, `selfDeclaredMadeForKids` → `PUT` the bytes to the session URL |

Rules: exactly one video; the title is `options.youtube.title` or the post's first line (100 characters, no `<` `>`); the description is the text (5,000 bytes). Vertical videos up to 3 minutes become Shorts on their own.

## Security

- The API needs the key; CORS and the sign-in result only go to `PUBLISHER_APP_ORIGIN`.
- Sign-ins use a one-time, 15-minute `state` (and PKCE for Google). The callback page posts the result to the app's origin only.
- Tokens are stored encrypted (AES-256-GCM) and never returned by the API.
- Uploaded media are public by design (networks fetch them) behind 128-bit random ids.
- The API key is shared by everyone using the app. Kataru's sign-in is still the demo's, so before real use put the service behind real authentication (an SSO proxy, or sessions tied to Kataru's own login) and give each workspace its own key.

## What the app does with it today, and next

The service and `src/data/publisher.ts` (connect in a popup, list accounts,
upload media, publish, schedule, follow jobs, TikTok creator info) are ready.
The app still runs on demo data; turning it on is the next step:

1. **Channels page** (in progress): an entry for the service's address and key, *Connect a channel* opening the network's sign-in, and each Kataru channel linked to a connected account.
2. **Composer**: "Publish now" and "Schedule" send to the service when a channel is linked; TikTok's fields (audience, interactions, commercial content) and YouTube's title, visibility and made-for-kids question.
3. **Calendar and overview**: job status and links from `GET /api/jobs?ref=<post id>`; failures land in *Needs you* with the network's message.
4. **Library**: uploads go to `POST /api/media` so networks can fetch them.

Not covered yet: X and Pinterest; Facebook Reels and Stories endpoints;
Instagram Stories and Instagram Login without a Facebook Page; LinkedIn
documents and polls; YouTube thumbnails and playlists; TikTok's "send to
drafts" mode and status webhooks; running more than one instance.

## Verification

`npm run test:publisher` runs 37 tests with every network mocked: request URLs,
headers and bodies are checked against the documented flows.

| Area | Checked |
| --- | --- |
| Meta | sign-in → long-lived token → Pages (only with *Create content*) and Instagram accounts; Facebook text + link, one photo, several photos, video; Instagram quota stop, Reel, carousel with a video still processing, first comment, an ambiguous publish error resolved from the container; error codes 190 and 4 |
| Threads | sign-in and token exchange; text + link card; carousel with alt text; refresh only after a day |
| LinkedIn | little-text escaping; member + Company Pages; image upload → post; multi-image; video byte ranges + ETags + finalize + processing wait; link card; no refresh token → reconnect |
| TikTok | chunk maths; sign-in; video upload with ranges and status polling; pulled video left processing; photo post; audience not allowed → refused before upload; unaudited error inside a 200 |
| YouTube | PKCE + offline sign-in; resumable upload with metadata; "kept private" explained; refresh keeps the refresh token |
| Service | sealed store (no plaintext tokens, wrong secret refused); rules; retries with backoff then failure; auth errors expire the connection; refresh before publishing; processing → check; HTTP: key, CORS, one-time state, popup message, media upload and serving, 422, publish now, schedule and cancel |

Nothing here has posted to a real account yet: that needs the apps above and
their credentials. Start with each network's test users (Meta app roles,
Threads testers, LinkedIn Share on LinkedIn, TikTok private posts, YouTube test
users) before going through the reviews.
