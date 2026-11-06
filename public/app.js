import { analyzeDeal, scoreDeals, mergeSettings, deadlinesFor, tradeInValuation, capitalPosition, DEFAULT_SETTINGS } from './lib/costs.js';
import { processFor, progressOf } from './lib/process.js';
import { computeISV, computeIUC, ageInMonths } from './lib/tax.js';

// ---------- state & helpers ----------
const S = { deals: [], settings: {}, firecrawl: false, compare: new Set(load('compare', [])), modalTab: 'details', modalImg: 0 };
function load(k, d) { try { return JSON.parse(localStorage.getItem(`vroom.${k}`)) ?? d; } catch { return d; } }
function keep(k, v) { try { localStorage.setItem(`vroom.${k}`, JSON.stringify(v)); } catch { /* private mode */ } }
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (n, d = 0) => (n == null || Number.isNaN(n) ? '—' : `${(d ? nf2 : nf).format(n)} €`);
const signed = (n) => (n == null ? '—' : `${n >= 0 ? '+' : '−'}${nf.format(Math.abs(n))} €`);
const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1).replace('.', ',')}%`);
const cls = (n) => (n == null ? 'muted' : n >= 0 ? 'pos' : 'neg');
const settings = () => mergeSettings(S.settings);
const A = new Map();
const an = (d) => { const k = `${d.id}:${d.updatedAt}:${S.settingsVer || 0}`; if (!A.has(k)) A.set(k, analyzeDeal(d, S.settings)); return A.get(k); };
const FUELS = { gasoline: 'Gasolina', diesel: 'Gasóleo', hybrid: 'Híbrido', phev: 'Híbrido plug-in', electric: 'Elétrico', lpg: 'GPL', cng: 'GNC' };
const COUNTRIES = { FR: 'França', ES: 'Espanha', DE: 'Alemanha', NL: 'Países Baixos', BE: 'Bélgica', PT: 'Portugal (retoma)' };
const progressBar = (pr) => `<div class="bar"><span style="width:${Math.round(pr.pct * 100)}%"></span></div>`;
const STATUSES = [
  ['new', 'Novo'], ['shortlist', 'Pré-seleção'], ['contacted', 'Vendedor contactado'], ['reserved', 'Reservado'], ['bought', 'Comprado'],
  ['transit', 'A caminho de PT'], ['legalising', 'Em legalização'], ['for_sale', 'À venda'], ['sold', 'Vendido'], ['rejected', 'Rejeitado'],
];
const STATUS = Object.fromEntries(STATUSES);
const ACTIVE = ['reserved', 'bought', 'transit', 'legalising', 'for_sale'];

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
  if (r.status === 401) { location.href = 'login'; throw new Error('login'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
function toast(msg, ms = 3500) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms); }
async function refresh() { const j = await api('api/state'); S.deals = j.deals; S.settings = j.settings || {}; S.firecrawl = j.firecrawl; }
async function saveDeal(d) {
  const saved = await api(`api/deals/${d.id}`, { method: 'PUT', body: d });
  const i = S.deals.findIndex((x) => x.id === d.id); if (i >= 0) S.deals[i] = saved;
  return saved;
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) { const ks = p.split('.'); let c = o; ks.slice(0, -1).forEach((k) => { c[k] = c[k] && typeof c[k] === 'object' ? c[k] : {}; c = c[k]; }); c[ks.at(-1)] = v; }
const thumbStyle = (d) => (d.images?.[0] ? `style="background-image:url('${esc(d.images[0])}')"` : '');
const flag = (c) => `<span class="flag">${esc(c || '?')}</span>`;
const title = (d) => d.title || [d.make, d.model, d.version].filter(Boolean).join(' ') || 'Carro sem título';

// ---------- router ----------
const routes = { home: viewHome, deals: viewDeals, import: viewImport, calculator: viewCalculator, compare: viewCompare, pipeline: viewPipeline, ledger: viewLedger, settings: viewSettings };
const TITLES = { home: 'Início', deals: 'Negócios', import: 'Importar anúncios', calculator: 'Calculadora ISV / custos', compare: 'Comparar e pontuar', pipeline: 'Processo', ledger: 'Despesas e resultados', settings: 'Definições' };
function parseHash() {
  const [p, q = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const parts = p.split('/').filter(Boolean);
  return { name: parts[0] || 'home', arg: parts[1], q: new URLSearchParams(q) };
}
function render() {
  const r = parseHash();
  if (r.name === 'deal') { if (!$('#view').dataset.rendered) routes.home(parseHash()); openDeal(r.arg); return; }
  closeModal(false);
  S.lastHash = location.hash || '#/';
  const fn = routes[r.name] || viewHome;
  $('#tbTitle').textContent = TITLES[r.name] || 'Início';
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (r.q.get('fav') ? 'fav' : r.name)));
  $('#sidebar').classList.remove('open');
  fn(r);
  $('#view').dataset.rendered = r.name;
}
window.addEventListener('hashchange', render);
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');

// ---------- deal row ----------
function dealRow(d, { compare = false } = {}) {
  const a = an(d);
  const sub = a.market.avg ? `${eur(a.price)} anúncio → ${eur(a.totalInvestment)} posto em PT · ${eur(a.market.avg)} mercado PT` : `${eur(a.price)} anúncio → ${eur(a.totalInvestment)} posto em PT · ainda sem preço PT`;
  const badges = [
    d.sellerType === 'pro' ? '<span class="badge ok">Profissional</span>' : d.sellerType === 'private' ? '<span class="badge bad">Particular</span>' : '',
    a.fitsTargets ? '<span class="badge info">Alvo ISV baixo</span>' : '',
    d.status !== 'new' ? `<span class="badge">${esc(STATUS[d.status])} · ${Math.round(progressOf(d).pct * 100)}%</span>` : '',
    d.priceHistory?.length && d.price < d.priceHistory.at(-1).price ? `<span class="badge warn">Preço ↓ ${eur(d.priceHistory.at(-1).price - d.price)}</span>` : '',
    d.favorite ? '<span class="badge">♥</span>' : '',
  ].join('');
  return `<div class="deal-row" data-open="${d.id}">
    <div class="thumb" ${thumbStyle(d)}>${d.images?.[0] ? '' : '🚗'}</div>
    <div><div class="deal-title">${esc(title(d))}</div>
      <div class="deal-meta">${flag(d.country)} <b>${esc(d.city || COUNTRIES[d.country] || '')}</b> · ${esc(d.year || '—')} · ${d.km != null ? nf.format(d.km) + ' km' : '—'} · ${esc(FUELS[d.fuel] || d.fuel || '—')} · ISV ${eur(a.isv.total)}</div>
      <div class="deal-sub">${sub}</div><div class="badges">${badges}</div></div>
    <div class="deal-right"><div class="profit ${cls(a.netProfit)}">${signed(a.netProfit)}</div><div class="small muted">${a.netProfit != null ? `lucro líquido estimado · ${pct(a.margin)}` : 'falta preço de mercado'}</div>
      <div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end">${compare ? `<label class="chk small" data-stop><input type="checkbox" data-cmp="${d.id}" ${S.compare.has(d.id) ? 'checked' : ''}> comparar</label>` : ''}<button class="btn sm">Ver</button></div></div>
  </div>`;
}
function bindRows(root) {
  root.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('[data-stop]')) return; location.hash = `#/deal/${el.dataset.open}`; }));
  root.querySelectorAll('[data-cmp]').forEach((el) => el.addEventListener('change', () => { el.checked ? S.compare.add(el.dataset.cmp) : S.compare.delete(el.dataset.cmp); keep('compare', [...S.compare]); }));
}

