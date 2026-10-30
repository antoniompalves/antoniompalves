# Murmura overview, calendar & inbox — React + Tailwind recreation

Pixel-matched recreation of the `#/overview` dashboard, the `#/calendar`
publishing calendar and the `#/inbox` messaging view of the Murmura social-media
workspace demo, rebuilt from scratch with **React 19, TypeScript, Tailwind CSS v4
and Lucide icons**. Design tokens, layout metrics, routes and the data model were
reverse-engineered with Playwright; see [`docs/REVERSE_ENGINEERING.md`](docs/REVERSE_ENGINEERING.md).

```bash
npm install
npm run dev        # http://localhost:5173/#/overview  ·  #/calendar  ·  #/inbox
npm run build      # type-check + production build
```

| Light | Dark |
| --- | --- |
| ![Overview, light theme](docs/screenshots/overview-light.png) | ![Overview, dark theme](docs/screenshots/overview-dark.png) |

| Calendar · Week | Month | List |
| --- | --- | --- |
| ![Calendar week view](docs/screenshots/calendar-week.png) | ![Calendar month view](docs/screenshots/calendar-month.png) | ![Calendar list view](docs/screenshots/calendar-list.png) |

The week view supports drag & drop (posts and unscheduled drafts, 30-minute
snapping, Undo), `Alt` + arrow keys, a "Best times" heat overlay, filters by
network / status / campaign, and a post preview drawer.

| Inbox · Thread | Contact info | Saved replies | Dark |
| --- | --- | --- | --- |
| ![Inbox thread with a reply and an internal note](docs/screenshots/inbox-thread.png) | ![Inbox with the contact panel](docs/screenshots/inbox-info.png) | ![Saved replies popover](docs/screenshots/inbox-saved-replies.png) | ![Inbox, dark theme](docs/screenshots/inbox-dark.png) |

The inbox has views, search with highlighting, filters, replies, internal notes,
saved replies, photos from the brand library, assignment, priority, sentiment,
tags, J / K / E / R / `/` shortcuts and Undo on every change the original lets you undo.

## Layout

```
src/
  index.css               design tokens (light + dark) mapped to Tailwind via @theme
  App.tsx                 providers, hash router, theme toggle, ticking mock clock
  pages/
    Overview.tsx          #/overview: header + 8 cards on a 12-col grid
    Calendar.tsx          #/calendar: stats, filters, views, side panel, drawer wiring
    Inbox.tsx             #/inbox/:id: selection, actions + toasts, shortcuts, responsive panes
  components/
    AppShell.tsx          mesh background, top bar (sliding tab pill), dock, mobile nav
    PageHead.tsx          letter-by-letter page title, header stat
    GrowthChart.tsx       SVG area chart: monotone curve, grid, crosshair, tooltip, ←/→ keys
    Toast.tsx             bottom toast with Undo
    Popover.tsx           fixed popover anchored to its trigger (flips, clamps), menu rows
    usePostActions.ts     publish / duplicate / delete with Undo, shared by calendar and inbox
    ui.tsx                Card, Button, IconButton, Segmented, Badge, StatusPill, BrandMark, NetIcon…
    calendar/
      WeekView.tsx        time grid: sticky head + ribbons, lanes, now line, ghost, heat, drop target
      MonthView.tsx       6-week grid, campaign hairlines, chips, "+N more" popover
      ListView.tsx        two-week agenda
      SidePanel.tsx       mini calendar, unscheduled drafts, this week by network
      PostDrawer.tsx      <dialog> post preview with per-network mockups and actions
      useCalendarDrag.ts  pointer-based drag & drop with 30-min snapping
    inbox/
      ConversationList.tsx  head, search, views, filters popover, 72px rows, empty states
      Thread.tsx            header tools + menus, pinned post, message log, composer + popovers
      ContactInfo.tsx       contact panel: conversation, assignee, tags, post, activity
      TagPopover.tsx        "Add a tag" field with suggestions
  data/
    types.ts              Workspace schema (brands, campaigns, team, posts, channels, inbox, audit…)
    mock.ts               mock workspace frozen at Fri 30 Oct 2026, 14:15 UTC (80 posts, 22 conversations)
    selectors.ts          overview view-model + formatting helpers
    calendar.ts           calendar date math, lanes, ribbons, filters, stats
    inbox.ts              inbox views, filters, search, unread counts, time labels, tag rules
    store.tsx             shared in-memory store (posts and conversations, with undo)
    routes.ts             the SPA's hash routes and what each view contains
    assets.ts             image URL helpers (swap for real assets here)
```

Theme follows `html[data-theme]` and is toggled from the dock (persisted per browser).
Every visible figure is computed from `mock.ts`, so editing the mock updates the
header stats, badges, week columns, meters and chart consistently.
