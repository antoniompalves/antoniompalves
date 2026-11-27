<?php
/** @var array $post  @var string $cls  @var bool $noCat  @var string $alt  @var bool $eager  @var string $sizes */
$src = post_img($post);
$dim = is_file(ROOT . '/' . $src) ? getimagesize(ROOT . '/' . $src) : null;
$small = preg_replace('/\.webp$/', '-640.webp', $src);
?>
<div class="post-cover <?= e($cls ?? '') ?>">
  <?php if (!empty($post['img'])): ?>
    <img src="<?= e(asset($src)) ?>"<?php if ($dim && asset_exists($small)): ?> srcset="<?= e(asset($small)) ?> 640w, <?= e(asset($src)) ?> <?= $dim[0] ?>w" sizes="<?= e($sizes ?? '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 400px') ?>"<?php endif; ?> alt="<?= e($alt ?? '') ?>" width="<?= $dim[0] ?? 1200 ?>" height="<?= $dim[1] ?? 800 ?>" loading="<?= empty($eager) ? 'lazy' : 'eager' ?>"<?= empty($eager) ? '' : ' fetchpriority="high"' ?>>
  <?php endif; ?>
  <?php if (empty($noCat)): ?><span class="post-cat"><?= e(cat_label($post)) ?></span><?php endif; ?>
</div>
