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
  if (res.status === 401) { toast("Wrong or missing API token. Set it in Settings."); throw new Error("unauthorized"); }
  if (!res.ok) {
    let msg = `Server error (${res.status})`;
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
    state.pending.unshift({ id: job.id, label: url ? shortUrl(url) : "Pasted text", status: job.status });
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
            await loadRecipes(); toast("Recipe added"); haptic(12);
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

function route() {
  const h = currentRoute();
  const dir = lastRoute === null ? 0 : Math.sign(depth(h) - depth(lastRoute));
  lastRoute = h;
  document.querySelectorAll(".tabbar button").forEach(b => {
    const on = (b.dataset.tab === "library" && (h === "/" || h.startsWith("/r/"))) || h === "/" + b.dataset.tab;
    b.classList.toggle("active", on);
    on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  if (h.startsWith("/r/")) renderDetail(h.slice(3));
  else if (h === "/groceries") renderGroceries();
  else if (h === "/settings") renderSettings();
  else renderLibrary();
  enterScreen(dir);
}

// ---------------------------------------------------------------- library
function filteredRecipes() {
  const q = state.query.trim().toLowerCase();
  return state.recipes.filter(r =>
    (!state.collection || (state.collection === "♥" ? r.favorite : r.collections.includes(state.collection))) &&
    (!q || r.title.toLowerCase().includes(q) || r.tags.some(t => t.includes(q)) ||
      (r.cuisine || "").toLowerCase().includes(q) || r.ingredients.some(i => i.name.toLowerCase().includes(q))));
}

function renderLibrary() {
  title.textContent = "Recipes";
  const cols = [...new Set(state.recipes.flatMap(r => r.collections))].sort();
  const favs = state.recipes.some(r => r.favorite);
  view.innerHTML = `
    <input class="search" type="search" enterkeyhint="search" aria-label="Search recipes" placeholder="Search recipes or ingredients" value="${esc(state.query)}">
    ${cols.length || favs ? `<div class="chips" role="toolbar" aria-label="Collections">
      <button class="chip ${!state.collection ? "on" : ""}" data-col="">All</button>
      ${favs ? `<button class="chip ${state.collection === "♥" ? "on" : ""}" data-col="♥">♥ Favorites</button>` : ""}
      ${cols.map(c => `<button class="chip ${state.collection === c ? "on" : ""}" data-col="${esc(c)}">${esc(c)}</button>`).join("")}
    </div>` : ""}
    <div id="pendingList">${pendingHTML()}</div>
    <div id="results"></div>`;
  renderResults();

  // Search filters locally on every keystroke: no debounce, no round trip on the input path.
  $(".search", view).addEventListener("input", e => { state.query = e.target.value; renderResults(); });
  view.querySelectorAll("[data-col]").forEach(b => b.onclick = () => {
    state.collection = b.dataset.col || null;
    view.querySelectorAll("[data-col]").forEach(x => x.classList.toggle("on", x === b));
    renderResults();
  });
  view.addEventListener("click", e => {
    const d = e.target.closest("[data-dismiss]");
    if (d) { state.pending = state.pending.filter(p => p.id !== d.dataset.dismiss); savePending(); $("#pendingList").innerHTML = pendingHTML(); }
  });
}

function pendingHTML() {
  return state.pending.map(p => `
    <div class="pending ${p.status === "failed" ? "failed" : ""}">
      ${p.status === "failed" ? "⚠️" : `<div class="spinner" aria-hidden="true"></div>`}
      <div style="flex:1;min-width:0"><div class="mono">${esc(p.label)}</div>
        <div class="status">${p.status === "failed" ? esc(p.error || "Import failed") : statusLabel(p.status)}</div></div>
      ${p.status === "failed" ? `<button class="plain" data-dismiss="${esc(p.id)}">Dismiss</button>` : ""}
    </div>`).join("");
}

function renderResults() {
  const list = filteredRecipes();
  const el = $("#results");
  if (!el) return;
  if (list.length) {
    el.innerHTML = `<div class="grid">${list.map(card).join("")}</div>`;
  } else if (state.recipes.length) {
    el.innerHTML = `<div class="empty"><p>No recipes match “${esc(state.query || state.collection)}”.</p></div>`;
  } else if (!state.pending.length) {
    el.innerHTML = `<div class="empty"><div class="big">🍳</div><p><b>No recipes yet</b></p>
      <p>Tap ＋ and paste a TikTok, Reel, YouTube or blog link.<br>To save straight from the share sheet,
      set up the Shortcut in <a href="#/settings">Settings</a>.</p></div>`;
  } else el.innerHTML = "";
  el.querySelectorAll(".card").forEach(c => {
    c.onclick = () => location.hash = `/r/${c.dataset.id}`;
    c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); } };
  });
}

