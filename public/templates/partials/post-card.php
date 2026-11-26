<article class="post-card reveal">
  <a href="<?= e(url('blog', null, $post['slug'][lang()])) ?>">
    <?php partial('post-cover', ['post' => $post]); ?>
    <div class="post-meta"><time datetime="<?= e($post['date']) ?>"><?= e(fmt_date($post['date'])) ?></time><span><?= e(t('min_read', $post['mins'])) ?></span></div>
    <h3><?= e(tr($post['title'])) ?></h3>
    <p><?= e(tr($post['excerpt'])) ?></p>
    <span class="link-arrow"><?= e(t('cta.read')) ?> <?= icon('arrow', 16) ?></span>
  </a>
</article>
