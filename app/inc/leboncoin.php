<?php
// Leboncoin fetcher & parser (all listing data is in <script id="__NEXT_DATA__">), plus a schema.org JSON-LD
// parser for other portals (AutoScout24, mobile.de, coches.net, Marktplaats, La Centrale…).
// Leboncoin blocks most servers (DataDome, HTTP 403): the bookmarklet / paste are the reliable ways in;
// server fetch falls back to Firecrawl when a key is configured.
declare(strict_types=1);

const LBC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function lbc_extract_next_data(string $html): ?array
{
    if (!preg_match('~<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>~si', $html, $m)) return null;
    $j = json_decode($m[1], true);
    return is_array($j) ? $j : null;
}

/** Walk any decoded JSON and collect leboncoin ad objects (have list_id + subject/attributes). */
function lbc_find_ads($node, array &$out = [], int $depth = 0): array
{
    if (!is_array($node) || $depth > 14) return $out;
    if (isset($node['list_id']) && (isset($node['subject']) || isset($node['attributes']))) { $out[(string)$node['list_id']] = $node; return $out; }
    foreach ($node as $v) if (is_array($v)) lbc_find_ads($v, $out, $depth + 1);
    return $out;
}

function norm_fuel($label): ?string
{
    if ($label === null || $label === '' || is_array($label)) return null;
    $label = (string)$label;
    $map = [
        '~hybride\s*rechargeable|plug~iu' => 'phev', '~hybride|hybrid~iu' => 'hybrid', '~[ée]lectrique|electric|elektro~iu' => 'electric',
        '~diesel|gazole|gasoil|gasóleo~iu' => 'diesel', '~gpl|lpg~iu' => 'lpg', '~gnv|gaz naturel|cng~iu' => 'cng', '~essence|gasoline|petrol|benzin|gasolina~iu' => 'gasoline',
    ];
    foreach ($map as $re => $v) if (preg_match($re, $label)) return $v;
    return null;
}

/** CO2, displacement and NEDC/WLTP hints from free text. */
function specs_from_text(string $t): array
{
    $out = [];
    if (preg_match('~co2[^0-9]{0,25}(\d{2,3})\s*g~iu', $t, $m) || preg_match('~(\d{2,3})\s*g\s*/\s*km~iu', $t, $m)) $out['co2'] = (int)$m[1];
    if (preg_match('~(\d[\s.]?\d{3})\s*(?:cm3|cm³|cc|cm 3)\b~iu', $t, $m)) $out['cc'] = (int)preg_replace('~[\s.]~', '', $m[1]);
    elseif (preg_match('~\b([1-6])[.,]([0-9])\s*(?:l\b|dci|tdi|tsi|tfsi|hdi|bluehdi|puretech|tce|ecoblue|crdi|cdi|d\b|i\b|vti|thp|mpi|gti|t\b|ecoboost|skyactiv|multijet|jtd)~iu', $t, $m)) {
        $out['cc'] = (int)$m[1] * 1000 + (int)$m[2] * 100; $out['ccEstimated'] = true;
    }
    if (preg_match('~\bwltp\b~i', $t)) $out['co2Standard'] = 'WLTP'; elseif (preg_match('~\bnedc\b~i', $t)) $out['co2Standard'] = 'NEDC';
    return $out;
}

function lbc_attr(array $ad, string ...$keys): ?array
{
    foreach ($keys as $k) foreach ($ad['attributes'] ?? [] as $a) if (($a['key'] ?? '') === $k) return ['value' => $a['value'] ?? null, 'label' => $a['value_label'] ?? ($a['value'] ?? null)];
    return null;
}

