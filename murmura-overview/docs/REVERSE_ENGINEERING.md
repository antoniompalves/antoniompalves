# Murmura · `#/overview`, `#/calendar`, `#/inbox`, `#/analytics` + `#/listening` — reverse-engineering notes

Reference: `https://demo.codeandchill.store/murmura/#/overview`, inspected with the
Playwright MCP on **2026-10-30 ~14:15 UTC** at a **1440×900** viewport (light theme,
then dark). Method: accessibility snapshot with boxes → `getComputedStyle` on key
nodes → dump of every `cssRules` entry (custom properties + component rules) →
cleaned `outerHTML` per card → chart SVG paths decoded back into values → every
tab/dock/in-page link visited to map routes.

> The reference is a **paid template** (it carries a "Buy this template" link to
> Code and Chill). No source code, CSS or photography was copied: the recreation is
> written from scratch in React + Tailwind, network glyphs are redrawn, and images
> are seeded placeholders (`src/data/assets.ts`). Check the template's licence before
> shipping anything derived from its design commercially.

The recreation also runs in European Portuguese (the English shown and measured
here is unchanged); see [`I18N.md`](I18N.md).

The recreation is now called **Kataru**, with its own logo (see the README); this
document keeps the reference's name, Murmura, where it describes the reference.
The only visible differences the rename makes are the mark, the wordmark and the
document titles: the brand keeps the reference's width at ≥ 1341px, so every
measurement below still holds.

## 1. What the original is built with

| Aspect | Finding |
| --- | --- |
| App | Framework-less SPA, Vite build (`index-*.js`, lazy `overview-*.js` + `charts-*.js` chunks), CSS minified by lightningcss |
| Routing | Hash router, all views stay mounted and are toggled (`hidden`) |
| Theme | `html[data-theme="light" \| "dark"]`, every colour is a CSS custom property |
| Font | **Urbanist** 400–700 (Google Fonts, variable), body weight **500**, line-height **1.45** |
| Icons | Inline 24px stroke SVGs, `stroke-width: 1.7`, round caps/joins (Lucide-like) |
| Charts | Hand-rolled SVG (area + line, dashed grid, crosshair, HTML tooltip) |
| Motion | Letter-by-letter greeting, sliding tab pill (clip-path), count-up stats, breathing "live" dot, mesh parallax |

## 2. Design tokens

### Colour — light (`:root`) / dark (`:root[data-theme="dark"]`)

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--bg` | `#f1f2ef` | `#101214` | page |
| `--mesh-a/b/c` | `#cde9e4` `#f3e3c8` `#d3e6f3` | `#0b7a874d` `#f2b7401f` `#1f68a84d` | blurred background blobs |
| `--glass` | `#ffffff85` | `#ffffff0d` | cards |
| `--glass-2` | `#ffffffb3` | `#ffffff16` | inner tiles, chips, icon buttons |
| `--glass-3` | `#ffffffdb` | `#212428` | hover, segmented pill |
| `--solid` | `#f6f7f4` | `#191b1f` | stack rings |
| `--float` | `#fdfdfb` | `#1f2226` | tooltips, popovers |
| `--well` | `#161a1e0f` | `#ffffff0f` | tracks, meters, status pills |
| `--line` / `--line-2` | `#161a1e17` / `#161a1e29` | `#ffffff14` / `#ffffff29` | hairlines / control borders |
| `--rim` | `#ffffffd1` | `#ffffff12` | card & glass borders |
| `--text` / `--muted` / `--faint` | `#16191d` / `#5b6064` / `#696e72` | `#eef0ee` / `#a6abaa` / `#868b8a` | type |
| `--butter` | `#f2b740` | — | awaiting approval, primary dock action, counts |
| `--pine` | `#11745a` | `#117a5d` | approve, positive, growth badge |
| `--coral` | `#c43c30` | `#c8402f` | failed / changes requested, alerts |
| `--sea` | `#1f68a8` | `#2370b3` | scheduled, chart series, meters |
| `--lilac` | `#0b7a87` | `#0a7582` | (unused on overview) |
| `--ink` / `--on-ink` | `#16191d` / `#f6f7f5` | `#eef0ee` / `#16191d` | hero tile, today column (inverts in dark) |
| `--pill` / `--dock` | `#16191d` | `#eef0ee` / `#ffffff14` | active tab, primary button / dock rail |
| `--good` / `--bad` / `--warn` | `#11745a` / `#b8382c` / `#855c00` | `#5fcfa6` / `#ff8f80` / `#e9c15a` | deltas & status text |
| `--n-instagram` … | `#c13584` `#1665d8` (fb) `#d61f1f` (yt) `#d0021b` (pin) `#0a66c2` (li), x/tiktok/threads = text | lighter tints | network glyph colours |

### Typography

| Token | Size | Where |
| --- | --- | --- |
| greeting | `clamp(30px, 2.7vw, 40px)` / 600 / lh 1.04 / ls −0.025em | `h1` (38.88px at 1440) |
| countdown | `clamp(30px, 2.8vw, 42px)` / 600 / lh 1 / ls −0.035em | hero |
| growth total | `clamp(32px, 3vw, 44px)` / 600 / ls −0.03em | Audience growth |
| `26px` 700 −0.02em | brand wordmark | |
| `24px` 600–700 −0.02em | day number, inbox counters | |
| `23px` 600 (`b` → bolder) −0.01em | header stats | |
| `22px` 700 −0.02em | top-post metrics | |
| `--fs-xl 20` `--fs-lg 18` `--fs-base 17` | card titles use **17/600/−0.005em** | |
| `--fs-md 16` | body, top-post caption (600) | |
| `--fs-sm 15` | tabs (600), buttons, hero caption | |
| `--fs-xs 14` | list titles (600), meta | |
| `--fs-2xs 13` | secondary text, labels, legend | |
| `12.5px` 700 | badges, chips, tab counts | |
| `12px` 500 | chart axis | |

