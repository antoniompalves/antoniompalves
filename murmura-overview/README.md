# Murmura overview & calendar — React + Tailwind recreation

Pixel-matched recreation of the `#/overview` dashboard and the `#/calendar`
publishing calendar of the Murmura social-media workspace demo, rebuilt from
scratch with **React 19, TypeScript, Tailwind CSS v4 and Lucide icons**. Design
tokens, layout metrics, routes and the data model were reverse-engineered with
Playwright; see [`docs/REVERSE_ENGINEERING.md`](docs/REVERSE_ENGINEERING.md).

```bash
npm install
npm run dev        # http://localhost:5173/#/overview  ·  #/calendar
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

## Layout

```
src/
  index.css               design tokens (light + dark) mapped to Tailwind via @theme
  App.tsx                 providers, hash router, theme toggle, ticking mock clock
  pages/
    Overview.tsx          #/overview: header + 8 cards on a 12-col grid
    Calendar.tsx          #/calendar: stats, filters, views, side panel, drawer wiring
  components/
    AppShell.tsx          mesh background, top bar (sliding tab pill), dock, mobile nav
    PageHead.tsx          letter-by-letter page title, header stat
    GrowthChart.tsx       SVG area chart: monotone curve, grid, crosshair, tooltip, ←/→ keys
    Toast.tsx             bottom toast with Undo
    ui.tsx                Card, Button, IconButton, Segmented, Badge, StatusPill, BrandMark, NetIcon…
    calendar/
      WeekView.tsx        time grid: sticky head + ribbons, lanes, now line, ghost, heat, drop target
      MonthView.tsx       6-week grid, campaign hairlines, chips, "+N more" popover
      ListView.tsx        two-week agenda
      SidePanel.tsx       mini calendar, unscheduled drafts, this week by network
      PostDrawer.tsx      <dialog> post preview with per-network mockups and actions
      useCalendarDrag.ts  pointer-based drag & drop with 30-min snapping
  data/
    types.ts              Workspace schema (brands, campaigns, team, posts, channels, inbox, audit…)
    mock.ts               mock workspace frozen at Fri 30 Oct 2026, 14:15 UTC (80 posts)
    selectors.ts          overview view-model + formatting helpers
    calendar.ts           calendar date math, lanes, ribbons, filters, stats
    store.tsx             shared in-memory store (move, publish, duplicate, delete, undo)
    routes.ts             the SPA's hash routes and what each view contains
    assets.ts             image URL helpers (swap for real assets here)
```

Theme follows `html[data-theme]` and is toggled from the dock (persisted per browser).
Every visible figure is computed from `mock.ts`, so editing the mock updates the
header stats, badges, week columns, meters and chart consistently.
