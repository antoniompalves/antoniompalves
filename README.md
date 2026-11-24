# Gohan (ご飯): save recipes from social media

A ReciMe-style app. You share a TikTok, Instagram Reel, YouTube Short, Pinterest pin or
recipe-blog link to the app, and it becomes a structured recipe in your library.

```
iOS share sheet ──► Share Extension ──POST /imports──► FastAPI backend
                                                       │ 1. detect platform
                                                       │ 2. yt-dlp: caption, author, thumbnail, subtitles
                                                       │ 3. no subtitles? download audio → Whisper transcript
                                                       │ 4. ffmpeg keyframes (on-screen text: "2 cups flour")
                                                       │ 5. follow "full recipe at <link>" in caption
                                                       │ 6. blogs: schema.org/Recipe JSON-LD
                                                       ▼
                                          Claude (vision + structured output)
                                                       ▼
                                   Recipe JSON → SQLite → app library / search /
                                   collections / scaling / grocery list / cook mode
```

## How apps like this work (what's observable from the outside)

There's no magic API. TikTok and Instagram don't offer a "get recipe" endpoint. These apps:
1. Register a **Share Extension**, so the app appears in every social app's share sheet.
2. Send the URL to a **server**, because scraping, video download and transcription can't run inside an extension's memory and time limits.
3. Merge every signal they can get: the caption (often holds the full recipe), speech
   (transcribed), on-screen text (OCR or vision model), linked blog posts, and JSON-LD.
4. Have an LLM normalise everything into ingredients, steps, times, servings and nutrition, and mark which parts were guessed.
5. Remove duplicates by URL, then add library features (collections, scaling, grocery list, meal plan).

## Backend

```bash
cd backend
pip install -r requirements.txt          # optional: pip install faster-whisper (audio transcription)
export ANTHROPIC_API_KEY=...             # required for extraction
export YTDLP_COOKIES_FILE=cookies.txt    # optional, Instagram often needs a logged-in cookie jar
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

```bash
curl -X POST localhost:8000/imports -H 'content-type: application/json' \
  -d '{"url":"https://www.tiktok.com/@creator/video/123"}'
curl localhost:8000/imports/<job_id>     # queued → fetching → extracting → done
curl localhost:8000/recipes?q=garlic
```

Endpoints: `POST /imports` (`url` or pasted `text`), `GET /imports/{id}`, `GET /recipes?q=&collection=`,
`GET|PATCH|DELETE /recipes/{id}`, `GET /recipes/{id}/scaled?servings=N`, `GET /grocery-list?ids=a,b`.

Environment variables: `RECIPE_MODEL` (default `claude-opus-5-5`), `RECIPE_EFFORT` (default `medium`),
`RECIPE_LANGUAGE` (default `European Portuguese (pt-PT)`, informal *tu*; set to `source` to keep each post's own language),
`SIGNUP_CODE` (optional code that allows sign-up without an invite), `UPLOAD_DIR` (where cook photos are stored),
`EXTRACT_FRAMES` (default `1`), `MAX_VIDEO_SECONDS` (default `1200`), `WHISPER_MODEL` (default `small`).

Tests: `python -m pytest -q` (these use a fake extractor, so they make no API calls).

## Groups and accounts

Gohan is built for groups of friends. Each person has an account; recipes are **private by default**
and can be shared with one or more groups (at import time or later). Shared recipes stay owned by whoever
imported them; others can favourite them, file them in their own collections, cook them and add variations.

| Feature | What it does |
|---|---|
| **Já fiz isto** | Log that you cooked a recipe, with a photo and a note; shows on the recipe and in the group feed |
| **Variações** | Your own version of a group recipe (e.g. gluten-free) side by side with the original, which stays intact |
| **Jantares** | Dinner poll: pick 2–4 group recipes, everyone votes, the organiser closes it and a shopping list scaled to the guest count is created |
| **Compras partilhadas** | Personal or group shopping lists, updated live on everyone's phone; tap *Eu trago* to claim an item |
| **Voltava a fazer?** | Yes/no rating per person; group ranking of favourites and most-cooked this month |
| **Atividade + resumo semanal** | Group feed, unread badge on the Grupo tab, weekly summary (new recipes, cooks, top recipe, most active) |

**Push notifications** (Web Push, VAPID; no third-party push service account needed): new group recipes and
variations, someone cooked a recipe, new dinner poll and its result, new members, your import finished or failed,
and a weekly summary on Sundays at 18:00 (Lisbon). Each person picks which kinds they want in Definições; nobody is
notified about their own actions. On iPhone/iPad this needs iOS/iPadOS 16.4+ **and the app added to the Home Screen**
(Safari → Partilhar → Adicionar ao ecrã principal). Set `VAPID_SUBJECT` to a contact (`mailto:you@example.com`);
the VAPID keys are generated once and stored in the database. `WEEKLY_DIGEST=0` turns the Sunday summary off.

Live updates use Server-Sent Events (`GET /stream`). Photos are stored in `UPLOAD_DIR` (default: `uploads/` next
to the database) under unguessable names.

**Sign-up rules.** The first account can be created freely on a fresh install (it also inherits recipes imported
before accounts existed). After that, sign-up needs a **group invite link** (`/#/join/<code>`, shared from the Grupo
tab) or the server's `SIGNUP_CODE` if you set one. Passwords are hashed with scrypt; sessions are bearer tokens.
The iOS Shortcut uses your personal token (Definições → copy token).

