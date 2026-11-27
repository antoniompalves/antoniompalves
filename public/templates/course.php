<?php
/**
 * Programme page in the common 8-part structure:
 *   1 Apresentação · 2 Desafios · 3 Objetivos e competências · 4 Conteúdos · 5 Metodologia
 *   6 Formato e organização · 7 Personalização e acompanhamento · 8 Contacto
 * Catalogue fields come from content/courses.php, the page copy from content/programmes/{id}.php.
 * @var array $course
 */
$D   = programme_data($course['id']);
$L   = lang();
$ids = chapter_ids();
$C   = programme_common();
$GLOBALS['page_title'] = tr($course['title']);
$GLOBALS['page_desc']  = tr($course['meta_desc'] ?? $course['excerpt']);
$site = rtrim(absolute(url('home', cfg('default_lang'))), '/');
$mods = $D['modules']['items'][$L] ?? [];
$GLOBALS['jsonld'][] = [
    '@type' => 'Course',
    'name' => tr($course['title']),
    'description' => tr($course['meta_desc'] ?? $course['excerpt']),
    'url' => absolute(url('courses', null, $course['slug'][$L])),
    'inLanguage' => ['pt-PT', 'en'],
    'provider' => ['@id' => $site . '/#org'],
    'instructor' => ['@id' => $site . '/#paulo'],
    'educationalLevel' => 'Professional',
    'teaches' => $D['skills'][$L] ?? [],
    'syllabusSections' => array_map(fn($m, $i) => ['@type' => 'Syllabus', 'name' => ($i + 1) . '. ' . $m[0], 'description' => implode('. ', $m[1])], $mods, array_keys($mods)),
    'hasCourseInstance' => [['@type' => 'CourseInstance', 'courseMode' => ['Onsite', 'Online'], 'instructor' => ['@id' => $site . '/#paulo']]],
];
// Backgrounds alternate white / paper down the page (dark bands don't count)
$n = 0;
$bg = function () use (&$n) { return $n++ % 2 ? ' section-paper' : ''; };
$cover = $D['intro']['img'] ?? ($course['cover'] ?? null);
$app = null;
foreach (courses() as $c) if (($c['variant'] ?? '') === 'app' && !empty($c['detail'])) $app = $c;
$follow = array_merge($C['follow'], $D['follow'] ?? []);
?>
<section class="hero hero-course">
  <img class="hero-backdrop" src="<?= e(asset('assets/img/photos/training-room.webp')) ?>" alt="" width="1600" height="900">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap course-hero-grid">
    <div class="hero-copy">
      <nav class="crumbs on-dark" aria-label="Breadcrumb">
        <a href="<?= e(url('home')) ?>"><?= e(t('nav.home')) ?></a><span>/</span>
        <?php if (cfg('courses_list') !== false): ?><a href="<?= e(url('courses')) ?>"><?= e(t('nav.courses')) ?></a><span>/</span><?php endif; ?>
        <span aria-current="page"><?= e(tr($course['short'])) ?></span>
      </nav>
      <h1 class="display hero-title-sm"><?= e(tr($course['title'])) ?></h1>
      <p class="hero-lead"><?= e(tr($course['tagline'])) ?></p>
      <div class="hero-ctas">
        <a class="btn btn-primary btn-lg" href="#<?= e($ids[7]) ?>"><?= e(t('programme.cta')) ?> <?= icon('arrow', 18) ?></a>
        <a class="btn btn-ghost-light btn-lg" href="#<?= e($ids[3]) ?>"><?= e(t('prog.hero.cta2')) ?></a>
      </div>
      <ul class="hero-chips">
        <?php foreach ($D['chips'] ?? [] as [$ic, $txt]): ?><li><?= icon($ic, 16) ?><?= e(tr($txt)) ?></li><?php endforeach; ?>
      </ul>
    </div>
    <aside class="book-card glass">
      <div class="book-head">
        <span class="book-avatar" aria-hidden="true"><?= agent_avatar() ?></span>
        <div><strong><?= e(cfg('agent_fullname')) ?></strong><span><?= e(t('agent.role')) ?></span></div>
      </div>
      <h2><?= e(t('course.sidebar.h')) ?></h2>
      <p><?= e(t('course.sidebar.p')) ?></p>
      <a class="btn btn-primary btn-block" href="<?= e(booking_href()) ?>" data-open-agent><?= icon('calendar', 18) ?><?= e(t('cta.book')) ?></a>
      <a class="btn btn-ghost btn-block" href="tel:<?= e(cfg('phone_raw')) ?>"><?= icon('phone', 18) ?><?= e(cfg('phone')) ?></a>
    </aside>
  </div>
