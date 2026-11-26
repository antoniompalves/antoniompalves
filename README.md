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
| `/cursos/`, `/cursos/inteligencia-emocional/` | `/en/courses/…/emotional-intelligence/` |
| `/sobre/` · `/imprensa/` · `/blog/` · `/contactos/` | `/en/about/` · `/en/press/` · `/en/blog/` · `/en/contact/` |

## Editing content
| What | File |
|---|---|
| UI text and page copy | `public/lang/pt.php`, `public/lang/en.php` |
| Courses (set `'detail' => true` to give one a page) | `public/content/courses.php` |
| Delivery formats | `public/content/formats.php` |
| Services, keynote topics, process | `public/content/consulting.php` |
| Goleman–Boyatzis model (4 domains / 12 competencies) | `public/content/model.php` |
| Press / TV appearances (YouTube id + thumbnail) | `public/content/press.php`, `public/assets/img/press/` |
| Blog posts (**placeholders**, replace before launch) | `public/content/posts.php` |

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
- **Titles & descriptions:** each page has its own in `lang/pt.php` / `lang/en.php` (`seo.<page>.title` / `seo.<page>.desc`). Blog posts use `meta_title` in `content/posts.php`; the course uses `meta_desc` in `content/courses.php`.
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

## Iceberg (home page scroll story)
- The artwork is generated, not hand-drawn: `python3 tools/iceberg_gen.py out.svgfrag` builds a 3D low-poly iceberg (irregular submerged keel, crags on the tip), flat-shades it, adds depth fog, light rays, foam and particles, and writes the SVG that is inlined in `templates/home.php` (between the `<svg class="ice-svg">` tags). Change the seed or shape parameters to get a different berg.
- Timing (which text shows when) is in `assets/js/main.js` → `STARTS` / `DIVE`; visibility per element is the `data-steps` attribute in `home.php`.
- Without JavaScript, or with "reduce motion" on, the section renders as a normal static two-column block.

## Images
Photos, client logos and TV-channel logos come from the paulojmoreira.com media library:
- `public/assets/img/photos/`: stage, training-room, Yale, Goleman, portrait cut-out and book shots (WebP)
- `public/assets/img/clients/` and `public/assets/img/media/`: monochrome logos, listed in `public/content/logos.php`

To add a client logo, drop a transparent PNG into `assets/img/clients/` and add a line to `content/logos.php`.

## Assets still to supply
- The Damiana video and poster (see above)
