"use strict";
// RecipeBox web app: vanilla JS, no build step. Talks to the same API as the iOS app.
// Motion follows the apple-design skill (see motion.js): springs from the live value,
// 1:1 drags, velocity handoff, momentum projection, rubber-banding.

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const { Spring, project, rubberband, drag, haptic } = motion;

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const state = {
  recipes: [],
  query: "",
  collection: null,
  pending: store.get("pending", []),     // [{id, label, status, error}]
  grocery: store.get("grocery", []),     // recipe ids
  groceryDone: store.get("groceryDone", []),
};

// ------------------------------------------------------------------ API
async function api(path, opts = {}) {
  const headers = { ...(opts.body ? { "Content-Type": "application/json" } : {}) };
  const token = store.get("token", "");
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (res.status === 401) { toast("Token da API errado ou em falta. Defina-o nas Definições."); throw new Error("unauthorized"); }
  if (!res.ok) {
    let msg = `Erro do servidor (${res.status})`;
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

const loadRecipes = async () => { state.recipes = await api("/recipes"); };

// --------------------------------------------------------------- imports
function normaliseInput({ url, text }) {
  url = (url || "").trim(); text = (text || "").trim();
  if (!url && text) {
    // Apps often share "Look at this! https://vm.tiktok.com/xyz", so pull the link out.
    const m = text.match(/https?:\/\/\S+/);
    if (m && text.length < 300) { url = m[0]; text = ""; }
  }
  return { url, text };
}

async function startImport(input) {
  const { url, text } = normaliseInput(input);
  if (!url && !text) return;
  try {
    const job = await api("/imports", { method: "POST", body: url ? { url } : { text } });
    state.pending.unshift({ id: job.id, label: url ? shortUrl(url) : "Texto colado", status: job.status });
    savePending(); haptic();
    if (currentRoute() === "/") renderLibrary(); else location.hash = "/";
    pollPending();
  } catch (e) { toast(e.message); }
}

let polling = false;
async function pollPending() {
  if (polling) return; polling = true;
  try {
    while (state.pending.some(p => p.status !== "failed")) {
      await sleep(1500);
      let changed = false;
      for (const p of state.pending.filter(p => p.status !== "failed")) {
        try {
          const j = await api(`/imports/${p.id}`);
          if (j.status !== p.status) { p.status = j.status; changed = true; }
          if (j.status === "done") {
            state.pending = state.pending.filter(x => x.id !== p.id);
            await loadRecipes(); toast("Receita adicionada"); haptic(12);
          } else if (j.status === "failed") p.error = j.error;
        } catch (e) { if (e.message === "unauthorized") return; }
      }
      savePending();
      if (changed && currentRoute() === "/") renderLibrary();
    }
  } finally { polling = false; }
}
const savePending = () => store.set("pending", state.pending);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shortUrl = u => { try { const x = new URL(u); return x.hostname.replace(/^www\./, "") + x.pathname.slice(0, 24); } catch { return u; } };

// ---------------------------------------------------------------- icons (SF Symbols-style line icons)
const I = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.1"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  fork: '<svg viewBox="0 0 24 24"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 2.5-3 6s1 4 3 4v8"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 4 2.8 19.5h18.4zM12 10v4M12 17.2v.1"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
};
const PLATFORM = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", pinterest: "Pinterest", facebook: "Facebook", x: "X", web: "Web", text: "Texto colado" };
const platformName = p => PLATFORM[p] || p;

/** Deterministic warm gradient for recipes without a thumbnail. */
function placeholder(seed, extraClass = "") {
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = 8 + (h % 40), b = (a + 25 + (h >> 8) % 30) % 360;
  return `<div class="ph ${extraClass}" style="background:linear-gradient(150deg,hsl(${a} 85% 68%),hsl(${b} 75% 48%))">${I.fork}</div>`;
}
const photo = (r, cls) => r.thumbnail_url
  ? `<img class="${cls}" loading="lazy" referrerpolicy="no-referrer" src="${esc(r.thumbnail_url)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph-fallback'}))">`
  : placeholder(r.id || r.title);

// ---------------------------------------------------------------- routing + screen transitions
const view = $("#view"), title = $("#title");
const currentRoute = () => location.hash.slice(1) || "/";
const depth = r => (r.startsWith("/r/") ? 1 : 0);
let lastRoute = null;

/** Push/pop feel: deeper screens arrive from the right, going back arrives from the left
    (the same path they left by). Reduced motion: a plain cross-fade. */
function enterScreen(direction) {
  if (!direction) return;
  const el = view;
  const dist = Math.min(64, innerWidth * 0.12) * direction; // +1: from the right (push), -1: from the left (pop)
  const s = new Spring({ value: 0, damping: 1, response: 0.38, onUpdate: p => {
    el.style.transform = p >= 1 ? "" : `translateX(${(1 - p) * dist}px)`;
    el.style.opacity = p >= 1 ? "" : Math.min(1, 0.35 + p);
  } });
  if (motion.reducedMotion()) {
    el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    return;
  }
  s.set(0); s.to(1);
}

const TABS = ["library", "groceries", "settings"];
function route() {
  const h = currentRoute();
  const dir = lastRoute === null ? 0 : Math.sign(depth(h) - depth(lastRoute));
  lastRoute = h;
  const tab = h.startsWith("/r/") || h === "/" ? "library" : h.slice(1);
  document.querySelectorAll(".tabbar button").forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("active", on);
    on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
  });
  // The lens slides between tabs (springy CSS curve; instant with reduced motion)
  $(".tabbar .lens").style.transform = `translateX(${Math.max(0, TABS.indexOf(tab)) * 100}%)`;
  document.body.classList.toggle("route-detail", h.startsWith("/r/"));
  document.body.classList.remove("scrolled");
  window.scrollTo(0, 0);
  if (h.startsWith("/r/")) renderDetail(h.slice(3));
  else if (h === "/groceries") renderGroceries();
  else if (h === "/settings") renderSettings();
  else renderLibrary();
  enterScreen(dir);
}

