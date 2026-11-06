// Expense control: who paid what, real vs. estimated, balances between partners and settlement transfers.
// Shared by the server tests and the browser.

// type → [label, phase category, estimate line key in analyzeDeal (or 'price' for the car itself)]
export const EXPENSE_TYPES = {
  car: ['Carro (pagamento ao vendedor)', 'purchase', 'price'],
  deposit: ['Sinal / reserva', 'purchase', null],
  flight: ['Voos', 'trip', 'flight'],
  localTransport: ['Deslocações (táxi, comboio, Uber)', 'trip', 'localTransport'],
  lodging: ['Estadia', 'trip', 'nights'],
  meals: ['Refeições', 'trip', null],
  tempInsurance: ['Seguro temporário', 'purchase', 'tempInsurance'],
  tempPlates: ['Matrícula temporária', 'purchase', 'tempPlates'],
  coc: ['COC', 'purchase', 'coc'],
  historyCheck: ['Relatório de histórico (carVertical)', 'purchase', 'historyCheck'],
  fuel: ['Combustível', 'return', 'fuel'],
  tolls: ['Portagens', 'return', 'tolls'],
  roadExtras: ['Extras de viagem', 'return', 'roadExtras'],
  truck: ['Transportadora', 'return', 'truck'],
  truckTip: ['Gratificação transportadora', 'return', 'truckTip'],
  isv: ['ISV', 'legal', 'isv'],
  inspection: ['Inspeção IPO', 'legal', 'inspection'],
  homologation: ['Homologação', 'legal', 'homologation'],
  imt: ['IMT', 'legal', 'imt'],
  plates: ['Matrículas (chapas)', 'legal', 'plates'],
  registration: ['Registo (Conservatória)', 'legal', 'registration'],
  agency: ['Agência', 'legal', 'agency'],
  iuc: ['IUC', 'legal', 'iuc'],
  insurance: ['Seguro definitivo', 'legal', null],
  mechanic: ['Mecânico', 'recon', 'mechanic'],
  bodywork: ['Chapa e pintura', 'recon', 'bodywork'],
  parts: ['Peças', 'recon', 'parts'],
  extras: ['Extras (detalhe, chaves, vidros…)', 'recon', 'extras'],
  ads: ['Anúncios / marketing', 'sale', 'ads'],
  warranty: ['Garantia', 'sale', 'warranty'],
  transfer: ['Transferência de propriedade', 'legal', 'transfer'],
  other: ['Outra', 'other', null],
};
export const CATEGORY_LABELS = { trip: 'Ida', purchase: 'Compra', return: 'Transporte', legal: 'Legalização', recon: 'Preparação', sale: 'Venda', other: 'Outros' };
export const CASH = 'Caixa'; // paid with the business cash, not by a partner
export const SPLIT = 'Vários';

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r2 = (v) => Math.round(v * 100) / 100;

export function expenseType(e) { return EXPENSE_TYPES[e.type] ? e.type : 'other'; }
export function expenseLabel(e) { return e.label || EXPENSE_TYPES[expenseType(e)][0]; }
export function expenseCategory(e) { return e.type && EXPENSE_TYPES[e.type] ? EXPENSE_TYPES[e.type][1] : e.cat || 'other'; }

/** How much each partner paid of one expense. */
export function paidBy(e, partners) {
  const out = Object.fromEntries(partners.map((p) => [p, 0]));
  if (e.payer === SPLIT) for (const p of partners) out[p] = n(e.shares?.[p]);
  else if (e.payer in out) out[e.payer] = n(e.amount);
  return out;
}

/** ok when the people listed add up to the amount (the workbook's "Status ok/nok"). */
export function expenseStatus(e, partners) {
  if (e.payer === CASH) return 'ok';
  if (!e.payer) return 'nok';
  const sum = Object.values(paidBy(e, partners)).reduce((a, b) => a + b, 0);
  return Math.abs(sum - n(e.amount)) < 0.005 ? 'ok' : 'nok';
}