</section>

<?php partial('prog-nav'); ?>

<!-- 1 · Programme overview -->
<div class="chapter" id="<?= e($ids[0]) ?>" data-chapter>
  <section class="section<?= $bg() ?>">
    <div class="wrap">
      <?= chapter_head(1, tr($D['intro']['h'])) ?>
      <div class="intro<?= $cover ? '' : ' intro-solo' ?>">
        <div class="intro-copy">
          <div class="intro-text reveal">
            <?php foreach ($D['intro']['p'][$L] as $p): ?><p><?= e($p) ?></p><?php endforeach; ?>
            <?php if (!empty($D['intro']['src'])): ?><p class="intro-src"><?= e(t('prog.src')) ?> <a class="src" href="<?= e($D['intro']['src'][1]) ?>" target="_blank" rel="noopener"><?= e($D['intro']['src'][0]) ?></a></p><?php endif; ?>
          </div>
        </div>
        <?php if ($cover): ?>
          <figure class="intro-media reveal"><img src="<?= e(asset('assets/img/' . $cover . '.webp')) ?>" alt="" width="920" height="518" loading="lazy"></figure>
        <?php endif; ?>
      </div>
      <?php if (!empty($D['audience'][$L])): ?>
        <div class="for reveal">
          <p class="for-k"><?= e(t('prog.for')) ?></p>
          <div class="audience" style="--n: <?= count($D['audience'][$L]) ?>">
            <?php foreach ($D['audience'][$L] as [$ic, $h, $p]): ?>
              <div class="aud"><span class="pillar-ic"><?= icon($ic, 22) ?></span><div><h3><?= e($h) ?></h3><p><?= e($p) ?></p></div></div>
            <?php endforeach; ?>
          </div>
        </div>
      <?php endif; ?>
    </div>
  </section>
</div>

<!-- 2 · Organisational challenges → how the programme responds -->
<?php $CH = $D['challenges']; ?>
<div class="chapter" id="<?= e($ids[1]) ?>" data-chapter>
  <section class="section<?= $bg() ?>">
    <div class="wrap">
      <?= chapter_head(2, tr($CH['h']), tr($CH['p'])) ?>
      <div class="ps" data-ps>
        <ol class="ps-list" role="tablist" aria-orientation="vertical">
          <?php foreach ($CH['items'][$L] as $i => [$q]): ?>
            <li><button role="tab" id="ps-tab-<?= $i ?>" aria-controls="ps-panel-<?= $i ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>" class="ps-tab<?= $i === 0 ? ' is-active' : '' ?>" data-ps-tab>
              <span class="ps-num"><?= sprintf('%02d', $i + 1) ?></span><span><?= e($q) ?></span>
            </button></li>
          <?php endforeach; ?>
        </ol>
        <div class="ps-panels">
          <?php foreach ($CH['items'][$L] as $i => [, $h, $p]): ?>
            <div class="ps-panel<?= $i === 0 ? ' is-active' : '' ?>" role="tabpanel" id="ps-panel-<?= $i ?>" aria-labelledby="ps-tab-<?= $i ?>" data-ps-panel<?= $i === 0 ? '' : ' hidden' ?>>
              <p class="ps-k"><?= e(t('prog.resp')) ?></p>
              <h3 class="display"><?= e($h) ?></h3>
              <p><?= e($p) ?></p>
            </div>
          <?php endforeach; ?>
          <?php if (!empty($CH['end'])): ?><p class="ps-quote"><?= e(tr($CH['end'])) ?></p><?php endif; ?>
        </div>
      </div>
      <?php if (!empty($CH['facts'])): ?>
        <div class="facts reveal">
          <?php foreach ($CH['facts'] as $f): ?>
            <figure class="fact">
              <strong><?= e(tr($f['n'])) ?></strong>
              <figcaption><?= e(tr($f['t'])) ?> <a class="src" href="<?= e($f['url']) ?>" target="_blank" rel="noopener"><?= e($f['src']) ?></a></figcaption>
            </figure>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
  </section>
