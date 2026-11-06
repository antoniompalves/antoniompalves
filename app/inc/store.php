<?php
// Tiny JSON-file store with file locking. Fine for thousands of cars on shared hosting.
declare(strict_types=1);

class Store
{
    public $dir;
    public $file;
    public $data = ['deals' => [], 'settings' => [], 'ledger' => ['general' => [], 'settlements' => []]];
    private $lock;

    public function __construct(string $dir)
    {
        $this->dir = $dir;
        $this->file = $dir . '/db.json';
        if (!is_dir($dir) && !@mkdir($dir, 0700, true)) throw new RuntimeException("Não foi possível criar a pasta de dados: $dir");
        if (!is_file($dir . '/.htaccess')) @file_put_contents($dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
        if (!is_file($dir . '/index.html')) @file_put_contents($dir . '/index.html', '');
        $this->lock = fopen($dir . '/.lock', 'c');
        flock($this->lock, LOCK_EX); // one request writes at a time; released at the end of the request
        if (is_file($this->file)) {
            $j = json_decode((string)file_get_contents($this->file), true);
            if (is_array($j)) $this->data = array_merge($this->data, $j);
        }
        if (!isset($this->data['ledger']['general'])) $this->data['ledger'] = ['general' => [], 'settlements' => []];
    }

    public function save(): void
    {
        $tmp = $this->file . '.' . getmypid() . '.tmp';
        $json = json_encode($this->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
        if (file_put_contents($tmp, $json) === false) throw new RuntimeException('Não foi possível gravar os dados (permissões da pasta data/?)');
        rename($tmp, $this->file);
    }

    public function backup(): void
    {
        if (!is_file($this->file)) return;
        $b = $this->dir . '/backups';
        if (!is_dir($b)) mkdir($b, 0700, true);
        copy($this->file, $b . '/db-' . date('Y-m-d\TH-i-s') . '.json');
        $files = glob($b . '/db-*.json') ?: [];
        sort($files);
        foreach (array_slice($files, 0, max(0, count($files) - 30)) as $f) @unlink($f);
    }

    private function index(string $id): ?int
    {
        foreach ($this->data['deals'] as $i => $d) if (($d['id'] ?? '') === $id) return $i;
        return null;
    }

    public function find(string $id): ?array
    {
        $i = $this->index($id);
        return $i === null ? null : $this->data['deals'][$i];
    }

    /** Insert or update by (source, sourceId). Keeps the user's own fields and tracks price changes. */
    public function upsert(array $in): array
    {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $keep = ['status', 'market', 'overrides', 'quality', 'favorite', 'notes', 'expenses', 'checklist', 'dates', 'salePrice', 'co2Standard', 'dieselParticles', 'hasCoc', 'paymentMethod', 'tradeIn', 'otherIncome'];
        if (!empty($in['sourceId'])) {
            foreach ($this->data['deals'] as $i => $ex) {
                if (($ex['source'] ?? '') !== ($in['source'] ?? '') || (string)($ex['sourceId'] ?? '') !== (string)$in['sourceId']) continue;
                if (!empty($in['price']) && !empty($ex['price']) && (float)$in['price'] !== (float)$ex['price']) {
                    $ex['priceHistory'] = array_merge($ex['priceHistory'] ?? [], [['date' => $now, 'price' => $ex['price']]]);
                }
                foreach ($in as $k => $v) {
                    if (in_array($k, $keep, true) && isset($ex[$k])) continue;
                    if ($v === null || $v === '') continue;
                    if (($k === 'cc' || $k === 'co2') && !empty($ex[$k]) && !empty($ex[$k . 'Manual'])) continue;
                    $ex[$k] = $v;
                }
                $ex['lastSeenAt'] = $now;
                $ex['updatedAt'] = $now;
                $this->data['deals'][$i] = $ex;
                $this->save();
                return ['deal' => $ex, 'created' => false];
            }
        }
        $deal = array_merge([
            'id' => self::uuid(), 'status' => 'new', 'market' => ['comps' => []], 'overrides' => new stdClass(), 'expenses' => [],
            'checklist' => new stdClass(), 'dates' => new stdClass(), 'quality' => 3, 'favorite' => false, 'notes' => '',
            'createdAt' => $now, 'updatedAt' => $now, 'lastSeenAt' => $now,
        ], $in);
        array_unshift($this->data['deals'], $deal);
        $this->save();
        return ['deal' => $deal, 'created' => true];
    }

    public function update(string $id, array $patch): ?array
    {
        $i = $this->index($id);
        if ($i === null) return null;
        unset($patch['id']);
        $d = array_merge($this->data['deals'][$i], $patch, ['updatedAt' => gmdate('Y-m-d\TH:i:s\Z')]);
        $this->data['deals'][$i] = $d;
        $this->save();
        return $d;
    }

    public function remove(string $id): bool
    {
        $i = $this->index($id);
        if ($i === null) return false;
        array_splice($this->data['deals'], $i, 1);
        $this->save();
        return true;
    }

    public static function uuid(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }
}
