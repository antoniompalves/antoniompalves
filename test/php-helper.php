<?php
// Test helper: runs the PHP parsers on a file and prints JSON. Usage: php test/php-helper.php <mode> <file> [url]
require __DIR__ . '/../app/inc/leboncoin.php';
[$_, $mode, $file] = $argv;
$in = (string)file_get_contents($file);
$out = null;
if ($mode === 'lbc') $out = lbc_parse_payload($in);
if ($mode === 'jsonld') $out = jsonld_cars($in, $argv[3] ?? '');
if ($mode === 'specs') $out = specs_from_text($in);
if ($mode === 'fuel') $out = norm_fuel($in);
if ($mode === 'search') $out = lbc_search_url(json_decode($in, true));
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
