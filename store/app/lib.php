<?php
// Núcleo partilhado da API: base de dados, catálogo, encomendas, marca e autenticação.
declare(strict_types=1);

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const SESSION_TTL = 12 * 3600;
const BRAND_LIMITS = ['logo' => 2 * 1024 * 1024, 'favicon' => 512 * 1024];
const DEFAULT_SETTINGS = [
    'storeName' => 'Forge Labs', 'logoText' => 'FORGE', 'logoSub' => 'LABS', 'primaryColor' => '#f26b1d',
    'supportEmail' => 'support@forgelabs.example', 'logo' => null, 'favicon' => null, 'updatedAt' => null,
];
define('WEB_ROOT', dirname(__DIR__));

final class HttpError extends Exception
{
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}

// ---------- config & database ----------
function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = __DIR__ . '/config.php';
        $cfg = is_file($file) ? (require $file) : [];
    }
    return $cfg;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = config();
    if (!$c) throw new HttpError(503, 'A loja ainda não foi instalada. Abra install.php.');
    $pdo = connect($c['dsn'], $c['db_user'] ?? null, $c['db_pass'] ?? null);
    return $pdo;
}

function connect(string $dsn, ?string $user, ?string $pass): PDO
{
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') $pdo->exec('PRAGMA journal_mode = WAL');
    return $pdo;
}

function t(string $name): string { return (config()['prefix'] ?? '') . $name; }

function schema(string $driver, string $prefix): array
{
    if ($driver === 'sqlite') {
        return [
            "CREATE TABLE IF NOT EXISTS {$prefix}orders (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, number TEXT UNIQUE,
              created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL,
              customer_name TEXT, customer_email TEXT, customer_phone TEXT, customer_address TEXT, customer_city TEXT, customer_postcode TEXT, customer_country TEXT,
              notes TEXT, internal_note TEXT, items TEXT NOT NULL, history TEXT NOT NULL, subtotal REAL, discount REAL, total REAL)",
            "CREATE INDEX IF NOT EXISTS {$prefix}orders_status ON {$prefix}orders(status)",
            "CREATE TABLE IF NOT EXISTS {$prefix}settings (k TEXT PRIMARY KEY, v TEXT)",
            "CREATE TABLE IF NOT EXISTS {$prefix}sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS {$prefix}attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, ip TEXT NOT NULL, at INTEGER NOT NULL)",
            "CREATE INDEX IF NOT EXISTS {$prefix}attempts_lookup ON {$prefix}attempts(kind, ip, at)",
            products_schema('sqlite', $prefix),
            categories_schema('sqlite', $prefix),
            stock_schema('sqlite', $prefix),
            testimonials_schema('sqlite', $prefix),
        ];
    }
    $tail = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    return [
        "CREATE TABLE IF NOT EXISTS {$prefix}orders (
          seq INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, id CHAR(36) NOT NULL UNIQUE, number VARCHAR(20) NULL UNIQUE,
          created_at VARCHAR(32) NOT NULL, updated_at VARCHAR(32) NOT NULL, status VARCHAR(20) NOT NULL, source VARCHAR(20) NOT NULL,
          customer_name VARCHAR(120), customer_email VARCHAR(160), customer_phone VARCHAR(40), customer_address VARCHAR(300),
          customer_city VARCHAR(80), customer_postcode VARCHAR(20), customer_country VARCHAR(60),
          notes TEXT, internal_note TEXT, items MEDIUMTEXT NOT NULL, history MEDIUMTEXT NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL DEFAULT 0, discount DECIMAL(10,2) NOT NULL DEFAULT 0, total DECIMAL(10,2) NOT NULL DEFAULT 0,
          KEY status_idx (status), KEY created_idx (created_at)
        ) $tail",
        "CREATE TABLE IF NOT EXISTS {$prefix}settings (k VARCHAR(64) NOT NULL PRIMARY KEY, v TEXT) $tail",
        "CREATE TABLE IF NOT EXISTS {$prefix}sessions (token_hash CHAR(64) NOT NULL PRIMARY KEY, expires_at INT UNSIGNED NOT NULL) $tail",
        "CREATE TABLE IF NOT EXISTS {$prefix}attempts (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, kind VARCHAR(20) NOT NULL,
          ip VARCHAR(45) NOT NULL, at INT UNSIGNED NOT NULL, KEY lookup_idx (kind, ip, at)) $tail",
        products_schema('mysql', $prefix),
        categories_schema('mysql', $prefix),
        stock_schema('mysql', $prefix),
        testimonials_schema('mysql', $prefix),
    ];
}

function stock_schema(string $driver, string $prefix): string
{
    if ($driver === 'sqlite') {
        return "CREATE TABLE IF NOT EXISTS {$prefix}stock_moves (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT NOT NULL, delta INTEGER NOT NULL,
          stock_after INTEGER NULL, reason TEXT NOT NULL, note TEXT, order_number TEXT, at TEXT NOT NULL, by_who TEXT NOT NULL)";
    }
    return "CREATE TABLE IF NOT EXISTS {$prefix}stock_moves (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, product_id VARCHAR(64) NOT NULL,
      delta INT NOT NULL, stock_after INT NULL, reason VARCHAR(40) NOT NULL, note VARCHAR(200) NULL, order_number VARCHAR(20) NULL,
      at VARCHAR(32) NOT NULL, by_who VARCHAR(20) NOT NULL, KEY product_idx (product_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
}

function testimonials_schema(string $driver, string $prefix): string
{
    if ($driver === 'sqlite') {
        return "CREATE TABLE IF NOT EXISTS {$prefix}testimonials (id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT NOT NULL, location TEXT, body TEXT NOT NULL,
          rating INTEGER NULL, source TEXT NOT NULL, received_at TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1, position INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL, image TEXT NULL)";
    }
    return "CREATE TABLE IF NOT EXISTS {$prefix}testimonials (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, author VARCHAR(80) NOT NULL,
      location VARCHAR(80) NULL, body TEXT NOT NULL, rating TINYINT UNSIGNED NULL, source VARCHAR(20) NOT NULL, received_at VARCHAR(10) NOT NULL,
      published TINYINT(1) NOT NULL DEFAULT 1, position INT NOT NULL DEFAULT 0, created_at VARCHAR(32) NOT NULL, updated_at VARCHAR(32) NOT NULL,
      image VARCHAR(100) NULL, KEY pub_idx (published, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
}

