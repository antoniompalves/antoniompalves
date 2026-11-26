<?php
/** Social icon row. Optional: $cls (extra class), $labels (bool: show text labels). */
$items = cfg('social') ?: [];
if (!$items) return;
?>
<ul class="social-list<?= !empty($labels) ? ' social-list-labels' : '' ?> <?= e($cls ?? '') ?>">
  <?php foreach ($items as [$ic, $label, $href]): ?>
    <li><a class="social" href="<?= e($href) ?>" target="_blank" rel="noopener" aria-label="<?= e($label) ?>"<?= empty($labels) ? ' title="' . e($label) . '"' : '' ?>><?= icon($ic, 19) ?><?php if (!empty($labels)): ?><span><?= e($label) ?></span><?php endif; ?></a></li>
  <?php endforeach; ?>
</ul>
