<?php
/**
 * EQTraining.pt — front controller.
 * All requests are routed here by .htaccess.
 *   /                 → PT home        /en/            → EN home
 *   /cursos           → PT courses     /en/courses     → EN courses
 *   /cursos/{slug}    → PT course      /en/courses/{slug}
 *   /sobre            → PT about       /en/about
 *   /blog, /blog/{slug}               /en/blog, /en/blog/{slug}
 *   /contactos        → PT contact     /en/contact
 */
declare(strict_types=1);

session_start();
require __DIR__ . '/includes/helpers.php';

$cfg = cfg();

// ---- Parse path -----------------------------------------------------------
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim($cfg['base_url'], '/');
if ($base !== '' && str_starts_with($path, $base)) {
    $path = substr($path, strlen($base));
}
$segments = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));
$segments = array_map('rawurldecode', $segments);

$lang = $cfg['default_lang'];
if (isset($segments[0]) && in_array($segments[0], $cfg['langs'], true) && $segments[0] !== $cfg['default_lang']) {
    $lang = array_shift($segments);
}
// Allow /pt/... as an alias of the default language
if (isset($segments[0]) && $segments[0] === $cfg['default_lang']) {
    redirect(url('home', $cfg['default_lang']) . implode('/', array_slice($segments, 1)), 301);
}
set_lang($lang);

// ---- sitemap.xml / robots.txt ------------------------------------------
if (count($segments) === 1 && in_array($segments[0], ['sitemap.xml', 'robots.txt'], true)) {
    $special = $segments[0];
    require __DIR__ . '/includes/sitemap.php';
    exit;
}

// ---- Contact / lead POST endpoint ----------------------------------------
if (($segments[0] ?? '') === 'api' && ($segments[1] ?? '') === 'lead') {
    require __DIR__ . '/includes/lead.php';
    exit;
}

// ---- Resolve page key from localized slug -------------------------------
$routes = routes();                        // page key => [pt slug, en slug]
$first  = $segments[0] ?? '';
$page   = null;
foreach ($routes as $key => $slugs) {
    if ($slugs[$lang] === $first) { $page = $key; break; }
}

$params = ['slug' => $segments[1] ?? null];
$tpl    = null;
$data   = [];

switch ($page) {
    case 'home':
        if (count($segments) === 0) $tpl = 'home';
        break;
    case 'courses':
        if ($params['slug'] === null) {
            $tpl = 'courses';
        } elseif ($course = find_course($params['slug'], $lang)) {
            $tpl = 'course';
            $data['course'] = $course;
        }
        break;
    case 'blog':
        if ($params['slug'] === null) {
            $tpl = 'blog';
        } elseif ($post = find_post($params['slug'], $lang)) {
            $tpl = 'post';
            $data['post'] = $post;
        }
        break;
    case 'about':
    case 'programme':
    case 'services':
    case 'press':
    case 'contact':
    case 'privacy':
        if ($params['slug'] === null) $tpl = $page;
        break;
}

if ($tpl === null) {
    http_response_code(404);
    $tpl  = '404';
    $page = '404';
}

$GLOBALS['current_page'] = $page;
$GLOBALS['current_data'] = $data;

render($tpl, $data);
