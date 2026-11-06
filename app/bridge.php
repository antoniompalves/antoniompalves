<?php
// Receives the listing page from the bookmarklet (window.postMessage) and imports it.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require_auth_page('bridge.php'); // after login the user comes back here; the bookmarklet re-sends the page
header('Content-Type: text/html; charset=utf-8');
echo str_replace('</head>', '<meta name="vroom-token" content="' . h(csrf_token()) . '"></head>', (string)file_get_contents(__DIR__ . '/inc/bridge.html'));
