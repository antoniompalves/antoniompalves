<?php
/* Cálculos automáticos: totais, lucros, alertas, painel e relatórios. */

function all_rows(string $e, string $order = 'id DESC'): array {
    return db()->query('SELECT * FROM ' . T($e) . ' ORDER BY ' . $order)->fetchAll();
}
function jdec($v): array { $d = json_decode((string)$v, true); return is_array($d) ? $d : []; }

function lines_totals(array $r): array {
    $sub = 0.0;
    foreach (jdec($r['linhas'] ?? '') as $l) $sub += num($l['q'] ?? 1) * num($l['p'] ?? 0);
    $sub += num($r['deslocacao'] ?? 0);
    $dp = round($sub * num($r['desconto_pct'] ?? 0) / 100, 2);
    $sub -= $dp + num($r['desconto'] ?? 0);
    $iva = round($sub * num($r['iva_pct'] ?? 0) / 100, 2);
    return ['subtotal' => round($sub, 2), 'desc_pct' => $dp, 'iva' => $iva, 'total' => round($sub + $iva + num($r['gorjeta'] ?? 0), 2)];
}

function paid_amount(array $r): float {
    $p = jdec($r['pagamentos'] ?? '');
    if ($p) return round(array_sum(array_map(fn($x) => num($x['v'] ?? 0), $p)), 2);
    return num($r['valor_pago'] ?? 0);
}
/** Lista de pagamentos [data, valor, método] de um documento (compatível com registos antigos). */
function payment_list(array $r): array {
    $p = jdec($r['pagamentos'] ?? '');
    if ($p) return array_map(fn($x) => ['d' => $x['d'] ?? $r['data'], 'v' => num($x['v'] ?? 0), 'm' => $x['m'] ?? ''], $p);
    return num($r['valor_pago']) > 0 ? [['d' => $r['data_pagamento'] ?: $r['data'], 'v' => num($r['valor_pago']), 'm' => $r['metodo'] ?? '']] : [];
}
function warranty_info(array $r): array {
    $c = ['validade' => null, 'proxima' => null, 'alerta' => '', 'visitas' => []];
    if (empty($r['data'])) return $c;
    $c['validade'] = date('Y-m-d', strtotime($r['data'] . ' +' . max(1, (int)$r['anos']) . ' years'));
    $int = max(1, (int)($r['intervalo_meses'] ?: 12));
    for ($k = 1; $k <= 40; $k++) { $d = date('Y-m-d', strtotime($r['data'] . ' +' . ($k * $int) . ' months')); if ($d > $c['validade']) break; $c['visitas'][] = $d; }
    $last = $r['ultima_manutencao'] ?: $r['data'];
    foreach ($c['visitas'] as $d) if ($d > date('Y-m-d', strtotime($last . ' +30 days'))) { $c['proxima'] = $d; break; }
    $today = date('Y-m-d');
    if ($c['validade'] < $today) $c['alerta'] = 'Expirada';
    elseif ($c['proxima'] && $c['proxima'] < $today) $c['alerta'] = 'Manutenção em atraso';
    elseif ($c['proxima'] && $c['proxima'] <= date('Y-m-d', strtotime('+' . max(1, (int)(settings()['gar_aviso_dias'] ?? 30)) . ' days'))) $c['alerta'] = 'Manutenção em breve';
    return $c;
}
function goal_progress(array $r): array {
    static $cache = [];
    $base = (string)($r['mes'] ?: date('Y-m-d')); $ym = substr($base, 0, 7); $Y = (int)substr($base, 0, 4);
    switch ($r['periodo'] ?? 'Mês') {
        case 'Trimestre': $q = intdiv((int)substr($base, 5, 2) - 1, 3); $from = sprintf('%04d-%02d-01', $Y, $q * 3 + 1); $to = month_bounds(sprintf('%04d-%02d', $Y, $q * 3 + 3))[1]; break;
        case 'Ano': $from = "$Y-01-01"; $to = "$Y-12-31"; break;
        case 'Personalizado': $from = $base; $to = max($base, (string)($r['data_fim'] ?: $base)); break;
        default: [$from, $to] = month_bounds($ym);
    }
    $p = $cache["$from|$to"] ??= period_totals($from, $to);
    $cnt = fn($e, $col = 'data', $w = '') => (int)db()->query('SELECT COUNT(*) FROM ' . T($e) . " WHERE $col BETWEEN '$from' AND '$to 23:59:59'$w")->fetchColumn();
    // trabalhos concluídos no período que correspondem aos serviços / categoria escolhidos
    static $JB = null, $SC = null;
    if ($JB === null) { $JB = with_calc('trabalhos', all_rows('trabalhos')); $SC = array_column(db()->query('SELECT id, categoria FROM ' . T('servicos'))->fetchAll(), 'categoria', 'id'); }
    $alvoS = array_map('intval', jdec($r['servicos_alvo'] ?? '')); $cat = (string)($r['categoria_alvo'] ?? '');
    $match = function ($j) use ($alvoS, $cat, $SC) { $ids = array_map('intval', jdec($j['servicos'] ?? '')); if (!empty($j['servico_id'])) $ids[] = (int)$j['servico_id'];
        if ($alvoS && !array_intersect($ids, $alvoS)) return false; if ($cat !== '' && !array_filter($ids, fn($i) => ($SC[$i] ?? '') === $cat)) return false; return true; };
    $MJ = array_values(array_filter($JB, fn($j) => $j['estado'] === 'Concluído' && $j['data'] >= $from && $j['data'] <= $to && $match($j)));
    $filt = $alvoS || $cat !== '';
    switch ($r['metrica']) {
        case 'Trabalhos concluídos': $v = count($MJ); $m = 0; break;
        case 'Receita dos trabalhos': $v = array_sum(array_map(fn($j) => num($j['valor']), $MJ)); $m = 1; break;
        case 'Lucro dos trabalhos': $v = array_sum(array_map(fn($j) => $j['_c']['lucro'], $MJ)); $m = 1; break;
        case 'Horas de trabalho': $v = round(array_sum(array_map(fn($j) => num($j['horas']), $MJ)), 1); $m = 0; break;
        case 'Ticket médio': $v = $filt ? (count($MJ) ? array_sum(array_map(fn($j) => num($j['valor']), $MJ)) / count($MJ) : 0) : $p['ticket_medio']; $m = 1; break;
        case 'Receita (total do período)': case 'Receita': $v = $p['receita']; $m = 1; break;
        case 'Lucro bruto': $v = $p['lucro_bruto']; $m = 1; break;
        case 'Lucro operacional': $v = $p['lucro_operacional']; $m = 1; break;

        case 'Novos clientes': $v = $cnt('clientes', 'created_at'); $m = 0; break;
        case 'Novas leads': $v = $cnt('leads'); $m = 0; break;
        case 'Avaliações recebidas': $v = $cnt('avaliacoes', 'data', " AND estado = 'Recebida'"); $m = 0; break;
        case 'Proteções cerâmicas aplicadas': $v = $cnt('garantias'); $m = 0; break;
        case 'Recebido (pagamentos)':
            $v = 0; foreach (all_rows('faturas') as $f) if ($f['estado'] !== 'Anulada') foreach (payment_list($f) as $pp) if ($pp['d'] >= $from && $pp['d'] <= $to) $v += $pp['v'];
            foreach (all_rows('receitas') as $x) if ($x['data'] >= $from && $x['data'] <= $to) $v += num($x['valor']); $m = 1; break;
        case 'Receita recorrente (MRR)':
            $v = 0; foreach (all_rows('subscricoes') as $s) if ($s['estado'] === 'Ativa') $v += num($s['valor']) * (FREQ_MES[$s['frequencia']] ?? 1); $m = 1; break;
        default: $v = count($MJ); $m = 0;
    }
    $alvo = num($r['alvo']);
    $fmt = fn($x) => $m ? number_format($x, 0, ',', '.') . ' €' : rtrim(rtrim(number_format($x, 1, ',', '.'), '0'), ',');
    $pct = $alvo > 0 ? round($v / $alvo * 100, 1) : null;
    return ['valor' => round($v, 2), 'atual' => $m ? number_format($v, 2, ',', '.') . ' €' : (string)$v, 'pct' => $pct, 'dinheiro' => $m, 'from' => $from, 'to' => $to,
            'sub' => pt_d($from) . ' – ' . pt_d($to) . ' · ' . $r['metrica'] . ($alvoS ? ' · ' . implode(', ', array_filter(array_map(fn($i) => goal_svc_name($i), $alvoS))) : '') . ($cat !== '' ? ' · categoria ' . $cat : ''), 'prog' => ['a' => $fmt($v) . ' / ' . $fmt($alvo), 'p' => $pct ?? 0]];
}
function goal_svc_name(int $id): string { static $N = null; $N ??= array_column(db()->query('SELECT id, nome FROM ' . T('servicos'))->fetchAll(), 'nome', 'id'); return $N[$id] ?? ''; }
function pt_d($d): string { static $M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return $d ? (int)substr((string)$d, 8, 2) . ' ' . $M[(int)substr((string)$d, 5, 2) - 1] : ''; }
const FREQ_MES = ['Semanal' => 4.33, 'Quinzenal' => 2.17, 'Mensal' => 1, 'Bimestral' => 0.5, 'Trimestral' => 0.3333];

