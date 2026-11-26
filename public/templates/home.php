<?php
$featured = courses()[0];
$words = [1, 2, 3, 4, 5];
?>
<!-- ============ HERO (rotating focus, torch-style tab bar) ============ -->
<section class="hero hero-home" data-rotator>
  <div class="hero-bg" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="grain"></span></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow on-dark"><?= e(t('home.eyebrow')) ?></p>
      <h1 class="display hero-title">
        <span class="u-line"><?= e(t('hero.for')) ?></span>
        <span class="rotator" aria-live="polite">
          <?php foreach ($words as $i): ?>
            <span class="rotator-word<?= $i === 1 ? ' is-active' : '' ?>" data-rot-word><?= e(t('hero.w' . $i)) ?></span>
          <?php endforeach; ?>
        </span>
      </h1>
      <p class="hero-lead"><?= e(t('home.lead')) ?></p>
      <div class="hero-ctas">
        <a class="btn btn-primary btn-lg" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('cta.book')) ?> <?= icon('arrow', 18) ?></a>
        <a class="btn btn-ghost-light btn-lg" href="<?= e(url('courses')) ?>"><?= e(t('cta.programmes')) ?></a>
      </div>
    </div>
    <aside class="hero-proof" aria-hidden="true">
      <?php foreach ($words as $i): ?>
        <div class="proof-item<?= $i === 1 ? ' is-active' : '' ?>" data-rot-proof>
          <span class="proof-k"><?= e(t('hero.t' . $i)) ?></span>
          <p><?= e(t('hero.q' . $i)) ?></p>
        </div>
      <?php endforeach; ?>
      <a class="btn btn-outline-light btn-sm" href="<?= e(url('courses', null, $featured['slug'][lang()])) ?>"><?= e(t('cta.learn')) ?></a>
    </aside>
  </div>
  <div class="wrap hero-tabs">
    <div class="tabs" role="tablist">
      <?php foreach ($words as $i): ?>
        <button role="tab" class="tab<?= $i === 1 ? ' is-active' : '' ?>" data-rot-tab aria-selected="<?= $i === 1 ? 'true' : 'false' ?>"><span class="tab-fill"></span><span class="tab-label"><?= e(t('hero.t' . $i)) ?></span></button>
      <?php endforeach; ?>
    </div>
    <span class="tab-count"><span data-rot-count>1</span>/<?= count($words) ?></span>
  </div>
</section>

<!-- ============ TRUST STRIP ============ -->
<section class="trust">
  <div class="wrap trust-inner">
    <p><?= e(t('home.trust')) ?></p>
    <ul class="trust-list">
      <li><strong>MSCEIT</strong><span>Yale · Mayer-Salovey-Caruso</span></li>
      <li><strong>EQ-i 2.0</strong><span>Bar-On</span></li>
      <li><strong>ESCI</strong><span>Goleman · Hay Group</span></li>
      <li><strong>RULER</strong><span>Yale Center for EI</span></li>
    </ul>
  </div>
</section>

