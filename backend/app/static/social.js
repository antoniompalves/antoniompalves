"use strict";
// Social layer: accounts, groups, dinner polls, shared shopping lists, activity feed,
// settings and realtime updates. Loaded after app.js (shares its globals). PT-PT, tratamento por "tu".

// ---------------------------------------------------------------- generic bottom sheet
/** Same physics as the import sheet: rises from the bottom, follows the finger 1:1,
    rubber-bands upward, flick-to-dismiss by projected landing point. */
function openSheet({ title: heading, body, submit = "Guardar", onSubmit, onMount, cancel = "Cancelar", noSubmit = false }) {
  const scrim = $("#scrim");
  const el = document.createElement("section");
  el.className = "sheet glass glass-thick dyn-sheet";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="grabber" aria-hidden="true"></div>
    <form novalidate>
      <div class="sheet-head"><button type="button" class="text-btn" data-close>${esc(cancel)}</button>
        <h2>${esc(heading)}</h2>${noSubmit ? "<span></span>" : `<button type="submit" class="text-btn strong">${esc(submit)}</button>`}</div>
      <div class="sheet-body">${body}</div>
    </form>`;
  document.body.append(el);
  scrim.hidden = false;
  const returnFocus = document.activeElement;
  document.body.classList.add("sheet-open"); $("#app").inert = true;
  const height = () => el.offsetHeight || 400;
  let open = true;
  const spring = new Spring({ value: height(), onUpdate: y => {
    el.style.transform = `translateY(${y}px)`;
    scrim.style.opacity = 1 - Math.min(1, Math.max(0, y / height()));
    if (motion.reducedMotion()) el.style.opacity = y >= height() ? 0 : 1;
  } });
  const hide = (velocity = 0) => {
    if (!open) return; open = false;
    spring.onRest = y => { if (y >= height() - 1) { el.remove(); if (!document.querySelector(".dyn-sheet") && $("#importSheet").hidden) scrim.hidden = true; } };
    spring.to(height(), { velocity, damping: 1, response: 0.34 });
    document.body.classList.remove("sheet-open"); $("#app").inert = false;
    removeEventListener("keydown", onKey); scrim.removeEventListener("click", onScrim);
    returnFocus?.focus?.({ preventScroll: true });
  };
  const onKey = e => { if (e.key === "Escape") hide(); };
  const onScrim = () => hide();
  addEventListener("keydown", onKey); scrim.addEventListener("click", onScrim);
  $("[data-close]", el).onclick = () => hide();
  const form = $("form", el);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("[type=submit]", el);
    if (btn) btn.disabled = true;
    try { if ((await onSubmit?.(form, el)) !== false) hide(); }
    catch (err) { toast(err.message); }
    finally { if (btn) btn.disabled = false; }
  });
  let y0 = 0;
  drag(el, {
    axes: "y",
    start: e => !!e.target.closest(".grabber, .sheet-head") && !e.target.closest("button"),
    begin: () => { spring.stop(); y0 = spring.value; },
    move: ({ dy }) => { const y = y0 + dy; spring.set(y < 0 ? rubberband(y, height()) : y); },
    end: ({ vy }) => {
      if (spring.value + project(vy) > height() * 0.5) hide(vy);
      else spring.to(0, { velocity: vy, damping: 0.8, response: 0.3 });
    },
  });
  onMount?.(el, hide);
  spring.set(height()); spring.to(0, { damping: 1, response: 0.38 });
  return { el, hide };
}

/** Downscale a photo in the browser before upload (phones produce 5–12 MB images). */
function resizeImage(file, max = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Não foi possível ler essa fotografia."));
    img.src = URL.createObjectURL(file);
  });
}

// ---------------------------------------------------------------- feature sheets
function openCookSheet(r, done) {
  let dataUrl = null;
  openSheet({
    title: "Já fiz isto", submit: "Publicar",
    body: `<p class="meta sheet-lead">Mostra ao grupo como correu: <b>${esc(r.title)}</b></p>
      <label class="photo-pick" id="photoPick">
        <input type="file" accept="image/*" capture="environment" hidden>
        <span class="photo-empty">${I.camera}<b>Adicionar fotografia</b><small>Opcional</small></span>
      </label>
      <label class="field"><span class="field-label">Nota</span>
        <textarea name="note" rows="3" maxlength="1000" placeholder="ex.: Pus metade do sal e ficou perfeito"></textarea></label>`,
    onMount: el => {
      const input = $("input[type=file]", el);
      input.onchange = async () => {
        const f = input.files?.[0]; if (!f) return;
        try {
          dataUrl = await resizeImage(f);
          $("#photoPick", el).innerHTML = `<img src="${dataUrl}" alt="Pré-visualização">`;
          $("#photoPick", el).append(input);
        } catch (e) { toast(e.message); }
      };
    },
    onSubmit: async form => {
      await api(`/recipes/${r.id}/cooks`, { method: "POST", body: { note: form.note.value.trim() || null, photo: dataUrl } });
      haptic(12); toast("Publicado no grupo"); done?.();
    },
  });
}

function openVariationSheet(r, existing, done) {
  openSheet({
    title: existing ? "Editar variação" : "A minha versão", submit: "Guardar",
    body: `<p class="meta sheet-lead">A receita original de ${esc(r.owner?.name || "quem a trouxe")} fica intacta. O grupo vê as versões lado a lado.</p>
      <label class="field"><span class="field-label">Nome</span>
        <input name="title" maxlength="80" required placeholder="ex.: Versão sem glúten" value="${esc(existing?.title || "")}"></label>
      <label class="field"><span class="field-label">O que fazes de diferente</span>
        <textarea name="body" rows="5" maxlength="4000" required placeholder="ex.: Troco a massa por massa de arroz e junto uma colher de miso ao molho.">${esc(existing?.body || "")}</textarea></label>
      ${existing ? `<button type="button" class="danger-link" id="delVar">${I.trash}Apagar variação</button>` : ""}`,
    onMount: (el, hide) => {
      $("#delVar", el) && ($("#delVar", el).onclick = async () => {
        await api(`/variations/${existing.id}`, { method: "DELETE" }); hide(); toast("Variação apagada"); done?.();
      });
    },
    onSubmit: async form => {
      const body = { title: form.title.value.trim(), body: form.body.value.trim() };
      if (!body.title || !body.body) { toast("Preenche o nome e o que fazes de diferente."); return false; }
      await api(existing ? `/variations/${existing.id}` : `/recipes/${r.id}/variations`, { method: existing ? "PATCH" : "POST", body });
      toast(existing ? "Variação atualizada" : "Variação partilhada"); done?.();
    },
  });
}

function openShareSheet(r, done) {
  openSheet({
    title: "Partilhar receita", submit: "Guardar",
    body: `<p class="meta sheet-lead">Escolhe os grupos que podem ver <b>${esc(r.title)}</b>. Continua a ser tua.</p>
      <div class="choice-list">${groups().map(g => `
        <label class="choice"><input type="checkbox" name="g" value="${esc(g.id)}" ${r.shared_group_ids.includes(g.id) ? "checked" : ""}>
          <span class="faces">${g.members.slice(0, 4).map(m => avatar(m, "xs")).join("")}</span>
          <span><b>${esc(g.name)}</b><small>${g.members.length} ${g.members.length === 1 ? "pessoa" : "pessoas"}</small></span></label>`).join("")}</div>`,
    onSubmit: async form => {
      const ids = [...form.querySelectorAll("[name=g]:checked")].map(x => x.value);
      const updated = await api(`/recipes/${r.id}/shares`, { method: "PUT", body: { group_ids: ids } });
      state.recipes = state.recipes.map(x => x.id === r.id ? updated : x);
      toast(ids.length ? "Partilha atualizada" : "Agora só tu vês esta receita"); done?.(updated);
    },
  });
}

async function openAddToListSheet(r, servings) {
  let lists = [];
  try { lists = await api("/lists"); } catch (e) { return toast(e.message); }
  openSheet({
    title: "Adicionar às compras", submit: "Adicionar",
    body: `<label class="field"><span class="field-label">Doses</span>
        <input name="servings" type="number" inputmode="numeric" min="1" max="100" value="${servings || r.servings || ""}" ${r.servings ? "" : "disabled placeholder=\"Sem doses na receita\""}></label>
      <div class="field-label" style="margin-top:.25rem">Lista</div>
      <div class="choice-list">${lists.map((l, i) => `
        <label class="choice"><input type="radio" name="l" value="${esc(l.id)}" ${i === 0 ? "checked" : ""}>
          <span class="list-ico">${l.group_id ? I.users : I.list}</span>
          <span><b>${esc(l.title)}</b><small>${l.group_id ? esc(l.group_name || "Grupo") : "Pessoal"} · ${l.total - l.done} por comprar</small></span></label>`).join("")}
        <label class="choice"><input type="radio" name="l" value="__new" ${lists.length ? "" : "checked"}>
          <span class="list-ico">${I.plus}</span><span><b>Nova lista pessoal</b><small>Só tu a vês</small></span></label>
      </div>`,
    onSubmit: async form => {
      let lid = form.querySelector("[name=l]:checked")?.value;
      if (lid === "__new") lid = (await api("/lists", { method: "POST", body: { title: "As minhas compras" } })).id;
      const n = parseInt(form.servings.value, 10);
      await api(`/lists/${lid}/items`, { method: "POST", body: { recipe_id: r.id, servings: Number.isFinite(n) ? n : null } });
      haptic(); toast("Ingredientes adicionados", { action: "Ver lista", onAction: () => location.hash = `/list/${lid}` });
    },
  });
}

// ---------------------------------------------------------------- auth
function signOut() {
  store.set("session", "");
  state.me = null; state.recipes = [];
  stream?.close(); stream = null;
  renderAuth();
}

async function renderAuth() {
  document.body.classList.add("auth-mode");
  title.innerHTML = "";
  const h = currentRoute();
  const code = h.startsWith("/join/") ? decodeURIComponent(h.slice(6)) : "";
  let invite = null;
  if (code) { try { invite = await api(`/invites/${encodeURIComponent(code)}`); } catch {} }
  let mode = invite ? "signup" : store.get("authMode", "login");
  const draw = () => {
    view.innerHTML = `<div class="auth">
      <div class="auth-brand"><div class="art">${I.fork}</div><h1 class="large-title">RecipeBox</h1>
        <p class="subtitle">As receitas das redes sociais, guardadas e partilhadas com os teus amigos.</p></div>
      ${invite ? `<div class="invite glass">${I.users}<div><b>Foste convidado para ${esc(invite.name)}</b>
        <span class="meta">${esc(invite.members.join(", "))}</span></div></div>` : ""}
      <form class="auth-card glass glass-thick" novalidate>
        <div class="seg" role="tablist">
          <button type="button" role="tab" class="${mode === "login" ? "on" : ""}" data-mode="login" aria-selected="${mode === "login"}">Entrar</button>
          <button type="button" role="tab" class="${mode === "signup" ? "on" : ""}" data-mode="signup" aria-selected="${mode === "signup"}">Criar conta</button>
        </div>
        ${mode === "signup" ? `<label class="field"><span class="field-label">Nome</span><input name="name" autocomplete="name" maxlength="40" placeholder="Como o grupo te vê"></label>` : ""}
        <label class="field"><span class="field-label">Nome de utilizador</span>
          <input name="username" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="ex.: ana.silva"></label>
        <label class="field"><span class="field-label">Palavra-passe</span>
          <input name="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" placeholder="${mode === "signup" ? "Pelo menos 6 caracteres" : ""}"></label>
        ${mode === "signup" && !invite ? `<label class="field"><span class="field-label">Código de convite ou de registo</span>
          <input name="code" autocapitalize="off" spellcheck="false" placeholder="Pede-o a quem te convidou"></label>` : ""}
        <span class="hint" id="authHint" aria-live="polite"></span>
        <button class="btn-primary" type="submit">${mode === "login" ? "Entrar" : "Criar conta"}</button>
      </form></div>`;
    view.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; store.set("authMode", mode); draw(); });
    $(".auth-card").addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target, hint = $("#authHint");
      hint.textContent = "";
      try {
        let res;
        if (mode === "login") {
          res = await api("/auth/login", { method: "POST", body: { username: f.username.value.trim(), password: f.password.value } });
        } else {
          const extra = invite ? { invite_code: code } : codeFields(f.code?.value);
          res = await api("/auth/signup", { method: "POST", body: { name: f.name.value.trim(), username: f.username.value.trim(), password: f.password.value, ...extra } });
        }
        store.set("session", res.token);
        await Promise.all([loadMe(), loadRecipes()]);
        connectStream();
        if (invite && mode === "login") await api("/groups/join", { method: "POST", body: { code } }).then(loadMe).catch(() => {});
        location.hash = invite ? "/group" : "/";
        route();
        toast(`Olá, ${firstName(me())}!`);
      } catch (err) { hint.textContent = friendlyAuthError(err.message); }
    });
  };
  draw();
}
// The code field accepts either a pasted invite link/code or the server's sign-up code.
function codeFields(v) {
  v = (v || "").trim();
  const m = v.match(/#\/join\/([^/?\s]+)/);
  return m ? { invite_code: decodeURIComponent(m[1]) } : v ? { invite_code: v, signup_code: v } : {};
}
function friendlyAuthError(msg) {
  if (/string_too_short|at least 6/i.test(msg) || msg === "Erro do servidor (422)") return "Confirma os campos: o nome de utilizador precisa de 3 caracteres (letras, números, . _ -) e a palavra-passe de 6.";
  return msg;
}

async function joinFromLink(code) {
  try {
    const g = await api("/groups/join", { method: "POST", body: { code: decodeURIComponent(code) } });
    await loadMe();
    state.groupId = g.id; store.set("groupId", g.id);
    toast(`Entraste em ${g.name}`);
  } catch (e) { toast(e.message); }
  location.hash = "/group";
}

// ---------------------------------------------------------------- realtime
let stream = null;
const pendingRefresh = new Set();
let refreshTimer = null;
function connectStream() {
  stream?.close();
  const token = store.get("session", "");
  if (!token || !window.EventSource) return;
  stream = new EventSource(`/stream?token=${encodeURIComponent(token)}`);
  stream.onmessage = e => {
    let ev; try { ev = JSON.parse(e.data); } catch { return; }
    pendingRefresh.add(JSON.stringify(ev));
    clearTimeout(refreshTimer); refreshTimer = setTimeout(flushRefresh, 200); // coalesce bursts
  };
}
async function flushRefresh() {
  const evs = [...pendingRefresh].map(x => JSON.parse(x)); pendingRefresh.clear();
  const h = currentRoute();
  const kinds = new Set(evs.map(e => e.kind));
  if (kinds.has("activity") || kinds.has("event")) await loadMe().catch(() => {});
  if (kinds.has("recipe") || kinds.has("activity")) await loadRecipes().catch(() => {});
  const y = scrollY;
  if (h.startsWith("/list/") && evs.some(e => e.kind === "list" && e.id === h.slice(6))) await renderList(h.slice(6), true);
  else if (h === "/lists" && (kinds.has("lists") || kinds.has("list"))) await renderLists(true);
  else if (h.startsWith("/event/") && evs.some(e => e.kind === "event" && e.id === h.slice(7))) await renderEvent(h.slice(7), true);
  else if (h === "/group" && (kinds.has("activity") || kinds.has("event"))) await renderGroup(true);
  else if (h.startsWith("/r/") && detailRefresh?.id === h.slice(3) && evs.some(e => e.kind === "recipe" && e.id === h.slice(3))) detailRefresh.reload();
  else if (h === "/" && (kinds.has("recipe") || kinds.has("activity"))) renderResults();
  else return;
  scrollTo(0, y);
}

// ---------------------------------------------------------------- Grupo tab
function currentGroup() {
  const g = groupById(state.groupId) || groups()[0];
  if (g && g.id !== state.groupId) { state.groupId = g.id; store.set("groupId", g.id); }
  return g;
}
const inviteLink = g => `${location.origin}/#/join/${encodeURIComponent(g.invite_code)}`;
async function shareInvite(g) {
  const url = inviteLink(g);
  const text = `Junta-te ao grupo “${g.name}” no RecipeBox para partilharmos receitas:`;
  if (navigator.share) return navigator.share({ title: "Convite RecipeBox", text, url }).catch(() => {});
  await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {});
  toast("Ligação de convite copiada");
}

