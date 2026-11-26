<?php
$stats = [['+', 58, '%', 'stat.1'], ['+', 31, '%', 'stat.2'], ['-', 40, '%', 'stat.3'], ['+', 23, '%', 'stat.4']];
?>
<div class="stats">
  <?php foreach ($stats as [$sign, $n, $unit, $k]): ?>
    <div class="stat reveal">
      <div class="stat-num"><span><?= $sign ?></span><span data-count="<?= $n ?>"><?= $n ?></span><span><?= $unit ?></span></div>
      <p><?= e(t($k)) ?></p>
    </div>
  <?php endforeach; ?>
</div>