Numbers use `font-variant-numeric: tabular-nums`.

### Radius, elevation, motion

| Token | Value |
| --- | --- |
| `--r-card` | 26px (cards) |
| `--r-tile` | 22px (hero, top post) |
| inner tiles | 20px (day), 18px (list items, todos), 16px (counters, hero media), 13–15px (thumbs, brand mark), 999px (controls) |
| `--shadow` | `0 1px 0 #ffffffbf inset, 0 24px 48px -30px #1e282d47` |
| `--shadow-pop` | `0 24px 60px -18px #14181c4d, 0 2px 6px #14181c14` |
| dock shadow | `0 20px 40px -18px rgba(0,0,0,.45)` |
| `--ease` | `cubic-bezier(.2, .8, .2, 1)` |
| mesh | blobs 62/70/46 vmax, `blur(60px)`, opacity .95 |

## 3. Layout & spacing

```
.app   padding: 22px  var(--gutter)  48px  calc(dock-x 18 + dock-w 68 + gutter)
       --gutter = clamp(16px, 1.6vw, 28px)   → 23.04px at 1440 → content x 109…1402
.top   grid [auto | 1fr | auto], gap 20, mb 26; tabs centred in the 1fr column
.head  flex-wrap, column gap clamp(28px, 4vw, 72px), row gap 18, mb 24
       stats gap clamp(24px, 3.2vw, 56px); New post pushed right (margin-left:auto)
.grid  12 columns, gap 16 (--gap)
       next 7 | needs 5
       growth 7 | top 5
       week 12
       nets 4 | inbox 4 | team 4
.card  padding 20, border 1px rim, head min-height 42 + margin-bottom 14
.dock  fixed, left 18, vertically centred, padding 8, gap 4, buttons 52 (48 when height ≤ 820)
```

| Breakpoint | Change |
| --- | --- |
| ≤ 1340px | tabs drop to a second row of the top bar |
| ≤ 1279px | grid → 2 columns: next / needs+growth / top / week / nets+inbox / team |
| ≤ 1000px | week strip scrolls horizontally with snap + fade mask |
| ≤ 860px | grid → 1 column |
| ≤ 760px | dock → bottom bar (64px + safe area), app padding 14px, brand switch icon-only |
| ≤ 600px | hero stacks (16:9 media), coming-up list 1 column |

## 4. Components (measured at 1440)

| Component | Spec |
| --- | --- |
| Brand | mark 48×48 r15 ink, wave glyph 28px stroke 2.1; wordmark 26/700 |
| Tabs | track padding 4, gap 2; tab padding 11×17, 15/600; ink pill slides (500ms ease); count badge 21px butter 12.5/700 |
| Brand switch | h46, glass-2 + rim, padding-left 6 / right 14, 34px ink disc with layers icon |
| Bell | 46px glass icon button, coral 9px dot at (9,10) with 2px bg ring |
| Account | 48px glass pill, avatar 42 |
| Dock | ink rail r999, buttons 52 r50% opacity .74 → 1 + `white/12` on hover; create = butter; channels has 8px coral dot; tooltip floats 14px right, float bg, shadow-pop |
| Stat | 48px glass disc + 20px icon; value 23/600; label 13 muted max-w 170 lh 1.3; growth badge pine |
| Button | h44 px19 15/600 r999 (sm: h36 px15 13px); ink / ghost (line-2 border, glass) / pine |
| Icon button | 42px, 1px line-2 border, arrow-up-right |
| Up next hero | ink tile r22, height clamp(250px, 20vw, 290px), columns `clamp(170px, 30%, 250px) 1fr`, gap 20, padding 14; 2-line clamp caption; networks 28px on-ink discs overlapping −6px |
| Coming up item | glass-2, line border, r18, padding 8, gap 11, thumb 50 r13, status pill (well bg + 8px dot) |
| Needs-you todo | glass-2 r18 padding 12, grid areas `ico txt / ico act`, gap 6×12; thumb 44 r13 or 40px coral icon tile |
| Segmented control | well track padding 3; button 8×15 13/600 muted; active glass-3 + `0 2px 8px rgba(0,0,0,.08)` |
| Growth chart | SVG 706×230; plot x 44→694, y 12 (10K) → 204 (0); dashed grid `3 4` line colour; line 2.5px sea; area sea 22% → 0; x labels every 3rd day (30D) / 9th (90D) + last |
| Tooltip | float bg, line border, r12, padding 8×11, 13px; centred 14px above the point |
| Top post | r22 photo, gradient `transparent 30% → rgba(10,10,12,.78)`, butter "8.9× usual reach" badge at 14/14, body padding 16 |
| Day column | glass-2 r20 padding 12 gap 10, min-h 172; today = ink; chips 12.5/700 r999 padding 4 4 4 9 tone-filled with 22px brand mark (ring white/50); max 3 + "+N" |
| Network row | 36px glyph disc · name/followers + 6px sea meter (scaled to the largest network) · delta (good) + engagement |
| Inbox pulse | 3 counters (glass-2 r16, 24/700), 12px sentiment bar split 3px, legend, rows with 36px avatar + unread 7px coral dot |
| Team feed | 28px avatar, 14px sentence with bold first name, 12.5 muted time with 13px kind icon, hairline separators |

## 5. Route map (SPA navigation)

