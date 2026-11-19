<?php
/* Catálogo de relatórios — todos calculados a partir dos registos.
   Cada relatório devolve colunas tipadas (t texto, m dinheiro, i inteiro, n número, p %, d data), linhas e, opcionalmente, gráfico e totais. */

function rep_catalog(): array {
    return [
        ['Receitas & vendas', [['resumo', 'Resumo completo do período', 1], ['rec_mes', 'Dinheiro recebido por mês (12 meses)', 0], ['rec_servico', 'Receita por serviço', 1], ['top_clientes', 'Top clientes por pagamentos', 1],
            ['rec_tecnico', 'Receita por técnico', 1], ['pag_metodo', 'Pagamentos por método', 1], ['gorjetas', 'Gorjetas', 1], ['resumo_vendas', 'Resumo de vendas', 1],
            ['antiguidade', 'Faturas em aberto (antiguidade)', 0], ['fat_estado', 'Faturas por estado', 1], ['conv_orc', 'Conversão de orçamentos', 1]]],
        ['Despesas & lucro', [['desp_cat', 'Despesas por categoria', 1], ['desp_mes', 'Despesas por mês (12 meses)', 0], ['pl_resumo', 'Resumo de lucro e prejuízo', 1], ['lucro_trabalho', 'Rentabilidade por trabalho', 1],
            ['lucro_servico', 'Lucro por serviço', 1], ['iva', 'IVA nas faturas', 1], ['descontos', 'Descontos concedidos', 1]]],
        ['Operação', [['trab_estado', 'Trabalhos por etapa (agora)', 0], ['tempo_servico', 'Tempo de trabalho por serviço', 1], ['tecnicos', 'Desempenho dos técnicos', 1], ['marc_estado', 'Marcações por estado', 1],
            ['faltas', 'Faltas e cancelamentos', 1], ['sinais', 'Sinais / depósitos', 1], ['local', 'Oficina vs domicílio', 1], ['dias_horas', 'Dias e horas mais procurados', 1]]],
        ['Clientes & marketing', [['novos_clientes', 'Novos clientes por mês (12 meses)', 0], ['origem_clientes', 'Origem dos clientes', 0], ['recorrencia', 'Clientes recorrentes', 0], ['inativos', 'Clientes inativos (+90 dias)', 0],
            ['leads_origem', 'Leads por origem e conversão', 1], ['campanhas', 'Campanhas de marketing (ROI)', 0], ['avaliacoes', 'Avaliações por plataforma', 1], ['frotas', 'Frotas & empresas', 1]]],
        ['Oficina & stock', [['stock_valor', 'Valor do stock por categoria', 0], ['stock_baixo', 'Stock baixo / esgotado', 0], ['consumo', 'Consumo de produtos nos trabalhos', 1], ['manutencoes', 'Manutenção de equipamentos', 0],
            ['compras_forn', 'Compras por fornecedor', 1], ['mrr', 'Subscrições ativas (receita recorrente)', 0], ['garantias', 'Garantias cerâmicas', 0]]],
    ];
}

