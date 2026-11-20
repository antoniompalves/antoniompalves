<?php
declare(strict_types=1);
define('APP_ROOT', dirname(__DIR__));
define('APP_VERSION', '1.4.6');
const WORK_STAGES = ['Lavagem', 'Interior', 'Correção / Proteção', 'Controlo de qualidade'];
require_once __DIR__ . '/schema.php';

function has_config(): bool { return is_file(APP_ROOT . '/config.php'); }
date_default_timezone_set('Europe/Lisbon');

function cfg(string $k, $def = null) {
    static $C = null;
    if ($C === null) { $C = has_config() ? (require APP_ROOT . '/config.php') : []; if (!empty($C['timezone'])) date_default_timezone_set($C['timezone']); }
    return $C[$k] ?? $def;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = db_connect(cfg('db', []));
    return $pdo;
}

function db_connect(array $c): PDO {
    $opt = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
    if (($c['driver'] ?? 'mysql') === 'sqlite') {
        $file = $c['file'] ?? (APP_ROOT . '/data/app.sqlite');
        $pdo = new PDO('sqlite:' . $file, null, null, $opt);
        $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=OFF;');
    } else {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $c['host'] ?? 'localhost', $c['port'] ?? '3306', $c['name'] ?? '');
        $pdo = new PDO($dsn, $c['user'] ?? '', $c['pass'] ?? '', $opt);
    }
    return $pdo;
}

