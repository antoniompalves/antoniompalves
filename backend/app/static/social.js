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
      const body = { recipe_id: r.id, servings: Number.isFinite(n) ? n : null };
      const out = await api(`/lists/${lid}/items`, { method: "POST", body });
      haptic();
      pantryToast(out.skipped_pantry, () => api(`/lists/${lid}/items`, { method: "POST", body: { ...body, include_pantry: true } }), lid);
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
  else if (h === "/plan" && kinds.has("plan")) await renderPlan(true);
  else if (h.startsWith("/trip/") && kinds.has("plan")) await renderTrip(h.slice(6), true);
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

    <div id="pushNudge"></div>
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
  pushNudge();
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
    trip_created: `${who} criou a viagem <b>${esc(a.data.title)}</b>. Ajuda a planear as refeições!`,
  }[a.type] || `${who} fez uma alteração`;
  const href = a.data.event_id ? `/event/${a.data.event_id}` : a.data.trip_id ? `/trip/${a.data.trip_id}` : a.recipe_id ? `/r/${a.recipe_id}` : "";
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
          ${o.recipe.facts?.price_coverage >= 0.6 && costText(o.recipe.facts.cost) ? `<span class="meta">${costText(o.recipe.facts.cost)} por pessoa · ${o.recipe.facts.kcal} kcal</span>` : ""}
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
    <a class="list-card glass pantry-card" href="#/pantry">
      <span class="list-ico">${I.home}</span>
      <div><b>Despensa</b><span class="meta">O que tens em casa não entra nas listas</span></div>
      <span class="chev">${I.back}</span></a>
    <div class="block-head"><h3>Listas</h3><button class="pill-btn" id="newList">${I.plus}Nova lista</button></div>
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
  title.innerHTML = `<div class="sub-bar"><button class="bar-btn plain-bar" id="backBtn" aria-label="Voltar">${I.back}</button><div class="nav-title" style="opacity:1">${esc(l.title)}</div><span class="bar-spacer"></span></div>`;
  $("#backBtn").onclick = () => (history.length > 1 ? history.back() : (location.hash = "/lists"));
  const todo = l.items.filter(i => !i.checked), done = l.items.filter(i => i.checked);
  const mineCount = todo.filter(i => i.assignee?.id === me()?.id).length;
  const row = i => `
    <div class="litem ${i.checked ? "done" : ""}" data-item="${esc(i.id)}">
      <label class="ing-check"><input type="checkbox" ${i.checked ? "checked" : ""} aria-label="Comprado"></label>
      <div class="litem-body">
        <span class="txt">${i.quantity || i.unit ? `<span class="qty">${esc([i.quantity, i.unit].filter(Boolean).join(" "))}</span> ` : ""}${esc(withDe(i.unit, i.name))}</span>
        ${i.sources.length ? `<small class="note">${esc(i.sources.join(", "))}</small>` : ""}
        ${i.checked && i.checked_by_user ? `<small class="note">comprado por ${esc(firstName(i.checked_by_user))}${i.paid ? ` · ${eur(i.paid)}` : ""}</small>` : ""}
        ${!i.checked && (i.estimate || l.group_id) ? `<div class="litem-tags">
          ${l.group_id ? (i.assignee
            ? `<button class="bring ${i.assignee.id === me()?.id ? "mine" : ""}" data-unassign ${i.assignee.id === me()?.id ? "" : "disabled"} aria-label="${esc(i.assignee.name)} traz">${avatar(i.assignee, "xs")}${i.assignee.id === me()?.id ? "Eu trago" : `${esc(firstName(i.assignee))} traz`}</button>`
            : `<button class="bring" data-assign>Eu trago</button>`) : ""}
          ${i.estimate ? `<button class="price-chip" data-paid title="Registar quanto pagaste">${costText([0, i.estimate, 0])}</button>` : ""}
        </div>` : ""}
      </div>
      ${!i.checked ? `<button class="mini" data-home aria-label="Temos em casa" title="Temos em casa">${I.home}</button>` : ""}
      <button class="mini-del" data-del aria-label="Remover">${I.x}</button>
    </div>`;
  // group the to-buy items by supermarket section, in walking order
  const sections = [];
  for (const it of todo) {
    let sec = sections.find(x => x.name === it.aisle);
    if (!sec) sections.push(sec = { name: it.aisle || "Outros", items: [] });
    sec.items.push(it);
  }
  view.innerHTML = `
    <div class="list-head glass">
      <div><span class="eyebrow">${l.group_id ? `<i class="live-dot" aria-hidden="true"></i>${esc(l.group_name || "Grupo")} · ao vivo` : "Lista pessoal"}</span>
        <b>${todo.length ? `Faltam ${todo.length}` : l.items.length ? "Está tudo!" : "Lista vazia"}</b>
        ${l.estimate?.known && todo.length ? `<span class="meta">${costText(l.estimate.cost)} estimados${l.estimate.known < l.estimate.todo ? ` (${l.estimate.known} de ${l.estimate.todo} artigos)` : ""}</span>` : ""}
        ${l.group_id && mineCount ? `<span class="meta">Tu trazes ${mineCount} ${mineCount === 1 ? "coisa" : "coisas"}</span>` : ""}</div>
      ${l.items.length ? `<div class="progress-ring" style="--p:${l.items.length ? done.length / l.items.length : 0}"><b>${done.length}/${l.items.length}</b><span>comprados</span></div>` : ""}
    </div>
    <form class="add-item glass" id="addItem"><input name="name" placeholder="Adicionar artigo, ex.: 2 limões" autocomplete="off" aria-label="Novo artigo"><button class="icon-add" aria-label="Adicionar">${I.plus}</button></form>
    ${sections.map(sec => `<section class="section glass litems"><div class="aisle-head">${esc(sec.name)}<span>${sec.items.length}</span></div>${sec.items.map(row).join("")}</section>`).join("")}
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
    $("[data-home]", rowEl) && ($("[data-home]", rowEl).onclick = () => act(async () => {
      const r = await api(`/items/${iid}/pantry`, { method: "POST" });
      toast(`${r.label} guardado na despensa`);
    }));
    $("[data-paid]", rowEl) && ($("[data-paid]", rowEl).onclick = () => openPaidSheet(l.items.find(x => x.id === iid), () => renderList(id, true)));
  });
  $("#addItem").onsubmit = e => {
    e.preventDefault();
    const v = e.target.name.value.trim(); if (!v) return;
    const m = v.match(/^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s+(.+)$/); // "2 limões" -> qty + name
    act(() => api(`/lists/${id}/items`, { method: "POST", body: m ? { quantity: m[1], name: m[2] } : { name: v } }));
  };
  $("#clearDone") && ($("#clearDone").onclick = () => act(() => api(`/lists/${id}/clear-checked`, { method: "POST" })));
  $("#copyList").onclick = () => navigator.clipboard.writeText(sections.map(sec => `${sec.name}\n` + sec.items.map(i =>
    `• ${[i.quantity, i.unit, withDe(i.unit, i.name)].filter(Boolean).join(" ")}${i.assignee ? ` (${firstName(i.assignee)})` : ""}`).join("\n")).join("\n\n"))
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

    <section class="section glass"><div class="section-head"><h3>Aparência</h3></div>
      <div class="themes">${THEMES.map(([k, label, color]) => `<button class="theme-opt ${store.get("theme", "quente") === k ? "on" : ""}" data-theme-opt="${k}" aria-pressed="${store.get("theme", "quente") === k}"><i style="background:${color}"></i>${label}</button>`).join("")}</div>
      <p class="meta" style="margin-top:.6rem">Os temas claros seguem o modo escuro do sistema. Meia-noite é sempre escuro.</p>
    </section>

    <section class="section glass" id="pushSec"><div class="section-head"><h3>Notificações</h3></div><p class="meta">A verificar…</p></section>

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
  view.querySelectorAll("[data-theme-opt]").forEach(b => b.onclick = () => {
    store.set("theme", b.dataset.themeOpt); applyTheme(b.dataset.themeOpt); haptic(6);
    view.querySelectorAll("[data-theme-opt]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
  });
  $("#logout").onclick = async () => { await disablePush().catch(() => {}); await api("/auth/logout", { method: "POST" }).catch(() => {}); signOut(); };
  const drawPush = async () => { const sec = $("#pushSec"); if (!sec) return; sec.innerHTML = await pushSettingsHTML(); wirePushSettings(sec, drawPush); };
  drawPush();
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

// ---------------------------------------------------------------- push notifications
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** 'needs-install' | 'unsupported' | 'denied' | 'on' | 'off' */
async function pushState() {
  if (isIOS && !isStandalone()) return "needs-install"; // iOS: only Home Screen web apps get push (16.4+)
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

const b64ToBytes = s => Uint8Array.from(atob((s + "=".repeat((4 - s.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

async function registerSubscription(sub) {
  await api("/push/subscribe", { method: "POST", body: { ...sub, user_agent: navigator.userAgent.slice(0, 300) } });
}

/** Must run from a tap (iOS requires a user gesture for the permission prompt). */
async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { toast(perm === "denied" ? "Notificações bloqueadas no sistema" : "Notificações não ativadas"); return false; }
  const reg = await navigator.serviceWorker.ready;
  const cfg = await api("/push/config");
  let sub = await reg.pushManager.getSubscription();
  if (sub && store.get("vapidKey", "") !== cfg.public_key) { await sub.unsubscribe().catch(() => {}); sub = null; } // server keys changed
  try {
    sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.public_key) });
  } catch {
    throw new Error("Este browser não conseguiu ativar as notificações. Experimenta abrir a app a partir do ecrã principal.");
  }
  store.set("vapidKey", cfg.public_key);
  await registerSubscription(sub.toJSON());
  haptic(12);
  return true;
}

async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) { await api("/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); }
}

/** Keep the server in sync when the app opens (subscriptions can rotate or be pruned). */
async function syncPush() {
  if (!state.me || !pushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await registerSubscription(sub.toJSON());
  } catch {}
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", e => {
    if (e.data?.type === "navigate") { const u = new URL(e.data.url); location.hash = u.hash || "#/"; }
    if (e.data?.type === "resubscribe" && state.me) registerSubscription(e.data.subscription).catch(() => {});
  });
}

async function pushSettingsHTML() {
  const st = await pushState();
  const head = `<div class="section-head"><h3>Notificações</h3>${I.bell}</div>`;
  if (st === "needs-install") return head + `<p class="meta">No iPhone, as notificações só funcionam com a app no ecrã principal: no Safari, toca em <b>Partilhar</b> → <b>Adicionar ao ecrã principal</b> e abre o RecipeBox a partir do ícone.</p>`;
  if (st === "unsupported") return head + `<p class="meta">Este browser não suporta notificações. No iPhone precisas do iOS 16.4 ou mais recente.</p>`;
  if (st === "denied") return head + `<p class="meta">Bloqueaste as notificações. Para as voltares a ativar: <b>Definições do telemóvel</b> → <b>Notificações</b> → <b>RecipeBox</b>.</p>`;
  if (st === "off") return head + `<p class="meta">Fica a saber quando há um jantar para votar, quando alguém faz uma receita tua ou quando uma importação fica pronta.</p>
    <button class="btn-primary wide" id="pushOn">${I.bell}Ativar notificações</button>`;
  let cfg = { prefs: {}, kinds: [] };
  try { cfg = await api("/push/config"); } catch {}
  return head + `<div class="switches">${cfg.kinds.map(k => `
      <label class="switch-row"><span>${esc(k.label)}</span>
        <input type="checkbox" role="switch" data-pref="${esc(k.kind)}" ${cfg.prefs[k.kind] ? "checked" : ""}></label>`).join("")}</div>
    <div class="row-actions" style="margin-top:.75rem"><button class="btn-glass glass" id="pushTest">${I.bell}Enviar teste</button>
      <button class="btn-glass glass" id="pushOff">Desativar aqui</button></div>`;
}

function wirePushSettings(root, rerender) {
  $("#pushOn", root) && ($("#pushOn", root).onclick = async () => {
    try { if (await enablePush()) { toast("Notificações ativadas"); rerender(); } } catch (e) { toast(e.message || "Não foi possível ativar"); }
  });
  $("#pushOff", root) && ($("#pushOff", root).onclick = async () => { await disablePush(); toast("Notificações desativadas neste dispositivo"); rerender(); });
  $("#pushTest", root) && ($("#pushTest", root).onclick = async () => {
    try { await api("/push/test", { method: "POST" }); toast("Notificação de teste enviada"); } catch (e) { toast(e.message); }
  });
  root.querySelectorAll("[data-pref]").forEach(cb => cb.onchange = () =>
    api("/push/prefs", { method: "PUT", body: { [cb.dataset.pref]: cb.checked } }).catch(e => toast(e.message)));
}

/** Gentle, dismissible nudge in the Grupo tab: ask at the moment it's clearly useful. */
async function pushNudge() {
  const slot = $("#pushNudge");
  if (!slot || store.get("pushNudgeDismissed", false)) return;
  const st = await pushState();
  if (st !== "off" && st !== "needs-install") return;
  slot.innerHTML = `<div class="nudge glass">${I.bell}
    <div><b>Não percas o próximo jantar</b><span class="meta">${st === "off" ? "Recebe um aviso quando houver votação ou quando alguém fizer uma receita tua." : "Adiciona o RecipeBox ao ecrã principal para receberes notificações."}</span></div>
    ${st === "off" ? `<button class="pill-btn" id="nudgeOn">Ativar</button>` : ""}
    <button class="mini" id="nudgeX" aria-label="Fechar">${I.x}</button></div>`;
  $("#nudgeX").onclick = () => { store.set("pushNudgeDismissed", true); slot.innerHTML = ""; };
  $("#nudgeOn") && ($("#nudgeOn").onclick = async () => {
    try { if (await enablePush()) { slot.innerHTML = ""; toast("Notificações ativadas"); } } catch (e) { toast(e.message || "Não foi possível ativar"); }
  });
}


// ---------------------------------------------------------------- cost & nutrition
const CONF_LABEL = { high: "", medium: "aprox.", low: "estimativa fraca", none: "" };

function factsHTML(f, servings) {
  const ps = f.per_serving, n = servings || f.servings || 1;
  const priced = f.price_coverage >= 0.6 && ps.cost[1] > 0;
  const nutri = f.coverage >= 0.6;
  const kcal = nutri ? ps.kcal : f.ai_estimate?.calories;
  const macros = nutri ? ps : f.ai_estimate ? { protein_g: f.ai_estimate.protein_g, carbs_g: f.ai_estimate.carbs_g, fat_g: f.ai_estimate.fat_g } : null;
  const mtot = macros ? (macros.protein_g || 0) * 4 + (macros.carbs_g || 0) * 4 + (macros.fat_g || 0) * 9 : 0;
  const pctOf = (g, k) => mtot ? Math.round(((g || 0) * k / mtot) * 100) : 0;
  const unmatched = f.lines.filter(l => !l.free && (!l.key || l.grams == null));
  const month = f.sources.price_collected ? new Date(f.sources.price_collected).toLocaleDateString("pt-PT", { month: "long", year: "numeric" }) : "";
  return `<section class="section glass facts">
    <div class="section-head"><h3>Custo e nutrição</h3><span class="meta">por dose</span></div>
    <div class="facts-top">
      <div class="fact-big">${priced ? `<b>${eur(ps.cost[1])}</b><span>${eur(ps.cost[0])} – ${eur(ps.cost[2])}</span>` : `<b>–</b><span>sem preços suficientes</span>`}<em>custo estimado</em></div>
      <div class="fact-big">${kcal ? `<b>${kcal}</b><span>kcal</span>` : `<b>–</b><span>sem dados</span>`}<em>${nutri ? "calculado" : f.ai_estimate ? "estimativa da IA" : "calorias"}</em></div>
    </div>
    ${macros && mtot ? `<div class="macro-bar" role="img" aria-label="Proteína ${macros.protein_g} g, hidratos ${macros.carbs_g} g, gordura ${macros.fat_g} g">
        <i class="p" style="flex:${pctOf(macros.protein_g, 4)}"></i><i class="c" style="flex:${pctOf(macros.carbs_g, 4)}"></i><i class="f" style="flex:${pctOf(macros.fat_g, 9)}"></i></div>
      <div class="macro-legend"><span><i class="p"></i>Proteína <b>${Math.round(macros.protein_g)} g</b></span><span><i class="c"></i>Hidratos <b>${Math.round(macros.carbs_g)} g</b></span><span><i class="f"></i>Gordura <b>${Math.round(macros.fat_g)} g</b></span>${nutri && ps.fiber_g ? `<span>Fibra <b>${Math.round(ps.fiber_g)} g</b></span>` : ""}</div>` : ""}
    ${priced ? `<p class="meta">Total para ${n} ${n === 1 ? "dose" : "doses"}: <b>${eur(ps.cost[1] * n)}</b> (só a parte usada de cada ingrediente).</p>` : ""}
    ${unmatched.length ? `<p class="warn-line">${I.warn}<span>${unmatched.length === 1 ? "1 ingrediente ficou" : `${unmatched.length} ingredientes ficaram`} de fora do cálculo: ${unmatched.map(l => esc(l.name)).join(", ")}.</span></p>` : ""}
    <button class="text-btn" id="factsMore">Ver por ingrediente</button>
    <div class="facts-lines" hidden>
      ${f.lines.filter(l => !l.free).map(l => `<div class="fline ${!l.key || l.grams == null ? "bad" : ""}">
        <div><b>${esc(l.name)}</b><small>${l.key ? `${esc(l.key)}${l.grams != null ? ` · ${l.grams >= 10 ? Math.round(l.grams) : l.grams} g` : " · quantidade?"}${CONF_LABEL[l.confidence] ? ` · ${CONF_LABEL[l.confidence]}` : ""}` : "sem correspondência"}</small></div>
        <span class="fnum">${l.kcal != null ? `${l.kcal} kcal` : ""}</span><span class="fnum">${l.cost != null ? eur(l.cost) : ""}</span>
        <button class="mini" data-fix="${esc(l.name)}" aria-label="Corrigir ${esc(l.name)}">${I.edit}</button></div>`).join("")}
      <p class="meta src">Estimativa. Nutrição: USDA FoodData Central. Preços de prateleira do Continente e do Auchan${month ? ` (${month})` : ""}, ou os que o teu grupo registou ao fazer compras.</p>
    </div>
  </section>`;
}

/** Correct which reference ingredient a recipe line counts as. Applies to everyone's recipes. */
function openFixSheet(name, done) {
  openSheet({
    title: "Corrigir ingrediente", noSubmit: true,
    body: `<p class="meta sheet-lead">Como devemos contar “<b>${esc(name)}</b>” no custo e nas calorias?</p>
      <div class="search-wrap glass">${I.search}<input class="search" id="refQ" placeholder="Procurar ingrediente" value="${esc(name.split(",")[0])}" autocomplete="off"></div>
      <div class="choice-list" id="refList"></div>
      <button type="button" class="btn-glass glass wide" id="refNone">Não contar este ingrediente</button>`,
    onMount: (el, hide) => {
      const choose = async key => {
        await api("/ingredient-map", { method: "PUT", body: { name, key } });
        hide(); toast(key ? `Contado como ${key}` : "Ingrediente ignorado no cálculo"); done?.();
      };
      const run = async () => {
        const items = await api(`/ingredients/search?q=${encodeURIComponent($("#refQ", el).value)}`).catch(() => []);
        $("#refList", el).innerHTML = items.map(it => `<button type="button" class="choice" data-k="${esc(it.key)}">
          <span class="list-ico">${I.fork}</span><span><b>${esc(it.key)}</b><small>${esc(it.aisle || "")}${it.kcal != null ? ` · ${Math.round(it.kcal)} kcal/100 g` : ""}${it.price ? ` · ${eur(it.price)}/${it.basis === "un" ? "un" : "kg"}` : ""}</small></span></button>`).join("")
          || `<p class="meta">Sem resultados. Experimenta um nome mais simples (ex.: “queijo”).</p>`;
        el.querySelectorAll("[data-k]").forEach(b => b.onclick = () => choose(b.dataset.k));
      };
      let t; $("#refQ", el).oninput = () => { clearTimeout(t); t = setTimeout(run, 150); };
      $("#refNone", el).onclick = () => choose(null);
      run();
    },
  });
}

/** "Quanto pagaste?": feeds the group's own prices, which then beat the reference table. */
function openPaidSheet(item, done) {
  openSheet({
    title: "Quanto pagaste?", submit: "Guardar",
    body: `<p class="meta sheet-lead"><b>${esc([item.quantity, item.unit, withDe(item.unit, item.name)].filter(Boolean).join(" "))}</b>. O preço fica a contar para as estimativas do grupo.</p>
      <label class="field"><span class="field-label">Preço pago (€)</span>
        <input name="paid" type="text" inputmode="decimal" placeholder="${item.estimate ? item.estimate.toFixed(2).replace(".", ",") : "ex.: 2,49"}" autocomplete="off"></label>`,
    onSubmit: async form => {
      const v = parseFloat(form.paid.value.replace(",", "."));
      if (!(v > 0)) { toast("Indica um valor, ex.: 2,49"); return false; }
      const r = await api(`/items/${item.id}/paid`, { method: "POST", body: { paid: v } });
      toast(`Obrigado! ${eur(r.price_per_kg)}/kg guardado para o grupo`); haptic(); done?.();
    },
  });
}

// ---------------------------------------------------------------- pantry ("temos em casa")
function pantryToast(skipped, includeAnyway, lid) {
  if (!skipped?.length) {
    return toast("Ingredientes adicionados", lid ? { action: "Ver lista", onAction: () => location.hash = `/list/${lid}` } : {});
  }
  const names = [...new Set(skipped)];
  toast(`Já tens em casa: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`, {
    action: "Juntar também", onAction: async () => { await includeAnyway(); toast("Adicionados também"); },
  });
}

async function renderPantry() {
  title.innerHTML = `<div class="sub-bar"><button class="bar-btn plain-bar" id="backBtn" aria-label="Voltar">${I.back}</button><div class="nav-title" style="opacity:1">Despensa</div><span class="bar-spacer"></span></div>`;
  $("#backBtn").onclick = () => (history.length > 1 ? history.back() : (location.hash = "/lists"));
  let p = { items: [], suggestions: [] };
  try { p = await api("/pantry"); } catch (e) { toast(e.message); }
  if (currentRoute() !== "/pantry") return;
  const byAisle = {};
  p.items.forEach(x => (byAisle[x.aisle] ||= []).push(x));
  view.innerHTML = `
    <p class="meta page-lead">O que marcas aqui não entra nas listas de compras nem na lista da semana. Podes sempre juntar na mesma.</p>
    <form class="add-item glass" id="addPantry"><input name="name" placeholder="Ex.: azeite, arroz, sal" autocomplete="off" aria-label="Adicionar à despensa"><button class="icon-add" aria-label="Adicionar">${I.plus}</button></form>
    ${p.suggestions.length ? `<section class="block"><div class="block-head"><h3>Básicos</h3><span class="meta">toca para juntar</span></div>
      <div class="chip-wrap">${p.suggestions.map(k => `<button class="chip glass" data-add="${esc(k)}">${I.plus}${esc(k)}</button>`).join("")}</div></section>` : ""}
    ${p.items.length ? Object.entries(byAisle).sort((a, b) => aisleRank(a[0]) - aisleRank(b[0])).map(([aisle, xs]) => `
      <section class="section glass"><div class="aisle-head">${esc(aisle)}<span>${xs.length}</span></div>
        <div class="chip-wrap">${xs.map(x => `<span class="pantry-chip">${esc(x.label)}<button data-rm="${esc(x.key)}" aria-label="Tirar ${esc(x.label)} da despensa">${I.x}</button></span>`).join("")}</div>
      </section>`).join("")
      : `<div class="empty glass"><div class="art">${I.home}</div><h3>Despensa vazia</h3><p>Junta o que costumas ter sempre em casa, como sal, azeite ou arroz.</p></div>`}`;
  const add = async name => { try { await api("/pantry", { method: "POST", body: { name } }); haptic(); renderPantry(); } catch (e) { toast(e.message); } };
  $("#addPantry").onsubmit = e => { e.preventDefault(); const v = e.target.name.value.trim(); if (v) add(v); };
  view.querySelectorAll("[data-add]").forEach(b => b.onclick = () => add(b.dataset.add));
  view.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => { await api(`/pantry/${encodeURIComponent(b.dataset.rm)}`, { method: "DELETE" }); renderPantry(); });
}
const AISLES = ["Frutas e legumes", "Talho", "Peixaria", "Charcutaria e queijos", "Laticínios e ovos", "Padaria", "Mercearia", "Temperos e especiarias", "Congelados", "Outros"];
const aisleRank = a => { const i = AISLES.indexOf(a); return i < 0 ? 99 : i; };

// ---------------------------------------------------------------- meal planner: personal week + group trips
const SLOT_NAMES = { pequeno: "Pequeno-almoço", almoco: "Almoço", jantar: "Jantar", outro: "Outro" };
const WEEK_SLOTS = ["almoco", "jantar"];
const TRIP_SLOTS = ["pequeno", "almoco", "jantar"];
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mondayOf = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const dateObj = iso => new Date(iso + "T12:00");
const shortDate = iso => { const d = dateObj(iso); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
/** "Segunda-feira, 24 nov" (PT-PT: only the first letter capitalised) */
const dayLabel = iso => { const d = dateObj(iso); const w = WEEKDAYS[d.getDay()]; return `${w[0].toUpperCase()}${w.slice(1)}, ${shortDate(iso)}`; };
const rangeLabel = (a, b) => `${shortDate(a)} – ${shortDate(b)}`;
const planState = { week: isoDay(mondayOf(new Date())), mode: store.get("planMode", "me") };

function planSeg() {
  return `<div class="seg glass" role="tablist" aria-label="Planeador">
    <button role="tab" class="${planState.mode === "me" ? "on" : ""}" aria-selected="${planState.mode === "me"}" data-pmode="me">${I.calendar}Pessoal</button>
    <button role="tab" class="${planState.mode === "trips" ? "on" : ""}" aria-selected="${planState.mode === "trips"}" data-pmode="trips">${I.users}Viagens e férias</button></div>`;
}
function wirePlanSeg() {
  view.querySelectorAll("[data-pmode]").forEach(b => b.onclick = () => { planState.mode = b.dataset.pmode; store.set("planMode", planState.mode); renderPlan(); });
}

/** Days with meal slots: shared by the personal week and trips. */
function daysHTML(days, slots, { showBy = false } = {}) {
  const today = isoDay(new Date());
  return `<div class="days">${days.map(d => `
    <section class="day glass ${d.date === today ? "today" : ""} ${d.date < today ? "past" : ""}">
      <div class="day-head"><b>${esc(dayLabel(d.date))}</b>${d.date === today ? `<span class="today-pill">Hoje</span>` : ""}</div>
      ${slots.map(slot => {
        const es = d.entries.filter(e => e.slot === slot);
        return `<div class="slot"><span class="slot-label">${SLOT_NAMES[slot]}</span><div class="slot-body">
          ${es.map(e => e.recipe ? `<div class="meal" data-entry="${esc(e.id)}">
              <a class="meal-main" href="#/r/${esc(e.recipe.id)}">${thumb(e.recipe)}<span><b>${esc(e.recipe.title)}</b>
                <small>${[e.recipe.facts?.price_coverage >= 0.6 && e.recipe.facts.cost[1] ? `≈ ${eur(e.recipe.facts.cost[1] * (e.servings || 1))}` : "",
                          showBy && e.by ? `por ${esc(firstName(e.by))}` : ""].filter(Boolean).join(" · ")}</small></span></a>
              <button class="serv-pill" data-serv aria-label="${e.servings || "?"} pessoas, alterar">${I.users}${e.servings || "?"}</button>
              <button class="mini-del" data-rm aria-label="Tirar do plano">${I.x}</button></div>`
            : `<div class="meal gone" data-entry="${esc(e.id)}"><span class="meta">Receita indisponível</span><button class="mini-del" data-rm aria-label="Tirar">${I.x}</button></div>`).join("")}
          <button class="add-meal ${es.length ? "more" : ""}" data-add-day="${d.date}" data-add-slot="${slot}">${I.plus}${es.length ? "Mais" : "Adicionar"}</button>
        </div></div>`;
      }).join("")}
    </section>`).join("")}</div>`;
}

function wireDays(plan, ctx, rerender) {
  const entryOf = el => plan.days.flatMap(d => d.entries).find(e => e.id === el.closest("[data-entry]")?.dataset.entry);
  view.querySelectorAll("[data-add-day]").forEach(b => b.onclick = () => openPlanSheet({ day: b.dataset.addDay, slot: b.dataset.addSlot, trip: ctx.trip, done: rerender }));
  view.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => {
    const e = entryOf(b);
    await api(`/plan/${e.id}`, { method: "DELETE" });
    rerender();
    toast("Tirado do plano", { action: "Anular", onAction: async () => {
      await api("/plan", { method: "POST", body: { day: e.day, slot: e.slot, recipe_id: e.recipe_id, servings: e.servings, trip_id: ctx.trip?.id || null } });
      rerender();
    } });
  });
  view.querySelectorAll("[data-serv]").forEach(b => b.onclick = () => openServingsSheet(entryOf(b), rerender));
}

async function shopFor(body) {
  try {
    const out = await api("/plan/shopping", { method: "POST", body });
    haptic(12);
    toast(out.skipped_pantry.length ? `Lista criada sem o que tens em casa (${out.skipped_pantry.length})` : "Lista de compras criada");
    location.hash = `/list/${out.list_id}`;
  } catch (e) { toast(e.message); }
}

const sumHTML = t => `<div class="week-sum glass">
  <div><b>${t.meals}</b><span>${t.meals === 1 ? "refeição" : "refeições"}</span></div>
  <div><b>${t.cost[1] ? eur(t.cost[1]) : "–"}</b><span>custo</span></div>
  <div><b>${t.kcal_per_day ?? "–"}</b><span>kcal/dia</span></div></div>`;

async function renderPlan(silent = false) {
  if (planState.mode === "trips") return renderTrips(silent);
  const start = dateObj(planState.week);
  const thisWeek = planState.week === isoDay(mondayOf(new Date()));
  largeTitle("Plano", thisWeek ? "Esta semana" : rangeLabel(planState.week, isoDay(addDays(start, 6))));
  if (!silent) view.innerHTML = `${planSeg()}<div class="section glass"><p class="meta">A carregar…</p></div>`;
  let plan;
  try { plan = await api(`/plan?week=${planState.week}&scope=me`); }
  catch (e) { view.innerHTML = `<div class="empty glass"><p>${esc(e.message)}</p></div>`; return; }
  if (currentRoute() !== "/plan" || planState.mode !== "me") return;
  view.innerHTML = `
    ${planSeg()}
    <div class="week-nav">
      <button class="icon-glass glass sm" data-wk="-1" aria-label="Semana anterior">${I.back}</button>
      ${sumHTML(plan.totals)}
      <button class="icon-glass glass sm fwd" data-wk="1" aria-label="Semana seguinte">${I.back}</button>
    </div>
    ${!thisWeek ? `<button class="text-btn center-btn" id="toToday">Voltar a esta semana</button>` : ""}
    ${plan.totals.meals ? `<button class="btn-primary wide" id="weekShop">${I.cart}Lista de compras da semana</button>` : ""}
    ${daysHTML(plan.days, WEEK_SLOTS)}`;
  wirePlanSeg();
  view.querySelectorAll("[data-wk]").forEach(b => b.onclick = () => { planState.week = isoDay(addDays(start, 7 * +b.dataset.wk)); renderPlan(); });
  $("#toToday") && ($("#toToday").onclick = () => { planState.week = isoDay(mondayOf(new Date())); renderPlan(); });
  $("#weekShop") && ($("#weekShop").onclick = () => shopFor({ week: planState.week, scope: "me" }));
  wireDays(plan, {}, () => renderPlan(true));
}

async function renderTrips(silent = false) {
  largeTitle("Plano", "Viagens e férias em grupo");
  if (!silent) view.innerHTML = `${planSeg()}<div class="section glass"><p class="meta">A carregar…</p></div>`;
  let trips = [];
  try { trips = await api("/trips"); } catch (e) { toast(e.message); }
  if (currentRoute() !== "/plan" || planState.mode !== "trips") return;
  const today = isoDay(new Date());
  const upcoming = trips.filter(t => t.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  const past = trips.filter(t => t.end < today);
  const card = t => `<a class="trip-card glass ${t.end < today ? "past" : ""}" href="#/trip/${esc(t.id)}">
      <span class="trip-ico">${I.calendar}</span>
      <div><b>${esc(t.name)}</b><span class="meta">${rangeLabel(t.start, t.end)} · ${t.people} pessoas · ${esc(t.group_name || "")}</span>
        <span class="meta">${t.totals.meals ? `${t.totals.meals} ${t.totals.meals === 1 ? "refeição" : "refeições"}${t.totals.cost[1] ? ` · ≈ ${eur(t.totals.cost[1])}` : ""}` : "Sem refeições ainda"}</span></div>
      <span class="chev">${I.back}</span></a>`;
  view.innerHTML = `
    ${planSeg()}
    ${groups().length ? `<button class="btn-primary wide" id="newTrip">${I.plus}Nova viagem</button>` : ""}
    ${!groups().length ? `<div class="empty glass"><div class="art">${I.users}</div><h3>Precisas de um grupo</h3><p>As viagens são planeadas em grupo. Cria um grupo ou entra num com um convite.</p><a class="btn-primary" href="#/group">Ir para Grupo</a></div>`
      : !trips.length ? `<div class="empty glass"><div class="art">${I.calendar}</div><h3>Planeiem as refeições da viagem</h3>
        <p>Férias, fim de semana na serra, campismo: cada um propõe refeições, ajustam as doses ao número de pessoas e fazem uma lista de compras para a viagem inteira.</p></div>` : ""}
    ${upcoming.length ? `<section class="block"><div class="block-head"><h3>Próximas</h3></div><div class="trips">${upcoming.map(card).join("")}</div></section>` : ""}
    ${past.length ? `<section class="block"><div class="block-head"><h3>Anteriores</h3></div><div class="trips">${past.map(card).join("")}</div></section>` : ""}`;
  wirePlanSeg();
  $("#newTrip") && ($("#newTrip").onclick = () => openTripSheet());
}

async function renderTrip(id, silent = false) {
  let t;
  try { t = await api(`/trips/${id}`); } catch (e) { view.innerHTML = `<div class="empty glass"><p>${esc(e.message)}</p></div>`; return; }
  if (currentRoute() !== `/trip/${id}`) return;
  title.innerHTML = `<div class="sub-bar"><button class="bar-btn plain-bar" id="backBtn" aria-label="Voltar">${I.back}</button><div class="nav-title" style="opacity:1">${esc(t.name)}</div>
    <button class="bar-btn plain-bar" id="editTrip" aria-label="Editar viagem">${I.edit}</button></div>`;
  $("#backBtn").onclick = () => { planState.mode = "trips"; history.length > 1 ? history.back() : (location.hash = "/plan"); };
  $("#editTrip").onclick = () => openTripSheet(t);
  view.innerHTML = `
    <div class="trip-head glass">
      <span class="eyebrow">${I.users} ${esc(t.group_name || "")}</span>
      <h2>${esc(t.name)}</h2>
      <span class="meta">${rangeLabel(t.start, t.end)} · ${t.nights} ${t.nights === 1 ? "noite" : "noites"} · ${t.people} pessoas</span>
    </div>
    ${sumHTML(t.totals)}
    ${t.totals.meals ? `<button class="btn-primary wide" id="tripShop">${I.cart}Lista de compras da viagem</button>` : `<p class="meta page-lead">Toca em “Adicionar” para propor refeições. As doses começam no número de pessoas da viagem.</p>`}
    ${daysHTML(t.days, TRIP_SLOTS, { showBy: true })}`;
  $("#tripShop") && ($("#tripShop").onclick = () => shopFor({ trip_id: t.id }));
  wireDays(t, { trip: t }, () => renderTrip(id, true));
}

function openTripSheet(trip = null) {
  const today = new Date();
  const start = trip?.start || isoDay(addDays(today, 14)), end = trip?.end || isoDay(addDays(today, 16));
  const g0 = trip ? groupById(trip.group_id) : groups()[0];
  openSheet({
    title: trip ? "Editar viagem" : "Nova viagem", submit: trip ? "Guardar" : "Criar",
    body: `<label class="field"><span class="field-label">Nome</span><input name="name" maxlength="60" placeholder="ex.: Férias no Algarve" value="${esc(trip?.name || "")}"></label>
      ${trip ? "" : `<label class="field"><span class="field-label">Grupo</span><select name="group">${groups().map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("")}</select></label>`}
      <div class="row2">
        <label class="field"><span class="field-label">Início</span><input name="start" type="date" value="${start}"></label>
        <label class="field"><span class="field-label">Fim</span><input name="end" type="date" value="${end}"></label>
      </div>
      <label class="field"><span class="field-label">Pessoas</span><input name="people" type="number" inputmode="numeric" min="1" max="100" value="${trip?.people || Math.max(2, g0?.members.length || 2)}"></label>
      ${trip ? `<button type="button" class="danger-link" id="delTrip">${I.trash}Apagar viagem</button>` : ""}`,
    onMount: (el, hide) => {
      $("#delTrip", el) && ($("#delTrip", el).onclick = async () => {
        if (!confirm(`Apagar “${trip.name}” e as refeições planeadas?`)) return;
        await api(`/trips/${trip.id}`, { method: "DELETE" }); hide(); planState.mode = "trips"; location.hash = "/plan";
      });
    },
    onSubmit: async form => {
      const body = { name: form.name.value.trim(), start: form.start.value, end: form.end.value, people: parseInt(form.people.value, 10) || 2 };
      if (!body.name) { toast("Dá um nome à viagem."); return false; }
      if (trip) { await api(`/trips/${trip.id}`, { method: "PATCH", body }); renderTrip(trip.id, true); }
      else { const t = await api("/trips", { method: "POST", body: { ...body, group_id: form.group.value } }); location.hash = `/trip/${t.id}`; }
    },
  });
}

function openServingsSheet(entry, done) {
  let n = entry.servings || entry.recipe?.servings || 2;
  openSheet({
    title: "Pessoas", submit: "Guardar",
    body: `<p class="meta sheet-lead center"><b>${esc(entry.recipe?.title || "")}</b><br>${esc(dayLabel(entry.day))} · ${SLOT_NAMES[entry.slot] || ""}</p>
      <div class="big-stepper"><button type="button" data-d="-1" aria-label="Menos">${I.minus}</button><output id="servN">${n}</output><button type="button" data-d="1" aria-label="Mais">${I.plus}</button></div>
      <p class="meta center">as quantidades e a lista de compras ajustam-se</p>`,
    onMount: el => el.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { n = Math.max(1, Math.min(100, n + +b.dataset.d)); $("#servN", el).textContent = n; haptic(4); }),
    onSubmit: async () => { await api(`/plan/${entry.id}`, { method: "PATCH", body: { servings: n } }); done?.(); },
  });
}

/** Add a recipe to a plan: from a day slot (personal week or a trip) or from a recipe page. */
async function openPlanSheet({ recipe = null, day = null, slot = "jantar", servings = null, trip = null, done = null } = {}) {
  let trips = [];
  if (recipe && !trip && groups().length) { try { trips = (await api("/trips")).filter(t => t.end >= isoDay(new Date())); } catch {} }
  const weekDays = Array.from({ length: 14 }, (_, i) => isoDay(addDays(mondayOf(new Date()), i))).filter(d => d >= isoDay(new Date()) || d === day);
  let target = trip ? `trip:${trip.id}` : "me";
  let chosen = recipe;
  const daysFor = t => t === "me" ? weekDays : (() => { const tr = trip || trips.find(x => `trip:${x.id}` === t); const out = []; for (let d = dateObj(tr.start); isoDay(d) <= tr.end; d = addDays(d, 1)) out.push(isoDay(d)); return out; })();
  const slotsFor = t => t === "me" ? WEEK_SLOTS : TRIP_SLOTS;
  const tripOf = t => trip || trips.find(x => `trip:${x.id}` === t);
  openSheet({
    title: recipe ? "Pôr no plano" : "Adicionar refeição", submit: "Adicionar",
    body: `
      ${recipe ? `<div class="picked">${thumb(recipe)}<b>${esc(recipe.title)}</b></div>` : `
        <div class="search-wrap glass">${I.search}<input class="search" id="planQ" placeholder="Procurar receita" autocomplete="off"></div>
        <div class="recipe-pick" id="planPick"></div>`}
      ${recipe && trips.length ? `<label class="field"><span class="field-label">Plano</span><select name="target"><option value="me">Pessoal (esta semana e a próxima)</option>${trips.map(t => `<option value="trip:${esc(t.id)}">${esc(t.name)} · ${rangeLabel(t.start, t.end)}</option>`).join("")}</select></label>` : ""}
      <div class="row2">
        <label class="field"><span class="field-label">Dia</span><select name="day"></select></label>
        <label class="field"><span class="field-label">Refeição</span><select name="slot"></select></label>
      </div>
      <label class="field"><span class="field-label">Pessoas</span><input name="servings" type="number" inputmode="numeric" min="1" max="100" value="${servings || trip?.people || recipe?.servings || 2}"></label>`,
    onMount: el => {
      const fillSelects = () => {
        const ds = daysFor(target);
        el.querySelector("[name=day]").innerHTML = ds.map(d => `<option value="${d}" ${d === day ? "selected" : ""}>${esc(dayLabel(d))}</option>`).join("");
        el.querySelector("[name=slot]").innerHTML = slotsFor(target).map(k => `<option value="${k}" ${k === slot ? "selected" : ""}>${SLOT_NAMES[k]}</option>`).join("");
        const tr = tripOf(target); if (tr && !el.querySelector("[name=servings]").dataset.touched) el.querySelector("[name=servings]").value = tr.people;
      };
      fillSelects();
      el.querySelector("[name=target]") && (el.querySelector("[name=target]").onchange = e => { target = e.target.value; fillSelects(); });
      el.querySelector("[name=servings]").oninput = e => { e.target.dataset.touched = "1"; };
      if (recipe) return;
      const tr = tripOf(target);
      const pool = () => state.recipes.filter(r => !tr || r.shared_group_ids.includes(tr.group_id) || r.is_owner);
      const draw = () => {
        const q = ($("#planQ", el).value || "").toLowerCase();
        const list = pool().filter(r => !q || r.title.toLowerCase().includes(q)).slice(0, 24);
        $("#planPick", el).innerHTML = list.map(r => `<label class="pick"><input type="radio" name="r" value="${esc(r.id)}" ${chosen?.id === r.id ? "checked" : ""}>${thumb(r)}<span>${esc(r.title)}</span></label>`).join("")
          || `<p class="meta">Sem receitas${q ? " com esse nome" : ""}.</p>`;
        el.querySelectorAll("[name=r]").forEach(i => i.onchange = () => {
          chosen = state.recipes.find(r => r.id === i.value);
          if (!tr && chosen?.servings && !el.querySelector("[name=servings]").dataset.touched) el.querySelector("[name=servings]").value = chosen.servings;
        });
      };
      $("#planQ", el).oninput = draw;
      draw();
    },
    onSubmit: async form => {
      if (!chosen) { toast("Escolhe uma receita."); return false; }
      const tr = tripOf(target);
      await api("/plan", { method: "POST", body: { day: form.day.value, slot: form.slot.value, recipe_id: chosen.id,
        servings: parseInt(form.servings.value, 10) || null, scope: "me", trip_id: tr?.id || null } });
      haptic();
      if (done) return done();
      toast(tr ? `Na viagem: ${dayLabel(form.day.value)}` : `No plano: ${dayLabel(form.day.value)}`, { action: "Ver", onAction: () => {
        if (tr) location.hash = `/trip/${tr.id}`;
        else { planState.mode = "me"; planState.week = isoDay(mondayOf(dateObj(form.day.value))); location.hash = "/plan"; }
      } });
    },
  });
}
