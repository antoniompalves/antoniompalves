<?php /** Promo banner for the training-with-app programme. @var string $tag heading tag (h2|h3) */
$tag = $tag ?? 'h2';
$app = current(array_filter(courses(), fn($c) => $c['id'] === 'app'));
if (!$app) return; ?>
<a class="app-promo reveal" href="<?= e(url('courses', null, $app['slug'][lang()])) ?>">
  <div class="app-promo-copy">
    <p class="eyebrow on-dark"><?= e(t('promo.k')) ?></p>
    <<?= $tag ?> class="display"><?= e(t('promo.h')) ?></<?= $tag ?>>
    <p><?= e(t('promo.p')) ?></p>
    <span class="link-arrow link-arrow-light"><?= e(t('promo.cta')) ?> <?= icon('arrow', 16) ?></span>
  </div>
  <div class="app-promo-media" aria-hidden="true">
    <img class="app-promo-dash" src="<?= e(asset('assets/img/app/direcao.webp')) ?>" alt="" width="2000" height="1362" loading="lazy">
    <span class="device-phone"><img src="<?= e(asset('assets/img/app/hoje.webp')) ?>" alt="" width="780" height="1688" loading="lazy"></span>
  </div>
</a>
