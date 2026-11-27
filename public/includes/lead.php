<?php
/**
 * POST /api/lead — receives the contact form and the Damiana widget questions.
 * Sends an email via PHP mail() (works out of the box on cPanel) and
 * appends a line to storage/leads.csv as a backup.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function out(int $code, array $body): void { http_response_code($code); echo json_encode($body); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(405, ['ok' => false]);

$in = $_POST;
if (!hash_equals($_SESSION['csrf'] ?? '', (string) ($in['csrf'] ?? ''))) out(403, ['ok' => false, 'error' => 'csrf']);
if (!empty($in['website'])) out(200, ['ok' => true]); // honeypot: silently accept bots

// Simple per-session rate limit: 5 submissions / 10 minutes
$now = time();
$_SESSION['lead_times'] = array_values(array_filter($_SESSION['lead_times'] ?? [], fn($t) => $t > $now - 600));
if (count($_SESSION['lead_times']) >= 5) out(429, ['ok' => false, 'error' => 'rate']);

$clean = fn($k, $max = 200) => trim(mb_substr(str_replace(["\r", "\0"], '', (string) ($in[$k] ?? '')), 0, $max));
$data = [
    'source'   => in_array($src = $clean('source', 20), ['agent', 'programme'], true) ? $src : 'contact',
    'name'     => $clean('name'),
    'email'    => $clean('email'),
    'phone'    => $clean('phone', 40),
    'org'      => $clean('org'),
    'type'     => $clean('type', 20),
    'interest' => $clean('interest'),
    'size'     => $clean('size', 40),
    'format'   => $clean('format', 40),
    'message'  => $clean('message', 4000),
    'lang'     => lang(),
];

if ($data['source'] === 'programme' && $data['message'] === '') $data['message'] = '(sem mensagem)';
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL) || $data['message'] === '' ||
    ($data['source'] !== 'agent' && $data['name'] === '')) {
    out(422, ['ok' => false, 'error' => 'invalid']);
}
// Header-injection guard
foreach (['name', 'email'] as $k) if (preg_match('/[\n\r]/', $data[$k])) out(422, ['ok' => false]);

$subject = match ($data['source']) {
    'agent'     => '[EQ Training] Pergunta via ' . cfg('agent_name'),
    'programme' => '[EQ Training] Pedido de proposta: Formação com App' . ($data['org'] ? ' — ' . $data['org'] : ''),
    default     => '[EQ Training] Novo pedido de contacto' . ($data['org'] ? ' — ' . $data['org'] : ''),
};

$lines = [];
foreach (['source' => 'Origem', 'name' => 'Nome', 'email' => 'Email', 'phone' => 'Telefone', 'org' => 'Organização',
          'type' => 'Tipo', 'interest' => 'Programa', 'size' => 'Participantes', 'format' => 'Formato', 'lang' => 'Idioma'] as $k => $label) {
    if ($data[$k] !== '') $lines[] = str_pad($label . ':', 14) . $data[$k];
}
$body = implode("\n", $lines) . "\n\nMensagem:\n" . $data['message'] . "\n\n— " . date('Y-m-d H:i') . ' · ' . ($_SERVER['REMOTE_ADDR'] ?? '');

$headers = [
    'From: EQ Training <' . cfg('email_from') . '>',
    'Reply-To: ' . ($data['name'] ? '"' . addcslashes($data['name'], '"\\') . '" ' : '') . '<' . $data['email'] . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
];

$sent = @mail(cfg('email_to'), '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers), '-f' . cfg('email_from'));

// Backup log (outside web access thanks to storage/.htaccess)
$logged = false;
$dir = ROOT . '/storage';
if (is_dir($dir) && is_writable($dir)) {
    $fh = fopen($dir . '/leads.csv', 'a');
    if ($fh) { $logged = fputcsv($fh, array_merge([date('c')], array_values($data))) !== false; fclose($fh); }
}

$_SESSION['lead_times'][] = $now;
$ok = $sent || $logged;
out($ok ? 200 : 500, ['ok' => $ok]);