<!-- ============ THE PROBLEM → SOLUTION: EMOTIONAL ICEBERG (pinned scroll story) ============ -->
<section class="ice" data-ice aria-labelledby="ice-title">
  <div class="ice-stage" data-step="0">
    <div class="ice-scene" data-ice-scene aria-hidden="true">
      <svg class="ice-svg" viewBox="0 0 1440 2000" preserveAspectRatio="xMidYMin slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f3ff"/><stop offset="1" stop-color="#cfe4fb"/></linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b5fae"/><stop offset=".35" stop-color="#06386f"/><stop offset="1" stop-color="#020f24"/></linearGradient>
          <linearGradient id="berg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d8e9fb"/></linearGradient>
          <linearGradient id="bergDeep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb0f5" stop-opacity=".55"/><stop offset="1" stop-color="#0b4a8c" stop-opacity=".15"/></linearGradient>
          <linearGradient id="rays" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        </defs>
        <rect width="1440" height="720" fill="url(#sky)"/>
        <rect y="720" width="1440" height="1280" fill="url(#sea)"/>
        <!-- light rays -->
        <g class="ice-rays"><path d="M260 720 L360 720 L180 1500 L60 1500Z" fill="url(#rays)"/><path d="M700 720 L760 720 L820 1400 L680 1400Z" fill="url(#rays)"/><path d="M1100 720 L1180 720 L1380 1500 L1260 1500Z" fill="url(#rays)"/></g>
        <!-- underwater mass -->
        <path class="ice-under" d="M330 720 C300 860 220 980 260 1120 C300 1290 200 1400 330 1530 C450 1650 600 1720 760 1700 C930 1680 1090 1590 1150 1450 C1210 1310 1260 1150 1180 1010 C1120 900 1110 800 1070 720 Z" fill="url(#bergDeep)"/>
        <!-- tip -->
        <path class="ice-tip" d="M380 720 C430 650 470 640 520 600 C560 560 590 470 650 430 C700 400 730 420 770 460 C820 510 850 560 900 590 C960 630 1000 660 1030 720 Z" fill="url(#berg)"/>
        <path d="M650 430 C640 520 600 600 560 720" stroke="#bcd8f6" stroke-width="3" fill="none" opacity=".6"/>
        <!-- waterline -->
        <rect y="716" width="1440" height="8" fill="#fff" opacity=".55"/>
        <g class="ice-bubbles" fill="#fff" opacity=".35"><circle cx="240" cy="1200" r="4"/><circle cx="1220" cy="1100" r="5"/><circle cx="980" cy="1500" r="3"/><circle cx="420" cy="1600" r="4"/><circle cx="1300" cy="1700" r="3"/></g>
      </svg>
    </div>

    <div class="wrap ice-ui">
      <!-- Title card -->
      <div class="ice-card glass" data-ice-card>
        <p class="eyebrow"><?= e(t('ice.k')) ?></p>
        <h2 id="ice-title" class="display"><span class="u-line"><?= e(t('ice.h')) ?></span></h2>
        <p class="ice-card-p"><?= e(t('ice.p')) ?></p>
      </div>

      <!-- Symptom cards (problems surfacing) -->
      <div class="ice-symptoms">
        <?php foreach ([1, 2, 3, 4, 5] as $i): ?>
          <div class="symptom glass-dark" data-show="<?= [1 => 3, 2 => 3, 3 => 4, 4 => 5, 5 => 5][$i] ?>"><span class="symptom-ic"><?= icon('bolt', 16) ?></span><p><?= e(t('ice.s' . $i)) ?></p></div>
        <?php endforeach; ?>
      </div>

      <!-- Layers -->
      <div class="ice-layers">
        <div class="layer-group above" data-show="1">
          <p class="layer-k"><?= e(t('ice.above')) ?></p>
          <div class="layer"><h3><?= e(t('ice.a1.h')) ?></h3><p><?= e(t('ice.a1.p')) ?></p></div>
          <div class="layer"><h3><?= e(t('ice.a2.h')) ?></h3><p><?= e(t('ice.a2.p')) ?></p></div>
        </div>
        <div class="layer-group below" data-show="2">
          <p class="layer-k"><?= e(t('ice.below')) ?></p>
          <div class="layer-bracket">
            <div class="layer" data-focus="3"><h3><span class="dash"></span><?= e(t('ice.b1.h')) ?></h3><p><?= e(t('ice.b1.p')) ?></p></div>
            <div class="layer" data-focus="4"><h3><span class="dash"></span><?= e(t('ice.b2.h')) ?></h3><p><?= e(t('ice.b2.p')) ?></p></div>
            <div class="layer" data-focus="5"><h3><span class="dash"></span><?= e(t('ice.b3.h')) ?></h3><p><?= e(t('ice.b3.p')) ?></p></div>
            <div class="bracket" data-show="6" aria-hidden="true"></div>
          </div>

        </div>
      </div>

      <!-- Solution card -->
      <div class="ice-fix glass-dark" data-show="6">
        <p class="ice-fix-k"><?= e(t('ice.fix.h')) ?></p>
        <ul>
          <li><?= e(t('ice.fix.1')) ?></li>
          <li><?= e(t('ice.fix.2')) ?></li>
          <li><?= e(t('ice.fix.3')) ?></li>
        </ul>
      </div>

      <!-- Final statement -->
      <div class="ice-end" data-show="7">
        <p class="display"><?= e(t('ice.end')) ?></p>
        <a class="btn btn-light" href="<?= e(url('courses', null, $featured['slug'][lang()])) ?>"><?= e(t('cta.learn')) ?> <?= icon('arrow', 18) ?></a>
      </div>

      <!-- Progress + controls -->
      <div class="ice-progress" aria-hidden="true">
        <span class="ice-scroll-hint"><?= e(t('ice.scroll')) ?><i></i><i></i><i></i></span>
        <ol><?php for ($i = 0; $i < 8; $i++): ?><li data-dot="<?= $i ?>"></li><?php endfor; ?></ol>
      </div>
      <a class="ice-skip" href="#after-ice" data-ice-skip><?= e(t('ice.skip')) ?> ↓</a>
    </div>
  </div>
</section>
<div id="after-ice"></div>

