<?php
/** @var array $course */
$GLOBALS['page_title'] = tr($course['title']);
$GLOBALS['page_desc']  = tr($course['excerpt']);
$L = lang();
?>
<section class="hero hero-course">
  <img class="hero-backdrop" src="<?= e(asset('assets/img/photos/training-room.webp')) ?>" alt="" width="1600" height="900">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap course-hero-grid">
    <div class="hero-copy">
      <nav class="crumbs on-dark" aria-label="Breadcrumb">
        <a href="<?= e(url('home')) ?>"><?= e(t('nav.home')) ?></a><span>/</span>
        <a href="<?= e(url('courses')) ?>"><?= e(t('nav.courses')) ?></a><span>/</span>
        <span aria-current="page"><?= e(tr($course['short'])) ?></span>
      </nav>
      <h1 class="display hero-title-sm"><?= e(tr($course['title'])) ?></h1>
      <p class="hero-lead"><?= e(tr($course['tagline'])) ?></p>
      <div class="hero-ctas">
        <a class="btn btn-primary btn-lg" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('cta.book')) ?> <?= icon('arrow', 18) ?></a>
        <a class="btn btn-ghost-light btn-lg" href="#formats"><?= e(t('courses.formats')) ?></a>
      </div>
      <ul class="hero-chips">
        <li><?= icon('flask', 16) ?>ESCI · MSCEIT · EQ-i</li>
        <li><?= icon('clock', 16) ?><?= $L === 'pt' ? '1h30 a 6 meses' : '1.5h to 6 months' ?></li>
        <li><?= icon('pin', 16) ?><?= $L === 'pt' ? 'Presencial ou online' : 'On-site or online' ?></li>
      </ul>
    </div>
    <aside class="book-card glass">
      <div class="book-head">
        <span class="book-avatar" aria-hidden="true"><?= e(implode('', array_map(fn($w) => mb_substr($w, 0, 1), array_slice(explode(' ', cfg('agent_fullname')), 0, 2)))) ?></span>
        <div><strong><?= e(cfg('agent_fullname')) ?></strong><span><?= e(t('agent.role')) ?></span></div>
      </div>
      <h2><?= e(t('course.sidebar.h')) ?></h2>
      <p><?= e(t('course.sidebar.p')) ?></p>
      <a class="btn btn-primary btn-block" href="<?= e(booking_href()) ?>" data-open-agent><?= icon('calendar', 18) ?><?= e(t('cta.book')) ?></a>
      <a class="btn btn-ghost btn-block" href="tel:<?= e(cfg('phone_raw')) ?>"><?= icon('phone', 18) ?><?= e(cfg('phone')) ?></a>
    </aside>
  </div>
</section>

<!-- Problem → solution switcher -->
<section class="section">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('home.problem.k')) ?></p>
      <h2 class="display"><?= e(t('home.problem.h')) ?></h2>
      <p class="section-lead"><?= e(t('home.problem.p')) ?></p>
    </header>
    <div class="ps" data-ps>
      <ol class="ps-list" role="tablist" aria-orientation="vertical">
        <?php foreach ($course['problem'][$L] as $i => $p): ?>
          <li><button role="tab" id="ps-tab-<?= $i ?>" aria-controls="ps-panel-<?= $i ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>" class="ps-tab<?= $i === 0 ? ' is-active' : '' ?>" data-ps-tab>
            <span class="ps-num">0<?= $i + 1 ?></span><span><?= e($p) ?></span>
          </button></li>
        <?php endforeach; ?>
      </ol>
      <div class="ps-panels">
        <?php foreach ($course['solve'][$L] as $i => [$h, $p]): ?>
          <div class="ps-panel<?= $i === 0 ? ' is-active' : '' ?>" role="tabpanel" id="ps-panel-<?= $i ?>" aria-labelledby="ps-tab-<?= $i ?>" data-ps-panel<?= $i === 0 ? '' : ' hidden' ?>>
            <p class="ps-k"><?= $L === 'pt' ? 'Como o programa responde' : 'How the programme responds' ?></p>
            <h3 class="display"><?= e($h) ?></h3>
            <p><?= e($p) ?></p>
            <div class="ps-meter" aria-hidden="true"><span style="--w: <?= [72, 64, 81, 90, 58][$i] ?>%"></span></div>
          </div>
        <?php endforeach; ?>
        <p class="ps-quote"><?= e(t('ice.end')) ?></p>
      </div>
    </div>
  </div>
</section>

<!-- Audience -->
<section class="section section-tint">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('course.for')) ?></p>
      <h2 class="display"><?= e(t('course.for.h')) ?></h2>
    </header>
    <div class="audience">
      <?php foreach ($course['audience'][$L] as [$ic, $h, $p]): ?>
        <div class="aud reveal"><span class="pillar-ic"><?= icon($ic, 22) ?></span><div><h3><?= e($h) ?></h3><p><?= e($p) ?></p></div></div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- Why -->
<section class="section">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('course.why')) ?></p>
      <h2 class="display"><?= e(t('course.why.h')) ?></h2>
    </header>
    <div class="why">
      <?php foreach ($course['why'][$L] as [$ic, $h, $p]): ?>
        <article class="why-card reveal"><span class="pillar-ic"><?= icon($ic, 22) ?></span><h3><?= e($h) ?></h3><p><?= e($p) ?></p></article>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- Testimonial -->
<section class="testimonial">
  <div class="wrap">
    <figure class="reveal">
      <blockquote class="display">“<?= e(tr($course['testimonial']['quote'])) ?>”</blockquote>
      <figcaption><strong><?= e($course['testimonial']['name']) ?></strong> · <?= e(tr($course['testimonial']['role'])) ?></figcaption>
    </figure>
  </div>
</section>

<!-- Science -->
<section class="section">
  <div class="wrap science-grid">
    <header class="section-head sticky-head reveal">
      <p class="eyebrow"><?= e(t('course.science')) ?></p>
      <h2 class="display"><?= e(t('course.science.h')) ?></h2>
      <p class="section-lead"><?= e(t('course.science.p')) ?></p>
    </header>
    <ol class="science">
      <?php foreach ($course['science'][$L] as $i => [$h, $by, $p]): ?>
        <li class="reveal"><span class="sci-num">0<?= $i + 1 ?></span><div><h3><?= e($h) ?> <small><?= e($by) ?></small></h3><p><?= e($p) ?></p></div></li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>

<!-- Results -->
<section class="results results-solo">
  <div class="results-copy wrap">
    <p class="eyebrow on-dark"><?= e(t('home.results.k')) ?></p>
    <h2 class="display"><?= e(t('course.results.h')) ?></h2>
    <?php partial('stats'); ?>
    <p class="fineprint"><?= e(t('stat.note')) ?></p>
  </div>
</section>

<!-- Formats -->
<section class="section" id="formats">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('courses.formats')) ?></p>
      <h2 class="display"><?= e(t('course.formats.h')) ?></h2>
    </header>
    <?php partial('formats'); ?>
  </div>
</section>

<!-- Related -->
<section class="section section-tint">
  <div class="wrap">
    <header class="section-head reveal"><h2 class="display"><?= e(t('course.related')) ?></h2></header>
    <div class="course-grid">
      <?php foreach (courses() as $c) if ($c['id'] !== $course['id']) partial('course-card', ['c' => $c]); ?>
    </div>
  </div>
</section>

<?php partial('cta'); ?>