function calc_ctx(): array {
    static $ctx = null;
    if ($ctx !== null) return $ctx;
    $S = settings();
    $ctx = ['S' => $S, 'tec' => [], 'kmjob' => [], 'cli' => []];
    $ctx['veic'] = [];
    foreach (db()->query('SELECT cliente_id, veiculo_id, estado, valor, data FROM ' . T('trabalhos'))->fetchAll() as $j) {
        if ($j['estado'] !== 'Cancelado' && $j['veiculo_id']) $ctx['veic'][$j['veiculo_id']]['n'] = ($ctx['veic'][$j['veiculo_id']]['n'] ?? 0) + 1;
        if ($j['estado'] !== 'Concluído') continue;
        $c = &$ctx['cli'][$j['cliente_id']]; $c['n'] = ($c['n'] ?? 0) + 1; $c['t'] = ($c['t'] ?? 0) + num($j['valor']); $c['u'] = max($c['u'] ?? '', (string)$j['data']); unset($c);
    }
    foreach (db()->query('SELECT cliente_id FROM ' . T('veiculos'))->fetchAll() as $v) $ctx['cli'][$v['cliente_id']]['v'] = ($ctx['cli'][$v['cliente_id']]['v'] ?? 0) + 1;
    foreach (db()->query('SELECT cliente_id FROM ' . T('subscricoes') . " WHERE estado = 'Ativa'")->fetchAll() as $x) $ctx['cli'][$x['cliente_id']]['s'] = 1;
    $ctx['nomes'] = []; foreach (db()->query('SELECT id, nome FROM ' . T('clientes'))->fetchAll() as $x) $ctx['nomes'][$x['id']] = $x['nome'];
    foreach (db()->query('SELECT veiculo_id, data, anos FROM ' . T('garantias'))->fetchAll() as $g)
        if ($g['veiculo_id'] && $g['data'] && date('Y-m-d', strtotime($g['data'] . ' +' . max(1, (int)$g['anos']) . ' years')) >= date('Y-m-d')) $ctx['veic'][$g['veiculo_id']]['g'] = 1;
    foreach (db()->query('SELECT * FROM ' . T('faturas') . " WHERE estado <> 'Anulada'")->fetchAll() as $f) {
        $d = max(0, lines_totals($f)['total'] - paid_amount($f));
        if ($d > 0) { $ctx['cli'][$f['cliente_id']]['d'] = ($ctx['cli'][$f['cliente_id']]['d'] ?? 0) + $d; }
    }
    foreach (all_rows('equipa') as $t) $ctx['tec'][$t['id']] = $t;
    foreach (db()->query('SELECT cliente_id FROM ' . T('marcacoes') . " WHERE estado = 'Faltou'")->fetchAll() as $m) $ctx['cli'][$m['cliente_id']]['f'] = ($ctx['cli'][$m['cliente_id']]['f'] ?? 0) + 1;
    foreach (all_rows('deslocacoes') as $d) if ($d['trabalho_id'])
        $ctx['kmjob'][$d['trabalho_id']] = ($ctx['kmjob'][$d['trabalho_id']] ?? 0) + num($d['km']) * num($S['custo_km']) + num($d['portagens']);
    return $ctx;
}

