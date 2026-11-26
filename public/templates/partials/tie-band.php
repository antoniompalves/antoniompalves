<?php /** Slim cross-link to the B2C sister brand (home page). */ ?>
<section class="tie-band">
  <div class="wrap">
    <div class="tie-band-inner reveal">
      <a class="tie-band-logo" href="<?= e(cfg('b2c_url')) ?>" target="_blank" rel="noopener">
        <img src="<?= asset('assets/img/brands/treino-ie-white.svg') ?>" alt="<?= e(cfg('b2c_name')) ?>" width="156" height="47" loading="lazy">
      </a>
      <div class="tie-band-copy">
        <p class="eyebrow on-dark"><?= e(t('tie.k')) ?></p>
        <h2><?= e(t('tie.h')) ?></h2>
        <p><?= e(t('tie.p')) ?></p>
      </div>
      <div class="tie-band-links">
        <a class="btn btn-light" href="<?= e(cfg('b2c_url')) ?>" target="_blank" rel="noopener"><?= e(t('tie.visit')) ?> <?= icon('external', 16) ?></a>
        <a class="link-arrow link-arrow-light" href="<?= e(url('about')) ?>#marcas"><?= e(t('tie.more')) ?> <?= icon('arrow', 16) ?></a>
      </div>
    </div>
  </div>
</section>
