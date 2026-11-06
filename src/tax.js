// Portuguese vehicle taxes (ISV + IUC) for passenger cars — 2026 tables.
// Source: Código do ISV / OE 2026 (rates unchanged from 2024–2025), summarised at
// https://impostosobreveiculos.info/isv/imposto-sobre-veiculos-isv-2026/
// Always confirm the final value in the DAV on the Portal Aduaneiro.

const round2 = (n) => Math.round(n * 100 + 1e-6) / 100; // bias so 221.375 → 221.38 like the official simulators

// [upper bound inclusive, rate per unit, amount to subtract]
export const ISV_CC = [
  [1000, 1.09, 849.03],
  [1250, 1.18, 850.69],
  [Infinity, 5.61, 6194.88],
];

export const ISV_CO2 = {
  gasoline: {
    NEDC: [[99, 4.62, 427.0], [115, 8.09, 750.99], [145, 52.56, 5903.94], [175, 61.24, 7140.17], [195, 155.97, 23627.27], [Infinity, 205.65, 33390.12]],
    WLTP: [[110, 0.44, 43.02], [115, 1.1, 115.8], [120, 1.38, 147.79], [130, 5.27, 619.17], [145, 6.38, 762.73], [175, 41.54, 5819.56], [195, 51.38, 7247.39], [235, 193.01, 34190.52], [Infinity, 233.81, 41910.96]],
  },
  diesel: {
    NEDC: [[79, 5.78, 439.04], [95, 23.45, 1848.58], [120, 79.22, 7195.63], [140, 175.73, 18924.92], [160, 195.43, 21720.92], [Infinity, 268.42, 33447.9]],
    WLTP: [[110, 1.72, 11.5], [120, 18.96, 1906.19], [140, 65.04, 7360.85], [150, 127.4, 16080.57], [160, 160.81, 21176.06], [170, 221.69, 29227.38], [190, 274.08, 36987.98], [Infinity, 282.35, 38271.32]],
  },
};

// Discount for used cars first registered in another EU/EEA country, by age.
// [max age in months (inclusive), discount]
export const ISV_AGE_DISCOUNT = [
  [12, 0.1], [24, 0.2], [36, 0.28], [48, 0.35], [60, 0.43], [72, 0.52],
  [84, 0.6], [96, 0.65], [108, 0.7], [120, 0.75], [Infinity, 0.8],
];

// Share of ISV paid for special fuel types (conditions: >=50 km electric range, CO2 < 50 g/km).
export const ISV_FUEL_FACTOR = { hybrid: 0.6, phev: 0.25, cng: 0.4 };
export const DIESEL_PARTICLE_SURCHARGE = 500;

function bracket(table, value) {
  for (const [max, rate, minus] of table) if (value <= max) return Math.max(0, value * rate - minus);
  return 0;
}

/** Whole months between first registration ("YYYY-MM" or "YYYY-MM-DD" or year number) and a date. */
export function ageInMonths(firstRegistration, at = new Date()) {
  if (firstRegistration == null || firstRegistration === '') return null;
  let y, m, d = 1;
  if (typeof firstRegistration === 'number') { y = firstRegistration; m = 7; }
  else {
    const parts = String(firstRegistration).split(/[-/]/).map(Number);
    if (parts[0] > 1900) [y, m = 7, d = 1] = parts;
    else if (parts.length >= 2 && parts[parts.length - 1] > 1900) { // MM/YYYY or DD/MM/YYYY
      y = parts[parts.length - 1]; m = parts[parts.length - 2]; d = parts.length > 2 ? parts[0] : 1;
    } else return null;
  }
  const at2 = at instanceof Date ? at : new Date(at);
  let months = (at2.getFullYear() - y) * 12 + (at2.getMonth() + 1 - m);
  if (at2.getDate() < d) months -= 1;
  return Math.max(0, months);
}

export function ageDiscount(months) {
  if (months == null) return 0;
  // "Até 1 ano" = up to 12 months, "mais de 1 a 2" = 13..24 months, etc.
  for (const [max, disc] of ISV_AGE_DISCOUNT) if (months <= max) return disc;
  return 0.8;
}

/** Guess homologation standard when unknown: <=2018 NEDC, >=2019 WLTP. */
export function guessStandard(firstRegistration) {
  const y = typeof firstRegistration === 'number' ? firstRegistration : parseInt(String(firstRegistration || '').match(/(19|20)\d{2}/)?.[0], 10);
  if (!y) return 'WLTP';
  return y <= 2018 ? 'NEDC' : 'WLTP';
}

/**
 * ISV for a used passenger car imported from the EU.
 * @param {object} p
 * @param {number} p.cc engine displacement (cm3)
 * @param {number} p.co2 g/km
 * @param {'gasoline'|'diesel'|'hybrid'|'phev'|'electric'|'lpg'|'cng'} p.fuel
 * @param {'NEDC'|'WLTP'} [p.standard]
 * @param {string|number} p.firstRegistration
 * @param {boolean} [p.dieselParticles] true if particles >= 0.001 g/km or unknown (adds 500€). Default false (DPF assumed).
 * @param {boolean} [p.hybridBase] for hybrids/PHEV: underlying engine fuel ('gasoline'|'diesel'); default gasoline
 * @param {Date} [p.at] date of the DAV
 * @param {boolean} [p.eu] first registered in EU/EEA (age discount applies). Default true.
 */