function categories_schema(string $driver, string $prefix): string
{
    if ($driver === 'sqlite') {
        return "CREATE TABLE IF NOT EXISTS {$prefix}categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)";
    }
    return "CREATE TABLE IF NOT EXISTS {$prefix}categories (id VARCHAR(40) NOT NULL PRIMARY KEY, name VARCHAR(60) NOT NULL,
      position INT NOT NULL DEFAULT 0, active TINYINT(1) NOT NULL DEFAULT 1, KEY pos_idx (position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
}

function products_schema(string $driver, string $prefix): string
{
    if ($driver === 'sqlite') {
        return "CREATE TABLE IF NOT EXISTS {$prefix}products (id TEXT PRIMARY KEY, position INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL, sub TEXT,
          cat TEXT NOT NULL, price REAL NOT NULL, promo INTEGER NOT NULL DEFAULT 0, reviews INTEGER NOT NULL DEFAULT 0, best INTEGER NOT NULL DEFAULT 0,
          fresh INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, description TEXT, image TEXT, updated_at TEXT,
          stock INTEGER NULL, low_stock INTEGER NOT NULL DEFAULT 5, image_security TEXT NULL, image_package TEXT NULL, security_text TEXT NULL, verify_url TEXT NULL)";
    }
    return "CREATE TABLE IF NOT EXISTS {$prefix}products (
      id VARCHAR(64) NOT NULL PRIMARY KEY, position INT NOT NULL DEFAULT 0, name VARCHAR(120) NOT NULL, sub VARCHAR(160) NULL,
      cat VARCHAR(40) NOT NULL, price DECIMAL(10,2) NOT NULL, promo TINYINT UNSIGNED NOT NULL DEFAULT 0, reviews INT UNSIGNED NOT NULL DEFAULT 0,
      best TINYINT(1) NOT NULL DEFAULT 0, fresh TINYINT(1) NOT NULL DEFAULT 0, active TINYINT(1) NOT NULL DEFAULT 1,
      description TEXT NULL, image VARCHAR(100) NULL, updated_at VARCHAR(32) NULL,
      stock INT NULL, low_stock INT NOT NULL DEFAULT 5, image_security VARCHAR(100) NULL, image_package VARCHAR(100) NULL,
      security_text TEXT NULL, verify_url VARCHAR(300) NULL, KEY pos_idx (position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
}

// ---------- http helpers ----------
function json_out(int $code, $data): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body_json(): array
{
    $raw = file_get_contents('php://input', false, null, 0, 100001);
    if ($raw === false || $raw === '') return [];
    if (strlen($raw) > 100000) throw new HttpError(413, 'Pedido demasiado grande');
    $d = json_decode($raw, true);
    if (!is_array($d)) throw new HttpError(400, 'JSON inválido');
    return $d;
}

function str_in($v, int $max): string
{
    return is_string($v) ? mb_substr(trim($v), 0, $max) : '';
}

function now_iso(): string { return gmdate('Y-m-d\TH:i:s.v\Z'); }

function uuid4(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function client_ip(): string { return substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45); }

// ---------- catalog ----------
// products.js holds categories, FAQ and the initial product list. Products live in the database once
// installed (editable in the backoffice); the table is created and seeded on first use.
function static_catalog(): array
{
    static $data = null;
    if ($data !== null) return $data;
    $src = file_get_contents(WEB_ROOT . '/products.js');
    if (!preg_match('~/\*CATALOG\*/(.*)/\*END\*/~s', (string) $src, $m)) throw new HttpError(500, 'Catálogo inválido');
    $data = json_decode($m[1], true);
    if (!is_array($data) || !isset($data['PRODUCTS'], $data['CATEGORIES'])) throw new HttpError(500, 'Catálogo inválido (JSON)');
    return $data;
}
function ensure_categories(): void
{
    static $ok = false;
    if ($ok) return;
    $pdo = db();
    $pdo->exec(categories_schema($pdo->getAttribute(PDO::ATTR_DRIVER_NAME), config()['prefix'] ?? ''));
    if ((int) $pdo->query('SELECT COUNT(*) FROM ' . t('categories'))->fetchColumn() === 0) {
        $ins = $pdo->prepare('INSERT INTO ' . t('categories') . ' (id, name, position, active) VALUES (?, ?, ?, 1)');
        $pdo->beginTransaction();
        foreach (static_catalog()['CATEGORIES'] as $i => $c) $ins->execute([$c['id'], $c['name'], ($i + 1) * 10]);
        $pdo->commit();
    }
    $ok = true;
}

function categories_list(bool $includeInactive = false): array
{
    ensure_categories();
    ensure_products();
    $sql = 'SELECT c.*, (SELECT COUNT(*) FROM ' . t('products') . ' p WHERE p.cat = c.id) AS products
            FROM ' . t('categories') . ' c' . ($includeInactive ? '' : ' WHERE c.active = 1') . ' ORDER BY c.position, c.name';
    return array_map(fn ($r) => ['id' => $r['id'], 'name' => $r['name'], 'position' => (int) $r['position'],
        'active' => (bool) $r['active'], 'products' => (int) $r['products']], db()->query($sql)->fetchAll());
}
function category_ids(): array { return array_column(categories_list(true), 'id'); }

function find_category(string $id): array
{
    ensure_categories();
    $st = db()->prepare('SELECT * FROM ' . t('categories') . ' WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    if (!$r) throw new HttpError(404, 'Categoria não encontrada');
    return $r;
}
function category_by_id(string $id): array
{
    foreach (categories_list(true) as $c) if ($c['id'] === $id) return $c;
    throw new HttpError(404, 'Categoria não encontrada');
}

function category_create(array $in): array
{
    ensure_categories();
    $name = str_in($in['name'] ?? '', 60);
    if ($name === '') throw new HttpError(400, 'O nome da categoria é obrigatório');
    $base = substr(slugify($name), 0, 36); $id = $base; $n = 2;
    $exists = db()->prepare('SELECT 1 FROM ' . t('categories') . ' WHERE id = ?');
    while (true) { $exists->execute([$id]); if (!$exists->fetchColumn()) break; $id = $base . '-' . $n++; }
    $pos = (int) db()->query('SELECT COALESCE(MAX(position), 0) + 10 FROM ' . t('categories'))->fetchColumn();
    db()->prepare('INSERT INTO ' . t('categories') . ' (id, name, position, active) VALUES (?, ?, ?, ?)')
        ->execute([$id, $name, $pos, array_key_exists('active', $in) && empty($in['active']) ? 0 : 1]);
    return category_by_id($id);
}

function category_update(string $id, array $in): array
{
    find_category($id);
    $f = [];
    if (array_key_exists('name', $in)) { $f['name'] = str_in($in['name'], 60); if ($f['name'] === '') throw new HttpError(400, 'O nome da categoria é obrigatório'); }
    if (array_key_exists('active', $in)) $f['active'] = empty($in['active']) ? 0 : 1;
    if (array_key_exists('position', $in) && is_numeric($in['position'])) $f['position'] = (int) $in['position'];
    if ($f) {
        $set = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($f)));
        db()->prepare('UPDATE ' . t('categories') . " SET $set WHERE id = ?")->execute([...array_values($f), $id]);
    }
    return category_by_id($id);
}

