<?php
$page   = $GLOBALS['current_page'] ?? 'home';
$data   = $GLOBALS['current_data'] ?? [];
$detail = isset($data['course']) || isset($data['post']);
// Title & description: explicit override > per-page SEO strings > detail-page title > site default
if (!empty($GLOBALS['page_title_full']))            $title = $GLOBALS['page_title_full'];
elseif (!$detail && has_t("seo.$page.title"))        $title = t("seo.$page.title");
elseif (!empty($GLOBALS['page_title']))              $title = $GLOBALS['page_title'] . ' | EQ Training';
else                                                 $title = t('meta.title');
if (!empty($GLOBALS['page_desc']))                   $desc = $GLOBALS['page_desc'];
elseif (has_t("seo.$page.desc"))                     $desc = t("seo.$page.desc");
else                                                 $desc = t('meta.desc');
$nav      = ['services', 'programme', 'courses', 'about', 'press', 'blog', 'contact'];
$heroDark = in_array($page, ['home', 'courses', 'about', 'services', 'programme'], true) || isset($data['course']);
$canon    = absolute(alt_url(lang()));
$ogImage  = absolute(rtrim(cfg('base_url'), '/') . '/assets/img/og-' . lang() . '.jpg');
$locale   = ['pt' => 'pt_PT', 'en' => 'en_GB'];
$altLangs = isset($data['post']) ? post_langs($data['post']) : cfg('langs'); // a post only has alternates in languages it exists in

