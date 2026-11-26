<?php
$featured = courses()[0];
$words = [1, 2, 3, 4, 5];
$logos = require ROOT . '/content/logos.php';
$model = require ROOT . '/content/model.php';
?>
<!-- ============ HERO (rotating focus, torch-style tab bar) ============ -->
<section class="hero hero-home" data-rotator>
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow on-dark"><?= e(t('home.eyebrow')) ?></p>
      <h1 class="display hero-title">
        <span class="hero-for"><?= e(t('hero.for')) ?></span>
        <span class="rotator" aria-live="polite">
          <?php foreach ($words as $i): ?>
            <span class="rotator-word<?= $i === 1 ? ' is-active' : '' ?>" data-rot-word><?= e(t('hero.w' . $i)) ?></span>
          <?php endforeach; ?>
        </span>
      </h1>
      <p class="hero-lead"><?= e(t('home.lead')) ?></p>
      <div class="hero-ctas">
        <a class="btn btn-primary btn-lg" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('cta.book')) ?> <?= icon('arrow', 18) ?></a>
        <a class="btn btn-ghost-light btn-lg" href="<?= e(url('services')) ?>"><?= e(t('nav.services')) ?></a>
      </div>
    </div>
    <figure class="hero-media">
      <img src="<?= e(asset('assets/img/photos/stage-dark.webp')) ?>" alt="<?= e(t('hero.caption')) ?>" width="1800" height="1200" fetchpriority="high">
      <div class="hero-proof" aria-hidden="true">
        <?php foreach ($words as $i): ?>
          <div class="proof-item<?= $i === 1 ? ' is-active' : '' ?>" data-rot-proof>
            <span class="proof-k"><?= e(t('hero.t' . $i)) ?></span>
            <p><?= e(t('hero.q' . $i)) ?></p>
          </div>
        <?php endforeach; ?>
      </div>
    </figure>
  </div>
  <div class="wrap hero-tabs">
    <div class="tabs" role="tablist" aria-label="<?= e(t('hero.for')) ?>">
      <?php foreach ($words as $i): ?>
        <button role="tab" class="tab<?= $i === 1 ? ' is-active' : '' ?>" data-rot-tab aria-selected="<?= $i === 1 ? 'true' : 'false' ?>"><span class="tab-fill"></span><span class="tab-label"><?= e(t('hero.t' . $i)) ?></span></button>
      <?php endforeach; ?>
    </div>
    <span class="tab-count"><span data-rot-count>1</span> / <?= count($words) ?></span>
  </div>
</section>

<!-- ============ CLIENT LOGOS ============ -->
<section class="logos" aria-label="<?= e(t('logos.h')) ?>">
  <p class="logos-head wrap"><?= e(t('logos.h')) ?></p>
  <div class="marquee">
    <div class="marquee-track">
      <?php for ($k = 0; $k < 2; $k++): foreach ($logos['clients'] as [$f, $n, $w, $h]): ?>
        <img src="<?= e(asset('assets/img/clients/' . $f . '.png')) ?>" alt="<?= $k ? '' : e($n) ?>" width="<?= $w ?>" height="<?= $h ?>" loading="lazy"<?= $k ? ' aria-hidden="true"' : '' ?>>
      <?php endforeach; endfor; ?>
    </div>
  </div>
</section>

