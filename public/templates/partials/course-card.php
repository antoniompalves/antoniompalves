<?php
/** @var array $c  Course card. 'cover' => path under assets/img (no extension); 'variant' => 'app' for the app programme. */
$live  = !empty($c['detail']);
// Programmes without their own page yet link to the contact form with the programme preselected
$href  = $live ? url('courses', null, $c['slug'][lang()]) : url('contact') . '?p=' . rawurlencode($c['id']) . '#form';
$isApp = ($c['variant'] ?? '') === 'app';
$cls   = 'course-card reveal' . ($live ? '' : ' is-lite') . ($isApp ? ' course-card-app' : '') . (!$isApp && !empty($c['cover']) ? ' has-cover' : '');
?>
<a class="<?= $cls ?>" href="<?= e($href) ?>">
  <?php if (!$isApp && !empty($c['cover'])): ?>
    <span class="course-cover"><img src="<?= e(asset('assets/img/' . $c['cover'] . '.webp')) ?>" alt="" width="920" height="518" loading="lazy"></span>
  <?php elseif (!$isApp): ?>
    <span class="pillar-ic"><?= icon($c['icon'], 22) ?></span>
  <?php endif; ?>
  <?php if ($isApp && !empty($c['badge'])): ?><span class="badge"><?= icon('chart', 14) ?><?= e(tr($c['badge'])) ?></span><?php endif; ?>
  <h3><?= e(tr($c['title'])) ?></h3>
  <p><?= e(tr($c['excerpt'])) ?></p>
  <span class="link-arrow"><?= e(t($live ? 'cta.learn' : 'cta.info')) ?> <?= icon('arrow', 16) ?></span>
  <?php if ($isApp): ?>
    <span class="course-app-media" aria-hidden="true"><span class="device-phone"><img src="<?= e(asset('assets/img/app/hoje.webp')) ?>" alt="" width="780" height="1688" loading="lazy"></span></span>
  <?php endif; ?>
</a>
