<?php
/** Culture-change ecosystem: 5 nested levels where emotional intelligence shows up (inside → out). */
$levels = [
    ['icon' => 'heart',    'svc' => 'ceos'],
    ['icon' => 'chat',     'svc' => 'teams'],
    ['icon' => 'users',    'svc' => 'teams'],
    ['icon' => 'loop',     'svc' => 'orgs'],
    ['icon' => 'building', 'svc' => 'orgs'],
];
$n = count($levels);
?>
<section class="section eco-section">
  <div class="wrap">
    <header class="section-head reveal">
      <p class="eyebrow"><?= e(t('eco.k')) ?></p>
      <h2 class="display"><?= e(t('eco.h')) ?></h2>
      <p class="section-lead"><?= e(t('eco.p')) ?></p>
    </header>
    <div class="eco" data-eco>
      <div class="eco-rings" aria-hidden="true">
        <svg viewBox="0 0 400 400">
          <?php for ($i = $n - 1; $i >= 0; $i--): $r = 40 + $i * 38; ?>
            <circle class="eco-ring" data-ring="<?= $i ?>" cx="200" cy="200" r="<?= $r ?>"/>
            <text class="eco-ring-label" data-ring-label="<?= $i ?>" x="200" y="<?= 200 - $r + ($i === 0 ? 46 : 22) ?>" text-anchor="middle"><?= e(t("eco.$i.short")) ?></text>
          <?php endfor; ?>
        </svg>
      </div>
      <ol class="eco-list">
        <?php foreach ($levels as $i => $lv): ?>
          <li>
            <button type="button" class="eco-item<?= $i === 0 ? ' is-active' : '' ?>" data-eco-item="<?= $i ?>" aria-expanded="<?= $i === 0 ? 'true' : 'false' ?>">
              <span class="eco-num">0<?= $i + 1 ?></span>
              <span class="eco-head"><strong><?= e(t("eco.$i.h")) ?></strong><em><?= e(t("eco.$i.q")) ?></em></span>
              <?= icon($lv['icon'], 20) ?>
            </button>
            <div class="eco-body"<?= $i === 0 ? '' : ' hidden' ?>>
              <p><span class="eco-tag eco-tag-bad"><?= e(t('eco.symptom')) ?></span><?= e(t("eco.$i.bad")) ?></p>
              <p><span class="eco-tag eco-tag-good"><?= e(t('eco.response')) ?></span><?= e(t("eco.$i.good")) ?></p>
              <a class="link-arrow" href="<?= e(url('services')) ?>#<?= $lv['svc'] ?>" data-goto-tab="<?= $lv['svc'] ?>"><?= e(t('svc.tab.' . $lv['svc'])) ?> <?= icon('arrow', 16) ?></a>
            </div>
          </li>
        <?php endforeach; ?>
      </ol>
    </div>
  </div>
</section>
