<?php $GLOBALS['page_title'] = t('nav.contact'); ?>
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow"><?= e(t('contact.k')) ?></p>
    <h1 class="display"><?= e(t('contact.h1')) ?></h1>
    <p class="section-lead"><?= e(t('contact.lead')) ?></p>
  </div>
</section>

<section class="section section-flush">
  <div class="wrap contact-grid">
    <form class="contact-form card" id="form" data-lead-form novalidate>
      <input type="hidden" name="source" value="contact">
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="field-row">
        <label class="field"><span><?= e(t('form.name')) ?> *</span><input name="name" required autocomplete="name"></label>
        <label class="field"><span><?= e(t('form.email')) ?> *</span><input name="email" type="email" required autocomplete="email"></label>
      </div>
      <div class="field-row">
        <label class="field"><span><?= e(t('form.org')) ?></span><input name="org" autocomplete="organization"></label>
        <label class="field"><span><?= e(t('form.phone')) ?></span><input name="phone" type="tel" autocomplete="tel"></label>
      </div>
      <div class="field-row">
        <label class="field"><span><?= e(t('form.type')) ?></span>
          <select name="type">
            <option value="private"><?= e(t('form.type.private')) ?></option>
            <option value="public"><?= e(t('form.type.public')) ?></option>
            <option value="other"><?= e(t('form.type.other')) ?></option>
          </select>
        </label>
        <label class="field"><span><?= e(t('form.interest')) ?></span>
          <select name="interest">
            <option value=""><?= e(t('form.interest.any')) ?></option>
            <?php foreach (courses() as $c): ?><option><?= e(tr($c['short'])) ?></option><?php endforeach; ?>
          </select>
        </label>
      </div>
      <label class="field"><span><?= e(t('form.message')) ?> *</span><textarea name="message" rows="5" required></textarea></label>
      <label class="check"><input type="checkbox" name="consent" required><span><?= e(t('form.consent')) ?></span></label>
      <button class="btn btn-primary btn-lg" type="submit"><?= e(t('form.send')) ?> <?= icon('arrow', 18) ?></button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </form>

    <aside class="contact-side">
      <div class="card agent-card">
        <span class="book-avatar" aria-hidden="true"><?= e(implode('', array_map(fn($w) => mb_substr($w, 0, 1), array_slice(explode(' ', cfg('agent_fullname')), 0, 2)))) ?></span>
        <div>
          <strong><?= e(cfg('agent_fullname')) ?></strong>
          <span><?= e(t('agent.role')) ?></span>
        </div>
        <button class="btn btn-primary btn-block" type="button" data-open-agent><?= icon('chat', 18) ?><?= e(t('cta.talk', cfg('agent_name'))) ?></button>
      </div>
      <div class="card">
        <h2 class="h-sm"><?= e(t('contact.direct')) ?></h2>
        <ul class="contact-list">
          <li><?= icon('phone', 18) ?><a href="tel:<?= e(cfg('phone_raw')) ?>"><?= e(cfg('phone')) ?></a></li>
          <li><?= icon('whatsapp', 18) ?><a href="https://wa.me/<?= e(cfg('whatsapp')) ?>" target="_blank" rel="noopener">WhatsApp</a></li>
          <li><?= icon('mail', 18) ?><a href="mailto:<?= e(cfg('email_to')) ?>"><?= e(cfg('email_to')) ?></a></li>
          <li><?= icon('pin', 18) ?><span><?= e(t('contact.area')) ?></span></li>
        </ul>
      </div>
      <div class="card">
        <h2 class="h-sm"><?= e(t('social.h')) ?></h2>
        <?php partial('social', ['labels' => true]); ?>
      </div>
    </aside>
  </div>
</section>
