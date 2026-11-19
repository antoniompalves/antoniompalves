/* Portal do cliente — site da oficina: catálogo, história PPF, pedidos de marcação e área pessoal. */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EUR0 = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const money = v => v === null || v === undefined || v === '' ? '—' : (Number.isInteger(+v) ? EUR0 : EUR).format(+v);
const fdate = d => d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—';
const IC = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>', calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  car: '<path d="M5 17h14M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M3 17v-5l2-5h14l2 5v5"/><path d="M3 12h18"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  home: '<path d="M3 11 12 3l9 8v10H3z"/><path d="M9 21v-6h6v6"/>', arrow: '<path d="M7 17 17 7M8 7h9v9"/>', phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.7 2.7-1.8 3.4a16 16 0 0 0 6 6l3.4-1.8 2.7.7a2 2 0 0 1 1.7 2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>', wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1-1 1.8.8-.4 1.6c-3.5 0-7-3.5-7-7l1.6-.4.8 1.8z"/>',
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
const P = { info: {}, svcs: [], me: null, t: null, stats: {} };
const HUES = { 'Lavagem': '#f87171', 'Exterior': '#ef4444', 'Interior': '#fb923c', 'Completo': '#dc2626', 'Correção de pintura': '#f43f5e', 'Proteção cerâmica': '#e11d48', 'PPF': '#fca5a5', 'Restauro': '#b91c1c', 'Manutenção': '#f97316' };
const STAGES = ['Agendado', 'Check-in', 'Lavagem', 'Interior', 'Correção / Proteção', 'Controlo de qualidade', 'Pronto', 'Concluído'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

async function api(a, params = {}, body = null) {
  const r = await fetch('api.php?' + new URLSearchParams({ a, ...params }), body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({ error: 'Erro de comunicação.' }));
  if (j.error) throw new Error(j.error);
  return j;
}
function toast(msg, err) {
  let w = $('.toast-w'); if (!w) { w = document.createElement('div'); w.className = 'toast-w'; document.body.appendChild(w); }
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; w.appendChild(t); setTimeout(() => t.remove(), 5000);
}
const fromPrice = s => { const v = s.precos ? Object.values(s.precos).map(Number).filter(x => x > 0) : []; return v.length ? Math.min(...v) : null; };
const dur = s => s.duracao_txt || (s.duracao_h ? (s.duracao_h >= 8 ? `${Math.ceil(s.duracao_h / 8)} dia${s.duracao_h > 8 ? 's' : ''}` : `${String(+s.duracao_h).replace('.', ',')} h`) : '—');
const pubImg = f => `api.php?a=pub_file&f=${encodeURIComponent(f)}`;
const art = (s, i = 0) => s.fotos?.[0] ? `<img src="${pubImg(s.fotos[0])}" alt="${esc(s.nome)}" loading="lazy">`
  : `<div class="art" style="--hue:${HUES[s.categoria] || 'var(--ac)'};--rot:${[-14, -8, -20, 6][i % 4]}deg"></div>`;
const photo = f => `api.php?a=portal_file&t=${P.t}&f=${encodeURIComponent(f)}`;
function lightbox(src) { const d = document.createElement('div'); d.className = 'lightbox'; d.innerHTML = `<img src="${src}">`; d.onclick = () => d.remove(); document.body.appendChild(d); }
const nn = i => String(i + 1).padStart(2, '0');
const priceTxt = s => fromPrice(s) ? 'Desde ' + money(fromPrice(s)) : 'Por orçamento';

/* ---------- Ilustração vetorial do carro (sem imagens de terceiros) ---------- */
let CAR_N = 0;
function carSVG(mode = 'gloss', extra = '') {
  const k = 'c' + (++CAR_N);
  const body = 'M70 300 Q72 262 130 250 L340 214 Q450 128 610 116 Q760 110 880 178 L1010 206 Q1105 222 1128 262 Q1140 292 1118 308 L1040 314 A92 92 0 0 0 860 314 L380 314 A92 92 0 0 0 200 314 L96 312 Q72 310 70 300 Z';
  const paint = { gloss: ['#2a2c31', '#07080a'], satin: ['#3a3c41', '#1c1d21'], swirl: ['#33353a', '#121316'], dark: ['#1b1c20', '#050506'] }[mode] || ['#2a2c31', '#07080a'];
  const wheel = (cx) => `<g transform="translate(${cx} 314)"><circle r="80" fill="#0a0a0b"/><circle r="62" fill="#121315" stroke="#2b2d31" stroke-width="3"/>
    ${[0, 72, 144, 216, 288].map(a => `<rect x="-6" y="-58" width="12" height="50" rx="5" fill="${mode === 'satin' ? '#2a2b2f' : '#3a3c42'}" transform="rotate(${a})"/>`).join('')}<circle r="14" fill="#2c2e33"/><circle r="5" fill="#0b0b0c"/></g>`;
  return `<svg class="car ${mode}" viewBox="0 0 1200 420" role="img" aria-label="Automóvel">
    <defs><linearGradient id="${k}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paint[0]}"/><stop offset=".55" stop-color="${paint[1]}"/><stop offset="1" stop-color="#000"/></linearGradient>
      <linearGradient id="${k}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4048"/><stop offset="1" stop-color="#0b0c0f"/></linearGradient>
      <linearGradient id="${k}h" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${mode === 'gloss' ? .55 : mode === 'swirl' ? .22 : .12}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="${k}c"><path d="${body}"/></clipPath><radialGradient id="${k}s"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="600" cy="392" rx="560" ry="26" fill="url(#${k}s)"/>
    <path d="${body}" fill="url(#${k}p)"/>
    <g clip-path="url(#${k}c)">
      <path d="M400 212 Q480 146 610 136 Q720 132 820 180 L800 202 L420 216 Z" fill="url(#${k}g)"/><path d="M640 134 L634 210" stroke="#050506" stroke-width="10"/>
      <rect x="60" y="232" width="1100" height="${mode === 'gloss' ? 7 : 12}" fill="url(#${k}h)" transform="rotate(-1.6 600 236)"/>
      ${mode === 'gloss' ? `<rect x="300" y="268" width="760" height="4" fill="url(#${k}h)" opacity=".8"/><path d="M470 150 Q560 128 700 128" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none"/>` : ''}
      ${mode === 'swirl' ? Array.from({ length: 26 }, (_, i) => `<circle cx="${180 + (i * 137) % 860}" cy="${200 + (i * 53) % 100}" r="${18 + (i * 7) % 26}" fill="none" stroke="#fff" stroke-opacity=".09" stroke-width="1.2"/>`).join('') : ''}
      <path d="M330 300 L1000 300" stroke="#000" stroke-opacity=".5" stroke-width="3"/><path d="M560 222 L566 296" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
      ${extra}</g>
    <path d="M74 268 L132 258 L134 272 L76 282 Z" class="tail" fill="#7f1d1d"/><path d="M1062 236 L1118 252 L1112 262 L1058 246 Z" class="head" fill="#e5e7eb"/>
    ${wheel(290)}${wheel(950)}</svg>`;
}

/* ---------- Componentes ---------- */
function svcCard(s, i) {
  return `<a class="svc" href="#/servico/${s.id}"><div class="img">${art(s, i)}<span class="price">${priceTxt(s)}</span><span class="go">↗</span></div>
    <h3>${esc(s.nome)}</h3><p>${esc(s.slogan || s.categoria || '')}</p></a>`;
}
function railCard(s, i) {
  return `<a class="rail-c" href="#/servico/${s.id}">${art(s, i)}<span class="no">${nn(i)}</span><span class="go">↗</span>
    <div class="rail-t"><h3 class="disp">${esc(s.nome)}</h3><p>${esc(s.slogan || s.resultado || s.categoria || '')}</p><div class="chips"><span class="chip-r">${priceTxt(s)}</span><span class="chip-d">${esc(dur(s))}</span></div></div></a>`;
}
function extrasList(list) {
  return `<div class="extras">${list.map(s => `<a class="extra" href="#/servico/${s.id}"><span class="t">${esc(s.nome)}</span><span class="v">${fromPrice(s) ? (s.tipo === 'Extra' ? '+ ' : '') + 'desde ' + money(fromPrice(s)) : 'por orçamento'}</span></a>`).join('')}</div>`;
}
function menuList(list) {
  return `<div class="menu">${list.map((s, i) => `<a class="menu-i" href="#/servico/${s.id}"><span class="no">${nn(i)}</span><span class="t disp">${esc(s.nome)}</span><span class="d">${esc(dur(s))}</span><span class="v">${priceTxt(s)}</span></a>`).join('')}</div>`;
}
function marquee() {
  const cats = [...new Set(P.svcs.filter(s => s.tipo !== 'Extra').map(s => s.categoria).filter(Boolean))];
  const row = (cats.length ? cats : ['Detailing', 'Correção de pintura', 'Proteção cerâmica', 'PPF']).map(c => `<span>${esc(c)}</span><i>✦</i>`).join('');
  return `<div class="marq" aria-hidden="true"><div class="marq-in">${row}${row}${row}</div></div>`;
}
function baSlider() {
  const ad = P.stats.ad;
  const a = ad ? `<img src="${pubImg(ad.antes)}" alt="Antes">` : `<div class="ba-art">${carSVG('swirl')}</div>`;
  const d = ad ? `<img src="${pubImg(ad.depois)}" alt="Depois">` : `<div class="ba-art">${carSVG('gloss')}</div>`;
  return `<div class="ba" id="ba" style="--x:50%"><div class="ba-l">${a}</div><div class="ba-r">${d}</div><div class="ba-h"><span>⟷</span></div>
    <span class="ba-tag l">● Antes</span><span class="ba-tag r">● Depois</span></div>${ad?.titulo ? `<div class="lbl" style="margin-top:12px;text-align:center">${esc(ad.titulo)}</div>` : ''}`;
}
function bindBA(v) {
  const el = $('#ba', v); if (!el) return;
  const set = x => { const r = el.getBoundingClientRect(); el.style.setProperty('--x', Math.max(2, Math.min(98, (x - r.left) / r.width * 100)) + '%'); };
  let drag = false;
  el.addEventListener('pointerdown', e => { drag = true; el.setPointerCapture(e.pointerId); set(e.clientX); });
  el.addEventListener('pointermove', e => { if (drag) set(e.clientX); });
  el.addEventListener('pointerup', () => { drag = false; });
  // revela com o scroll enquanto o utilizador não arrasta
  const onS = () => { if (drag || !el.isConnected) return; const r = el.getBoundingClientRect(), p = 1 - (r.top + r.height / 2) / innerHeight; el.style.setProperty('--x', Math.max(8, Math.min(92, 100 - p * 100)) + '%'); };
  addEventListener('scroll', onS, { passive: true }); onS();
}
function faqHTML() {
  const L = String(P.info.portal_faq || '').split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[0] && x[1]);
  if (!L.length) return '';
  return `<section class="p-sec" id="faq"><div class="faq-h glass"><div><div class="lbl">/ Perguntas frequentes</div><h2 class="disp">Bom <em>saber</em></h2><div class="lbl" style="margin-top:10px">Um pouco mais de clareza. Muito mais cuidado.</div></div>${carSVG('gloss')}</div>
    <div class="faq">${L.map(([q, a], i) => `<details ${i ? '' : 'open'}><summary><span class="no">${nn(i)} /</span><span class="q disp">${esc(q)}</span><span class="pm">${icon('plus')}</span></summary><p>${esc(a)}</p></details>`).join('')}</div></section>`;
}
function quickForm(title = true) {
  return `<section class="p-sec cta-card"><div>${title ? `<h2 class="disp">Pronto para dar ao seu carro <em>o acabamento</em> que merece?</h2>` : ''}</div>
    <form id="qf" class="qf"><label><span>[ O seu nome ]</span><input name="nome" required autocomplete="name" placeholder="Nome"></label><label><span>[ Telemóvel ]</span><input name="telefone" type="tel" required autocomplete="tel" placeholder="9xx xxx xxx"></label>
      <label><span>[ Marca e modelo ]</span><input name="veiculo" placeholder="Ex.: Porsche 911 (996)"></label><input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <label class="rg"><input type="checkbox" name="rgpd" required> <span>Autorizo o contacto sobre este pedido (RGPD).</span></label><button class="pill dark" type="submit">${icon('sparkle')} Pedir marcação</button></form></section>`;
}
function bindQuick(v) {
  const f = $('#qf', v); if (!f) return;
  f.onsubmit = async ev => { ev.preventDefault(); const b = Object.fromEntries(new FormData(f)); b.rgpd = b.rgpd ? 1 : 0; b.servicos = []; b.notas = 'Pedido rápido do site.';
    try { await api('pub_request', {}, b); f.innerHTML = `<p class="disp" style="font-size:34px;color:#111">Obrigado! Ligamos-lhe em breve.</p>`; } catch (e) { toast(e.message, true); } };
}
function wordmark(cls = '') { const n = (P.info.empresa_nome || 'Detailing').toUpperCase(); return `<div class="wm ${cls}" style="--len:${Math.max(5, n.length)}">${esc(n)}</div>`; }

/* ---------- Páginas ---------- */
function pgHome(v) {
  const I = P.info, ST = P.stats, pk = P.svcs.filter(s => s.tipo !== 'Extra'), ex = P.svcs.filter(s => s.tipo === 'Extra');
  const feat = (pk.filter(s => s.destaque).length ? pk.filter(s => s.destaque) : pk).slice(0, 6);
  const heroImg = feat.find(s => s.fotos?.length);
  const yrs = +I.empresa_desde ? new Date().getFullYear() - +I.empresa_desde : null;
  const ppf = pk.find(s => s.categoria === 'PPF');
  const pick = c => pk.find(s => s.categoria === c)?.id;
  const byName = re => pk.find(s => re.test(s.nome))?.id;
  const heroIds = [...new Set([byName(/supreme|detalhe completo|full/i) || pick('Completo'), byName(/cer[âa]mic/i) || pick('Proteção cerâmica'), pick('Correção de pintura'), pick('Lavagem')].filter(Boolean))].slice(0, 3);
  v.innerHTML = `<div class="p-wrap">
    </div>${heroStory(heroIds)}<div class="p-wrap">
    <section class="strip"><div class="stats">${ST.trabalhos ? `<div class="stat glass"><b class="disp">${ST.trabalhos}+</b><span class="lbl">Carros tratados</span></div>` : ''}${ST.garantia_anos ? `<div class="stat glass"><b class="disp">${ST.garantia_anos} anos</b><span class="lbl">Garantia cerâmica</span></div>` : ''}${ST.rating ? `<div class="stat glass"><b class="disp">${String(ST.rating).replace('.', ',')}★</b><span class="lbl">${ST.n_rating} avaliações</span></div>` : ''}</div>
      <div class="hero2-cta"><a class="pill solid" href="#/marcar">${icon('sparkle')} Pedir marcação</a>${ST.proxima_vaga ? `<span class="lbl">Próxima vaga: ${esc(ST.proxima_vaga.l)}</span>` : ''}</div></section>
    <section class="studio"><div class="studio-img">${heroImg?.fotos?.[1] ? `<img src="${pubImg(heroImg.fotos[1])}" alt="">` : carSVG('satin')}</div>
      <div class="studio-t"><div class="row lbl" style="justify-content:space-between"><span>/ A oficina</span><span>O brilho ↘</span></div>
        <h2 class="disp">${esc((I.portal_titulo || 'Cada detalhe conta').split(' ').slice(0, -2).join(' '))} <em>${esc((I.portal_titulo || 'Cada detalhe conta').split(' ').slice(-2).join(' '))}</em></h2>
        <p>${esc(I.portal_texto || '')}</p><div class="row lbl" style="justify-content:space-between;margin-top:auto"><span>${esc(I.portal_horario || '')}</span><a class="dot-go" href="#/servicos">↗</a></div></div></section>
    <section class="p-sec" style="border:0"><div class="p-sec-h"><h2 class="disp">Serviços</h2><a class="pill" href="#/servicos">${icon('sparkle')} Ver todos</a></div>
      <div class="rail">${feat.map(railCard).join('')}</div></section></div>
    ${marquee()}
    <div class="p-wrap">
    </div>${ppf && I.portal_ppf !== '0' ? `<div class="p-wrap"><div class="p-sec-h" style="margin:60px 0 0"><div><div class="lbl">/ Proteção de pintura · PPF</div><h2 class="disp" style="margin-top:8px">${esc(ppf.nome)}</h2></div><a class="pill" href="#/servico/${ppf.id}">Saber mais ↗</a></div></div>${ppfStory(ppf)}` : ''}<div class="p-wrap">
    <section class="p-sec"><div class="p-sec-h"><div><div class="lbl">/ Antes & depois</div><h2 class="disp" style="margin-top:8px">A transformação</h2></div><span class="lbl">Arraste para comparar</span></div>${baSlider()}</section>
    <section class="p-sec about"><h2 class="disp big">Sobre nós</h2><div class="about-row"><p>( ${esc(I.portal_texto || 'Trabalho feito à mão, com tempo e cuidado.')} )</p>
      <div class="stats">${yrs ? `<div class="stat glass"><b class="disp">${String(yrs).padStart(2, '0')}</b><span class="lbl">Anos de oficina</span></div>` : ''}${ST.rating ? `<div class="stat glass on"><b class="disp">${String(ST.rating).replace('.', ',')}★</b><span class="lbl">${ST.n_rating} avaliações</span></div>` : ''}<div class="stat glass"><b class="disp">100%</b><span class="lbl">Acabado à mão</span></div></div></div></section>
    ${P.reviews.length ? `<section class="p-sec"><div class="p-sec-h"><h2 class="disp">Clientes</h2></div><div class="svc-grid">${P.reviews.map(r => `<div class="glass rev"><div style="color:#fbbf24">${'★'.repeat(r.pontuacao || 5)}</div><q>“${esc(r.texto)}”</q><div class="lbl" style="margin-top:12px">${esc(r.plataforma || '')}</div></div>`).join('')}</div></section>` : ''}
    ${ex.length ? `<section class="p-sec"><div class="p-sec-h"><h2 class="disp">Outros serviços</h2><span class="lbl">Soluções por orçamento e complementos</span></div>${extrasList(ex)}</section>` : ''}
    ${faqHTML()}
    <section class="p-sec" style="border:0">${wordmark('foot')}</section>
    ${quickForm()}
    <section class="p-sec"><div class="p-sec-h"><h2 class="disp" style="font-size:clamp(34px,5vw,64px)">Já é cliente?</h2>${P.t ? `<a class="pill ac" href="#/area">${icon('user')} Entrar na minha área</a>` : `<a class="pill" href="#/marcar/acesso">Pedir link de acesso</a>`}</div>
      <p class="muted" style="max-width:640px;margin:0">Acompanhe os trabalhos no seu automóvel em tempo real, consulte a ficha de intervenções com fotos antes/depois, aceite orçamentos e peça novas marcações.</p></section></div>`;
  bindBA(v); bindQuick(v); bindHero(v); bindPPF(v);
}
function pgServicos(v) {
  const pk = P.svcs.filter(s => s.tipo !== 'Extra'), ex = P.svcs.filter(s => s.tipo === 'Extra');
  v.innerHTML = `<div class="p-wrap"><section class="p-hero" style="padding-bottom:10px"><div class="row lbl" style="justify-content:space-between"><span>/ Serviços — ${String(pk.length).padStart(2, '0')}</span><span class="hide-m">${esc(P.info.slogan || '')}</span></div>
    <h1 class="disp" style="margin-top:14px;font-size:clamp(64px,15vw,230px)">Serviços</h1>
    <div class="row" style="justify-content:space-between;align-items:flex-end"><p style="margin:10px 0 0">Preços “desde” — o valor final depende do tamanho e do estado do veículo${P.info.iva_isento === '1' ? ' (regime de isenção de IVA)' : ''}. Inspeção gratuita em todas as marcações.</p><a class="pill solid" href="#/marcar">${icon('sparkle')} Pedir marcação</a></div></section>
    <div class="lbl" style="margin:30px 0 14px">/ Deslize o menu →</div></div>
    <div class="rail rail-full">${pk.map(railCard).join('')}</div>
    <div class="p-wrap">
    <section class="p-sec" style="margin-top:40px"><div class="p-sec-h"><h2 class="disp">O menu</h2><span class="lbl">${P.info.iva_isento === '1' ? 'Isento de IVA (art.º 53.º)' : 'Valores sem IVA'} · Inspeção gratuita</span></div>${menuList(pk)}</section>
    ${ex.length ? `<section class="p-sec"><div class="p-sec-h"><h2 class="disp" style="font-size:clamp(34px,5vw,64px)">Outros serviços & extras</h2></div>${extrasList(ex)}</section>` : ''}
    <section class="p-sec notsure"><h2 class="disp">Não sabe o que o seu carro precisa?</h2><p class="muted">Marque uma inspeção gratuita de 20 minutos. Medimos a pintura, explicamos as opções e damos-lhe o orçamento na hora.</p>
      <a class="pill solid" href="#/marcar">${icon('calendar')} Marcar inspeção</a></section></div>`;
}

/* ---------- PPF: história com parallax e deslize ---------- */
const PPF_CH = [
  ['Película', 'invisível.', 'Película de proteção transparente sobre a pintura original.'],
  ['Brilho', 'ou satin.', 'Mantenha o brilho de origem — ou transforme a pintura num acabamento satin.'],
  ['Todos os', 'painéis.', 'Capot, para-choques, guarda-lamas, espelhos, embaladeiras — ou o carro inteiro.'],
  ['De perto?', 'Não se vê.', 'Cortada à medida e com as arestas dobradas: a película desaparece na pintura.'],
  ['Riscado?', 'Regenera.', 'Pequenos riscos desaparecem com o calor do sol ou com água morna.'],
  ['Conduza.', 'Nós protegemos.', 'Gravilha, insetos, dejetos e riscos de lavagem ficam na película — não na pintura.'],
];
function ppfStory(s) {
  return `<section class="ppf" id="ppf" style="--p:0"><div class="ppf-stick">
    <div class="ppf-bg"></div>
    <div class="ppf-txt">${PPF_CH.map(([a, b, c], i) => `<div class="ppf-h" data-i="${i}"><h2 class="disp">${esc(a)} <em>${esc(b)}</em></h2><p>${esc(c)}</p></div>`).join('')}</div>
    <div class="ppf-labels"><span class="disp">Brilho</span><span class="disp">Satin</span></div>
    <div class="ppf-car"><div class="ppf-zoom">
      <div class="ppf-layer gloss">${carSVG('gloss', `<rect class="sheen" x="-400" y="80" width="260" height="300" fill="url(#ppfSheen)" transform="skewX(-18)"/><path class="scratch" d="M520 250 Q600 236 720 244" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" pathLength="1"/>`)}</div>
      <div class="ppf-layer satin">${carSVG('satin')}</div><div class="ppf-split"><i></i></div></div></div>
    <svg width="0" height="0" style="position:absolute"><defs><linearGradient id="ppfSheen" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs></svg>
    <div class="ppf-prog">${PPF_CH.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div>
    <div class="ppf-cta"><a class="pill solid" href="#/marcar/${s.id}">${icon('sparkle')} Marcar PPF</a><span class="lbl">${priceTxt(s)} · ${esc(dur(s))}</span></div>
    <div class="ppf-hint lbl">Deslize ↓</div></div></section>`;
}
function bindPPF(v) {
  const el = $('#ppf', v); if (!el) return;
  const N = PPF_CH.length, H = $$('.ppf-h', el), D = $$('.ppf-prog i', el), sheen = $('.sheen', el), scr = $('.scratch', el);
  let manual = null;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function frame() {
    if (!el.isConnected) { removeEventListener('scroll', onS); return; }
    const r = el.getBoundingClientRect(), total = r.height - innerHeight, p = clamp(-r.top / Math.max(1, total));
    const f = p * N, ci = Math.min(N - 1, Math.floor(f)), lp = f - ci;               // capítulo e progresso local
    el.style.setProperty('--p', p.toFixed(4));
    H.forEach((h, i) => { let d = f - i - .5; if (i === N - 1 && d > 0) d = 0; h.style.opacity = clamp(1 - Math.abs(d) * 2.2).toFixed(3); h.style.transform = `translateY(${(-d * 60).toFixed(1)}px)`; });
    D.forEach((d, i) => d.classList.toggle('on', i <= ci));
    // 0 · película: brilho a varrer o carro
    sheen.setAttribute('x', ci === 0 ? (-400 + ease(lp) * 1900).toFixed(0) : -600);
    // 1 · brilho vs satin: divisória acompanha o scroll (ou o dedo)
    const split = ci === 1 ? (manual ?? (92 - ease(clamp(lp * 1.25)) * 50)) : ci < 1 ? 100 : 50;
    el.style.setProperty('--split', (ci > 1 ? 100 : split) + '%');
    el.classList.toggle('is-split', ci === 1);
    // 2 · todos os painéis: rotação ligeira + parallax / 3-4 · zoom no capot / 5 · noite
    const zoom = ci === 3 ? 1 + ease(lp) * 1.4 : ci === 4 ? 2.4 : ci === 5 ? 2.4 - ease(clamp(lp * 1.6)) * 1.5 : 1;
    const rot = ci === 2 ? Math.sin(lp * Math.PI) * 8 : 0, ty = ci === 2 ? -lp * 20 : 0;
    el.style.setProperty('--zoom', zoom.toFixed(3)); el.style.setProperty('--rot', rot.toFixed(2) + 'deg'); el.style.setProperty('--ty', ty.toFixed(1) + 'px');
    // 4 · risco desenha-se e depois regenera
    const draw = ci === 4 ? clamp(lp * 2.4) : ci > 4 ? 1 : 0, heal = ci === 4 ? clamp((lp - .55) * 2.6) : ci > 4 ? 1 : 0;
    scr.style.strokeDashoffset = (1 - draw).toFixed(3); scr.style.opacity = (draw > 0 ? 1 - heal : 0).toFixed(3); scr.style.stroke = heal > 0 ? 'var(--ac)' : '#fff';
    el.classList.toggle('night', ci === 5 && lp > .15); el.classList.toggle('end', p > .93);
  }
  const onS = () => requestAnimationFrame(frame);
  // arrastar a divisória brilho/satin
  const car = $('.ppf-car', el);
  car.addEventListener('pointermove', e => { if (!el.classList.contains('is-split') || !(e.buttons || e.pointerType === 'mouse')) return; const b = car.getBoundingClientRect(); manual = clamp((e.clientX - b.left) / b.width * 100, 4, 96); frame(); });
  car.addEventListener('pointerleave', () => { manual = null; });
  addEventListener('scroll', onS, { passive: true }); addEventListener('resize', onS); frame();
}

function pgServico(v, id) {
  const i = P.svcs.findIndex(s => s.id === +id), s = P.svcs[i];
  if (!s) { v.innerHTML = '<div class="p-wrap empty">Serviço não encontrado.</div>'; return; }
  const more = P.svcs.filter(x => x.id !== s.id && x.tipo === 'Pacote').sort((a, b) => b.destaque - a.destaque).slice(0, 3);
  let sizes = s.precos ? Object.entries(s.precos).filter(([, v2]) => +v2 > 0) : [];
  if (new Set(sizes.map(([, v2]) => +v2)).size < 2) sizes = [];
  const story = s.categoria === 'PPF' && P.info.portal_ppf !== '0';
  v.innerHTML = `<div class="p-wrap">
    <div class="sd-top"><a class="lbl" href="#/servicos">← Todos os serviços</a><span class="num">${nn(i)}</span></div>
    <h1 class="disp sd-title">${esc(s.nome)}</h1>
    <div class="sd-row"><div class="sd-slogan">${esc(s.slogan || s.categoria || '')}</div>
      <div class="facts"><div class="fact"><span class="lbl">Preço</span><b>${priceTxt(s)}</b></div>
        <div class="fact"><span class="lbl">Duração</span><b>${esc(dur(s))}</b></div>
        <div class="fact"><span class="lbl">${s.tipo === 'Extra' ? 'Tipo' : 'Resultado'}</span><b>${esc(s.resultado || s.categoria || s.tipo)}</b></div></div></div>
    ${story ? '' : `<div class="sd-img">${art(s, i)}</div>`}</div>
    ${story ? ppfStory(s) : ''}
    <div class="p-wrap"><div class="incl"><div><div class="lbl">/ O que inclui</div>
        ${s.inclui.length ? `<ol>${s.inclui.map(t => `<li><span>${esc(t)}</span></li>`).join('')}</ol>` : `<p class="muted" style="margin-top:16px">${esc(s.descricao || 'Fale connosco para mais detalhes.')}</p>`}
        ${sizes.length > 1 ? `<div class="lbl" style="margin-top:34px">/ Preço por tamanho de veículo</div><div class="facts" style="margin-top:12px">${sizes.map(([k, val]) => `<div class="fact"><span class="lbl">${esc(k)}</span><b>${money(val)}</b></div>`).join('')}</div><p class="small muted">${P.info.iva_isento === '1' ? 'Valores sem IVA — regime de isenção de IVA.' : 'Valores sem IVA.'} O valor final depende do tamanho e do estado do veículo.</p>` : ''}
        ${s.fotos?.length > (story ? 0 : 1) ? `<div class="gallery" style="margin-top:30px">${s.fotos.slice(story ? 0 : 1).map(f => `<img src="${pubImg(f)}" loading="lazy">`).join('')}</div>` : ''}</div>
      <aside><p>${esc(s.descricao || '')}</p><a class="pill solid" href="#/marcar/${s.id}">${icon('calendar')} Marcar este serviço</a>
        <span class="lbl">Inspeção gratuita em todas as marcações${P.info.portal_horario ? ' · ' + esc(P.info.portal_horario) : ''}</span></aside></div>
    ${more.length ? `<section class="p-sec"><div class="p-sec-h"><h2 class="disp">Mais serviços</h2><a class="pill" href="#/servicos">${icon('sparkle')} Todos os serviços</a></div><div class="svc-grid">${more.map(x => svcCard(x, P.svcs.indexOf(x))).join('')}</div></section>` : ''}</div>`;
  $$('.gallery img', v).forEach(im => im.onclick = () => lightbox(im.src));
  bindPPF(v);
}
function contactCards() {
  const I = P.info, wa = I.portal_whatsapp ? 'https://wa.me/' + String(I.portal_whatsapp).replace(/\D/g, '').replace(/^(?=\d{9}$)/, '351') : '';
  return `<div class="cc">${I.empresa_morada ? `<a class="cc-i glass" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(I.empresa_morada)}"><span class="lbl">/ Visite-nos</span><b>${esc(I.empresa_morada)}</b></a>` : ''}
    ${I.portal_horario ? `<div class="cc-i glass"><span class="lbl">/ Horário</span><b>${esc(I.portal_horario)}</b></div>` : ''}
    ${I.empresa_telefone ? `<a class="cc-i glass" href="tel:${esc(I.empresa_telefone)}"><span class="lbl">/ Ligar</span><b>${esc(I.empresa_telefone)}</b></a>` : ''}
    ${I.empresa_email ? `<a class="cc-i glass" href="mailto:${esc(I.empresa_email)}"><span class="lbl">/ Email</span><b>${esc(I.empresa_email)}</b></a>` : ''}
    ${wa ? `<a class="cc-i glass" target="_blank" rel="noopener" href="${wa}"><span class="lbl">/ WhatsApp</span><b>Enviar mensagem</b></a>` : ''}</div>`;
}

/* ---------- Banner principal: detalhe completo + cerâmico (scroll para lavar) ---------- */
const HERO_CH = [
  ['Traga-o', 'sujo.', 'Lama, pó de travões, insetos, riscos de lavagem. Nós tratamos do resto.'],
  ['Deslize para', 'o lavar.', 'Lavagem a duas fases, descontaminação química e mecânica, secagem sem contacto.'],
  ['Veja', 'de perto.', 'Inspeção sob luz de oficina: cada swirl, cada holograma, cada mancha de água.'],
  ['Swirls fora.', 'Cerâmico on.', 'Polimento de correção e proteção cerâmica — brilho espelhado e água a deslizar.'],
  ['Chave na mão.', 'Queixo no chão.', 'Entregamos o carro como nunca o viu. Marque já o seu detalhe.'],
];
function hexCeiling() {
  const hx = [], R = 34, W = R * Math.sqrt(3);
  for (let r = 0; r < 5; r++) for (let c = -1; c < 22; c++) { const x = c * W + (r % 2) * W / 2, y = r * R * 1.5;
    hx.push(`<polygon points="${[0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 180 * (60 * k - 30); return `${(x + R * .86 * Math.cos(a)).toFixed(1)},${(y + R * .86 * Math.sin(a)).toFixed(1)}`; }).join(' ')}"/>`); }
  return `<svg class="hx" viewBox="0 0 1400 240" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="4">${hx.join('')}</g></svg>`;
}
function heroStory(svcIds) {
  const dirt = Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 97) % 1150 + 40}" cy="${200 + (i * 41) % 120}" r="${2 + (i * 13) % 9}" fill="#6b5a44" opacity="${.35 + (i % 5) * .1}"/>`).join('');
  const hexRefl = Array.from({ length: 14 }, (_, i) => { const x = 420 + (i % 7) * 70 + (Math.floor(i / 7) % 2) * 35, y = 150 + Math.floor(i / 7) * 52;
    return `<polygon points="${[0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 180 * (60 * k - 30); return `${(x + 30 * Math.cos(a)).toFixed(1)},${(y + 26 * Math.sin(a)).toFixed(1)}`; }).join(' ')}"/>`; }).join('');
  const extra = `<g class="hr-dirt"><rect x="0" y="120" width="1200" height="220" fill="#5b4a36" opacity=".55"/>${dirt}<path d="M120 300 Q300 270 520 296 T1100 288 L1100 320 L120 320 Z" fill="#4a3b2a" opacity=".7"/></g>
    <g class="hr-refl" fill="none" stroke="#fff" stroke-width="3" opacity="0">${hexRefl}</g>
    <g class="hr-beads">${Array.from({ length: 18 }, (_, i) => `<circle cx="${460 + (i * 53) % 420}" cy="${170 + (i * 29) % 60}" r="${3 + i % 4}" fill="#fff" opacity=".55"/>`).join('')}</g>`;
  const days = []; for (let i = 1; days.length < 5 && i < 12; i++) { const d = new Date(); d.setDate(d.getDate() + i); if (d.getDay() !== 0) days.push(d); }
  const DN = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const svcs = svcIds.map(id => P.svcs.find(s => s.id === id)).filter(Boolean);
  return `<section class="hero3" id="hero3"><div class="h3-stick">
    <div class="h3-room"><div class="h3-wall"></div>${hexCeiling()}<div class="h3-floor"></div><div class="h3-sun"></div></div>
    <div class="h3-car"><div class="h3-zoom">${carSVG('gloss', extra)}<div class="h3-jet"><i></i></div></div></div>
    <div class="h3-txt">${HERO_CH.map(([a, b, c], i) => `<div class="h3-h" data-i="${i}"><h1 class="disp">${esc(a)} <em>${esc(b)}</em></h1><p>${esc(c)}</p></div>`).join('')}</div>
    <div class="h3-brand lbl">/ ${esc(P.info.empresa_nome || '')} — ${esc(P.info.slogan || 'detailing automóvel')}</div>
    <div class="h3-prog">${HERO_CH.map(() => '<i></i>').join('')}</div><div class="h3-hint lbl">Deslize para lavar ↓</div>
    <form class="h3-book glass" id="h3b"><div class="lbl">/ Marque o seu detalhe</div><h3 class="disp">Reservar vaga</h3>
      <div class="h3-l">Serviço</div><div class="h3-opts" data-g="servicos">${svcs.map((s, i) => `<button type="button" class="${i ? '' : 'on'}" data-v="${s.id}"><b>${esc(s.nome)}</b><small>${priceTxt(s)}</small></button>`).join('')}</div>
      <div class="h3-l">Dia</div><div class="h3-opts days" data-g="data">${days.map((d, i) => `<button type="button" class="${i ? '' : 'on'}" data-v="${d.toISOString().slice(0, 10)}"><small>${DN[d.getDay()]}</small><b>${d.getDate()}</b></button>`).join('')}</div>
      <div class="h3-l">Período</div><div class="h3-opts" data-g="periodo"><button type="button" class="on" data-v="Manhã"><b>Manhã</b></button><button type="button" data-v="Tarde"><b>Tarde</b></button></div>
      ${P.me ? `<p class="small" style="margin:10px 0 0">Em nome de <b>${esc(P.me.cliente.nome)}</b></p>` : `<input class="inp" name="nome" placeholder="O seu nome" required autocomplete="name"><input class="inp" name="telefone" type="tel" placeholder="Telemóvel" required autocomplete="tel">
      <label class="h3-rg"><input type="checkbox" name="rgpd" required> Autorizo o contacto sobre este pedido (RGPD).</label>`}
      <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <button class="pill ac" type="submit" style="width:100%;justify-content:center;margin-top:12px">${icon('calendar')} Pedir esta vaga</button><p class="tiny2">Confirmamos por telefone a hora exata e o valor final.</p></form>
    </div></section>`;
}
function bindHero(v) {
  const el = $('#hero3', v); if (!el) return;
  const N = HERO_CH.length, H = $$('.h3-h', el), D = $$('.h3-prog i', el);
  const dirt = $('.hr-dirt', el), refl = $('.hr-refl', el), beads = $('.hr-beads', el), swirls = $$('.car circle[stroke]', el);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  // máscara da sujidade: só fica à direita do jato de água
  const k = 'hm' + CAR_N; dirt.closest('svg').querySelector('defs').insertAdjacentHTML('beforeend', `<clipPath id="${k}"><rect class="hr-cut" x="0" y="0" width="1200" height="420"/></clipPath>`); dirt.setAttribute('clip-path', `url(#${k})`);
  const cut = $('.hr-cut', el);
  function frame() {
    if (!el.isConnected) { removeEventListener('scroll', onS); return; }
    const r = el.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, r.height - innerHeight)), f = p * N, ci = Math.min(N - 1, Math.floor(f)), lp = f - ci;
    H.forEach((h, i) => { const d = f - i - .5; h.style.opacity = (i === N - 1 && f > N - 1 ? 1 : clamp(1 - Math.abs(d) * 2.2)).toFixed(3); h.style.transform = `translateY(${(i === N - 1 && f > N - .5 ? 0 : -d * 50).toFixed(1)}px)`; });
    D.forEach((d, i) => d.classList.toggle('on', i <= ci));
    const wash = ci === 0 ? 0 : ci === 1 ? ease(lp) : 1;                       // 0 → 1 enquanto lava
    cut.setAttribute('x', (wash * 1200).toFixed(0)); el.style.setProperty('--jet', (wash * 100).toFixed(2) + '%'); el.classList.toggle('washing', ci === 1 && lp > .02 && lp < .98);
    const zoom = ci === 2 ? 1 + ease(lp) * .9 : ci === 3 ? 1.9 + ease(clamp(lp * 1.4)) * .5 : ci === 4 ? 2.4 - ease(clamp(lp * 1.8)) * 1.4 : 1;
    el.style.setProperty('--zoom', zoom.toFixed(3));
    const gloss = ci < 3 ? 0 : ci === 3 ? ease(lp) : 1;
    refl.setAttribute('opacity', (gloss * .32).toFixed(3)); beads.style.opacity = ci === 3 ? clamp((lp - .3) * 3) * (1 - clamp((lp - .8) * 5)) : 0;
    swirls.forEach(c => c.setAttribute('stroke-opacity', ci < 3 ? .09 : (.09 * (1 - gloss)).toFixed(3)));
    el.classList.toggle('sunset', ci === 4); el.classList.toggle('booking', ci === 4 && lp > .35);
  }
  const onS = () => requestAnimationFrame(frame);
  addEventListener('scroll', onS, { passive: true }); addEventListener('resize', onS); frame();
  // mini-formulário de marcação
  const f = $('#h3b', el), val = g => $(`[data-g="${g}"] .on`, f)?.dataset.v;
  $$('.h3-opts button', f).forEach(b => b.onclick = () => { $$('button', b.parentElement).forEach(x => x.classList.toggle('on', x === b)); });
  f.onsubmit = async ev => { ev.preventDefault(); const fd = new FormData(f), b = Object.fromEntries(fd);
    b.servicos = val('servicos') ? [val('servicos')] : []; b.data_preferida = val('data'); b.periodo = val('periodo'); b.rgpd = b.rgpd ? 1 : 0; b.notas = 'Pedido pelo banner do site.'; if (P.t) b.t = P.t;
    try { await api('pub_request', {}, b); const nm = (b.nome || P.me?.cliente.nome || '').split(' ')[0];
      f.innerHTML = `<div class="h3-done"><div class="ok">✓</div><h3 class="disp">Pedido enviado${nm ? ', ' + esc(nm) : ''}!</h3><p>${fdate(b.data_preferida)} · ${esc(b.periodo)}<br>Ligamos-lhe para confirmar a hora.</p></div>`; } catch (e) { toast(e.message, true); } };
}
function pgMarcar(v, sid) {
  const acesso = sid === 'acesso';
  const pre = new Set(acesso ? [] : String(sid || '').split(',').map(Number));
  const vid = +(new URLSearchParams(location.hash.split('?')[1] || '').get('v') || 0);
  const me = P.me, car = me?.veiculos.find(x => x.id === vid) || me?.veiculos[0];
  v.innerHTML = `<div class="p-wrap" style="max-width:980px"><section class="p-hero" style="padding-bottom:20px"><div class="lbl">/ ${acesso ? 'Área de cliente' : 'Pedido de marcação'}</div>
    <h1 class="disp" style="margin-top:14px;font-size:clamp(56px,11vw,150px)">${acesso ? 'Pedir acesso' : 'Vamos <em>falar</em>'}</h1>
    <p>${acesso ? 'Deixe os seus contactos e enviamos-lhe o link pessoal para a sua área de cliente.' : 'Escolha os serviços e a sua disponibilidade. Entramos em contacto para confirmar data, hora e valor final.'}</p></section>
    ${acesso ? '' : contactCards()}
    <form class="glass" id="rq" style="padding:24px;margin-bottom:60px"><div class="p-form">
      ${me ? `<div class="full note">Pedido em nome de <b>${esc(me.cliente.nome)}</b> (${esc(me.cliente.telefone || me.cliente.email || '')}).</div>` : `
      <label class="f"><span>Nome *</span><input class="inp" name="nome" required autocomplete="name"></label>
      <label class="f"><span>Telemóvel *</span><input class="inp" name="telefone" type="tel" required autocomplete="tel"></label>
      <label class="f full"><span>Email</span><input class="inp" name="email" type="email" autocomplete="email"></label>`}
      ${acesso ? '' : `
      <label class="f full"><span>Veículo</span>${me && me.veiculos.length ? `<select class="inp" name="veiculo">${me.veiculos.map(x => `<option ${x === car ? 'selected' : ''}>${esc(`${x.marca} ${x.modelo} · ${x.matricula || ''}`)}</option>`).join('')}<option>Outro veículo</option></select>` : `<input class="inp" name="veiculo" placeholder="Marca, modelo, ano e cor — ex.: Porsche 911 (996) preto">`}</label>
      <div class="full"><span class="small muted">Serviços pretendidos</span><div class="svc-pick" style="margin-top:8px">${P.svcs.map(s => `<label><input type="checkbox" name="servicos" value="${s.id}" ${pre.has(s.id) ? 'checked' : ''}><span>${esc(s.nome)}<small>${fromPrice(s) ? (s.tipo === 'Extra' ? '+ ' : '') + 'desde ' + money(fromPrice(s)) : ''}</small></span></label>`).join('')}</div></div>
      <label class="f"><span>Data preferida</span><input class="inp" name="data_preferida" type="date" min="${new Date().toISOString().slice(0, 10)}"></label>
      <label class="f"><span>Período</span><select class="inp" name="periodo"><option>Indiferente</option><option>Manhã</option><option>Tarde</option></select></label>`}
      <label class="f full"><span>Mensagem</span><textarea class="inp" name="notas" placeholder="${acesso ? 'Matrícula do seu veículo (ajuda-nos a identificá-lo)' : 'Estado do veículo, pedidos especiais…'}"></textarea></label>
      <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      ${me ? '' : `<label class="switch full"><input type="checkbox" name="rgpd" required><span class="small">Autorizo o tratamento dos meus dados para ser contactado sobre este pedido (RGPD).</span></label>`}
      <div class="full row"><button class="pill solid" type="submit">${icon('calendar')} ${acesso ? 'Pedir link de acesso' : 'Enviar pedido'}</button>${P.info.empresa_telefone ? `<a class="pill" href="tel:${esc(P.info.empresa_telefone)}">${icon('phone')} ${esc(P.info.empresa_telefone)}</a>` : ''}</div>
    </div></form></div>`;
  $('#rq').onsubmit = async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target), b = Object.fromEntries(fd); b.servicos = fd.getAll('servicos'); b.rgpd = fd.get('rgpd') ? 1 : 0;
    if (acesso) b.notas = 'PEDIDO DE ACESSO AO PORTAL. ' + (b.notas || '');
    if (P.t) b.t = P.t;
    try {
      await api('pub_request', {}, b);
      v.innerHTML = `<div class="p-wrap" style="max-width:820px"><section class="p-hero"><div class="lbl">/ Pedido recebido</div><h1 class="disp" style="margin-top:14px;font-size:clamp(48px,9vw,120px)">Obrigado!</h1>
        <p>Recebemos o seu pedido e entraremos em contacto muito em breve${P.info.portal_horario ? ' (' + esc(P.info.portal_horario) + ')' : ''}.</p><a class="pill" href="#/">← Voltar ao início</a></section></div>`;
      scrollTo(0, 0);
    } catch (e) { toast(e.message, true); }
  };
}
async function pgArea(v) {
  if (!P.t) { location.hash = '#/marcar/acesso'; return; }
  if (!P.me) { try { P.me = await api('portal_me', { t: P.t }); } catch (e) { localStorage.removeItem('dp_portal_t'); P.t = null; v.innerHTML = `<div class="p-wrap"><section class="p-hero"><h1 class="disp" style="font-size:64px">Link inválido</h1><p>${esc(e.message)}</p><a class="pill" href="#/marcar/acesso">Pedir novo link</a></section></div>`; return; } }
  const M = P.me, first = (M.cliente.nome || '').split(' ')[0];
  const divida = M.faturas.reduce((s, f) => s + (+f.em_divida || 0), 0);
  const jobHTML = (j, vh) => {
    const idx = STAGES.indexOf(j.estado), done = j.tarefas.filter(t => t.d).length;
    const ant = j.fotos.filter(f => f.tipo === 'Antes'), dep = j.fotos.filter(f => f.tipo === 'Depois'), out = j.fotos.filter(f => !['Antes', 'Depois'].includes(f.tipo));
    return `<div class="job"><div class="job-h"><span class="lbl"><span class="n">${esc(j.numero || '')}</span> · ${fdate(j.data)}</span><b style="font-size:16px">${esc(j.servico || j.extras || 'Serviço')}</b>
      <span class="badge ${j.estado === 'Concluído' ? 't-ok' : j.estado === 'Pronto' ? 't-ok' : 't-info'}" style="margin-left:auto">${esc(j.estado)}</span></div>
      ${j.estado !== 'Concluído' ? `<div class="steps">${STAGES.map((s, k) => `<i class="${k <= idx ? 'on' : ''}" title="${esc(s)}"></i>`).join('')}</div><div class="small muted">Etapa atual: <b>${esc(j.estado)}</b>${j.data_entrega ? ' · entrega prevista ' + fdate(j.data_entrega) : ''}</div>` : ''}
      ${j.tarefas.length ? `<details ${j.estado !== 'Concluído' ? 'open' : ''} style="margin-top:14px"><summary class="lbl" style="cursor:pointer">Ficha de intervenção — ${done}/${j.tarefas.length} tarefas</summary>
        <div class="board" style="margin-top:12px"><h4>${esc(`${vh?.marca || ''} ${vh?.modelo || ''}`.toUpperCase())} ${vh?.cor ? '— ' + esc(vh.cor.toUpperCase()) : ''}</h4>
        ${[...new Set(j.tarefas.map(t => t.s || ''))].map(g => { const it = j.tarefas.filter(t => (t.s || '') === g); const nt = (j.notas_servicos || {})[g];
          return `${g ? `<h5>${esc(g)} <small>${it.filter(t => t.d).length}/${it.length}</small></h5>` : ''}${it.map(t => `<div class="${t.d ? 'ok' : ''}">${esc(t.t)} ${t.d ? '✓' : '<span style="opacity:.4">○</span>'}${t.n ? `<em>${esc(t.n)}</em>` : ''}</div>`).join('')}${nt ? `<p class="bnote">📝 ${esc(nt)}</p>` : ''}`; }).join('')}</div></details>` : ''}
      ${j.fotos.length ? `<div style="margin-top:16px">${[['Antes', ant], ['Depois', dep], ['Outras', out]].filter(([, l]) => l.length).map(([t, l]) => `<div class="lbl" style="margin:10px 0 8px">/ ${t}</div><div class="gallery">${l.map(f => `<img src="${photo(f.f)}" loading="lazy">`).join('')}</div>`).join('')}</div>` : ''}
      ${j.notas_trabalho ? `<div class="lbl" style="margin-top:16px">/ Trabalho realizado</div><p style="white-space:pre-line;margin:6px 0">${esc(j.notas_trabalho)}</p>` : ''}
      ${j.notas_aftercare ? `<div class="note" style="margin-top:10px"><b>Cuidados recomendados:</b> <span style="white-space:pre-line">${esc(j.notas_aftercare)}</span></div>` : ''}</div>`;
  };
  v.innerHTML = `<div class="p-wrap"><section class="p-hero" style="padding-bottom:20px"><div class="lbl">/ Área de cliente</div><h1 class="disp" style="margin-top:14px;font-size:clamp(52px,10vw,140px)">Olá, ${esc(first)}</h1>
    <div class="row" style="margin-top:20px"><a class="pill solid" href="#/marcar">${icon('calendar')} Agendar serviço</a><a class="pill" href="#/servicos">Ver serviços</a><button class="pill" id="sair">Sair</button></div></section>
    ${M.marcacoes.length ? `<section class="p-sec"><div class="lbl" style="margin-bottom:12px">/ Próximas marcações</div>${M.marcacoes.map(m => `<div class="glass" style="padding:14px 18px;margin-bottom:8px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><b class="mono">${fdate(m.data)} ${esc(m.hora || '')}</b><span class="grow">${esc(m.servico)}</span><span class="badge ${m.estado === 'Confirmada' ? 't-ok' : 't-warn'}">${esc(m.estado)}</span></div>`).join('')}</section>` : ''}
    ${M.orcamentos.filter(o => o.estado === 'Enviado').length ? `<section class="p-sec"><div class="lbl" style="margin-bottom:12px">/ Orçamentos para aprovar</div>${M.orcamentos.filter(o => o.estado === 'Enviado').map(o => `
      <div class="glass" style="padding:18px;margin-bottom:10px"><div class="row"><b>${esc(o.numero)}</b><span class="muted small">${fdate(o.data)} · válido até ${fdate(o.validade)}</span><b class="right mono" style="font-size:20px;color:var(--ac)">${money(o.total)}</b></div>
      <div style="margin:10px 0">${o.linhas.map(l => `<div class="list-i small"><span class="grow">${esc(l.d)}</span><span class="mono">${money((+l.q || 0) * (+l.p || 0))}</span></div>`).join('')}${+o.deslocacao ? `<div class="list-i small"><span class="grow">Deslocação</span><span>${money(o.deslocacao)}</span></div>` : ''}${+o.desconto ? `<div class="list-i small"><span class="grow">Desconto</span><span>−${money(o.desconto)}</span></div>` : ''}<div class="list-i small"><span class="grow">IVA ${o.iva_pct}%</span><span>${money(o.iva)}</span></div></div>
      <button class="pill ac" data-acc="${o.id}">Aceitar orçamento</button></div>`).join('')}</section>` : ''}
    ${divida > 0 ? `<section class="p-sec"><div class="glass" style="padding:18px"><div class="lbl">/ Pagamentos pendentes</div>${M.faturas.filter(f => f.em_divida > 0).map(f => `<div class="list-i"><span class="grow">${esc(f.numero)} · ${fdate(f.data)}</span><b class="mono">${money(f.em_divida)}</b></div>`).join('')}${M.iban ? `<p class="small muted">IBAN para transferência: <b class="mono">${esc(M.iban)}</b></p>` : ''}</div></section>` : ''}
    ${reviewHTML(M)}
    <section class="p-sec"><div class="p-sec-h"><h2 class="disp" style="font-size:clamp(40px,6vw,80px)">As minhas viaturas</h2></div>
      ${M.veiculos.map(vh => { const js = M.trabalhos.filter(j => j.veiculo_id === vh.id); const sub = M.subscricoes.find(s => s.veiculo_id === vh.id); return `<div class="glass veh">
        <div class="veh-h"><span class="disp">${esc(vh.marca)} ${esc(vh.modelo)}</span>${vh.matricula ? `<span class="plate">${esc(vh.matricula)}</span>` : ''}<a class="pill right" href="#/marcar?v=${vh.id}">${icon('calendar')} Agendar</a></div>
        <div class="row small muted" style="margin:10px 0 6px;gap:18px">${vh.ano ? `<span>Ano ${esc(vh.ano)}</span>` : ''}${vh.cor ? `<span>${esc(vh.cor)}</span>` : ''}${vh.protecao ? `<span>Proteção: <b style="color:var(--paper)">${esc(vh.protecao)}</b></span>` : ''}<span>Último serviço: ${fdate(vh.ultimo_servico)}</span>${vh.proximo_servico ? `<span style="color:var(--ac)">Próximo recomendado: ${fdate(vh.proximo_servico)}</span>` : ''}</div>
        ${sub ? `<div class="note" style="margin:8px 0">Plano ativo: <b>${esc(sub.plano)}</b> · ${esc(sub.frequencia)} · próxima visita ${fdate(sub.proxima_visita)}</div>` : ''}
        <div class="lbl" style="margin:16px 0 0">/ Histórico de intervenções (${js.length})</div>
        ${js.map(j => jobHTML(j, vh)).join('') || '<p class="muted small">Ainda sem intervenções registadas.</p>'}</div>`; }).join('') || '<p class="muted">Sem viaturas registadas.</p>'}
      ${M.trabalhos.filter(j => !M.veiculos.some(x => x.id === j.veiculo_id)).map(j => `<div class="glass veh">${jobHTML(j, null)}</div>`).join('')}
    </section></div>`;
  bindReview(v, M);
  $('#sair').onclick = () => { localStorage.removeItem('dp_portal_t'); P.t = null; P.me = null; location.hash = '#/'; render(); };
  $$('[data-acc]').forEach(b => b.onclick = async () => { try { await api('portal_accept', {}, { t: P.t, id: +b.dataset.acc }); toast('Orçamento aceite! Vamos contactá-lo para agendar.'); P.me = null; pgArea(v); } catch (e) { toast(e.message, true); } });
  $$('.gallery img', v).forEach(im => im.onclick = () => lightbox(im.src));
}

