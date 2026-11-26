<?php /** @var array $post  @var string $cls */ ?>
<div class="post-cover <?= e($cls ?? '') ?>">
  <?php if (!empty($post['img'])): ?>
    <img src="<?= e(asset('assets/img/photos/' . $post['img'] . '.webp')) ?>" alt="" loading="lazy">
  <?php endif; ?>
  <?php if (empty($noCat)): ?><span class="post-cat"><?= e(tr($post['cat'])) ?></span><?php endif; ?>
</div>