</div>

<!-- 3 · Objectives and skills -->
<div class="chapter" id="<?= e($ids[2]) ?>" data-chapter>
  <section class="section<?= $bg() ?>">
    <div class="wrap">
      <?= chapter_head(3, t('prog.obj.h'), t('prog.obj.p')) ?>
      <ol class="goals">
        <?php foreach ($D['objectives'][$L] as $o): ?>
          <li class="goal reveal"><span class="goal-ic"><?= icon('check', 18) ?></span><p><?= e($o) ?></p></li>
        <?php endforeach; ?>
      </ol>
      <?php if (!empty($D['skills'][$L])): ?>
        <div class="skills reveal">
          <p class="skills-k"><?= e(t('prog.skills')) ?></p>
          <ul class="chips"><?php foreach ($D['skills'][$L] as $s): ?><li class="chip"><?= e($s) ?></li><?php endforeach; ?></ul>
        </div>
      <?php endif; ?>
    </div>
  </section>
</div>

<!-- 4 · Training content -->
<div class="chapter" id="<?= e($ids[3]) ?>" data-chapter>
  <section class="section<?= $bg() ?>">
    <div class="wrap">
      <?= chapter_head(4, tr($D['modules']['h']), tr($D['modules']['p'])) ?>
      <ol class="mods mods-<?= count($mods) ?>">
        <?php foreach ($mods as $i => [$h, $topics]): ?>
          <li class="mod reveal">
            <p class="mod-k"><?= e(t('prog.mod')) ?> <?= sprintf('%02d', $i + 1) ?></p>
            <h3><?= e($h) ?></h3>
            <ul class="mod-topics"><?php foreach ($topics as $tp): ?><li><?= e($tp) ?></li><?php endforeach; ?></ul>
          </li>
        <?php endforeach; ?>
      </ol>
    </div>
  </section>
</div>

<!-- 5 · Learning methodology -->
<?php $M = $D['method']; ?>
<div class="chapter" id="<?= e($ids[4]) ?>" data-chapter>
  <section class="section<?= $bg() ?>">
    <div class="wrap">
      <?= chapter_head(5, tr($M['h']), tr($M['p'])) ?>
      <div class="why">
        <?php foreach ($M['cards'][$L] as [$ic, $h, $p]): ?>
          <article class="why-card reveal"><span class="pillar-ic"><?= icon($ic, 22) ?></span><h3><?= e($h) ?></h3><p><?= e($p) ?></p></article>
        <?php endforeach; ?>
      </div>
      <?php if (!empty($M['activities'][$L])): ?>
        <div class="skills reveal">
          <p class="skills-k"><?= e(t('prog.acts')) ?></p>
          <ul class="chips"><?php foreach ($M['activities'][$L] as $a): ?><li class="chip"><?= e($a) ?></li><?php endforeach; ?></ul>
        </div>
      <?php endif; ?>
    </div>
  </section>
  <?php if (!empty($D['science'][$L])): ?>
    <section class="section<?= $bg() ?>">
      <div class="wrap science-grid">
        <header class="section-head sticky-head reveal">
          <p class="eyebrow"><?= e(t('course.science')) ?></p>
          <h2 class="display"><?= e(t('prog.science')) ?></h2>
          <p class="section-lead"><?= e(t('course.science.p')) ?></p>
        </header>
        <ol class="science">
          <?php foreach ($D['science'][$L] as $i => [$h, $by, $p]): ?>
            <li class="reveal"><span class="sci-num"><?= sprintf('%02d', $i + 1) ?></span><div><h3><?= e($h) ?> <small><?= e($by) ?></small></h3><p><?= e($p) ?></p></div></li>
          <?php endforeach; ?>
        </ol>
      </div>
    </section>
  <?php endif; ?>
  <?php $tm = $D['testimonial'] ?? ($course['testimonial'] ?? null); if ($tm): ?>
    <section class="testimonial">
      <div class="wrap">
        <figure class="reveal">
          <blockquote class="display">“<?= e(tr($tm['quote'])) ?>”</blockquote>
          <figcaption><strong><?= e($tm['name']) ?></strong> · <?= e(tr($tm['role'])) ?></figcaption>
        </figure>
      </div>
    </section>
  <?php endif; ?>
