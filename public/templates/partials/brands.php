<?php
/** "Our brands" — EQ Training (B2B, this site) and sister brand Treino Inteligência Emocional (B2C). */
$b2c = cfg('b2c_url');
$pod = array_values(array_filter(cfg('social') ?: [], fn($s) => in_array($s[0], ['spotify', 'podcast'], true)));
?>
<section class="section section-paper" id="marcas">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('brands.k')) ?></p>
      <h2 class="display"><?= e(t('brands.h')) ?></h2>
      <p class="section-lead"><?= e(t('brands.p')) ?></p>
    </header>

    <div class="brand-grid">
      <article class="brand-card brand-eq reveal">
        <div class="brand-top">
          <img class="brand-logo" src="<?= asset('assets/img/logo.png') ?>" alt="EQ Training" width="160" height="19">
          <span class="brand-pill"><?= e(t('brands.here')) ?></span>
        </div>
        <h3 class="brand-for"><?= e(t('brands.eq.for')) ?></h3>
        <p><?= e(t('brands.eq.p')) ?></p>
        <ul class="brand-list">
          <?php for ($i = 1; $i <= 4; $i++): ?><li><?= e(t("brands.eq.l$i")) ?></li><?php endfor; ?>
        </ul>
        <figure class="brand-photo"><img src="<?= asset('assets/img/photos/hybrid-room.webp') ?>" alt="<?= e(t('featured.photo')) ?>" width="1600" height="901" loading="lazy"></figure>
        <a class="link-arrow" href="<?= e(url('services')) ?>"><?= e(t('nav.services')) ?> <?= icon('arrow', 16) ?></a>
      </article>

      <article class="brand-card brand-tie reveal">
        <div class="brand-top">
          <img class="brand-logo" src="<?= asset('assets/img/brands/treino-ie-white.svg') ?>" alt="<?= e(cfg('b2c_name')) ?>" width="156" height="47">
          <span class="brand-pill"><?= e(t('brands.tie.tag')) ?></span>
        </div>
        <h3 class="brand-for"><?= e(t('brands.tie.for')) ?></h3>
        <p><?= e(t('brands.tie.p')) ?></p>
        <p class="brand-note"><?= e(t('brands.tie.p2')) ?></p>

        <p class="brand-path-k"><?= e(t('brands.path')) ?></p>
        <ol class="brand-path">
          <?php for ($i = 1; $i <= 4; $i++): ?>
            <li><span class="bp-step">0<?= $i ?> · <?= e(t("brands.s$i.h")) ?></span><span class="bp-items"><?= e(t("brands.s$i.p")) ?></span></li>
          <?php endfor; ?>
        </ol>

        <?php if ($pod): ?>
          <div class="brand-pod">
            <span class="brand-pod-ic"><?= icon('mic', 18) ?></span>
            <span class="brand-pod-name"><?= e(t('brands.podcast')) ?></span>
            <span class="brand-pod-links">
              <?php foreach ($pod as [$ic, $label, $href]): ?>
                <a href="<?= e($href) ?>" target="_blank" rel="noopener"><?= icon($ic, 16) ?><?= e($label) ?></a>
              <?php endforeach; ?>
            </span>
          </div>
        <?php endif; ?>

        <div class="brand-ctas">
          <a class="btn btn-light" href="<?= e($b2c) ?>" target="_blank" rel="noopener"><?= e(t('brands.visit')) ?> <?= icon('external', 16) ?></a>
          <a class="btn btn-ghost-light" href="<?= e(cfg('b2c_agenda_url') ?: $b2c) ?>" target="_blank" rel="noopener"><?= e(t('brands.agenda')) ?></a>
        </div>
      </article>

      <article class="brand-kids reveal">
        <a class="brand-kids-logo" href="<?= e(cfg('kids_url')) ?>" target="_blank" rel="noopener"><img src="<?= asset('assets/img/brands/emoty-games.png') ?>" alt="<?= e(cfg('kids_name')) ?>" width="238" height="56" loading="lazy"></a>
        <div class="brand-kids-copy">
          <span class="brand-pill"><?= e(t('brands.kids.tag')) ?></span>
          <p><?= e(t('brands.kids.p')) ?></p>
        </div>
        <a class="link-arrow" href="<?= e(cfg('kids_url')) ?>" target="_blank" rel="noopener"><?= e(t('brands.kids.visit')) ?> <?= icon('external', 15) ?></a>
      </article>
    </div>
  </div>
</section>
