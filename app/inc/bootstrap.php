<?php
// Vroom.pt — bootstrap: configuration, session, auth, JSON helpers. PHP 7.4+.
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

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