<!-- ============ PILLARS ============ -->
<section class="section">
  <div class="wrap">
    <header class="section-head section-head-row reveal">
      <div>
        <p class="eyebrow"><?= e(t('home.pillars.k')) ?></p>
        <h2 class="display"><?= e(t('home.pillars.h')) ?></h2>
      </div>
      <a class="link-arrow" href="<?= e(url('services')) ?>"><?= e(t('nav.services')) ?> <?= icon('arrow', 16) ?></a>
    </header>
    <div class="pillars">
      <?php foreach ([['compass', 1], ['users', 2], ['heart', 3], ['building', 4], ['chat', 5]] as [$ic, $i]): ?>
        <article class="pillar reveal">
          <span class="pillar-ic"><?= icon($ic, 22) ?></span>
          <h3><?= e(t("home.p$i.h")) ?></h3>
          <p><?= e(t("home.p$i.p")) ?></p>
        </article>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- ============ METHOD ============ -->
<section class="section section-tint">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('home.method.k')) ?></p>
      <h2 class="display"><?= e(t('home.method.h')) ?></h2>
    </header>
    <ol class="method">
      <?php foreach ([1, 2, 3] as $i): ?>
        <li class="method-step reveal">
          <span class="method-num">0<?= $i ?></span>
          <h3><?= e(t("home.m$i.h")) ?></h3>
          <p><?= e(t("home.m$i.p")) ?></p>
        </li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>

<!-- ============ THE MODEL (Goleman & Boyatzis — 4 domains, 12 competencies) ============ -->
<?php $model = require ROOT . '/content/model.php'; ?>
<section class="section model-section">
  <div class="wrap model-grid">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('model.k')) ?></p>
      <h2 class="display"><?= e(t('model.h')) ?></h2>
      <p class="section-lead"><?= e(t('model.p')) ?></p>
      <p class="model-note"><?= e(t('model.team')) ?></p>
    </header>
    <div class="model" data-model>
      <span class="model-axis model-axis-x" aria-hidden="true"><span><?= e(t('model.self')) ?></span><span><?= e(t('model.others')) ?></span></span>
      <?php foreach ($model['domains'] as $i => $d): ?>
        <button type="button" class="domain reveal d<?= $i + 1 ?>" data-domain aria-pressed="false">
          <span class="domain-axis"><?= e(tr($d['axis'])) ?></span>
          <span class="domain-name"><?= e(tr($d['name'])) ?></span>
          <span class="domain-desc"><?= e(tr($d['desc'])) ?></span>
          <span class="chips">
            <?php foreach (tr($d['comps']) as $c): ?><span class="chip"><?= e($c) ?></span><?php endforeach; ?>
          </span>
          <span class="domain-count"><?= count(tr($d['comps'])) ?></span>
        </button>
      <?php endforeach; ?>
      <span class="model-center" aria-hidden="true">12</span>
    </div>
  </div>
</section>

<!-- ============ FEATURED PROGRAMME ============ -->
<section class="section">
  <div class="wrap">
    <a class="featured reveal" href="<?= e(url('courses', null, $featured['slug'][lang()])) ?>">
      <div class="featured-copy">
        <p class="eyebrow on-dark"><?= e(t('home.featured.k')) ?></p>
        <h2 class="display"><?= e(tr($featured['title'])) ?></h2>
        <p><?= e(tr($featured['tagline'])) ?></p>
        <span class="btn btn-light"><?= e(t('cta.learn')) ?> <?= icon('arrow', 18) ?></span>
      </div>
      <div class="featured-art" aria-hidden="true">
        <div class="orbit"><span>ESCI</span><span>MSCEIT</span><span>EQ-i</span><span>RULER</span></div>
        <div class="orbit-core">EQ</div>
      </div>
    </a>
  </div>
</section>

<!-- ============ RESULTS (split dark panel) ============ -->
<section class="results">
  <div class="results-art" aria-hidden="true">
    <figure class="quote-big">
      <blockquote>“<?= e(tr($featured['testimonial']['quote'])) ?>”</blockquote>
      <figcaption><strong><?= e($featured['testimonial']['name']) ?></strong><span><?= e(tr($featured['testimonial']['role'])) ?></span></figcaption>
    </figure>
  </div>
  <div class="results-copy">
    <p class="eyebrow on-dark"><?= e(t('home.results.k')) ?></p>
    <h2 class="display"><?= e(t('home.results.h')) ?></h2>
    <?php partial('stats'); ?>
    <p class="fineprint"><?= e(t('stat.note')) ?></p>
  </div>
</section>

<!-- ============ BLOG ============ -->
<section class="section">
  <div class="wrap">
    <header class="section-head section-head-row reveal">
      <div>
        <p class="eyebrow"><?= e(t('home.blog.k')) ?></p>
        <h2 class="display"><?= e(t('home.blog.h')) ?></h2>
      </div>
      <a class="link-arrow" href="<?= e(url('blog')) ?>"><?= e(t('cta.all_posts')) ?> <?= icon('arrow', 16) ?></a>
    </header>
    <div class="post-grid">
      <?php foreach (array_slice(posts(), 0, 3) as $post) partial('post-card', ['post' => $post]); ?>
    </div>
  </div>
</section>

<?php partial('cta'); ?>
