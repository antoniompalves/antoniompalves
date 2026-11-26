<?php $live = !empty($c['detail']); $tag = $live ? 'a' : 'div'; ?>
<<?= $tag ?> class="course-card reveal<?= $live ? '' : ' is-soon' ?>"<?= $live ? ' href="' . e(url('courses', null, $c['slug'][lang()])) . '"' : '' ?>>
  <span class="pillar-ic"><?= icon($c['icon'], 22) ?></span>
  <?php if (!$live): ?><span class="badge badge-muted"><?= e(t('soon')) ?></span><?php endif; ?>
  <h3><?= e(tr($c['title'])) ?></h3>
  <p><?= e(tr($c['excerpt'])) ?></p>
  <?php if ($live): ?><span class="link-arrow"><?= e(t('cta.learn')) ?> <?= icon('arrow', 16) ?></span><?php endif; ?>
</<?= $tag ?>>
