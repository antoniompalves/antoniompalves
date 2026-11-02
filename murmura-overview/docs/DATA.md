# Data, backups, the archive and light media

Kataru is built to stay small on the server: it keeps light copies of media,
moves old items out of the live workspace, and saves compressed backups.
Account menu → **Data & backups** (needs **Workspace settings**).

## Backups and export

- **Nightly backups** (server): once a day, whichever app process gets there
  first, the whole workspace is saved gzip-compressed in the database
  (`kt_backups`). Kept: the last 7 nights, 4 Sundays and 10 made by hand
  (**Back up now**). Each can be downloaded (JSON).
- **Restore** (owner only): from the list, or from a downloaded file. People
  and roles stay as they are now (they go with the sign-in accounts); a copy of
  the current state is saved first ("Before a restore"), so a restore can be undone.
- **Download everything**: the live workspace and the whole archive, one JSON
  file, written as it's read (no big copy in memory).
- **Spreadsheets (CSV)**: posts (with results), conversations, ideas, team,
  creator deliverables.
- The demo: **Download a copy** of what's in this browser, and restore it from
  the file (into another browser, or later).

## The archive

Every night, after the backup, items older than the archive period (1 year by
default; 6 months, 2 years or never in the dialog) leave the live workspace for
`kt_archive`, one row each, so everyone's app loads and syncs less:

| Moves | When |
| --- | --- |
| Published posts (not evergreen ones; drafts and scheduled posts never) | published before the cut-off |
| Closed conversations | last message before the cut-off |
| Mentions not turned into conversations | before the cut-off |
| Activity and notifications | before the cut-off |
| Declined ideas, ideas whose post is archived | suggested before the cut-off |
| Creator campaigns, with their deliverables | ended before the cut-off |

Nothing is deleted: the **Archive** tab searches it (text, kind), anyone sees the
archived items of their brands, and **Bring back** (Workspace settings) returns
an item to the live workspace. **Archive now** runs it straight away. The rules
are in `src/data/archive.ts`, the storage in `server/workspace/archive.ts`.

## Light media

When someone adds a photo or a video (composer → Media → **Upload**), their
browser, not the server, makes the copy Kataru keeps:

- a photo becomes a WebP (JPEG where WebP isn't available) of at most about
  **100 KB**, up to 1600 px on its long side, smaller only if needed;
- a video (a reel, a short) keeps **only its cover**: a frame a second in, at
  the same ≤ 100 KB.

That copy is what the library, previews and calendar show. The full file goes
to the server only when posts are published from Kataru (accounts connected in
the publishing service), and only for as long as it takes: an original is
deleted two days after the last post using it is out (or failed for good), or
after `PUBLISHER_KEEP_ORIGINAL_DAYS` (30) if it was never scheduled. Light
copies are capped at 300 KB on the server and never resized there, so uploads
cost no server CPU. **Storage** in the dialog shows the live workspace, light
copies, originals waiting, the archive and backups, and how much was not stored
thanks to the light copies (e.g. a 6.6 MB photo kept as 94 KB).

In the demo, light copies are kept inside the browser's own save.
