<?php
/* Dados iniciais: serviços, modelos de mensagem e (opcional) dados de demonstração. */
function seed_insert(string $e, array $r): int {
    $r['created_at'] = $r['updated_at'] = now();
    foreach ($r as $k => $v) if (is_array($v)) $r[$k] = json_encode(($k === 'notas_servicos') ? (object)$v : $v, JSON_UNESCAPED_UNICODE);
    $cols = implode(',', array_map(fn($k) => "`$k`", array_keys($r)));
    db()->prepare('INSERT INTO ' . T($e) . " ($cols) VALUES (" . implode(',', array_fill(0, count($r), '?')) . ')')->execute(array_values($r));
    return (int)db()->lastInsertId();
}

function seed_base(string $ownerName, bool $services = true, string $cor = '#ef4444'): void {
    $serv = [
        ['Lavagem Exterior Premium', 'Pacote', 'Lavagem', 25, 30, 38, 1, 2.5, "Pré-lavagem com snow foam\nLavagem com método dos 2 baldes\nLimpeza de jantes e pneus\nSecagem com microfibra / ar\nVidros exteriores\nDressing de pneus"],
        ['Limpeza Interior Completa', 'Pacote', 'Interior', 50, 60, 75, 2.5, 6, "Aspiração completa\nLimpeza de plásticos e tablier\nLimpeza de vidros interiores\nLimpeza de tapetes\nHidratação de plásticos\nAmbientador"],
        ['Detalhe Completo (Interior + Exterior)', 'Pacote', 'Completo', 110, 130, 160, 5, 12, "Pré-lavagem e lavagem 2 baldes\nDescontaminação química e mecânica (clay bar)\nJantes e cavas de rodas\nAspiração e limpeza interior completa\nLimpeza e hidratação de pele\nVidros interior e exterior\nSelante de proteção (3 meses)"],
        ['Correção de Pintura 1 Fase', 'Pacote', 'Correção de pintura', 180, 220, 280, 8, 18, "Lavagem e descontaminação\nMedição de espessura de verniz\nPolimento 1 fase\nLimpeza com IPA\nProteção final"],
        ['Correção de Pintura 2 Fases', 'Pacote', 'Correção de pintura', 300, 360, 450, 14, 30, "Lavagem e descontaminação\nMedição de espessura de verniz\nCorte (compound)\nAcabamento (finishing)\nLimpeza com IPA\nProteção final"],
        ['Proteção Cerâmica 3 Anos', 'Pacote', 'Proteção cerâmica', 450, 520, 620, 16, 60, "Lavagem e descontaminação completa\nCorreção de pintura 1 fase\nPreparação IPA\nAplicação de cerâmico na pintura\nCerâmico em jantes\nCerâmico em vidros\nCura e inspeção final"],
        ['PPF Frente Completa', 'Pacote', 'PPF', 1200, 1400, 1600, 20, 350, "Lavagem e descontaminação\nDesmontagem de emblemas/componentes\nAplicação de PPF\nRemontagem\nInspeção final"],
        ['Manutenção Mensal', 'Pacote', 'Manutenção', 35, 40, 50, 1.5, 3, "Lavagem exterior manutenção\nAspiração rápida\nVidros\nTopper de proteção"],
        ['Remoção de pelos de animais', 'Extra', 'Interior', 20, 25, 35, 0.75, 1, ''],
        ['Tratamento de odores (ozono)', 'Extra', 'Interior', 30, 30, 35, 1, 2, ''],
        ['Limpeza de estofos (extração)', 'Extra', 'Interior', 40, 50, 60, 1.5, 4, ''],
        ['Limpeza e hidratação de pele', 'Extra', 'Interior', 35, 40, 50, 1, 4, ''],
        ['Limpeza do compartimento do motor', 'Extra', 'Exterior', 25, 30, 35, 0.75, 2, ''],
        ['Restauro de óticas', 'Extra', 'Restauro', 40, 45, 50, 1, 5, ''],
        ['Cera / selante', 'Extra', 'Exterior', 25, 30, 40, 0.75, 4, ''],
    ];
    $extra = [
        'Lavagem Exterior Premium' => ['O brilho do primeiro dia.', 'Lavagem segura sem riscos', '1 hora', 'Lavagem manual com método dos dois baldes, espuma ativa e secagem sem contacto — sem escovas, sem micro-riscos.', 0],
        'Limpeza Interior Completa' => ['Habitáculo como novo.', 'Higienização profunda', '2–3 horas', 'Aspiração detalhada, limpeza de todas as superfícies, vidros e tapetes, com hidratação final dos plásticos.', 0],
        'Detalhe Completo (Interior + Exterior)' => ['O reset total, por dentro e por fora.', 'Selante 3 meses', '1 dia', 'Lavagem e descontaminação completas, interior higienizado e pele hidratada, terminando com selante de proteção.', 1],
        'Correção de Pintura 1 Fase' => ['Mais brilho, menos marcas.', 'Polimento 1 fase', '1 dia', 'Polimento de acabamento que remove micro-riscos ligeiros e devolve brilho e profundidade à pintura.', 0],
        'Correção de Pintura 2 Fases' => ['Riscos fora. Profundidade de volta.', 'Polimento multi-fase', '1–2 dias', 'Polimento à máquina em várias fases que remove swirls, hologramas e oxidação em vez de os esconder. Medimos a espessura do verniz antes de começar e terminamos cada painel sob luz de estúdio.', 1],
        'Proteção Cerâmica 3 Anos' => ['Anos de brilho vítreo.', 'Cerâmico 3 anos', '2 dias', 'Revestimento cerâmico profissional aplicado sobre pintura corrigida: brilho intenso, efeito hidrofóbico e lavagens muito mais fáceis durante anos.', 1],
        'PPF Frente Completa' => ['Escudo invisível contra pedras.', 'Película PPF auto-regenerativa', '2–3 dias', 'Película de proteção de pintura transparente na frente do veículo, contra lascas de pedras, insetos e riscos.', 0],
        'Manutenção Mensal' => ['Sempre impecável, sem esforço.', 'Manutenção da proteção', '1–2 horas', 'Plano de manutenção regular que conserva a proteção aplicada e mantém o carro sempre apresentável.', 0],
    ];
    if ($services) {
    $i = 0;
    foreach ($serv as $s) { $x = $extra[$s[0]] ?? ['', '', '', '', 0]; $i++;
        seed_insert('servicos', ['nome' => $s[0], 'tipo' => $s[1], 'categoria' => $s[2], 'preco_pequeno' => $s[3], 'preco_medio' => $s[4], 'preco_grande' => $s[5], 'duracao_h' => $s[6], 'custo_produtos' => $s[7], 'tarefas_padrao' => $s[8], 'ativo' => 1, 'publico' => 1,
            'slogan' => $x[0] ?: null, 'resultado' => $x[1] ?: null, 'duracao_txt' => $x[2] ?: null, 'descricao' => $x[3] ?: null, 'destaque' => $x[4], 'ordem' => $i * 10]); }
    // Serviço-montra: restauro completo (exemplo de detalhe completo de um Porsche 911 996)
    seed_insert('servicos', ['nome' => 'Restauro Completo Premium', 'tipo' => 'Pacote', 'categoria' => 'Restauro', 'preco_pequeno' => 2500, 'preco_medio' => 2850, 'preco_grande' => 3400, 'duracao_h' => 60, 'custo_produtos' => 420,
        'ativo' => 1, 'publico' => 1, 'destaque' => 1, 'ordem' => 5, 'slogan' => 'Cada detalhe. Como saiu de fábrica.', 'resultado' => 'Restauro + cerâmico total', 'duracao_txt' => '1–2 semanas',
        'descricao' => 'O nosso serviço mais completo, pensado para clássicos e desportivos: desmontagem, restauro de interiores e mecânica ligeira, correção de pintura e proteção cerâmica integral. Cada tarefa é registada e pode acompanhá-la na sua área de cliente.',
        'tarefas_padrao' => "Pintura das pinças de travão (desmontar e montar)\nEstofador — restauro de bancos\nLavagem e proteção do chassis e cavas de rodas\nRestauro de pinças\nMudança de óleo e sangria de travões\nCorreção de pintura\nProteção cerâmica em vidros, plásticos, pintura, jantes e pinças\nRestauro de plásticos interiores, mala e escovas\nDesmontagem de bancos e quartelas\nLimpeza de material antigo\nRestauro de bancos, quartelas, manete, cinzeiro e travão de mão\nLimpeza completa do interior\nHidratação de plásticos e pele\nTratamento do compartimento do motor\nMicro-retoque na pintura\nPPF nas óticas\nProteção das embaladeiras\nLimpeza dos botões do rádio\nLimpeza do sistema de AC\nPintura das calhas\nPintura dos emblemas\nVidros\nPolimento das ponteiras de escape"]);

    }
    $msg = [
        ['Confirmação de marcação', 'WhatsApp', 'Confirmação da sua marcação', "Olá {primeiro_nome}! 👋\nConfirmamos a sua marcação de *{servico}* para o {veiculo} no dia {data} às {hora}.\nQualquer alteração, responda a esta mensagem.\n{empresa}"],
        ['Lembrete (véspera)', 'WhatsApp', 'Lembrete da sua marcação', "Olá {primeiro_nome}, lembramos que amanhã ({data}) às {hora} temos a marcação de {servico} para o seu {veiculo}. Até amanhã! 🚗✨\n{empresa}"],
        ['Viatura pronta', 'WhatsApp', 'A sua viatura está pronta', "Olá {primeiro_nome}! O seu {veiculo} está pronto para levantamento. 🙌\nValor: {valor}\nObrigado pela preferência!\n{empresa}"],
        ['Envio de orçamento', 'Email', 'Orçamento {empresa}', "Olá {primeiro_nome},\n\nConforme combinado, segue o orçamento para o {veiculo} no valor de {valor}.\nEstamos disponíveis para qualquer esclarecimento.\n\nCumprimentos,\n{empresa}\n{telefone_empresa}"],
        ['Follow-up de orçamento', 'WhatsApp', 'Seguimento do orçamento', "Olá {primeiro_nome}, tudo bem? Queria saber se teve oportunidade de ver o orçamento para o {veiculo}. Temos disponibilidade nas próximas semanas — quer que reserve uma data? 🙂"],
        ['Pedido de avaliação', 'WhatsApp', 'A sua opinião é importante', "Olá {primeiro_nome}! Esperamos que esteja a gostar do resultado no seu {veiculo}. ✨\nSe puder deixar uma avaliação, ajuda-nos imenso:\n⭐ Google: {link_avaliacao}\n👍 Facebook: {link_facebook}\nObrigado! {empresa}"],
        ['Lembrete de manutenção', 'SMS', 'Está na hora da manutenção', "Olá {primeiro_nome}, já passou algum tempo desde o último tratamento do seu {veiculo}. Para manter a proteção em dia, recomendamos uma manutenção. Quer marcar? {empresa}"],
        ['Pedido de referência', 'WhatsApp', 'Recomende-nos', "Olá {primeiro_nome}! Se conhecer alguém que queira o carro como novo, recomende-nos 🙌 Por cada amigo que marcar, oferecemos-lhe 10% de desconto no próximo serviço. {empresa}"],
        ['Aniversário', 'WhatsApp', 'Parabéns!', "Parabéns {primeiro_nome}! 🎉 Para celebrar, tem 15% de desconto em qualquer serviço este mês. {empresa}"],
    ];
    foreach ($msg as $m) seed_insert('mensagens', ['nome' => $m[0], 'canal' => $m[1], 'assunto' => $m[2], 'texto' => $m[3]]);
    seed_insert('equipa', ['nome' => $ownerName ?: 'Proprietário', 'funcao' => 'Proprietário / Detailer', 'custo_hora' => 12, 'comissao_pct' => 0, 'cor' => $cor, 'ativo' => 1]);
}

