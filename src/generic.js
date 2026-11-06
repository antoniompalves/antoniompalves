// Generic parser for other portals (AutoScout24, mobile.de, coches.net, Marktplaats, La Centrale…)
// using schema.org JSON-LD that most car portals embed for SEO.
import { normFuel, parseSpecsFromText } from './leboncoin.js';

const COUNTRY_BY_HOST = [[/\.fr$/, 'FR'], [/\.es$/, 'ES'], [/\.de$/, 'DE'], [/\.nl$/, 'NL'], [/\.be$/, 'BE'], [/\.pt$/, 'PT']];

function ldBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) { try { out.push(JSON.parse(m[1].trim())); } catch { /* ignore */ } }
  return out.flatMap((b) => (Array.isArray(b) ? b : b['@graph'] || [b]));
}

const qv = (x) => (x && typeof x === 'object' ? x.value ?? x['@value'] : x);

export function parseJsonLdCars(html, url = '') {
  const nodes = ldBlocks(String(html));
  const cars = nodes.filter((n) => /car|vehicle|product|offer/i.test([].concat(n['@type']).join(' ')) && (n.offers || n.price || n.mileageFromOdometer));
  let host = '';
  try { host = new URL(url).hostname; } catch { /* */ }
  const country = COUNTRY_BY_HOST.find(([re]) => re.test(host))?.[1] || null;
  return cars.map((n) => {
    const offer = [].concat(n.offers || [])[0] || n;
    const text = `${n.name || ''}\n${n.description || ''}`;
    const specs = parseSpecsFromText(text);
    const reg = n.dateVehicleFirstRegistered || n.productionDate || n.modelDate || n.vehicleModelDate;
    const year = parseInt(String(reg || '').match(/(19|20)\d{2}/)?.[0], 10) || null;
    const engine = [].concat(n.vehicleEngine || [])[0] || {};
    const co2 = Number(String(qv(n.emissionsCO2) || '').replace(/[^\d.]/g, '')) || specs.co2 || null;
    return {
      source: host || 'web',
      sourceId: n.sku || n.productID || url,
      url: offer.url || n.url || url,
      title: n.name || [qv(n.brand?.name ?? n.brand), n.model].filter(Boolean).join(' '),
      make: n.brand?.name || (typeof n.brand === 'string' ? n.brand : null) || n.manufacturer?.name || null,
      model: n.model || null,
      year,
      firstRegistration: reg && /\d{4}-\d{2}/.test(reg) ? reg.slice(0, 7) : year ? `${year}-07` : null,
      km: Number(String(qv(n.mileageFromOdometer) || '').replace(/[^\d]/g, '')) || null,
      fuel: normFuel(n.fuelType || engine.fuelType || text),
      gearbox: n.vehicleTransmission || null,
      cc: Number(String(qv(engine.engineDisplacement) || '').replace(/[^\d]/g, '')) || specs.cc || null,
      co2,
      country,
      price: Number(offer.price || offer.lowPrice) || null,
      images: [].concat(n.image || []).map((i) => (typeof i === 'string' ? i : i.url)).filter(Boolean),
      description: n.description || '',
      sellerType: offer.seller?.['@type'] === 'AutoDealer' || offer.seller?.['@type'] === 'Organization' ? 'pro' : null,
      sellerName: offer.seller?.name || null,
    };
  });
}
