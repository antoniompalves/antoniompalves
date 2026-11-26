<?php $formats = require ROOT . '/content/formats.php'; ?>
<div class="formats reveal">
  <?php foreach ($formats as $f): ?>
    <div class="format-row<?= !empty($f['popular']) ? ' is-popular' : '' ?>">
      <div class="format-name">
        <h3><?= e(tr($f['name'])) ?></h3>
        <?php if (!empty($f['popular'])): ?><span class="badge"><?= lang() === 'pt' ? 'Mais popular' : 'Most popular' ?></span><?php endif; ?>
      </div>
      <p class="format-ideal"><?= e(tr($f['ideal'])) ?></p>
      <div class="format-stat format-dur"><strong><?= e(tr($f['duration'])) ?></strong><span><?= e(t('fmt.duration')) ?></span></div>
      <div class="format-stat format-depth">
        <span class="depth" aria-label="<?= e(t('fmt.depth')) ?>: <?= (int) $f['depth'] ?>/4"><?php for ($i = 1; $i <= 4; $i++): ?><i class="<?= $i <= $f['depth'] ? 'on' : '' ?>"></i><?php endfor; ?></span>
        <span><?= e(t('fmt.depth')) ?></span>
      </div>
      <p class="format-desc"><?= e(tr($f['desc'])) ?></p>
    </div>
  <?php endforeach; ?>
</div>