// ---------- home ----------
function viewHome() {
  const s = settings();
  const live = S.deals.filter((d) => !['rejected', 'sold'].includes(d.status) && !ACTIVE.includes(d.status));
  const ranked = live.map((d) => [d, an(d)]).filter(([, a]) => a.netProfit != null).sort((x, y) => y[1].netProfit - x[1].netProfit);
  const best = ranked[0]?.[1].netProfit;
  const top = ranked.slice(0, 8);
  const avg = top.length ? top.reduce((a, [, x]) => a + x.netProfit, 0) / top.length : null;
  const active = S.deals.filter((d) => ACTIVE.includes(d.status));
  const sold = S.deals.filter((d) => d.status === 'sold' && d.salePrice);
  const realised = sold.reduce((a, d) => a + (an(d).realised?.profit || 0), 0);
  const noMarket = live.filter((d) => !an(d).market.avg);
  const noSpecs = live.filter((d) => !d.cc || !d.co2);
  const deadlines = active.flatMap((d) => deadlinesFor(d).filter((x) => !x.done).map((x) => ({ ...x, d }))).sort((a, b) => a.due.localeCompare(b.due));
  const cap = capitalPosition(S.deals, S.settings);
  const nextSteps = active.map((d) => ({ d, pr: progressOf(d) })).filter((x) => x.pr.next);
  const unpriced = live.filter((d) => !ranked.find(([x]) => x === d)).slice(0, 5);
  $('#view').innerHTML = `
  <div class="home"><div>
    <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;flex-wrap:wrap">
      <div><h2>Bem-vindo ao Vroom.pt</h2><p class="muted" style="max-width:560px;margin:0">Encontre carros em França, Espanha, Alemanha e Países Baixos, veja quanto custam postos em Portugal (ISV, IUC, viagem, legalização) e acompanhe cada carro da pré-seleção até à venda.</p></div>
      <a class="btn primary" href="#/deals" style="padding:12px 22px">⌕ Procurar negócios</a></div>
    <div class="grid cols-4" style="margin-top:20px">
      <div class="card kpi"><div class="lbl">Capital disponível</div><div class="val ${cls(cap.available)}">${eur(cap.available)}</div><div class="small muted">${live.length} negócios em análise</div></div>
      <div class="card kpi"><div class="lbl">Melhor lucro líquido</div><div class="val ${cls(best)}">${signed(best)}</div></div>
      <div class="card kpi"><div class="lbl">Carros em curso</div><div class="val">${active.length}</div></div>
      <div class="card kpi"><div class="lbl">Lucro realizado</div><div class="val ${cls(sold.length ? realised : null)}">${sold.length ? signed(realised) : '—'}</div></div>
    </div>
    <div class="sec-h"><div><h2>${top.length ? `Top ${top.length} negócios` : 'Melhores negócios'}</h2>${avg != null ? `<div class="muted">lucro líquido médio <b class="${cls(avg)} mono">${signed(Math.round(avg))}</b> · melhor <b class="pos mono">${signed(best)}</b> ${esc(title(ranked[0][0]))}</div>` : ''}</div><a class="btn dark" href="#/deals">Ver todos</a></div>
    <div id="topList">${top.length ? top.map(([d]) => dealRow(d)).join('') : `<div class="empty">Ainda não há negócios com preço. <a href="#/import">Importe anúncios do leboncoin</a> e depois adicione comparáveis portugueses no separador <b>Mercado PT</b> de cada carro.</div>`}</div>
    ${unpriced.length ? `<div class="sec-h"><h3>À espera de preço de mercado PT</h3></div><div id="unpriced">${unpriced.map((d) => dealRow(d)).join('')}</div>` : ''}
  </div>
  <div>
    <div class="eyebrow">Precisa da sua atenção</div>
    <div class="card">
      ${deadlines.slice(0, 5).map((x) => `<div class="att"><div class="ic">⏱</div><div><b>${esc(x.label)}</b> — ${esc(title(x.d))}<div class="small ${x.due < new Date().toISOString().slice(0, 10) ? 'neg' : 'muted'}">prazo ${esc(x.due)}</div><a href="#/deal/${x.d.id}?tab=pipeline">Abrir</a></div></div>`).join('')}
      ${nextSteps.slice(0, 4).map(({ d, pr }) => `<div class="att"><div class="ic">✓</div><div><b>${esc(title(d))}</b><div class="small muted">${esc(pr.phase.label)} → ${esc(pr.next.label)}</div>${progressBar(pr)}<a href="#/deal/${d.id}?tab=pipeline">Abrir checklist</a></div></div>`).join('')}
      <div class="att"><div class="ic">€</div><div><b>${noMarket.length}</b> sem preço de mercado PT<div class="small muted">Adicione comparáveis do StandVirtual para obter o lucro</div><a href="#/deals?nomarket=1">Rever</a></div></div>
      <div class="att"><div class="ic">⚙</div><div><b>${noSpecs.length}</b> sem CO2 ou cilindrada<div class="small muted">Sem ambos, o ISV não pode ser exato</div><a href="#/deals?nospecs=1">Corrigir</a></div></div>
      <div class="att"><div class="ic">▦</div><div><b>${active.length}</b> carros em curso<div class="small muted">Reservado → vendido</div><a href="#/pipeline">Abrir processo</a></div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Analisar um anúncio</h3><p class="muted small" style="margin-top:0">Cole o URL de um anúncio ou pesquisa do leboncoin. ${S.firecrawl ? 'Usa o Firecrawl se o leboncoin bloquear o servidor.' : 'Se o leboncoin bloquear o servidor, use o marcador na página Importar anúncios.'}</p>
      <input id="qUrl" placeholder="https://www.leboncoin.fr/ad/voitures/…"><button class="btn primary" id="qGo" style="width:100%;margin-top:8px">⚡ Obter e analisar</button>
    </div>
    <div class="card dark" style="margin-top:16px">
      <h3>Carros alvo (passo 1)</h3>
      <p class="muted small">ISV baixo: ${s.targets.minAgeYears} a ${s.targets.maxAgeYears} anos, &lt; ${s.targets.maxCc} cm³, &lt; ${s.targets.maxCo2} g/km. Os elétricos não pagam ISV. Comprar só a vendedores profissionais.</p>
      <a class="btn primary" href="#/import" style="width:100%">Criar pesquisa no leboncoin</a>
    </div>
  </div></div>`;
  bindRows($('#view'));
  $('#qGo').onclick = () => fetchUrl($('#qUrl').value, $('#qGo'));
}

async function fetchUrl(url, btn) {
  if (!url.trim()) return;
  btn.disabled = true; const t = btn.textContent; btn.textContent = 'A obter…';
  try {
    const r = await api('api/import/leboncoin', { method: 'POST', body: { url } });
    await refresh(); toast(`Importados: ${r.created} novos, ${r.updated} atualizados`);
    location.hash = r.ids.length === 1 ? `#/deal/${r.ids[0]}` : '#/deals?sort=new';
  } catch (e) { toast(e.message, 9000); } finally { btn.disabled = false; btn.textContent = t; }
}

