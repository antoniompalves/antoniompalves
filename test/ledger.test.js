import test from 'node:test';
import assert from 'node:assert/strict';
import { balances, settleTransfers, paidBy, expenseStatus, allExpenses, estimateVsReal, toCSV, CASH, SPLIT } from '../src/ledger.js';
import { analyzeDeal } from '../src/costs.js';

const P = ['António', 'Tono', 'Calado'];

test('who paid what, including split and business cash', () => {
  const rows = [
    { type: 'tolls', amount: 180, payer: 'Tono' },
    { type: 'fuel', amount: 320, payer: 'António' },
    { type: 'inspection', amount: 100, payer: SPLIT, shares: { António: 50, Calado: 50 } },
    { type: 'ads', amount: 30, payer: CASH },
  ];
  const b = balances(rows, P);
  assert.equal(b.total, 630);
  assert.equal(b.fromCash, 30);
  assert.equal(b.share, 200);
  assert.deepEqual(b.paid, { António: 370, Tono: 180, Calado: 50 });
  assert.deepEqual(b.balance, { António: 170, Tono: -20, Calado: -150 });
  const t = settleTransfers(b.balance);
  assert.deepEqual(t, [{ from: 'Calado', to: 'António', amount: 150 }, { from: 'Tono', to: 'António', amount: 20 }]);
  // after recording the settlements everyone is at zero
  const after = balances(rows, P, t);
  assert.deepEqual(Object.values(after.balance), [0, 0, 0]);
});

test('status ok/nok like the workbook', () => {
  assert.equal(expenseStatus({ amount: 100, payer: SPLIT, shares: { António: 60, Tono: 40 } }, P), 'ok');
  assert.equal(expenseStatus({ amount: 100, payer: SPLIT, shares: { António: 60 } }, P), 'nok');
  assert.equal(expenseStatus({ amount: 100 }, P), 'nok');
  assert.deepEqual(paidBy({ amount: 10, payer: 'Tono' }, P), { António: 0, Tono: 10, Calado: 0 });
});

test('real vs estimated per line', () => {
  const deal = { price: 8000, country: 'FR', cc: 1461, co2: 110, fuel: 'diesel', firstRegistration: '2017-05', market: { target: 12000 }, expenses: [{ type: 'car', amount: 7800 }, { type: 'tolls', amount: 120 }, { type: 'tolls', amount: 40 }, { type: 'meals', amount: 35 }] };
  const r = estimateVsReal(deal, analyzeDeal(deal));
  const tolls = r.lines.find((l) => l.key === 'tolls');
  assert.equal(tolls.real, 160);
  assert.equal(r.lines.find((l) => l.key === 'price').diff, -200);
  assert.equal(r.unmatched, 35);
  assert.equal(r.realTotal, 7995);
});

test('flatten + CSV', () => {
  const rows = allExpenses([{ id: 'x', title: 'Kadjar', expenses: [{ type: 'fuel', amount: 50.5, payer: 'Tono', date: '2026-03-06', note: 'A63' }] }], [{ type: 'other', label: 'carVertical pack', amount: 60, payer: CASH }]);
  assert.equal(rows.length, 2);
  const csv = toCSV(rows, P);
  assert.match(csv, /"2026-03-06";"Kadjar";"Combustível";"A63";"Transporte";"50,5";"Tono";"0";"50,5";"0"/);
  assert.match(csv, /"Geral";"Outra";"carVertical pack"/);
});