const largeTitle = (text, sub) => { title.innerHTML = `<h1 class="large-title">${esc(text)}</h1>${sub ? `<p class="subtitle">${esc(sub)}</p>` : ""}`; };

// ---------------------------------------------------------------- library
function filteredRecipes() {
  const q = state.query.trim().toLowerCase();
  return state.recipes.filter(r =>
    (!state.collection || (state.collection === "♥" ? r.favorite : r.collections.includes(state.collection))) &&
    (!q || r.title.toLowerCase().includes(q) || r.tags.some(t => t.includes(q)) ||
      (r.cuisine || "").toLowerCase().includes(q) || r.ingredients.some(i => i.name.toLowerCase().includes(q))));
}

function renderLibrary() {
  const n = state.recipes.length;
  largeTitle("Receitas", n ? `${n} receita${n === 1 ? " guardada" : "s guardadas"}` : "O seu livro de receitas das redes sociais");
  const cols = [...new Set(state.recipes.flatMap(r => r.collections))].sort();
  const favs = state.recipes.some(r => r.favorite);
  view.innerHTML = `
    ${n ? `<div class="search-wrap glass">${I.search}<input class="search" type="search" enterkeyhint="search" aria-label="Pesquisar receitas" placeholder="Pesquisar receitas ou ingredientes" value="${esc(state.query)}"></div>` : ""}
    ${cols.length || favs ? `<div class="chips" role="toolbar" aria-label="Coleções">
      <button class="chip glass ${!state.collection ? "on" : ""}" data-col="">Todas</button>
      ${favs ? `<button class="chip glass ${state.collection === "♥" ? "on" : ""}" data-col="♥">${I.heart}Favoritos</button>` : ""}
      ${cols.map(c => `<button class="chip glass ${state.collection === c ? "on" : ""}" data-col="${esc(c)}">${esc(c)}</button>`).join("")}
    </div>` : ""}
    <div id="pendingList">${pendingHTML()}</div>
    <div id="results"></div>`;
  renderResults();

  // Search filters locally on every keystroke: no debounce, no round trip on the input path.
  $(".search", view)?.addEventListener("input", e => { state.query = e.target.value; renderResults(); });
  view.querySelectorAll("[data-col]").forEach(b => b.onclick = () => {
    state.collection = b.dataset.col || null;
    view.querySelectorAll("[data-col]").forEach(x => x.classList.toggle("on", x === b));
    renderResults();
  });
  view.addEventListener("click", e => {
    const d = e.target.closest("[data-dismiss]");
    if (d) { state.pending = state.pending.filter(p => p.id !== d.dataset.dismiss); savePending(); $("#pendingList").innerHTML = pendingHTML(); }
    if (e.target.closest("[data-import]")) sheet.show();
  });
}

function pendingHTML() {
  return state.pending.map(p => `
    <div class="pending glass ${p.status === "failed" ? "failed" : ""}">
      <div class="thumb-spin">${p.status === "failed" ? I.warn : `<div class="spinner" aria-hidden="true"></div>`}</div>
      <div style="flex:1;min-width:0"><div class="mono" style="font-weight:600">${esc(p.label)}</div>
        <div class="status">${p.status === "failed" ? esc(p.error || "Falha na importação") : statusLabel(p.status)}</div></div>
      ${p.status === "failed" ? `<button class="text-btn" data-dismiss="${esc(p.id)}">Ignorar</button>` : ""}
    </div>`).join("");
}

