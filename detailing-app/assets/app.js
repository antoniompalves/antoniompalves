/* DetailPro — CRM para empresas de detailing (PT-PT). Sem dependências externas. */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const money = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? '—' : EUR.format(+v);
const n2 = v => (+v || 0).toLocaleString('pt-PT', { maximumFractionDigits: 2 });
const fdate = d => d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—';
const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const mlabel = ym => MESES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(2, 4);

const IC = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  kanban: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  car: '<path d="M5 17h14M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M3 17v-5l2-5h14l2 5v5"/><path d="M3 12h18"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 1V2l-1 1-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 12l2 2 4-4M9 18h6"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  team: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  tool: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>',
  flask: '<path d="M9 2h6M10 2v6L4 19a2 2 0 0 0 1.8 3h12.4a2 2 0 0 0 1.8-3L14 8V2"/><path d="M7 15h10"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>',
  truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>', print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>', left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
};
const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n] || IC.grid}</svg>`;

/* ---------- Estado & API ---------- */
const A = { cache: {}, ui: {}, S: {}, schema: {}, user: null, csrf: '' };

async function api(a, params = {}, body = null) {
  const qs = new URLSearchParams({ a, ...params }).toString();
  const opt = { method: body ? 'POST' : 'GET', headers: { 'X-CSRF': A.csrf } };
  if (body instanceof FormData) opt.body = body;
  else if (body) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
  let r;
  try { r = await fetch('api.php?' + qs, opt); } catch (e) { throw new Error('Sem ligação ao servidor. Verifique a internet.'); }
  const j = await r.json().catch(() => ({ error: 'Resposta inválida do servidor.' }));
  if (r.status === 401 && a !== 'login') { showLogin(j.error); throw new Error(j.error); }
  if (j.error) throw new Error(j.error);
  return j;
}
async function load(e, force) {
  if (!A.cache[e] || force) A.cache[e] = (await api('list', { e })).rows;
  return A.cache[e];
}
const byId = (e, id) => (A.cache[e] || []).find(r => +r.id === +id);
function tplLabel(e, r) {
  if (!r) return '';
  const t = A.schema[e]?.tpl || '{id}';
  let s = t.replace(/\{(\w+)\}/g, (_, k) => k === 'data' ? fdate(r[k]) : (r[k] ?? '')).replace(/\s·\s*$/, '').trim();
  if (e === 'trabalhos' || e === 'orcamentos') { const c = byId('clientes', r.cliente_id); if (c) s += ' · ' + c.nome; }
  return s || '#' + r.id;
}
const refLabel = (e, id) => id ? tplLabel(e, byId(e, id)) || '#' + id : '';
async function ensureRefs(e) {
  const refs = new Set(A.schema[e].fields.filter(f => f.t === 'ref').map(f => f.ref));
  refs.add('clientes');
  await Promise.all([...refs].map(r => load(r)));
}
function tone(v) {
  v = String(v || '');
  if (/Conclu|Paga$|Aceite|Ganho|Ativa|Confirmad|Pronto|Recebida|Operacional|Recompensa/.test(v)) return 't-ok';
  if (/Cancel|Perdid|Recusad|Anulad|Faltou|Expirad|Avariad|atraso|Stock baixo|Abatido/i.test(v)) return 't-bad';
  if (/Pendente|Por pagar|Parcial|Rascunho|Pausad|Novo|manutenção|Em breve|por enviar|Agendado/.test(v)) return 't-warn';
  if (/Controlo|Correção|Negocia/.test(v)) return 't-vio';
  if (!v) return 't-mut';
  return 't-info';
}
const badge = v => v ? `<span class="badge ${tone(v)}">${esc(v)}</span>` : '';
function toast(msg, err) {
  let w = $('.toast-w'); if (!w) { w = document.createElement('div'); w.className = 'toast-w'; document.body.appendChild(w); }
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; w.appendChild(t);
  setTimeout(() => t.remove(), err ? 6000 : 3200);
}
const fail = e => toast(e.message || String(e), true);
const isAdmin = () => A.user?.role === 'admin';
const isTec = () => A.user?.role === 'tecnico';
const TEC_BLOCK = ['faturas', 'despesas', 'marketing', 'subscricoes', 'orcamentos', 'leads', 'receitas', 'objetivos', '#/', '#/relatorios', '#/calc-precos', '#/pagamentos', '#/frotas'];
const settingsJSON = (k, d) => { try { return JSON.parse(A.S[k] || '') ?? d; } catch { return d; } };
const today = () => A.today || iso(new Date());
const imgURL = f => 'api.php?a=file&f=' + encodeURIComponent(f);

/* ---------- Navegação ---------- */
const NAV = [
  ['Painel', [['#/', 'Centro de comando', 'grid'], ['#/agenda', 'Agenda', 'calendar'], 'marcacoes', ['#/quadro', 'Quadro de trabalhos', 'kanban'], ['#/rota', 'Rota do dia', 'route']]],
  ['Clientes', ['leads', 'clientes', 'veiculos', ['#/frotas', 'Frotas & empresas', 'truck'], 'subscricoes', ['#/lembretes', 'Lembretes & follow-ups', 'chat'], 'avaliacoes']],
  ['Trabalho', ['trabalhos', 'inspecoes', ['#/antes-depois', 'Antes / depois', 'image'], 'garantias', 'servicos', 'checklists']],
  ['Dinheiro', ['orcamentos', 'faturas', ['#/pagamentos', 'Pagamentos', 'card'], 'despesas', 'receitas', ['#/relatorios', 'Resultados & relatórios', 'chart'], 'deslocacoes']],
  ['Oficina', ['inventario', 'equipamentos', 'fornecedores', 'compras', 'equipa', 'marketing', 'objetivos']],
  ['Ferramentas', [['#/calc-precos', 'Calculadora de preços', 'calc'], ['#/calc-quimicos', 'Custo de químicos', 'flask'], 'mensagens', ['portal.php', 'Portal do cliente ↗', 'globe'], ['#/guia', 'Guia de início', 'book']]],
  ['Administração', [['#/definicoes', 'Definições & dados', 'cog'], ['#/utilizadores', 'Utilizadores', 'shield']]],
];
function navItems() {
  const off = settingsJSON('modulos_off', []);
  return NAV.map(([g, items]) => [g, items.map(it => Array.isArray(it) ? it : ['#/e/' + it, A.schema[it].label, A.schema[it].icon, it])
    .filter(([h, , , e]) => !off.includes(e || h))
    .filter(([h, , , e]) => !isTec() || !TEC_BLOCK.includes(e || h))
    .filter(() => g !== 'Administração' || isAdmin())]).filter(([, i]) => i.length);
}
function renderShell() {
  const S = A.S;
  document.title = S.app_nome + ' · ' + S.empresa_nome;
  document.documentElement.style.setProperty('--ac', S.cor || '#ef4444');
  $('#root').innerHTML = `
  <div class="app" id="app">
    <aside class="sidebar">
      <div class="brand"><div class="logo">${S.logo ? `<img src="api.php?a=logo" alt="">` : icon('car')}</div>
        <div><b>${esc(S.app_nome)}</b><span>${esc(S.empresa_nome)}</span></div></div>
      <nav class="nav">${navItems().map(([g, items]) => `<div class="nav-g">${esc(g)}</div>` + items.map(([h, l, i]) =>
        `<a href="${h}" ${h.startsWith('#') ? '' : 'target="_blank"'} data-h="${h}">${icon(i)}<span>${esc(l)}</span><b class="cnt hide" data-cnt="${esc(h.replace('#/e/', ''))}"></b></a>`).join('')).join('')}</nav>
      <div style="margin:18px 8px 0" class="small muted">
        <a href="#/conta" class="row" style="color:var(--tx2)">${icon('team', 'ic')}<span>${esc(A.user.nome || A.user.email)}</span></a>
        <a href="#" id="logout" class="row" style="color:var(--tx2);margin-top:8px">${icon('logout')}<span>Terminar sessão</span></a>
        <div style="margin-top:10px;opacity:.6">v${esc(A.version)}</div></div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="btn icon ghost menu-btn" id="menuBtn" aria-label="Menu">${icon('menu')}</button>
        <div class="grow" style="min-width:0"><h1 id="pgTitle"></h1><div class="sub" id="pgSub"></div></div>
        <div class="gsearch" id="gs">${icon('search')}<input class="inp" id="gq" placeholder="Pesquisar clientes, matrículas, VIN, documentos…  ( / )" autocomplete="off"><div class="gres glass hide" id="gr"></div></div>
        <button class="btn icon ghost menu-btn" id="gsBtn" aria-label="Pesquisar">${icon('search')}</button>
        <div id="pgActs" class="row" style="flex-wrap:nowrap"></div>
        <button class="btn icon ghost" id="thm" title="Tema claro/escuro">${icon('eye')}</button>
      </header>
      <section class="content" id="view"></section>
    </div>
    <nav class="bottomnav glass">
      <a href="#/" data-h="#/">${icon(isTec() ? 'calendar' : 'grid')}<span>${isTec() ? 'Agenda' : 'Painel'}</span></a>
      <a href="#/agenda" data-h="#/agenda">${icon('calendar')}<span>Agenda</span></a>
      <a href="#" class="fab" id="fab">${icon('plus')}<span>Novo</span></a>
      <a href="#/quadro" data-h="#/quadro">${icon('kanban')}<span>Trabalhos</span></a>
      <a href="#" id="moreBtn">${icon('menu')}<span>Menu</span></a>
    </nav>
  </div>`;
  if (isTec()) { const b = $('.bottomnav a'); b.href = '#/e/marcacoes'; b.dataset.h = '#/e/marcacoes'; b.querySelector('span').textContent = 'Marcações'; }
  const tog = e => { e.preventDefault(); $('#app').classList.toggle('open'); };
  $('#menuBtn').onclick = tog; $('#moreBtn').onclick = tog;
  $('#app').addEventListener('click', e => { if (e.target.id === 'app') $('#app').classList.remove('open'); });
  $('#logout').onclick = async e => { e.preventDefault(); await api('logout', {}, {}).catch(() => { }); location.reload(); };
  $('#fab').onclick = e => { e.preventDefault(); quickAdd(); };
  $('#thm').onclick = toggleTheme;
  bindSearch(); loadBadges();
}
function setPage(title, sub = '', acts = '') {
  $('#pgTitle').textContent = title; $('#pgSub').innerHTML = sub; $('#pgActs').innerHTML = acts;
  document.title = title + ' · ' + A.S.app_nome;
}
function quickAdd() {
  const opts = [['marcacoes', 'Marcação', 'calendar'], ['trabalhos', 'Trabalho', 'wrench'], ['clientes', 'Cliente', 'users'], ['orcamentos', 'Orçamento', 'file'],
    ['inspecoes', 'Ficha de inspeção', 'clipboard'], ['despesas', 'Despesa', 'wallet'], ['leads', 'Lead', 'target'], ['deslocacoes', 'Deslocação', 'route']]
    .filter(([e]) => !isTec() || !TEC_BLOCK.includes(e));
  const m = modal('Adicionar', `<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">${opts.map(([e, l, i]) =>
    `<button class="btn" data-e="${e}" style="justify-content:flex-start;padding:14px">${icon(i)} ${l}</button>`).join('')}</div>`, '', 'sm');
  $$('[data-e]', m.el).forEach(b => b.onclick = () => { m.close(); openForm(b.dataset.e); });
}

const ROUTES = [];
const route = (re, fn) => ROUTES.push([re, fn]);
async function router() {
  const h = location.hash || '#/';
  $('#app')?.classList.remove('open');
  $$('.nav a, .bottomnav a').forEach(a => a.classList.toggle('on', a.dataset.h === h || (a.dataset.h !== '#/' && a.dataset.h && h.startsWith(a.dataset.h + '/'))));
  const view = $('#view'); view.innerHTML = '<div class="empty">A carregar…</div>';
  window.scrollTo(0, 0);
  for (const [re, fn] of ROUTES) {
    const m = h.match(re);
    if (m) { try { await fn(view, ...m.slice(1)); } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; } return; }
  }
  view.innerHTML = '<div class="empty">Página não encontrada.</div>';
}

/* ---------- Modal ---------- */
function modal(title, body, foot = '', size = '') {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${size}" role="dialog"><div class="modal-h"><h2 class="grow">${title}</h2><button class="btn icon ghost" data-x>${icon('x')}</button></div>
    <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
  document.body.appendChild(bg); document.body.style.overflow = 'hidden';
  const close = () => { bg.remove(); if (!$('.modal-bg')) document.body.style.overflow = ''; };
  bg.addEventListener('mousedown', e => { if (e.target === bg) bg._down = true; });
  bg.addEventListener('mouseup', e => { if (e.target === bg && bg._down) close(); bg._down = false; });
  $('[data-x]', bg).onclick = close;
  const onKey = e => { if (e.key === 'Escape' && bg.isConnected && bg === $$('.modal-bg').pop()) { close(); } };
  document.addEventListener('keydown', onKey);
  return { el: bg, close };
}
function confirmBox(msg, okText = 'Confirmar', danger = true) {
  return new Promise(res => {
    const m = modal('Confirmar', `<p>${esc(msg)}</p>`, `<button class="btn ghost right" data-c>Cancelar</button><button class="btn ${danger ? 'danger' : 'pri'}" data-ok>${okText}</button>`, 'sm');
    $('[data-c]', m.el).onclick = () => { m.close(); res(false); };
    $('[data-ok]', m.el).onclick = () => { m.close(); res(true); };
  });
}
function lightbox(src) { const d = document.createElement('div'); d.className = 'lightbox'; d.innerHTML = `<img src="${src}">`; d.onclick = () => d.remove(); document.body.appendChild(d); }

/* ---------- Valores ---------- */
function cellValue(e, f, r) {
  const v = r[f.k];
  switch (f.t) {
    case 'money': return money(v);
    case 'date': return v ? fdate(v) : '—';
    case 'bool': return +v ? '<span class="up">✓</span>' : '<span class="muted">—</span>';
    case 'ref': return esc(refLabel(f.ref, v)) || '<span class="muted">—</span>';
    case 'select': return f.k === 'estado' ? badge(v) : esc(v || '—');
    case 'rating': return v ? '<span style="color:#fbbf24">' + '★'.repeat(+v) + '</span>' : '—';
    case 'textarea': return esc(String(v || '').slice(0, 70)) + (String(v || '').length > 70 ? '…' : '');
    case 'color': return `<span class="dot" style="background:${esc(v)};color:${esc(v)};display:inline-block"></span>`;
    case 'tel': return v ? `<a href="tel:${esc(v)}" onclick="event.stopPropagation()">${esc(v)}</a>` : '—';
    default: return esc(v ?? '') || '<span class="muted">—</span>';
  }
}
function calcValue(c, r) {
  const v = r._c?.[c.k];
  if (c.t === 'money') return money(v);
  if (c.t === 'pct') return v === null || v === undefined ? '—' : `<span class="${v >= 0 ? 'up' : 'down'}">${n2(v)}%</span>`;
  if (c.t === 'date') return fdate(v);
  if (c.k === 'alerta') return v ? badge(v) : '';
  return esc(v ?? '');
}
const plain = s => String(s).replace(/<[^>]+>/g, '');
function rowText(e, r) {
  const E = A.schema[e];
  return E.fields.filter(f => ['text', 'tel', 'email', 'select', 'ref', 'textarea', 'date'].includes(f.t))
    .map(f => f.t === 'ref' ? refLabel(f.ref, r[f.k]) : f.t === 'date' ? fdate(r[f.k]) : r[f.k]).join(' ').toLowerCase();
}

/* ---------- Lista genérica ---------- */
route(/^#\/e\/(\w+)$/, async (view, e) => {
  const E = A.schema[e]; if (!E) throw new Error('Módulo desconhecido.');
  await ensureRefs(e);
  const rows = await load(e, true);
  const st = A.ui[e] = A.ui[e] || { q: '', st: '', sort: null, dir: -1 };
  setPage(E.label, `${rows.length} registo${rows.length === 1 ? '' : 's'}`,
    `<button class="btn ghost hide-m" id="impBtn" title="Importar CSV">${icon('upload')}</button>
     <button class="btn ghost hide-m" id="expBtn" title="Exportar CSV">${icon('download')}</button>
     <button class="btn pri" id="newBtn">${icon('plus')}<span class="btn-txt-m">${esc(E.one)}</span></button>`);
  const statusF = E.status ? E.fields.find(f => f.k === E.status) : null;
  const listF = E.fields.filter(f => f.list);
  const calcs = E.calc || [];
  view.innerHTML = `
    <div class="row" style="margin-bottom:12px">
      <div class="search">${icon('search')}<input class="inp" id="q" placeholder="Pesquisar ${esc(E.label.toLowerCase())}…" value="${esc(st.q)}"></div>
    </div>
    ${statusF ? `<div class="chips" id="chips" style="margin-bottom:12px"></div>` : ''}
    <div id="sum" class="grid kpis" style="margin-bottom:12px"></div>
    <div class="glass tbl-wrap has-cards"><table class="tbl"><thead><tr>
      ${listF.map(f => `<th data-s="${f.k}" class="${['money', 'number', 'int'].includes(f.t) ? 'num' : ''}">${esc(f.l)}</th>`).join('')}
      ${calcs.map(c => `<th data-s="_c.${c.k}" class="${['money', 'pct'].includes(c.t) ? 'num' : ''}">${esc(c.l)}</th>`).join('')}
    </tr></thead><tbody id="tb"></tbody></table></div>
    <div class="cards-m" id="cm"></div>`;
  const get = (r, k) => k.startsWith('_c.') ? r._c?.[k.slice(3)] : r[k];
  function draw() {
    let list = rows.filter(r => (!st.st || r[E.status] === st.st) && (!st.q || rowText(e, r).includes(st.q.toLowerCase())));
    if (st.sort) list = [...list].sort((a, b) => { const x = get(a, st.sort), y = get(b, st.sort); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
    if (statusF) $('#chips').innerHTML = ['', ...statusF.opts].map(o => `<button class="chip ${st.st === o ? 'on' : ''}" data-o="${esc(o)}">${o ? (E.tabs?.[o] || o) : 'Todos'}<span class="n">${o ? rows.filter(r => r[E.status] === o).length : rows.length}</span></button>`).join('')
      + (e === 'servicos' ? `<a class="chip" href="#/e/checklists">Checklists ↗</a>` : '');
    $$('#chips .chip').forEach(b => b.onclick = () => { st.st = b.dataset.o; draw(); });
    // resumo
    const sums = [...listF.filter(f => f.t === 'money').map(f => [f.l, list.reduce((s, r) => s + (+r[f.k] || 0), 0)]),
      ...calcs.filter(c => c.t === 'money').map(c => [c.l, list.reduce((s, r) => s + (+r._c?.[c.k] || 0), 0)])].slice(0, 3);
    $('#sum').innerHTML = list.length && sums.length ? `<div class="glass kpi"><div class="l">Registos</div><div class="v">${list.length}</div></div>` +
      sums.map(([l, v]) => `<div class="glass kpi"><div class="l">${esc(l)} (total)</div><div class="v">${money(v)}</div></div>`).join('') : '';
    $('#tb').innerHTML = list.map(r => `<tr data-id="${r.id}">${listF.map(f => `<td class="${['money', 'number', 'int'].includes(f.t) ? 'num' : ''}">${cellValue(e, f, r)}</td>`).join('')}
      ${calcs.map(c => `<td class="${['money', 'pct'].includes(c.t) ? 'num' : ''}">${calcValue(c, r)}</td>`).join('')}</tr>`).join('')
      || `<tr><td colspan="99"><div class="empty">Sem registos. ${rows.length ? 'Ajuste a pesquisa.' : 'Clique em “+ ' + esc(E.one) + '” para começar.'}</div></td></tr>`;
    const [f1, f2, f3] = listF;
    $('#cm').innerHTML = list.map(r => {
      const sv = statusF ? badge(r[E.status]) : '';
      const mon = calcs.find(c => c.t === 'money') ? calcValue(calcs.find(c => c.t === 'money'), r) : (listF.find(f => f.t === 'money') ? money(r[listF.find(f => f.t === 'money').k]) : '');
      const others = listF.filter(f => f !== f1 && f.k !== E.status && f.t !== 'money').slice(0, 3).map(f => plain(cellValue(e, f, r))).filter(x => x && x !== '—').join(' · ');
      return `<div class="glass mcard" data-id="${r.id}"><div class="grow" style="min-width:0"><div class="t1">${plain(cellValue(e, f1, r))}</div><div class="t2">${esc(others)}</div></div>
        <div style="text-align:right">${sv}<div class="mono" style="margin-top:4px;font-weight:650">${mon}</div></div></div>`;
    }).join('') || '<div class="empty">Sem registos.</div>';
    $$('#tb tr[data-id], #cm [data-id]').forEach(tr => tr.onclick = () => e === 'clientes' ? (location.hash = '#/cliente/' + tr.dataset.id) : openForm(e, byId(e, tr.dataset.id)));
  }
  $$('th[data-s]').forEach(th => th.onclick = () => { st.dir = st.sort === th.dataset.s ? -st.dir : 1; st.sort = th.dataset.s; draw(); });
  $('#q').oninput = ev => { st.q = ev.target.value; draw(); };
  $('#newBtn').onclick = () => openForm(e);
  $('#expBtn').onclick = () => exportCSV(e, rows);
  $('#impBtn').onclick = () => importCSV(e);
  draw();
});

/* ---------- CSV ---------- */
function exportCSV(e, rows) {
  const E = A.schema[e];
  const fs = E.fields.filter(f => !['photos', 'signature', 'checklist', 'lines', 'timeline'].includes(f.t) && !f.hide);
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['ID', ...fs.map(f => f.l), ...(E.calc || []).map(c => c.l)];
  const lines = rows.map(r => [r.id, ...fs.map(f => f.t === 'ref' ? refLabel(f.ref, r[f.k]) : r[f.k]), ...(E.calc || []).map(c => r._c?.[c.k])].map(q).join(';'));
  const blob = new Blob(['﻿' + [head.map(q).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${e}-${today()}.csv`; a.click();
}
function parseCSV(txt) {
  txt = txt.replace(/^﻿/, ''); const sep = (txt.split('\n')[0].match(/;/g) || []).length >= (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const out = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); out.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); out.push(row); }
  return out.filter(r => r.some(x => x.trim()));
}
function importCSV(e) {
  const E = A.schema[e];
  const m = modal('Importar CSV · ' + E.label, `<p class="muted small">A primeira linha deve conter os nomes das colunas (iguais aos títulos dos campos, ex.: <i>${E.fields.slice(0, 4).map(f => esc(f.l)).join('; ')}</i>). Pode exportar primeiro para obter o modelo. Colunas de ligação (ex.: Cliente) aceitam o nome.</p>
    <input type="file" accept=".csv,text/csv" class="inp" id="csvf"><div id="csvr" class="small" style="margin-top:10px"></div>`,
    `<button class="btn pri right" id="csvGo" disabled>Importar</button>`, 'sm');
  let data = [];
  $('#csvf', m.el).onchange = async ev => {
    const rows = parseCSV(await ev.target.files[0].text()); const head = rows.shift().map(h => h.trim().toLowerCase());
    const map = head.map(h => E.fields.find(f => f.l.toLowerCase() === h || f.k === h));
    data = rows.map(r => { const o = {}; map.forEach((f, i) => { if (!f || r[i] === undefined || r[i] === '') return; let v = r[i].trim();
      if (f.t === 'ref') { const t = (A.cache[f.ref] || []).find(x => tplLabel(f.ref, x).toLowerCase() === v.toLowerCase() || (x.nome || '').toLowerCase() === v.toLowerCase()); v = t ? t.id : null; }
      if (['money', 'number'].includes(f.t)) v = v.replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
      if (f.t === 'date' && /^\d{2}\/\d{2}\/\d{4}$/.test(v)) v = v.split('/').reverse().join('-');
      if (f.t === 'bool') v = /^(1|sim|s|true|x|✓)$/i.test(v) ? 1 : 0;
      o[f.k] = v; }); return o; }).filter(o => Object.keys(o).length);
    $('#csvr', m.el).innerHTML = `${data.length} linhas prontas · colunas reconhecidas: ${map.filter(Boolean).map(f => esc(f.l)).join(', ') || 'nenhuma'}`;
    $('#csvGo', m.el).disabled = !data.length;
  };
  $('#csvGo', m.el).onclick = async () => {
    let ok = 0, er = 0;
    for (const d of data) { try { await api('save', { e }, d); ok++; } catch { er++; } }
    m.close(); toast(`${ok} importados${er ? `, ${er} com erro` : ''}.`); router();
  };
}

/* ---------- Formulário genérico ---------- */
function defVal(f) {
  const d = f.def;
  if (d === undefined) return f.t === 'bool' ? 0 : '';
  if (d === '@today') return today();
  if (d === '@iva') return A.S.iva_isento === '1' ? 0 : +A.S.iva;
  if (d === '@validade') return addDays(today(), +A.S.validade_dias || 15);
  if (d === '@chk_ext' || d === '@chk_int') return (A.S[d.slice(1)] || '').split('\n').filter(Boolean).map(t => ({ t: t.trim(), d: false }));
  return d;
}
const jparse = v => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]') || []; } catch { return []; } };
const sizePrice = (s, size) => +((/Pequeno/.test(size || '') ? s.preco_pequeno : /Mota/.test(size || '') ? s.preco_moto : /Luxo/.test(size || '') ? (s.preco_luxo || s.preco_grande) : /Grande|SUV|Carrinha/.test(size || '') ? s.preco_grande : s.preco_medio) || s.preco_medio || 0);

