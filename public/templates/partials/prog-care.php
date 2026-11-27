<?php
/**
 * Part 7 of a programme page, two columns: customisation steps and follow-up mechanisms.
 * @var string|null $diagnosis    programme-specific text for step 2 (assessment), or null for the common one
 * @var string|null $diagnosis_h  programme-specific title for step 2
 * @var array       $follow     follow-up items [icon, [pt,en] title, [pt,en] text]
 */
$C = programme_common();
$steps = $C['personal'];
if (!empty($diagnosis)) $steps[1][1] = $diagnosis;
if (!empty($diagnosis_h)) $steps[1][0] = $diagnosis_h;
?>
<div class="care<?= empty($follow) ? ' care-solo' : '' ?>">
  <div class="care-col reveal">
    <h3 class="care-k"><?= e(t('prog.care.a')) ?></h3>
    <ol class="care-steps">
      <?php foreach ($steps as $i => [$h, $p]): ?>
        <li><span class="care-n"><?= $i + 1 ?></span><div><h4><?= e(tr($h)) ?></h4><p><?= e(tr($p)) ?></p></div></li>
      <?php endforeach; ?>
    </ol>
  </div>
  <?php if (!empty($follow)): ?>
  <div class="care-col reveal">
    <h3 class="care-k"><?= e(t('prog.care.b')) ?></h3>
    <ul class="care-list">
      <?php foreach ($follow as [$ic, $h, $p]): ?>
        <li><span class="pillar-ic"><?= icon($ic, 20) ?></span><div><h4><?= e(tr($h)) ?></h4><p><?= e(tr($p)) ?></p></div></li>
      <?php endforeach; ?>
    </ul>
  </div>
  <?php endif; ?>
</div>
