# RecipeBox: save recipes from social media

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
export API_TOKEN=some-secret             # optional bearer auth for the app
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
`EXTRACT_FRAMES` (default `1`), `MAX_VIDEO_SECONDS` (default `1200`), `WHISPER_MODEL` (default `small`).

Tests: `python -m pytest -q` (these use a fake extractor, so they make no API calls).

## iOS app

SwiftUI, iOS 17+. The Xcode project is generated with [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```bash
cd ios && brew install xcodegen && xcodegen && open RecipeBox.xcodeproj
```

1. Set your Team, and change `com.example.recipebox` and `group.com.example.recipebox` to IDs you own.
   The app and the extension share settings and pending jobs through that App Group.
2. Run the app, then open **Settings** and enter the backend URL. On a real device use your Mac's LAN IP or a deployed server.
3. In TikTok or Instagram, tap **Share → More → Save to RecipeBox**.

Targets: `RecipeBox` (library, search, collections, detail with serving scaler and checkable
ingredients, cook mode, grocery list, manual link/caption import) and `ShareExtension`.

## Known limits
- Instagram and Facebook often require login. Set `YTDLP_COOKIES_FILE` or the import falls back to page metadata only.
- Keep yt-dlp up to date (`pip install -U yt-dlp`). Platforms change often.
- Respect platform Terms of Service and creators' rights. Store a link back to the source (the app already does).