| Route | Entry | View heading → sections |
| --- | --- | --- |
| `#/overview` | tab | Afternoon, Camila → Up next, Needs you, Audience growth, Top post this month, The week ahead, Network pulse, Inbox pulse, Team activity |
| `#/compose` | tab | Compose → New post, Preview, When, Your drafts |
| `#/calendar` | tab | Publishing calendar → Week/Month/List, Jump to a date, Unscheduled drafts, This week by network |
| `#/inbox` (badge = unread) | tab | Inbox → conversation list (views, search, filters), thread + composer, contact info |
| `#/approvals` (badge = awaiting) | tab | Approvals → Waiting for me · All pending · Changes requested · My submissions · Recently approved; The rule in force; Who approves |
| `#/analytics` | tab | Analytics → 7D/30D/90D; Audience growth, Impressions & engagement, Best time to post, Content mix, By network, Top posts, Brand comparison |
| `#/listening` | tab | Listening → Tracked keywords, Mentions, Share of voice, Trending terms, Sentiment over time, Competitors |
| `#/library` | dock | Library → Media, Templates, Hashtag sets, Saved replies |
| `#/channels` | dock (attention dot) | Channels → needs attention, one card per brand, Audience by network, Supported networks |
| `#/team` | dock | Team & roles → Members, Roles & permissions, Audit log |
| `#/settings` | dock | Settings → profile, notifications, workspace, approvals, security, billing, appearance, data |
| `#/inbox/:id` · `#/compose/:postId` · `#/analytics/:network` · `#/team/members` · `#/team/audit` · `#/settings/:section` | deep links | — |

Dock actions without a route: Search (⌘K), Create (N), Today's queue, Theme.
Encoded in `src/data/routes.ts`.

## 6. Data schema

Types live in `src/data/types.ts`, the mock in `src/data/mock.ts`, and every number
on the page is **derived** in `src/data/selectors.ts` (nothing is hard-coded in JSX):

| UI value | Derivation | Value |
| --- | --- | --- |
| Audience | Σ `channels[].followers` (19 accounts) | 976,260 → **976.3K** |
| +x% in 30 days | new followers in the last 30 days of `analytics.series` ÷ (audience − that) | 89,608 → **+10.1%** |
| Engagement rate | Σ engagements ÷ Σ reach of the posts published in the last 30 days | **10.3%** |
| Posts going out this week | non-draft posts in the calendar week (Mon–Sun) — the same 19 the calendar shows for Oct 26 – Nov 1 | **19** |
| Up next | soonest scheduled-or-awaiting post after `now`, then the next 6 | Ember & Oak · **18 h 45 min** |
| Needs you | `todos` (approvals, failed post, channel reconnects), 4 visible | **6** |
| 90D growth | Σ 90 points | **+238.9K · 32.4%** |
| Top post | published this month, max reach; "× usual reach" = its reach ÷ the median reach of the last 30 days' posts | 346.9K reach · 23.2% · 2.8K saves · 8.9× |
| Week ahead | posts per day, chip tone from status (sea scheduled, butter awaiting, coral failed/changes) | 1·6·3·5·1·1·4 |
| Network pulse | the analytics "By network" rows for 30 days (followers, growth, eng. rate); meter = followers ÷ max | TikTok 1 … LinkedIn 0.028 |
| Inbox pulse | open conversations; unread; priority; sentiment split | 20 · 14 · 4 · 10/6/4 |
| Tab badges | unread conversations / awaiting-approval posts | 14 / 5 |

The daily follower values were first recovered from the overview chart path
(`value = (204 − y) / 192 × 10 000`); they are now the sum of the per-network
analytics series (section 10), which reproduces them exactly.

## 7. Verification

Bounding boxes of 31 landmarks (title, tabs, stats, card headings, buttons, chart,
top post, dock, …) were measured on both pages at 1440×900: **all identical to the
pixel** (the greeting needed per-character spans, like the original, to lose
kerning and match its 177px width). The chart tooltip for the same pointer position
resolves to the same date, value and `translate(459.103px, 72.2864px)`. Axis labels
for 30D and 90D, the 90D totals, and the expanded "Needs you" list match verbatim.

Known differences:

- Photos and avatars are placeholders; brand/network glyphs are redrawn.
- Curve uses monotone-X interpolation; the original's smoothing differs slightly.
- The demo's live simulation (new inbox messages arriving, count-up stats, mesh
  parallax, magnetic buttons) is not reproduced; the countdown and "x min ago" do tick.
- `#/overview`, `#/calendar`, `#/inbox`, `#/analytics` and `#/listening` are recreated; other routes render a placeholder listing their sections.

## 8. Calendar (`#/calendar`)

Reached from the **Calendar** tab of the top bar (the dock has no calendar link:
it holds Search, Create, Today's queue, Library, Channels, Team, Settings and
Theme), and from the "Open calendar" / "Calendar" shortcuts on the overview.
Inspected the same way (computed styles, the lazily loaded `calendar-*.css`
chunk, cleaned DOM per pane), plus every post read back from the List view
while paging Sep 28 → Nov 8.

### Layout

```
head      "Publishing calendar" + 4 stats; actions wrap to a 2nd row, right-aligned:
          Week/Month/List segmented · ‹ Today › (42px) · New post
.cl-bar   chips: All networks · 8 network chips (36px, icon only) | 5 status chips | campaign <select> (210px) · Clear
.cl-grid  [ calendar card (padding 18) | side 300px (330px ≥ 1500px) ], gap 16
          ≤ 1279px: one column, side cards 2-up, mini calendar hidden · ≤ 760px: filters scroll sideways
```

| Week grid (`.cl-wk`) | Value |
| --- | --- |
| Scroll box | `max-height: clamp(480px, 100dvh − 200px, 1040px)` (700px at 900px tall), `--solid` bg, r20, line border, opens 3 h above "now" |
| Columns | `var(--gut) repeat(7, minmax(var(--colw), 1fr))`, gap 6, right padding 8; gut/col 56/100 → 50/86 ≤1100 → 48/74 ≤900 |
| Hours | 6 AM → 11 PM, **72px** rows, labels 12.5/600 muted offset −9px; sticky left |
| Day head | sticky top: `MON` 12.5/700 +0.05em, 34px number disc (ink when today), "5 posts" / "Free", coral 6px dot when nothing live is booked |
| Campaign ribbons | sticky header subgrid rows of 24px (+4px gap), r999 (5px on edges cut by the week), 18px initials badge on `currentColor` 22%, "until Nov 8" hidden under 210px (container query) |
| Day column | `--glass-2`, r16; past = `--well`; today = sea 8% fill + sea 34% border; 18 dashed hour slots |
| Tile | `top: row·72 + 2`, height 68, lanes `left: 3px + (100% − 6px)·lane/lanes`, r14, padding 6/6/6/8, tone fill by status, 26px photo top-right; hides photo ≤92px, networks ≤84px, caption ≤58px |
| Now | 2px coral line across today's column with a pulsing 12px dot, coral "2:15p" pill in the gutter |
| Hover ghost | dashed glass pill "+ 3:30 PM", half-hour high, floor-snapped to 30 min, not on past days |
| Best times | lilac overlay per slot at `heat × .52` (.62 dark), staggered `ci·40ms + hi·10ms`, "Peak" pill when heat ≥ 0.9; legend swaps to a quiet → busy gradient |