function calc_row(string $e, array $r): array {
    $ctx = calc_ctx(); $S = $ctx['S']; $today = date('Y-m-d'); $c = [];
    switch ($e) {
        case 'orcamentos': $c = lines_totals($r); break;
        case 'faturas':
            $c = lines_totals($r);
            $c['pago'] = paid_amount($r);
            $c['em_divida'] = ($r['estado'] ?? '') === 'Anulada' ? 0 : max(0, round($c['total'] - $c['pago'], 2));
            $c['vencida'] = $c['em_divida'] > 0 && !empty($r['vencimento']) && $r['vencimento'] < $today;
            $an = ($r['estado'] ?? '') === 'Anulada';
            $c += ['seg_aberto' => !$an && $c['em_divida'] > 0, 'seg_venc' => $c['vencida'], 'seg_paga' => !$an && $c['em_divida'] <= 0, 'seg_anul' => $an];
            static $jv = null; if ($jv === null) { $jv = []; foreach (db()->query('SELECT t.id, v.marca, v.modelo, v.matricula, t.walkin_veiculo, t.walkin_matricula FROM ' . T('trabalhos') . ' t LEFT JOIN ' . T('veiculos') . ' v ON v.id = t.veiculo_id')->fetchAll() as $x) $jv[$x['id']] = trim(($x['marca'] ? $x['marca'] . ' ' . $x['modelo'] . ' · ' . $x['matricula'] : ($x['walkin_veiculo'] . ' ' . $x['walkin_matricula'])), ' ·'); }
            $c['viatura'] = $jv[$r['trabalho_id'] ?? 0] ?? '';
            break;
        case 'trabalhos':
            $h = num($r['horas']);
            $tec = $ctx['tec'][$r['tecnico_id'] ?? 0] ?? null;
            $ch = $tec && num($tec['custo_hora']) > 0 ? num($tec['custo_hora']) : num($S['custo_hora']);
            $mo = ($r['custo_mao_obra'] ?? '') !== '' && $r['custo_mao_obra'] !== null ? num($r['custo_mao_obra']) : round($h * $ch, 2);
            $com = $tec ? num($r['valor']) * num($tec['comissao_pct']) / 100 : 0;
            $desl = ($r['custo_deslocacao'] ?? '') !== '' && $r['custo_deslocacao'] !== null ? num($r['custo_deslocacao']) : round($ctx['kmjob'][$r['id'] ?? 0] ?? 0, 2);
            $custos = num($r['custo_produtos']) + $mo + $com + $desl + num($r['outros_custos']);
            $lucro = num($r['valor']) - $custos;
            $t = jdec($r['tarefas'] ?? ''); $done = count(array_filter($t, fn($x) => !empty($x['d'])));
            $c = ['mao_obra' => round($mo + $com, 2), 'deslocacao' => $desl, 'custos' => round($custos, 2), 'lucro' => round($lucro, 2),
                  'margem' => num($r['valor']) > 0 ? round($lucro / num($r['valor']) * 100, 1) : 0,
                  'lucro_hora' => $h > 0 ? round($lucro / $h, 2) : null, 'progresso' => $t ? "$done/" . count($t) : '',
                  'pct' => $t ? round($done / count($t) * 100) : null];
            break;
        case 'veiculos':
            $x = $ctx['veic'][$r['id'] ?? 0] ?? [];
            $pr = (string)($r['protecao'] ?? ''); $tags = [];
            if (!empty($x['g'])) $tags[] = 'Garantia ativa';
            if ($pr && $pr !== 'Nenhuma') $tags[] = $pr;
            $c = ['titulo' => trim(($r['ano'] ? $r['ano'] . ' ' : '') . $r['marca'] . ' ' . $r['modelo']), 'sub' => trim(implode(' · ', array_filter([$r['cor'], $r['tamanho']]))),
                  'dono' => $ctx['nomes'][$r['cliente_id']] ?? '', 'trabalhos' => (string)($x['n'] ?? 0), 'protecao' => $tags,
                  'seg_prot' => (bool)$tags, 'seg_gar' => !empty($x['g']), 'seg_breve' => !empty($r['proximo_servico']) && $r['proximo_servico'] <= date('Y-m-d', strtotime('+30 days')), 'seg_zero' => empty($x['n'])];
            break;
        case 'inspecoes':
            $nd = count(jdec($r['mapa'] ?? '')) + count(array_filter(array_merge(jdec($r['exterior'] ?? ''), jdec($r['interior'] ?? '')), fn($x) => !empty($x['d'])));
            $c = ['danos' => (string)$nd, 'nfotos' => (string)count(jdec($r['fotos'] ?? '')), 'assinatura' => [!empty($r['assinado_em']) ? '🔒 Assinado' : 'Por assinar'],
                  'seg_ass' => !empty($r['assinado_em']), 'seg_nass' => empty($r['assinado_em']), 'seg_dano' => $nd > 0, 'act' => empty($r['assinado_em'])];
            break;
        case 'avaliacoes':
            $c = ['seg_resp' => ($r['estado'] ?? '') === 'Recebida' && empty($r['respondida']) && ($r['tipo'] ?? '') !== 'Referência', 'seg_rec' => ($r['estado'] ?? '') === 'Recebida',
                  'seg_ped' => in_array($r['estado'] ?? '', ['Pedido enviado', 'Pedido por enviar'], true), 'seg_ref' => ($r['tipo'] ?? '') === 'Referência'];
            break;
        case 'leads':
            $c = ['seg_aberta' => !in_array($r['estado'], ['Ganho', 'Perdido'], true), 'seg_ganha' => $r['estado'] === 'Ganho', 'seg_perdida' => $r['estado'] === 'Perdido',
                  'seg_atraso' => !in_array($r['estado'], ['Ganho', 'Perdido'], true) && !empty($r['data_followup']) && $r['data_followup'] < $today, 'act' => !$r['cliente_id']];
            break;
        case 'planos':
            $n = 0; $m = 0; foreach (db()->query('SELECT valor, frequencia FROM ' . T('subscricoes') . " WHERE estado = 'Ativa' AND plano_id = " . (int)($r['id'] ?? 0))->fetchAll() as $x) { $n++; $m += num($x['valor']) * (FREQ_MES[$x['frequencia']] ?? 1); }
            $c = ['membros' => (string)$n, 'mrr' => round($m, 2)]; break;
        case 'subscricoes':
            $c['mensal'] = round(num($r['valor']) * (FREQ_MES[$r['frequencia'] ?? 'Mensal'] ?? 1), 2);
            $ren = $r['validade'] ?? null; $at = ($r['estado'] ?? '') === 'Ativa';
            $c += ['seg_ativa' => $at && (!$ren || $ren >= $today), 'seg_renovar' => $at && $ren && $ren >= $today && $ren <= date('Y-m-d', strtotime('+7 days')), 'seg_exp' => $at && $ren && $ren < $today, 'seg_pausa' => !$at, 'act' => true];
            $c['utilizacao'] = (int)$r['visitas_incluidas'] > 0 ? (int)$r['visitas_usadas'] . '/' . (int)$r['visitas_incluidas'] : ((int)$r['visitas_usadas'] ? (int)$r['visitas_usadas'] . ' visitas' : '');
            if (!empty($r['validade']) && $r['validade'] < $today && ($r['estado'] ?? '') === 'Ativa') $c['utilizacao'] .= ' · expirada';
            break;
        case 'clientes':
            $x = $ctx['cli'][$r['id'] ?? 0] ?? [];
            $n = (int)($x['n'] ?? 0); $frota = in_array($r['tipo'] ?? '', ['Frota', 'Empresa', 'Stand'], true);
            $perfil = array_values(array_filter([$frota ? ($r['tipo'] === 'Stand' ? 'Stand' : 'Frota') : null, !empty($x['s']) ? 'Subscritor' : null, $n >= 2 ? 'Recorrente' : ($n === 1 ? 'Novo' : null), ($x['t'] ?? 0) >= 1000 ? 'VIP' : null]));
            $c = ['viaturas' => (string)($x['v'] ?? 0), 'visitas' => (string)$n, 'total' => round($x['t'] ?? 0, 2), 'em_divida' => round($x['d'] ?? 0, 2), 'faltas' => ($x['f'] ?? 0) ? (string)$x['f'] : '',
                  'ultima' => $x['u'] ?? null, 'perfil' => $perfil ?: ['Sem visitas'],
                  'seg_rep' => $n >= 2, 'seg_sub' => !empty($x['s']), 'seg_frota' => $frota, 'seg_falta' => !empty($x['f']), 'seg_div' => ($x['d'] ?? 0) > 0,
                  'seg_perdido' => $n > 0 && ($x['u'] ?? '') < date('Y-m-d', strtotime('-90 days'))];
            break;
        case 'deslocacoes': $c['custo'] = round(num($r['km']) * num($S['custo_km']) + num($r['portagens']), 2); break;
        case 'inventario':
            $c['valor_stock'] = round(num($r['quantidade']) * num($r['custo_unitario']), 2);
            $vol = num($r['volume_ml']); $uso = num($r['ml_por_uso']);
            $c['custo_uso'] = ($vol > 0 && $uso > 0) ? round(num($r['custo_unitario']) / $vol * ($uso / (1 + num($r['diluicao']))), 3) : null;
            $q = num($r['quantidade']); $mn = num($r['nivel_minimo']); $out = $q <= 0; $low = !$out && $mn > 0 && $q <= $mn;
            $c['alerta'] = $out ? 'Esgotado' : ($low ? 'Stock baixo' : '');
            $c['chip'] = $out ? ['Esgotado', 'bad'] : ($low ? ['Stock baixo', 'warn'] : ['Em stock', 'ok']);
            $cons = $r['tipo'] ? !str_starts_with($r['tipo'], 'Produto') : in_array($r['categoria'], ['Microfibras', 'Boinas / pads', 'Consumível', 'Acessório'], true);
            $c += ['seg_low' => $low, 'seg_out' => $out, 'seg_ok' => !$out && !$low, 'seg_prod' => !$cons, 'seg_cons' => $cons, 'sub' => implode(' · ', array_filter([$r['fornecedor'], $r['categoria']]))];
            break;
        case 'equipamentos':
            $c['proxima'] = null; $c['alerta'] = '';
            if (!empty($r['ultima_manutencao']) && (int)$r['intervalo_dias'] > 0) {
                $c['proxima'] = date('Y-m-d', strtotime($r['ultima_manutencao'] . ' +' . (int)$r['intervalo_dias'] . ' days'));
                if (($r['estado'] ?? '') !== 'Abatido') {
                    if ($c['proxima'] < $today) $c['alerta'] = 'Em atraso';
                    elseif ($c['proxima'] <= date('Y-m-d', strtotime('+14 days'))) $c['alerta'] = 'Em breve';
                }
            }
            if (($r['estado'] ?? '') === 'Avariado') $c['alerta'] = 'Avariado';
            $es = $r['estado'] ?? '';
            $c['chip'] = $es === 'Avariado' ? ['Precisa reparação', 'bad'] : ($es === 'Em manutenção' ? ['Em manutenção', 'warn'] : ($es === 'Abatido' ? ['Abatido', 'mut'] : ($c['alerta'] === 'Em atraso' ? ['Em atraso', 'bad'] : ($c['alerta'] === 'Em breve' ? ['Revisão devida', 'warn'] : ['OK', 'ok']))));
            $c['garantia'] = !empty($r['garantia_ate']) ? pt_d($r['garantia_ate']) . ($r['garantia_ate'] < $today ? ' (expirada)' : '') : '—';
            $c += ['seg_due' => in_array($c['alerta'], ['Em atraso', 'Em breve'], true), 'seg_rep' => in_array($es, ['Avariado', 'Em manutenção'], true), 'act' => $es !== 'Abatido',
                   'sub' => implode(' · ', array_filter([$r['tipo'], $r['marca_modelo']]))];
            break;
        case 'compras':
            static $art = null; if ($art === null) $art = array_column(db()->query('SELECT id, categoria FROM ' . T('inventario'))->fetchAll(), 'categoria', 'id');
            $c['cat'] = $art[$r['artigo_id'] ?? 0] ?? '';
            $c['ligado'] = array_values(array_filter([!empty($r['lancado']) ? 'Stock' : null, !empty($r['lancado']) && !empty($r['criar_despesa']) ? 'Despesa' : null, ($r['estado'] ?? '') === 'Encomendada' ? 'Por receber' : null]));
            break;
        case 'equipa':
            static $eq = null; if ($eq === null) { $eq = []; foreach (db()->query('SELECT tecnico_id, COUNT(*) n, SUM(COALESCE(horas,0)) h, SUM(COALESCE(valor,0)) v FROM ' . T('trabalhos') . " WHERE estado = 'Concluído' GROUP BY tecnico_id")->fetchAll() as $x) $eq[$x['tecnico_id']] = $x; }
            $x = $eq[$r['id']] ?? ['n' => 0, 'h' => 0, 'v' => 0];
            $c = ['chip' => !empty($r['ativo']) ? ['Ativo', 'ok'] : ['Inativo', 'mut'], 'trabalhos' => (string)(int)$x['n'], 'horas' => number_format((float)$x['h'], 1, ',', '.') . ' h', 'receita' => round((float)$x['v'], 2)];
            break;
        case 'garantias':
            $c = warranty_info($r); break;
        case 'servicos':
            static $svcUse = null, $ckN = null;
            if ($svcUse === null) { $svcUse = []; foreach (db()->query('SELECT servico_id, COUNT(*) n FROM ' . T('trabalhos') . " WHERE estado <> 'Cancelado' GROUP BY servico_id")->fetchAll() as $x) $svcUse[$x['servico_id']] = (int)$x['n'];
                $ckN = []; foreach (all_rows('checklists') as $x) $ckN[$x['id']] = count(array_filter(array_map('trim', explode("\n", (string)$x['tarefas'])))); }
            $pr = array_values(array_filter(array_map('num', [$r['preco_pequeno'], $r['preco_medio'], $r['preco_grande'], $r['preco_luxo'], $r['preco_moto']]), fn($x) => $x > 0));
            $fmt = fn($v) => number_format($v, $v == floor($v) ? 0 : 2, ',', '.') . ' €';
            $c['desde'] = !$pr ? 'Por orçamento' : (min($pr) == max($pr) ? $fmt(min($pr)) : $fmt(min($pr)) . ' – ' . $fmt(max($pr)));
            $nt = count(array_filter(array_map('trim', explode("\n", (string)$r['tarefas_padrao']))));
            $c['tarefas'] = $nt ? "$nt" : (($r['checklist_id'] ?? null) && isset($ckN[$r['checklist_id']]) ? $ckN[$r['checklist_id']] . ' (modelo)' : '—');
            $c['marcado'] = (string)($svcUse[$r['id'] ?? 0] ?? 0);
            $pm = num($r['preco_medio']) ?: ($pr[0] ?? 0);
            $c['margem'] = $pm > 0 ? round(($pm - num($r['custo_produtos']) - num($r['duracao_h']) * num(settings()['custo_hora'])) / $pm * 100, 1) : null;
            break;
        case 'checklists':
            $c['n'] = (string)count(array_filter(array_map('trim', explode("\n", (string)$r['tarefas']))));
            $c['servicos'] = (string)(int)db()->query('SELECT COUNT(*) FROM ' . T('servicos') . ' WHERE checklist_id = ' . (int)$r['id'])->fetchColumn() . ' serviço(s)';
            break;
        case 'receitas': $c['margem'] = round(num($r['valor']) - num($r['custo']), 2); break;
        case 'fornecedores':
            $c['compras'] = round((float)db()->query('SELECT COALESCE(SUM(valor),0) FROM ' . T('compras') . " WHERE estado <> 'Cancelada' AND fornecedor_id = " . (int)$r['id'])->fetchColumn(), 2); break;
        case 'objetivos': $c = goal_progress($r); break;
        case 'marketing':
            $cu = num($r['custo']);
            $c['roi'] = $cu > 0 ? round((num($r['receita']) - $cu) / $cu * 100, 1) : null;
            $c['cac'] = (int)$r['clientes'] > 0 ? round($cu / (int)$r['clientes'], 2) : null;
            $c['sub'] = implode(' · ', array_filter([$r['canal'], trim(pt_d($r['data_inicio']) . ($r['data_fim'] ? ' – ' . pt_d($r['data_fim']) : ''))]));
            break;
    }
    return $c;
}

