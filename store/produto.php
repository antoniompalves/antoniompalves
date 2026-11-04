<?php
// Página própria de cada produto: /produto/<id>  (o .htaccess reescreve para produto.php?id=<id>).
// Reutiliza o index.html (cabeçalho, carrinho, rodapé) sem as secções da homepage, e preenche no
// servidor o título, a descrição e a imagem para motores de busca e partilhas. O app.js desenha a ficha.
declare(strict_types=1);
require __DIR__ . '/app/lib.php';

$h = fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$id = (string) ($_GET['id'] ?? '');
$product = null;
$brand = DEFAULT_SETTINGS;
$cats = [];
try {
    if (preg_match('/^[a-z0-9-]{1,64}$/', $id)) {
        foreach (products_list() as $p) if ($p['id'] === $id) { $product = $p; break; }
    }
    $brand = brand_public() + $brand;
    foreach (categories_list() as $c) $cats[$c['id']] = $c['name'];
} catch (Throwable $e) {
    error_log('[loja] produto.php: ' . $e->getMessage());
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') ? 'https' : 'http';
$host = preg_replace('/[^a-zA-Z0-9.:\-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/produto.php')), '/') . '/';
$abs = fn (string $path) => $scheme . '://' . $host . $base . ltrim($path, '/');
$store = (string) ($brand['storeName'] ?? 'Loja');

// plain-text summary of the description (first real paragraph, no Markdown) for meta tags and the no-JS view
$summary = function (array $p): string {
    foreach (preg_split('/\n\s*\n/', str_replace("\r", '', (string) $p['description'])) as $para) {
        $t = trim($para);
        if ($t !== '' && !preg_match('/^(#{1,6}\s|[-*•]\s)/', $t)) return trim(preg_replace('/\s+/', ' ', str_replace('**', '', $t)));
    }
    return trim($p['name'] . ($p['sub'] ? ' — ' . $p['sub'] : ''));
};

$html = file_get_contents(__DIR__ . '/index.html');
$html = preg_replace('~<!--HOME-ONLY-->.*?<!--/HOME-ONLY-->~s', '', $html);
$html = str_replace('class="hero-wrap"', 'class="hero-wrap compact"', $html);
$html = str_replace('<a href="./" class="active">Início</a>', '<a href="./">Início</a>', $html);

if ($product) {
    $title = $product['name'] . ' — ' . $store;
    $desc = mb_substr($summary($product), 0, 160);
    $img = $product['imageUrl'] ? $abs($product['imageUrl']) : null;
    $url = $abs('produto/' . $product['id']);
    $price = number_format(unit_price($product), 2, ',', ' ') . ' €';
    $cat = $cats[$product['cat']] ?? '';
    $head = '<title>' . $h($title) . '</title>'
        . "\n  <meta name=\"description\" content=\"" . $h($desc) . '">'
        . "\n  <link rel=\"canonical\" href=\"" . $h($url) . '">'
        . "\n  <meta property=\"og:type\" content=\"product\"><meta property=\"og:title\" content=\"" . $h($title) . '">'
        . '<meta property="og:description" content="' . $h($desc) . '"><meta property="og:url" content="' . $h($url) . '">'
        . ($img ? '<meta property="og:image" content="' . $h($img) . '">' : '');
    $slot = '<nav class="container crumbs" aria-label="Caminho"><a href="./">Início</a><span>›</span><a href="./#collection">Produtos</a>'
        . ($cat ? '<span>›</span><a href="./?cat=' . $h($product['cat']) . '#collection">' . $h($cat) . '</a>' : '')
        . '<span>›</span><b>' . $h($product['name']) . '</b></nav>'
        . '<section class="container detail" id="detail"><div class="ssr">'
        . ($img ? '<img src="' . $h($product['imageUrl']) . '" alt="' . $h($product['name']) . '">' : '')
        . '<div><h1>' . $h($product['name']) . '</h1><p class="muted">' . $h($product['sub']) . '</p><p class="ssr-price">' . $h($price) . '</p>'
        . '<p>' . $h($summary($product)) . '</p></div></div></section>'
        . '<section class="container related" id="related" hidden><h2 class="section-title left">Também pode gostar</h2><div class="grid" id="relatedGrid"></div></section>';
    $page = ['type' => 'product', 'id' => $product['id'], 'name' => $product['name']];
} else {
    http_response_code(404);
    $head = '<title>' . $h('Produto não encontrado — ' . $store) . '</title><meta name="robots" content="noindex">';
    $slot = '<section class="container notfound"><h1>Produto não encontrado</h1><p class="muted">Este produto não existe ou já não está disponível.</p>'
        . '<a class="btn-dark" href="./#collection">Ver todos os produtos <span>→</span></a></section>';
    $page = ['type' => 'notfound'];
}

$html = preg_replace('~<title>.*?</title>~s', '', $html, 1);
// <base> first, so styles, scripts, images and API calls resolve from the store root (works in a subfolder)
$html = preg_replace('~<head>~', "<head>\n  <base href=\"" . $h($base) . "\">\n  " . $head, $html, 1);
$html = str_replace('<!--PAGE-SLOT-->', $slot, $html);
$html = str_replace('<script src="app.js', '<script>window.PAGE = ' . json_encode($page, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ";</script>\n  <script src=\"app.js", $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
echo $html;