const statusLabel = s => ({ queued: "Queued…", fetching: "Reading the post…", extracting: "Writing the recipe…" }[s] || "Working…");

function card(r) {
  const time = r.total_minutes || ((r.prep_minutes || 0) + (r.cook_minutes || 0)) || null;
  return `<article class="card" data-id="${esc(r.id)}" role="link" tabindex="0" aria-label="${esc(r.title)}">
    ${r.thumbnail_url ? `<img class="thumb" loading="lazy" referrerpolicy="no-referrer" src="${esc(r.thumbnail_url)}" alt=""
        onerror="this.outerHTML='<div class=&quot;thumb ph&quot;>🍽️</div>'">` : `<div class="thumb ph" aria-hidden="true">🍽️</div>`}
    <div class="body"><h3>${esc(r.title)}</h3>
      <div class="meta"><span class="badge">${esc(r.source_platform)}</span>${time ? `<span>⏱ ${time}m</span>` : ""}${r.favorite ? "<span aria-label='Favorite'>♥</span>" : ""}</div>
    </div></article>`;
}

// ---------------------------------------------------------------- detail
async function renderDetail(id) {
  let r = state.recipes.find(x => x.id === id);
  if (!r) { try { r = await api(`/recipes/${id}`); } catch (e) { view.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; } }
  title.innerHTML = `<button class="back" id="backBtn">‹ Recipes</button>`;
  $("#backBtn").onclick = () => (history.length > 1 ? history.back() : (location.hash = "/"));
  const checked = new Set(store.get(`checked:${id}`, []));
  let current = r;

  const draw = () => {
    const groups = [];
    current.ingredients.forEach((ing, i) => {
      let g = groups.find(x => x.name === (ing.group || null));
      if (!g) groups.push(g = { name: ing.group || null, items: [] });
      g.items.push([i, ing]);
    });
    const n = current.nutrition_estimate;
    view.innerHTML = `<div class="detail">
      ${r.thumbnail_url ? `<img class="hero" referrerpolicy="no-referrer" src="${esc(r.thumbnail_url)}" alt="" onerror="this.remove()">` : ""}
      <h2>${esc(r.title)}</h2>
      ${r.description ? `<p class="meta" style="margin:0 0 .5rem">${esc(r.description)}</p>` : ""}
      <div class="meta">
        ${r.prep_minutes ? `<span>Prep ${r.prep_minutes}m</span>` : ""}${r.cook_minutes ? `<span>Cook ${r.cook_minutes}m</span>` : ""}
        ${n?.calories ? `<span>~${n.calories} kcal/serving</span>` : ""}${r.cuisine ? `<span>${esc(r.cuisine)}</span>` : ""}
      </div>
      <p class="meta"><a href="${esc(r.source_url)}" target="_blank" rel="noopener">↗ ${esc(r.author || r.source_platform)}</a></p>
      ${r.confidence < 0.7 ? `<p class="warn">✨ Some details were estimated${r.inferred_fields.length ? ` (${esc(r.inferred_fields.join(", "))})` : ""}. Double-check before cooking.</p>` : ""}
      <div class="actions">
        <button id="cookBtn">▶ Cook Mode</button>
        <button class="secondary" id="favBtn" aria-pressed="${r.favorite}">${r.favorite ? "♥ Favorited" : "♡ Favorite"}</button>
        <button class="secondary" id="groBtn" aria-pressed="${state.grocery.includes(id)}">${state.grocery.includes(id) ? "✓ On List" : "＋ Groceries"}</button>
      </div>
      <div class="section"><p class="eyebrow">Ingredients</p>
        ${current.servings ? `<div class="stepper"><button class="secondary" data-s="-1" aria-label="Fewer servings">−</button>
          <span aria-live="polite"><b>${current.servings}</b> servings</span><button class="secondary" data-s="1" aria-label="More servings">＋</button></div>` : ""}
        ${groups.map(g => `${g.name ? `<div class="group">${esc(g.name)}</div>` : ""}
          ${g.items.map(([i, ing]) => `<label class="ing ${checked.has(i) ? "done" : ""}">
            <input type="checkbox" data-i="${i}" ${checked.has(i) ? "checked" : ""}>
            <span>${ingText(ing)}</span></label>`).join("")}`).join("")}
      </div>
      <div class="section"><p class="eyebrow">Steps</p>
        ${current.steps.map((s, i) => `<div class="step"><b>${i + 1}</b><div>${esc(s.text)}</div></div>`).join("")}
      </div>
      ${r.tags.length ? `<p class="meta">${r.tags.map(t => `<span class="badge">#${esc(t)}</span>`).join("")}</p>` : ""}
      <div class="section"><p class="eyebrow">Collections</p>
        <input id="colInput" placeholder="e.g. Dinner, Meal prep" value="${esc(r.collections.join(", "))}" aria-label="Collections, comma separated">
      </div>
      <div class="actions"><button class="secondary" id="shareBtn">Share</button>
        <button class="danger" id="delBtn">Delete</button></div>
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
    $("#favBtn").onclick = async () => { r = await patch(id, { favorite: !r.favorite }); current = { ...current, favorite: r.favorite }; const y = scrollY; draw(); scrollTo(0, y); };
    $("#groBtn").onclick = () => {
      state.grocery = state.grocery.includes(id) ? state.grocery.filter(x => x !== id) : [...state.grocery, id];
      store.set("grocery", state.grocery); const y = scrollY; draw(); scrollTo(0, y);
    };
    $("#colInput").onchange = async e => {
      const cols = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      r = await patch(id, { collections: cols }); toast("Collections saved");
    };
    $("#shareBtn").onclick = () => navigator.share
      ? navigator.share({ title: r.title, text: shareText(current), url: r.source_url }).catch(() => {})
      : navigator.clipboard.writeText(shareText(current)).then(() => toast("Copied recipe"));
    $("#delBtn").onclick = async () => {
      // Irreversible, so this is the one place a confirmation earns its keep.
      if (!confirm(`Delete “${r.title}”? This can't be undone.`)) return;
      await api(`/recipes/${id}`, { method: "DELETE" });
      state.recipes = state.recipes.filter(x => x.id !== id); location.hash = "/";
    };
  };
  draw();
}