| Month (`.cl-month`) / List (`.cl-list`) / side panel | Value |
| --- | --- |
| Month cell | min-h 134 (112 ≤900), r16, rim border; out-of-month transparent, past `--well`; 28px number button (ink today) + count; ≤3 chips (24px, r8, "9:45a" + caption) then "+N more" in the same 3px-gap grid |
| Month ribbons | 5px hairlines at top 39px, 3px apart; each cell's header gets `ribs × 8px` margin |
| List row | grid `76px 52px 1fr auto auto`, gap 14, r18, 4px status bar at left 7px, 52px thumb (brand mark when no photo), status pill, author avatar |
| Mini calendar | 6-week grid, 36px rows, 30px day discs, shaded visible range per week, 4px sea dot at opacity `.3 + min(3, n)·.23` |
| Drafts | dashed 1.5px card r16, 30px brand mark, "Nia · pencilled Thu, Nov 5, 10:00 AM", grip handle; draggable onto the grid |
| By network | rows `auto 84px 1fr 26px`, 28px glyph, 8px meter in the network colour, busiest first |
| Drawer | `<dialog>` fixed 12px from top/right/bottom, 480px, r28, `--glass-3`, blurred 26% backdrop; status, "Goes out Tomorrow · 9:30 AM · by …", per-network preview (feed / video / text-first), metrics once published, Publish now · Edit · Duplicate · Delete |

### Interactions

- **Drag & drop**: pointer events, a fixed clone follows the pointer with its time
  updating live; week columns snap the clone's top edge to 30 minutes, month cells
  keep the time of day. Target box: dashed ink border on butter 42% with a
  "Sat · 2:30 PM" label; past slots turn coral and are refused. Drop → toast
  "Moved to Tomorrow · 2:30 PM" + **Undo**, butter ring on the landed tile.
  Unscheduled drafts drag in from the side panel the same way.
- **Keyboard**: focused tile + `Alt` + `↑/↓` moves 30 min, `←/→` a day.
- **Filters** (networks, status groups, campaign) apply to all three views and the
  header counts; ribbons and month legend chips toggle the campaign filter.
- **Navigation**: ‹ › step a week (Week/List) or a month; mini calendar jumps;
  a month day number opens that week.

### Data

The 78 posts on the reference grid (Sep 28 – Nov 8: 50 published, 18 scheduled,
5 awaiting approval, 2 changes requested, 2 drafts, 1 failed) plus the two drafts
pencilled further out, 4 campaigns, and the 7×18 "best times" matrix were read
from the DOM into `src/data/mock.ts`. Derived values match the reference:
**5** scheduled / **5** awaiting / **9** published this week, **3** empty days in
the next 7, network load **16 · 8 · 7 · 5 · 5 · 4 · 2 · 2**, mini-calendar counts.
Calendar and overview share one store (`src/data/store.tsx`), so a post moved on
the calendar immediately reshuffles the overview's Up next and Week ahead.

### Verification (1440×900, week grid scroll aligned)

| Check | Result |
| --- | --- |
| 30 week-view landmarks (head, chips, select, grid, day heads, ribbons, columns, lane tiles, side cards) | identical to the pixel |
| Month view: 42 cells + 55 chips | identical |
| List view rows (first, today, last) | identical |
| Drawer box, title, timing line | identical (`933,12 480×876`) |
| Peaks with Best times on | same slots per day |
| Drag Sat 12 PM tile down 2.4 h | same "Sat · 2:30 PM" target and "Moved to Tomorrow · 2:30 PM" toast |