async function renderGroup(silent = false) {
  const g = currentGroup();
  if (!g) return renderNoGroup();
  largeTitle(g.name, `${g.members.length} ${g.members.length === 1 ? "pessoa" : "pessoas"} · ${g.recipe_count} receitas`);
  if (!silent) view.innerHTML = `<div class="section glass"><p class="meta">A carregar…</p></div>`;
  let summary, events, ranking, feed;
  try {
    [summary, events, ranking, feed] = await Promise.all([
      api(`/groups/${g.id}/summary`), api(`/groups/${g.id}/events`), api(`/groups/${g.id}/ranking`), api(`/groups/${g.id}/activity?limit=30`)]);
  } catch (e) { view.innerHTML = `<div class="empty glass"><p>${esc(e.message)}</p></div>`; return; }
  if (currentRoute() !== "/group") return;
  const open = events.filter(e => e.status === "open"), past = events.filter(e => e.status !== "open").slice(0, 3);
  view.innerHTML = `
    ${groups().length > 1 ? `<div class="chips" role="toolbar" aria-label="Grupos">${groups().map(x =>
      `<button class="chip glass ${x.id === g.id ? "on" : ""}" data-group="${esc(x.id)}">${esc(x.name)}${x.unseen && x.id !== g.id ? `<i class="dot"></i>` : ""}</button>`).join("")}</div>` : ""}
    <div class="members glass">
      <span class="faces lg">${g.members.slice(0, 6).map(m => avatar(m)).join("")}${g.members.length > 6 ? `<span class="av more">+${g.members.length - 6}</span>` : ""}</span>
      <button class="pill-btn" id="inviteBtn">${I.plus}Convidar</button>
    </div>

    <section class="section glass summary">
      <div class="section-head"><h3>Esta semana</h3><span class="meta">últimos 7 dias</span></div>
      <div class="sum-grid">
        <div><b>${summary.new_recipes}</b><span>receitas novas</span></div>
        <div><b>${summary.cooks}</b><span>vezes cozinhado</span></div>
        <div><b>${summary.variations}</b><span>variações</span></div>
      </div>
      ${summary.top_recipe ? `<a class="sum-row" href="#/r/${esc(summary.top_recipe.id)}">${thumb(summary.top_recipe)}
        <div><span class="eyebrow">A mais feita</span><b>${esc(summary.top_recipe.title)}</b><span class="meta">${summary.top_recipe.times}× esta semana</span></div></a>` : ""}
      ${summary.most_active ? `<div class="sum-row">${avatar(summary.most_active, "md")}<div><span class="eyebrow">Mais ativo</span><b>${esc(summary.most_active.name)}</b></div></div>` : ""}
      ${summary.photos.length ? `<div class="sum-photos">${summary.photos.map(p => `<img src="${esc(p)}" alt="" loading="lazy">`).join("")}</div>` : ""}
      ${!summary.new_recipes && !summary.cooks && !summary.variations ? `<p class="meta">Semana calma. Partilha uma receita ou regista o que cozinhaste para animar o grupo.</p>` : ""}
    </section>

    <section class="block">
      <div class="block-head"><h3>Jantares</h3><button class="pill-btn" id="newEvent">${I.plus}Novo jantar</button></div>
      ${open.length ? open.map(eventCard).join("") : `<div class="hint-card glass">${I.calendar}<p>Combinem o próximo jantar: escolhe 2 a 4 receitas do grupo e todos votam.</p></div>`}
      ${past.map(eventCard).join("")}
    </section>

    ${ranking.would_make_again.length || ranking.most_cooked_month.length ? `<section class="section glass">
      <div class="section-head"><h3>Ranking do grupo</h3>${I.trophy}</div>
      ${ranking.would_make_again.length ? `<p class="eyebrow rank-label">Voltavam a fazer</p>${ranking.would_make_again.map((x, i) => `
        <a class="rank-row" href="#/r/${esc(x.recipe.id)}"><span class="pos">${i + 1}</span>${thumb(x.recipe)}<b>${esc(x.recipe.title)}</b>
          <span class="score">${I.up}${x.yes}${x.no ? ` <small>· ${x.no} não</small>` : ""}</span></a>`).join("")}` : ""}
      ${ranking.most_cooked_month.length ? `<p class="eyebrow rank-label">Mais feitas este mês</p>${ranking.most_cooked_month.map((x, i) => `
        <a class="rank-row" href="#/r/${esc(x.recipe.id)}"><span class="pos">${i + 1}</span>${thumb(x.recipe)}<b>${esc(x.recipe.title)}</b>
          <span class="score">${x.times}×</span></a>`).join("")}` : ""}
    </section>` : ""}

    <section class="block">
      <div class="block-head"><h3>Atividade</h3></div>
      ${feed.length ? `<div class="feed glass">${feed.map(feedItem).join("")}</div>` : `<div class="hint-card glass">${I.users}<p>Ainda não há atividade. Convida os teus amigos e partilha a primeira receita.</p></div>`}
    </section>`;

  view.querySelectorAll("[data-group]").forEach(b => b.onclick = () => { state.groupId = b.dataset.group; store.set("groupId", state.groupId); renderGroup(); });
  $("#inviteBtn").onclick = () => shareInvite(g);
  $("#newEvent").onclick = () => openEventSheet(g);
  view.querySelectorAll("[data-href]").forEach(x => x.onclick = () => location.hash = x.dataset.href);
  if (g.unseen) { api(`/groups/${g.id}/seen`, { method: "POST" }).then(loadMe).catch(() => {}); }
}

