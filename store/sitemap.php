<?php
// /sitemap.xml — homepage e página de cada produto visível, para motores de busca.
declare(strict_types=1);
require __DIR__ . '/app/lib.php';
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = preg_replace('/[^a-zA-Z0-9.:\-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
$base = $scheme . '://' . $host . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/sitemap.php')), '/') . '/';
header('Content-Type: application/xml; charset=utf-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
echo '  <url><loc>' . htmlspecialchars($base) . "</loc></url>\n";
try {
    foreach (products_list() as $p) {
        $mod = $p['updatedAt'] ? '<lastmod>' . substr($p['updatedAt'], 0, 10) . '</lastmod>' : '';
        echo '  <url><loc>' . htmlspecialchars($base . 'produto/' . $p['id']) . '</loc>' . $mod . "</url>\n";
    }
} catch (Throwable $e) { error_log('[loja] sitemap: ' . $e->getMessage()); }
echo "</urlset>\n";
