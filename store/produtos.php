<?php
// Página "Produtos": /produtos — promoções, mais vendidos, novidades e o catálogo completo com
// pesquisa, filtros por categoria e paginação (desenhado pelo app.js). ?cat=<id> abre uma categoria.
declare(strict_types=1);
require __DIR__ . '/app/lib.php';
require __DIR__ . '/app/page.php';

$store = page_store_name();
$section = fn (string $id, string $title, string $sub, string $filter) =>
    '<section class="container shelf" id="' . $id . '" hidden><div class="shelf-head"><div><h2 class="section-title left">' . $title . '</h2>'
    . '<p class="muted">' . $sub . '</p></div><button type="button" class="link-btn" data-show="' . $filter . '">Ver todos →</button></div>'
    . '<div class="track shelf-track" id="' . $id . 'Track"></div></section>';

$slot = '<section class="container page-head"><nav class="crumbs" aria-label="Caminho"><a href="./">Início</a><span>›</span><b>Produtos</b></nav>'
    . '<h1>Produtos</h1><p class="muted">Encontre o que procura por categoria, ou veja as promoções, os mais vendidos e as novidades.</p>'
    . '<div class="jump" id="jump"></div></section>'
    . $section('promos', 'Promoções', 'Preços reduzidos por tempo limitado.', 'promo')
    . $section('bestsellers', 'Mais vendidos', 'Os produtos preferidos dos nossos clientes.', 'best')
    . $section('newin', 'Novidades', 'Acabados de chegar ao catálogo.', 'new')
    . '<section class="container" id="collection">'
    . '<div class="col-head"><h2 class="section-title left">Todos os produtos</h2><input type="search" id="search" placeholder="Pesquisar produtos…" aria-label="Pesquisar produtos"></div>'
    . '<div class="chips" id="chips"></div><div class="grid" id="grid"></div><nav class="pager" id="pager" aria-label="Paginação"></nav></section>';

render_page('<title>' . page_h('Produtos — ' . $store) . '</title>', $slot, ['type' => 'products'], 200, 'products');
