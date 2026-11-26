<?php $GLOBALS['page_title'] = t('nav.blog'); $all = posts(); $lead = array_shift($all); ?>
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow"><?= e(t('blog.k')) ?></p>
    <h1 class="display"><?= e(t('blog.h1')) ?></h1>
    <p class="section-lead"><?= e(t('blog.lead')) ?></p>
  </div>
</section>

<section class="section section-flush">
  <div class="wrap">
    <?php if ($lead): ?>
      <a class="post-lead reveal" href="<?= e(url('blog', null, $lead['slug'][lang()])) ?>">
        <div class="post-cover tone-<?= e($lead['tone']) ?>" aria-hidden="true"><span class="post-cat"><?= e(tr($lead['cat'])) ?></span></div>
        <div class="post-lead-copy">
          <div class="post-meta"><time datetime="<?= e($lead['date']) ?>"><?= e(fmt_date($lead['date'])) ?></time> · <?= e(t('min_read', $lead['mins'])) ?></div>
          <h2 class="display"><?= e(tr($lead['title'])) ?></h2>
          <p><?= e(tr($lead['excerpt'])) ?></p>
          <span class="link-arrow"><?= e(t('cta.read')) ?> <?= icon('arrow', 16) ?></span>
        </div>
      </a>
    <?php endif; ?>
    <div class="post-grid">
      <?php foreach ($all as $post) partial('post-card', ['post' => $post]); ?>
    </div>
  </div>
</section>

<?php partial('cta'); ?>
