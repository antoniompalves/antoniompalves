"use strict";
// RecipeBox web app: vanilla JS, no build step. Talks to the same API as the iOS app.

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

async function loadRecipes() {
  const p = new URLSearchParams();
  if (state.query) p.set("q", state.query);
  state.recipes = await api(`/recipes?${p}`);
}

// --------------------------------------------------------------- imports
async function startImport({ url, text }) {
  url = (url || "").trim(); text = (text || "").trim();
  if (!url && text) {
    // Apps often share "Look at this! https://vm.tiktok.com/xyz", so pull the link out.
    const m = text.match(/https?:\/\/\S+/);
    if (m && text.length < 300) { url = m[0]; text = ""; }
  }
  if (!url && !text) return;
  try {
    const job = await api("/imports", { method: "POST", body: url ? { url } : { text } });
    state.pending.unshift({ id: job.id, label: url ? shortUrl(url) : "Pasted text", status: job.status });
    savePending(); toast("Importing… you can keep browsing.");
    render(); pollPending();
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
            await loadRecipes(); toast("Recipe added ✓");
          } else if (j.status === "failed") p.error = j.error;
        } catch (e) { if (e.message === "unauthorized") return; }
      }
      savePending();
      if (changed) render();
    }
  } finally { polling = false; }
}
const savePending = () => store.set("pending", state.pending);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shortUrl = u => { try { const x = new URL(u); return x.hostname.replace(/^www\./, "") + x.pathname.slice(0, 24); } catch { return u; } };

// ---------------------------------------------------------------- views
const view = $("#view"), title = $("#title");

function route() {
  const h = location.hash.slice(1) || "/";
  document.querySelectorAll(".tabbar button").forEach(b =>
    b.classList.toggle("active", (b.dataset.tab === "library" && (h === "/" || h.startsWith("/r/"))) || h === "/" + b.dataset.tab));
  if (h.startsWith("/r/")) return renderDetail(h.slice(3));
  if (h === "/groceries") return renderGroceries();
  if (h === "/settings") return renderSettings();
  return renderLibrary();
}
const render = route;

