<?php
// Assistente de instalação: liga à base de dados MySQL/MariaDB, cria as tabelas e define a palavra-passe do backoffice.
// Fica bloqueado assim que app/config.php existir. Apague este ficheiro depois de instalar.
declare(strict_types=1);
require __DIR__ . '/app/lib.php';

$configFile = __DIR__ . '/app/config.php';
$installed = is_file($configFile);
$errors = [];
$done = false;
$v = fn (string $k, string $d = '') => htmlspecialchars((string) ($_POST[$k] ?? $d), ENT_QUOTES);

$checks = [
    'PHP 8.1 ou superior' => version_compare(PHP_VERSION, '8.1.0', '>='),
    'Extensão PDO MySQL' => extension_loaded('pdo_mysql'),
    'Extensão mbstring' => extension_loaded('mbstring'),
    'Pasta app/ com permissão de escrita' => is_writable(__DIR__ . '/app'),
    'Pasta uploads/ com permissão de escrita' => is_dir(__DIR__ . '/uploads') ? is_writable(__DIR__ . '/uploads') : is_writable(__DIR__),
];

if (!$installed && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $host = trim($_POST['db_host'] ?? 'localhost');
    $name = trim($_POST['db_name'] ?? '');
    $user = trim($_POST['db_user'] ?? '');
    $pass = (string) ($_POST['db_pass'] ?? '');
    $prefix = trim($_POST['prefix'] ?? 'fl_');
    $store = trim($_POST['store_name'] ?? 'Forge Labs');
    $pw = (string) ($_POST['admin_pass'] ?? '');
    $pw2 = (string) ($_POST['admin_pass2'] ?? '');

    if ($name === '' || $user === '') $errors[] = 'Indique o nome e o utilizador da base de dados.';
    if (!preg_match('/^[a-zA-Z0-9_]{0,20}$/', $prefix)) $errors[] = 'O prefixo das tabelas só pode ter letras, números e _.';
    if (mb_strlen($pw) < 8) $errors[] = 'A palavra-passe do backoffice deve ter pelo menos 8 caracteres.';
    if ($pw !== $pw2) $errors[] = 'As palavras-passe não coincidem.';
    if ($store === '') $errors[] = 'Indique o nome da loja.';
    if (in_array(false, $checks, true)) $errors[] = 'Corrija os requisitos assinalados acima antes de continuar.';

    if (!$errors) {
        $port = '';
        if (preg_match('/^(.+):(\d{2,5})$/', $host, $hm)) { $host = $hm[1]; $port = ';port=' . $hm[2]; }
        $dsn = 'mysql:host=' . $host . $port . ';dbname=' . $name . ';charset=utf8mb4';
        try {
            $pdo = connect($dsn, $user, $pass);
            foreach (schema('mysql', $prefix) as $sql) $pdo->exec($sql);
            $set = fn ($k, $val) => [$pdo->prepare("DELETE FROM {$prefix}settings WHERE k = ?")->execute([$k]), $pdo->prepare("INSERT INTO {$prefix}settings (k, v) VALUES (?, ?)")->execute([$k, $val])];
            $set('admin_password_hash', password_hash($pw, PASSWORD_DEFAULT));
            $set('storeName', mb_substr($store, 0, 60));
            $set('updatedAt', now_iso());

            $cfg = "<?php\n// Gerado por install.php em " . date('Y-m-d H:i') . ". Não partilhe este ficheiro.\nreturn " .
                var_export(['dsn' => $dsn, 'db_user' => $user, 'db_pass' => $pass, 'prefix' => $prefix], true) . ";\n";
            if (file_put_contents($configFile, $cfg, LOCK_EX) === false) throw new RuntimeException('Não foi possível escrever app/config.php');
            @chmod($configFile, 0640);
            if (!is_dir(__DIR__ . '/uploads/brand')) @mkdir(__DIR__ . '/uploads/brand', 0755, true);
            $done = true;
        } catch (PDOException $e) {
            $errors[] = 'Não foi possível aceder à base de dados: ' . htmlspecialchars($e->getMessage());
        } catch (Throwable $e) {
            $errors[] = htmlspecialchars($e->getMessage());
        }
    }
}
?><!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Instalação da loja</title>
<style>
  :root { --o: #f26b1d; --ink: #141414; --muted: #8a8a8a; --line: #ececec; }
  * { box-sizing: border-box; } body { margin: 0; font-family: system-ui, sans-serif; background: var(--o); color: var(--ink); padding: 32px 16px; }
  main { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 22px; padding: 32px; }
  h1 { margin: 0 0 6px; font-weight: 600; } h2 { font-size: 15px; margin: 26px 0 10px; } p { line-height: 1.55; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 12px 0 6px; }
  input { width: 100%; padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px; font: inherit; }
  input:focus { outline: 2px solid var(--o); border-color: transparent; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .muted { color: var(--muted); font-size: 13px; }
  button, .btn { display: inline-block; margin-top: 22px; background: var(--o); color: #fff; border: 0; border-radius: 10px; padding: 13px 20px; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; }
  ul.checks { list-style: none; padding: 0; margin: 0; } ul.checks li { padding: 4px 0; font-size: 14px; }
  .ok { color: #2e7d32; } .bad { color: #c62828; } .err { background: #fdecea; color: #b71c1c; padding: 12px 14px; border-radius: 10px; margin: 14px 0; }
  .warn { background: #fff3e0; color: #8a4b00; padding: 12px 14px; border-radius: 10px; }
  code { background: #f4f1ee; padding: 2px 6px; border-radius: 4px; }
  @media (max-width: 520px) { .row { grid-template-columns: 1fr; } main { padding: 22px; } }
</style>
</head>
<body><main>
<?php if ($done): ?>
  <h1>✓ Instalação concluída</h1>
  <p>A base de dados foi configurada e a loja está pronta.</p>
  <p class="warn"><b>Importante:</b> apague agora o ficheiro <code>install.php</code> do servidor (Gestor de Ficheiros do cPanel).</p>
  <a class="btn" href="admin/">Entrar no backoffice</a> &nbsp; <a href="./">Ver loja</a>
<?php elseif ($installed): ?>
  <h1>A loja já está instalada</h1>
  <p>Este assistente está bloqueado porque <code>app/config.php</code> já existe. Por segurança, apague o ficheiro <code>install.php</code>.</p>
  <p class="muted">Para reinstalar, apague <code>app/config.php</code> (as tabelas existentes na base de dados são mantidas).</p>
  <a class="btn" href="admin/">Ir para o backoffice</a>
<?php else: ?>
  <h1>Instalação da loja</h1>
  <p class="muted">Crie primeiro uma base de dados MySQL e um utilizador com todas as permissões no cPanel (<b>Bases de dados MySQL</b>).</p>
  <h2>Requisitos</h2>
  <ul class="checks"><?php foreach ($checks as $label => $ok): ?><li class="<?= $ok ? 'ok' : 'bad' ?>"><?= $ok ? '✓' : '✗' ?> <?= $label ?></li><?php endforeach; ?></ul>
  <?php foreach ($errors as $e): ?><div class="err"><?= $e ?></div><?php endforeach; ?>
  <form method="post" autocomplete="off">
    <h2>Base de dados</h2>
    <div class="row">
      <div><label>Servidor <span class="muted">(anfitrião ou anfitrião:porta)</span></label><input name="db_host" value="<?= $v('db_host', 'localhost') ?>" required></div>
      <div><label>Prefixo das tabelas</label><input name="prefix" value="<?= $v('prefix', 'fl_') ?>"></div>
    </div>
    <label>Nome da base de dados</label><input name="db_name" value="<?= $v('db_name') ?>" placeholder="ex.: cpaneluser_loja" required>
    <div class="row">
      <div><label>Utilizador</label><input name="db_user" value="<?= $v('db_user') ?>" placeholder="ex.: cpaneluser_loja" required></div>
      <div><label>Palavra-passe</label><input name="db_pass" type="password"></div>
    </div>
    <h2>Loja e backoffice</h2>
    <label>Nome da loja</label><input name="store_name" value="<?= $v('store_name', 'Forge Labs') ?>" required>
    <div class="row">
      <div><label>Palavra-passe do backoffice</label><input name="admin_pass" type="password" minlength="8" required></div>
      <div><label>Confirmar palavra-passe</label><input name="admin_pass2" type="password" minlength="8" required></div>
    </div>
    <button>Instalar</button>
  </form>
<?php endif; ?>
</main></body></html>
