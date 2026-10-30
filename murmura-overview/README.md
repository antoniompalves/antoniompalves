# Murmura overview, calendar, inbox & analytics — React + Tailwind recreation

Pixel-matched recreation of the `#/overview` dashboard, the `#/calendar`
publishing calendar, the `#/inbox` messaging view and the `#/analytics` reports of
the Murmura social-media workspace demo, rebuilt from scratch with **React 19, TypeScript, Tailwind CSS v4
and Lucide icons**. Design tokens, layout metrics, routes and the data model were
reverse-engineered with Playwright; see [`docs/REVERSE_ENGINEERING.md`](docs/REVERSE_ENGINEERING.md).

The app speaks **English** and **European Portuguese**: it follows the browser's
language, can be switched from the account menu (avatar, top right) or forced with
`?lang=pt-PT` / `?lang=en`. See [`docs/I18N.md`](docs/I18N.md).

```bash
npm install
npm run dev        # http://localhost:5173/#/overview  ·  #/calendar  ·  #/inbox  ·  #/analytics  (add ?lang=pt-PT before the #)
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

| Analytics | Expanded card | Phone + More sheet |
| --- | --- | --- |
| ![Analytics, light theme](docs/screenshots/analytics-light.png) | ![Best time to post expanded, with the heatmap tooltip](docs/screenshots/analytics-expanded.png) | ![Analytics on a phone and the More sheet](docs/screenshots/analytics-mobile.png) |

Analytics covers 7, 30 or 90 days for every network or one of them
(`#/analytics/instagram`): audience and impressions against the previous period,
a best-time heatmap, content mix, a sortable per-network / per-account table, top
posts (opening the post drawer) and a brand comparison. Every card expands over the
page; reports export as CSV or are scheduled by email (with Undo). On phones the
bottom bar's **More** sheet leads to it and to every other page.

Below the social cards, **Websites** adds Google Analytics 4: sessions, traffic
sources (social networks first) and landing pages for each brand's sites — a brand
can have several sites or none. It runs on demo data and reads real GA4 properties
once you connect an OAuth client; see [`docs/GOOGLE_ANALYTICS.md`](docs/GOOGLE_ANALYTICS.md).

| Websites (demo data) | Connect Google Analytics |
| --- | --- |
| ![Websites section](docs/screenshots/analytics-websites.png) | ![GA4 connection dialog](docs/screenshots/analytics-ga4-dialog.png) |

| Português (Portugal) · Visão geral | Calendário | Mensagens |
| --- | --- | --- |
| ![Overview in European Portuguese](docs/screenshots/overview-pt.png) | ![Calendar in European Portuguese](docs/screenshots/calendar-pt.png) | ![Inbox in European Portuguese with the language menu](docs/screenshots/inbox-pt.png) |

## Layout

```
src/
  index.css               design tokens (light + dark) mapped to Tailwind via @theme
  App.tsx                 providers, hash router, theme toggle, ticking mock clock
  i18n/
    en.tsx                English catalogue (source of truth, defines the Messages type)
    pt-PT.tsx             European Portuguese catalogue, type-checked against English
    format.ts             cached Intl formatters pinned to UTC
    index.tsx             I18nProvider, useI18n(), locale detection and persistence
  pages/
    Overview.tsx          #/overview: header + 8 cards on a 12-col grid
    Calendar.tsx          #/calendar: stats, filters, views, side panel, drawer wiring
    Inbox.tsx             #/inbox/:id: selection, actions + toasts, shortcuts, responsive panes
    Analytics.tsx         #/analytics/:network: stats, chips, expandable cards, table, top posts, brands, websites
  components/
    AppShell.tsx          mesh background, top bar (sliding tab pill), dock, mobile nav + More sheet
    PageHead.tsx          letter-by-letter page title, header stat
    GrowthChart.tsx       SVG area chart: monotone curve, grid, crosshair, tooltip, ←/→ keys
    Toast.tsx             bottom toast with Undo
    Popover.tsx           fixed popover anchored to its trigger (flips, clamps), menu rows
    Modal.tsx             centred <dialog> form shell and a confirm dialog
    useScrollEdges.ts     edge fades for sideways scrollers on phones
    usePostActions.ts     publish / duplicate / delete with Undo, shared by calendar and inbox
    ui.tsx                Card, Button, IconButton, Segmented, Badge, StatusPill, BrandMark, NetIcon…
    calendar/
      WeekView.tsx        time grid: sticky head + ribbons, lanes, now line, ghost, heat, drop target
      MonthView.tsx       6-week grid, campaign hairlines, chips, "+N more" popover
      ListView.tsx        two-week agenda
      SidePanel.tsx       mini calendar, unscheduled drafts, this week by network
      PostDrawer.tsx      <dialog> post preview with per-network mockups and actions
      useCalendarDrag.ts  pointer-based drag & drop with 30-min snapping
    analytics/
      parts.tsx           expandable card shell, figure, legend, empty state, filter chip, sortable header
      Websites.tsx        Websites (GA4): site chips, traffic, sources, landing pages
      Ga4Dialog.tsx       GA4 client ID + websites editor, connect / disconnect
      PeriodChart.tsx     this period vs the previous one: area + dashed line, nice axis, tooltip
      Heatmap.tsx         weekday × hour engagement grid, best slots, keyboard reading
      Sparkline.tsx       96×28 follower trend for table rows
      ReportControls.tsx  Schedule a report: form, report menu, stop with confirmation
      exportCsv.ts        CSV report in the reader's language
    inbox/
      ConversationList.tsx  head, search, views, filters popover, 72px rows, empty states
      Thread.tsx            header tools + menus, pinned post, message log, composer + popovers
      ContactInfo.tsx       contact panel: conversation, assignee, tags, post, activity
      TagPopover.tsx        "Add a tag" field with suggestions
  data/
    types.ts              Workspace schema (brands, campaigns, team, posts, channels, inbox, audit…)
    mock.ts               mock workspace frozen at Fri 30 Oct 2026, 14:15 UTC (80 posts, 19 channels, 6 websites, 22 conversations)
    selectors.ts          overview view-model (worded through the active catalogue)
    calendar.ts           calendar date math, lanes, ribbons, filters, stats
    inbox.ts              inbox views, filters, search, unread counts, time labels, tag rules
    analytics.ts          analytics view-model: ranges, network filter, every figure on #/analytics
    analyticsData.ts      180 days per network, per-account totals and curves, heatmaps (from the reference)
    webAnalytics.ts       website traffic shape (GA4-like), demo generator, websites view model
    ga4.ts                GA4 Data API from the browser: Google sign-in token, batchRunReports, mapping
    ga4Store.tsx          demo ↔ live switch, GA4 settings saved per browser
    store.tsx             shared in-memory store (posts, conversations and scheduled reports, with undo)
    routes.ts             the SPA's hash routes (their names live in the catalogues)
    assets.ts             image URL helpers (swap for real assets here)
```

Theme follows `html[data-theme]` and is toggled from the dock; the language follows
`html[lang]` and is picked from the account menu (both persisted per browser).
Every visible figure is computed from `mock.ts`, so editing the mock updates the
header stats, badges, week columns, meters and chart consistently.
