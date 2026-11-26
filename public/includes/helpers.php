<?php
declare(strict_types=1);

const ROOT = __DIR__ . '/..';

function cfg(?string $key = null)
{
    static $cfg = null;
    $cfg ??= require ROOT . '/config.php';
    return $key === null ? $cfg : ($cfg[$key] ?? null);
}

function set_lang(string $l): void { $GLOBALS['lang'] = $l; }
function lang(): string { return $GLOBALS['lang'] ?? cfg('default_lang'); }

/** Translate a UI string. Supports dot-less flat keys and sprintf args. */
function t(string $key, ...$args): string
{
    static $cache = [];
    $l = lang();
    $cache[$l] ??= require ROOT . "/lang/{$l}.php";
    $s = $cache[$l][$key] ?? $key;
    return $args ? vsprintf($s, $args) : $s;
}

/** Pick the current-language value from ['pt'=>..,'en'=>..] or return as-is. */
function tr($v)
{
    if (is_array($v) && (isset($v['pt']) || isset($v['en']))) {
        return $v[lang()] ?? $v['pt'] ?? reset($v);
    }
    return $v;
}

function e($s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** Escape, then turn *text* into <em> and {text} into highlight spans (1st = hl-up, 2nd = hl-down). */
function rich(string $s): string
{
    $h = preg_replace('/\*(.+?)\*/u', '<em>$1</em>', e($s));
    $i = 0;
    return preg_replace_callback('/\{(.+?)\}/u', function ($m) use (&$i) {
        return '<span class="' . ($i++ === 0 ? 'hl-up' : 'hl-down') . '">' . $m[1] . '</span>';
    }, $h);
}

/** page key => localized first path segment */
function routes(): array
{
    return [
        'home'    => ['pt' => '',          'en' => ''],
        'services'=> ['pt' => 'servicos',  'en' => 'services'],
        'courses' => ['pt' => 'cursos',    'en' => 'courses'],
        'about'   => ['pt' => 'sobre',     'en' => 'about'],
        'press'   => ['pt' => 'imprensa',  'en' => 'press'],
        'blog'    => ['pt' => 'blog',      'en' => 'blog'],
        'contact' => ['pt' => 'contactos', 'en' => 'contact'],
    ];
}

function url(string $page = 'home', ?string $l = null, ?string $slug = null): string
{
    $l ??= lang();
    $base = rtrim(cfg('base_url'), '/');
    $prefix = $l === cfg('default_lang') ? '' : '/' . $l;
    $seg = routes()[$page][$l] ?? '';
    $u = $base . $prefix . '/' . ($seg !== '' ? $seg . '/' : '');
    if ($slug) $u .= rawurlencode($slug) . '/';
    return $u;
}

function asset(string $p): string
{
    $file = ROOT . '/' . ltrim($p, '/');
    $v = is_file($file) ? '?v=' . filemtime($file) : '';
    return rtrim(cfg('base_url'), '/') . '/' . ltrim($p, '/') . $v;
}

function asset_exists(string $p): bool { return is_file(ROOT . '/' . ltrim($p, '/')); }

/** URL of the current page in another language (for the switcher + hreflang). */
function alt_url(string $l): string
{
    $page = $GLOBALS['current_page'] ?? 'home';
    $data = $GLOBALS['current_data'] ?? [];
    if ($page === '404') return url('home', $l);
    if (isset($data['course'])) return url('courses', $l, $data['course']['slug'][$l]);
    if (isset($data['post']))   return url('blog', $l, $data['post']['slug'][$l]);
    return url($page, $l);
}

function absolute(string $path): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'eqtraining.pt') . $path;
}

function redirect(string $to, int $code = 302): void
{
    header('Location: ' . $to, true, $code);
    exit;
}

function render(string $tpl, array $data = []): void
{
    extract($data);
    ob_start();
    require ROOT . "/templates/{$tpl}.php";
    $content = ob_get_clean();
    require ROOT . '/templates/layout.php';
}

function partial(string $name, array $data = []): void
{
    extract($data);
    require ROOT . "/templates/partials/{$name}.php";
}

// ---- Content -------------------------------------------------------------
function courses(): array
{
    static $c = null;
    return $c ??= require ROOT . '/content/courses.php';
}

function posts(): array
{
    static $p = null;
    if ($p === null) {
        $p = require ROOT . '/content/posts.php';
        usort($p, fn($a, $b) => strcmp($b['date'], $a['date']));
    }
    return $p;
}

function find_course(string $slug, string $l): ?array
{
    foreach (courses() as $c) if (($c['slug'][$l] ?? null) === $slug && !empty($c['detail'])) return $c;
    return null;
}

function find_post(string $slug, string $l): ?array
{
    foreach (posts() as $p) if (($p['slug'][$l] ?? null) === $slug) return $p;
    return null;
}

function fmt_date(string $ymd): string
{
    $ts = strtotime($ymd);
    $m = (int) date('n', $ts);
    $months = lang() === 'pt'
        ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return lang() === 'pt'
        ? date('j', $ts) . ' ' . $months[$m - 1] . ' ' . date('Y', $ts)
        : $months[$m - 1] . ' ' . date('j, Y', $ts);
}

// ---- Security ------------------------------------------------------------
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}

function booking_href(): string
{
    return cfg('booking_url') ?: url('contact') . '#form';
}

/** Inline SVG icon set (stroke icons, 24px grid). */
function icon(string $name, int $size = 20): string
{
    $paths = [
        'arrow'   => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'check'   => '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        'mic'     => '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
        'phone'   => '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
        'mail'    => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
        'pin'     => '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
        'calendar'=> '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
        'close'   => '<path d="M6 6l12 12M18 6L6 18"/>',
        'send'    => '<path d="M12 19V5M6 11l6-6 6 6"/>',
        'chat'    => '<path d="M4 5h16v11H9l-5 4z"/>',
        'whatsapp'=> '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>',
        'clock'   => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'users'   => '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
        'target'  => '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
        'spark'   => '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
        'loop'    => '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
        'flask'   => '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7 15h10"/>',
        'menu'    => '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'linkedin'=> '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
        'instagram'=> '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
        'facebook'=> '<path d="M14.5 21v-7.5h2.6l.4-3.2h-3V8.4c0-.9.3-1.6 1.6-1.6h1.6V4a21 21 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.3H8.5v3.2h2.8V21"/>',
        'youtube' => '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
        'spotify' => '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.6c3-.9 6.4-.6 9 .9M8 12.6c2.5-.7 5.2-.4 7.3.8M8.6 15.4c2-.5 3.9-.3 5.6.6"/>',
        'podcast' => '<circle cx="12" cy="10" r="2.2"/><path d="M12 14v7M7.8 15.2a6 6 0 1 1 8.4 0M5 18a9.5 9.5 0 1 1 14 0"/>',
        'external'=> '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
        'building'=> '<path d="M4 21V5l8-3v19M12 8h8v13M4 21h16M8 7v.01M8 11v.01M8 15v.01M16 12v.01M16 16v.01"/>',
        'heart'   => '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/>',
        'shield'  => '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
        'bolt'    => '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
        'compass' => '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    ];
    $p = $paths[$name] ?? '';
    return '<svg class="ic" width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $p . '</svg>';
}