// Structured data (@graph): organisation, founder, website, breadcrumbs + page-specific nodes
$site   = rtrim(absolute(url('home', cfg('default_lang'))), '/');
$social = array_column(cfg('social') ?: [], 2);
$graph  = [
    ['@type' => 'Organization', '@id' => $site . '/#org', 'name' => 'EQ Training', 'url' => $site . '/',
     'logo' => ['@type' => 'ImageObject', 'url' => absolute(asset('assets/img/logo.png'))],
     'email' => cfg('email_to'), 'telephone' => cfg('phone'),
     'areaServed' => ['@type' => 'Country', 'name' => 'Portugal'],
     'founder' => ['@id' => $site . '/#paulo'],
     'brand' => [['@type' => 'Brand', 'name' => cfg('b2c_name'), 'url' => cfg('b2c_url')], ['@type' => 'Brand', 'name' => cfg('kids_name'), 'url' => cfg('kids_url')]]],
    ['@type' => 'Person', '@id' => $site . '/#paulo', 'name' => 'Paulo Moreira', 'jobTitle' => t('about.founder.r'),
     'image' => absolute(asset('assets/img/photos/paulo-portrait.webp')), 'worksFor' => ['@id' => $site . '/#org'], 'sameAs' => $social],
    ['@type' => 'WebSite', '@id' => $site . '/#website', 'url' => $site . '/', 'name' => 'EQ Training',
     'inLanguage' => ['pt-PT', 'en'], 'publisher' => ['@id' => $site . '/#org']],
];
if ($page !== 'home' && $page !== '404') {
    $crumbs = [[t('nav.home'), url('home')]];
    $crumbs[] = [$page === 'privacy' ? t('footer.privacy') : t('nav.' . $page), url($page)];
    if (isset($data['course'])) $crumbs[] = [tr($data['course']['title']), url('courses', null, $data['course']['slug'][lang()])];
    if (isset($data['post']))   $crumbs[] = [tr($data['post']['title']), url('blog', null, $data['post']['slug'][lang()])];
    $graph[] = ['@type' => 'BreadcrumbList', 'itemListElement' => array_map(
        fn($c, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $c[0], 'item' => absolute($c[1])], $crumbs, array_keys($crumbs))];
}
foreach ($GLOBALS['jsonld'] ?? [] as $node) $graph[] = $node;
?><!doctype html>
<html lang="<?= lang() === 'pt' ? 'pt-PT' : 'en' ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e($desc) ?>">
<?php if ($page === '404'): ?><meta name="robots" content="noindex, follow">
<?php else: ?>
<link rel="canonical" href="<?= e($canon) ?>">
<?php foreach ($altLangs as $l): ?>
<link rel="alternate" hreflang="<?= $l === 'pt' ? 'pt-PT' : 'en' ?>" href="<?= e(absolute(alt_url($l))) ?>">
<?php endforeach; ?>
<link rel="alternate" hreflang="x-default" href="<?= e(absolute(alt_url(cfg('default_lang')))) ?>">
<?php endif; ?>
<meta property="og:site_name" content="EQ Training">
<meta property="og:title" content="<?= e($title) ?>">
<meta property="og:description" content="<?= e($desc) ?>">
<meta property="og:url" content="<?= e($canon) ?>">
<meta property="og:type" content="<?= isset($data['post']) ? 'article' : 'website' ?>">
<meta property="og:locale" content="<?= $locale[lang()] ?>">
<?php foreach ($altLangs as $l): if ($l !== lang()): ?><meta property="og:locale:alternate" content="<?= $locale[$l] ?>">
<?php endif; endforeach; ?>
<meta property="og:image" content="<?= e($ogImage) ?>">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="<?= e(t('meta.ogalt')) ?>">
<?php if (isset($data['post'])): ?><meta property="article:published_time" content="<?= e($data['post']['date']) ?>">
<meta property="article:author" content="Paulo Moreira">
<?php endif; ?>
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#061a3a">
<link rel="icon" href="<?= asset('assets/img/favicon.svg') ?>" type="image/svg+xml">
<link rel="icon" href="<?= rtrim(cfg('base_url'), '/') ?>/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="<?= asset('assets/img/apple-touch-icon.png') ?>">
<link rel="manifest" href="<?= asset('site.webmanifest') ?>">
<link rel="preload" href="<?= asset('assets/fonts/urbanist-latin-5.woff2') ?>" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="<?= asset('assets/fonts/inter-latin-1.woff2') ?>" as="font" type="font/woff2" crossorigin>
<?php if ($page === 'home'): ?><link rel="preload" href="<?= asset('assets/img/photos/stage-dark.webp') ?>" as="image" fetchpriority="high">
<?php endif; ?>
<link rel="stylesheet" href="<?= asset('assets/fonts/fonts.css') ?>">
<link rel="stylesheet" href="<?= asset('assets/css/style.css') ?>">
<script type="application/ld+json"><?= json_encode(['@context' => 'https://schema.org', '@graph' => $graph], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?></script>
</head>
<body class="page-<?= e($page) ?><?= $heroDark ? ' has-dark-hero' : '' ?>">
<a class="skip" href="#main"><?= e(t('skip')) ?></a>

<header class="site-header" data-header>
  <div class="wrap header-inner">
    <a class="brand" href="<?= e(url('home')) ?>" aria-label="EQ Training">
      <img class="logo logo-color" src="<?= asset('assets/img/logo.png') ?>" alt="EQ Training" width="160" height="19">
      <img class="logo logo-white" src="<?= asset('assets/img/logo-white.png') ?>" alt="" width="160" height="19" aria-hidden="true">
    </a>
    <nav class="main-nav" id="main-nav" aria-label="Main">
      <ul>
        <?php foreach ($nav as $n): ?>
          <li><a href="<?= e(url($n)) ?>"<?= $page === $n ? ' aria-current="page"' : '' ?>><?= e(t('nav.' . $n)) ?></a></li>
        <?php endforeach; ?>
      </ul>
      <div class="nav-mobile-extra">
        <div class="nav-lang" role="group" aria-label="<?= e(t('nav.lang')) ?>">
          <span class="nav-lang-k"><?= icon('globe', 16) ?><?= e(t('nav.lang')) ?></span>
          <span class="nav-lang-opts">
            <?php foreach (cfg('langs') as $l): ?>
              <a href="<?= e(alt_url($l)) ?>" hreflang="<?= $l ?>" lang="<?= $l ?>"<?= $l === lang() ? ' aria-current="true"' : '' ?>><?= ['pt' => 'Português', 'en' => 'English'][$l] ?? strtoupper($l) ?></a>
            <?php endforeach; ?>
          </span>
        </div>
        <a class="btn btn-primary" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('nav.cta')) ?></a>
      </div>
    </nav>
    <div class="header-actions">
