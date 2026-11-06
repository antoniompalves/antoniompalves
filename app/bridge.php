<?php
// Receives the listing page from the bookmarklet (window.postMessage) and imports it.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require_auth_page('bridge.php'); // after login the user comes back here; the bookmarklet re-sends the page
render_page(__DIR__ . '/inc/bridge.html');
