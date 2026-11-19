<?php
/* Instalador DetailPro — cria config.php, tabelas, administrador e dados iniciais. */
require __DIR__ . '/inc/bootstrap.php';
if (has_config()) { header('Location: index.php'); exit; }
$err = ''; $ok = false;
$checks = [
    'PHP 8.0 ou superior' => version_compare(PHP_VERSION, '8.0', '>='),
    'Extensão PDO' => extension_loaded('pdo'),
    'PDO MySQL ou SQLite' => extension_loaded('pdo_mysql') || extension_loaded('pdo_sqlite'),
    'Pasta raiz gravável (config.php)' => is_writable(__DIR__),
    'Pasta uploads/ gravável' => is_writable(__DIR__ . '/uploads'),
    'Pasta data/ gravável (SQLite)' => is_writable(__DIR__ . '/data'),
];
$P = fn($k, $d = '') => htmlspecialchars((string)($_POST[$k] ?? $d), ENT_QUOTES);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $driver = $_POST['driver'] === 'sqlite' ? 'sqlite' : 'mysql';
        $db = $driver === 'sqlite' ? ['driver' => 'sqlite', 'file' => __DIR__ . '/data/app-' . bin2hex(random_bytes(6)) . '.sqlite']
            : ['driver' => 'mysql', 'host' => trim($_POST['host'] ?: 'localhost'), 'port' => trim($_POST['port'] ?: '3306'), 'name' => trim($_POST['name']), 'user' => trim($_POST['user']), 'pass' => (string)$_POST['pass']];
        $prefix = preg_replace('/[^a-z0-9_]/', '', strtolower($_POST['prefix'] ?: 'dp_'));
        $email = strtolower(trim($_POST['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception('Email do administrador inválido.');
        if (strlen($_POST['apass'] ?? '') < 8) throw new Exception('A palavra-passe deve ter pelo menos 8 caracteres.');
        db_connect($db); // testa a ligação
        $config = ['db' => $db, 'prefix' => $prefix, 'secret' => bin2hex(random_bytes(16)), 'app_name' => trim($_POST['app'] ?: 'DetailPro'), 'brand_color' => '#ef4444', 'debug' => false, 'timezone' => 'Europe/Lisbon'];
        $php = "<?php\n// Configuração DetailPro — gerada pelo instalador em " . date('Y-m-d H:i') . "\nreturn " . var_export($config, true) . ";\n";
        if (file_put_contents(__DIR__ . '/config.php', $php) === false) throw new Exception('Não foi possível escrever config.php. Verifique permissões.');
        @chmod(__DIR__ . '/config.php', 0640);
        try {
            migrate();
            require __DIR__ . '/inc/seed.php';
            $exists = (int)db()->query('SELECT COUNT(*) FROM ' . T('users'))->fetchColumn();
            if ($exists) throw new Exception('Já existe uma instalação com o prefixo "' . $prefix . '" nesta base de dados. Use outro prefixo.');
            db()->prepare('INSERT INTO ' . T('users') . ' (nome, email, pass, role, ativo, created_at) VALUES (?,?,?,?,1,?)')->execute([trim($_POST['aname']), $email, password_hash($_POST['apass'], PASSWORD_DEFAULT), 'admin', now()]);
            setting_set('empresa_nome', trim($_POST['empresa']) ?: 'A Minha Empresa de Detailing');
            setting_set('app_nome', $config['app_name']);
            setting_set('empresa_email', $email);
            $demo = $_POST['demo'] ?? '';
            if ($demo === 'av') { require __DIR__ . '/inc/demo_av.php'; seed_av(trim($_POST['aname'])); }
            else { seed_base(trim($_POST['aname'])); if ($demo === '1') seed_demo(); }
        } catch (Throwable $e) { @unlink(__DIR__ . '/config.php'); throw $e; }
        $ok = true;
    } catch (Throwable $e) { $err = $e->getMessage(); }
}
?><!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Instalação · DetailPro</title>
<link rel="stylesheet" href="assets/app.css"></head>
<body><div class="login"><div class="glass box" style="max-width:640px">
<div class="brand" style="padding:0"><div class="logo"><img src="assets/icon.svg" alt=""></div><div><b>DetailPro</b><span>Instalação</span></div></div>
<?php if ($ok): ?>
  <h1>Instalação concluída ✨</h1>
  <p class="muted">A aplicação está pronta. Por segurança, apague o ficheiro <code>install.php</code> do servidor.</p>
  <div class="row"><a class="btn pri" href="index.php">Entrar no CRM</a><a class="btn" href="portal.php" target="_blank">Ver portal do cliente</a></div>
<?php else: ?>
  <h1>Instalar</h1><p class="muted small">Crie primeiro uma base de dados MySQL no cPanel (Bases de dados MySQL) e atribua-lhe um utilizador com todos os privilégios — ou use SQLite (sem configuração).</p>
  <div class="note" style="margin:12px 0"><?php foreach ($checks as $l => $c): ?><div><?= $c ? '✅' : '❌' ?> <?= htmlspecialchars($l) ?></div><?php endforeach; ?></div>
  <?php if ($err): ?><div class="alert" style="border-color:var(--bad);color:var(--bad)"><?= htmlspecialchars($err) ?></div><?php endif; ?>
  <form method="post" class="form" autocomplete="off">
    <div class="full tiny">Base de dados</div>
    <label class="f full"><span>Tipo</span><select class="inp" name="driver" onchange="document.querySelectorAll('.my').forEach(e=>e.style.display=this.value==='mysql'?'':'none')">
      <option value="mysql" <?= ($_POST['driver'] ?? '') !== 'sqlite' ? 'selected' : '' ?>>MySQL / MariaDB (recomendado no cPanel)</option><option value="sqlite" <?= ($_POST['driver'] ?? '') === 'sqlite' ? 'selected' : '' ?>>SQLite (ficheiro local)</option></select></label>
    <label class="f my"><span>Servidor</span><input class="inp" name="host" value="<?= $P('host', 'localhost') ?>"></label>
    <label class="f my"><span>Porta</span><input class="inp" name="port" value="<?= $P('port', '3306') ?>"></label>
    <label class="f my"><span>Nome da base de dados</span><input class="inp" name="name" value="<?= $P('name') ?>" placeholder="cpaneluser_detailpro"></label>
    <label class="f my"><span>Utilizador</span><input class="inp" name="user" value="<?= $P('user') ?>"></label>
    <label class="f my full"><span>Palavra-passe da BD</span><input class="inp" type="password" name="pass"></label>
    <label class="f"><span>Prefixo das tabelas</span><input class="inp" name="prefix" value="<?= $P('prefix', 'dp_') ?>"><small>Permite várias empresas na mesma BD (ex.: cli1_, cli2_).</small></label>
    <label class="f"><span>Nome da aplicação (white-label)</span><input class="inp" name="app" value="<?= $P('app', 'DetailPro') ?>"></label>
    <div class="full tiny" style="margin-top:8px">Empresa & administrador</div>
    <label class="f full"><span>Nome da empresa</span><input class="inp" name="empresa" value="<?= $P('empresa') ?>" required></label>
    <label class="f"><span>O seu nome</span><input class="inp" name="aname" value="<?= $P('aname') ?>" required></label>
    <label class="f"><span>Email (login)</span><input class="inp" type="email" name="email" value="<?= $P('email') ?>" required></label>
    <label class="f full"><span>Palavra-passe (mín. 8)</span><input class="inp" type="password" name="apass" required minlength="8"></label>
    <label class="f full"><span>Dados iniciais</span><select class="inp" name="demo">
      <option value="">Só serviços e modelos de mensagem (instalação limpa)</option>
      <option value="1" <?= ($_POST['demo'] ?? '') === '1' ? 'selected' : '' ?>>Demonstração genérica (clientes, trabalhos, despesas…)</option>
      <option value="av" <?= ($_POST['demo'] ?? '') === 'av' ? 'selected' : '' ?>>Demonstração AV Car Detail (marca, serviços e preços reais + clientes fictícios)</option></select></label>
    <div class="full"><button class="btn pri" style="width:100%;justify-content:center;padding:12px">Instalar</button></div>
  </form>
  <script>document.querySelector('[name=driver]').dispatchEvent(new Event('change'))</script>
<?php endif; ?>
</div></div></body></html>