const thumb = rec => rec?.thumbnail_url
  ? `<img class="thumb-sm" src="${esc(rec.thumbnail_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
  : `<span class="thumb-sm">${placeholder(rec?.id || rec?.title || "x")}</span>`;

function eventCard(e) {
  const lead = [...e.options].sort((a, b) => b.votes - a.votes)[0];
  const winner = e.options.find(o => o.recipe.id === e.winner_recipe_id);
  return `<article class="event-card glass" data-href="/event/${esc(e.id)}" role="link" tabindex="0">
    <div class="ev-thumbs">${e.options.slice(0, 3).map(o => thumb(o.recipe)).join("")}</div>
    <div class="ev-info">
      <b>${esc(e.title)}</b>
      <span class="meta">${e.date ? `${I.calendar}${fmtDate(e.date)} · ` : ""}${e.guests} pessoas</span>
      ${e.status === "open"
        ? `<span class="ev-status open">${e.my_vote ? "Votaste" : "Vota!"} · ${e.voters_count}/${e.members_count} votaram${lead?.votes ? ` · à frente: ${esc(lead.recipe.title)}` : ""}</span>`
        : `<span class="ev-status done">${I.trophy}${esc(winner?.recipe.title || "Decidido")}</span>`}
    </div></article>`;
}
const fmtDate = d => { try { return new Date(d + "T12:00").toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" }); } catch { return d; } };

function feedItem(a) {
  const who = `<b>${esc(firstName(a.user) || "Alguém")}</b>`;
  const rt = a.recipe ? `<b>${esc(a.recipe.title)}</b>` : `<b>${esc(a.data.title || "uma receita")}</b>`;
  const text = {
    shared: `${who} partilhou ${rt}`,
    cooked: `${who} fez ${rt}`,
    variation: `${who} criou a variação “${esc(a.data.variation)}” de ${rt}`,
    rated: a.data.value > 0 ? `${who} voltava a fazer ${rt}` : `${who} não voltava a fazer ${rt}`,
    joined: `${who} juntou-se ao grupo`,
    event_created: `${who} criou o jantar <b>${esc(a.data.title)}</b>. Vai votar!`,
    event_decided: `<b>${esc(a.data.title)}</b>: ganhou <b>${esc(a.data.recipe)}</b> para ${a.data.guests} pessoas`,
  }[a.type] || `${who} fez uma alteração`;
  const href = a.data.event_id ? `/event/${a.data.event_id}` : a.recipe_id ? `/r/${a.recipe_id}` : "";
  return `<div class="feed-item" ${href ? `data-href="${esc(href)}" role="link" tabindex="0"` : ""}>
    ${avatar(a.user, "md")}
    <div class="feed-body"><p>${text}</p>
      ${a.type === "cooked" && a.data.note ? `<p class="quote">“${esc(a.data.note)}”</p>` : ""}
      ${a.type === "cooked" && a.data.photo ? `<img class="feed-photo" src="${esc(a.data.photo)}" alt="" loading="lazy">` : ""}
      <span class="meta">${timeAgo(a.created_at)}</span></div>
    ${a.recipe && a.type !== "cooked" ? thumb({ ...a.recipe, id: a.recipe_id }) : ""}
  </div>`;
}

function renderNoGroup() {
  largeTitle("Grupo", "Cozinhar é melhor com amigos");
  view.innerHTML = `<div class="empty glass"><div class="art">${I.users}</div><h3>Cria o teu primeiro grupo</h3>
      <p>Partilha receitas com amigos ou família, combina jantares por votação e faz listas de compras em conjunto.</p>
      <button class="btn-primary" id="createGroup">${I.plus}Criar grupo</button>
      <button class="btn-glass glass" id="joinGroup" style="margin:.75rem auto 0">Usar convite</button></div>`;
  $("#createGroup").onclick = openCreateGroupSheet;
  $("#joinGroup").onclick = openJoinSheet;
}

function openCreateGroupSheet() {
  openSheet({
    title: "Novo grupo", submit: "Criar",
    body: `<label class="field"><span class="field-label">Nome do grupo</span>
      <input name="name" maxlength="60" required placeholder="ex.: Jantares de sábado"></label>
      <p class="meta">A seguir recebes uma ligação de convite para enviar aos teus amigos.</p>`,
    onSubmit: async form => {
      if (!form.name.value.trim()) { toast("Dá um nome ao grupo."); return false; }
      const g = await api("/groups", { method: "POST", body: { name: form.name.value.trim() } });
      await loadMe(); state.groupId = g.id; store.set("groupId", g.id);
      location.hash = "/group"; route();
      toast("Grupo criado", { action: "Convidar", onAction: () => shareInvite(g) });
    },
  });
}
function openJoinSheet() {
  openSheet({
    title: "Entrar num grupo", submit: "Entrar",
    body: `<label class="field"><span class="field-label">Ligação ou código de convite</span>
      <input name="code" required autocapitalize="off" spellcheck="false" placeholder="Cola aqui o convite"></label>`,
    onSubmit: async form => {
      const v = form.code.value.trim(); if (!v) return false;
      const { invite_code } = codeFields(v);
      const g = await api("/groups/join", { method: "POST", body: { code: invite_code } });
      await loadMe(); state.groupId = g.id; store.set("groupId", g.id);
      location.hash = "/group"; route(); toast(`Entraste em ${g.name}`);
    },
  });
}

// ---------------------------------------------------------------- dinner polls
function openEventSheet(g) {
  const recs = state.recipes.filter(r => r.shared_group_ids.includes(g.id));
  if (recs.length < 2) return toast("Partilha pelo menos duas receitas com o grupo para criar uma votação.");
  const nextSat = (() => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return d.toISOString().slice(0, 10); })();
  openSheet({
    title: "Novo jantar", submit: "Criar votação",
    body: `<label class="field"><span class="field-label">Nome</span><input name="title" maxlength="80" value="Jantar de sábado"></label>
      <div class="row2">
        <label class="field"><span class="field-label">Data</span><input name="date" type="date" value="${nextSat}"></label>
        <label class="field"><span class="field-label">Pessoas</span><input name="guests" type="number" inputmode="numeric" min="1" max="100" value="${Math.max(2, g.members.length)}"></label>
      </div>
      <div class="field-label">Opções para votar <small class="meta" id="pickCount">(escolhe 2 a 4)</small></div>
      <div class="recipe-pick">${recs.map(r => `
        <label class="pick"><input type="checkbox" name="r" value="${esc(r.id)}">${thumb(r)}<span>${esc(r.title)}</span></label>`).join("")}</div>`,
    onMount: el => {
      const upd = () => {
        const n = el.querySelectorAll("[name=r]:checked").length;
        $("#pickCount", el).textContent = n ? `(${n} escolhida${n === 1 ? "" : "s"})` : "(escolhe 2 a 4)";
        el.querySelectorAll("[name=r]").forEach(c => { c.disabled = !c.checked && n >= 4; });
      };
      el.querySelectorAll("[name=r]").forEach(c => c.onchange = upd);
    },
    onSubmit: async form => {
      const ids = [...form.querySelectorAll("[name=r]:checked")].map(x => x.value);
      if (ids.length < 2) { toast("Escolhe pelo menos duas receitas."); return false; }
      const e = await api(`/groups/${g.id}/events`, { method: "POST", body: {
        title: form.title.value.trim() || "Jantar", date: form.date.value || null, guests: parseInt(form.guests.value, 10) || 2, recipe_ids: ids } });
      haptic(); location.hash = `/event/${e.id}`;
    },
  });
}

async function renderEvent(id, silent = false) {
  let e;
  try { e = await api(`/events/${id}`); } catch (err) { view.innerHTML = `<div class="empty glass"><p>${esc(err.message)}</p></div>`; return; }
  if (currentRoute() !== `/event/${id}`) return;
  title.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem"><button class="bar-btn plain-bar" id="backBtn" aria-label="Voltar">${I.back}</button><div class="nav-title" style="opacity:1">${esc(e.title)}</div><span style="width:2.75rem"></span></div>`;
  $("#backBtn").onclick = () => (history.length > 1 ? history.back() : (location.hash = "/group"));
  const max = Math.max(1, ...e.options.map(o => o.votes));
  const decided = e.status !== "open";
  const top = e.options.filter(o => o.votes === max && o.votes > 0);
  view.innerHTML = `
    <div class="event-head glass">
      <div><span class="eyebrow">${decided ? "Decidido" : "Votação aberta"}</span><h2>${esc(e.title)}</h2>
        <span class="meta">${e.date ? `${I.calendar}${fmtDate(e.date)} · ` : ""}${e.guests} pessoas · organizado por ${esc(firstName(e.organiser))}</span></div>
      ${!decided ? `<div class="progress-ring" style="--p:${e.members_count ? e.voters_count / e.members_count : 0}"><b>${e.voters_count}/${e.members_count}</b><span>votaram</span></div>` : ""}
    </div>
    ${decided ? (() => { const w = e.options.find(o => o.recipe.id === e.winner_recipe_id); return w ? `
      <a class="winner" href="#/r/${esc(w.recipe.id)}">${w.recipe.thumbnail_url ? `<img src="${esc(w.recipe.thumbnail_url)}" alt="" referrerpolicy="no-referrer">` : placeholder(w.recipe.id)}
        <div class="glass-photo"><span class="eyebrow">${I.trophy} Vencedora</span><b>${esc(w.recipe.title)}</b><span>${w.votes} ${w.votes === 1 ? "voto" : "votos"}</span></div></a>
      ${e.list_id ? `<button class="btn-primary wide" id="toList">${I.cart}Ver lista de compras para ${e.guests}</button>` : ""}` : ""; })() : ""}
    <div class="options">${e.options.map(o => `
      <article class="option glass ${e.my_vote === o.recipe.id ? "mine" : ""} ${decided && o.recipe.id === e.winner_recipe_id ? "won" : ""}">
        <a href="#/r/${esc(o.recipe.id)}" class="opt-photo">${o.recipe.thumbnail_url ? `<img src="${esc(o.recipe.thumbnail_url)}" alt="" referrerpolicy="no-referrer">` : placeholder(o.recipe.id)}</a>
        <div class="opt-body">
          <b>${esc(o.recipe.title)}</b>
          <div class="bar"><i style="width:${(o.votes / max) * 100}%"></i></div>
          <div class="opt-foot"><span class="faces">${o.voters.map(u => avatar(u, "xs")).join("")}</span>
            <span class="meta">${o.votes} ${o.votes === 1 ? "voto" : "votos"}</span>
            ${!decided ? `<button class="vote-btn ${e.my_vote === o.recipe.id ? "on" : ""}" data-vote="${esc(o.recipe.id)}" aria-pressed="${e.my_vote === o.recipe.id}">${e.my_vote === o.recipe.id ? `${I.check}O meu voto` : "Votar"}</button>` : ""}</div>
        </div>
      </article>`).join("")}</div>
    ${!decided && e.can_close ? `<button class="btn-primary wide" id="closeBtn">${I.trophy}Fechar votação</button>
      <p class="meta center">Ganha a mais votada${top.length > 1 ? `. Há empate: vais poder escolher` : ""}. A lista de compras é criada para ${e.guests} pessoas.</p>` : ""}
    ${e.can_close ? `<button class="danger-link" id="delEvent">${I.trash}Apagar jantar</button>` : ""}`;

  view.querySelectorAll("[data-vote]").forEach(b => b.onclick = async () => {
    haptic();
    try { await api(`/events/${id}/vote`, { method: "PUT", body: { recipe_id: b.dataset.vote } }); renderEvent(id, true); } catch (err) { toast(err.message); }
  });
  $("#toList") && ($("#toList").onclick = () => location.hash = `/list/${e.list_id}`);
  $("#closeBtn") && ($("#closeBtn").onclick = async () => {
    if (top.length > 1) return openTieSheet(e, top);
    await closeEvent(e, null);
  });
  $("#delEvent") && ($("#delEvent").onclick = async () => {
    if (!confirm(`Apagar “${e.title}”? Os votos perdem-se.`)) return;
    await api(`/events/${id}`, { method: "DELETE" }); location.hash = "/group";
  });
}
async function closeEvent(e, recipeId) {
  try {
    await api(`/events/${e.id}/close`, { method: "POST", body: { recipe_id: recipeId } });
    haptic(14); toast("Está decidido! Lista de compras criada."); renderEvent(e.id, true);
  } catch (err) { toast(err.message); }
}
function openTieSheet(e, tied) {
  openSheet({
    title: "Desempate", submit: "Decidir",
    body: `<p class="meta sheet-lead">Há um empate com ${tied[0].votes} ${tied[0].votes === 1 ? "voto" : "votos"}. Como organizador, escolhes tu.</p>
      <div class="choice-list">${tied.map((o, i) => `<label class="choice"><input type="radio" name="w" value="${esc(o.recipe.id)}" ${i === 0 ? "checked" : ""}>${thumb(o.recipe)}<span><b>${esc(o.recipe.title)}</b></span></label>`).join("")}</div>`,
    onSubmit: async form => { await closeEvent(e, form.querySelector("[name=w]:checked").value); },
  });
}

