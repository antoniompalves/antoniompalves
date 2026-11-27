<?php
/** @var array $post  @var bool $dup  (dup: hidden copy of the blog's lead post, shown only when a filter is active) */
$pl = post_lang($post);
$la = $pl !== lang() ? ' lang="' . lang_tag($pl) . '"' : '';
?>
<article class="post-card reveal" data-cat="<?= e($post['cat']['pt'] ?? tr($post['cat'])) ?>"<?= empty($dup) ? '' : ' data-lead-dup hidden' ?>>
  <a href="<?= e(post_url($post)) ?>"<?= $la ? ' hreflang="' . lang_tag($pl) . '"' : '' ?>>
    <?php partial('post-cover', ['post' => $post]); ?>
    <div class="post-meta"><time datetime="<?= e($post['date']) ?>"><?= e(fmt_date($post['date'])) ?></time><span><?= e(t('min_read', $post['mins'])) ?></span><?php if ($la): ?><span class="post-lang" title="<?= e(t('blog.lang.' . $pl)) ?>"><span aria-hidden="true"><?= strtoupper($pl) ?></span><span class="sr-only"><?= e(t('blog.lang.' . $pl)) ?></span></span><?php endif; ?></div>
    <h3<?= $la ?>><?= e(tr($post['title'])) ?></h3>
    <p<?= $la ?>><?= e(tr($post['excerpt'])) ?></p>
    <span class="link-arrow"><?= e(t('cta.read')) ?> <?= icon('arrow', 16) ?></span>
  </a>
</article>