// ---------- deals list ----------
function viewDeals(r) {
  const f = { text: '', country: '', fuel: '', status: 'open', maxPrice: '', minProfit: '', targets: false, pro: false, sort: 'profit', ...load('filters', {}) };
  if (r.q.get('sort')) f.sort = r.q.get('sort');
  const fav = r.q.get('fav'), nomarket = r.q.get('nomarket'), nospecs = r.q.get('nospecs');
  $('#view').innerHTML = `
    <div class="card"><div class="filters">
      <label class="f">Pesquisar<input id="f_text" placeholder="marca, modelo, cidade…" value="${esc(f.text)}"></label>
      <label class="f">País<select id="f_country"><option value="">Todos</option>${Object.entries(COUNTRIES).map(([k, v]) => `<option value="${k}" ${f.country === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f">Combustível<select id="f_fuel"><option value="">Todos</option>${Object.entries(FUELS).map(([k, v]) => `<option value="${k}" ${f.fuel === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f">Estado<select id="f_status"><option value="open" ${f.status === 'open' ? 'selected' : ''}>Em aberto (sem rejeitados/vendidos)</option><option value="" ${f.status === '' ? 'selected' : ''}>Todos</option>${STATUSES.map(([k, v]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f">Preço máx. €<input id="f_maxPrice" type="number" value="${esc(f.maxPrice)}"></label>
      <label class="f">Lucro mín. €<input id="f_minProfit" type="number" value="${esc(f.minProfit)}"></label>
      <label class="f">Ordenar<select id="f_sort">${[['profit', 'Lucro líquido'], ['margin', 'Margem %'], ['price', 'Preço ↑'], ['km', 'Km ↑'], ['new', 'Mais recentes'], ['isv', 'ISV ↑']].map(([k, v]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    </div>
    <div style="display:flex;gap:18px;margin-top:10px;flex-wrap:wrap;align-items:center">
      <label class="chk"><input type="checkbox" id="f_targets" ${f.targets ? 'checked' : ''}> Só alvos de ISV baixo</label>
      <label class="chk"><input type="checkbox" id="f_pro" ${f.pro ? 'checked' : ''}> Só vendedores profissionais</label>
      ${fav ? '<span class="badge info">Favoritos</span>' : ''}${nomarket ? '<span class="badge warn">Sem preço PT</span>' : ''}${nospecs ? '<span class="badge warn">Sem CO2/cilindrada</span>' : ''}
      <span class="muted" id="count" style="margin-left:auto"></span><a class="btn sm" href="#/compare">Comparar selecionados →</a></div></div>
    <div id="list" style="margin-top:16px"></div>`;
  const draw = () => {
    for (const k of Object.keys(f)) { const el = $(`#f_${k}`); if (el) f[k] = el.type === 'checkbox' ? el.checked : el.value; }
    keep('filters', f);
    const q = f.text.toLowerCase();
    let list = S.deals.filter((d) => {
      if (fav && !d.favorite) return false;
      if (f.status === 'open' ? ['rejected', 'sold'].includes(d.status) : f.status && d.status !== f.status) return false;
      if (q && ![d.title, d.make, d.model, d.city, d.version].join(' ').toLowerCase().includes(q)) return false;
      if (f.country && d.country !== f.country) return false;
      if (f.fuel && d.fuel !== f.fuel) return false;
      if (f.pro && d.sellerType !== 'pro') return false;
      const a = an(d);
      if (f.maxPrice && a.price > Number(f.maxPrice)) return false;
      if (f.minProfit && !(a.netProfit >= Number(f.minProfit))) return false;
      if (f.targets && !a.fitsTargets) return false;
      if (nomarket && a.market.avg) return false;
      if (nospecs && d.cc && d.co2) return false;
      return true;
    });
    const key = { profit: (d) => -(an(d).netProfit ?? -1e9), margin: (d) => -(an(d).margin ?? -1e9), price: (d) => an(d).price || 1e9, km: (d) => d.km ?? 1e9, new: (d) => -new Date(d.createdAt).getTime(), isv: (d) => an(d).isv.total }[f.sort];
    list = list.sort((a, b) => key(a) - key(b));
    $('#count').textContent = `${list.length} negócio${list.length === 1 ? '' : 's'}`;
    $('#list').innerHTML = list.length ? list.map((d) => dealRow(d, { compare: true })).join('') : '<div class="empty">Nenhum negócio corresponde aos filtros. <a href="#/import">Importe anúncios</a>.</div>';
    bindRows($('#list'));
  };
  $('#view').querySelectorAll('input,select').forEach((el) => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', draw));
  draw();
}

// ---------- import ----------
function viewImport() {
  const s = settings(); const y = new Date().getFullYear();
  const appUrl = new URL('.', location.href).href;
  const bm = `javascript:(()=>{var n=document.getElementById('__NEXT_DATA__');var c=n?n.textContent:document.documentElement.outerHTML;var w=window.open(${JSON.stringify(appUrl + 'bridge')},'vroom');var h=function(e){if(e.source!==w)return;if(e.data==='vroom-ready'){w.postMessage({type:'vroom-import',content:c,url:location.href},'*')}if(e.data&&e.data.type==='vroom-done'){removeEventListener('message',h)}};addEventListener('message',h)})()`;
  $('#view').innerHTML = `
  <div class="grid cols-2">
    <div class="card"><h3>1 · Criar uma pesquisa no leboncoin a partir dos alvos</h3>
      <p class="muted small">Zona: ${esc(s.acquisition.zone)} (escolha a localização no leboncoin). Passo 1 da folha de cálculo: ${s.targets.minAgeYears} a ${s.targets.maxAgeYears} anos, &lt;${s.targets.maxCc} cm³, &lt;${s.targets.maxCo2} g/km, vendedores profissionais.</p>
      <div class="form-grid">
        <label class="f">Marca / modelo<input id="s_text" placeholder="ex.: Renault Kadjar"></label>
        <label class="f">Ano desde<input id="s_minYear" type="number" value="${y - s.targets.maxAgeYears}"></label>
        <label class="f">Ano até<input id="s_maxYear" type="number" value="${y - s.targets.minAgeYears}"></label>
        <label class="f">Km máx.<input id="s_maxKm" type="number" value="180000"></label>
        <label class="f">Preço mín. €<input id="s_minPrice" type="number" value="${s.acquisition.budgetMin}"></label>
        <label class="f">Preço máx. €<input id="s_maxPrice" type="number" value="${s.acquisition.budgetMax}"></label>
        <label class="f">Caixa<select id="s_gearbox"><option value="">Qualquer</option><option value="manual">Manual</option><option value="auto">Automática</option></select></label>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin:12px 0">${['gasoline', 'diesel', 'hybrid', 'phev', 'electric'].map((k) => `<label class="chk"><input type="checkbox" class="s_fuel" value="${k}" ${['gasoline', 'hybrid', 'electric'].includes(k) ? 'checked' : ''}> ${FUELS[k]}</label>`).join('')}<label class="chk"><input type="checkbox" id="s_pro" checked> Só profissionais</label></div>
      <button class="btn primary" id="s_go">Abrir pesquisa no leboncoin ↗</button>
      <p class="small muted">Depois carregue no marcador (2) na página de resultados para importar todos os carros de uma vez.</p></div>
    <div class="card"><h3>2 · Marcador / bookmarklet (recomendado)</h3>
      <p class="muted small">O leboncoin bloqueia servidores automáticos, mas não o seu navegador. Arraste este botão para a barra de marcadores. Em qualquer página de <b>resultados</b> ou de <b>anúncio</b> do leboncoin (e também AutoScout24, mobile.de, coches.net…), carregue nele: os carros da página são enviados para o Vroom.pt.</p>
      <p><a class="bm" id="bm" href="#">⇣ Enviar para o Vroom.pt</a></p>
      <ol class="steps small"><li>Entre no Vroom.pt neste navegador.</li><li>Abra o leboncoin e faça a pesquisa.</li><li>Carregue no marcador → abre-se uma pequena janela → <b>Importar</b>.</li></ol></div>
    <div class="card"><h3>3 · Obter um URL a partir do servidor</h3>
      <p class="muted small">URL de anúncio ou de pesquisa do leboncoin. ${S.firecrawl ? '<span class="badge ok">Firecrawl ativo</span> usado se o leboncoin devolver 403.' : '<span class="badge warn">Firecrawl não configurado</span> O leboncoin costuma bloquear pedidos diretos do servidor; configure <code>FIRECRAWL_API_KEY</code> para isto funcionar de forma fiável.'}</p>
      <input id="u_url" placeholder="https://www.leboncoin.fr/recherche?category=2&…"><button class="btn primary" id="u_go" style="margin-top:8px">Obter</button></div>
    <div class="card"><h3>4 · Colar o código-fonte da página</h3>
      <p class="muted small">Funciona com o leboncoin e a maioria dos portais (AutoScout24, mobile.de, coches.net, Marktplaats). Abra o anúncio, carregue em <b>Ctrl+U</b>, selecione tudo, copie e cole aqui.</p>
      <div class="form-grid"><label class="f">URL do anúncio (opcional)<input id="p_url"></label><label class="f">País<select id="p_country">${Object.entries(COUNTRIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label></div>
      <textarea id="p_content" placeholder="<!DOCTYPE html>…" style="margin-top:8px"></textarea><button class="btn primary" id="p_go" style="margin-top:8px">Importar</button></div>
    <div class="card" style="grid-column:1/-1"><h3>5 · Adicionar um carro manualmente</h3>
      <div class="form-grid">
        <label class="f">Marca<input id="m_make"></label><label class="f">Modelo<input id="m_model"></label><label class="f">Versão<input id="m_version"></label>
        <label class="f">1.ª matrícula<input id="m_firstRegistration" type="month"></label><label class="f">Km<input id="m_km" type="number"></label>
        <label class="f">Combustível<select id="m_fuel">${Object.entries(FUELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label class="f">Cilindrada cm³<input id="m_cc" type="number"></label><label class="f">CO2 g/km<input id="m_co2" type="number"></label>
        <label class="f">Preço €<input id="m_price" type="number"></label><label class="f">País<select id="m_country">${Object.entries(COUNTRIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label class="f">Cidade<input id="m_city"></label><label class="f">URL do anúncio<input id="m_url"></label>
        <label class="f">Vendedor<select id="m_sellerType"><option value="pro">Profissional</option><option value="private">Particular</option></select></label>
      </div><button class="btn primary" id="m_go" style="margin-top:12px">Adicionar carro</button></div>
  </div>`;
  $('#bm').setAttribute('href', bm);
  $('#bm').onclick = (e) => { e.preventDefault(); toast('Arraste este botão para a barra de marcadores'); };
  $('#s_go').onclick = async () => {
    const body = { text: $('#s_text').value, minYear: $('#s_minYear').value, maxYear: $('#s_maxYear').value, maxKm: $('#s_maxKm').value, minPrice: $('#s_minPrice').value, maxPrice: $('#s_maxPrice').value, gearbox: $('#s_gearbox').value, proOnly: $('#s_pro').checked, fuels: [...document.querySelectorAll('.s_fuel:checked')].map((x) => x.value) };
    const { url } = await api('api/leboncoin/search-url', { method: 'POST', body });
    window.open(url, '_blank', 'noopener');
  };
  $('#u_go').onclick = () => fetchUrl($('#u_url').value, $('#u_go'));
  $('#p_go').onclick = async () => {
    try { const r = await api('api/import/paste', { method: 'POST', body: { content: $('#p_content').value, url: $('#p_url').value, country: $('#p_country').value } }); await refresh(); toast(`Importados: ${r.created} novos, ${r.updated} atualizados`); location.hash = r.ids.length === 1 ? `#/deal/${r.ids[0]}` : '#/deals?sort=new'; } catch (e) { toast(e.message, 8000); }
  };
  $('#m_go').onclick = async () => {
    const d = {}; for (const k of ['make', 'model', 'version', 'firstRegistration', 'km', 'fuel', 'cc', 'co2', 'price', 'country', 'city', 'url', 'sellerType']) d[k] = $(`#m_${k}`).value || null;
    for (const k of ['km', 'cc', 'co2', 'price']) d[k] = d[k] ? Number(d[k]) : null;
    d.year = d.firstRegistration ? Number(d.firstRegistration.slice(0, 4)) : null;
    d.title = [d.make, d.model, d.version].filter(Boolean).join(' ');
    if (!d.title) return toast('Indique pelo menos a marca e o modelo');
    const saved = await api('api/deals', { method: 'POST', body: { ...d, source: 'manual' } });
    await refresh(); location.hash = `#/deal/${saved.id}`;
  };
}

// ---------- deal modal ----------
function closeModal(nav = true) { $('#modal').hidden = true; document.body.style.overflow = ''; S.modalFor = null; if (nav && parseHash().name === 'deal') location.hash = S.lastHash || '#/'; }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

function standVirtualUrl(d) {
  const slug = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const p = new URLSearchParams();
  if (d.year) { p.set('search[filter_float_first_registration_year:from]', d.year - 1); p.set('search[filter_float_first_registration_year:to]', d.year + 1); }
  if (d.km) { p.set('search[filter_float_mileage:from]', Math.max(0, Math.round(d.km * 0.7))); p.set('search[filter_float_mileage:to]', Math.round(d.km * 1.3)); }
  const fuel = { gasoline: 'gaz', diesel: 'diesel', electric: 'electric', hybrid: 'hibrido', phev: 'plugin-hibrido' }[d.fuel];
  if (fuel) p.set('search[filter_enum_fuel_type]', fuel);
  return `https://www.standvirtual.com/carros/${[slug(d.make), slug(d.model)].filter(Boolean).join('/')}?${p}`;
}

function openDeal(id) {
  const d = S.deals.find((x) => x.id === id);
  if (!d) { toast('Negócio não encontrado'); location.hash = '#/deals'; return; }
  if (S.modalFor !== id) { S.modalFor = id; S.modalImg = 0; S.modalTab = new URLSearchParams(location.hash.split('?')[1]).get('tab') || 'details'; }
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  drawModal(d);
}

function inp(d, path, type = 'text', extra = '') { const v = getPath(d, path); return `<input data-path="${path}" type="${type}" value="${esc(v ?? '')}" ${extra}>`; }
function sel(d, path, options, extra = '') { const v = getPath(d, path) ?? ''; return `<select data-path="${path}" ${extra}>${options.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; }

function drawModal(d) {
  const a = an(d); const s = settings();
  const imgs = d.images || [];
  const img = imgs[S.modalImg] || '';
  const months = ageInMonths(d.firstRegistration || d.year);
  const tabs = [['details', 'Dados do anúncio'], ['costs', 'Custos'], ['market', 'Mercado PT'], ['pipeline', 'Processo (checklist)'], ['sale', 'Venda e retoma'], ['expenses', 'Despesas']];
  $('#modalBody').innerHTML = `
  <div class="m-head"><h2>${esc(title(d))}</h2>${d.favorite ? '<span class="badge">♥ favorito</span>' : ''}<span class="badge">${esc(STATUS[d.status] || d.status)}</span><div style="margin-left:auto"></div><button class="icon-btn" id="mClose" aria-label="Fechar">✕</button></div>
  <div class="m-body"><div>
    <div class="gallery"><div class="main-img" style="${img ? `background-image:url('${esc(img)}')` : ''}">${imgs.length ? `<span class="count">${S.modalImg + 1} / ${imgs.length}</span>` : '<div class="empty" style="height:100%;display:flex;align-items:center;justify-content:center;border:0;background:none">Sem fotos</div>'}</div>
      ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<button data-img="${i}" class="${i === S.modalImg ? 'on' : ''}" style="background-image:url('${esc(u)}')" aria-label="Foto ${i + 1}"></button>`).join('')}</div>` : ''}</div>
    <div class="specs">
      <div><div class="l">Quilómetros</div><div class="v">${d.km != null ? nf.format(d.km) + ' km' : '—'}</div></div>
      <div><div class="l">1.ª matrícula</div><div class="v">${esc(d.firstRegistration || d.year || '—')}${months != null ? ` <span class="muted small">(${(months / 12).toFixed(1).replace('.', ',')} anos)</span>` : ''}</div></div>
      <div><div class="l">Cilindrada</div><div class="v">${d.cc ? nf.format(d.cc) + ' cm³' : '—'}${d.ccEstimated ? ' <span class="badge warn">estim.</span>' : ''}</div></div>
      <div><div class="l">CO2</div><div class="v">${d.co2 ? d.co2 + ' g/km' : '—'} <span class="muted small">${esc(a.isv.standard || '')}</span></div></div>
      <div><div class="l">Combustível</div><div class="v">${esc(FUELS[d.fuel] || '—')}</div></div>
      <div><div class="l">Potência / caixa</div><div class="v">${d.powerHp ? d.powerHp + ' cv' : '—'} · ${esc(d.gearbox || '—')}</div></div>
    </div>
    <div class="badges" style="margin-top:12px">${a.checks.map((c) => `<span class="badge ${c.ok ? 'ok' : 'bad'}">${c.ok ? '✓' : '✗'} ${esc(c.label)}</span>`).join('')}</div>
    <p class="muted" style="margin:8px 0 0">📍 ${esc([d.city, d.zipcode, d.region, COUNTRIES[d.country]].filter(Boolean).join(', ') || 'Localização desconhecida')} · ${a.km} km até ${esc(s.homeBase.name)}${d.sellerName ? ` · Vendedor: <b>${esc(d.sellerName)}</b> (${esc({ pro: 'profissional', private: 'particular' }[d.sellerType] || '?')})` : ''}</p>
    <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${S.modalTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="tabBody">${TAB[S.modalTab](d, a, s)}</div>
  </div>
  <div>
    <div class="kv">
      <div><span>${flag(d.country)} Preço do anúncio</span><span class="v">${eur(d.price)}</span></div>
      ${d.overrides?.negotiatedPrice ? `<div><span>Preço negociado</span><span class="v">${eur(a.price)}</span></div>` : ''}
      <div><span class="muted">+ Custos de importação</span><span class="v">${eur(a.importCosts)}</span></div>
      <div><span class="muted">&nbsp;&nbsp;dos quais ISV</span><span class="v">${eur(a.isv.total, 2)}</span></div>
      <div><span><b>Investimento total</b></span><span class="v">${eur(a.totalInvestment)}</span></div>
      <div><span><span class="flag">PT</span> Preço de mercado</span><span class="v">${eur(a.market.avg)}</span></div>
    </div>
    <div class="profit-card"><div class="lbl">Lucro líquido estimado</div>
      <div class="big">${signed(a.netProfit)} ${a.margin != null ? `<span style="font-size:16px;color:#4ade80">${pct(a.margin)}</span>` : ''}</div>
      <div class="sub">${a.market.low && a.market.high ? `Intervalo ${signed(a.scenarios.conservative.profit)} → ${signed(a.scenarios.high.profit)}` : 'Adicione comparáveis no separador “Mercado PT”'}</div>
      ${a.realised ? `<div class="sub">Realizado: ${signed(a.realised.profit)} (${pct(a.realised.margin)}) · caixa ${eur(a.realised.reserve)} · por sócio ${signed(a.realised.perPartner)}</div>` : ''}</div>
    ${a.market.avg ? `<div class="eyebrow">Cenários de venda (passo 9)</div><div class="scen">${[['conservative', 'Conservador'], ['medium', 'Médio'], ['high', 'Alto']].map(([k, l]) => `<div><div class="small muted">${l}</div><div class="p">${eur(a.scenarios[k]?.sale)}</div><div class="small ${cls(a.scenarios[k]?.profit)}">${signed(a.scenarios[k]?.profit)}</div></div>`).join('')}</div>` : ''}
    ${a.warnings.length ? `<div class="card" style="margin-top:14px;background:#fffbeb;border-color:#fde68a"><ul class="ul small">${a.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:14px">
      ${d.url ? `<a class="btn primary" href="${esc(d.url)}" target="_blank" rel="noopener">Ver anúncio em ${esc(d.source === 'manual' ? 'site' : d.source)} ↗</a>` : '<span></span>'}
      <button class="btn" id="mFav" title="Favorito">${d.favorite ? '♥' : '♡'}</button></div>
    <label class="f" style="margin-top:12px">Estado${sel(d, 'status', STATUSES)}</label>
    <div class="card" style="margin-top:14px"><div class="eyebrow">Verificar antes de comprar</div>
      <div class="grid cols-2"><a class="btn" href="https://www.carvertical.com/" target="_blank" rel="noopener">Histórico (carVertical)</a><a class="btn" href="https://www.autodna.com/" target="_blank" rel="noopener">autoDNA</a>
      <a class="btn" href="${esc(standVirtualUrl(d))}" target="_blank" rel="noopener">Comparáveis StandVirtual</a><a class="btn" href="https://impostosobreveiculos.info/isv/simulador-isv/" target="_blank" rel="noopener">Simulador ISV</a></div></div>
    <button class="btn danger" id="mDel" style="margin-top:14px;width:100%">Eliminar negócio</button>
  </div></div>`;
  bindModal(d);
}

const TAB = {
  details: (d) => `
    <div class="eyebrow">O carro — corrija o que o anúncio tiver errado</div>
    <div class="form-grid">
      <label class="f">Título${inp(d, 'title')}</label><label class="f">Marca${inp(d, 'make')}</label><label class="f">Modelo${inp(d, 'model')}</label><label class="f">Versão${inp(d, 'version')}</label>
      <label class="f">1.ª matrícula${inp(d, 'firstRegistration', 'month')}</label><label class="f">Km${inp(d, 'km', 'number')}</label>
      <label class="f">Combustível${sel(d, 'fuel', Object.entries(FUELS))}</label>
      ${['hybrid', 'phev'].includes(d.fuel) ? `<label class="f">Motor do híbrido${sel(d, 'hybridBase', [['gasoline', 'Gasolina'], ['diesel', 'Gasóleo']])}</label>` : ''}
      <label class="f">Cilindrada cm³${inp(d, 'cc', 'number')}</label><label class="f">CO2 g/km${inp(d, 'co2', 'number')}</label>
      <label class="f">Norma CO2${sel(d, 'co2Standard', [['', 'Automático (≤2018 NEDC)'], ['NEDC', 'NEDC'], ['WLTP', 'WLTP']])}</label>
      ${d.fuel === 'diesel' ? `<label class="f">Partículas ≥0,001 g/km${sel(d, 'dieselParticles', [['false', 'Não (+0 €)'], ['true', 'Sim / desconhecido (+500 €)']])}</label>` : ''}
      <label class="f">Potência cv${inp(d, 'powerHp', 'number')}</label><label class="f">Caixa${inp(d, 'gearbox')}</label>
      <label class="f">Preço €${inp(d, 'price', 'number')}</label>
      <label class="f">País${sel(d, 'country', Object.entries(COUNTRIES))}</label><label class="f">Cidade${inp(d, 'city')}</label>
      <label class="f">Vendedor${sel(d, 'sellerType', [['pro', 'Profissional'], ['private', 'Particular'], ['', 'Desconhecido']])}</label><label class="f">Nome do vendedor${inp(d, 'sellerName')}</label>
      <label class="f">Qualidade aparente (1 melhor – 5)${sel(d, 'quality', [[1, '1 · excelente'], [2, '2'], [3, '3 · média'], [4, '4'], [5, '5 · fraca']])}</label>
      <label class="f">URL do anúncio${inp(d, 'url', 'url')}</label>
    </div>
    <p class="small muted">O CO2 e a cilindrada raramente vêm estruturados no leboncoin: peça ao vendedor o <b>COC</b> ou a <b>carte grise</b> (campos V.7 = CO2, P.1 = cm³).</p>
    <label class="f" style="margin-top:10px">Notas<textarea data-path="notes">${esc(d.notes || '')}</textarea></label>
    ${d.description ? `<div class="eyebrow" style="margin-top:18px">Descrição do vendedor</div><div class="card small" style="white-space:pre-wrap;max-height:260px;overflow:auto">${esc(d.description)}</div>` : ''}
    ${d.priceHistory?.length ? `<div class="eyebrow" style="margin-top:18px">Histórico de preço</div><div class="kv">${d.priceHistory.map((h) => `<div><span>${esc(h.date.slice(0, 10))}</span><span class="v">${eur(h.price)}</span></div>`).join('')}<div><span>agora</span><span class="v">${eur(d.price)}</span></div></div>` : ''}
    <p class="small muted" style="margin-top:18px">Anúncio, fotos e dados provenientes de ${esc(d.source)}${d.publishedAt ? ` · publicado em ${esc(d.publishedAt.slice(0, 10))}` : ''}.</p>`,
  costs: (d, a) => `
    <div class="form-grid" style="margin-bottom:12px">
      <label class="f">Preço negociado €${inp(d, 'overrides.negotiatedPrice', 'number', `placeholder="${esc(d.price || '')}"`)}</label>
      <label class="f">Vinda${sel(d, 'overrides.returnMode', [['drive', 'Trazer a conduzir'], ['truck', 'Transportadora']])}</label>
      <label class="f">Km do percurso${inp(d, 'overrides.routeKm', 'number', `placeholder="${a.km}"`)}</label>
    </div>
    <div class="kv">${a.groups.map((g) => `<div class="grp"><span>${esc(g.label)}</span><span>${eur(g.total)}</span></div>${g.items.map((i) => `<div><span>${esc(i.label)}</span><input type="number" step="any" data-path="overrides.${i.key}" value="${esc(d.overrides?.[i.key] ?? '')}" placeholder="${Math.round(i.amount)}"></div>`).join('')}`).join('')}
      <div class="grp"><span>Total de custos de importação</span><span>${eur(a.importCosts)}</span></div></div>
    <p class="small muted">Os campos vazios usam os valores das Definições; escreva um valor para o alterar só neste carro. ISV: componente cilindrada ${eur(a.isv.cc, 2)} + componente ambiental ${eur(a.isv.co2, 2)}, −${Math.round(a.isv.discount * 100)}% de desconto por idade (${a.isv.months ?? '?'} meses)${a.isv.particles ? ' + 500 € partículas' : ''}. IUC/ano ${eur(a.iuc.total, 2)}.</p>`,
  market: (d, a) => `
    <p class="muted small" style="margin-top:0">Passo 2: encontre o carro comparável mais barato e o mais caro em Portugal (ano, km e estado semelhantes), de vendedores <b>profissionais</b>.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><a class="btn" href="${esc(standVirtualUrl(d))}" target="_blank" rel="noopener">Pesquisar no StandVirtual ↗</a><a class="btn" href="https://www.olx.pt/carros-motos-e-barcos/carros/q-${encodeURIComponent([d.make, d.model].filter(Boolean).join('-'))}/" target="_blank" rel="noopener">Pesquisar no OLX ↗</a><a class="btn" href="https://www.piscapisca.pt/" target="_blank" rel="noopener">PiscaPisca ↗</a></div>
    <table class="t"><thead><tr><th>Site / link</th><th class="n">Ano</th><th class="n">Km</th><th>Estado</th><th class="n">Preço €</th><th></th></tr></thead><tbody>
      ${(d.market?.comps || []).map((c, i) => `<tr><td><input data-path="market.comps.${i}.url" value="${esc(c.url || '')}" placeholder="https://www.standvirtual.com/…"></td><td><input type="number" data-path="market.comps.${i}.year" value="${esc(c.year || '')}"></td><td><input type="number" data-path="market.comps.${i}.km" value="${esc(c.km || '')}"></td><td><input data-path="market.comps.${i}.condition" value="${esc(c.condition || '')}" placeholder="Bom"></td><td><input type="number" data-path="market.comps.${i}.price" value="${esc(c.price || '')}"></td><td><button class="btn sm danger" data-delcomp="${i}">✕</button></td></tr>`).join('')}
      <tr><td colspan="6"><button class="btn sm" id="addComp">+ Adicionar comparável</button></td></tr></tbody></table>
    <div class="form-grid" style="margin-top:14px">
      <label class="f">Mais baixo (manual)${inp(d, 'market.low', 'number', `placeholder="${a.market.low ?? ''}"`)}</label>
      <label class="f">Mais alto (manual)${inp(d, 'market.high', 'number', `placeholder="${a.market.high ?? ''}"`)}</label>
      <label class="f">Preço de venda alvo${inp(d, 'market.target', 'number', `placeholder="${a.market.avg ? Math.round(a.market.avg) : 'média'}"`)}</label>
    </div>
    <p class="small muted">O lucro usa o preço de venda alvo (por omissão: média entre o mais baixo e o mais alto). Dica: anuncie primeiro pelo preço mais alto e vá baixando até ao valor conservador.</p>`,
  pipeline: (d) => {
    const s = settings();
    const phases = processFor(d);
    const pr = progressOf(d);
    const dl = deadlinesFor(d);
    const field = (f) => ({
      paymentMethod: sel(d, 'paymentMethod', [['', '— escolher —'], ['TRF', 'Transferência'], ['Cash', 'Numerário']]),
      'overrides.returnMode': sel(d, 'overrides.returnMode', [['', '— escolher —'], ['drive', 'Estrada (trazer a conduzir)'], ['truck', 'Transportadora']]),
      hasCoc: sel(d, 'hasCoc', [['', '— por confirmar —'], ['true', 'Sim, tem COC'], ['false', 'Não — pedir à marca']]),
    }[f] || '');
    return `<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><b>Progresso do processo: ${pr.done} / ${pr.total} (${Math.round(pr.pct * 100)}%)</b>${pr.next ? `<span class="muted">Próximo passo: <b>${esc(pr.phase.label)} → ${esc(pr.next.label)}</b></span>` : '<span class="pos"><b>Processo concluído ✓</b></span>'}</div>${progressBar(pr)}</div>
      <div class="form-grid">
      <label class="f">Data de compra${inp(d, 'dates.bought', 'date')}</label><label class="f">Chegada a PT${inp(d, 'dates.arrivedPT', 'date')}</label>
      <label class="f">DAV submetida${inp(d, 'dates.davDate', 'date')}</label><label class="f">Matrícula PT atribuída${inp(d, 'dates.plateDate', 'date')}</label>
      <label class="f">Anunciado para venda${inp(d, 'dates.listed', 'date')}</label><label class="f">Data de venda${inp(d, 'dates.sold', 'date')}</label>
      <label class="f">Sinal enviado €${inp(d, 'deposit', 'number')}</label></div>
      ${dl.length ? `<div class="eyebrow" style="margin-top:16px">Prazos legais</div><div class="kv">${dl.map((x) => `<div><span>${x.done ? '✓' : '⏱'} ${esc(x.label)}</span><span class="v ${!x.done && x.due < new Date().toISOString().slice(0, 10) ? 'neg' : ''}">${esc(x.due)}</span></div>`).join('')}</div>` : '<p class="small muted">Os prazos aparecem quando indicar as datas de chegada / DAV / matrícula: DAV até 20 dias úteis após a chegada, ISV em 10 dias úteis, DUA em 30 dias e registo em 60 dias.</p>'}
      ${phases.map((p) => `<div class="card checks" style="margin-top:14px"><div style="display:flex;justify-content:space-between"><div class="eyebrow">${esc(p.label)}</div><span class="small ${p.done === p.total ? 'pos' : 'muted'}">${p.done}/${p.total}</span></div>
        ${p.steps.map((st) => st.field
          ? `<div class="step-field"><span>${st.done ? '✓' : '○'} ${esc(st.label)}</span>${field(st.field)}</div>`
          : `<label><input type="checkbox" data-check="${st.key}" ${st.done ? 'checked' : ''}> <span>${esc(st.label)}${st.hint ? `<span class="small muted"> — ${esc(st.hint)}</span>` : ''}${st.supplier && s.suppliers[st.supplier] ? `<span class="small muted"> — ${esc(s.suppliers[st.supplier])}</span>` : ''}</span></label>`).join('')}</div>`).join('')}`;
  },
  sale: (d, a) => {
    const s = settings();
    const t = d.tradeIn || {};
    const tv = tradeInValuation(t, S.settings);
    const res = a.realised || a.scenarios.medium;
    const q = encodeURIComponent([d.make, d.model].filter(Boolean).join(' '));
    return `<div class="form-grid">
      <label class="f">Preço final de venda €${inp(d, 'salePrice', 'number')}</label>
      <label class="f">Outras receitas € <span class="small">(material, comissão de crédito, garantia)</span>${inp(d, 'otherIncome', 'number')}</label>
      <label class="f">Meio de venda${sel(d, 'saleChannel', [['', '—'], ['OLX', 'OLX'], ['FB', 'Facebook Marketplace'], ['Instagram', 'Instagram'], ['StandVirtual', 'StandVirtual'], ['Consignação', 'Consignação'], ['Troca', 'Troca']])}</label>
      <label class="f">Crédito${sel(d, 'saleCredit', [['', 'Sem crédito'], ['Credibom', 'Credibom'], ['Cetelem', 'Cetelem']])}</label>
      <label class="f">Garantia${sel(d, 'saleWarranty', [['', '—'], ['SNG', 'SNG'], ['GR3', 'GR3']])}</label></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><a class="btn sm" href="https://www.olx.pt/anuncio/novo/" target="_blank" rel="noopener">Publicar no OLX ↗</a><a class="btn sm" href="https://www.standvirtual.com/" target="_blank" rel="noopener">StandVirtual ↗</a><a class="btn sm" href="https://www.facebook.com/marketplace/create/vehicle" target="_blank" rel="noopener">Facebook Marketplace ↗</a><a class="btn sm" href="https://www.standvirtual.com/carros/q-${q}" target="_blank" rel="noopener">Ver concorrência ↗</a></div>
    <div class="eyebrow" style="margin-top:8px">Custos e lucros ${a.realised ? '(venda real)' : '(estimativa, cenário médio)'}</div>
    <div class="kv"><div><span>Venda${a.otherIncome ? ' + outras receitas' : ''}</span><span class="v">${eur(res ? res.sale + a.otherIncome : null)}</span></div>
      <div><span>Custos totais (viatura + processo + preparação)</span><span class="v">${eur(a.totalInvestment)}</span></div>
      <div><span><b>Lucro</b></span><span class="v ${cls(res?.profit)}">${signed(res?.profit)}</span></div>
      <div><span>${Math.round(s.cashReservePct * 100)}% para a caixa (investimento)</span><span class="v">${eur(res?.reserve)}</span></div>
      <div><span>${Math.round((1 - s.cashReservePct) * 100)}% pelos sócios ÷ ${s.partners.length}</span><span class="v ${cls(res?.perPartner)}">${eur(res?.perPartner)} cada</span></div></div>
    <div class="eyebrow" style="margin-top:18px">Retoma</div>
    <label class="chk"><input type="checkbox" data-bool="tradeIn.enabled" ${t.enabled ? 'checked' : ''}> O cliente entrega um carro como retoma</label>
    ${t.enabled ? `<div class="form-grid" style="margin-top:10px">
      <label class="f">Carro da retoma${inp(d, 'tradeIn.desc', 'text', 'placeholder="ex.: Seat Ibiza 2012, 180 000 km"')}</label>
      <label class="f">Valor médio de mercado €${inp(d, 'tradeIn.marketAvg', 'number')}</label>
      <label class="f">Valor mais baixo no StandVirtual €${inp(d, 'tradeIn.lowestSV', 'number')}</label>
      <label class="f">Revenda${sel(d, 'tradeIn.reconditioned', [['false', 'Tal como está (média −10%)'], ['true', 'Recondicionado (valor de mercado)']])}</label></div>
      ${tv ? `<div class="kv" style="margin-top:10px"><div><span>Valor a oferecer (referência −${Math.round(s.tradeIn.buyDiscount * 100)}%)</span><span class="v">${eur(tv.offer)}</span></div><div><span>Valor real para venda</span><span class="v">${eur(tv.resale)}</span></div><div><span>Margem da retoma</span><span class="v ${cls(tv.margin)}">${signed(tv.margin)}</span></div><div><span>Valor para sócios (compra ÷ ${s.partners.length})</span><span class="v">${eur(tv.perPartner)} cada</span></div></div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><a class="btn sm" href="https://www.standvirtual.com/carros/q-${encodeURIComponent(t.desc || '')}" target="_blank" rel="noopener">StandVirtual ↗</a><a class="btn sm" href="https://www.autosapo.pt/" target="_blank" rel="noopener">Auto Sapo ↗</a><button class="btn sm primary" id="mkTrade">Criar negócio para a retoma</button></div>` : '<p class="small muted">Indique o valor médio de mercado (e, se possível, o mais baixo no StandVirtual).</p>'}` : ''}`;
  },
  expenses: (d) => {
    const s = settings(); const ex = d.expenses || [];
    const total = ex.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const paid = Object.fromEntries(s.partners.map((p) => [p, ex.filter((e) => e.payer === p).reduce((a, e) => a + (Number(e.amount) || 0), 0)]));
    const share = total / s.partners.length;
    return `<p class="small muted" style="margin-top:0">Custos reais à medida que acontecem (o "Balanço de Despesas" da folha). O saldo mostra quem deve a quem para a divisão ficar igual.</p>
    <table class="t"><thead><tr><th>Despesa</th><th>Categoria</th><th>Quem pagou</th><th class="n">Montante €</th><th></th></tr></thead><tbody>
    ${ex.map((e, i) => `<tr><td><input data-path="expenses.${i}.label" value="${esc(e.label || '')}"></td><td>${sel(d, `expenses.${i}.cat`, [['trip', 'Ida'], ['purchase', 'Compra'], ['return', 'Transporte'], ['legal', 'Legalização'], ['recon', 'Preparação'], ['sale', 'Venda'], ['other', 'Outros']])}</td><td>${sel(d, `expenses.${i}.payer`, s.partners.map((p) => [p, p]))}</td><td><input type="number" step="any" data-path="expenses.${i}.amount" value="${esc(e.amount ?? '')}"></td><td><button class="btn sm danger" data-delexp="${i}">✕</button></td></tr>`).join('')}
    <tr><td colspan="5"><button class="btn sm" id="addExp">+ Adicionar despesa</button> <button class="btn sm" id="fillExp">Preencher a partir da estimativa</button></td></tr></tbody></table>
    <div class="grid cols-2" style="margin-top:14px"><div class="kv"><div><span><b>Total gasto</b></span><span class="v">${eur(total, 2)}</span></div><div><span>Estimado</span><span class="v">${eur(an(d).totalInvestment)}</span></div><div><span>Parte de cada sócio</span><span class="v">${eur(share, 2)}</span></div></div>
    <div class="kv">${s.partners.map((p) => `<div><span>${esc(p)} pagou ${eur(paid[p], 2)}</span><span class="v ${cls(paid[p] - share)}">${paid[p] - share >= 0 ? 'recebe' : 'deve'} ${eur(Math.abs(paid[p] - share), 2)}</span></div>`).join('')}</div></div>`;
  },
};

function bindModal(d) {
  const body = $('#modalBody');
  $('#mClose').onclick = () => closeModal();
  body.querySelectorAll('[data-img]').forEach((b) => (b.onclick = () => { S.modalImg = Number(b.dataset.img); drawModal(d); }));
  body.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { S.modalTab = b.dataset.tab; drawModal(d); }));
  const commit = async () => { try { const saved = await saveDeal(d); drawModal(saved); } catch (e) { toast(e.message); } };
  body.querySelectorAll('[data-path]').forEach((el) => el.addEventListener('change', () => {
    let v = el.value;
    if (el.type === 'number') v = v === '' ? null : Number(v);
    if (v === 'true') v = true; else if (v === 'false') v = false;
    if (el.dataset.path === 'quality') v = Number(v);
    if (el.dataset.path === 'firstRegistration' && v) d.year = Number(String(v).slice(0, 4));
    if (['cc', 'co2'].includes(el.dataset.path)) { d[`${el.dataset.path}Manual`] = true; if (el.dataset.path === 'cc') d.ccEstimated = false; }
    setPath(d, el.dataset.path, v === '' ? null : v);
    commit();
  }));
  body.querySelectorAll('[data-bool]').forEach((el) => el.addEventListener('change', () => { setPath(d, el.dataset.bool, el.checked); commit(); }));
  const mk = $('#mkTrade'); if (mk) mk.onclick = async () => {
    const t = d.tradeIn; const tv = tradeInValuation(t, S.settings);
    const saved = await api('api/deals', { method: 'POST', body: { source: 'manual', title: t.desc || 'Retoma', country: 'PT', price: tv.offer, sellerType: 'private', status: 'bought', market: { comps: [], target: tv.resale }, notes: `Retoma de: ${title(d)}` } });
    d.checklist = { ...(d.checklist || {}), s_tradein: true }; await saveDeal(d); await refresh(); location.hash = `#/deal/${saved.id}`;
  };
  body.querySelectorAll('[data-check]').forEach((el) => el.addEventListener('change', () => { d.checklist = { ...(d.checklist || {}), [el.dataset.check]: el.checked }; commit(); }));
  const addComp = $('#addComp'); if (addComp) addComp.onclick = () => { d.market = d.market || {}; d.market.comps = [...(d.market.comps || []), { url: '', price: null }]; commit(); };
  body.querySelectorAll('[data-delcomp]').forEach((b) => (b.onclick = () => { d.market.comps.splice(Number(b.dataset.delcomp), 1); commit(); }));
  const addExp = $('#addExp'); if (addExp) addExp.onclick = () => { d.expenses = [...(d.expenses || []), { label: '', cat: 'other', payer: settings().partners[0], amount: null }]; commit(); };
  const fillExp = $('#fillExp'); if (fillExp) fillExp.onclick = () => { const a = an(d); const p = settings().partners[0]; d.expenses = [...(d.expenses || []), { label: 'Carro', cat: 'purchase', payer: p, amount: a.price }, ...a.groups.flatMap((g) => g.items.filter((i) => i.amount).map((i) => ({ label: i.label, cat: g.key, payer: p, amount: Math.round(i.amount * 100) / 100 })))]; commit(); };
  body.querySelectorAll('[data-delexp]').forEach((b) => (b.onclick = () => { d.expenses.splice(Number(b.dataset.delexp), 1); commit(); }));
  $('#mFav').onclick = () => { d.favorite = !d.favorite; commit(); };
  $('#mDel').onclick = async () => { if (!confirm('Eliminar este negócio?')) return; await api(`api/deals/${d.id}`, { method: 'DELETE' }); S.deals = S.deals.filter((x) => x.id !== d.id); closeModal(); };
}

// ---------- compare (step 3) ----------
function viewCompare() {
  const s = settings();
  const list = S.deals.filter((d) => S.compare.has(d.id));
  if (list.length < 2) { $('#view').innerHTML = `<div class="empty">Escolha pelo menos 2 carros com “comparar” na página <a href="#/deals">Negócios</a>. A folha de cálculo recomenda no mínimo 5 potenciais carros.</div>`; return; }
  const scores = scoreDeals(list, S.settings);
  const rows = list.map((d) => ({ d, a: an(d), sc: scores.find((x) => x.id === d.id) })).sort((x, y) => y.sc.score - x.sc.score);
  const w = s.weights;
  $('#view').innerHTML = `
    <p class="muted" style="margin-top:0">Passo 3: cada critério é pontuado de 1 (melhor) a 5 (pior) entre estes carros; pontuação = Σ peso ÷ nota, logo 100% é o melhor em tudo. Pesos: idade ${w.age * 100}%, local ${w.location * 100}%, qualidade ${w.quality * 100}%, km ${w.km * 100}%, preço ${w.price * 100}% (altere nas Definições). A qualidade é a nota de 1 a 5 que dá a cada carro.</p>
    <div style="overflow-x:auto"><table class="t"><thead><tr><th>Carro</th><th class="n">Idade</th><th class="n">Local</th><th class="n">Qualidade</th><th class="n">Km</th><th class="n">Preço</th><th class="n">Pontuação</th><th class="n">Lucro líquido</th><th></th></tr></thead><tbody>
    ${rows.map(({ d, a, sc }, i) => `<tr><td>${i === 0 ? '<span class="badge ok">Escolha principal</span> ' : ''}<a href="#/deal/${d.id}">${esc(title(d))}</a><div class="small muted">${flag(d.country)}${esc(d.city || '')} · ${esc(d.year || '')} · ${d.km ? nf.format(d.km) + ' km' : ''} · ${eur(a.price)}</div></td>
      ${['age', 'location', 'quality', 'km', 'price'].map((k) => `<td class="n">${sc.ranks[k]}</td>`).join('')}<td class="n"><b>${(sc.score * 100).toFixed(0)}%</b></td><td class="n ${cls(a.netProfit)}">${signed(a.netProfit)}</td>
      <td><button class="btn sm" data-uncmp="${d.id}">Remover</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#view').querySelectorAll('[data-uncmp]').forEach((b) => (b.onclick = () => { S.compare.delete(b.dataset.uncmp); keep('compare', [...S.compare]); viewCompare(); }));
}

// ---------- pipeline ----------
function viewPipeline() {
  const cols = STATUSES.filter(([k]) => k !== 'rejected');
  $('#view').innerHTML = `<div class="kanban">${cols.map(([k, l]) => {
    const items = S.deals.filter((d) => d.status === k);
    return `<div class="col"><h3><span>${l}</span><span>${items.length}</span></h3>${items.slice(0, 60).map((d) => { const a = an(d); return `<div class="kcard" data-k="${d.id}"><b>${esc(title(d))}</b><div class="small muted">${flag(d.country)}${esc(d.year || '')} · ${eur(a.price)}</div><div class="small ${cls(a.realised?.profit ?? a.netProfit)}">${signed(a.realised?.profit ?? a.netProfit)}</div>${(() => { const pr = progressOf(d); return `${progressBar(pr)}<div class="small muted">${pr.next ? `→ ${esc(pr.next.label)}` : 'Concluído ✓'}</div>`; })()}${deadlinesFor(d).filter((x) => !x.done).slice(0, 1).map((x) => `<div class="small warn">⏱ ${esc(x.label)} · ${esc(x.due)}</div>`).join('')}</div>`; }).join('')}</div>`;
  }).join('')}</div>`;
  $('#view').querySelectorAll('[data-k]').forEach((el) => (el.onclick = () => { S.modalFor = el.dataset.k; S.modalTab = 'pipeline'; S.modalImg = 0; location.hash = `#/deal/${el.dataset.k}`; }));
}

// ---------- ledger ----------
function viewLedger() {
  const s = settings();
  const cars = S.deals.filter((d) => ACTIVE.includes(d.status) || d.status === 'sold');
  const rows = cars.map((d) => { const a = an(d); const spent = (d.expenses || []).reduce((x, e) => x + (Number(e.amount) || 0), 0); const profit = d.salePrice ? d.salePrice - (spent || a.totalInvestment) : null; return { d, a, spent, profit }; });
  const tot = rows.reduce((x, r) => x + (r.profit || 0), 0);
  const cap = capitalPosition(S.deals, S.settings);
  const reserve = tot > 0 ? Math.round(tot * s.cashReservePct) : 0;
  const paid = Object.fromEntries(s.partners.map((p) => [p, cars.reduce((x, d) => x + (d.expenses || []).filter((e) => e.payer === p).reduce((y, e) => y + (Number(e.amount) || 0), 0), 0)]));
  const all = Object.values(paid).reduce((a, b) => a + b, 0);
  $('#view').innerHTML = `
    <div class="grid cols-4"><div class="card kpi"><div class="lbl">Carros comprados</div><div class="val">${cars.length}</div></div><div class="card kpi"><div class="lbl">Total gasto</div><div class="val">${eur(all)}</div></div><div class="card kpi"><div class="lbl">Lucro realizado</div><div class="val ${cls(tot)}">${signed(tot)}</div></div><div class="card kpi"><div class="lbl">Por sócio (${Math.round((1 - s.cashReservePct) * 100)}% ÷ ${s.partners.length})</div><div class="val ${cls(tot)}">${signed(Math.round((tot - reserve) / s.partners.length))}</div></div></div>
    <div class="grid cols-3" style="margin-top:16px"><div class="card kpi"><div class="lbl">Caixa (${Math.round(s.cashReservePct * 100)}% dos lucros)</div><div class="val">${eur(reserve)}</div></div><div class="card kpi"><div class="lbl">Capital empatado em carros</div><div class="val">${eur(cap.invested)}</div></div><div class="card kpi"><div class="lbl">Capital disponível</div><div class="val ${cls(cap.available)}">${eur(cap.available)}</div></div></div>
    <div class="sec-h"><h3>Por carro</h3></div>
    <table class="t"><thead><tr><th>Carro</th><th>Estado</th><th class="n">Custo estimado</th><th class="n">Gasto real</th><th class="n">Venda</th><th class="n">Lucro</th><th class="n">%</th></tr></thead><tbody>
    ${rows.map(({ d, a, spent, profit }) => `<tr><td><a href="#/deal/${d.id}">${esc(title(d))}</a></td><td>${esc(STATUS[d.status])}</td><td class="n">${eur(a.totalInvestment)}</td><td class="n">${spent ? eur(spent) : '—'}</td><td class="n">${eur(d.salePrice)}</td><td class="n ${cls(profit)}">${signed(profit)}</td><td class="n">${profit != null ? pct(profit / (spent || a.totalInvestment)) : '—'}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Ainda não há carros comprados.</td></tr>'}</tbody></table>
    <div class="sec-h"><h3>Saldo entre sócios (todos os carros)</h3></div>
    <div class="kv">${s.partners.map((p) => `<div><span>${esc(p)} pagou ${eur(paid[p], 2)}</span><span class="v ${cls(paid[p] - all / s.partners.length)}">${paid[p] - all / s.partners.length >= 0 ? 'recebe' : 'deve'} ${eur(Math.abs(paid[p] - all / s.partners.length), 2)}</span></div>`).join('')}</div>`;
}

// ---------- calculator ----------
function viewCalculator() {
  const c = { cc: 1968, co2: 119, fuel: 'diesel', co2Standard: 'NEDC', firstRegistration: '', price: 15000, market: 20000, country: 'FR', km: 120000, dieselParticles: false, ...load('calc', {}) };
  $('#view').innerHTML = `<div class="grid cols-2"><div class="card"><h3>Carro</h3><div class="form-grid">
      <label class="f">Cilindrada cm³<input id="c_cc" type="number" value="${esc(c.cc)}"></label><label class="f">CO2 g/km<input id="c_co2" type="number" value="${esc(c.co2)}"></label>
      <label class="f">Combustível<select id="c_fuel">${Object.entries(FUELS).map(([k, v]) => `<option value="${k}" ${c.fuel === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f">Norma<select id="c_co2Standard">${['NEDC', 'WLTP'].map((k) => `<option ${c.co2Standard === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="f">1.ª matrícula<input id="c_firstRegistration" type="month" value="${esc(c.firstRegistration)}"></label>
      <label class="f">Partículas (gasóleo)<select id="c_dieselParticles"><option value="false">Não / com FAP</option><option value="true" ${c.dieselParticles === 'true' ? 'selected' : ''}>Sim / desconhecido (+500 €)</option></select></label>
      <label class="f">Preço no estrangeiro €<input id="c_price" type="number" value="${esc(c.price)}"></label><label class="f">Preço de venda PT €<input id="c_market" type="number" value="${esc(c.market)}"></label>
      <label class="f">País<select id="c_country">${Object.entries(COUNTRIES).map(([k, v]) => `<option value="${k}" ${c.country === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="f">Km<input id="c_km" type="number" value="${esc(c.km)}"></label>
    </div><button class="btn" id="c_save" style="margin-top:12px">Guardar como negócio</button></div><div id="c_out"></div></div>`;
  const draw = () => {
    for (const k of Object.keys(c)) { const el = $(`#c_${k}`); if (el) c[k] = el.value; }
    keep('calc', c);
    const deal = { cc: +c.cc, co2: +c.co2, fuel: c.fuel, co2Standard: c.co2Standard, firstRegistration: c.firstRegistration || null, dieselParticles: c.dieselParticles === 'true', price: +c.price, country: c.country, km: +c.km, market: { target: +c.market, low: +c.market, high: +c.market } };
    const isv = computeISV({ ...deal, standard: deal.co2Standard }); const iuc = computeIUC({ ...deal, standard: deal.co2Standard }); const a = analyzeDeal(deal, S.settings);
    $('#c_out').innerHTML = `<div class="kv"><div class="grp"><span>ISV</span><span>${eur(isv.total, 2)}</span></div>
      <div><span>Componente cilindrada</span><span class="v">${eur(isv.cc, 2)}</span></div><div><span>Componente ambiental (${esc(isv.standard)})</span><span class="v">${eur(isv.co2, 2)}</span></div>
      <div><span>Desconto por idade (${isv.months ?? '?'} meses)</span><span class="v">−${Math.round(isv.discount * 100)}%</span></div>${isv.particles ? '<div><span>Agravamento partículas</span><span class="v">+500 €</span></div>' : ''}
      <div class="grp"><span>IUC por ano</span><span>${eur(iuc.total, 2)}</span></div>
      ${a.groups.map((g) => `<div><span>${esc(g.label)}</span><span class="v">${eur(g.total)}</span></div>`).join('')}
      <div class="grp"><span>Total posto em PT</span><span>${eur(a.totalInvestment)}</span></div></div>
      <div class="profit-card"><div class="lbl">Lucro líquido</div><div class="big">${signed(a.netProfit)} <span style="font-size:16px;color:#4ade80">${pct(a.margin)}</span></div></div>
      ${[...isv.notes, ...iuc.notes].length ? `<ul class="ul small muted">${[...isv.notes, ...iuc.notes].map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
  };
  $('#view').querySelectorAll('input,select').forEach((el) => el.addEventListener('input', draw));
  $('#c_save').onclick = async () => { const saved = await api('api/deals', { method: 'POST', body: { source: 'manual', title: 'Carro da calculadora', cc: +c.cc, co2: +c.co2, fuel: c.fuel, co2Standard: c.co2Standard, firstRegistration: c.firstRegistration || null, year: c.firstRegistration ? +c.firstRegistration.slice(0, 4) : null, price: +c.price, country: c.country, km: +c.km, market: { comps: [], target: +c.market }, sellerType: 'pro' } }); await refresh(); location.hash = `#/deal/${saved.id}`; };
  draw();
}

// ---------- settings ----------
function viewSettings() {
  const s = settings();
  const f = (path, label, type = 'number') => `<label class="f">${label}<input data-s="${path}" type="${type}" step="any" value="${esc(getPath(s, path))}"></label>`;
  $('#view').innerHTML = `
    <div class="grid cols-2">
      <div class="card"><h3>Geral</h3><div class="form-grid">
        ${f('homeBase.name', 'Base (destino)', 'text')}${f('homeBase.lat', 'Latitude')}${f('homeBase.lng', 'Longitude')}
        ${f('fuelPrice', 'Combustível €/l')}${f('roadFactor', 'Km estrada ÷ km em linha reta')}${f('kmPerDay', 'Km por dia de condução')}${f('nightCost', 'Dormida €')}${f('minProfit', 'Lucro mínimo que compensa €')}
        ${f('capital', 'Capital inicial a investir €')}${f('cashReservePct', 'Parte do lucro para a caixa (0,2 = 20%)')}${f('acquisition.budgetMin', 'Viatura: preço mín. €')}${f('acquisition.budgetMax', 'Viatura: preço máx. €')}${f('acquisition.zone', 'Zona de compra', 'text')}
        ${f('tradeIn.buyDiscount', 'Retoma: desconto na compra (0,3 = 30%)')}${f('tradeIn.resaleDiscount', 'Retoma: desconto na revenda (0,1 = 10%)')}
        <label class="f">Sócios (separados por vírgulas)<input data-s="partners" type="text" value="${esc(s.partners.join(', '))}"></label></div>
        <div class="eyebrow" style="margin-top:14px">Consumo l/100 km</div><div class="form-grid">${Object.keys(s.consumption).map((k) => f(`consumption.${k}`, FUELS[k] || k)).join('')}</div></div>
      <div class="card"><h3>Custos por omissão</h3><div class="form-grid">
        ${f('purchase.tempInsurance', 'Seguro temporário')}${f('purchase.coc', 'COC')}${f('purchase.historyCheck', 'Relatório de histórico')}
        ${f('legal.inspection', 'Inspeção')}${f('legal.homologation', 'Homologação')}${f('legal.plates', 'Chapas de matrícula')}${f('legal.registration', 'Registo')}${f('legal.agency', 'Agência')}
        ${f('legal.imt', 'IMT (documentos)')}${f('legal.transfer', 'Transferência (carro nacional)')}${f('transport.roadExtras', 'Extras de viagem (estrada)')}${f('transport.truckTip', 'Gratificação transportadora')}
        ${f('recon.mechanic', 'Mecânica')}${f('recon.bodywork', 'Chapa e pintura')}${f('recon.parts', 'Peças')}${f('recon.extras', 'Extras')}${f('sale.ads', 'Anúncios')}${f('sale.warranty', 'Garantia')}</div>
        <div class="eyebrow" style="margin-top:14px">Fornecedores (preparação)</div><div class="form-grid">${f('suppliers.mechanic', 'Mecânica', 'text')}${f('suppliers.bodywork', 'Chapa e pintura', 'text')}${f('suppliers.parts', 'Peças', 'text')}${f('suppliers.extras', 'Extras', 'text')}</div>
        <div class="eyebrow" style="margin-top:14px">Alvos (passo 1)</div><div class="form-grid">${f('targets.minAgeYears', 'Idade mín. (anos)')}${f('targets.maxAgeYears', 'Idade máx. (anos)')}${f('targets.maxCc', 'Cilindrada máx. cm³')}${f('targets.maxCo2', 'CO2 máx. g/km')}</div>
        <div class="eyebrow" style="margin-top:14px">Pesos da pontuação (passo 3)</div><div class="form-grid">${Object.keys(s.weights).map((k) => f(`weights.${k}`, { age: 'Idade', location: 'Local', quality: 'Qualidade', km: 'Km', price: 'Preço' }[k] || k)).join('')}</div></div>
      <div class="card" style="grid-column:1/-1"><h3>Por país</h3><div style="overflow-x:auto"><table class="t"><thead><tr><th>País</th><th class="n">Voos €</th><th class="n">Deslocações €</th><th class="n">Km por omissão</th><th class="n">Portagens €/km</th><th class="n">Matrícula temp. €</th><th class="n">Transportadora €</th></tr></thead><tbody>
        ${Object.entries(s.countries).map(([k, c]) => `<tr><td>${flag(k)} ${esc(c.name)}</td>${['flight', 'localTransport', 'defaultKm', 'tollPerKm', 'tempPlates', 'truck'].map((x) => `<td><input data-s="countries.${k}.${x}" type="number" step="any" value="${esc(c[x])}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h3>Cópia de segurança</h3><p class="muted small">Descarregue todos os negócios e definições em JSON, ou reponha uma cópia (substitui os dados atuais; fica guardada uma cópia dos dados atuais no servidor).</p>
        <a class="btn" href="api/export">⇣ Descarregar cópia</a> <label class="btn">⇡ Repor<input type="file" id="restore" accept=".json" hidden></label> <button class="btn danger" id="reset">Repor definições de origem</button></div>
    </div>`;
  $('#view').querySelectorAll('[data-s]').forEach((el) => el.addEventListener('change', async () => {
    const next = mergeSettings(S.settings);
    let v = el.value;
    if (el.dataset.s === 'partners') v = v.split(',').map((x) => x.trim()).filter(Boolean);
    else if (el.type === 'number') v = Number(v);
    setPath(next, el.dataset.s, v);
    S.settings = await api('api/settings', { method: 'PUT', body: next }); S.settingsVer = (S.settingsVer || 0) + 1; toast('Guardado');
  }));
  $('#reset').onclick = async () => { if (!confirm('Repor todas as definições?')) return; S.settings = await api('api/settings', { method: 'PUT', body: structuredClone(DEFAULT_SETTINGS) }); S.settingsVer = (S.settingsVer || 0) + 1; viewSettings(); };
  $('#restore').onchange = async (e) => { const file = e.target.files[0]; if (!file) return; try { const r = await api('api/restore', { method: 'POST', body: await file.text() }); await refresh(); toast(`Repostos ${r.deals} negócios`); } catch (err) { toast(err.message); } };
}

// ---------- boot ----------
refresh().then(render).catch((e) => { if (e.message !== 'login') $('#view').innerHTML = `<div class="empty">Não foi possível carregar os dados: ${esc(e.message)}</div>`; });