// ---------------------------------------------------------------- shared shopping lists
async function renderLists(silent = false) {
  largeTitle("Compras", "Listas pessoais e do grupo");
  if (!silent) view.innerHTML = `<div class="section glass"><p class="meta">A carregar…</p></div>`;
  let lists = [];
  try { lists = await api("/lists"); } catch (e) { toast(e.message); }
  if (currentRoute() !== "/lists") return;
  view.innerHTML = `
    <div class="block-head" style="margin-top:0"><span></span><button class="pill-btn" id="newList">${I.plus}Nova lista</button></div>
    ${lists.length ? `<div class="lists">${lists.map(l => `
      <a class="list-card glass" href="#/list/${esc(l.id)}">
        <span class="list-ico ${l.group_id ? "shared" : ""}">${l.group_id ? I.users : I.list}</span>
        <div><b>${esc(l.title)}</b><span class="meta">${l.group_id ? esc(l.group_name || "Grupo") : "Pessoal"} · ${l.total ? `${l.done}/${l.total} comprados` : "vazia"}</span>
          ${l.total ? `<div class="bar"><i style="width:${(l.done / l.total) * 100}%"></i></div>` : ""}</div>
        <span class="chev">${I.back}</span></a>`).join("")}</div>`
      : `<div class="empty glass"><div class="art">${I.cart}</div><h3>Sem listas ainda</h3>
        <p>Abre uma receita e toca no carrinho, ou cria uma lista partilhada para o próximo jantar. Cada um marca o que vai trazer.</p></div>`}`;
  $("#newList").onclick = () => openSheet({
    title: "Nova lista", submit: "Criar",
    body: `<label class="field"><span class="field-label">Nome</span><input name="title" maxlength="60" placeholder="ex.: Compras da semana"></label>
      <label class="field"><span class="field-label">Partilhar com</span><select name="group"><option value="">Só eu</option>${groups().map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("")}</select></label>`,
    onSubmit: async form => {
      const l = await api("/lists", { method: "POST", body: { title: form.title.value.trim() || "Compras", group_id: form.group.value || null } });
      location.hash = `/list/${l.id}`;
    },
  });
}