<?php $langNames = ['pt' => 'Português', 'en' => 'English']; $others = array_values(array_diff(cfg('langs'), [lang()])); ?>
      <div class="lang-menu" data-lang-menu>
        <button class="lang-current" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="lang-pop" aria-label="<?= e(t('nav.lang')) ?>: <?= e($langNames[lang()]) ?>">
          <?= icon('globe', 15) ?><span><?= strtoupper(lang()) ?></span><?= icon('chevron', 12) ?>
        </button>
        <ul class="lang-pop" id="lang-pop">
          <?php foreach ($others as $l): ?>
            <li><a href="<?= e(alt_url($l)) ?>" hreflang="<?= $l ?>" lang="<?= $l ?>"><strong><?= strtoupper($l) ?></strong><span><?= e($langNames[$l]) ?></span></a></li>
          <?php endforeach; ?>
        </ul>
      </div>
      <a class="btn btn-primary btn-sm header-cta" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('nav.cta')) ?></a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="main-nav" data-nav-toggle>
        <span class="sr-only"><?= e(t('nav.menu')) ?></span><?= icon('menu', 22) ?>
      </button>
    </div>
  </div>
</header>

<main id="main">
<?= $content ?>
</main>

<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <img src="<?= asset('assets/img/logo-white.png') ?>" alt="EQ Training" width="180" height="22">
      <p><?= e(t('footer.tag')) ?></p>
      <p class="footer-k"><?= e(t('social.h')) ?></p>
      <?php partial('social'); ?>
      <div class="footer-cert"><img src="<?= asset('assets/img/dgert.png') ?>" alt="<?= e(t('footer.dgert')) ?>" width="107" height="48" loading="lazy"></div>
    </div>
    <div>
      <h3><?= e(t('footer.nav')) ?></h3>
      <ul>
        <li><a href="<?= e(url('home')) ?>"><?= e(t('nav.home')) ?></a></li>
        <?php foreach ($nav as $n): ?><li><a href="<?= e(url($n)) ?>"><?= e(t('nav.' . $n)) ?></a></li><?php endforeach; ?>
      </ul>
    </div>
    <div>
      <h3><?= e(t('footer.programmes')) ?></h3>
      <ul>
        <?php foreach (courses() as $c): ?>
          <li><?php if (!empty($c['detail'])): ?><a href="<?= e(url('courses', null, $c['slug'][lang()])) ?>"><?= e(tr($c['short'])) ?></a><?php else: ?><span><?= e(tr($c['short'])) ?></span><?php endif; ?></li>
        <?php endforeach; ?>
      </ul>
    </div>
    <div>
      <h3><?= e(t('footer.contact')) ?></h3>
      <ul class="contact-list">
        <li><?= icon('phone', 16) ?><a href="tel:<?= e(cfg('phone_raw')) ?>"><?= e(cfg('phone')) ?></a></li>
        <li><?= icon('mail', 16) ?><a href="mailto:<?= e(cfg('email_to')) ?>"><?= e(cfg('email_to')) ?></a></li>
        <li><?= icon('pin', 16) ?><span><?= e(t('contact.area')) ?></span></li>
      </ul>
      <a class="footer-sister" href="<?= e(cfg('b2c_url')) ?>" target="_blank" rel="noopener">
        <span class="footer-k"><?= e(t('footer.sister')) ?></span>
        <img src="<?= asset('assets/img/brands/treino-ie-white.svg') ?>" alt="<?= e(cfg('b2c_name')) ?>" width="120" height="36" loading="lazy">
        <span class="footer-sister-p"><?= e(t('footer.sister.p')) ?> <?= icon('external', 13) ?></span>
      </a>
      <a class="footer-kids" href="<?= e(cfg('kids_url')) ?>" target="_blank" rel="noopener"><strong><?= e(cfg('kids_name')) ?></strong> · <?= e(t('footer.kids.p')) ?> <?= icon('external', 13) ?></a>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>© <?= date('Y') ?> EQ Training. <?= e(t('footer.rights')) ?></span>
    <span class="footer-links">
      <a href="<?= e(url('privacy')) ?>"><?= e(t('footer.privacy')) ?></a>
      <a href="https://www.livroreclamacoes.pt" rel="noopener" target="_blank"><?= e(t('footer.complaints')) ?></a>
    </span>
  </div>
</footer>

<?php partial('agent'); ?>

<script>window.EQ = <?= json_encode([
    'lang'     => lang(),
    'leadUrl'  => rtrim(cfg('base_url'), '/') . '/api/lead',
    'csrf'     => csrf_token(),
    'msg'      => ['sending' => t('form.sending'), 'ok' => t('form.ok'), 'err' => t('form.err'), 'invalid' => t('form.invalid'), 'thanks' => t('agent.ask.thanks'), 'mute' => t('agent.mute'), 'unmute' => t('agent.unmute')],
], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?>;</script>
<script src="<?= asset('assets/js/main.js') ?>" defer></script>
</body>
</html>
