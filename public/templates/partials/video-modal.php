<dialog class="video-modal" data-video-modal aria-label="Video">
  <a class="video-yt-link" data-video-yt href="<?= e((array_values(array_filter(cfg('social') ?: [], fn($s) => $s[0] === 'youtube'))[0][2] ?? 'https://www.youtube.com')) ?>" target="_blank" rel="noopener">YouTube ↗</a>
  <div class="video-frame" data-video-frame></div>
  <button class="video-close" type="button" data-video-close aria-label="<?= e(t('agent.close')) ?>"><?= icon('close', 22) ?></button>
</dialog>
