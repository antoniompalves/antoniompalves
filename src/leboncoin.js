// Leboncoin fetcher & parser.
// Leboncoin pages are Next.js: all listing data sits in <script id="__NEXT_DATA__">.
// Leboncoin uses bot protection (DataDome), so a plain server request is often refused (403).
// Ways in, most reliable first:
//   1. Bookmarklet: run in your own browser on a leboncoin page → sends the page's data to the app.
//   2. Paste the page source (Ctrl+U → copy all) into the app.
//   3. Server fetch: direct request, falling back to Firecrawl when FIRECRAWL_API_KEY is set.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export function extractNextData(html) {
  const m = String(html).match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

/** Walk any JSON and collect objects that look like leboncoin ads (have list_id + subject). */
export function findAds(root) {
  const out = new Map();
  const seen = new Set();
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 14 || seen.has(node)) return;
    seen.add(node);
    if (!Array.isArray(node) && node.list_id && (node.subject || node.attributes)) { out.set(String(node.list_id), node); return; }
    for (const v of Array.isArray(node) ? node : Object.values(node)) walk(v, depth + 1);
  };
  walk(root, 0);
  return [...out.values()];
}

const FUEL = [
  [/hybride\s*rechargeable|plug/i, 'phev'],
  [/hybride|hybrid/i, 'hybrid'],
  [/[ée]lectrique|electric/i, 'electric'],
  [/diesel|gazole|gasoil/i, 'diesel'],
  [/gpl|lpg/i, 'lpg'],
  [/gnv|gaz naturel|cng/i, 'cng'],
  [/essence|gasoline|petrol|benzin/i, 'gasoline'],
];
export function normFuel(label) {
  if (!label) return null;
  for (const [re, v] of FUEL) if (re.test(label)) return v;
  return null;
}

/** Pull CO2, displacement and NEDC/WLTP hints from free text (title + description). */
export function parseSpecsFromText(text = '') {
  const t = String(text);
  const out = {};
  const co2 = t.match(/co2[^0-9]{0,25}(\d{2,3})\s*g/i) || t.match(/(\d{2,3})\s*g\s*\/\s*km/i);
  if (co2) out.co2 = Number(co2[1]);
  const cc = t.match(/(\d[\s.]?\d{3})\s*(?:cm3|cm³|cc|cm 3)\b/i);
  if (cc) out.cc = Number(cc[1].replace(/[\s.]/g, ''));
  else {
    // "1.5 dCi", "2.0 TDI", "1.2 PureTech" → approximate displacement
    const eng = t.match(/\b([1-6])[.,]([0-9])\s*(?:l\b|dci|tdi|tsi|tfsi|hdi|bluehdi|puretech|tce|ecoblue|crdi|cdi|d\b|i\b|vti|thp|mpi|gti|t\b|ecoboost|skyactiv|multijet|jtd)/i);
    if (eng) { out.cc = Number(eng[1]) * 1000 + Number(eng[2]) * 100; out.ccEstimated = true; }
  }
  if (/\bwltp\b/i.test(t)) out.co2Standard = 'WLTP';
  else if (/\bnedc\b/i.test(t)) out.co2Standard = 'NEDC';
  if (/\b(fap|dpf|filtre\s+[àa]\s+particules)\b/i.test(t)) out.dpf = true;
  return out;
}

const attr = (ad, ...keys) => {
  for (const k of keys) {
    const a = (ad.attributes || []).find((x) => x.key === k);
    if (a) return { value: a.value, label: a.value_label ?? a.value, values: a.values };
  }
  return null;
};

/** Convert a raw leboncoin ad object into the app's deal shape. */
export function normalizeAd(ad) {
  const brand = attr(ad, 'brand', 'u_car_brand');
  const model = attr(ad, 'model', 'u_car_model');
  const version = attr(ad, 'u_car_version', 'version');
  const regdate = attr(ad, 'regdate');
  const issuance = attr(ad, 'issuance_date');
  const mileage = attr(ad, 'mileage');
  const fuel = attr(ad, 'fuel');
  const gearbox = attr(ad, 'gearbox');
  const din = attr(ad, 'horse_power_din', 'horsepower_din');
  const cv = attr(ad, 'horsepower');
  const body = attr(ad, 'vehicle_type');
  const cc = attr(ad, 'cubic_capacity', 'engine_size', 'vehicle_engine_size');
  const co2 = attr(ad, 'co2', 'vehicle_co2', 'co2_emission');
  const text = `${ad.subject || ''}\n${ad.body || ''}`;
  const parsed = parseSpecsFromText(text);
  let firstRegistration = null;
  if (issuance?.value) {
    const [mm, yyyy] = String(issuance.value).split('/');
    if (yyyy) firstRegistration = `${yyyy}-${mm.padStart(2, '0')}`;
  }
  const year = Number(regdate?.value) || (firstRegistration ? Number(firstRegistration.slice(0, 4)) : null);
  if (!firstRegistration && year) firstRegistration = `${year}-07`; // mid-year assumption
  const price = Array.isArray(ad.price) ? ad.price[0] : ad.price ?? ad.price_cents / 100;
  const images = ad.images?.urls_large || ad.images?.urls || (ad.images?.thumb_url ? [ad.images.thumb_url] : []);
  const loc = ad.location || {};
  const fuelNorm = normFuel(fuel?.label) || normFuel(text);
  return {
    source: 'leboncoin',
    sourceId: String(ad.list_id),
    url: ad.url || `https://www.leboncoin.fr/ad/voitures/${ad.list_id}`,
    title: ad.subject || [brand?.label, model?.label].filter(Boolean).join(' '),
    make: brand?.label || null,
    model: model?.label || null,
    version: version?.label || null,
    year,
    firstRegistration,
    km: Number(mileage?.value) || null,
    fuel: fuelNorm,
    gearbox: gearbox?.label || null,
    powerHp: Number(din?.value) || null,
    fiscalHp: Number(cv?.value) || null,
    body: body?.label || null,
    cc: Number(cc?.value) || parsed.cc || null,
    ccEstimated: !cc && !!parsed.ccEstimated,
    co2: Number(co2?.value) || parsed.co2 || null,
    co2Standard: parsed.co2Standard || null,
    dieselParticles: false,
    country: 'FR',
    city: loc.city || null,
    zipcode: loc.zipcode || null,
    region: loc.region_name || null,
    lat: loc.lat ?? null,
    lng: loc.lng ?? null,
    sellerType: ad.owner?.type === 'pro' ? 'pro' : ad.owner?.type ? 'private' : null,
    sellerName: ad.owner?.name || null,
    price: Number(price) || null,
    images,
    description: ad.body || '',
    publishedAt: ad.first_publication_date || null,
    raw: { attributes: (ad.attributes || []).map((a) => ({ key: a.key, value: a.value, label: a.value_label })) },
  };
}

