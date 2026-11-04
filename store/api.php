<?php
// API da loja. Todas as rotas usam apenas GET/POST (compatível com alojamento partilhado / mod_security).
// O .htaccess reescreve /api/<rota> para api.php?route=<rota>.
declare(strict_types=1);
require __DIR__ . '/app/lib.php';

$route = trim((string) ($_GET['route'] ?? ($_SERVER['PATH_INFO'] ?? '')), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    // ----- public -----
    if ($route === 'settings' && $method === 'GET') json_out(200, brand_public());

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
        $row = find_order($m[1]);
        if ($m[2] === 'delete') {
            db()->prepare('DELETE FROM ' . t('orders') . ' WHERE id = ?')->execute([$m[1]]);
            json_out(200, ['ok' => true]);
        }
        $b = body_json(); $o = row_to_order($row); $now = now_iso();
        if (array_key_exists('status', $b)) {
            if (!in_array($b['status'], STATUSES, true)) throw new HttpError(400, 'Estado inválido');
            if ($b['status'] !== $o['status']) { $o['status'] = $b['status']; $o['history'][] = ['at' => $now, 'status' => $b['status'], 'by' => 'admin']; }
        }
        if (array_key_exists('internalNote', $b)) $o['internalNote'] = str_in($b['internalNote'], 2000);
        $o['updatedAt'] = $now;
        db()->prepare('UPDATE ' . t('orders') . ' SET status = ?, internal_note = ?, history = ?, updated_at = ? WHERE id = ?')
            ->execute([$o['status'], $o['internalNote'], json_encode($o['history'], JSON_UNESCAPED_UNICODE), $now, $o['id']]);
        json_out(200, $o);
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