Known differences: the preview card's height follows the photo's aspect (the reference photos are
portrait, the placeholders square); the "Failed" chip groups failed and
changes-requested posts (the reference's "needs attention" colour); the reference
persists edits in `localStorage`, this recreation keeps them in memory.

## 9. Inbox (`#/inbox`)

Reached from the **Inbox** tab of the top bar (the dock has no inbox link either)
and from the overview's Inbox pulse. `#/inbox` opens the first conversation on
wide screens (`#/inbox/c1`); every conversation has its own deep link. Inspected
with computed styles and the lazily loaded `inbox-*.css` / `inbox-*.js` chunks
(read for behaviour only: toasts, menus, tag rules), cleaned DOM per pane, and the
22 conversations read back one by one.

### Layout

```
.ib-app   one card, h = max(560px, 100dvh − 120px)  (109,100 · 1293×780 at 1440×900)
          [ list clamp(300px, 27vw, 376px) | thread 1fr ]
          + contact info ≥ 1280px: [ list clamp(320px, 25vw, 376px) | thread | info 320px ]
          1000–1279px: info slides over the thread · ≤ 999px: list minmax(270px, 300px)
          ≤ 760px: one pane at a time (list ↔ thread by hash), info full screen
```

| List (`.ib-side`) | Value |
| --- | --- |
| Head | "Inbox" 21/700 −0.02em + count chip; "13 unread · 22m median first reply"; Filters (count badge) and Mark all read, 38px round buttons |
| Search | 36px pill, `--glass-2`, line-2 border, "/" key cap (12.5/600, r8; hidden on touch) |
| Views | 32px chips with counts: All 20 · Unread 13 · Mine · Unassigned 11 · Priority 4 · Done 2 (sideways scroll) |
| Row | **72px**, `48px 1fr` grid, gap 13; 48px face + 20px network badge (`--float` ring); name 16 (600, 800 while unread), brand dot, time (accent while unread); kind glyph 15px, preview of the last non-note message ("You:" / "Note:" / "Photo"), priority flag, 20px assignee, 21px unread disc; current row `--well` |
| Faces | photo, or initials on one of four tints (`#f4dba8 #cde8de #f3cdbf #cfe3f1`, Σ char codes mod 4) for the five Wildroot contacts without a photo |

| Thread (`.ib-th`) | Value |
| --- | --- |
| Head | 60px; 40px face, name 16/700, "Instagram · Comment on Ember & Oak’s post"; 38px tools: assign (26px avatar, "Assigned to Haruto Sato — reassign"), priority (coral when on), done (E) / reopen, info (pressed), more |
| Pin bar | 50px, 3px sea rule, 36px thumb, "On Ember & Oak’s post · Oct 28" 12.5/700 accent + caption; opens the post drawer |
| Wall | `--ib-wall` with a 22px dot grid, sticky day pills ("Today", "Yesterday", weekday, "Oct 3") 12.5/600 on `--float` |
| Bubble | max `min(65%, 560px)`, r9, padding 6/9/7, 15px/1.38; 8×12 clip-path tail on the first of a run (gap 10, else 2); theirs `--float`, ours `--ib-us` with the sender's first name 12.5/700 accent; time + ✓✓ (accent once read) bottom-right, an inline 66/84px spacer keeps text clear of it; `#tags`, `@handles`, links 600 accent |
| Note | centred, `min(78%, 440px)`, r10, `--ib-note` + `--ib-note-rim`, "Note · only your team sees this", "Camila · 5:13 PM" |
| Composer | Attach + Internal note (38px), pill input r22 growing 21 → 121px (dashed butter in note mode, "Note for the team…"), 30px caret (opens only with something to send), 44px send (sea; note mode swaps in the note glyph, "Add note") |

| Contact info (`.ib-info`, 320px) / popovers | Value |
| --- | --- |
| Hero | 96px face, name 20/700, @handle, network · followers, brand chip |
| Sections | padding 14/18, uppercase 12.5/700 headings; rows ≥ 30px, gap 10: Kind, Status pill, Sentiment (3 segments, 32px), Priority switch 46×28 |
| Assignee / Tags / Post / Activity | `--well` button with 28px avatar + job title; 30px tag chips with × and "+ Tag"; 72px thumb + first line (90 chars); messages "n · x in · y out", first contact, last message; footer Mark done (pine) / Reopen |
| `.pop` | r18, 6px padding, 210 → `min(380px, 100vw − 24px)`, 8px from its trigger, flips when there's no room, clamped to the viewport |
| Menus | 46px rows (18px glyph, gap 10), separators 1px with 4/6 margins, check mark on the selected radio item |
| Sizes | Filters 288 (Kind / Network / Sentiment with counts; Clear at 45% until something is ticked), Attach 210, Saved replies 360 (5 replies, 34px bolt), Choose a photo 360 (3-col grid), Add a tag 314 (42px "#" field, ≤ 10 suggestions) |

### Interactions

- Opening a conversation reads it; the unread disc counts inbound messages since
  our last reply. J / K move, E closes (stamp, then the next row), R focuses the
  composer, "/" the search; Enter sends, Shift+Enter breaks the line, ⌘⇧Enter sends
  and closes.
- Toasts mirror the reference, with Undo where it has one: "Done · Abigail’s
  comment closed", "Reopened …", "Sent to Abigail · conversation closed",
  "Marked 13 as read", "Marked as priority" / "Priority removed", "Marked
  positive", "Removed #press", "Tagged #press" (only while the contact panel is
  closed), "Marked as unread". Assigning confirms in place, with no toast.
- "Mark as unread" also leaves the conversation and parks the inbox on its empty
  state instead of reopening the first row.
- Search matches name, handle, tags and message text, highlighting hits; views and
  filters combine, each with its own empty state.
- The assign menu lists you, then teammates with access to the conversation's
  brand (team order, titles and brand access taken from the reference).
- Tags are normalised like the reference (`#`, lowercase, spaces → `-`, `[a-z0-9-]`,
  24 chars); suggestions are the workspace's tags, then support, sales, shipping,
  refund, wholesale, press, ugc, question, vip.

### Data

22 conversations (20 open, 2 done) with every message, author, minute offset,
sentiment, tag and assignee read from the reference into `src/data/mock.ts`,
plus 5 saved replies and each brand's media library (25 titled photos). Derived
values match: **13** unread after the first conversation opens (14 on the tab
badge before), **11** unassigned, **4** priority, kinds **11 · 5 · 3 · 1**,
networks **8 · 2 · 1 · 2 · 2 · 1 · 2 · 2**, sentiment **10 · 6 · 4**, median first
reply **22m**. The inbox shares the workspace store with the overview, so replying
or marking read updates the Inbox pulse and the tab badge immediately.

### Verification (1440×900)

| Check | Result |
| --- | --- |
| List head, search, view chips, 3 rows, thread head, pin bar, bubble, composer (92 landmarks) | identical to the pixel |
| Contact info open on c5 / c8 / c18 (42–48 landmarks each, incl. initials avatar) | identical |
| Attach, More, Assign menus: position and every item | identical |
| Filters (288×524), Saved replies (360 wide), Choose a photo grid, Add a tag chips | identical |
| Dark theme and the mobile thread view | visually matched |
| Overview / calendar after the change | unchanged (calendar differs only by grid scroll, which follows the clock) |

Known differences: the reference's live simulation (new comments every minute with
a "New comment from … on Instagram" toast) is not reproduced and times come from
the frozen clock; photos are placeholders; assignee notifications, the audit log
and role-based locks ("Your role can’t reply") are not modelled because the mock
user is the owner; the phone header and bottom bar were aligned with the reference later,
with the analytics work (section 10).