async function renderList(id, silent = false) {
  let l;
  try { l = await api(`/lists/${id}`); } catch (e) { view.innerHTML = `<div class="empty glass"><p>${esc(e.message)}</p></div>`; return; }
  if (currentRoute() !== `/list/${id}`) return;
  title.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem"><button class="bar-btn plain-bar" id="backBtn" aria-label="Voltar">${I.back}</button><div class="nav-title" style="opacity:1">${esc(l.title)}</div><span style="width:2.75rem"></span></div>`;
  $("#backBtn").onclick = () => (history.length > 1 ? history.back() : (location.hash = "/lists"));
  const todo = l.items.filter(i => !i.checked), done = l.items.filter(i => i.checked);
  const mineCount = todo.filter(i => i.assignee?.id === me()?.id).length;
  const row = i => `
    <div class="litem ${i.checked ? "done" : ""}" data-item="${esc(i.id)}">
      <label class="ing-check"><input type="checkbox" ${i.checked ? "checked" : ""} aria-label="Comprado"></label>
      <div class="litem-body"><span class="txt">${i.quantity || i.unit ? `<span class="qty">${esc([i.quantity, i.unit].filter(Boolean).join(" "))}</span> ` : ""}${esc(withDe(i.unit, i.name))}</span>
        ${i.sources.length ? `<small class="note">${esc(i.sources.join(", "))}</small>` : ""}
        ${i.checked && i.checked_by_user ? `<small class="note">comprado por ${esc(firstName(i.checked_by_user))}</small>` : ""}</div>
      ${l.group_id && !i.checked ? (i.assignee
        ? `<button class="bring ${i.assignee.id === me()?.id ? "mine" : ""}" data-unassign ${i.assignee.id === me()?.id ? "" : "disabled"} aria-label="${esc(i.assignee.name)} traz">${avatar(i.assignee, "xs")}${i.assignee.id === me()?.id ? "Eu trago" : esc(firstName(i.assignee))}</button>`
        : `<button class="bring" data-assign>Eu trago</button>`) : ""}
      <button class="mini-del" data-del aria-label="Remover">${I.x}</button>
    </div>`;
  view.innerHTML = `
    <div class="list-head glass">
      <div><span class="eyebrow">${l.group_id ? `${I.users} ${esc(l.group_name || "Grupo")} · em tempo real` : "Lista pessoal"}</span>
        <b>${todo.length ? `Faltam ${todo.length}` : l.items.length ? "Está tudo!" : "Lista vazia"}</b>
        ${l.group_id && mineCount ? `<span class="meta">Tu trazes ${mineCount} ${mineCount === 1 ? "coisa" : "coisas"}</span>` : ""}</div>
      ${l.items.length ? `<div class="progress-ring" style="--p:${l.items.length ? done.length / l.items.length : 0}"><b>${done.length}/${l.items.length}</b><span>comprados</span></div>` : ""}
    </div>
    <form class="add-item glass" id="addItem"><input name="name" placeholder="Adicionar artigo, ex.: 2 limões" autocomplete="off" aria-label="Novo artigo"><button class="icon-add" aria-label="Adicionar">${I.plus}</button></form>
    ${todo.length ? `<section class="section glass litems">${todo.map(row).join("")}</section>` : ""}
    ${done.length ? `<section class="section glass litems done-sec"><div class="section-head"><h3>Comprados</h3><button class="text-btn" id="clearDone">Limpar</button></div>${done.map(row).join("")}</section>` : ""}
    <div class="row-actions">
      <button class="btn-glass glass" id="copyList">${I.copy}Copiar</button>
      <button class="btn-glass glass" id="delList">${I.trash}Apagar lista</button>
    </div>`;

  const act = async (fn) => { try { await fn(); await renderList(id, true); } catch (err) { toast(err.message); } };
  view.querySelectorAll(".litem").forEach(rowEl => {
    const iid = rowEl.dataset.item;
    $("input", rowEl).onchange = e => { haptic(); act(() => api(`/items/${iid}`, { method: "PATCH", body: { checked: e.target.checked } })); };
    $("[data-assign]", rowEl) && ($("[data-assign]", rowEl).onclick = () => { haptic(); act(() => api(`/items/${iid}`, { method: "PATCH", body: { assign: "me" } })); });
    $("[data-unassign]", rowEl) && ($("[data-unassign]", rowEl).onclick = () => act(() => api(`/items/${iid}`, { method: "PATCH", body: { assign: "none" } })));
    $("[data-del]", rowEl).onclick = () => act(() => api(`/items/${iid}`, { method: "DELETE" }));
  });
  $("#addItem").onsubmit = e => {
    e.preventDefault();
    const v = e.target.name.value.trim(); if (!v) return;
    const m = v.match(/^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s+(.+)$/); // "2 limões" -> qty + name
    act(() => api(`/lists/${id}/items`, { method: "POST", body: m ? { quantity: m[1], name: m[2] } : { name: v } }));
  };
  $("#clearDone") && ($("#clearDone").onclick = () => act(() => api(`/lists/${id}/clear-checked`, { method: "POST" })));
  $("#copyList").onclick = () => navigator.clipboard.writeText(todo.map(i => `• ${[i.quantity, i.unit, withDe(i.unit, i.name)].filter(Boolean).join(" ")}${i.assignee ? ` (${firstName(i.assignee)})` : ""}`).join("\n"))
    .then(() => toast("Lista copiada"));
  $("#delList").onclick = async () => {
    if (!confirm(`Apagar a lista “${l.title}”${l.group_id ? " para todo o grupo" : ""}?`)) return;
    await api(`/lists/${id}`, { method: "DELETE" }); location.hash = "/lists";
  };
}