// Moves a category one step up/down by swapping positions with its neighbour.
function category_move(string $id, int $dir): array
{
    $list = categories_list(true);
    $i = array_search($id, array_column($list, 'id'), true);
    if ($i === false) throw new HttpError(404, 'Categoria não encontrada');
    $j = $i + ($dir < 0 ? -1 : 1);
    if (isset($list[$j])) {
        $pdo = db(); $pdo->beginTransaction();
        // renumber everything so positions are unique, then swap the pair
        foreach ($list as $k => $c) $list[$k]['position'] = ($k + 1) * 10;
        [$list[$i]['position'], $list[$j]['position']] = [$list[$j]['position'], $list[$i]['position']];
        $st = $pdo->prepare('UPDATE ' . t('categories') . ' SET position = ? WHERE id = ?');
        foreach ($list as $c) $st->execute([$c['position'], $c['id']]);
        $pdo->commit();
    }
    return categories_list(true);
}

function category_delete(string $id, ?string $moveTo): void
{
    $c = category_by_id($id);
    if ($c['products'] > 0) {
        if (!$moveTo) throw new HttpError(409, "Esta categoria tem {$c['products']} produto(s). Escolha para onde os mover.");
        if ($moveTo === $id) throw new HttpError(400, 'Escolha uma categoria diferente');
        find_category($moveTo);
    }
    $pdo = db(); $pdo->beginTransaction();
    if ($c['products'] > 0) $pdo->prepare('UPDATE ' . t('products') . ' SET cat = ?, updated_at = ? WHERE cat = ?')->execute([$moveTo, now_iso(), $id]);
    $pdo->prepare('DELETE FROM ' . t('categories') . ' WHERE id = ?')->execute([$id]);
    $pdo->commit();
}

function ensure_products(): void
{
    static $ok = false;
    if ($ok) return;
    $pdo = db();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $pdo->exec(products_schema($driver, config()['prefix'] ?? ''));
    $pdo->exec(stock_schema($driver, config()['prefix'] ?? ''));
    // upgrade older installs: add the stock columns when missing
    foreach (['stock' => 'INT NULL', 'low_stock' => 'INT NOT NULL DEFAULT 5', 'image_security' => 'VARCHAR(100) NULL',
              'image_package' => 'VARCHAR(100) NULL', 'security_text' => 'TEXT NULL', 'verify_url' => 'VARCHAR(300) NULL'] as $col => $def) {
        try { $pdo->query("SELECT $col FROM " . t('products') . ' LIMIT 1'); }
        catch (PDOException $e) { $pdo->exec('ALTER TABLE ' . t('products') . " ADD COLUMN $col $def"); }
    }
    if ((int) $pdo->query('SELECT COUNT(*) FROM ' . t('products'))->fetchColumn() === 0) {
        $ins = $pdo->prepare('INSERT INTO ' . t('products') . ' (id, position, name, sub, cat, price, promo, reviews, best, fresh, active, description, image, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,1,?,NULL,?)');
        $pdo->beginTransaction();
        foreach (static_catalog()['PRODUCTS'] as $i => $p) {
            $ins->execute([$p['id'], ($i + 1) * 10, $p['name'], $p['sub'] ?? '', $p['cat'], $p['price'], (int) ($p['promo'] ?? 0), (int) ($p['reviews'] ?? 0),
                empty($p['best']) ? 0 : 1, empty($p['fresh']) ? 0 : 1, $p['description'] ?? '', now_iso()]);
        }
        $pdo->commit();
    }
    $ok = true;
}

function row_to_product(array $r): array
{
    return [
        'id' => $r['id'], 'position' => (int) $r['position'], 'name' => $r['name'], 'sub' => (string) $r['sub'], 'cat' => $r['cat'],
        'price' => (float) $r['price'], 'promo' => (int) $r['promo'], 'reviews' => (int) $r['reviews'],
        'best' => (bool) $r['best'], 'fresh' => (bool) $r['fresh'], 'active' => (bool) $r['active'],
        'description' => (string) $r['description'], 'imageUrl' => $r['image'] ? 'uploads/products/' . $r['image'] : null,
        'updatedAt' => $r['updated_at'],
        'securityImageUrl' => !empty($r['image_security']) ? 'uploads/products/' . $r['image_security'] : null,
        'packageImageUrl' => !empty($r['image_package']) ? 'uploads/products/' . $r['image_package'] : null,
        'securityText' => (string) ($r['security_text'] ?? ''), 'verifyUrl' => (string) ($r['verify_url'] ?? ''),
        'trackStock' => $r['stock'] !== null, 'stock' => $r['stock'] === null ? null : (int) $r['stock'], 'lowStock' => (int) $r['low_stock'],
    ];
}

