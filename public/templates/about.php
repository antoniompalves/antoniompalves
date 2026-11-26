<?php
$GLOBALS['page_title'] = t('nav.about');
$photo = 'assets/img/paulo-moreira.jpg';
$certs = [
    ['EQ-i 2.0 / EQ 360', 'Bar-On · MHS', lang() === 'pt' ? 'Inteligência Emocional e bem-estar' : 'Emotional Intelligence and wellbeing'],
    ['MSCEIT', 'Mayer · Salovey · Caruso — Yale', lang() === 'pt' ? 'Aptidão emocional medida por desempenho' : 'Performance-based emotional ability'],
    ['ESCI', 'Goleman · Boyatzis — Hay Group', lang() === 'pt' ? 'Competências emocionais de liderança (360)' : 'Emotional leadership competencies (360)'],
];
?>
<section class="hero hero-page">
  <div class="hero-bg" aria-hidden="true"><span class="blob b2"></span><span class="blob b3"></span><span class="grain"></span></div>
  <div class="wrap">
    <p class="eyebrow on-dark"><?= e(t('about.k')) ?></p>
    <h1 class="display hero-title-sm"><?= e(t('about.h1')) ?></h1>
    <p class="hero-lead"><?= e(t('about.lead')) ?></p>
  </div>
</section>

<section class="section">
  <div class="wrap founder">
    <div class="founder-photo reveal">
      <?php if (asset_exists($photo)): ?>
        <img src="<?= e(asset($photo)) ?>" alt="Paulo Moreira" loading="lazy">
      <?php else: ?>
        <div class="photo-placeholder" aria-hidden="true"><span>PM</span><small><?= lang() === 'pt' ? 'Fotografia de Paulo Moreira' : 'Photo of Paulo Moreira' ?></small></div>
      <?php endif; ?>
    </div>
    <div class="founder-copy reveal">
      <p class="eyebrow"><?= e(t('about.founder.k')) ?></p>
      <h2 class="display"><?= e(t('about.founder.h')) ?></h2>
      <p class="founder-role"><?= e(t('about.founder.r')) ?></p>
      <p><?= e(t('about.founder.p1')) ?></p>
      <p><?= e(t('about.founder.p2')) ?></p>
      <a class="btn btn-primary" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('cta.book')) ?> <?= icon('arrow', 18) ?></a>
    </div>
  </div>
</section>

<section class="section section-tint">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('about.certs.k')) ?></p>
      <h2 class="display"><?= e(t('about.certs.h')) ?></h2>
    </header>
    <div class="certs">
      <?php foreach ($certs as $i => [$n, $by, $d]): ?>
        <div class="cert reveal"><span class="cert-num">0<?= $i + 1 ?></span><h3><?= e($n) ?></h3><p class="cert-by"><?= e($by) ?></p><p><?= e($d) ?></p></div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('about.values.k')) ?></p>
    </header>
    <div class="why">
      <?php foreach ([['flask', 1], ['bolt', 2], ['target', 3], ['shield', 4]] as [$ic, $i]): ?>
        <article class="why-card reveal"><span class="pillar-ic"><?= icon($ic, 22) ?></span><h3><?= e(t("about.v$i.h")) ?></h3><p><?= e(t("about.v$i.p")) ?></p></article>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<?php partial('cta'); ?>
