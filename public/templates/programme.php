<?php
/**
 * "Formação com App": training programme with the practice app + management report.
 * Same 8-part structure as every programme page (see templates/course.php); copy in content/app-programme.php.
 * @var array $course  this programme's entry in content/courses.php
 */
$P = require ROOT . '/content/app-programme.php';
$L = lang();
$ids = chapter_ids();
$site = rtrim(absolute(url('home', cfg('default_lang'))), '/');
$img = fn(string $n) => asset('assets/img/app/' . $n . '.webp');
$GLOBALS['page_title_full'] = t('seo.programme.title');
$GLOBALS['page_desc'] = t('seo.programme.desc');
$GLOBALS['jsonld'][] = [
    '@type' => 'Course',
    'name' => t('programme.name'),
    'description' => t('seo.programme.desc'),
    'url' => absolute(url('courses', null, $course['slug'][$L])),
    'inLanguage' => 'pt-PT',
    'provider' => ['@id' => $site . '/#org'],
    'instructor' => ['@id' => $site . '/#paulo'],
    'educationalLevel' => 'Professional',
    'about' => $L === 'pt' ? 'Inteligência Emocional' : 'Emotional Intelligence',
    'syllabusSections' => array_map(fn($s, $i) => ['@type' => 'Syllabus', 'name' => ($i + 1) . '. ' . tr($s)], $P['sessions'], array_keys($P['sessions'])),
    'hasCourseInstance' => [['@type' => 'CourseInstance', 'courseMode' => ['Onsite', 'Online', 'Blended'], 'instructor' => ['@id' => $site . '/#paulo']]],
];
$GLOBALS['jsonld'][] = [
    '@type' => 'FAQPage',
    'mainEntity' => array_map(fn($f) => ['@type' => 'Question', 'name' => tr($f[0]), 'acceptedAnswer' => ['@type' => 'Answer', 'text' => tr($f[1])]], $P['faq']),
];
$demo = '<p class="demo-note">' . icon('spark', 14) . e(t('programme.demo')) . '</p>';
?>
<section class="hero hero-page hero-app">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap app-hero-grid">
    <div class="hero-copy">
      <nav class="crumbs on-dark" aria-label="Breadcrumb">
        <a href="<?= e(url('home')) ?>"><?= e(t('nav.home')) ?></a><span>/</span>
        <?php if (cfg('courses_list') !== false): ?><a href="<?= e(url('courses')) ?>"><?= e(t('nav.courses')) ?></a><span>/</span><?php endif; ?>
        <span aria-current="page"><?= e(tr($course['short'])) ?></span>
      </nav>
      <p class="eyebrow on-dark"><?= e(tr($P['hero']['k'])) ?></p>
      <h1 class="display hero-title-sm"><?= e(tr($P['hero']['h1'])) ?></h1>
      <p class="hero-lead"><?= e(tr($P['hero']['lead'])) ?></p>
      <div class="hero-ctas">
        <a class="btn btn-primary btn-lg" href="#<?= e($ids[7]) ?>"><?= e(t('programme.cta')) ?> <?= icon('arrow', 18) ?></a>
        <a class="btn btn-ghost-light btn-lg" href="#<?= e($ids[4]) ?>"><?= e(t('programme.how')) ?></a>
      </div>
      <ul class="hero-chips">
        <?php foreach ($P['hero']['chips'] as [$ic, $txt]): ?><li><?= icon($ic, 16) ?><?= e(tr($txt)) ?></li><?php endforeach; ?>
      </ul>
    </div>
    <div class="app-hero-media" aria-hidden="true">
      <figure class="device-browser">
        <span class="device-bar"><i></i><i></i><i></i></span>
        <img src="<?= e($img('direcao')) ?>" alt="" width="2000" height="1362" fetchpriority="high">
      </figure>
      <figure class="device-phone">
        <img src="<?= e($img('hoje')) ?>" alt="" width="780" height="1688">
      </figure>
    </div>
  </div>
</section>

<?php partial('prog-nav'); ?>

<!-- 1 · Programme overview -->
<div class="chapter" id="<?= e($ids[0]) ?>" data-chapter>
  <section class="section">
    <div class="wrap">
      <?= chapter_head(1, tr($P['intro']['h'])) ?>
      <div class="intro">
        <div class="intro-copy">
          <div class="intro-text reveal">
            <?php foreach ($P['intro']['p'][$L] as $p): ?><p><?= e($p) ?></p><?php endforeach; ?>
          </div>
        </div>
        <dl class="figs reveal">
          <?php foreach ($P['intro']['figures'] as [$n, $txt]): ?><div><dt><?= e($n) ?></dt><dd><?= e(tr($txt)) ?></dd></div><?php endforeach; ?>
        </dl>
      </div>
      <div class="for reveal">
        <p class="for-k"><?= e(t('prog.for')) ?></p>
        <ul class="chips chips-lg"><?php foreach ($P['audience'] as $a): ?><li class="chip"><?= e(tr($a)) ?></li><?php endforeach; ?></ul>
      </div>
    </div>
  </section>
