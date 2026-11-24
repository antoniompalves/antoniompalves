"use strict";
// Gohan web app: vanilla JS, no build step. Talks to the same API as the iOS app.
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
  me: null,                              // {user, groups}
  recipes: [],
  query: "",
  collection: null,
  category: null,
  scope: store.get("scope", "all"),      // "all" | "mine" | <group id>
  groupId: store.get("groupId", null),   // selected group in the Grupo tab
  pending: store.get("pending", []),     // [{id, label, status, error}]
};
const groups = () => state.me?.groups || [];
const groupById = id => groups().find(g => g.id === id);
const me = () => state.me?.user;

// ------------------------------------------------------------------ API
async function api(path, opts = {}) {
  const headers = { ...(opts.body ? { "Content-Type": "application/json" } : {}) };
  const token = store.get("session", "");
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (res.status === 401 && !path.startsWith("/auth/")) { signOut(); throw new Error("unauthorized"); }
  if (!res.ok) {
    let msg = `Erro do servidor (${res.status})`;
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

const loadRecipes = async () => { state.recipes = await api("/recipes?scope=all"); };
const loadMe = async () => { state.me = await api("/me"); updateBadge(); };

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
  const group_id = input.group_id || null;
  try {
    const job = await api("/imports", { method: "POST", body: url ? { url, group_id } : { text, group_id } });
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
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.2c1.6.6 2.7 2.2 3 4.8"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M7 11v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM7 11l4-7.5a2 2 0 0 1 2.9 2.1L13 10h5.6a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 17.3 20H7"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M17 13V4h2.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1zM17 13l-4 7.5a2 2 0 0 1-2.9-2.1L11 14H5.4a2 2 0 0 1-2-2.4l1.3-6A2 2 0 0 1 6.7 4H17"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7l-1-3h-5z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/></svg>',
  vote: '<svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7.5"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M4 11.5 12 5l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/></svg>',
};
const EUR = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const eur = v => EUR.format(v);
/** "≈ 2,40 €" from a [low, typical, high] triple; null when there's no price data. */
const costText = c => c && c[1] > 0 ? `≈ ${eur(c[1])}` : null;
/** Initial-letter avatar in the person's colour. */
const avatar = (u, cls = "") => u ? `<span class="av ${cls}" style="background:${esc(u.color || "#e2531d")}" title="${esc(u.name)}">${esc((u.name || "?").trim().charAt(0).toUpperCase())}</span>` : "";
const firstName = u => (u?.name || "").split(" ")[0];
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 172800) return "ontem";
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} dias`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}
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
const depth = r => (/^\/(r|event|list|trip)\//.test(r) || r === "/pantry" ? 1 : 0);
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

const TABS = ["library", "plan", "group", "lists", "settings"];
function route() {
  const h = currentRoute();
  const dir = lastRoute === null ? 0 : Math.sign(depth(h) - depth(lastRoute));
  lastRoute = h;
  if (!state.me) return renderAuth();
  if (h.startsWith("/join/")) return joinFromLink(h.slice(6));
  const tab = h.startsWith("/r/") || h === "/" ? "library" : h.startsWith("/event/") ? "group" : h.startsWith("/list/") || h === "/pantry" ? "lists" : h.startsWith("/trip/") ? "plan" : h.slice(1);
  document.querySelectorAll(".tabbar button").forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("active", on);
    on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
  });
  // The lens slides between tabs (springy CSS curve; instant with reduced motion)
  $(".tabbar .lens").style.transform = `translateX(${Math.max(0, TABS.indexOf(tab)) * 100}%)`;
  document.body.classList.toggle("route-detail", h.startsWith("/r/"));
  document.body.dataset.tab = tab;
  document.body.classList.toggle("route-sub", depth(h) === 1);
  document.body.classList.remove("scrolled");
  window.scrollTo(0, 0);
  document.body.classList.remove("auth-mode");
  if (h.startsWith("/r/")) renderDetail(h.slice(3));
  else if (h === "/group") renderGroup();
  else if (h.startsWith("/event/")) renderEvent(h.slice(7));
  else if (h === "/lists") renderLists();
  else if (h === "/plan") renderPlan();
  else if (h.startsWith("/trip/")) renderTrip(h.slice(6));
  else if (h === "/pantry") renderPantry();
  else if (h.startsWith("/list/")) renderList(h.slice(6));
  else if (h === "/settings") renderSettings();
  else renderLibrary();
  enterScreen(dir);
}

const largeTitle = (text, sub) => { title.innerHTML = `<h1 class="large-title">${esc(text)}</h1>${sub ? `<p class="subtitle">${esc(sub)}</p>` : ""}`; };

// ---------------------------------------------------------------- library
function filteredRecipes() {
  const q = state.query.trim().toLowerCase();
  return state.recipes.filter(r =>
    (state.scope === "all" || (state.scope === "mine" ? r.is_owner : r.shared_group_ids.includes(state.scope))) &&
    (!state.collection || (state.collection === "♥" ? r.favorite : r.collections.includes(state.collection))) &&
    (!state.category || CATEGORIES.find(c => c[0] === state.category)?.[2](r)) &&
    (!q || r.title.toLowerCase().includes(q) || r.tags.some(t => t.includes(q)) ||
      (r.cuisine || "").toLowerCase().includes(q) || r.ingredients.some(i => i.name.toLowerCase().includes(q))));
}

// Categories: Bimby is its own shelf (tag or machine settings in the steps); the rest come from meal_type.
const BIMBY_RE = /\b(bimby|thermomix|varoma|colher inversa|vel(?:\.|ocidade)\s*(?:\d|colher))/i;
const isBimby = r => r.tags.some(t => /^(bimby|thermomix)$/i.test(t)) || BIMBY_RE.test(r.title) ||
  (r.steps.length > 0 && r.steps.filter(s => BIMBY_RE.test(s.text)).length >= Math.min(2, r.steps.length));
const CATEGORIES = [
  ["bimby", "Bimby", r => isBimby(r)],
  ["pequeno", "Pequeno-almoço", r => /breakfast|brunch/i.test(r.meal_type || "")],
  ["pratos", "Pratos principais", r => /lunch|dinner|main/i.test(r.meal_type || "")],
  ["sobremesas", "Sobremesas", r => /dessert/i.test(r.meal_type || "") || r.tags.some(t => /sobremesa|doce|bolo/i.test(t))],
  ["lanches", "Lanches", r => /snack/i.test(r.meal_type || "")],
  ["bebidas", "Bebidas", r => /drink/i.test(r.meal_type || "")],
];
const BIMBY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l-1.2 12.5a2 2 0 0 1-2 1.8h-3.6a2 2 0 0 1-2-1.8z"/><path d="M17 7h1.5a1.5 1.5 0 0 1 1.5 1.5V11a2 2 0 0 1-2 2h-1M6 21h12M9.5 18.3 9 21M14.5 18.3 15 21M8.5 2.5h7"/></svg>`;