## Estimated cost and calories

Every recipe shows an **estimated cost per serving** (with a low–high range) and **calories and macros per
serving**, computed from its ingredient lines rather than guessed:

1. Each line (`200 g de esparguete`, `2 dentes de alho`, `1 c. sopa de azeite`, `sal q.b.`) is matched to one of
   ~160 reference ingredients (`app/data/ingredients_pt.json`): aliases, plural and note stripping, then a one-off
   Claude mapping for unknown names (cached), then people's corrections (*Corrigir*, applies to everyone).
2. Quantities become grams using **measured USDA portion weights** (1 dente de alho = 3 g, 1 chávena de farinha ≈ 127 g),
   Portuguese household measures (chávena 240 ml, c. sopa 15 ml, c. chá 5 ml) and per-ingredient densities.
3. **Nutrition**: USDA FoodData Central SR Legacy (public domain). **Prices**: shelf prices from Continente and Auchan
   category pages (median = typical, 25th–75th percentile = range), used only for the amount the recipe needs.
4. **Group prices**: tapping the price chip on a shopping-list item records what was actually paid; the group's
   median paid price (last 120 days) replaces the reference price for that ingredient.

Recipes where fewer than 60% of ingredients could be matched hide the cost and fall back to the AI estimate for
calories, clearly labelled. Shopping lists show an estimated total, and dinner polls show cost per person.

**Refreshing prices** (e.g. quarterly). Collection is low-volume (one request every 1.5 s) and follows each site's
robots.txt: Continente disallows search and pagination, so only the first page of each category is read; Auchan
allows a larger page size. Check the sites' terms before running it, and keep it occasional.
```bash
python backend/tools/collect_prices.py continente && python backend/tools/collect_prices.py auchan
python backend/tools/build_reference.py --usda <FoodData_Central_sr_legacy_food_csv dir> --prices continente_prices.json auchan_prices.json
```
`tools/reference_seed.py` holds the ingredient list, USDA food names and product-name patterns; edit it to add
ingredients or fix a bad price match. The Portuguese INSA food composition table (TCA) would be a better nutrition
source for Portuguese dishes once its licence is confirmed; the pipeline is ready to take a second source.

## Web app (no App Store, no sideloading)

The backend also serves an installable web app (PWA) at `/`. It has the library, search,
collections, favorites, the servings scaler, ingredient checkboxes, cook mode (keeps the
screen awake) and the grocery list.

**1. Host it on HTTPS.** Installing to the home screen and the service worker both need HTTPS.
Any Docker host works (Render, Railway, Fly.io, a VPS with Caddy):
```bash
cd backend
docker build -t recipebox .
docker run -p 8000:8000 -v recipebox-data:/data -e ANTHROPIC_API_KEY=... recipebox
```
Sign-up is invite-only after the first account, so strangers can't spend your Anthropic credits.

**2. Install it on your iPhone.** Open the URL in Safari, tap Share → **Add to Home Screen**,
then create your account and invite your friends from the Grupo tab.

**3. Save straight from TikTok or Instagram.** iOS doesn't let web apps appear in the share
sheet, so set up a one-time **Shortcut** instead (the Settings tab shows these steps with your server URL filled in):
- Shortcuts → ＋ → turn on **Show in Share Sheet** (accepts URLs and Text)
- Add the action **Get Contents of URL**: `POST https://your-host/imports/shortcut`, JSON body
  `input` = *Shortcut Input*, header `Authorization: Bearer <token>`