function lbc_normalize(array $ad): array
{
    $brand = lbc_attr($ad, 'brand', 'u_car_brand'); $model = lbc_attr($ad, 'model', 'u_car_model'); $version = lbc_attr($ad, 'u_car_version', 'version');
    $regdate = lbc_attr($ad, 'regdate'); $issuance = lbc_attr($ad, 'issuance_date'); $mileage = lbc_attr($ad, 'mileage');
    $fuel = lbc_attr($ad, 'fuel'); $gearbox = lbc_attr($ad, 'gearbox'); $din = lbc_attr($ad, 'horse_power_din', 'horsepower_din'); $cv = lbc_attr($ad, 'horsepower');
    $body = lbc_attr($ad, 'vehicle_type'); $cc = lbc_attr($ad, 'cubic_capacity', 'engine_size', 'vehicle_engine_size'); $co2 = lbc_attr($ad, 'co2', 'vehicle_co2', 'co2_emission');
    $text = ($ad['subject'] ?? '') . "\n" . ($ad['body'] ?? '');
    $p = specs_from_text($text);
    $first = null;
    if (!empty($issuance['value']) && strpos((string)$issuance['value'], '/') !== false) {
        [$mm, $yyyy] = explode('/', (string)$issuance['value']);
        if ($yyyy) $first = $yyyy . '-' . str_pad($mm, 2, '0', STR_PAD_LEFT);
    }
    $year = (int)($regdate['value'] ?? 0) ?: ($first ? (int)substr($first, 0, 4) : null);
    if (!$first && $year) $first = $year . '-07';
    $price = is_array($ad['price'] ?? null) ? ($ad['price'][0] ?? null) : ($ad['price'] ?? (isset($ad['price_cents']) ? $ad['price_cents'] / 100 : null));
    $imgs = $ad['images']['urls_large'] ?? $ad['images']['urls'] ?? (isset($ad['images']['thumb_url']) ? [$ad['images']['thumb_url']] : []);
    $loc = $ad['location'] ?? [];
    $ownerType = $ad['owner']['type'] ?? null;
    $num = function ($a) { return isset($a['value']) && is_numeric($a['value']) ? (int)$a['value'] : null; };
    return [
        'source' => 'leboncoin', 'sourceId' => (string)$ad['list_id'],
        'url' => $ad['url'] ?? ('https://www.leboncoin.fr/ad/voitures/' . $ad['list_id']),
        'title' => $ad['subject'] ?? trim(($brand['label'] ?? '') . ' ' . ($model['label'] ?? '')),
        'make' => $brand['label'] ?? null, 'model' => $model['label'] ?? null, 'version' => $version['label'] ?? null,
        'year' => $year, 'firstRegistration' => $first, 'km' => $num($mileage),
        'fuel' => norm_fuel($fuel['label'] ?? null) ?: norm_fuel($text), 'gearbox' => $gearbox['label'] ?? null,
        'powerHp' => $num($din), 'fiscalHp' => $num($cv), 'body' => $body['label'] ?? null,
        'cc' => $num($cc) ?: ($p['cc'] ?? null), 'ccEstimated' => !$cc && !empty($p['ccEstimated']),
        'co2' => $num($co2) ?: ($p['co2'] ?? null), 'co2Standard' => $p['co2Standard'] ?? null, 'dieselParticles' => false,
        'country' => 'FR', 'city' => $loc['city'] ?? null, 'zipcode' => $loc['zipcode'] ?? null, 'region' => $loc['region_name'] ?? null,
        'lat' => $loc['lat'] ?? null, 'lng' => $loc['lng'] ?? null,
        'sellerType' => $ownerType === 'pro' ? 'pro' : ($ownerType ? 'private' : null), 'sellerName' => $ad['owner']['name'] ?? null,
        'price' => is_numeric($price) ? (float)$price : null, 'images' => array_values($imgs),
        'description' => $ad['body'] ?? '', 'publishedAt' => $ad['first_publication_date'] ?? null,
    ];
}

/** Parse what the user gives: page HTML, __NEXT_DATA__ JSON, one ad or a list of ads. */
function lbc_parse_payload(string $s): array
{
    $s = trim($s);
    $root = null;
    if ($s !== '' && ($s[0] === '{' || $s[0] === '[')) $root = json_decode($s, true);
    if (!is_array($root)) $root = lbc_extract_next_data($s);
    if (!is_array($root)) return [];
    $ads = [];
    lbc_find_ads($root, $ads);
    return array_values(array_map('lbc_normalize', $ads));
}

