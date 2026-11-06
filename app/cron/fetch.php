<?php
// Refresh saved leboncoin searches into Vroom.pt (command line / cPanel Cron Jobs only).
//   php cron/fetch.php                       → reads data/searches.txt (one URL per line, # comments)
//   php cron/fetch.php "https://www.leboncoin.fr/recherche?..." [more urls]
//   php cron/fetch.php --file pagina.html    → parse a page saved from the browser
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/inc/bootstrap.php';
require dirname(__DIR__) . '/inc/leboncoin.php';

$args = array_slice($argv, 1);
$urls = []; $files = [];
for ($i = 0; $i < count($args); $i++) {
    if ($args[$i] === '--file') $files[] = $args[++$i];
    else $urls[] = $args[$i];
}
if (!$args) {
    $list = DATA_DIR . '/searches.txt';
    if (!is_file($list)) { fwrite(STDERR, "Crie $list com um URL de pesquisa por linha.\n"); exit(1); }
    foreach (file($list, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $l) { $l = trim($l); if ($l !== '' && $l[0] !== '#') $urls[] = $l; }
}
$created = 0; $updated = 0; $failed = 0;
$save = function (array $deals) use (&$created, &$updated) {
    $s = vroom_store();
    foreach ($deals as $d) $s->upsert($d)['created'] ? $created++ : $updated++;
};
foreach ($files as $f) { $d = lbc_parse_payload((string)file_get_contents($f)); echo "$f: " . count($d) . " anúncios\n"; $save($d); }
foreach ($urls as $u) {
    try { $d = lbc_fetch($u, firecrawl_key(), function ($m) { echo "  $m\n"; }); echo "$u: " . count($d) . " anúncios\n"; $save($d); }
    catch (Throwable $e) { $failed++; fwrite(STDERR, "$u: " . $e->getMessage() . "\n"); }
    usleep(random_int(1500000, 3000000)); // be polite
}
echo "Concluído: $created novos, $updated atualizados, $failed falhados.\n";
exit($failed && !$created && !$updated ? 2 : 0);