function weekNumber(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
}
// The front-page recipe: the group's favourites rotate weekly (stable during the week).
function recipeOfWeek() {
  const withPhoto = state.recipes.filter(r => r.thumbnail_url);
  if (!withPhoto.length) return null;
  const top = [...withPhoto].sort((a, b) => (b.stats?.cooks || 0) - (a.stats?.cooks || 0) || (b.favorite - a.favorite)).slice(0, 5);
  return top[weekNumber() % top.length];
}
const greeting = () => { const h = new Date().getHours(); return h < 6 ? "Boa noite" : h < 13 ? "Bom dia" : h < 20 ? "Boa tarde" : "Boa noite"; };

function homeHero() {
  const r = recipeOfWeek(), first = (state.me?.user?.name || state.me?.name || "").split(" ")[0];
  const n = state.recipes.length, gs = groups().length;
  const cooked = state.recipes.reduce((a, x) => a + (x.stats?.cooks || 0), 0);
  return `<section class="home-hero" aria-label="Início">
    ${r ? `<div class="hh-bg" style="background-image:url('${esc(r.thumbnail_url)}')" aria-hidden="true"></div>` : ""}
    <div class="hh-text">
      <p class="hh-greet">${greeting()}${first ? `, ${esc(first)}` : ""}</p>
      <h2>Cada receita tem uma <em>história.</em></h2>
      <p class="hh-sub">Guarda as receitas dos TikToks, Reels e blogues, cozinha-as com o grupo e planeia a semana sem complicações.</p>
      <div class="hh-actions"><button class="btn-primary" data-import>${I.plus}Importar receita</button>
        <a class="hh-ghost" href="#/plan">${I.calendar}Planear a semana</a></div>
      <p class="hh-stats"><b>${n}</b> receita${n === 1 ? "" : "s"}${cooked ? ` · <b>${cooked}</b> vez${cooked === 1 ? "" : "es"} cozinhadas` : ""}${gs ? ` · <b>${gs}</b> grupo${gs === 1 ? "" : "s"}` : ""}</p>
    </div>
    ${r ? `<a class="hh-week" href="#/r/${esc(r.id)}">
      <img src="${esc(r.thumbnail_url)}" alt="" loading="lazy" onerror="this.remove()">
      <span class="eyebrow">Receita da semana${isBimby(r) ? " · Bimby" : ""}</span>
      <b>${esc(r.title)}</b>
      <i>${r.stats?.cooks ? `Feita ${r.stats.cooks}× ${r.is_owner ? "" : `· trazida por ${esc(r.owner?.name?.split(" ")[0] || "")}`}` : r.description ? esc(r.description.slice(0, 60)) + (r.description.length > 60 ? "…" : "") : "Ainda ninguém a fez. Esta semana?"}</i>
    </a>` : ""}
  </section>`;
}