// ---- schema.org JSON-LD (other portals) ----
function jsonld_cars(string $html, string $url = ''): array
{
    preg_match_all('~<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>~si', $html, $mm);
    $nodes = [];
    foreach ($mm[1] as $raw) {
        $j = json_decode(trim($raw), true);
        if (!is_array($j)) continue;
        $list = isset($j['@graph']) ? $j['@graph'] : (array_keys($j) === range(0, count($j) - 1) ? $j : [$j]);
        foreach ($list as $n) if (is_array($n)) $nodes[] = $n;
    }
    $host = (string)parse_url($url, PHP_URL_HOST);
    $country = null;
    foreach (['fr' => 'FR', 'es' => 'ES', 'de' => 'DE', 'nl' => 'NL', 'be' => 'BE', 'pt' => 'PT'] as $tld => $c) if (preg_match('~\.' . $tld . '$~', $host)) $country = $c;
    $qv = function ($x) { return is_array($x) ? ($x['value'] ?? ($x['@value'] ?? null)) : $x; };
    $digits = function ($x) { $d = preg_replace('~[^\d]~', '', (string)$x); return $d === '' ? null : (int)$d; };
    $out = [];
    foreach ($nodes as $n) {
        $type = implode(' ', (array)($n['@type'] ?? ''));
        if (!preg_match('~car|vehicle|product|offer~i', $type) || !(isset($n['offers']) || isset($n['price']) || isset($n['mileageFromOdometer']))) continue;
        $offer = isset($n['offers']) ? (isset($n['offers'][0]) ? $n['offers'][0] : $n['offers']) : $n;
        $text = ($n['name'] ?? '') . "\n" . ($n['description'] ?? '');
        $sp = specs_from_text($text);
        $reg = (string)($n['dateVehicleFirstRegistered'] ?? $n['productionDate'] ?? $n['modelDate'] ?? $n['vehicleModelDate'] ?? '');
        $year = preg_match('~(19|20)\d{2}~', $reg, $ym) ? (int)$ym[0] : null;
        $engine = isset($n['vehicleEngine'][0]) ? $n['vehicleEngine'][0] : ($n['vehicleEngine'] ?? []);
        $brand = is_array($n['brand'] ?? null) ? ($n['brand']['name'] ?? null) : ($n['brand'] ?? null);
        $sellerType = $offer['seller']['@type'] ?? '';
        $imgs = [];
        foreach ((array)($n['image'] ?? []) as $i) $imgs[] = is_array($i) ? ($i['url'] ?? null) : $i;
        $out[] = [
            'source' => $host ?: 'web', 'sourceId' => (string)($n['sku'] ?? $n['productID'] ?? $url),
            'url' => $offer['url'] ?? ($n['url'] ?? $url), 'title' => $n['name'] ?? trim($brand . ' ' . ($n['model'] ?? '')),
            'make' => $brand ?: ($n['manufacturer']['name'] ?? null), 'model' => is_string($n['model'] ?? null) ? $n['model'] : null,
            'year' => $year, 'firstRegistration' => preg_match('~^\d{4}-\d{2}~', $reg) ? substr($reg, 0, 7) : ($year ? $year . '-07' : null),
            'km' => $digits($qv($n['mileageFromOdometer'] ?? null)),
            'fuel' => norm_fuel((string)($n['fuelType'] ?? ($engine['fuelType'] ?? ''))) ?: norm_fuel($text),
            'gearbox' => $n['vehicleTransmission'] ?? null,
            'cc' => $digits($qv($engine['engineDisplacement'] ?? null)) ?: ($sp['cc'] ?? null),
            'co2' => ($digits($qv($n['emissionsCO2'] ?? null)) ?: ($sp['co2'] ?? null)),
            'country' => $country, 'price' => isset($offer['price']) ? (float)$offer['price'] : (isset($offer['lowPrice']) ? (float)$offer['lowPrice'] : null),
            'images' => array_values(array_filter($imgs)), 'description' => $n['description'] ?? '',
            'sellerType' => in_array($sellerType, ['AutoDealer', 'Organization'], true) ? 'pro' : null, 'sellerName' => $offer['seller']['name'] ?? null,
        ];
    }
    return $out;
}