function renderResults() {
  const list = filteredRecipes();
  const el = $("#results");
  if (!el) return;
  if (list.length) {
    el.innerHTML = `<div class="grid">${list.map(card).join("")}</div>`;
  } else if (state.recipes.length) {
    el.innerHTML = `<div class="empty glass"><h3>Sem resultados</h3><p>Nada corresponde a “${esc(state.query || state.collection)}”. Experimente um ingrediente, como “alho”.</p></div>`;
  } else if (!state.pending.length) {
    el.innerHTML = `<div class="empty glass"><div class="art">${I.fork}</div><h3>Guarde a sua primeira receita</h3>
      <p>Partilhe um TikTok, um Reel, um vídeo do YouTube ou um artigo de blogue e obtenha uma receita organizada, com ingredientes e passos.</p>
      <button class="btn-primary" data-import>${I.plus}Importar receita</button>
      <p class="meta" style="margin-top:1rem;display:block">Guarde diretamente a partir da folha de partilha: <a href="#/settings">configure o Atalho</a></p></div>`;
  } else el.innerHTML = "";
  el.querySelectorAll(".card").forEach(c => {
    c.onclick = () => location.hash = `/r/${c.dataset.id}`;
    c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); } };
  });
}

const statusLabel = s => ({ queued: "Em fila…", fetching: "A ler a publicação…", extracting: "A escrever a receita…" }[s] || "A processar…");
const totalTime = r => r.total_minutes || ((r.prep_minutes || 0) + (r.cook_minutes || 0)) || null;
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;

function card(r) {
  const t = totalTime(r);
  return `<article class="card" data-id="${esc(r.id)}" role="link" tabindex="0" aria-label="${esc(r.title)}">
    ${photo(r, "photo")}
    <span class="tag glass-photo">${esc(platformName(r.source_platform))}</span>
    ${r.favorite ? `<span class="fav glass-photo" aria-label="Favorito">${I.heart}</span>` : ""}
    <div class="caption glass-photo"><h3>${esc(r.title)}</h3>
      <div class="meta">${t ? `<span>${I.clock}${fmtMin(t)}</span>` : ""}${r.servings ? `<span>${r.servings} ${r.servings === 1 ? "dose" : "doses"}</span>` : ""}</div>
    </div></article>`;
}