const ingText = i => `${i.quantity || i.unit ? `<b>${esc([i.quantity, i.unit].filter(Boolean).join(" "))}</b> ` : ""}${esc(i.name)}${i.note ? `<span style="color:var(--muted)">, ${esc(i.note)}</span>` : ""}`;
const shareText = r => `${r.title}\n\nIngredients:\n${r.ingredients.map(i => "• " + [i.quantity, i.unit, i.name].filter(Boolean).join(" ")).join("\n")}\n\nSteps:\n${r.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n")}\n\nSource: ${r.source_url}`;

async function patch(id, body) {
  const updated = await api(`/recipes/${id}`, { method: "PATCH", body });
  state.recipes = state.recipes.map(x => x.id === id ? updated : x);
  return updated;
}

// ---------------------------------------------------------------- cook mode
/** Full-screen sheet that rises from the bottom. Swipe sideways between steps (momentum
    picks the page), pull down to dismiss. Both gestures are interruptible springs. */
async function cookMode(r) {
  const steps = r.steps.length ? r.steps : [{ text: "No steps" }];
  let page = 0, lock = null;
  try { lock = await navigator.wakeLock?.request("screen"); } catch {}

  const el = document.createElement("div");
  el.className = "cook"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", `Cook mode: ${r.title}`);
  el.innerHTML = `<div class="cook-head"><span class="meta" id="cm-count"></span><button class="plain strong" id="cm-done">Done</button></div>
    <div class="pager" aria-live="polite"><div class="track">${steps.map((s, i) =>
      `<div class="page" aria-hidden="${i !== 0}"><div><div class="eyebrow">Step ${i + 1}</div>${esc(s.text)}</div></div>`).join("")}</div></div>
    <div class="dots" aria-hidden="true">${steps.map(() => "<i></i>").join("")}</div>
    <div class="nav"><button class="secondary" id="cm-prev">Back</button><button id="cm-next"></button></div>`;
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
    $("#cm-count", el).textContent = `Step ${page + 1} of ${steps.length}`;
    el.querySelectorAll(".dots i").forEach((d, i) => d.classList.toggle("on", i === page));
    el.querySelectorAll(".page").forEach((p, i) => p.setAttribute("aria-hidden", String(i !== page)));
    $("#cm-prev", el).disabled = page === 0;
    $("#cm-next", el).textContent = page === steps.length - 1 ? "Finish" : "Next";
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
  title.textContent = "Groceries";
  if (!state.grocery.length) {
    view.innerHTML = `<div class="empty"><div class="big">🛒</div><p>Open a recipe and tap <b>＋ Groceries</b>.</p></div>`; return;
  }
  view.innerHTML = `<p class="meta">Loading…</p>`;
  let items = [];
  try { items = await api(`/grocery-list?ids=${encodeURIComponent(state.grocery.join(","))}`); } catch (e) { toast(e.message); }
  const done = new Set(state.groceryDone);
  const key = it => `${it.name}|${it.unit || ""}`;
  view.innerHTML = `<div class="section">${items.map(it => `<label class="ing ${done.has(key(it)) ? "done" : ""}">
      <input type="checkbox" data-k="${esc(key(it))}" ${done.has(key(it)) ? "checked" : ""}>
      <span>${it.quantities.length ? `<b>${esc(it.quantities.join(" + "))}${it.unit ? " " + esc(it.unit) : ""}</b> ` : ""}${esc(it.name)}
      <br><small class="caption">${esc(it.recipes.join(", "))}</small></span></label>`).join("")}</div>
    <div class="actions"><button class="secondary" id="copyList">Copy List</button><button class="secondary" id="clearList">Clear</button></div>`;
  view.querySelectorAll("[data-k]").forEach(cb => cb.onchange = () => {
    cb.checked ? done.add(cb.dataset.k) : done.delete(cb.dataset.k);
    cb.closest(".ing").classList.toggle("done", cb.checked); store.set("groceryDone", [...done]);
  });
  $("#copyList").onclick = () => navigator.clipboard.writeText(items.filter(it => !done.has(key(it)))
    .map(it => `• ${[it.quantities.join(" + "), it.unit, it.name].filter(Boolean).join(" ")}`).join("\n")).then(() => toast("Copied"));
  $("#clearList").onclick = () => {
    // Undo instead of a confirmation dialog: forgiving, and doesn't train people to click through.
    const prev = [state.grocery, state.groceryDone];
    state.grocery = []; state.groceryDone = []; store.set("grocery", []); store.set("groceryDone", []); renderGroceries();
    toast("List cleared", { action: "Undo", onAction: () => {
      [state.grocery, state.groceryDone] = prev; store.set("grocery", prev[0]); store.set("groceryDone", prev[1]); renderGroceries();
    } });
  };
}

