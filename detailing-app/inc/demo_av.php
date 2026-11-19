<?php
/**
 * Demonstração "AV Car Detail" — Restauro | Detalhe Auto.
 * Serviços e preços baseados na tabela da marca; clientes, viaturas e movimentos são FICTÍCIOS (dados de teste).
 */
require_once __DIR__ . '/seed.php';

function seed_av(string $ownerName): void {
    $owner = $ownerName ?: 'André Valente';
    $d = fn($o) => date('Y-m-d', strtotime($o));
    $Y = date('Y');

    // ---------- Marca ----------
    $logo = 'av_logo_' . bin2hex(random_bytes(4)) . '.png';
    @copy(APP_ROOT . '/demo/av-car-detail/logo.png', APP_ROOT . '/uploads/' . $logo);
    foreach ([
        'empresa_nome' => 'AV Car Detail', 'empresa_responsavel' => $owner, 'app_nome' => 'AV Car Detail', 'slogan' => 'Restauro | Detalhe Auto',
        'cor' => '#e11d2a', 'tema' => 'escuro', 'logo' => is_file(APP_ROOT . '/uploads/' . $logo) ? $logo : '', 'logo_inverter' => '1',
        'iva_isento' => '1', 'reserva_impostos' => '25', 'custo_hora' => '10', 'custos_fixos' => '650', 'horas_mes' => '150', 'objetivo_mensal' => '4500', 'margem_alvo' => '45',
        'empresa_telefone' => '912 000 000', 'empresa_email' => 'geral@avcardetail.pt', 'empresa_web' => 'instagram.com/avcardetail',
        'portal_titulo' => 'Para quem gosta de um carro cuidado.',
        'portal_texto' => 'Tratamentos premium de limpeza, proteção, detalhe e restauro para um brilho duradouro e um interior impecável. Escolha o serviço ideal para o seu veículo — desde uma manutenção regular até um restauro completo.',
        'portal_horario' => 'Seg–Sex 9h–19h · Sáb 9h–13h · por marcação',
        'link_avaliacao' => 'https://www.google.com/maps/search/?api=1&query=AV+Car+Detail',
        'link_facebook' => 'https://www.facebook.com/search/top?q=AV%20Car%20Detail',
        'desc_multi_n' => '3', 'desc_multi_pct' => '5', 'sinal_pct' => '25',
        'prefixo_orc' => 'AVO', 'prefixo_trab' => 'AVT', 'prefixo_fat' => 'AVR', 'prefixo_gar' => 'AVC',
        'rodape_orc' => "Valores sem IVA — regime de isenção de IVA (art.º 53.º do CIVA).\nO valor depende do tamanho e do estado do veículo. Carros com excesso de pelo de animais, areias ou sujidade: acréscimo de 12 €.\nPagamento: MB Way, Transferência ou Numerário.",
    ] as $k => $v) setting_set($k, $v);

    seed_base($owner, false, '#e11d2a'); // modelos de mensagem + André Valente na equipa

    // ---------- Serviços (tabela AV Car Detail) ----------
    // [nome, tipo, categoria, preço (null = por orçamento), duração h, custo produtos, slogan, resultado, duração texto, descrição, tarefas, destaque, ordem]
    $S = [
        ['Classic', 'Pacote', 'Lavagem', 30, 1.25, 3, 'Lavagem essencial para o dia a dia', 'Cera líquida', '1–1h30',
            'Ideal para quem procura manter o carro limpo regularmente com cuidado.',
            "Pré-lavagem\nLavagem manual (dois baldes com luva)\nLavagem de jantes\nSecagem com toalha\nAspiração simples\nLimpeza de vidros\nCondicionador de pneus\nAplicação de cera líquida", 0, 10],
        ['Prestige', 'Pacote', 'Lavagem', 70, 2.5, 7, 'Lavagem detalhada com proteção adicional', 'Selante pintura e jantes', '2–3 horas',
            'Um cuidado superior para veículos que necessitam de uma atenção mais profunda.',
            "Pré-lavagem ácida\nPré-lavagem alcalina\nLavagem manual (dois baldes com luva)\nLavagem de jantes\nSecagem com soprador e toalhas\nAspiração pormenorizada\nLimpeza de plásticos e vidros\nCondicionador de pneus\nAplicação de selante (pintura e jantes)", 1, 20],
        ['Supreme', 'Pacote', 'Lavagem', 160, 5, 16, 'Tratamento premium com higienização completa', 'Proteção avançada', '½ dia',
            'Serviço completo, com limpeza profunda, proteção avançada e cuidados interiores especiais.',
            "Pré-lavagem ácida\nPré-lavagem alcalina\nLavagem manual (dois baldes com luva)\nLavagem de jantes\nSecagem com soprador e toalhas\nAspiração pormenorizada\nLimpeza de plásticos e vidros\nCondicionador de pneus\nProteção de pintura e jantes\nLavagem de estofos em tecido", 1, 30],
        ['Polimento', 'Pacote', 'Correção de pintura', 175, 6, 15, 'Brilho renovado num dia', 'Remove até 50% das imperfeições', '1 dia',
            'Polimento de brilho que devolve profundidade à pintura e remove até 50% das imperfeições (micro-riscos e hologramas ligeiros).',
            "Lavagem ácida e alcalina\nDescontaminação da pintura\nPolimento de brilho (remove até 50% das imperfeições)", 0, 40],
        ['Descontaminação de Pintura', 'Pacote', 'Correção de pintura', 100, 3, 12, 'Pintura lisa como vidro', 'Cera de carnaúba', '3 horas',
            'Remove contaminações ferrosas, alcatrão e resíduos incrustados que a lavagem não tira, terminando com cera de carnaúba.',
            "Lavagem ácida e alcalina\nDescontaminação química da pintura\nDescontaminação mecânica da pintura (clay bar)\nSecagem com soprador e toalhas\nAplicação de cera de carnaúba", 0, 50],
        ['Correção de Pintura', 'Pacote', 'Correção de pintura', 450, 14, 30, 'Riscos fora. Profundidade de volta.', 'Polimento multi-fase', '1–2 dias',
            'Polimento à máquina em várias fases que remove swirls, hologramas, riscos e oxidação em vez de os esconder. Medimos a espessura do verniz antes de começar e terminamos cada painel sob luz de inspeção.',
            "Lavagem ácida e alcalina\nDescontaminação química e mecânica\nMedição da espessura do verniz\nProteção de borrachas e plásticos (fita)\nPolimento de corte\nPolimento de acabamento\nLimpeza com IPA e inspeção sob luz\nProteção final", 1, 60],
        ['Detalhe Interior em Tecido', 'Pacote', 'Interior', 170, 5, 12, 'Interior impecável', 'Higienização profunda', '½ dia',
            'Detalhe completo do habitáculo com bancos em tecido: aspiração pormenorizada, lavagem de estofos por injeção-extração, plásticos, vidros e tratamento final.',
            "Aspiração pormenorizada\nLimpeza de tablier, consola e painéis de porta\nLavagem de estofos em tecido (injeção-extração)\nLavagem de tapetes e alcatifas\nLimpeza de teto\nLimpeza de vidros interiores\nHidratação de plásticos\nAmbientador", 0, 70],
        ['Detalhe Interior com Pele', 'Pacote', 'Interior', 220, 6, 16, 'Pele limpa, hidratada e protegida', 'Hidratação de pele', '½ dia',
            'Detalhe completo do habitáculo com bancos em pele: limpeza suave com escova, hidratação e proteção da pele, plásticos e vidros.',
            "Aspiração pormenorizada\nLimpeza de tablier, consola e painéis de porta\nLimpeza de pele com escova macia\nHidratação e proteção da pele\nLavagem de tapetes e alcatifas\nLimpeza de teto\nLimpeza de vidros interiores\nHidratação de plásticos", 1, 80],
        ['Lavagem de Estofos em Tecido', 'Pacote', 'Interior', 90, 2.5, 6, 'Estofos como novos', 'Injeção-extração', '2–3 horas', 'Lavagem profunda dos estofos em tecido por injeção-extração, com remoção de manchas e odores.',
            "Aspiração dos estofos\nPré-tratamento de manchas\nLavagem por injeção-extração\nSecagem", 0, 90],
        ['Lavagem de Estofos em Pele', 'Pacote', 'Interior', 130, 3, 9, 'Limpeza e hidratação da pele', 'Pele hidratada', '3 horas', 'Limpeza profunda dos bancos em pele com hidratação e proteção final.',
            "Aspiração dos bancos\nLimpeza de pele com escova macia\nHidratação da pele\nProteção UV da pele", 0, 100],
        ['Lavagem de Estofos (2 lugares)', 'Pacote', 'Interior', 50, 1.5, 3, 'Ideal para desportivos e comerciais', 'Injeção-extração', '1–2 horas', 'Lavagem de estofos para viaturas de 2 lugares.',
            "Aspiração dos estofos\nPré-tratamento de manchas\nLavagem por injeção-extração\nSecagem", 0, 110],
        ['Impermeabilização de Capota', 'Pacote', 'Proteção cerâmica', 120, 3, 18, 'Capota protegida da chuva e do sol', 'Capota impermeabilizada', '3 horas', 'Limpeza profunda e impermeabilização da capota em lona para descapotáveis.',
            "Limpeza da capota\nSecagem completa\nAplicação de impermeabilizante\nCura e inspeção", 0, 120],
        ['Impermeabilização de Tecidos', 'Pacote', 'Proteção cerâmica', null, 2, 10, 'Repele líquidos e manchas', 'Tecidos protegidos', '—', 'Proteção hidrófuga para estofos e alcatifas. Valor por orçamento.', '', 0, 130],
        ['Revestimentos Cerâmicos', 'Pacote', 'Proteção cerâmica', null, 16, 60, 'Brilho e proteção durante anos', 'Cerâmico profissional', '2–3 dias',
            'Revestimento cerâmico profissional aplicado sobre pintura corrigida: brilho intenso, efeito hidrofóbico e lavagens muito mais fáceis. Valor por orçamento.',
            "Lavagem e descontaminação completas\nCorreção de pintura\nPreparação com IPA\nAplicação de cerâmico na pintura\nCerâmico em jantes\nCerâmico em vidros\nCura e inspeção final", 1, 140],
        ['Selantes e Ceras de Proteção', 'Pacote', 'Proteção cerâmica', null, 2, 8, 'Proteção e brilho para meses', 'Selante / cera', '2–3 horas', 'Aplicação de selantes sintéticos ou ceras de carnaúba. Valor por orçamento.', '', 0, 150],
        ['PPF — Película de Proteção de Pintura', 'Pacote', 'PPF', 50, 8, 40, 'Escudo invisível contra pedras', 'Película auto-regenerativa', 'Por peça',
            'Película de proteção de pintura transparente contra lascas de pedras, riscos e insetos — por peça (desde 50 €) ou frente completa.',
            "Lavagem e descontaminação\nDesmontagem de emblemas/componentes\nAplicação de PPF\nRemontagem\nInspeção final", 0, 160],
        ['Restauro Completo', 'Pacote', 'Restauro', null, 60, 420, 'Cada detalhe. Como saiu de fábrica.', 'Restauro + cerâmico total', '1–2 semanas',
            'O nosso serviço mais completo, para clássicos e desportivos: desmontagem, restauro de interiores e mecânica ligeira, correção de pintura e proteção cerâmica integral. Cada tarefa fica registada e pode acompanhá-la na sua área de cliente.',
            "Mecânica & travões\nCorreção de pintura & proteção cerâmica\nInterior & estofador\nExterior & acabamentos", 1, 5],
        // Outros serviços — por orçamento
        ['Remoção de Calcário', 'Extra', 'Outro', null, 2, 6, '', '', '', 'Remoção de manchas de calcário em pintura e vidros.', '', 0, 200],
        ['Restauro de Interiores', 'Extra', 'Restauro', null, 8, 30, '', '', '', 'Restauro de bancos, pele, plásticos e acabamentos interiores.', '', 0, 210],
        ['Pintura de Pinças de Travão', 'Extra', 'Restauro', null, 6, 25, '', '', '', 'Desmontagem, preparação e pintura de pinças de travão na cor à escolha.', '', 0, 220],
        ['Películas Solares', 'Extra', 'Outro', null, 4, 40, '', '', '', 'Aplicação de películas solares homologadas.', '', 0, 230],
        ['Carwrap (Envelopamento)', 'Extra', 'Outro', null, 24, 300, '', '', '', 'Envelopamento total ou parcial em vinil.', '', 0, 240],
        ['Proteção de Chassis e Faróis', 'Extra', 'Exterior', null, 3, 20, '', '', '', 'Proteção anticorrosiva do chassis e proteção/restauro de faróis.', '', 0, 250],
        ['Limpeza de Cava de Roda', 'Extra', 'Exterior', null, 1.5, 4, '', '', '', 'Limpeza profunda e proteção das cavas de roda.', '', 0, 260],
        ['Acréscimo: excesso de pelo, areias ou sujidade', 'Extra', 'Interior', 12, 0.5, 1, '', '', '', 'Acréscimo aplicado a viaturas com excesso de pelo de animais, areias ou sujidade.', '', 0, 270],
    ];
    $sid = [];
    foreach ($S as $s) {
        $sid[$s[0]] = seed_insert('servicos', ['nome' => $s[0], 'tipo' => $s[1], 'categoria' => $s[2], 'preco_pequeno' => $s[3], 'preco_medio' => $s[3],
            'duracao_h' => $s[4], 'custo_produtos' => $s[5], 'slogan' => $s[6] ?: null, 'resultado' => $s[7] ?: null, 'duracao_txt' => $s[8] ?: null,
            'descricao' => $s[9], 'tarefas_padrao' => $s[10] ?: null, 'destaque' => $s[11], 'ordem' => $s[12], 'ativo' => 1, 'publico' => 1]);
    }

    // ---------- Equipa ----------
    $andre = (int)db()->query('SELECT id FROM ' . T('equipa') . ' ORDER BY id LIMIT 1')->fetchColumn();
    db()->prepare('UPDATE ' . T('equipa') . ' SET funcao = ?, custo_hora = 10 WHERE id = ?')->execute(['Proprietário · Detailer & restauro', $andre]);
    $tiago = seed_insert('equipa', ['nome' => 'Tiago Rocha', 'funcao' => 'Detailer (part-time)', 'telefone' => '913 555 101', 'custo_hora' => 8, 'comissao_pct' => 5, 'cor' => '#f59e0b', 'ativo' => 1]);

    // ---------- Clientes & viaturas (FICTÍCIOS) ----------
    $C = [
        ['Miguel Antunes', '912 345 001', 'miguel.antunes@exemplo.pt', 'Instagram', 'Lisboa', 'Particular', 'VIP', [['BMW', '320d Touring', 2019, 'AJ-31-RT', 'Cinzento', 'Médio', 'Selante']]],
        ['Sara Gonçalves', '913 222 002', 'sara.g@exemplo.pt', 'Recomendação', 'Oeiras', 'Particular', '', [['Mercedes-Benz', 'Classe A 200', 2021, 'BC-08-ZL', 'Branco', 'Médio', 'Nenhuma']]],
        ['Rui Carvalho', '916 101 003', 'rui.carvalho@exemplo.pt', 'Instagram', 'Cascais', 'Particular', 'Clássico, VIP', [['Porsche', '911 (996)', 2001, '12-AB-34', 'Preto', 'Desportivo / Luxo', 'Cerâmico']]],
        ['Inês Ferreira', '917 444 004', 'ines.ferreira@exemplo.pt', 'Google', 'Amadora', 'Particular', '', [['Volkswagen', 'Golf 8', 2022, 'BF-77-QP', 'Azul', 'Médio', 'Nenhuma']]],
        ['Hugo Matos', '918 555 005', 'hugo.matos@exemplo.pt', 'Facebook', 'Sintra', 'Particular', 'Cão', [['Audi', 'A4 Avant', 2018, '97-UV-12', 'Preto', 'Grande', 'Cera']]],
        ['Catarina Lopes', '919 666 006', 'catarina.lopes@exemplo.pt', 'Google', 'Lisboa', 'Particular', '', [['Tesla', 'Model 3', 2023, 'BL-15-XX', 'Branco', 'Médio', 'Nenhuma']]],
        ['Paulo Ribeiro', '914 777 007', 'paulo.ribeiro@exemplo.pt', 'Recomendação', 'Mafra', 'Particular', 'Off-road', [['Land Rover', 'Defender 110', 2021, 'AX-90-DF', 'Verde', 'SUV', 'Selante']]],
        ['Joana Pereira', '915 888 008', 'joana.pereira@exemplo.pt', 'Instagram', 'Loures', 'Particular', '', [['Fiat', '500', 2017, '24-SL-88', 'Vermelho', 'Pequeno', 'Nenhuma']]],
        ['Nuno Teixeira', '916 999 009', 'nuno.teixeira@exemplo.pt', 'Passagem', 'Lisboa', 'Particular', 'Clássico', [['Mazda', 'MX-5 (NA)', 1992, 'PL-45-21', 'Vermelho', 'Pequeno', 'Nenhuma']]],
        ['Ricardo Pinto', '912 121 010', 'ricardo.pinto@exemplo.pt', 'Google', 'Odivelas', 'Particular', '', [['Peugeot', '3008 GT', 2020, 'AT-62-MB', 'Cinzento', 'SUV', 'Nenhuma']]],
        ['Marta Sousa', '913 131 011', 'marta.sousa@exemplo.pt', 'Instagram', 'Oeiras', 'Particular', 'Subscrição', [['MINI', 'Cooper S Cabrio', 2019, 'AD-14-KK', 'Preto', 'Pequeno', 'Selante']]],
        ['Stand Auto Prime (exemplo)', '210 000 012', 'stand@exemplo.pt', 'Stand / Parceiro', 'Lisboa', 'Stand', 'Frota, parceiro', [['Volvo', 'XC60', 2020, 'AV-20-PR', 'Branco', 'SUV', 'Nenhuma'], ['Renault', 'Clio', 2021, 'BB-41-PR', 'Cinzento', 'Pequeno', 'Nenhuma']]],
    ];
    $cl = []; $vh = [];
    foreach ($C as $i => $c) {
        $cl[$i] = seed_insert('clientes', ['nome' => $c[0], 'telefone' => $c[1], 'email' => $c[2], 'origem' => $c[3], 'localidade' => $c[4], 'tipo' => $c[5], 'tags' => $c[6] ?: null, 'rgpd' => 1,
            'notas' => $i === 2 ? 'Prefere contacto por WhatsApp. Viatura de coleção — guardar em garagem fechada.' : null]);
        foreach ($c[7] as $v) $vh[$i][] = seed_insert('veiculos', ['cliente_id' => $cl[$i], 'marca' => $v[0], 'modelo' => $v[1], 'ano' => $v[2], 'matricula' => $v[3], 'cor' => $v[4], 'tamanho' => $v[5], 'protecao' => $v[6],
            'proximo_servico' => $i % 3 === 0 ? $d('+' . (6 + $i) . ' days') : null]);
    }

    // Conta de frota com desconto profissional
    db()->prepare('UPDATE ' . T('clientes') . ' SET contacto = ?, email_faturacao = ?, condicoes = ?, desconto_pct = ?, nif = ? WHERE id = ?')
        ->execute(['Gestor de frota (exemplo)', 'faturacao@stand-exemplo.pt', '30 dias', 10, '500000000', $cl[11]]);
    // Planos de subscrição (o seed_base já criou 2 genéricos; substituímos pelos da AV)
    db()->exec('DELETE FROM ' . T('planos'));
    $pl1 = seed_insert('planos', ['nome' => 'Classic Club', 'valor' => 55, 'frequencia' => 'Mensal', 'visitas' => 2, 'desconto_pct' => 10, 'servicos' => [$sid['Classic']], 'ativo' => 1, 'descricao' => '2 lavagens Classic por mês + 10% de desconto em todos os outros serviços.']);
    $pl2 = seed_insert('planos', ['nome' => 'Prestige Frota', 'valor' => 120, 'frequencia' => 'Mensal', 'visitas' => 2, 'desconto_pct' => 10, 'servicos' => [$sid['Prestige']], 'ativo' => 1, 'descricao' => 'Plano para frotas e stands: 2 lavagens Prestige por mês.']);
    $pl3 = seed_insert('planos', ['nome' => 'Manutenção Cerâmica', 'valor' => 45, 'frequencia' => 'Mensal', 'visitas' => 1, 'desconto_pct' => 10, 'servicos' => [$sid['Prestige']], 'ativo' => 1, 'descricao' => 'Manutenção mensal para viaturas com revestimento cerâmico — mantém a garantia válida.']);

    // ---------- Trabalho-montra: restauro do Porsche 911 (996) ----------
    $G = [
        'Mecânica & travões' => ['Pintar 2 pinças / desmontar e montar', 'Estufador', 'Lavagem + proteção do chassis e cavas de rodas', 'Restaurar pinças', 'Mudança de óleo / sangrar travões'],
        'Correção de pintura & proteção cerâmica' => ['Correção de pintura', 'Proteção cerâmica: vidros / plásticos / pintura / jantes e pinças', 'Micro retoque na pintura', 'PPF nas óticas'],
        'Interior & estofador' => ['Restauro de plásticos / plásticos interior da mala e escovas', 'Desmontar bancos e quartelas', 'Limpar material antigo', 'Pintar / restaurar bancos, quartelas, moca das velocidades, cinzeiro e travão de mão', 'Limpeza completa do interior', 'Hidratação de plásticos e pele', 'Limpar botões do rádio', 'Limpeza do AC'],
        'Exterior & acabamentos' => ['Tratamento do cofre do motor', 'Plástico das embaladeiras', 'Pintar calhas', 'Pintar logótipo / emblemas', 'Vidros', 'Polimento das ponteiras de escape'],
    ];
    $pend = ['Pintar logótipo / emblemas', 'Vidros', 'Polimento das ponteiras de escape'];
    $tar = [];
    foreach ($G as $g => $ts) foreach ($ts as $t) $tar[] = ['t' => $t, 'd' => !in_array($t, $pend, true), 's' => $g] + ($t === 'Limpar material antigo' ? ['n' => 'Material antigo dos bancos guardado para o cliente.'] : []);
    $porsche = seed_insert('trabalhos', ['numero' => "AVT-$Y-0001", 'data' => $d('-12 days'), 'cliente_id' => $cl[2], 'veiculo_id' => $vh[2][0], 'servico_id' => $sid['Restauro Completo'], 'tecnico_id' => $andre,
        'estado' => 'Controlo de qualidade', 'box' => 'Box 1', 'data_entrega' => $d('+3 days'), 'extras' => 'Restauro completo Porsche 911 (996) preto', 'portal_visivel' => 1,
        'tarefas' => $tar, 'notas_servicos' => [
            'Mecânica & travões' => 'Óleo 5W-40 (8,5 L) e líquido de travões DOT 4. Pinças pintadas em vermelho a pedido do cliente.',
            'Correção de pintura & proteção cerâmica' => 'Espessura média do verniz 118 µm. Correção em 2 fases; 2 camadas de cerâmico na pintura, 1 nas jantes e vidros.',
            'Interior & estofador' => 'Bancos enviados ao estofador e devolvidos 3 dias depois. Pele hidratada e protegida.',
            'Exterior & acabamentos' => 'Faltam emblemas, vidros e ponteiras de escape. Entrega prevista após controlo de qualidade.'],
        'valor' => 2850, 'custo_produtos' => 420, 'outros_custos' => 180, 'horas' => 58]);

    // ---------- Histórico de trabalhos ----------
    // [cliente idx, dias atrás, serviço, estado, valor, horas, técnico]
    $J = [
        [0, 110, 'Prestige', 'Concluído', 70, 2.5, $andre], [1, 102, 'Classic', 'Concluído', 30, 1.25, $tiago], [4, 95, 'Supreme', 'Concluído', 172, 5.5, $andre],
        [9, 88, 'Detalhe Interior em Tecido', 'Concluído', 170, 5, $andre], [0, 80, 'Polimento', 'Concluído', 175, 6, $andre], [3, 71, 'Classic', 'Concluído', 30, 1.25, $tiago],
        [6, 65, 'Supreme', 'Concluído', 160, 5, $andre], [10, 58, 'Classic', 'Concluído', 30, 1, $tiago], [8, 52, 'Descontaminação de Pintura', 'Concluído', 100, 3, $andre],
        [5, 47, 'Prestige', 'Concluído', 70, 2.5, $tiago], [11, 41, 'Prestige', 'Concluído', 70, 2.5, $tiago], [1, 36, 'Detalhe Interior com Pele', 'Concluído', 220, 6, $andre],
        [10, 30, 'Classic', 'Concluído', 30, 1, $tiago], [4, 26, 'Lavagem de Estofos em Tecido', 'Concluído', 102, 3, $andre], [0, 21, 'Correção de Pintura', 'Concluído', 480, 14, $andre],
        [3, 17, 'Prestige', 'Concluído', 70, 2.5, $tiago], [10, 15, 'Classic', 'Concluído', 30, 1, $tiago], [7, 11, 'Supreme', 'Concluído', 160, 5, $andre],
        [11, 9, 'Classic', 'Concluído', 30, 1, $tiago], [9, 6, 'Prestige', 'Concluído', 70, 2.5, $andre], [5, 4, 'PPF — Película de Proteção de Pintura', 'Concluído', 390, 8, $andre],
        [10, 1, 'Classic', 'Concluído', 30, 1, $tiago],
        [8, 2, 'Correção de Pintura', 'Correção / Proteção', 450, 9, $andre], [6, 0, 'Supreme', 'Interior', 160, 3, $tiago], [1, 0, 'Prestige', 'Lavagem', 70, 1, $tiago],
        [3, -1, 'Classic', 'Agendado', 30, 0, $tiago],
        [5, 13, 'Supreme', 'Concluído', 160, 5, $andre], [8, 8, 'Polimento', 'Concluído', 175, 6, $andre], [1, 3, 'Prestige', 'Concluído', 70, 2.5, $tiago],
        [0, 2, 'Descontaminação de Pintura', 'Concluído', 100, 3, $andre], [9, 12, 'Detalhe Interior com Pele', 'Concluído', 220, 6, $andre], [11, 5, 'Classic', 'Concluído', 30, 1, $tiago],
    ];
    $n = 2; $jobIds = [];
    foreach ($J as $k => $j) {
        $svc = db()->query('SELECT * FROM ' . T('servicos') . ' WHERE id = ' . $sid[$j[2]])->fetch();
        $done = $j[3] === 'Concluído';
        $tasks = array_map(fn($t) => ['t' => $t, 'd' => $done || ($j[3] !== 'Agendado' && mt_rand(0, 1)), 's' => $svc['nome']], array_values(array_filter(array_map('trim', explode("\n", (string)$svc['tarefas_padrao'])))));
        $extra = []; if ($j[0] === 4 && in_array($j[2], ['Supreme', 'Lavagem de Estofos em Tecido'], true)) { $extra = ['extras' => '+ acréscimo excesso de pelo de cão (12 €)']; }
        $jobIds[$k] = seed_insert('trabalhos', ['numero' => "AVT-$Y-" . str_pad((string)$n++, 4, '0', STR_PAD_LEFT), 'data' => $d((-$j[1]) . ' days'), 'cliente_id' => $cl[$j[0]], 'veiculo_id' => $vh[$j[0]][$j[0] === 11 && $k % 2 ? 1 : 0],
            'servico_id' => $sid[$j[2]], 'tecnico_id' => $j[6], 'estado' => $j[3], 'valor' => $j[4], 'custo_produtos' => $svc['custo_produtos'], 'horas' => $j[5] ?: null, 'portal_visivel' => 1,
            'box' => ['Box 1', 'Box 2', 'Zona de lavagem'][$k % 3], 'gorjeta' => $k % 5 === 0 ? 5 : null, 'tarefas' => $tasks,
            'timer_inicio' => in_array($j[3], ['Interior', 'Lavagem', 'Correção / Proteção'], true) ? date('Y-m-d H:i:s', strtotime('-' . (40 + $k) . ' minutes')) : null,
            'notas_aftercare' => $done ? 'Evite lavagens automáticas com rolos. Use champô de pH neutro e o método dos dois baldes. Primeira lavagem só após 7 dias.' : null] + $extra);
        if ($done) db()->prepare('UPDATE ' . T('veiculos') . ' SET ultimo_servico = ? WHERE id = ? AND (ultimo_servico IS NULL OR ultimo_servico < ?)')->execute([$d((-$j[1]) . ' days'), $vh[$j[0]][0], $d((-$j[1]) . ' days')]);
    }

    // ---------- Recebimentos (regime de isenção: IVA 0%) ----------
    $r = 1; $met = ['MB Way', 'MB Way', 'Numerário', 'Transferência', 'MB Way'];
    foreach ($J as $k => $j) {
        if ($j[3] !== 'Concluído') continue;
        $paid = $k === 20 ? 200 : ($k === 13 ? 0 : $j[4]);
        $pg = $paid ? [['d' => $d((-$j[1]) . ' days'), 'v' => $paid, 'm' => $met[$k % 5], 'n' => $k === 20 ? 'Sinal + 1.º pagamento' : '']] : [];
        seed_insert('faturas', ['numero' => "AVR-$Y-" . str_pad((string)$r++, 4, '0', STR_PAD_LEFT), 'ref_externa' => $paid ? 'FR ' . $Y . '/' . (100 + $k) : null, 'data' => $d((-$j[1]) . ' days'), 'vencimento' => $d((-$j[1] + 8) . ' days'),
            'cliente_id' => $cl[$j[0]], 'trabalho_id' => $jobIds[$k], 'iva_pct' => 0, 'linhas' => [['d' => $j[2], 'q' => 1, 'p' => $j[4]]], 'pagamentos' => $pg,
            'valor_pago' => $paid, 'estado' => $paid >= $j[4] ? 'Paga' : ($paid > 0 ? 'Parcial' : 'Por pagar'), 'metodo' => $paid ? $met[$k % 5] : null, 'data_pagamento' => $paid ? $d((-$j[1]) . ' days') : null]);
    }
    seed_insert('faturas', ['numero' => "AVR-$Y-" . str_pad((string)$r++, 4, '0', STR_PAD_LEFT), 'data' => $d('-12 days'), 'vencimento' => $d('+5 days'), 'cliente_id' => $cl[2], 'trabalho_id' => $porsche, 'iva_pct' => 0,
        'linhas' => [['d' => 'Restauro Completo — Porsche 911 (996)', 'q' => 1, 'p' => 2850]], 'pagamentos' => [['d' => $d('-12 days'), 'v' => 1000, 'm' => 'Transferência', 'n' => 'Adiantamento (35%)']],
        'valor_pago' => 1000, 'estado' => 'Parcial', 'metodo' => 'Transferência', 'data_pagamento' => $d('-12 days')]);

    // ---------- Marcações ----------
    foreach ([[3, '+0', '09:00', 'Classic', 'Confirmada', 30, 0, 'Box 2', 'Oficina'], [5, '+0', '14:30', 'Prestige', 'Confirmada', 70, 0, 'Box 1', 'Oficina'],
              [9, '+1', '10:00', 'Detalhe Interior em Tecido', 'Pendente', 170, 50, 'Box 2', 'Oficina'], [11, '+2', '09:30', 'Prestige', 'Confirmada', 70, 0, 'Box 3', 'Oficina'],
              [0, '+3', '09:00', 'Revestimentos Cerâmicos', 'Pendente', 650, 150, 'Box 1', 'Oficina'], [7, '+5', '11:00', 'Classic', 'Pendente', 30, 0, 'Zona de lavagem', 'Oficina'],
              [6, '+8', '09:00', 'Supreme', 'Confirmada', 160, 40, 'Box 2', 'Oficina'], [4, '-5', '10:00', 'Prestige', 'Faltou', 70, 0, 'Box 1', 'Oficina']] as $m)
        seed_insert('marcacoes', ['cliente_id' => $cl[$m[0]], 'veiculo_id' => $vh[$m[0]][0], 'data' => $d($m[1] . ' days'), 'hora' => $m[2], 'servico_id' => $sid[$m[3]], 'tecnico_id' => $m[3] === 'Classic' ? $tiago : $andre,
            'estado' => $m[4], 'valor_previsto' => $m[5], 'sinal' => $m[6] ?: null, 'sinal_pago' => $m[6] >= 150 ? 1 : 0, 'box' => $m[7], 'local' => $m[8], 'duracao_h' => 3,
            'morada' => $m[8] !== 'Oficina' ? 'Av. da Liberdade 100, Lisboa (morada de exemplo)' : null, 'km' => $m[8] !== 'Oficina' ? 24 : null]);

    // ---------- Orçamentos ----------
    seed_insert('orcamentos', ['numero' => "AVO-$Y-0001", 'data' => $d('-3 days'), 'validade' => $d('+12 days'), 'cliente_id' => $cl[5], 'veiculo_id' => $vh[5][0], 'estado' => 'Enviado', 'iva_pct' => 0,
        'linhas' => [['d' => 'Correção de Pintura', 'q' => 1, 'p' => 450], ['d' => 'Revestimentos Cerâmicos', 'q' => 1, 'p' => 520]], 'desconto_pct' => 5,
        'notas' => 'Proteção cerâmica de 3 anos sobre pintura corrigida. Inclui manutenção gratuita ao fim de 6 meses.']);
    seed_insert('orcamentos', ['numero' => "AVO-$Y-0002", 'data' => $d('-6 days'), 'validade' => $d('+9 days'), 'cliente_id' => $cl[0], 'veiculo_id' => $vh[0][0], 'estado' => 'Aceite', 'iva_pct' => 0,
        'linhas' => [['d' => 'Revestimentos Cerâmicos', 'q' => 1, 'p' => 650]]]);
    seed_insert('orcamentos', ['numero' => "AVO-$Y-0003", 'data' => $d('-1 days'), 'validade' => $d('+14 days'), 'cliente_id' => $cl[8], 'veiculo_id' => $vh[8][0], 'estado' => 'Rascunho', 'iva_pct' => 0,
        'linhas' => [['d' => 'Pintura de Pinças de Travão', 'q' => 1, 'p' => 180], ['d' => 'Restauro de Interiores', 'q' => 1, 'p' => 350]]]);

    // ---------- Leads, subscrições, avaliações ----------
    foreach ([['Bruno Fonseca', '911 300 101', 'Instagram', 'Correção de Pintura', 450, 'Contactado', '-1'], ['Diana Moreira', '911 300 102', 'Google', 'Detalhe Interior com Pele', 220, 'Novo', '+0'],
              ['Filipe Gaspar', '911 300 103', 'Portal do cliente', 'Restauro Completo — Mercedes 190E', 0, 'Orçamento enviado', '+2'], ['Rita Correia', '911 300 104', 'Facebook', 'Classic', 30, 'Ganho', null]] as $l)
        seed_insert('leads', ['data' => $d('-' . mt_rand(1, 9) . ' days'), 'nome' => $l[0], 'telefone' => $l[1], 'origem' => $l[2], 'servico_interesse' => $l[3], 'valor_estimado' => $l[4] ?: null, 'estado' => $l[5], 'data_followup' => $l[6] !== null ? $d($l[6] . ' days') : null]);
    seed_insert('subscricoes', ['cliente_id' => $cl[10], 'veiculo_id' => $vh[10][0], 'plano_id' => $pl1, 'plano' => 'Classic Club', 'valor' => 55, 'frequencia' => 'Mensal', 'estado' => 'Ativa', 'data_inicio' => $d('-60 days'), 'proxima_visita' => $d('+4 days'), 'visitas_incluidas' => 2, 'visitas_usadas' => 1, 'validade' => $d('+5 days'), 'desconto_pct' => 10, 'pagamento' => 'MB Way']);
    seed_insert('subscricoes', ['cliente_id' => $cl[11], 'veiculo_id' => $vh[11][0], 'plano_id' => $pl2, 'plano' => 'Prestige Frota', 'valor' => 120, 'frequencia' => 'Mensal', 'estado' => 'Ativa', 'data_inicio' => $d('-45 days'), 'proxima_visita' => $d('+2 days'), 'visitas_incluidas' => 2, 'visitas_usadas' => 1, 'validade' => $d('+15 days'), 'desconto_pct' => 10, 'pagamento' => 'Transferência']);
    seed_insert('subscricoes', ['cliente_id' => $cl[6], 'veiculo_id' => $vh[6][0], 'plano_id' => $pl3, 'plano' => 'Manutenção Cerâmica', 'valor' => 45, 'frequencia' => 'Mensal', 'estado' => 'Ativa', 'data_inicio' => $d('-120 days'), 'proxima_visita' => $d('+9 days'), 'visitas_incluidas' => 1, 'visitas_usadas' => 0, 'validade' => $d('-2 days'), 'desconto_pct' => 10, 'pagamento' => 'MB Way']);
    foreach ([[0, 'Google', 5, 'Trabalho impecável no meu BMW, a correção de pintura ficou espetacular. Recomendo o André!', 'Recebida', 1], [6, 'Google', 5, 'Defender como novo por dentro e por fora. Muito profissional.', 'Recebida', 1],
              [1, 'Facebook', 5, 'Interior em pele limpo e hidratado, atenção ao detalhe incrível.', 'Recebida', 1], [9, 'Google', null, null, 'Pedido enviado', 0], [7, 'Google', null, null, 'Pedido por enviar', 0]] as $a)
        seed_insert('avaliacoes', ['data' => $d('-' . mt_rand(2, 30) . ' days'), 'tipo' => 'Avaliação', 'cliente_id' => $cl[$a[0]], 'plataforma' => $a[1], 'pontuacao' => $a[2], 'texto' => $a[3], 'estado' => $a[4], 'testemunho_ok' => $a[5]]);
    seed_insert('avaliacoes', ['data' => $d('-20 days'), 'tipo' => 'Referência', 'cliente_id' => $cl[0], 'referido_id' => $cl[9], 'estado' => 'Recompensa entregue', 'recompensa' => 'Classic oferta']);

    // ---------- Garantia cerâmica, inspeção, stock, equipamentos, custos ----------
    seed_insert('garantias', ['numero' => "AVC-$Y-0001", 'data' => $d('-12 days'), 'cliente_id' => $cl[2], 'veiculo_id' => $vh[2][0], 'trabalho_id' => $porsche, 'tecnico_id' => $andre, 'produto' => 'Cerâmico 9H profissional', 'camadas' => 2, 'anos' => 3, 'superficies' => 'Pintura, vidros, jantes, pinças e plásticos exteriores', 'intervalo_meses' => 12]);
    seed_insert('garantias', ['numero' => "AVC-$Y-0002", 'data' => date('Y-m-d', strtotime('-11 months -18 days')), 'cliente_id' => $cl[6], 'veiculo_id' => $vh[6][0], 'tecnico_id' => $andre, 'produto' => 'Cerâmico 9H', 'camadas' => 1, 'anos' => 2, 'superficies' => 'Pintura e jantes', 'intervalo_meses' => 12]);
    seed_insert('inspecoes', ['data' => $d('-12 days'), 'momento' => 'Entrada (check-in)', 'cliente_id' => $cl[2], 'veiculo_id' => $vh[2][0], 'trabalho_id' => $porsche, 'km' => 148200, 'combustivel' => '1/2', 'objetos' => 'Chave suplente, livro de revisões',
        'pedidos' => 'Restauro completo. Cuidado com os emblemas e frisos.', 'assinado_por' => 'Rui Carvalho',
        'mapa' => [['x' => 72, 'y' => 22, 't' => 'Risco', 'n' => 'Risco ligeiro, guarda-lamas frente direito'], ['x' => 30, 'y' => 78, 't' => 'Lasca', 'n' => 'Lasca de pedra, painel traseiro esquerdo'], ['x' => 50, 'y' => 55, 't' => 'Mancha', 'n' => 'Pele do banco do condutor gasta']],
        'exterior' => [['t' => 'Riscos', 'd' => true], ['t' => 'Mossas', 'd' => false], ['t' => 'Lascas na pintura', 'd' => true], ['t' => 'Jantes danificadas', 'd' => false], ['t' => 'Óticas', 'd' => true]],
        'interior' => [['t' => 'Manchas nos estofos', 'd' => true], ['t' => 'Pele gasta / rachada', 'd' => true], ['t' => 'Odores (tabaco/animais)', 'd' => false]]]);
    foreach ([['Pré-lavagem ácida', 'Químico', 'L', 3, 2, 24, 5000, 20, 300], ['Pré-lavagem alcalina (snow foam)', 'Químico', 'L', 4, 2, 21, 5000, 10, 200], ['Champô pH neutro', 'Químico', 'L', 2, 1, 16, 1000, 400, 40],
              ['Descontaminante férrico', 'Químico', 'L', 1, 2, 22, 1000, 0, 80], ['APC multiusos', 'Químico', 'L', 3, 2, 14, 5000, 10, 150], ['Selante pintura e jantes', 'Cerâmico / proteção', 'un', 2, 2, 34, 500, 0, 25],
              ['Cerâmico 9H 50 ml', 'Cerâmico / proteção', 'un', 1, 2, 89, 50, 0, 25], ['Cera de carnaúba', 'Cerâmico / proteção', 'un', 2, 1, 29, 200, 0, 10], ['Hidratante de pele', 'Químico', 'un', 3, 1, 19, 500, 0, 30],
              ['Microfibras 40x40', 'Microfibras', 'un', 36, 30, 1.6, 0, 0, 0], ['Boinas de corte 125 mm', 'Boinas / pads', 'un', 4, 4, 9, 0, 0, 0]] as $it)
        seed_insert('inventario', ['nome' => $it[0], 'categoria' => $it[1], 'unidade' => $it[2], 'quantidade' => $it[3], 'nivel_minimo' => $it[4], 'custo_unitario' => $it[5], 'volume_ml' => $it[6] ?: null, 'diluicao' => $it[7], 'ml_por_uso' => $it[8] ?: null, 'fornecedor' => 'Fornecedor (exemplo)']);
    foreach ([['Máquina de alta pressão', 'Máquina de pressão', '-95 days', 90, 790], ['Polidora roto-orbital 15 mm', 'Polidora', '-40 days', 90, 410], ['Polidora rotativa', 'Polidora', '-20 days', 120, 280],
              ['Extratora de estofos', 'Extratora', '-70 days', 60, 520], ['Soprador / secador', 'Outro', '-30 days', 180, 260]] as $q)
        seed_insert('equipamentos', ['nome' => $q[0], 'tipo' => $q[1], 'ultima_manutencao' => $d($q[2]), 'intervalo_dias' => $q[3], 'estado' => 'Operacional', 'valor_compra' => $q[4]]);
    for ($m = 0; $m < 4; $m++) {
        $b = strtotime(date('Y-m-01') . " -$m month");
        foreach ([['Renda / espaço', 'Renda do espaço', 'Senhorio', 350], ['Água / luz', 'Eletricidade e água', 'Fornecedor', 85], ['Seguros', 'Seguro de responsabilidade civil', 'Seguradora', 32],
                  ['Software', 'Software de faturação certificado', 'Software', 15], ['Combustível', 'Combustível carrinha', 'Posto', 60], ['Produtos / stock', 'Encomenda de químicos', 'Fornecedor (exemplo)', 180],
                  ['Marketing / publicidade', 'Anúncios Instagram', 'Meta', 40], ['Contabilidade', 'Contabilista', 'Gabinete', 60]] as $k => $x)
            if ($m > 0 || date('j') > 3 + $k) seed_insert('despesas', ['data' => date('Y-m-d', min(time(), $b + (2 + $k * 3) * 86400)), 'categoria' => $x[0], 'descricao' => $x[1], 'fornecedor' => $x[2], 'valor' => $x[3]]);
    }
    // Fornecedores, compras, outras receitas e objetivos
    $f1 = seed_insert('fornecedores', ['nome' => 'Distribuidora de Químicos (exemplo)', 'categoria' => 'Químicos & ceras', 'contacto' => 'Comercial', 'telefone' => '210 000 101', 'condicoes' => 'Portes grátis acima de 150 €']);
    $f2 = seed_insert('fornecedores', ['nome' => 'Microfibras & Acessórios (exemplo)', 'categoria' => 'Microfibras & acessórios', 'telefone' => '210 000 102', 'website' => 'loja-exemplo.pt']);
    seed_insert('fornecedores', ['nome' => 'Estofador parceiro (exemplo)', 'categoria' => 'Serviços (estofador, pintura…)', 'contacto' => 'Sr. Manuel', 'telefone' => '916 000 103', 'notas' => 'Restauro de bancos e pele — prazo médio 3 dias.']);
    $inv = fn($n) => (int)db()->query('SELECT id FROM ' . T('inventario') . ' WHERE nome = ' . db()->quote($n))->fetchColumn();
    seed_insert('compras', ['data' => $d('-8 days'), 'estado' => 'Recebida', 'fornecedor_id' => $f1, 'documento' => 'FT A/2231', 'artigo_id' => $inv('Pré-lavagem ácida'), 'quantidade' => 2, 'valor' => 48, 'criar_despesa' => 0, 'lancado' => 1]);
    seed_insert('compras', ['data' => $d('-2 days'), 'estado' => 'Encomendada', 'fornecedor_id' => $f2, 'documento' => 'ENC 118', 'artigo_id' => $inv('Microfibras 40x40'), 'quantidade' => 30, 'valor' => 48, 'criar_despesa' => 1]);
    seed_insert('receitas', ['data' => $d('-10 days'), 'categoria' => 'Venda de produtos', 'descricao' => 'Kit de manutenção (champô + quick detailer)', 'cliente_id' => $cl[0], 'valor' => 35, 'custo' => 18, 'metodo' => 'MB Way']);
    seed_insert('receitas', ['data' => $d('-4 days'), 'categoria' => 'Vales / vouchers', 'descricao' => 'Vale-oferta Prestige', 'valor' => 70, 'metodo' => 'Transferência']);
    foreach ([['Faturar 4.500 € este mês', 'Receita', 4500], ['20 trabalhos concluídos', 'Trabalhos concluídos', 20], ['5 novas avaliações no Google', 'Avaliações recebidas', 5]] as $o)
        seed_insert('objetivos', ['titulo' => $o[0], 'metrica' => $o[1], 'alvo' => $o[2], 'mes' => date('Y-m-d'), 'periodo' => 'Mês', 'notas' => $o[1] === 'Avaliações recebidas' ? 'Enviar pedido de avaliação no dia seguinte a cada entrega (Lembretes).' : null]);
    seed_insert('objetivos', ['titulo' => 'Cobrar 4.000 € este mês', 'metrica' => 'Recebido (pagamentos)', 'alvo' => 4000, 'mes' => date('Y-m-d'), 'periodo' => 'Mês']);
    seed_insert('objetivos', ['titulo' => '6 proteções cerâmicas este trimestre', 'metrica' => 'Proteções cerâmicas aplicadas', 'alvo' => 6, 'mes' => date('Y-m-d'), 'periodo' => 'Trimestre', 'notas' => 'Propor upgrade cerâmico em todos os polimentos.']);
    seed_insert('deslocacoes', ['data' => $d('-9 days'), 'origem' => 'Oficina', 'destino' => 'Stand Auto Prime', 'km' => 24, 'finalidade' => 'Serviço de frota', 'tecnico_id' => $tiago]);
    seed_insert('marketing', ['campanha' => 'Pacotes de lavagem — campanha de lançamento', 'canal' => 'Instagram', 'data_inicio' => $d('-45 days'), 'data_fim' => $d('-15 days'), 'custo' => 80, 'leads' => 14, 'clientes' => 5, 'receita' => 610, 'codigo' => 'AVSTART']);
    seed_insert('marketing', ['campanha' => 'Parceria com stand automóvel', 'canal' => 'Parceria', 'data_inicio' => $d('-45 days'), 'custo' => 0, 'leads' => 2, 'clientes' => 1, 'receita' => 240]);
}
