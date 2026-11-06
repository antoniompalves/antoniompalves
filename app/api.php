<?php
// Vroom.pt JSON API. Routes: api.php?r=<route>. Only GET and POST are used (some hosts block PUT/DELETE);
// POST with &_method=PUT|DELETE stands in for them.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/leboncoin.php';

set_exception_handler(function ($e) { json_out(['error' => $e->getMessage()], $e instanceof InvalidArgumentException ? 400 : 500); });
if (!is_authed()) json_out(['error' => 'sessão necessária'], 401);
session_write_close(); // don't hold the session lock during slow fetches

$route = trim((string)($_GET['r'] ?? ''), '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'POST' && isset($_GET['_method'])) $method = strtoupper((string)$_GET['_method']);
if ($method !== 'GET') {
    // CSRF: the app always sends this header; cross-site forms cannot.
    if (($_SERVER['HTTP_X_VROOM'] ?? '') !== '1') json_out(['error' => 'pedido recusado'], 403);
}

/** Empty JSON objects come back from PHP as [] — keep known object fields as objects so the browser can add keys. */
function objectify(array $d): array
{
    foreach (['overrides', 'checklist', 'dates', 'market', 'tradeIn'] as $k) if (array_key_exists($k, $d) && $d[$k] === []) $d[$k] = new stdClass();
    if (isset($d['expenses']) && is_array($d['expenses'])) foreach ($d['expenses'] as $i => $e) if (isset($e['shares']) && $e['shares'] === []) $d['expenses'][$i]['shares'] = new stdClass();
    return $d;
}
function obj($v) { return $v === [] || $v === null ? new stdClass() : $v; }

function import_deals(Store $s, array $list): array
{
    $created = 0; $updated = 0; $ids = [];
    foreach ($list as $d) {
        if (empty($d['price']) && empty($d['title'])) continue;
        $r = $s->upsert($d);
        $r['created'] ? $created++ : $updated++;
        $ids[] = $r['deal']['id'];
    }
    return ['created' => $created, 'updated' => $updated, 'ids' => $ids];
}

// slow network fetch first, before the data file is locked
if ($route === 'import/leboncoin' && $method === 'POST') {
    $b = json_body();
    try { $deals = lbc_fetch(trim((string)($b['url'] ?? '')), firecrawl_key()); }
    catch (Throwable $e) { json_out(['error' => $e->getMessage()], 502); }
    json_out(import_deals(vroom_store(), $deals));
}

$s = vroom_store();

if ($route === 'state' && $method === 'GET') {
    json_out(['deals' => array_map('objectify', $s->data['deals']), 'settings' => obj($s->data['settings']), 'ledger' => $s->data['ledger'], 'firecrawl' => firecrawl_key() !== '']);
}
if ($route === 'deals' && $method === 'POST') {
    $b = json_body();
    $b['source'] = $b['source'] ?? 'manual';
    if (empty($b['sourceId']) && $b['source'] !== 'manual' && !empty($b['url'])) $b['sourceId'] = $b['url'];
    json_out(objectify($s->upsert($b)['deal']), 201);
}
if (preg_match('~^deals/([\w-]+)$~', $route, $m)) {
    if ($method === 'PUT') { $d = $s->update($m[1], json_body()); $d ? json_out(objectify($d)) : json_out(['error' => 'não encontrado'], 404); }
    if ($method === 'DELETE') $s->remove($m[1]) ? json_out(['ok' => true]) : json_out(['error' => 'não encontrado'], 404);
}
if ($route === 'settings' && $method === 'PUT') { $s->data['settings'] = json_body(); $s->save(); json_out(obj($s->data['settings'])); }
if ($route === 'ledger' && $method === 'PUT') {
    $b = json_body();
    $s->data['ledger'] = ['general' => array_values((array)($b['general'] ?? [])), 'settlements' => array_values((array)($b['settlements'] ?? []))];
    $s->save();
    json_out($s->data['ledger']);
}
if ($route === 'secrets' && $method === 'PUT') {
    $b = json_body();
    file_put_contents(DATA_DIR . '/secrets.json', json_encode(['firecrawl' => trim((string)($b['firecrawl'] ?? ''))]), LOCK_EX);
    @chmod(DATA_DIR . '/secrets.json', 0600);
    json_out(['firecrawl' => firecrawl_key() !== '']);
}
if ($route === 'password' && $method === 'PUT') {
    $b = json_body();
    if (APP_PASSWORD !== '') json_out(['error' => 'A palavra-passe está definida no config.php'], 400);
    if (!check_password((string)($b['current'] ?? ''))) json_out(['error' => 'Palavra-passe atual errada'], 400);
    if (strlen((string)($b['new'] ?? '')) < 8) json_out(['error' => 'A nova palavra-passe deve ter pelo menos 8 caracteres'], 400);
    set_password((string)$b['new']);
    json_out(['ok' => true]);
}
if ($route === 'import/paste' && $method === 'POST') {
    $b = json_body();
    // content arrives base64-encoded so web firewalls (ModSecurity) don't block page HTML in the body
    $content = isset($b['content_b64']) ? (string)base64_decode((string)$b['content_b64'], true) : (string)($b['content'] ?? '');
    $url = (string)($b['url'] ?? '');
    $deals = lbc_parse_payload($content);
    if (!$deals) {
        $deals = jsonld_cars($content, $url);
        if (!empty($b['country'])) foreach ($deals as &$d) $d['country'] = $b['country'];
        unset($d);
    }
    if (!$deals) json_out(['error' => 'Não foi encontrado nenhum anúncio no que colou. Cole o código-fonte completo da página (Ctrl+U → Ctrl+A → Ctrl+C).'], 422);
    json_out(import_deals($s, $deals));
}
if ($route === 'leboncoin/search-url' && $method === 'POST') json_out(['url' => lbc_search_url(json_body())]);
if ($route === 'export' && $method === 'GET') {
    json_out(['deals' => array_map('objectify', $s->data['deals']), 'settings' => obj($s->data['settings']), 'ledger' => $s->data['ledger']], 200,
        ['Content-Disposition' => 'attachment; filename="vroom-copia-' . date('Y-m-d') . '.json"']);
}
if ($route === 'restore' && $method === 'POST') {
    $b = json_body();
    if (!isset($b['deals']) || !is_array($b['deals'])) json_out(['error' => 'Não é um ficheiro de cópia de segurança do Vroom'], 400);
    $s->backup();
    $s->data = ['deals' => $b['deals'], 'settings' => $b['settings'] ?? [], 'ledger' => $b['ledger'] ?? ['general' => [], 'settlements' => []]];
    $s->save();
    json_out(['ok' => true, 'deals' => count($b['deals'])]);
}
json_out(['error' => 'endpoint desconhecido'], 404);
