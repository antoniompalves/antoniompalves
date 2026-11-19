<?php
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/calc.php';
require __DIR__ . '/inc/reports.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function out($d, int $code = 200): void { http_response_code($code); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400): void { out(['error' => $msg], $code); }
function body(): array { static $b = null; if ($b === null) { $b = json_decode(file_get_contents('php://input') ?: '[]', true) ?: []; } return $b; }
function need_admin(): void { if ((current_user()['role'] ?? '') !== 'admin') fail('Apenas administradores.', 403); }
function entity(string $e): array { $S = app_schema(); if (!isset($S[$e])) fail('Módulo desconhecido.'); return $S[$e]; }

if (!has_config()) fail('Aplicação não instalada. Abra install.php.', 503);

try {
    start_session();
    if (settings()['schema_version'] !== schema_hash()) migrate();
    $a = $_GET['a'] ?? '';
    $user = current_user();

    /* ---- Ações públicas ---- */
    if ($a === 'boot') {
        $S = settings();
        $brand = ['app_nome' => $S['app_nome'], 'empresa_nome' => $S['empresa_nome'], 'cor' => $S['cor'], 'tema' => $S['tema'], 'logo' => $S['logo'] ? 'api.php?a=logo' : ''];
        if (!$user) out(['auth' => false, 'brand' => $brand]);
        unset($S['schema_version']);
        out(['auth' => true, 'brand' => $brand, 'user' => $user, 'csrf' => $_SESSION['csrf'], 'settings' => $S,
             'schema' => app_schema(), 'listas_editaveis' => editable_lists(), 'version' => APP_VERSION, 'php' => PHP_VERSION,
             'db' => db()->getAttribute(PDO::ATTR_DRIVER_NAME), 'today' => date('Y-m-d')]);
    }
    if ($a === 'logo') {
        $f = settings()['logo'];
        $p = APP_ROOT . '/uploads/' . basename((string)$f);
        if (!$f || !is_file($p)) { http_response_code(404); exit; }
        header('Content-Type: ' . img_mime($p)); header('Cache-Control: max-age=3600'); readfile($p); exit;
    }
    if ($a === 'login') {
        $b = body();
        $_SESSION['tries'] = ($_SESSION['tries'] ?? 0) + 1;
        if ($_SESSION['tries'] > 5) sleep(min(10, $_SESSION['tries'] - 5));
        $st = db()->prepare('SELECT * FROM ' . T('users') . ' WHERE email = ? AND ativo = 1');
        $st->execute([strtolower(trim((string)($b['email'] ?? '')))]);
        $u = $st->fetch();
        if (!$u || !password_verify((string)($b['pass'] ?? ''), $u['pass'])) fail('Email ou palavra-passe incorretos.', 401);
        session_regenerate_id(true);
        $_SESSION['tries'] = 0;
        $_SESSION['user'] = ['id' => (int)$u['id'], 'nome' => $u['nome'], 'email' => $u['email'], 'role' => $u['role']];
        db()->prepare('UPDATE ' . T('users') . ' SET last_login = ? WHERE id = ?')->execute([now(), $u['id']]);
        out(['ok' => true]);
    }

    /* ---- Portal do cliente (público) ---- */
    if (str_starts_with($a, 'pub_') || str_starts_with($a, 'portal_')) {
        $S = settings();
        if ($S['portal_ativo'] !== '1') fail('O portal está desativado.', 403);
        if ($a === 'pub_info') {
            $sv = []; $ck = []; foreach (all_rows('checklists') as $x) $ck[$x['id']] = $x['tarefas'];
            foreach (all_rows('servicos', 'tipo DESC, ordem ASC, id ASC') as $r) {
                if (!trim((string)$r['tarefas_padrao']) && !empty($r['checklist_id'])) $r['tarefas_padrao'] = $ck[$r['checklist_id']] ?? '';
                if (!$r['ativo'] || (isset($r['publico']) && $r['publico'] !== null && !$r['publico'])) continue;
                $p = $S['portal_precos'] === '1';
                $sv[] = ['id' => (int)$r['id'], 'nome' => $r['nome'], 'tipo' => $r['tipo'], 'categoria' => $r['categoria'], 'descricao' => $r['descricao'],
                    'inclui' => array_values(array_filter(array_map('trim', explode("\n", (string)$r['tarefas_padrao'])))),
                    'duracao_h' => $r['duracao_h'] !== null ? (float)$r['duracao_h'] : null, 'destaque' => (int)$r['destaque'],
                    'slogan' => $r['slogan'], 'resultado' => $r['resultado'], 'duracao_txt' => $r['duracao_txt'],
                    'precos' => $p ? ['Pequeno' => $r['preco_pequeno'], 'Médio' => $r['preco_medio'], 'Grande / SUV' => $r['preco_grande'], 'Desportivo / Luxo' => $r['preco_luxo'], 'Mota' => $r['preco_moto']] : null,
                    'fotos' => array_map(fn($f) => $f['f'] ?? '', jdec($r['fotos']))];
            }
            // números reais para o portal: trabalhos, avaliações, garantia, próxima vaga, antes/depois
            $pdo = db(); $nTrab = (int)$pdo->query('SELECT COUNT(*) FROM ' . T('trabalhos') . " WHERE estado = 'Concluído'")->fetchColumn();
            $rt = $pdo->query('SELECT AVG(pontuacao) a, COUNT(*) n FROM ' . T('avaliacoes') . " WHERE pontuacao > 0 AND estado IN ('Recebida','Recompensa entregue')")->fetch();
            $gar = (int)$pdo->query('SELECT MAX(anos) FROM ' . T('garantias'))->fetchColumn();
            $vag = max(1, (int)($S['portal_vagas_dia'] ?? 2)); $prox = null;
            $DS = ['', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
            for ($i = 1; $i <= 45 && !$prox; $i++) { $d = date('Y-m-d', strtotime("+$i days")); $w = (int)date('N', strtotime($d)); if ($w === 7) continue;
                $n = (int)$pdo->query('SELECT COUNT(*) FROM ' . T('marcacoes') . " WHERE data = '$d' AND estado NOT IN ('Cancelada','Faltou')")->fetchColumn();
                if ($n < $vag) $prox = ['d' => $d, 'l' => $i === 1 ? 'amanhã' : ($i <= 6 ? $DS[$w] : date('d/m', strtotime($d)))]; }
            $ad = null;
            if (!empty($S['portal_ad'])) { $j = $pdo->query('SELECT t.fotos, t.extras, s.nome sn, v.marca, v.modelo FROM ' . T('trabalhos') . ' t LEFT JOIN ' . T('servicos') . ' s ON s.id = t.servico_id LEFT JOIN ' . T('veiculos') . ' v ON v.id = t.veiculo_id WHERE t.id = ' . (int)$S['portal_ad'])->fetch();
                if ($j) { $F = jdec($j['fotos']); $a1 = array_values(array_filter($F, fn($x) => ($x['tipo'] ?? '') === 'Antes'))[0]['f'] ?? null; $d1 = array_values(array_filter($F, fn($x) => ($x['tipo'] ?? '') === 'Depois'))[0]['f'] ?? null;
                    if ($a1 && $d1) $ad = ['antes' => $a1, 'depois' => $d1, 'titulo' => trim(($j['sn'] ?: $j['extras']) . ' · ' . trim($j['marca'] . ' ' . $j['modelo']), ' ·')]; } }
            $stats = ['trabalhos' => $nTrab, 'rating' => $rt && $rt['n'] ? round((float)$rt['a'], 1) : null, 'n_rating' => (int)($rt['n'] ?? 0), 'garantia_anos' => $gar ?: null, 'proxima_vaga' => $prox, 'ad' => $ad];
            $keys = ['app_nome', 'slogan', 'iva_isento', 'logo_inverter', 'link_facebook', 'empresa_nome', 'empresa_telefone', 'empresa_email', 'empresa_morada', 'empresa_web', 'cor', 'portal_titulo', 'portal_texto', 'portal_horario', 'portal_instagram', 'portal_whatsapp', 'link_avaliacao', 'portal_faq', 'empresa_desde', 'portal_ppf'];
            $reviews = array_values(array_map(fn($r) => ['texto' => $r['texto'], 'pontuacao' => (int)$r['pontuacao'], 'plataforma' => $r['plataforma']],
                array_filter(all_rows('avaliacoes'), fn($r) => $r['testemunho_ok'] && $r['texto'])));
            out(['info' => array_intersect_key($S, array_flip($keys)) + ['logo' => $S['logo'] ? 'api.php?a=logo' : ''], 'servicos' => $sv, 'avaliacoes' => array_slice($reviews, 0, 6), 'stats' => $stats]);
        }
        if ($a === 'pub_file') { // fotos de serviços públicos
            $f = basename((string)($_GET['f'] ?? ''));
            foreach (all_rows('servicos') as $r) if ($r['publico'] && in_array($f, array_column(jdec($r['fotos']), 'f'), true)) send_file($f);
            if (!empty($S['portal_ad'])) { $j = db()->query('SELECT fotos FROM ' . T('trabalhos') . ' WHERE id = ' . (int)$S['portal_ad'])->fetch(); // só a foto antes e a depois escolhidas
                if ($j) { $F = jdec($j['fotos']); foreach (['Antes', 'Depois'] as $tp) { $x = array_values(array_filter($F, fn($y) => ($y['tipo'] ?? '') === $tp))[0]['f'] ?? null; if ($x === $f) send_file($f); } } }
            http_response_code(404); exit;
        }
        if ($a === 'pub_request') {
            $b = body();
            if (!empty($b['website'])) out(['ok' => true]); // honeypot anti-spam
            $_SESSION['pub_req'] = array_filter($_SESSION['pub_req'] ?? [], fn($t) => $t > time() - 3600);
            if (count($_SESSION['pub_req']) >= 5) fail('Demasiados pedidos. Tente mais tarde ou contacte-nos por telefone.', 429);
            $cli = !empty($b['t']) ? portal_client((string)$b['t']) : null;
            $nome = trim((string)($b['nome'] ?? ($cli['nome'] ?? ''))); $tel = trim((string)($b['telefone'] ?? ($cli['telefone'] ?? '')));
            $email = trim((string)($b['email'] ?? ($cli['email'] ?? '')));
            if (mb_strlen($nome) < 2 || (mb_strlen($tel) < 9 && !filter_var($email, FILTER_VALIDATE_EMAIL))) fail('Indique o nome e um telemóvel ou email válido.');
            if (empty($b['rgpd']) && !$cli) fail('É necessário aceitar a política de privacidade para ser contactado.');
            $nomes = []; $val = 0;
            foreach (all_rows('servicos') as $r) if (in_array((int)$r['id'], array_map('intval', (array)($b['servicos'] ?? [])), true)) { $nomes[] = $r['nome']; $val += num($r['preco_medio']); }
            $veic = mb_substr(trim((string)($b['veiculo'] ?? '')), 0, 200);
            $periodo = in_array($b['periodo'] ?? '', ['Manhã', 'Tarde', 'Indiferente'], true) ? $b['periodo'] : null;
            seed_like_insert('leads', ['data' => date('Y-m-d'), 'estado' => 'Novo', 'nome' => mb_substr($nome, 0, 120), 'telefone' => mb_substr($tel, 0, 30), 'email' => mb_substr($email, 0, 120),
                'origem' => 'Portal do cliente', 'veiculo' => $veic, 'servico_interesse' => mb_substr(implode(', ', $nomes) ?: 'Pedido de contacto', 0, 255), 'valor_estimado' => $val ?: null,
                'data_preferida' => valid_date($b['data_preferida'] ?? ''), 'periodo' => $periodo, 'data_followup' => date('Y-m-d'), 'cliente_id' => $cli['id'] ?? null,
                'notas' => mb_substr(trim((string)($b['notas'] ?? '')), 0, 3000)]);
            $_SESSION['pub_req'][] = time();
            out(['ok' => true]);
        }
        $cli = portal_client((string)($_GET['t'] ?? body()['t'] ?? ''));
        if (!$cli) fail('Link de acesso inválido ou expirado. Peça um novo link à nossa equipa.', 404);
        if ($a === 'portal_me') {
            $cid = (int)$cli['id'];
            $sv = []; foreach (all_rows('servicos') as $r) $sv[$r['id']] = $r['nome'];
            $by = fn($e, $w = '') => db()->query('SELECT * FROM ' . T($e) . ' WHERE cliente_id = ' . $cid . $w . ' ORDER BY id DESC')->fetchAll();
            $veic = array_map(fn($v) => array_intersect_key($v, array_flip(['id', 'marca', 'modelo', 'ano', 'matricula', 'cor', 'protecao', 'ultimo_servico', 'proximo_servico'])), $by('veiculos'));
            $jobs = [];
            foreach ($by('trabalhos', " AND estado <> 'Cancelado'") as $j) {
                if ($j['portal_visivel'] !== null && !$j['portal_visivel']) continue;
                $jobs[] = ['id' => (int)$j['id'], 'numero' => $j['numero'], 'data' => $j['data'], 'data_entrega' => $j['data_entrega'], 'estado' => $j['estado'], 'veiculo_id' => (int)$j['veiculo_id'],
                    'servico' => $sv[$j['servico_id']] ?? '', 'extras' => $j['extras'], 'tarefas' => jdec($j['tarefas']), 'notas_servicos' => (object)jdec($j['notas_servicos']), 'fotos' => jdec($j['fotos']),
                    'notas_trabalho' => $j['notas_trabalho'], 'notas_aftercare' => $j['notas_aftercare'], 'valor' => $j['valor'] !== null ? round(num($j['valor']) * (1 + num(settings()['iva']) / 100), 2) : null];
            }
            $orc = array_map(fn($o) => ['id' => (int)$o['id'], 'numero' => $o['numero'], 'data' => $o['data'], 'validade' => $o['validade'], 'estado' => $o['estado'], 'veiculo_id' => (int)$o['veiculo_id'],
                'linhas' => jdec($o['linhas']), 'deslocacao' => $o['deslocacao'], 'desconto' => $o['desconto'], 'iva_pct' => $o['iva_pct'], 'notas' => $o['notas']] + lines_totals($o), $by('orcamentos', " AND estado <> 'Rascunho'"));
            $fat = array_values(array_map(fn($f) => ['numero' => $f['ref_externa'] ?: $f['numero'], 'data' => $f['data'], 'vencimento' => $f['vencimento'], 'estado' => $f['estado'], 'total' => $f['_c']['total'], 'em_divida' => $f['_c']['em_divida']],
                with_calc('faturas', $by('faturas', " AND estado <> 'Anulada'"))));
            $marc = array_map(fn($m) => ['data' => $m['data'], 'hora' => $m['hora'], 'estado' => $m['estado'], 'servico' => $sv[$m['servico_id']] ?? '', 'veiculo_id' => (int)$m['veiculo_id']],
                $by('marcacoes', " AND data >= '" . date('Y-m-d') . "' AND estado IN ('Pendente','Confirmada')"));
            $subs = array_map(fn($x) => ['plano' => $x['plano'], 'valor' => $x['valor'], 'frequencia' => $x['frequencia'], 'proxima_visita' => $x['proxima_visita'], 'veiculo_id' => (int)$x['veiculo_id']], $by('subscricoes', " AND estado = 'Ativa'"));
            $rev = db()->query('SELECT pontuacao, texto, data FROM ' . T('avaliacoes') . ' WHERE cliente_id = ' . $cid . " AND plataforma = 'Website' ORDER BY id DESC LIMIT 1")->fetch() ?: null;
            out(['cliente' => ['nome' => $cli['nome'], 'email' => $cli['email'], 'telefone' => $cli['telefone']], 'veiculos' => $veic, 'trabalhos' => $jobs, 'avaliacao' => $rev,
                 'links' => ['google' => settings()['link_avaliacao'], 'facebook' => settings()['link_facebook']],
                 'orcamentos' => $orc, 'faturas' => $fat, 'marcacoes' => $marc, 'subscricoes' => $subs, 'iban' => settings()['empresa_iban']]);
        }
        if ($a === 'portal_file') {
            $f = basename((string)($_GET['f'] ?? ''));
            foreach (['trabalhos', 'inspecoes'] as $e) foreach (db()->query('SELECT fotos FROM ' . T($e) . ' WHERE cliente_id = ' . (int)$cli['id'])->fetchAll() as $r)
                if (in_array($f, array_column(jdec($r['fotos']), 'f'), true)) send_file($f);
            http_response_code(404); exit;
        }
        if ($a === 'portal_review') {
            $b = body(); $plat = in_array($b['plataforma'] ?? '', ['Google', 'Facebook'], true) ? $b['plataforma'] : null;
            if ($plat) { // o cliente abriu o link do Google/Facebook
                $st = db()->prepare('SELECT COUNT(*) FROM ' . T('avaliacoes') . " WHERE cliente_id = ? AND plataforma = ? AND data >= ?");
                $st->execute([$cli['id'], $plat, date('Y-m-d', strtotime('-30 days'))]);
                if (!$st->fetchColumn()) seed_like_insert('avaliacoes', ['data' => date('Y-m-d'), 'tipo' => 'Avaliação', 'cliente_id' => $cli['id'], 'plataforma' => $plat, 'estado' => 'Pedido enviado',
                    'texto' => 'O cliente abriu o link de avaliação no portal.']);
                out(['ok' => true]);
            }
            $n = max(1, min(5, (int)($b['pontuacao'] ?? 0)));
            seed_like_insert('avaliacoes', ['data' => date('Y-m-d'), 'tipo' => 'Avaliação', 'cliente_id' => $cli['id'], 'plataforma' => 'Website', 'pontuacao' => $n,
                'estado' => 'Recebida', 'texto' => mb_substr(trim((string)($b['texto'] ?? '')), 0, 3000) ?: null, 'testemunho_ok' => !empty($b['testemunho']) ? 1 : 0]);
            out(['ok' => true, 'publica' => $n >= 4]);
        }
        if ($a === 'portal_accept') {
            $id = (int)(body()['id'] ?? 0);
            $st = db()->prepare('UPDATE ' . T('orcamentos') . " SET estado = 'Aceite', updated_at = ?, notas = CONCAT(COALESCE(notas,''), ?) WHERE id = ? AND cliente_id = ? AND estado = 'Enviado'");
            if (is_sqlite()) $st = db()->prepare('UPDATE ' . T('orcamentos') . " SET estado = 'Aceite', updated_at = ?, notas = COALESCE(notas,'') || ? WHERE id = ? AND cliente_id = ? AND estado = 'Enviado'");
            $st->execute([now(), "\n[Aceite pelo cliente no portal em " . date('d/m/Y H:i') . ']', $id, $cli['id']]);
            if (!$st->rowCount()) fail('Este orçamento já não pode ser aceite.');
            seed_like_insert('leads', ['data' => date('Y-m-d'), 'estado' => 'Ganho', 'nome' => $cli['nome'], 'telefone' => $cli['telefone'], 'email' => $cli['email'], 'origem' => 'Portal do cliente',
                'servico_interesse' => 'Orçamento aceite no portal — agendar trabalho', 'cliente_id' => $cli['id'], 'data_followup' => date('Y-m-d')]);
            out(['ok' => true]);
        }
        fail('Ação desconhecida.', 404);
    }

    /* ---- A partir daqui é preciso sessão ---- */
    if (!$user) fail('Sessão expirada. Inicie sessão novamente.', 401);
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF'] ?? '')) fail('Token de segurança inválido. Recarregue a página.', 403);

    if (($user['role'] ?? '') === 'tecnico') {
        $blocked = ['faturas', 'despesas', 'marketing', 'subscricoes', 'orcamentos', 'leads', 'receitas', 'objetivos'];
        if (in_array($a, ['dashboard', 'report', 'rep', 'backup', 'restore'], true) || in_array($_GET['e'] ?? '', $blocked, true)) fail('Sem permissão para esta área.', 403);
    }

    switch ($a) {
    case 'logout':
        $_SESSION = []; session_destroy(); out(['ok' => true]);

    case 'list':
        $e = $_GET['e'] ?? ''; $E = entity($e);
        $order = isset($E['sort']) ? ($E['sort'] . ' DESC, id DESC') : 'id DESC';
        $rows = db()->query('SELECT * FROM ' . T($e) . ' ORDER BY ' . $order . ' LIMIT 20000')->fetchAll();
        out(['rows' => with_calc($e, $rows)]);

    case 'save':
        $e = $_GET['e'] ?? ''; $E = entity($e);
        $in = body(); $id = (int)($in['id'] ?? 0); $vals = [];
        foreach ($E['fields'] as $f) {
            if (!array_key_exists($f['k'], $in)) continue;
            $vals[$f['k']] = clean_value($f, $in[$f['k']]);
            if (!empty($f['req']) && ($vals[$f['k']] === null || $vals[$f['k']] === '')) fail('Campo obrigatório: ' . $f['l']);
        }
        if (!$id && !empty($E['num']) && empty($vals['numero'])) $vals['numero'] = next_number($e, $E['num']);
        $pdo = db();
        $old = null; $prevM = ($e === 'marcacoes' && $id) ? $pdo->query('SELECT estado FROM ' . T('marcacoes') . ' WHERE id = ' . $id)->fetch() : null;
        unset($vals['historico'], $vals['timer_inicio'], $vals['assinado_em'], $vals['lancado'], $vals['produtos_usados'], $vals['timer_sessoes']);
        if ($e === 'trabalhos' && isset($vals['estado'])) {
            $old = $id ? $pdo->query('SELECT estado, historico, timer_inicio, horas FROM ' . T('trabalhos') . ' WHERE id = ' . $id)->fetch() : null;
            if (!$old || $old['estado'] !== $vals['estado']) {
                $h = jdec($old['historico'] ?? ''); $h[] = ['e' => $vals['estado'], 'em' => now(), 'por' => $user['nome'] ?: $user['email']];
                $vals['historico'] = json_encode($h, JSON_UNESCAPED_UNICODE);
                // Cronómetro automático: arranca nas etapas de execução e para ao sair delas
                $work = in_array($vals['estado'], WORK_STAGES, true);
                if ($work && empty($old['timer_inicio'])) $vals['timer_inicio'] = now();
                if (!$work && !empty($old['timer_inicio'])) {
                    $vals['horas'] = round(num($vals['horas'] ?? $old['horas']) + max(0, time() - strtotime($old['timer_inicio'])) / 3600, 2);
                    $vals['timer_inicio'] = null;
                }
            }
        }
        if ($e === 'inspecoes') {
            $old = $id ? $pdo->query('SELECT assinado_em FROM ' . T('inspecoes') . ' WHERE id = ' . $id)->fetch() : null;
            if (!empty($old['assinado_em'])) {
                if (empty($in['_desbloquear']) || ($user['role'] ?? '') === 'tecnico') fail('Esta ficha foi assinada pelo cliente e está bloqueada.');
                $vals['assinatura'] = null; $vals['assinado_em'] = null;
            } elseif (!empty($vals['assinatura'])) $vals['assinado_em'] = now();
        }
        if ($e === 'faturas' && isset($vals['pagamentos'])) {
            $pg = jdec($vals['pagamentos']); $last = end($pg) ?: [];
            $vals['valor_pago'] = round(array_sum(array_map(fn($x) => num($x['v'] ?? 0), $pg)), 2);
            $vals['metodo'] = in_array($last['m'] ?? '', METODOS, true) ? $last['m'] : null;
            $vals['data_pagamento'] = valid_date($last['d'] ?? '');
            $tot = lines_totals(array_merge($id ? ($pdo->query('SELECT * FROM ' . T('faturas') . ' WHERE id = ' . $id)->fetch() ?: []) : [], $vals))['total'];
            if (($vals['estado'] ?? '') !== 'Anulada') $vals['estado'] = $vals['valor_pago'] <= 0 ? 'Por pagar' : ($vals['valor_pago'] + 0.005 >= $tot ? 'Paga' : 'Parcial');
        }
        if ($id) {
            $vals['updated_at'] = now();
            $set = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($vals)));
            $pdo->prepare('UPDATE ' . T($e) . " SET $set WHERE id = ?")->execute([...array_values($vals), $id]);
        } else {
            $vals['created_at'] = $vals['updated_at'] = now(); $vals['created_by'] = $user['id'];
            $cols = implode(', ', array_map(fn($k) => "`$k`", array_keys($vals)));
            $q = implode(', ', array_fill(0, count($vals), '?'));
            $pdo->prepare('INSERT INTO ' . T($e) . " ($cols) VALUES ($q)")->execute(array_values($vals));
            $id = (int)$pdo->lastInsertId();
        }
        if ($e === 'trabalhos' && ($vals['estado'] ?? '') === 'Concluído' && ($old['estado'] ?? '') !== 'Concluído') sub_use_visit($id);
        if ($e === 'marcacoes' && ($vals['estado'] ?? '') === 'Faltou' && ($prevM['estado'] ?? '') !== 'Faltou') {
            $mm = $pdo->query('SELECT * FROM ' . T('marcacoes') . ' WHERE id = ' . $id)->fetch();
            if ($mm && $mm['sinal_pago'] && num($mm['sinal']) > 0)
                seed_like_insert('receitas', ['data' => date('Y-m-d'), 'categoria' => 'Sinais retidos (faltas)', 'descricao' => 'Sinal retido — falta à marcação de ' . date('d/m/Y', strtotime($mm['data'])), 'cliente_id' => $mm['cliente_id'], 'valor' => num($mm['sinal'])]);
        }
        // Atualiza último serviço do veículo quando o trabalho é concluído
        if ($e === 'trabalhos' && ($vals['estado'] ?? '') === 'Concluído') {
            $r = $pdo->query('SELECT veiculo_id, data FROM ' . T('trabalhos') . ' WHERE id = ' . $id)->fetch();
            if ($r && $r['veiculo_id']) $pdo->prepare('UPDATE ' . T('veiculos') . ' SET ultimo_servico = ? WHERE id = ? AND (ultimo_servico IS NULL OR ultimo_servico < ?)')->execute([$r['data'], $r['veiculo_id'], $r['data']]);
        }
        if ($e === 'compras') {
            $c = $pdo->query('SELECT * FROM ' . T('compras') . ' WHERE id = ' . $id)->fetch();
            if ($c && $c['estado'] === 'Recebida' && !$c['lancado']) {
                if ($c['artigo_id'] && num($c['quantidade']) > 0) $pdo->prepare('UPDATE ' . T('inventario') . ' SET quantidade = COALESCE(quantidade,0) + ? WHERE id = ?')->execute([num($c['quantidade']), $c['artigo_id']]);
                if ($c['criar_despesa']) {
                    $forn = $pdo->query('SELECT nome, nif FROM ' . T('fornecedores') . ' WHERE id = ' . (int)$c['fornecedor_id'])->fetch() ?: [];
                    $art = $c['artigo_id'] ? $pdo->query('SELECT nome FROM ' . T('inventario') . ' WHERE id = ' . (int)$c['artigo_id'])->fetchColumn() : '';
                    seed_like_insert('despesas', ['data' => $c['data'] ?: date('Y-m-d'), 'categoria' => 'Produtos / stock', 'descricao' => 'Compra' . ($art ? ': ' . $art : '') . ($c['documento'] ? ' (' . $c['documento'] . ')' : ''),
                        'fornecedor' => $forn['nome'] ?? null, 'nif_fornecedor' => $forn['nif'] ?? null, 'valor' => num($c['valor']), 'documento' => $c['documento']]);
                }
                $pdo->exec('UPDATE ' . T('compras') . ' SET lancado = 1 WHERE id = ' . $id);
            }
        }
        $row = $pdo->query('SELECT * FROM ' . T($e) . ' WHERE id = ' . $id)->fetch();
        out(['row' => with_calc($e, [$row])[0]]);

    case 'delete':
        $e = $_GET['e'] ?? ''; entity($e); $id = (int)(body()['id'] ?? 0);
        $uses = [];
        foreach (app_schema() as $k => $E2) foreach ($E2['fields'] as $f) if (($f['ref'] ?? '') === $e) {
            $n = (int)db()->query('SELECT COUNT(*) FROM ' . T($k) . ' WHERE `' . $f['k'] . '` = ' . $id)->fetchColumn();
            if ($n) $uses[] = "$n em " . $E2['label'];
        }
        if ($uses && empty(body()['force'])) out(['confirm' => 'Este registo está associado a: ' . implode(', ', $uses) . '. Eliminar mesmo assim? (as ligações ficam vazias)']);
        if ($uses) foreach (app_schema() as $k => $E2) foreach ($E2['fields'] as $f) if (($f['ref'] ?? '') === $e)
            db()->exec('UPDATE ' . T($k) . ' SET `' . $f['k'] . '` = NULL WHERE `' . $f['k'] . '` = ' . $id);
        db()->exec('DELETE FROM ' . T($e) . ' WHERE id = ' . $id);
        out(['ok' => true]);

    case 'timer':
        $id = (int)(body()['id'] ?? 0);
        $r = db()->query('SELECT timer_inicio, horas, estado FROM ' . T('trabalhos') . ' WHERE id = ' . $id)->fetch();
        if (!$r) fail('Trabalho não encontrado.');
        if ($r['timer_inicio']) db()->prepare('UPDATE ' . T('trabalhos') . ' SET timer_inicio = NULL, horas = ?, timer_sessoes = COALESCE(timer_sessoes,0) + 1 WHERE id = ?')->execute([round(num($r['horas']) + max(0, time() - strtotime($r['timer_inicio'])) / 3600, 2), $id]);
        else db()->prepare('UPDATE ' . T('trabalhos') . ' SET timer_inicio = ? WHERE id = ?')->execute([now(), $id]);
        $row = db()->query('SELECT * FROM ' . T('trabalhos') . ' WHERE id = ' . $id)->fetch();
        out(['row' => with_calc('trabalhos', [$row])[0]]);

    case 'stock_adj':
        $b = body(); $id = (int)($b['id'] ?? 0); $d = num($b['d'] ?? 0);
        $r = db()->query('SELECT quantidade FROM ' . T('inventario') . ' WHERE id = ' . $id)->fetch(); if (!$r) fail('Artigo não encontrado.');
        db()->prepare('UPDATE ' . T('inventario') . ' SET quantidade = ?, updated_at = ? WHERE id = ?')->execute([max(0, round(num($r['quantidade']) + $d, 3)), now(), $id]);
        out(['row' => with_calc('inventario', [db()->query('SELECT * FROM ' . T('inventario') . ' WHERE id = ' . $id)->fetch()])[0]]);

    case 'serviced':
        $id = (int)(body()['id'] ?? 0);
        $r = db()->query('SELECT * FROM ' . T('equipamentos') . ' WHERE id = ' . $id)->fetch(); if (!$r) fail('Equipamento não encontrado.');
        $est = in_array($r['estado'], ['Em manutenção', 'Avariado'], true) ? 'Operacional' : $r['estado'];
        $notas = trim(date('d/m/Y') . ' — revisão registada (' . ($user['nome'] ?? '') . ")\n" . (string)$r['notas']);
        db()->prepare('UPDATE ' . T('equipamentos') . ' SET ultima_manutencao = ?, estado = ?, notas = ?, updated_at = ? WHERE id = ?')->execute([date('Y-m-d'), $est, $notas, now(), $id]);
        out(['row' => with_calc('equipamentos', [db()->query('SELECT * FROM ' . T('equipamentos') . ' WHERE id = ' . $id)->fetch()])[0]]);

    case 'rep':
        if (empty($_GET['k'])) out(['groups' => rep_catalog()]);
        $f = valid_date($_GET['from'] ?? '') ?? date('Y-m-01'); $t = valid_date($_GET['to'] ?? '') ?? date('Y-m-t');
        out(rep_run((string)$_GET['k'], $f, $t));

    case 'renew_sub':
        $id = (int)(body()['id'] ?? 0); $pdo = db();
        $s = $pdo->query('SELECT * FROM ' . T('subscricoes') . ' WHERE id = ' . $id)->fetch(); if (!$s) fail('Subscrição não encontrada.');
        $step = ['Semanal' => '+7 days', 'Quinzenal' => '+14 days', 'Mensal' => '+1 month', 'Bimestral' => '+2 months', 'Trimestral' => '+3 months'][$s['frequencia']] ?? '+1 month';
        $from = max(date('Y-m-d'), (string)($s['validade'] ?: date('Y-m-d')));
        $nova = date('Y-m-d', strtotime($from . ' ' . $step));
        $pdo->prepare('UPDATE ' . T('subscricoes') . " SET validade = ?, visitas_usadas = 0, estado = 'Ativa', updated_at = ? WHERE id = ?")->execute([$nova, now(), $id]);
        $S = settings(); $num = next_number('faturas', 'fat');
        seed_like_insert('faturas', ['numero' => $num, 'data' => date('Y-m-d'), 'vencimento' => date('Y-m-d', strtotime('+8 days')), 'cliente_id' => $s['cliente_id'], 'estado' => 'Por pagar',
            'iva_pct' => $S['iva_isento'] === '1' ? 0 : num($S['iva']), 'valor_pago' => 0,
            'linhas' => json_encode([['d' => 'Subscrição ' . $s['plano'] . ' — ' . date('d/m/Y', strtotime($from)) . ' a ' . date('d/m/Y', strtotime($nova)), 'q' => 1, 'p' => num($s['valor'])]], JSON_UNESCAPED_UNICODE),
            'pagamentos' => '[]', 'notas' => 'Renovação de subscrição']);
        $row = $pdo->query('SELECT * FROM ' . T('subscricoes') . ' WHERE id = ' . $id)->fetch();
        out(['row' => with_calc('subscricoes', [$row])[0], 'fatura' => $num, 'validade' => $nova]);

    case 'job_product':
        $b = body(); $id = (int)($b['id'] ?? 0); $pdo = db();
        $j = $pdo->query('SELECT produtos_usados FROM ' . T('trabalhos') . ' WHERE id = ' . $id)->fetch();
        if (!$j) fail('Trabalho não encontrado.');
        $L = jdec($j['produtos_usados']);
        if (isset($b['remove'])) {
            $i = (int)$b['remove']; if (!isset($L[$i])) fail('Linha inexistente.');
            if (!empty($L[$i]['i'])) $pdo->prepare('UPDATE ' . T('inventario') . ' SET quantidade = COALESCE(quantidade,0) + ? WHERE id = ?')->execute([num($L[$i]['q']), (int)$L[$i]['i']]);
            array_splice($L, $i, 1);
        } else {
            $q = num($b['q'] ?? 1); if ($q <= 0) fail('Quantidade inválida.');
            $art = $pdo->query('SELECT * FROM ' . T('inventario') . ' WHERE id = ' . (int)($b['artigo_id'] ?? 0))->fetch();
            if (!$art) fail('Escolha um produto do inventário.');
            $pdo->prepare('UPDATE ' . T('inventario') . ' SET quantidade = COALESCE(quantidade,0) - ? WHERE id = ?')->execute([$q, $art['id']]);
            $L[] = ['i' => (int)$art['id'], 'd' => $art['nome'], 'q' => $q, 'u' => $art['unidade'], 'p' => round(num($art['custo_unitario']), 4), 'c' => round($q * num($art['custo_unitario']), 2)];
        }
        $custo = round(array_sum(array_map(fn($x) => num($x['c'] ?? 0), $L)), 2);
        $pdo->prepare('UPDATE ' . T('trabalhos') . ' SET produtos_usados = ?, custo_produtos = ?, updated_at = ? WHERE id = ?')->execute([json_encode($L, JSON_UNESCAPED_UNICODE), $custo, now(), $id]);
        $row = $pdo->query('SELECT * FROM ' . T('trabalhos') . ' WHERE id = ' . $id)->fetch();
        out(['row' => with_calc('trabalhos', [$row])[0]]);

    case 'remind_undo':
        $k = mb_substr((string)(body()['k'] ?? ''), 0, 80);
        $m = jdec(settings()['lembretes_ok']); unset($m[$k]); setting_set('lembretes_ok', json_encode((object)$m, JSON_UNESCAPED_UNICODE)); out(['ok' => true]);

    case 'remind_done':
        $k = mb_substr((string)(body()['k'] ?? ''), 0, 80); $b = body();
        $m = jdec(settings()['lembretes_ok']);
        $m[$k] = ['d' => date('Y-m-d H:i'), 'n' => mb_substr((string)($b['n'] ?? ''), 0, 80), 't' => mb_substr((string)($b['t'] ?? ''), 0, 60), 'x' => mb_substr((string)($b['x'] ?? ''), 0, 400), 'c' => mb_substr((string)($b['c'] ?? ''), 0, 20), 'p' => $user['nome'] ?? ''];
        if (count($m) > 800) $m = array_slice($m, -600, null, true);
        setting_set('lembretes_ok', json_encode($m, JSON_UNESCAPED_UNICODE));
        out(['ok' => true]);

    case 'vin':
        $vin = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($_GET['v'] ?? '')));
        if (strlen($vin) !== 17 || preg_match('/[IOQ]/', $vin)) fail('O VIN deve ter 17 caracteres (sem as letras I, O ou Q).');
        out(vin_decode($vin));

    case 'badges':
        $t = date('Y-m-d'); $c = fn($sql) => (int)db()->query($sql)->fetchColumn();
        $fat = 0; foreach (with_calc('faturas', all_rows('faturas')) as $f) if ($f['_c']['vencida']) $fat++;
        $gar = 0; foreach (with_calc('garantias', all_rows('garantias')) as $g) if (str_starts_with($g['_c']['alerta'], 'Manutenção')) $gar++;
        $stock = 0; foreach (with_calc('inventario', all_rows('inventario')) as $i) if ($i['_c']['alerta']) $stock++;
        out(['#/quadro' => $c('SELECT COUNT(*) FROM ' . T('trabalhos') . " WHERE estado NOT IN ('Concluído','Cancelado','Agendado')"),
             'faturas' => $fat, 'garantias' => $gar, 'inventario' => $stock,
             'equipamentos' => count(array_filter(with_calc('equipamentos', all_rows('equipamentos')), fn($q) => $q['_c']['seg_due'] || $q['_c']['seg_rep'])),
             'leads' => $c('SELECT COUNT(*) FROM ' . T('leads') . " WHERE estado NOT IN ('Ganho','Perdido') AND data_followup <= '$t'"),
             '#/lembretes' => $c('SELECT COUNT(*) FROM ' . T('marcacoes') . " WHERE estado IN ('Pendente','Confirmada') AND data BETWEEN '$t' AND '" . date('Y-m-d', strtotime('+2 days')) . "' AND (lembrete_enviado IS NULL OR lembrete_enviado = 0)"),
             'marcacoes' => $c('SELECT COUNT(*) FROM ' . T('marcacoes') . " WHERE data = '$t' AND estado IN ('Pendente','Confirmada')"), '#/garantias' => $gar]);

    case 'clean_uploads':
        need_admin();
        $blob = json_encode(settings());
        foreach (array_keys(app_schema()) as $e) foreach (db()->query('SELECT * FROM ' . T($e))->fetchAll() as $r) $blob .= json_encode($r, JSON_UNESCAPED_SLASHES);
        $n = 0; $bytes = 0;
        foreach (glob(__DIR__ . '/uploads/*') ?: [] as $f) { $b = basename($f); if (!is_file($f) || $b[0] === '.' || str_contains($blob, $b)) continue; $bytes += filesize($f); if (@unlink($f)) $n++; }
        out(['apagados' => $n, 'mb' => round($bytes / 1048576, 2)]);

    case 'reset':
        need_admin();
        $modo = body()['modo'] ?? '';
        if (!in_array($modo, ['vazio', 'base', 'demo', 'av'], true)) fail('Opção inválida.');
        $pdo = db(); foreach (array_keys(app_schema()) as $e) $pdo->exec('DELETE FROM ' . T($e));
        setting_set('lembretes_ok', '{}');
        require_once __DIR__ . '/inc/seed.php';
        $nome = $user['nome'] ?? 'Proprietário';
        if ($modo === 'av') { require_once __DIR__ . '/inc/demo_av.php'; seed_av($nome); }
        elseif ($modo !== 'vazio') { seed_base($nome); if ($modo === 'demo') seed_demo(); }
        out(['ok' => true]);

    case 'wipe':
        need_admin();
        $keep = ['servicos', 'mensagens', 'equipa', 'fornecedores', 'inventario', 'equipamentos'];
        if (!empty(body()['tudo'])) $keep = ['servicos', 'mensagens'];
        $pdo = db(); $pdo->beginTransaction();
        foreach (array_keys(app_schema()) as $e) if (!in_array($e, $keep, true)) $pdo->exec('DELETE FROM ' . T($e));
        $pdo->commit();
        setting_set('lembretes_ok', '{}');
        out(['ok' => true, 'mantidos' => $keep]);

    case 'client_link':
        $id = (int)(body()['id'] ?? 0);
        $tok = db()->query('SELECT portal_token FROM ' . T('clientes') . ' WHERE id = ' . $id)->fetchColumn();
        if (!$tok || !empty(body()['novo'])) {
            $tok = bin2hex(random_bytes(16));
            db()->prepare('UPDATE ' . T('clientes') . ' SET portal_token = ? WHERE id = ?')->execute([$tok, $id]);
        }
        out(['token' => $tok]);

    case 'dashboard':
        $m = preg_match('/^\d{4}-\d{2}$/', $_GET['m'] ?? '') ? $_GET['m'] : date('Y-m');
        out(dashboard($m));

    case 'report':
        $f = valid_date($_GET['from'] ?? '') ?? date('Y-m-01'); $t = valid_date($_GET['to'] ?? '') ?? date('Y-m-t');
        out(report($f, $t));

    case 'settings':
        need_admin();
        $allowed = array_keys(default_settings());
        foreach (body() as $k => $v) if (in_array($k, $allowed, true)) setting_set($k, is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : mb_substr((string)$v, 0, 5000));
        out(['ok' => true]);

    case 'upload':
        if (empty($_FILES['f']) || $_FILES['f']['error'] !== UPLOAD_ERR_OK) fail('Falha no envio do ficheiro.');
        if ($_FILES['f']['size'] > 8 * 1024 * 1024) fail('Ficheiro demasiado grande (máx. 8 MB).');
        $info = @getimagesize($_FILES['f']['tmp_name']);
        $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'][$info[2] ?? 0] ?? null;
        if (!$ext) fail('Apenas imagens JPG, PNG, WebP ou GIF.');
        $name = date('Ym') . '_' . bin2hex(random_bytes(12)) . '.' . $ext;
        if (!move_uploaded_file($_FILES['f']['tmp_name'], APP_ROOT . '/uploads/' . $name)) fail('Não foi possível guardar o ficheiro. Verifique permissões da pasta uploads/.');
        out(['f' => $name]);

    case 'file':
        send_file((string)($_GET['f'] ?? ''));

    case 'password':
        $b = body();
        if (strlen((string)($b['new'] ?? '')) < 8) fail('A nova palavra-passe deve ter pelo menos 8 caracteres.');
        $u = db()->query('SELECT pass FROM ' . T('users') . ' WHERE id = ' . (int)$user['id'])->fetch();
        if (!$u || !password_verify((string)($b['old'] ?? ''), $u['pass'])) fail('Palavra-passe atual incorreta.');
        db()->prepare('UPDATE ' . T('users') . ' SET pass = ? WHERE id = ?')->execute([password_hash($b['new'], PASSWORD_DEFAULT), $user['id']]);
        out(['ok' => true]);

    case 'users':
        need_admin();
        out(['rows' => db()->query('SELECT id, nome, email, role, ativo, last_login FROM ' . T('users') . ' ORDER BY nome')->fetchAll()]);

    case 'user_save':
        need_admin(); $b = body(); $id = (int)($b['id'] ?? 0);
        $email = strtolower(trim((string)($b['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Email inválido.');
        $role = in_array($b['role'] ?? '', ['admin', 'gestor', 'tecnico'], true) ? $b['role'] : 'tecnico';
        $nome = trim((string)($b['nome'] ?? ''));
        $ativo = !empty($b['ativo']) ? 1 : 0;
        if ($id === $user['id'] && ($role !== 'admin' || !$ativo)) fail('Não pode retirar a si próprio o acesso de administrador.');
        if ($id) {
            db()->prepare('UPDATE ' . T('users') . ' SET nome=?, email=?, role=?, ativo=? WHERE id=?')->execute([$nome, $email, $role, $ativo, $id]);
        } else {
            if (strlen((string)($b['pass'] ?? '')) < 8) fail('A palavra-passe deve ter pelo menos 8 caracteres.');
            db()->prepare('INSERT INTO ' . T('users') . ' (nome, email, role, ativo, pass, created_at) VALUES (?,?,?,?,?,?)')->execute([$nome, $email, $role, $ativo, password_hash($b['pass'], PASSWORD_DEFAULT), now()]);
            $id = (int)db()->lastInsertId();
        }
        if ($id && !empty($b['pass']) && !empty($b['id'])) {
            if (strlen($b['pass']) < 8) fail('A palavra-passe deve ter pelo menos 8 caracteres.');
            db()->prepare('UPDATE ' . T('users') . ' SET pass=? WHERE id=?')->execute([password_hash($b['pass'], PASSWORD_DEFAULT), $id]);
        }
        out(['ok' => true]);

    case 'user_delete':
        need_admin(); $id = (int)(body()['id'] ?? 0);
        if ($id === $user['id']) fail('Não pode eliminar a sua própria conta.');
        db()->exec('DELETE FROM ' . T('users') . ' WHERE id = ' . $id); out(['ok' => true]);

    case 'backup':
        need_admin();
        $data = ['app' => 'detailpro', 'version' => APP_VERSION, 'date' => now(), 'settings' => settings(), 'tables' => []];
        foreach (array_keys(app_schema()) as $e) $data['tables'][$e] = all_rows($e, 'id ASC');
        header('Content-Disposition: attachment; filename="backup-' . date('Y-m-d-His') . '.json"');
        echo json_encode($data, JSON_UNESCAPED_UNICODE); exit;

    case 'restore':
        need_admin(); $b = body();
        if (($b['app'] ?? '') !== 'detailpro' || !is_array($b['tables'] ?? null)) fail('Ficheiro de cópia de segurança inválido.');
        $pdo = db(); $pdo->beginTransaction();
        foreach (app_schema() as $e => $E) {
            if (!isset($b['tables'][$e])) continue;
            $pdo->exec('DELETE FROM ' . T($e));
            $cols = array_merge(['id', 'created_at', 'updated_at', 'created_by'], array_column($E['fields'], 'k'));
            foreach ($b['tables'][$e] as $r) {
                $r = array_intersect_key($r, array_flip($cols));
                if (!$r) continue;
                $pdo->prepare('INSERT INTO ' . T($e) . ' (' . implode(',', array_map(fn($k) => "`$k`", array_keys($r))) . ') VALUES (' . implode(',', array_fill(0, count($r), '?')) . ')')->execute(array_values($r));
            }
        }
        foreach (($b['settings'] ?? []) as $k => $v) if (array_key_exists($k, default_settings())) setting_set($k, $v);
        $pdo->commit();
        out(['ok' => true]);
    }
    fail('Ação desconhecida.', 404);
} catch (Throwable $ex) {
    error_log('[DetailPro] ' . $ex->getMessage() . ' @ ' . $ex->getFile() . ':' . $ex->getLine());
    fail(cfg('debug') ? $ex->getMessage() : 'Erro interno do servidor. Consulte o registo de erros.', 500);
}

/* ---------- Auxiliares ---------- */
/** Ao concluir um trabalho, regista uma visita na subscrição ativa do cliente (se o serviço estiver incluído no plano). */
function sub_use_visit(int $jobId): void {
    $pdo = db(); $j = $pdo->query('SELECT cliente_id, servico_id, servicos FROM ' . T('trabalhos') . ' WHERE id = ' . $jobId)->fetch();
    if (!$j || !$j['cliente_id']) return;
    $svc = array_map('intval', array_merge(jdec($j['servicos']), [$j['servico_id']]));
    foreach ($pdo->query('SELECT s.*, p.servicos AS plano_svc FROM ' . T('subscricoes') . ' s LEFT JOIN ' . T('planos') . ' p ON p.id = s.plano_id WHERE s.estado = \'Ativa\' AND s.cliente_id = ' . (int)$j['cliente_id'])->fetchAll() as $s) {
        $inc = array_map('intval', jdec($s['plano_svc'] ?? ''));
        if ($inc && !array_intersect($inc, $svc)) continue;
        if ((int)$s['visitas_incluidas'] > 0 && (int)$s['visitas_usadas'] >= (int)$s['visitas_incluidas']) continue;
        $pdo->prepare('UPDATE ' . T('subscricoes') . ' SET visitas_usadas = COALESCE(visitas_usadas,0) + 1 WHERE id = ?')->execute([$s['id']]);
        return;
    }
}
function img_mime(string $p): string {
    $m = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'][strtolower(pathinfo($p, PATHINFO_EXTENSION))] ?? null;
    return $m ?: (function_exists('mime_content_type') ? (mime_content_type($p) ?: 'application/octet-stream') : 'application/octet-stream');
}
/** Descodifica um VIN: base gratuita da NHTSA (vPIC) e, sem rede, tabela local de fabricantes (WMI). */
function vin_decode(string $vin): array {
    $out = ['vin' => $vin, 'fonte' => 'local', 'marca' => null, 'modelo' => null, 'ano' => null, 'carrocaria' => null, 'combustivel' => null, 'motor' => null, 'pais' => null, 'tamanho' => null];
    $url = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/' . rawurlencode($vin) . '?format=json';
    $raw = null;
    if (function_exists('curl_init')) {
        $ch = curl_init($url); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_USERAGENT => 'DetailPro/1.0']);
        $raw = curl_exec($ch) ?: null; curl_close($ch);
    } elseif (ini_get('allow_url_fopen')) {
        $raw = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 8]])) ?: null;
    }
    $r = $raw ? (json_decode($raw, true)['Results'][0] ?? null) : null;
    if ($r && !empty($r['Make'])) {
        $tc = fn($s) => $s ? mb_convert_case(mb_strtolower(trim($s)), MB_CASE_TITLE) : null;
        $make = $tc($r['Make']); if (in_array(strtoupper($r['Make']), ['BMW', 'MINI', 'GMC', 'KTM', 'MG', 'DS'], true)) $make = strtoupper($r['Make']);
        $fuel = ['Gasoline' => 'Gasolina', 'Diesel' => 'Gasóleo', 'Electric' => 'Elétrico', 'Flexible Fuel Vehicle (FFV)' => 'Flex'][$r['FuelTypePrimary'] ?? ''] ?? ($r['FuelTypePrimary'] ?: null);
        $motor = trim(($r['DisplacementL'] ? round((float)$r['DisplacementL'], 1) . ' L' : '') . ($r['EngineCylinders'] ? ' · ' . $r['EngineCylinders'] . ' cil.' : '') . ($r['EngineHP'] ?? '' ? ' · ' . round((float)$r['EngineHP']) . ' cv' : ''), ' ·');
        $out = array_merge($out, ['fonte' => 'NHTSA vPIC', 'marca' => $make, 'modelo' => trim(($r['Model'] ?? '') . ' ' . ($r['Trim'] ?? '')) ?: null,
            'ano' => (int)$r['ModelYear'] ?: null, 'carrocaria' => $r['BodyClass'] ?: null, 'combustivel' => $fuel, 'motor' => $motor ?: null, 'pais' => str_replace(['United States (Usa)', 'Germany', 'Japan', 'France', 'Italy', 'Spain', 'United Kingdom (Uk)', 'Sweden', 'South Africa', 'Mexico', 'China', 'South Korea', 'Hungary', 'Slovakia', 'Czech Republic', 'Belgium', 'Portugal'],
            ['EUA', 'Alemanha', 'Japão', 'França', 'Itália', 'Espanha', 'Reino Unido', 'Suécia', 'África do Sul', 'México', 'China', 'Coreia do Sul', 'Hungria', 'Eslováquia', 'Rep. Checa', 'Bélgica', 'Portugal'], (string)$tc($r['PlantCountry'] ?? '')) ?: null]);
    }
    if (!$out['marca']) {
        $W = ['WVW' => 'Volkswagen', 'WV1' => 'Volkswagen', 'WV2' => 'Volkswagen', 'WBA' => 'BMW', 'WBS' => 'BMW', 'WBY' => 'BMW', 'WMW' => 'MINI', 'WDB' => 'Mercedes-Benz', 'WDD' => 'Mercedes-Benz', 'W1K' => 'Mercedes-Benz', 'W1N' => 'Mercedes-Benz', 'WDC' => 'Mercedes-Benz',
            'WAU' => 'Audi', 'WUA' => 'Audi', 'WP0' => 'Porsche', 'WP1' => 'Porsche', 'VF1' => 'Renault', 'VF3' => 'Peugeot', 'VR3' => 'Peugeot', 'VF7' => 'Citroën', 'VR7' => 'Citroën', 'VR1' => 'DS', 'ZFA' => 'Fiat', 'ZAR' => 'Alfa Romeo', 'ZFF' => 'Ferrari', 'ZHW' => 'Lamborghini',
            'VSS' => 'Seat', 'VSE' => 'Seat', 'TMB' => 'Škoda', 'SAL' => 'Land Rover', 'SAJ' => 'Jaguar', 'SCC' => 'Lotus', 'SCF' => 'Aston Martin', 'YV1' => 'Volvo', 'YV4' => 'Volvo', '5YJ' => 'Tesla', '7SA' => 'Tesla', 'XP7' => 'Tesla', 'LRW' => 'Tesla',
            'JMZ' => 'Mazda', 'JMB' => 'Mitsubishi', 'JT' => 'Toyota', 'SB1' => 'Toyota', 'NMT' => 'Toyota', 'VNK' => 'Toyota', 'JHM' => 'Honda', 'SHH' => 'Honda', 'JN1' => 'Nissan', 'SJN' => 'Nissan', 'VSK' => 'Nissan', 'KMH' => 'Hyundai', 'TMA' => 'Hyundai', 'KNA' => 'Kia', 'U5Y' => 'Kia',
            'WF0' => 'Ford', 'W0L' => 'Opel', 'W0V' => 'Opel', 'JS' => 'Suzuki', 'TSM' => 'Suzuki', 'UU1' => 'Dacia', 'VNV' => 'Renault', 'LSJ' => 'MG', 'LB3' => 'Geely', 'LGX' => 'BYD', 'ZDM' => 'Ducati', 'JYA' => 'Yamaha', 'VBK' => 'KTM'];
        $out['marca'] = $W[substr($vin, 0, 3)] ?? $W[substr($vin, 0, 2)] ?? null;
        // Fabricantes europeus nem sempre codificam o ano no VIN — por isso não o estimamos aqui.
        $C = ['W' => 'Alemanha', 'VF' => 'França', 'VR' => 'França', 'VS' => 'Espanha', 'VN' => 'França', 'Z' => 'Itália', 'TM' => 'Rep. Checa', 'TS' => 'Hungria', 'S' => 'Reino Unido', 'Y' => 'Suécia', 'J' => 'Japão', 'K' => 'Coreia do Sul', 'L' => 'China', 'U' => 'Roménia', '1' => 'EUA', '4' => 'EUA', '5' => 'EUA', '7' => 'EUA', 'X' => 'Rússia / UE'];
        $out['pais'] = $C[substr($vin, 0, 2)] ?? $C[$vin[0]] ?? null;
    }
    $b = strtolower((string)$out['carrocaria']);
    $out['tamanho'] = str_contains($b, 'motorcycle') ? 'Mota' : (preg_match('/sport utility|suv|crossover/', $b) ? 'SUV' : (preg_match('/pickup|van|minivan|bus/', $b) ? 'Carrinha / Monovolume' : (preg_match('/hatchback/', $b) ? 'Pequeno' : null)));
    if (!$out['marca']) fail('Não foi possível identificar este VIN. Verifique os 17 caracteres.');
    return $out;
}

