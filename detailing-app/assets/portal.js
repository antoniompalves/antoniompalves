/* Portal do cliente — catálogo de serviços, pedidos de marcação e área pessoal. */
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
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
const P = { info: {}, svcs: [], me: null, t: null };
const HUES = { 'Lavagem': '#f87171', 'Exterior': '#ef4444', 'Interior': '#fb923c', 'Completo': '#dc2626', 'Correção de pintura': '#f43f5e', 'Proteção cerâmica': '#e11d48', 'PPF': '#fca5a5', 'Restauro': '#b91c1c', 'Manutenção': '#f97316' };
const STAGES = ['Agendado', 'Check-in', 'Lavagem', 'Interior', 'Correção / Proteção', 'Controlo de qualidade', 'Pronto', 'Concluído'];

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
const art = (s, i = 0) => s.fotos?.[0] ? `<img src="api.php?a=pub_file&f=${encodeURIComponent(s.fotos[0])}" alt="${esc(s.nome)}" loading="lazy">`
  : `<div class="art" style="--hue:${HUES[s.categoria] || 'var(--ac)'};--rot:${[-14, -8, -20, 6][i % 4]}deg"></div>`;
const photo = f => `api.php?a=portal_file&t=${P.t}&f=${encodeURIComponent(f)}`;
function lightbox(src) { const d = document.createElement('div'); d.className = 'lightbox'; d.innerHTML = `<img src="${src}">`; d.onclick = () => d.remove(); document.body.appendChild(d); }

function svcCard(s, i) {
  const p = fromPrice(s);
  return `<a class="svc" href="#/servico/${s.id}"><div class="img">${art(s, i)}<span class="price">${p ? 'Desde ' + money(p) : 'Por orçamento'}</span><span class="go">↗</span></div>
    <h3>${esc(s.nome)}</h3><p>${esc(s.slogan || s.categoria || '')}</p></a>`;
}
function extrasList(list) {
  return `<div class="extras">${list.map(s => `<a class="extra" href="#/servico/${s.id}"><span class="t">${esc(s.nome)}</span><span class="v">${fromPrice(s) ? (s.tipo === 'Extra' ? '+ ' : '') + 'desde ' + money(fromPrice(s)) : 'por orçamento'}</span></a>`).join('')}</div>`;
}

