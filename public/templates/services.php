<?php
$GLOBALS['page_title'] = t('nav.services');
$data = require ROOT . '/content/consulting.php';
[$coach, $teams, $diag, $prog] = $data['services'];
$L = lang();
$tabs = [
    ['id' => 'ceos',     'icon' => 'compass',  'items' => [$coach]],
    ['id' => 'teams',    'icon' => 'users',    'items' => [$teams]],
    ['id' => 'orgs',     'icon' => 'building', 'items' => [$diag, $prog]],
    ['id' => 'keynotes', 'icon' => 'mic',      'items' => []],
];
$press = array_slice(require ROOT . '/content/press.php', 0, 3);
?>
<section class="hero hero-page hero-split">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap hero-split-grid">
    <div class="hero-copy">
      <p class="eyebrow on-dark"><?= e(t('svc.k')) ?></p>
      <h1 class="display hero-title-sm"><?= e(t('svc.h1')) ?></h1>
      <p class="hero-lead"><?= e(t('svc.lead')) ?></p>
    </div>
    <figure class="hero-split-media"><img src="<?= e(asset('assets/img/photos/stage-keynote.webp')) ?>" alt="<?= e(t('hero.caption')) ?>" width="960" height="640"></figure>
  </div>
</section>

<!-- Audience tabs -->
<div class="aud-tabs-wrap" data-aud-tabs>
  <div class="wrap">
    <div class="aud-tabs" role="tablist" aria-label="<?= e(t('svc.k')) ?>">
      <?php foreach ($tabs as $i => $tb): ?>
        <button role="tab" id="tab-<?= $tb['id'] ?>" aria-controls="panel-<?= $tb['id'] ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>" class="aud-tab<?= $i === 0 ? ' is-active' : '' ?>" data-aud-tab="<?= $tb['id'] ?>">
          <span class="aud-tab-ic"><?= icon($tb['icon'], 20) ?></span>
          <span class="aud-tab-txt"><strong><?= e(t('svc.tab.' . $tb['id'])) ?></strong><small><?= e(t('svc.tab.' . $tb['id'] . '.s')) ?></small></span>
        </button>
      <?php endforeach; ?>
    </div>
  </div>
</div>

<section class="section svc-panels">
  <div class="wrap">
    <?php foreach ($tabs as $i => $tb): ?>
      <div class="svc-panel" role="tabpanel" id="panel-<?= $tb['id'] ?>" aria-labelledby="tab-<?= $tb['id'] ?>" data-aud-panel="<?= $tb['id'] ?>"<?= $i === 0 ? '' : ' hidden' ?>>
        <header class="svc-panel-head">
          <p class="eyebrow"><?= e(t('svc.for')) ?> <?= e(t('svc.tab.' . $tb['id'])) ?></p>
          <h2 class="display"><?= e(t('svc.' . $tb['id'] . '.h')) ?></h2>
          <p class="section-lead"><?= e(t('svc.' . $tb['id'] . '.p')) ?></p>
        </header>

        <?php foreach ($tb['items'] as $s): ?>
          <article class="svc" id="<?= e($s['id']) ?>">
            <div class="svc-main">
              <span class="pillar-ic"><?= icon($s['icon'], 22) ?></span>
              <h3 class="svc-name"><?= e(tr($s['name'])) ?></h3>
              <p class="svc-one"><?= e(tr($s['one'])) ?></p>
              <div class="svc-block">
                <h4><?= e(t('svc.when')) ?></h4>
                <p><?= e(tr($s['when'])) ?></p>
              </div>
              <div class="svc-block">
                <h4><?= e(t('svc.what')) ?></h4>
                <p><?= e(tr($s['what'])) ?></p>
              </div>
            </div>
            <aside class="svc-side">
              <h4><?= e(t('svc.diff')) ?></h4>
              <ul class="checks">
                <?php foreach ($s['diff'][$L] as $d): ?><li><?= icon('check', 18) ?><span><?= e($d) ?></span></li><?php endforeach; ?>
              </ul>
              <h4><?= e(t('svc.measure')) ?></h4>
              <div class="chips">
                <?php foreach ($s['measure'][$L] as $m): ?><span class="chip"><?= e($m) ?></span><?php endforeach; ?>
              </div>
              <a class="btn btn-primary btn-block" href="<?= e(booking_href()) ?>" data-open-agent><?= e(tr($s['cta'])) ?> <?= icon('arrow', 18) ?></a>
            </aside>
          </article>
        <?php endforeach; ?>

        <?php if ($tb['id'] === 'keynotes'): ?>
          <div class="topics">
            <?php foreach ($data['keynotes']['topics'] as $k => $tp): ?>
              <article class="topic"><span class="topic-num">0<?= $k + 1 ?></span><span class="pillar-ic"><?= icon($tp['icon'], 22) ?></span><h3><?= e(tr($tp['name'])) ?></h3><p><?= e(tr($tp['desc'])) ?></p></article>
            <?php endforeach; ?>
          </div>
          <div class="svc svc-keynote">
            <div class="svc-main">
              <h3 class="svc-name"><?= e(t('svc.keynotes.formats')) ?></h3>
              <ul class="checks">
                <?php foreach ($data['keynotes']['formats'][$L] as $f): ?><li><?= icon('check', 18) ?><span><?= e($f) ?></span></li><?php endforeach; ?>
              </ul>
              <a class="btn btn-primary" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('svc.keynotes.cta')) ?> <?= icon('arrow', 18) ?></a>
            </div>
            <aside class="svc-side svc-press">
              <h4><?= e(t('svc.keynotes.seen')) ?></h4>
              <div class="press-mini">
                <?php foreach ($press as $pr): ?>
                  <button type="button" class="press-thumb" data-yt="<?= e($pr['yt']) ?>" aria-label="<?= e($pr['outlet'] . ' — ' . tr($pr['title'])) ?>">
                    <img src="<?= e(asset('assets/img/press/' . $pr['img'] . '.webp')) ?>" alt="" loading="lazy" width="800" height="426"><span class="play"><?= icon('arrow', 16) ?></span>
                  </button>
                <?php endforeach; ?>
              </div>
              <a class="link-arrow link-arrow-light" href="<?= e(url('press')) ?>"><?= e(t('nav.press')) ?> <?= icon('arrow', 16) ?></a>
            </aside>
          </div>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<?php partial('ecosystem'); ?>

<section class="section section-flush"><div class="wrap"><?php partial('app-promo'); ?></div></section>

<!-- Process -->
<section class="section section-tint">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('svc.process.k')) ?></p>
      <h2 class="display"><?= e(t('svc.process.h')) ?></h2>
    </header>
    <ol class="process" data-process>
      <?php foreach ($data['process'] as $i => $st): ?>
        <li class="process-step reveal"><span class="process-dot"><?= $i + 1 ?></span><h3><?= e(tr($st['name'])) ?></h3><p><?= e(tr($st['desc'])) ?></p></li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>

<?php partial('cta'); ?>
<?php partial('video-modal'); ?>