</div>

<!-- 6 · Format and organisation -->
<div class="chapter" id="<?= e($ids[5]) ?>" data-chapter>
  <section class="section<?= $bg() ?>">
    <div class="wrap">
      <?= chapter_head(6, t('prog.fmt.h'), t('prog.fmt.p')) ?>
      <dl class="struct reveal">
        <div><dt><?= e(t('prog.fmt.mods')) ?></dt><dd><?= count($mods) ?></dd></div>
        <?php foreach ($C['struct'] as [$k, $v]): ?><div><dt><?= e(tr($k)) ?></dt><dd><?= e(tr($v)) ?></dd></div><?php endforeach; ?>
      </dl>
      <?php partial('formats'); ?>
      <p class="fineprint fmt-note"><?= e(t('prog.fmt.note')) ?></p>
    </div>
  </section>
</div>

<!-- 7 · Customisation and follow-up -->
<div class="chapter" id="<?= e($ids[6]) ?>" data-chapter>
  <section class="section<?= $bg() ?>">
    <div class="wrap">
      <?= chapter_head(7, t('prog.care.h'), t('prog.care.p')) ?>
      <?php partial('prog-care', ['diagnosis' => isset($D['diagnosis']) ? tr($D['diagnosis']) : null, 'follow' => $follow]); ?>
      <?php if ($app): ?>
        <a class="care-app reveal" href="<?= e(url('courses', null, $app['slug'][$L])) ?>">
          <span class="pillar-ic"><?= icon('chart', 20) ?></span>
          <span class="care-app-txt"><strong><?= e(t('prog.app.k')) ?></strong><?= e(t('prog.app.p')) ?></span>
          <span class="link-arrow"><?= e(t('prog.app.cta')) ?> <?= icon('arrow', 16) ?></span>
        </a>
      <?php endif; ?>
    </div>
  </section>
</div>

<!-- 8 · Next step: proposal request -->
<div class="chapter" id="<?= e($ids[7]) ?>" data-chapter>
  <?php partial('prog-contact', [
      'interest' => tr($course['title']),
      'h' => t('prog.cta.h'), 'p' => t('prog.cta.p'),
      'points' => [t('prog.cta.t1'), t('prog.cta.t2'), t('prog.cta.t3')],
      'formats' => t('prog.form.formats'), 'ph' => t('prog.form.ph'),
  ]); ?>
</div>

<?php $others = array_values(array_filter(courses(), fn($c) => $c['id'] !== $course['id'])); if ($others): ?>
<section class="section section-tint">
  <div class="wrap">
    <header class="section-head reveal"><h2 class="display"><?= e(t('course.related')) ?></h2></header>
    <div class="course-grid">
      <?php foreach ($others as $c) partial('course-card', ['c' => $c]); ?>
    </div>
  </div>
</section>
<?php endif; ?>
