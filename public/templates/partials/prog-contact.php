<?php
/**
 * Part 8 of a programme page: proposal request with the form (sent as source "programme").
 * @var string $interest  programme name, sent with the request
 * @var string $h, $p     title and lead
 * @var array  $points    three short reassurance lines
 * @var string $formats   options of the "Formato" select, separated by |
 * @var string $ph        placeholder of the message field
 */
?>
<section class="section section-dark">
  <div class="wrap proposal">
    <div class="proposal-copy">
      <?= chapter_head(8, $h, $p, true) ?>
      <ul class="ticks ticks-light">
        <?php foreach ($points as $pt): ?><li><?= icon('check', 18) ?><?= e($pt) ?></li><?php endforeach; ?>
      </ul>
      <div class="proposal-alt">
        <button class="btn btn-ghost-light" type="button" data-open-agent><?= icon('chat', 18) ?><?= e(t('cta.talk', cfg('agent_name'))) ?></button>
        <a class="proposal-tel" href="tel:<?= e(cfg('phone_raw')) ?>"><?= icon('phone', 18) ?><?= e(cfg('phone')) ?></a>
      </div>
    </div>
    <form class="contact-form card" data-lead-form novalidate>
      <input type="hidden" name="source" value="programme">
      <input type="hidden" name="interest" value="<?= e($interest) ?>">
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="field-row">
        <label class="field"><span><?= e(t('form.name')) ?> *</span><input name="name" required autocomplete="name"></label>
        <label class="field"><span><?= e(t('form.email')) ?> *</span><input name="email" type="email" required autocomplete="email"></label>
      </div>
      <div class="field-row">
        <label class="field"><span><?= e(t('form.org')) ?> *</span><input name="org" required autocomplete="organization"></label>
        <label class="field"><span><?= e(t('form.phone')) ?></span><input name="phone" type="tel" autocomplete="tel"></label>
      </div>
      <div class="field-row">
        <label class="field"><span><?= e(t('programme.form.size')) ?></span>
          <select name="size"><?php foreach (explode('|', t('programme.form.sizes')) as $o): ?><option><?= e($o) ?></option><?php endforeach; ?></select>
        </label>
        <label class="field"><span><?= e(t('programme.form.format')) ?></span>
          <select name="format"><?php foreach (explode('|', $formats) as $o): ?><option><?= e($o) ?></option><?php endforeach; ?></select>
        </label>
      </div>
      <label class="field"><span><?= e(t('programme.form.msg')) ?></span><textarea name="message" rows="3" placeholder="<?= e($ph) ?>"></textarea></label>
      <label class="check"><input type="checkbox" name="consent" required><span><?= sprintf(e(t('form.consent')), '<a href="' . e(url('privacy')) . '" target="_blank" rel="noopener">' . e(t('footer.privacy')) . '</a>') ?></span></label>
      <button class="btn btn-primary btn-lg" type="submit"><?= e(t('programme.form.send')) ?> <?= icon('arrow', 18) ?></button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>
