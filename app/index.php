<?php
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
if (!password_configured()) { header('Location: login.php'); exit; }
require_auth_page();
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
render_page(__DIR__ . '/inc/shell.html');