// ---------- stock ----------
// stock NULL = not tracked (unlimited). Every change is logged in stock_moves.
function stock_log(string $productId, int $delta, ?int $after, string $reason, ?string $order, string $by, string $note = ''): void
{
    db()->prepare('INSERT INTO ' . t('stock_moves') . ' (product_id, delta, stock_after, reason, note, order_number, at, by_who) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$productId, $delta, $after, $reason, mb_substr($note, 0, 200), $order, now_iso(), $by]);
}

// Applies a stock change inside the caller's transaction. Refuses to go below zero.
function stock_apply(string $productId, int $delta, string $reason, ?string $order, string $by, string $note = ''): void
{
    if ($delta === 0) return;
    $pdo = db();
    $st = $pdo->prepare('SELECT name, stock FROM ' . t('products') . ' WHERE id = ?');
    $st->execute([$productId]);
    $p = $st->fetch();
    if (!$p || $p['stock'] === null) return; // untracked product
    $up = $pdo->prepare('UPDATE ' . t('products') . ' SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL AND stock + ? >= 0');
    $up->execute([$delta, $productId, $delta]);
    if ($up->rowCount() === 0) {
        $st->execute([$productId]);
        $avail = (int) $st->fetch()['stock'];
        throw new HttpError(409, "Stock insuficiente: {$p['name']} (disponíveis: $avail)");
    }
    $st->execute([$productId]);
    stock_log($productId, $delta, (int) $st->fetch()['stock'], $reason, $order, $by, $note);
}

function stock_adjust(string $id, array $in): array
{
    $r = find_product($id);
    if ($r['stock'] === null) throw new HttpError(400, 'Ative primeiro o controlo de stock deste produto');
    $mode = $in['mode'] ?? '';
    $qty = $in['qty'] ?? null;
    if (!is_numeric($qty) || (int) $qty < 0 || (int) $qty > 1000000 || (int) $qty != $qty) throw new HttpError(400, 'Quantidade inválida');
    $qty = (int) $qty;
    $note = str_in($in['note'] ?? '', 200);
    $cur = (int) $r['stock'];
    [$delta, $reason] = match ($mode) {
        'in' => [$qty, 'entrada'],
        'out' => [-$qty, 'saída'],
        'set' => [$qty - $cur, 'acerto'],
        default => throw new HttpError(400, 'Tipo de movimento inválido'),
    };
    if ($mode !== 'set' && $qty === 0) throw new HttpError(400, 'Indique uma quantidade maior que zero');
    if ($delta !== 0) {
        $pdo = db(); $pdo->beginTransaction();
        try { stock_apply($id, $delta, $reason, null, 'admin', $note); $pdo->commit(); }
        catch (Throwable $e) { $pdo->rollBack(); throw $e; }
    }
    return row_to_product(find_product($id));
}

function stock_history(string $id): array
{
    find_product($id);
    $st = db()->prepare('SELECT delta, stock_after, reason, note, order_number, at, by_who FROM ' . t('stock_moves') . ' WHERE product_id = ? ORDER BY id DESC LIMIT 100');
    $st->execute([$id]);
    return array_map(fn ($m) => ['delta' => (int) $m['delta'], 'after' => $m['stock_after'] === null ? null : (int) $m['stock_after'],
        'reason' => $m['reason'], 'note' => (string) $m['note'], 'order' => $m['order_number'], 'at' => $m['at'], 'by' => $m['by_who']], $st->fetchAll());
}

// Turns stock tracking on/off and sets the low-stock threshold (used by create/update).
function stock_settings(string $id, array $in, bool $creating): void
{
    if (array_key_exists('lowStock', $in)) {
        $v = $in['lowStock'];
        if (!is_numeric($v) || (int) $v < 0 || (int) $v > 100000) throw new HttpError(400, 'Alerta de stock inválido');
        db()->prepare('UPDATE ' . t('products') . ' SET low_stock = ? WHERE id = ?')->execute([(int) $v, $id]);
    }
    if (!array_key_exists('trackStock', $in)) return;
    $r = find_product($id);
    $on = !empty($in['trackStock']);
    if ($on && $r['stock'] === null) {
        $init = $in['initialStock'] ?? 0;
        if ($init === '' || $init === null) $init = 0;
        if (!is_numeric($init) || (int) $init < 0 || (int) $init > 1000000) throw new HttpError(400, 'Stock inicial inválido');
        db()->prepare('UPDATE ' . t('products') . ' SET stock = ? WHERE id = ?')->execute([(int) $init, $id]);
        stock_log($id, (int) $init, (int) $init, 'stock inicial', null, 'admin', $creating ? 'Produto criado' : 'Controlo de stock ativado');
    } elseif (!$on && $r['stock'] !== null) {
        db()->prepare('UPDATE ' . t('products') . ' SET stock = NULL WHERE id = ?')->execute([$id]);
        stock_log($id, 0, null, 'controlo desativado', null, 'admin', 'Stock deixou de ser controlado');
    }
}

// Returns (+1) or takes (−1) the units of an order, inside the caller's transaction.
function stock_for_order(array $o, int $sign, string $reason, string $by): void
{
    foreach ($o['items'] as $it) stock_apply($it['id'], $sign * (int) $it['qty'], $reason, $o['number'] ?? null, $by);
}

function products_list(bool $includeInactive = false): array
{
    ensure_products();
    if ($includeInactive) {
        $sql = 'SELECT * FROM ' . t('products') . ' ORDER BY position, name';
    } else { // visible = active product in an active category
        ensure_categories();
        $sql = 'SELECT p.* FROM ' . t('products') . ' p JOIN ' . t('categories') . ' c ON c.id = p.cat AND c.active = 1
                WHERE p.active = 1 ORDER BY p.position, p.name';
    }
    return array_map('row_to_product', db()->query($sql)->fetchAll());
}

// Active products by id — used to price orders. Prices are never taken from the browser.
function catalog(): array
{
    static $byId = null;
    if ($byId === null) { $byId = []; foreach (products_list() as $p) $byId[$p['id']] = $p; }
    return $byId;
}

function find_product(string $id): array
{
    ensure_products();
    $st = db()->prepare('SELECT * FROM ' . t('products') . ' WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    if (!$r) throw new HttpError(404, 'Produto não encontrado');
    return $r;
}

function product_fields(array $in, bool $creating): array
{
    $f = [];
    if ($creating || array_key_exists('name', $in)) { $f['name'] = str_in($in['name'] ?? '', 120); if ($f['name'] === '') throw new HttpError(400, 'O nome do produto é obrigatório'); }
    if ($creating || array_key_exists('sub', $in)) $f['sub'] = str_in($in['sub'] ?? '', 160);
    if ($creating || array_key_exists('cat', $in)) {
        $f['cat'] = (string) ($in['cat'] ?? '');
        if (!in_array($f['cat'], category_ids(), true)) throw new HttpError(400, 'Categoria inválida');
    }
    if ($creating || array_key_exists('price', $in)) {
        $p = $in['price'] ?? null;
        if (is_string($p)) $p = str_replace(',', '.', trim($p));
        if (!is_numeric($p) || (float) $p < 0 || (float) $p > 100000) throw new HttpError(400, 'Preço inválido');
        $f['price'] = round((float) $p, 2);
    }
    if ($creating || array_key_exists('promo', $in)) {
        $v = $in['promo'] ?? 0;
        if ($v === '' || $v === null) $v = 0;
        if (!is_numeric($v) || (int) $v < 0 || (int) $v > 90) throw new HttpError(400, 'Promoção inválida (0 a 90%)');
        $f['promo'] = (int) $v;
    }
    if ($creating || array_key_exists('reviews', $in)) {
        $v = $in['reviews'] ?? 0;
        if ($v === '' || $v === null) $v = 0;
        if (!is_numeric($v) || (int) $v < 0) throw new HttpError(400, 'Número de avaliações inválido');
        $f['reviews'] = (int) $v;
    }
    foreach (['best', 'fresh', 'active'] as $k) if ($creating || array_key_exists($k, $in)) $f[$k] = empty($in[$k]) ? 0 : 1;
    if ($creating && !array_key_exists('active', $in)) $f['active'] = 1;
    if ($creating || array_key_exists('description', $in)) $f['description'] = str_in($in['description'] ?? '', 10000);
    if (array_key_exists('position', $in) && is_numeric($in['position'])) $f['position'] = (int) $in['position'];
    if ($creating || array_key_exists('securityText', $in)) $f['security_text'] = str_in($in['securityText'] ?? '', 2000);
    if ($creating || array_key_exists('verifyUrl', $in)) {
        $u = str_in($in['verifyUrl'] ?? '', 300);
        if ($u !== '' && (!filter_var($u, FILTER_VALIDATE_URL) || !preg_match('~^https?://~i', $u))) throw new HttpError(400, 'Link de verificação inválido (deve começar por https://)');
        $f['verify_url'] = $u;
    }
    return $f;
}

function slugify(string $s): string
{
    $s = strtolower(trim((string) preg_replace('~[^a-zA-Z0-9]+~', '-', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s), '-'));
    return substr($s !== '' ? $s : 'produto', 0, 50);
}

function product_create(array $in): array
{
    ensure_products();
    $f = product_fields($in, true);
    $base = slugify($f['name']); $id = $base; $n = 2;
    $exists = db()->prepare('SELECT 1 FROM ' . t('products') . ' WHERE id = ?');
    while (true) { $exists->execute([$id]); if (!$exists->fetchColumn()) break; $id = $base . '-' . $n++; }
    if (!isset($f['position'])) $f['position'] = (int) db()->query('SELECT COALESCE(MAX(position), 0) + 10 FROM ' . t('products'))->fetchColumn();
    $f['id'] = $id; $f['updated_at'] = now_iso();
    $cols = array_keys($f);
    db()->prepare('INSERT INTO ' . t('products') . ' (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')->execute(array_values($f));
    stock_settings($id, $in, true);
    return row_to_product(find_product($id));
}

function product_update(string $id, array $in): array
{
    find_product($id);
    $f = product_fields($in, false);
    stock_settings($id, $in, false);
    if (!$f) return row_to_product(find_product($id));
    $f['updated_at'] = now_iso();
    $set = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($f)));
    db()->prepare('UPDATE ' . t('products') . " SET $set WHERE id = ?")->execute([...array_values($f), $id]);
    return row_to_product(find_product($id));
}

