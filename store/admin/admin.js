(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const eur = n => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(+n);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = iso => new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });
  const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  const LABEL = { all: "Todas", pending: "Pendente", confirmed: "Confirmada", shipped: "Enviada", delivered: "Entregue", cancelled: "Cancelada", storefront: "loja", backoffice: "backoffice", admin: "admin" };
  const L = k => LABEL[k] || k;
  const { PRODUCTS, CATEGORIES, unitPrice, bulkRate } = window;

  let token = "";
  try { token = sessionStorage.getItem("forge-admin") || ""; } catch {}
  let orders = [], selected = null, statusFilter = "all", query = "";

  let tt;
  const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2000); };

  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, ...(opts.headers || {}) } });
    if (r.status === 401 && path !== "/api/login") { signOut(); throw new Error("A sessão expirou, inicie sessão novamente"); }
    const d = r.headers.get("content-type")?.includes("json") ? await r.json() : await r.text();
    if (!r.ok) throw new Error(d.error || "O pedido falhou");
    return d;
  }

  // ---------- auth ----------
  function setToken(t) { token = t; try { t ? sessionStorage.setItem("forge-admin", t) : sessionStorage.removeItem("forge-admin"); } catch {} }
  function signOut() { setToken(""); $("#app").hidden = true; $("#login").hidden = false; }
  $("#loginForm").onsubmit = async e => {
    e.preventDefault(); $("#loginErr").textContent = "";
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: e.target.password.value }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setToken(d.token); e.target.reset(); start();
    } catch (err) { $("#loginErr").textContent = err.message; }
  };
  $("#logout").onclick = async () => { try { await api("/api/logout", { method: "POST" }); } catch {} signOut(); };

  async function start() {
    $("#login").hidden = true; $("#app").hidden = false;
    await load();
  }

  // ---------- views ----------
  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => {
    document.querySelectorAll("[data-view]").forEach(x => x.classList.toggle("on", x === b));
    $("#view-orders").hidden = b.dataset.view !== "orders";
    $("#view-new").hidden = b.dataset.view !== "new";
  });

  // ---------- orders list ----------
  async function load() {
    try { orders = await api("/api/orders"); render(); } catch (e) { toast(e.message); }
  }
  $("#refresh").onclick = () => load().then(() => toast("Atualizado"));
  $("#q").oninput = e => { query = e.target.value.toLowerCase(); renderRows(); };

  function render() { renderStats(); renderChips(); renderRows(); renderPanel(); }
  function renderStats() {
    const active = orders.filter(o => o.status !== "cancelled");
    const count = s => orders.filter(o => o.status === s).length;
    const today = new Date().toDateString();
    $("#stats").innerHTML = [
      ["Pendentes", count("pending"), "hl"], ["Confirmadas", count("confirmed")], ["Hoje", orders.filter(o => new Date(o.createdAt).toDateString() === today).length],
      ["Total de pré-encomendas", orders.length], ["Valor (excl. canceladas)", eur(active.reduce((s, o) => s + o.total, 0))],
    ].map(([l, v, c]) => `<div class="stat ${c || ""}"><small>${l}</small><b>${v}</b></div>`).join("");
  }
  function renderChips() {
    $("#statusChips").innerHTML = ["all", ...STATUSES].map(s =>
      `<button class="chip ${statusFilter === s ? "on" : ""}" data-s="${s}">${L(s)} ${s === "all" ? orders.length : orders.filter(o => o.status === s).length}</button>`).join("");
  }
  $("#statusChips").onclick = e => { const b = e.target.closest("[data-s]"); if (b) { statusFilter = b.dataset.s; renderChips(); renderRows(); } };

  function filtered() {
    return orders.filter(o => (statusFilter === "all" || o.status === statusFilter) && (!query ||
      [o.number, o.customer.name, o.customer.email, o.customer.phone, ...o.items.map(i => i.name)].join(" ").toLowerCase().includes(query)));
  }
  function renderRows() {
    const list = filtered();
    $("#empty").hidden = !!list.length;
    $("#empty").textContent = orders.length ? "Nenhuma encomenda corresponde a este filtro." : "Ainda não há pré-encomendas.";
    $("#rows").innerHTML = list.map(o => `
      <tr data-id="${o.id}" class="${selected === o.id ? "sel" : ""}">
        <td><b>${esc(o.number)}</b>${o.source === "backoffice" ? '<span class="src">manual</span>' : ""}</td>
        <td>${fmtDate(o.createdAt)}</td>
        <td>${esc(o.customer.name)}<small>${esc(o.customer.email)}</small></td>
        <td>${o.items.reduce((s, i) => s + i.qty, 0)} unid.<small>${esc(o.items.map(i => i.name).slice(0, 2).join(", "))}${o.items.length > 2 ? "…" : ""}</small></td>
        <td class="r"><b>${eur(o.total)}</b></td>
        <td><span class="badge s-${o.status}">${L(o.status)}</span></td>
      </tr>`).join("");
  }
  $("#rows").onclick = e => { const tr = e.target.closest("tr[data-id]"); if (tr) { selected = tr.dataset.id; renderRows(); renderPanel(); } };

  // ---------- detail panel ----------
  function renderPanel() {
    const o = orders.find(x => x.id === selected), panel = $("#panel");
    panel.hidden = !o; $(".layout").classList.toggle("with-panel", !!o);
    if (!o) return;
    const c = o.customer;
    panel.innerHTML = `
      <div class="panel-head"><div><h3>${esc(o.number)}</h3><small class="muted">${fmtDate(o.createdAt)} · ${L(o.source)}</small></div>
        <button class="ghost" id="closePanel">✕</button></div>
      <div><h4>Estado</h4><select id="statusSel">${STATUSES.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${L(s)}</option>`).join("")}</select></div>
      <div><h4>Cliente</h4><p><b>${esc(c.name)}</b><br><a href="mailto:${esc(c.email)}">${esc(c.email)}</a>${c.phone ? "<br>" + esc(c.phone) : ""}</p>
        ${c.address || c.city ? `<p>${esc(c.address)}<br>${esc(c.postcode)} ${esc(c.city)}<br>${esc(c.country)}</p>` : ""}</div>
      <div><h4>Artigos</h4>${o.items.map(i => `<div class="li"><span>${i.qty} × ${esc(i.name)}<br><small class="muted">${esc(i.sub)} · ${eur(i.unit)}${i.discount ? ` · −${eur(i.discount)} quantidade` : ""}</small></span><b>${eur(i.total)}</b></div>`).join("")}
        <div class="tot"><span>Subtotal</span><span>${eur(o.subtotal)}</span></div>
        <div class="tot"><span>Desconto por quantidade</span><span>−${eur(o.discount)}</span></div>
        <div class="tot big"><span>Total</span><span>${eur(o.total)}</span></div></div>
      ${o.notes ? `<div><h4>Observações do cliente</h4><p>${esc(o.notes)}</p></div>` : ""}
      <div><h4>Nota interna</h4><textarea id="internalNote" rows="3" placeholder="Visível apenas no backoffice">${esc(o.internalNote || "")}</textarea>
        <button class="btn sm" id="saveNote" style="margin-top:8px">Guardar nota</button></div>
      <div class="hist"><h4>Histórico</h4>${o.history.map(h => `<div>${fmtDate(h.at)} — <b>${L(h.status)}</b> (${L(h.by)})</div>`).join("")}</div>
      <button class="danger" id="delOrder">Eliminar encomenda</button>`;
    $("#closePanel").onclick = () => { selected = null; renderRows(); renderPanel(); };
    $("#statusSel").onchange = e => patch(o.id, { status: e.target.value }, "Estado atualizado");
    $("#saveNote").onclick = () => patch(o.id, { internalNote: $("#internalNote").value }, "Nota guardada");
    $("#delOrder").onclick = async () => {
      if (!confirm(`Eliminar ${o.number}? Esta ação não pode ser anulada.`)) return;
      try { await api("/api/orders/" + o.id, { method: "DELETE" }); orders = orders.filter(x => x.id !== o.id); selected = null; render(); toast("Encomenda eliminada"); } catch (e) { toast(e.message); }
    };
  }
  async function patch(id, body, msg) {
    try {
      const upd = await api("/api/orders/" + id, { method: "PATCH", body: JSON.stringify(body) });
      orders = orders.map(o => o.id === id ? upd : o); render(); toast(msg);
    } catch (e) { toast(e.message); }
  }

  $("#exportCsv").onclick = async () => {
    try {
      const csv = await api("/api/orders.csv");
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "pre-encomendas.csv" });
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { toast(e.message); }
  };

  // ---------- register order manually ----------
  const lines = {};
  $("#prodSel").innerHTML = CATEGORIES.map(c => `<optgroup label="${esc(c.name)}">${PRODUCTS.filter(p => p.cat === c.id)
    .map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(p.sub)} (${eur(unitPrice(p))})</option>`).join("")}</optgroup>`).join("");
  $("#addLine").onclick = () => {
    const id = $("#prodSel").value, q = Math.max(1, Math.min(999, parseInt($("#prodQty").value) || 1));
    lines[id] = (lines[id] || 0) + q; $("#prodQty").value = 1; renderLines();
  };
  function renderLines() {
    let sub = 0, disc = 0;
    $("#lines").innerHTML = Object.entries(lines).map(([id, q]) => {
      const p = PRODUCTS.find(x => x.id === id), g = unitPrice(p) * q, d = g * bulkRate(q);
      sub += g; disc += d;
      return `<tr><td>${q} × ${esc(p.name)}<small class="muted"> ${esc(p.sub)}</small></td><td class="r">${eur(g - d)}</td><td><button type="button" data-rm="${id}">✕</button></td></tr>`;
    }).join("") || `<tr><td class="muted">Ainda não foram adicionados artigos.</td></tr>`;
    $("#sum").innerHTML = `<div><span>Subtotal</span><span>${eur(sub)}</span></div><div><span>Desconto por quantidade</span><span>−${eur(disc)}</span></div><div class="big"><span>Total</span><span>${eur(sub - disc)}</span></div>`;
  }
  $("#lines").onclick = e => { const b = e.target.closest("[data-rm]"); if (b) { delete lines[b.dataset.rm]; renderLines(); } };
  $("#newForm").onsubmit = async e => {
    e.preventDefault(); $("#newErr").textContent = "";
    const f = Object.fromEntries(new FormData(e.target));
    try {
      const o = await api("/api/orders", { method: "POST", body: JSON.stringify({ customer: f, notes: f.notes, items: Object.entries(lines).map(([id, qty]) => ({ id, qty })) }) });
      Object.keys(lines).forEach(k => delete lines[k]); e.target.reset(); renderLines();
      orders.unshift(o); selected = o.id; render();
      document.querySelector('[data-view="orders"]').click();
      toast(`${o.number} registada`);
    } catch (err) { $("#newErr").textContent = err.message; }
  };
  renderLines();

  if (token) start();
})();