function renderSettings() {
  title.textContent = "Settings";
  const origin = location.origin;
  view.innerHTML = `
    <div class="section"><p class="eyebrow">API Token</p>
      <p class="meta">Only needed if the server sets <code>API_TOKEN</code>. It's saved on this device.</p>
      <div class="row"><input id="tok" type="password" value="${esc(store.get("token", ""))}" placeholder="Token" aria-label="API token">
        <button id="saveTok">Save</button></div>
    </div>
    <div class="section"><p class="eyebrow">Install on iPhone</p>
      <ol class="howto">
        <li>Open <code>${esc(origin)}</code> in <b>Safari</b>.</li>
        <li>Tap <b>Share</b> → <b>Add to Home Screen</b>.</li>
      </ol>
    </div>
    <div class="section"><p class="eyebrow">Save from the Share Sheet (iOS Shortcut)</p>
      <p class="meta">iOS doesn't let web apps appear in the share sheet. A Shortcut can do it instead, and it only takes a minute to set up:</p>
      <ol class="howto">
        <li>Open the <b>Shortcuts</b> app → <b>＋</b> → name it <b>Save to RecipeBox</b>.</li>
        <li>Tap the <b>ⓘ</b> → turn on <b>Show in Share Sheet</b>, and set it to receive <b>URLs</b> and <b>Text</b>.</li>
        <li>Add the action <b>Get Contents of URL</b>:
          <ul>
            <li>URL: <code>${esc(origin)}/imports/shortcut</code></li>
            <li>Method: <b>POST</b>, Request Body: <b>JSON</b></li>
            <li>Add field <code>input</code> (Text) = <b>Shortcut Input</b></li>
            ${store.get("token", "") ? `<li>Header <code>Authorization</code> = <code>Bearer &lt;your token&gt;</code></li>` : ""}
          </ul></li>
        <li>Add the action <b>Show Notification</b> with text <b>Contents of URL</b>.</li>
      </ol>
      <p class="meta">Now in TikTok, Instagram or YouTube, tap Share → <b>Save to RecipeBox</b>. The recipe appears here a few seconds later.</p>
    </div>
    <div class="section"><p class="eyebrow">Android</p><p class="meta">Install from Chrome's menu (<b>Add to Home screen</b>). RecipeBox then shows up in the share sheet directly.</p></div>`;
  $("#saveTok").onclick = async () => {
    store.set("token", $("#tok").value.trim()); toast("Saved");
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
  toastEl.innerHTML = esc(msg) + (action ? ` <button class="plain strong" style="color:inherit;min-height:0;padding:0 0 0 .5rem">${esc(action)}</button>` : "");
  toastEl.style.pointerEvents = action ? "auto" : "none";
  if (action) $("button", toastEl).onclick = () => { onAction(); toastSpring.to(0); };
  toastSpring.to(1);
  clearTimeout(toastT); toastT = setTimeout(() => toastSpring.to(0), action ? 4500 : 2400);
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
      catch { ok = !!text; msg = "That doesn't look like a link. Paste the full URL starting with https://"; }
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
    catch { hint.textContent = "Paste was blocked. Long-press the field and choose Paste."; }
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
addEventListener("scroll", () => document.body.classList.toggle("scrolled", scrollY > 4), { passive: true });
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
