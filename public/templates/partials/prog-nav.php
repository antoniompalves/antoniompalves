<?php
/** In-page menu of a programme page: the 8 parts of the common structure. Sticks under the header; main.js marks the part in view. */
$ids = chapter_ids();
?>
<nav class="chap-nav" aria-label="<?= e(t('prog.nav')) ?>" data-chap-nav>
  <div class="wrap">
    <ol class="chap-list">
      <?php foreach ($ids as $i => $id): ?>
        <li><a class="chap-link" href="#<?= e($id) ?>" data-chap-link><span class="chap-n"><?= sprintf('%02d', $i + 1) ?></span><?= e(t('prog.n' . ($i + 1))) ?></a></li>
      <?php endforeach; ?>
    </ol>
  </div>
</nav>