function product_delete(string $id): void
{
    $r = find_product($id);
    foreach (PRODUCT_IMAGE_KINDS as $k) product_image_unlink($r[$k['col']] ?? null);
    db()->prepare('DELETE FROM ' . t('products') . ' WHERE id = ?')->execute([$id]);
}

function product_dir(): string
{
    $d = WEB_ROOT . '/uploads/products';
    if (!is_dir($d) && !mkdir($d, 0755, true)) throw new HttpError(500, 'Não foi possível criar a pasta uploads/products');
    return $d;
}
// Product pictures: main photo, security/protection code photo and package-size diagram.
const PRODUCT_IMAGE_KINDS = ['main' => ['col' => 'image', 'prefix' => 'p'], 'security' => ['col' => 'image_security', 'prefix' => 'ps'],
    'package' => ['col' => 'image_package', 'prefix' => 'pp']];
function product_image_unlink(?string $name): void
{
    if ($name && preg_match('/^p[sp]?-[a-f0-9]{16}\.(png|jpg|webp|gif)$/', $name)) @unlink(product_dir() . '/' . $name);
}
function product_image_upload(string $id, ?array $file, string $kind = 'main'): array
{
    $k = PRODUCT_IMAGE_KINDS[$kind] ?? throw new HttpError(400, 'Tipo de imagem inválido');
    $r = find_product($id);
    $ext = validate_upload($file, 3 * 1024 * 1024);
    if ($ext === 'ico') throw new HttpError(400, 'Use PNG, JPG, WebP ou GIF para imagens de produto.');
    $name = $k['prefix'] . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], product_dir() . '/' . $name)) throw new HttpError(500, 'Não foi possível guardar o ficheiro');
    @chmod(product_dir() . '/' . $name, 0644);
    product_image_unlink($r[$k['col']] ?? null);
    db()->prepare('UPDATE ' . t('products') . " SET {$k['col']} = ?, updated_at = ? WHERE id = ?")->execute([$name, now_iso(), $id]);
    return row_to_product(find_product($id));
}
function product_image_remove(string $id, string $kind = 'main'): array
{
    $k = PRODUCT_IMAGE_KINDS[$kind] ?? throw new HttpError(400, 'Tipo de imagem inválido');
    $r = find_product($id);
    product_image_unlink($r[$k['col']] ?? null);
    db()->prepare('UPDATE ' . t('products') . " SET {$k['col']} = NULL, updated_at = ? WHERE id = ?")->execute([now_iso(), $id]);
    return row_to_product(find_product($id));
}

function unit_price(array $p): float { return round(!empty($p['promo']) ? $p['price'] * (1 - $p['promo'] / 100) : (float) $p['price'], 2); }
function bulk_rate(int $q): float { return $q >= 10 ? 0.10 : ($q >= 5 ? 0.05 : 0.0); }

// ---------- orders ----------
function build_order(array $b, string $source): array
{
    $c = is_array($b['customer'] ?? null) ? $b['customer'] : [];
    $customer = [
        'name' => str_in($c['name'] ?? '', 120), 'email' => str_in($c['email'] ?? '', 160), 'phone' => str_in($c['phone'] ?? '', 40),
        'address' => str_in($c['address'] ?? '', 300), 'city' => str_in($c['city'] ?? '', 80),
        'postcode' => str_in($c['postcode'] ?? '', 20), 'country' => str_in($c['country'] ?? '', 60),
    ];
    if ($customer['name'] === '') throw new HttpError(400, 'O nome é obrigatório');
    if (!filter_var($customer['email'], FILTER_VALIDATE_EMAIL)) throw new HttpError(400, 'É necessário um email válido');
    $items = $b['items'] ?? null;
    if (!is_array($items) || !$items) throw new HttpError(400, 'A encomenda não tem artigos');
    if (count($items) > 100) throw new HttpError(400, 'Demasiados artigos');

    $cat = catalog();
    $merged = [];
    foreach ($items as $it) {
        $id = is_array($it) ? (string) ($it['id'] ?? '') : '';
        $q = is_array($it) && is_numeric($it['qty'] ?? null) ? (int) floor((float) $it['qty']) : 0;
        if (!isset($cat[$id]) || $q < 1 || $q > 999) throw new HttpError(400, 'Artigo inválido: ' . mb_substr($id, 0, 40));
        $merged[$id] = ($merged[$id] ?? 0) + $q;
    }
    $lines = [];
    $subtotal = 0.0; $discount = 0.0;
    foreach ($merged as $id => $qty) {
        $p = $cat[$id];
        $unit = unit_price($p);
        $gross = $unit * $qty;
        $disc = round($gross * bulk_rate($qty), 2);
        $lines[] = ['id' => $id, 'name' => $p['name'], 'sub' => $p['sub'], 'qty' => $qty, 'unit' => $unit, 'discount' => $disc, 'total' => round($gross - $disc, 2)];
        $subtotal += $gross; $discount += $disc;
    }
    $now = now_iso();
    return [
        'id' => uuid4(), 'createdAt' => $now, 'updatedAt' => $now, 'status' => 'pending', 'source' => $source,
        'customer' => $customer, 'notes' => str_in($b['notes'] ?? '', 1000), 'internalNote' => '', 'items' => $lines,
        'subtotal' => round($subtotal, 2), 'discount' => round($discount, 2), 'total' => round($subtotal - $discount, 2),
        'history' => [['at' => $now, 'status' => 'pending', 'by' => $source]],
    ];
}