export function computeISV(p) {
  const fuel = p.fuel || 'gasoline';
  if (fuel === 'electric') return { total: 0, cc: 0, co2: 0, discount: 0, months: ageInMonths(p.firstRegistration, p.at), notes: ['100% elétrico: isento de ISV'] };
  const notes = [];
  const standard = p.standard || guessStandard(p.firstRegistration);
  if (!p.standard) notes.push(`Norma de CO2 assumida: ${standard} — confirme no COC`);
  const baseFuel = fuel === 'diesel' || (['hybrid', 'phev'].includes(fuel) && p.hybridBase === 'diesel') ? 'diesel' : 'gasoline';
  const cc = Number(p.cc) || 0;
  const co2 = Number(p.co2) || 0;
  if (!cc) notes.push('Falta a cilindrada');
  if (!co2) notes.push('Faltam as emissões de CO2');
  const ccPart = bracket(ISV_CC, cc);
  const co2Part = bracket(ISV_CO2[baseFuel][standard], co2);
  const months = ageInMonths(p.firstRegistration, p.at);
  const discount = p.eu === false ? 0 : ageDiscount(months);
  let factor = 1;
  if (fuel === 'cng') factor = ISV_FUEL_FACTOR.cng;
  else if (ISV_FUEL_FACTOR[fuel]) {
    // Reduced rate only for hybrids with CO2 < 50 g/km and ≥ 50 km electric range (in practice: plug-ins).
    if (co2 > 0 && co2 < 50 && p.electricRangeOk !== false) {
      factor = ISV_FUEL_FACTOR[fuel];
      notes.push(`Taxa ${fuel === 'phev' ? 'híbrido plug-in' : 'híbrido'} ${factor * 100}% — confirme autonomia elétrica ≥ 50 km no COC`);
    } else notes.push('Híbrido com CO2 ≥ 50 g/km: sem desconto de híbrido, paga ISV completo');
  }
  let total = (ccPart + co2Part) * (1 - discount) * factor;
  const particles = baseFuel === 'diesel' && !!p.dieselParticles;
  if (particles) total += DIESEL_PARTICLE_SURCHARGE;
  return { total: round2(total), cc: round2(ccPart), co2: round2(co2Part), discount, months, standard, factor, particles, notes };
}

// ---- IUC (annual circulation tax), category B (first registration EU from July 2007) ----
export const IUC_CC = [[1250, 31.77], [1750, 63.74], [2500, 127.35], [Infinity, 435.84]];
// [NEDC max, WLTP max, rate, additional rate (registrations from 2017)]
export const IUC_CO2 = [[120, 140, 65.15, 0], [180, 205, 97.63, 0], [250, 260, 212.04, 31.77], [Infinity, Infinity, 363.25, 63.74]];
export const IUC_DIESEL = [[1250, 5.02], [1750, 10.07], [2500, 20.12], [Infinity, 68.85]];

export function computeIUC(p) {
  if (p.fuel === 'electric') return { total: 0, notes: ['Elétrico: isento de IUC'] };
  const year = typeof p.firstRegistration === 'number' ? p.firstRegistration : parseInt(String(p.firstRegistration || '').match(/(19|20)\d{2}/)?.[0], 10);
  if (!year || year < 2008) return { total: null, notes: ['Matrícula anterior a julho de 2007 (categoria A) — use o simulador do IUC'] };
  const standard = p.standard || guessStandard(p.firstRegistration);
  const cc = Number(p.cc) || 0, co2 = Number(p.co2) || 0;
  const ccRate = IUC_CC.find(([max]) => cc <= max)[1];
  const row = IUC_CO2.find(([n, w]) => co2 <= (standard === 'NEDC' ? n : w));
  const co2Rate = row[2] + (year >= 2017 ? row[3] : 0);
  const coef = year >= 2010 ? 1.15 : year === 2009 ? 1.1 : year === 2008 ? 1.05 : 1;
  const base = ['hybrid', 'phev'].includes(p.fuel) && p.hybridBase === 'diesel' ? 'diesel' : p.fuel;
  const dieselExtra = base === 'diesel' ? IUC_DIESEL.find(([max]) => cc <= max)[1] : 0;
  return { total: round2((ccRate + co2Rate) * coef + dieselExtra), notes: [] };
}

/** VAT warning: intra-EU purchase of a "new means of transport" (<=6 months or <=6000 km) pays PT VAT. */
export function vatApplies({ km, firstRegistration, at }) {
  const m = ageInMonths(firstRegistration, at);
  return (km != null && km <= 6000) || (m != null && m <= 6);
}
