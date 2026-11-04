<?php
// API da loja. Todas as rotas usam apenas GET/POST (compatível com alojamento partilhado / mod_security).
// O .htaccess reescreve /api/<rota> para api.php?route=<rota>.
declare(strict_types=1);
require __DIR__ . '/app/lib.php';

$route = trim((string) ($_GET['route'] ?? ($_SERVER['PATH_INFO'] ?? '')), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($route === 'brand.css' && $method === 'GET') brand_css();

try {
    // ----- public -----
    if ($route === 'settings' && $method === 'GET') json_out(200, brand_public());
    if ($route === 'categories' && $method === 'GET') {
        json_out(200, array_map(fn ($c) => ['id' => $c['id'], 'name' => $c['name']], categories_list()));
    }
    if ($route === 'products' && $method === 'GET') {
        $list = array_map(function ($p) { unset($p['active'], $p['position'], $p['updatedAt']); return $p; }, products_list());
        json_out(200, $list);
    }

    if ($route === 'orders' && $method === 'POST' && !has_token_header()) {
        if (rate_limited('order', 10, 60)) throw new HttpError(429, 'Demasiados pedidos, tente novamente dentro de um minuto');
        $o = insert_order(build_order(body_json(), 'storefront'));
        json_out(201, ['number' => $o['number'], 'total' => $o['total']]);
    }

    if ($route === 'login' && $method === 'POST') {
        if (rate_limited('login', 10, 900)) throw new HttpError(429, 'Demasiadas tentativas, tente novamente mais tarde');
        $pw = body_json()['password'] ?? '';
        $hash = setting_all()['admin_password_hash'] ?? '';
        if (!is_string($pw) || $hash === '' || !password_verify($pw, $hash)) throw new HttpError(401, 'Palavra-passe incorreta');
        json_out(200, ['token' => create_session()]);
    }

    // ----- backoffice -----
    require_admin();

    if ($route === 'logout' && $method === 'POST') { destroy_session(); json_out(200, ['ok' => true]); }

    if ($route === 'orders' && $method === 'GET') {
        $rows = db()->query('SELECT * FROM ' . t('orders') . ' ORDER BY seq DESC')->fetchAll();
        json_out(200, array_map('row_to_order', $rows));
    }
    if ($route === 'orders' && $method === 'POST') json_out(201, insert_order(build_order(body_json(), 'backoffice')));

    if ($route === 'orders.csv' && $method === 'GET') {
        $cell = function ($v): string {
            $s = (string) ($v ?? '');
            if (preg_match('/^[=+\-@]/', $s)) $s = "'" . $s; // neutraliza fórmulas de folha de cálculo
            return preg_match('/[",\n;]/', $s) ? '"' . str_replace('"', '""', $s) . '"' : $s;
        };
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="pre-encomendas.csv"');
        header('Cache-Control: no-store');
        echo "\xEF\xBB\xBF"; // BOM para o Excel reconhecer UTF-8
        echo implode(',', ['numero', 'data', 'estado', 'origem', 'nome', 'email', 'telefone', 'morada', 'localidade', 'codigo_postal', 'pais', 'artigos', 'subtotal', 'desconto', 'total', 'observacoes']) . "\n";
        foreach (db()->query('SELECT * FROM ' . t('orders') . ' ORDER BY seq') as $r) {
            $o = row_to_order($r); $c = $o['customer'];
            $items = implode('; ', array_map(fn ($i) => $i['qty'] . 'x ' . $i['name'], $o['items']));
            echo implode(',', array_map($cell, [$o['number'], $o['createdAt'], $o['status'], $o['source'], $c['name'], $c['email'], $c['phone'],
                $c['address'], $c['city'], $c['postcode'], $c['country'], $items, $o['subtotal'], $o['discount'], $o['total'], $o['notes']])) . "\n";
        }
        exit;
    }

    if (preg_match('~^orders/([0-9a-f-]{36})/(update|delete)$~', $route, $m) && $method === 'POST') {
        if ($m[2] === 'delete') { order_delete($m[1]); json_out(200, ['ok' => true]); }
        json_out(200, order_update($m[1], body_json()));
    }

    // ----- categories -----
    if ($route === 'categories/all' && $method === 'GET') json_out(200, categories_list(true));
    if ($route === 'categories' && $method === 'POST') json_out(201, category_create(body_json()));
    if (preg_match('~^categories/([a-z0-9-]{1,40})/(update|delete|up|down)$~', $route, $m) && $method === 'POST') {
        switch ($m[2]) {
            case 'update': json_out(200, category_update($m[1], body_json()));
            case 'up': case 'down': json_out(200, category_move($m[1], $m[2] === 'up' ? -1 : 1));
            case 'delete':
                $to = body_json()['moveTo'] ?? null;
                category_delete($m[1], is_string($to) && $to !== '' ? $to : null);
                json_out(200, categories_list(true));
        }
    }

    // ----- products -----
    if ($route === 'products/all' && $method === 'GET') json_out(200, products_list(true));
    if ($route === 'products' && $method === 'POST') json_out(201, product_create(body_json()));
    if (preg_match('~^products/([a-z0-9-]{1,64})/stock$~', $route, $m) && $method === 'GET') json_out(200, stock_history($m[1]));
    if (preg_match('~^products/([a-z0-9-]{1,64})/(update|delete|image|image/delete|stock)$~', $route, $m) && $method === 'POST') {
        switch ($m[2]) {
            case 'stock': json_out(200, stock_adjust($m[1], body_json()));
            case 'update': json_out(200, product_update($m[1], body_json()));
            case 'delete': product_delete($m[1]); json_out(200, ['ok' => true]);
            case 'image': json_out(200, product_image_upload($m[1], $_FILES['file'] ?? null));
            case 'image/delete': json_out(200, product_image_remove($m[1]));
        }
    }

    if ($route === 'settings' && $method === 'POST') { brand_update(body_json()); json_out(200, brand_public()); }
    if (preg_match('~^settings/(logo|favicon)$~', $route, $m) && $method === 'POST') { brand_upload($m[1], $_FILES['file'] ?? null); json_out(200, brand_public()); }
    if (preg_match('~^settings/(logo|favicon)/delete$~', $route, $m) && $method === 'POST') { brand_remove($m[1]); json_out(200, brand_public()); }

    if ($route === 'password' && $method === 'POST') {
        $b = body_json();
        $hash = setting_all()['admin_password_hash'] ?? '';
        if (!password_verify((string) ($b['current'] ?? ''), $hash)) throw new HttpError(400, 'A palavra-passe atual está incorreta');
        $new = (string) ($b['new'] ?? '');
        if (mb_strlen($new) < 8) throw new HttpError(400, 'A nova palavra-passe deve ter pelo menos 8 caracteres');
        setting_set(['admin_password_hash' => password_hash($new, PASSWORD_DEFAULT)]);
        db()->exec('DELETE FROM ' . t('sessions')); // termina todas as sessões
        json_out(200, ['token' => create_session()]);
    }

    throw new HttpError(404, 'Não encontrado');
} catch (HttpError $e) {
    json_out($e->status, ['error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('[loja] ' . $e);
    json_out(500, ['error' => 'Erro interno do servidor']);
}