// ---------------------------------------------------------------- detail
async function renderDetail(id) {
  let r = state.recipes.find(x => x.id === id);
  if (!r) { try { r = await api(`/recipes/${id}`); } catch (e) { view.innerHTML = `<div class="empty glass"><p>${esc(e.message)}</p></div>`; return; } }
  const checked = new Set(store.get(`checked:${id}`, []));
  let current = r;

  const bar = () => {
    title.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem">
      <button class="bar-btn glass-photo" id="backBtn" aria-label="Voltar">${I.back}</button>
      <div class="nav-title">${esc(r.title)}</div>
      <button class="bar-btn glass-photo" id="shareTop" aria-label="Partilhar">${I.share}</button>
      <button class="bar-btn glass-photo" id="favTop" aria-label="Favorito" aria-pressed="${r.favorite}">${I.heart}</button></div>`;
    $("#backBtn").onclick = () => (history.length > 1 ? history.back() : (location.hash = "/"));
    $("#favTop").onclick = toggleFav;
    $("#shareTop").onclick = share;
  };
  const toggleFav = async () => {
    r = await patch(id, { favorite: !r.favorite }); current = { ...current, favorite: r.favorite };
    bar(); haptic(); toast(r.favorite ? "Adicionada aos favoritos" : "Removida dos favoritos");
  };
  const share = () => navigator.share
    ? navigator.share({ title: r.title, text: shareText(current), url: r.source_url }).catch(() => {})
    : navigator.clipboard.writeText(shareText(current)).then(() => toast("Receita copiada"));

  const draw = () => {
    const groups = [];
    current.ingredients.forEach((ing, i) => {
      let g = groups.find(x => x.name === (ing.group || null));
      if (!g) groups.push(g = { name: ing.group || null, items: [] });
      g.items.push([i, ing]);
    });
    const n = current.nutrition_estimate;
    const author = r.author || platformName(r.source_platform);
    const onList = state.grocery.includes(id);
    view.innerHTML = `<div class="detail">
      <div class="hero">
        ${r.thumbnail_url ? `<img src="${esc(r.thumbnail_url)}" referrerpolicy="no-referrer" alt="" onerror="this.remove()">` : placeholder(r.id)}
        <div class="hero-text">
          <h2>${esc(r.title)}</h2>
          <a class="source glass-photo" href="${esc(r.source_url)}" target="_blank" rel="noopener">
            <span class="av">${esc(author.replace(/^@/, "").charAt(0).toUpperCase())}</span>${esc(author)} · ${esc(platformName(r.source_platform))}</a>
        </div>
      </div>
      <div class="stats glass">
        <div class="stat"><b>${r.prep_minutes ? fmtMin(r.prep_minutes) : "–"}</b><span>Preparação</span></div>
        <div class="stat"><b>${r.cook_minutes ? fmtMin(r.cook_minutes) : "–"}</b><span>Confeção</span></div>
        <div class="stat"><b>${current.servings || "–"}</b><span>Doses</span></div>
        <div class="stat"><b>${n?.calories ?? "–"}</b><span>kcal</span></div>
      </div>
      <div class="detail-actions">
        <button class="btn-primary" id="cookBtn">${I.play}Começar a cozinhar</button>
        <button class="icon-glass glass" id="groBtn" aria-label="${onList ? "Remover da" : "Adicionar à"} lista de compras" aria-pressed="${onList}">${onList ? I.check : I.cart}</button>
      </div>
      ${r.confidence < 0.7 ? `<div class="notice glass">${I.sparkle}<span>Alguns detalhes foram estimados pela IA${r.inferred_fields.length ? ` (${esc(r.inferred_fields.join(", "))})` : ""}. Confirme antes de cozinhar.</span></div>` : ""}
      ${r.description ? `<p class="desc">${esc(r.description)}</p>` : ""}
      <section class="section glass">
        <div class="section-head"><h3>Ingredientes</h3>
          ${current.servings ? `<div class="stepper"><button data-s="-1" aria-label="Menos doses">${I.minus}</button>
            <output aria-live="polite">${current.servings} ${current.servings === 1 ? "dose" : "doses"}</output><button data-s="1" aria-label="Mais doses">${I.plus}</button></div>` : ""}
        </div>
        ${groups.map(g => `${g.name ? `<div class="group">${esc(g.name)}</div>` : ""}
          ${g.items.map(([i, ing]) => `<label class="ing ${checked.has(i) ? "done" : ""}">
            <input type="checkbox" data-i="${i}" ${checked.has(i) ? "checked" : ""}>
            <span class="txt">${ingText(ing)}</span></label>`).join("")}`).join("")}
      </section>
      <section class="section glass">
        <div class="section-head"><h3>Passos</h3><span class="meta">${current.steps.length} ${current.steps.length === 1 ? "passo" : "passos"}${totalTime(r) ? ` · ${fmtMin(totalTime(r))}` : ""}</span></div>
        ${current.steps.map((s, i) => `<div class="step"><span class="n">${i + 1}</span><p>${esc(s.text)}</p></div>`).join("")}
      </section>
      ${n && (n.protein_g || n.carbs_g || n.fat_g) ? `<section class="section glass"><div class="section-head"><h3>Informação nutricional</h3><span class="meta">por dose, estimativa</span></div>
        <div class="nutrition"><div><b>${n.protein_g ?? "–"}g</b><span>Proteína</span></div><div><b>${n.carbs_g ?? "–"}g</b><span>Hidratos</span></div><div><b>${n.fat_g ?? "–"}g</b><span>Gordura</span></div></div></section>` : ""}
      <section class="section glass">
        <div class="section-head"><h3>Coleções</h3></div>
        <input id="colInput" placeholder="ex.: Jantar, Marmitas" value="${esc(r.collections.join(", "))}" aria-label="Coleções, separadas por vírgulas">
        ${r.tags.length ? `<div class="tags" style="margin-top:.8rem">${r.tags.map(t => `<span class="glass">#${esc(t)}</span>`).join("")}</div>` : ""}
      </section>
      <button class="danger-link" id="delBtn">${I.trash}Eliminar receita</button>
    </div>`;

    view.querySelectorAll("[data-i]").forEach(cb => cb.onchange = () => {
      const i = +cb.dataset.i; cb.checked ? checked.add(i) : checked.delete(i);
      cb.closest(".ing").classList.toggle("done", cb.checked); store.set(`checked:${id}`, [...checked]);
    });
    view.querySelectorAll("[data-s]").forEach(b => b.onclick = async () => {
      const s = Math.max(1, current.servings + +b.dataset.s);
      try { current = s === r.servings ? r : await api(`/recipes/${id}/scaled?servings=${s}`); const y = scrollY; draw(); scrollTo(0, y); }
      catch (e) { toast(e.message); }
    });
    $("#cookBtn").onclick = () => cookMode(current);
    $("#groBtn").onclick = () => {
      const adding = !state.grocery.includes(id);
      state.grocery = adding ? [...state.grocery, id] : state.grocery.filter(x => x !== id);
      store.set("grocery", state.grocery); const y = scrollY; draw(); scrollTo(0, y);
      toast(adding ? "Adicionada às compras" : "Removida das compras"); haptic();
    };
    $("#colInput").onchange = async e => {
      const cols = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      r = await patch(id, { collections: cols }); toast("Coleções guardadas");
    };
    $("#delBtn").onclick = async () => {
      // Irreversible, so this is the one place a confirmation earns its keep.
      if (!confirm(`Eliminar “${r.title}”? Esta ação não pode ser anulada.`)) return;
      await api(`/recipes/${id}`, { method: "DELETE" });
      state.recipes = state.recipes.filter(x => x.id !== id); location.hash = "/";
    };
  };
  bar();
  draw();
}

const withDe = (unit, name) => unit ? `de ${name}` : name;
const ingLine = i => [i.quantity, i.unit, withDe(i.unit, i.name)].filter(Boolean).join(" ");
const ingText = i => `${i.quantity || i.unit ? `<span class="qty">${esc([i.quantity, i.unit].filter(Boolean).join(" "))}</span> ` : ""}${esc(withDe(i.unit, i.name))}${i.note ? `<span class="note">, ${esc(i.note)}</span>` : ""}`;
const shareText = r => `${r.title}\n\nIngredientes:\n${r.ingredients.map(i => "• " + ingLine(i)).join("\n")}\n\nPassos:\n${r.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n")}\n\nFonte: ${r.source_url}`;

async function patch(id, body) {
  const updated = await api(`/recipes/${id}`, { method: "PATCH", body });
  state.recipes = state.recipes.map(x => x.id === id ? updated : x);
  return updated;
}

// ---------------------------------------------------------------- cook mode
/** Full-screen sheet that rises from the bottom over a blurred photo of the dish.
    Swipe sideways between steps (momentum picks the page), pull down to dismiss. */
async function cookMode(r) {
  const steps = r.steps.length ? r.steps : [{ text: "Sem passos" }];
  let page = 0, lock = null;
  try { lock = await navigator.wakeLock?.request("screen"); } catch {}

  const el = document.createElement("div");
  el.className = "cook"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", `Modo cozinha: ${r.title}`);
  const bg = r.thumbnail_url ? `<div class="cook-bg" style="background-image:url('${esc(r.thumbnail_url)}')"></div>` : placeholder(r.id, "cook-bg");
  el.innerHTML = `${bg}
    <div class="cook-head"><span class="title" id="cm-count"></span><button class="close glass-photo" id="cm-done" aria-label="Fechar modo cozinha">${I.x}</button></div>
    <div class="progress" aria-hidden="true"><i></i></div>
    <div class="pager" aria-live="polite"><div class="track">${steps.map((s, i) =>
      `<div class="page" aria-hidden="${i !== 0}"><div class="step-card glass-photo"><p class="eyebrow">Passo ${i + 1} de ${steps.length}</p><p>${esc(s.text)}</p></div></div>`).join("")}</div></div>
    <div class="nav"><button class="back-btn glass-photo" id="cm-prev">Anterior</button><button class="next-btn" id="cm-next"></button></div>`;
  document.body.append(el); document.body.classList.add("sheet-open");
  $("#app").inert = true;
  const track = $(".track", el), pager = $(".pager", el);
  const W = () => pager.clientWidth, H = () => innerHeight;

  // Vertical presentation spring (0 = open, H = offscreen) and horizontal pager spring.
  const ySpring = new Spring({ value: H(), damping: 1, response: 0.42, onUpdate: y => {
    el.style.transform = `translateY(${Math.max(0, y)}px)`;
    if (motion.reducedMotion()) el.style.opacity = y >= H() ? 0 : 1;
  } });
  const xSpring = new Spring({ value: 0, onUpdate: x => { track.style.transform = `translateX(${x}px)`; } });

  const sync = () => {
    $("#cm-count", el).textContent = r.title;
    $(".progress i", el).style.width = `${((page + 1) / steps.length) * 100}%`;
    el.querySelectorAll(".page").forEach((p, i) => p.setAttribute("aria-hidden", String(i !== page)));
    $("#cm-prev", el).disabled = page === 0;
    $("#cm-next", el).textContent = page === steps.length - 1 ? "Concluir" : "Passo seguinte";
  };
  const goTo = (i, velocity = 0) => {
    const next = Math.max(0, Math.min(steps.length - 1, i));
    if (next !== page) haptic(6);
    page = next; sync();
    // Bounce only if a flick carried momentum; button taps settle without overshoot.
    xSpring.to(-page * W(), { velocity, damping: Math.abs(velocity) > 300 ? 0.82 : 1, response: 0.36 });
  };
  const close = (velocity = 0) => {
    lock?.release?.().catch(() => {});
    ySpring.onRest = y => { if (y >= H()) { el.remove(); document.body.classList.remove("sheet-open"); $("#app").inert = false; removeEventListener("keydown", onKey); removeEventListener("resize", onResize); } };
    ySpring.to(H(), { velocity, damping: 1, response: 0.36 });
  };

  let x0 = 0, y0 = 0;
  drag(el, {
    start: e => !e.target.closest("button"),
    begin: () => { x0 = xSpring.value; y0 = ySpring.value; xSpring.stop(); ySpring.stop(); },  // grab mid-flight
    move: ({ dx, dy, axis }) => {
      if (axis === "x") {
        const min = -(steps.length - 1) * W();
        let x = x0 + dx;
        if (x > 0) x = rubberband(x, W());
        else if (x < min) x = min + rubberband(x - min, W());
        xSpring.set(x);
      } else {
        const y = y0 + dy;
        ySpring.set(y < 0 ? rubberband(y, H()) : y);
      }
    },
    end: ({ vx, vy, axis }) => {
      if (axis === "x") {
        // Project where the flick is heading, then land on the nearest page (one page per flick).
        const projected = xSpring.value + project(vx, 0.99);
        const target = Math.max(page - 1, Math.min(page + 1, Math.round(-projected / W())));
        goTo(target, vx);
      } else {
        const projected = ySpring.value + project(vy);
        if (projected > H() * 0.4) close(vy);
        else ySpring.to(0, { velocity: vy, damping: 0.85, response: 0.32 });
      }
    },
  });

  const onKey = e => {
    if (e.key === "ArrowRight") goTo(page + 1);
    else if (e.key === "ArrowLeft") goTo(page - 1);
    else if (e.key === "Escape") close();
  };
  addEventListener("keydown", onKey);
  $("#cm-done", el).onclick = () => close();
  $("#cm-prev", el).onclick = () => goTo(page - 1);
  $("#cm-next", el).onclick = () => (page === steps.length - 1 ? close() : goTo(page + 1));
  const onResize = () => xSpring.set(-page * W());
  addEventListener("resize", onResize);

  sync();
  ySpring.set(H());
  ySpring.to(0);
  $("#cm-next", el).focus({ preventScroll: true });
}

// ---------------------------------------------------------------- groceries & settings
async function renderGroceries() {
  largeTitle("Compras", state.grocery.length ? `De ${state.grocery.length} receita${state.grocery.length === 1 ? "" : "s"}` : "");
  if (!state.grocery.length) {
    view.innerHTML = `<div class="empty glass"><div class="art">${I.cart}</div><h3>A sua lista está vazia</h3>
      <p>Abra uma receita e toque no botão do carrinho. Os ingredientes de várias receitas são reunidos aqui.</p></div>`; return;
  }
  view.innerHTML = `<div class="section glass"><p class="meta">A carregar…</p></div>`;
  let items = [];
  try { items = await api(`/grocery-list?ids=${encodeURIComponent(state.grocery.join(","))}`); } catch (e) { toast(e.message); }
  const done = new Set(state.groceryDone);
  const key = it => `${it.name}|${it.unit || ""}`;
  view.innerHTML = `<section class="section glass">
      <div class="section-head"><h3>${items.length} ${items.length === 1 ? "artigo" : "artigos"}</h3><span class="meta" id="leftCount"></span></div>
      ${items.map(it => `<label class="ing ${done.has(key(it)) ? "done" : ""}">
      <input type="checkbox" data-k="${esc(key(it))}" ${done.has(key(it)) ? "checked" : ""}>
      <span class="txt">${it.quantities.length ? `<span class="qty">${esc(it.quantities.join(" + "))}${it.unit ? " " + esc(it.unit) : ""}</span> ` : ""}${esc(withDe(it.quantities.length && it.unit, it.name))}
      <br><small class="note">${esc(it.recipes.join(", "))}</small></span></label>`).join("")}</section>
    <div class="row-actions"><button class="btn-glass glass" id="copyList">${I.copy}Copiar lista</button><button class="btn-glass glass" id="clearList">${I.trash}Limpar</button></div>`;
  const left = () => $("#leftCount").textContent = `faltam ${items.filter(it => !done.has(key(it))).length}`;
  left();
  view.querySelectorAll("[data-k]").forEach(cb => cb.onchange = () => {
    cb.checked ? done.add(cb.dataset.k) : done.delete(cb.dataset.k);
    cb.closest(".ing").classList.toggle("done", cb.checked); store.set("groceryDone", [...done]); left();
  });
  $("#copyList").onclick = () => navigator.clipboard.writeText(items.filter(it => !done.has(key(it)))
    .map(it => `• ${[it.quantities.join(" + "), it.unit, withDe(it.unit, it.name)].filter(Boolean).join(" ")}`).join("\n")).then(() => toast("Lista copiada"));
  $("#clearList").onclick = () => {
    // Undo instead of a confirmation dialog: forgiving, and doesn't train people to click through.
    const prev = [state.grocery, state.groceryDone];
    state.grocery = []; state.groceryDone = []; store.set("grocery", []); store.set("groceryDone", []); renderGroceries();
    toast("Lista limpa", { action: "Anular", onAction: () => {
      [state.grocery, state.groceryDone] = prev; store.set("grocery", prev[0]); store.set("groceryDone", prev[1]); renderGroceries();
    } });
  };
}

function renderSettings() {
  largeTitle("Definições");
  const origin = location.origin;
  view.innerHTML = `
    <section class="section glass"><div class="section-head"><h3>Token da API</h3></div>
      <p class="meta">Só é necessário se o seu servidor definir <code>API_TOKEN</code>. Fica guardado neste dispositivo.</p>
      <div class="settings-row" style="margin-top:.75rem"><input id="tok" type="password" value="${esc(store.get("token", ""))}" placeholder="Token" aria-label="API token">
        <button class="btn-solid" id="saveTok">Guardar</button></div>
    </section>
    <section class="section glass"><div class="section-head"><h3>Instalar no iPhone</h3></div>
      <ol class="howto">
        <li>Abra <code>${esc(origin)}</code> no <b>Safari</b>.</li>
        <li>Toque em <b>Partilhar</b> → <b>Adicionar ao ecrã principal</b>.</li>
      </ol>
    </section>
    <section class="section glass"><div class="section-head"><h3>Guardar a partir da folha de partilha</h3></div>
      <p class="meta">O iOS não permite que apps web apareçam na folha de partilha. Um Atalho, que se configura num minuto, resolve isso:</p>
      <ol class="howto">
        <li>Abra a app <b>Atalhos</b> → <b>＋</b> → dê-lhe o nome <b>Guardar no RecipeBox</b>.</li>
        <li>Toque em <b>ⓘ</b> → ative <b>Mostrar na folha de partilha</b> (recebe <b>URL</b> e <b>Texto</b>).</li>
        <li>Adicione <b>Obter conteúdo do URL</b>: <code>${esc(origin)}/imports/shortcut</code>, Método <b>POST</b>, Corpo do pedido <b>JSON</b>, campo <code>input</code> = <b>Entrada do atalho</b>${store.get("token", "") ? `, cabeçalho <code>Authorization</code> = <code>Bearer &lt;token&gt;</code>` : ""}.</li>
        <li>Adicione <b>Mostrar notificação</b> com <b>Conteúdo do URL</b>.</li>
      </ol>
      <p class="meta" style="margin-top:.5rem">Depois, no TikTok ou no Instagram: Partilhar → <b>Guardar no RecipeBox</b>.</p>
    </section>
    <section class="section glass"><div class="section-head"><h3>Android</h3></div>
      <p class="meta">Instale a partir do menu do Chrome (<b>Adicionar ao ecrã principal</b>). O RecipeBox passa a aparecer diretamente na folha de partilha.</p></section>`;
  $("#saveTok").onclick = async () => {
    store.set("token", $("#tok").value.trim()); toast("Token guardado");
    await loadRecipes().catch(() => {}); renderSettings();
  };
}

// ---------------------------------------------------------------- toast (materialises with a spring)
const toastEl = $("#toast");
let toastT;
const toastSpring = new Spring({ value: 0, damping: 1, response: 0.3, onUpdate: p => {
  toastEl.style.opacity = p;
  toastEl.style.transform = `translate(-50%, ${(1 - p) * 8}px) scale(${0.94 + 0.06 * p})`;
  toastEl.style.filter = p > 0.99 ? "none" : `blur(${(1 - p) * 6}px)`;
} });
function toast(msg, { action, onAction } = {}) {
  toastEl.innerHTML = (action ? "" : I.check) + `<span>${esc(msg)}</span>` + (action ? `<button>${esc(action)}</button>` : "");
  toastEl.style.pointerEvents = action ? "auto" : "none";
  if (action) $("button", toastEl).onclick = () => { onAction(); toastSpring.to(0); };
  toastSpring.to(1);
  clearTimeout(toastT); toastT = setTimeout(() => toastSpring.to(0), action ? 4500 : 2200);
}

// ---------------------------------------------------------------- import sheet
const sheet = (() => {
  const el = $("#importSheet"), scrim = $("#scrim"), urlIn = $("#importUrl"), textIn = $("#importText"),
        go = $("#importGo"), hint = $("#urlHint"), form = $("#importForm");
  let open = false, returnFocus = null;
  const height = () => el.offsetHeight || 400;
  const spring = new Spring({ value: 1, onUpdate: y => {
    // y is measured in pixels from fully open (0) to fully hidden (height)
    el.style.transform = `translateY(${y}px)`;
    const p = 1 - Math.min(1, Math.max(0, y / height()));
    scrim.style.opacity = p;                       // dim tracks the sheet 1:1 (modal task: dim to focus)
    if (motion.reducedMotion()) el.style.opacity = y >= height() ? 0 : 1;
  } });

  function show() {
    if (open) return;
    open = true; returnFocus = document.activeElement;
    urlIn.value = ""; textIn.value = ""; hint.textContent = ""; validate();
    el.hidden = false; scrim.hidden = false;
    document.body.classList.add("sheet-open"); $("#app").inert = true;
    if (!spring.running) spring.set(height());
    // A tap carried no momentum, so settle without bounce. Rises from the bottom, where it'll leave.
    spring.onRest = () => {};
    spring.to(0, { damping: 1, response: 0.38 });
    setTimeout(() => urlIn.focus({ preventScroll: true }), 60);
  }
  function hide(velocity = 0) {
    if (!open) return;
    open = false;
    spring.onRest = y => {
      if (y >= height() - 1) { el.hidden = true; scrim.hidden = true; }
    };
    spring.to(height(), { velocity, damping: 1, response: 0.34 });
    document.body.classList.remove("sheet-open"); $("#app").inert = false;
    document.activeElement?.blur?.();
    returnFocus?.focus?.({ preventScroll: true });
  }

  // Inline validation, as you type (not on submit).
  function validate() {
    const { url, text } = normaliseInput({ url: urlIn.value, text: textIn.value });
    let ok = !!(url || text), msg = "";
    if (urlIn.value.trim()) {
      try { const u = new URL(urlIn.value.trim()); if (!/^https?:$/.test(u.protocol)) throw 0; }
      catch { ok = !!text; msg = "Isto não parece uma ligação. Cole o URL completo, começado por https://"; }
    }
    hint.textContent = msg; go.disabled = !ok;
    return ok;
  }
  urlIn.addEventListener("input", validate); textIn.addEventListener("input", validate);

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!validate()) return;
    const input = { url: hint.textContent ? "" : urlIn.value, text: textIn.value };
    hide(); startImport(input);
  });
  el.querySelector("[data-close]").onclick = () => hide();
  scrim.addEventListener("click", () => hide());
  addEventListener("keydown", e => { if (open && e.key === "Escape") hide(); });
  $("#pasteBtn").onclick = async () => {
    try { urlIn.value = (await navigator.clipboard.readText()).trim(); validate(); }
    catch { hint.textContent = "A colagem foi bloqueada. Toque sem soltar no campo e escolha Colar."; }
  };

  // Drag anywhere on the sheet (except form fields) to pull it down; it tracks 1:1,
  // rubber-bands upward, and a flick dismisses based on its projected landing point.
  let y0 = 0;
  drag(el, {
    axes: "y",
    start: e => !e.target.closest("input, textarea, button"),
    begin: () => { spring.stop(); y0 = spring.value; },
    move: ({ dy }) => { const y = y0 + dy; spring.set(y < 0 ? rubberband(y, height()) : y); },
    end: ({ vy }) => {
      const projected = spring.value + project(vy);
      if (projected > height() * 0.5) hide(vy);
      else spring.to(0, { velocity: vy, damping: 0.8, response: 0.3 }); // drawer values from Apple's table
    },
  });

  return { show, hide };
})();

// ---------------------------------------------------------------- chrome
$("#addBtn").onclick = () => sheet.show();
document.querySelectorAll(".tabbar button").forEach(b => b.onclick = () => location.hash = b.dataset.tab === "library" ? "/" : "/" + b.dataset.tab);
window.addEventListener("hashchange", route);
// iOS Safari only applies :active (our press-down feedback) when a touchstart listener exists.
document.addEventListener("touchstart", () => {}, { passive: true });
// Scroll edge effect under the top bar, only while content is actually beneath it.
addEventListener("scroll", () => {
  const hero = document.body.classList.contains("route-detail") && $(".hero");
  const threshold = hero ? hero.offsetHeight - 110 : 4;
  document.body.classList.toggle("scrolled", scrollY > threshold);
}, { passive: true });
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") { await loadRecipes().catch(() => {}); if (currentRoute() === "/") renderResults(); }
});

// ---------------------------------------------------------------- boot
(async function boot() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  // Android share target / links like /?url=... from a Shortcut or bookmarklet
  const qs = new URLSearchParams(location.search);
  const sharedUrl = qs.get("url"), sharedText = qs.get("text");
  if (sharedUrl || sharedText) {
    history.replaceState(null, "", "/" + location.hash);
    startImport({ url: sharedUrl, text: sharedText });
  }
  try { await loadRecipes(); } catch (e) { if (e.message !== "unauthorized") toast(e.message); }
  route();
  if (state.pending.length) pollPending();
})();
