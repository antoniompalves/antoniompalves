import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDeal, scoreDeals, deadlinesFor, addBusinessDays, haversineKm, HOME_BASE } from '../app/assets/lib/costs.js';

const deal = { id: 'a', price: 19300, cc: 1968, co2: 119, co2Standard: 'NEDC', fuel: 'diesel', firstRegistration: '2019-12', km: 165000, country: 'FR', lat: 48.5734, lng: 7.7521, sellerType: 'pro', market: { comps: [{ price: 26000 }, { price: 30000 }] } };

test('analyzeDeal totals add up', () => {
  const a = analyzeDeal(deal, {}, new Date('2026-03-06'));
  const sum = a.groups.reduce((x, g) => x + g.items.reduce((y, i) => y + i.amount, 0), 0);
  assert.equal(a.importCosts, Math.round(sum));
  assert.equal(a.totalInvestment, Math.round(19300 + sum));
  assert.equal(a.market.avg, 28000);
  assert.equal(a.netProfit, Math.round(28000 - (19300 + sum)));
  assert.equal(a.groups.find((g) => g.key === 'legal').items.find((i) => i.key === 'isv').amount, 2830.86);
  assert.ok(a.km > 1700 && a.km < 2000, `route km ${a.km}`);
});

test('overrides win over defaults, truck mode drops trip costs', () => {
  const a = analyzeDeal({ ...deal, overrides: { isv: 1000, returnMode: 'truck', truck: 500, negotiatedPrice: 18000 } });
  assert.equal(a.price, 18000);
  assert.equal(a.groups.find((g) => g.key === 'trip').total, 0);
  assert.equal(a.groups.find((g) => g.key === 'return').total, 520); // 500 + 20 gratificação
  assert.equal(a.isv.total !== 1000, true);
  assert.equal(a.groups.find((g) => g.key === 'legal').items[0].amount, 1000);
});

test('no market price → no profit, warning', () => {
  const a = analyzeDeal({ ...deal, market: { comps: [] } });
  assert.equal(a.netProfit, null);
  assert.ok(a.warnings.some((w) => w.includes('mercado')));
});

test('scoring: best on every criterion scores 100%', () => {
  const best = { id: 'best', firstRegistration: '2022-01', km: 50000, price: 10000, quality: 1, country: 'ES' };
  const worse = { id: 'worse', firstRegistration: '2015-01', km: 200000, price: 20000, quality: 5, country: 'DE' };
  const [b, w] = scoreDeals([best, worse]);
  assert.equal(Math.round(b.score * 100), 100);
  assert.equal(Math.round(w.score * 100), 20);
});

test('legal deadlines', () => {
  assert.equal(addBusinessDays('2026-11-06', 1).toISOString().slice(0, 10), '2026-11-09'); // Fri → Mon
  const dl = deadlinesFor({ dates: { arrivedPT: '2026-11-02' }, checklist: {} });
  assert.equal(dl[0].key, 'dav');
  assert.equal(dl[0].due, '2026-11-30');
});

test('haversine sanity: Porto–Madrid ≈ 420 km', () => {
  const km = haversineKm(HOME_BASE, { lat: 40.4168, lng: -3.7038 });
  assert.ok(km > 400 && km < 440);
});

import { tradeInValuation, capitalPosition } from '../app/assets/lib/costs.js';
import { processFor, progressOf } from '../app/assets/lib/process.js';

test('profit split: 20% cash reserve, 80% between partners', () => {
  const a = analyzeDeal({ ...deal, market: { target: 40000 } }, { partners: ['A', 'B'] });
  const p = a.scenarios.medium;
  assert.equal(p.reserve, Math.round(p.profit * 0.2));
  assert.equal(p.perPartner, Math.round((p.profit - p.profit * 0.2) / 2));
});

test('COC requested from the brand when missing', () => {
  const coc = (d) => analyzeDeal(d).groups.find((g) => g.key === 'purchase').items.find((i) => i.key === 'coc').amount;
  assert.equal(coc({ ...deal, hasCoc: true }), 0);
  assert.equal(coc({ ...deal, make: 'Renault', hasCoc: false }), 200);
  assert.equal(coc({ ...deal, make: 'Peugeot', hasCoc: false }), 120);
});

test('trade-in: buy at reference −30%, resell at average −10%', () => {
  const t = tradeInValuation({ marketAvg: 10000, lowestSV: 9000 }, { partners: ['A', 'B'] });
  assert.deepEqual(t, { offer: 6300, resale: 9000, margin: 2700, perPartner: 3150 });
  assert.equal(tradeInValuation({ marketAvg: 10000, reconditioned: true }).resale, 10000);
});

test('domestic (PT) car has no import costs or ISV', () => {
  const a = analyzeDeal({ ...deal, country: 'PT' });
  assert.equal(a.isv.total, 0);
  assert.deepEqual(a.groups.map((g) => g.key), ['legal', 'recon', 'sale']);
});

test('process checklist follows transport and COC branches', () => {
  const keys = (d) => processFor(d).flatMap((p) => p.steps.map((s) => s.key));
  const r = keys({ ...deal, hasCoc: true });
  assert.ok(r.includes('flights') && !r.includes('t_pickup') && !r.includes('coc_request'));
  const t = keys({ ...deal, hasCoc: false, overrides: { returnMode: 'truck' } });
  assert.ok(t.includes('t_pickup') && !t.includes('flights') && t.includes('coc_request'));
  const pt = processFor({ country: 'PT' }).map((p) => p.key);
  assert.deepEqual(pt, ['prep', 'sale', 'finance']);
  const pr = progressOf({ ...deal, checklist: { capital: true } });
  assert.equal(pr.phase.key, 'acq');
  assert.equal(pr.next.key, 'payment');
});

test('capital position', () => {
  const c = capitalPosition([{ ...deal, status: 'bought' }], { capital: 30000 });
  assert.equal(c.available, 30000 - analyzeDeal(deal).totalInvestment);
});
