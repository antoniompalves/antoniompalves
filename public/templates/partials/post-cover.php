<?php /** @var array $post  @var string $cls  @var bool $noCat  @var string $alt */ ?>
<div class="post-cover <?= e($cls ?? '') ?>">
  <?php if (!empty($post['img'])): ?>
    <img src="<?= e(asset('assets/img/photos/' . $post['img'] . '.webp')) ?>" alt="<?= e($alt ?? '') ?>" width="1200" height="800" loading="<?= empty($eager) ? 'lazy' : 'eager' ?>">
  <?php endif; ?>
  <?php if (empty($noCat)): ?><span class="post-cat"><?= e(tr($post['cat'])) ?></span><?php endif; ?>
</div>