function insert_order(array $o): array
{
    $pdo = db();
    $pdo->beginTransaction();
    $st = $pdo->prepare('INSERT INTO ' . t('orders') . ' (id, created_at, updated_at, status, source, customer_name, customer_email, customer_phone,
        customer_address, customer_city, customer_postcode, customer_country, notes, internal_note, items, history, subtotal, discount, total)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $c = $o['customer'];
    $st->execute([$o['id'], $o['createdAt'], $o['updatedAt'], $o['status'], $o['source'], $c['name'], $c['email'], $c['phone'],
        $c['address'], $c['city'], $c['postcode'], $c['country'], $o['notes'], $o['internalNote'],
        json_encode($o['items'], JSON_UNESCAPED_UNICODE), json_encode($o['history'], JSON_UNESCAPED_UNICODE), $o['subtotal'], $o['discount'], $o['total']]);
    $seq = (int) $pdo->lastInsertId();
    $o['number'] = 'FL-' . (1000 + $seq);
    $pdo->prepare('UPDATE ' . t('orders') . ' SET number = ? WHERE seq = ?')->execute([$o['number'], $seq]);
    try { stock_for_order($o, -1, 'encomenda', $o['source']); }
    catch (Throwable $e) { $pdo->rollBack(); throw $e; }
    $pdo->commit();
    return $o;
}

// Status/note update. Cancelling returns the units to stock; un-cancelling takes them again.
function order_update(string $id, array $b): array
{
    ensure_products(); // runs schema upgrades outside the transaction
    $o = row_to_order(find_order($id));
    $now = now_iso();
    $pdo = db(); $pdo->beginTransaction();
    try {
        if (array_key_exists('status', $b)) {
            if (!in_array($b['status'], STATUSES, true)) throw new HttpError(400, 'Estado inválido');
            if ($b['status'] !== $o['status']) {
                if ($b['status'] === 'cancelled') stock_for_order($o, +1, 'cancelamento', 'admin');
                elseif ($o['status'] === 'cancelled') stock_for_order($o, -1, 'reativação', 'admin');
                $o['status'] = $b['status'];
                $o['history'][] = ['at' => $now, 'status' => $b['status'], 'by' => 'admin'];
            }
        }
        if (array_key_exists('internalNote', $b)) $o['internalNote'] = str_in($b['internalNote'], 2000);
        $o['updatedAt'] = $now;
        $pdo->prepare('UPDATE ' . t('orders') . ' SET status = ?, internal_note = ?, history = ?, updated_at = ? WHERE id = ?')
            ->execute([$o['status'], $o['internalNote'], json_encode($o['history'], JSON_UNESCAPED_UNICODE), $now, $o['id']]);
        $pdo->commit();
    } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
    return $o;
}

// Deleting an order that was not cancelled returns its units to stock.
function order_delete(string $id): void
{
    ensure_products();
    $o = row_to_order(find_order($id));
    $pdo = db(); $pdo->beginTransaction();
    try {
        if ($o['status'] !== 'cancelled') stock_for_order($o, +1, 'encomenda eliminada', 'admin');
        $pdo->prepare('DELETE FROM ' . t('orders') . ' WHERE id = ?')->execute([$id]);
        $pdo->commit();
    } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
}

function row_to_order(array $r): array
{
    return [
        'id' => $r['id'], 'number' => $r['number'], 'createdAt' => $r['created_at'], 'updatedAt' => $r['updated_at'],
        'status' => $r['status'], 'source' => $r['source'],
        'customer' => ['name' => $r['customer_name'], 'email' => $r['customer_email'], 'phone' => $r['customer_phone'],
            'address' => $r['customer_address'], 'city' => $r['customer_city'], 'postcode' => $r['customer_postcode'], 'country' => $r['customer_country']],
        'notes' => $r['notes'] ?? '', 'internalNote' => $r['internal_note'] ?? '',
        'items' => json_decode($r['items'], true) ?: [], 'history' => json_decode($r['history'], true) ?: [],
        'subtotal' => (float) $r['subtotal'], 'discount' => (float) $r['discount'], 'total' => (float) $r['total'],
    ];
}

function find_order(string $id): array
{
    $st = db()->prepare('SELECT * FROM ' . t('orders') . ' WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    if (!$r) throw new HttpError(404, 'Encomenda não encontrada');
    return $r;
}

// ---------- settings ----------
function setting_all(): array
{
    $out = [];
    foreach (db()->query('SELECT k, v FROM ' . t('settings')) as $r) $out[$r['k']] = $r['v'];
    return $out;
}
function setting_set(array $kv): void
{
    $pdo = db();
    $del = $pdo->prepare('DELETE FROM ' . t('settings') . ' WHERE k = ?');
    $ins = $pdo->prepare('INSERT INTO ' . t('settings') . ' (k, v) VALUES (?, ?)');
    $pdo->beginTransaction();
    foreach ($kv as $k => $v) { $del->execute([$k]); if ($v !== null) $ins->execute([$k, (string) $v]); }
    $pdo->commit();
}
function brand(): array
{
    $s = setting_all();
    $b = [];
    foreach (DEFAULT_SETTINGS as $k => $def) $b[$k] = array_key_exists($k, $s) ? $s[$k] : $def;
    return $b;
}
function brand_public(): array
{
    $b = brand();
    return [
        'storeName' => $b['storeName'], 'logoText' => $b['logoText'], 'logoSub' => $b['logoSub'],
        'primaryColor' => $b['primaryColor'], 'supportEmail' => $b['supportEmail'],
        'logoUrl' => $b['logo'] ? 'uploads/brand/' . $b['logo'] : null,
        'faviconUrl' => $b['favicon'] ? 'uploads/brand/' . $b['favicon'] : null,
        'updatedAt' => $b['updatedAt'],
    ];
}
function brand_update(array $in): void
{
    $kv = [];
    if (array_key_exists('storeName', $in)) {
        $kv['storeName'] = str_in($in['storeName'], 60);
        if ($kv['storeName'] === '') throw new HttpError(400, 'O nome da loja é obrigatório');
    }
    if (array_key_exists('logoText', $in)) $kv['logoText'] = str_in($in['logoText'], 20);
    if (array_key_exists('logoSub', $in)) $kv['logoSub'] = str_in($in['logoSub'], 24);
    if (array_key_exists('primaryColor', $in)) {
        if (!is_string($in['primaryColor']) || !preg_match('/^#[0-9a-f]{6}$/i', $in['primaryColor'])) throw new HttpError(400, 'Cor inválida (use o formato #rrggbb)');
        $kv['primaryColor'] = strtolower($in['primaryColor']);
    }
    if (array_key_exists('supportEmail', $in)) {
        $kv['supportEmail'] = str_in($in['supportEmail'], 160);
        if ($kv['supportEmail'] !== '' && !filter_var($kv['supportEmail'], FILTER_VALIDATE_EMAIL)) throw new HttpError(400, 'Email de apoio inválido');
    }
    $kv['updatedAt'] = now_iso();
    setting_set($kv);
}

// ---------- brand stylesheet ----------
// Served as a render-blocking <link> so the page is painted with the brand colour from the first frame
// (no flash of the default orange while JavaScript loads the settings).
function shade_hex(string $hex, float $amt): string
{
    $out = '#';
    foreach (str_split(substr($hex, 1), 2) as $h) {
        $v = hexdec($h);
        $v = $amt > 0 ? $v + (255 - $v) * $amt : $v + $v * $amt;
        $out .= str_pad(dechex((int) max(0, min(255, round($v)))), 2, '0', STR_PAD_LEFT);
    }
    return $out;
}
function brand_css(): never
{
    $css = '';
    try {
        if (config()) {
            $c = (string) brand()['primaryColor'];
            if (preg_match('/^#[0-9a-f]{6}$/i', $c)) {
                $c = strtolower($c);
                $css = ":root{--orange:$c;--orange-2:" . shade_hex($c, 0.18) . ';--orange-dark:' . shade_hex($c, -0.08) . ";}\n";
            }
        }
    } catch (Throwable $e) { /* not installed / DB down: fall back to the defaults in styles.css */ }
    $etag = '"' . md5($css) . '"';
    header('Content-Type: text/css; charset=utf-8');
    header('Cache-Control: no-cache'); // always revalidate (cheap 304) so a new colour shows on the next load
    header('ETag: ' . $etag);
    header('X-Content-Type-Options: nosniff');
    if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); exit; }
    echo "/* Cor da marca — definida no backoffice (Marca) */\n" . $css;
    exit;
}