<!-- ============ THE PROBLEM → SOLUTION: EMOTIONAL ICEBERG (pinned scroll story) ============ -->
<section class="ice" data-ice aria-labelledby="ice-title">
  <div class="ice-stage" data-step="0">
    <div class="ice-scene" data-ice-scene aria-hidden="true">
      <svg class="ice-svg" viewBox="0 0 1440 2000" preserveAspectRatio="xMidYMin slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset="1" stop-color="#dbe8f6"/></linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a5aa6"/><stop offset=".28" stop-color="#063a74"/><stop offset=".7" stop-color="#04203f"/><stop offset="1" stop-color="#030d1f"/></linearGradient>
          <linearGradient id="deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc0ff" stop-opacity=".55"/><stop offset="1" stop-color="#7cc0ff" stop-opacity="0"/></linearGradient>
          <linearGradient id="rays" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        </defs>
        <rect width="1440" height="720" fill="url(#sky)"/>
        <rect y="720" width="1440" height="1280" fill="url(#sea)"/>
        <g class="ice-rays"><path d="M300 720h70l-150 760h-110z" fill="url(#rays)"/><path d="M820 720h50l60 640h-140z" fill="url(#rays)"/><path d="M1230 720h80l140 700h-120z" fill="url(#rays)"/></g>
        <!-- submerged mass: faceted -->
        <g class="ice-under" fill="url(#deep)">
          <path d="M480 720 L920 1180 L420 960Z" opacity=".9"/>
          <path d="M480 720 L1260 720 L920 1180Z" opacity=".55"/>
          <path d="M1260 720 L1380 930 L920 1180Z" opacity=".75"/>
          <path d="M1380 930 L1420 1160 L920 1180Z" opacity=".45"/>
          <path d="M1420 1160 L1330 1420 L920 1180Z" opacity=".7"/>
          <path d="M1330 1420 L1160 1610 L920 1180Z" opacity=".4"/>
          <path d="M1160 1610 L930 1700 L920 1180Z" opacity=".6"/>
          <path d="M930 1700 L690 1640 L920 1180Z" opacity=".35"/>
          <path d="M690 1640 L500 1470 L920 1180Z" opacity=".55"/>
          <path d="M500 1470 L400 1210 L920 1180Z" opacity=".3"/>
          <path d="M400 1210 L420 960 L920 1180Z" opacity=".5"/>
        </g>
        <!-- tip: faceted, lit from the top-left -->
        <g class="ice-tip" stroke="#cfe0f3" stroke-width=".6" stroke-linejoin="round">
          <path d="M540 720 L650 522 L690 720Z" fill="#eaf2fb"/>
          <path d="M650 522 L740 307.5 L690 720Z" fill="#ffffff"/>
          <path d="M740 307.5 L800 390 L780 720Z" fill="#d9e7f6"/>
          <path d="M740 307.5 L780 720 L690 720Z" fill="#f3f8fd"/>
          <path d="M800 390 L880 159 L840 720Z" fill="#ffffff"/>
          <path d="M800 390 L840 720 L780 720Z" fill="#e6eff9"/>
          <path d="M880 159 L980 307.5 L940 720Z" fill="#cddff2"/>
          <path d="M880 159 L940 720 L840 720Z" fill="#f6fafe"/>
          <path d="M980 307.5 L1060 423 L1040 720Z" fill="#c4d8ef"/>
          <path d="M980 307.5 L1040 720 L940 720Z" fill="#dbe8f6"/>
          <path d="M1060 423 L1140 522 L1140 720Z" fill="#bcd2ec"/>
          <path d="M1060 423 L1140 720 L1040 720Z" fill="#d3e3f4"/>
          <path d="M1140 522 L1260 720 L1140 720Z" fill="#c7daf0"/>
        </g>
        <!-- waterline -->
        <rect y="718" width="1440" height="4" fill="#fff" opacity=".7"/>
        <g stroke="#fff" stroke-opacity=".14" stroke-width="2"><path d="M0 760h1440"/><path d="M120 800h360M760 800h560"/><path d="M60 852h220M980 852h300"/></g>
        <g class="ice-bubbles" fill="#fff" opacity=".35"><circle cx="240" cy="1200" r="4"/><circle cx="1240" cy="1100" r="5"/><circle cx="1010" cy="1500" r="3"/><circle cx="420" cy="1600" r="4"/><circle cx="1330" cy="1700" r="3"/></g>
      </svg>
    </div>

    <div class="wrap ice-ui">
      <div class="ice-card" data-ice-card>
        <p class="eyebrow"><?= e(t('ice.k')) ?></p>
        <h2 id="ice-title" class="display"><?= e(t('ice.h')) ?></h2>
        <p class="ice-card-p"><?= e(t('ice.p')) ?></p>
      </div>

      <div class="ice-symptoms">
        <?php foreach ([1, 2, 3, 4, 5] as $i): ?>
          <div class="symptom" data-show="<?= [1 => 3, 2 => 3, 3 => 4, 4 => 5, 5 => 5][$i] ?>"><span class="symptom-dot"></span><p><?= e(t('ice.s' . $i)) ?></p></div>
        <?php endforeach; ?>
      </div>

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

      <div class="ice-fix" data-show="6">
        <p class="ice-fix-k"><?= e(t('ice.fix.h')) ?></p>
        <ul>
          <li><?= e(t('ice.fix.1')) ?></li>
          <li><?= e(t('ice.fix.2')) ?></li>
          <li><?= e(t('ice.fix.3')) ?></li>
        </ul>
      </div>

      <div class="ice-end" data-show="7">
        <p class="display"><?= e(t('ice.end')) ?></p>
        <a class="btn btn-light" href="<?= e(url('courses', null, $featured['slug'][lang()])) ?>"><?= e(t('cta.learn')) ?> <?= icon('arrow', 18) ?></a>
      </div>

      <div class="ice-progress" aria-hidden="true">
        <ol><?php for ($i = 0; $i < 8; $i++): ?><li data-dot="<?= $i ?>"></li><?php endfor; ?></ol>
      </div>
      <a class="ice-skip" href="#after-ice" data-ice-skip><?= e(t('ice.skip')) ?> <?= icon('arrow', 14) ?></a>
    </div>
  </div>
</section>
<div id="after-ice"></div>

