<?php $pp = require ROOT . '/content/privacy.php'; ?>
<section class="page-head">
  <div class="wrap-narrow">
    <p class="eyebrow"><?= e(t('privacy.k')) ?></p>
    <h1 class="display"><?= e(t('footer.privacy')) ?></h1>
    <p class="post-meta"><span><?= e(t('privacy.updated')) ?> <time datetime="<?= e($pp['updated']) ?>"><?= e(fmt_date($pp['updated'])) ?></time></span></p>
  </div>
</section>
<div class="prose wrap-narrow">
  <?= $pp[lang()] /* trusted, author-controlled HTML */ ?>
</div>