function with_calc(string $e, array $rows): array {
    foreach ($rows as &$r) $r['_c'] = calc_row($e, $r);
    return $rows;
}

function in_range($d, $from, $to): bool { return $d && substr((string)$d, 0, 10) >= $from && substr((string)$d, 0, 10) <= $to; }

/* ---------- Agregados financeiros de um período ---------- */
function period_totals(string $from, string $to, ?array $jobs = null, ?array $desp = null, ?array $desl = null): array {
    $jobs = $jobs ?? with_calc('trabalhos', all_rows('trabalhos'));
    $desp = $desp ?? all_rows('despesas');
    $desl = $desl ?? all_rows('deslocacoes');
    $S = settings();
    $t = ['receita' => 0, 'custos_diretos' => 0, 'produtos' => 0, 'mao_obra' => 0, 'desloc_trab' => 0, 'outros' => 0,
          'gorjetas' => 0, 'trabalhos' => 0, 'horas' => 0, 'despesas_op' => 0, 'compras_stock' => 0, 'km' => 0, 'desloc_custo' => 0,
          'desloc_sem_trab' => 0, 'outras_receitas' => 0, 'outras_custo' => 0, 'por_cat' => []];
    foreach ($jobs as $j) {
        if (($j['estado'] ?? '') !== 'Concluído' || !in_range($j['data'], $from, $to)) continue;
        $t['receita'] += num($j['valor']); $t['custos_diretos'] += $j['_c']['custos'];
        $t['produtos'] += num($j['custo_produtos']); $t['mao_obra'] += $j['_c']['mao_obra'];
        $t['desloc_trab'] += $j['_c']['deslocacao']; $t['outros'] += num($j['outros_custos']);
        $t['gorjetas'] += num($j['gorjeta']); $t['trabalhos']++; $t['horas'] += num($j['horas']);
    }
    foreach ($desp as $d) {
        if (!in_range($d['data'], $from, $to)) continue;
        $cat = $d['categoria'] ?: 'Outros';
        if ($cat === 'Produtos / stock') $t['compras_stock'] += num($d['valor']);
        else { $t['despesas_op'] += num($d['valor']); $t['por_cat'][$cat] = ($t['por_cat'][$cat] ?? 0) + num($d['valor']); }
    }
    foreach ($desl as $d) {
        if (!in_range($d['data'], $from, $to)) continue;
        $cost = num($d['km']) * num($S['custo_km']) + num($d['portagens']);
        $t['km'] += num($d['km']); $t['desloc_custo'] += $cost;
        if (!$d['trabalho_id']) $t['desloc_sem_trab'] += $cost;
    }
    foreach (all_rows('receitas') as $x) if (in_range($x['data'], $from, $to)) { $t['outras_receitas'] += num($x['valor']); $t['outras_custo'] += num($x['custo']); }
    $t['lucro_bruto'] = $t['receita'] - $t['custos_diretos'];
    $t['lucro_operacional'] = $t['lucro_bruto'] + $t['outras_receitas'] - $t['outras_custo'] - $t['despesas_op'] - $t['desloc_sem_trab'];
    $t['reserva_impostos'] = max(0, $t['lucro_operacional']) * num($S['reserva_impostos']) / 100;
    $t['ticket_medio'] = $t['trabalhos'] ? $t['receita'] / $t['trabalhos'] : 0;
    $t['lucro_trabalho'] = $t['trabalhos'] ? $t['lucro_bruto'] / $t['trabalhos'] : 0;
    $t['lucro_hora'] = $t['horas'] > 0 ? $t['lucro_bruto'] / $t['horas'] : 0;
    $t['margem_bruta'] = $t['receita'] > 0 ? $t['lucro_bruto'] / $t['receita'] * 100 : 0;
    foreach ($t as $k => $v) if (is_float($v)) $t[$k] = round($v, 2);
    return $t;
}

