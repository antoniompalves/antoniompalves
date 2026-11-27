<?php
/** @var array $post */
$GLOBALS['page_title'] = tr($post['title']);
// <title>: short override (content/post-meta.php) > meta_title > headline; add the brand only if it still fits
$metaTitle = (require ROOT . '/content/post-meta.php')[$post['slug']['pt']] ?? (!empty($post['meta_title']) ? tr($post['meta_title']) : tr($post['title']));
$GLOBALS['page_title_full'] = mb_strlen($metaTitle) <= 52 ? $metaTitle . ' | EQ Training' : $metaTitle;
$GLOBALS['page_desc']  = tr($post['excerpt']);
$site = rtrim(absolute(url('home', cfg('default_lang'))), '/');
$GLOBALS['jsonld'][] = [
    '@type' => 'BlogPosting',
    'headline' => tr($post['title']),
    'description' => tr($post['excerpt']),
    'datePublished' => $post['date'],
    'dateModified' => $post['modified'] ?? $post['date'],
    'inLanguage' => lang() === 'pt' ? 'pt-PT' : 'en',
    'image' => absolute(rtrim(cfg('base_url'), '/') . '/' . post_img($post)),
    'author' => ['@id' => $site . '/#paulo'],
    'publisher' => ['@id' => $site . '/#org'],
    'mainEntityOfPage' => absolute(url('blog', null, $post['slug'][lang()])),
    'articleSection' => cat_label($post),
];
// Related: same category first, then newest
$cat = $post['cat']['pt'] ?? tr($post['cat']);
$others = array_values(array_filter(posts(), fn($p) => $p['slug'] !== $post['slug']));
usort($others, fn($a, $b) => ((($b['cat']['pt'] ?? '') === $cat) <=> (($a['cat']['pt'] ?? '') === $cat)) ?: strcmp($b['date'], $a['date']));
// Skip the lead paragraph when the excerpt is just the opening of the body
$plain = static fn($s) => preg_replace('/\s+/u', ' ', trim(html_entity_decode(strip_tags($s), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
$showLead = !str_starts_with($plain(mb_substr(tr($post['body']), 0, 1200)), rtrim($plain(tr($post['excerpt'])), '…'));
?>
<article class="article">
  <header class="article-head wrap-narrow">
    <a class="link-back" href="<?= e(url('blog')) ?>">← <?= e(t('blog.back')) ?></a>
    <p class="eyebrow"><?= e(cat_label($post)) ?></p>
    <h1 class="display"><?= e(tr($post['title'])) ?></h1>
    <?php if ($showLead): ?><p class="article-lead"><?= e(tr($post['excerpt'])) ?></p><?php endif; ?>
    <div class="post-meta"><span>Paulo Moreira</span><time datetime="<?= e($post['date']) ?>"><?= e(fmt_date($post['date'])) ?></time><span><?= e(t('min_read', $post['mins'])) ?></span></div>
  </header>
  <div class="wrap"><?php partial('post-cover', ['post' => $post, 'cls' => 'post-cover-xl', 'noCat' => true, 'alt' => tr($post['title']), 'eager' => true, 'sizes' => '(max-width: 1280px) 100vw, 1200px']); ?></div>
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