export function parseLeboncoinHtml(html) {
  const data = extractNextData(html);
  if (!data) return [];
  return findAds(data).map(normalizeAd);
}

/** Parse whatever the user gives us: page HTML, __NEXT_DATA__ JSON, a raw ad, or an array of ads. */
export function parseLeboncoinPayload(payload) {
  if (payload == null) return [];
  if (typeof payload === 'string') {
    const s = payload.trim();
    if (s.startsWith('{') || s.startsWith('[')) { try { return findAds(JSON.parse(s)).map(normalizeAd); } catch { /* fallthrough */ } }
    return parseLeboncoinHtml(s);
  }
  return findAds(payload).map(normalizeAd);
}

// ---- Search URL builder (step 1 targets → leboncoin search) ----
const LBC_FUEL = { gasoline: '1', diesel: '2', lpg: '3', electric: '4', hybrid: '6', phev: '7' };
export function buildSearchUrl({ text, minYear, maxYear, maxKm, minPrice, maxPrice, fuels, proOnly = true, gearbox, sort = 'time' } = {}) {
  const p = new URLSearchParams({ category: '2' });
  if (text) p.set('text', text);
  if (minYear || maxYear) p.set('regdate', `${minYear || 'min'}-${maxYear || 'max'}`);
  if (maxKm) p.set('mileage', `min-${maxKm}`);
  if (minPrice || maxPrice) p.set('price', `${minPrice || 'min'}-${maxPrice || 'max'}`);
  if (fuels?.length) p.set('fuel', fuels.map((f) => LBC_FUEL[f]).filter(Boolean).join(','));
  if (gearbox) p.set('gearbox', gearbox === 'auto' ? '2' : '1');
  if (proOnly) p.set('owner_type', 'pro');
  if (sort === 'price') { p.set('sort', 'price'); p.set('order', 'asc'); }
  return `https://www.leboncoin.fr/recherche?${p.toString()}`;
}

// ---- Network ----
async function fetchDirect(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' }, redirect: 'follow' });
  const html = await res.text();
  return { status: res.status, html };
}

async function fetchFirecrawl(url, key) {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ url, formats: ['rawHtml'], proxy: 'auto', maxAge: 0 }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.data?.rawHtml) throw new Error(`Firecrawl ${res.status}: ${j?.error || 'sem HTML'}`);
  return j.data.rawHtml;
}

/** Fetch a leboncoin search or ad URL and return normalised deals. */
export async function fetchLeboncoin(url, { firecrawlKey = process.env.FIRECRAWL_API_KEY, log = () => {} } = {}) {
  if (!/^https:\/\/(www\.)?leboncoin\.fr\//.test(url)) throw new Error('Não é um URL do leboncoin.fr');
  let ads = [];
  let lastErr = null;
  try {
    const { status, html } = await fetchDirect(url);
    log(`direct: HTTP ${status}`);
    if (status === 200) ads = parseLeboncoinHtml(html);
    if (!ads.length) lastErr = new Error(status === 200 ? 'A página não tinha dados de anúncios' : `Bloqueado pelo leboncoin (HTTP ${status})`);
  } catch (e) { lastErr = e; log(`direct: ${e.message}`); }
  if (!ads.length && firecrawlKey) {
    log('a tentar via Firecrawl…');
    ads = parseLeboncoinHtml(await fetchFirecrawl(url, firecrawlKey));
    if (!ads.length) lastErr = new Error('O Firecrawl devolveu a página, mas sem dados de anúncios');
  }
  if (!ads.length) throw new Error(`${lastErr?.message || 'Nenhum anúncio encontrado'}. Use o marcador (bookmarklet) ou cole o código-fonte da página${firecrawlKey ? '' : ' (ou configure FIRECRAWL_API_KEY)'}.`);
  return ads;
}