async function homeSide() {
  const el = $("#homeSide"); if (!el) return;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let plan = null, lists = [];
  try { [plan, lists] = await Promise.all([api(`/plan?week=${iso(today)}`), api("/lists")]); } catch { return; }
  if (!$("#homeSide")) return;
  const next = plan.days.filter(d => d.date >= iso(today)).flatMap(d => d.entries.filter(e => e.recipe).map(e => ({ ...e, date: d.date }))).slice(0, 4);
  const dayName = d => d === iso(today) ? "Hoje" : new Date(d + "T12:00").toLocaleDateString("pt-PT", { weekday: "long" }).replace(/^./, c => c.toUpperCase());
  const open = lists.filter(l => l.total && l.done < l.total).slice(0, 2);
  el.innerHTML = `
    <span class="eyebrow">Esta semana</span>
    ${next.length ? `<ul class="hs-meals">${next.map(e => `<li><a href="#/r/${esc(e.recipe.id)}">
        ${e.recipe.thumbnail_url ? `<img src="${esc(e.recipe.thumbnail_url)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="hs-dot">${I.fork}</span>`}
        <span><small>${dayName(e.date)} · ${SLOT_NAMES[e.slot] || ""}</small><b>${esc(e.recipe.title)}</b></span></a></li>`).join("")}</ul>`
      : `<p class="meta">Nada planeado para os próximos dias.</p>`}
    <a class="hs-link" href="#/plan">${I.calendar}${next.length ? "Ver o plano" : "Planear a semana"}</a>
    ${open.length ? `<span class="eyebrow" style="margin-top:1rem">Compras</span>${open.map(l => `<a class="hs-list" href="#/list/${esc(l.id)}">
        <span><b>${esc(l.title)}</b><small>${l.done} de ${l.total}</small></span>
        <span class="hs-bar"><i style="width:${Math.round(100 * l.done / l.total)}%"></i></span></a>`).join("")}` : ""}`;
}

function renderLibrary() {
  const n = state.recipes.length;
  largeTitle("Receitas", n ? `${n} receita${n === 1 ? " guardada" : "s guardadas"}` : "O teu livro de receitas das redes sociais");
  const cols = [...new Set(state.recipes.flatMap(r => r.collections))].sort();
  const favs = state.recipes.some(r => r.favorite);
  if (state.scope !== "all" && state.scope !== "mine" && !groupById(state.scope)) state.scope = "all";
  const scopes = [["all", "Todas"], ["mine", "Minhas"], ...groups().map(g => [g.id, g.name])];
  const cats = CATEGORIES.filter(([k, , f]) => k === "bimby" || state.recipes.some(f));
  if (state.category && !cats.some(c => c[0] === state.category)) state.category = null;
  view.innerHTML = `
    ${n ? homeHero() : ""}
    <div class="home-grid">
    ${n ? `<aside class="home-side glass" id="homeSide" aria-label="Esta semana"><span class="eyebrow">Esta semana</span><div class="spinner" aria-hidden="true"></div></aside>` : ""}
    <div class="home-main">
    ${n ? `<div class="home-head"><span class="eyebrow">Da mesa do grupo</span><h2>Adicionadas recentemente</h2></div>` : ""}
    ${groups().length ? `<div class="seg glass" role="tablist" aria-label="Mostrar">${scopes.map(([k, label]) =>
      `<button role="tab" aria-selected="${state.scope === k}" class="${state.scope === k ? "on" : ""}" data-scope="${esc(k)}">${k.length > 8 ? I.users : ""}${esc(label)}</button>`).join("")}</div>` : ""}
    ${n ? `<div class="search-wrap glass">${I.search}<input class="search" type="search" enterkeyhint="search" aria-label="Pesquisar receitas" placeholder="Pesquisar receitas ou ingredientes" value="${esc(state.query)}"></div>` : ""}
    ${cols.length || favs ? `<div class="chips" role="toolbar" aria-label="Coleções">
      <button class="chip glass ${!state.collection ? "on" : ""}" data-col="">Todas</button>
      ${favs ? `<button class="chip glass ${state.collection === "♥" ? "on" : ""}" data-col="♥">${I.heart}Favoritos</button>` : ""}
      ${cols.map(c => `<button class="chip glass ${state.collection === c ? "on" : ""}" data-col="${esc(c)}">${esc(c)}</button>`).join("")}
    </div>` : ""}
    ${n ? `<div class="chips cats" role="toolbar" aria-label="Categorias">
      <button class="chip glass ${!state.category ? "on" : ""}" data-cat="">Todas</button>
      ${cats.map(([k, label]) => `<button class="chip glass ${state.category === k ? "on" : ""} ${k === "bimby" ? "chip-bimby" : ""}" data-cat="${k}">${k === "bimby" ? BIMBY_ICON : ""}${label}</button>`).join("")}
    </div>` : ""}
    <div id="pendingList">${pendingHTML()}</div>
    <div id="results"></div>
    </div></div>`;
  renderResults();
  homeSide();
  view.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => {
    state.category = b.dataset.cat || null;
    view.querySelectorAll("[data-cat]").forEach(x => x.classList.toggle("on", x === b));
    renderResults();
  });

  // Search filters locally on every keystroke: no debounce, no round trip on the input path.
  $(".search", view)?.addEventListener("input", e => { state.query = e.target.value; renderResults(); });
  view.querySelectorAll("[data-scope]").forEach(b => b.onclick = () => {
    state.scope = b.dataset.scope; store.set("scope", state.scope);
    view.querySelectorAll("[data-scope]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
    renderResults();
  });
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
  } else if (state.category === "bimby" && !state.query) {
    el.innerHTML = `<div class="empty glass"><div class="art">${BIMBY_ICON}</div><h3>Ainda não tens receitas Bimby</h3>
      <p>Importa uma receita da Bimby (Cookidoo, blogues, TikTok ou Instagram). Reconhecemos os programas, como “5 min/100 °C/vel. 1”, a colher inversa e a Varoma, e a receita aparece aqui.</p>
      <button class="btn-primary" data-import>${I.plus}Importar receita Bimby</button></div>`;
  } else if (state.recipes.length) {
    el.innerHTML = `<div class="empty glass"><h3>Sem resultados</h3><p>Nada corresponde a “${esc(state.query || state.collection)}”. Experimenta um ingrediente, como “alho”.</p></div>`;
  } else if (!state.pending.length) {
    el.innerHTML = `<div class="empty glass"><div class="art">${I.fork}</div><h3>Guarda a tua primeira receita</h3>
      <p>Partilha um TikTok, um Reel, um vídeo do YouTube ou um artigo de blogue e recebe uma receita organizada, com ingredientes e passos.</p>
      <button class="btn-primary" data-import>${I.plus}Importar receita</button>
      <p class="meta" style="margin-top:1rem;display:block">Guarda diretamente a partir da folha de partilha: <a href="#/settings">configura o Atalho</a></p></div>`;
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
    <div class="top"><span class="tag glass-photo">${isBimby(r) ? `${BIMBY_ICON}Bimby` : esc(platformName(r.source_platform))}</span>
    <span class="badges">${r.stats?.cooks ? `<span class="badge-cook glass-photo" aria-label="Feita ${r.stats.cooks} vezes">${I.check}${r.stats.cooks}</span>` : ""}${r.favorite ? `<span class="fav glass-photo" aria-label="Favorito">${I.heart}</span>` : ""}${!r.is_owner && r.owner ? `<span class="by" title="Trazida por ${esc(r.owner.name)}">${avatar(r.owner, "sm")}</span>` : ""}</span></div>
    <div class="caption glass-photo"><h3>${esc(r.title)}</h3>
      <div class="meta">${t ? `<span>${I.clock}${fmtMin(t)}</span>` : ""}${r.facts && r.facts.price_coverage >= 0.6 && costText(r.facts.cost) ? `<span>${costText(r.facts.cost)}</span>` : r.servings ? `<span>${r.servings} ${r.servings === 1 ? "dose" : "doses"}</span>` : ""}</div>
    </div></article>`;
}

// ---------------------------------------------------------------- detail
async function renderDetail(id) {
  let r;
  try { r = await api(`/recipes/${id}`); } catch (e) { view.innerHTML = `<div class="empty glass"><p>${esc(e.message)}</p></div>`; return; }
  state.recipes = state.recipes.map(x => x.id === id ? r : x);
  const checked = new Set(store.get(`checked:${id}`, []));
  let current = r, scale = 1;
  // US recipes (cups, oz, lb) default to metric; the choice is remembered
  let units = store.get("units", null) || (r.metric?.some(Boolean) && r.ingredients.some(i => /\b(cups?|oz|lbs?|pounds?|sticks?|ounces?)\b/i.test(i.unit || "")) ? "metric" : "original");
  let social = null;

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

  const sharedLine = () => {
    const names = r.shared_group_ids.map(g => groupById(g)?.name).filter(Boolean);
    if (r.is_owner) {
      return `<button class="share-line glass" id="shareBtn">${names.length ? I.users : I.lock}
        <span>${names.length ? `Partilhada com <b>${esc(names.join(", "))}</b>` : "Só eu vejo esta receita"}</span>
        ${groups().length ? `<span class="link">${names.length ? "Alterar" : "Partilhar"}</span>` : ""}</button>`;
    }
    return `<div class="share-line glass">${avatar(r.owner, "sm")}<span>Trazida por <b>${esc(r.owner?.name || "")}</b>${names.length ? ` para <b>${esc(names.join(", "))}</b>` : ""}</span></div>`;
  };

  const socialHTML = () => {
    if (!social) return `<section class="section glass"><p class="meta">A carregar…</p></section>`;
    const mine = social.rating.mine;
    const yes = social.rating.yes, no = social.rating.no;
    return `
      <section class="section glass" id="rateSec">
        <div class="section-head"><h3>Voltava a fazer?</h3>
          ${yes.length ? `<span class="faces">${yes.slice(0, 5).map(u => avatar(u, "xs")).join("")}</span>` : ""}</div>
        <div class="rate">
          <button class="rate-btn ${mine === 1 ? "on yes" : ""}" data-rate="1" aria-pressed="${mine === 1}">${I.up}<span>Sim</span><b>${yes.length || ""}</b></button>
          <button class="rate-btn ${mine === -1 ? "on no" : ""}" data-rate="-1" aria-pressed="${mine === -1}">${I.down}<span>Não</span><b>${no.length || ""}</b></button>
        </div>
      </section>
      <section class="section glass">
        <div class="section-head"><h3>Feita pelo grupo</h3><span class="meta">${social.cooks.length ? `${social.cooks.length}×` : ""}</span></div>
        ${social.cooks.length ? `<div class="cooks">${social.cooks.map(c => `
          <figure class="cook-card">
            ${c.photo ? `<img src="${esc(c.photo)}" alt="Fotografia de ${esc(c.user?.name)}" loading="lazy">` : `<div class="cook-nophoto">${I.check}</div>`}
            <figcaption>${avatar(c.user, "xs")}<b>${esc(firstName(c.user))}</b><span>${timeAgo(c.created_at)}</span>
              ${c.user?.id === me()?.id ? `<button class="mini-del" data-del-cook="${esc(c.id)}" aria-label="Apagar registo">${I.x}</button>` : ""}</figcaption>
            ${c.note ? `<p>${esc(c.note)}</p>` : ""}
          </figure>`).join("")}</div>` : `<p class="meta">Ainda ninguém registou esta receita. Sê o primeiro!</p>`}
        <button class="btn-glass glass wide" id="cookedBtn">${I.camera}Já fiz isto</button>
      </section>
      <section class="section glass">
        <div class="section-head"><h3>Variações</h3><span class="meta">${social.variations.length || ""}</span></div>
        ${social.variations.map(v => `
          <article class="variation">
            <header>${avatar(v.user, "sm")}<div><b>${esc(v.title)}</b><span class="meta">${esc(v.user?.name)} · ${timeAgo(v.updated_at)}</span></div>
              ${v.user?.id === me()?.id ? `<button class="mini" data-edit-var="${esc(v.id)}" aria-label="Editar">${I.edit}</button>` : ""}</header>
            <p>${esc(v.body)}</p>
          </article>`).join("") || `<p class="meta">Fazes de outra maneira? Guarda a tua versão sem mexer na original.</p>`}
        <button class="btn-glass glass wide" id="addVarBtn">${I.plus}Adicionar a minha versão</button>
      </section>`;
  };

  // ---- cost & nutrition (computed from the ingredient lines; see backend costing.py)
  let facts = null;
  const loadFacts = async () => {
    try { facts = await api(`/recipes/${id}/facts`); } catch { return; }
    drawFacts();
  };
  const drawFacts = () => {
    const el = $("#factsArea"); if (!el || !facts) return;
    el.innerHTML = factsHTML(facts, current.servings || r.servings);
    const statK = view.querySelector(".stat:last-child b");
    const kcal = facts.coverage >= 0.6 ? facts.per_serving.kcal : r.nutrition_estimate?.calories;
    if (statK && kcal) statK.textContent = kcal;
    $("#factsMore", el) && ($("#factsMore", el).onclick = () => { el.querySelector(".facts-lines").hidden ^= true; $("#factsMore", el).textContent = el.querySelector(".facts-lines").hidden ? "Ver por ingrediente" : "Esconder detalhe"; });
    el.querySelectorAll("[data-fix]").forEach(b => b.onclick = () => openFixSheet(b.dataset.fix, async () => { await loadFacts(); }));
  };

  const loadSocial = async () => {
    try { social = await api(`/recipes/${id}/social`); } catch { social = { cooks: [], variations: [], rating: { yes: [], no: [], mine: 0 } }; }
    const el = $("#socialArea");
    if (el) { el.innerHTML = socialHTML(); wireSocial(); }
  };

  const wireSocial = () => {
    view.querySelectorAll("[data-rate]").forEach(b => b.onclick = async () => {
      const v = +b.dataset.rate;
      const next = social.rating.mine === v ? 0 : v;
      haptic();
      try { await api(`/recipes/${id}/rating`, { method: "PUT", body: { value: next } }); await loadSocial(); } catch (e) { toast(e.message); }
    });
    $("#cookedBtn").onclick = () => openCookSheet(r, loadSocial);
    $("#addVarBtn").onclick = () => openVariationSheet(r, null, loadSocial);
    view.querySelectorAll("[data-edit-var]").forEach(b => b.onclick = () =>
      openVariationSheet(r, social.variations.find(v => v.id === b.dataset.editVar), loadSocial));
    view.querySelectorAll("[data-del-cook]").forEach(b => b.onclick = async () => {
      await api(`/cooks/${b.dataset.delCook}`, { method: "DELETE" }); toast("Registo apagado"); loadSocial();
    });
  };

  const draw = () => {
    const groupsIng = [];
    current.ingredients.forEach((ing, i) => {
      let g = groupsIng.find(x => x.name === (ing.group || null));
      if (!g) groupsIng.push(g = { name: ing.group || null, items: [] });
      g.items.push([i, ing]);
    });
    const n = current.nutrition_estimate;
    const author = r.author || platformName(r.source_platform);
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
        <button class="btn-primary" id="cookBtn">${I.play}Cozinhar</button>
        <button class="icon-glass glass" id="cookedTop" aria-label="Já fiz isto">${I.camera}</button>
        <button class="icon-glass glass" id="planBtn" aria-label="Pôr no plano semanal">${I.calendar}</button>
        <button class="icon-glass glass" id="groBtn" aria-label="Adicionar a uma lista de compras">${I.cart}</button>
      </div>
      ${sharedLine()}
      ${r.confidence < 0.7 ? `<div class="notice glass">${I.sparkle}<span>Alguns detalhes foram estimados pela IA${r.inferred_fields.length ? ` (${esc(r.inferred_fields.join(", "))})` : ""}. Confirma antes de cozinhar.</span></div>` : ""}
      ${r.description ? `<p class="desc">${esc(r.description)}</p>` : ""}
      <section class="section glass">
        <div class="section-head"><h3>Ingredientes</h3>
          ${current.servings ? `<div class="stepper"><button data-s="-1" aria-label="Menos doses">${I.minus}</button>
            <output aria-live="polite">${current.servings} ${current.servings === 1 ? "dose" : "doses"}</output><button data-s="1" aria-label="Mais doses">${I.plus}</button></div>` : ""}
        </div>
        ${scale !== 1 && r.servings ? `<p class="scale-note">${I.sparkle}<span>Escalado de ${r.servings} para ${current.servings} ${current.servings === 1 ? "dose" : "doses"}. Os tempos de cozedura mudam menos do que as quantidades: confirma mais cedo.</span></p>`
          : scale !== 1 ? `<p class="scale-note">${I.sparkle}<span>Quantidades ×${String(scale).replace(".", ",")}. Os tempos de cozedura mudam menos do que as quantidades.</span></p>` : ""}
        <div class="ing-tools">
          <div class="mini-seg" role="group" aria-label="Escala">${[[0.5, "½×"], [1, "1×"], [2, "2×"], [3, "3×"]].map(([f, l]) =>
            `<button data-f="${f}" class="${Math.abs((scale || 1) - f) < 0.01 ? "on" : ""}" aria-pressed="${Math.abs((scale || 1) - f) < 0.01}">${l}</button>`).join("")}</div>
          ${current.metric?.some(Boolean) ? `<div class="mini-seg" role="group" aria-label="Medidas">
            <button data-units="original" class="${units === "original" ? "on" : ""}">Originais</button>
            <button data-units="metric" class="${units === "metric" ? "on" : ""}">g / ml</button></div>` : ""}
        </div>
        ${groupsIng.map(g => `${g.name ? `<div class="group">${esc(g.name)}</div>` : ""}
          ${g.items.map(([i, ing]) => `<label class="ing ${checked.has(i) ? "done" : ""}">
            <input type="checkbox" data-i="${i}" ${checked.has(i) ? "checked" : ""}>
            <span class="txt">${ingText(units === "metric" && current.metric?.[i] ? { ...ing, ...current.metric[i] } : ing)}</span></label>`).join("")}`).join("")}
      </section>
      <section class="section glass">
        <div class="section-head"><h3>Passos</h3><span class="meta">${current.steps.length} ${current.steps.length === 1 ? "passo" : "passos"}${totalTime(r) ? ` · ${fmtMin(totalTime(r))}` : ""}</span></div>
        ${current.steps.map((s, i) => `<div class="step"><span class="n">${i + 1}</span><p>${timers.linkify(s.text, r.title)}</p></div>`).join("")}
      </section>
      <div id="factsArea"></div>
      <div id="socialArea">${socialHTML()}</div>
      ${n && (n.protein_g || n.carbs_g || n.fat_g) ? `<section class="section glass"><div class="section-head"><h3>Informação nutricional</h3><span class="meta">por dose, estimativa</span></div>
        <div class="nutrition"><div><b>${n.protein_g ?? "–"}g</b><span>Proteína</span></div><div><b>${n.carbs_g ?? "–"}g</b><span>Hidratos</span></div><div><b>${n.fat_g ?? "–"}g</b><span>Gordura</span></div></div></section>` : ""}
      <section class="section glass">
        <div class="section-head"><h3>As minhas coleções</h3></div>
        <input id="colInput" placeholder="ex.: Jantar, Marmitas" value="${esc(r.collections.join(", "))}" aria-label="Coleções, separadas por vírgulas">
        ${r.tags.length ? `<div class="tags" style="margin-top:.8rem">${r.tags.map(t => `<span class="glass">#${esc(t)}</span>`).join("")}</div>` : ""}
      </section>
      ${r.is_owner ? `<button class="danger-link" id="delBtn">${I.trash}Eliminar receita</button>` : ""}
    </div>`;

    view.querySelectorAll("[data-i]").forEach(cb => cb.onchange = () => {
      const i = +cb.dataset.i; cb.checked ? checked.add(i) : checked.delete(i);
      cb.closest(".ing").classList.toggle("done", cb.checked); store.set(`checked:${id}`, [...checked]);
    });
    const rescale = async (q, f) => {
      try {
        current = f === 1 ? r : await api(`/recipes/${id}/scaled?${q}`);
        scale = f === 1 ? 1 : current.scale; const y = scrollY; draw(); scrollTo(0, y);
      } catch (e) { toast(e.message); }
    };
    view.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      const s = Math.max(1, current.servings + +b.dataset.s);
      rescale(`servings=${s}`, s === r.servings ? 1 : s / r.servings);
    });
    view.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { const f = +b.dataset.f; rescale(`factor=${f}`, f); });
    view.querySelectorAll("[data-units]").forEach(b => b.onclick = () => {
      units = b.dataset.units; store.set("units", units); const y = scrollY; draw(); scrollTo(0, y);
    });
    $("#cookBtn").onclick = () => cookMode(current, () => openCookSheet(r, loadSocial));
    $("#cookedTop").onclick = () => openCookSheet(r, loadSocial);
    $("#groBtn").onclick = () => openAddToListSheet(r, current.servings);
    $("#planBtn").onclick = () => openPlanSheet({ recipe: r, servings: current.servings });
    $("#shareBtn") && ($("#shareBtn").onclick = () => openShareSheet(r, updated => { r = { ...r, ...updated }; const y = scrollY; draw(); scrollTo(0, y); }));
    $("#colInput").onchange = async e => {
      const cols = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      r = await patch(id, { collections: cols }); toast("Coleções guardadas");
    };
    $("#delBtn") && ($("#delBtn").onclick = async () => {
      // Irreversible, so this is the one place a confirmation earns its keep.
      if (!confirm(`Eliminar “${r.title}”? Também desaparece dos grupos com que foi partilhada. Esta ação não pode ser anulada.`)) return;
      await api(`/recipes/${id}`, { method: "DELETE" });
      state.recipes = state.recipes.filter(x => x.id !== id); location.hash = "/";
    });
    if (social) wireSocial();
    drawFacts();
  };
  bar();
  draw();
  loadSocial();
  loadFacts();
  detailRefresh = { id, reload: async () => { try { r = await api(`/recipes/${id}`); current = current.servings === r.servings ? r : current; } catch { return; } loadSocial(); } };
}
let detailRefresh = null;

/** Ingredients a step mentions ("Bate as gemas com o pecorino" -> gemas de ovo, queijo pecorino). */
function stepIngredients(text, ingredients) {
  const n = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const t = ` ${n(text).replace(/[^a-z0-9 ]+/g, " ")} `;
  const stop = new Set(["de", "do", "da", "dos", "das", "com", "sem", "em", "para", "fresco", "fresca", "picado", "picada", "moida", "ralado", "q", "b"]);
  return ingredients.filter(ing => n(ing.name).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !stop.has(w))
    .some(w => t.includes(` ${w} `) || t.includes(` ${w.replace(/s$/, "")} `) || t.includes(` ${w}s `)));
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
async function cookMode(r, onFinish) {
  const steps = r.steps.length ? r.steps : [{ text: "Sem passos" }];
  let page = 0, lock = null;
  try { lock = await navigator.wakeLock?.request("screen"); } catch {}

  const el = document.createElement("div");
  el.className = "cook"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", `Modo cozinha: ${r.title}`);
  const bg = r.thumbnail_url ? `<div class="cook-bg" style="background-image:url('${esc(r.thumbnail_url)}')"></div>` : placeholder(r.id, "cook-bg");
  el.innerHTML = `${bg}
    <div class="cook-head">
      <div class="cook-title"><span class="title" id="cm-count"></span>${r.servings ? `<span class="cook-serv">${I.users}${r.servings}</span>` : ""}</div>
      ${handsFree.canListen || handsFree.canSpeak ? `<button class="hf-btn glass-photo" id="cm-hf" aria-pressed="false">${I.mic}<span>Mãos livres</span></button>` : ""}
      <button class="close glass-photo" id="cm-done" aria-label="Fechar modo cozinha">${I.x}</button></div>
    <div class="progress" aria-hidden="true"><i></i></div>
    <div class="hf-hint" id="cm-heard" aria-live="polite" hidden></div>
    <div class="pager" aria-live="polite"><div class="track">${steps.map((s, i) => {
      const used = stepIngredients(s.text, r.ingredients);
      return `<div class="page" aria-hidden="${i !== 0}"><div class="step-card glass-photo"><p class="eyebrow">Passo ${i + 1} de ${steps.length}</p><p>${timers.linkify(s.text, r.title)}</p>
        ${used.length ? `<div class="need"><span class="eyebrow">O que precisas</span><div class="need-chips">${used.map(ing => `<span>${esc(ingLine(ing))}</span>`).join("")}</div></div>` : ""}
      </div></div>`; }).join("")}</div></div>
    <div class="nav"><button class="back-btn glass-photo" id="cm-prev">Anterior</button><button class="next-btn" id="cm-next"></button></div>`;
  document.body.append(el); document.body.classList.add("sheet-open", "cooking");
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
    if (hf) { hf.stop(); hf = null; }
    ySpring.onRest = y => { if (y >= H()) { el.remove(); document.body.classList.remove("sheet-open", "cooking"); $("#app").inert = false; removeEventListener("keydown", onKey); removeEventListener("resize", onResize); } };
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

  // ---- hands-free: voice commands + steps read aloud
  let hf = null;
  const stepSpeech = i => `Passo ${i + 1}. ${steps[i].text}`;
  const heard = $("#cm-heard", el);
  const setHint = (txt, on = true) => { heard.hidden = !txt; heard.innerHTML = txt; heard.classList.toggle("listening", on); };
  const toggleHF = () => {
    const btn = $("#cm-hf", el);
    if (hf) { hf.stop(); hf = null; btn.setAttribute("aria-pressed", "false"); btn.classList.remove("on"); setHint(""); return; }
    btn.setAttribute("aria-pressed", "true"); btn.classList.add("on");
    hf = handsFree.session({
      onCommand: c => {
        haptic(6);
        if (c.type === "next") { if (page < steps.length - 1) { goTo(page + 1); hf?.say(stepSpeech(page)); } else hf?.say("Este é o último passo. Bom apetite!"); }
        else if (c.type === "prev") { goTo(page - 1); hf?.say(stepSpeech(page)); }
        else if (c.type === "repeat") hf?.say(stepSpeech(page));
        else if (c.type === "ingredients") {
          const used = stepIngredients(steps[page].text, r.ingredients);
          hf?.say(used.length ? `Neste passo precisas de: ${used.map(ingLine).join(", ")}.` : `Ingredientes: ${r.ingredients.map(ingLine).join(", ")}.`);
        }
        else if (c.type === "timer") { timers.start(c.secs, r.title); hf?.say(`Temporizador de ${c.secs >= 60 ? `${Math.round(c.secs / 60)} minutos` : `${c.secs} segundos`} iniciado.`); }
        else if (c.type === "stop") toggleHF();
        else if (c.type === "close") close();
      },
      onHeard: t => setHint(`${I.mic}<span>Ouvi: “${esc(t)}”</span>`),
      onState: on => { if (hf) setHint(on ? `${I.mic}<span>A ouvir… diz “seguinte”, “repete” ou “temporizador de 5 minutos”</span>` : `${I.mic}<span>A falar…</span>`, on); },
      onDenied: () => { toast("Sem acesso ao microfone. Os passos continuam a ser lidos em voz alta."); },
    });
    if (!handsFree.canListen) setHint(`${I.mic}<span>Este browser não reconhece voz: os passos são lidos em voz alta.</span>`, false);
    hf.say(stepSpeech(page));
  };
  $("#cm-hf", el) && ($("#cm-hf", el).onclick = toggleHF);

  const onKey = e => {
    if (e.key === "ArrowRight") goTo(page + 1);
    else if (e.key === "ArrowLeft") goTo(page - 1);
    else if (e.key === "Escape") close();
  };
  addEventListener("keydown", onKey);
  $("#cm-done", el).onclick = () => close();
  $("#cm-prev", el).onclick = () => { goTo(page - 1); hf?.say(stepSpeech(page)); };
  $("#cm-next", el).onclick = () => {
    if (page < steps.length - 1) { goTo(page + 1); hf?.say(stepSpeech(page)); return; }
    close();
    if (onFinish) toast("Bom apetite! Regista como correu.", { action: "Já fiz isto", onAction: onFinish });
  };
  const onResize = () => xSpring.set(-page * W());
  addEventListener("resize", onResize);

  sync();
  ySpring.set(H());
  ySpring.to(0);
  $("#cm-next", el).focus({ preventScroll: true });
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
    const sel = $("#importShare");
    sel.innerHTML = `<option value="">Só eu</option>` + groups().map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("");
    const pref = state.scope !== "all" && state.scope !== "mine" ? state.scope : store.get("importGroup", "");
    sel.value = groupById(pref) ? pref : "";
    $("#importShareRow").hidden = !groups().length;
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
      catch { ok = !!text; msg = "Isto não parece uma ligação. Cola o URL completo, começado por https://"; }
    }
    hint.textContent = msg; go.disabled = !ok;
    return ok;
  }
  urlIn.addEventListener("input", validate); textIn.addEventListener("input", validate);

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!validate()) return;
    const group_id = $("#importShare").value || null;
    store.set("importGroup", group_id || "");
    // Several links at once (from bookmarks or notes): one import per link, queued in order.
    const links = [...new Set(`${urlIn.value}\n${textIn.value}`.match(/https?:\/\/[^\s<>"']+/g) || [])];
    const onlyLinks = !textIn.value.replace(/https?:\/\/[^\s<>"']+/g, "").trim();
    if (links.length > 1 && onlyLinks) {
      hide();
      (async () => { for (const url of links.slice(0, 50)) { await startImport({ url, group_id }); await sleep(400); } })();
      toast(`${Math.min(links.length, 50)} ligações em fila`);
      return;
    }
    const input = { url: hint.textContent ? "" : urlIn.value, text: textIn.value, group_id };
    hide(); startImport(input);
  });
  el.querySelector("[data-close]").onclick = () => hide();
  scrim.addEventListener("click", () => hide());
  addEventListener("keydown", e => { if (open && e.key === "Escape") hide(); });
  $("#pasteBtn").onclick = async () => {
    try { urlIn.value = (await navigator.clipboard.readText()).trim(); validate(); }
    catch { hint.textContent = "A colagem foi bloqueada. Toca sem soltar no campo e escolhe Colar."; }
  };

  // Drag anywhere on the sheet (except form fields) to pull it down; it tracks 1:1,
  // rubber-bands upward, and a flick dismisses based on its projected landing point.
  let y0 = 0;
  drag(el, {
    axes: "y",
    start: e => !e.target.closest("input, textarea, button, select"),
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
function updateBadge() {
  const n = groups().reduce((a, g) => a + (g.unseen || 0), 0);
  const b = $('.tabbar [data-tab="group"] .badge');
  if (b) { b.textContent = n > 9 ? "9+" : n; b.hidden = !n; }
  // Home Screen icon badge (iOS 16.4+ web apps, Chromium)
  try { n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch {}
}
window.addEventListener("hashchange", route);
// Keep the app still: no pinch-zoom or double-tap zoom moving the bars out of place
// (iOS ignores user-scalable=no in Safari, so block the gesture events too).
["gesturestart", "gesturechange", "gestureend"].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener("touchmove", e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
// iOS Safari only applies :active (our press-down feedback) when a touchstart listener exists.
document.addEventListener("touchstart", () => {}, { passive: true });
// Scroll edge effect under the top bar, only while content is actually beneath it.
addEventListener("scroll", () => {
  const hero = document.body.classList.contains("route-detail") && $(".hero");
  const threshold = hero ? hero.offsetHeight - 110 : 4;
  document.body.classList.toggle("scrolled", scrollY > threshold);
}, { passive: true });
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && state.me) { await Promise.all([loadRecipes(), loadMe()]).catch(() => {}); if (currentRoute() === "/") renderResults(); }
});

// ---------------------------------------------------------------- themes
const THEMES = [["gohan", "Gohan", "#d7261e"], ["quente", "Cozinha quente", "#e2531d"], ["salvia", "Sálvia", "#4e7d5b"], ["rosa", "Rosa", "#c2496b"],
                ["mel", "Mel", "#c98a12"], ["azul", "Azul", "#2f6fb3"], ["meianoite", "Meia-noite", "#1b1f2a"]];
function applyTheme(t) {
  t = THEMES.some(x => x[0] === t) ? t : "gohan";
  if (t === "quente") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === "meianoite" || matchMedia("(prefers-color-scheme: dark)").matches;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || (dark ? "#120d0a" : "#f7efe6")));
}
applyTheme(store.get("theme", "gohan"));

// ---------------------------------------------------------------- boot (after social.js has loaded)
async function boot() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  // Android share target / links like /?url=... from a Shortcut or bookmarklet
  const qs = new URLSearchParams(location.search);
  const sharedUrl = qs.get("url"), sharedText = qs.get("text");
  if (sharedUrl || sharedText) history.replaceState(null, "", "/" + location.hash);
  if (store.get("session", "")) {
    try { await Promise.all([loadMe(), loadRecipes()]); connectStream(); syncPush(); }
    catch (e) { if (e.message !== "unauthorized") toast(e.message); }
  }
  route();
  if (state.me && (sharedUrl || sharedText)) startImport({ url: sharedUrl, text: sharedText });
  if (state.me && state.pending.length) pollPending();
}
addEventListener("DOMContentLoaded", boot);
