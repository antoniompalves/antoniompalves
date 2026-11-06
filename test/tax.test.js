import test from 'node:test';
import assert from 'node:assert/strict';
import { computeISV, computeIUC, ageInMonths, ageDiscount, vatApplies } from '../src/tax.js';

test('ISV matches the workbook simulation (1968 cm3, 119 g/km NEDC diesel, 6-7 years)', () => {
  const r = computeISV({ cc: 1968, co2: 119, fuel: 'diesel', standard: 'NEDC', firstRegistration: '2019-12', at: new Date('2026-03-06') });
  assert.equal(r.discount, 0.6);
  assert.equal(r.total, 2830.86);
});

test('ISV examples from the 2026 tables', () => {
  // 998 cm3 → 238.79 ; 125 g/km WLTP gasoline → 39.58 ; new car (no discount) via eu:false
  const r = computeISV({ cc: 998, co2: 125, fuel: 'gasoline', standard: 'WLTP', firstRegistration: '2025-01', eu: false });
  assert.equal(r.cc, 238.79);
  assert.equal(r.co2, 39.58);
  assert.equal(r.total, 278.37);
});

test('diesel particle surcharge, electric exemption and PHEV rate', () => {
  const base = { cc: 1500, co2: 110, fuel: 'diesel', standard: 'WLTP', firstRegistration: '2016-01', at: new Date('2026-11-01') };
  assert.equal(Math.round(computeISV({ ...base, dieselParticles: true }).total - computeISV(base).total), 500);
  assert.equal(computeISV({ ...base, fuel: 'electric' }).total, 0);
  const phev = { ...base, co2: 35 };
  const full = computeISV({ ...phev, fuel: 'gasoline' }).total;
  assert.ok(Math.abs(computeISV({ ...phev, fuel: 'phev' }).total - full * 0.25) < 0.02);
  // conventional hybrid (CO2 ≥ 50) pays full rate
  assert.equal(computeISV({ ...base, fuel: 'hybrid' }).total, computeISV({ ...base, fuel: 'gasoline' }).total);
});

test('age brackets', () => {
  assert.equal(ageInMonths('2020-03', new Date('2026-03-01')), 72);
  assert.equal(ageInMonths('03/2020', new Date('2026-03-01')), 72);
  assert.equal(ageDiscount(12), 0.1);
  assert.equal(ageDiscount(13), 0.2);
  assert.equal(ageDiscount(72), 0.52);
  assert.equal(ageDiscount(73), 0.6);
  assert.equal(ageDiscount(200), 0.8);
});

test('IUC matches the workbook (241.50 €)', () => {
  assert.equal(computeIUC({ cc: 1968, co2: 119, fuel: 'diesel', standard: 'NEDC', firstRegistration: '2019-12' }).total, 241.5);
  assert.equal(computeIUC({ cc: 1968, co2: 119, fuel: 'electric', firstRegistration: 2019 }).total, 0);
});

test('VAT warning for nearly new cars', () => {
  assert.equal(vatApplies({ km: 4000, firstRegistration: '2020-01' }), true);
  assert.equal(vatApplies({ km: 90000, firstRegistration: '2018-01' }), false);
});