</div>

<!-- 2 · Business challenges (sourced) → how the programme answers -->
<div class="chapter" id="<?= e($ids[1]) ?>" data-chapter>
  <section class="section section-paper">
    <div class="wrap">
      <?= chapter_head(2, t('programme.ch.h'), t('programme.ch.p')) ?>
      <div class="chall">
        <?php foreach ($P['challenges'] as $c): ?>
          <article class="chall-card reveal">
            <p class="chall-tag"><?= e(tr($c['tag'])) ?></p>
            <h3><?= e(tr($c['h'])) ?></h3>
            <p class="chall-fact"><strong><?= e(tr($c['n'])) ?></strong> <?= e(tr($c['fact'])) ?> <a class="src" href="<?= e($c['url']) ?>" target="_blank" rel="noopener"><?= e($c['src']) ?></a></p>
            <div class="chall-fix">
              <p class="pain-k"><?= icon('check', 16) ?><?= e(t('programme.problem.fix')) ?></p>
              <p><?= e(tr($c['fix'])) ?></p>
              <?php if ($c['sessions']): ?>
                <ul class="obj-sessions"><?php foreach ($c['sessions'] as $n): ?><li><b><?= $n ?></b><?= e(tr($P['sessions'][$n - 1])) ?></li><?php endforeach; ?></ul>
              <?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    </div>
  </section>
</div>

<!-- 3 · Objectives and skills -->
<div class="chapter" id="<?= e($ids[2]) ?>" data-chapter>
  <section class="section">
    <div class="wrap">
      <?= chapter_head(3, t('programme.obj.h'), t('programme.obj.p')) ?>
      <div class="comp">
        <div class="comp-col reveal">
          <p class="comp-n">7</p>
          <div><h3><?= e(t('programme.comp.a')) ?></h3><p><?= e(t('programme.comp.a.p')) ?></p>
          <ul class="chips"><?php foreach ($P['behaviour'] as $d): ?><li class="chip"><?= e(tr($d)) ?></li><?php endforeach; ?></ul></div>
        </div>
        <div class="comp-col reveal">
          <p class="comp-n">4</p>
          <div><h3><?= e(t('programme.comp.b')) ?></h3><p><?= e(t('programme.comp.b.p')) ?></p>
          <ul class="chips"><?php foreach ($P['wleis'] as $d): ?><li class="chip"><?= e(tr($d)) ?></li><?php endforeach; ?></ul></div>
        </div>
      </div>
      <h3 class="obj-title reveal"><?= e(t('programme.obj.table')) ?></h3>
      <div class="obj" role="table" aria-label="<?= e(t('programme.obj.table')) ?>">
        <div class="obj-row obj-head" role="row">
          <span role="columnheader"><?= e(t('programme.obj.c1')) ?></span>
          <span role="columnheader"><?= e(t('programme.obj.c2')) ?></span>
          <span role="columnheader"><?= e(t('programme.obj.c3')) ?></span>
        </div>
        <?php foreach ($P['objectives'] as $o): ?>
          <div class="obj-row reveal" role="row">
            <h3 role="cell"><?= e(tr($o['goal'])) ?></h3>
            <div role="cell">
              <?php if ($o['sessions']): ?>
                <ul class="obj-sessions">
                  <?php foreach ($o['sessions'] as $s): ?><li><b><?= $s ?></b><?= e(tr($P['sessions'][$s - 1])) ?></li><?php endforeach; ?>
                </ul>
              <?php else: ?>
                <ul class="obj-sessions"><li><b>1–7</b><?= e(t('programme.obj.all')) ?></li></ul>
              <?php endif; ?>
              <p><?= e(tr($o['means'])) ?></p>
            </div>
            <p class="obj-shows" role="cell"><span class="obj-mobile-k"><?= e(t('programme.obj.c3')) ?></span><?= icon('chart', 16) ?><?= e(tr($o['shows'])) ?></p>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>
</div>

