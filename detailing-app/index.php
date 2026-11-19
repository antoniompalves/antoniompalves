<?php
require __DIR__ . '/inc/bootstrap.php';
if (!has_config()) { header('Location: install.php'); exit; }
$v = APP_VERSION;
?><!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#05070b">
<meta name="robots" content="noindex, nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Gestão</title>
<link rel="manifest" href="manifest.php">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/app.css?v=<?= $v ?>">
</head>
<body>
<div id="root"><div class="login"><div class="muted">A carregar…</div></div></div>
<noscript>Esta aplicação necessita de JavaScript.</noscript>
<script src="assets/app.js?v=<?= $v ?>"></script>
</body>
</html>
