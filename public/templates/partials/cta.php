<section class="cta-band">
  <div class="wrap cta-inner reveal">
    <div>
      <h2 class="display"><?= e(t('home.cta.h')) ?></h2>
      <p><?= e(t('home.cta.p')) ?></p>
    </div>
    <div class="cta-actions">
      <a class="btn btn-light" href="<?= e(booking_href()) ?>" data-open-agent><?= icon('calendar', 18) ?><?= e(t('cta.book_long')) ?></a>
      <a class="btn btn-outline-light" href="tel:<?= e(cfg('phone_raw')) ?>"><?= icon('phone', 18) ?><?= e(cfg('phone')) ?></a>
    </div>
  </div>
</section>
