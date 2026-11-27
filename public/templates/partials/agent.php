<?php
$name   = cfg('agent_name');
$video  = cfg('agent_video');
$poster = cfg('agent_poster');
$hasVideo  = asset_exists($video);
$hasPoster = asset_exists($poster);
?>
<div class="agent" data-agent data-state="closed">
  <!-- Expanded panel -->
  <section class="agent-panel" id="agent-panel" role="dialog" aria-modal="false" aria-labelledby="agent-title" hidden>
    <div class="agent-media">
      <?php if ($hasVideo): ?>
        <video class="agent-video" data-agent-video playsinline muted loop preload="metadata"<?= $hasPoster ? ' poster="' . e(asset($poster)) . '"' : '' ?>>
          <source src="<?= e(asset($video)) ?>" type="video/mp4">
        </video>
      <?php elseif ($hasPoster): ?>
        <img class="agent-video" src="<?= e(asset($poster)) ?>" alt="">
      <?php else: ?>
        <div class="agent-video agent-placeholder" aria-hidden="true">
          <span class="agent-ph-avatar"><?= agent_avatar() ?></span>
          <span class="agent-ph-name"><?= e(cfg('agent_fullname')) ?></span>
          <span class="agent-ph-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
        </div>
      <?php endif; ?>
      <?php if ($hasVideo): ?>
        <button class="agent-talk" type="button" data-agent-sound aria-pressed="false">
          <?= icon('mic', 18) ?><span data-agent-sound-label><?= e(t('agent.unmute')) ?></span>
        </button>
      <?php endif; ?>
    </div>

    <div class="agent-body">
      <p class="agent-hello"><?= e(t('agent.greeting', $name)) ?> <span><?= e(t('agent.role')) ?></span></p>
      <h2 id="agent-title" class="agent-headline"><?= e(t('agent.headline')) ?></h2>

      <div class="agent-actions">
        <a class="agent-btn" href="<?= e(booking_href()) ?>"<?= cfg('booking_url') ? ' target="_blank" rel="noopener"' : '' ?>><?= icon('calendar', 18) ?><?= e(t('agent.book')) ?></a>
        <div class="agent-row">
          <a class="agent-btn agent-btn-ghost" href="tel:<?= e(cfg('phone_raw')) ?>"><?= icon('phone', 18) ?><?= e(t('agent.call')) ?></a>
          <a class="agent-btn agent-btn-ghost" href="https://wa.me/<?= e(cfg('whatsapp')) ?>" target="_blank" rel="noopener"><?= icon('whatsapp', 18) ?>WhatsApp</a>
        </div>
      </div>

      <form class="agent-ask" data-agent-form novalidate>
        <input type="hidden" name="source" value="agent">
        <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="agent-input">
          <label class="sr-only" for="agent-q"><?= e(t('agent.ask', $name)) ?></label>
          <input id="agent-q" name="message" type="text" placeholder="<?= e(t('agent.ask', $name)) ?>" autocomplete="off" required>
          <button type="submit" aria-label="<?= e(t('agent.ask.send')) ?>"><?= icon('send', 18) ?></button>
        </div>
        <div class="agent-input agent-email" hidden>
          <label class="sr-only" for="agent-email"><?= e(t('agent.ask.email')) ?></label>
          <input id="agent-email" name="email" type="email" placeholder="<?= e(t('agent.ask.email')) ?>" autocomplete="email">
          <button type="submit" aria-label="<?= e(t('agent.ask.send')) ?>"><?= icon('send', 18) ?></button>
        </div>
        <p class="agent-status" role="status" aria-live="polite"></p>
      </form>

      <p class="agent-foot"><span class="dot"></span><?= e(t('agent.powered')) ?></p>
    </div>
  </section>

  <!-- Launcher bubble -->
  <div class="agent-launcher">
    <p class="agent-teaser" data-agent-teaser hidden><?= e(t('agent.greeting', $name)) ?> <span><?= e(t('agent.teaser')) ?></span></p>
    <button class="agent-bubble" type="button" data-agent-toggle aria-expanded="false" aria-controls="agent-panel"
            aria-label="<?= e(t('agent.open', $name)) ?>" data-label-open="<?= e(t('agent.open', $name)) ?>" data-label-close="<?= e(t('agent.close')) ?>">
      <span class="agent-face">
        <?php if ($hasVideo): ?>
          <video src="<?= e(asset($video)) ?>" muted loop playsinline autoplay preload="metadata" aria-hidden="true"<?= $hasPoster ? ' poster="' . e(asset($poster)) . '"' : '' ?>></video>
        <?php elseif ($hasPoster): ?>
          <img src="<?= e(asset($poster)) ?>" alt="">
        <?php else: ?>
          <span class="agent-initial"><?= agent_avatar() ?></span>
        <?php endif; ?>
      </span>
      <span class="agent-x"><?= icon('close', 22) ?></span>
      <span class="agent-online" aria-hidden="true"></span>
    </button>
  </div>
</div>