## 10. Analytics (`#/analytics`)

Reached from the **Analytics** tab, and on phones from the bottom bar's **More**
sheet (recreated too). `#/analytics/:network` filters the whole page to one
network. Inspected with computed styles, the page's lazily loaded `analytics-*`
CSS and JS (read for behaviour and wording only), every chart path, table cell
and heatmap opacity for **27 states** (7D/30D/90D × all networks + 8 networks),
and the reference's own state (19 channels, 89 posts with their metrics).

| Analytics · 1440 | Expanded card + heatmap tooltip | Phone + More sheet |
| --- | --- | --- |
| ![Analytics, light theme](screenshots/analytics-light.png) | ![Best time to post expanded](screenshots/analytics-expanded.png) | ![Analytics on a phone and the More sheet](screenshots/analytics-mobile.png) |

| Instagram filter, dark | Schedule a report (pt-PT) |
| --- | --- |
| ![Instagram accounts and top posts, dark theme](screenshots/analytics-dark.png) | ![Schedule a report dialog in Portuguese](screenshots/analytics-pt.png) |

### Layout

```
header   title · 4 stats (users, trending-up, eye, heart) · 7D/30D/90D · Export CSV (ink) · Schedule a report (ghost)
chips    All networks 19 · Instagram 4 · Facebook 3 · X 2 · LinkedIn 1 · TikTok 3 · YouTube 2 · Pinterest 2 · Threads 2   "5 brands · last 30 days"
.an-grid 12 cols, gap 16:  grow 7 | imp 5  /  best 8 | mix 4  /  net 12  /  top 7 | brands 5
         ≤ 1340px: 6 cols (grow 3 | imp 3 / best 6 / mix 3 | brands 3 / net 6 / top 6) · ≤ 1000px: 1 col
```