// Raster images only, identified by magic bytes (the declared type is not trusted). SVG is refused: it can carry scripts.
function sniff_image(string $head): ?string
{
    if (strncmp($head, "\x89PNG", 4) === 0) return 'png';
    if (strncmp($head, "\xFF\xD8\xFF", 3) === 0) return 'jpg';
    if (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') return 'webp';
    if (substr($head, 0, 4) === 'GIF8') return 'gif';
    if (strncmp($head, "\x00\x00\x01\x00", 4) === 0) return 'ico';
    return null;
}
function brand_dir(): string
{
    $d = WEB_ROOT . '/uploads/brand';
    if (!is_dir($d) && !mkdir($d, 0755, true)) throw new HttpError(500, 'Não foi possível criar a pasta uploads/brand');
    return $d;
}
// Validates an uploaded image and returns its real extension (by magic bytes).
function validate_upload(?array $file, int $max): string
{
    if (!$file || !isset($file['error'])) throw new HttpError(400, 'Nenhum ficheiro enviado');
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) throw new HttpError(413, 'Ficheiro demasiado grande para o servidor');
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) throw new HttpError(400, 'Falha no envio do ficheiro');
    if ($file['size'] > $max) throw new HttpError(413, 'Ficheiro demasiado grande (máx. ' . ($max >= 1048576 ? ($max / 1048576) . ' MB' : ($max / 1024) . ' KB') . ')');
    $ext = sniff_image((string) file_get_contents($file['tmp_name'], false, null, 0, 12));
    if (!$ext) throw new HttpError(400, 'Formato não suportado. Use PNG, JPG, WebP, GIF ou ICO.');
    return $ext;
}
function brand_upload(string $kind, ?array $file): void
{
    $ext = validate_upload($file, BRAND_LIMITS[$kind]);
    $name = $kind . '-' . bin2hex(random_bytes(8)) . '.' . $ext; // new name each time = automatic cache-busting
    if (!move_uploaded_file($file['tmp_name'], brand_dir() . '/' . $name)) throw new HttpError(500, 'Não foi possível guardar o ficheiro');
    @chmod(brand_dir() . '/' . $name, 0644);
    brand_remove($kind, false);
    setting_set([$kind => $name, 'updatedAt' => now_iso()]);
}
function brand_remove(string $kind, bool $save = true): void
{
    $cur = brand()[$kind];
    if ($cur && preg_match('/^(logo|favicon)-[a-f0-9]{16}\.(png|jpg|webp|gif|ico)$/', $cur)) @unlink(brand_dir() . '/' . $cur);
    if ($save) setting_set([$kind => null, 'updatedAt' => now_iso()]);
}

// ---------- auth ----------
function auth_token(): string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strcasecmp($k, 'Authorization') === 0) $h = $v;
    }
    if (preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($h), $m)) return strtolower($m[1]);
    // Some shared hosts strip Authorization; the backoffice also sends this header.
    $x = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    return preg_match('/^[a-f0-9]{64}$/i', $x) ? strtolower($x) : '';
}
function has_token_header(): bool { return isset($_SERVER['HTTP_AUTHORIZATION']) || isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) || isset($_SERVER['HTTP_X_ADMIN_TOKEN']); }
function is_admin(): bool
{
    $tok = auth_token();
    if ($tok === '') return false;
    $st = db()->prepare('SELECT expires_at FROM ' . t('sessions') . ' WHERE token_hash = ?');
    $st->execute([hash('sha256', $tok)]);
    $exp = $st->fetchColumn();
    return $exp !== false && (int) $exp > time();
}
function require_admin(): void { if (!is_admin()) throw new HttpError(401, 'Não autorizado'); }
function create_session(): string
{
    $tok = bin2hex(random_bytes(32));
    db()->prepare('DELETE FROM ' . t('sessions') . ' WHERE expires_at < ?')->execute([time()]);
    db()->prepare('INSERT INTO ' . t('sessions') . ' (token_hash, expires_at) VALUES (?, ?)')->execute([hash('sha256', $tok), time() + SESSION_TTL]);
    return $tok;
}
function destroy_session(): void
{
    $tok = auth_token();
    if ($tok !== '') db()->prepare('DELETE FROM ' . t('sessions') . ' WHERE token_hash = ?')->execute([hash('sha256', $tok)]);
}
// Records an attempt and returns true when the limit for the window is exceeded.
function rate_limited(string $kind, int $limit, int $window): bool
{
    $pdo = db(); $now = time(); $ip = client_ip();
    $pdo->prepare('DELETE FROM ' . t('attempts') . ' WHERE at < ?')->execute([$now - 86400]);
    $pdo->prepare('INSERT INTO ' . t('attempts') . ' (kind, ip, at) VALUES (?, ?, ?)')->execute([$kind, $ip, $now]);
    $st = $pdo->prepare('SELECT COUNT(*) FROM ' . t('attempts') . ' WHERE kind = ? AND ip = ? AND at > ?');
    $st->execute([$kind, $ip, $now - $window]);
    return (int) $st->fetchColumn() > $limit;
}

