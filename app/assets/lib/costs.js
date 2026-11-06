// Deal cost model — mirrors the 9 steps of the "Vroom.Pt" workbook:
// 1 targets · 2 PT market price · 3 scoring · 4 ISV · 5 trip out · 6 purchase · 7 drive back · 8 legalisation · 9 sale
import { computeISV, computeIUC, ageInMonths, vatApplies } from './tax.js';

export const HOME_BASE = { name: 'Porto', lat: 41.1579, lng: -8.6291 };

export const DEFAULT_SETTINGS = {
  homeBase: HOME_BASE,
  partners: ['António', 'Tono'],
  roadFactor: 1.25, // straight-line → road km
  fuelPrice: 1.75, // €/l
  consumption: { gasoline: 7, diesel: 5.8, hybrid: 5.5, phev: 6, lpg: 9, electric: 0 },
  kmPerDay: 900,
  nightCost: 55,
  countries: {
    FR: { name: 'França', flight: 120, localTransport: 40, defaultKm: 1500, tollPerKm: 0.075, tempPlates: 70, truck: 500 },
    ES: { name: 'Espanha', flight: 80, localTransport: 30, defaultKm: 700, tollPerKm: 0.03, tempPlates: 60, truck: 400 },
    DE: { name: 'Alemanha', flight: 140, localTransport: 40, defaultKm: 2200, tollPerKm: 0.065, tempPlates: 120, truck: 900 },
    NL: { name: 'Países Baixos', flight: 140, localTransport: 40, defaultKm: 2000, tollPerKm: 0.06, tempPlates: 90, truck: 850 },
    BE: { name: 'Bélgica', flight: 120, localTransport: 40, defaultKm: 1800, tollPerKm: 0.065, tempPlates: 80, truck: 800 },
    PT: { name: 'Portugal (retoma / nacional)', flight: 0, localTransport: 0, defaultKm: 0, tollPerKm: 0, tempPlates: 0, truck: 0 },
  },
  transport: { roadExtras: 50, truckTip: 20 },
  // COC requested from the brand when the car comes without one (Esquema de Execução: Renault ±200 €, Stellantis ±120 €)
  cocByBrand: { renault: 200, dacia: 200, peugeot: 120, citroen: 120, ds: 120, opel: 120, fiat: 120, jeep: 120, 'alfa romeo': 120, default: 200 },
  purchase: { tempInsurance: 106.3, historyCheck: 25 },
  legal: { homologation: 0, inspection: 100, imt: 45, plates: 15, registration: 55, agency: 0, transfer: 55 },
  recon: { mechanic: 150, bodywork: 100, parts: 50, extras: 0 },
  sale: { ads: 0, warranty: 0 },
  // Lucros: 20% do lucro fica na caixa, 80% é dividido pelos sócios
  cashReservePct: 0.2,
  capital: 8000,
  // Retomas: avaliação = referência (valor mais baixo StandVirtual, ou média) −30%; revenda = média −10% (ou média se recondicionado)
  tradeIn: { buyDiscount: 0.3, resaleDiscount: 0.1 },
  acquisition: { budgetMin: 4000, budgetMax: 8000, zone: 'Toulouse' },
  suppliers: {
    mechanic: 'Pedro Duarte (bom e barato)',
    bodywork: 'Couto (50 €/peça), Miguel Detalhe',
    parts: 'Car Mechanic, Sucata LJMEJ, OLX, HumberPeças, Centrauto',
    extras: 'Antonios (peças de substituição fácil, upgrades, detalhe), Pedro das Chaves, ExpressGlass',
  },
  // Step 1 — targets that keep ISV low
  targets: { minAgeYears: 5, maxAgeYears: 15, maxCc: 2000, maxCo2: 150, fuels: ['gasoline', 'diesel', 'hybrid', 'phev', 'electric'] },
  // Step 3 — weights for picking the main choice
  weights: { age: 0.05, location: 0.05, quality: 0.35, km: 0.2, price: 0.35 },
  minProfit: 1500,
};

