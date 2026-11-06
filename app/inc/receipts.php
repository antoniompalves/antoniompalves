<?php
// Invoices and receipts attached to expenses. Files live in DATA_DIR/receipts (not reachable from the web);
// they are only served through api.php to a logged-in user.
declare(strict_types=1);

const RECEIPT_TYPES = [
    'application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
    'image/heic' => 'heic', 'image/heif' => 'heif', 'image/gif' => 'gif',
];
const RECEIPT_MAX_BYTES = 15 * 1024 * 1024;

function receipts_dir(): string
{
    $d = DATA_DIR . '/receipts';
    if (!is_dir($d)) mkdir($d, 0700, true);
    return $d;
}

function receipt_mime(string $path, string $name): string
{
    $mime = '';
    if (function_exists('finfo_open')) { $f = finfo_open(FILEINFO_MIME_TYPE); $mime = (string)finfo_file($f, $path); finfo_close($f); }
    if (!isset(RECEIPT_TYPES[$mime])) {
        // fallback by signature / extension (hosts without fileinfo, or HEIC not recognised)
        $head = (string)file_get_contents($path, false, null, 0, 16);
        if (strncmp($head, '%PDF', 4) === 0) $mime = 'application/pdf';
        elseif (strncmp($head, "\xFF\xD8\xFF", 3) === 0) $mime = 'image/jpeg';
        elseif (strncmp($head, "\x89PNG", 4) === 0) $mime = 'image/png';
        elseif (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') $mime = 'image/webp';
        elseif (substr($head, 4, 4) === 'ftyp' && preg_match('~\.(heic|heif)$~i', $name)) $mime = 'image/heic';
    }
    return $mime;
}

function upload_error_message(int $code): string
{
    $max = ini_get('upload_max_filesize');
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE: case UPLOAD_ERR_FORM_SIZE: return "Ficheiro demasiado grande para o alojamento (máx. $max). Aumente upload_max_filesize no cPanel (MultiPHP INI Editor) ou envie um ficheiro mais pequeno.";
        case UPLOAD_ERR_PARTIAL: return 'O envio ficou incompleto. Tente novamente.';
        case UPLOAD_ERR_NO_FILE: return 'Nenhum ficheiro enviado.';
        default: return "Erro no envio do ficheiro (código $code).";
    }
}

/** Save one uploaded file ($_FILES['file']). Returns the receipt record stored on the expense. */
function receipt_save(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new InvalidArgumentException(upload_error_message((int)($file['error'] ?? UPLOAD_ERR_NO_FILE)));
    if ($file['size'] > RECEIPT_MAX_BYTES) throw new InvalidArgumentException('Ficheiro demasiado grande (máx. 15 MB).');
    $name = (string)($file['name'] ?? 'fatura');
    $mime = receipt_mime($file['tmp_name'], $name);
    if (!isset(RECEIPT_TYPES[$mime])) throw new InvalidArgumentException('Tipo de ficheiro não aceite. Use PDF, JPG, PNG, WEBP ou HEIC.');
    $id = bin2hex(random_bytes(12));
    $dest = receipts_dir() . '/' . $id . '.' . RECEIPT_TYPES[$mime];
    if (!move_uploaded_file($file['tmp_name'], $dest)) throw new RuntimeException('Não foi possível guardar o ficheiro (permissões da pasta data/?).');
    @chmod($dest, 0600);
    $clean = trim(preg_replace('~[^\pL\pN ._()-]+~u', '_', $name) ?? 'fatura');
    return ['id' => $id, 'name' => mb_substr($clean ?: 'fatura', 0, 120), 'mime' => $mime, 'size' => (int)filesize($dest), 'uploadedAt' => gmdate('Y-m-d\TH:i:s\Z')];
}

function receipt_path(string $id): ?string
{
    if (!preg_match('~^[a-f0-9]{24}$~', $id)) return null;
    foreach (RECEIPT_TYPES as $ext) { $p = DATA_DIR . '/receipts/' . $id . '.' . $ext; if (is_file($p)) return $p; }
    return null;
}

function receipt_send(string $id, bool $download): void
{
    $p = receipt_path($id);
    if (!$p) json_out(['error' => 'Ficheiro não encontrado'], 404);
    $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
    $mime = array_search($ext, RECEIPT_TYPES, true) ?: 'application/octet-stream';
    $name = preg_replace('~[^\w.-]+~', '_', (string)($_GET['name'] ?? ('fatura.' . $ext)));
    $inline = !$download && in_array($mime, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'], true);
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($p));
    header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . $name . '"');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; plugin-types application/pdf");
    header('Cache-Control: private, max-age=86400');
    readfile($p);
    exit;
}

function receipt_delete(string $id): bool
{
    $p = receipt_path($id);
    return $p ? @unlink($p) : false;
}