/** Flatten every expense (per car + general) with its context. */
export function allExpenses(deals, general = []) {
  const rows = [];
  for (const d of deals) for (const [i, e] of (d.expenses || []).entries()) rows.push({ ...e, dealId: d.id, index: i, car: d.title || [d.make, d.model].filter(Boolean).join(' ') || 'Carro' });
  for (const [i, e] of general.entries()) rows.push({ ...e, dealId: null, index: i, car: 'Geral' });
  return rows;
}

/**
 * Balances between partners. Costs are shared equally (as in the workbook, "valor a cada /n");
 * money paid from the business cash counts for nobody. Settlements (A paid B) move the balance.
 * balance > 0 → the partner should receive; < 0 → owes.
 */
export function balances(rows, partners, settlements = []) {
  const paid = Object.fromEntries(partners.map((p) => [p, 0]));
  let total = 0, fromCash = 0;
  for (const e of rows) {
    total += n(e.amount);
    if (e.payer === CASH) fromCash += n(e.amount);
    for (const [p, v] of Object.entries(paidBy(e, partners))) paid[p] += v;
  }
  const partnerTotal = total - fromCash;
  const share = partners.length ? partnerTotal / partners.length : 0;
  const balance = Object.fromEntries(partners.map((p) => [p, paid[p] - share]));
  for (const s of settlements) {
    if (s.from in balance) balance[s.from] += n(s.amount);
    if (s.to in balance) balance[s.to] -= n(s.amount);
  }
  for (const p of partners) balance[p] = r2(balance[p]);
  return { total: r2(total), fromCash: r2(fromCash), share: r2(share), paid, balance };
}

/** Fewest transfers to bring everyone to zero (greedy). */
export function settleTransfers(balance) {
  const pos = Object.entries(balance).filter(([, v]) => v > 0.005).map(([p, v]) => [p, v]).sort((a, b) => b[1] - a[1]);
  const neg = Object.entries(balance).filter(([, v]) => v < -0.005).map(([p, v]) => [p, -v]).sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0, j = 0;
  while (i < neg.length && j < pos.length) {
    const amt = Math.min(neg[i][1], pos[j][1]);
    out.push({ from: neg[i][0], to: pos[j][0], amount: r2(amt) });
    neg[i][1] -= amt; pos[j][1] -= amt;
    if (neg[i][1] < 0.005) i++;
    if (pos[j][1] < 0.005) j++;
  }
  return out;
}

/** Real vs. estimated, per estimate line, for one car. */
export function estimateVsReal(deal, analysis) {
  const est = { price: analysis.price };
  const labels = { price: 'Carro' };
  for (const g of analysis.groups) for (const it of g.items) { est[it.key] = it.amount; labels[it.key] = it.label; }
  const real = {};
  let unmatched = 0;
  for (const e of deal.expenses || []) {
    const key = EXPENSE_TYPES[e.type]?.[2];
    if (key && key in est) real[key] = (real[key] || 0) + n(e.amount);
    else unmatched += n(e.amount);
  }
  const lines = Object.keys(est).filter((k) => est[k] || real[k]).map((k) => ({ key: k, label: labels[k], estimate: r2(est[k] || 0), real: real[k] != null ? r2(real[k]) : null, diff: real[k] != null ? r2(real[k] - (est[k] || 0)) : null }));
  const realTotal = (deal.expenses || []).reduce((a, e) => a + n(e.amount), 0);
  return { lines, unmatched: r2(unmatched), realTotal: r2(realTotal), estimateTotal: analysis.totalInvestment };
}

export function toCSV(rows, partners) {
  const head = ['Data', 'Carro', 'Tipo', 'Descrição', 'Categoria', 'Montante', 'Quem pagou', ...partners, 'Forma de pagamento', 'Estado'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const fmt = (v) => String(r2(n(v))).replace('.', ',');
  const lines = rows.map((e) => {
    const pb = paidBy(e, partners);
    return [e.date || '', e.car, EXPENSE_TYPES[expenseType(e)][0], e.note || e.label || '', CATEGORY_LABELS[expenseCategory(e)] || '', fmt(e.amount), e.payer || '', ...partners.map((p) => fmt(pb[p])), e.method || '', expenseStatus(e, partners)].map(q).join(';');
  });
  return '﻿' + [head.map(q).join(';'), ...lines].join('\r\n');
}