export function mergeSettings(s = {}) {
  const d = structuredClone(DEFAULT_SETTINGS);
  const deep = (a, b) => {
    for (const [k, v] of Object.entries(b || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') deep(a[k], v);
      else a[k] = v;
    }
    return a;
  };
  return deep(d, s);
}

export function haversineKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function routeKm(deal, settings) {
  if (deal.overrides?.routeKm) return Number(deal.overrides.routeKm);
  const c = settings.countries[deal.country] || settings.countries.FR;
  if (deal.lat != null && deal.lng != null) return Math.round(haversineKm(settings.homeBase, deal) * settings.roadFactor);
  return c.defaultKm;
}

export function marketStats(market = {}) {
  const prices = (market.comps || []).map((c) => Number(c.price)).filter((n) => n > 0);
  const low = Number(market.low) || (prices.length ? Math.min(...prices) : null);
  const high = Number(market.high) || (prices.length ? Math.max(...prices) : null);
  const avg = Number(market.target) || (low && high ? (low + high) / 2 : low || high || null);
  return { low, high, avg, count: prices.length };
}

const num = (v, d = 0) => (v === '' || v == null || Number.isNaN(Number(v)) ? d : Number(v));

/** Full cost & profit breakdown for one deal. */
export function analyzeDeal(deal, settingsIn = {}, at = new Date()) {
  const s = mergeSettings(settingsIn);
  const o = deal.overrides || {};
  const c = s.countries[deal.country] || s.countries.FR;
  const km = routeKm(deal, s);
  const mode = o.returnMode || 'drive';
  const pick = (key, def) => num(o[key], def);

  const isvRaw = computeISV({ cc: deal.cc, co2: deal.co2, fuel: deal.fuel, standard: deal.co2Standard, firstRegistration: deal.firstRegistration || deal.year, dieselParticles: !!deal.dieselParticles, hybridBase: deal.hybridBase, at });
  const isv = deal.country === 'PT' ? { ...isvRaw, total: 0, cc: 0, co2: 0, notes: [] } : isvRaw;
  const iuc = computeIUC({ cc: deal.cc, co2: deal.co2, fuel: deal.fuel, standard: deal.co2Standard, firstRegistration: deal.firstRegistration || deal.year, hybridBase: deal.hybridBase });

  const consumption = s.consumption[deal.fuel] ?? s.consumption.gasoline;
  const days = Math.max(1, Math.ceil(km / s.kmPerDay));
  const domestic = deal.country === 'PT';
  const brand = String(deal.make || '').toLowerCase();
  const cocAmount = deal.hasCoc === false ? (s.cocByBrand[brand] ?? s.cocByBrand.default) : 0;
  const R = (key, label, amount) => ({ key, label, amount: pick(key, amount) });
  const groups = domestic ? [
    { key: 'legal', label: 'Legal (carro nacional)', items: [R('transfer', 'Transferência de propriedade / registo', s.legal.transfer)] },
  ] : [
    { key: 'trip', label: 'Ida', items: mode === 'truck' ? [] : [
      R('flight', 'Voos', c.flight),
      R('localTransport', 'Deslocações locais', c.localTransport),
    ] },
    { key: 'purchase', label: 'Compra', items: [
      ...(mode === 'truck' ? [] : [R('tempInsurance', 'Seguro temporário', s.purchase.tempInsurance), R('tempPlates', 'Matrícula temporária (exportação)', c.tempPlates)]),
      R('coc', deal.hasCoc === false ? `COC pedido à marca${deal.make ? ` (${deal.make})` : ''}` : 'COC (incluído pelo vendedor?)', cocAmount),
      R('historyCheck', 'Relatório de histórico (carVertical)', s.purchase.historyCheck),
    ] },
    { key: 'return', label: `Transporte para Portugal · ${km} km`, items: mode === 'truck'
      ? [R('truck', 'Transportadora (serviço)', c.truck), R('truckTip', 'Gratificação', s.transport.truckTip)]
      : [
        R('fuel', `Combustível (${consumption} l/100 km)`, Math.round(km * consumption / 100 * s.fuelPrice)),
        R('tolls', 'Portagens', Math.round(km * c.tollPerKm)),
        R('roadExtras', 'Extras de viagem', s.transport.roadExtras),
        R('nights', `Dormidas (${days - 1})`, (days - 1) * s.nightCost),
      ] },
    { key: 'legal', label: 'Legalização', items: [
      R('isv', 'ISV', isv.total),
      R('inspection', 'Inspeção IPO B', s.legal.inspection),
      R('homologation', 'Homologação nacional', s.legal.homologation),
      R('imt', 'IMT (documentos)', s.legal.imt),
      R('plates', 'Matrículas (impressão)', s.legal.plates),
      R('registration', 'Registo inicial (Conservatória)', s.legal.registration),
      R('agency', 'Serviço de agência', s.legal.agency),
      R('iuc', 'IUC (1.º ano)', iuc.total ?? 0),
    ] },
  ];
  groups.push(
    { key: 'recon', label: 'Preparação', items: [
      R('mechanic', 'Mecânica', s.recon.mechanic),
      R('bodywork', 'Chapa e pintura', s.recon.bodywork),
      R('parts', 'Peças', s.recon.parts),
      R('extras', 'Extras', s.recon.extras),
    ] },
    { key: 'sale', label: 'Venda', items: [
      R('ads', 'Anúncios / marketing', s.sale.ads),
      R('warranty', 'Garantia (SNG / GR3)', s.sale.warranty),
      R('other', 'Outros', 0),
    ] },
  );
  const vat = vatApplies({ km: deal.km, firstRegistration: deal.firstRegistration || deal.year, at });
  for (const g of groups) g.total = g.items.reduce((a, i) => a + i.amount, 0);
  const price = num(o.negotiatedPrice, num(deal.price));
  const importCosts = groups.reduce((a, g) => a + g.total, 0);
  const totalInvestment = price + importCosts;
  const m = marketStats(deal.market);
  const otherIncome = num(deal.otherIncome); // vendas de material, comissões de crédito, garantias…
  const split = (profit) => {
    const reserve = profit > 0 ? profit * s.cashReservePct : 0;
    return { reserve: Math.round(reserve), perPartner: Math.round((profit - reserve) / Math.max(1, s.partners.length)) };
  };
  const scen = (sale) => {
    if (!sale) return null;
    const profit = Math.round(sale + otherIncome - totalInvestment);
    return { sale, profit, margin: profit / totalInvestment, ...split(profit) };
  };
  const scenarios = { conservative: scen(m.low), medium: scen(m.avg), high: scen(m.high) };
  const realised = deal.salePrice ? scen(num(deal.salePrice)) : null;
  const t = s.targets;
  const months = ageInMonths(deal.firstRegistration || deal.year, at);
  const checks = [
    { key: 'age', label: `Idade ${t.minAgeYears}–${t.maxAgeYears} anos`, ok: months != null && months >= t.minAgeYears * 12 && months <= t.maxAgeYears * 12 },
    { key: 'cc', label: `< ${t.maxCc} cm³`, ok: !!deal.cc && deal.cc < t.maxCc || deal.fuel === 'electric' },
    { key: 'co2', label: `< ${t.maxCo2} g/km CO2`, ok: (!!deal.co2 && deal.co2 < t.maxCo2) || deal.fuel === 'electric' },
    { key: 'pro', label: 'Vendedor profissional', ok: deal.sellerType === 'pro' },
  ];
  const warnings = [...isv.notes];
  if (vat) warnings.push('≤ 6 meses ou ≤ 6000 km: é considerado "meio de transporte novo" — paga IVA em Portugal (23%)');
  if (!m.avg) warnings.push('Ainda sem preço de mercado em Portugal — adicione comparáveis do StandVirtual');
  if (deal.sellerType && deal.sellerType !== 'pro') warnings.push('Vendedor particular — a folha de cálculo recomenda comprar apenas a profissionais');
  return {
    price, km, mode, isv, iuc, groups, importCosts: Math.round(importCosts), totalInvestment: Math.round(totalInvestment),
    market: m, scenarios, netProfit: scenarios.medium?.profit ?? null, margin: scenarios.medium?.margin ?? null,
    otherIncome, realised, checks, fitsTargets: checks.slice(0, 3).every((x) => x.ok), vat, warnings,
  };
}

/** Step 3: rank 1 (best) … 5 (worst) per criterion across a set, score = Σ weight / rank (100% = best in everything). */
export function scoreDeals(deals, settingsIn = {}) {
  const s = mergeSettings(settingsIn);
  const w = s.weights;
  const metric = {
    age: (d) => ageInMonths(d.firstRegistration || d.year) ?? 999, // older = worse
    location: (d) => routeKm(d, s),
    km: (d) => num(d.km, 1e7),
    price: (d) => num(d.overrides?.negotiatedPrice, num(d.price, 1e9)),
  };
  const rankOf = (vals, v) => {
    const min = Math.min(...vals), max = Math.max(...vals);
    if (max === min) return 1;
    return 1 + Math.round(((v - min) / (max - min)) * 4);
  };
  const cols = Object.fromEntries(Object.entries(metric).map(([k, f]) => [k, deals.map(f)]));
  return deals.map((d, i) => {
    const ranks = {
      age: rankOf(cols.age, cols.age[i]),
      location: rankOf(cols.location, cols.location[i]),
      quality: Math.min(5, Math.max(1, num(d.quality, 3))),
      km: rankOf(cols.km, cols.km[i]),
      price: rankOf(cols.price, cols.price[i]),
    };
    const score = Object.entries(w).reduce((a, [k, wt]) => a + wt / ranks[k], 0);
    return { id: d.id, ranks, score };
  });
}

/** Retomas (trade-ins), per the Esquema de Execução. */
export function tradeInValuation(t = {}, settingsIn = {}) {
  const s = mergeSettings(settingsIn);
  const avg = num(t.marketAvg) || null;
  const ref = num(t.lowestSV) || avg;
  if (!ref) return null;
  const offer = Math.round(ref * (1 - s.tradeIn.buyDiscount));
  const resale = avg ? Math.round(t.reconditioned ? avg : avg * (1 - s.tradeIn.resaleDiscount)) : null;
  return { offer, resale, margin: resale != null ? resale - offer : null, perPartner: Math.round(offer / Math.max(1, s.partners.length)) };
}

/** Capital available = starting capital + cash reserve from sold cars − money tied up in cars not yet sold. */
export function capitalPosition(deals, settingsIn = {}) {
  const s = mergeSettings(settingsIn);
  const tied = ['reserved', 'bought', 'transit', 'legalising', 'for_sale'];
  let reserve = 0, invested = 0;
  for (const d of deals) {
    const a = analyzeDeal(d, s);
    if (d.status === 'sold' && a.realised) reserve += a.realised.reserve;
    if (tied.includes(d.status)) invested += a.totalInvestment;
  }
  return { capital: s.capital, reserve, invested, available: s.capital + reserve - invested };
}

// Step 8 deadlines (from the workbook)
export const LEGAL_DEADLINES = [
  { key: 'dav', label: 'Submeter a DAV', from: 'arrivedPT', businessDays: 20 },
  { key: 'tax', label: 'Pagar o ISV (após a DAV)', from: 'davDate', businessDays: 10 },
  { key: 'dua', label: 'Pedir o DUA (Modelo 9 no IMT)', from: 'plateDate', days: 30 },
  { key: 'reg', label: 'Registo inicial', from: 'plateDate', days: 60 },
];

export function addBusinessDays(date, n) {
  const d = new Date(date);
  while (n > 0) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) n--; }
  return d;
}

export function deadlinesFor(deal) {
  const out = [];
  for (const dl of LEGAL_DEADLINES) {
    const base = deal.dates?.[dl.from];
    if (!base) continue;
    const due = dl.businessDays ? addBusinessDays(base, dl.businessDays) : new Date(new Date(base).getTime() + dl.days * 864e5);
    out.push({ ...dl, due: due.toISOString().slice(0, 10), done: !!deal.checklist?.[dl.key] });
  }
  return out;
}
