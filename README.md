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

## Images
Photos, client logos and TV-channel logos come from the paulojmoreira.com media library:
- `public/assets/img/photos/`: stage, training-room, Yale, Goleman, portrait cut-out and book shots (WebP)
- `public/assets/img/clients/` and `public/assets/img/media/`: monochrome logos, listed in `public/content/logos.php`

To add a client logo, drop a transparent PNG into `assets/img/clients/` and add a line to `content/logos.php`.

## Assets still to supply
- The Damiana video and poster (see above)
