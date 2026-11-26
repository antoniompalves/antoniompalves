<?php
$GLOBALS['page_title'] = t('nav.press');
$items = require ROOT . '/content/press.php';
$logos = require ROOT . '/content/logos.php';
?>
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow"><?= e(t('press.k')) ?></p>
    <h1 class="display"><?= e(t('press.h1')) ?></h1>
    <p class="section-lead"><?= e(t('press.lead')) ?></p>
    <ul class="seen-logos outlets" aria-label="<?= e(t('press.outlets')) ?>">
      <?php foreach ($logos['media'] as [$f, $n, $w, $h]): ?>
        <li><img src="<?= e(asset('assets/img/media/' . $f . '.png')) ?>" alt="<?= e($n) ?>" width="<?= $w ?>" height="<?= $h ?>"></li>
      <?php endforeach; ?>
    </ul>
  </div>
</section>

<section class="section section-flush">
  <div class="wrap">
    <div class="press-filter" role="group" aria-label="<?= e(t('press.filter')) ?>" data-press-filter>
      <button class="is-active" data-f="all" aria-pressed="true"><?= e(t('press.all')) ?> <span><?= count($items) ?></span></button>
      <button data-f="tv" aria-pressed="false"><?= e(t('press.tv')) ?> <span><?= count(array_filter($items, fn($p) => $p['type'] === 'tv')) ?></span></button>
      <button data-f="talk" aria-pressed="false"><?= e(t('press.talk')) ?> <span><?= count(array_filter($items, fn($p) => $p['type'] === 'talk')) ?></span></button>
    </div>
    <h2 class="sr-only"><?= e(t('press.list')) ?></h2>
    <div class="press-grid">
      <?php foreach ($items as $i => $p): ?>
        <article class="press-card reveal<?= $i === 0 ? ' is-lead' : '' ?>" data-type="<?= e($p['type']) ?>">
          <button type="button" class="press-thumb" data-yt="<?= e($p['yt']) ?>" aria-label="<?= e(t('press.watch')) ?>: <?= e($p['outlet'] . ' — ' . tr($p['title'])) ?>">
            <img src="<?= e(asset('assets/img/press/' . $p['img'] . '.webp')) ?>" alt="" loading="lazy" width="800" height="426">
            <span class="play"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
          </button>
          <div class="press-meta"><strong><?= e($p['outlet']) ?></strong> · <?= e(tr($p['show'])) ?> · <time datetime="<?= e($p['date']) ?>"><?= e(fmt_date($p['date'])) ?></time></div>
          <h3><?= e(tr($p['title'])) ?></h3>
        </article>
      <?php endforeach; ?>
    </div>
    <?php $yt = array_values(array_filter(cfg('social') ?: [], fn($s) => $s[0] === 'youtube')); if ($yt): ?>
      <p class="press-more"><a class="btn btn-ghost" href="<?= e($yt[0][2]) ?>" target="_blank" rel="noopener"><?= icon('youtube', 18) ?><?= e(t('press.youtube')) ?> <?= icon('external', 15) ?></a></p>
    <?php endif; ?>
  </div>
</section>

<section class="section section-tint">
  <div class="wrap press-contact">
    <div>
      <p class="eyebrow"><?= e(t('press.media.k')) ?></p>
      <h2 class="display"><?= e(t('press.media.h')) ?></h2>
      <p class="section-lead"><?= e(t('press.media.p')) ?></p>
    </div>
    <div class="cta-actions">
      <a class="btn btn-primary btn-lg" href="mailto:<?= e(cfg('email_to')) ?>?subject=<?= rawurlencode(t('press.media.subject')) ?>"><?= icon('mail', 18) ?><?= e(t('press.media.cta')) ?></a>
      <a class="btn btn-ghost btn-lg" href="tel:<?= e(cfg('phone_raw')) ?>"><?= icon('phone', 18) ?><?= e(cfg('phone')) ?></a>
    </div>
  </div>
</section>

<?php partial('video-modal'); ?>