// ---------------------------------------------------------------- settings
function renderSettings() {
  largeTitle("Definições");
  const origin = location.origin, u = me();
  view.innerHTML = `
    <section class="section glass account">
      ${avatar(u, "lg")}<div><b>${esc(u.name)}</b><span class="meta">@${esc(u.username)}</span></div>
      <button class="btn-glass glass" id="logout">${I.logout}Sair</button>
    </section>

    <section class="section glass"><div class="section-head"><h3>Os meus grupos</h3></div>
      ${groups().map(g => `<div class="group-row">
        <span class="faces">${g.members.slice(0, 3).map(m => avatar(m, "xs")).join("")}</span>
        <div><b>${esc(g.name)}</b><span class="meta">${g.members.length} ${g.members.length === 1 ? "pessoa" : "pessoas"}${g.my_role === "admin" ? " · administrador" : ""}</span></div>
        <button class="pill-btn" data-invite="${esc(g.id)}">Convidar</button>
        <button class="mini" data-leave="${esc(g.id)}" aria-label="Sair de ${esc(g.name)}">${I.logout}</button></div>`).join("") || `<p class="meta">Ainda não estás em nenhum grupo.</p>`}
      <div class="row-actions" style="margin-top:.75rem"><button class="btn-glass glass" id="createGroup">${I.plus}Criar grupo</button>
        <button class="btn-glass glass" id="joinGroup">Usar convite</button></div>
    </section>

    <section class="section glass"><div class="section-head"><h3>Instalar no iPhone</h3></div>
      <ol class="howto">
        <li>Abre <code>${esc(origin)}</code> no <b>Safari</b>.</li>
        <li>Toca em <b>Partilhar</b> → <b>Adicionar ao ecrã principal</b>.</li>
      </ol>
    </section>
    <section class="section glass"><div class="section-head"><h3>Guardar a partir da folha de partilha</h3></div>
      <p class="meta">O iOS não deixa as apps web aparecerem na folha de partilha. Um Atalho, que configuras num minuto, resolve isso:</p>
      <ol class="howto">
        <li>Abre a app <b>Atalhos</b> → <b>＋</b> → dá-lhe o nome <b>Guardar no RecipeBox</b>.</li>
        <li>Toca em <b>ⓘ</b> → ativa <b>Mostrar na folha de partilha</b> (recebe <b>URL</b> e <b>Texto</b>).</li>
        <li>Adiciona <b>Obter conteúdo do URL</b>: <code>${esc(origin)}/imports/shortcut</code>, Método <b>POST</b>, Corpo do pedido <b>JSON</b>, campo <code>input</code> = <b>Entrada do atalho</b>, cabeçalho <code>Authorization</code> = <code>Bearer</code> + o teu token pessoal.</li>
        <li>Adiciona <b>Mostrar notificação</b> com <b>Conteúdo do URL</b>.</li>
      </ol>
      <div class="settings-row" style="margin-top:.6rem"><input id="tok" type="password" readonly value="${esc(store.get("session", ""))}" aria-label="O teu token pessoal">
        <button class="btn-solid" id="copyTok">Copiar token</button></div>
      <p class="meta" style="margin-top:.5rem">O token dá acesso à tua conta: não o partilhes. Ao sair da conta, deixa de funcionar.</p>
    </section>
    <section class="section glass"><div class="section-head"><h3>Android</h3></div>
      <p class="meta">Instala a partir do menu do Chrome (<b>Adicionar ao ecrã principal</b>). O RecipeBox passa a aparecer diretamente na folha de partilha.</p></section>`;
  $("#logout").onclick = async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); signOut(); };
  $("#createGroup").onclick = openCreateGroupSheet;
  $("#joinGroup").onclick = openJoinSheet;
  $("#copyTok").onclick = () => navigator.clipboard.writeText(store.get("session", "")).then(() => toast("Token copiado"));
  view.querySelectorAll("[data-invite]").forEach(b => b.onclick = () => shareInvite(groupById(b.dataset.invite)));
  view.querySelectorAll("[data-leave]").forEach(b => b.onclick = async () => {
    const g = groupById(b.dataset.leave);
    if (!confirm(`Sair de “${g.name}”? As tuas receitas deixam de estar visíveis para o grupo.`)) return;
    await api(`/groups/${g.id}/leave`, { method: "POST" }); await Promise.all([loadMe(), loadRecipes()]); renderSettings(); toast(`Saíste de ${g.name}`);
  });
}
