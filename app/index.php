<?php
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
if (!password_configured()) { header('Location: login.php'); exit; }
require_auth_page();
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-cache');
echo str_replace('</head>', '<meta name="vroom-token" content="' . h(csrf_token()) . '"></head>', (string)file_get_contents(__DIR__ . '/inc/shell.html'));