/* ---------- Avaliações (Google Maps / Facebook) ---------- */
const GLOGO = '<svg viewBox="0 0 48 48" width="22" height="22"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const FLOGO = '<svg viewBox="0 0 48 48" width="22" height="22"><circle cx="24" cy="24" r="20" fill="#1877F2"/><path fill="#fff" d="M26.7 38V26.6h3.8l.6-4.4h-4.4v-2.8c0-1.3.4-2.2 2.2-2.2h2.3v-3.9c-.4-.1-1.8-.2-3.4-.2-3.4 0-5.7 2.1-5.7 5.9v3.2h-3.8v4.4h3.8V38h4.6z"/></svg>';
function reviewHTML(M) {
  const L = M.links || {}, done = M.avaliacao, hasJob = M.trabalhos.some(j => ['Concluído', 'Pronto'].includes(j.estado));
  if (!L.google && !L.facebook && !hasJob) return '';
  return `<section class="p-sec" id="rev"><div class="glass" style="padding:26px;border-color:color-mix(in srgb,var(--ac) 35%,transparent)">
    <div class="lbl">/ A sua opinião conta</div><h2 class="disp" style="font-size:clamp(36px,6vw,72px);margin:12px 0 8px">Avalie-nos</h2>
    <p class="muted" style="max-width:640px;margin:0 0 18px">Ficou satisfeito com o cuidado que tivemos com o seu automóvel? Uma avaliação no Google Maps ou no Facebook ajuda outros condutores a conhecer o nosso trabalho — e demora menos de um minuto. Obrigado!</p>
    <div id="revStep1" class="${done ? 'hide' : ''}"><div class="stars-big" id="revStars">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-v="${i}" aria-label="${i} estrelas">★</button>`).join('')}</div>
      <textarea class="inp" id="revTxt" style="margin-top:14px;max-width:680px" placeholder="Conte-nos como correu (opcional)…"></textarea>
      <label class="switch" style="margin-top:8px"><input type="checkbox" id="revOk"><span class="small">Autorizo a publicação do meu comentário como testemunho.</span></label>
      <div class="row" style="margin-top:12px"><button class="pill solid" id="revSend" disabled>Enviar avaliação</button></div></div>
    <div id="revStep2" class="${done && done.pontuacao >= 4 ? '' : 'hide'}"><p style="margin:0 0 14px;color:var(--paper)">🙏 Obrigado${done ? ' pela sua avaliação de ' + '★'.repeat(done.pontuacao) : ''}! Partilhe-a também publicamente:</p>
      ${done?.texto ? `<div class="note" style="max-width:680px;margin-bottom:12px">“${esc(done.texto)}” <button class="pill" id="revCopy" style="margin-left:8px;padding:5px 10px">Copiar texto</button></div>` : ''}</div>
    <div id="revLow" class="hide note" style="max-width:680px">Lamentamos que a experiência não tenha sido perfeita. A sua mensagem foi enviada diretamente à nossa equipa e vamos contactá-lo para resolver.</div>
    <div class="row" style="margin-top:6px;gap:12px">
      ${L.google ? `<a class="pill rv" data-p="Google" href="${esc(L.google)}" target="_blank" rel="noopener" style="background:#fff;color:#111;border-color:#fff;padding:12px 18px">${GLOGO} Avaliar no Google Maps</a>` : ''}
      ${L.facebook ? `<a class="pill rv" data-p="Facebook" href="${esc(L.facebook)}" target="_blank" rel="noopener" style="background:#1877F2;color:#fff;border-color:#1877F2;padding:12px 18px">${FLOGO} Recomendar no Facebook</a>` : ''}</div>
  </div></section>`;
}
function bindReview(v, M) {
  let n = 0;
  $$('#revStars button', v).forEach(b => b.onclick = () => { n = +b.dataset.v; $$('#revStars button', v).forEach(x => x.classList.toggle('on', +x.dataset.v <= n)); $('#revSend', v).disabled = false; });
  $('#revSend', v)?.addEventListener('click', async () => {
    try {
      const txt = $('#revTxt', v).value.trim();
      const r = await api('portal_review', {}, { t: P.t, pontuacao: n, texto: txt, testemunho: $('#revOk', v).checked ? 1 : 0 });
      $('#revStep1', v).classList.add('hide');
      if (r.publica) { $('#revStep2', v).classList.remove('hide'); if (txt) { try { await navigator.clipboard.writeText(txt); toast('Texto copiado — basta colar no Google ou Facebook.'); } catch { } } }
      else $('#revLow', v).classList.remove('hide');
      P.me.avaliacao = { pontuacao: n, texto: txt };
    } catch (e) { toast(e.message, true); }
  });
  $('#revCopy', v)?.addEventListener('click', () => { navigator.clipboard?.writeText(M.avaliacao.texto); toast('Texto copiado.'); });
  $$('.rv', v).forEach(a => a.addEventListener('click', () => { api('portal_review', {}, { t: P.t, plataforma: a.dataset.p }).catch(() => { }); }));
}

/* ---------- Estrutura ---------- */
function shell() {
  const I = P.info, wa = I.portal_whatsapp ? 'https://wa.me/' + String(I.portal_whatsapp).replace(/\D/g, '').replace(/^(?=\d{9}$)/, '351') : '';
  document.documentElement.style.setProperty('--ac', I.cor || '#ef4444');
  document.title = I.empresa_nome + ' · Detailing automóvel';
  $('#root').innerHTML = `
    <header class="p-top"><div class="p-wrap"><a href="#/" class="brand" style="padding:0">${I.logo ? `<div class="logo"><img src="${I.logo}" alt=""></div>` : ''}<div><b style="color:var(--paper)">${esc(I.empresa_nome)}</b><span>${esc(I.slogan || '')}</span></div></a>
      <nav><a href="#/" data-h="#/">Início</a><a href="#/servicos" data-h="#/servicos">Serviços</a><a href="#/#faq" data-h="#faq">FAQ</a><a href="#/marcar" data-h="#/marcar">Contacto</a><a href="#/area" data-h="#/area">${P.t ? 'A minha área' : 'Área de cliente'}</a></nav>
      ${I.portal_horario ? `<span class="lbl hide-m" style="margin-left:10px">${esc(I.portal_horario)}</span>` : ''}<a class="pill solid" href="#/marcar" style="margin-left:8px">${icon('sparkle')} Marcar</a></div></header>
    <main id="pv"></main>
    <footer class="p-foot"><div class="p-wrap"><div class="foot-g">
      <div><a href="#/" class="brand" style="padding:0">${I.logo ? `<div class="logo"><img src="${I.logo}" alt=""></div>` : ''}<b style="color:var(--paper)">${esc(I.empresa_nome)}</b></a><p style="max-width:300px">${esc(I.slogan || I.portal_titulo || '')}</p></div>
      <div><div class="lbl">Oficina</div><a href="#/">Início</a><a href="#/servicos">Serviços</a><a href="#/#faq">Perguntas frequentes</a></div>
      <div><div class="lbl">Ajuda</div><a href="#/marcar">Pedir marcação</a><a href="#/area">Área de cliente</a>${I.link_avaliacao ? `<a href="${esc(I.link_avaliacao)}" target="_blank" rel="noopener">Avaliações Google</a>` : ''}</div>
      <div><div class="lbl">Visite</div>${I.empresa_morada ? `<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(I.empresa_morada)}">${esc(I.empresa_morada)}</a>` : ''}${I.empresa_telefone ? `<a href="tel:${esc(I.empresa_telefone)}">${esc(I.empresa_telefone)}</a>` : ''}${I.empresa_email ? `<a href="mailto:${esc(I.empresa_email)}">${esc(I.empresa_email)}</a>` : ''}</div>
      <div class="soc">${I.portal_instagram ? `<a href="${esc(I.portal_instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${icon('insta')}</a>` : ''}${wa ? `<a href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('wa')}</a>` : ''}${I.link_facebook ? `<a href="${esc(I.link_facebook)}" target="_blank" rel="noopener" aria-label="Facebook"><b>f</b></a>` : ''}</div></div>
      <div class="foot-b lbl"><span>© ${new Date().getFullYear()} ${esc(I.empresa_nome)}</span><span>${I.iva_isento === '1' ? 'Isento de IVA — art.º 53.º CIVA' : ''}</span><span>Dados tratados segundo o RGPD</span></div></div></footer>
    <nav class="p-mnav glass"><a href="#/" data-h="#/">${icon('home')}<span>Início</span></a><a href="#/servicos" data-h="#/servicos">${icon('sparkle')}<span>Serviços</span></a>
      <a href="#/marcar" data-h="#/marcar">${icon('calendar')}<span>Marcar</span></a><a href="#/area" data-h="#/area">${icon('user')}<span>${P.t ? 'Área' : 'Cliente'}</span></a></nav>`;
}
function render() {
  let h = location.hash || '#/'; const v = $('#pv');
  const anchor = h.includes('#', 1) ? h.slice(h.indexOf('#', 1) + 1) : ''; if (anchor) h = h.slice(0, h.indexOf('#', 1));
  $$('[data-h]').forEach(a => a.classList.toggle('on', a.dataset.h === h.split('?')[0] || (a.dataset.h !== '#/' && a.dataset.h.startsWith('#/') && h.startsWith(a.dataset.h))));
  let m;
  if ((m = h.match(/^#\/servico\/(\d+)/))) pgServico(v, m[1]);
  else if (h.startsWith('#/servicos')) pgServicos(v);
  else if ((m = h.match(/^#\/marcar(?:\/([\w,]+))?/))) pgMarcar(v, m[1]);
  else if (h.startsWith('#/area')) pgArea(v);
  else pgHome(v);
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }), 60);
  else if (!h.includes('?')) scrollTo(0, 0);
}
(async () => {
  const q = new URLSearchParams(location.search);
  if (q.get('t')) { try { localStorage.setItem('dp_portal_t', q.get('t')); } catch { } P.t = q.get('t'); history.replaceState(null, '', location.pathname + '#/area'); }
  else { try { P.t = localStorage.getItem('dp_portal_t'); } catch { } }
  try {
    const d = await api('pub_info'); P.info = d.info; P.svcs = d.servicos; P.reviews = d.avaliacoes; P.stats = d.stats || {};
    if (P.t) { try { P.me = await api('portal_me', { t: P.t }); } catch { } }
  } catch (e) { $('#root').innerHTML = `<div class="login"><div class="glass box"><h1>Indisponível</h1><p>${esc(e.message)}</p></div></div>`; return; }
  shell(); addEventListener('hashchange', render); render();
})();
