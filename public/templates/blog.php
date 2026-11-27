<?php
$GLOBALS['page_title'] = t('nav.blog');
$all  = posts();
$lead = $all[0] ?? null;
$cats = array_count_values(array_map(fn($p) => $p['cat']['pt'] ?? tr($p['cat']), $all));
arsort($cats);
$foreign = array_filter($all, fn($p) => post_lang($p) !== lang());   // posts not available in this language
?>
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow"><?= e(t('blog.k')) ?></p>
    <h1 class="display"><?= e(t('blog.h1')) ?></h1>
    <p class="section-lead"><?= e(t('blog.lead')) ?></p>
    <?php if ($foreign): ?><p class="blog-lang-note"><?= icon('globe', 16) ?><?= e(t('blog.pt_note')) ?></p><?php endif; ?>
  </div>
</section>

<section class="section section-flush">
  <div class="wrap" data-blog>
    <?php if (count($cats) > 1): ?>
      <div class="blog-filter" role="group" aria-label="<?= e(t('blog.filter')) ?>" data-blog-filter hidden>
        <button type="button" aria-pressed="true" data-cat=""><?= e(t('blog.all')) ?> <span><?= count($all) ?></span></button>
        <?php foreach ($cats as $cat => $n): ?>
          <button type="button" aria-pressed="false" data-cat="<?= e($cat) ?>"><?= e(cat_label(['cat' => ['pt' => $cat]])) ?> <span><?= $n ?></span></button>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
    <?php if ($lead): $pl = post_lang($lead); $la = $pl !== lang() ? ' lang="' . lang_tag($pl) . '"' : ''; ?>
      <a class="post-lead reveal" href="<?= e(post_url($lead)) ?>"<?= $la ? ' hreflang="' . lang_tag($pl) . '"' : '' ?>>
        <?php partial('post-cover', ['post' => $lead, 'sizes' => '(max-width: 960px) 100vw, 680px']); ?>
        <div class="post-lead-copy">
          <div class="post-meta"><time datetime="<?= e($lead['date']) ?>"><?= e(fmt_date($lead['date'])) ?></time><span><?= e(t('min_read', $lead['mins'])) ?></span><?php if ($la): ?><span class="post-lang" title="<?= e(t('blog.lang.' . $pl)) ?>"><span aria-hidden="true"><?= strtoupper($pl) ?></span><span class="sr-only"><?= e(t('blog.lang.' . $pl)) ?></span></span><?php endif; ?></div>
          <h2 class="display"<?= $la ?>><?= e(tr($lead['title'])) ?></h2>
          <p<?= $la ?>><?= e(tr($lead['excerpt'])) ?></p>
          <span class="link-arrow"><?= e(t('cta.read')) ?> <?= icon('arrow', 16) ?></span>
        </div>
      </a>
    <?php endif; ?>
    <h2 class="sr-only"><?= e(t('blog.list')) ?></h2>
    <div class="post-grid" data-blog-grid data-per="12">
      <?php foreach ($all as $i => $post) partial('post-card', ['post' => $post, 'dup' => $i === 0]); ?>
    </div>
    <p class="sr-only" aria-live="polite" data-blog-status data-tpl="<?= e(t('blog.count')) ?>"></p>
    <div class="blog-more"><button type="button" class="btn btn-ghost" data-blog-more hidden><?= e(t('blog.more_btn')) ?> <?= icon('chevron', 16) ?></button></div>
  </div>
</section>

<?php partial('cta'); ?>
