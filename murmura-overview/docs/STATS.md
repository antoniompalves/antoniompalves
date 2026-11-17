# Numbers from the post's link

When a post is published, paste the link to the live post. You can do this in
**Mark as published**, or later in the post's **Numbers** panel. A creator's
deliverable takes its link in **Results**. Kataru then reads the post's
numbers from the network and keeps them up to date.

## What can be read

| Network | Brand's own account (connected) | Anyone else's post (creators) |
|---|---|---|
| Instagram | views, reach, likes, comments, shares, saves | likes and comments, for professional accounts, using the creator's handle |
| Facebook (Page) | views, reach, reactions, comments, shares | — |
| Threads | views, likes, replies, reposts + quotes + shares | — |
| TikTok | views, likes, comments, shares (no reach) | — |
| YouTube | views, likes, comments | the same, for any public video |
| LinkedIn, X, Pinterest | not read: log them by hand | — |

"Own account" means an account connected on **Channels**, which uses the same
sign-ins as publishing ([PUBLISHING.md](PUBLISHING.md)). Kataru looks for the
post among each account's 200 most recent posts. Once it finds the post, it
remembers it. Posts that Kataru published itself are found straight away.

YouTube needs `YOUTUBE_API_KEY` on the server: a free YouTube Data API v3 key
from Google Cloud. If the key is missing but a channel is connected, the
channel is used instead.

Metric names follow the APIs as of late 2026:

- **Instagram**: `views` (which replaced impressions and plays), `reach`,
  `likes`, `comments`, `shares`, `saved`.
- **Facebook**: `post_media_view` and `post_total_media_view_unique`, which
  replaced `post_impressions*`.
- **Threads**: its media insights.
- **TikTok**: the Video Query API.

A value the network doesn't give is left blank, not shown as 0.

## How often

| Age of the post | Reads |
|---|---|
| first 2 days | every hour |
| up to 30 days | once a day |
| after 30 days | none: the numbers barely move, and each read counts against the networks' limits |

The server checks every 10 minutes and reads at most 30 posts each time.

**Refresh now** reads a post straight away, up to 6 times in 10 minutes. The
latest numbers are kept on the post. They also fill its metrics, or a
deliverable's results, so the Creators page and Analytics use them.

Once a day, a snapshot of the numbers goes into the `kt_stats` table. These
snapshots draw the "views per day" curve in the panel.

## By hand

**Log by hand** in the panel saves numbers typed from the network's insights,
marked "logged by hand". You can only do this for posts on brands you work on,
and your role needs post, analytics or creators permissions. Numbers typed by
hand are never overwritten by the hourly or daily reads. **Refresh now** reads
the link again.

## When a read fails

The panel says why:

- the link isn't a post Kataru recognises;
- the network isn't read;
- the post isn't on a connected account and the network has no public numbers
  for it;
- the post wasn't found;
- the connection expired or lacks the insights permission (reconnect it);
- the network didn't answer (Kataru tries again later);
- YouTube has no key.

The last numbers that were read stay shown.

Connections made before this feature lack the insights permissions. Connect
them again on Channels so the networks ask for the new permissions. Meta and
TikTok grant these permissions to the public only after App Review.

## API

- `POST /api/stats/{post|deliverable}/{id}/refresh` reads the link now and
  returns `{ stats }`.
- `GET /api/stats/{post|deliverable}/{id}` returns `{ days: [{ day, views, reach, likes, … }] }`.
