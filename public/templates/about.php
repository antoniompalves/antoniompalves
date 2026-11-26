<?php
$GLOBALS['page_title'] = t('nav.about');
$L = lang();
$certs = [
    ['EQ-i 2.0 / EQ 360', 'Bar-On · MHS', $L === 'pt' ? 'Inteligência Emocional e bem-estar psicológico, com perspetiva 360.' : 'Emotional Intelligence and psychological wellbeing, with a 360 perspective.'],
    ['MSCEIT', 'Mayer · Salovey · Caruso — Yale', $L === 'pt' ? 'O único instrumento baseado em aptidão: mede o que a pessoa consegue fazer.' : 'The only ability-based instrument: it measures what a person can actually do.'],
    ['ESCI', 'Goleman · Boyatzis — Hay Group', $L === 'pt' ? 'Competências emocionais e sociais de liderança, avaliadas a 360 graus.' : 'Emotional and social leadership competencies, assessed at 360 degrees.'],
];
$books = $L === 'pt'
    ? ['Inteligência Emocional', 'Gerir Emoções', 'Vencer a Procrastinação']
    : ['Inteligência Emocional (Emotional Intelligence)', 'Gerir Emoções (Managing Emotions)', 'Vencer a Procrastinação (Beating Procrastination)'];
?>
<section class="hero hero-page hero-about">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap hero-split-grid">
    <div class="hero-copy">
      <p class="eyebrow on-dark"><?= e(t('about.k')) ?></p>
      <h1 class="display hero-title-sm"><?= e(t('about.h1')) ?></h1>
      <p class="hero-lead"><?= e(t('about.lead')) ?></p>
    </div>
    <figure class="hero-portrait">
      <img src="<?= e(asset('assets/img/photos/paulo-portrait.webp')) ?>" alt="Paulo Moreira" width="462" height="715">
    </figure>
  </div>
</section>

<section class="section">
  <div class="wrap founder">
    <div class="founder-copy reveal">
      <p class="eyebrow"><?= e(t('about.founder.k')) ?></p>
      <h2 class="display"><?= e(t('about.founder.h')) ?></h2>
      <p class="founder-role"><?= e(t('about.founder.r')) ?></p>
      <p><?= e(t('about.founder.p1')) ?></p>
      <p><?= e(t('about.founder.p2')) ?></p>
      <div class="founder-actions">
        <a class="btn btn-primary" href="<?= e(booking_href()) ?>" data-open-agent><?= e(t('cta.book')) ?> <?= icon('arrow', 18) ?></a>
        <?php partial('social', ['cls' => 'social-list-dark']); ?>
      </div>
    </div>
    <div class="founder-photos reveal">
      <figure class="fp fp-1">
        <img src="<?= e(asset('assets/img/photos/yale.webp')) ?>" alt="<?= e(t('about.photo.yale')) ?>" width="1400" height="1050" loading="lazy">
        <figcaption><?= e(t('about.photo.yale')) ?></figcaption>
      </figure>
      <figure class="fp fp-2">
        <img src="<?= e(asset('assets/img/photos/with-goleman.webp')) ?>" alt="<?= e(t('model.photo')) ?>" width="1067" height="799" loading="lazy">
        <figcaption><?= e(t('model.photo')) ?></figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="section section-paper">
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
  <div class="wrap books">
    <div class="books-media reveal">
      <img src="<?= e(asset('assets/img/photos/books.webp')) ?>" alt="<?= e(implode(', ', $books)) ?>" width="1100" height="1017" loading="lazy">
    </div>
    <div class="books-copy reveal">
      <p class="eyebrow"><?= e(t('about.books.k')) ?></p>
      <h2 class="display"><?= e(t('about.books.h')) ?></h2>
      <p class="section-lead"><?= e(t('about.books.p')) ?></p>
      <ol class="book-list">
        <?php foreach ($books as $i => $b): ?><li><span>0<?= $i + 1 ?></span><?= e($b) ?></li><?php endforeach; ?>
      </ol>
    </div>
  </div>
</section>

<?php partial('brands'); ?>

<section class="section">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('about.values.k')) ?></p>
      <h2 class="display"><?= e(t('about.values.h')) ?></h2>
    </header>
    <ol class="principles">
      <?php foreach ([1, 2, 3, 4] as $i): ?>
        <li class="reveal"><span class="principle-num">0<?= $i ?></span><h3><?= e(t("about.v$i.h")) ?></h3><p><?= e(t("about.v$i.p")) ?></p></li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>

<?php partial('cta'); ?>
