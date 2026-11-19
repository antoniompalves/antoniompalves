<?php
require __DIR__ . '/inc/bootstrap.php';
header('Content-Type: application/manifest+json; charset=utf-8');
$S = has_config() ? settings() : default_settings();
echo json_encode([
    'name' => $S['app_nome'] . ' · ' . $S['empresa_nome'], 'short_name' => $S['app_nome'],
    'start_url' => './index.php', 'scope' => './', 'display' => 'standalone', 'orientation' => 'portrait',
    'background_color' => '#05070b', 'theme_color' => '#05070b', 'lang' => 'pt-PT',
    'icons' => [['src' => 'assets/icon.svg', 'sizes' => 'any', 'type' => 'image/svg+xml', 'purpose' => 'any maskable']],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
