<?php
/** @var array $post */
$GLOBALS['page_title'] = tr($post['title']);
if (!empty($post['meta_title'])) $GLOBALS['page_title_full'] = tr($post['meta_title']) . ' | EQ Training';
$GLOBALS['page_desc']  = tr($post['excerpt']);
$site = rtrim(absolute(url('home', cfg('default_lang'))), '/');
$GLOBALS['jsonld'][] = [
    '@type' => 'BlogPosting',
    'headline' => tr($post['title']),
    'description' => tr($post['excerpt']),
    'datePublished' => $post['date'],
    'dateModified' => $post['modified'] ?? $post['date'],
    'inLanguage' => lang() === 'pt' ? 'pt-PT' : 'en',
    'image' => absolute(rtrim(cfg('base_url'), '/') . '/assets/img/photos/' . $post['img'] . '.webp'),
    'author' => ['@id' => $site . '/#paulo'],
    'publisher' => ['@id' => $site . '/#org'],
    'mainEntityOfPage' => absolute(url('blog', null, $post['slug'][lang()])),
    'articleSection' => tr($post['cat']),
];
$others = array_values(array_filter(posts(), fn($p) => $p['slug']['pt'] !== $post['slug']['pt']));
?>
<article class="article">
  <header class="article-head wrap-narrow">
    <a class="link-back" href="<?= e(url('blog')) ?>">← <?= e(t('blog.back')) ?></a>
    <p class="eyebrow"><?= e(tr($post['cat'])) ?></p>
    <h1 class="display"><?= e(tr($post['title'])) ?></h1>
    <p class="article-lead"><?= e(tr($post['excerpt'])) ?></p>
    <div class="post-meta"><span>Paulo Moreira</span><time datetime="<?= e($post['date']) ?>"><?= e(fmt_date($post['date'])) ?></time><span><?= e(t('min_read', $post['mins'])) ?></span></div>
  </header>
  <div class="wrap"><?php partial('post-cover', ['post' => $post, 'cls' => 'post-cover-xl', 'noCat' => true, 'alt' => tr($post['title']), 'eager' => true]); ?></div>
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