function renderLibrary() {
  title.textContent = "Recipes";
  const cols = [...new Set(state.recipes.flatMap(r => r.collections))].sort();
  const favs = state.recipes.some(r => r.favorite);
  const list = state.recipes.filter(r =>
    !state.collection || (state.collection === "♥" ? r.favorite : r.collections.includes(state.collection)));

  view.innerHTML = `
    <input class="search" type="search" placeholder="Search recipes or ingredients" value="${esc(state.query)}">
    ${cols.length || favs ? `<div class="chips">
      <button class="chip ${!state.collection ? "on" : ""}" data-col="">All</button>
      ${favs ? `<button class="chip ${state.collection === "♥" ? "on" : ""}" data-col="♥">♥ Favorites</button>` : ""}
      ${cols.map(c => `<button class="chip ${state.collection === c ? "on" : ""}" data-col="${esc(c)}">${esc(c)}</button>`).join("")}
    </div>` : ""}
    ${state.pending.map(p => `
      <div class="pending ${p.status === "failed" ? "failed" : ""}">
        ${p.status === "failed" ? "⚠️" : `<div class="spinner"></div>`}
        <div style="flex:1;min-width:0"><div class="mono">${esc(p.label)}</div>
          <div>${p.status === "failed" ? esc(p.error || "Import failed") : statusLabel(p.status)}</div></div>
        ${p.status === "failed" ? `<button class="link" data-dismiss="${esc(p.id)}">Dismiss</button>` : ""}
      </div>`).join("")}
    ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` :
      !state.pending.length ? `<div class="empty"><div class="big">🍳</div>
        <p><b>No recipes yet</b></p><p>Tap ＋ and paste a TikTok, Reel, YouTube or blog link.<br>
        To save straight from the share sheet, set up the Shortcut in <a href="#/settings">Settings</a>.</p></div>` : ""}`;

  const search = $(".search", view);
  let t; search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(async () => {
    state.query = search.value; await loadRecipes().catch(e => toast(e.message));
    renderLibrary(); const s = $(".search", view); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
  }, 300); });
  view.querySelectorAll("[data-col]").forEach(b => b.onclick = () => { state.collection = b.dataset.col || null; renderLibrary(); });
  view.querySelectorAll("[data-dismiss]").forEach(b => b.onclick = () => {
    state.pending = state.pending.filter(p => p.id !== b.dataset.dismiss); savePending(); renderLibrary(); });
  view.querySelectorAll(".card").forEach(c => c.onclick = () => location.hash = `/r/${c.dataset.id}`);
}

const statusLabel = s => ({ queued: "Queued…", fetching: "Reading the post…", extracting: "Writing the recipe…" }[s] || "Working…");

function card(r) {
  const time = r.total_minutes || ((r.prep_minutes || 0) + (r.cook_minutes || 0)) || null;
  return `<article class="card" data-id="${esc(r.id)}">
    ${r.thumbnail_url ? `<img class="thumb" loading="lazy" referrerpolicy="no-referrer" src="${esc(r.thumbnail_url)}" alt=""
        onerror="this.outerHTML='<div class=&quot;thumb ph&quot;>🍽️</div>'">` : `<div class="thumb ph">🍽️</div>`}
    <div class="body"><h3>${esc(r.title)}</h3>
      <div class="meta"><span class="badge">${esc(r.source_platform)}</span>${time ? `<span>⏱ ${time}m</span>` : ""}${r.favorite ? "<span>♥</span>" : ""}</div>
    </div></article>`;
}

async function renderDetail(id) {
  let r = state.recipes.find(x => x.id === id);
  if (!r) { try { r = await api(`/recipes/${id}`); } catch (e) { view.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; } }
  title.innerHTML = `<button class="back" onclick="history.length > 1 ? history.back() : (location.hash='/')">‹ Recipes</button>`;
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
      ${r.description ? `<p style="color:var(--muted);margin:0 0 8px">${esc(r.description)}</p>` : ""}
      <div class="meta">
        ${r.prep_minutes ? `<span>Prep ${r.prep_minutes}m</span>` : ""}${r.cook_minutes ? `<span>Cook ${r.cook_minutes}m</span>` : ""}
        ${n?.calories ? `<span>~${n.calories} kcal/serving</span>` : ""}${r.cuisine ? `<span>${esc(r.cuisine)}</span>` : ""}
      </div>
      <p class="meta"><a href="${esc(r.source_url)}" target="_blank" rel="noopener">↗ ${esc(r.author || r.source_platform)}</a></p>
      ${r.confidence < 0.7 ? `<p class="warn">✨ Some details were estimated${r.inferred_fields.length ? ` (${esc(r.inferred_fields.join(", "))})` : ""}. Double-check before cooking.</p>` : ""}
      <div class="actions">
        <button id="cookBtn">▶ Cook mode</button>
        <button class="secondary" id="favBtn">${r.favorite ? "♥ Saved" : "♡ Favorite"}</button>
        <button class="secondary" id="groBtn">${state.grocery.includes(id) ? "✓ In list" : "＋ Groceries"}</button>
      </div>
      <div class="section"><h4>Ingredients</h4>
        ${current.servings ? `<div class="stepper"><button class="secondary" data-s="-1">−</button>
          <span><b>${current.servings}</b> servings</span><button class="secondary" data-s="1">＋</button></div>` : ""}
        ${groups.map(g => `${g.name ? `<div class="group">${esc(g.name)}</div>` : ""}
          ${g.items.map(([i, ing]) => `<label class="ing ${checked.has(i) ? "done" : ""}">
            <input type="checkbox" data-i="${i}" ${checked.has(i) ? "checked" : ""}>
            <span>${ingText(ing)}</span></label>`).join("")}`).join("")}
      </div>
      <div class="section"><h4>Steps</h4>
        ${current.steps.map((s, i) => `<div class="step"><b>${i + 1}</b><div>${esc(s.text)}</div></div>`).join("")}
      </div>
      ${r.tags.length ? `<p class="meta">${r.tags.map(t => `<span class="badge">#${esc(t)}</span>`).join("")}</p>` : ""}
      <div class="section"><h4>Collections</h4>
        <input id="colInput" placeholder="e.g. Dinner, Meal prep" value="${esc(r.collections.join(", "))}">
      </div>
      <div class="actions"><button class="secondary" id="shareBtn">Share</button>
        <button class="secondary" id="delBtn" style="color:#dc2626">Delete</button></div>
    </div>`;

    view.querySelectorAll("[data-i]").forEach(cb => cb.onchange = () => {
      const i = +cb.dataset.i; cb.checked ? checked.add(i) : checked.delete(i);
      cb.closest(".ing").classList.toggle("done", cb.checked); store.set(`checked:${id}`, [...checked]);
    });
    view.querySelectorAll("[data-s]").forEach(b => b.onclick = async () => {
      const s = Math.max(1, current.servings + +b.dataset.s);
      try { current = s === r.servings ? r : await api(`/recipes/${id}/scaled?servings=${s}`); draw(); } catch (e) { toast(e.message); }
    });
    $("#cookBtn").onclick = () => cookMode(current);
    $("#favBtn").onclick = async () => { r = await patch(id, { favorite: !r.favorite }); current = { ...current, favorite: r.favorite }; draw(); };
    $("#groBtn").onclick = () => {
      state.grocery = state.grocery.includes(id) ? state.grocery.filter(x => x !== id) : [...state.grocery, id];
      store.set("grocery", state.grocery); draw();
    };
    $("#colInput").onchange = async e => {
      const cols = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      r = await patch(id, { collections: cols }); toast("Collections saved");
    };
    $("#shareBtn").onclick = () => navigator.share
      ? navigator.share({ title: r.title, text: shareText(current), url: r.source_url }).catch(() => {})
      : navigator.clipboard.writeText(shareText(current)).then(() => toast("Copied recipe"));
    $("#delBtn").onclick = async () => {
      if (!confirm(`Delete “${r.title}”?`)) return;
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

async function cookMode(r) {
  let i = 0, lock = null;
  try { lock = await navigator.wakeLock?.request("screen"); } catch {}
  const el = document.createElement("div"); el.className = "cook"; document.body.append(el);
  const close = () => { lock?.release?.(); el.remove(); };
  const draw = () => {
    el.innerHTML = `<div class="row" style="justify-content:space-between;align-items:center">
        <span class="meta">Step ${i + 1} of ${r.steps.length}</span><button class="secondary" id="cx">Done</button></div>
      <div class="txt">${esc(r.steps[i]?.text || "No steps")}</div>
      <div class="nav"><button class="secondary" id="pv" ${i === 0 ? "disabled" : ""}>‹ Back</button>
        <button id="nx">${i === r.steps.length - 1 ? "Finish" : "Next ›"}</button></div>`;
    $("#cx", el).onclick = close;
    $("#pv", el).onclick = () => { i = Math.max(0, i - 1); draw(); };
    $("#nx", el).onclick = () => { if (i >= r.steps.length - 1) close(); else { i++; draw(); } };
  };
  let x0 = null;
  el.addEventListener("touchstart", e => x0 = e.touches[0].clientX, { passive: true });
  el.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 60) { i = Math.min(r.steps.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))); draw(); } x0 = null; });
  draw();
}

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
      <br><small style="color:var(--muted)">${esc(it.recipes.join(", "))}</small></span></label>`).join("")}</div>
    <div class="actions"><button class="secondary" id="copyList">Copy list</button><button class="secondary" id="clearList">Clear</button></div>`;
  view.querySelectorAll("[data-k]").forEach(cb => cb.onchange = () => {
    cb.checked ? done.add(cb.dataset.k) : done.delete(cb.dataset.k);
    cb.closest(".ing").classList.toggle("done", cb.checked); store.set("groceryDone", [...done]);
  });
  $("#copyList").onclick = () => navigator.clipboard.writeText(items.filter(it => !done.has(key(it)))
    .map(it => `• ${[it.quantities.join(" + "), it.unit, it.name].filter(Boolean).join(" ")}`).join("\n")).then(() => toast("Copied"));
  $("#clearList").onclick = () => { state.grocery = []; state.groceryDone = []; store.set("grocery", []); store.set("groceryDone", []); renderGroceries(); };
}

