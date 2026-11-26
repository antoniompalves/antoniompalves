<?php $GLOBALS['page_title'] = t('nav.courses'); ?>
<section class="hero hero-page">
  <div class="hero-bg" aria-hidden="true"><span class="blob b1"></span><span class="blob b3"></span><span class="grain"></span></div>
  <div class="wrap">
    <p class="eyebrow on-dark"><?= e(t('courses.k')) ?></p>
    <h1 class="display hero-title-sm"><?= e(t('courses.h1')) ?></h1>
    <p class="hero-lead"><?= e(t('courses.lead')) ?></p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="course-grid course-grid-lg">
      <?php foreach (courses() as $c) partial('course-card', ['c' => $c]); ?>
      <a class="course-card course-card-custom reveal" href="<?= e(url('contact')) ?>#form">
        <span class="pillar-ic"><?= icon('spark', 22) ?></span>
        <h3><?= e(t('courses.custom.h')) ?></h3>
        <p><?= e(t('courses.custom.p')) ?></p>
        <span class="link-arrow"><?= e(t('nav.contact')) ?> <?= icon('arrow', 16) ?></span>
      </a>
    </div>
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
