<?php
// Login, and on first use: choose the password (stored as a hash in data/auth.json).
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
start_session();
$setup = !password_configured();
$next = (string)($_GET['next'] ?? $_POST['next'] ?? '');
$next = preg_match('~^[a-z]+\.php$~', $next) ? $next : 'index.php';
$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $pw = (string)($_POST['password'] ?? '');
    if (!hash_equals((string)($_SESSION['csrf'] ?? ''), (string)($_POST['csrf'] ?? ''))) $error = 'A sessão expirou. Tente novamente.';
    elseif ($setup) {
        if (strlen($pw) < 8) $error = 'A palavra-passe deve ter pelo menos 8 caracteres.';
        elseif ($pw !== (string)($_POST['password2'] ?? '')) $error = 'As palavras-passe não coincidem.';
        else { set_password($pw); session_regenerate_id(true); $_SESSION['vroom_ok'] = true; header('Location: ' . $next); exit; }
    } elseif (too_many_attempts()) $error = 'Demasiadas tentativas. Tente novamente daqui a 15 minutos.';
    elseif (check_password($pw)) { session_regenerate_id(true); $_SESSION['vroom_ok'] = true; header('Location: ' . $next); exit; }
    else { too_many_attempts(true); $error = 'Palavra-passe errada.'; }
}
$_SESSION['csrf'] = $_SESSION['csrf'] ?? bin2hex(random_bytes(16));
header('Content-Type: text/html; charset=utf-8');
header('X-Frame-Options: DENY');
?><!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vroom.pt · Entrar</title><link rel="icon" href="assets/logo.svg"><link rel="stylesheet" href="assets/styles.css"></head>
<body class="login-page">
<form class="login-card" method="post" action="login.php">
  <img src="assets/logo.svg" width="48" height="48" alt="">
  <h1>Vroom.pt</h1>
  <p class="muted"><?= $setup ? 'Primeira utilização: escolha a palavra-passe de acesso.' : 'Análise de importação · França · Espanha · Alemanha · Países Baixos → Portugal' ?></p>
  <?php if ($error): ?><p class="error"><?= h($error) ?></p><?php endif; ?>
  <input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>">
  <input type="hidden" name="next" value="<?= h($next) ?>">
  <input type="password" name="password" placeholder="<?= $setup ? 'Nova palavra-passe (mín. 8)' : 'Palavra-passe' ?>" autofocus required <?= $setup ? 'minlength="8"' : '' ?>>
  <?php if ($setup): ?><input type="password" name="password2" placeholder="Repetir a palavra-passe" required minlength="8"><?php endif; ?>
  <button class="btn primary" type="submit"><?= $setup ? 'Guardar e entrar' : 'Entrar' ?></button>
</form>
</body></html>