<!-- 4 · Training content: the 8 sessions and the challenge modules -->
<div class="chapter" id="<?= e($ids[3]) ?>" data-chapter>
  <section class="section section-paper">
    <div class="wrap">
      <?= chapter_head(4, t('programme.cont.h'), t('programme.cont.p')) ?>
      <ol class="sess">
        <?php foreach ($P['sessions'] as $i => $s): ?>
          <li class="reveal"><span class="sess-n"><?= e(t('programme.sessions.one')) ?> <?= $i + 1 ?></span><strong><?= e(tr($s)) ?></strong></li>
        <?php endforeach; ?>
      </ol>
      <div class="skills reveal">
        <p class="skills-k"><?= e(t('programme.cont.mods')) ?></p>
        <ul class="chips"><?php foreach ($P['behaviour'] as $d): ?><li class="chip"><?= e(tr($d)) ?></li><?php endforeach; ?></ul>
      </div>
    </div>
  </section>
</div>

<!-- 5 · Learning methodology: how it works, the participant app, why it holds up -->
<div class="chapter" id="<?= e($ids[4]) ?>" data-chapter>
  <section class="section">
    <div class="wrap">
      <?= chapter_head(5, t('programme.how.h')) ?>
      <ol class="tl">
        <?php foreach ($P['timeline'] as $i => [$h, $p]): ?>
          <li class="tl-step reveal">
            <span class="tl-dot" aria-hidden="true"><?= $i + 1 ?></span>
            <h3><?= e(tr($h)) ?></h3>
            <p><?= e(tr($p)) ?></p>
          </li>
        <?php endforeach; ?>
      </ol>
    </div>
  </section>

  <section class="section section-paper" id="app">
    <div class="wrap">
      <header class="section-head reveal">
        <p class="eyebrow"><?= e(t('programme.app.k')) ?></p>
        <h2 class="display"><?= e(t('programme.app.h')) ?></h2>
        <p class="section-lead"><?= e(t('programme.app.p')) ?></p>
      </header>
      <div class="screens" data-screens>
        <div class="screens-copy">
          <div class="screens-tabs" role="tablist" aria-label="<?= e(t('programme.app.k')) ?>">
            <?php foreach ($P['screens'] as $i => $s): ?>
              <button role="tab" type="button" id="scr-tab-<?= $i ?>" aria-controls="scr-<?= $i ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>" tabindex="<?= $i === 0 ? '0' : '-1' ?>" class="screens-tab<?= $i === 0 ? ' is-active' : '' ?>" data-screen-tab><?= e(tr($s['tab'])) ?></button>
            <?php endforeach; ?>
          </div>
          <?php foreach ($P['screens'] as $i => $s): ?>
            <div class="screens-text" role="tabpanel" id="scr-<?= $i ?>" aria-labelledby="scr-tab-<?= $i ?>" data-screen-panel<?= $i ? ' hidden' : '' ?>>
              <h3 class="display"><?= e(tr($s['h'])) ?></h3>
              <p><?= e(tr($s['p'])) ?></p>
            </div>
          <?php endforeach; ?>
        </div>
        <div class="screens-stage">
          <figure class="device-phone device-phone-lg">
            <?php foreach ($P['screens'] as $i => $s): ?>
              <img src="<?= e($img($s['img'])) ?>" alt="<?= e(tr($s['alt'])) ?>" width="780" height="1688" loading="lazy" data-screen-img<?= $i ? ' hidden' : '' ?>>
            <?php endforeach; ?>
          </figure>
          <?= $demo ?>
        </div>
        <ul class="ticks">
          <li><?= icon('device', 18) ?><?= e(t('programme.app.t1')) ?></li>
          <li><?= icon('clock', 18) ?><?= e(t('programme.app.t2')) ?></li>
          <li><?= icon('lock', 18) ?><?= e(t('programme.app.t3')) ?></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <header class="section-head reveal">
        <p class="eyebrow"><?= e(t('programme.problem.k')) ?></p>
        <h2 class="display"><?= e(t('programme.problem.h')) ?></h2>
        <p class="section-lead"><?= e(t('programme.problem.p')) ?></p>
      </header>
      <ol class="pains">
        <?php foreach ($P['problems'] as $i => $pr): ?>
          <li class="pain reveal">
            <span class="pain-num"><?= sprintf('%02d', $i + 1) ?></span>
            <div class="pain-q">
              <h3><?= e(tr($pr['pain'])) ?></h3>
              <p><?= e(tr($pr['why'])) ?></p>
            </div>
            <div class="pain-a">
              <span class="pain-k"><?= icon('check', 16) ?><?= e(t('programme.problem.fix')) ?></span>
              <p><?= e(tr($pr['fix'])) ?></p>
            </div>
          </li>
        <?php endforeach; ?>
      </ol>
      <?php if (!empty($P['facts'])): ?>
        <div class="facts reveal">
          <?php foreach ($P['facts'] as $f): ?>
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