- Add the action **Show Notification** with *Contents of URL*

Then in any app, tap Share → **Save to Gohan**. The recipe shows up in the web app a few seconds later.
On Android, the installed PWA appears in the share sheet directly (Web Share Target).

## iOS app (optional, native)

SwiftUI, iOS 17+. The Xcode project is generated with [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```bash
cd ios && brew install xcodegen && xcodegen && open Gohan.xcodeproj
```

1. Set your Team, and change `com.example.recipebox` and `group.com.example.recipebox` to IDs you own.
   The app and the extension share settings and pending jobs through that App Group.
2. Run the app, then open **Settings** and enter the backend URL. On a real device use your Mac's LAN IP or a deployed server.
3. In TikTok or Instagram, tap **Share → More → Save to Gohan**.

Targets: `Gohan` (library, search, collections, detail with serving scaler and checkable
ingredients, cook mode, grocery list, manual link/caption import) and `ShareExtension`.

## Known limits
- Instagram and Facebook often require login. Set `YTDLP_COOKIES_FILE` or the import falls back to page metadata only.
- Keep yt-dlp up to date (`pip install -U yt-dlp`). Platforms change often.
- Respect platform Terms of Service and creators' rights. Store a link back to the source (the app already does).

## Gohan (ご飯): recent additions

- **Brand**: Gohan (ご飯, "cooked rice / a meal"). House theme "Gohan" (sumi ink, washi paper, hanko red) is the default; the other themes stay in Definições → Aparência.
- **Home on iPad and desktop** (≥ 768 px): greeting hero with the recipe of the week, "Esta semana" side panel (next planned meals and open shopping lists), tabs at the top.
- **Bimby category**: recipes tagged `bimby`/`thermomix`, or whose steps use machine settings ("5 min/100 °C/vel. 1", colher inversa, Varoma), appear under **Bimby**. Settings are highlighted in the steps and the times start timers. The extractor keeps Bimby programs instead of converting them to stovetop steps.
- **Several links at once**: paste many links (one per line) into the import text field; each is queued as its own import (up to 50).
- **Stillness**: no pinch or double-tap zoom, no rubber-band dragging of the bars, no sideways scrolling; fields stay at 16 px so iOS doesn't zoom on focus.
- **Bimby converter (AI)**: on any recipe, "fazer na bimby" → choose TM5/TM6/TM7. Claude rewrites it for the machine: ingredients in bowl order (metric), and each step with the exact program (time / temperature or Varoma / speed, colher inversa, vel. colher, modes such as amassar or alta temperatura, accessories like borboleta, cesto, Varoma). Saved as a new personal recipe linked to the original (`POST /recipes/{id}/bimby`). Steps show a Bimby display; the time cell starts a timer.
- **Themes (proposals)**: Washi (washi paper, shoji glass, kintsugi gold) and Umami (neumorphic controls, liquid glass overlays, Material 3 states, seigaiha + red sun). The seigaiha is a CSS mask, so its colour follows the theme.

## Typography and accessibility

- **Two voices.** Fraunces (light) for titles and moments: page and section titles, recipe names on the photo, the home line, the greeting, plan day headers, the bowl menu. Zen Kaku Gothic New for the interface, in 400 / 500 / 700 only.
- **Scale** (iOS names): display 2.4–3.2rem · large title 2.125rem (2.5 on iPad/desktop) · section 1.375rem · headline 1.0625rem · body 1rem (reading text in steps 1.0625rem) · subhead .9375rem · footnote .8125rem · caption .75rem · minimum .6875rem for small caps eyebrows. Desktop (≥1024px) renders at 17px base, like Apple's body size.
- **Buttons** use small tracked capitals; titles use Portuguese sentence case.
- **Contrast:** secondary and tertiary text are derived from the ink colour (76% / 66%) and pass 4.5:1 in every theme, light and dark. Accent and success colours used as text get a darker "ink" variant. `prefers-contrast: more` strengthens them further; `prefers-reduced-transparency` replaces glass with solid surfaces; `prefers-reduced-motion` turns animations off.
- **Text size:** pinch-zoom is disabled (by request), so Definições → Aparência → *Tamanho do texto* scales the whole app (94–125%). Layouts reflow at larger sizes (stats 2×2, actions on two rows, long buttons wrap).
- **Targets:** controls are at least 44×44px; small inline controls (price, "eu trago", remove) get an invisible hit area. Keyboard focus is always visible.