/* ---------- Páginas ---------- */
function pgHome(v) {
  const I = P.info, pk = P.svcs.filter(s => s.tipo !== 'Extra'), ex = P.svcs.filter(s => s.tipo === 'Extra');
  const feat = (pk.filter(s => s.destaque).length ? pk.filter(s => s.destaque) : pk).slice(0, 6);
  const words = (I.portal_titulo || '').split(' ');
  v.innerHTML = `<div class="p-wrap">
    <section class="p-hero"><div class="lbl">/ ${esc(I.empresa_nome)} · ${esc(I.slogan || 'Detailing automóvel')}</div>
      <h1 class="disp" style="margin-top:16px">${esc(words.slice(0, -2).join(' '))} <em>${esc(words.slice(-2).join(' '))}</em></h1>
      <p>${esc(I.portal_texto)}</p>
      <div class="row"><a class="pill solid" href="#/marcar">${icon('calendar')} Pedir marcação</a><a class="pill" href="#/servicos">Ver todos os serviços</a>${P.t ? `<a class="pill" href="#/area">${icon('user')} A minha área</a>` : ''}</div></section>
    <section class="p-sec"><div class="p-sec-h"><h2 class="disp">Serviços</h2><a class="pill" href="#/servicos">${icon('sparkle')} Todos os serviços</a></div>
      <div class="svc-grid">${feat.map(svcCard).join('')}</div></section>
    ${ex.length ? `<section class="p-sec"><div class="p-sec-h"><h2 class="disp">Outros serviços</h2><span class="lbl">Soluções por orçamento e complementos</span></div>${extrasList(ex)}</section>` : ''}
    ${P.reviews.length ? `<section class="p-sec"><div class="p-sec-h"><h2 class="disp">Clientes</h2></div><div class="svc-grid">${P.reviews.map(r => `<div class="glass rev"><div style="color:#fbbf24">${'★'.repeat(r.pontuacao || 5)}</div><q>“${esc(r.texto)}”</q><div class="lbl" style="margin-top:12px">${esc(r.plataforma || '')}</div></div>`).join('')}</div></section>` : ''}
    <section class="p-sec"><div class="p-sec-h"><h2 class="disp">Já é cliente?</h2></div>
      <p class="muted" style="max-width:640px">Acompanhe em tempo real os trabalhos no seu automóvel, consulte a ficha de intervenções com fotos antes/depois, aceite orçamentos e peça novas marcações. Peça-nos o seu link pessoal de acesso.</p>
      <div class="row" style="margin-top:16px">${P.t ? `<a class="pill ac" href="#/area">${icon('user')} Entrar na minha área</a>` : `<a class="pill" href="#/marcar/acesso">Pedir link de acesso</a>`}</div></section></div>`;
}
function pgServicos(v) {
  const pk = P.svcs.filter(s => s.tipo !== 'Extra'), ex = P.svcs.filter(s => s.tipo === 'Extra');
  const cats = [...new Set(pk.map(s => s.categoria).filter(Boolean))];
  v.innerHTML = `<div class="p-wrap"><section class="p-hero" style="padding-bottom:10px"><div class="lbl">/ Catálogo</div><h1 class="disp" style="margin-top:14px">Todos os serviços</h1>
    <p>Preços “desde” — o valor final depende do tamanho e do estado do veículo${P.info.iva_isento === '1' ? ' (regime de isenção de IVA)' : ''}. Inspeção gratuita em todas as marcações.</p></section>
    ${cats.map(c => `<section class="p-sec"><div class="p-sec-h"><h2 class="disp" style="font-size:clamp(34px,5vw,64px)">${esc(c)}</h2></div><div class="svc-grid">${pk.filter(s => s.categoria === c).map(svcCard).join('')}</div></section>`).join('')}
    ${pk.filter(s => !s.categoria).length ? `<section class="p-sec"><div class="svc-grid">${pk.filter(s => !s.categoria).map(svcCard).join('')}</div></section>` : ''}
    ${ex.length ? `<section class="p-sec"><div class="p-sec-h"><h2 class="disp" style="font-size:clamp(34px,5vw,64px)">Outros serviços & extras</h2></div>${extrasList(ex)}</section>` : ''}</div>`;
}
function pgServico(v, id) {
  const i = P.svcs.findIndex(s => s.id === +id), s = P.svcs[i];
  if (!s) { v.innerHTML = '<div class="p-wrap empty">Serviço não encontrado.</div>'; return; }
  const p = fromPrice(s);
  const more = P.svcs.filter(x => x.id !== s.id && x.tipo === 'Pacote').sort((a, b) => b.destaque - a.destaque).slice(0, 3);
  let sizes = s.precos ? Object.entries(s.precos).filter(([, v]) => +v > 0) : [];
  if (new Set(sizes.map(([, v]) => +v)).size < 2) sizes = [];
  v.innerHTML = `<div class="p-wrap">
    <div class="sd-top"><a class="lbl" href="#/servicos">← Todos os serviços</a><span class="num">${String(i + 1).padStart(2, '0')}</span></div>
    <h1 class="disp sd-title">${esc(s.nome)}</h1>
    <div class="sd-row"><div class="sd-slogan">${esc(s.slogan || s.categoria || '')}</div>
      <div class="facts"><div class="fact"><span class="lbl">Preço</span><b>${p ? 'Desde ' + money(p) : 'Por orçamento'}</b></div>
        <div class="fact"><span class="lbl">Duração</span><b>${esc(dur(s))}</b></div>
        <div class="fact"><span class="lbl">${s.tipo === 'Extra' ? 'Tipo' : 'Resultado'}</span><b>${esc(s.resultado || s.categoria || s.tipo)}</b></div></div></div>
    <div class="sd-img">${art(s, i)}</div>
    <div class="incl"><div><div class="lbl">/ O que inclui</div>
        ${s.inclui.length ? `<ol>${s.inclui.map(t => `<li><span>${esc(t)}</span></li>`).join('')}</ol>` : `<p class="muted" style="margin-top:16px">${esc(s.descricao || 'Fale connosco para mais detalhes.')}</p>`}
        ${sizes.length > 1 ? `<div class="lbl" style="margin-top:34px">/ Preço por tamanho de veículo</div><div class="facts" style="margin-top:12px">${sizes.map(([k, val]) => `<div class="fact"><span class="lbl">${esc(k)}</span><b>${money(val)}</b></div>`).join('')}</div><p class="small muted">${P.info.iva_isento === '1' ? 'Valores sem IVA — regime de isenção de IVA.' : 'Valores sem IVA.'} O valor final depende do tamanho e do estado do veículo.</p>` : ''}
        ${s.fotos?.length > 1 ? `<div class="gallery" style="margin-top:30px">${s.fotos.slice(1).map(f => `<img src="api.php?a=pub_file&f=${encodeURIComponent(f)}" loading="lazy">`).join('')}</div>` : ''}</div>
      <aside><p>${esc(s.descricao || '')}</p><a class="pill solid" href="#/marcar/${s.id}">${icon('calendar')} Marcar este serviço</a>
        <span class="lbl">Inspeção gratuita em todas as marcações${P.info.portal_horario ? ' · ' + esc(P.info.portal_horario) : ''}</span></aside></div>
    ${more.length ? `<section class="p-sec"><div class="p-sec-h"><h2 class="disp">Mais serviços</h2><a class="pill" href="#/servicos">${icon('sparkle')} Todos os serviços</a></div><div class="svc-grid">${more.map((x) => svcCard(x, P.svcs.indexOf(x))).join('')}</div></section>` : ''}</div>`;
  $$('.gallery img', v).forEach(im => im.onclick = () => lightbox(im.src));
}
function pgMarcar(v, sid) {
  const acesso = sid === 'acesso';
  const pre = new Set(acesso ? [] : String(sid || '').split(',').map(Number));
  const vid = +(new URLSearchParams(location.hash.split('?')[1] || '').get('v') || 0);
  const me = P.me, car = me?.veiculos.find(x => x.id === vid) || me?.veiculos[0];
  v.innerHTML = `<div class="p-wrap" style="max-width:980px"><section class="p-hero" style="padding-bottom:20px"><div class="lbl">/ ${acesso ? 'Área de cliente' : 'Pedido de marcação'}</div>
    <h1 class="disp" style="margin-top:14px;font-size:clamp(48px,9vw,120px)">${acesso ? 'Pedir acesso' : 'Marcar serviço'}</h1>
    <p>${acesso ? 'Deixe os seus contactos e enviamos-lhe o link pessoal para a sua área de cliente.' : 'Escolha os serviços e a sua disponibilidade. Entramos em contacto para confirmar data, hora e valor final.'}</p></section>
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
      <label class="f full"><span>Mensagem</span><textarea class="inp" name="notas" placeholder="${acesso ? 'Matrícula do seu veículo (ajuda-nos a identificá-lo)' : 'Estado do veículo, pedidos especiais, serviço ao domicílio…'}"></textarea></label>
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
  const I = P.info;
  document.documentElement.style.setProperty('--ac', I.cor || '#ef4444');
  document.title = I.empresa_nome + ' · Serviços de detailing';
  $('#root').innerHTML = `
    <header class="p-top"><div class="p-wrap"><a href="#/" class="brand" style="padding:0">${I.logo ? `<div class="logo"><img src="${I.logo}" alt=""></div>` : ''}<div><b style="color:var(--paper)">${esc(I.empresa_nome)}</b><span>${esc(I.slogan || I.portal_horario || '')}</span></div></a>
      <nav><a href="#/" data-h="#/">Início</a><a href="#/servicos" data-h="#/servicos">Serviços</a><a href="#/marcar" data-h="#/marcar">Marcar</a><a href="#/area" data-h="#/area">${P.t ? 'A minha área' : 'Área de cliente'}</a></nav>
      <a class="pill solid" href="#/marcar" style="margin-left:8px">Marcar</a></div></header>
    <main id="pv"></main>
    <footer class="p-foot"><div class="p-wrap row" style="justify-content:space-between;align-items:flex-start">
      <div><b style="color:var(--paper)">${esc(I.empresa_nome)}</b><br>${esc(I.empresa_morada || '')}<br>${esc(I.portal_horario || '')}</div>
      <div style="text-align:right">${I.empresa_telefone ? `<a href="tel:${esc(I.empresa_telefone)}">${esc(I.empresa_telefone)}</a><br>` : ''}${I.empresa_email ? `<a href="mailto:${esc(I.empresa_email)}">${esc(I.empresa_email)}</a><br>` : ''}
        ${I.portal_whatsapp ? `<a href="https://wa.me/${String(I.portal_whatsapp).replace(/\D/g, '').replace(/^(?=\d{9}$)/, '351')}" target="_blank">WhatsApp</a> · ` : ''}${I.portal_instagram ? `<a href="${esc(I.portal_instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}</div></div></footer>
    <nav class="p-mnav glass"><a href="#/" data-h="#/">${icon('home')}<span>Início</span></a><a href="#/servicos" data-h="#/servicos">${icon('sparkle')}<span>Serviços</span></a>
      <a href="#/marcar" data-h="#/marcar">${icon('calendar')}<span>Marcar</span></a><a href="#/area" data-h="#/area">${icon('user')}<span>${P.t ? 'Área' : 'Cliente'}</span></a></nav>`;
}
function render() {
  const h = location.hash || '#/', v = $('#pv');
  $$('[data-h]').forEach(a => a.classList.toggle('on', a.dataset.h === h.split('?')[0] || (a.dataset.h !== '#/' && h.startsWith(a.dataset.h))));
  let m;
  if ((m = h.match(/^#\/servico\/(\d+)/))) pgServico(v, m[1]);
  else if (h.startsWith('#/servicos')) pgServicos(v);
  else if ((m = h.match(/^#\/marcar(?:\/([\w,]+))?/))) pgMarcar(v, m[1]);
  else if (h.startsWith('#/area')) pgArea(v);
  else pgHome(v);
  if (!h.includes('?')) scrollTo(0, 0);
}
(async () => {
  const q = new URLSearchParams(location.search);
  if (q.get('t')) { try { localStorage.setItem('dp_portal_t', q.get('t')); } catch { } P.t = q.get('t'); history.replaceState(null, '', location.pathname + '#/area'); }
  else { try { P.t = localStorage.getItem('dp_portal_t'); } catch { } }
  try {
    const d = await api('pub_info'); P.info = d.info; P.svcs = d.servicos; P.reviews = d.avaliacoes;
    if (P.t) { try { P.me = await api('portal_me', { t: P.t }); } catch { } }
  } catch (e) { $('#root').innerHTML = `<div class="login"><div class="glass box"><h1>Indisponível</h1><p>${esc(e.message)}</p></div></div>`; return; }
  shell(); addEventListener('hashchange', render); render();
})();
