<?php
// Server-rendered pages (produto.php, produtos.php): reuse index.html — header, cart, contacts, footer —
// without the home-only sections, with page-specific <head> and content. Indexing stays disabled
// (meta robots from index.html + X-Robots-Tag).
declare(strict_types=1);

function page_h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

function page_base(): string
{
    return rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php')), '/') . '/';
}

function page_store_name(): string
{
    try { return (string) brand_public()['storeName']; } catch (Throwable $e) { return DEFAULT_SETTINGS['storeName']; }
}

// $active: which nav item to mark ("home" | "products" | "")
function render_page(string $head, string $slot, array $page, int $status = 200, string $active = ''): never
{
    $html = file_get_contents(WEB_ROOT . '/index.html');
    $html = preg_replace('~<!--HOME-ONLY-->.*?<!--/HOME-ONLY-->~s', '', $html);
    $html = str_replace('class="hero-wrap"', 'class="hero-wrap compact"', $html);
    $html = str_replace('<a href="./" class="active">Início</a>', '<a href="./">Início</a>', $html);
    if ($active === 'products') $html = str_replace('<a href="produtos">Produtos</a>', '<a href="produtos" class="active">Produtos</a>', $html);
    $html = preg_replace('~<title>.*?</title>~s', '', $html, 1);
    // <base> first, so styles, scripts, images and API calls resolve from the store root (works in a subfolder)
    $html = preg_replace('~<head>~', "<head>\n  <base href=\"" . page_h(page_base()) . "\">\n  " . $head, $html, 1);
    $html = str_replace('<!--PAGE-SLOT-->', $slot, $html);
    $json = json_encode($page, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $html = str_replace('<script src="app.js', "<script>window.PAGE = $json;</script>\n  <script src=\"app.js", $html);
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex');
    echo $html;
    exit;
}
