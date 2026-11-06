// The full execution process ("Esquema de Execução") as a checklist.
// Each phase has steps; a step can apply only to some deals (e.g. road vs. car transporter, COC yes/no).
// Shared by the server tests and the browser.

const road = (d) => (d.overrides?.returnMode || 'drive') !== 'truck';
const truck = (d) => !road(d);
const noCoc = (d) => d.hasCoc === false;
const imported = (d) => d.country !== 'PT';
const tradeIn = (d) => !!d.tradeIn?.enabled;

export const PROCESS = [
  { key: 'acq', label: 'Aquisição', when: imported, steps: [
    { key: 'capital', label: 'Capital a investir definido', hint: 'Viatura alvo 4 000–8 000 €' },
    { key: 'payment', label: 'Tipo de pagamento definido (transferência ou numerário)', field: 'paymentMethod' },
    { key: 'search', label: 'Pesquisa do carro', hint: 'Zona França: Toulouse · só vendedores profissionais' },
    { key: 'photos', label: 'Pedir mais fotos / documentos', hint: 'Vídeos, carte grise, histórico de manutenção, COC' },
    { key: 'history', label: 'Relatório de histórico (carVertical / autoDNA)' },
    { key: 'reviews', label: 'Ver reviews do stand no Google' },
    { key: 'negotiate', label: 'Negociar o preço', hint: 'Argumento: garantias' },
    { key: 'transport_type', label: 'Escolher o tipo de transporte: estrada ou transportadora', field: 'overrides.returnMode' },
    { key: 'align', label: 'Alinhar com o vendedor datas e pagamentos', when: road },
    { key: 'truck_hire', label: 'Contratar transportadora e alinhar com o vendedor', when: truck },
    { key: 'deposit', label: 'Sinal enviado (se o stand pedir)' },
    { key: 'contract', label: 'Negócio concretizado: contrato de compra e venda assinado' },
    { key: 'invoice', label: 'Fatura recebida' },
  ] },
  { key: 'transport', label: 'Transporte', when: imported, steps: [
    { key: 'flights', label: 'Agendar voos', when: road, hint: 'Skyscanner · estadia com cozinha no Booking' },
    { key: 'docs_id', label: 'Levar Cartão de Cidadão / passaporte', when: road },
    { key: 'docs_license', label: 'Levar carta de condução', when: road },
    { key: 'docs_address', label: 'Levar comprovativo de morada e de IBAN', when: road },
    { key: 'insurance_temp', label: 'Contratar seguro temporário', when: road },
    { key: 'plates_temp', label: 'Matrícula temporária (de exportação)', when: road },
    { key: 'checkup', label: 'Checkup para a viagem', when: road, hint: 'Ver de dia, pedais, comandos, luzes no painel, ruídos, direção, VIN' },
    { key: 'route', label: 'Calcular rota, combustível e portagens', when: road, hint: 'FR: combustível 200–250 €, portagens 100 €, extras 50 €' },
    { key: 'time', label: 'Garantir tempo (2 dias a 3 semanas)', when: road },
    { key: 't_pickup', label: 'Agendar a recolha no vendedor', when: truck, hint: 'Serviço ±500 € + gratificação 20 €' },
    { key: 't_inform', label: 'Informar o vendedor', when: truck },
    { key: 't_proof', label: 'Garantir comprovativo de transporte (guia)', when: truck },
    { key: 't_dest', label: 'Indicar o destino', when: truck },
    { key: 't_delivery', label: 'Agendar a entrega', when: truck },
    { key: 'b_grise', label: 'Trazer a carte grise (certificado de matrícula)' },
    { key: 'b_coc', label: 'Trazer o COC', when: (d) => d.hasCoc !== false },
    { key: 'b_sale', label: 'Trazer a declaração de venda' },
    { key: 'b_green', label: 'Trazer a carta verde do seguro', when: road },
  ] },
  { key: 'legal', label: 'Legalização', when: imported, steps: [
    { key: 'coc_check', label: 'O carro tem COC?', field: 'hasCoc' },
    { key: 'coc_request', label: 'Pedir o COC à marca', when: noCoc, hint: 'Renault ±200 € · Stellantis ±120 €' },
    { key: 'homolog', label: 'Nº de homologação (formulário IMT)', hint: 'chnac.imt-ip.pt' },
    { key: 'dua', label: 'Modelo 9 IMT preenchido' },
    { key: 'inspection', label: 'Inspeção IPO categoria B (100 €)' },
    { key: 'dav', label: 'DAV no Portal das Finanças (gera o ISV)', hint: '20 dias úteis desde a entrada em Portugal' },
    { key: 'tax', label: 'Pagar o ISV (DUC)', hint: '10 dias úteis' },
    { key: 'plates', label: 'Matrículas emitidas (impressão ±15 €)' },
    { key: 'imt', label: 'IMT: reunir todos os documentos (45 €)' },
    { key: 'reg', label: 'Envio da documentação ao IMT e registo inicial na Conservatória (55 €), em nome de quem importa' },
    { key: 'insurance', label: 'Seguro definitivo' },
    { key: 'iuc', label: 'Pagar o IUC' },
  ] },
  { key: 'prep', label: 'Preparação', steps: [
    { key: 'prep_oil', label: 'Óleos e filtros', supplier: 'mechanic' },
    { key: 'prep_belts', label: 'Correntes e correias', supplier: 'mechanic' },
    { key: 'prep_ac', label: 'Ar condicionado', supplier: 'mechanic' },
    { key: 'prep_tyres', label: 'Pneus', supplier: 'mechanic' },
    { key: 'prep_lights', label: 'Luzes', supplier: 'extras' },
    { key: 'prep_brakes', label: 'Travões', supplier: 'mechanic' },
    { key: 'prep_paint', label: 'Chapa e pintura', supplier: 'bodywork' },
    { key: 'prep_parts', label: 'Peças', supplier: 'parts' },
    { key: 'prep_extras', label: 'Extras: detalhe, chaves, vidros, upgrades', supplier: 'extras' },
  ] },
  { key: 'sale', label: 'Venda', steps: [
    { key: 's_photos', label: 'Marketing: fotos' },
    { key: 's_videos', label: 'Marketing: vídeos' },
    { key: 's_social', label: 'Marketing: redes sociais / Instagram' },
    { key: 's_margin', label: 'Comercial: avaliação da margem (preço de venda vs. custos)' },
    { key: 's_olx', label: 'Publicado no OLX' },
    { key: 's_fb', label: 'Publicado no Facebook Marketplace' },
    { key: 's_sv', label: 'Publicado no StandVirtual' },
    { key: 's_indirect', label: 'Indiretos: consignação ou trocas (se fizer sentido)' },
    { key: 's_credit', label: 'Mediação de crédito (Credibom / Cetelem), se o cliente pedir' },
    { key: 's_tradein', label: 'Retoma avaliada e comprada', when: tradeIn },
    { key: 's_warranty', label: 'Legal: garantia (SNG / GR3)' },
    { key: 's_transfer', label: 'Legal: transferência de propriedade (solicitador / notário)' },
    { key: 's_paid', label: 'Pagamento recebido' },
  ] },
  { key: 'finance', label: 'Custos e lucros', steps: [
    { key: 'f_expenses', label: 'Todas as despesas reais registadas' },
    { key: 'f_suppliers', label: 'Fornecedores pagos' },
    { key: 'f_collab', label: 'Colaboradores pagos' },
    { key: 'f_reserve', label: 'Reservar 20% do lucro para a caixa' },
    { key: 'f_split', label: 'Distribuir 80% do lucro pelos sócios' },
  ] },
];

/** Phases and steps that apply to this deal, with done flags. Field-steps are done when the field is set. */
export function processFor(deal) {
  const cl = deal.checklist || {};
  const fieldDone = (f) => {
    if (f === 'paymentMethod') return !!deal.paymentMethod;
    if (f === 'overrides.returnMode') return !!deal.overrides?.returnMode;
    if (f === 'hasCoc') return deal.hasCoc === true || deal.hasCoc === false;
    return false;
  };
  return PROCESS.filter((p) => !p.when || p.when(deal)).map((p) => {
    const steps = p.steps.filter((s) => !s.when || s.when(deal)).map((s) => ({ ...s, done: s.field ? fieldDone(s.field) || !!cl[s.key] : !!cl[s.key] }));
    const done = steps.filter((s) => s.done).length;
    return { key: p.key, label: p.label, steps, done, total: steps.length };
  });
}

export function progressOf(deal) {
  const phases = processFor(deal);
  const total = phases.reduce((a, p) => a + p.total, 0);
  const done = phases.reduce((a, p) => a + p.done, 0);
  const current = phases.find((p) => p.done < p.total) || null;
  const next = current?.steps.find((s) => !s.done) || null;
  return { done, total, pct: total ? done / total : 0, phase: current, next };
}
