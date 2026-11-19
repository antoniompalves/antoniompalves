<?php
/**
 * Definição de todas as entidades (módulos) da aplicação.
 * O servidor usa isto para criar/migrar tabelas e validar campos;
 * o cliente usa isto para gerar tabelas e formulários.
 *
 * Tipos: text, textarea, email, tel, number, money, int, date, time, bool,
 *        select, ref, lines, checklist, photos, rating, signature, color
 */
function fd($k, $l, $t = 'text', $o = []) { return array_merge(['k' => $k, 'l' => $l, 't' => $t], $o); }

const ORIGENS = ['Instagram', 'Facebook', 'Google', 'Website', 'Recomendação', 'Passagem', 'OLX / Anúncio', 'Stand / Parceiro', 'Portal do cliente', 'Outro'];
const TAMANHOS = ['Pequeno', 'Médio', 'Grande', 'SUV', 'Carrinha / Monovolume', 'Desportivo / Luxo', 'Mota'];
const BOXES = ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Zona de lavagem', 'Exterior', 'Domicílio'];
const METODOS = ['Numerário', 'MB Way', 'Multibanco', 'Transferência', 'Cartão', 'Outro'];

function app_schema() {
    static $S = null;
    if ($S) return $S;
    $S = [
    'clientes' => [
        'label' => 'Clientes', 'one' => 'Cliente', 'icon' => 'users', 'group' => 'Clientes',
        'tpl' => '{nome}', 'search' => ['nome', 'telefone', 'email', 'nif', 'localidade'],
        'fields' => [
            fd('nome', 'Nome', 'text', ['req' => 1, 'list' => 1]),
            fd('telefone', 'Telemóvel', 'tel', ['list' => 1, 'half' => 1]),
            fd('email', 'Email', 'email', ['list' => 1, 'half' => 1]),
            fd('nif', 'NIF', 'text', ['half' => 1]),
            fd('tipo', 'Tipo', 'select', ['opts' => ['Particular', 'Empresa', 'Frota', 'Stand'], 'def' => 'Particular', 'half' => 1]),
            fd('morada', 'Morada (serviço ao domicílio)', 'text'),
            fd('localidade', 'Localidade', 'text', ['list' => 1, 'half' => 1]),
            fd('codigo_postal', 'Código postal', 'text', ['half' => 1]),
            fd('origem', 'Como nos conheceu', 'select', ['opts' => ORIGENS, 'list' => 1, 'half' => 1]),
            fd('referido_por', 'Referido por', 'ref', ['ref' => 'clientes', 'half' => 1]),
            fd('data_nascimento', 'Data de nascimento', 'date', ['half' => 1]),
            fd('rgpd', 'Consentimento RGPD (contacto/marketing)', 'bool', ['half' => 1]),
            fd('tags', 'Etiquetas', 'text', ['half' => 1, 'ph' => 'VIP, frota, clássico…']),
            fd('notas', 'Notas / preferências', 'textarea'),
            fd('portal_token', 'Código de acesso ao portal', 'text', ['hide' => 1]),
        ],
        'calc' => [['k' => 'visitas', 'l' => 'Visitas', 't' => 'text'], ['k' => 'total', 'l' => 'Total gasto', 't' => 'money'], ['k' => 'em_divida', 'l' => 'Em dívida', 't' => 'money'], ['k' => 'faltas', 'l' => 'Faltas', 't' => 'text']],
    ],
    'veiculos' => [
        'label' => 'Veículos', 'one' => 'Veículo', 'icon' => 'car', 'group' => 'Clientes',
        'tpl' => '{marca} {modelo} · {matricula}', 'search' => ['marca', 'modelo', 'matricula', 'cor', 'vin'],
        'fields' => [
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'req' => 1, 'list' => 1]),
            fd('marca', 'Marca', 'text', ['req' => 1, 'list' => 1, 'half' => 1]),
            fd('modelo', 'Modelo', 'text', ['list' => 1, 'half' => 1]),
            fd('ano', 'Ano', 'int', ['half' => 1]),
            fd('matricula', 'Matrícula', 'text', ['list' => 1, 'half' => 1, 'ph' => 'AA-00-AA']),
            fd('cor', 'Cor', 'text', ['list' => 1, 'half' => 1]),
            fd('tamanho', 'Tamanho', 'select', ['opts' => TAMANHOS, 'def' => 'Médio', 'list' => 1, 'half' => 1]),
            fd('vin', 'VIN / Nº chassis', 'text'),
            fd('estado_pintura', 'Estado da pintura', 'select', ['opts' => ['Excelente', 'Bom', 'Razoável', 'Mau', 'Requer correção'], 'half' => 1]),
            fd('protecao', 'Proteção aplicada', 'select', ['opts' => ['Nenhuma', 'Cera', 'Selante', 'Cerâmico', 'PPF', 'Cerâmico + PPF'], 'half' => 1]),
            fd('ultimo_servico', 'Último serviço', 'date', ['list' => 1, 'half' => 1]),
            fd('proximo_servico', 'Próximo serviço recomendado', 'date', ['list' => 1, 'half' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
    ],
    'leads' => [
        'label' => 'Leads', 'one' => 'Lead', 'icon' => 'target', 'group' => 'Clientes', 'status' => 'estado',
        'tpl' => '{nome}', 'search' => ['nome', 'telefone', 'email', 'servico_interesse'],
        'fields' => [
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('estado', 'Estado', 'select', ['opts' => ['Novo', 'Contactado', 'Orçamento enviado', 'Negociação', 'Ganho', 'Perdido'], 'def' => 'Novo', 'list' => 1, 'half' => 1]),
            fd('nome', 'Nome', 'text', ['req' => 1, 'list' => 1]),
            fd('telefone', 'Telemóvel', 'tel', ['list' => 1, 'half' => 1]),
            fd('email', 'Email', 'email', ['half' => 1]),
            fd('origem', 'Origem', 'select', ['opts' => ORIGENS, 'list' => 1, 'half' => 1]),
            fd('veiculo', 'Veículo', 'text', ['half' => 1, 'ph' => 'Ex.: Porsche 911 (996) preto']),
            fd('servico_interesse', 'Serviço de interesse', 'text', ['list' => 1]),
            fd('valor_estimado', 'Valor estimado', 'money', ['list' => 1, 'half' => 1]),
            fd('data_preferida', 'Data preferida pelo cliente', 'date', ['half' => 1]),
            fd('periodo', 'Período preferido', 'select', ['opts' => ['Manhã', 'Tarde', 'Indiferente'], 'half' => 1]),
            fd('data_followup', 'Próximo follow-up', 'date', ['list' => 1, 'half' => 1]),
            fd('motivo_perda', 'Motivo de perda', 'text'),
            fd('cliente_id', 'Cliente (após conversão)', 'ref', ['ref' => 'clientes']),
            fd('notas', 'Notas', 'textarea'),
        ],
    ],
    'servicos' => [
        'label' => 'Serviços & Extras', 'one' => 'Serviço', 'icon' => 'sparkle', 'group' => 'Vendas',
        'tpl' => '{nome}', 'search' => ['nome', 'categoria', 'descricao'],
        'fields' => [
            fd('nome', 'Nome', 'text', ['req' => 1, 'list' => 1]),
            fd('tipo', 'Tipo', 'select', ['opts' => ['Pacote', 'Extra'], 'def' => 'Pacote', 'list' => 1, 'half' => 1]),
            fd('categoria', 'Categoria', 'select', ['opts' => ['Lavagem', 'Exterior', 'Interior', 'Completo', 'Correção de pintura', 'Proteção cerâmica', 'PPF', 'Restauro', 'Manutenção', 'Outro'], 'list' => 1, 'half' => 1]),
            fd('preco_pequeno', 'Preço · Pequeno', 'money', ['half' => 1]),
            fd('preco_medio', 'Preço · Médio', 'money', ['list' => 1, 'half' => 1]),
            fd('preco_grande', 'Preço · Grande / SUV', 'money', ['half' => 1]),
            fd('preco_luxo', 'Preço · Desportivo / Luxo', 'money', ['half' => 1]),
            fd('preco_moto', 'Preço · Mota', 'money', ['half' => 1]),
            fd('duracao_h', 'Duração (horas)', 'number', ['list' => 1, 'half' => 1, 'step' => '0.25']),
            fd('custo_produtos', 'Custo de produtos estimado', 'money', ['list' => 1, 'half' => 1]),
            fd('ativo', 'Ativo', 'bool', ['def' => 1, 'half' => 1]),
            fd('publico', 'Mostrar no portal do cliente', 'bool', ['def' => 1, 'half' => 1]),
            fd('destaque', 'Destacar no portal', 'bool', ['half' => 1]),
            fd('slogan', 'Slogan curto (portal)', 'text', ['half' => 1, 'ph' => 'Ex.: Riscos fora. Profundidade de volta.']),
            fd('resultado', 'Resultado / proteção (portal)', 'text', ['half' => 1, 'ph' => 'Ex.: Polimento multi-fase']),
            fd('duracao_txt', 'Duração em texto (portal)', 'text', ['half' => 1, 'ph' => 'Ex.: 1–2 dias']),
            fd('ordem', 'Ordem no portal', 'int', ['half' => 1]),
            fd('descricao', 'Descrição (aparece no orçamento e no portal)', 'textarea'),
            fd('tarefas_padrao', 'O que inclui / tarefas padrão (uma por linha — preenche a checklist do trabalho e aparece no portal)', 'textarea'),
            fd('fotos', 'Fotos do serviço (portal)', 'photos'),
        ],
    ],
    'orcamentos' => [
        'label' => 'Orçamentos', 'one' => 'Orçamento', 'icon' => 'file', 'group' => 'Vendas', 'status' => 'estado',
        'tpl' => '{numero}', 'num' => 'orc', 'print' => 1, 'search' => ['numero', 'notas'],
        'fields' => [
            fd('numero', 'Nº', 'text', ['list' => 1, 'half' => 1, 'ph' => 'Automático']),
            fd('estado', 'Estado', 'select', ['opts' => ['Rascunho', 'Enviado', 'Aceite', 'Recusado', 'Expirado'], 'def' => 'Rascunho', 'list' => 1, 'half' => 1]),
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('validade', 'Válido até', 'date', ['def' => '@validade', 'half' => 1]),
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'req' => 1, 'list' => 1, 'half' => 1]),
            fd('veiculo_id', 'Veículo', 'ref', ['ref' => 'veiculos', 'filter' => 'cliente_id', 'list' => 1, 'half' => 1]),
            fd('linhas', 'Serviços, extras e encargos', 'lines'),
            fd('deslocacao', 'Taxa de deslocação', 'money', ['half' => 1]),
            fd('desconto_pct', 'Desconto (%)', 'number', ['half' => 1]),
            fd('desconto', 'Desconto (€)', 'money', ['half' => 1]),
            fd('iva_pct', 'IVA (%)', 'number', ['def' => '@iva', 'half' => 1]),
            fd('notas', 'Notas para o cliente', 'textarea'),
        ],
        'calc' => [['k' => 'total', 'l' => 'Total', 't' => 'money']],
    ],
    'garantias' => [
        'label' => 'Garantias Cerâmicas', 'one' => 'Certificado', 'icon' => 'shield', 'group' => 'Vendas', 'num' => 'gar', 'print' => 1,
        'tpl' => '{numero}', 'search' => ['numero', 'produto', 'superficies'], 'sort' => 'data',
        'fields' => [
            fd('numero', 'Nº certificado', 'text', ['list' => 1, 'half' => 1, 'ph' => 'Automático']),
            fd('data', 'Data de aplicação', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'req' => 1, 'list' => 1, 'half' => 1]),
            fd('veiculo_id', 'Veículo', 'ref', ['ref' => 'veiculos', 'filter' => 'cliente_id', 'list' => 1, 'half' => 1]),
            fd('trabalho_id', 'Trabalho', 'ref', ['ref' => 'trabalhos', 'filter' => 'cliente_id', 'half' => 1]),
            fd('tecnico_id', 'Aplicado por', 'ref', ['ref' => 'equipa', 'half' => 1]),
            fd('produto', 'Produto / revestimento', 'text', ['req' => 1, 'list' => 1, 'ph' => 'Ex.: Cerâmico 9H Pro']),
            fd('camadas', 'Camadas', 'int', ['def' => 1, 'half' => 1]),
            fd('anos', 'Cobertura (anos)', 'int', ['def' => 2, 'list' => 1, 'half' => 1]),
            fd('superficies', 'Superfícies', 'text', ['def' => 'Pintura, vidros, jantes, plásticos exteriores']),
            fd('intervalo_meses', 'Manutenção obrigatória a cada (meses)', 'int', ['def' => 12, 'half' => 1]),
            fd('ultima_manutencao', 'Última manutenção realizada', 'date', ['half' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
        'calc' => [['k' => 'validade', 'l' => 'Válido até', 't' => 'date'], ['k' => 'proxima', 'l' => 'Próx. manutenção', 't' => 'date'], ['k' => 'alerta', 'l' => 'Alerta', 't' => 'text']],
    ],
    'receitas' => [
        'label' => 'Outras Receitas', 'one' => 'Receita', 'icon' => 'download', 'group' => 'Dinheiro',
        'tpl' => '{descricao}', 'search' => ['descricao', 'categoria'], 'sort' => 'data',
        'fields' => [
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('categoria', 'Categoria', 'select', ['opts' => ['Venda de produtos', 'Vales / vouchers', 'Formação', 'Aluguer de espaço', 'Parcerias / comissões', 'Subsídios', 'Outros'], 'list' => 1, 'half' => 1]),
            fd('descricao', 'Descrição', 'text', ['req' => 1, 'list' => 1]),
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'list' => 1, 'half' => 1]),
            fd('valor', 'Valor', 'money', ['req' => 1, 'list' => 1, 'half' => 1]),
            fd('custo', 'Custo associado (ex.: custo do produto vendido)', 'money', ['half' => 1]),
            fd('metodo', 'Método de pagamento', 'select', ['opts' => METODOS, 'half' => 1]),
            fd('documento', 'Nº documento', 'text', ['half' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
        'calc' => [['k' => 'margem', 'l' => 'Margem', 't' => 'money']],
    ],
    'fornecedores' => [
        'label' => 'Fornecedores', 'one' => 'Fornecedor', 'icon' => 'truck', 'group' => 'Oficina',
        'tpl' => '{nome}', 'search' => ['nome', 'contacto', 'categoria', 'nif'],
        'fields' => [
            fd('nome', 'Nome', 'text', ['req' => 1, 'list' => 1]),
            fd('categoria', 'Categoria', 'select', ['opts' => ['Químicos & ceras', 'Microfibras & acessórios', 'Equipamento', 'PPF & películas', 'Peças', 'Serviços (estofador, pintura…)', 'Outro'], 'list' => 1, 'half' => 1]),
            fd('nif', 'NIF', 'text', ['half' => 1]),
            fd('contacto', 'Pessoa de contacto', 'text', ['list' => 1, 'half' => 1]),
            fd('telefone', 'Telefone', 'tel', ['list' => 1, 'half' => 1]),
            fd('email', 'Email', 'email', ['half' => 1]),
            fd('website', 'Website / loja online', 'text', ['half' => 1]),
            fd('condicoes', 'Condições (prazo, portes, descontos)', 'text'),
            fd('notas', 'Notas', 'textarea'),
        ],
        'calc' => [['k' => 'compras', 'l' => 'Compras (total)', 't' => 'money']],
    ],
    'compras' => [
        'label' => 'Compras & Encomendas', 'one' => 'Compra', 'icon' => 'box', 'group' => 'Oficina', 'status' => 'estado',
        'tpl' => '{documento}', 'search' => ['documento', 'notas'], 'sort' => 'data',
        'fields' => [
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('estado', 'Estado', 'select', ['opts' => ['Encomendada', 'Recebida', 'Cancelada'], 'def' => 'Encomendada', 'list' => 1, 'half' => 1]),
            fd('fornecedor_id', 'Fornecedor', 'ref', ['ref' => 'fornecedores', 'req' => 1, 'list' => 1, 'half' => 1]),
            fd('documento', 'Nº encomenda / fatura', 'text', ['list' => 1, 'half' => 1]),
            fd('artigo_id', 'Artigo do inventário', 'ref', ['ref' => 'inventario', 'list' => 1, 'half' => 1]),
            fd('quantidade', 'Quantidade', 'number', ['list' => 1, 'half' => 1]),
            fd('valor', 'Valor total (c/ IVA)', 'money', ['req' => 1, 'list' => 1, 'half' => 1]),
            fd('criar_despesa', 'Registar como despesa ao receber', 'bool', ['def' => 1, 'half' => 1]),
            fd('notas', 'Notas', 'textarea'),
            fd('lancado', 'Lançado no stock', 'bool', ['hide' => 1]),
        ],
    ],
    'objetivos' => [
        'label' => 'Objetivos', 'one' => 'Objetivo', 'icon' => 'target', 'group' => 'Oficina',
        'tpl' => '{titulo}', 'search' => ['titulo'], 'sort' => 'mes',
        'fields' => [
            fd('titulo', 'Objetivo', 'text', ['req' => 1, 'list' => 1, 'ph' => 'Ex.: Faturar 5.000 € em dezembro']),
            fd('metrica', 'Métrica', 'select', ['opts' => ['Receita', 'Lucro bruto', 'Lucro operacional', 'Trabalhos concluídos', 'Ticket médio', 'Novos clientes', 'Novas leads', 'Avaliações recebidas', 'Receita recorrente (MRR)'], 'def' => 'Receita', 'list' => 1, 'half' => 1]),
            fd('alvo', 'Meta', 'number', ['req' => 1, 'list' => 1, 'half' => 1]),
            fd('mes', 'Mês (qualquer dia do mês)', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('notas', 'Plano de ação', 'textarea'),
        ],
        'calc' => [['k' => 'atual', 'l' => 'Atual', 't' => 'text'], ['k' => 'pct', 'l' => 'Progresso', 't' => 'pct']],
    ],
    'faturas' => [
        'label' => 'Faturação & Recebimentos', 'one' => 'Documento', 'icon' => 'receipt', 'group' => 'Vendas', 'status' => 'estado',
        'tpl' => '{numero}', 'num' => 'fat', 'print' => 1, 'search' => ['numero', 'ref_externa', 'notas'],
        'fields' => [
            fd('numero', 'Nº interno', 'text', ['list' => 1, 'half' => 1, 'ph' => 'Automático']),
            fd('ref_externa', 'Nº fatura certificada (AT)', 'text', ['list' => 1, 'half' => 1, 'help' => 'Nº da fatura emitida no software certificado.']),
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('vencimento', 'Vencimento', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'req' => 1, 'list' => 1, 'half' => 1]),
            fd('trabalho_id', 'Trabalho', 'ref', ['ref' => 'trabalhos', 'filter' => 'cliente_id', 'half' => 1]),
            fd('linhas', 'Linhas', 'lines'),
            fd('desconto_pct', 'Desconto (%)', 'number', ['half' => 1]),
            fd('desconto', 'Desconto (€)', 'money', ['half' => 1]),
            fd('iva_pct', 'IVA (%)', 'number', ['def' => '@iva', 'half' => 1]),
            fd('gorjeta', 'Gorjeta', 'money', ['half' => 1]),
            fd('pagamentos', 'Pagamentos recebidos (parciais, sinais…)', 'payments'),
            fd('valor_pago', 'Valor recebido', 'money', ['hide' => 1]),
            fd('metodo', 'Método de pagamento', 'select', ['opts' => METODOS, 'hide' => 1]),
            fd('data_pagamento', 'Data do pagamento', 'date', ['hide' => 1]),
            fd('estado', 'Estado', 'select', ['opts' => ['Por pagar', 'Parcial', 'Paga', 'Anulada'], 'def' => 'Por pagar', 'list' => 1, 'half' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
        'calc' => [['k' => 'total', 'l' => 'Total', 't' => 'money'], ['k' => 'em_divida', 'l' => 'Em dívida', 't' => 'money']],
    ],
    'marcacoes' => [
        'label' => 'Marcações', 'one' => 'Marcação', 'icon' => 'calendar', 'group' => 'Operação', 'status' => 'estado',
        'tpl' => '{data} {hora}', 'search' => ['morada', 'notas'], 'sort' => 'data',
        'fields' => [
            fd('data', 'Data', 'date', ['req' => 1, 'def' => '@today', 'list' => 1, 'half' => 1]),
            fd('hora', 'Hora', 'time', ['list' => 1, 'half' => 1, 'def' => '09:00']),
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'req' => 1, 'list' => 1, 'half' => 1]),
            fd('veiculo_id', 'Veículo', 'ref', ['ref' => 'veiculos', 'filter' => 'cliente_id', 'list' => 1, 'half' => 1]),
            fd('servico_id', 'Serviço', 'ref', ['ref' => 'servicos', 'list' => 1, 'half' => 1]),
            fd('tecnico_id', 'Técnico', 'ref', ['ref' => 'equipa', 'list' => 1, 'half' => 1]),
            fd('box', 'Box / baia', 'select', ['opts' => BOXES, 'list' => 1, 'half' => 1]),
            fd('duracao_h', 'Duração (h)', 'number', ['half' => 1, 'step' => '0.25']),
            fd('valor_previsto', 'Valor previsto', 'money', ['half' => 1]),
            fd('local', 'Local', 'select', ['opts' => ['Oficina', 'Domicílio do cliente', 'Empresa do cliente', 'Outro'], 'def' => 'Oficina', 'half' => 1]),
            fd('estado', 'Estado', 'select', ['opts' => ['Pendente', 'Confirmada', 'Concluída', 'Cancelada', 'Faltou'], 'def' => 'Pendente', 'list' => 1, 'half' => 1]),
            fd('morada', 'Morada do serviço', 'text'),
            fd('km', 'Km de deslocação', 'number', ['half' => 1]),
            fd('sinal', 'Sinal / depósito (€)', 'money', ['half' => 1]),
            fd('sinal_pago', 'Sinal pago', 'bool', ['half' => 1]),
            fd('lembrete_enviado', 'Lembrete enviado', 'bool', ['half' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
    ],
    'trabalhos' => [
        'label' => 'Trabalhos & Lucro', 'one' => 'Trabalho', 'icon' => 'wrench', 'group' => 'Operação', 'status' => 'estado',
        'tpl' => '{numero}', 'num' => 'trab', 'print' => 1, 'search' => ['numero', 'extras', 'notas_trabalho'], 'sort' => 'data',
        'fields' => [
            fd('numero', 'Nº', 'text', ['list' => 1, 'half' => 1, 'ph' => 'Automático']),
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'req' => 1, 'list' => 1, 'half' => 1]),
            fd('veiculo_id', 'Veículo', 'ref', ['ref' => 'veiculos', 'filter' => 'cliente_id', 'list' => 1, 'half' => 1]),
            fd('servico_id', 'Serviço principal', 'ref', ['ref' => 'servicos', 'half' => 1]),
            fd('tecnico_id', 'Técnico responsável', 'ref', ['ref' => 'equipa', 'list' => 1, 'half' => 1]),
            fd('estado', 'Estado', 'select', ['opts' => ['Agendado', 'Check-in', 'Lavagem', 'Interior', 'Correção / Proteção', 'Controlo de qualidade', 'Pronto', 'Concluído', 'Cancelado'], 'def' => 'Agendado', 'list' => 1, 'half' => 1]),
            fd('box', 'Box / baia', 'select', ['opts' => BOXES, 'list' => 1, 'half' => 1]),
            fd('data_entrega', 'Entrega prevista', 'date', ['half' => 1]),
            fd('extras', 'Extras / descrição', 'text'),
            fd('tarefas', 'Ficha de intervenção — tarefas por serviço', 'checklist', ['grupos' => 1]),
            fd('notas_servicos', 'Notas por serviço', 'jsonmap', ['hide' => 1]),
            fd('valor', 'Valor cobrado (s/ IVA)', 'money', ['list' => 1, 'half' => 1]),
            fd('gorjeta', 'Gorjeta', 'money', ['half' => 1]),
            fd('custo_produtos', 'Custo de produtos/químicos', 'money', ['half' => 1]),
            fd('custo_mao_obra', 'Custo de mão de obra', 'money', ['half' => 1, 'help' => 'Deixe vazio para calcular: horas × custo/hora do técnico.']),
            fd('custo_deslocacao', 'Custo de deslocação', 'money', ['half' => 1]),
            fd('outros_custos', 'Outros custos diretos', 'money', ['half' => 1]),
            fd('horas', 'Horas reais de trabalho', 'number', ['half' => 1, 'step' => '0.25']),
            fd('fotos', 'Fotos antes / depois', 'photos'),
            fd('portal_visivel', 'Visível no portal do cliente', 'bool', ['def' => 1, 'half' => 1]),
            fd('notas_trabalho', 'Trabalho realizado', 'textarea'),
            fd('notas_aftercare', 'Cuidados pós-serviço (para o cliente)', 'textarea'),
            fd('historico', 'Cronologia', 'timeline'),
            fd('timer_inicio', 'Cronómetro', 'text', ['hide' => 1]),
        ],
        'calc' => [['k' => 'lucro', 'l' => 'Lucro', 't' => 'money'], ['k' => 'lucro_hora', 'l' => 'Lucro/h', 't' => 'money'], ['k' => 'progresso', 'l' => 'Tarefas', 't' => 'text']],
    ],
    'inspecoes' => [
        'label' => 'Fichas de Inspeção', 'one' => 'Ficha de inspeção', 'icon' => 'clipboard', 'group' => 'Operação', 'print' => 1,
        'tpl' => 'Inspeção {data}', 'search' => ['notas'], 'sort' => 'data',
        'fields' => [
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('momento', 'Momento', 'select', ['opts' => ['Entrada (check-in)', 'Saída (entrega)'], 'def' => 'Entrada (check-in)', 'list' => 1, 'half' => 1]),
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'req' => 1, 'list' => 1, 'half' => 1]),
            fd('veiculo_id', 'Veículo', 'ref', ['ref' => 'veiculos', 'filter' => 'cliente_id', 'list' => 1, 'half' => 1]),
            fd('trabalho_id', 'Trabalho', 'ref', ['ref' => 'trabalhos', 'filter' => 'cliente_id', 'half' => 1]),
            fd('km', 'Quilómetros', 'int', ['half' => 1]),
            fd('combustivel', 'Combustível', 'select', ['opts' => ['Reserva', '1/4', '1/2', '3/4', 'Cheio', 'Elétrico'], 'half' => 1]),
            fd('pedidos', 'Pedidos do cliente', 'text', ['ph' => 'Ex.: Remover swirls do capot e tejadilho. Cuidado com os emblemas.']),
            fd('mapa', 'Mapa de danos (toque no carro para marcar)', 'damagemap'),
            fd('exterior', 'Exterior', 'checklist', ['def' => '@chk_ext']),
            fd('interior', 'Interior', 'checklist', ['def' => '@chk_int']),
            fd('danos', 'Danos / observações (riscos, mossas, lascas, jantes...)', 'textarea'),
            fd('objetos', 'Objetos pessoais deixados no veículo', 'text'),
            fd('fotos', 'Fotos do estado do veículo', 'photos'),
            fd('assinado_por', 'Assinado por (nome do cliente)', 'text', ['half' => 1]),
            fd('assinatura', 'Assinatura do cliente', 'signature'),
            fd('assinado_em', 'Assinado em', 'text', ['hide' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
    ],
    'subscricoes' => [
        'label' => 'Subscrições', 'one' => 'Subscrição', 'icon' => 'repeat', 'group' => 'Clientes', 'status' => 'estado',
        'tpl' => '{plano}', 'search' => ['plano', 'notas'],
        'fields' => [
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'req' => 1, 'list' => 1, 'half' => 1]),
            fd('veiculo_id', 'Veículo', 'ref', ['ref' => 'veiculos', 'filter' => 'cliente_id', 'list' => 1, 'half' => 1]),
            fd('plano', 'Plano', 'text', ['req' => 1, 'list' => 1, 'ph' => 'Ex.: Manutenção mensal']),
            fd('valor', 'Valor por período', 'money', ['list' => 1, 'half' => 1]),
            fd('frequencia', 'Frequência', 'select', ['opts' => ['Semanal', 'Quinzenal', 'Mensal', 'Bimestral', 'Trimestral'], 'def' => 'Mensal', 'list' => 1, 'half' => 1]),
            fd('data_inicio', 'Início', 'date', ['def' => '@today', 'half' => 1]),
            fd('proxima_visita', 'Próxima visita', 'date', ['list' => 1, 'half' => 1]),
            fd('validade', 'Válida até', 'date', ['half' => 1]),
            fd('visitas_incluidas', 'Visitas incluídas', 'int', ['half' => 1]),
            fd('visitas_usadas', 'Visitas usadas', 'int', ['half' => 1]),
            fd('estado', 'Estado', 'select', ['opts' => ['Ativa', 'Pausada', 'Cancelada'], 'def' => 'Ativa', 'list' => 1, 'half' => 1]),
            fd('pagamento', 'Pagamento', 'select', ['opts' => METODOS, 'half' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
        'calc' => [['k' => 'mensal', 'l' => 'Valor/mês', 't' => 'money'], ['k' => 'utilizacao', 'l' => 'Utilização', 't' => 'text']],
    ],
    'avaliacoes' => [
        'label' => 'Avaliações & Referências', 'one' => 'Avaliação / referência', 'icon' => 'star', 'group' => 'Clientes', 'status' => 'estado',
        'tpl' => '{plataforma}', 'search' => ['texto', 'recompensa'], 'sort' => 'data',
        'fields' => [
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('tipo', 'Tipo', 'select', ['opts' => ['Avaliação', 'Referência'], 'def' => 'Avaliação', 'list' => 1, 'half' => 1]),
            fd('cliente_id', 'Cliente', 'ref', ['ref' => 'clientes', 'list' => 1, 'half' => 1]),
            fd('estado', 'Estado', 'select', ['opts' => ['Pedido por enviar', 'Pedido enviado', 'Recebida', 'Recompensa entregue'], 'def' => 'Pedido por enviar', 'list' => 1, 'half' => 1]),
            fd('plataforma', 'Plataforma', 'select', ['opts' => ['Google', 'Facebook', 'Instagram', 'Website', 'Outra'], 'list' => 1, 'half' => 1]),
            fd('pontuacao', 'Pontuação', 'rating', ['list' => 1, 'half' => 1]),
            fd('texto', 'Texto da avaliação', 'textarea'),
            fd('testemunho_ok', 'Autoriza uso como testemunho', 'bool', ['half' => 1]),
            fd('referido_id', 'Cliente referido (novo cliente)', 'ref', ['ref' => 'clientes', 'half' => 1]),
            fd('recompensa', 'Recompensa da referência', 'text', ['ph' => 'Ex.: 10% de desconto na próxima lavagem']),
        ],
    ],
    'mensagens' => [
        'label' => 'Modelos de Mensagem', 'one' => 'Modelo', 'icon' => 'chat', 'group' => 'Vendas',
        'tpl' => '{nome}', 'search' => ['nome', 'texto'],
        'fields' => [
            fd('nome', 'Nome do modelo', 'text', ['req' => 1, 'list' => 1]),
            fd('canal', 'Canal', 'select', ['opts' => ['WhatsApp', 'SMS', 'Email', 'Todos'], 'def' => 'Todos', 'list' => 1, 'half' => 1]),
            fd('assunto', 'Assunto (email)', 'text', ['half' => 1]),
            fd('texto', 'Texto', 'textarea', ['req' => 1, 'list' => 1, 'help' => 'Variáveis: {cliente} {primeiro_nome} {veiculo} {matricula} {data} {hora} {servico} {valor} {empresa} {telefone_empresa} {link_avaliacao}']),
        ],
    ],
    'equipa' => [
        'label' => 'Equipa', 'one' => 'Membro da equipa', 'icon' => 'team', 'group' => 'Operação',
        'tpl' => '{nome}', 'search' => ['nome', 'funcao', 'telefone'],
        'fields' => [
            fd('nome', 'Nome', 'text', ['req' => 1, 'list' => 1]),
            fd('funcao', 'Função', 'text', ['list' => 1, 'half' => 1, 'ph' => 'Ex.: Detailer sénior']),
            fd('telefone', 'Telemóvel', 'tel', ['list' => 1, 'half' => 1]),
            fd('email', 'Email', 'email', ['half' => 1]),
            fd('custo_hora', 'Custo/hora', 'money', ['list' => 1, 'half' => 1]),
            fd('comissao_pct', 'Comissão (%)', 'number', ['list' => 1, 'half' => 1]),
            fd('cor', 'Cor na agenda', 'color', ['def' => '#22d3ee', 'half' => 1]),
            fd('ativo', 'Ativo', 'bool', ['def' => 1, 'list' => 1, 'half' => 1]),
            fd('notas', 'Notas / formações', 'textarea'),
        ],
    ],
    'deslocacoes' => [
        'label' => 'Quilómetros & Deslocações', 'one' => 'Deslocação', 'icon' => 'route', 'group' => 'Custos',
        'tpl' => '{destino}', 'search' => ['origem', 'destino', 'finalidade'], 'sort' => 'data',
        'fields' => [
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('trabalho_id', 'Trabalho', 'ref', ['ref' => 'trabalhos', 'half' => 1]),
            fd('origem', 'Origem', 'text', ['list' => 1, 'half' => 1]),
            fd('destino', 'Destino', 'text', ['list' => 1, 'half' => 1]),
            fd('km', 'Km (total ida e volta)', 'number', ['req' => 1, 'list' => 1, 'half' => 1]),
            fd('portagens', 'Portagens / estacionamento', 'money', ['half' => 1]),
            fd('tecnico_id', 'Técnico', 'ref', ['ref' => 'equipa', 'half' => 1]),
            fd('finalidade', 'Finalidade', 'text', ['list' => 1, 'half' => 1]),
        ],
        'calc' => [['k' => 'custo', 'l' => 'Custo', 't' => 'money']],
    ],
    'despesas' => [
        'label' => 'Despesas', 'one' => 'Despesa', 'icon' => 'wallet', 'group' => 'Custos',
        'tpl' => '{descricao}', 'search' => ['descricao', 'fornecedor', 'categoria'], 'sort' => 'data',
        'fields' => [
            fd('data', 'Data', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('categoria', 'Categoria', 'select', ['opts' => ['Produtos / stock', 'Combustível', 'Equipamento', 'Manutenção equipamento', 'Marketing / publicidade', 'Seguros', 'Renda / espaço', 'Água / luz', 'Telecomunicações', 'Software', 'Salários', 'Contabilidade', 'Impostos / taxas', 'Formação', 'Outros'], 'list' => 1, 'half' => 1]),
            fd('descricao', 'Descrição', 'text', ['req' => 1, 'list' => 1]),
            fd('fornecedor', 'Fornecedor', 'text', ['list' => 1, 'half' => 1]),
            fd('nif_fornecedor', 'NIF fornecedor', 'text', ['half' => 1]),
            fd('valor', 'Valor (c/ IVA)', 'money', ['req' => 1, 'list' => 1, 'half' => 1]),
            fd('iva', 'IVA incluído (€)', 'money', ['half' => 1]),
            fd('metodo', 'Método de pagamento', 'select', ['opts' => METODOS, 'half' => 1]),
            fd('documento', 'Nº fatura / recibo', 'text', ['half' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
    ],
    'inventario' => [
        'label' => 'Inventário', 'one' => 'Artigo', 'icon' => 'box', 'group' => 'Custos',
        'tpl' => '{nome}', 'search' => ['nome', 'fornecedor', 'categoria', 'localizacao'],
        'fields' => [
            fd('nome', 'Artigo', 'text', ['req' => 1, 'list' => 1]),
            fd('categoria', 'Categoria', 'select', ['opts' => ['Químico', 'Cerâmico / proteção', 'Microfibras', 'Boinas / pads', 'Consumível', 'Acessório', 'Outro'], 'list' => 1, 'half' => 1]),
            fd('fornecedor', 'Fornecedor', 'text', ['list' => 1, 'half' => 1]),
            fd('unidade', 'Unidade', 'select', ['opts' => ['un', 'L', 'ml', 'kg', 'cx'], 'def' => 'un', 'half' => 1]),
            fd('quantidade', 'Quantidade em stock', 'number', ['list' => 1, 'half' => 1]),
            fd('nivel_minimo', 'Nível mínimo (alerta)', 'number', ['list' => 1, 'half' => 1]),
            fd('custo_unitario', 'Preço por unidade/embalagem', 'money', ['list' => 1, 'half' => 1]),
            fd('volume_ml', 'Volume da embalagem (ml)', 'number', ['half' => 1, 'help' => 'Para químicos — usado na calculadora.']),
            fd('diluicao', 'Diluição 1:X (X)', 'number', ['half' => 1, 'help' => 'Ex.: 1:10 → 10. Puro → 0.']),
            fd('ml_por_uso', 'ml de solução por utilização', 'number', ['half' => 1]),
            fd('localizacao', 'Localização', 'text', ['half' => 1]),
            fd('notas', 'Notas', 'textarea'),
        ],
        'calc' => [['k' => 'valor_stock', 'l' => 'Valor stock', 't' => 'money'], ['k' => 'custo_uso', 'l' => 'Custo/uso', 't' => 'money'], ['k' => 'alerta', 'l' => 'Alerta', 't' => 'text']],
    ],
    'equipamentos' => [
        'label' => 'Equipamentos', 'one' => 'Equipamento', 'icon' => 'tool', 'group' => 'Custos', 'status' => 'estado',
        'tpl' => '{nome}', 'search' => ['nome', 'tipo', 'marca_modelo', 'numero_serie'],
        'fields' => [
            fd('nome', 'Equipamento', 'text', ['req' => 1, 'list' => 1]),
            fd('tipo', 'Tipo', 'select', ['opts' => ['Máquina de pressão', 'Aspirador', 'Extratora', 'Polidora', 'Gerador', 'Compressor', 'Vaporizador', 'Ozono', 'Iluminação', 'Viatura', 'Outro'], 'list' => 1, 'half' => 1]),
            fd('marca_modelo', 'Marca / modelo', 'text', ['half' => 1]),
            fd('numero_serie', 'Nº de série', 'text', ['half' => 1]),
            fd('data_compra', 'Data de compra', 'date', ['half' => 1]),
            fd('valor_compra', 'Valor de compra', 'money', ['half' => 1]),
            fd('garantia_ate', 'Garantia até', 'date', ['half' => 1]),
            fd('ultima_manutencao', 'Última manutenção', 'date', ['list' => 1, 'half' => 1]),
            fd('intervalo_dias', 'Intervalo de manutenção (dias)', 'int', ['def' => 90, 'half' => 1]),
            fd('estado', 'Estado', 'select', ['opts' => ['Operacional', 'Em manutenção', 'Avariado', 'Abatido'], 'def' => 'Operacional', 'list' => 1, 'half' => 1]),
            fd('notas', 'Histórico / notas de manutenção', 'textarea'),
        ],
        'calc' => [['k' => 'proxima', 'l' => 'Próx. manutenção', 't' => 'date'], ['k' => 'alerta', 'l' => 'Alerta', 't' => 'text']],
    ],
    'marketing' => [
        'label' => 'Marketing & Promoções', 'one' => 'Campanha', 'icon' => 'megaphone', 'group' => 'Custos',
        'tpl' => '{campanha}', 'search' => ['campanha', 'canal', 'notas'], 'sort' => 'data_inicio',
        'fields' => [
            fd('campanha', 'Campanha / promoção', 'text', ['req' => 1, 'list' => 1]),
            fd('canal', 'Canal', 'select', ['opts' => ['Instagram', 'Facebook', 'Google Ads', 'TikTok', 'Flyers', 'Parceria', 'Email / SMS', 'Evento', 'Outro'], 'list' => 1, 'half' => 1]),
            fd('codigo', 'Código promocional', 'text', ['half' => 1]),
            fd('data_inicio', 'Início', 'date', ['def' => '@today', 'list' => 1, 'half' => 1]),
            fd('data_fim', 'Fim', 'date', ['half' => 1]),
            fd('custo', 'Investimento', 'money', ['list' => 1, 'half' => 1]),
            fd('leads', 'Leads geradas', 'int', ['list' => 1, 'half' => 1]),
            fd('clientes', 'Clientes ganhos', 'int', ['list' => 1, 'half' => 1]),
            fd('receita', 'Receita gerada', 'money', ['list' => 1, 'half' => 1]),
            fd('notas', 'O que funcionou / aprendizagens', 'textarea'),
        ],
        'calc' => [['k' => 'roi', 'l' => 'ROI', 't' => 'pct'], ['k' => 'cac', 'l' => 'Custo/cliente', 't' => 'money']],
    ],
    ];
    return $S = apply_custom_schema($S);
}

/** Personalização por cliente: listas de opções editáveis e campos personalizados (definições). */
function apply_custom_schema(array $S): array {
    if (!function_exists('settings') || !function_exists('has_config') || !has_config()) return $S;
    $st = settings();
    $lists = json_decode((string)($st['listas'] ?? ''), true) ?: [];
    foreach ($lists as $key => $opts) {
        [$e, $k] = array_pad(explode('.', (string)$key, 2), 2, '');
        if (!isset($S[$e]) || !is_array($opts)) continue;
        foreach ($S[$e]['fields'] as &$f) if ($f['k'] === $k && $f['t'] === 'select' && $k !== 'estado') {
            $o = array_values(array_unique(array_filter(array_map(fn($x) => mb_substr(trim((string)$x), 0, 80), $opts), 'strlen')));
            if ($o) { $f['opts_base'] = $f['opts']; $f['opts'] = $o; }
        }
        unset($f);
    }
    $custom = json_decode((string)($st['campos_extra'] ?? ''), true) ?: [];
    foreach ($custom as $c) {
        $e = $c['e'] ?? ''; $k = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($c['k'] ?? '')));
        if (!isset($S[$e]) || !$k || !str_starts_with($k, 'cx_')) continue;
        $t = in_array($c['t'] ?? '', ['text', 'textarea', 'number', 'money', 'date', 'bool', 'select', 'tel', 'email'], true) ? $c['t'] : 'text';
        $f = fd($k, mb_substr((string)($c['l'] ?? $k), 0, 80), $t, ['half' => $t !== 'textarea' ? 1 : 0, 'custom' => 1] + (!empty($c['list']) ? ['list' => 1] : []));
        if ($t === 'select') $f['opts'] = array_values(array_filter(array_map('trim', (array)($c['opts'] ?? [])), 'strlen')) ?: ['—'];
        $S[$e]['fields'][] = $f;
    }
    return $S;
}

/** Listas que podem ser editadas em Definições → Categorias & listas. */
function editable_lists(): array {
    $out = [];
    foreach (app_schema() as $e => $E) foreach ($E['fields'] as $f)
        if ($f['t'] === 'select' && $f['k'] !== 'estado' && empty($f['custom'])) $out["$e.{$f['k']}"] = $E['label'] . ' → ' . $f['l'];
    return $out;
}

function schema_hash() { return substr(md5(json_encode(app_schema())), 0, 12); }
