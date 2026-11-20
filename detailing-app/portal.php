<?php
require __DIR__ . '/inc/bootstrap.php';
if (!has_config()) { http_response_code(503); exit('Portal indisponível.'); }
$v = APP_VERSION;
?><!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0b0c">
<meta name="description" content="Serviços de detailing automóvel: lavagem, interior, correção de pintura, proteção cerâmica e PPF. Peça a sua marcação online.">
<title>Serviços de detailing</title>
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Geist:wght@400;500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<script>window.APP_V = '<?= $v ?>';</script>
<script type="importmap">{"imports":{"three":"./assets/vendor/three/build/three.module.min.js"}}</script>
<link rel="stylesheet" href="assets/app.css?v=<?= $v ?>">
<link rel="stylesheet" href="assets/portal.css?v=<?= $v ?>">
</head>
<body class="portal">
<div id="root"><div class="login"><div class="muted">A carregar…</div></div></div>
<script src="assets/portal.js?v=<?= $v ?>"></script>
</body>
</html>