// ---- search URL builder (step 1 targets → leboncoin search) ----
function lbc_search_url(array $o): string
{
    $fuelCodes = ['gasoline' => '1', 'diesel' => '2', 'lpg' => '3', 'electric' => '4', 'hybrid' => '6', 'phev' => '7'];
    $p = ['category' => '2'];
    if (!empty($o['text'])) $p['text'] = $o['text'];
    if (!empty($o['minYear']) || !empty($o['maxYear'])) $p['regdate'] = ($o['minYear'] ?: 'min') . '-' . ($o['maxYear'] ?: 'max');
    if (!empty($o['maxKm'])) $p['mileage'] = 'min-' . $o['maxKm'];
    if (!empty($o['minPrice']) || !empty($o['maxPrice'])) $p['price'] = ($o['minPrice'] ?: 'min') . '-' . ($o['maxPrice'] ?: 'max');
    if (!empty($o['fuels'])) $p['fuel'] = implode(',', array_values(array_filter(array_map(function ($f) use ($fuelCodes) { return $fuelCodes[$f] ?? null; }, (array)$o['fuels']))));
    if (!empty($o['gearbox'])) $p['gearbox'] = $o['gearbox'] === 'auto' ? '2' : '1';
    if (!isset($o['proOnly']) || $o['proOnly']) $p['owner_type'] = 'pro';
    return 'https://www.leboncoin.fr/recherche?' . http_build_query($p, '', '&', PHP_QUERY_RFC3986);
}

// ---- network ----
function http_get(string $url): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 25, CURLOPT_ENCODING => '',
        CURLOPT_HTTPHEADER => ['User-Agent: ' . LBC_UA, 'Accept: text/html,application/xhtml+xml', 'Accept-Language: fr-FR,fr;q=0.9,en;q=0.8']]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    return [$status, $body === false ? '' : (string)$body, $err];
}

function firecrawl_html(string $url, string $key): string
{
    $ch = curl_init('https://api.firecrawl.dev/v2/scrape');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 90,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
        CURLOPT_POSTFIELDS => json_encode(['url' => $url, 'formats' => ['rawHtml'], 'proxy' => 'auto', 'maxAge' => 0])]);
    $res = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $j = json_decode((string)$res, true);
    if ($status >= 400 || empty($j['data']['rawHtml'])) throw new RuntimeException('Firecrawl ' . $status . ': ' . ($j['error'] ?? 'sem HTML'));
    return $j['data']['rawHtml'];
}

/** Fetch a leboncoin search or ad URL and return normalised deals. */
function lbc_fetch(string $url, string $firecrawlKey = '', ?callable $log = null): array
{
    $log = $log ?: function ($m) {};
    if (!preg_match('~^https://(www\.)?leboncoin\.fr/~', $url)) throw new InvalidArgumentException('Não é um URL do leboncoin.fr');
    $ads = [];
    $err = 'Nenhum anúncio encontrado';
    [$status, $html, $cerr] = http_get($url);
    $log("direto: HTTP $status" . ($cerr ? " ($cerr)" : ''));
    if ($status === 200) $ads = lbc_parse_payload($html);
    if (!$ads) $err = $status === 200 ? 'A página não tinha dados de anúncios' : "Bloqueado pelo leboncoin (HTTP $status)";
    if (!$ads && $firecrawlKey !== '') {
        $log('a tentar via Firecrawl…');
        $ads = lbc_parse_payload(firecrawl_html($url, $firecrawlKey));
        if (!$ads) $err = 'O Firecrawl devolveu a página, mas sem dados de anúncios';
    }
    if (!$ads) throw new RuntimeException($err . '. Use o marcador (bookmarklet) ou cole o código-fonte da página' . ($firecrawlKey ? '' : ' (ou configure a chave Firecrawl nas Definições)') . '.');
    return $ads;
}