function seed_demo(): void {
    $d = fn($o) => date('Y-m-d', strtotime($o));
    $tec2 = seed_insert('equipa', ['nome' => 'Rui Costa', 'funcao' => 'Detailer', 'custo_hora' => 9, 'comissao_pct' => 5, 'cor' => '#a78bfa', 'ativo' => 1]);
    $tec1 = 1;
    $cl = [];
    foreach ([['Ana Martins', '912345678', 'Instagram', 'Lisboa'], ['João Ferreira', '934567890', 'Google', 'Cascais'], ['Marta Silva', '965432187', 'Recomendação', 'Oeiras'], ['Pedro Almeida', '917654321', 'Facebook', 'Sintra'], ['Ricardo Sousa', '926789012', 'Website', 'Lisboa']] as $c)
        $cl[] = seed_insert('clientes', ['nome' => $c[0], 'telefone' => $c[1], 'origem' => $c[2], 'localidade' => $c[3], 'tipo' => 'Particular', 'rgpd' => 1]);
    $vs = [
        [$cl[0], 'Tesla', 'Model Y', 2023, 'AA-12-BC', 'Preto', 'SUV'],
        [$cl[1], 'BMW', 'M340i', 2022, 'BX-45-RT', 'Cinzento', 'Médio'],
        [$cl[2], 'Volkswagen', 'Golf GTI', 2021, '45-ZZ-12', 'Branco', 'Médio'],
        [$cl[3], 'Toyota', 'Land Cruiser', 2020, '78-TT-90', 'Branco', 'SUV'],
        [$cl[4], 'Porsche', '911 (996)', 2001, '12-AB-34', 'Preto', 'Médio'],
    ];
    $vid = [];
    foreach ($vs as $v) $vid[] = seed_insert('veiculos', ['cliente_id' => $v[0], 'marca' => $v[1], 'modelo' => $v[2], 'ano' => $v[3], 'matricula' => $v[4], 'cor' => $v[5], 'tamanho' => $v[6], 'proximo_servico' => $d('+10 days')]);
    $porsche = ["Pintar 2 pinças / desmontar e montar", "Estufador", "Lavagem + proteção chassis e cavas de rodas", "Restaurar pinças", "Mudança de óleo / sangrar travões", "Correção de pintura", "Proteção cerâmica: vidros / plásticos / pintura / jantes e pinças", "Restauro plásticos / plásticos interior da mala e escovas", "Desmontar bancos, quartelas", "Limpar material antigo", "Pintar / restaurar bancos / quartelas / moca velocidades / cinzeiro / travão de mão", "Limpeza completa interior", "Hidratação plásticos e pele", "Tratamento cofre do motor", "Micro retoque na pintura", "PPF nas óticas", "Plástico embaladeiras", "Limpar botões do rádio", "Limpeza AC", "Pintar calhas", "Pintar logótipo emblemas", "Vidros", "Polimento ponteiras escape"];
    $grp = fn($i) => $i <= 4 ? 'Mecânica & travões' : ($i <= 6 ? 'Correção de pintura & proteção cerâmica' : ($i <= 12 ? 'Interior & estofador' : 'Exterior & acabamentos'));
    $tarefas = array_map(fn($t, $i) => ['t' => $t, 'd' => $i < 20, 's' => $grp($i)] + ($i === 9 ? ['n' => 'Material antigo dos bancos retirado e guardado para o cliente.'] : []), $porsche, array_keys($porsche));
    $notasServ = ['Mecânica & travões' => 'Óleo 5W-40 (8,5 L). Líquido de travões DOT 4. Pinças pintadas em vermelho a pedido do cliente.',
        'Correção de pintura & proteção cerâmica' => 'Espessura média do verniz 118 µm. Correção em 2 fases; 2 camadas de cerâmico na pintura, 1 nas jantes e vidros.',
        'Interior & estofador' => 'Bancos enviados ao estofador dia 12 — regressaram dia 15.',
        'Exterior & acabamentos' => 'Faltam: emblemas, vidros e ponteiras de escape. Entrega prevista após controlo de qualidade.'];
    seed_insert('trabalhos', ['numero' => 'OT-' . date('Y') . '-0006', 'data' => $d('-3 days'), 'cliente_id' => $cl[4], 'veiculo_id' => $vid[4], 'servico_id' => 16, 'tecnico_id' => $tec1, 'estado' => 'Controlo de qualidade', 'box' => 'Box 4', 'portal_visivel' => 1, 'extras' => 'Restauro completo Porsche 911 (996) preto', 'tarefas' => $tarefas, 'notas_servicos' => $notasServ, 'valor' => 2850, 'custo_produtos' => 420, 'horas' => 62, 'outros_custos' => 180, 'data_entrega' => $d('+2 days')]);
    $jobs = [
        [$d('-25 days'), 0, 3, 'Concluído', 130, 12, 5], [$d('-20 days'), 1, 4, 'Concluído', 220, 18, 8], [$d('-14 days'), 2, 1, 'Concluído', 30, 2.5, 1],
        [$d('-9 days'), 3, 6, 'Concluído', 620, 60, 15], [$d('-5 days'), 0, 8, 'Concluído', 40, 3, 1.5], [$d('-40 days'), 1, 3, 'Concluído', 130, 12, 5],
        [$d('-70 days'), 2, 5, 'Concluído', 360, 30, 13], [$d('-1 days'), 3, 2, 'Interior', 75, 6, 2.5], [$d('+0 days'), 1, 1, 'Lavagem', 30, 2.5, 1],
    ];
    foreach ($jobs as $i => $j) {
        $sv = db()->query('SELECT tarefas_padrao FROM ' . T('servicos') . ' WHERE id = ' . $j[2])->fetchColumn();
        $t = array_values(array_filter(array_map('trim', explode("\n", (string)$sv))));
        seed_insert('trabalhos', ['numero' => 'OT-' . date('Y') . '-' . str_pad((string)($i + 7), 4, '0', STR_PAD_LEFT), 'data' => $j[0], 'cliente_id' => $cl[$j[1]], 'veiculo_id' => $vid[$j[1]], 'servico_id' => $j[2], 'tecnico_id' => $i % 2 ? $tec2 : $tec1, 'estado' => $j[3], 'valor' => $j[4], 'custo_produtos' => $j[5], 'horas' => $j[6], 'gorjeta' => $i % 3 ? 0 : 10,
            'tarefas' => array_map(fn($x) => ['t' => $x, 'd' => $j[3] === 'Concluído', 's' => db()->query('SELECT nome FROM ' . T('servicos') . ' WHERE id = ' . $j[2])->fetchColumn()], $t)]);
    }
    foreach ([[0, '+0 days', '10:00', 8, 'Confirmada', 40, 0, 'Box 1'], [1, '+1 days', '09:00', 3, 'Confirmada', 130, 0, 'Box 2'], [2, '+2 days', '14:30', 4, 'Pendente', 220, 50, 'Box 1'], [3, '+4 days', '09:30', 6, 'Pendente', 620, 150, 'Box 3'], [2, '-6 days', '11:00', 1, 'Faltou', 30, 0, 'Box 2']] as $m)
        seed_insert('marcacoes', ['cliente_id' => $cl[$m[0]], 'veiculo_id' => $vid[$m[0]], 'data' => $d($m[1]), 'hora' => $m[2], 'servico_id' => $m[3], 'tecnico_id' => $tec1, 'estado' => $m[4], 'local' => 'Oficina', 'duracao_h' => 3, 'valor_previsto' => $m[5], 'sinal' => $m[6] ?: null, 'sinal_pago' => $m[6] > 100 ? 1 : 0, 'box' => $m[7]]);
    seed_insert('orcamentos', ['numero' => 'ORC-' . date('Y') . '-0001', 'data' => $d('-4 days'), 'validade' => $d('+11 days'), 'cliente_id' => $cl[1], 'veiculo_id' => $vid[1], 'estado' => 'Enviado', 'iva_pct' => 23, 'deslocacao' => 10, 'desconto' => 20,
        'linhas' => [['d' => 'Detalhe Completo (Interior + Exterior)', 'q' => 1, 'p' => 130], ['d' => 'Proteção Cerâmica 3 Anos', 'q' => 1, 'p' => 520]]]);
    seed_insert('faturas', ['numero' => 'REC-' . date('Y') . '-0001', 'data' => $d('-9 days'), 'vencimento' => $d('-2 days'), 'cliente_id' => $cl[3], 'estado' => 'Parcial', 'iva_pct' => 23, 'valor_pago' => 400, 'metodo' => 'MB Way', 'data_pagamento' => $d('-9 days'), 'linhas' => [['d' => 'Proteção Cerâmica 3 Anos', 'q' => 1, 'p' => 620]],
        'pagamentos' => [['d' => $d('-12 days'), 'v' => 150, 'm' => 'MB Way', 'n' => 'Sinal da marcação'], ['d' => $d('-9 days'), 'v' => 250, 'm' => 'Multibanco', 'n' => '']]]);
    seed_insert('faturas', ['numero' => 'REC-' . date('Y') . '-0002', 'ref_externa' => 'FT 2026/118', 'data' => $d('-25 days'), 'vencimento' => $d('-25 days'), 'cliente_id' => $cl[0], 'estado' => 'Paga', 'iva_pct' => 23, 'valor_pago' => 159.9, 'metodo' => 'MB Way', 'data_pagamento' => $d('-25 days'),
        'linhas' => [['d' => 'Detalhe Completo (Interior + Exterior)', 'q' => 1, 'p' => 130]], 'pagamentos' => [['d' => $d('-25 days'), 'v' => 159.9, 'm' => 'MB Way', 'n' => '']]]);
    seed_insert('garantias', ['numero' => 'CER-' . date('Y') . '-0001', 'data' => $d('-9 days'), 'cliente_id' => $cl[3], 'veiculo_id' => $vid[3], 'tecnico_id' => $tec1, 'produto' => 'Cerâmico 9H Pro', 'camadas' => 2, 'anos' => 3,
        'superficies' => 'Pintura, vidros, jantes, plásticos exteriores', 'intervalo_meses' => 12]);
    seed_insert('garantias', ['numero' => 'CER-' . date('Y') . '-0002', 'data' => date('Y-m-d', strtotime('-11 months -20 days')), 'cliente_id' => $cl[1], 'veiculo_id' => $vid[1], 'tecnico_id' => $tec1, 'produto' => 'Cerâmico 9H', 'camadas' => 1, 'anos' => 2,
        'superficies' => 'Pintura e jantes', 'intervalo_meses' => 12]);
    seed_insert('inspecoes', ['data' => $d('-3 days'), 'momento' => 'Entrada (check-in)', 'cliente_id' => $cl[4], 'veiculo_id' => $vid[4], 'km' => 148200, 'combustivel' => '1/2', 'objetos' => 'Chave suplente',
        'pedidos' => 'Restauro completo. Cuidado com os emblemas e frisos.', 'assinado_por' => 'Ricardo Sousa',
        'mapa' => [['x' => 72, 'y' => 22, 't' => 'Risco', 'n' => 'Risco ligeiro, guarda-lamas frente direito'], ['x' => 30, 'y' => 78, 't' => 'Lasca', 'n' => 'Lasca de pedra, painel traseiro esquerdo']],
        'exterior' => [['t' => 'Riscos', 'd' => true], ['t' => 'Mossas', 'd' => false], ['t' => 'Lascas na pintura', 'd' => true], ['t' => 'Jantes danificadas', 'd' => false]],
        'interior' => [['t' => 'Manchas nos estofos', 'd' => true], ['t' => 'Pele gasta / rachada', 'd' => true], ['t' => 'Odores (tabaco/animais)', 'd' => false]]]);
    seed_insert('leads', ['data' => $d('-6 days'), 'nome' => 'Tiago Lopes', 'telefone' => '911222333', 'origem' => 'Instagram', 'servico_interesse' => 'Cerâmico', 'valor_estimado' => 500, 'estado' => 'Contactado', 'data_followup' => $d('-1 days')]);
    seed_insert('leads', ['data' => $d('-12 days'), 'nome' => 'Sofia Rocha', 'origem' => 'Google', 'servico_interesse' => 'Limpeza interior', 'valor_estimado' => 60, 'estado' => 'Ganho']);
    seed_insert('subscricoes', ['cliente_id' => $cl[0], 'veiculo_id' => $vid[0], 'plano' => 'Manutenção Mensal', 'valor' => 40, 'frequencia' => 'Mensal', 'estado' => 'Ativa', 'data_inicio' => $d('-90 days'), 'proxima_visita' => $d('+3 days')]);
    seed_insert('subscricoes', ['cliente_id' => $cl[2], 'veiculo_id' => $vid[2], 'plano' => 'Lavagem quinzenal', 'valor' => 25, 'frequencia' => 'Quinzenal', 'estado' => 'Ativa', 'data_inicio' => $d('-30 days'), 'proxima_visita' => $d('+6 days')]);
    foreach ([['Snow foam pH neutro', 'Químico', 'L', 2, 3, 18.9, 5000, 10, 100], ['Descontaminante férrico', 'Químico', 'L', 4, 2, 22.5, 1000, 0, 80], ['APC multiusos', 'Químico', 'L', 3, 2, 14, 5000, 10, 150], ['Microfibras 40x40', 'Microfibras', 'un', 18, 20, 1.8, 0, 0, 0], ['Cerâmico 50ml', 'Cerâmico / proteção', 'un', 1, 2, 75, 50, 0, 15]] as $i)
        seed_insert('inventario', ['nome' => $i[0], 'categoria' => $i[1], 'unidade' => $i[2], 'quantidade' => $i[3], 'nivel_minimo' => $i[4], 'custo_unitario' => $i[5], 'volume_ml' => $i[6] ?: null, 'diluicao' => $i[7], 'ml_por_uso' => $i[8] ?: null, 'fornecedor' => 'Fornecedor Demo']);
    seed_insert('equipamentos', ['nome' => 'Máquina de alta pressão', 'tipo' => 'Máquina de pressão', 'marca_modelo' => 'Kränzle K1152', 'ultima_manutencao' => $d('-100 days'), 'intervalo_dias' => 90, 'estado' => 'Operacional', 'valor_compra' => 890]);
    seed_insert('equipamentos', ['nome' => 'Polidora roto-orbital 15mm', 'tipo' => 'Polidora', 'ultima_manutencao' => $d('-80 days'), 'intervalo_dias' => 90, 'estado' => 'Operacional', 'valor_compra' => 420]);
    foreach ([['-20 days', 'Combustível', 'Gasóleo carrinha', 'Galp', 70], ['-15 days', 'Seguros', 'Seguro responsabilidade civil', 'Seguradora', 45], ['-10 days', 'Marketing / publicidade', 'Anúncios Instagram', 'Meta', 60], ['-8 days', 'Produtos / stock', 'Encomenda químicos', 'Fornecedor Demo', 210], ['-3 days', 'Software', 'Subscrição faturação certificada', 'Software', 15]] as $x)
        seed_insert('despesas', ['data' => $d($x[0]), 'categoria' => $x[1], 'descricao' => $x[2], 'fornecedor' => $x[3], 'valor' => $x[4]]);
    seed_insert('deslocacoes', ['data' => $d('-9 days'), 'origem' => 'Oficina', 'destino' => 'Sintra', 'km' => 46, 'finalidade' => 'Serviço ao domicílio', 'tecnico_id' => $tec1]);
    seed_insert('avaliacoes', ['data' => $d('-8 days'), 'tipo' => 'Avaliação', 'cliente_id' => $cl[3], 'plataforma' => 'Google', 'pontuacao' => 5, 'estado' => 'Recebida', 'texto' => 'Trabalho impecável, o carro parece novo!', 'testemunho_ok' => 1]);
    seed_insert('avaliacoes', ['data' => $d('-4 days'), 'tipo' => 'Avaliação', 'cliente_id' => $cl[0], 'plataforma' => 'Google', 'estado' => 'Pedido enviado']);
    seed_insert('marketing', ['campanha' => 'Promoção cerâmico Primavera', 'canal' => 'Instagram', 'data_inicio' => $d('-30 days'), 'data_fim' => $d('-1 days'), 'custo' => 60, 'leads' => 9, 'clientes' => 2, 'receita' => 980, 'codigo' => 'CERAMICO10']);
}