// ---------- testimonials ----------
// Real feedback the shop received (email, WhatsApp, phone, in person…) entered by the admin.
const TESTIMONIAL_SOURCES = ['email' => 'Email', 'whatsapp' => 'WhatsApp', 'phone' => 'Telefone', 'sms' => 'SMS', 'in_person' => 'Presencial', 'other' => 'Outro'];

function ensure_testimonials(): void
{
    static $ok = false;
    if ($ok) return;
    $pdo = db();
    $pdo->exec(testimonials_schema($pdo->getAttribute(PDO::ATTR_DRIVER_NAME), config()['prefix'] ?? ''));
    $ok = true;
}

function row_to_testimonial(array $r): array
{
    return ['id' => (int) $r['id'], 'author' => $r['author'], 'location' => (string) $r['location'], 'text' => $r['body'],
        'rating' => $r['rating'] === null ? null : (int) $r['rating'], 'source' => $r['source'], 'receivedAt' => $r['received_at'],
        'published' => (bool) $r['published'], 'position' => (int) $r['position'], 'createdAt' => $r['created_at'], 'updatedAt' => $r['updated_at'],
        'imageUrl' => !empty($r['image']) ? 'uploads/testimonials/' . $r['image'] : null];
}

function testimonials_list(bool $all = false): array
{
    ensure_testimonials();
    $sql = 'SELECT * FROM ' . t('testimonials') . ($all ? '' : ' WHERE published = 1') . ' ORDER BY position, received_at DESC, id DESC';
    return array_map('row_to_testimonial', db()->query($sql)->fetchAll());
}

function testimonial_fields(array $in, bool $creating): array
{
    $f = [];
    if ($creating && empty($in['confirmReal'])) throw new HttpError(400, 'Confirme que o testemunho foi recebido de um cliente real');
    if ($creating || array_key_exists('author', $in)) { $f['author'] = str_in($in['author'] ?? '', 80); if ($f['author'] === '') throw new HttpError(400, 'Indique o nome ou as iniciais do cliente'); }
    if ($creating || array_key_exists('location', $in)) $f['location'] = str_in($in['location'] ?? '', 80);
    if ($creating || array_key_exists('text', $in)) {
        $f['body'] = str_in($in['text'] ?? '', 600);
        if (mb_strlen($f['body']) < 10) throw new HttpError(400, 'O texto do testemunho é demasiado curto');
    }
    if ($creating || array_key_exists('rating', $in)) {
        $r = $in['rating'] ?? null;
        if ($r === '' || $r === null) $f['rating'] = null;
        elseif (!is_numeric($r) || (int) $r < 1 || (int) $r > 5) throw new HttpError(400, 'Classificação inválida (1 a 5)');
        else $f['rating'] = (int) $r;
    }
    if ($creating || array_key_exists('source', $in)) {
        $f['source'] = (string) ($in['source'] ?? '');
        if (!isset(TESTIMONIAL_SOURCES[$f['source']])) throw new HttpError(400, 'Indique onde recebeu o testemunho');
    }
    if ($creating || array_key_exists('receivedAt', $in)) {
        $d = (string) ($in['receivedAt'] ?? '');
        $dt = DateTime::createFromFormat('!Y-m-d', $d);
        if (!$dt || $dt->format('Y-m-d') !== $d) throw new HttpError(400, 'Data inválida');
        if ($dt > new DateTime('tomorrow')) throw new HttpError(400, 'A data não pode ser no futuro');
        $f['received_at'] = $d;
    }
    if ($creating || array_key_exists('published', $in)) $f['published'] = array_key_exists('published', $in) && empty($in['published']) ? 0 : 1;
    if (array_key_exists('position', $in) && is_numeric($in['position'])) $f['position'] = (int) $in['position'];
    return $f;
}

function find_testimonial(int $id): array
{
    ensure_testimonials();
    $st = db()->prepare('SELECT * FROM ' . t('testimonials') . ' WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    if (!$r) throw new HttpError(404, 'Testemunho não encontrado');
    return $r;
}

function testimonial_create(array $in): array
{
    ensure_testimonials();
    $f = testimonial_fields($in, true);
    $f['created_at'] = $f['updated_at'] = now_iso();
    $cols = array_keys($f);
    db()->prepare('INSERT INTO ' . t('testimonials') . ' (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')->execute(array_values($f));
    return row_to_testimonial(find_testimonial((int) db()->lastInsertId()));
}

function testimonial_update(int $id, array $in): array
{
    find_testimonial($id);
    $f = testimonial_fields($in, false);
    if ($f) {
        $f['updated_at'] = now_iso();
        $set = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($f)));
        db()->prepare('UPDATE ' . t('testimonials') . " SET $set WHERE id = ?")->execute([...array_values($f), $id]);
    }
    return row_to_testimonial(find_testimonial($id));
}

function testimonial_delete(int $id): void
{
    $r = find_testimonial($id);
    testimonial_image_unlink($r['image'] ?? null);
    db()->prepare('DELETE FROM ' . t('testimonials') . ' WHERE id = ?')->execute([$id]);
}

// Optional photo sent by the customer (e.g. of the order they received).
function testimonial_dir(): string
{
    $d = WEB_ROOT . '/uploads/testimonials';
    if (!is_dir($d) && !mkdir($d, 0755, true)) throw new HttpError(500, 'Não foi possível criar a pasta uploads/testimonials');
    return $d;
}
function testimonial_image_unlink(?string $name): void
{
    if ($name && preg_match('/^t-[a-f0-9]{16}\.(png|jpg|webp|gif)$/', $name)) @unlink(testimonial_dir() . '/' . $name);
}
function testimonial_image_upload(int $id, ?array $file): array
{
    $r = find_testimonial($id);
    $ext = validate_upload($file, 4 * 1024 * 1024);
    if ($ext === 'ico') throw new HttpError(400, 'Use PNG, JPG, WebP ou GIF.');
    $name = 't-' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], testimonial_dir() . '/' . $name)) throw new HttpError(500, 'Não foi possível guardar o ficheiro');
    @chmod(testimonial_dir() . '/' . $name, 0644);
    testimonial_image_unlink($r['image'] ?? null);
    db()->prepare('UPDATE ' . t('testimonials') . ' SET image = ?, updated_at = ? WHERE id = ?')->execute([$name, now_iso(), $id]);
    return row_to_testimonial(find_testimonial($id));
}
function testimonial_image_remove(int $id): array
{
    $r = find_testimonial($id);
    testimonial_image_unlink($r['image'] ?? null);
    db()->prepare('UPDATE ' . t('testimonials') . ' SET image = NULL, updated_at = ? WHERE id = ?')->execute([now_iso(), $id]);
    return row_to_testimonial(find_testimonial($id));
}

