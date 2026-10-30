# Murmura overview — React + Tailwind recreation

Pixel-matched recreation of the `#/overview` dashboard of the Murmura social-media
workspace demo, rebuilt from scratch with **React 19, TypeScript, Tailwind CSS v4 and
Lucide icons**. Design tokens, layout metrics, routes and the data model were
reverse-engineered with Playwright; see [`docs/REVERSE_ENGINEERING.md`](docs/REVERSE_ENGINEERING.md).

```bash
npm install
npm run dev        # http://localhost:5173/#/overview
npm run build      # type-check + production build
```

| Light | Dark |
| --- | --- |
| ![Overview, light theme](docs/screenshots/overview-light.png) | ![Overview, dark theme](docs/screenshots/overview-dark.png) |

## Layout

```
src/
  index.css               design tokens (light + dark) mapped to Tailwind via @theme
  App.tsx                 hash router, theme toggle, ticking mock clock
  pages/Overview.tsx      the #/overview view: header + 8 cards on a 12-col grid
  components/
    AppShell.tsx          mesh background, top bar (sliding tab pill), dock, mobile nav
    GrowthChart.tsx       SVG area chart: monotone curve, grid, crosshair, tooltip, ←/→ keys
    ui.tsx                Card, Button, IconButton, Badge, StatusPill, BrandMark, NetIcon…
  data/
    types.ts              Workspace schema (brands, team, posts, channels, inbox, audit…)
    mock.ts               mock workspace frozen at Fri 30 Oct 2026, 14:15 UTC
    selectors.ts          derives every number on the page + formatting helpers
    routes.ts             the SPA's hash routes and what each view contains
    assets.ts             image URL helpers (swap for real assets here)
```

Theme follows `html[data-theme]` and is toggled from the dock (persisted per browser).
Every visible figure is computed from `mock.ts`, so editing the mock updates the
header stats, badges, week columns, meters and chart consistently.
