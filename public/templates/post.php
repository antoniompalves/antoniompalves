<?php
/** @var array $post */
$GLOBALS['page_title'] = tr($post['title']);
$GLOBALS['page_desc']  = tr($post['excerpt']);
$others = array_values(array_filter(posts(), fn($p) => $p['slug']['pt'] !== $post['slug']['pt']));
?>
<article class="article">
  <header class="article-head wrap-narrow">
    <a class="link-back" href="<?= e(url('blog')) ?>">← <?= e(t('blog.back')) ?></a>
    <p class="eyebrow"><?= e(tr($post['cat'])) ?></p>
    <h1 class="display"><?= e(tr($post['title'])) ?></h1>
    <p class="article-lead"><?= e(tr($post['excerpt'])) ?></p>
    <div class="post-meta">Paulo Moreira · <time datetime="<?= e($post['date']) ?>"><?= e(fmt_date($post['date'])) ?></time> · <?= e(t('min_read', $post['mins'])) ?></div>
  </header>
  <div class="wrap"><div class="post-cover post-cover-xl tone-<?= e($post['tone']) ?>" aria-hidden="true"></div></div>
  <div class="prose wrap-narrow">
    <?= tr($post['body']) /* trusted, author-controlled HTML */ ?>
  </div>
</article>

<?php if ($others): ?>
<section class="section section-tint">
  <div class="wrap">
    <header class="section-head reveal"><h2 class="display"><?= e(t('blog.more')) ?></h2></header>
    <div class="post-grid">
      <?php foreach (array_slice($others, 0, 3) as $p) partial('post-card', ['post' => $p]); ?>
    </div>
  </div>
</section>
<?php endif; ?>

<?php partial('cta'); ?>
