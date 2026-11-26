<?php
$page   = $GLOBALS['current_page'] ?? 'home';
$titleT = $GLOBALS['page_title'] ?? null;
$title  = $titleT ? $titleT . ' — EQ Training' : t('meta.title');
$desc   = $GLOBALS['page_desc'] ?? t('meta.desc');
$nav    = ['services', 'courses', 'about', 'press', 'blog', 'contact'];
$heroDark = in_array($page, ['home', 'courses', 'about', 'services'], true) || isset($GLOBALS['current_data']['course']);
?><!doctype html>
<html lang="<?= lang() === 'pt' ? 'pt-PT' : 'en' ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e($desc) ?>">
<link rel="canonical" href="<?= e(absolute(alt_url(lang()))) ?>">
<?php foreach (cfg('langs') as $l): ?>
<link rel="alternate" hreflang="<?= $l === 'pt' ? 'pt-PT' : 'en' ?>" href="<?= e(absolute(alt_url($l))) ?>">
<?php endforeach; ?>
<link rel="alternate" hreflang="x-default" href="<?= e(absolute(alt_url(cfg('default_lang')))) ?>">
<meta property="og:title" content="<?= e($title) ?>">
<meta property="og:description" content="<?= e($desc) ?>">
<meta property="og:type" content="website">
<meta property="og:locale" content="<?= lang() === 'pt' ? 'pt_PT' : 'en_GB' ?>">
<meta name="theme-color" content="#041a3a">
<link rel="icon" href="<?= asset('assets/img/favicon.svg') ?>" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Urbanist:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= asset('assets/css/style.css') ?>">
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
        <a class="btn btn-primary" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('nav.cta')) ?></a>
      </div>
    </nav>
    <div class="header-actions">
      <div class="lang-switch" role="group" aria-label="<?= e(t('nav.lang')) ?>">
        <?php foreach (cfg('langs') as $l): ?>
          <a href="<?= e(alt_url($l)) ?>" hreflang="<?= $l ?>" lang="<?= $l ?>"<?= $l === lang() ? ' aria-current="true"' : '' ?>><?= strtoupper($l) ?></a>
        <?php endforeach; ?>
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
      <a class="social" href="<?= e(cfg('linkedin')) ?>" rel="noopener" target="_blank" aria-label="LinkedIn"><?= icon('linkedin', 22) ?></a>
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
        <li><?= icon('pin', 16) ?><span><?= e(cfg('address')) ?></span></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>© <?= date('Y') ?> EQ Training. <?= e(t('footer.rights')) ?></span>
    <span class="footer-links">
      <a href="#"><?= e(t('footer.privacy')) ?></a>
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