function portal_client(string $t): ?array {
    if (!preg_match('/^[a-f0-9]{32}$/', $t)) return null;
    $st = db()->prepare('SELECT * FROM ' . T('clientes') . ' WHERE portal_token = ?'); $st->execute([$t]);
    return $st->fetch() ?: null;
}
function send_file(string $f): void {
    $p = APP_ROOT . '/uploads/' . basename($f);
    if (!preg_match('/^[\w.-]+\.(jpg|png|webp|gif)$/', basename($p)) || !is_file($p)) { http_response_code(404); exit; }
    header('Content-Type: ' . img_mime($p)); header('Cache-Control: private, max-age=86400'); readfile($p); exit;
}
function seed_like_insert(string $e, array $r): int {
    $r = array_filter($r, fn($v) => $v !== null);
    $r['created_at'] = $r['updated_at'] = now();
    $cols = implode(',', array_map(fn($k) => "`$k`", array_keys($r)));
    db()->prepare('INSERT INTO ' . T($e) . " ($cols) VALUES (" . implode(',', array_fill(0, count($r), '?')) . ')')->execute(array_values($r));
    return (int)db()->lastInsertId();
}
function valid_date($v): ?string { return is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null; }

function clean_value(array $f, $v) {
    if ($v === '' || $v === null) return in_array($f['t'], ['bool'], true) ? 0 : null;
    switch ($f['t']) {
        case 'money': case 'number': $v = str_replace(',', '.', (string)$v); return is_numeric($v) ? round((float)$v, 4) : null;
        case 'int': case 'ref': case 'rating': return is_numeric($v) ? (int)$v : null;
        case 'bool': return $v ? 1 : 0;
        case 'date': return valid_date($v);
        case 'time': return preg_match('/^\d{2}:\d{2}$/', (string)$v) ? $v : null;
        case 'select': return in_array($v, $f['opts'], true) ? $v : null;
        case 'svcpick': return is_array($v) ? json_encode(array_values(array_map('intval', $v))) : null;
        case 'jsonmap': return is_array($v) ? json_encode((object)array_map(fn($x) => mb_substr((string)$x, 0, 5000), $v), JSON_UNESCAPED_UNICODE) : null;
        case 'lines': case 'checklist': case 'photos': case 'timeline': case 'payments': case 'damagemap': return is_array($v) ? json_encode(array_values($v), JSON_UNESCAPED_UNICODE) : null;
        case 'signature': return (is_string($v) && str_starts_with($v, 'data:image/png;base64,') && strlen($v) < 600000) ? $v : null;
        case 'textarea': return mb_substr(trim((string)$v), 0, 20000);
        case 'color': return preg_match('/^#[0-9a-f]{6}$/i', (string)$v) ? $v : null;
        default: return mb_substr(trim((string)$v), 0, 255);
    }
}

function next_number(string $e, string $kind): string {
    $S = settings();
    $prefix = preg_replace('/[^A-Z0-9]/i', '', $S['prefixo_' . $kind] ?? strtoupper($kind)) . '-' . date('Y') . '-';
    $st = db()->prepare('SELECT numero FROM ' . T($e) . ' WHERE numero LIKE ?'); $st->execute([$prefix . '%']);
    $max = 0; foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $n) $max = max($max, (int)substr($n, strlen($prefix)));
    return $prefix . str_pad((string)($max + 1), 4, '0', STR_PAD_LEFT);
}
