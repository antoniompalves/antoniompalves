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
readfile(__DIR__ . '/inc/shell.html');
