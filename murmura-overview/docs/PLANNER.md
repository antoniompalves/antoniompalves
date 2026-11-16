# Planner mode

In planner mode Kataru is a planner shared by the team and its clients. No
social network is connected and nothing is posted automatically.

1. The client suggests an idea, or the team starts a post.
2. The team writes it, and the client approves it if the brand asks for that
   (see [COLLABORATION.md](COLLABORATION.md)).
3. When the time comes, someone posts it by hand on the network. They then
   mark it **as published**, adding the link to the live post if they want to.

## What changes

| | Connected | Planner |
|---|---|---|
| Inbox, Analytics, Listening | shown | hidden, and their links open the overview |
| Channels | connections, tokens, health | **Profiles**: each brand's handles and links, added by hand |
| Composer | Schedule, Publish now | Schedule only |
| Post drawer | Publish now, metrics | **Mark as published** (with an optional link), **Copy text**, a "post it by hand" note |
| Overview | audience, reach, inbox | to post today, awaiting approval, new ideas; a **To post** card (approved posts due within 24 hours, plus late ones) |
| Media uploads | original kept until published | only the light copy (≤ 100 KB, or a video's cover) |

Planner mode also hides warnings about connections: no "reconnect" prompts and
no posts "failed to publish". A post marked as published still needs the
client's sign-off when the brand asks for it; the server enforces this too.

## Turning it on

- **In the app**: open the account menu, choose **Working mode**, then
  **Planner only**. You need the *settings.manage* permission. The setting
  applies to the whole company. A company created on a new server starts in
  planner mode.
- **On the server**: set `KATARU_MODE=planner` in `server/.env`, or in the
  cPanel app's variables. This locks the mode, and the app shows that it was
  set on the server. It also:
  - stops the publishing scheduler;
  - answers `404 planner_mode` to the publishing API and the network sign-in
    callbacks;
  - saves uploads only as light copies;
  - makes `/health` report `"planner": true`.

Switching back to **Connected** brings back everything that was hidden; no data is lost.
