# EQTraining.pt

B2B website for **EQ Training** (Paulo Moreira): Emotional Intelligence training, consulting and keynotes for companies and the public sector.
Plain **PHP 8 + Apache**, with no database and no build step. Built for **cPanel** shared hosting. **PT-PT** (default) and **EN**.

## Deploy to cPanel
1. Upload the **contents of `public/`** to `public_html/`, or to a subfolder.
2. Edit `public/config.php`: emails, phone, `booking_url` (Calendly/Bookings) and `base_url` (only if you use a subfolder).
3. Make `storage/` writable (755/775). Leads are also backed up to `storage/leads.csv`, which `.htaccess` blocks from the web.
4. `email_from` must be a real mailbox on the domain, or PHP `mail()` gets flagged as spam.
5. Once SSL is active, uncomment the HTTPS redirect in `.htaccess`.

Local preview: `php -S 127.0.0.1:8080 -t public dev-router.php`

## URLs
| PT | EN |
|---|---|
| `/` | `/en/` |
| `/servicos/` (tabs: `#ceos` `#teams` `#orgs` `#keynotes`) | `/en/services/` |
| `/cursos/` and one page per programme: `inteligencia-emocional/`, `formacao-com-app/` (8 sessions + practice app + management report), `gestao-de-stress-e-burnout/`, `gestao-de-conflitos-e-negociacao/`, `inteligencia-comportamental/`, `motivacao-e-tomada-de-decisao/` | `/en/courses/`, `…/emotional-intelligence/`, `…/training-with-app/`, `…/stress-and-burnout/`, `…/conflict-and-negotiation/`, `…/behavioural-intelligence/`, `…/motivation-and-decision-making/` |
| `/sobre/` · `/imprensa/` · `/blog/` · `/contactos/` | `/en/about/` · `/en/press/` · `/en/blog/` · `/en/contact/` |

## Editing content
| What | File |
|---|---|
| UI text and page copy | `public/lang/pt.php`, `public/lang/en.php` |
| Programme catalogue: card, title, slug, tagline (`'detail' => true` gives a programme its page; `'cover'` = card image; `'template'` = custom page template). A programme without a page links to the contact form with the programme preselected (`/contactos/?p=<id>`) | `public/content/courses.php`, card images in `public/assets/img/programmes/` (cropped from the programme banners, text removed) |
| Programme pages, common 8-part structure: 1 Apresentação · 2 Desafios organizacionais · 3 Objetivos e competências · 4 Conteúdos formativos · 5 Metodologia · 6 Formato e organização · 7 Personalização e acompanhamento · 8 Contacto, with a sticky in-page menu | Template `public/templates/course.php`; copy per programme in `public/content/programmes/<id>.php`; shared parts (anchors, customisation steps, follow-up) in `public/content/programme-common.php`; labels `prog.*` in `lang/*.php`. **Inteligência Comportamental** and **Motivação e Tomada de Decisão** are drafts to review: their WordPress pages were empty templates. |
| "Formação com App" page copy, in the same 8 parts (challenges with sources, objectives, sessions, timeline, screens, dashboard, reports, FAQ) | `public/templates/programme.php`, `public/content/app-programme.php` (UI labels in `lang/*.php` under `programme.*`) |
| Delivery formats | `public/content/formats.php` |
| Services, keynote topics, process | `public/content/consulting.php` |
| Goleman–Boyatzis model (4 domains / 12 competencies) | `public/content/model.php` |
| Press / TV appearances (YouTube id + thumbnail) | `public/content/press.php`, `public/assets/img/press/` |
| Blog posts (38 PT articles imported from treinointeligenciaemocional.com; covers in `assets/img/blog/`) | `public/content/posts.php` |

## Damiana video widget
Upload `public/assets/video/damiana.mp4` (H.264, about 10–20 s, under 8 MB, portrait or square framing, face in the upper third)
and optionally `public/assets/img/damiana-poster.jpg`. Until then the widget shows a "D" placeholder.
Every "Book a meeting" button opens the widget. Its question box sends an email lead through `/api/lead`.

## Social links & sister brand
- Social profiles (LinkedIn, Instagram, Facebook, YouTube, Spotify, Apple Podcasts) are in `config.php` → `social`. They show in the footer, on About (founder), on Contact, and in the page's structured data (`sameAs`). The YouTube link also appears on Press.
- Sister brand **Emoty Games** (children, families, schools): `config.php` → `kids_url`. It appears as a small card in "As nossas marcas" and as a footer link.
- Sister brand **Treino Inteligência Emocional®** (B2C): `config.php` → `b2c_url` / `b2c_agenda_url`. It appears in the "As nossas marcas" section on About (`#marcas`), the band on Home and the footer. Update `b2c_agenda_url` when the new B2C site goes live.

