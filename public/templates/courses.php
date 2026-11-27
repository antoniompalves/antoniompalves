<?php $GLOBALS['page_title'] = t('nav.courses'); ?>
<section class="hero hero-page hero-split">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap hero-split-grid">
    <div class="hero-copy">
      <p class="eyebrow on-dark"><?= e(t('courses.k')) ?></p>
      <h1 class="display hero-title-sm"><?= e(t('courses.h1')) ?></h1>
      <p class="hero-lead"><?= e(t('courses.lead')) ?></p>
    </div>
    <figure class="hero-split-media"><img src="<?= e(asset('assets/img/photos/hybrid-room.webp')) ?>" alt="<?= e(t('featured.photo')) ?>" width="1600" height="901"></figure>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2 class="sr-only"><?= e(t('courses.list')) ?></h2>
    <div class="course-grid course-grid-lg">
      <?php foreach (courses() as $c) partial('course-card', ['c' => $c]); ?>
      <a class="course-card course-card-custom reveal" href="<?= e(url('contact')) ?>#form">
        <span class="pillar-ic"><?= icon('spark', 22) ?></span>
        <h3><?= e(t('courses.custom.h')) ?></h3>
        <p><?= e(t('courses.custom.p')) ?></p>
        <span class="link-arrow"><?= e(t('nav.contact')) ?> <?= icon('arrow', 16) ?></span>
      </a>
    </div>
    <?php partial('app-promo'); ?>
  </div>
</section>

<section class="section section-tint">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('courses.formats')) ?></p>
      <h2 class="display"><?= e(t('course.formats.h')) ?></h2>
    </header>
    <?php partial('formats'); ?>
  </div>
</section>

<?php partial('cta'); ?>
