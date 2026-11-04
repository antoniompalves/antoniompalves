(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const eur = n => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(+n);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = iso => new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });
  const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  const LABEL = { all: "Todas", pending: "Pendente", confirmed: "Confirmada", shipped: "Enviada", delivered: "Entregue", cancelled: "Cancelada", storefront: "loja", backoffice: "backoffice", admin: "admin" };
  const L = k => LABEL[k] || k;
  const { unitPrice, bulkRate } = window;
  let CATEGORIES = window.CATEGORIES.slice(); // replaced by the database list after sign-in
  let PRODUCTS = window.PRODUCTS.slice(); // replaced by the database list after sign-in

  let token = "";
  try { token = sessionStorage.getItem("forge-admin") || ""; } catch {}
  let orders = [], selected = null, statusFilter = "all", query = "";

  let tt;
  const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2000); };

  async function api(path, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const headers = { Authorization: "Bearer " + token, "X-Admin-Token": token, ...(isForm ? {} : { "Content-Type": "application/json" }), ...(opts.headers || {}) };
    const r = await fetch(window.Brand.url(path), { ...opts, headers });
    if (r.status === 401) { signOut(); throw new Error("A sessão expirou, inicie sessão novamente"); }
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
      const r = await fetch(window.Brand.url("api/login"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: e.target.password.value }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setToken(d.token); e.target.reset(); start();
    } catch (err) { $("#loginErr").textContent = err.message; }
  };
  $("#logout").onclick = async () => { try { await api("api/logout", { method: "POST" }); } catch {} signOut(); };

  async function start() {
    $("#login").hidden = true; $("#app").hidden = false;
    await Promise.all([load(), loadProducts()]);
  }

  // ---------- views ----------
  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => {
    document.querySelectorAll("[data-view]").forEach(x => x.classList.toggle("on", x === b));
    ["orders", "new", "products", "categories", "brand"].forEach(v => { $("#view-" + v).hidden = b.dataset.view !== v; });
    if (b.dataset.view === "brand") fillBrandForm();
    if (b.dataset.view === "products" || b.dataset.view === "new") loadProducts(); // stock changes with every order
  });

  // ---------- orders list ----------
  async function load() {
    try { orders = await api("api/orders"); render(); } catch (e) { toast(e.message); }
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
      try { await api("api/orders/" + o.id + "/delete", { method: "POST" }); orders = orders.filter(x => x.id !== o.id); selected = null; render(); toast("Encomenda eliminada"); loadProducts(); } catch (e) { toast(e.message); }
    };
  }
  async function patch(id, body, msg) {
    try {
      const upd = await api("api/orders/" + id + "/update", { method: "POST", body: JSON.stringify(body) });
      orders = orders.map(o => o.id === id ? upd : o); render(); toast(msg);
      if ("status" in body) loadProducts(); // cancelling/reactivating moves stock
    } catch (e) { toast(e.message); render(); }
  }

  $("#exportCsv").onclick = async () => {
    try {
      const csv = await api("api/orders.csv");
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "pre-encomendas.csv" });
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { toast(e.message); }
  };

  // ---------- register order manually ----------
  const lines = {};
  function renderProdSel() {
    $("#prodSel").innerHTML = CATEGORIES.map(c => `<optgroup label="${esc(c.name)}">${PRODUCTS.filter(p => p.cat === c.id && p.active !== false)
      .map(p => `<option value="${p.id}" ${p.trackStock && p.stock <= 0 ? "disabled" : ""}>${esc(p.name)} — ${esc(p.sub)} (${eur(unitPrice(p))})${p.trackStock ? ` · stock ${p.stock}` : ""}</option>`).join("")}</optgroup>`).join("");
  }
  renderProdSel();
  $("#addLine").onclick = () => {
    const id = $("#prodSel").value, q = Math.max(1, Math.min(999, parseInt($("#prodQty").value) || 1));
    lines[id] = (lines[id] || 0) + q; $("#prodQty").value = 1; renderLines();
  };
  function renderLines() {
    let sub = 0, disc = 0;
    $("#lines").innerHTML = Object.entries(lines).map(([id, q]) => {
      const p = PRODUCTS.find(x => x.id === id);
      if (!p) { delete lines[id]; return ""; }
      const g = unitPrice(p) * q, d = g * bulkRate(q);
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
      const o = await api("api/orders", { method: "POST", body: JSON.stringify({ customer: f, notes: f.notes, items: Object.entries(lines).map(([id, qty]) => ({ id, qty })) }) });
      Object.keys(lines).forEach(k => delete lines[k]); e.target.reset(); renderLines();
      orders.unshift(o); selected = o.id; render();
      document.querySelector('[data-view="orders"]').click();
      toast(`${o.number} registada`); loadProducts();
    } catch (err) { $("#newErr").textContent = err.message; }
  };
  renderLines();

  // ---------- products ----------
  let pSel = null, pCreating = false;
  const pf = $("#pform");
  const catLabel = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;
  function renderCatSelects() {
    const opts = CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}${c.active === false ? " (inativa)" : ""}</option>`).join("");
    const keepF = $("#pcat").value, keepP = $("#pformCat").value;
    $("#pcat").innerHTML = '<option value="">Todas as categorias</option>' + opts;
    $("#pformCat").innerHTML = opts;
    if (CATEGORIES.some(c => c.id === keepF)) $("#pcat").value = keepF;
    if (CATEGORIES.some(c => c.id === keepP)) $("#pformCat").value = keepP;
  }
  renderCatSelects();
  async function loadProducts() {
    try {
      [CATEGORIES, PRODUCTS] = await Promise.all([api("api/categories/all"), api("api/products/all")]);
      renderCatSelects(); renderProducts(); renderProdSel(); renderLines(); renderCats();
    } catch (e) { toast(e.message); }
  }
  const thumb = p => p.imageUrl ? `<img src="${esc(window.Brand.url(p.imageUrl))}" alt="">` : "<i></i>";
  const isLow = p => p.trackStock && p.stock > 0 && p.stock <= p.lowStock, isOut = p => p.trackStock && p.stock <= 0;
  function filteredProducts() {
    const q = $("#pq").value.toLowerCase(), cat = $("#pcat").value, st = $("#pstate").value;
    const stOk = p => !st || (st === "on" && p.active) || (st === "off" && !p.active) || (st === "low" && isLow(p)) || (st === "out" && isOut(p));
    return PRODUCTS.filter(p => (!cat || p.cat === cat) && stOk(p) && (!q || (p.name + " " + p.sub + " " + p.id).toLowerCase().includes(q)));
  }
  // pagination (page size remembered per browser)
  let pPage = 1, pPer = 20;
  try { pPer = [20, 50, 100].includes(+localStorage.getItem("admin-pper")) ? +localStorage.getItem("admin-pper") : 20; } catch {}
  function renderProducts() {
    const nLow = PRODUCTS.filter(isLow).length, nOut = PRODUCTS.filter(isOut).length;
    $("#stockSummary").innerHTML = nLow || nOut ? `<b>${nOut}</b> esgotado(s) · <b>${nLow}</b> com stock baixo` : "";
    const all = filteredProducts();
    const pages = Math.max(1, Math.ceil(all.length / pPer));
    pPage = Math.min(Math.max(1, pPage), pages);
    const start = (pPage - 1) * pPer, list = all.slice(start, start + pPer);
    $("#pempty").hidden = !!all.length;
    renderPPager(all.length, pages, start, list.length);
    $("#prows").innerHTML = list.map(p => `
      <tr data-pid="${p.id}" class="${p.active ? "" : "off"} ${pSel === p.id ? "sel" : ""}">
        <td><div class="thumb">${thumb(p)}</div></td>
        <td><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></td>
        <td>${esc(catLabel(p.cat))}</td>
        <td class="r"><b>${eur(unitPrice(p))}</b>${p.promo ? `<s>${eur(p.price)}</s>` : ""}</td>
        <td class="r">${p.promo ? "−" + p.promo + "%" : "—"}</td>
        <td class="r">${p.trackStock ? `<span class="stk ${isOut(p) ? "out" : isLow(p) ? "low" : ""}">${p.stock}</span>` : '<span class="stk na">∞</span>'}</td>
        <td><span class="badge ${p.active ? "s-delivered" : "s-cancelled"}">${p.active ? "Ativo" : "Inativo"}</span>${p.best ? ' <span class="src">top</span>' : ""}${p.fresh ? ' <span class="src">novo</span>' : ""}</td>
      </tr>`).join("");
  }
  function renderPPager(total, pages, start, n) {
    const el = $("#ppager");
    if (!total) { el.innerHTML = ""; return; }
    const nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - pPage) <= 1) nums.push(i); else if (nums[nums.length - 1] !== "…") nums.push("…");
    el.innerHTML = `<span class="pg-info">${start + 1}–${start + n} de ${total} produto${total === 1 ? "" : "s"}</span>
      <label class="pg-per">Por página <select id="pper">${[20, 50, 100].map(v => `<option ${v === pPer ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      ${pages > 1 ? `<div class="pg-btns">
        <button type="button" data-ppg="${pPage - 1}" ${pPage === 1 ? "disabled" : ""} aria-label="Página anterior">‹</button>
        ${nums.map(x => x === "…" ? '<span class="pg-gap">…</span>' : `<button type="button" data-ppg="${x}" class="${x === pPage ? "on" : ""}" ${x === pPage ? 'aria-current="page"' : ""}>${x}</button>`).join("")}
        <button type="button" data-ppg="${pPage + 1}" ${pPage === pages ? "disabled" : ""} aria-label="Página seguinte">›</button>
      </div>` : ""}`;
  }
  $("#ppager").addEventListener("click", e => {
    const b = e.target.closest("[data-ppg]"); if (!b || b.disabled) return;
    pPage = +b.dataset.ppg; renderProducts();
    $("#view-products").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#ppager").addEventListener("change", e => {
    if (e.target.id !== "pper") return;
    const first = (pPage - 1) * pPer;           // keep the first visible item on screen
    pPer = +e.target.value; pPage = Math.floor(first / pPer) + 1;
    try { localStorage.setItem("admin-pper", pPer); } catch {}
    renderProducts();
  });
  // jump to the page that contains a product (after creating/opening it)
  function revealProduct(id) {
    const i = filteredProducts().findIndex(p => p.id === id);
    if (i >= 0) pPage = Math.floor(i / pPer) + 1;
  }
  ["pq", "pcat", "pstate"].forEach(id => $("#" + id).addEventListener("input", () => { pPage = 1; renderProducts(); }));
  $("#prows").onclick = e => { const tr = e.target.closest("tr[data-pid]"); if (tr) openProduct(tr.dataset.pid); };
  function showForm(show) { pf.hidden = !show; $("#plLayout").classList.toggle("with-panel", show); }
  function updateFinal() {
    const price = parseFloat(String(pf.price.value).replace(",", ".")), promo = parseInt(pf.promo.value) || 0;
    $("#pformFinal").textContent = isFinite(price) ? `Preço na loja: ${eur(unitPrice({ price, promo }))}${promo ? ` (−${promo}% sobre ${eur(price)})` : ""} · 5 un.: −5% · 10 un.: −10%` : "";
  }
  pf.price.oninput = pf.promo.oninput = updateFinal;
  function renderPImage(p) {
    $("#pimgPrev").innerHTML = p && p.imageUrl ? `<img src="${esc(window.Brand.url(p.imageUrl))}" alt="">` : "Sem imagem — é mostrado o frasco desenhado";
    $("#pimgRemove").disabled = !(p && p.imageUrl);
    const canUpload = !!p && !pCreating;
    $("#pimgFile").disabled = !canUpload;
    $("#pimgFile").parentElement.style.opacity = canUpload ? "" : ".5";
    $("#pimgHint").textContent = canUpload ? "PNG, JPG, WebP ou GIF, até 3 MB. Ideal: quadrada ou 4:3, ≥ 800 px." : "Guarde o produto primeiro para poder carregar a imagem.";
  }
  // re-reads one product so stock shown in the editor is never stale (orders change it in the background)
  async function refreshOpenProduct() {
    if (!pSel || pCreating) return;
    try {
      const list = await api("api/products/all"), fresh = list.find(x => x.id === pSel);
      PRODUCTS = list; renderProducts(); renderProdSel();
      if (fresh && fresh.trackStock && pf.trackStock.checked) renderStock(fresh, true);
    } catch {}
  }
  function openProduct(id) {
    const p = PRODUCTS.find(x => x.id === id); if (!p) return;
    pSel = id; pCreating = false; revealProduct(id); renderProducts();
    $("#pformTitle").textContent = "Editar produto";
    pf.name.value = p.name; pf.sub.value = p.sub; pf.cat.value = p.cat;
    pf.price.value = String(p.price).replace(".", ","); pf.promo.value = p.promo || ""; pf.description.value = p.description || "";
    pf.reviews.value = p.reviews; pf.position.value = p.position;
    pf.active.checked = p.active; pf.best.checked = p.best; pf.fresh.checked = p.fresh;
    pf.trackStock.checked = p.trackStock; pf.lowStock.value = p.lowStock; pf.initialStock.value = 0;
    renderStock(p);
    $("#pdelete").disabled = false; $("#pformErr").textContent = "";
    updateFinal(); renderPImage(p); showForm(true);
    refreshOpenProduct();
  }
  $("#newProduct").onclick = () => {
    pSel = null; pCreating = true; renderProducts(); pf.reset();
    pf.active.checked = true; pf.cat.value = $("#pcat").value || (CATEGORIES[0] || {}).id || "";
    pf.trackStock.checked = false; pf.lowStock.value = 5; pf.initialStock.value = 0; renderStock(null);
    $("#pformTitle").textContent = "Novo produto"; $("#pdelete").disabled = true; $("#pformErr").textContent = "";
    updateFinal(); renderPImage(null); showForm(true); pf.name.focus();
  };
  $("#pclose").onclick = () => { pSel = null; pCreating = false; showForm(false); renderProducts(); };
  pf.onsubmit = async e => {
    e.preventDefault(); $("#pformErr").textContent = "";
    const body = { name: pf.name.value, sub: pf.sub.value, cat: pf.cat.value, price: pf.price.value, promo: pf.promo.value || 0,
      description: pf.description.value, reviews: pf.reviews.value || 0, active: pf.active.checked, best: pf.best.checked, fresh: pf.fresh.checked };
    if (pf.position.value !== "") body.position = pf.position.value;
    body.trackStock = pf.trackStock.checked; body.lowStock = pf.lowStock.value || 0;
    const cur = PRODUCTS.find(x => x.id === pSel);
    if (pf.trackStock.checked && (pCreating || !cur || !cur.trackStock)) body.initialStock = pf.initialStock.value || 0;
    try {
      const p = pCreating ? await api("api/products", { method: "POST", body: JSON.stringify(body) })
                          : await api("api/products/" + pSel + "/update", { method: "POST", body: JSON.stringify(body) });
      const i = PRODUCTS.findIndex(x => x.id === p.id);
      if (i >= 0) PRODUCTS[i] = p; else PRODUCTS.push(p);
      PRODUCTS.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
      toast(pCreating ? "Produto criado — já pode carregar a imagem" : "Produto guardado");
      openProduct(p.id); renderProdSel();
    } catch (err) { $("#pformErr").textContent = err.message; }
  };
  $("#pimgFile").onchange = async e => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file || !pSel) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      const p = await api("api/products/" + pSel + "/image", { method: "POST", body: fd });
      PRODUCTS[PRODUCTS.findIndex(x => x.id === p.id)] = p; renderPImage(p); renderProducts(); toast("Imagem atualizada");
    } catch (err) { toast(err.message); }
  };
  $("#pimgRemove").onclick = async () => {
    if (!pSel || !confirm("Remover a imagem deste produto?")) return;
    try {
      const p = await api("api/products/" + pSel + "/image/delete", { method: "POST" });
      PRODUCTS[PRODUCTS.findIndex(x => x.id === p.id)] = p; renderPImage(p); renderProducts(); toast("Imagem removida");
    } catch (err) { toast(err.message); }
  };
  $("#pdelete").onclick = async () => {
    const p = PRODUCTS.find(x => x.id === pSel); if (!p) return;
    if (!confirm(`Eliminar "${p.name}"? Esta ação não pode ser anulada. (Pode, em alternativa, desativá-lo.)`)) return;
    try {
      await api("api/products/" + p.id + "/delete", { method: "POST" });
      PRODUCTS = PRODUCTS.filter(x => x.id !== p.id); pSel = null; showForm(false); renderProducts(); renderProdSel(); toast("Produto eliminado");
    } catch (err) { toast(err.message); }
  };

  // ---------- stock ----------
  const REASON = { "encomenda": "Encomenda", "cancelamento": "Cancelamento", "reativação": "Encomenda reativada", "encomenda eliminada": "Encomenda eliminada",
    "entrada": "Entrada", "saída": "Saída", "acerto": "Acerto", "stock inicial": "Stock inicial", "controlo desativado": "Controlo desativado" };
  function renderStock(p, keepMoves = false) {
    const on = pf.trackStock.checked, tracked = !!(p && p.trackStock);
    $("#stockOn").hidden = !on; $("#stockOffHint").hidden = on;
    $("#initWrap").hidden = tracked;             // initial stock only when turning tracking on
    $("#stockLive").hidden = !tracked || !on;    // adjustments need tracking already saved
    if (tracked) {
      $("#stockNow").textContent = p.stock;
      $("#stockState").innerHTML = p.stock <= 0 ? '<span class="badge s-cancelled">Esgotado</span>' : p.stock <= p.lowStock ? '<span class="badge s-pending">Stock baixo</span>' : '<span class="badge s-delivered">OK</span>';
      if (!keepMoves) { $("#movesBox").open = false; $("#moves").innerHTML = ""; }
    }
  }
  pf.trackStock.onchange = () => renderStock(PRODUCTS.find(x => x.id === pSel) || null);
  $("#movesBox").addEventListener("toggle", async () => {
    if (!$("#movesBox").open || !pSel) return;
    refreshOpenProduct();
    $("#moves").innerHTML = '<p class="hint">A carregar…</p>';
    try {
      const list = await api("api/products/" + pSel + "/stock");
      $("#moves").innerHTML = list.length ? list.map(m => `<div class="mv">
          <span class="d ${m.delta > 0 ? "pos" : m.delta < 0 ? "neg" : ""}">${m.delta > 0 ? "+" : ""}${m.delta}</span>
          <span>${esc(REASON[m.reason] || m.reason)}${m.order ? " · " + esc(m.order) : ""}<small>${fmtDate(m.at)}${m.note ? " — " + esc(m.note) : ""}</small></span>
          <span class="after">${m.after === null ? "—" : "→ " + m.after}</span></div>`).join("") : '<p class="hint">Sem movimentos.</p>';
    } catch (err) { $("#moves").innerHTML = `<p class="err">${esc(err.message)}</p>`; }
  });
  $("#adjApply").onclick = async () => {
    const qty = $("#adjQty").value;
    if (qty === "") { toast("Indique a quantidade"); return; }
    try {
      const p = await api("api/products/" + pSel + "/stock", { method: "POST", body: JSON.stringify({ mode: $("#adjMode").value, qty, note: $("#adjNote").value }) });
      PRODUCTS[PRODUCTS.findIndex(x => x.id === p.id)] = p;
      $("#adjQty").value = ""; $("#adjNote").value = "";
      renderStock(p); renderProducts(); renderProdSel(); toast(`Stock atualizado: ${p.stock}`);
    } catch (err) { toast(err.message); }
  };

  // ---------- categories ----------
  let cEdit = null;
  const productCount = id => PRODUCTS.filter(p => p.cat === id).length;
  function renderCats() {
    $("#cempty").hidden = !!CATEGORIES.length;
    $("#crows").innerHTML = CATEGORIES.map((c, i) => `
      <tr data-cid="${c.id}" class="${c.active ? "" : "off"}">
        <td class="ord"><button type="button" data-cmove="up" ${i === 0 ? "disabled" : ""} aria-label="Subir">▲</button><button type="button" data-cmove="down" ${i === CATEGORIES.length - 1 ? "disabled" : ""} aria-label="Descer">▼</button></td>
        <td>${cEdit === c.id
          ? `<div class="inline-edit"><input id="cname" value="${esc(c.name)}" maxlength="60"><button type="button" class="btn sm" data-csave>Guardar</button><button type="button" class="ghost" data-ccancel>Cancelar</button></div>`
          : `<b>${esc(c.name)}</b><small>${esc(c.id)}</small>`}</td>
        <td class="r">${productCount(c.id)}</td>
        <td><label class="switch"><input type="checkbox" data-cactive ${c.active ? "checked" : ""}><span>${c.active ? "Visível" : "Oculta"}</span></label></td>
        <td class="r actions"><button type="button" class="ghost" data-cedit>Renomear</button><button type="button" class="ghost danger-ghost" data-cdel>Eliminar</button></td>
      </tr>`).join("");
    if (cEdit) { const i = $("#cname"); i.focus(); i.select(); }
  }
  function setCats(list) { CATEGORIES = list; renderCats(); renderCatSelects(); renderProducts(); renderProdSel(); }
  $("#cnewForm").onsubmit = async e => {
    e.preventDefault(); $("#cErr").textContent = "";
    try {
      await api("api/categories", { method: "POST", body: JSON.stringify({ name: e.target.cname_new.value }) });
      e.target.reset(); setCats(await api("api/categories/all")); toast("Categoria criada");
    } catch (err) { $("#cErr").textContent = err.message; }
  };
  $("#crows").addEventListener("keydown", e => { if (e.target.id === "cname" && e.key === "Enter") { e.preventDefault(); $("[data-csave]").click(); } if (e.key === "Escape") { cEdit = null; renderCats(); } });
  $("#crows").addEventListener("change", async e => {
    if (!e.target.matches("[data-cactive]")) return;
    const id = e.target.closest("tr").dataset.cid;
    try { await api("api/categories/" + id + "/update", { method: "POST", body: JSON.stringify({ active: e.target.checked }) }); setCats(await api("api/categories/all")); toast(e.target.checked ? "Categoria visível na loja" : "Categoria oculta — os seus produtos deixam de aparecer na loja"); }
    catch (err) { toast(err.message); renderCats(); }
  });
  $("#crows").addEventListener("click", async e => {
    const tr = e.target.closest("tr[data-cid]"); if (!tr) return;
    const id = tr.dataset.cid, c = CATEGORIES.find(x => x.id === id);
    try {
      const mv = e.target.closest("[data-cmove]");
      if (mv && !mv.disabled) { setCats(await api("api/categories/" + id + "/" + mv.dataset.cmove, { method: "POST" })); return; }
      if (e.target.closest("[data-cedit]")) { cEdit = id; renderCats(); return; }
      if (e.target.closest("[data-ccancel]")) { cEdit = null; renderCats(); return; }
      if (e.target.closest("[data-csave]")) {
        await api("api/categories/" + id + "/update", { method: "POST", body: JSON.stringify({ name: $("#cname").value }) });
        cEdit = null; setCats(await api("api/categories/all")); toast("Categoria renomeada"); return;
      }
      if (e.target.closest("[data-cdel]")) openCatDelete(c);
    } catch (err) { toast(err.message); }
  });
  function openCatDelete(c) {
    const n = productCount(c.id), others = CATEGORIES.filter(x => x.id !== c.id);
    $("#cdelTitle").textContent = `Eliminar "${c.name}"`;
    $("#cdelMsg").textContent = n ? `Esta categoria tem ${n} produto(s). Escolha para que categoria os quer mover antes de eliminar.` : "Esta categoria não tem produtos. Pode ser eliminada sem afetar a loja.";
    $("#cdelMoveWrap").hidden = !n;
    $("#cdelMove").innerHTML = others.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("");
    $("#cdelConfirm").disabled = n > 0 && !others.length;
    $("#cdelErr").textContent = n > 0 && !others.length ? "Crie primeiro outra categoria para onde mover os produtos." : "";
    $("#cdel").dataset.cid = c.id; $("#cdel").hidden = false;
  }
  $("#cdelCancel").onclick = () => { $("#cdel").hidden = true; };
  $("#cdelConfirm").onclick = async () => {
    const id = $("#cdel").dataset.cid, n = productCount(id), moveTo = n ? $("#cdelMove").value : null;
    try {
      const list = await api("api/categories/" + id + "/delete", { method: "POST", body: JSON.stringify({ moveTo }) });
      if (n) PRODUCTS.forEach(p => { if (p.cat === id) p.cat = moveTo; });
      $("#cdel").hidden = true; setCats(list); toast(n ? `Categoria eliminada — ${n} produto(s) movido(s)` : "Categoria eliminada");
    } catch (err) { $("#cdelErr").textContent = err.message; }
  };

  // ---------- brand ----------
  const bf = $("#brandForm");
  const luminance = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  function contrastHint(hex) {
    const ratio = 1.05 / (luminance(hex) + 0.05); // contrast against white text
    const h = $("#contrastHint");
    h.classList.toggle("warn", ratio < 3);
    h.textContent = ratio < 3 ? `Contraste baixo com texto branco (${ratio.toFixed(1)}:1). Escolha uma cor mais escura para botões legíveis.` : `Contraste com texto branco: ${ratio.toFixed(1)}:1`;
  }
  function previewBrand(extra = {}) {
    const f = Object.fromEntries(new FormData(bf));
    window.Brand.apply({ ...window.BRAND, storeName: f.storeName || window.BRAND.storeName, logoText: f.logoText, logoSub: f.logoSub,
      primaryColor: /^#[0-9a-f]{6}$/i.test(f.primaryColor) ? f.primaryColor : window.BRAND.primaryColor, ...extra,
      logoUrl: window.BRAND.logoUrl, faviconUrl: window.BRAND.faviconUrl }, { titleSuffix: "Backoffice", preview: true });
    renderBrandMedia();
  }
  function renderBrandMedia() {
    const b = window.BRAND;
    $("#logoPrev").innerHTML = b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="">` : "Sem logótipo — é usado o texto";
    $("#favPrev").innerHTML = `<img src="${esc(b.faviconUrl || window.Brand.url("favicon.svg"))}" alt="">`;
    $("#favTab").src = b.faviconUrl || window.Brand.url("favicon.svg");
    $("#tabTitle").textContent = b.storeName;
    $("#logoRemove").disabled = !b.logoUrl; $("#favRemove").disabled = !b.faviconUrl;
  }
  function fillBrandForm() {
    const b = window.BRAND || window.Brand.DEFAULTS;
    bf.storeName.value = b.storeName; bf.logoText.value = b.logoText || ""; bf.logoSub.value = b.logoSub || "";
    bf.primaryColor.value = b.primaryColor; bf.primaryHex.value = b.primaryColor; bf.supportEmail.value = b.supportEmail || "";
    contrastHint(b.primaryColor); renderBrandMedia(); $("#brandErr").textContent = "";
  }
  bf.primaryColor.oninput = () => { bf.primaryHex.value = bf.primaryColor.value; contrastHint(bf.primaryColor.value); previewBrand(); };
  bf.primaryHex.oninput = () => { const v = bf.primaryHex.value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) { bf.primaryColor.value = v; contrastHint(v); previewBrand(); } };
  ["storeName", "logoText", "logoSub"].forEach(n => bf[n].addEventListener("input", () => previewBrand()));
  bf.onsubmit = async e => {
    e.preventDefault(); $("#brandErr").textContent = "";
    const f = Object.fromEntries(new FormData(bf));
    try {
      const b = await api("api/settings", { method: "POST", body: JSON.stringify({ storeName: f.storeName, logoText: f.logoText, logoSub: f.logoSub, primaryColor: f.primaryColor, supportEmail: f.supportEmail }) });
      window.Brand.apply(b, { titleSuffix: "Backoffice" }); fillBrandForm(); toast("Marca atualizada");
    } catch (err) { $("#brandErr").textContent = err.message; previewBrand(); }
  };
  async function upload(kind, input) {
    const file = input.files[0]; input.value = "";
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      const b = await api("api/settings/" + kind, { method: "POST", body: fd });
      window.Brand.apply(b, { titleSuffix: "Backoffice" }); renderBrandMedia();
      toast(kind === "logo" ? "Logótipo atualizado" : "Favicon atualizado");
    } catch (err) { toast(err.message); }
  }
  async function removeMedia(kind) {
    if (!confirm(kind === "logo" ? "Remover o logótipo?" : "Remover o favicon?")) return;
    try { const b = await api("api/settings/" + kind + "/delete", { method: "POST" }); window.Brand.apply(b, { titleSuffix: "Backoffice" }); renderBrandMedia(); toast("Removido"); }
    catch (err) { toast(err.message); }
  }
  $("#logoFile").onchange = e => upload("logo", e.target);
  $("#favFile").onchange = e => upload("favicon", e.target);
  $("#logoRemove").onclick = () => removeMedia("logo");
  $("#favRemove").onclick = () => removeMedia("favicon");

  $("#pwForm").onsubmit = async e => {
    e.preventDefault(); $("#pwErr").textContent = "";
    const f = Object.fromEntries(new FormData(e.target));
    if (f.new !== f.new2) { $("#pwErr").textContent = "As palavras-passe não coincidem"; return; }
    try { const d = await api("api/password", { method: "POST", body: JSON.stringify({ current: f.current, new: f.new }) }); setToken(d.token); e.target.reset(); toast("Palavra-passe alterada"); }
    catch (err) { $("#pwErr").textContent = err.message; }
  };

  window.Brand.load({ titleSuffix: "Backoffice" });
  if (token) start();
})();