function month_bounds(string $ym): array {
    $from = $ym . '-01';
    return [$from, date('Y-m-t', strtotime($from))];
}

function dashboard(string $ym): array {
    $S = settings(); $today = date('Y-m-d');
    [$from, $to] = month_bounds($ym);
    $jobs = with_calc('trabalhos', all_rows('trabalhos'));
    $desp = all_rows('despesas'); $desl = all_rows('deslocacoes');
    $m = period_totals($from, $to, $jobs, $desp, $desl);
    $prev = period_totals(...array_merge(month_bounds(date('Y-m', strtotime($from . ' -1 month'))), [$jobs, $desp, $desl]));

    // Faturação / recebimentos
    $fat = with_calc('faturas', all_rows('faturas'));
    $divida = 0; $vencidas = []; $recebido_mes = 0;
    foreach ($fat as $f) {
        $divida += $f['_c']['em_divida'];
        if ($f['_c']['vencida']) $vencidas[] = $f;
        if ($f['estado'] !== 'Anulada') foreach (payment_list($f) as $p) if (in_range($p['d'], $from, $to)) $recebido_mes += $p['v'];
    }
    // Leads
    $leads = all_rows('leads'); $lm = 0; $lmg = 0; $lt = 0; $ltg = 0; $follow = [];
    foreach ($leads as $l) {
        $lt++; if ($l['estado'] === 'Ganho') $ltg++;
        if (in_range($l['data'], $from, $to)) { $lm++; if ($l['estado'] === 'Ganho') $lmg++; }
        if ($l['data_followup'] && $l['data_followup'] <= $today && !in_array($l['estado'], ['Ganho', 'Perdido'], true)) $follow[] = $l;
    }
    // Clientes recorrentes
    $per = [];
    foreach ($jobs as $j) if ($j['estado'] === 'Concluído' && $j['cliente_id']) $per[$j['cliente_id']] = ($per[$j['cliente_id']] ?? 0) + 1;
    $rep = count(array_filter($per, fn($n) => $n >= 2));
    // Subscrições
    $mrr = 0; $subs_ativas = 0; $visitas = [];
    foreach (with_calc('subscricoes', all_rows('subscricoes')) as $s) if ($s['estado'] === 'Ativa') {
        $mrr += $s['_c']['mensal']; $subs_ativas++;
        if ($s['proxima_visita'] && $s['proxima_visita'] <= date('Y-m-d', strtotime('+7 days'))) $visitas[] = $s;
    }
    // Alertas
    $stock = array_values(array_filter(with_calc('inventario', all_rows('inventario')), fn($i) => $i['_c']['alerta']));
    $equip = array_values(array_filter(with_calc('equipamentos', all_rows('equipamentos')), fn($i) => $i['_c']['alerta']));
    $gar = array_values(array_filter(with_calc('garantias', all_rows('garantias')), fn($g) => str_starts_with($g['_c']['alerta'], 'Manutenção')));
    $veic = array_values(array_filter(all_rows('veiculos'), fn($v) => $v['proximo_servico'] && $v['proximo_servico'] <= date('Y-m-d', strtotime('+14 days'))));
    // Marcações
    $marc = all_rows('marcacoes', 'data ASC, hora ASC');
    $proximas = array_values(array_filter($marc, fn($a) => $a['data'] >= $today && $a['data'] <= date('Y-m-d', strtotime('+7 days')) && !in_array($a['estado'], ['Cancelada', 'Faltou'], true)));
    $hoje = array_values(array_filter($proximas, fn($a) => $a['data'] === $today));
    // Pipeline
    $pipe = [];
    foreach ($jobs as $j) if (!in_array($j['estado'], ['Concluído', 'Cancelado'], true)) $pipe[$j['estado']] = ($pipe[$j['estado']] ?? 0) + 1;
    // Mix de serviços no mês
    $mix = [];
    foreach ($jobs as $j) if ($j['estado'] === 'Concluído' && in_range($j['data'], $from, $to)) {
        $k = (int)$j['servico_id'];
        $mix[$k] = $mix[$k] ?? ['servico_id' => $k, 'n' => 0, 'receita' => 0, 'lucro' => 0];
        $mix[$k]['n']++; $mix[$k]['receita'] += num($j['valor']); $mix[$k]['lucro'] += $j['_c']['lucro'];
    }
    usort($mix, fn($a, $b) => $b['receita'] <=> $a['receita']);
    // Série de 12 meses
    $serie = [];
    for ($i = 11; $i >= 0; $i--) {
        $mm = date('Y-m', strtotime($from . " -$i month"));
        $p = period_totals(...array_merge(month_bounds($mm), [$jobs, $desp, $desl]));
        $serie[] = ['m' => $mm, 'receita' => $p['receita'], 'lucro_bruto' => $p['lucro_bruto'], 'lucro_operacional' => $p['lucro_operacional'], 'despesas' => $p['despesas_op']];
    }
    $orc = all_rows('orcamentos'); $oe = 0; $oa = 0; $orc_pend = 0;
    foreach ($orc as $o) {
        if (in_array($o['estado'], ['Enviado', 'Aceite', 'Recusado', 'Expirado'], true)) { $oe++; if ($o['estado'] === 'Aceite') $oa++; }
        if ($o['estado'] === 'Enviado') $orc_pend += lines_totals($o)['total'];
    }
    $hj = ['marcacoes' => count($hoje), 'em_curso' => 0, 'concluidos' => 0, 'receita' => 0, 'recebido' => 0];
    foreach ($jobs as $j) {
        if (!in_array($j['estado'], ['Agendado', 'Pronto', 'Concluído', 'Cancelado'], true)) $hj['em_curso']++;
        if ($j['estado'] === 'Concluído' && $j['data'] === $today) { $hj['concluidos']++; $hj['receita'] += num($j['valor']); }
    }
    foreach ($fat as $f) if ($f['estado'] !== 'Anulada') foreach (payment_list($f) as $p) if ($p['d'] === $today) $hj['recebido'] += $p['v'];
    foreach ($marc as $a) if ($a['data'] === $today && !in_array($a['estado'], ['Cancelada', 'Faltou'], true)) {
        $hj['agendado'] = ($hj['agendado'] ?? 0) + num($a['valor_previsto']);
        if ($a['sinal_pago'] && $a['data'] === $today) $hj['recebido'] += 0; // sinais contam quando registados na faturação
    }
    $hj['agendado'] = $hj['agendado'] ?? 0;
    $hj['espera'] = count(array_filter($jobs, fn($j) => $j['estado'] === 'Check-in'));
    $hj['prontos'] = count(array_filter($jobs, fn($j) => $j['estado'] === 'Pronto'));
    $hj['timers'] = count(array_filter($jobs, fn($j) => !empty($j['timer_inicio'])));
    $hj['faltas_mes'] = count(array_filter($marc, fn($a) => $a['estado'] === 'Faltou' && in_range($a['data'], $from, $to)));
    return [
        'hj' => $hj, 'mes' => $ym, 'm' => $m, 'prev' => $prev, 'objetivo' => num($S['objetivo_mensal']),
        'em_divida' => round($divida, 2), 'faturas_vencidas' => $vencidas, 'recebido_mes' => round($recebido_mes, 2),
        'leads_mes' => $lm, 'conv_mes' => $lm ? round($lmg / $lm * 100, 1) : 0, 'conv_total' => $lt ? round($ltg / $lt * 100, 1) : 0,
        'followups' => $follow, 'clientes_ativos' => count($per), 'taxa_recorrencia' => count($per) ? round($rep / count($per) * 100, 1) : 0,
        'mrr' => round($mrr, 2), 'subs_ativas' => $subs_ativas, 'visitas' => $visitas,
        'stock' => $stock, 'equip' => $equip, 'garantias' => $gar, 'veic' => $veic, 'hoje' => $hoje, 'proximas' => $proximas,
        'pipeline' => $pipe, 'abertos' => array_sum($pipe), 'mix' => array_values($mix), 'serie' => $serie,
        'conv_orc' => $oe ? round($oa / $oe * 100, 1) : 0, 'orc_pendente' => round($orc_pend, 2),
        'total_clientes' => (int)db()->query('SELECT COUNT(*) FROM ' . T('clientes'))->fetchColumn(),
    ];
}

