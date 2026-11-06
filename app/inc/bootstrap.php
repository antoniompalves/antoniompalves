<?php
// Vrooom.pt — bootstrap: configuration, session, auth, JSON helpers. PHP 7.4+.
declare(strict_types=1);

define('VROOM_ROOT', dirname(__DIR__));
if (is_file(VROOM_ROOT . '/config.php')) require VROOM_ROOT . '/config.php';
if (!defined('DATA_DIR')) define('DATA_DIR', getenv('VROOM_DATA_DIR') ?: VROOM_ROOT . '/data');
if (!defined('APP_PASSWORD')) define('APP_PASSWORD', ''); // optional: fixed password in config.php instead of the setup page
if (!defined('FIRECRAWL_API_KEY')) define('FIRECRAWL_API_KEY', '');

require_once __DIR__ . '/store.php';

function vroom_store(): Store
{
    static $s = null;
    if ($s === null) $s = new Store(DATA_DIR);
    return $s;
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443');
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $dir = DATA_DIR . '/sessions';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    if (is_dir($dir) && is_writable($dir)) session_save_path($dir);
    session_name('vroom_session');
    session_set_cookie_params([
        'lifetime' => 30 * 86400,
        'path' => rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\') . '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.gc_maxlifetime', (string)(30 * 86400));
    session_start();
}

// ---- password: setup page stores a hash in data/auth.json; or APP_PASSWORD in config.php ----
function auth_file(): string { return DATA_DIR . '/auth.json'; }
function password_configured(): bool { return APP_PASSWORD !== '' || is_file(auth_file()); }
function check_password(string $pw): bool
{
    if (APP_PASSWORD !== '') return hash_equals(APP_PASSWORD, $pw);
    $a = json_decode((string)@file_get_contents(auth_file()), true);
    return is_array($a) && !empty($a['hash']) && password_verify($pw, $a['hash']);
}
function set_password(string $pw): void
{
    vroom_store(); // makes sure DATA_DIR exists
    file_put_contents(auth_file(), json_encode(['hash' => password_hash($pw, PASSWORD_DEFAULT), 'updated' => date('c')]), LOCK_EX);
    @chmod(auth_file(), 0600);
}
function is_authed(): bool
{
    start_session();
    return !empty($_SESSION['vroom_ok']);
}
function require_auth_page(string $next = ''): void
{
    if (!is_authed()) {
        header('Location: login.php' . ($next ? '?next=' . rawurlencode($next) : ''));
        exit;
    }
}

// brute-force protection: 10 attempts per IP per 15 minutes
function too_many_attempts(bool $failed = false): bool
{
    $f = DATA_DIR . '/attempts.json';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
    $all = json_decode((string)@file_get_contents($f), true) ?: [];
    $now = time();
    foreach ($all as $k => $v) if ($now - $v['t'] > 900) unset($all[$k]);
    $a = $all[$ip] ?? ['n' => 0, 't' => $now];
    if ($failed) { $a['n']++; $all[$ip] = $a; @file_put_contents($f, json_encode($all), LOCK_EX); }
    return $a['n'] >= 10;
}

function json_out($data, int $status = 200, array $headers = []): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    foreach ($headers as $k => $v) header("$k: $v");
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $j = json_decode($raw, true);
    if (!is_array($j)) json_out(['error' => 'JSON inválido'], 400);
    return $j;
}

function firecrawl_key(): string
{
    if (FIRECRAWL_API_KEY !== '') return FIRECRAWL_API_KEY;
    $c = json_decode((string)@file_get_contents(DATA_DIR . '/secrets.json'), true);
    return is_array($c) ? (string)($c['firecrawl'] ?? '') : '';
}

/** Per-session anti-CSRF token (also used by the login form). */
function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return (string)$_SESSION['csrf'];
}

/** Same-site check from the Origin / Referer headers the browser adds to every POST. */
function same_origin(): bool
{
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $k) {
        if (empty($_SERVER[$k])) continue;
        $h = strtolower((string)parse_url((string)$_SERVER[$k], PHP_URL_HOST));
        $p = parse_url((string)$_SERVER[$k], PHP_URL_PORT);
        if ($h !== '' && ($h === $host || ($p && "$h:$p" === $host))) return true;
        return false; // present but foreign → refuse
    }
    return false;
}

/**
 * Write requests must prove they come from the app. Some hosts (proxies, firewalls, caches) strip custom
 * headers, so several proofs are accepted: the session token (header or ?t=), the X-Vroom header, or Origin/Referer.
 */
function write_allowed(string $token): bool
{
    $sent = (string)($_SERVER['HTTP_X_VROOM_TOKEN'] ?? ($_GET['t'] ?? ''));
    if ($token !== '' && $sent !== '' && hash_equals($token, $sent)) return true;
    if (($_SERVER['HTTP_X_VROOM'] ?? '') === '1' && same_origin_or_absent()) return true;
    return same_origin();
}
function same_origin_or_absent(): bool
{
    return (empty($_SERVER['HTTP_ORIGIN']) && empty($_SERVER['HTTP_REFERER'])) || same_origin();
}

/** Version of the front-end files = newest modification time of assets/. Changes on every update. */
function asset_version(): string
{
    static $v = null;
    if ($v !== null) return $v;
    $files = array_merge(glob(VROOM_ROOT . '/assets/*.{js,css,svg}', GLOB_BRACE) ?: [], glob(VROOM_ROOT . '/assets/lib/*.js') ?: []);
    $max = 0; $sig = '';
    foreach ($files as $f) { $m = (int)@filemtime($f); $max = max($max, $m); $sig .= basename($f) . $m . (int)@filesize($f); }
    return $v = date('Ymd-Hi', $max ?: time()) . '-' . substr(md5($sig), 0, 6);
}

/**
 * Output a page template with cache-busted assets: ?v=<version> on the stylesheet and script, and an import map
 * so every JavaScript module (including the ones imported by other modules) is also fetched with ?v=.
 * Browsers and host caches can then never mix old and new files after an update.
 */
function render_page(string $template): void
{
    $v = rawurlencode(asset_version());
    $html = (string)file_get_contents($template);
    $map = [];
    foreach (array_merge(glob(VROOM_ROOT . '/assets/*.js') ?: [], glob(VROOM_ROOT . '/assets/lib/*.js') ?: []) as $f) {
        $rel = './' . ltrim(str_replace('\\', '/', substr($f, strlen(VROOM_ROOT))), '/');
        $map[$rel] = $rel . '?v=' . $v;
    }
    $head = '<meta name="vroom-token" content="' . h(csrf_token()) . '"><meta name="vroom-version" content="' . h(asset_version()) . '">'
        . '<script type="importmap">' . json_encode(['imports' => $map], JSON_UNESCAPED_SLASHES) . '</script>';
    $html = str_replace(['assets/styles.css"', 'assets/app.js"', 'assets/logo.svg"'], ["assets/styles.css?v=$v\"", "assets/app.js?v=$v\"", "assets/logo.svg?v=$v\""], $html);
    $html = preg_replace('~<head>~', '<head>' . $head, $html, 1);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    echo $html;
}

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