| Part | Value |
| --- | --- |
| Chip | 38px pill, padding 0 12 0 6, gap 8, 13/600; 22px network disc on `--solid`; count 20px pill on `--well`; current = `--pill` (count and disc 14–16% white) |
| Card | the overview card (26px radius, 20px padding, 16px on phones) + an **Expand** button: the card lifts out over a 28% scrim, `width: min(1165px, 92%)`, `top: 8vh`, `max-height: 84vh` (10px inset on phones), Escape or the scrim closes it, a dashed outline keeps its place |
| Figures | `clamp(28px, 2.5vw, 36px)`/600, caption 13px muted on the same baseline; delta badge pine / coral |
| Charts | viewBox `width × 240`, plot x 44 → width − 12, y 12 → 214; this period 2.5px line + 22% → 0 area, previous period 2px `--faint` dashed 5/6; ticks 0 · top/2 · top with **top = smallest 1/2/2.5/5 × 10ⁿ ≥ 1.08 × max** (checked on 108 axes); one date per ~60px of plot plus the last day; crosshair + two 4.5px dots, tooltip "Oct 15 / This period 44.8K / Previous period 39.1K" |
| Heatmap | `36px repeat(24, 1fr)`, gap 4 (3 on phones), min-width 600 (560); cell r7 on `--well` with a `--sea` layer at opacity = value (`#3f8fd6` in dark); best 3 ringed (inset −4, r10, 2px) with a 19px rank disc; hours 12a 3a … 9p; Quiet ▭ Busy (96×10); slots: 26px rank, "Sat 8 AM / index 100", 34px plan button |
| Content mix | rows `auto 7.5em 1fr auto 3.2em`, gap 10, 28px disc, 10px meter (ink at 82%), count, % |
| Table | header 13/600 muted with sort buttons (chevron, shown on hover, flipped when ascending); rows 60px: 36px disc / 38px brand mark + name + "3 accounts" / handle, Status pill on the account view, growth pine/coral bold, 96×28 sparkline; phones: one 3-column card per row with labelled cells |
| Top posts | `repeat(auto-fill, minmax(200px, 1fr))` gap 12 (2 columns on phones); card r20, image 1 / 0.86 (text-only posts on a wash of the brand colour), rank 30px (#1 butter), net stack, value 22/700, unit, brand chip + date, 👁 impressions · ♡ engagements |
| Brand comparison | rows `auto 9em 1fr 4.4em`, 38px mark, "5 accounts · 11 posts", 14px track; phones move the bar under the name |
| More sheet | bottom `<dialog>`, 28px top radius, `--solid`, handle, 44px close; 2-col 58px tiles (36px icon box, current = ink), Approvals count; Search · Today · Dark/Light |

### How every figure is computed (`src/data/analytics.ts`)

| Figure | Rule |
| --- | --- |
| Audience | Σ followers of the accounts in view ("across 19 accounts") |
| New followers / badge | Σ daily gains over the range; badge = gained ÷ (audience − gained) |
| vs the days before | (gained − gained in the previous range) ÷ previous ("no earlier period" when 0) |
| Impressions / engagements / link clicks | Σ of the daily series; delta against the previous range |
| Avg. engagement rate, N posts | mean of (likes + comments + shares + saves) ÷ reach over published posts with reach, `now − range ≤ at < now`, sent to the network in view |
| Content mix | network deliveries of those posts, most first, ties in the order they first went out; % = count ÷ deliveries |
| By network | per network: accounts, Σ followers, growth = gains ÷ (followers − gains), Σ impressions, mean eng. rate and count of its posts, follower curve |
| Accounts (network picked) | per channel: its own gains and impressions, the brand's posts on that network ("—" without posts) |
| Top posts | the range's posts, ranked by reach, engagement rate or link clicks; first 6 |
| Brand comparison | per brand in view: Σ followers ("—" without accounts), mean eng. rate, Σ impressions; ties keep brand order |
| Best time to post | 168 values per network (range-independent); top 3 by value, index = round(value × 100) |

Data: the 19 channels (followers, status, handle) and the real metrics of the 50
published posts come from the reference state; `src/data/analyticsData.ts` holds
180 days of followers / impressions / engagements / clicks per network (decoded
from the chart paths; all-networks = Σ networks, exactly), per-account range
totals (solved inside the rounding interval of every printed cell, so the 57
account rows, 15 brand totals and every growth % print the same), follower curves
and heatmaps. The overview now derives its audience, growth, engagement rate,
network pulse and top-post multiplier from the same data, with identical output.

### Interactions

- Range, network chips (and their deep links), metric, ranking and comparison toggles;
  the heatmap has its own network switch that follows the page filter.
- Sortable table (first click: name ascending, numbers descending); clicking a
  network row opens that network; "← All networks" goes back.
- Hover or arrow keys on the heatmap (a live region reads the hour aloud); hover or
  ←/→ on the charts. Plan buttons go to Compose, like the calendar's slots.
- Top post cards open the calendar's post drawer (publish, duplicate, delete, Undo).
- **Export CSV** downloads `kataru-analytics-30d[-network].csv`: scope, period,
  summary, the daily series, the table and every post (pt-PT uses `;` and decimal commas).
- **Schedule a report**: name, Weekly (Mondays 9:00) / Monthly (1st, 9:00), recipients
  (you preselected, "Pick at least one recipient."), toast with the first send and
  Undo; afterwards the button shows a count and opens a menu of reports, each one
  stoppable after a confirmation ("Stop this report?" → "Report stopped", Undo).

### Verification

| Check | Result |
| --- | --- |
| 22 landmarks (7 cards, chips, stats, actions, charts, heatmap, table, posts, bars…) at **1440**, **1280**, **1000** and **390** px | identical to the pixel; page height 2797 / 3468 / 4329 / 5505, as in the reference |
| Same at 390 px with a touch pointer (44px targets) | within 1px |
| Every printed figure in 27 states: stats, chips, note, both charts' texts, ticks and date labels (all three metrics), heatmap label + cells + slots, mix rows + meters, table cells + links, 6 top posts × 3 rankings, brands × 3 metrics + bars | identical, except bar lengths in brand impressions (≤ 0.0002) and "1 post / 1 delivery" (the reference prints "1 posts / 1 deliveries") |
| Expanded card | `130,72 1165×413` at 1440 (same), x labels every 2 days |
| Dark theme, mobile More sheet | visually matched |
| English text of the other pages | unchanged apart from the new phone controls and the placeholder's route list |

Known differences: the reference animates figures (count-up, morphing lines,
FLIP expansion), and its scheduled reports and CSV export run on the same mock
data; recipients are the 8 team members of this workspace (the reference also
lists an analyst and two client logins); role locks ("Your role can't export
reports") are not modelled because the mock user is the owner.

## 11. Websites · Google Analytics 4 (addition)

Not in the reference: requested on top of the recreation. The Websites section
under the analytics cards is built only from the reference's own parts (expandable
cards, 38px chips, the period chart, mix rows, the sortable table and its phone
card layout), so it reads as the same product, and it is placed after the
reference cards so the measured layout above stays identical (every landmark of
section 10 still matches at 1440 and 390 px; the page is longer). Websites are
owned by brands like social accounts — several, one or none per brand. Data
model, demo generation, the live GA4 connection and how it was tested are in
[`GOOGLE_ANALYTICS.md`](GOOGLE_ANALYTICS.md).

## 12. Listening (`#/listening`)

Reached from the **Listening** tab, and on phones from the bottom bar's **More**
sheet. Inspected the same way as analytics: computed styles at 1440 / 1280 / 960 /
390 px (touch pointer on the phone), the page's lazily loaded `listening-*` CSS and
JS (read for behaviour and wording only), every chart path, and the reference's own
state (14 keywords, 90 mentions, 9 competitors) read from its `localStorage` with the
clock pinned to Fri 30 Oct 2026, 14:15 UTC.

| Listening · 1440 | Keyword + term filters | Phone |
| --- | --- | --- |
| ![Listening, light theme](screenshots/listening-light.png) | ![Stream filtered by Ember & Oak and "best"](screenshots/listening-filtered.png) | ![Listening on a phone](screenshots/listening-mobile.png) |

| Track a keyword | Dark | Escuta (pt-PT) |
| --- | --- | --- |
| ![Track a keyword dialog](screenshots/listening-track.png) | ![Sentiment and competitors, dark theme](screenshots/listening-dark.png) | ![Listening in European Portuguese](screenshots/listening-pt.png) |

### Layout

```
header   title · 4 stats (message, smile, eye, pie) · Track a keyword (ink)
.ls-grid 12 cols, gap 16, rows auto 1fr auto:
           kw 4 | stream 5 | share of voice 3
           kw   | stream   | trending terms 3
           sentiment 7 | competitors 5
         ≤ 1340px: 6 cols (kw 3 | stream 3 / sov 3 | trending 3 / sentiment 6 / competitors 6)
         ≤ 1000px: 1 col, the stream first
```

| Part | Value |
| --- | --- |
| Keyword row | r18, padding 8 8 10, `1fr auto` with a 34px remove button over both rows; selected = `--glass-2` + `--line-2` border; kind badge min-width 84 (Brand ink, Hashtag sea, Topic pine, Competitor coral); term 15/700 + 16px brand mark and "9 this week"; 92×30 sea line of 14 days with a 3.2px end dot; 6px sentiment split (good / line-2 / coral, 2px gaps) indented 96px. Phones: badge on its own line, 72px line, 6 rows until "Show all keywords 14" |
| Stream filters | segmented All / Positive / Neutral / Negative (full width on phones), 34px chips "All networks" (menu) and "Saved n", butter chips for the active keyword / term |
| Live | 34px pill, `--well` → coral 14% with a 9px dot beating at 1.6s |
| Mention | `auto 1fr`, gap 12, padding 14 4, hairline; 36px face + 20px network disc; name 15/700, "@handle · 45 min ago", sentiment pill (13px, 27px tall); text 16/1.45 with the keyword (or the searched term) in a butter `<mark>`; footer 12.5px: kind dot + keyword, reach, Reply in inbox (36px) · Save (34px, butter when on) · Hide. 8 per page (6 on phones), "Show 8 more 82" |
| Share of voice | brand picker chip (34px), `clamp(28px, 2.5vw, 36px)` figure, rows `auto 1fr 3.2em`: 30px mark, name (+ ink "You" pill), %, 10px track filled to share ÷ loudest (brand ink, competitors `--faint`) |
| Trending terms | centred wrap, gap 6 8; pills padding 4 11, sizes 13 (muted) / 15 / 18 / 22 / 27 px bold; keywords outlined on `--glass-2`; picked = ink |
| Sentiment chart | viewBox `width × 230`, plot x 44 → width − 12, y 12 → 204; positive 2.5px pine over a 22% area, neutral muted and negative coral 2px; one date label per ≥ 60px of plot, the one before the last dropped within 40px of it; tooltip with the three counts |
| Competitors | table 14px, header 13/600; rows 60px with a 38px mark, name 14/600 and handle 13px; "You" row on `--well` with 14px rounded ends; growth pine / coral bold. Names are never truncated: like the reference, the table scrolls sideways when the card is narrower (its last cell's padding at 1440) |
| Touch | 44px Live pill, chips, small buttons, keyword rows and cloud terms; 46px menu rows |

### How every figure is computed (`src/data/listening.ts`)

| Figure | Rule |
| --- | --- |
| This week | a rolling week: mentions from the last 7 × 24 h |
| Mentions · net sentiment · potential reach | count; (positive − negative) ÷ count; Σ reach |
| Share of voice | for the picked brand: its own keywords' mentions this week (competitor keywords excluded) against each competitor's baseline + the mentions of a competitor keyword with its name. Ember & Oak 19 · Stumptown 28 + 5 · Heart Roasters 26 · Coava 18 → 20 / 34 / 27 / 19 % |
| Keyword row | count this week; split = shares of all its mentions; line = the week before (stored per keyword) + this week's mentions per calendar day |
| Sentiment over time | 14 calendar days; this week counted from the mentions, the week before from each keyword's stored volume split like its mentions (positive and negative rounded, neutral the rest); caption = net this week vs the week before in points (39 % · −8 pts) |
| Trending terms | each keyword with its mentions this week, plus hashtags that aren't keywords and words of 4+ letters that aren't filler or part of a keyword (words need 2 mentions), from this week's mentions newest first; the 22 busiest; type size 1 + round((n − min) ÷ (max − min) × 4); even ranks keep their place and odd ranks fill in from the quiet end, so big and small alternate |
| You (competitors) | Σ followers of the brand's accounts; growth = 30-day gains ÷ (followers − gains); engagement = mean rate of its posts published in the last 28 days; posts / wk = that count ÷ 4 → 142.7K · +8.5 % · 9.2 % · 2.5 |
| Mention text | the post's text, led by "Keyword — " when the text doesn't contain the keyword |

Data (`src/data/listeningData.ts`): the 14 keywords with the week before as 7
daily values (decoded from the reference's sparklines), the 90 mentions as minutes
before "now", and the 9 competitors. All 14 lines, the 42 sentiment points, the
cloud (terms, counts, sizes and order), every stat and both tables were checked
against the reference: identical. People who also write to the inbox keep the
same placeholder photo in both places.

### Interactions

- A keyword row or a keyword in the cloud filters the stream to it; any other term
  searches the stream (and marks it), scrolling the stream into view; butter chips
  clear them, "Clear filters" clears everything.
- Sentiment, network menu and Saved filters; "Show N more" pages by 8 (6 on phones);
  "That's every mention in view." once all are listed.
- **Live**: every 12 s while the page is visible a new mention of a random keyword
  arrives on top, lit up; pausing / resuming says so in a toast.
- **Save** (star) and **Hide** (with Undo).
- **Reply in inbox** opens a conversation with the author for the keyword's brand
  (from its account on that network, else its first connected one), with the
  mention as the first message, `#listening` tag, priority when negative; logs
  "opened a conversation from an Instagram mention of “…”" in the team activity,
  toasts "Moved to the inbox · Northlight Studio" and goes to `#/inbox/:id`. The
  button then reads "Open in inbox".
- **Track a keyword**: term (hashtags get their `#` and lose spaces), kind, brand;
  "That keyword is too short to listen for.", "Ember & Oak already tracks “…”.";
  backfills 3 mentions (3 h, 29 h and 55 h ago) and toasts with Undo. **Stop
  tracking** (×) removes the keyword and its mentions, Undo puts both back in place.
  Both are logged in the team activity.
- Every card expands over the page like the analytics cards.

### Verification

| Check | Result |
| --- | --- |
| 43 landmarks (header, 6 cards, keyword row parts, filters, 3 mentions and their parts, share-of-voice rows, cloud terms, chart, table rows and headers) at **1440**, **1280**, **960** and **390** px (touch) | identical to the pixel; page heights the same |
| Chart date labels at the four widths | identical |
| Seed data replayed through the rules above | the reference's sparklines, sentiment series, cloud and figures, exactly |
| 41 interaction checks (filters, cloud, menus, save / hide / undo, paging, brand picker and empty states, track + validation + undo, stop + undo in place, live pause / arrival, reply in inbox → thread → "Open in inbox" → activity feed, expand / Escape) | all pass, no console errors |
| English text of the other pages | unchanged apart from the placeholder's route list |

Known differences: new mentions are made from the phrases and people already in
the data with this app's own seeded generator (the reference uses its own); the
reference animates the lines, bars and cloud in; role locks ("Your role can't
manage listening") are not modelled because the mock user is the owner. The
relative times ("2 h ago") now round like the reference everywhere (they used to
round down), which changed no text on the other pages. The overview's team
activity shows the seven latest events, so listening events push older ones out.

