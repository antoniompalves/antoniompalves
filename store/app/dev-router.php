<?php
// Só para testes locais: php -S localhost:8000 app/dev-router.php  (emula o .htaccess)
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = dirname(__DIR__);
if (preg_match('~^/api/(.*)$~', $path, $m)) { $_GET['route'] = $m[1]; require $root . '/api.php'; return true; }
if (preg_match('~^/(app/|uploads/.*\.(php|html?|svg|js)$)~', $path) || preg_match('~/\.~', $path)) { http_response_code(403); echo 'Proibido'; return true; }
if ($path === '/install.php') { require $root . '/install.php'; return true; }
if (preg_match('~^/produto/([a-z0-9-]+)/?$~', $path, $m)) { $_GET['id'] = $m[1]; $_SERVER['SCRIPT_NAME'] = '/produto.php'; require $root . '/produto.php'; return true; }
if (preg_match('~/$~', $path) && is_file($root . $path . 'index.html')) { header('Content-Type: text/html; charset=utf-8'); readfile($root . $path . 'index.html'); return true; }
return false;