function renderSettings() {
  title.textContent = "Settings";
  const origin = location.origin;
  view.innerHTML = `
    <div class="section"><h4>API token</h4>
      <p class="meta">Only needed if the server sets <code>API_TOKEN</code>. It's saved on this device.</p>
      <div class="row"><input id="tok" type="password" value="${esc(store.get("token", ""))}" placeholder="token">
        <button id="saveTok">Save</button></div>
    </div>
    <div class="section"><h4>Install on iPhone</h4>
      <ol class="howto">
        <li>Open <code>${esc(origin)}</code> in <b>Safari</b>.</li>
        <li>Tap <b>Share</b> → <b>Add to Home Screen</b>.</li>
      </ol>
    </div>
    <div class="section"><h4>Save from the share sheet (iOS Shortcut)</h4>
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
    <div class="section"><h4>Android</h4><p class="meta">Install from Chrome's menu (<b>Add to Home screen</b>). RecipeBox then shows up in the share sheet directly.</p></div>`;
  $("#saveTok").onclick = async () => {
    store.set("token", $("#tok").value.trim()); toast("Saved");
    await loadRecipes().catch(() => {}); renderSettings();
  };
}

// ---------------------------------------------------------------- toast/dialog
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600); }

const dlg = $("#importDialog");
$("#addBtn").onclick = () => { $("#importUrl").value = ""; $("#importText").value = ""; dlg.showModal(); };
$("#pasteBtn").onclick = async () => { try { $("#importUrl").value = (await navigator.clipboard.readText()).trim(); } catch { toast("Paste blocked. Long-press the field instead."); } };
dlg.addEventListener("close", () => {
  if (dlg.returnValue === "ok") startImport({ url: $("#importUrl").value, text: $("#importText").value });
});
document.querySelectorAll(".tabbar button").forEach(b => b.onclick = () => location.hash = b.dataset.tab === "library" ? "/" : "/" + b.dataset.tab);
window.addEventListener("hashchange", route);
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") { await loadRecipes().catch(() => {}); if ((location.hash || "#/") === "#/") render(); }
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
  render();
  if (state.pending.length) pollPending();
})();
