<?php
/** GET /sitemap.xml and /robots.txt — generated so the domain always matches config.php. */
declare(strict_types=1);

if ($special === 'robots.txt') {
    header('Content-Type: text/plain; charset=utf-8');
    echo "User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: " . absolute(rtrim(cfg('base_url'), '/') . '/sitemap.xml') . "\n";
    return;
}

header('Content-Type: application/xml; charset=utf-8');
$hl = ['pt' => 'pt-PT', 'en' => 'en'];
$entries = [];   // each: [ [lang => path], lastmod|null, priority ]
foreach (['home' => '1.0', 'services' => '0.9', 'courses' => '0.9', 'about' => '0.7', 'press' => '0.6', 'blog' => '0.6', 'contact' => '0.7', 'privacy' => '0.2'] as $p => $prio) {
    $entries[] = [array_combine(cfg('langs'), array_map(fn($l) => url($p, $l), cfg('langs'))), null, $prio];
}
foreach (courses() as $c) {
    if (!empty($c['detail'])) $entries[] = [array_combine(cfg('langs'), array_map(fn($l) => url('courses', $l, $c['slug'][$l]), cfg('langs'))), null, '0.9'];
}
foreach (posts() as $p) {
    $entries[] = [array_combine(cfg('langs'), array_map(fn($l) => url('blog', $l, $p['slug'][$l]), cfg('langs'))), $p['date'], '0.5'];
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
foreach ($entries as [$paths, $mod, $prio]) {
    foreach ($paths as $l => $path) {
        echo "  <url>\n    <loc>" . e(absolute($path)) . "</loc>\n";
        foreach ($paths as $l2 => $p2) echo '    <xhtml:link rel="alternate" hreflang="' . $hl[$l2] . '" href="' . e(absolute($p2)) . "\"/>\n";
        echo '    <xhtml:link rel="alternate" hreflang="x-default" href="' . e(absolute($paths[cfg('default_lang')])) . "\"/>\n";
        if ($mod) echo "    <lastmod>$mod</lastmod>\n";
        echo "    <priority>$prio</priority>\n  </url>\n";
    }
}
echo "</urlset>\n";