function is_sqlite(): bool { return db()->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite'; }
function T(string $name): string { return '`' . preg_replace('/[^a-z0-9_]/i', '', (string)cfg('prefix', 'dp_') . $name) . '`'; }

/* ---------- Migrações automáticas ---------- */
function col_sql(string $type): string {
    $lite = is_sqlite();
    switch ($type) {
        case 'money': case 'number': return $lite ? 'REAL' : 'DECIMAL(12,2)';
        case 'int': case 'ref': case 'bool': case 'rating': return $lite ? 'INTEGER' : 'INT';
        case 'date': return $lite ? 'TEXT' : 'DATE';
        case 'time': return $lite ? 'TEXT' : 'VARCHAR(5)';
        case 'svcpick': case 'textarea': case 'lines': case 'checklist': case 'photos': case 'timeline': case 'payments': case 'damagemap': case 'jsonmap': return $lite ? 'TEXT' : 'MEDIUMTEXT';
        case 'signature': return $lite ? 'TEXT' : 'LONGTEXT';
        default: return $lite ? 'TEXT' : 'VARCHAR(255)';
    }
}

function table_cols(string $table): array {
    $raw = trim(T($table), '`');
    try {
        if (is_sqlite()) return array_column(db()->query("PRAGMA table_info(`$raw`)")->fetchAll(), 'name');
        return array_column(db()->query("SHOW COLUMNS FROM `$raw`")->fetchAll(), 'Field');
    } catch (Throwable $e) { return []; }
}

function migrate(): void {
    $lite = is_sqlite();
    $id = $lite ? 'id INTEGER PRIMARY KEY AUTOINCREMENT' : 'id INT AUTO_INCREMENT PRIMARY KEY';
    $eng = $lite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $pdo = db();
    $pdo->exec('CREATE TABLE IF NOT EXISTS ' . T('settings') . ' (k VARCHAR(64) PRIMARY KEY, v ' . ($lite ? 'TEXT' : 'MEDIUMTEXT') . ')' . $eng);
    $pdo->exec('CREATE TABLE IF NOT EXISTS ' . T('users') . " ($id, nome VARCHAR(120), email VARCHAR(190) UNIQUE, pass VARCHAR(255), role VARCHAR(20) DEFAULT 'admin', ativo INT DEFAULT 1, last_login VARCHAR(20), created_at VARCHAR(20))" . $eng);
    foreach (app_schema() as $key => $e) {
        $pdo->exec('CREATE TABLE IF NOT EXISTS ' . T($key) . " ($id, created_at VARCHAR(20), updated_at VARCHAR(20), created_by INT)" . $eng);
        $have = table_cols($key);
        foreach ($e['fields'] as $f) {
            if (!in_array($f['k'], $have, true)) {
                $pdo->exec('ALTER TABLE ' . T($key) . ' ADD COLUMN `' . $f['k'] . '` ' . col_sql($f['t']) . ' NULL');
            }
        }
    }
    setting_set('schema_version', schema_hash());
}

/* ---------- Definições ---------- */
function default_settings(): array {
    return [
        'app_nome' => cfg('app_name', 'DetailPro'), 'empresa_nome' => 'A Minha Empresa de Detailing',
        'empresa_nif' => '', 'empresa_morada' => '', 'empresa_telefone' => '', 'empresa_email' => '', 'empresa_web' => '',
        'empresa_responsavel' => '', 'listas' => '{}', 'campos_extra' => '[]', 'empresa_iban' => '', 'link_avaliacao' => '', 'link_facebook' => '', 'logo' => '', 'logo_inverter' => '0', 'slogan' => '', 'cor' => cfg('brand_color', '#ef4444'), 'tema' => 'escuro',
        'iva' => '23', 'iva_isento' => '0', 'reserva_impostos' => '25', 'custo_km' => '0.40', 'custo_hora' => '12',
        'custos_fixos' => '800', 'horas_mes' => '140', 'objetivo_mensal' => '6000', 'margem_alvo' => '40',
        'validade_dias' => '15', 'prefixo_orc' => 'ORC', 'prefixo_fat' => 'REC', 'prefixo_trab' => 'OT', 'prefixo_gar' => 'CER', 'lembretes_ok' => '{}', 'sinal_pct' => '25', 'faltas_sinal' => '2', 'venc_dias' => '0', 'gar_aviso_dias' => '30', 'papel' => 'A4', 'animacoes' => '1', 'rodape_fat' => '', 'termo_checkin' => 'Confirmo que o estado da viatura, os danos existentes e os objetos registados acima estão corretos, tanto quanto é do meu conhecimento, no momento da entrega. Autorizo os serviços indicados. Os objetos pessoais deixados na viatura são da minha responsabilidade.', 'desc_multi_n' => '3', 'desc_multi_pct' => '0',
        'termos_garantia' => "A cobertura aplica-se às superfícies indicadas, desde que as manutenções recomendadas sejam realizadas nas datas previstas e as instruções de cuidados sejam seguidas. Não inclui danos por acidente, abrasão, lavagens inadequadas (rolos/escovas), derrames químicos, contaminação ambiental não tratada ou negligência. Apresente este certificado em caso de pedido de inspeção de garantia.",
        'rodape_orc' => "Orçamento válido pelo prazo indicado. Valores sujeitos a confirmação após inspeção do veículo.\nPagamento: MB Way, Multibanco, Transferência ou Numerário.",
        'mult_tamanho' => '{"Pequeno":0.9,"Médio":1,"Grande":1.15,"SUV":1.25,"Carrinha / Monovolume":1.4,"Desportivo / Luxo":1.3,"Mota":0.6}',
        'modulos_off' => '["#/rota"]', 'portal_ativo' => '1', 'portal_precos' => '1',
        'portal_titulo' => 'Cuidamos do seu automóvel como se fosse nosso.',
        'portal_texto' => 'Lavagem, detalhe interior e exterior, correção de pintura, proteção cerâmica e PPF. Consulte os nossos serviços e peça uma marcação — entramos em contacto consigo.',
        'portal_horario' => 'Seg–Sex 9h–19h · Sáb 9h–13h', 'portal_instagram' => '', 'portal_whatsapp' => '', 'portal_faq' => "Com que frequência devo tratar o meu carro? | Para uso diário, uma lavagem de manutenção a cada 2–4 semanas e um detalhe completo duas vezes por ano mantêm pintura e interior em bom estado. Carros com cerâmico precisam de menos — a proteção faz o trabalho pesado.\nQuanto tempo demora um detalhe completo? | Entre meio dia e um dia, consoante o tamanho e o estado do veículo. Correções de pintura e cerâmicos podem levar 2 a 3 dias.\nVale a pena aplicar cerâmico num carro novo? | Sim — é o melhor momento: a pintura está perfeita, basta uma preparação ligeira e fica protegida desde o primeiro dia.\nConseguem remover os riscos por completo? | Micro-riscos e hologramas sim. Riscos que atravessam o verniz podem ser muito atenuados; medimos a espessura do verniz e dizemos-lhe sempre o resultado realista antes de começar.\nFazem recolha e entrega? | Sim, mediante marcação e consoante a zona. Pergunte-nos ao fazer o pedido.", 'empresa_desde' => '', 'portal_vagas_dia' => '2', 'portal_ad' => '', 'portal_ppf' => '1', 'modelo_3d' => '', 'portal_img_oficina' => '', 'portal_img_sobre' => '', 'portal_img_faq' => '', 'modelo_3d_credito' => '', 'modelo_3d_cor' => '#0c0d10', 'chk_ext' => "Riscos\nMossas\nLascas na pintura\nJantes danificadas\nVidros / para-brisas\nÓticas\nEspelhos\nPara-choques\nSujidade extrema / alcatrão",
        'chk_int' => "Manchas nos estofos\nPelos de animais\nOdores (tabaco/animais)\nPele gasta / rachada\nTablier / plásticos danificados\nTeto manchado\nTapetes\nObjetos pessoais retirados",
    ];
}
function settings(): array {
    static $cache = null;
    if ($cache !== null) return $cache;
    $s = default_settings();
    try { foreach (db()->query('SELECT k, v FROM ' . T('settings'))->fetchAll() as $r) $s[$r['k']] = $r['v']; } catch (Throwable $e) {}
    return $cache = $s;
}
function setting_set(string $k, $v): void {
    $pdo = db();
    $sql = is_sqlite() ? 'INSERT OR REPLACE INTO ' . T('settings') . ' (k, v) VALUES (?, ?)'
                       : 'INSERT INTO ' . T('settings') . ' (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)';
    $pdo->prepare($sql)->execute([$k, (string)$v]);
}

/* ---------- Sessão ---------- */
function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('dp_' . substr(md5((string)cfg('secret', 'x') . APP_ROOT), 0, 8));
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')]);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function current_user(): ?array { return $_SESSION['user'] ?? null; }

function now(): string { return date('Y-m-d H:i:s'); }
function num($v): float { return is_numeric($v) ? (float)$v : 0.0; }