<!-- ============ WHERE WE WORK (editorial rows) ============ -->
<section class="section">
  <div class="wrap">
    <header class="section-head section-head-row reveal">
      <div>
        <p class="eyebrow"><?= e(t('home.pillars.k')) ?></p>
        <h2 class="display"><?= e(t('home.pillars.h')) ?></h2>
      </div>
      <a class="link-arrow" href="<?= e(url('services')) ?>"><?= e(t('nav.services')) ?> <?= icon('arrow', 16) ?></a>
    </header>
    <ol class="rows">
      <?php foreach ([[1, 'ceos'], [2, 'orgs'], [3, 'orgs'], [4, 'orgs'], [5, 'teams']] as [$i, $tab]): ?>
        <li class="reveal">
          <a class="row" href="<?= e(url('services')) ?>#<?= $tab ?>">
            <span class="row-num">0<?= $i ?></span>
            <h3 class="row-title"><?= e(t("home.p$i.h")) ?></h3>
            <p class="row-desc"><?= e(t("home.p$i.p")) ?></p>
            <span class="row-arrow"><?= icon('arrow', 20) ?></span>
          </a>
        </li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>

<!-- ============ METHOD ============ -->
<section class="section section-paper">
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
<section class="section">
  <div class="wrap model-grid">
    <div class="model-intro reveal">
      <p class="eyebrow"><?= e(t('model.k')) ?></p>
      <h2 class="display"><?= e(t('model.h')) ?></h2>
      <p class="section-lead"><?= e(t('model.p')) ?></p>
      <figure class="model-photo">
        <img src="<?= e(asset('assets/img/photos/with-goleman.webp')) ?>" alt="<?= e(t('model.photo')) ?>" width="1067" height="799" loading="lazy">
        <figcaption><?= e(t('model.photo')) ?></figcaption>
      </figure>
    </div>
    <div class="model" data-model>
      <span class="model-axis" aria-hidden="true"><span><?= e(t('model.self')) ?></span><span><?= e(t('model.others')) ?></span></span>
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
    </div>
  </div>
  <div class="wrap"><p class="model-note reveal"><?= e(t('model.team')) ?></p></div>
</section>

<!-- ============ FEATURED PROGRAMME ============ -->
<section class="section section-flush">
  <div class="wrap">
    <a class="featured reveal" href="<?= e(url('courses', null, $featured['slug'][lang()])) ?>">
      <div class="featured-copy">
        <p class="eyebrow on-dark"><?= e(t('home.featured.k')) ?></p>
        <h2 class="display"><?= e(tr($featured['title'])) ?></h2>
        <p><?= e(tr($featured['tagline'])) ?></p>
        <ul class="featured-tags"><li>ESCI</li><li>MSCEIT</li><li>EQ-i 2.0</li><li>RULER</li></ul>
        <span class="btn btn-light"><?= e(t('cta.learn')) ?> <?= icon('arrow', 18) ?></span>
      </div>
      <div class="featured-media">
        <img src="<?= e(asset('assets/img/photos/training-room.webp')) ?>" alt="<?= e(t('featured.photo')) ?>" width="1600" height="900" loading="lazy">
      </div>
    </a>
  </div>
</section>

<!-- ============ RESULTS (split dark panel) ============ -->
<section class="results">
  <figure class="results-media">
    <img src="<?= e(asset('assets/img/photos/stage-keynote.webp')) ?>" alt="" width="960" height="640" loading="lazy">
    <figcaption class="quote-big">
      <blockquote>“<?= e(tr($featured['testimonial']['quote'])) ?>”</blockquote>
      <p><strong><?= e($featured['testimonial']['name']) ?></strong> · <?= e(tr($featured['testimonial']['role'])) ?></p>
    </figcaption>
  </figure>
  <div class="results-copy">
    <p class="eyebrow on-dark"><?= e(t('home.results.k')) ?></p>
    <h2 class="display"><?= e(t('home.results.h')) ?></h2>
    <?php partial('stats'); ?>
    <p class="fineprint"><?= e(t('stat.note')) ?></p>
  </div>
</section>

<!-- ============ AS SEEN ON ============ -->
<section class="seen">
  <div class="wrap seen-inner">
    <p class="seen-k"><?= e(t('seen.h')) ?></p>
    <ul class="seen-logos">
      <?php foreach ($logos['media'] as [$f, $n, $w, $h]): ?>
        <li><img src="<?= e(asset('assets/img/media/' . $f . '.png')) ?>" alt="<?= e($n) ?>" width="<?= $w ?>" height="<?= $h ?>" loading="lazy"></li>
      <?php endforeach; ?>
    </ul>
    <a class="link-arrow" href="<?= e(url('press')) ?>"><?= e(t('nav.press')) ?> <?= icon('arrow', 16) ?></a>
  </div>
</section>

<?php partial('tie-band'); ?>

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