## SEO (built in)
- **Domain:** `config.php` → `site_url` (default `https://eqtraining.pt`). It is used for canonical URLs, hreflang, `sitemap.xml`, `robots.txt` and the social/structured-data tags. Change it if the domain differs.
- **Titles & descriptions:** each page has its own in `lang/pt.php` / `lang/en.php` (`seo.<page>.title` / `seo.<page>.desc`). Blog posts use the short titles in `content/post-meta.php` (by PT slug), else `meta_title`/the headline; " | EQ Training" is added only when it fits; programme pages use `meta_desc` in `content/courses.php`.
- **Generated routes:** `/sitemap.xml` (PT+EN with hreflang alternates) and `/robots.txt`.
- **Structured data (JSON-LD):** Organization, Person (Paulo Moreira), WebSite, BreadcrumbList, Course and BlogPosting.
- **Social previews:** `assets/img/og-pt.jpg` / `og-en.jpg` (1200×630).
- **Icons:** favicon (svg/ico), apple-touch-icon, web manifest.
- **Fonts:** self-hosted in `assets/fonts/`, with no Google Fonts request (faster, GDPR-friendly).

### Before launch
1. Complete the `[placeholders]` in `content/privacy.php` (legal entity name and tax number) and have the policy reviewed.
2. Turn on SSL and the HTTPS redirect in `.htaccess`.
3. Add the site to Google Search Console and submit `https://eqtraining.pt/sitemap.xml`.
4. Test a page in Google's Rich Results Test and LinkedIn Post Inspector.

## Test package (subfolder)
`python3 tools/build-test-package.py [folder]` (default `teste`) builds `dist/eqtraining-<folder>.zip` with only the home page, About, Contact (with the Damiana popup and both forms), the "Inteligência Emocional" programme and the privacy policy, in PT and EN. Unzip it into `public_html/<folder>/`.
- It sets `base_url`, `noindex`, `pages`, `courses_list` and `course_ids` in the package's `config.php`. The same keys work on the main site: leave them out to show everything.
- Links to switched-off pages are hidden and those URLs return 404. "Programas" opens the first programme. robots.txt disallows everything and every page sends `noindex, nofollow`.
- The package's `.htaccess` has `RewriteBase /<folder>/`. Tested under Apache 2.4 + PHP 8.3 in a subfolder.

## Iceberg (home page scroll story)
- The artwork is generated, not hand-drawn: `python3 tools/iceberg_gen.py out.svgfrag` builds a 3D low-poly iceberg (irregular submerged keel, crags on the tip), flat-shades it, adds depth fog, light rays, foam and particles, and writes the SVG that is inlined in `templates/home.php` (between the `<svg class="ice-svg">` tags). Change the seed or shape parameters to get a different berg.
- Timing (which text shows when) is in `assets/js/main.js` → `STARTS` / `DIVE`; visibility per element is the `data-steps` attribute in `home.php`.
- Without JavaScript, or with "reduce motion" on, the section renders as a normal static two-column block.

## "Formação com App" page
- `analise-real.webp` is a real screenshot of the trainer's Análise tab (demo group, fictitious data). The other app screens and report pages in `public/assets/img/app/` are recreations of the real app (formacao.treinointeligenciaemocional.com), built with the app's own stylesheet and **demo data**. The page labels them "Ecrãs ilustrativos, com dados de demonstração".
- To change the demo data or re-render: edit the arrays at the bottom of `tools/app-screens/index.html`, then run `node tools/app-screens/shoot.js` (Playwright + Pillow). To use real captures instead, overwrite the WebP files with the same names.
- Only publish real results with the client's permission, aggregated (n ≥ 5) and without names, as the app itself does.
- Figures in the "challenges" section each link to their source (OPP 2026, Gallup 2026, Gartner 2025/2026, EU-OSHA 2025, CIPD 2023, Lei 102/2009). Re-check them yearly.
- Proposal requests from any programme page arrive via `/api/lead` with source `programme` (subject "Pedido de proposta: <programme>"), including group size and format. Note: `storage/leads.csv` now has two extra columns (size, format) before the message.

## Images
Photos, client logos and TV-channel logos come from the paulojmoreira.com media library:
- `public/assets/img/photos/`: stage, training-room, Yale, Goleman, portrait cut-out and book shots (WebP)
- `public/assets/img/clients/` and `public/assets/img/media/`: monochrome logos, listed in `public/content/logos.php`

To add a client logo, drop a transparent PNG into `assets/img/clients/` and add a line to `content/logos.php`.

## Assets still to supply
- The Damiana video and poster (see above)