function rep_run(string $k, string $from, string $to): array {
    $title = ''; foreach (rep_catalog() as [, $it]) foreach ($it as $x) if ($x[0] === $k) { $title = $x[1]; $per = (bool)$x[2]; }
    if (!$title) fail('Relatório desconhecido.');
    $in = fn($d) => $d && substr((string)$d, 0, 10) >= $from && substr((string)$d, 0, 10) <= $to;
    $names = fn($e, $col = 'nome') => array_column(db()->query("SELECT id, $col AS n FROM " . T($e))->fetchAll(), 'n', 'id');
    $C = $names('clientes'); $EQ = $names('equipa'); $SV = $names('servicos');
    $cn = fn($id) => $C[$id] ?? 'Walk-in / sem ficha';
    $F = array_values(array_filter(with_calc('faturas', all_rows('faturas')), fn($f) => $f['estado'] !== 'Anulada'));
    $pays = []; foreach ($F as $f) foreach (payment_list($f) as $p) $pays[] = $p + ['c' => $f['cliente_id']];
    $J = with_calc('trabalhos', all_rows('trabalhos'));
    $Jc = array_values(array_filter($J, fn($j) => $j['estado'] === 'Concluído' && $in($j['data'])));
    $months = []; $m0 = substr($to, 0, 7); for ($i = 11; $i >= 0; $i--) $months[] = date('Y-m', strtotime($m0 . "-01 -$i months"));
    $MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    $ml = fn($ym) => $MES[(int)substr($ym, 5, 2) - 1] . ' ' . substr($ym, 2, 2);
    $group = function (array $rows, callable $key, array $aggs) { $o = []; foreach ($rows as $r) { $g = $key($r); if ($g === null) continue; $o[$g] ??= array_fill(0, count($aggs), 0); foreach ($aggs as $i => $a) $o[$g][$i] += $a($r); } uasort($o, fn($a, $b) => $b[count($b) - 1] <=> $a[count($a) - 1]); return $o; };
    $flat = fn($g) => array_map(fn($k, $v) => array_merge([$k], array_map(fn($x) => round($x, 2), $v)), array_keys($g), array_values($g));
    $sumc = fn($rows, $i) => round(array_sum(array_column($rows, $i)), 2);
    $cols = []; $rows = []; $chart = null; $total = null; $note = '';

    switch ($k) {
    case 'rec_mes':
        $cols = [['Mês', 't'], ['Pagamentos de faturas', 'm'], ['Outras receitas', 'm'], ['Total recebido', 'm']];
        $R = all_rows('receitas');
        foreach ($months as $ym) { $a = array_sum(array_map(fn($p) => str_starts_with($p['d'], $ym) ? $p['v'] : 0, $pays)); $b = array_sum(array_map(fn($x) => str_starts_with((string)$x['data'], $ym) ? num($x['valor']) : 0, $R)); $rows[] = [$ml($ym), round($a, 2), round($b, 2), round($a + $b, 2)]; }
        $chart = [0, 3]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2), $sumc($rows, 3)]; break;
    case 'rec_servico':
        $cols = [['Serviço / linha faturada', 't'], ['Qtd.', 'n'], ['Receita (s/ IVA)', 'm']];
        $L = []; foreach ($F as $f) if ($in($f['data'])) foreach (jdec($f['linhas']) as $l) $L[] = $l;
        $rows = $flat($group($L, fn($l) => trim(preg_replace('/\s+—.*$/u', '', (string)($l['d'] ?? 'Outro'))) ?: 'Outro', [fn($l) => num($l['q'] ?? 1), fn($l) => num($l['q'] ?? 1) * num($l['p'] ?? 0)]));
        $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'top_clientes':
        $cols = [['Cliente', 't'], ['Pagamentos', 'i'], ['Total pago', 'm']];
        $rows = array_slice($flat($group(array_filter($pays, fn($p) => $in($p['d'])), fn($p) => $cn($p['c']), [fn() => 1, fn($p) => $p['v']])), 0, 25);
        $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'rec_tecnico':
        $cols = [['Técnico', 't'], ['Trabalhos', 'i'], ['Horas', 'n'], ['Lucro', 'm'], ['Receita', 'm']];
        $rows = $flat($group($Jc, fn($j) => $EQ[$j['tecnico_id']] ?? 'Sem técnico', [fn() => 1, fn($j) => num($j['horas']), fn($j) => $j['_c']['lucro'], fn($j) => num($j['valor'])]));
        $chart = [0, 4]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2), $sumc($rows, 3), $sumc($rows, 4)]; break;
    case 'pag_metodo':
        $cols = [['Método', 't'], ['Pagamentos', 'i'], ['Total', 'm']];
        $rows = $flat($group(array_filter($pays, fn($p) => $in($p['d'])), fn($p) => $p['m'] ?: 'Não indicado', [fn() => 1, fn($p) => $p['v']]));
        $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'gorjetas':
        $cols = [['Data', 'd'], ['Origem', 't'], ['Cliente', 't'], ['Gorjeta', 'm']];
        foreach ($F as $f) if ($in($f['data']) && num($f['gorjeta']) > 0 && $f['_c']['em_divida'] <= 0) $rows[] = [$f['data'], 'Fatura ' . $f['numero'], $cn($f['cliente_id']), num($f['gorjeta'])];
        foreach ($Jc as $j) if (num($j['gorjeta']) > 0) $rows[] = [$j['data'], 'Trabalho ' . $j['numero'], $cn($j['cliente_id']), num($j['gorjeta'])];
        usort($rows, fn($a, $b) => strcmp($b[0], $a[0])); $total = ['Total', '', '', $sumc($rows, 3)]; break;
    case 'resumo_vendas':
        $cols = [['Indicador', 't'], ['Valor', 't']];
        $P = array_values(array_filter($F, fn($f) => $in($f['data'])));
        $fat = array_sum(array_map(fn($f) => $f['_c']['total'], $P)); $rec = array_sum(array_map(fn($p) => $in($p['d']) ? $p['v'] : 0, $pays));
        $eur = fn($v) => number_format($v, 2, ',', '.') . ' €';
        $rows = [['Documentos emitidos', (string)count($P)], ['Faturado (c/ IVA)', $eur($fat)], ['Base tributável', $eur(array_sum(array_map(fn($f) => $f['_c']['subtotal'], $P)))], ['IVA', $eur(array_sum(array_map(fn($f) => $f['_c']['iva'], $P)))],
                 ['Descontos', $eur(array_sum(array_map(fn($f) => $f['_c']['desc_pct'] + num($f['desconto']), $P)))], ['Recebido no período (todas as faturas)', $eur($rec)],
                 ['Ainda em dívida (destes documentos)', $eur(array_sum(array_map(fn($f) => $f['_c']['em_divida'], $P)))], ['Ticket médio por documento', $eur(count($P) ? $fat / count($P) : 0)],
                 ['Trabalhos concluídos', (string)count($Jc)]];
        break;
    case 'antiguidade':
        $cols = [['Antiguidade', 't'], ['Faturas', 'i'], ['Em dívida', 'm']]; $t = date('Y-m-d');
        $B = ['Ainda não vencidas' => [0, 0], '1–30 dias de atraso' => [0, 0], '31–60 dias' => [0, 0], '61–90 dias' => [0, 0], 'Mais de 90 dias' => [0, 0]];
        foreach ($F as $f) if ($f['_c']['em_divida'] > 0) { $d = $f['vencimento'] && $f['vencimento'] < $t ? (int)((strtotime($t) - strtotime($f['vencimento'])) / 86400) : 0;
            $b = $d <= 0 ? 'Ainda não vencidas' : ($d <= 30 ? '1–30 dias de atraso' : ($d <= 60 ? '31–60 dias' : ($d <= 90 ? '61–90 dias' : 'Mais de 90 dias'))); $B[$b][0]++; $B[$b][1] += $f['_c']['em_divida']; }
        foreach ($B as $l => $v) $rows[] = [$l, $v[0], round($v[1], 2)];
        $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'fat_estado':
        $cols = [['Estado', 't'], ['Documentos', 'i'], ['Total', 'm']]; $G = [];
        foreach (with_calc('faturas', all_rows('faturas')) as $f) if ($in($f['data'])) { $s = $f['estado'] === 'Anulada' ? 'Anuladas' : ($f['_c']['em_divida'] <= 0 ? 'Pagas' : ($f['_c']['vencida'] ? 'Vencidas' : ($f['_c']['pago'] > 0 ? 'Parcialmente pagas' : 'Por pagar'))); $G[$s] ??= [$s, 0, 0]; $G[$s][1]++; $G[$s][2] += $f['_c']['total']; }
        $rows = array_values($G); $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'conv_orc':
        $cols = [['Estado', 't'], ['Orçamentos', 'i'], ['Valor', 'm']];
        $O = array_filter(with_calc('orcamentos', all_rows('orcamentos')), fn($o) => $in($o['data']));
        $rows = $flat($group($O, fn($o) => $o['estado'] ?: 'Rascunho', [fn() => 1, fn($o) => $o['_c']['total'] ?? 0]));
        $ok = count(array_filter($O, fn($o) => in_array($o['estado'], ['Aceite', 'Convertido'], true))); $dec = count(array_filter($O, fn($o) => !in_array($o['estado'], ['Rascunho', 'Anulado'], true)));
        $note = 'Taxa de conversão: ' . ($dec ? round($ok / $dec * 100, 1) : 0) . "% ($ok de $dec orçamentos enviados foram aceites).";
        $chart = [0, 1]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'desp_cat':
        $cols = [['Categoria', 't'], ['Registos', 'i'], ['Total', 'm']];
        $rows = $flat($group(array_filter(all_rows('despesas'), fn($x) => $in($x['data'])), fn($x) => $x['categoria'] ?: 'Outros', [fn() => 1, fn($x) => num($x['valor'])]));
        $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'desp_mes':
        $cols = [['Mês', 't'], ['Registos', 'i'], ['Despesas', 'm']]; $D = all_rows('despesas');
        foreach ($months as $ym) { $x = array_filter($D, fn($r) => str_starts_with((string)$r['data'], $ym)); $rows[] = [$ml($ym), count($x), round(array_sum(array_map(fn($r) => num($r['valor']), $x)), 2)]; }
        $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'pl_resumo':
        $cols = [['Linha', 't'], ['Valor', 'm']]; $p = period_totals($from, $to);
        $rows = [['Receita de trabalhos concluídos (s/ IVA)', $p['receita']], ['Gorjetas', $p['gorjetas']], ['Outras receitas', $p['outras_receitas']], ['Produtos / químicos', -$p['produtos']], ['Mão de obra e comissões', -$p['mao_obra']],
                 ['Deslocações', -$p['desloc_custo']], ['Outros custos diretos', -$p['outros']], ['Lucro bruto', $p['lucro_bruto']], ['Despesas operacionais', -$p['despesas_op']], ['Lucro operacional', $p['lucro_operacional']],
                 ['Reserva sugerida para impostos', -$p['reserva_impostos']]];
        $note = 'Visão por trabalho concluído (competência). Margem bruta: ' . round($p['margem_bruta'], 1) . '% · ' . $p['trabalhos'] . ' trabalhos · ticket médio ' . number_format($p['ticket_medio'], 2, ',', '.') . ' €.'; break;
    case 'lucro_trabalho':
        $cols = [['Data', 'd'], ['Trabalho', 't'], ['Cliente', 't'], ['Valor', 'm'], ['Custos', 'm'], ['Lucro', 'm'], ['Margem', 'p'], ['Lucro/hora', 'm']];
        foreach ($Jc as $j) $rows[] = [$j['data'], $j['numero'] . ' · ' . ($SV[$j['servico_id']] ?? ($j['extras'] ?: '')), $j['cliente_id'] ? $cn($j['cliente_id']) : ($j['walkin_nome'] ?: 'Walk-in'), num($j['valor']), $j['_c']['custos'], $j['_c']['lucro'], $j['_c']['margem'], $j['_c']['lucro_hora']];
        usort($rows, fn($a, $b) => strcmp($b[0], $a[0])); $total = ['Total', count($rows) . ' trabalhos', '', $sumc($rows, 3), $sumc($rows, 4), $sumc($rows, 5), null, null]; break;
    case 'lucro_servico':
        $cols = [['Serviço principal', 't'], ['Trabalhos', 'i'], ['Receita', 'm'], ['Custos', 'm'], ['Lucro', 'm']];
        $rows = $flat($group($Jc, fn($j) => $SV[$j['servico_id']] ?? 'Outro / personalizado', [fn() => 1, fn($j) => num($j['valor']), fn($j) => $j['_c']['custos'], fn($j) => $j['_c']['lucro']]));
        $chart = [0, 4]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2), $sumc($rows, 3), $sumc($rows, 4)]; break;
    case 'iva':
        $cols = [['Mês', 't'], ['Documentos', 'i'], ['Base', 'm'], ['IVA', 'm'], ['Total', 'm']];
        $rows = $flat($group(array_filter($F, fn($f) => $in($f['data'])), fn($f) => substr($f['data'], 0, 7), [fn() => 1, fn($f) => $f['_c']['subtotal'], fn($f) => $f['_c']['iva'], fn($f) => $f['_c']['total']]));
        usort($rows, fn($a, $b) => strcmp($a[0], $b[0])); foreach ($rows as &$r) $r[0] = $ml($r[0]); unset($r);
        $total = ['Total', $sumc($rows, 1), $sumc($rows, 2), $sumc($rows, 3), $sumc($rows, 4)]; $chart = [0, 3]; break;
    case 'descontos':
        $cols = [['Data', 'd'], ['Documento', 't'], ['Cliente', 't'], ['Desconto', 'm']];
        foreach ($F as $f) { $d = $f['_c']['desc_pct'] + num($f['desconto']); if ($in($f['data']) && $d > 0) $rows[] = [$f['data'], $f['numero'], $cn($f['cliente_id']), round($d, 2)]; }
        $total = ['Total', count($rows) . ' documentos', '', $sumc($rows, 3)]; break;
    case 'trab_estado':
        $cols = [['Etapa', 't'], ['Trabalhos', 'i'], ['Valor', 'm']];
        $rows = $flat($group(array_filter($J, fn($j) => !in_array($j['estado'], ['Concluído', 'Cancelado'], true)), fn($j) => $j['estado'], [fn() => 1, fn($j) => num($j['valor'])]));
        $chart = [0, 1]; $total = ['Total em curso', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'tempo_servico':
        $cols = [['Serviço', 't'], ['Trabalhos', 'i'], ['Horas totais', 'n'], ['Horas médias', 'n'], ['Receita/hora', 'm']];
        foreach ($group($Jc, fn($j) => $SV[$j['servico_id']] ?? 'Outro', [fn() => 1, fn($j) => num($j['horas']), fn($j) => num($j['valor'])]) as $s => $v) $rows[] = [$s, $v[0], round($v[1], 2), round($v[0] ? $v[1] / $v[0] : 0, 2), $v[1] > 0 ? round($v[2] / $v[1], 2) : null];
        usort($rows, fn($a, $b) => $b[2] <=> $a[2]); $chart = [0, 3]; break;
    case 'tecnicos':
        $cols = [['Técnico', 't'], ['Trabalhos', 'i'], ['Horas', 'n'], ['Receita', 'm'], ['Lucro', 'm'], ['Lucro/hora', 'm']];
        foreach (all_rows('equipa') as $e) { $x = array_filter($Jc, fn($j) => (int)$j['tecnico_id'] === (int)$e['id']); $h = array_sum(array_map(fn($j) => num($j['horas']), $x)); $l = array_sum(array_map(fn($j) => $j['_c']['lucro'], $x));
            $rows[] = [$e['nome'], count($x), round($h, 2), round(array_sum(array_map(fn($j) => num($j['valor']), $x)), 2), round($l, 2), $h > 0 ? round($l / $h, 2) : null]; }
        usort($rows, fn($a, $b) => $b[3] <=> $a[3]); $chart = [0, 3]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2), $sumc($rows, 3), $sumc($rows, 4), null]; break;
    case 'marc_estado': case 'local':
        $M = array_filter(all_rows('marcacoes'), fn($m) => $in($m['data']));
        $cols = [[$k === 'local' ? 'Local' : 'Estado', 't'], ['Marcações', 'i'], ['Valor previsto', 'm']];
        $rows = $flat($group($M, fn($m) => ($k === 'local' ? $m['local'] : $m['estado']) ?: 'Não indicado', [fn() => 1, fn($m) => num($m['valor_previsto'])]));
        $chart = [0, 1]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'faltas': case 'sinais':
        $cols = $k === 'faltas' ? [['Data', 'd'], ['Cliente', 't'], ['Estado', 't'], ['Sinal', 'm'], ['Sinal retido', 't']] : [['Data', 'd'], ['Cliente', 't'], ['Estado', 't'], ['Sinal', 'm'], ['Pago', 't']];
        foreach (all_rows('marcacoes') as $m) if ($in($m['data']) && ($k === 'faltas' ? in_array($m['estado'], ['Faltou', 'Cancelada'], true) : num($m['sinal']) > 0))
            $rows[] = [$m['data'], $cn($m['cliente_id']), $m['estado'], num($m['sinal']), $m['sinal_pago'] ? ($k === 'faltas' && $m['estado'] === 'Faltou' ? 'Sim' : 'Pago') : 'Não'];
        usort($rows, fn($a, $b) => strcmp($b[0], $a[0])); $total = ['Total', count($rows) . ' marcações', '', $sumc($rows, 3), ''];
        if ($k === 'faltas') { $all = count(array_filter(all_rows('marcacoes'), fn($m) => $in($m['data']))); $note = 'Taxa de faltas e cancelamentos: ' . ($all ? round(count($rows) / $all * 100, 1) : 0) . "% das $all marcações do período."; }
        break;
    case 'dias_horas':
        $cols = [['Dia / hora', 't'], ['Marcações', 'i']]; $W = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']; $dw = array_fill_keys($W, 0); $hh = [];
        foreach (all_rows('marcacoes') as $m) if ($in($m['data']) && $m['estado'] !== 'Cancelada') { $dw[$W[(int)date('N', strtotime($m['data'])) - 1]]++; if ($m['hora']) { $h = substr($m['hora'], 0, 2) . 'h'; $hh[$h] = ($hh[$h] ?? 0) + 1; } }
        ksort($hh); foreach ($dw as $d => $n) $rows[] = [$d, $n]; foreach ($hh as $h => $n) $rows[] = ['Às ' . $h, $n]; $chart = [0, 1]; break;
    case 'novos_clientes':
        $cols = [['Mês', 't'], ['Novos clientes', 'i'], ['Novas leads', 'i']]; $CL = all_rows('clientes'); $LD = all_rows('leads');
        foreach ($months as $ym) $rows[] = [$ml($ym), count(array_filter($CL, fn($c) => str_starts_with((string)$c['created_at'], $ym))), count(array_filter($LD, fn($l) => str_starts_with((string)$l['data'], $ym)))];
        $chart = [0, 1]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'origem_clientes':
        $cols = [['Origem', 't'], ['Clientes', 'i'], ['Total pago (sempre)', 'm']]; $pc = []; foreach ($pays as $p) $pc[$p['c']] = ($pc[$p['c']] ?? 0) + $p['v'];
        $rows = $flat($group(all_rows('clientes'), fn($c) => $c['origem'] ?: 'Não indicado', [fn() => 1, fn($c) => $pc[$c['id']] ?? 0]));
        $chart = [0, 1]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'recorrencia':
        $cols = [['Visitas concluídas', 't'], ['Clientes', 'i']]; $v = []; foreach ($J as $j) if ($j['estado'] === 'Concluído' && $j['cliente_id']) $v[$j['cliente_id']] = ($v[$j['cliente_id']] ?? 0) + 1;
        $b = ['Sem visitas' => 0, '1 visita' => 0, '2–3 visitas' => 0, '4–9 visitas' => 0, '10 ou mais' => 0];
        foreach (array_keys($C) as $id) { $n = $v[$id] ?? 0; $b[$n === 0 ? 'Sem visitas' : ($n === 1 ? '1 visita' : ($n <= 3 ? '2–3 visitas' : ($n <= 9 ? '4–9 visitas' : '10 ou mais')))]++; }
        foreach ($b as $l => $n) $rows[] = [$l, $n]; $rep = count(array_filter($v, fn($n) => $n >= 2)); $note = 'Taxa de repetição: ' . (count($v) ? round($rep / count($v) * 100, 1) : 0) . '% dos clientes com visitas voltaram pelo menos mais uma vez.'; $chart = [0, 1]; break;
    case 'inativos':
        $cols = [['Cliente', 't'], ['Telemóvel', 't'], ['Última visita', 'd'], ['Dias sem visita', 'i'], ['Visitas', 'i']]; $last = []; $cnt = [];
        foreach ($J as $j) if ($j['estado'] === 'Concluído' && $j['cliente_id']) { $last[$j['cliente_id']] = max($last[$j['cliente_id']] ?? '', $j['data']); $cnt[$j['cliente_id']] = ($cnt[$j['cliente_id']] ?? 0) + 1; }
        $tel = $names('clientes', 'telefone');
        foreach ($last as $id => $d) { $dd = (int)((time() - strtotime($d)) / 86400); if ($dd > 90) $rows[] = [$C[$id] ?? '?', $tel[$id] ?? '', $d, $dd, $cnt[$id]]; }
        usort($rows, fn($a, $b) => $b[4] <=> $a[4]); $note = 'Boa lista para uma campanha de reativação (Lembretes & follow-ups).'; break;
    case 'leads_origem':
        $cols = [['Origem', 't'], ['Leads', 'i'], ['Ganhas', 'i'], ['Conversão', 'p']];
        foreach ($group(array_filter(all_rows('leads'), fn($l) => $in($l['data'])), fn($l) => $l['origem'] ?: 'Não indicado', [fn() => 1, fn($l) => $l['estado'] === 'Ganho' ? 1 : 0]) as $o => $v) $rows[] = [$o, $v[0], $v[1], $v[0] ? round($v[1] / $v[0] * 100, 1) : 0];
        usort($rows, fn($a, $b) => $b[1] <=> $a[1]); $chart = [0, 1]; $t1 = $sumc($rows, 1); $t2 = $sumc($rows, 2); $total = ['Total', $t1, $t2, $t1 ? round($t2 / $t1 * 100, 1) : 0]; break;
    case 'campanhas':
        $cols = [['Campanha', 't'], ['Canal', 't'], ['Investimento', 'm'], ['Leads', 'i'], ['Clientes', 'i'], ['Receita', 'm'], ['ROI', 'p']];
        foreach (with_calc('marketing', all_rows('marketing')) as $m) $rows[] = [$m['campanha'], $m['canal'], num($m['custo']), (int)$m['leads'], (int)$m['clientes'], num($m['receita']), $m['_c']['roi']];
        $chart = [0, 5]; $total = ['Total', '', $sumc($rows, 2), $sumc($rows, 3), $sumc($rows, 4), $sumc($rows, 5), $sumc($rows, 2) > 0 ? round(($sumc($rows, 5) - $sumc($rows, 2)) / $sumc($rows, 2) * 100, 1) : null]; break;
    case 'avaliacoes':
        $cols = [['Plataforma', 't'], ['Registos', 'i'], ['Recebidas', 'i'], ['Pontuação média', 'n']];
        foreach ($group(array_filter(all_rows('avaliacoes'), fn($a) => $in($a['data']) && $a['tipo'] !== 'Referência'), fn($a) => $a['plataforma'] ?: 'Outra', [fn() => 1, fn($a) => $a['estado'] === 'Recebida' || $a['estado'] === 'Recompensa entregue' ? 1 : 0, fn($a) => num($a['pontuacao']), fn($a) => num($a['pontuacao']) > 0 ? 1 : 0]) as $p => $v)
            $rows[] = [$p, $v[0], $v[1], $v[3] ? round($v[2] / $v[3], 2) : null];
        $chart = [0, 2]; break;
    case 'frotas':
        $cols = [['Cliente profissional', 't'], ['Tipo', 't'], ['Desconto', 'p'], ['Trabalhos', 'i'], ['Pago no período', 'm']];
        foreach (all_rows('clientes') as $c) if (in_array($c['tipo'], ['Empresa', 'Frota', 'Stand'], true) || num($c['desconto_pct']) > 0)
            $rows[] = [$c['nome'], $c['tipo'] ?: 'Particular', num($c['desconto_pct']), count(array_filter($Jc, fn($j) => (int)$j['cliente_id'] === (int)$c['id'])), round(array_sum(array_map(fn($p) => (int)$p['c'] === (int)$c['id'] && $in($p['d']) ? $p['v'] : 0, $pays)), 2)];
        usort($rows, fn($a, $b) => $b[4] <=> $a[4]); $chart = [0, 4]; $total = ['Total', '', null, $sumc($rows, 3), $sumc($rows, 4)]; break;
    case 'stock_valor':
        $cols = [['Categoria', 't'], ['Artigos', 'i'], ['Valor em stock', 'm']];
        $rows = $flat($group(with_calc('inventario', all_rows('inventario')), fn($i) => $i['categoria'] ?: 'Outro', [fn() => 1, fn($i) => $i['_c']['valor_stock']]));
        $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'stock_baixo':
        $cols = [['Artigo', 't'], ['Fornecedor', 't'], ['Em stock', 'n'], ['Repor a', 'n'], ['Estado', 't'], ['Custo unit.', 'm']];
        foreach (with_calc('inventario', all_rows('inventario')) as $i) if ($i['_c']['alerta']) $rows[] = [$i['nome'], $i['fornecedor'], num($i['quantidade']), num($i['nivel_minimo']), $i['_c']['alerta'], num($i['custo_unitario'])];
        $note = $rows ? 'Registe a encomenda em Fornecedores & Compras — ao receber entra no stock e na despesa.' : 'Tudo em stock.'; break;
    case 'consumo':
        $cols = [['Produto', 't'], ['Utilizações', 'i'], ['Quantidade', 'n'], ['Custo', 'm']]; $L = [];
        foreach ($Jc as $j) foreach (jdec($j['produtos_usados']) as $l) $L[] = $l;
        $rows = $flat($group($L, fn($l) => $l['d'] ?? 'Produto', [fn() => 1, fn($l) => num($l['q'] ?? 0), fn($l) => num($l['c'] ?? 0)]));
        $chart = [0, 3]; $total = ['Total', $sumc($rows, 1), null, $sumc($rows, 3)];
        $note = 'Custo médio de produtos por trabalho concluído: ' . number_format(count($Jc) ? array_sum(array_map(fn($j) => num($j['custo_produtos']), $Jc)) / count($Jc) : 0, 2, ',', '.') . ' €.'; break;
    case 'manutencoes':
        $cols = [['Equipamento', 't'], ['Estado', 't'], ['Última revisão', 'd'], ['Próxima', 'd'], ['Alerta', 't']];
        foreach (with_calc('equipamentos', all_rows('equipamentos')) as $e) if ($e['estado'] !== 'Abatido') $rows[] = [$e['nome'], $e['estado'], $e['ultima_manutencao'], $e['_c']['proxima'], $e['_c']['alerta'] ?: 'OK'];
        usort($rows, fn($a, $b) => strcmp((string)$a[3], (string)$b[3])); break;
    case 'compras_forn':
        $cols = [['Fornecedor', 't'], ['Compras', 'i'], ['Total', 'm']]; $FO = $names('fornecedores');
        $rows = $flat($group(array_filter(all_rows('compras'), fn($c) => $in($c['data']) && $c['estado'] !== 'Cancelada'), fn($c) => $FO[$c['fornecedor_id']] ?? '?', [fn() => 1, fn($c) => num($c['valor'])]));
        $chart = [0, 2]; $total = ['Total', $sumc($rows, 1), $sumc($rows, 2)]; break;
    case 'mrr':
        $cols = [['Cliente', 't'], ['Plano', 't'], ['Frequência', 't'], ['Valor', 'm'], ['Equivalente mensal', 'm'], ['Renova em', 'd']];
        foreach (all_rows('subscricoes') as $s) if ($s['estado'] === 'Ativa') $rows[] = [$cn($s['cliente_id']), $s['plano'], $s['frequencia'], num($s['valor']), round(num($s['valor']) * (FREQ_MES[$s['frequencia']] ?? 1), 2), $s['validade']];
        usort($rows, fn($a, $b) => $b[4] <=> $a[4]); $total = ['MRR', count($rows) . ' ativas', '', $sumc($rows, 3), $sumc($rows, 4), null]; break;
    case 'garantias':
        $cols = [['Cliente', 't'], ['Produto', 't'], ['Aplicação', 'd'], ['Válida até', 'd'], ['Estado', 't']];
        foreach (with_calc('garantias', all_rows('garantias')) as $g) $rows[] = [$cn($g['cliente_id']), $g['produto'] ?? '', $g['data'], $g['_c']['validade'], $g['_c']['alerta'] ?: 'Em dia'];
        usort($rows, fn($a, $b) => strcmp((string)$a[3], (string)$b[3])); break;
    }
    return ['k' => $k, 'title' => $title, 'per' => $per, 'cols' => $cols, 'rows' => array_values($rows), 'chart' => $chart, 'total' => $total, 'note' => $note];
}
