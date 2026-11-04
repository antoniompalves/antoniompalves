<?php
// Página própria de cada produto: /produto/<id>  (o .htaccess reescreve para produto.php?id=<id>).
// O servidor preenche o título, a descrição e a imagem de pré-visualização de links; o app.js desenha a ficha.
declare(strict_types=1);
require __DIR__ . '/app/lib.php';
require __DIR__ . '/app/page.php';

$h = 'page_h';
$id = (string) ($_GET['id'] ?? '');
$product = null;
$cats = [];
try {
    if (preg_match('/^[a-z0-9-]{1,64}$/', $id)) {
        foreach (products_list() as $p) if ($p['id'] === $id) { $product = $p; break; }
    }
    foreach (categories_list() as $c) $cats[$c['id']] = $c['name'];
} catch (Throwable $e) {
    error_log('[loja] produto.php: ' . $e->getMessage());
}
$store = page_store_name();

// plain-text summary of the description (first real paragraph, no Markdown) for meta tags and the no-JS view
$summary = function (array $p): string {
    foreach (preg_split('/\n\s*\n/', str_replace("\r", '', (string) $p['description'])) as $para) {
        $t = trim($para);
        if ($t !== '' && !preg_match('/^(#{1,6}\s|[-*•]\s)/', $t)) return trim(preg_replace('/\s+/', ' ', str_replace('**', '', $t)));
    }
    return trim($p['name'] . ($p['sub'] ? ' — ' . $p['sub'] : ''));
};

if (!$product) {
    render_page('<title>' . $h('Produto não encontrado — ' . $store) . '</title>',
        '<section class="container notfound"><h1>Produto não encontrado</h1><p class="muted">Este produto não existe ou já não está disponível.</p>'
        . '<a class="btn-dark" href="produtos">Ver todos os produtos <span>→</span></a></section>',
        ['type' => 'notfound'], 404, 'products');
}

$title = $product['name'] . ' — ' . $store;
$desc = mb_substr($summary($product), 0, 160);
$price = number_format(unit_price($product), 2, ',', ' ') . ' €';
$cat = $cats[$product['cat']] ?? '';
$head = '<title>' . $h($title) . '</title>'
    . "\n  <meta name=\"description\" content=\"" . $h($desc) . '">'
    . "\n  <meta property=\"og:type\" content=\"product\"><meta property=\"og:title\" content=\"" . $h($title) . '"><meta property="og:description" content="' . $h($desc) . '">';
$slot = '<nav class="container crumbs" aria-label="Caminho"><a href="./">Início</a><span>›</span><a href="produtos">Produtos</a>'
    . ($cat ? '<span>›</span><a href="produtos?cat=' . $h($product['cat']) . '#collection">' . $h($cat) . '</a>' : '')
    . '<span>›</span><b>' . $h($product['name']) . '</b></nav>'
    . '<section class="container detail" id="detail"><div class="ssr">'
    . ($product['imageUrl'] ? '<img src="' . $h($product['imageUrl']) . '" alt="' . $h($product['name']) . '">' : '')
    . '<div><h1>' . $h($product['name']) . '</h1><p class="muted">' . $h($product['sub']) . '</p><p class="ssr-price">' . $h($price) . '</p>'
    . '<p>' . $h($summary($product)) . '</p></div></div></section>'
    . '<section class="container related" id="related" hidden><h2 class="section-title left">Também pode gostar</h2><div class="grid" id="relatedGrid"></div></section>';
render_page($head, $slot, ['type' => 'product', 'id' => $product['id'], 'name' => $product['name']], 200, 'products');