<!-- 6 · Format and organisation -->
<div class="chapter" id="<?= e($ids[5]) ?>" data-chapter>
  <section class="section section-paper">
    <div class="wrap">
      <?= chapter_head(6, t('programme.fmt.h')) ?>
      <div class="fmt">
        <?php foreach ($P['formats'] as [$ic, $h, $p]): ?>
          <article class="fmt-card reveal"><span class="pillar-ic"><?= icon($ic, 22) ?></span><h3><?= e(tr($h)) ?></h3><p><?= e(tr($p)) ?></p></article>
        <?php endforeach; ?>
      </div>
      <p class="fineprint fmt-note reveal"><?= e(t('programme.fmt.note')) ?></p>
    </div>
  </section>
</div>

<!-- 7 · Customisation and follow-up: management dashboard, reports, confidentiality, measurement -->
<div class="chapter" id="<?= e($ids[6]) ?>" data-chapter>
  <section class="section">
    <div class="wrap">
      <?= chapter_head(7, t('programme.care.h'), t('programme.care.p')) ?>
      <?php partial('prog-care', ['diagnosis' => tr($P['diagnosis']['p']), 'diagnosis_h' => tr($P['diagnosis']['h']), 'follow' => []]); ?>
    </div>
  </section>

  <section class="section section-dark" id="direcao">
    <div class="wrap">
      <header class="section-head reveal">
        <p class="eyebrow on-dark"><?= e(t('programme.dash.k')) ?></p>
        <h2 class="display"><?= e(t('programme.dash.h')) ?></h2>
        <p class="section-lead"><?= e(t('programme.dash.p')) ?></p>
      </header>
      <figure class="device-browser device-browser-lg reveal">
        <span class="device-bar"><i></i><i></i><i></i></span>
        <img src="<?= e($img('direcao')) ?>" alt="<?= e(t('programme.dash.alt')) ?>" width="2000" height="1362" loading="lazy">
      </figure>
      <?= $demo ?>
      <div class="ind">
        <?php foreach ($P['indicators'] as [$ic, $h, $p]): ?>
          <article class="ind-item reveal"><span class="pillar-ic"><?= icon($ic, 20) ?></span><h3><?= e(tr($h)) ?></h3><p><?= e(tr($p)) ?></p></article>
        <?php endforeach; ?>
      </div>
      <div class="proj reveal">
        <img src="<?= e($img('projecao')) ?>" alt="<?= e(t('programme.proj.alt')) ?>" width="1600" height="901" loading="lazy">
        <div>
          <p class="eyebrow on-dark"><?= e(t('programme.proj.k')) ?></p>
          <h3 class="display"><?= e(t('programme.proj.h')) ?></h3>
          <p><?= e(t('programme.proj.p')) ?></p>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="relatorios">
    <div class="wrap">
      <header class="section-head reveal">
        <p class="eyebrow"><?= e(t('programme.docs.k')) ?></p>
        <h2 class="display"><?= e(t('programme.docs.h')) ?></h2>
        <p class="section-lead"><?= e(t('programme.docs.p')) ?></p>
      </header>
      <div class="docs">
        <?php foreach ($P['docs'] as $d): ?>
          <article class="doc reveal">
            <a class="doc-paper<?= $d['w'] > $d['h'] ? ' is-land' : '' ?>" href="<?= e($img($d['img'])) ?>" target="_blank" rel="noopener" aria-label="<?= e(tr($d['name'])) ?> (<?= e(t('programme.docs.open')) ?>)">
              <img src="<?= e($img($d['img'])) ?>" alt="<?= e(tr($d['name'])) ?>: <?= e(t('programme.demo')) ?>" width="<?= $d['w'] ?>" height="<?= $d['h'] ?>" loading="lazy">
            </a>
            <p class="doc-for"><?= icon('file', 15) ?><?= e(tr($d['for'])) ?></p>
            <h3><?= e(tr($d['name'])) ?></h3>
            <p><?= e(tr($d['p'])) ?></p>
          </article>
        <?php endforeach; ?>
      </div>
      <?= $demo ?>
    </div>
  </section>

  <section class="section section-paper" id="confidencialidade">
    <div class="wrap">
      <header class="section-head reveal">
        <p class="eyebrow"><?= e(t('programme.priv.k')) ?></p>
        <h2 class="display"><?= e(t('programme.priv.h')) ?></h2>
        <p class="section-lead"><?= e(t('programme.priv.p')) ?></p>
      </header>
      <div class="sees">
        <div class="sees-col sees-yes reveal">
          <h3><?= icon('eye', 20) ?><?= e(t('programme.priv.yes')) ?></h3>
          <ul><?php foreach ($P['sees']['yes'] as $s): ?><li><?= icon('check', 16) ?><?= e(tr($s)) ?></li><?php endforeach; ?></ul>
        </div>
        <div class="sees-col sees-no reveal">
          <h3><?= icon('eyeoff', 20) ?><?= e(t('programme.priv.no')) ?></h3>
          <ul><?php foreach ($P['sees']['no'] as $s): ?><li><?= icon('close', 16) ?><?= e(tr($s)) ?></li><?php endforeach; ?></ul>
        </div>
      </div>
      <div class="guards">
        <p class="reveal"><?= icon('shield', 20) ?><span><strong><?= e(t('programme.priv.g1h')) ?></strong> <?= e(t('programme.priv.g1')) ?></span></p>
        <p class="reveal"><?= icon('shield', 20) ?><span><strong><?= e(t('programme.priv.g2h')) ?></strong> <?= e(t('programme.priv.g2')) ?></span></p>
        <p class="reveal"><?= icon('lock', 20) ?><span><strong><?= e(t('programme.priv.g3h')) ?></strong> <?= e(t('programme.priv.g3')) ?></span></p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <header class="section-head reveal">
        <p class="eyebrow"><?= e(t('programme.method.k')) ?></p>
        <h2 class="display"><?= e(t('programme.method.h')) ?></h2>
        <p class="section-lead"><?= e(t('programme.method.p')) ?></p>
      </header>
      <div class="instr">
        <article class="instr-card reveal">
          <p class="instr-k"><?= e(t('programme.method.a.k')) ?></p>
          <h3 class="display"><?= e(t('programme.method.a.h')) ?></h3>
          <p><?= e(t('programme.method.a.p')) ?></p>
          <ul class="chips"><?php foreach ($P['wleis'] as $d): ?><li class="chip"><?= e(tr($d)) ?></li><?php endforeach; ?></ul>
        </article>
        <article class="instr-card reveal">
          <p class="instr-k"><?= e(t('programme.method.b.k')) ?></p>
          <h3 class="display"><?= e(t('programme.method.b.h')) ?></h3>
          <p><?= e(t('programme.method.b.p')) ?></p>
          <ul class="chips"><?php foreach ($P['behaviour'] as $d): ?><li class="chip"><?= e(tr($d)) ?></li><?php endforeach; ?></ul>
        </article>
      </div>
      <figure class="real-shot reveal">
        <div class="device-browser">
          <span class="device-bar"><i></i><i></i><i></i></span>
          <img src="<?= e($img('analise-real')) ?>" alt="<?= e(t('programme.real.alt')) ?>" width="1668" height="1205" loading="lazy">
        </div>
        <figcaption><strong><?= e(t('programme.real.k')) ?></strong> <?= e(t('programme.real.cap')) ?></figcaption>
      </figure>
      <ul class="reading">
        <?php foreach ($P['reading'] as $i => [$h, $p]): ?>
          <li class="reveal"><span class="reading-num"><?= sprintf('%02d', $i + 1) ?></span><h3><?= e(tr($h)) ?></h3><p><?= e(tr($p)) ?></p></li>
        <?php endforeach; ?>
      </ul>
    </div>
  </section>
</div>

<!-- 8 · Next step: questions before deciding, then the proposal request -->
<div class="chapter" id="<?= e($ids[7]) ?>" data-chapter>
  <section class="section section-paper">
    <div class="wrap faq-grid">
      <header class="section-head reveal">
        <p class="eyebrow"><?= e(t('programme.faq.k')) ?></p>
        <h2 class="display"><?= e(t('programme.faq.h')) ?></h2>
      </header>
      <div class="faq">
        <?php foreach ($P['faq'] as $i => [$q, $a]): ?>
          <details class="faq-item reveal"<?= $i === 0 ? ' open' : '' ?>>
            <summary><?= e(tr($q)) ?><span class="faq-ic" aria-hidden="true"></span></summary>
            <p><?= e(tr($a)) ?></p>
          </details>
        <?php endforeach; ?>
      </div>
    </div>
  </section>
  <?php partial('prog-contact', [
      'interest' => t('programme.name'),
      'h' => t('programme.prop.h'), 'p' => t('programme.prop.p'),
      'points' => [t('programme.prop.t1'), t('programme.prop.t2'), t('programme.prop.t3')],
      'formats' => t('programme.form.formats'), 'ph' => t('programme.form.ph'),
  ]); ?>
</div>