function report(string $from, string $to): array {
    $jobs = with_calc('trabalhos', all_rows('trabalhos'));
    $tot = period_totals($from, $to, $jobs);
    $cli = []; foreach (all_rows('clientes') as $c) $cli[$c['id']] = $c;
    $by = ['servico' => [], 'tecnico' => [], 'origem' => [], 'cliente' => [], 'mes' => []];
    foreach ($jobs as $j) {
        if ($j['estado'] !== 'Concluído' || !in_range($j['data'], $from, $to)) continue;
        $keys = ['servico' => (int)$j['servico_id'], 'tecnico' => (int)$j['tecnico_id'],
                 'origem' => $cli[$j['cliente_id']]['origem'] ?? '', 'cliente' => (int)$j['cliente_id'], 'mes' => substr($j['data'], 0, 7)];
        foreach ($keys as $g => $k) {
            $by[$g][$k] = $by[$g][$k] ?? ['k' => $k, 'n' => 0, 'receita' => 0, 'lucro' => 0, 'horas' => 0];
            $by[$g][$k]['n']++; $by[$g][$k]['receita'] += num($j['valor']); $by[$g][$k]['lucro'] += $j['_c']['lucro']; $by[$g][$k]['horas'] += num($j['horas']);
        }
    }
    foreach ($by as $g => $arr) { $arr = array_values($arr); usort($arr, fn($a, $b) => $g === 'mes' ? strcmp($a['k'], $b['k']) : $b['receita'] <=> $a['receita']); $by[$g] = $arr; }
    $by['cliente'] = array_slice($by['cliente'], 0, 15);
    $metodos = [];
    foreach (all_rows('faturas') as $f) {
        if ($f['estado'] === 'Anulada') continue;
        foreach (payment_list($f) as $p) if (in_range($p['d'], $from, $to) && $p['v'] > 0) { $k = $p['m'] ?: 'Não indicado'; $metodos[$k] = ($metodos[$k] ?? 0) + $p['v']; }
    }
    $mk = ['custo' => 0, 'leads' => 0, 'clientes' => 0, 'receita' => 0];
    foreach (all_rows('marketing') as $c) if (in_range($c['data_inicio'], $from, $to)) {
        $mk['custo'] += num($c['custo']); $mk['leads'] += (int)$c['leads']; $mk['clientes'] += (int)$c['clientes']; $mk['receita'] += num($c['receita']);
    }
    $leads = ['total' => 0, 'ganhos' => 0, 'perdidos' => 0, 'origem' => []];
    foreach (all_rows('leads') as $l) if (in_range($l['data'], $from, $to)) {
        $leads['total']++; if ($l['estado'] === 'Ganho') $leads['ganhos']++; if ($l['estado'] === 'Perdido') $leads['perdidos']++;
        $o = $l['origem'] ?: 'Não indicado'; $leads['origem'][$o] = ($leads['origem'][$o] ?? 0) + 1;
    }
    // Fluxo de caixa diário (dinheiro recebido vs despesas pagas)
    $cx = []; $ent = 0; $nPag = 0; $sai = 0; $pag = 0; $rec = 0; $recCat = []; $desCat = []; $nRec = 0; $nDes = 0;
    for ($d = max($from, date('Y-m-d', strtotime($to . ' -800 days'))); $d <= $to && count($cx) < 800; $d = date('Y-m-d', strtotime($d . ' +1 day'))) $cx[$d] = ['d' => $d, 'entradas' => 0, 'saidas' => 0];
    $inR = fn($d) => $d >= $from && $d <= $to;
    foreach (all_rows('faturas') as $f) if ($f['estado'] !== 'Anulada') foreach (payment_list($f) as $p) if ($inR($p['d'])) { if (isset($cx[$p['d']])) $cx[$p['d']]['entradas'] += $p['v']; $ent += $p['v']; $pag += $p['v']; $nPag++; }
    foreach (all_rows('despesas') as $x) if ($inR((string)$x['data'])) { if (isset($cx[$x['data']])) $cx[$x['data']]['saidas'] += num($x['valor']); $sai += num($x['valor']); $nDes++; $k = $x['categoria'] ?: 'Outros'; $desCat[$k] = ($desCat[$k] ?? 0) + num($x['valor']); }
    foreach (all_rows('receitas') as $x) if ($inR((string)$x['data'])) { if (isset($cx[$x['data']])) $cx[$x['data']]['entradas'] += num($x['valor']); $ent += num($x['valor']); $rec += num($x['valor']); $nRec++; $k = $x['categoria'] ?: 'Outros'; $recCat[$k] = ($recCat[$k] ?? 0) + num($x['valor']); }
    arsort($desCat); arsort($recCat);
    $fatP = 0; $nFat = 0; $gorj = 0; foreach (with_calc('faturas', all_rows('faturas')) as $f) if ($f['estado'] !== 'Anulada' && $inR((string)$f['data'])) { $fatP += $f['_c']['total']; $nFat++; if ($f['_c']['em_divida'] <= 0) $gorj += num($f['gorjeta']); }
    $sinais = 0; $nSin = 0;
    foreach (all_rows('marcacoes') as $m) if ($m['sinal_pago'] && num($m['sinal']) > 0 && in_array($m['estado'], ['Pendente', 'Confirmada'], true)) { $sinais += num($m['sinal']); $nSin++; }
    $caixa = ['dias' => array_values($cx), 'entradas' => round($ent, 2), 'n_pag' => $nPag, 'saidas' => round($sai, 2), 'sinais' => round($sinais, 2), 'n_sinais' => $nSin,
              'pagamentos' => round($pag, 2), 'receitas' => round($rec, 2), 'n_rec' => $nRec, 'n_des' => $nDes, 'receitas_cat' => $recCat, 'despesas_cat' => $desCat, 'faturado' => round($fatP, 2), 'n_fat' => $nFat, 'gorjetas' => round($gorj, 2)];
    arsort($tot['por_cat']); arsort($metodos); arsort($leads['origem']);
    return ['caixa' => $caixa, 'from' => $from, 'to' => $to, 'tot' => $tot, 'by' => $by, 'metodos' => $metodos, 'marketing' => $mk, 'leads' => $leads];
}