async function openForm(e, row = null, preset = {}) {
  const E = A.schema[e];
  await ensureRefs(e);
  if (['orcamentos', 'faturas', 'trabalhos', 'marcacoes'].includes(e)) { await load('servicos'); await load('checklists'); }
  const isNew = !row?.id;
  const val = {};
  E.fields.forEach(f => {
    let v = row ? row[f.k] : (preset[f.k] !== undefined ? preset[f.k] : defVal(f));
    if (row && (v === null || v === undefined) && f.t === 'bool' && f.def !== undefined) v = f.def; // campos novos em registos antigos
    if (['lines', 'checklist', 'photos', 'timeline', 'payments', 'damagemap'].includes(f.t)) v = jparse(v);
    if (f.t === 'jsonmap') { try { v = typeof v === 'object' && v ? v : JSON.parse(v || '{}') || {}; } catch { v = {}; } if (Array.isArray(v)) v = {}; }
    val[f.k] = v ?? '';
  });
  if (e === 'faturas' && !val.pagamentos.length && +row?.valor_pago > 0) val.pagamentos = [{ d: row.data_pagamento || row.data, v: +row.valor_pago, m: row.metodo || '' }];
  const locked = e === 'inspecoes' && !!row?.assinado_em;
  const fieldHTML = f => {
    if (f.hide) return '';
    const v = val[f.k]; const id = 'f_' + f.k; const cls = f.half ? '' : 'full';
    const help = f.help ? `<small>${esc(f.help)}</small>` : '';
    let inp;
    switch (f.t) {
      case 'textarea': inp = `<textarea class="inp" id="${id}" data-k="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`; break;
      case 'select': inp = `<select class="inp" id="${id}" data-k="${f.k}"><option value="">—</option>${f.opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`; break;
      case 'ref': inp = `<select class="inp" id="${id}" data-k="${f.k}" data-ref="${f.ref}"></select>`; break;
      case 'bool': return `<label class="switch ${cls}"><input type="checkbox" data-k="${f.k}" ${+v ? 'checked' : ''}><span>${esc(f.l)}</span></label>`;
      case 'money': case 'number': case 'int': inp = `<input class="inp" type="number" inputmode="decimal" step="${f.step || (f.t === 'int' ? '1' : '0.01')}" id="${id}" data-k="${f.k}" value="${esc(v)}" placeholder="${f.t === 'money' ? '0,00 €' : ''}">`; break;
      case 'date': inp = `<input class="inp" type="date" id="${id}" data-k="${f.k}" value="${esc(v)}">`; break;
      case 'time': inp = `<input class="inp" type="time" id="${id}" data-k="${f.k}" value="${esc(v)}">`; break;
      case 'color': inp = `<input class="inp" type="color" id="${id}" data-k="${f.k}" value="${esc(v || '#22d3ee')}" style="padding:4px;height:42px">`; break;
      case 'email': inp = `<input class="inp" type="email" id="${id}" data-k="${f.k}" value="${esc(v)}">`; break;
      case 'tel': inp = `<input class="inp" type="tel" id="${id}" data-k="${f.k}" value="${esc(v)}">`; break;
      case 'rating': inp = `<div class="stars" data-rt="${f.k}">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-v="${i}" class="${i <= +v ? 'on' : ''}">★</button>`).join('')}</div>`; break;
      case 'lines': case 'checklist': case 'photos': case 'signature': case 'payments': case 'damagemap': inp = `<div data-ed="${f.k}"></div>`; break;
      case 'timeline': if (!v.length) return ''; inp = `<div class="tl">${v.map(h => `<div class="tl-i"><b>${esc(h.e)}</b><span class="small muted">${esc(h.em)} · ${esc(h.por || '')}</span></div>`).join('')}</div>`; break;
      default: inp = `<input class="inp" id="${id}" data-k="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}">`;
    }
    return `<label class="f ${cls}"><span>${esc(f.l)}${f.req ? ' *' : ''}</span>${inp}${help}</label>`;
  };
  const extras = isNew ? '' : formExtras(e, row);
  const m = modal((isNew ? 'Novo · ' : '') + esc(isNew ? E.one : tplLabel(e, row)),
    `${locked ? `<div class="alert" style="border-color:rgba(52,211,153,.4);margin-bottom:14px">🔒 <span>Assinado por <b>${esc(row.assinado_por || refLabel('clientes', row.cliente_id))}</b> em ${esc(row.assinado_em)}. Este registo está bloqueado.</span></div>` : ''}
     <form class="form ${locked ? 'locked' : ''}" id="frm" autocomplete="off">${E.fields.map(fieldHTML).join('')}<div class="full" id="calcBox"></div></form>`,
    `${isNew ? '' : `<button class="btn ghost danger" id="del">${icon('trash')}</button>`}${extras}<span class="right"></span>
     <button class="btn ghost" data-cancel>${locked ? 'Fechar' : 'Cancelar'}</button>${locked ? (isTec() ? '' : `<button class="btn danger" id="unlock">Anular assinatura e editar</button>`) : `<button class="btn pri" id="save">${icon('check')} Guardar</button>`}`);
  const el = m.el;
  $('[data-cancel]', el).onclick = m.close;

  // Selects de ligação (com filtro por cliente)
  const fillRef = sel => {
    const f = E.fields.find(x => x.k === sel.dataset.k);
    let opts = A.cache[f.ref] || [];
    if (f.filter) { const cv = $(`[data-k="${f.filter}"]`, el)?.value; if (cv) opts = opts.filter(o => +o[f.filter] === +cv); }
    if (f.ref === 'servicos' || f.ref === 'equipa') opts = opts.filter(o => +o.ativo || +o.id === +val[f.k]);
    sel.innerHTML = `<option value="">—</option>` + opts.map(o => `<option value="${o.id}" ${+o.id === +val[f.k] ? 'selected' : ''}>${esc(tplLabel(f.ref, o))}</option>`).join('');
  };
  $$('select[data-ref]', el).forEach(fillRef);
  el.addEventListener('change', ev => {
    const k = ev.target.dataset.k; if (!k) return;
    val[k] = ev.target.type === 'checkbox' ? (ev.target.checked ? 1 : 0) : ev.target.value;
    if (k === 'cliente_id') $$('select[data-ref]', el).forEach(s => { const f = E.fields.find(x => x.k === s.dataset.k); if (f.filter === 'cliente_id') { val[f.k] = ''; fillRef(s); } });
    if (k === 'servico_id') onService();
    if (['veiculo_id'].includes(k) && e === 'trabalhos' && !+val.valor) onService();
    renderCalc();
  });
  el.addEventListener('input', ev => { const k = ev.target.dataset.k; if (k) { val[k] = ev.target.value; renderCalc(); } });
  el.addEventListener('focusout', ev => { const k = ev.target.dataset.k;
    if (k === 'matricula') { const p = String(val.matricula || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (p.length === 6) { val.matricula = ev.target.value = p.match(/.{2}/g).join('-'); renderCalc(); } }
    if (k === 'vin') { val.vin = ev.target.value = String(val.vin || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); } });
  $$('[data-rt]', el).forEach(box => box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; val[box.dataset.rt] = +b.dataset.v; $$('button', box).forEach(x => x.classList.toggle('on', +x.dataset.v <= +b.dataset.v)); });

  function onService() {
    const s = byId('servicos', val.servico_id); if (!s) return;
    const size = byId('veiculos', val.veiculo_id)?.tamanho;
    const set = (k, v) => { val[k] = v; const i = $(`[data-k="${k}"]`, el); if (i) i.value = v; };
    if (e === 'trabalhos') {
      if (!+val.valor) set('valor', sizePrice(s, size));
      if (!+val.custo_produtos && s.custo_produtos) set('custo_produtos', s.custo_produtos);
      if (!val.tarefas.some(x => x.s === s.nome) && svcTaskText(s)) { val.tarefas = [...val.tarefas, ...svcTasks(s)]; editors.tarefas?.(); }
    }
    if (e === 'marcacoes') { if (!+val.valor_previsto) set('valor_previsto', sizePrice(s, size)); if (!+val.duracao_h && s.duracao_h) set('duracao_h', s.duracao_h); }
  }

  // Editores especiais
  const editors = {};
  E.fields.filter(f => ['lines', 'checklist', 'photos', 'signature', 'payments', 'damagemap'].includes(f.t)).forEach(f => {
    const box = $(`[data-ed="${f.k}"]`, el); if (!box) return;
    if (f.t === 'payments') editors[f.k] = () => paymentsEditor(box, val, f.k, renderCalc);
    if (f.t === 'damagemap') editors[f.k] = () => damageEditor(box, val, f.k, locked);
    if (f.t === 'lines') editors[f.k] = () => linesEditor(box, val, f.k, renderCalc);
    if (f.t === 'checklist') editors[f.k] = () => checklistEditor(box, val, f.k, f.grupos ? { notes: 'notas_servicos', size: () => byId('veiculos', val.veiculo_id)?.tamanho } : null);
    if (f.t === 'photos') editors[f.k] = () => photosEditor(box, val, f.k);
    if (f.t === 'signature') editors[f.k] = () => signatureEditor(box, val, f.k);
    editors[f.k]?.();
  });

  function renderCalc() {
    const box = $('#calcBox', el); if (!box) return;
    if (e === 'orcamentos' || e === 'faturas') {
      const bruto = val.linhas.reduce((s, l) => s + (+l.q || 0) * (+l.p || 0), 0) + (+val.deslocacao || 0);
      const dp = bruto * (+val.desconto_pct || 0) / 100, sub = bruto - dp - (+val.desconto || 0);
      const iv = sub * (+val.iva_pct || 0) / 100, tot = sub + iv + (+val.gorjeta || 0);
      const pago = (val.pagamentos || []).reduce((s, p) => s + (+p.v || 0), 0);
      box.innerHTML = `<div class="totals"><div><span>Serviços</span><b>${money(bruto)}</b></div>${dp || +val.desconto ? `<div><span>Desconto</span><b>−${money(dp + (+val.desconto || 0))}</b></div>` : ''}
        <div><span>Subtotal</span><b>${money(sub)}</b></div><div><span>IVA ${n2(val.iva_pct)}%</span><b>${money(iv)}</b></div>${+val.gorjeta ? `<div><span>Gorjeta</span><b>${money(val.gorjeta)}</b></div>` : ''}
        <div class="g"><span>Total</span><span>${money(tot)}</span></div>${e === 'faturas' ? `<div><span>Pago</span><b class="up">${money(pago)}</b></div><div><span>Saldo em dívida</span><b style="color:var(--warn)">${money(Math.max(0, tot - pago))}</b></div>` : ''}</div>
        ${e === 'faturas' ? '<div class="note" style="margin-top:12px">⚠️ Documento de controlo interno. Em Portugal, as faturas legais devem ser emitidas em software certificado pela AT — registe aqui o nº dessa fatura e acompanhe os recebimentos.</div>' : ''}`;
    } else if (e === 'trabalhos') {
      const tec = byId('equipa', val.tecnico_id); const ch = +tec?.custo_hora || +A.S.custo_hora;
      const mo = val.custo_mao_obra !== '' && val.custo_mao_obra !== null ? +val.custo_mao_obra : (+val.horas || 0) * ch;
      const com = tec ? (+val.valor || 0) * (+tec.comissao_pct || 0) / 100 : 0;
      const custos = (+val.custo_produtos || 0) + mo + com + (+val.custo_deslocacao || 0) + (+val.outros_custos || 0);
      const lucro = (+val.valor || 0) - custos;
      box.innerHTML = `<div class="grid kpis"><div class="glass kpi"><div class="l">Custos diretos</div><div class="v">${money(custos)}</div><div class="s">Mão de obra ${money(mo + com)}</div></div>
        <div class="glass kpi k-ok"><div class="l">Lucro do trabalho</div><div class="v ${lucro >= 0 ? 'up' : 'down'}">${money(lucro)}</div><div class="s">Margem ${val.valor ? n2(lucro / val.valor * 100) : 0}%</div></div>
        <div class="glass kpi k-vio"><div class="l">Lucro por hora</div><div class="v">${+val.horas ? money(lucro / val.horas) : '—'}</div><div class="s">${n2(val.horas)} h</div></div>
        <div class="glass kpi k-warn"><div class="l">Valor c/ IVA</div><div class="v">${money((+val.valor || 0) * (1 + (A.S.iva_isento === '1' ? 0 : +A.S.iva) / 100))}</div></div></div>`;
    } else if (e === 'veiculos') {
      const vl = $('[data-k="vin"]', el)?.closest('label'); if (vl && box.previousElementSibling !== vl) { box.style.marginTop = '-4px'; vl.after(box); }
      const pi = plateInfo(val.matricula);
      box.innerHTML = `<div class="row" style="gap:10px"><button type="button" class="btn sm" id="vinGo">${icon('search')} Preencher dados pelo VIN</button>
        <span class="small muted grow">${pi ? '🇵🇹 ' + esc(pi) : 'Introduza o VIN (17 caracteres, no livrete/DUA ou no para-brisas) para preencher marca, modelo, ano e motor gratuitamente.'}</span></div><div id="vinRes"></div>`;
      $('#vinGo', box).onclick = async () => {
        const b = $('#vinGo', box); b.disabled = true; b.textContent = 'A consultar…';
        try {
          const r = await api('vin', { v: val.vin || '' });
          const set = (k, v, force) => { if (v === null || v === undefined || v === '') return; if (!force && val[k] && String(val[k]).trim()) return; val[k] = v; const i = $(`[data-k="${k}"]`, el); if (i) i.value = v; };
          set('marca', r.marca); set('modelo', r.modelo); set('ano', r.ano);
          if (r.tamanho && (!row || !row.tamanho || val.tamanho === 'Médio')) set('tamanho', r.tamanho, true);
          const det = [r.marca, r.modelo, r.ano && (r.ano + (r.ano_aprox ? ' (aprox.)' : '')), r.carrocaria, r.motor, r.combustivel, r.pais && 'fabricado em ' + r.pais].filter(Boolean).join(' · ');
          const line = `VIN ${r.vin}: ${det} (fonte: ${r.fonte})`;
          if (!String(val.notas || '').includes(r.vin)) set('notas', (val.notas ? val.notas + '\n' : '') + line, true);
          $('#vinRes', box).innerHTML = `<div class="note" style="margin-top:8px">✅ ${esc(det)}<br><span class="small">Fonte: ${esc(r.fonte)}${r.fonte === 'local' ? ' — sem ligação à base NHTSA; apenas fabricante e ano estimado.' : !r.modelo ? ' — modelo não disponível para este VIN (comum em viaturas europeias); preencha manualmente.' : ''}. Só são preenchidos os campos vazios.</span></div>`;
        } catch (er) { fail(er); }
        b.disabled = false; b.innerHTML = `${icon('search')} Preencher dados pelo VIN`;
      };
    } else if (e === 'marcacoes') {
      box.innerHTML = clashHTML(val, row?.id);
    } else if (e === 'deslocacoes') {
      box.innerHTML = `<div class="note">Custo: <b>${money((+val.km || 0) * +A.S.custo_km + (+val.portagens || 0))}</b> (${n2(A.S.custo_km)} €/km — altere em Definições)</div>`;
    } else if (e === 'inventario' && +val.volume_ml && +val.ml_por_uso) {
      const c = (+val.custo_unitario || 0) / val.volume_ml * (val.ml_por_uso / (1 + (+val.diluicao || 0)));
      box.innerHTML = `<div class="note">Custo por utilização: <b>${money(c)}</b> · ${n2(val.ml_por_uso / (1 + (+val.diluicao || 0)))} ml de concentrado por uso · ~${Math.floor(val.volume_ml / (val.ml_por_uso / (1 + (+val.diluicao || 0))))} utilizações por embalagem</div>`;
    }
  }
  renderCalc();

  $('#unlock', el)?.addEventListener('click', async () => {
    if (!await confirmBox('Anular a assinatura do cliente e desbloquear a ficha para edição? A assinatura terá de ser recolhida de novo.', 'Anular assinatura')) return;
    try { await api('save', { e }, { id: row.id, _desbloquear: 1 }); m.close(); A.cache[e] = null; await load(e, true); openForm(e, byId(e, row.id)); } catch (er) { fail(er); }
  });
  if ($('#save', el)) $('#save', el).onclick = async () => {
    const data = { ...val }; if (!isNew) data.id = row.id;
    $('#save', el).disabled = true;
    try {
      const r = await api('save', { e }, data);
      const list = A.cache[e] || (A.cache[e] = []);
      const i = list.findIndex(x => +x.id === +r.row.id); if (i >= 0) list[i] = r.row; else list.unshift(r.row);
      m.close(); toast(isNew ? E.one + ' criado.' : 'Alterações guardadas.'); loadBadges();
      if (preset._after) preset._after(r.row); else router();
    } catch (err) { fail(err); $('#save', el).disabled = false; }
  };
  $('#del', el)?.addEventListener('click', async () => {
    if (!await confirmBox('Eliminar este registo? Esta ação não pode ser anulada.', 'Eliminar')) return;
    try {
      let r = await api('delete', { e }, { id: row.id });
      if (r.confirm) { if (!await confirmBox(r.confirm, 'Eliminar mesmo assim')) return; r = await api('delete', { e }, { id: row.id, force: 1 }); }
      A.cache[e] = (A.cache[e] || []).filter(x => +x.id !== +row.id); m.close(); toast('Eliminado.'); router();
    } catch (err) { fail(err); }
  });
  bindExtras(e, row, m);
  return m;
}

/* Matrículas portuguesas: normaliza e indica a época de registo pelo formato (sem custos, sem internet). */
function plateInfo(m) {
  const p = String(m || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (p.length !== 6) return '';
  const g = [p.slice(0, 2), p.slice(2, 4), p.slice(4)], L = x => /^[A-Z]{2}$/.test(x), N = x => /^\d{2}$/.test(x);
  const f = g.map(x => L(x) ? 'AA' : N(x) ? '00' : '?').join('-');
  const era = { 'AA-00-00': 'entre 1937 e 1992', '00-00-AA': 'entre 1992 e 2005', '00-AA-00': 'entre 2005 e 2020', 'AA-00-AA': 'a partir de 2020' }[f];
  return era ? `Matrícula ${g.join('-')} (formato ${f}): 1.ª matrícula em Portugal ${era}. Viaturas importadas recebem matrícula da época da legalização.` : '';
}
function clashHTML(v, selfId) {
  const all = (A.cache.marcacoes || []).filter(r => +r.id !== +selfId && r.data === v.data && !['Cancelada', 'Faltou'].includes(r.estado));
  const t2m = t => t ? (+t.slice(0, 2)) * 60 + (+t.slice(3, 5)) : null;
  const s1 = t2m(v.hora), e1 = s1 === null ? null : s1 + (+v.duracao_h || 1) * 60;
  const out = [];
  all.forEach(r => {
    const s2 = t2m(r.hora), e2 = s2 === null ? null : s2 + (+r.duracao_h || 1) * 60;
    const overlap = s1 !== null && s2 !== null && s1 < e2 && s2 < e1;
    if (!overlap) return;
    if (v.tecnico_id && +r.tecnico_id === +v.tecnico_id) out.push(`${esc(refLabel('equipa', r.tecnico_id))} já tem ${esc(refLabel('clientes', r.cliente_id))} às ${esc(r.hora)}`);
    else if (v.box && r.box === v.box) out.push(`${esc(r.box)} ocupada por ${esc(refLabel('clientes', r.cliente_id))} às ${esc(r.hora)}`);
  });
  const c = byId('clientes', v.cliente_id), faltas = +c?._c?.faltas || 0;
  let h = '';
  if (out.length) h += `<div class="alert" style="border-color:rgba(248,113,113,.45);color:var(--bad)">${icon('alert')}<div><b>Conflito de horário</b><br>${out.join('<br>')}<div class="small muted">Pode guardar na mesma — apenas confirme.</div></div></div>`;
  if (faltas) h += `<div class="alert" style="border-color:rgba(251,191,36,.45)">${icon('alert')}<div><b>${faltas} falta${faltas > 1 ? 's' : ''}</b> registada${faltas > 1 ? 's' : ''} para este cliente — considere pedir sinal.</div></div>`;
  const s = byId('servicos', v.servico_id);
  if (s) { const size = byId('veiculos', v.veiculo_id)?.tamanho; h += `<div class="note">${esc(s.nome)} — ${esc(size || 'tamanho n/d')}: <b>${money(sizePrice(s, size))}</b> s/ IVA · ≈ ${n2(s.duracao_h)} h de trabalho${+v.sinal ? ` · sinal ${money(v.sinal)} ${+v.sinal_pago ? '✓ pago' : '(por pagar)'}` : ''}</div>`; }
  return h;
}
function paymentsEditor(box, val, k, onChange) {
  const M = ['Numerário', 'MB Way', 'Multibanco', 'Transferência', 'Cartão', 'Outro'];
  const draw = () => {
    box.innerHTML = `${val[k].map((p, i) => `<div class="line" data-i="${i}" style="grid-template-columns:140px 110px 1fr 1fr 34px;margin-bottom:6px">
      <input class="inp" type="date" data-p="d" value="${esc(p.d || '')}"><input class="inp" type="number" step="0.01" data-p="v" value="${esc(p.v ?? '')}" placeholder="Valor">
      <select class="inp" data-p="m"><option value="">Método…</option>${M.map(x => `<option ${x === p.m ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <input class="inp" data-p="n" value="${esc(p.n || '')}" placeholder="Nota (ex.: sinal)"><button type="button" class="btn icon ghost" data-rm>${icon('x')}</button></div>`).join('') || '<div class="small muted" style="margin-bottom:8px">Sem pagamentos registados.</div>'}
      <button type="button" class="btn sm" data-add>${icon('plus')} Registar pagamento</button>`;
    $$('[data-i]', box).forEach(r => { const i = +r.dataset.i;
      $$('[data-p]', r).forEach(x => x.oninput = x.onchange = () => { val[k][i][x.dataset.p] = x.value; onChange(); });
      $('[data-rm]', r).onclick = () => { val[k].splice(i, 1); draw(); onChange(); }; });
    $('[data-add]', box).onclick = () => {
      const bruto = val.linhas.reduce((s, l) => s + (+l.q || 0) * (+l.p || 0), 0) + (+val.deslocacao || 0);
      const sub = bruto * (1 - (+val.desconto_pct || 0) / 100) - (+val.desconto || 0);
      const tot = sub * (1 + (+val.iva_pct || 0) / 100) + (+val.gorjeta || 0);
      const falta = Math.max(0, tot - val[k].reduce((s, p) => s + (+p.v || 0), 0));
      val[k].push({ d: today(), v: Math.round(falta * 100) / 100, m: 'MB Way', n: '' }); draw(); onChange();
    };
  };
  draw();
}
const DMG = ['Risco', 'Mossa', 'Lasca', 'Jante', 'Vidro', 'Ótica', 'Mancha', 'Outro'];
function carSVG() {
  return `<svg viewBox="0 0 200 400" class="carmap-svg"><text x="100" y="12" text-anchor="middle">FRENTE</text><text x="100" y="396" text-anchor="middle">TRASEIRA</text>
    <text x="8" y="200" transform="rotate(-90 8 200)" text-anchor="middle">ESQUERDA</text><text x="192" y="200" transform="rotate(90 192 200)" text-anchor="middle">DIREITA</text>
    <rect x="34" y="70" width="10" height="44" rx="4" class="w"/><rect x="156" y="70" width="10" height="44" rx="4" class="w"/><rect x="34" y="280" width="10" height="44" rx="4" class="w"/><rect x="156" y="280" width="10" height="44" rx="4" class="w"/>
    <path d="M60 30 Q100 14 140 30 Q160 40 160 90 L160 330 Q160 378 100 384 Q40 378 40 330 L40 90 Q40 40 60 30Z" class="b"/>
    <path d="M58 160 Q100 146 142 160 L134 196 Q100 188 66 196Z" class="g"/><rect x="66" y="208" width="68" height="78" rx="12" class="g" opacity=".5"/>
    <path d="M62 318 Q100 330 138 318 L134 296 Q100 302 66 296Z" class="g"/><path d="M100 30 V150 M100 300 V380 M70 100 H130" class="l"/>
    <ellipse cx="34" cy="150" rx="7" ry="4" class="l"/><ellipse cx="166" cy="150" rx="7" ry="4" class="l"/></svg>`;
}
function damageEditor(box, val, k, locked) {
  const draw = () => {
    box.innerHTML = `<div class="carmap-wrap"><div class="carmap" ${locked ? '' : 'data-tap'}>${carSVG()}${val[k].map((p, i) => `<span class="pin" style="left:${p.x}%;top:${p.y}%">${i + 1}</span>`).join('')}</div>
      <div class="grow">${val[k].map((p, i) => `<div class="row" data-i="${i}" style="margin-bottom:6px;flex-wrap:nowrap"><b class="pin" style="position:static;transform:none">${i + 1}</b>
        <select class="inp" data-d="t" style="max-width:120px" ${locked ? 'disabled' : ''}>${DMG.map(x => `<option ${x === p.t ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <input class="inp" data-d="n" value="${esc(p.n || '')}" placeholder="Ex.: risco ligeiro, guarda-lamas frente direito" ${locked ? 'disabled' : ''}>${locked ? '' : `<button type="button" class="btn icon ghost" data-rm>${icon('x')}</button>`}</div>`).join('') || `<p class="small muted">${locked ? 'Sem danos registados.' : 'Toque no desenho para marcar cada dano.'}</p>`}</div></div>`;
    if (locked) return;
    $('[data-tap]', box).onclick = ev => { const r = ev.currentTarget.getBoundingClientRect();
      val[k].push({ x: Math.round((ev.clientX - r.left) / r.width * 1000) / 10, y: Math.round((ev.clientY - r.top) / r.height * 1000) / 10, t: 'Risco', n: '' }); draw(); $$('[data-d="n"]', box).pop()?.focus(); };
    $$('[data-i]', box).forEach(r => { const i = +r.dataset.i;
      $$('[data-d]', r).forEach(x => x.oninput = x.onchange = () => { val[k][i][x.dataset.d] = x.value; });
      $('[data-rm]', r).onclick = () => { val[k].splice(i, 1); draw(); }; });
  };
  draw();
}
function linesEditor(box, val, k, onChange) {
  const svcs = (A.cache.servicos || []).filter(s => +s.ativo);
  const draw = () => {
    box.innerHTML = `<div class="lines">${val[k].map((l, i) => `<div class="line" data-i="${i}">
      <input class="inp" data-l="d" value="${esc(l.d)}" placeholder="Descrição"><input class="inp" type="number" step="0.01" data-l="q" value="${esc(l.q ?? 1)}" title="Qtd.">
      <input class="inp" type="number" step="0.01" data-l="p" value="${esc(l.p ?? '')}" placeholder="Preço s/IVA"><div class="tot">${money((+l.q || 0) * (+l.p || 0))}</div>
      <button type="button" class="btn icon ghost" data-rm>${icon('x')}</button></div>`).join('')}</div>
      <div class="row" style="margin-top:10px"><select class="inp" style="max-width:340px" data-addsvc><option value="">+ Adicionar serviço / extra do catálogo…</option>
      ${svcs.map(s => `<option value="${s.id}">${esc(s.tipo === 'Extra' ? '➕ ' : '')}${esc(s.nome)} — ${money(s.preco_medio)}</option>`).join('')}</select>
      <button type="button" class="btn sm" data-addl>${icon('plus')} Linha livre</button></div>`;
    $$('.line', box).forEach(row => {
      const i = +row.dataset.i;
      $$('[data-l]', row).forEach(inp => inp.oninput = () => { val[k][i][inp.dataset.l] = inp.value; $('.tot', row).textContent = money((+val[k][i].q || 0) * (+val[k][i].p || 0)); onChange(); });
      $('[data-rm]', row).onclick = () => { val[k].splice(i, 1); draw(); onChange(); };
    });
    $('[data-addl]', box).onclick = () => { val[k].push({ d: '', q: 1, p: '' }); draw(); };
    $('[data-addsvc]', box).onchange = ev => {
      const s = byId('servicos', ev.target.value); if (!s) return;
      const size = byId('veiculos', val.veiculo_id)?.tamanho;
      val[k].push({ d: s.nome, q: 1, p: sizePrice(s, size) }); draw(); onChange();
    };
  };
  draw();
}
const svcTaskText = s => String(s.tarefas_padrao || '').trim() || String(byId('checklists', s.checklist_id)?.tarefas || '');
const svcTasks = s => svcTaskText(s).split('\n').map(t => t.trim()).filter(Boolean).map(t => ({ t, d: false, s: s.nome }));
/* Checklist. Com opts (trabalhos): tarefas agrupadas por serviço, carregamento a partir do catálogo e notas por serviço/tarefa. */
function checklistEditor(box, val, k, opts = null) {
  const notes = () => (opts && (val[opts.notes] = val[opts.notes] && typeof val[opts.notes] === 'object' && !Array.isArray(val[opts.notes]) ? val[opts.notes] : {}));
  const open = new Set(), extra = new Set();
  const draw = () => {
    const L = val[k], done = L.filter(x => x.d).length;
    const groups = opts ? [...new Set([...L.map(x => x.s || ''), ...extra])] : [''];
    if (opts && !groups.length) groups.push('');
    const item = (x, i) => `<div class="chk-i ${x.d ? 'done' : ''}" data-i="${i}"><input type="checkbox" ${x.d ? 'checked' : ''} aria-label="Feito"><input type="text" value="${esc(x.t)}">
      ${opts ? `<button type="button" class="btn icon ghost sm ${x.n ? 'has' : ''}" data-note title="Nota da tarefa">${icon('chat')}</button>` : ''}<button type="button" class="btn icon ghost sm" data-rm title="Remover">${icon('x')}</button></div>
      ${opts && (x.n || open.has(i)) ? `<div class="chk-note"><input class="inp" data-tn="${i}" value="${esc(x.n || '')}" placeholder="Nota desta tarefa (ex.: material usado, observação)"></div>` : ''}`;
    const groupHTML = g => {
      const idx = L.map((x, i) => [x, i]).filter(([x]) => (x.s || '') === g);
      const gd = idx.filter(([x]) => x.d).length;
      return `<div class="chk-g" data-g="${esc(g)}">${opts ? `<div class="chk-gh"><b class="grow">${esc(g || 'Tarefas gerais')}</b><span class="small muted">${gd}/${idx.length}</span>
          <button type="button" class="btn sm ghost" data-allg="${esc(g)}" title="Marcar todas">${icon('check')}</button><button type="button" class="btn icon ghost sm" data-rmg="${esc(g)}" title="Remover serviço">${icon('trash')}</button></div>` : ''}
        <div class="chk">${idx.map(([x, i]) => item(x, i)).join('')}</div>
        <div class="row" style="margin-top:6px"><input class="inp grow" placeholder="Nova tarefa${opts && g ? ' em ' + esc(g) : ''}… (Enter)" data-new="${esc(g)}"><button type="button" class="btn sm" data-add="${esc(g)}">${icon('plus')}</button></div>
        ${opts ? `<label class="f" style="margin-top:8px"><span>Notas do serviço${g ? ' · ' + esc(g) : ''}</span><textarea class="inp" style="min-height:60px" data-gn="${esc(g)}" placeholder="Produtos usados, medições, observações para o cliente…">${esc(notes()[g || ''] || '')}</textarea></label>` : ''}</div>`;
    };
    const svcs = opts ? (A.cache.servicos || []).filter(s => +s.ativo && svcTaskText(s)) : [];
    box.innerHTML = `<div class="row small muted" style="margin-bottom:8px"><span>${done}/${L.length} concluídas</span><div class="bar grow" style="max-width:260px"><i style="width:${L.length ? done / L.length * 100 : 0}%"></i></div></div>
      ${opts ? `<div class="row" style="margin-bottom:10px"><select class="inp" data-load style="max-width:360px"><option value="">+ Carregar tarefas de um serviço contratado…</option>${svcs.map(s => `<option value="${s.id}">${s.tipo === 'Extra' ? '➕ ' : ''}${esc(s.nome)} (${svcTasks(s).length} tarefas)</option>`).join('')}</select>
        <input class="inp" data-newg placeholder="ou criar grupo/serviço livre…" style="max-width:240px"><button type="button" class="btn sm" data-addg>${icon('plus')} Grupo</button></div>` : ''}
      ${groups.map(groupHTML).join('')}`;
    $$('.chk-i', box).forEach(r => {
      const i = +r.dataset.i;
      $('input[type=checkbox]', r).onchange = ev => { L[i].d = ev.target.checked; draw(); };
      $('input[type=text]', r).oninput = ev => { L[i].t = ev.target.value; };
      $('[data-rm]', r).onclick = () => { L.splice(i, 1); open.clear(); draw(); };
      $('[data-note]', r)?.addEventListener('click', () => { open.add(i); draw(); $(`[data-tn="${i}"]`, box)?.focus(); });
    });
    $$('[data-tn]', box).forEach(x => x.oninput = () => { L[+x.dataset.tn].n = x.value; });
    $$('[data-gn]', box).forEach(x => x.oninput = () => { notes()[x.dataset.gn] = x.value; });
    const addTo = g => { const inp = $(`[data-new="${CSS.escape(g)}"]`, box); const v = inp.value.trim(); if (!v) return;
      let at = -1; L.forEach((x, i) => { if ((x.s || '') === g) at = i; });
      const it = { t: v, d: false }; if (opts && g) it.s = g;
      if (at < 0) L.push(it); else L.splice(at + 1, 0, it); draw(); $(`[data-new="${CSS.escape(g)}"]`, box)?.focus(); };
    $$('[data-add]', box).forEach(b => b.onclick = () => addTo(b.dataset.add));
    $$('[data-new]', box).forEach(x => x.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); addTo(x.dataset.new); } });
    $$('[data-allg]', box).forEach(b => b.onclick = () => { const g = b.dataset.allg; const all = L.filter(x => (x.s || '') === g).every(x => x.d); L.forEach(x => { if ((x.s || '') === g) x.d = !all; }); draw(); });
    $$('[data-rmg]', box).forEach(b => b.onclick = async () => { const g = b.dataset.rmg; if (!await confirmBox(`Remover as tarefas de “${g || 'Tarefas gerais'}”?`, 'Remover')) return;
      val[k] = L.filter(x => (x.s || '') !== g); delete notes()[g]; open.clear(); draw(); });
    $('[data-load]', box)?.addEventListener('change', ev => { const s = byId('servicos', ev.target.value); if (!s) return;
      if (L.some(x => x.s === s.nome)) { toast('As tarefas deste serviço já estão carregadas.', true); ev.target.value = ''; return; }
      val[k] = [...L, ...svcTasks(s)]; draw(); toast(`${svcTasks(s).length} tarefas de “${s.nome}” carregadas.`); });
    $('[data-addg]', box)?.addEventListener('click', () => { const g = $('[data-newg]', box).value.trim(); if (!g) return;
      extra.add(g); $('[data-newg]', box).value = ''; draw(); $(`[data-new="${CSS.escape(g)}"]`, box)?.focus(); });
  };
  draw();
}
async function resizeImage(file, max = 1600) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const sc = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/jpeg', .85));
}
async function uploadImage(file) {
  const fd = new FormData(); fd.append('f', await resizeImage(file), 'foto.jpg');
  return (await api('upload', {}, fd)).f;
}
function photosEditor(box, val, k) {
  const TAGS = ['Antes', 'Depois', 'Dano', 'Portfólio', 'Outra'];
  const draw = () => {
    box.innerHTML = `<div class="photos">${val[k].map((p, i) => `<div class="ph" data-i="${i}"><img src="${imgURL(p.f)}" loading="lazy">
      <select>${TAGS.map(t => `<option ${t === p.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select><button type="button" class="x">×</button></div>`).join('')}
      <label class="ph-add">${icon('upload')}<span>Adicionar fotos<br><small>câmara ou galeria</small></span><input type="file" accept="image/*" multiple hidden></label></div>`;
    $$('.ph', box).forEach(d => {
      const i = +d.dataset.i;
      $('img', d).onclick = () => lightbox(imgURL(val[k][i].f));
      $('select', d).onchange = ev => { val[k][i].tipo = ev.target.value; };
      $('.x', d).onclick = () => { val[k].splice(i, 1); draw(); };
    });
    $('input[type=file]', box).onchange = async ev => {
      const files = [...ev.target.files]; $('.ph-add span', box).textContent = 'A enviar…';
      const def = val[k].some(p => p.tipo === 'Antes') ? 'Depois' : 'Antes';
      for (const f of files) { try { val[k].push({ f: await uploadImage(f), tipo: def }); } catch (er) { fail(er); } }
      draw();
    };
  };
  draw();
}
function signatureEditor(box, val, k) {
  box.innerHTML = `${val[k] ? `<img src="${val[k]}" style="max-height:120px;background:#f8fafc;border-radius:12px;display:block">` : ''}
    <canvas class="sig ${val[k] ? 'hide' : ''}"></canvas><div class="row" style="margin-top:6px"><span class="small muted grow">Assine com o dedo ou rato.</span><button type="button" class="btn sm" data-clr>Limpar / assinar de novo</button></div>`;
  const c = $('canvas', box); let ctx, drawing = false, dirty = false;
  const setup = () => { const r = c.getBoundingClientRect(); c.width = r.width * 2; c.height = r.height * 2; ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0f172a'; };
  requestAnimationFrame(setup);
  const pos = ev => { const r = c.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  c.onpointerdown = ev => { drawing = true; c.setPointerCapture(ev.pointerId); ctx.beginPath(); ctx.moveTo(...pos(ev)); };
  c.onpointermove = ev => { if (!drawing) return; ctx.lineTo(...pos(ev)); ctx.stroke(); dirty = true; };
  c.onpointerup = () => { drawing = false; if (dirty) val[k] = c.toDataURL('image/png'); };
  $('[data-clr]', box).onclick = () => { val[k] = ''; $('img', box)?.remove(); c.classList.remove('hide'); setup(); ctx.clearRect(0, 0, c.width, c.height); dirty = false; };
}

/* ---------- Ações contextuais nos formulários ---------- */
function formExtras(e, r) {
  const b = (id, ic, l) => `<button class="btn sm" data-x-${id}>${icon(ic)}<span class="btn-txt-m">${l}</span></button>`;
  let h = '';
  if (A.schema[e].print) h += b('print', 'print', e === 'trabalhos' ? 'Ordem de trabalho' : 'Imprimir / PDF');
  if (r.cliente_id || e === 'clientes' || e === 'leads') h += b('msg', 'chat', 'Mensagem');
  if (e === 'clientes') h += b('ficha', 'eye', 'Ficha') + b('portal', 'link', 'Link do portal');
  if (e === 'leads' && !r.cliente_id) h += b('conv', 'users', 'Converter em cliente');
  if (e === 'orcamentos' || e === 'marcacoes') h += b('job', 'wrench', 'Criar trabalho');
  if (e === 'trabalhos') h += b('gate', 'file', 'Guia de saída');
  if (e === 'trabalhos' && jparse(r.fotos).length) h += b('social', 'upload', 'Antes/depois p/ redes');
  if (e === 'trabalhos' && !isTec()) h += b('cert', 'shield', 'Certificado cerâmico');
  if (e === 'trabalhos' && !isTec()) h += b('fat', 'receipt', 'Faturação');
  if (e === 'trabalhos' && !['Concluído', 'Cancelado'].includes(r.estado)) { const ST = A.schema.trabalhos.fields.find(f => f.k === 'estado').opts; h += `<button class="btn sm pri" data-x-next>${icon('arrow')} ${esc(ST[ST.indexOf(r.estado) + 1])}</button>`; }
  if (e === 'trabalhos' || e === 'marcacoes') h += b('insp', 'clipboard', 'Inspeção');
  return h;
}
function bindExtras(e, r, m) {
  if (!r) return;
  const on = (id, fn) => { const x = $(`[data-x-${id}]`, m.el); if (x) x.onclick = fn; };
  on('print', () => { m.close(); location.hash = `#/doc/${e}/${r.id}`; });
  on('social', () => socialExport(r));
  on('cert', () => { m.close(); openForm('garantias', null, { cliente_id: r.cliente_id, veiculo_id: r.veiculo_id, trabalho_id: r.id, tecnico_id: r.tecnico_id, data: r.data, produto: refLabel('servicos', r.servico_id) }); });
  on('gate', () => { m.close(); location.hash = `#/doc/saida/${r.id}`; });
  on('next', async () => {
    const ST = A.schema.trabalhos.fields.find(f => f.k === 'estado').opts;
    try { await api('save', { e: 'trabalhos' }, { id: r.id, estado: ST[ST.indexOf(r.estado) + 1] }); m.close(); toast('Avançado para “' + ST[ST.indexOf(r.estado) + 1] + '”.'); A.cache.trabalhos = null; router(); } catch (er) { fail(er); }
  });
  on('ficha', () => { m.close(); location.hash = '#/cliente/' + r.id; });
  on('portal', () => portalLink(r.id));
  on('msg', () => openMessage(msgCtx(e, r)));
  on('conv', async () => {
    try {
      const c = (await api('save', { e: 'clientes' }, { nome: r.nome, telefone: r.telefone, email: r.email, origem: r.origem, notas: r.notas })).row;
      await api('save', { e: 'leads' }, { id: r.id, cliente_id: c.id, estado: 'Ganho' });
      A.cache.clientes = null; m.close(); toast('Cliente criado. Adicione agora o veículo.');
      await load('clientes', true); openForm('veiculos', null, { cliente_id: c.id });
    } catch (er) { fail(er); }
  });
  on('job', async () => {
    m.close();
    const p = { cliente_id: r.cliente_id, veiculo_id: r.veiculo_id, servico_id: r.servico_id || '', tecnico_id: r.tecnico_id || '', data: r.data || today(), estado: 'Agendado' };
    if (e === 'orcamentos') {
      p.valor = r._c?.subtotal; p.extras = 'Orçamento ' + r.numero;
      await load('servicos');
      p.tarefas = jparse(r.linhas).flatMap(l => { const s = (A.cache.servicos || []).find(x => x.nome === l.d); return s?.tarefas_padrao ? svcTasks(s) : [{ t: l.d, d: false, s: l.d }]; });
      p.servico_id = (A.cache.servicos || []).find(x => jparse(r.linhas).some(l => l.d === x.nome) && x.tipo !== 'Extra')?.id || '';
      if (r.estado !== 'Aceite') api('save', { e: 'orcamentos' }, { id: r.id, estado: 'Aceite' }).catch(() => { });
    }
    if (e === 'marcacoes') p.valor = r.valor_previsto;
    openForm('trabalhos', null, p);
  });
  on('fat', async () => {
    m.close(); await load('marcacoes', true);
    const dep = (A.cache.marcacoes || []).filter(x => +x.cliente_id === +r.cliente_id && +x.sinal_pago && +x.sinal > 0 && x.data <= (r.data || today()) && x.data >= addDays(r.data || today(), -60));
    openForm('faturas', null, { cliente_id: r.cliente_id, trabalho_id: r.id, gorjeta: r.gorjeta || '', linhas: [{ d: [refLabel('servicos', r.servico_id), r.extras].filter(Boolean).join(' — ') || 'Serviço de detailing', q: 1, p: r.valor || 0 }],
      pagamentos: dep.map(x => ({ d: x.data, v: +x.sinal, m: '', n: 'Sinal da marcação de ' + fdate(x.data) })) });
    if (dep.length) toast('Sinal da marcação creditado automaticamente.');
  });
  on('insp', () => { m.close(); openForm('inspecoes', null, { cliente_id: r.cliente_id, veiculo_id: r.veiculo_id, trabalho_id: e === 'trabalhos' ? r.id : '' }); });
}
async function portalLink(cid, novo = false) {
  try {
    const { token } = await api('client_link', {}, { id: cid, novo: novo ? 1 : 0 });
    const url = new URL('portal.php?t=' + token, location.href).href;
    const c = byId('clientes', cid) || {};
    const m = modal('Link do portal do cliente', `<p class="muted small">Este link pessoal dá ao cliente acesso ao histórico das viaturas, progresso dos trabalhos, fotos, orçamentos e pedidos de marcação. Não partilhe publicamente.</p>
      <input class="inp" value="${esc(url)}" readonly onclick="this.select()">`,
      `<button class="btn ghost danger" data-new>Gerar novo link</button><span class="right"></span><button class="btn" data-copy>Copiar</button><button class="btn pri" data-wa>${icon('chat')} Enviar por WhatsApp</button>`, 'sm');
    $('[data-copy]', m.el).onclick = () => { navigator.clipboard?.writeText(url); toast('Link copiado.'); };
    $('[data-wa]', m.el).onclick = () => window.open(waLink(c.telefone, `Olá ${(c.nome || '').split(' ')[0]}! Aqui pode acompanhar o seu automóvel, ver o histórico de serviços e pedir marcações: ${url}\n${A.S.empresa_nome}`));
    $('[data-new]', m.el).onclick = async () => { if (await confirmBox('O link antigo deixa de funcionar. Continuar?')) { m.close(); portalLink(cid, true); } };
  } catch (er) { fail(er); }
}

/* ---------- Mensagens (WhatsApp / SMS / Email) ---------- */
function phoneIntl(t) { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.length === 9) d = '351' + d; return d; }
const waLink = (tel, txt) => `https://wa.me/${phoneIntl(tel)}?text=${encodeURIComponent(txt)}`;
function msgCtx(e, r) {
  const c = e === 'clientes' ? r : e === 'leads' ? { nome: r.nome, telefone: r.telefone, email: r.email } : byId('clientes', r.cliente_id) || {};
  const v = byId('veiculos', r.veiculo_id) || (e === 'clientes' ? (A.cache.veiculos || []).find(x => +x.cliente_id === +r.id) : null);
  const valor = e === 'orcamentos' || e === 'faturas' ? r._c?.total : e === 'trabalhos' ? (+r.valor || 0) * (1 + (A.S.iva_isento === '1' ? 0 : +A.S.iva) / 100) : r.valor_previsto;
  return { cliente: c.nome || '', telefone: c.telefone, email: c.email, veiculo: v ? `${v.marca} ${v.modelo}`.trim() : (r.veiculo || 'veículo'), matricula: v?.matricula || '',
    data: fdate(r.data), hora: r.hora || '', servico: refLabel('servicos', r.servico_id) || r.servico_interesse || '', valor: valor ? money(valor) : '' };
}
async function openMessage(ctx) {
  const tpls = await load('mensagens');
  const fill = t => t.replace(/\{(\w+)\}/g, (_, k) => ({ ...ctx, primeiro_nome: (ctx.cliente || '').split(' ')[0], empresa: A.S.empresa_nome, telefone_empresa: A.S.empresa_telefone, link_avaliacao: A.S.link_avaliacao, link_facebook: A.S.link_facebook })[k] ?? '');
  const m = modal('Enviar mensagem · ' + esc(ctx.cliente), `
    <label class="f"><span>Modelo</span><select class="inp" id="mt"><option value="">— Mensagem livre —</option>${tpls.map(t => `<option value="${t.id}">${esc(t.nome)} (${esc(t.canal)})</option>`).join('')}</select></label>
    <label class="f" style="margin-top:12px"><span>Texto</span><textarea class="inp" id="mx" style="min-height:170px"></textarea></label>
    <p class="small muted">Para: ${esc(ctx.telefone || '—')} · ${esc(ctx.email || '—')}</p>`,
    `<button class="btn" data-cp>Copiar</button><span class="right"></span><button class="btn" data-sms>SMS</button><button class="btn" data-em>Email</button><button class="btn pri" data-wa>${icon('chat')} WhatsApp</button>`);
  let subj = A.S.empresa_nome;
  $('#mt', m.el).onchange = ev => { const t = tpls.find(x => +x.id === +ev.target.value); if (t) { $('#mx', m.el).value = fill(t.texto); subj = fill(t.assunto || subj); } };
  const txt = () => $('#mx', m.el).value;
  $('[data-wa]', m.el).onclick = () => window.open(waLink(ctx.telefone, txt()));
  $('[data-sms]', m.el).onclick = () => { location.href = `sms:+${phoneIntl(ctx.telefone)}?&body=${encodeURIComponent(txt())}`; };
  $('[data-em]', m.el).onclick = () => { location.href = `mailto:${ctx.email || ''}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(txt())}`; };
  $('[data-cp]', m.el).onclick = () => { navigator.clipboard?.writeText(txt()); toast('Texto copiado.'); };
}

/* ---------- Ficha do cliente (histórico) ---------- */
route(/^#\/cliente\/(\d+)$/, async (view, id) => {
  await Promise.all(['clientes', 'veiculos', 'trabalhos', 'servicos', 'equipa', 'marcacoes', 'inspecoes', 'avaliacoes', ...(isTec() ? [] : ['orcamentos', 'faturas', 'subscricoes'])].map(e => load(e, true)));
  const c = byId('clientes', id); if (!c) throw new Error('Cliente não encontrado.');
  const mine = e => (A.cache[e] || []).filter(r => +r.cliente_id === +id);
  const vs = mine('veiculos'), jobs = mine('trabalhos'), done = jobs.filter(j => j.estado === 'Concluído');
  const gasto = done.reduce((s, j) => s + (+j.valor || 0), 0), divida = mine('faturas').reduce((s, f) => s + (+f._c?.em_divida || 0), 0);
  setPage(c.nome, `${esc(c.localidade || '')} ${c.origem ? '· ' + esc(c.origem) : ''}`,
    `<button class="btn ghost" id="cEdit">Editar</button><button class="btn ghost" id="cMsg">${icon('chat')}</button><button class="btn" id="cPortal">${icon('link')}<span class="btn-txt-m">Portal</span></button>`);
  const jobRow = j => `<div class="list-i" data-job="${j.id}" style="cursor:pointer"><span class="t mono" style="min-width:84px">${fdate(j.data)}</span>
    <div class="grow"><b>${esc(refLabel('servicos', j.servico_id) || j.extras || j.numero)}</b><div class="small muted">${esc(j.numero || '')} · ${esc(refLabel('veiculos', j.veiculo_id))}${j._c?.progresso ? ' · tarefas ' + j._c.progresso : ''}</div></div>
    ${badge(j.estado)}<b class="mono" style="min-width:80px;text-align:right">${money(j.valor)}</b></div>`;
  view.innerHTML = `
    <div class="grid kpis" style="margin-bottom:14px">
      <div class="glass kpi"><div class="l">Total gasto</div><div class="v">${money(gasto)}</div><div class="s">s/ IVA · ${done.length} serviços</div></div>
      <div class="glass kpi k-vio"><div class="l">Ticket médio</div><div class="v">${money(done.length ? gasto / done.length : 0)}</div></div>
      <div class="glass kpi k-ok"><div class="l">Última visita</div><div class="v" style="font-size:18px">${fdate(done.map(j => j.data).sort().pop())}</div></div>
      <div class="glass kpi ${divida > 0 ? 'k-bad' : ''}"><div class="l">Em dívida</div><div class="v">${money(divida)}</div></div></div>
    <div class="grid cols-2">
      <div class="grid" style="align-content:start">
        <div class="glass card"><h3>${icon('car')} Veículos <button class="btn sm right" id="addV">${icon('plus')} Veículo</button></h3>
          ${vs.map(v => { const vj = jobs.filter(j => +j.veiculo_id === +v.id); return `<div class="glass" style="padding:14px;margin-bottom:10px;background:rgba(0,0,0,.2)">
            <div class="row"><b class="grow" style="font-size:15px">${esc(v.marca)} ${esc(v.modelo)} ${v.ano ? `<span class="muted">(${v.ano})</span>` : ''}</b><span class="badge t-mut">${esc(v.matricula || 's/ matrícula')}</span><button class="btn sm ghost" data-v="${v.id}">Editar</button></div>
            <div class="small muted" style="margin:4px 0 8px">${esc([v.cor, v.tamanho, v.protecao && 'Proteção: ' + v.protecao].filter(Boolean).join(' · '))} · Último: ${fdate(v.ultimo_servico)} · Próximo: ${fdate(v.proximo_servico)}</div>
            ${vj.length ? vj.map(jobRow).join('') : '<div class="small muted">Sem histórico de serviços.</div>'}</div>`; }).join('') || '<div class="empty">Sem veículos registados.</div>'}
        </div>
        ${isTec() ? '' : `<div class="glass card"><h3>${icon('file')} Orçamentos & faturação</h3>
          ${[...mine('orcamentos').map(o => ['orcamentos', o, o.numero, o._c.total]), ...mine('faturas').map(f => ['faturas', f, f.ref_externa || f.numero, f._c.total])].map(([e, r, n, t]) =>
            `<div class="list-i" data-open="${e}:${r.id}" style="cursor:pointer"><span class="t mono" style="min-width:84px">${fdate(r.data)}</span><div class="grow"><b>${esc(n)}</b><div class="small muted">${e === 'orcamentos' ? 'Orçamento' : 'Faturação'}</div></div>${badge(r.estado)}<b class="mono">${money(t)}</b></div>`).join('') || '<div class="small muted">Nada registado.</div>'}</div>`}
      </div>
      <div class="grid" style="align-content:start">
        <div class="glass card"><h3>${icon('users')} Contacto</h3>
          <div class="list-i"><span class="muted grow">Telemóvel</span>${c.telefone ? `<a href="tel:${esc(c.telefone)}">${esc(c.telefone)}</a>` : '—'}</div>
          <div class="list-i"><span class="muted grow">Email</span>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</div>
          <div class="list-i"><span class="muted grow">NIF</span>${esc(c.nif || '—')}</div>
          <div class="list-i"><span class="muted grow">Morada</span><span style="text-align:right">${esc([c.morada, c.codigo_postal, c.localidade].filter(Boolean).join(', ') || '—')}</span></div>
          <div class="list-i"><span class="muted grow">RGPD</span>${+c.rgpd ? '<span class="up">Consentimento ✓</span>' : '<span class="down">Sem consentimento</span>'}</div>
          ${c.notas ? `<div class="note" style="margin-top:10px">${esc(c.notas)}</div>` : ''}
          <div class="row" style="margin-top:12px"><button class="btn sm" id="nMarc">${icon('calendar')} Marcação</button>${isTec() ? '' : `<button class="btn sm" id="nOrc">${icon('file')} Orçamento</button>`}<button class="btn sm" id="nJob">${icon('wrench')} Trabalho</button></div>
        </div>
        <div class="glass card"><h3>${icon('calendar')} Próximas marcações</h3>${mine('marcacoes').filter(x => x.data >= today() && !['Cancelada', 'Faltou'].includes(x.estado)).map(x =>
          `<div class="list-i"><span class="t">${fdate(x.data).slice(0, 5)}</span><div class="grow">${esc(x.hora || '')} · ${esc(refLabel('servicos', x.servico_id))}</div>${badge(x.estado)}</div>`).join('') || '<div class="small muted">Nenhuma.</div>'}</div>
        ${isTec() ? '' : `<div class="glass card"><h3>${icon('repeat')} Subscrições</h3>${mine('subscricoes').map(s => `<div class="list-i"><div class="grow"><b>${esc(s.plano)}</b><div class="small muted">${esc(s.frequencia)} · próxima ${fdate(s.proxima_visita)}</div></div>${badge(s.estado)}<b>${money(s.valor)}</b></div>`).join('') || '<div class="small muted">Nenhuma.</div>'}</div>`}
        <div class="glass card"><h3>${icon('star')} Avaliações & referências</h3>${mine('avaliacoes').map(a => `<div class="list-i"><div class="grow">${esc(a.plataforma || a.tipo)} ${a.pontuacao ? '<span style="color:#fbbf24">' + '★'.repeat(a.pontuacao) + '</span>' : ''}<div class="small muted">${esc(a.texto || '')}</div></div>${badge(a.estado)}</div>`).join('') || '<div class="small muted">Nenhuma.</div>'}</div>
      </div>
    </div>`;
  const re = () => router();
  $('#cEdit').onclick = () => openForm('clientes', c);
  $('#cMsg').onclick = () => openMessage(msgCtx('clientes', c));
  $('#cPortal').onclick = () => portalLink(c.id);
  $('#addV').onclick = () => openForm('veiculos', null, { cliente_id: c.id, _after: re });
  $$('[data-v]').forEach(b => b.onclick = () => openForm('veiculos', byId('veiculos', b.dataset.v), { _after: re }));
  $$('[data-job]').forEach(b => b.onclick = () => openForm('trabalhos', byId('trabalhos', b.dataset.job)));
  $$('[data-open]').forEach(b => b.onclick = () => { const [e, i] = b.dataset.open.split(':'); openForm(e, byId(e, i)); });
  $('#nMarc').onclick = () => openForm('marcacoes', null, { cliente_id: c.id, veiculo_id: vs[0]?.id || '' });
  $('#nJob').onclick = () => openForm('trabalhos', null, { cliente_id: c.id, veiculo_id: vs[0]?.id || '' });
  $('#nOrc')?.addEventListener('click', () => openForm('orcamentos', null, { cliente_id: c.id, veiculo_id: vs[0]?.id || '' }));
});

/* ---------- Documentos para impressão / PDF ---------- */
route(/^#\/doc\/(\w+)\/(\d+)$/, async (view, e, id) => {
  const gate = e === 'saida'; if (gate) e = 'trabalhos';
  await ensureRefs(e); await load(e, true); await load('veiculos');
  const r = byId(e, id); if (!r) throw new Error('Documento não encontrado.');
  const S = A.S, c = byId('clientes', r.cliente_id) || {}, v = byId('veiculos', r.veiculo_id);
  const titles = { garantias: 'Certificado de proteção cerâmica', orcamentos: 'Orçamento', faturas: 'Resumo de serviços / recibo interno', trabalhos: gate ? 'Guia de saída' : 'Ordem de trabalho', inspecoes: 'Ficha de inspeção do veículo' };
  setPage(titles[e] + ' ' + (r.numero || ''), '', `<button class="btn ghost" onclick="history.back()">${icon('left')} Voltar</button><button class="btn pri" onclick="print()">${icon('print')} Imprimir / PDF</button>`);
  const head = `<div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap">
      <div>${S.logo ? `<img src="api.php?a=logo" class="doc-logo" style="max-height:72px;max-width:200px;margin-bottom:8px;display:block">` : ''}<b style="font-size:16px">${esc(S.empresa_nome)}</b>
        <div class="muted">${esc(S.empresa_morada)}<br>${S.empresa_nif ? 'NIF ' + esc(S.empresa_nif) + ' · ' : ''}${esc(S.empresa_telefone)} · ${esc(S.empresa_email)}</div></div>
      <div style="text-align:right"><h1>${titles[e]}</h1><div class="acc" style="font-weight:700;font-size:15px">${esc(r.numero || '')}</div>
        <div class="muted">Data: ${fdate(r.data)}${r.validade ? '<br>Válido até: ' + fdate(r.validade) : ''}${r.vencimento && e === 'faturas' ? '<br>Vencimento: ' + fdate(r.vencimento) : ''}</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:26px;padding:16px;background:#f3f4f6;border-radius:10px">
      <div><div class="muted" style="font-size:11px;text-transform:uppercase">Cliente</div><b>${esc(c.nome || '')}</b><br>${esc(c.telefone || '')} ${esc(c.email || '')}<br>${c.nif ? 'NIF ' + esc(c.nif) : ''} ${esc(c.morada || '')}</div>
      <div><div class="muted" style="font-size:11px;text-transform:uppercase">Veículo</div>${v ? `<b>${esc(v.marca)} ${esc(v.modelo)}</b><br>${esc(v.matricula || '')} · ${esc(v.cor || '')} · ${esc(v.tamanho || '')}` : '—'}</div></div>`;
  let body = '';
  if (e === 'orcamentos' || e === 'faturas') {
    const L = jparse(r.linhas); const t = r._c;
    body = `<table><thead><tr><th>Descrição</th><th class="num">Qtd.</th><th class="num">Preço</th><th class="num">Total</th></tr></thead><tbody>
      ${L.map(l => { const s = (A.cache.servicos || []).find(x => x.nome === l.d); return `<tr><td><b>${esc(l.d)}</b>${s?.descricao && e === 'orcamentos' ? `<div class="muted" style="font-size:12px">${esc(s.descricao)}</div>` : ''}</td><td class="num">${n2(l.q)}</td><td class="num">${money(l.p)}</td><td class="num">${money((+l.q || 0) * (+l.p || 0))}</td></tr>`; }).join('')}
      ${+r.deslocacao ? `<tr><td>Taxa de deslocação</td><td class="num">1</td><td class="num">${money(r.deslocacao)}</td><td class="num">${money(r.deslocacao)}</td></tr>` : ''}
      ${+r.desconto_pct ? `<tr><td>Desconto (${n2(r.desconto_pct)}%)</td><td></td><td></td><td class="num">−${money(t.desc_pct)}</td></tr>` : ''}
      ${+r.desconto ? `<tr><td>Desconto</td><td></td><td></td><td class="num">−${money(r.desconto)}</td></tr>` : ''}
      ${+r.gorjeta ? `<tr><td>Gorjeta</td><td></td><td></td><td class="num">${money(r.gorjeta)}</td></tr>` : ''}</tbody></table>
      <div class="tot"><div><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div><span>IVA (${n2(r.iva_pct)}%)</span><span>${money(t.iva)}</span></div><div class="g"><span>Total</span><span>${money(t.total)}</span></div>
      ${e === 'faturas' ? `<div><span>Recebido</span><span>${money(r.valor_pago)}</span></div><div><b>Em dívida</b><b>${money(t.em_divida)}</b></div>` : ''}</div>
      ${A.S.iva_isento === '1' ? '<p class="muted">IVA — regime de isenção (art.º 53.º do CIVA).</p>' : ''}
      ${r.notas ? `<p style="white-space:pre-line;margin-top:20px">${esc(r.notas)}</p>` : ''}
      ${e === 'orcamentos' ? `<p class="muted" style="white-space:pre-line;margin-top:24px;font-size:12px">${esc(S.rodape_orc)}</p>${S.empresa_iban ? `<p class="muted" style="font-size:12px">IBAN: ${esc(S.empresa_iban)}</p>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:50px"><div class="sigimg"></div><div class="sigimg"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:40px" class="muted"><span>Aceite pelo cliente</span><span>Data</span></div>` : ''}
      ${e === 'faturas' ? `<p class="muted" style="font-size:11px;margin-top:24px">Documento interno sem validade fiscal.${r.ref_externa ? ' Fatura certificada nº ' + esc(r.ref_externa) + '.' : ''}</p>` : ''}`;
  } else if (e === 'garantias') {
    const g = r._c;
    view.innerHTML = `<div class="doc cert ${S.logo_inverter === '1' ? 'inv-logo' : ''}"><div class="cert-in">
      <div style="text-align:center">${S.logo ? `<img src="api.php?a=logo" class="doc-logo" style="max-height:80px;margin-bottom:6px">` : ''}<div><b>${esc(S.empresa_nome)}</b></div><div class="muted" style="font-size:11px">${esc([S.empresa_morada, S.empresa_telefone, S.empresa_web].filter(Boolean).join(' · '))}</div>
        <h1 style="font-size:30px;letter-spacing:.06em;margin:18px 0 4px">CERTIFICADO DE PROTEÇÃO CERÂMICA</h1><div class="muted" style="letter-spacing:.3em;font-size:10px">GARANTIA & PLANO DE MANUTENÇÃO · Nº ${esc(r.numero)}</div>
        <svg viewBox="0 0 120 120" width="110" style="margin:16px auto;display:block"><defs><path id="cpath" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs><circle cx="60" cy="60" r="56" fill="none" stroke="#dc2626" stroke-width="3"/><circle cx="60" cy="60" r="34" fill="none" stroke="#dc2626" stroke-width="1"/>
          <text font-size="9" letter-spacing="2" fill="#111"><textPath href="#cpath">PROTEÇÃO CERÂMICA · CERTIFICADA · INSTALADOR AUTORIZADO ·</textPath></text><path d="M60 38l6 13 14 1-11 9 4 14-13-8-13 8 4-14-11-9 14-1z" fill="#dc2626"/><text x="60" y="88" text-anchor="middle" font-size="9" font-weight="700">${+r.anos} ANO${+r.anos > 1 ? 'S' : ''}</text></svg>
        <div class="muted">Certifica-se que o veículo abaixo recebeu a aplicação profissional de um revestimento cerâmico para</div><div style="font-size:24px;font-weight:700;border-bottom:1px solid #999;display:inline-block;padding:6px 30px;margin:8px 0 18px">${esc(c.nome || '')}</div></div>
      <table style="max-width:560px;margin:0 auto"><tbody>${[['Veículo', v ? `${v.ano || ''} ${v.marca} ${v.modelo} · ${v.cor || ''}` : '—'], ['Matrícula / VIN', v ? [v.matricula, v.vin].filter(Boolean).join(' · ') : '—'], ['Revestimento', `${r.produto} — ${+r.camadas || 1} camada(s)`], ['Superfícies', r.superficies || '—'], ['Aplicado em', `${fdate(r.data)}${r.tecnico_id ? ' por ' + refLabel('equipa', r.tecnico_id) : ''}`], ['Cobertura', `${+r.anos} ano(s) — válido até <b>${fdate(g.validade)}</b>`]]
        .map(([a, b]) => `<tr><td style="background:#f3f4f6;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;width:150px">${a}</td><td>${b.includes('<b>') ? b : esc(b)}</td></tr>`).join('')}</tbody></table>
      <h3 style="text-align:center;margin-top:18px">Manutenções obrigatórias</h3>
      <table style="max-width:560px;margin:8px auto"><thead><tr><th>#</th><th>Até</th><th>Realizada em</th><th>Rubrica</th></tr></thead><tbody>${g.visitas.map((d, i) => `<tr><td>${i + 1}</td><td>${fdate(d)}</td><td>${r.ultima_manutencao && r.ultima_manutencao >= addDays(d, -60) && r.ultima_manutencao <= addDays(d, 60) ? fdate(r.ultima_manutencao) : ''}</td><td></td></tr>`).join('')}</tbody></table>
      <div style="border:1px solid #ddd;border-radius:8px;padding:10px 14px;font-size:11px;max-width:620px;margin:12px auto"><b>Condições da cobertura.</b> ${esc(S.termos_garantia)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:46px auto 0;max-width:560px;text-align:center" class="muted"><div class="sigimg"></div><div class="sigimg"></div><span>Instalador autorizado</span><span>Data de emissão: ${fdate(r.data)}</span></div></div></div>`;
    return;
  } else if (gate) {
    const pago = (A.cache.faturas || []).filter(f => +f.trabalho_id === +r.id);
    body = `<table><tbody><tr><td class="muted">Serviço</td><td><b>${esc(refLabel('servicos', r.servico_id))}</b> ${esc(r.extras || '')}</td></tr>
      <tr><td class="muted">Box</td><td>${esc(r.box || '—')}</td></tr><tr><td class="muted">Técnico</td><td>${esc(refLabel('equipa', r.tecnico_id) || '—')}</td></tr>
      <tr><td class="muted">Data/hora de saída</td><td>${new Date().toLocaleString('pt-PT')}</td></tr>
      <tr><td class="muted">Tarefas concluídas</td><td>${esc(r._c.progresso || '—')}</td></tr></tbody></table>
      <p>Autoriza-se a saída do veículo acima identificado. O cliente declara ter verificado o veículo e recebido as chaves e objetos pessoais.</p>
      ${r.notas_aftercare ? `<h3 style="margin:16px 0 6px">Cuidados pós-serviço</h3><p style="white-space:pre-line">${esc(r.notas_aftercare)}</p>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:60px"><div class="sigimg"></div><div class="sigimg"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:40px" class="muted"><span>Responsável</span><span>Cliente</span></div>`;
  } else if (e === 'trabalhos') {
    const T = jparse(r.tarefas), F = jparse(r.fotos);
    body = `<table><tbody><tr><td class="muted">Serviço</td><td><b>${esc(refLabel('servicos', r.servico_id))}</b> ${esc(r.extras || '')}</td></tr>
      <tr><td class="muted">Técnico</td><td>${esc(refLabel('equipa', r.tecnico_id) || '—')}</td></tr><tr><td class="muted">Estado</td><td>${esc(r.estado)}</td></tr>
      <tr><td class="muted">Entrega prevista</td><td>${fdate(r.data_entrega)}</td></tr></tbody></table>
      <h3 style="margin:20px 0 8px">Ficha de intervenção (${r._c.progresso || '0/0'})</h3>
      ${(() => { const NS = (() => { try { return JSON.parse(r.notas_servicos || '{}') || {}; } catch { return {}; } })(); const G = [...new Set(T.map(t => t.s || ''))];
        return G.map(g => { const it = T.filter(t => (t.s || '') === g); return `${g || G.length > 1 ? `<div style="margin:14px 0 4px;font-weight:700;border-bottom:1px solid #ddd">${esc(g || 'Tarefas gerais')} <span class="muted" style="font-weight:400">${it.filter(t => t.d).length}/${it.length}</span></div>` : ''}
          <div class="chkp">${it.map(t => `<div>${t.d ? '☑' : '☐'} ${esc(t.t)}${t.n ? `<div class="muted" style="font-size:11px;margin-left:18px">${esc(t.n)}</div>` : ''}</div>`).join('')}</div>
          ${NS[g] ? `<p class="muted" style="font-size:12px;margin:4px 0 0;white-space:pre-line"><b>Notas:</b> ${esc(NS[g])}</p>` : ''}`; }).join('') || '<div class="muted">—</div>'; })()}
      ${r.notas_trabalho ? `<h3 style="margin:20px 0 6px">Trabalho realizado</h3><p style="white-space:pre-line">${esc(r.notas_trabalho)}</p>` : ''}
      ${r.notas_aftercare ? `<h3 style="margin:20px 0 6px">Cuidados pós-serviço</h3><p style="white-space:pre-line">${esc(r.notas_aftercare)}</p>` : ''}
      ${F.length ? `<h3 style="margin:20px 0 8px">Fotos</h3><div class="photos" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${F.map(p => `<div><img src="${imgURL(p.f)}"><div class="muted" style="font-size:11px">${esc(p.tipo || '')}</div></div>`).join('')}</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:50px"><div class="sigimg"></div><div class="sigimg"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:40px" class="muted"><span>Técnico</span><span>Cliente (entrega)</span></div>`;
  } else if (e === 'inspecoes') {
    const ck = k => jparse(r[k]).map(t => `<div>${t.d ? '⚠️' : '✔︎'} ${esc(t.t)}${t.d ? ' — <b>assinalado</b>' : ''}</div>`).join('');
    const D = jparse(r.mapa);
    body = `${r.assinado_em ? `<p style="padding:10px 14px;border:1px solid #16a34a;border-radius:8px;color:#166534;background:#f0fdf4">🔒 Assinado por <b>${esc(r.assinado_por || c.nome || '')}</b> em ${esc(r.assinado_em)}. Registo bloqueado.</p>` : ''}
      <p><b>${esc(r.momento || '')}</b> · Km: ${esc(r.km || '—')} · Combustível: ${esc(r.combustivel || '—')}</p>${r.pedidos ? `<p><b>Pedidos do cliente:</b> ${esc(r.pedidos)}</p>` : ''}
      ${D.length ? `<div style="display:grid;grid-template-columns:180px 1fr;gap:20px;align-items:start;margin:12px 0"><div class="carmap print">${carSVG()}${D.map((p, i) => `<span class="pin" style="left:${p.x}%;top:${p.y}%">${i + 1}</span>`).join('')}</div>
        <div><h3>Danos (${D.length})</h3>${D.map((p, i) => `<div><b>${i + 1}. ${esc(p.t)}</b> — ${esc(p.n || '')}</div>`).join('')}</div></div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px"><div><h3>Exterior</h3>${ck('exterior')}</div><div><h3>Interior</h3>${ck('interior')}</div></div>
      ${r.danos ? `<h3 style="margin-top:18px">Danos / observações</h3><p style="white-space:pre-line">${esc(r.danos)}</p>` : ''}
      ${r.objetos ? `<p><b>Objetos pessoais:</b> ${esc(r.objetos)}</p>` : ''}
      ${jparse(r.fotos).length ? `<div class="photos" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">${jparse(r.fotos).map(p => `<div><img src="${imgURL(p.f)}"><div class="muted" style="font-size:11px">${esc(p.tipo || '')}</div></div>`).join('')}</div>` : ''}
      <p class="muted" style="font-size:11.5px;margin-top:20px">O cliente declara que o estado do veículo descrito acima corresponde ao verificado no momento da ${/Saída/.test(r.momento || '') ? 'entrega' : 'receção'}.</p>
      <div style="margin-top:20px">${r.assinatura ? `<img src="${r.assinatura}" style="height:90px">` : '<div class="sigimg"></div>'}<div class="muted">Assinatura do cliente</div></div>`;
  }
  view.innerHTML = `<div class="doc ${S.logo_inverter === '1' ? 'inv-logo' : ''}">${head}${body}<div class="muted" style="margin-top:36px;font-size:11px;text-align:center">${esc(S.empresa_nome)} · ${esc(S.empresa_web || '')}</div></div>`;
});

/* ---------- Gráfico de barras (SVG) ---------- */
function barChart(data, keys, colors, h = 220) {
  const W = 640, pad = 34, max = Math.max(1, ...data.flatMap(d => keys.map(k => Math.abs(+d[k] || 0))));
  const bw = (W - pad) / data.length, gw = bw * .7 / keys.length;
  const y = v => h - 22 - (Math.max(0, v) / max) * (h - 40);
  let s = `<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" role="img">`;
  for (let i = 0; i <= 3; i++) { const yy = 18 + i * (h - 40) / 3; s += `<line x1="${pad}" x2="${W}" y1="${yy}" y2="${yy}" stroke="rgba(255,255,255,.06)"/><text x="0" y="${yy + 3}">${Math.round(max * (1 - i / 3) / (max > 5000 ? 1000 : 1))}${max > 5000 ? 'k' : ''}</text>`; }
  data.forEach((d, i) => {
    keys.forEach((k, j) => { const v = +d[k] || 0, x = pad + i * bw + bw * .15 + j * gw;
      s += `<rect x="${x}" y="${y(v)}" width="${gw - 2}" height="${Math.max(1, h - 22 - y(v))}" rx="3" fill="${colors[j]}" opacity="${v < 0 ? .35 : .92}"><title>${esc(d.label)}: ${money(v)}</title></rect>`; });
    s += `<text x="${pad + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  return s + '</svg>';
}

function lineChart(vals, h = 120) {
  if (!vals.length) return '';
  const W = 640, max = Math.max(1, ...vals.map(Math.abs)), x = i => 30 + i * (W - 40) / Math.max(1, vals.length - 1), y = v => h / 2 - v / max * (h / 2 - 12);
  return `<svg viewBox="0 0 ${W} ${h}" style="margin-top:10px"><line x1="30" x2="${W}" y1="${h / 2}" y2="${h / 2}" stroke="rgba(255,255,255,.12)"/><text x="0" y="14">${Math.round(max)}</text><text x="0" y="${h - 4}">−${Math.round(max)}</text>
    <polyline fill="none" stroke="#34d399" stroke-width="2" points="${vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="2.5" fill="#34d399"><title>${money(v)}</title></circle>`).join('')}</svg><div class="small muted">Resultado líquido diário (entradas − despesas)</div>`;
}
/* ---------- Painel / centro de comando ---------- */
const greet = () => { const h = new Date().getHours(); return h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite'; };
route(/^#\/$/, async view => {
  if (isTec()) { location.hash = '#/agenda'; return; }
  const st = A.ui.dash = A.ui.dash || { m: today().slice(0, 7) };
  const [D] = await Promise.all([api('dashboard', { m: st.m }), load('servicos'), load('clientes', true), load('veiculos', true), load('equipa'), load('objetivos', true)]);
  const goalsHTML = () => { const G = (A.cache.objetivos || []).filter(g => (g.mes || '').slice(0, 7) === st.m); if (!G.length) return '';
    return `<div class="glass card" style="margin-bottom:14px"><h3>${icon('target')} Objetivos do mês <a href="#/e/objetivos" class="right small">Gerir →</a></h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${G.map(g => `<div><div class="row small"><b class="grow">${esc(g.titulo)}</b><span class="muted">${esc(g._c.atual)} / ${g._c.dinheiro ? money(g.alvo) : n2(g.alvo)}</span></div><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, g._c.pct || 0)}%"></i></div><div class="small muted" style="margin-top:3px">${n2(g._c.pct || 0)}% · ${esc(g.metrica)}</div></div>`).join('')}</div></div>`; };
  const m = D.m, p = D.prev;
  const delta = (a, b) => b ? `<span class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${n2(Math.abs((a - b) / b * 100))}%</span> vs mês ant.` : '';
  const pct = D.objetivo ? Math.min(100, Math.round(m.receita / D.objetivo * 100)) : 0;
  const monthOpts = Array.from({ length: 18 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return iso(d).slice(0, 7); });
  setPage('Painel', esc(A.S.empresa_nome), `<select class="inp" id="mSel" style="width:auto;min-height:38px">${monthOpts.map(x => `<option value="${x}" ${x === st.m ? 'selected' : ''}>${mlabel(x)}</option>`).join('')}</select>`);
  const K = (l, v, s = '', cls = '') => `<div class="glass kpi ${cls}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  const PIPE = ['Agendado', 'Check-in', 'Lavagem', 'Interior', 'Correção / Proteção', 'Controlo de qualidade', 'Pronto'];
  const PC = ['#60a5fa', '#fbbf24', '#22d3ee', '#34d399', '#a78bfa', '#f472b6', '#4ade80'];
  const alerts = [
    ...D.faturas_vencidas.map(f => ['bad', `Pagamento em atraso: <b>${esc(f.numero)}</b> · ${esc(refLabel('clientes', f.cliente_id))} · ${money(f._c.em_divida)}`, '#/e/faturas']),
    ...D.followups.map(l => ['warn', `Follow-up de lead: <b>${esc(l.nome)}</b> (${esc(l.servico_interesse || l.estado)})`, '#/e/leads']),
    ...D.stock.map(i => ['warn', `Stock baixo: <b>${esc(i.nome)}</b> — ${n2(i.quantidade)} ${esc(i.unidade || '')} (mín. ${n2(i.nivel_minimo)})`, '#/e/inventario']),
    ...D.equip.map(q => ['warn', `Equipamento: <b>${esc(q.nome)}</b> — ${esc(q._c.alerta)}${q._c.proxima ? ' (' + fdate(q._c.proxima) + ')' : ''}`, '#/e/equipamentos']),
    ...D.veic.map(v => ['info', `Serviço recomendado: <b>${esc(v.marca)} ${esc(v.modelo)}</b> · ${esc(refLabel('clientes', v.cliente_id))} — ${fdate(v.proximo_servico)}`, '#/cliente/' + v.cliente_id]),
    ...(() => { const p48 = D.proximas.filter(a => a.estado === 'Pendente' && a.data <= addDays(today(), 2)); return p48.length ? [['warn', `<b>${p48.length} marcação(ões) nas próximas 48 h por confirmar</b> — envie lembretes`, '#/lembretes']] : []; })(),
    ...(() => { const dp = D.proximas.filter(a => +a.sinal > 0 && !+a.sinal_pago); return dp.length ? [['warn', `<b>${dp.length} sinal(is) por receber</b> — proteja ${money(dp.reduce((s, a) => s + (+a.valor_previsto || 0), 0))} de trabalho marcado`, '#/lembretes']] : []; })(),
    ...(D.garantias || []).map(g => ['warn', `Garantia cerâmica: <b>${esc(refLabel('clientes', g.cliente_id))}</b> — ${esc(g._c.alerta)} (${fdate(g._c.proxima)})`, '#/lembretes']),
    ...D.visitas.map(s => ['info', `Visita de subscrição: <b>${esc(refLabel('clientes', s.cliente_id))}</b> · ${esc(s.plano)} — ${fdate(s.proxima_visita)}`, '#/e/subscricoes']),
  ];
  const svc = id => (A.cache.servicos || []).find(s => +s.id === +id)?.nome || 'Sem serviço';
  const mixMax = Math.max(1, ...D.mix.map(x => x.receita));
  view.innerHTML = `
  <div class="glass hero" style="margin-bottom:14px">
    <div class="grow" style="min-width:240px"><div class="tiny" style="color:var(--ac)">${greet()}, ${esc((A.user.nome || '').split(' ')[0])}</div><h2>${esc(A.S.empresa_nome)}</h2>
      <div class="small muted" style="text-transform:capitalize">${new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <p style="margin:10px 0 14px"><b>${D.hj.marcacoes} marcações</b> hoje no valor de <b>${money(D.hj.agendado)}</b>. ${D.hj.espera} viatura(s) à espera, ${D.hj.em_curso} em execução. ${alerts.length} assunto(s) precisam da sua atenção.</p>
      <div class="row"><button class="btn pri" data-q="marcacoes">${icon('plus')} Nova marcação</button><a class="btn" href="#/quadro">${icon('kanban')} Quadro</a></div></div>
    <div class="row" style="gap:14px"><div style="text-align:center"><div class="ring" style="--p:${pct}"><b>${pct}%</b></div><div class="tiny" style="margin-top:4px">objetivo</div></div>
      <div class="grid" style="gap:8px"><span class="badge t-warn">${D.hj.espera} à espera</span><span class="badge t-vio">${D.hj.em_curso} em execução</span><span class="badge t-ok">${money(D.hj.recebido)} hoje</span></div>
      <div><div class="big mono">${money(m.receita)}</div><div class="small muted">receita do mês · objetivo ${money(D.objetivo)}</div></div></div>
  </div>
  <div class="grid tiles" style="margin-bottom:14px">${[['marcacoes', 'Nova marcação', 'calendar'], ['inspecoes', 'Check-in assinado', 'clipboard'], ['#/quadro', 'Quadro de trabalhos', 'kanban'], ['faturas', 'Novo recebimento', 'receipt'], ['#/lembretes', 'Lembretes', 'chat'], ['despesas', 'Nova despesa', 'wallet']]
    .map(([k, l, i]) => `<button class="glass tile" data-q="${k}"><span>${icon(i)}</span>${l}</button>`).join('')}</div>
  ${st.m === today().slice(0, 7) ? `<div class="tiny" style="margin:0 2px 8px">Hoje · ${fdate(today())}</div><div class="grid kpis" style="margin-bottom:18px">
    ${K('Marcações hoje', D.hj.marcacoes, money(D.hj.agendado) + ' previstos')}${K('Trabalhos ativos', D.abertos, D.hj.concluidos + ' concluídos hoje', 'k-vio')}
    ${K('Viaturas à espera', D.hj.espera, `check-in · ${D.hj.prontos} prontas p/ entrega`, 'k-warn')}${K('Em execução', D.hj.em_curso, D.hj.timers + ' cronómetros a correr', 'k-vio')}
    ${K('Recebido hoje', money(D.hj.recebido), 'vs ' + money(D.hj.agendado) + ' agendado', 'k-ok')}${K('Faltas no mês', D.hj.faltas_mes, 'marcações sem comparência', D.hj.faltas_mes ? 'k-bad' : '')}</div><div class="tiny" style="margin:0 2px 8px">Mês · ${mlabel(D.mes)}</div>` : ''}
  <div class="grid kpis" style="margin-bottom:14px">
    ${K('Receita', money(m.receita), delta(m.receita, p.receita))}
    ${K('Lucro bruto', money(m.lucro_bruto), `Margem ${n2(m.margem_bruta)}%`, 'k-ok')}
    ${K('Lucro operacional', `<span class="${m.lucro_operacional >= 0 ? '' : 'down'}">${money(m.lucro_operacional)}</span>`, `Despesas ${money(m.despesas_op + m.desloc_sem_trab)}`, 'k-ok')}
    ${K('Reserva p/ impostos', money(m.reserva_impostos), `${n2(A.S.reserva_impostos)}% do lucro operacional`, 'k-warn')}
    ${K('Lucro por trabalho', money(m.lucro_trabalho), `${m.trabalhos} trabalhos concluídos`, 'k-vio')}
    ${K('Lucro por hora', money(m.lucro_hora), `${n2(m.horas)} h faturadas`, 'k-vio')}
    ${K('Ticket médio', money(m.ticket_medio), delta(m.ticket_medio, p.ticket_medio))}
    ${K('Por receber', money(D.em_divida), `${D.faturas_vencidas.length} vencidos`, D.em_divida > 0 ? 'k-bad' : '')}
    ${K('Conversão de leads', n2(D.conv_mes) + '%', `${D.leads_mes} leads no mês · global ${n2(D.conv_total)}%`)}
    ${K('Conversão orçamentos', n2(D.conv_orc) + '%', `${money(D.orc_pendente)} pendente`)}
    ${K('Clientes recorrentes', n2(D.taxa_recorrencia) + '%', `${D.clientes_ativos} clientes com serviços`, 'k-ok')}
    ${K('Receita recorrente (MRR)', money(D.mrr), `${D.subs_ativas} subscrições ativas`, 'k-vio')}
    ${K('Custos de químicos', money(m.produtos), `Compras de stock ${money(m.compras_stock)}`, 'k-warn')}
    ${K('Deslocações', money(m.desloc_custo), `${n2(m.km)} km`, 'k-warn')}
    ${K('Gorjetas', money(m.gorjetas), 'fora da receita')}
    ${K('Alertas', alerts.length, `${D.stock.length} stock · ${D.equip.length} equipamento`, alerts.length ? 'k-bad' : 'k-ok')}
  </div>
  <div class="grid cols-2" style="margin-bottom:14px">
    <div class="glass card chart"><h3>${icon('chart')} Últimos 12 meses<span class="legend right"><span><i style="background:var(--ac)"></i>Receita</span><span><i style="background:#34d399"></i>Lucro bruto</span><span><i style="background:#a78bfa"></i>Lucro oper.</span></span></h3>
      ${barChart(D.serie.map(s => ({ ...s, label: mlabel(s.m).split(' ')[0] })), ['receita', 'lucro_bruto', 'lucro_operacional'], [getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#22d3ee', '#34d399', '#a78bfa'])}</div>
    <div class="glass card"><h3>${icon('calendar')} Hoje & próximos dias <a href="#/agenda" class="right small">Agenda →</a></h3>
      ${D.proximas.slice(0, 7).map(a => `<div class="list-i" data-m="${a.id}" style="cursor:pointer"><span class="t">${a.data === today() ? (a.hora || '') : fdate(a.data).slice(0, 5)}</span>
        <div class="grow"><b>${esc(refLabel('clientes', a.cliente_id))}</b><div class="small muted">${esc(refLabel('veiculos', a.veiculo_id))} · ${esc(svc(a.servico_id))}</div></div>${badge(a.estado)}</div>`).join('') || '<div class="empty">Sem marcações nos próximos 7 dias.</div>'}</div>
  </div>
  ${goalsHTML()}
  <div class="glass card" style="margin-bottom:14px"><h3>${icon('kanban')} Pipeline de trabalhos <a href="#/quadro" class="right small">Quadro →</a></h3>
    <div class="pipe">${PIPE.map((s, i) => `<a href="#/quadro"><b>${D.pipeline[s] || 0}</b><span>${s}</span><i style="background:${PC[i]}"></i></a>`).join('')}</div></div>
  <div class="grid cols-2e">
    <div class="glass card"><h3>${icon('alert')} Alertas & lembretes</h3>
      ${alerts.map(([t, h, l]) => `<a class="alert" href="${l}"><span style="color:var(--${t})">${icon('alert')}</span><span>${h}</span></a>`).join('') || '<div class="empty">Tudo em dia ✨</div>'}</div>
    <div class="glass card"><h3>${icon('sparkle')} Mix de serviços (mês)</h3>
      ${D.mix.map(x => `<div style="margin-bottom:12px"><div class="row small"><b class="grow">${esc(svc(x.servico_id))}</b><span class="muted">${x.n}×</span><b class="mono">${money(x.receita)}</b></div>
        <div class="bar" style="margin-top:5px"><i style="width:${x.receita / mixMax * 100}%"></i></div><div class="small muted" style="margin-top:2px">Lucro ${money(x.lucro)}</div></div>`).join('') || '<div class="empty">Sem trabalhos concluídos neste mês.</div>'}</div>
  </div>`;
  $('#mSel').onchange = ev => { st.m = ev.target.value; router(); };
  $$('[data-q]').forEach(b => b.onclick = () => b.dataset.q.startsWith('#') ? (location.hash = b.dataset.q) : openForm(b.dataset.q));
  $$('[data-m]').forEach(x => x.onclick = async () => { await load('marcacoes', true); openForm('marcacoes', byId('marcacoes', x.dataset.m)); });
});

/* ---------- Agenda: Mês · Semana · Dia · Lista ---------- */
route(/^#\/agenda$/, async view => {
  const st = A.ui.ag = A.ui.ag || { v: innerWidth < 900 ? 'lista' : 'semana', d: today(), tec: '', cx: false };
  await Promise.all(['clientes', 'veiculos', 'servicos', 'equipa'].map(e => load(e)));
  const all = await load('marcacoes', true);
  const rows = all.filter(r => (!st.tec || +r.tecnico_id === +st.tec) && (st.cx || !['Cancelada', 'Faltou'].includes(r.estado)));
  const d0 = new Date(st.d + 'T12:00:00');
  let days = [], title = '';
  if (st.v === 'dia') { days = [st.d]; title = `${DIAS[d0.getDay()]}, ${fdate(st.d)}`; }
  else if (st.v === 'semana' || st.v === 'lista') { const s0 = addDays(st.d, -((d0.getDay() + 6) % 7)); days = Array.from({ length: st.v === 'lista' ? 14 : 7 }, (_, i) => addDays(s0, i)); title = `${fdate(days[0])} – ${fdate(days[days.length - 1])}`; }
  else { const f = st.d.slice(0, 8) + '01', fd = new Date(f + 'T12:00:00'); const s0 = addDays(f, -((fd.getDay() + 6) % 7)); days = Array.from({ length: 42 }, (_, i) => addDays(s0, i)); title = `${MESES[d0.getMonth()]} ${d0.getFullYear()}`; }
  const step = { dia: 1, semana: 7, lista: 14, mes: 0 }[st.v];
  setPage('Agenda', title, `<button class="btn icon ghost" id="pv">${icon('left')}</button><button class="btn sm" id="td">Hoje</button><button class="btn icon ghost" id="nx">${icon('right')}</button>
    <button class="btn ghost hide-m" id="sheet" title="Folha do dia">${icon('print')}</button><button class="btn pri" id="nw">${icon('plus')}<span class="btn-txt-m">Marcação</span></button>`);
  const tecColor = id => byId('equipa', id)?.cor || 'var(--ac)';
  const evHTML = r => `<div class="ev ${['Cancelada', 'Faltou'].includes(r.estado) ? 'cx' : ''}" data-id="${r.id}" style="border-left-color:${tecColor(r.tecnico_id)}">
    <b>${esc(r.hora || '')} · ${esc(refLabel('clientes', r.cliente_id))}</b>${esc(refLabel('veiculos', r.veiculo_id))}<br><span class="muted">${esc(refLabel('servicos', r.servico_id))}${r.box ? ' · ' + esc(r.box) : ''}${+r.valor_previsto ? ' · ' + money(r.valor_previsto) : ''}</span>
    <div style="margin-top:4px" class="row">${badge(r.estado)}${+r.sinal ? `<span class="small ${+r.sinal_pago ? 'up' : 'muted'}">sinal ${+r.sinal_pago ? '✓' : 'pendente'}</span>` : ''}</div></div>`;
  const of = d => rows.filter(r => r.data === d).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  const head = `<div class="row" style="margin-bottom:12px"><div class="chips">${[['mes', 'Mês'], ['semana', 'Semana'], ['dia', 'Dia'], ['lista', 'Lista']].map(([k, l]) => `<button class="chip ${st.v === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
    <select class="inp" id="tf" style="width:auto;min-height:36px"><option value="">Todos os técnicos</option>${(A.cache.equipa || []).map(t => `<option value="${t.id}" ${+st.tec === +t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select>
    <label class="switch small"><input type="checkbox" id="cx" ${st.cx ? 'checked' : ''}><span>Mostrar canceladas/faltas</span></label></div>`;
  let body = '';
  if (st.v === 'mes') {
    body = `<div class="month">${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => `<div class="tiny" style="padding:4px 6px">${d}</div>`).join('')}${days.map(d => { const ev = of(d), out = d.slice(0, 7) !== st.d.slice(0, 7);
      return `<div class="glass mday ${d === today() ? 'today' : ''} ${out ? 'out' : ''}" data-day="${d}"><b>${+d.slice(8)}</b>${ev.slice(0, 3).map(r => `<div class="mev" data-id="${r.id}" style="border-left-color:${tecColor(r.tecnico_id)}">${esc(r.hora || '')} ${esc((refLabel('clientes', r.cliente_id) || '').split(' ')[0])}</div>`).join('')}${ev.length > 3 ? `<div class="small muted">+${ev.length - 3}</div>` : ''}</div>`; }).join('')}</div>`;
  } else if (st.v === 'lista') {
    body = days.map(d => { const ev = of(d); if (!ev.length && d !== today()) return ''; const dd = new Date(d + 'T12:00:00');
      return `<div class="tiny" style="margin:14px 2px 8px">${DIAS[dd.getDay()]} ${dd.getDate()} ${MESES[dd.getMonth()]}${d === today() ? ' · hoje' : ''}</div>${ev.map(evHTML).join('') || '<div class="small muted">Sem marcações.</div>'}`; }).join('') || '<div class="empty">Sem marcações neste período.</div>';
  } else {
    body = `<div class="week ${st.v === 'dia' ? 'one' : ''}">${days.map(d => { const ev = of(d), dd = new Date(d + 'T12:00:00');
      return `<div class="glass day ${d === today() ? 'today' : ''}"><h4><span>${DIAS[dd.getDay()]} · ${MESES[dd.getMonth()]}</span><b>${dd.getDate()}</b></h4>${ev.map(evHTML).join('')}
        <button class="btn sm ghost" data-add="${d}" style="width:100%;justify-content:center;opacity:.7">${icon('plus')}</button></div>`; }).join('')}</div>`;
  }
  view.innerHTML = head + body + `<p class="small muted" style="margin-top:12px">Cor = técnico atribuído. Avisos de conflito (técnico/box) aparecem ao criar a marcação.</p>`;
  const go = n => { if (st.v === 'mes') { const x = new Date(st.d.slice(0, 8) + '01T12:00:00'); x.setMonth(x.getMonth() + n); st.d = iso(x); } else st.d = addDays(st.d, n * step); router(); };
  $('#pv').onclick = () => go(-1); $('#nx').onclick = () => go(1); $('#td').onclick = () => { st.d = today(); router(); };
  $$('[data-v]').forEach(b => b.onclick = () => { st.v = b.dataset.v; router(); });
  $('#tf').onchange = ev => { st.tec = ev.target.value; router(); };
  $('#cx').onchange = ev => { st.cx = ev.target.checked; router(); };
  $('#nw').onclick = () => openForm('marcacoes', null, { data: st.v === 'dia' ? st.d : today() });
  $('#sheet').onclick = () => { location.hash = '#/folha/' + (st.v === 'dia' ? st.d : today()); };
  $$('[data-add]').forEach(b => b.onclick = () => openForm('marcacoes', null, { data: b.dataset.add }));
  $$('.ev, .mev').forEach(x => x.onclick = ev => { ev.stopPropagation(); openForm('marcacoes', byId('marcacoes', x.dataset.id)); });
  $$('[data-day]').forEach(x => x.onclick = () => { st.d = x.dataset.day; st.v = 'dia'; router(); });
});
route(/^#\/folha\/(\d{4}-\d{2}-\d{2})$/, async (view, d) => {
  await Promise.all(['clientes', 'veiculos', 'servicos', 'equipa'].map(e => load(e)));
  const ev = (await load('marcacoes', true)).filter(r => r.data === d && !['Cancelada'].includes(r.estado)).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  setPage('Folha do dia', fdate(d), `<button class="btn ghost" onclick="history.back()">${icon('left')} Voltar</button><button class="btn pri" onclick="print()">${icon('print')} Imprimir</button>`);
  view.innerHTML = `<div class="doc"><h1>Folha do dia · ${fdate(d)}</h1><p class="muted">${esc(A.S.empresa_nome)} · ${ev.length} marcações · ${money(ev.reduce((s, r) => s + (+r.valor_previsto || 0), 0))} previstos</p>
    <table><thead><tr><th>Hora</th><th>Cliente</th><th>Veículo</th><th>Serviço</th><th>Box</th><th>Técnico</th><th>Sinal</th><th>✓</th></tr></thead><tbody>
    ${ev.map(r => { const c = byId('clientes', r.cliente_id) || {}; return `<tr><td><b>${esc(r.hora || '')}</b></td><td>${esc(c.nome || '')}<div class="muted" style="font-size:11px">${esc(c.telefone || '')}</div></td><td>${esc(refLabel('veiculos', r.veiculo_id))}</td><td>${esc(refLabel('servicos', r.servico_id))}${r.notas ? `<div class="muted" style="font-size:11px">${esc(r.notas)}</div>` : ''}</td><td>${esc(r.box || '')}</td><td>${esc(refLabel('equipa', r.tecnico_id))}</td><td>${+r.sinal ? money(r.sinal) + (+r.sinal_pago ? ' ✓' : '') : ''}</td><td>☐</td></tr>`; }).join('') || '<tr><td colspan="8">Sem marcações.</td></tr>'}</tbody></table></div>`;
});

/* ---------- Quadro de trabalhos (kanban) ---------- */
function fmtTimer(r) {
  let sec = (+r.horas || 0) * 3600;
  if (r.timer_inicio) sec += Math.max(0, (Date.now() - new Date(r.timer_inicio.replace(' ', 'T')).getTime()) / 1000);
  const h = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = Math.floor(sec % 60);
  return `${h}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
route(/^#\/quadro$/, async view => {
  await Promise.all(['clientes', 'veiculos', 'servicos', 'equipa'].map(e => load(e)));
  const rows = await load('trabalhos', true);
  const ST = A.schema.trabalhos.fields.find(f => f.k === 'estado').opts.filter(s => s !== 'Cancelado');
  const st = A.ui.q = A.ui.q || { tec: '' };
  setPage('Quadro de trabalhos', 'Arraste os cartões entre colunas · no telemóvel use “→”',
    `<select class="inp" id="tf" style="width:auto;min-height:38px"><option value="">Todos os técnicos</option>${(A.cache.equipa || []).map(t => `<option value="${t.id}" ${+st.tec === +t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select>
     <button class="btn pri" id="nw">${icon('plus')}<span class="btn-txt-m">Trabalho</span></button>`);
  const list = rows.filter(r => !st.tec || +r.tecnico_id === +st.tec);
  view.innerHTML = `<div class="kanban">${ST.map((s, i) => {
    let items = list.filter(r => r.estado === s);
    if (s === 'Concluído') items = items.slice(0, 12);
    return `<div class="glass kcol" data-st="${esc(s)}"><h4>${badge(s)}<span class="muted right">${list.filter(r => r.estado === s).length}</span></h4>
      ${items.map(r => `<div class="kcard" draggable="true" data-id="${r.id}">
        <div class="row" style="gap:6px"><b class="grow">${esc(refLabel('veiculos', r.veiculo_id) || refLabel('clientes', r.cliente_id))}</b>${s !== 'Concluído' ? `<button class="btn sm ghost" data-next="${r.id}" title="Avançar para ${esc(ST[i + 1] || '')}">${icon('arrow')}</button>` : ''}</div>
        <div class="m">${esc(refLabel('clientes', r.cliente_id))} · ${esc(r.numero || '')}</div>
        <div class="m">${esc(refLabel('servicos', r.servico_id) || r.extras || '')}</div>
        <div class="row small" style="margin-top:8px"><button class="btn sm ghost tmr ${r.timer_inicio ? 'run' : ''}" data-tmr="${r.id}" data-start="${esc(r.timer_inicio || '')}" data-h="${+r.horas || 0}">⏱ <span class="mono">${fmtTimer(r)}</span></button></div>
        ${r._c?.pct !== null && r._c?.pct !== undefined ? `<div class="row small" style="margin-top:8px"><div class="bar grow"><i style="width:${r._c.pct}%"></i></div><span class="muted">${r._c.progresso}</span></div>` : ''}
        <div class="row small muted" style="margin-top:6px">${r.tecnico_id ? `<span class="dot" style="color:${esc(byId('equipa', r.tecnico_id)?.cor || '#22d3ee')};background:currentColor"></span>${esc(refLabel('equipa', r.tecnico_id))}` : 'Sem técnico'}${r.box ? `<span class="badge t-mut" style="padding:1px 7px">${esc(r.box)}</span>` : ''}<span class="right">${r.data_entrega ? 'Entrega ' + fdate(r.data_entrega).slice(0, 5) : fdate(r.data).slice(0, 5)}</span></div>
      </div>`).join('')}</div>`;
  }).join('')}</div>`;
  const move = async (id, estado) => {
    try { const r = await api('save', { e: 'trabalhos' }, { id, estado }); const i = rows.findIndex(x => +x.id === +id); rows[i] = r.row; toast(`Movido para “${estado}”.`); router(); } catch (er) { fail(er); }
  };
  $$('.kcard').forEach(c => {
    c.onclick = ev => { if (ev.target.closest('[data-next]')) return; openForm('trabalhos', byId('trabalhos', c.dataset.id)); };
    c.ondragstart = ev => ev.dataTransfer.setData('text/plain', c.dataset.id);
  });
  $$('[data-tmr]').forEach(b => b.onclick = async ev => { ev.stopPropagation();
    try { const r = await api('timer', {}, { id: b.dataset.tmr }); const i = rows.findIndex(x => +x.id === +r.row.id); rows[i] = r.row; toast(r.row.timer_inicio ? 'Cronómetro iniciado.' : 'Cronómetro parado — horas atualizadas.'); router(); } catch (er) { fail(er); } });
  clearInterval(A.tick); A.tick = setInterval(() => { if (!$('[data-tmr]')) return clearInterval(A.tick); $$('[data-tmr].run').forEach(b => { $('span', b).textContent = fmtTimer({ timer_inicio: b.dataset.start, horas: b.dataset.h }); }); }, 1000);
  $$('[data-next]').forEach(b => b.onclick = () => { const r = byId('trabalhos', b.dataset.next); move(r.id, ST[ST.indexOf(r.estado) + 1]); });
  $$('.kcol').forEach(col => {
    col.ondragover = ev => { ev.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = ev => { ev.preventDefault(); col.classList.remove('over'); const id = ev.dataTransfer.getData('text/plain'); if (byId('trabalhos', id)?.estado !== col.dataset.st) move(id, col.dataset.st); };
  });
  $('#tf').onchange = ev => { st.tec = ev.target.value; router(); };
  $('#nw').onclick = () => openForm('trabalhos');
});

/* ---------- Calculadora de preços ---------- */
route(/^#\/calc-precos$/, async view => {
  const S = A.S, mult = settingsJSON('mult_tamanho', {});
  setPage('Calculadora de preços', 'Descubra o preço certo para ter lucro em cada serviço');
  const custoFixoHora = (+S.custos_fixos || 0) / Math.max(1, +S.horas_mes || 1);
  const v = { tam: 'Médio', horas: 3, tec: 1, ch: +S.custo_hora, prod: 8, km: 0, outros: 0, margem: +S.margem_alvo || 40, iva: S.iva_isento === '1' ? 0 : +S.iva, fixo: 1 };
  const inp = (k, l, step = '0.01', help = '') => `<label class="f"><span>${l}</span><input class="inp" type="number" step="${step}" data-c="${k}" value="${v[k]}">${help ? `<small>${help}</small>` : ''}</label>`;
  view.innerHTML = `<div class="grid cols-2">
    <div class="glass card"><h3>${icon('calc')} Dados do serviço</h3><div class="form">
      <label class="f"><span>Tamanho do veículo</span><select class="inp" data-c="tam">${TAMANHOS_JS().map(t => `<option ${t === v.tam ? 'selected' : ''}>${t}</option>`).join('')}</select><small>Multiplicador: <span id="mu"></span></small></label>
      ${inp('horas', 'Horas de trabalho (veículo médio)', '0.25')}${inp('tec', 'Nº de técnicos', '1')}${inp('ch', 'Custo/hora por técnico (€)')}
      ${inp('prod', 'Custo de produtos / químicos (€)', '0.01', 'Use a calculadora de químicos para estimar.')}${inp('km', 'Km de deslocação (ida e volta)', '1', `${n2(S.custo_km)} €/km`)}
      ${inp('outros', 'Outros custos diretos (€)')}${inp('margem', 'Margem de lucro desejada (%)', '1', 'Percentagem do preço final (sem IVA).')}
      ${inp('iva', 'IVA (%)', '1')}
      <label class="switch full"><input type="checkbox" data-c="fixo" checked><span>Incluir custos fixos (${money(custoFixoHora)}/h = ${money(S.custos_fixos)} ÷ ${n2(S.horas_mes)} h faturáveis)</span></label>
    </div></div>
    <div class="grid" style="align-content:start"><div class="glass card" id="res"></div>
      <div class="note">💡 Preço = custo total ÷ (1 − margem). Uma margem de 40% sobre o preço equivale a um markup de 67% sobre o custo. Ajuste custos fixos, custo/hora e horas faturáveis em <a href="#/definicoes">Definições</a>.</div></div></div>`;
  const calc = () => {
    const mu = +mult[v.tam] || 1; $('#mu').textContent = '×' + n2(mu);
    const h = v.horas * mu, mo = h * v.tec * v.ch, fx = v.fixo ? h * custoFixoHora : 0, desl = v.km * +S.custo_km;
    const custo = mo + fx + v.prod * mu + desl + +v.outros;
    const preco = v.margem < 100 ? custo / (1 - v.margem / 100) : 0;
    const arred = Math.ceil(preco / 5) * 5;
    const lucro = arred - custo;
    $('#res').innerHTML = `<h3>${icon('sparkle')} Preço recomendado</h3>
      <div class="big mono" style="font-size:38px;font-weight:750;color:var(--ac)">${money(arred)}</div><div class="muted small">sem IVA · arredondado aos 5 € · com IVA: <b>${money(arred * (1 + v.iva / 100))}</b></div>
      <div style="margin-top:14px">${[['Horas ajustadas ao tamanho', n2(h) + ' h'], ['Mão de obra', money(mo)], ['Custos fixos imputados', money(fx)], ['Produtos', money(v.prod * mu)], ['Deslocação', money(desl)], ['Outros', money(v.outros)], ['<b>Custo total</b>', '<b>' + money(custo) + '</b>'], ['Preço exato', money(preco)], ['<b>Lucro</b>', `<b class="${lucro >= 0 ? 'up' : 'down'}">${money(lucro)}</b>`], ['Lucro por hora', money(h ? lucro / h : 0)], ['Margem real', n2(arred ? lucro / arred * 100 : 0) + '%']]
        .map(([a, b]) => `<div class="list-i"><span class="grow">${a}</span><span class="mono">${b}</span></div>`).join('')}</div>
      <button class="btn pri" id="toSvc" style="margin-top:12px">${icon('plus')} Criar serviço com este preço</button>`;
    $('#toSvc').onclick = () => openForm('servicos', null, { preco_medio: Math.ceil(preco / mu / 5) * 5, preco_pequeno: Math.ceil(preco / mu * (+mult.Pequeno || .9) / 5) * 5, preco_grande: Math.ceil(preco / mu * (+mult.SUV || 1.25) / 5) * 5, duracao_h: v.horas, custo_produtos: v.prod });
  };
  const calcRoot = view.firstElementChild; calcRoot.addEventListener('input', ev => { const k = ev.target.dataset.c; if (!k) return; v[k] = ev.target.type === 'checkbox' ? ev.target.checked : (k === 'tam' ? ev.target.value : +ev.target.value); calc(); });
  calcRoot.addEventListener('change', ev => { if (ev.target.dataset.c) ev.target.dispatchEvent(new Event('input', { bubbles: true })); });
  calc();
});
const TAMANHOS_JS = () => A.schema.veiculos.fields.find(f => f.k === 'tamanho').opts;

/* ---------- Calculadora de químicos ---------- */
route(/^#\/calc-quimicos$/, async view => {
  const inv = (await load('inventario', true)).filter(i => +i.volume_ml > 0);
  setPage('Custo de químicos', 'Quanto custa cada produto por utilização e por serviço');
  const rows = [{ nome: '', preco: 20, vol: 1000, dil: 10, uso: 500 }];
  view.innerHTML = `<div class="glass card"><h3>${icon('flask')} Receita do serviço</h3>
    <p class="small muted">Diluição 1:X — ex.: 1:10 significa 1 parte de produto para 10 de água (X = 10). Produto puro: X = 0. “Solução usada” = ml da mistura final usados num carro.</p>
    <div class="tbl-wrap"><table class="tbl" id="qt"><thead><tr><th>Produto</th><th class="num">Preço emb. (€)</th><th class="num">Volume (ml)</th><th class="num">Diluição 1:X</th><th class="num">Solução usada (ml)</th><th class="num">Concentrado (ml)</th><th class="num">Custo/uso</th><th class="num">Usos/emb.</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="row" style="margin-top:12px"><select class="inp" id="fromInv" style="max-width:320px"><option value="">+ Adicionar do inventário…</option>${inv.map(i => `<option value="${i.id}">${esc(i.nome)}</option>`).join('')}</select>
    <button class="btn sm" id="addR">${icon('plus')} Linha manual</button><div class="right" style="text-align:right"><div class="tiny">Custo total por serviço</div><div id="qtot" style="font-size:26px;font-weight:750;color:var(--ac)"></div></div></div></div>
    <div class="note" style="margin-top:12px">Dica: preencha “Volume da embalagem”, “Diluição” e “ml por utilização” nos artigos do <a href="#/e/inventario">Inventário</a> para os ter disponíveis aqui e ver o custo/uso na lista.</div>`;
  const draw = () => {
    let tot = 0;
    $('#qt tbody').innerHTML = rows.map((r, i) => {
      const conc = (+r.uso || 0) / (1 + (+r.dil || 0)); const c = +r.vol ? (+r.preco || 0) / r.vol * conc : 0; tot += c;
      const I = (k, w = 90) => `<input class="inp" style="width:${w}px;min-height:36px;padding:6px 8px;text-align:right" type="number" step="0.01" data-i="${i}" data-k="${k}" value="${esc(r[k])}">`;
      return `<tr style="cursor:default"><td><input class="inp" style="min-width:160px;min-height:36px;padding:6px 8px" data-i="${i}" data-k="nome" value="${esc(r.nome)}" placeholder="Produto"></td><td class="num">${I('preco')}</td><td class="num">${I('vol')}</td><td class="num">${I('dil', 70)}</td><td class="num">${I('uso')}</td>
        <td class="num">${n2(conc)}</td><td class="num"><b>${money(c)}</b></td><td class="num">${conc ? Math.floor(r.vol / conc) : '—'}</td><td><button class="btn icon ghost sm" data-rm="${i}">${icon('x')}</button></td></tr>`;
    }).join('');
    $('#qtot').textContent = money(tot);
    $$('#qt [data-rm]').forEach(b => b.onclick = () => { rows.splice(+b.dataset.rm, 1); draw(); });
  };
  $('#qt').addEventListener('change', ev => { const t = ev.target; if (t.dataset.k) { rows[+t.dataset.i][t.dataset.k] = t.value; draw(); } });
  $('#addR').onclick = () => { rows.push({ nome: '', preco: '', vol: 1000, dil: 0, uso: 50 }); draw(); };
  $('#fromInv').onchange = ev => { const i = inv.find(x => +x.id === +ev.target.value); if (i) { rows.push({ nome: i.nome, preco: i.custo_unitario, vol: i.volume_ml, dil: i.diluicao || 0, uso: i.ml_por_uso || 50 }); draw(); } ev.target.value = ''; };
  draw();
});

/* ---------- Relatórios ---------- */
route(/^#\/relatorios$/, async view => {
  const st = A.ui.rep = A.ui.rep || { from: today().slice(0, 8) + '01', to: '' };
  if (!st.to) { const d = new Date(st.from + 'T12:00:00'); d.setMonth(d.getMonth() + 1); d.setDate(0); st.to = iso(d); }
  await Promise.all(['servicos', 'equipa', 'clientes'].map(e => load(e)));
  const R = await api('report', { from: st.from, to: st.to }); const t = R.tot;
  const y = today().slice(0, 4);
  const presets = [['Este mês', today().slice(0, 8) + '01', (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return iso(d); })()],
    ['Mês anterior', (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return iso(d); })(), (() => { const d = new Date(); d.setDate(0); return iso(d); })()],
    ['Este ano', y + '-01-01', y + '-12-31'], ['Ano anterior', (y - 1) + '-01-01', (y - 1) + '-12-31']];
  setPage('Relatórios', `${fdate(st.from)} – ${fdate(st.to)}`, `<button class="btn" onclick="print()">${icon('print')}<span class="btn-txt-m">Imprimir</span></button>`);
  const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map((h, i) => `<th class="${i ? 'num' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr style="cursor:default">${r.map((c, i) => `<td class="${i ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="9" class="muted">Sem dados no período.</td></tr>`}</tbody></table></div>`;
  const grp = (arr, lab) => arr.map(x => [esc(lab(x.k)), x.n, money(x.receita), money(x.lucro), x.horas ? money(x.lucro / x.horas) : '—']);
  const H = ['', 'Trab.', 'Receita', 'Lucro', 'Lucro/h'];
  const pl = [['Receita de serviços', t.receita], ['− Produtos / químicos', -t.produtos], ['− Mão de obra (incl. comissões)', -t.mao_obra], ['− Deslocações de trabalhos', -t.desloc_trab], ['− Outros custos diretos', -t.outros],
    ['= Lucro bruto', t.lucro_bruto, 1], ...Object.entries(t.por_cat).map(([k, v]) => ['− ' + k, -v]), ['− Deslocações sem trabalho', -t.desloc_sem_trab], ['= Lucro operacional', t.lucro_operacional, 1],
    [`− Reserva p/ impostos (${n2(A.S.reserva_impostos)}%)`, -t.reserva_impostos], ['= Resultado estimado após reserva', t.lucro_operacional - t.reserva_impostos, 1]];
  view.innerHTML = `
    <div class="glass card no-print" style="margin-bottom:14px"><div class="row">
      <label class="f"><span>De</span><input class="inp" type="date" id="rf" value="${st.from}"></label><label class="f"><span>Até</span><input class="inp" type="date" id="rt" value="${st.to}"></label>
      <div class="chips" style="align-self:flex-end">${presets.map(([l, a, b]) => `<button class="chip ${st.from === a && st.to === b ? 'on' : ''}" data-a="${a}" data-b="${b}">${l}</button>`).join('')}</div></div></div>
    <div class="grid kpis" style="margin-bottom:14px">
      <div class="glass kpi"><div class="l">Receita</div><div class="v">${money(t.receita)}</div><div class="s">${t.trabalhos} trabalhos</div></div>
      <div class="glass kpi k-ok"><div class="l">Lucro bruto</div><div class="v">${money(t.lucro_bruto)}</div><div class="s">${n2(t.margem_bruta)}% margem</div></div>
      <div class="glass kpi k-ok"><div class="l">Lucro operacional</div><div class="v">${money(t.lucro_operacional)}</div></div>
      <div class="glass kpi k-warn"><div class="l">Reserva impostos</div><div class="v">${money(t.reserva_impostos)}</div></div>
      <div class="glass kpi k-vio"><div class="l">Ticket médio</div><div class="v">${money(t.ticket_medio)}</div></div>
      <div class="glass kpi k-vio"><div class="l">Lucro/hora</div><div class="v">${money(t.lucro_hora)}</div></div></div>
    <div class="grid cols-2" style="margin-bottom:14px">
      <div class="glass card chart"><h3>${icon('chart')} Fluxo de caixa diário<span class="legend right"><span><i style="background:#60a5fa"></i>Entradas</span><span><i style="background:#fb923c"></i>Despesas</span></span></h3>
        ${barChart(R.caixa.dias.map(x => ({ ...x, label: R.caixa.dias.length > 40 ? '' : String(+x.d.slice(8)) })), ['entradas', 'saidas'], ['#60a5fa', '#fb923c'], 200)}
        ${lineChart(R.caixa.dias.map(x => x.entradas - x.saidas))}</div>
      <div class="glass card"><h3>Caixa (dinheiro real)</h3>
        <div class="list-i"><span class="grow">Pagamentos recebidos (${R.caixa.n_pag})</span><b class="mono">${money(R.caixa.entradas)}</b></div>
        <div class="list-i"><span class="grow">Sinais recebidos — ainda não faturados (${R.caixa.n_sinais})</span><b class="mono">${money(R.caixa.sinais)}</b></div>
        <div class="list-i"><span class="grow"><b>Total de entradas</b></span><b class="mono up">${money(R.caixa.entradas + R.caixa.sinais)}</b></div>
        <div class="list-i"><span class="grow">Despesas pagas</span><b class="mono">−${money(R.caixa.saidas)}</b></div>
        <div class="list-i"><span class="grow"><b>Saldo líquido de caixa</b></span><b class="mono ${R.caixa.entradas + R.caixa.sinais - R.caixa.saidas >= 0 ? 'up' : 'down'}">${money(R.caixa.entradas + R.caixa.sinais - R.caixa.saidas)}</b></div>
        <div class="list-i"><span class="grow">Margem de caixa</span><b class="mono">${R.caixa.entradas ? n2((R.caixa.entradas - R.caixa.saidas) / R.caixa.entradas * 100) : 0}%</b></div></div></div>
    <div class="grid cols-2e">
      <div class="glass card"><h3>Demonstração de resultados (simplificada)</h3>${pl.map(([l, v, b]) => `<div class="list-i" style="${b ? 'font-weight:700' : ''}"><span class="grow">${esc(l)}</span><span class="mono ${v < 0 ? 'muted' : ''}">${money(v)}</span></div>`).join('')}
        <p class="small muted" style="margin-top:10px">Estimativa de gestão — não substitui a contabilidade certificada. Compras de stock (${money(t.compras_stock)}) não entram no resultado: o consumo é imputado em cada trabalho.</p></div>
      <div class="grid" style="align-content:start">
        <div class="glass card"><h3>Por serviço</h3>${tbl(H.map((h, i) => i ? h : 'Serviço'), grp(R.by.servico, k => refLabel('servicos', k) || 'Sem serviço'))}</div>
        <div class="glass card"><h3>Por técnico</h3>${tbl(H.map((h, i) => i ? h : 'Técnico'), grp(R.by.tecnico, k => refLabel('equipa', k) || 'Sem técnico'))}</div>
      </div>
      <div class="glass card"><h3>Por origem do cliente</h3>${tbl(H.map((h, i) => i ? h : 'Origem'), grp(R.by.origem, k => k || 'Não indicada'))}</div>
      <div class="glass card"><h3>Melhores clientes</h3>${tbl(H.map((h, i) => i ? h : 'Cliente'), grp(R.by.cliente, k => refLabel('clientes', k)))}</div>
      <div class="glass card"><h3>Por mês</h3>${tbl(H.map((h, i) => i ? h : 'Mês'), grp(R.by.mes, k => mlabel(k)))}</div>
      <div class="glass card"><h3>Recebimentos por método</h3>${tbl(['Método', 'Valor'], Object.entries(R.metodos).map(([k, v]) => [esc(k), money(v)]))}
        <h3 style="margin-top:16px">Leads</h3>${tbl(['Origem', 'Leads'], Object.entries(R.leads.origem).map(([k, v]) => [esc(k), v]))}
        <p class="small muted">${R.leads.total} leads · ${R.leads.ganhos} ganhas · ${R.leads.perdidos} perdidas · conversão ${R.leads.total ? n2(R.leads.ganhos / R.leads.total * 100) : 0}%</p>
        <h3 style="margin-top:16px">Marketing</h3><p class="small">Investimento ${money(R.marketing.custo)} · ${R.marketing.leads} leads · ${R.marketing.clientes} clientes · receita ${money(R.marketing.receita)} · ROI ${R.marketing.custo ? n2((R.marketing.receita - R.marketing.custo) / R.marketing.custo * 100) + '%' : '—'}</p></div>
    </div>`;
  const go = () => { st.from = $('#rf').value; st.to = $('#rt').value; router(); };
  $('#rf').onchange = go; $('#rt').onchange = go;
  $$('[data-a]').forEach(b => b.onclick = () => { st.from = b.dataset.a; st.to = b.dataset.b; router(); });
});

/* ---------- Guia de início ---------- */
route(/^#\/guia$/, async view => {
  setPage('Guia de início rápido', 'Configure a aplicação em 15 minutos');
  const steps = [
    ['cog', 'Definições da empresa', 'Em <a href="#/definicoes">Definições</a> preencha nome, NIF, contactos, logótipo e cor da marca. Defina IVA (ou isenção art.º 53.º), custo/hora, custo por km, custos fixos mensais, horas faturáveis e objetivo de receita.'],
    ['sparkle', 'Serviços & extras', 'Reveja os <a href="#/e/servicos">pacotes pré-carregados</a>: preços por tamanho, duração, custo de produtos e a lista “O que inclui” — que preenche a checklist dos trabalhos e aparece no portal do cliente. Use a <a href="#/calc-precos">calculadora de preços</a> para validar margens.'],
    ['team', 'Equipa e utilizadores', 'Registe os técnicos em <a href="#/e/equipa">Equipa</a> (custo/hora e comissão entram no lucro). Crie acessos em <a href="#/utilizadores">Utilizadores</a>: Administrador, Gestor ou Técnico (sem acesso a finanças).'],
    ['users', 'Clientes & veículos', 'Adicione clientes e as respetivas viaturas (ou importe um CSV). Na ficha do cliente vê todo o histórico e pode enviar o <b>link do portal</b> por WhatsApp.'],
    ['target', 'Leads → orçamentos', 'Pedidos do portal e contactos entram em <a href="#/e/leads">Leads</a>. Converta em cliente, crie um orçamento com o construtor (linhas do catálogo, deslocação, desconto, IVA) e imprima/guarde em PDF.'],
    ['calendar', 'Marcações & agenda', 'Crie marcações na <a href="#/agenda">agenda</a>. Envie confirmação e lembrete com os modelos de mensagem (WhatsApp/SMS/Email).'],
    ['wrench', 'Trabalhos & quadro', 'Converta orçamento/marcação em trabalho. Acompanhe no <a href="#/quadro">quadro</a> (Agendado → Check-in → Lavagem → Interior → Correção/Proteção → Controlo de qualidade → Pronto → Concluído), marque tarefas da checklist, carregue fotos antes/depois e registe horas e custos — o lucro é calculado automaticamente.'],
    ['clipboard', 'Ficha de inspeção', 'No check-in registe danos, objetos pessoais, fotos e a assinatura do cliente no telemóvel/tablet. Imprima ou guarde em PDF.'],
    ['receipt', 'Faturação & recebimentos', 'Emita a fatura legal no seu software certificado AT e registe aqui o número, valor recebido e método — o painel mostra o que está por receber.'],
    ['wallet', 'Custos', 'Registe despesas, quilómetros, inventário (com alertas de stock mínimo) e manutenção de equipamentos. Use a categoria “Produtos / stock” para compras de químicos — o consumo já é imputado aos trabalhos.'],
    ['chart', 'Painel & relatórios', 'O <a href="#/">painel</a> calcula receita, lucro bruto e operacional, lucro por trabalho/hora, ticket médio, valores por receber, conversão de leads, clientes recorrentes, MRR, reserva para impostos e alertas.'],
    ['globe', 'Portal do cliente', 'Partilhe o endereço <a href="portal.php" target="_blank">portal.php</a> no Instagram/Google: mostra os serviços e recebe pedidos de contacto. Cada cliente tem um link pessoal para ver o histórico e progresso.'],
    ['db', 'Cópias de segurança', 'Descarregue regularmente uma <a href="#/backup">cópia de segurança</a>. No telemóvel, use “Adicionar ao ecrã principal” para usar como app.'],
  ];
  view.innerHTML = `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${steps.map(([i, t, d], n) =>
    `<div class="glass card"><h3><span class="badge t-info" style="padding:2px 9px">${n + 1}</span>${icon(i)} ${t}</h3><p class="muted" style="margin:0">${d}</p></div>`).join('')}</div>`;
});

/* ---------- Definições ---------- */
route(/^#\/definicoes$/, async view => {
  if (!isAdmin()) throw new Error('Apenas administradores.');
  const S = { ...A.S };
  setPage('Definições & dados', 'Personalize a aplicação: empresa, aparência, finanças, listas, campos, mensagens e dados', `<button class="btn pri" id="sv">${icon('check')} Guardar</button>`);
  const I = (k, l, t = 'text', help = '') => `<label class="f ${t === 'textarea' ? 'full' : ''}"><span>${l}</span>${t === 'textarea' ? `<textarea class="inp" data-s="${k}">${esc(S[k])}</textarea>` : `<input class="inp" type="${t}" step="0.01" data-s="${k}" value="${esc(S[k])}">`}${help ? `<small>${help}</small>` : ''}</label>`;
  const B = (k, l) => `<label class="switch"><input type="checkbox" data-s="${k}" ${S[k] === '1' ? 'checked' : ''}><span>${l}</span></label>`;
  const off = settingsJSON('modulos_off', []);
  const mods = [...Object.entries(A.schema).map(([k, E]) => [k, E.label]), ['#/calc-precos', 'Calculadora de preços'], ['#/calc-quimicos', 'Custo de químicos'], ['#/relatorios', 'Relatórios'], ['portal.php', 'Portal do cliente (menu)']];
  const mult = settingsJSON('mult_tamanho', {});
  const TABS = [['emp', 'Empresa'], ['apa', 'Aparência'], ['fin', 'Finanças & operação'], ['lst', 'Categorias & listas'], ['cmp', 'Campos personalizados'], ['msg', 'Mensagens & termos'], ['dat', 'Dados & cópias'], ['sob', 'Sobre']];
  const tab = A.ui.setTab || 'emp';
  view.innerHTML = `<div class="tabs">${TABS.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div class="grid cols-2e" id="setGrid">
    <div class="glass card" data-p="emp"><h3>${icon('users')} Empresa</h3><div class="form">
      ${I('empresa_nome', 'Nome comercial')}${I('empresa_responsavel', 'Responsável / proprietário')}${I('empresa_nif', 'NIF')}<div class="full">${I('empresa_morada', 'Morada')}</div>${I('empresa_telefone', 'Telefone')}${I('empresa_email', 'Email', 'email')}${I('empresa_web', 'Website / Instagram')}${I('empresa_iban', 'IBAN (para pagamentos)')}
      <div class="full">${I('slogan', 'Slogan (ex.: Restauro | Detalhe Auto)')}</div>
      <div class="full">${I('link_avaliacao', 'Link para avaliações no Google Maps', 'url', 'Google Business Profile → “Pedir avaliações” → copiar link. Usado no portal e em {link_avaliacao}.')}</div>
      <div class="full">${I('link_facebook', 'Link para avaliações no Facebook', 'url', 'Página do Facebook → separador Avaliações / Recomendações. Usado no portal e em {link_facebook}.')}</div></div></div>
    <div class="glass card" data-p="apa"><h3>${icon('sparkle')} Marca & aplicação (white-label)</h3><div class="form">
      ${I('app_nome', 'Nome da aplicação')}<label class="f"><span>Tema por defeito</span><select class="inp" data-s="tema"><option value="escuro" ${S.tema !== 'claro' ? 'selected' : ''}>Escuro</option><option value="claro" ${S.tema === 'claro' ? 'selected' : ''}>Claro</option></select></label>
      <label class="f"><span>Cor principal</span><input class="inp" type="color" data-s="cor" value="${esc(S.cor)}" style="height:42px;padding:4px"></label>
      <div class="full"><span class="small muted">Logótipo</span><div class="row" style="margin-top:6px"><div class="brand"><div class="logo" id="lgPrev">${S.logo ? `<img src="api.php?a=logo&t=${Date.now()}">` : icon('car')}</div></div>
        <label class="btn sm">${icon('upload')} Carregar logótipo<input type="file" accept="image/*" hidden id="lgF"></label>${S.logo ? '<button class="btn sm ghost danger" id="lgX">Remover</button>' : ''}</div>
        <small class="muted">Use PNG com fundo transparente.</small></div>${B('logo_inverter', 'Logótipo branco — inverter para preto nos documentos impressos')}</div></div>
    <div class="glass card" data-p="fin"><h3>${icon('wallet')} Finanças & cálculos</h3><div class="form">
      ${I('iva', 'Taxa de IVA (%)', 'number')}${B('iva_isento', 'Isento de IVA (art.º 53.º CIVA)')}
      ${I('reserva_impostos', 'Reserva para impostos (% do lucro)', 'number', 'IRS/IRC + Seg. Social estimados.')}${I('custo_km', 'Custo por km (€)', 'number', 'Ex.: 0,40 €/km.')}
      ${I('custo_hora', 'Custo/hora padrão de mão de obra (€)', 'number')}${I('margem_alvo', 'Margem alvo (%)', 'number')}
      ${I('custos_fixos', 'Custos fixos mensais (€)', 'number', 'Renda, seguros, software, contabilidade…')}${I('horas_mes', 'Horas faturáveis por mês', 'number')}
      ${I('objetivo_mensal', 'Objetivo de receita mensal (€)', 'number')}
      <div class="full"><span class="small muted">Multiplicadores por tamanho (calculadora)</span><div class="row" style="margin-top:6px">${TAMANHOS_JS().map(t => `<label class="f" style="width:110px"><span>${t}</span><input class="inp" type="number" step="0.05" data-mult="${esc(t)}" value="${mult[t] ?? 1}"></label>`).join('')}</div></div></div></div>
    <div class="glass card" data-p="msg"><h3>${icon('file')} Documentos & termos</h3><div class="form">
      ${I('prefixo_orc', 'Prefixo orçamentos')}${I('prefixo_trab', 'Prefixo ordens de trabalho')}${I('prefixo_fat', 'Prefixo docs. faturação')}${I('prefixo_gar', 'Prefixo certificados')}${I('validade_dias', 'Validade dos orçamentos (dias)', 'number')}
      ${I('termos_garantia', 'Condições da garantia cerâmica (certificado)', 'textarea')}
      ${I('rodape_orc', 'Rodapé / condições do orçamento', 'textarea')}${I('chk_ext', 'Checklist padrão de inspeção — exterior (uma por linha)', 'textarea')}${I('chk_int', 'Checklist padrão de inspeção — interior', 'textarea')}</div></div>
    <div class="glass card" data-p="msg"><h3>${icon('globe')} Portal do cliente</h3><div class="form">
      ${B('portal_ativo', 'Portal ativo')}${B('portal_precos', 'Mostrar preços “a partir de”')}
      <div class="full">${I('portal_titulo', 'Título principal')}</div>${I('portal_texto', 'Texto de apresentação', 'textarea')}
      ${I('portal_horario', 'Horário')}${I('portal_whatsapp', 'WhatsApp (nº)', 'tel')}<div class="full">${I('portal_instagram', 'Instagram (URL)', 'url')}</div>
      <div class="full note">Endereço público: <a href="portal.php" target="_blank">${esc(new URL('portal.php', location.href).href)}</a></div></div></div>
    <div class="glass card" data-p="apa"><h3>${icon('grid')} Módulos ativos</h3><p class="small muted">Desative módulos que o cliente não usa (os dados são mantidos).</p>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:4px">${mods.map(([k, l]) => `<label class="switch"><input type="checkbox" data-mod="${esc(k)}" ${off.includes(k) ? '' : 'checked'}><span class="small">${esc(l)}</span></label>`).join('')}</div></div>
    <div class="glass card full-span" data-p="lst"><h3>${icon('menu')} Categorias & listas</h3><p class="small muted">Edite as opções das listas (uma por linha). Os estados dos fluxos (ex.: estados dos trabalhos) não são editáveis porque comandam os cálculos.</p>
      <div class="row" style="margin-bottom:10px"><select class="inp" id="lstSel" style="max-width:420px">${Object.entries(A.listas || {}).map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join('')}</select><button class="btn sm ghost" id="lstReset">Repor original</button></div>
      <textarea class="inp" id="lstTxt" style="min-height:220px"></textarea><input type="hidden" data-s="listas" id="lstJson"></div>
    <div class="glass card full-span" data-p="cmp"><h3>${icon('plus')} Campos personalizados</h3><p class="small muted">Acrescente campos próprios a qualquer módulo (ex.: “Código da chave” nos veículos, “Instagram” nos clientes). Aparecem nos formulários, na exportação CSV e, se quiser, na lista.</p>
      <div id="cxList"></div><button class="btn sm" id="cxAdd" style="margin-top:8px">${icon('plus')} Novo campo</button><input type="hidden" data-s="campos_extra" id="cxJson"></div>
    <div class="glass card" data-p="msg"><h3>${icon('chat')} Modelos de mensagem</h3><p class="muted small">Textos de WhatsApp/SMS/Email (confirmações, lembretes, avaliações…) com variáveis como {primeiro_nome}, {veiculo}, {data}.</p><a class="btn" href="#/e/mensagens">Gerir modelos de mensagem →</a></div>
    <div class="glass card" data-p="dat"><h3>${icon('download')} Cópia de segurança</h3><p class="muted small">Descarrega todos os registos e definições num ficheiro JSON. As fotos ficam na pasta <code>uploads/</code> — inclua-a no backup do cPanel.</p><a class="btn pri" href="api.php?a=backup">${icon('download')} Descarregar cópia</a>
      <h3 style="margin-top:18px">${icon('upload')} Restaurar</h3><p class="muted small">⚠️ Substitui todos os dados atuais.</p><input type="file" accept=".json" class="inp" id="rstF"><button class="btn danger" id="rstGo" style="margin-top:8px">Restaurar</button></div>
    <div class="glass card" data-p="dat"><h3>${icon('trash')} Remover dados de demonstração</h3><p class="muted small">Apaga clientes, viaturas, trabalhos, marcações, documentos, despesas e restantes movimentos para começar a usar com dados reais. Mantém as definições, serviços, modelos de mensagem, equipa, fornecedores, inventário e equipamentos.</p>
      <label class="switch"><input type="checkbox" id="wipeAll"><span class="small">Apagar também equipa, fornecedores, inventário e equipamentos</span></label>
      <button class="btn danger" id="wipe" style="margin-top:10px">Remover dados</button></div>
    <div class="glass card" data-p="sob"><h3>${icon('info')} Sobre</h3>
      ${[['Aplicação', esc(A.S.app_nome)], ['Versão', esc(A.version)], ['Empresa', esc(A.S.empresa_nome)], ['Base de dados', esc(A.db || '')], ['PHP', esc(A.php || '')], ['Módulos', Object.keys(A.schema).length + ' + ferramentas'], ['Idioma', 'Português (Portugal)']].map(([a, b]) => `<div class="list-i"><span class="muted grow">${a}</span><b>${b}</b></div>`).join('')}
      <p class="small muted" style="margin-top:12px">Faturação: controlo interno de recebimentos — as faturas legais devem ser emitidas em software certificado pela AT. Dados guardados no seu próprio servidor (RGPD).</p></div>
  </div>`;
  const showTab = k => { A.ui.setTab = k; $$('.tab', view).forEach(b => b.classList.toggle('on', b.dataset.tab === k)); $$('[data-p]', view).forEach(p => p.classList.toggle('hide', p.dataset.p !== k)); };
  $$('.tab', view).forEach(b => b.onclick = () => showTab(b.dataset.tab)); showTab(tab);
  // listas editáveis
  const LST = settingsJSON('listas', {}); const baseOpts = k => { const [e, f] = k.split('.'); const F = A.schema[e]?.fields.find(x => x.k === f); return F?.opts_base || F?.opts || []; };
  const curOpts = k => LST[k] || A.schema[k.split('.')[0]].fields.find(x => x.k === k.split('.')[1])?.opts || [];
  const syncL = () => { $('#lstJson').value = JSON.stringify(LST); };
  const showL = () => { $('#lstTxt').value = curOpts($('#lstSel').value).join('\n'); };
  $('#lstSel').onchange = showL; showL(); syncL();
  $('#lstTxt').oninput = () => { const v = $('#lstTxt').value.split('\n').map(x => x.trim()).filter(Boolean); LST[$('#lstSel').value] = v; syncL(); };
  $('#lstReset').onclick = () => { delete LST[$('#lstSel').value]; syncL(); $('#lstTxt').value = baseOpts($('#lstSel').value).join('\n'); toast('Guarde para repor a lista original.'); };
  // campos personalizados
  const CX = settingsJSON('campos_extra', []); const TY = [['text', 'Texto'], ['textarea', 'Texto longo'], ['number', 'Número'], ['money', 'Valor (€)'], ['date', 'Data'], ['bool', 'Sim/Não'], ['select', 'Lista de opções'], ['tel', 'Telefone'], ['email', 'Email']];
  const slug = t => 'cx_' + t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);
  const drawCX = () => {
    $('#cxList').innerHTML = CX.map((c, i) => `<div class="line" data-i="${i}" style="grid-template-columns:1.2fr 1.4fr 1fr 1.4fr auto 34px;margin-bottom:6px">
      <select class="inp" data-c="e">${Object.entries(A.schema).map(([k, E]) => `<option value="${k}" ${c.e === k ? 'selected' : ''}>${esc(E.label)}</option>`).join('')}</select>
      <input class="inp" data-c="l" value="${esc(c.l || '')}" placeholder="Nome do campo"><select class="inp" data-c="t">${TY.map(([k, l]) => `<option value="${k}" ${c.t === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input class="inp" data-c="opts" value="${esc((c.opts || []).join(', '))}" placeholder="Opções (separadas por vírgula)" ${c.t === 'select' ? '' : 'disabled'}>
      <label class="switch small"><input type="checkbox" data-c="list" ${c.list ? 'checked' : ''}><span>Na lista</span></label><button class="btn icon ghost" data-rm>${icon('x')}</button></div>`).join('') || '<p class="small muted">Ainda não há campos personalizados.</p>';
    $('#cxJson').value = JSON.stringify(CX);
    $$('#cxList [data-i]').forEach(r => { const i = +r.dataset.i;
      $$('[data-c]', r).forEach(x => x.onchange = x.oninput = () => { const k = x.dataset.c; CX[i][k] = k === 'list' ? x.checked : k === 'opts' ? x.value.split(',').map(s => s.trim()).filter(Boolean) : x.value;
        if (k === 'l' && !CX[i].fixed) CX[i].k = slug(x.value); if (k === 't') drawCX(); else $('#cxJson').value = JSON.stringify(CX); });
      $('[data-rm]', r).onclick = () => { CX.splice(i, 1); drawCX(); }; });
  };
  CX.forEach(c => c.fixed = true); drawCX();
  $('#cxAdd').onclick = () => { CX.push({ e: 'clientes', l: '', k: '', t: 'text', list: false }); drawCX(); };
  // dados
  $('#rstGo').onclick = async () => { const f = $('#rstF').files[0]; if (!f) return toast('Escolha um ficheiro.', true);
    if (!await confirmBox('Todos os dados atuais serão substituídos. Continuar?', 'Restaurar')) return;
    try { await api('restore', {}, JSON.parse(await f.text())); A.cache = {}; toast('Dados restaurados.'); location.hash = '#/'; } catch (er) { fail(er); } };
  $('#wipe').onclick = async () => { if (!await confirmBox('Apagar os dados de demonstração? Faça antes uma cópia de segurança. Esta ação não pode ser anulada.', 'Apagar dados')) return;
    try { await api('wipe', {}, { tudo: $('#wipeAll').checked ? 1 : 0 }); A.cache = {}; toast('Dados removidos. Pode começar a usar com dados reais.'); location.hash = '#/'; } catch (er) { fail(er); } };
  $('#lgF').onchange = async ev => { try { const f = await uploadImage(ev.target.files[0]); await api('settings', {}, { logo: f }); A.S.logo = f; toast('Logótipo atualizado.'); renderShell(); router(); } catch (er) { fail(er); } };
  $('#lgX')?.addEventListener('click', async () => { await api('settings', {}, { logo: '' }); A.S.logo = ''; renderShell(); router(); });
  $('#sv').onclick = async () => {
    const out = {};
    $$('[data-s]', view).forEach(i => out[i.dataset.s] = i.type === 'checkbox' ? (i.checked ? '1' : '0') : i.value);
    out.modulos_off = JSON.stringify($$('[data-mod]', view).filter(i => !i.checked).map(i => i.dataset.mod));
    if (JSON.parse(out.campos_extra || '[]').some(c => !c.l || !c.k)) return toast('Dê um nome a todos os campos personalizados.', true);
    const m = {}; $$('[data-mult]', view).forEach(i => m[i.dataset.mult] = +i.value || 1); out.mult_tamanho = JSON.stringify(m);
    try { await api('settings', {}, out); toast('Definições guardadas.'); await boot(); } catch (er) { fail(er); }
  };
});

/* ---------- Utilizadores ---------- */
route(/^#\/utilizadores$/, async view => {
  if (!isAdmin()) throw new Error('Apenas administradores.');
  const { rows } = await api('users');
  const R = { admin: 'Administrador', gestor: 'Gestor', tecnico: 'Técnico' };
  setPage('Utilizadores', 'Acessos à aplicação', `<button class="btn pri" id="nu">${icon('plus')} Utilizador</button>`);
  view.innerHTML = `<div class="glass tbl-wrap"><table class="tbl"><thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Estado</th><th>Último acesso</th></tr></thead><tbody>
    ${rows.map(u => `<tr data-id="${u.id}"><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${R[u.role] || u.role}</td><td>${+u.ativo ? badge('Ativa') : badge('Cancelada')}</td><td>${esc(u.last_login || '—')}</td></tr>`).join('')}</tbody></table></div>
    <div class="note" style="margin-top:12px"><b>Administrador</b>: tudo. <b>Gestor</b>: tudo exceto definições, utilizadores e cópias. <b>Técnico</b>: agenda, marcações, trabalhos, inspeções, clientes, veículos, stock e equipamentos (sem finanças).</div>`;
  const edit = u => {
    u = u || { ativo: 1, role: 'tecnico' };
    const m = modal(u.id ? 'Editar utilizador' : 'Novo utilizador', `<div class="form">
      <label class="f full"><span>Nome</span><input class="inp" id="un" value="${esc(u.nome || '')}"></label><label class="f full"><span>Email</span><input class="inp" type="email" id="ue" value="${esc(u.email || '')}"></label>
      <label class="f"><span>Perfil</span><select class="inp" id="ur">${Object.entries(R).map(([k, l]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="switch"><input type="checkbox" id="ua" ${+u.ativo ? 'checked' : ''}><span>Ativo</span></label>
      <label class="f full"><span>${u.id ? 'Nova palavra-passe (deixe vazio para manter)' : 'Palavra-passe (mín. 8 caracteres)'}</span><input class="inp" type="password" id="up" autocomplete="new-password"></label></div>`,
      `${u.id ? `<button class="btn ghost danger" id="ud">${icon('trash')}</button>` : ''}<button class="btn pri right" id="us">Guardar</button>`, 'sm');
    $('#us', m.el).onclick = async () => { try { await api('user_save', {}, { id: u.id, nome: $('#un', m.el).value, email: $('#ue', m.el).value, role: $('#ur', m.el).value, ativo: $('#ua', m.el).checked, pass: $('#up', m.el).value }); m.close(); toast('Guardado.'); router(); } catch (er) { fail(er); } };
    $('#ud', m.el)?.addEventListener('click', async () => { if (await confirmBox('Eliminar este utilizador?', 'Eliminar')) { try { await api('user_delete', {}, { id: u.id }); m.close(); router(); } catch (er) { fail(er); } } });
  };
  $('#nu').onclick = () => edit();
  $$('tr[data-id]').forEach(tr => tr.onclick = () => edit(rows.find(u => +u.id === +tr.dataset.id)));
});

/* ---------- Cópias de segurança ---------- */
route(/^#\/backup$/, async view => {
  if (!isAdmin()) throw new Error('Apenas administradores.');
  A.ui.setTab = 'dat'; location.replace('#/definicoes'); return;
  setPage('Cópias de segurança', 'Exportar e restaurar todos os dados');
  view.innerHTML = `<div class="grid cols-2e"><div class="glass card"><h3>${icon('download')} Exportar</h3><p class="muted">Descarrega um ficheiro JSON com todos os registos e definições (as fotos ficam na pasta <code>uploads/</code> do servidor — inclua-a no backup do cPanel).</p>
    <a class="btn pri" href="api.php?a=backup">${icon('download')} Descarregar cópia</a></div>
    <div class="glass card"><h3>${icon('upload')} Restaurar</h3><p class="muted">⚠️ Substitui todos os dados atuais pelos do ficheiro.</p><input type="file" accept=".json" class="inp" id="rf"><button class="btn danger" id="rs" style="margin-top:10px">Restaurar</button></div></div>`;
  $('#rs').onclick = async () => {
    const f = $('#rf').files[0]; if (!f) return toast('Escolha um ficheiro.', true);
    if (!await confirmBox('Todos os dados atuais serão substituídos. Continuar?', 'Restaurar')) return;
    try { await api('restore', {}, JSON.parse(await f.text())); A.cache = {}; toast('Dados restaurados.'); location.hash = '#/'; } catch (er) { fail(er); }
  };
});

/* ---------- Conta ---------- */
route(/^#\/conta$/, async view => {
  setPage('A minha conta', esc(A.user.email));
  view.innerHTML = `<div class="glass card" style="max-width:460px"><h3>Alterar palavra-passe</h3><div class="form">
    <label class="f full"><span>Palavra-passe atual</span><input class="inp" type="password" id="po"></label><label class="f full"><span>Nova palavra-passe</span><input class="inp" type="password" id="pn" autocomplete="new-password"></label></div>
    <button class="btn pri" id="ps" style="margin-top:14px">Alterar</button></div>`;
  $('#ps').onclick = async () => { try { await api('password', {}, { old: $('#po').value, new: $('#pn').value }); toast('Palavra-passe alterada.'); $('#po').value = $('#pn').value = ''; } catch (er) { fail(er); } };
});


/* ---------- Lembretes & follow-ups ---------- */
route(/^#\/lembretes$/, async view => {
  await Promise.all(['clientes', 'veiculos', 'servicos', 'equipa', 'avaliacoes', 'garantias'].map(e => load(e, true)));
  const [mc, jobs] = await Promise.all([load('marcacoes', true), load('trabalhos', true)]);
  const fat = isTec() ? [] : await load('faturas', true), leads = isTec() ? [] : await load('leads', true);
  const done = settingsJSON('lembretes_ok', {}); const S = A.S, t = today();
  const cli = id => byId('clientes', id) || {}, first = c => (c.nome || '').split(' ')[0];
  const car = id => { const v = byId('veiculos', id); return v ? `${v.marca} ${v.modelo}${v.matricula ? ' · ' + v.matricula : ''}` : ''; };
  const dl = d => { const x = new Date(d + 'T12:00:00'); return `${DIAS[x.getDay()]} ${x.getDate()} ${MESES[x.getMonth()]}`; };
  const L = [];
  const add = (k, tipo, c, due, sub, txt, extra) => { if (!done[k] && c?.nome) L.push({ k, tipo, c, due, sub, txt, extra }); };
  mc.filter(r => ['Pendente', 'Confirmada'].includes(r.estado) && r.data >= t && r.data <= addDays(t, 2) && !+r.lembrete_enviado).forEach(r => { const c = cli(r.cliente_id);
    add('rem' + r.id, 'Lembrete de marcação', c, r.data, car(r.veiculo_id), `Olá ${first(c)}, fala a ${S.empresa_nome}. Lembramos a marcação de ${refLabel('servicos', r.servico_id) || 'serviço'} para o ${car(r.veiculo_id) || 'seu automóvel'} no dia ${dl(r.data)} às ${r.hora || ''}. Responda SIM para confirmar ou diga-nos se precisa de reagendar. Obrigado!`, { e: 'marcacoes', id: r.id, set: { lembrete_enviado: 1 } }); });
  mc.filter(r => +r.sinal > 0 && !+r.sinal_pago && ['Pendente', 'Confirmada'].includes(r.estado) && r.data >= t).forEach(r => { const c = cli(r.cliente_id);
    add('dep' + r.id, 'Pedido de sinal', c, r.data, car(r.veiculo_id), `Olá ${first(c)}, para garantir a marcação de ${refLabel('servicos', r.servico_id) || 'serviço'} no dia ${dl(r.data)} às ${r.hora || ''}, pedimos um sinal de ${money(r.sinal)} (descontado no valor final). Pode pagar por MB Way${S.empresa_iban ? ' ou transferência para ' + S.empresa_iban : ''}. Obrigado! ${S.empresa_nome}`); });
  jobs.filter(j => j.estado === 'Concluído' && j.data >= addDays(t, -10)).forEach(j => { const c = cli(j.cliente_id);
    if ((A.cache.avaliacoes || []).some(a => +a.cliente_id === +j.cliente_id && a.data >= addDays(j.data, -1))) return;
    add('rev' + j.id, 'Pedido de avaliação', c, addDays(j.data, 1), car(j.veiculo_id), `Olá ${first(c)}! Esperamos que esteja a gostar do resultado no ${car(j.veiculo_id) || 'seu automóvel'} ✨ Se puder deixar-nos uma avaliação, ajuda imenso:\n⭐ Google: ${S.link_avaliacao || '(link)'}${S.link_facebook ? '\n👍 Facebook: ' + S.link_facebook : ''}\nObrigado! ${S.empresa_nome}`); });
  mc.filter(r => r.estado === 'Faltou' && r.data >= addDays(t, -30)).forEach(r => { const c = cli(r.cliente_id);
    add('nos' + r.id, 'Remarcar falta', c, r.data, car(r.veiculo_id), `Olá ${first(c)}, sentimos a sua falta no dia ${dl(r.data)}. Quer remarcar o ${refLabel('servicos', r.servico_id) || 'serviço'}? Temos disponibilidade esta semana. ${S.empresa_nome}`); });
  (A.cache.veiculos || []).filter(v => v.proximo_servico && v.proximo_servico <= addDays(t, 14)).forEach(v => { const c = cli(v.cliente_id);
    add('man' + v.id + v.proximo_servico, 'Manutenção recomendada', c, v.proximo_servico, car(v.id), `Olá ${first(c)}, está na altura da manutenção do ${car(v.id)} para manter a proteção e o brilho em dia. Quer marcar? ${S.empresa_nome}`); });
  (A.cache.garantias || []).filter(g => g._c?.proxima && g._c.proxima <= addDays(t, 30)).forEach(g => { const c = cli(g.cliente_id);
    add('gar' + g.id + g._c.proxima, 'Manutenção da garantia', c, g._c.proxima, car(g.veiculo_id), `Olá ${first(c)}, a manutenção obrigatória do revestimento cerâmico (${g.produto}, certificado ${g.numero}) do ${car(g.veiculo_id)} vence a ${dl(g._c.proxima)}. É necessária para manter a garantia válida — quer marcar? ${S.empresa_nome}`, { e: 'garantias', id: g.id, set: { ultima_manutencao: t }, lbl: 'Manutenção feita' }); });
  fat.filter(f => f._c?.em_divida > 0 && f.vencimento && f.vencimento < t).forEach(f => { const c = cli(f.cliente_id);
    add('fat' + f.id + f._c.em_divida, 'Pagamento em atraso', c, f.vencimento, f.numero, `Olá ${first(c)}, verificámos que está em aberto o valor de ${money(f._c.em_divida)} referente ao serviço de ${fdate(f.data)}. Pode pagar por MB Way${S.empresa_iban ? ' ou transferência (IBAN ' + S.empresa_iban + ')' : ''}. Obrigado! ${S.empresa_nome}`); });
  leads.filter(l => l.data_followup && l.data_followup <= t && !['Ganho', 'Perdido'].includes(l.estado)).forEach(l => {
    add('lead' + l.id + l.data_followup, 'Follow-up de lead', { nome: l.nome, telefone: l.telefone, email: l.email }, l.data_followup, l.servico_interesse || '', `Olá ${(l.nome || '').split(' ')[0]}, tudo bem? Queria saber se ainda tem interesse em ${l.servico_interesse || 'tratar do seu automóvel'}. Temos disponibilidade nas próximas semanas — quer que reserve uma data? ${S.empresa_nome}`, { e: 'leads', id: l.id, set: { estado: 'Contactado', data_followup: addDays(t, 3) }, lbl: 'Contactado' }); });
  L.sort((a, b) => a.due.localeCompare(b.due));
  setPage('Lembretes & follow-ups', `${L.length} mensagens prontas a enviar`);
  const ini = n => (n || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  view.innerHTML = L.map((x, i) => `<div class="glass card" style="margin-bottom:10px" data-i="${i}"><div class="row"><span class="avatar">${esc(ini(x.c.nome))}</span>
      <div class="grow" style="min-width:180px"><b>${esc(x.c.nome)}</b> <span class="badge t-mut">${esc(x.tipo)}</span><div class="small muted">${fdate(x.due)} · ${esc(x.sub)}</div></div>
      <div class="row" style="gap:6px"><button class="btn sm" data-a="cp">Copiar</button><button class="btn sm" data-a="sms">SMS</button><button class="btn sm" data-a="wa">WhatsApp</button><button class="btn sm" data-a="em">${icon('chat')}</button><button class="btn sm pri" data-a="ok">${icon('check')} ${esc(x.extra?.lbl || 'Feito')}</button></div></div>
      <textarea class="inp" style="margin-top:10px;min-height:70px">${esc(x.txt)}</textarea></div>`).join('') || '<div class="empty">Sem lembretes pendentes. Tudo em dia ✨</div>';
  $$('[data-i]', view).forEach(card => { const x = L[+card.dataset.i], txt = () => $('textarea', card).value;
    $$('[data-a]', card).forEach(b => b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'cp') { navigator.clipboard?.writeText(txt()); toast('Copiado.'); }
      if (a === 'wa') window.open(waLink(x.c.telefone, txt()));
      if (a === 'sms') location.href = `sms:+${phoneIntl(x.c.telefone)}?&body=${encodeURIComponent(txt())}`;
      if (a === 'em') location.href = `mailto:${x.c.email || ''}?subject=${encodeURIComponent(A.S.empresa_nome)}&body=${encodeURIComponent(txt())}`;
      if (a === 'ok') { try { if (x.extra?.set) await api('save', { e: x.extra.e }, { id: x.extra.id, ...x.extra.set }); await api('remind_done', {}, { k: x.k }); const d = settingsJSON('lembretes_ok', {}); d[x.k] = today(); A.S.lembretes_ok = JSON.stringify(d); card.remove(); toast('Marcado como feito.'); } catch (er) { fail(er); } }
    }); });
});

/* ---------- Exportação antes/depois para redes sociais ---------- */
function socialExport(job) {
  const F = jparse(job.fotos); const bef = F.filter(f => f.tipo === 'Antes'), aft = F.filter(f => f.tipo === 'Depois');
  const v = byId('veiculos', job.veiculo_id);
  const st = { size: '1:1', lay: 'slider', split: 50, labels: true, bar: true, a: (bef[0] || F[0])?.f, b: (aft[0] || F[1] || F[0])?.f,
    cap: [refLabel('servicos', job.servico_id), v ? `${v.marca} ${v.modelo}` : ''].filter(Boolean).join(' · '),
    post: `${refLabel('servicos', job.servico_id)} ${v ? 'no ' + v.marca + ' ' + v.modelo : ''} ✨ Antes / depois. Marque já: ${A.S.empresa_telefone || ''} #detailing #cardetailing #carcare #ceramiccoating #portugal` };
  const sel = (k, l) => `<label class="f"><span>${l}</span><select class="inp" data-s="${k}">${F.map(f => `<option value="${esc(f.f)}" ${f.f === st[k] ? 'selected' : ''}>${esc(f.tipo || 'Foto')} · ${esc(f.f.slice(-10))}</option>`).join('')}</select></label>`;
  const seg = (k, opts) => `<div class="chips">${opts.map(([v2, l]) => `<button type="button" class="chip ${st[k] === v2 ? 'on' : ''}" data-g="${k}" data-v="${v2}">${l}</button>`).join('')}</div>`;
  const m = modal('Exportar para redes sociais', `<div class="grid cols-2e" style="align-items:start"><div><canvas id="sx" style="width:100%;border-radius:14px;background:#000"></canvas><div class="small muted" id="sxs" style="text-align:center;margin-top:6px"></div></div>
    <div class="grid" style="gap:12px"><div class="form">${sel('a', 'Foto ANTES')}${sel('b', 'Foto DEPOIS')}</div>
      <div><span class="small muted">Tamanho</span>${seg('size', [['1:1', 'Quadrado 1:1'], ['4:5', 'Retrato 4:5'], ['9:16', 'Story 9:16']])}</div>
      <div><span class="small muted">Layout</span>${seg('lay', [['slider', 'Divisão'], ['side', 'Lado a lado'], ['stack', 'Empilhado']])}</div>
      <label class="f"><span>Posição da divisão</span><input type="range" min="10" max="90" value="50" data-s="split" style="width:100%;accent-color:var(--ac)"></label>
      <label class="switch"><input type="checkbox" data-s="labels" checked><span>Etiquetas ANTES / DEPOIS</span></label>
      <label class="switch"><input type="checkbox" data-s="bar" checked><span>Barra da marca (logótipo, nome, legenda)</span></label>
      <label class="f"><span>Legenda na imagem</span><input class="inp" data-s="cap" value="${esc(st.cap)}"></label>
      <label class="f"><span>Texto do post</span><textarea class="inp" data-s="post">${esc(st.post)}</textarea></label><button class="btn" id="cpp">Copiar texto do post</button></div></div>`,
    `<span class="right"></span><button class="btn" id="shr">Partilhar</button><button class="btn pri" id="dl">${icon('download')} Descarregar PNG</button>`);
  const cv = $('#sx', m.el), ctx = cv.getContext('2d'); const imgs = {};
  const getImg = f => imgs[f] || (imgs[f] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = imgURL(f); }));
  const logo = A.S.logo ? new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'api.php?a=logo'; }) : Promise.resolve(null);
  const cover = (img, x, y, w, h) => { if (!img) { ctx.fillStyle = '#111'; ctx.fillRect(x, y, w, h); return; } const r = Math.max(w / img.width, h / img.height), iw = img.width * r, ih = img.height * r; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore(); };
  const tag = (txt, x, y, ac) => { ctx.font = '700 34px Inter, sans-serif'; const w = ctx.measureText(txt).width + 36; ctx.fillStyle = ac ? getComputedStyle(document.documentElement).getPropertyValue('--ac') : 'rgba(0,0,0,.65)'; ctx.beginPath(); ctx.roundRect(x, y, w, 56, 28); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(txt, x + 18, y + 40); return w; };
  async function draw() {
    const W = 1080, H = { '1:1': 1080, '4:5': 1350, '9:16': 1920 }[st.size]; cv.width = W; cv.height = H;
    const [A1, B1, L] = await Promise.all([getImg(st.a), getImg(st.b), logo]);
    const bh = st.bar ? 150 : 0, ih = H - bh; ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, W, H);
    if (st.lay === 'slider') { cover(A1, 0, 0, W, ih); const sx = W * st.split / 100; ctx.save(); ctx.beginPath(); ctx.rect(sx, 0, W - sx, ih); ctx.clip(); cover(B1, 0, 0, W, ih); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.fillRect(sx - 3, 0, 6, ih); ctx.beginPath(); ctx.arc(sx, ih / 2, 34, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = '700 30px Inter'; ctx.textAlign = 'center'; ctx.fillText('‹ ›', sx, ih / 2 + 10); ctx.textAlign = 'left'; }
    else if (st.lay === 'side') { cover(A1, 0, 0, W / 2 - 3, ih); cover(B1, W / 2 + 3, 0, W / 2 - 3, ih); }
    else { cover(A1, 0, 0, W, ih / 2 - 3); cover(B1, 0, ih / 2 + 3, W, ih / 2 - 3); }
    if (st.labels) { tag('ANTES', 30, 30); const bx = st.lay === 'stack' ? 30 : W - 30 - (ctx.measureText('DEPOIS').width + 36); tag('DEPOIS', bx, st.lay === 'stack' ? ih / 2 + 33 : 30, true); }
    if (st.bar) { ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, ih, W, bh); ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ac'); ctx.fillRect(0, ih, W, 6);
      let x = 40; if (L) { const s2 = 90 / Math.max(L.width, L.height); ctx.drawImage(L, x, ih + 30, L.width * s2, L.height * s2); x += L.width * s2 + 24; }
      ctx.fillStyle = '#fff'; ctx.font = '700 38px Inter, sans-serif'; ctx.fillText(A.S.empresa_nome, x, ih + 72); ctx.fillStyle = '#9aa7b8'; ctx.font = '400 28px Inter, sans-serif'; ctx.fillText(st.cap, x, ih + 112);
      ctx.textAlign = 'right'; ctx.font = '600 26px Inter'; ctx.fillText(A.S.empresa_web || A.S.empresa_telefone || '', W - 40, ih + 90); ctx.textAlign = 'left'; }
    $('#sxs', m.el).textContent = `${W} × ${H} px`;
  }
  m.el.addEventListener('input', ev => { const k = ev.target.dataset.s; if (!k) return; st[k] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value; draw(); });
  m.el.addEventListener('click', ev => { const g = ev.target.closest('[data-g]'); if (!g) return; st[g.dataset.g] = g.dataset.v; $$(`[data-g="${g.dataset.g}"]`, m.el).forEach(x => x.classList.toggle('on', x === g)); draw(); });
  $('#cpp', m.el).onclick = () => { navigator.clipboard?.writeText(st.post); toast('Texto copiado.'); };
  const blob = () => new Promise(r => cv.toBlob(r, 'image/png'));
  $('#dl', m.el).onclick = async () => { const a = document.createElement('a'); a.href = URL.createObjectURL(await blob()); a.download = `antes-depois-${job.numero || job.id}.png`; a.click(); };
  $('#shr', m.el).onclick = async () => { const f = new File([await blob()], 'antes-depois.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] })) navigator.share({ files: [f], text: st.post }).catch(() => { }); else toast('Partilha não suportada neste navegador — descarregue o PNG.', true); };
  draw();
}

/* ---------- Contadores no menu ---------- */
async function loadBadges() {
  try { const b = await api('badges'); Object.entries(b).forEach(([k, n]) => { const el = $(`[data-cnt="${CSS.escape(k)}"]`); if (el) { el.textContent = n; el.classList.toggle('hide', !n); } }); } catch { }
}

/* ---------- Pesquisa global ---------- */
function bindSearch() {
  const q = $('#gq'), box = $('#gr'), gs = $('#gs');
  let sel = 0, items = [];
  const SRC = [['clientes', r => [r.nome, r.telefone, r.email, r.nif, r.tags], r => '#/cliente/' + r.id, r => r.nome, r => r.telefone || r.localidade],
    ['veiculos', r => [r.matricula, r.vin, r.marca, r.modelo], r => '#/cliente/' + r.cliente_id, r => `${r.marca} ${r.modelo} · ${r.matricula || ''}`, r => refLabel('clientes', r.cliente_id)],
    ['trabalhos', r => [r.numero, r.extras], null, r => r.numero, r => refLabel('clientes', r.cliente_id)],
    ['orcamentos', r => [r.numero], null, r => r.numero, r => refLabel('clientes', r.cliente_id)],
    ['faturas', r => [r.numero, r.ref_externa], null, r => r.ref_externa || r.numero, r => refLabel('clientes', r.cliente_id)],
    ['leads', r => [r.nome, r.telefone, r.email], null, r => r.nome, r => r.servico_interesse]].filter(([e]) => !isTec() || !TEC_BLOCK.includes(e));
  const run = async () => {
    const t = q.value.trim().toLowerCase(); if (t.length < 2) { box.classList.add('hide'); return; }
    await Promise.all(SRC.map(([e]) => load(e)));
    items = [];
    SRC.forEach(([e, f, href, l1, l2]) => (A.cache[e] || []).forEach(r => { if (items.length < 30 && f(r).some(x => String(x || '').toLowerCase().replace(/[\s-]/g, '').includes(t.replace(/[\s-]/g, '')))) items.push({ e, r, href: href?.(r), l1: l1(r), l2: l2(r) }); }));
    sel = 0;
    box.innerHTML = items.map((x, i) => `<a href="#" data-i="${i}" class="${i ? '' : 'sel'}">${icon(A.schema[x.e].icon)}<span><b>${esc(x.l1)}</b><br><span class="small muted">${esc(x.l2 || '')}</span></span><small>${esc(A.schema[x.e].one)}</small></a>`).join('') || '<div class="small muted" style="padding:10px">Sem resultados.</div>';
    box.classList.remove('hide');
    $$('a', box).forEach(a => a.onmousedown = ev => { ev.preventDefault(); go(items[+a.dataset.i]); });
  };
  const go = x => { if (!x) return; box.classList.add('hide'); gs.classList.remove('open'); q.value = ''; q.blur(); if (x.href) location.hash = x.href; else openForm(x.e, x.r); };
  let tm; q.oninput = () => { clearTimeout(tm); tm = setTimeout(run, 150); };
  q.onkeydown = ev => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); sel = Math.max(0, Math.min(items.length - 1, sel + (ev.key === 'ArrowDown' ? 1 : -1))); $$('a', box).forEach((a, i) => a.classList.toggle('sel', i === sel)); }
    if (ev.key === 'Enter') { ev.preventDefault(); go(items[sel]); }
    if (ev.key === 'Escape') { box.classList.add('hide'); gs.classList.remove('open'); q.blur(); }
  };
  q.onblur = () => setTimeout(() => { box.classList.add('hide'); gs.classList.remove('open'); }, 150);
  $('#gsBtn').onclick = () => { gs.classList.add('open'); q.focus(); };
  if (!window._slashBound) { window._slashBound = true; addEventListener('keydown', ev => { if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { ev.preventDefault(); $('#gs')?.classList.add('open'); $('#gq')?.focus(); } }); }
}

/* ---------- Rota do dia (serviços ao domicílio) ---------- */
route(/^#\/rota$/, async view => {
  const st = A.ui.rota = A.ui.rota || { d: today() };
  await Promise.all(['clientes', 'veiculos', 'servicos', 'equipa'].map(e => load(e)));
  const ev = (await load('marcacoes', true)).filter(r => r.data === st.d && !['Cancelada', 'Faltou'].includes(r.estado)).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  const addr = r => { const c = byId('clientes', r.cliente_id) || {}; return r.morada || [c.morada, c.codigo_postal, c.localidade].filter(Boolean).join(', '); };
  const stops = ev.filter(r => r.local !== 'Oficina' && addr(r));
  const base = A.S.empresa_morada;
  const maps = stops.length ? 'https://www.google.com/maps/dir/' + [base, ...stops.map(addr), base].filter(Boolean).map(encodeURIComponent).join('/') : '';
  const km = stops.reduce((s, r) => s + (+r.km || 0), 0);
  setPage('Rota do dia', `${fdate(st.d)} · ${stops.length} paragens ao domicílio`, `<input type="date" class="inp" id="rd" value="${st.d}" style="width:auto;min-height:38px">${maps ? `<a class="btn pri" href="${maps}" target="_blank" rel="noopener">${icon('route')} Abrir no Google Maps</a>` : ''}`);
  view.innerHTML = `<div class="grid kpis" style="margin-bottom:14px"><div class="glass kpi"><div class="l">Paragens</div><div class="v">${stops.length}</div><div class="s">${ev.length - stops.length} na oficina</div></div>
    <div class="glass kpi k-warn"><div class="l">Km previstos</div><div class="v">${n2(km)}</div><div class="s">${money(km * +A.S.custo_km)} de deslocação</div></div>
    <div class="glass kpi k-ok"><div class="l">Valor previsto</div><div class="v">${money(stops.reduce((s, r) => s + (+r.valor_previsto || 0), 0))}</div></div></div>
    ${base ? `<div class="alert">${icon('route')}<span>Partida e regresso: <b>${esc(base)}</b></span></div>` : '<div class="note" style="margin-bottom:10px">Indique a morada da empresa em Definições para calcular a rota a partir da base.</div>'}
    ${stops.map((r, i) => { const c = byId('clientes', r.cliente_id) || {}; return `<div class="glass card" style="margin-bottom:10px"><div class="row"><span class="avatar">${i + 1}</span>
      <div class="grow" style="min-width:200px"><b>${esc(r.hora || '')} · ${esc(c.nome || '')}</b><div class="small muted">${esc(refLabel('veiculos', r.veiculo_id))} · ${esc(refLabel('servicos', r.servico_id))}</div><div class="small">📍 ${esc(addr(r))}</div></div>
      <div class="row">${badge(r.estado)}${c.telefone ? `<a class="btn sm" href="tel:${esc(c.telefone)}">${icon('phone')}</a>` : ''}<a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr(r))}">${icon('route')} Navegar</a><button class="btn sm" data-id="${r.id}">Abrir</button></div></div></div>`; }).join('') || '<div class="empty">Sem serviços ao domicílio neste dia. Marque “Local: Domicílio do cliente” e a morada na marcação.</div>'}`;
  $('#rd').onchange = ev2 => { st.d = ev2.target.value; router(); };
  $$('[data-id]', view).forEach(b => b.onclick = () => openForm('marcacoes', byId('marcacoes', b.dataset.id)));
});


/* ---------- Frotas & empresas ---------- */
route(/^#\/frotas$/, async view => {
  await Promise.all(['clientes', 'veiculos', 'trabalhos', 'faturas', 'subscricoes'].map(e => load(e, true)));
  const F = A.cache.clientes.filter(c => ['Frota', 'Empresa', 'Stand'].includes(c.tipo));
  setPage('Frotas & empresas', `${F.length} contas`, `<button class="btn pri" id="nf">${icon('plus')}<span class="btn-txt-m">Conta de frota</span></button>`);
  const rows = F.map(c => { const vs = A.cache.veiculos.filter(v => +v.cliente_id === +c.id), js = A.cache.trabalhos.filter(j => +j.cliente_id === +c.id && j.estado === 'Concluído');
    const sub = A.cache.subscricoes.find(x => +x.cliente_id === +c.id && x.estado === 'Ativa');
    return { c, vs, n: js.length, rec: js.reduce((s, j) => s + (+j.valor || 0), 0), div: +c._c?.em_divida || 0, last: js.map(j => j.data).sort().pop(), sub }; });
  view.innerHTML = `<div class="grid kpis" style="margin-bottom:14px"><div class="glass kpi"><div class="l">Contas</div><div class="v">${F.length}</div></div>
    <div class="glass kpi k-vio"><div class="l">Viaturas em frota</div><div class="v">${rows.reduce((s, r) => s + r.vs.length, 0)}</div></div>
    <div class="glass kpi k-ok"><div class="l">Receita total</div><div class="v">${money(rows.reduce((s, r) => s + r.rec, 0))}</div></div>
    <div class="glass kpi k-bad"><div class="l">Em dívida</div><div class="v">${money(rows.reduce((s, r) => s + r.div, 0))}</div></div></div>
    ${rows.map(r => `<div class="glass card" style="margin-bottom:10px"><div class="row"><span class="avatar">${icon('truck')}</span><div class="grow" style="min-width:200px"><b style="font-size:15px">${esc(r.c.nome)}</b> <span class="badge t-mut">${esc(r.c.tipo)}</span>
      <div class="small muted">${esc([r.c.telefone, r.c.email, r.c.nif && 'NIF ' + r.c.nif].filter(Boolean).join(' · '))}</div></div>
      <div class="row" style="gap:18px"><div><div class="tiny">Viaturas</div><b>${r.vs.length}</b></div><div><div class="tiny">Serviços</div><b>${r.n}</b></div><div><div class="tiny">Receita</div><b>${money(r.rec)}</b></div><div><div class="tiny">Em dívida</div><b class="${r.div ? 'down' : ''}">${money(r.div)}</b></div></div>
      <a class="btn sm" href="#/cliente/${r.c.id}">Abrir ficha</a></div>
      <div class="row small" style="margin-top:10px;gap:6px">${r.vs.map(v => `<span class="badge t-mut">${esc(v.marca)} ${esc(v.modelo)} · ${esc(v.matricula || '')}</span>`).join('')}${r.sub ? `<span class="badge t-ok">Plano: ${esc(r.sub.plano)}</span>` : ''}<span class="muted right">Último serviço: ${fdate(r.last)}</span></div></div>`).join('')
      || '<div class="empty">Sem contas de frota. Crie um cliente com o tipo “Frota”, “Empresa” ou “Stand”.</div>'}`;
  $('#nf').onclick = () => openForm('clientes', null, { tipo: 'Frota' });
});

/* ---------- Galeria antes / depois ---------- */
route(/^#\/antes-depois$/, async view => {
  await Promise.all(['clientes', 'veiculos', 'servicos'].map(e => load(e)));
  const jobs = (await load('trabalhos', true)).filter(j => jparse(j.fotos).length);
  const st = A.ui.ba = A.ui.ba || { q: '', t: '' };
  setPage('Antes / depois', `${jobs.length} trabalhos com fotos`);
  const draw = () => {
    const L = jobs.filter(j => (!st.q || [refLabel('clientes', j.cliente_id), refLabel('veiculos', j.veiculo_id), refLabel('servicos', j.servico_id)].join(' ').toLowerCase().includes(st.q.toLowerCase()))
      && (!st.t || jparse(j.fotos).some(f => f.tipo === st.t)));
    $('#gal').innerHTML = L.map(j => { const F = jparse(j.fotos), a = F.find(f => f.tipo === 'Antes') || F[0], d = F.find(f => f.tipo === 'Depois') || F[1];
      return `<div class="glass ba"><div class="ba-img">${a ? `<div class="ph"><img src="${imgURL(a.f)}" loading="lazy"><span class="tag">${esc(a.tipo || 'Foto')}</span></div>` : ''}${d && d !== a ? `<div class="ph"><img src="${imgURL(d.f)}" loading="lazy"><span class="tag depois">${esc(d.tipo || 'Foto')}</span></div>` : ''}</div>
        <div style="padding:12px"><b>${esc(refLabel('veiculos', j.veiculo_id))}</b><div class="small muted">${esc(refLabel('clientes', j.cliente_id))} · ${esc(refLabel('servicos', j.servico_id))} · ${fdate(j.data)} · ${F.length} fotos</div>
        <div class="row" style="margin-top:8px"><button class="btn sm" data-job="${j.id}">Abrir trabalho</button><button class="btn sm pri" data-soc="${j.id}">${icon('upload')} Exportar p/ redes</button></div></div></div>`; }).join('')
      || '<div class="empty">Sem fotos. Carregue fotos “Antes” e “Depois” em cada trabalho.</div>';
    $$('[data-job]', view).forEach(b => b.onclick = () => openForm('trabalhos', byId('trabalhos', b.dataset.job)));
    $$('[data-soc]', view).forEach(b => b.onclick = () => socialExport(byId('trabalhos', b.dataset.soc)));
    $$('.ba img', view).forEach(i => i.onclick = () => lightbox(i.src));
  };
  view.innerHTML = `<div class="row" style="margin-bottom:12px"><div class="search">${icon('search')}<input class="inp" id="q" placeholder="Pesquisar cliente, viatura, serviço…" value="${esc(st.q)}"></div>
    <div class="chips">${['', 'Antes', 'Depois', 'Dano', 'Portfólio'].map(t => `<button class="chip ${st.t === t ? 'on' : ''}" data-t="${t}">${t || 'Todas'}</button>`).join('')}</div></div><div class="grid" id="gal" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))"></div>`;
  $('#q').oninput = ev => { st.q = ev.target.value; draw(); };
  $$('[data-t]').forEach(b => b.onclick = () => { st.t = b.dataset.t; $$('[data-t]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  draw();
});

/* ---------- Pagamentos (todos os recebimentos) ---------- */
route(/^#\/pagamentos$/, async view => {
  await load('clientes');
  const fat = await load('faturas', true), rec = await load('receitas', true);
  const st = A.ui.pg = A.ui.pg || { from: today().slice(0, 8) + '01', to: today() };
  const P = [];
  fat.filter(f => f.estado !== 'Anulada').forEach(f => { const L = jparse(f.pagamentos); (L.length ? L : (+f.valor_pago ? [{ d: f.data_pagamento || f.data, v: f.valor_pago, m: f.metodo }] : []))
    .forEach(p => P.push({ d: p.d, v: +p.v || 0, m: p.m || 'Não indicado', n: p.n || '', doc: f.ref_externa || f.numero, cli: refLabel('clientes', f.cliente_id), e: 'faturas', id: f.id })); });
  rec.forEach(r => P.push({ d: r.data, v: +r.valor || 0, m: r.metodo || 'Não indicado', n: r.categoria, doc: r.descricao, cli: refLabel('clientes', r.cliente_id), e: 'receitas', id: r.id }));
  const L = P.filter(p => p.d >= st.from && p.d <= st.to).sort((a, b) => b.d.localeCompare(a.d));
  const by = {}; L.forEach(p => by[p.m] = (by[p.m] || 0) + p.v);
  setPage('Pagamentos', `${fdate(st.from)} – ${fdate(st.to)}`, `<button class="btn ghost" id="csv">${icon('download')}<span class="btn-txt-m">CSV</span></button>`);
  view.innerHTML = `<div class="row" style="margin-bottom:12px"><label class="f"><span>De</span><input class="inp" type="date" id="pf" value="${st.from}"></label><label class="f"><span>Até</span><input class="inp" type="date" id="pt" value="${st.to}"></label></div>
    <div class="grid kpis" style="margin-bottom:14px"><div class="glass kpi k-ok"><div class="l">Total recebido</div><div class="v">${money(L.reduce((s, p) => s + p.v, 0))}</div><div class="s">${L.length} pagamentos</div></div>
      ${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([m, v]) => `<div class="glass kpi"><div class="l">${esc(m)}</div><div class="v">${money(v)}</div></div>`).join('')}</div>
    <div class="glass tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Cliente</th><th>Documento</th><th>Método</th><th>Nota</th><th class="num">Valor</th></tr></thead><tbody>
    ${L.map((p, i) => `<tr data-i="${i}"><td>${fdate(p.d)}</td><td>${esc(p.cli)}</td><td>${esc(p.doc)}</td><td>${esc(p.m)}</td><td class="muted">${esc(p.n)}</td><td class="num"><b>${money(p.v)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Sem pagamentos no período.</td></tr>'}</tbody></table></div>`;
  const go = () => { st.from = $('#pf').value; st.to = $('#pt').value; router(); };
  $('#pf').onchange = go; $('#pt').onchange = go;
  $$('tr[data-i]', view).forEach(tr => tr.onclick = () => { const p = L[+tr.dataset.i]; openForm(p.e, byId(p.e, p.id)); });
  $('#csv').onclick = () => { const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const blob = new Blob(['﻿' + [['Data', 'Cliente', 'Documento', 'Método', 'Nota', 'Valor'].map(q).join(';'), ...L.map(p => [p.d, p.cli, p.doc, p.m, p.n, String(p.v).replace('.', ',')].map(q).join(';'))].join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pagamentos-${st.from}-${st.to}.csv`; a.click(); };
});

/* ---------- Tema claro / escuro ---------- */
function applyTheme() { let t; try { t = localStorage.getItem('dp_theme'); } catch { } t = t || (A.S.tema === 'claro' ? 'light' : 'dark'); document.documentElement.dataset.theme = t; }
function toggleTheme() { const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('dp_theme', t); } catch { } applyTheme(); }

/* ---------- Login & arranque ---------- */
function showLogin(msg, brand) {
  const B = brand || A.brand || {};
  document.documentElement.style.setProperty('--ac', B.cor || '#ef4444');
  $('#root').innerHTML = `<div class="login"><form class="glass box" id="lf">
    <div class="brand" style="padding:0"><div class="logo">${B.logo ? `<img src="${B.logo}">` : icon('car')}</div><div><b>${esc(B.app_nome || 'DetailPro')}</b><span>${esc(B.empresa_nome || '')}</span></div></div>
    <h1>Iniciar sessão</h1><p class="muted small" style="margin:0 0 18px">Gestão da sua empresa de detailing.</p>
    <label class="f"><span>Email</span><input class="inp" type="email" id="le" autocomplete="username" required></label>
    <label class="f" style="margin-top:12px"><span>Palavra-passe</span><input class="inp" type="password" id="lp" autocomplete="current-password" required></label>
    <div id="lerr" class="small" style="color:var(--bad);min-height:20px;margin-top:8px">${esc(msg || '')}</div>
    <button class="btn pri" style="width:100%;justify-content:center;padding:12px">Entrar</button>
    <p class="small muted" style="text-align:center;margin-top:16px"><a href="portal.php">Área de clientes →</a></p></form></div>`;
  $('#lf').onsubmit = async ev => {
    ev.preventDefault();
    try { await api('login', {}, { email: $('#le').value, pass: $('#lp').value }); boot(); } catch (er) { $('#lerr').textContent = er.message; }
  };
}
async function boot() {
  let b;
  try { b = await api('boot'); } catch (e) { $('#root').innerHTML = `<div class="login"><div class="glass box"><h1>Erro</h1><p>${esc(e.message)}</p></div></div>`; return; }
  A.brand = b.brand;
  if (!b.auth) return showLogin('', b.brand);
  Object.assign(A, { user: b.user, csrf: b.csrf, S: b.settings, schema: b.schema, listas: b.listas_editaveis, version: b.version, php: b.php, db: b.db, today: b.today, cache: {} });
  applyTheme(); renderShell();
  if (!window._routerBound) { addEventListener('hashchange', router); window._routerBound = true; }
  router();
}
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
boot();
