(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const eur = n => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(+n);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Ready-made customer messages (email / WhatsApp). Payment details come from Marca → "Dados de pagamento".
  let PAYMENT_INFO = "";
  const first = o => String(o.customer.name || "").split(" ")[0] || "";
  const itemsTxt = o => o.items.map(i => `- ${i.qty} × ${i.name}`).join("\n");
  const storeNm = () => (window.BRAND && window.BRAND.storeName) || "a loja";
  const eta = o => o.backorder ? "Alguns artigos não têm stock imediato: a entrega pode demorar até 3 semanas." : "A entrega é imediata, em embalagem discreta.";
  const MSGS = [
    { label: "1. Confirmar encomenda", subject: o => `Encomenda ${o.number} — confirmação`,
      body: o => `Olá ${first(o)},\n\nRecebemos a sua encomenda ${o.number}:\n${itemsTxt(o)}\n\nTotal: ${eur(o.total)}\n${eta(o)}\n\nPode confirmar que está tudo correto? Responda a esta mensagem para avançarmos.\n\nObrigado,\n${storeNm()}` },
    { label: "2. Pedido de pagamento", subject: o => `Encomenda ${o.number} — pagamento`,
      body: o => `Olá ${first(o)},\n\nPara concluir a encomenda ${o.number} (${eur(o.total)}), pode efetuar o pagamento da seguinte forma:\n\n${PAYMENT_INFO || "[indique aqui os dados de pagamento]"}\n\nA encomenda é processada após a validação do pagamento. Envie-nos o comprovativo em resposta a esta mensagem.\n\nObrigado,\n${storeNm()}` },
    { label: "3. Pagamento confirmado", subject: o => `Encomenda ${o.number} — pagamento confirmado`,
      body: o => `Olá ${first(o)},\n\nConfirmamos a receção do pagamento da encomenda ${o.number}. Vamos preparar o envio em embalagem discreta.\n${eta(o)}\nAssim que for enviada, enviamos-lhe o número de seguimento.\n\nObrigado,\n${storeNm()}` },
    { label: "4. Envio e tracking", needsTracking: true, subject: o => `Encomenda ${o.number} — enviada`,
      body: o => `Olá ${first(o)},\n\nA sua encomenda ${o.number} foi enviada em embalagem discreta.\nNúmero de seguimento: ${o.tracking}\n\nObrigado,\n${storeNm()}` },
  ];
  // WhatsApp needs the international number: Portuguese 9-digit numbers get the 351 prefix
  const waNum = ph => { const d = String(ph || "").replace(/\D/g, "").replace(/^00/, ""); return d.length === 9 ? "351" + d : d; };
  const fmtDate = iso => new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });
  const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  const LABEL = { all: "Todas", pending: "Pendente", confirmed: "Pagamento validado", shipped: "Enviada", delivered: "Entregue", cancelled: "Cancelada", storefront: "loja", backoffice: "backoffice", admin: "admin" };
  const L = k => LABEL[k] || k;
  const { unitPrice, bulkRate } = window;
  let CATEGORIES = window.CATEGORIES.slice(); // replaced by the database list after sign-in
  let GOALS = [];
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
    await Promise.all([load(), loadProducts(), loadReviews(true), api("api/settings/private").then(d => { PAYMENT_INFO = d.paymentInfo || ""; }).catch(() => {})]);
  }

  // ---------- views ----------
  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => {
    document.querySelectorAll("[data-view]").forEach(x => x.classList.toggle("on", x === b));
    ["orders", "new", "products", "categories", "testimonials", "reviews", "brand"].forEach(v => { $("#view-" + v).hidden = b.dataset.view !== v; });
    if (b.dataset.view === "brand") fillBrandForm();
    if (b.dataset.view === "testimonials") loadTestimonials();
    if (b.dataset.view === "reviews") loadReviews();
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
      ["Pendentes", count("pending"), "hl"], ["Pagamento validado", count("confirmed")], ["Hoje", orders.filter(o => new Date(o.createdAt).toDateString() === today).length],
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
      [o.number, o.customer.name, o.customer.email, o.customer.phone, o.resellerCode || "", ...o.items.map(i => i.name)].join(" ").toLowerCase().includes(query)));
  }
  function renderRows() {
    const list = filtered();
    $("#empty").hidden = !!list.length;
    $("#empty").textContent = orders.length ? "Nenhuma encomenda corresponde a este filtro." : "Ainda não há pré-encomendas.";
    $("#rows").innerHTML = list.map(o => `
      <tr data-id="${o.id}" class="${selected === o.id ? "sel" : ""}">
        <td><b>${esc(o.number)}</b>${o.source === "backoffice" ? '<span class="src">manual</span>' : ""}${o.backorder && o.status !== "cancelled" ? '<span class="src bo" title="Tem artigos sem stock: entrega até 3 semanas">até 3 sem.</span>' : ""}${o.resellerCode ? `<span class="src rc" title="Código de revendedor">${esc(o.resellerCode)}</span>` : ""}</td>
        <td>${fmtDate(o.createdAt)}</td>
        <td>${esc(o.customer.name)}<small>${esc(o.customer.phone || o.customer.email)}</small></td>
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
      <div><h4>Cliente</h4><p><b>${esc(c.name)}</b>${c.phone ? `<br>${esc(c.phone)} · <a target="_blank" rel="noopener" href="https://wa.me/${waNum(c.phone)}">WhatsApp</a>` : ""}${c.email ? `<br><a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}</p>
        <p class="call-hint">Contactar o cliente por email ou WhatsApp (mensagens prontas abaixo). Só processar/enviar depois de mudar o estado para "Pagamento validado".</p>
        ${c.address || c.city ? `<p>${esc(c.address)}<br>${esc(c.postcode)} ${esc(c.city)}<br>${esc(c.country)}</p>` : ""}</div>
      <div><h4>Artigos</h4>${o.items.map(i => `<div class="li"><span>${i.qty} × ${esc(i.name)}${(i.backorder || 0) > 0 ? `<br><small class="bo-tag">${i.qty - i.backorder} em stock · ${i.backorder} por encomenda (até 3 semanas)</small>` : ""}<br><small class="muted">${esc(i.sub)} · ${eur(i.unit)}${i.discount ? ` · −${eur(i.discount)} quantidade` : ""}</small></span><b>${eur(i.total)}</b></div>`).join("")}
        <div class="tot"><span>Subtotal</span><span>${eur(o.subtotal)}</span></div>
        <div class="tot"><span>Desconto por quantidade</span><span>−${eur(o.discount)}</span></div>
        <div class="tot big"><span>Total</span><span>${eur(o.total)}</span></div></div>
      ${o.notes ? `<div><h4>Observações do cliente</h4><p>${esc(o.notes)}</p></div>` : ""}
      ${o.resellerCode ? `<div><h4>Código de revendedor</h4><p class="rc-big">${esc(o.resellerCode)}</p></div>` : ""}
      <div><h4>Mensagens ao cliente</h4>
        <div class="msgs">${MSGS.map((m, i) => `<div class="msg"><span>${m.label}</span><span class="msg-btns">
          ${o.customer.email ? `<a class="ghost" data-msg="${i}" data-via="email" href="#">Email</a>` : ""}
          ${o.customer.phone ? `<a class="ghost" data-msg="${i}" data-via="wa" href="#">WhatsApp</a>` : ""}</span></div>`).join("")}</div>
        <p class="hint" style="margin:6px 0 0">Abre o email ou o WhatsApp com a mensagem já escrita; reveja antes de enviar.</p></div>
      <div><h4>Nº de seguimento (tracking)</h4><div class="track-row"><input id="trackingIn" maxlength="120" value="${esc(o.tracking || "")}" placeholder="ex.: RR123456789PT"><button class="btn sm" id="saveTracking">Guardar</button></div></div>
      <div><h4>Nota interna</h4><textarea id="internalNote" rows="3" placeholder="Visível apenas no backoffice">${esc(o.internalNote || "")}</textarea>
        <button class="btn sm" id="saveNote" style="margin-top:8px">Guardar nota</button></div>
      <div class="hist"><h4>Histórico</h4>${o.history.map(h => `<div>${fmtDate(h.at)} — <b>${L(h.status)}</b> (${L(h.by)})</div>`).join("")}</div>
      ${o.status === "delivered" ? `<div><h4>Avaliação do cliente</h4><div class="review-link" id="reviewLink">
        <p class="hint" style="margin:0">Envie ao cliente um link privado para avaliar os produtos desta encomenda.</p>
        <button type="button" class="btn sm" id="getReviewLink">Pedir avaliação</button></div></div>` : ""}
      <button class="danger" id="delOrder">Eliminar encomenda</button>`;
    if (o.status === "delivered") $("#getReviewLink").onclick = async () => {
      try {
        const { token } = await api("api/orders/" + o.id + "/review-link", { method: "POST" });
        const url = new URL(window.Brand.url("avaliar.html?t=" + token), location.href).href;
        const store = (window.BRAND && window.BRAND.storeName) || "a loja";
        const subject = `Avalie a sua encomenda ${o.number}`;
        const body = `Olá ${o.customer.name.split(" ")[0]},\n\nObrigado pela sua encomenda ${o.number}. Gostaríamos muito de saber a sua opinião sobre os produtos:\n\n${url}\n\nObrigado,\n${store}`;
        $("#reviewLink").innerHTML = `<input readonly value="${esc(url)}" id="rlUrl">
          <div class="row2"><button type="button" class="btn sm" id="rlCopy">Copiar link</button>
          ${o.customer.email ? `<a class="ghost" href="mailto:${encodeURIComponent(o.customer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">Enviar por email</a>` : ""}
          ${o.customer.phone ? `<a class="ghost" target="_blank" rel="noopener" href="https://wa.me/${waNum(o.customer.phone)}?text=${encodeURIComponent(body)}">WhatsApp</a>` : ""}</div>`;
        $("#rlCopy").onclick = async () => { try { await navigator.clipboard.writeText(url); toast("Link copiado"); } catch { $("#rlUrl").select(); document.execCommand("copy"); toast("Link copiado"); } };
      } catch (err) { toast(err.message); }
    };
    $("#closePanel").onclick = () => { selected = null; renderRows(); renderPanel(); };
    $("#statusSel").onchange = e => patch(o.id, { status: e.target.value }, "Estado atualizado");
    $("#saveNote").onclick = () => patch(o.id, { internalNote: $("#internalNote").value }, "Nota guardada");
    $("#saveTracking").onclick = () => patch(o.id, { tracking: $("#trackingIn").value.trim() }, "Tracking guardado");
    $("#panel .msgs").onclick = e => {
      const b = e.target.closest("[data-msg]"); if (!b) return;
      e.preventDefault();
      const m = MSGS[+b.dataset.msg];
      if (m.needsTracking && !(o.tracking || $("#trackingIn").value.trim())) { toast("Guarde primeiro o número de seguimento"); $("#trackingIn").focus(); return; }
      const text = m.body({ ...o, tracking: o.tracking || $("#trackingIn").value.trim() });
      const url = b.dataset.via === "wa" ? `https://wa.me/${waNum(o.customer.phone)}?text=${encodeURIComponent(text)}`
        : `mailto:${encodeURIComponent(o.customer.email)}?subject=${encodeURIComponent(m.subject(o))}&body=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener");
    };
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
      .map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(p.sub)} (${eur(unitPrice(p))})${p.trackStock ? (p.stock > 0 ? ` · stock ${p.stock}` : " · sem stock (até 3 semanas)") : ""}</option>`).join("")}</optgroup>`).join("");
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
      const o = await api("api/orders", { method: "POST", body: JSON.stringify({ customer: f, notes: f.notes, resellerCode: f.resellerCode || "", items: Object.entries(lines).map(([id, qty]) => ({ id, qty })) }) });
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
      [CATEGORIES, PRODUCTS, GOALS] = await Promise.all([api("api/categories/all"), api("api/products/all"), api("api/goals")]);
      renderGoalList();
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
  function renderExtraImages(p) {
    const canUpload = !!p && !pCreating;
    document.querySelectorAll("#pform .xi").forEach(box => {
      const url = p && (box.dataset.kind === "security" ? p.securityImageUrl : p.packageImageUrl);
      box.querySelector(".xi-prev").innerHTML = url ? `<img src="${esc(window.Brand.url(url))}" alt="">` : "Sem imagem";
      box.querySelector(".xi-remove").disabled = !url;
      const f = box.querySelector(".xi-file"); f.disabled = !canUpload; f.parentElement.style.opacity = canUpload ? "" : ".5";
    });
    $("#xiHint").textContent = canUpload ? "PNG, JPG, WebP ou GIF até 3 MB." : "Guarde o produto primeiro para poder carregar estas imagens.";
  }
  document.querySelectorAll("#pform .xi").forEach(box => {
    const kind = box.dataset.kind, label = kind === "security" ? "Imagem do código de proteção" : "Imagem dos tamanhos da embalagem";
    box.querySelector(".xi-file").onchange = async e => {
      const file = e.target.files[0]; e.target.value = ""; if (!file || !pSel) return;
      const fd = new FormData(); fd.append("file", file);
      try { const p = await api(`api/products/${pSel}/image/${kind}`, { method: "POST", body: fd }); PRODUCTS[PRODUCTS.findIndex(x => x.id === p.id)] = p; renderExtraImages(p); toast(label + " atualizada"); }
      catch (err) { toast(err.message); }
    };
    box.querySelector(".xi-remove").onclick = async () => {
      if (!pSel || !confirm("Remover esta imagem?")) return;
      try { const p = await api(`api/products/${pSel}/image/${kind}/delete`, { method: "POST" }); PRODUCTS[PRODUCTS.findIndex(x => x.id === p.id)] = p; renderExtraImages(p); toast(label + " removida"); }
      catch (err) { toast(err.message); }
    };
  });
  function renderPImage(p) {
    renderExtraImages(p);
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
    $("#pview").hidden = false; $("#pview").href = window.Brand.url("produto/" + encodeURIComponent(p.id));
    pf.name.value = p.name; pf.sub.value = p.sub; pf.cat.value = p.cat; renderGoalPick(p.goals || []);
    pf.price.value = String(p.price).replace(".", ","); pf.promo.value = p.promo || ""; pf.description.value = p.description || "";
    pf.specs.value = (p.specs || []).map(([k, v]) => `${k}: ${v}`).join("\n");
    pf.reviewsInfo.value = p.reviews ? `${p.reviews} · média ${String(p.rating).replace(".", ",")} ★` : "Sem avaliações"; pf.position.value = p.position;
    pf.active.checked = p.active; pf.best.checked = p.best; pf.fresh.checked = p.fresh;
    pf.trackStock.checked = p.trackStock; pf.lowStock.value = p.lowStock; pf.initialStock.value = 0;
    pf.securityText.value = p.securityText || ""; pf.verifyUrl.value = p.verifyUrl || "";
    renderStock(p);
    $("#pdelete").disabled = false; $("#pformErr").textContent = "";
    updateFinal(); renderPImage(p); showForm(true);
    refreshOpenProduct();
  }
  $("#newProduct").onclick = () => {
    pSel = null; pCreating = true; renderProducts(); pf.reset();
    pf.active.checked = true; pf.cat.value = $("#pcat").value || (CATEGORIES[0] || {}).id || "";
    pf.trackStock.checked = false; pf.lowStock.value = 5; pf.initialStock.value = 0; renderStock(null);
    $("#pformTitle").textContent = "Novo produto"; $("#pview").hidden = true; renderGoalPick([]); $("#pdelete").disabled = true; $("#pformErr").textContent = "";
    updateFinal(); renderPImage(null); showForm(true); pf.name.focus();
  };
  $("#pclose").onclick = () => { pSel = null; pCreating = false; showForm(false); renderProducts(); };
  pf.onsubmit = async e => {
    e.preventDefault(); $("#pformErr").textContent = "";
    const body = { name: pf.name.value, sub: pf.sub.value, cat: pf.cat.value, price: pf.price.value, promo: pf.promo.value || 0,
      description: pf.description.value, specs: parseSpecLines(pf.specs.value), goals: [...document.querySelectorAll("#pformGoals input:checked")].map(x => x.value), securityText: pf.securityText.value, verifyUrl: pf.verifyUrl.value.trim(), active: pf.active.checked, best: pf.best.checked, fresh: pf.fresh.checked };
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

  // "Rótulo: Valor" per line → [[label, value]]
  function parseSpecLines(t) {
    return String(t || "").split("\n").map(l => l.replace(/^[-*•]\s*/, "").replace(/\*\*/g, "").trim()).filter(Boolean)
      .map(l => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(r => r && r[0] && r[1]);
  }

  // ---------- content import (Markdown/text → description + specifications) ----------
  let IMP = [];
  const stripMdLinks = s => s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  function parseDoc(text, fileName) {
    const lines = String(text).replace(/\r/g, "").replace(/^\uFEFF/, "").split("\n");
    let title = "", section = null, specs = [], out = [], beforeFirst = true;
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, ""), t = line.trim();
      let m;
      if (!title && (m = t.match(/^#\s+(.+)$/))) { title = m[1].trim(); continue; }
      if ((m = t.match(/^(#{2,6})\s+(.+)$/))) {
        const h = m[2].replace(/\*\*/g, "").trim();
        beforeFirst = false;
        if (/^especifica[çc][õo]es|^specifications/i.test(h)) { section = "specs"; continue; }
        if (/^imagens?$|^images?$|^fotos?$/i.test(h)) { section = "skip"; continue; }
        section = "desc";
        if (/^descri[çc][ãa]o( do produto)?$/i.test(h)) continue;  // redundant: the page section is already "Descrição"
        out.push("", "## " + h); continue;
      }
      if (/^\**\s*fonte\s*:?/i.test(t)) continue;                 // source line is never imported
      if (section === "skip") continue;
      if (section === "specs") {
        const s = t.replace(/^[-*•]\s*/, "").replace(/\*\*/g, "");
        const i = s.indexOf(":");
        if (i > 0) specs.push([s.slice(0, i).trim(), s.slice(i + 1).trim()]);
        continue;
      }
      if (beforeFirst && t && !/^[-*•]/.test(t) && t.length < 40) continue; // short tag line under the title (e.g. "Injetável")
      if (/^!\[/.test(t)) continue;                                  // inline images are not imported
      out.push(stripMdLinks(line.trim()));
    }
    const description = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return { title: title || fileName.replace(/\.[^.]+$/, ""), specs: specs.filter(r => r[0] && r[1]).slice(0, 40), description };
  }
  function matchTitle(title) {
    const f = slug(title), words = new Set(f.split("-").filter(w => w.length > 1));
    let best = null, bestScore = 0, ties = 0;
    for (const p of PRODUCTS) {
      const k = slug(p.name), kw = k.split("-").filter(w => w.length > 1);
      let score = 0;
      if (k === f || p.id === f) score = 100;
      else if (k.length >= 3 && (f.includes(k) || k.includes(f))) score = 50 + k.length;
      else { const common = kw.filter(w => words.has(w)).length; if (common) score = 40 * common / Math.max(kw.length, words.size); }
      if (score > bestScore) { best = p; bestScore = score; ties = 1; } else if (score === bestScore && score > 0) ties++;
    }
    if (!best || bestScore < 15) return { id: "", state: "no", note: "Sem correspondência — escolha o produto" };
    return { id: best.id, state: bestScore === 100 && ties === 1 ? "ok" : "warn", note: bestScore === 100 ? (ties > 1 ? "Vários produtos com este nome" : "Nome igual") : "Nome parecido — confirme" };
  }
  function addDocs(docs) {
    for (const d of docs) {
      const parsed = parseDoc(d.text, d.name);
      IMP.push({ ...parsed, file: d.name, ...matchTitle(parsed.title), useDesc: !!parsed.description, useSpecs: parsed.specs.length > 0, open: false, result: null });
    }
    renderImp();
  }
  function renderImp() {
    const counts = {}; IMP.forEach(it => { if (it.id) counts[it.id] = (counts[it.id] || 0) + 1; });
    $("#impList").innerHTML = IMP.map((it, i) => {
      const p = PRODUCTS.find(x => x.id === it.id), words = it.description ? it.description.split(/\s+/).length : 0;
      const flag = it.result ? `<span class="bulk-flag ${it.result === "ok" ? "done" : "err"}">${it.result === "ok" ? "Aplicado" : esc(it.result)}</span>`
        : counts[it.id] > 1 ? '<span class="bulk-flag warn">Mesmo produto noutra linha</span>'
        : `<span class="bulk-flag ${it.state}">${esc(it.note)}${p && (p.description || (p.specs || []).length) ? " · substitui o conteúdo atual" : ""}</span>`;
      return `<div class="imp-row" data-ii="${i}">
        <div class="t"><b>${esc(it.title)}</b><small>${esc(it.file)} · ${it.specs.length} especificações · ${words} palavras</small></div>
        <div><select data-ip="${i}" ${it.result ? "disabled" : ""}>${productOptions(it.id)}</select><div style="margin-top:6px">${flag}</div></div>
        <div class="opts2">
          <label><input type="checkbox" data-iu="desc" ${it.useDesc ? "checked" : ""} ${!it.description || it.result ? "disabled" : ""}> Descrição</label>
          <label><input type="checkbox" data-iu="specs" ${it.useSpecs ? "checked" : ""} ${!it.specs.length || it.result ? "disabled" : ""}> Especificações</label>
          <button type="button" class="ghost" data-iprev>${it.open ? "Ocultar" : "Pré-visualizar"}</button>
          <button type="button" class="rm" data-irm title="Remover da lista" ${it.result ? "disabled" : ""}>✕</button>
        </div>
        ${it.open ? `<div class="prev">
          <div>${it.specs.length ? `<table>${it.specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>` : '<span class="hint">Sem especificações</span>'}</div>
          <div class="md">${window.Md.render(it.description) || '<span class="hint">Sem descrição</span>'}</div></div>` : ""}
      </div>`;
    }).join("");
    const n = IMP.filter(it => it.id && !it.result && (it.useDesc || it.useSpecs)).length;
    $("#impSummary").textContent = IMP.length ? `${IMP.length} texto(s) · ${n} para aplicar` : "Ainda não carregou nenhum texto.";
    $("#impGo").disabled = !n; $("#impGo").textContent = n ? `Aplicar a ${n} produto${n === 1 ? "" : "s"}` : "Aplicar";
  }
  $("#importOpen").onclick = () => { IMP = []; $("#impProgress").hidden = true; $("#impText").value = ""; renderImp(); $("#imp").hidden = false; };
  $("#impClose").onclick = $("#impCancel").onclick = () => { $("#imp").hidden = true; IMP = []; loadProducts(); };
  $("#impFiles").onchange = async e => {
    const files = [...e.target.files].filter(f => f.size < 200000); e.target.value = "";
    addDocs(await Promise.all(files.map(async f => ({ name: f.name, text: await f.text() }))));
  };
  $("#impAddText").onclick = () => {
    const t = $("#impText").value.trim(); if (!t) return;
    addDocs([{ name: "texto colado", text: t }]); $("#impText").value = ""; $(".imp-paste").open = false;
  };
  $("#impList").addEventListener("change", e => {
    const row = e.target.closest("[data-ii]"); if (!row) return;
    const it = IMP[+row.dataset.ii];
    if (e.target.matches("[data-ip]")) { it.id = e.target.value; it.state = "ok"; it.note = "Escolhido manualmente"; }
    if (e.target.matches("[data-iu]")) it[e.target.dataset.iu === "desc" ? "useDesc" : "useSpecs"] = e.target.checked;
    renderImp();
  });
  $("#impList").addEventListener("click", e => {
    const row = e.target.closest("[data-ii]"); if (!row) return;
    const i = +row.dataset.ii;
    if (e.target.closest("[data-iprev]")) { IMP[i].open = !IMP[i].open; renderImp(); }
    if (e.target.closest("[data-irm]")) { IMP.splice(i, 1); renderImp(); }
  });
  $("#impGo").onclick = async () => {
    const seen = new Set(), todo = IMP.filter(it => it.id && !it.result && (it.useDesc || it.useSpecs) && !seen.has(it.id) && seen.add(it.id));
    if (!todo.length) return;
    $("#impGo").disabled = true; $("#impProgress").hidden = false;
    let done = 0, ok = 0;
    for (const it of todo) {
      const body = {}; if (it.useDesc) body.description = it.description; if (it.useSpecs) body.specs = it.specs;
      try { const p = await api("api/products/" + it.id + "/update", { method: "POST", body: JSON.stringify(body) }); PRODUCTS[PRODUCTS.findIndex(x => x.id === p.id)] = p; it.result = "ok"; ok++; }
      catch (err) { it.result = err.message; }
      done++; $("#impBar").style.width = (done / todo.length * 100) + "%"; $("#impPct").textContent = `${done}/${todo.length}`;
      renderImp();
    }
    renderProducts(); toast(`Conteúdo aplicado a ${ok} de ${todo.length} produtos`);
  };

  // ---------- bulk product images ----------
  // File name → product: normalise both (lowercase, no accents, words joined by "-") and compare.
  const slug = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let bulkItems = [];
  function matchFile(name) {
    const f = slug(name.replace(/\.[^.]+$/, ""));
    const keys = p => [slug(p.name), p.id, slug(p.name + " " + p.sub)];
    const exact = PRODUCTS.filter(p => keys(p).includes(f));
    if (exact.length) return { id: exact[0].id, state: exact.length === 1 ? "ok" : "warn", note: exact.length === 1 ? "Nome igual" : `${exact.length} produtos com este nome` };
    const part = PRODUCTS.map(p => ({ p, k: slug(p.name) })).filter(({ k }) => k.length >= 3 && (f.includes(k) || k.includes(f)));
    if (!part.length) return { id: "", state: "no", note: "Sem correspondência" };
    const best = Math.max(...part.map(x => x.k.length)), top = part.filter(x => x.k.length === best);
    return { id: top[0].p.id, state: "warn", note: top.length === 1 ? "Nome parecido — confirme" : `${top.length} possíveis — confirme` };
  }
  const productOptions = sel => '<option value="">— não carregar —</option>' + CATEGORIES.map(c => `<optgroup label="${esc(c.name)}">${PRODUCTS.filter(p => p.cat === c.id)
    .map(p => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}${p.sub ? " — " + esc(p.sub) : ""}</option>`).join("")}</optgroup>`).join("");
  function renderBulk() {
    const counts = {};
    bulkItems.forEach(it => { if (it.id) counts[it.id] = (counts[it.id] || 0) + 1; });
    $("#bulkRows").innerHTML = bulkItems.map((it, i) => {
      const dup = it.id && counts[it.id] > 1, p = PRODUCTS.find(x => x.id === it.id);
      const flag = it.result ? `<span class="bulk-flag ${it.result === "ok" ? "done" : "err"}">${it.result === "ok" ? "Carregada" : esc(it.result)}</span>`
        : dup ? '<span class="bulk-flag warn">Mesmo produto noutra linha</span>'
        : !it.id ? '<span class="bulk-flag no">Não carregar</span>'
        : `<span class="bulk-flag ${it.state}">${esc(it.note)}${p && p.imageUrl ? " · substitui a atual" : ""}</span>`;
      return `<tr><td><img src="${it.preview}" alt=""></td><td class="fn">${esc(it.file.name)}</td>
        <td><select data-bi="${i}" ${it.result ? "disabled" : ""}>${productOptions(it.id)}</select></td><td>${flag}</td></tr>`;
    }).join("");
    const n = bulkItems.filter(it => it.id && !it.result).length;
    $("#bulkSummary").textContent = `${bulkItems.length} ficheiro(s) · ${n} para carregar`;
    $("#bulkGo").disabled = !n; $("#bulkGo").textContent = n ? `Carregar ${n} imagem${n === 1 ? "" : "s"}` : "Carregar";
  }
  $("#bulkFiles").onchange = e => {
    // some systems report no MIME type, so also accept by extension (the server checks the real file content)
    const files = [...e.target.files].filter(f => /^image\/(png|jpeg|webp|gif)$/.test(f.type) || /\.(png|jpe?g|webp|gif)$/i.test(f.name)); e.target.value = "";
    if (!files.length) return toast("Selecione imagens PNG, JPG, WebP ou GIF");
    bulkItems.forEach(it => URL.revokeObjectURL(it.preview));
    bulkItems = files.sort((a, b) => a.name.localeCompare(b.name)).map(file => ({ file, preview: URL.createObjectURL(file), ...matchFile(file.name) }));
    $("#bulkProgress").hidden = true; $("#bulkBar").style.width = "0"; $("#bulkPct").textContent = "";
    $("#bulkCancel").textContent = "Cancelar"; $("#bulkCancel").disabled = false;
    renderBulk(); $("#bulk").hidden = false;
  };
  $("#bulkRows").addEventListener("change", e => {
    const s = e.target.closest("[data-bi]"); if (!s) return;
    const it = bulkItems[+s.dataset.bi]; it.id = s.value; it.state = "ok"; it.note = "Escolhido manualmente"; renderBulk();
  });
  $("#bulkCancel").onclick = () => { $("#bulk").hidden = true; bulkItems.forEach(it => URL.revokeObjectURL(it.preview)); bulkItems = []; loadProducts(); };
  $("#bulkGo").onclick = async () => {
    const seen = new Set(), todo = [];
    bulkItems.forEach(it => { if (it.id && !it.result && !seen.has(it.id)) { seen.add(it.id); todo.push(it); } }); // one image per product
    if (!todo.length) return;
    $("#bulkGo").disabled = $("#bulkCancel").disabled = true; $("#bulkProgress").hidden = false;
    let done = 0, ok = 0;
    for (const it of todo) {
      const fd = new FormData(); fd.append("file", it.file);
      try { const p = await api("api/products/" + it.id + "/image", { method: "POST", body: fd }); PRODUCTS[PRODUCTS.findIndex(x => x.id === p.id)] = p; it.result = "ok"; ok++; }
      catch (err) { it.result = err.message; }
      done++; $("#bulkBar").style.width = (done / todo.length * 100) + "%"; $("#bulkPct").textContent = `${done}/${todo.length}`;
      renderBulk();
    }
    $("#bulkCancel").disabled = false; $("#bulkCancel").textContent = "Fechar";
    renderProducts(); toast(`${ok} de ${todo.length} imagens carregadas`);
  };

  // ---------- product reviews (moderation) ----------
  let REVIEWS = [], rvFilter = "pending", rvProd = "", rvSel = null;
  const dmyRv = iso => String(iso || "").slice(0, 10).split("-").reverse().join("/");
  const RV_SOURCES = { email: "Email", whatsapp: "WhatsApp", phone: "Telefone", sms: "SMS", in_person: "Presencial", other: "Outro" };
  const RV_LABEL = { pending: "Pendentes", approved: "Publicadas", rejected: "Rejeitadas", all: "Todas" };
  const pname = id => (PRODUCTS.find(p => p.id === id) || {}).name || id;
  async function loadReviews(quiet) {
    try { REVIEWS = await api("api/reviews/all"); renderReviews(); } catch (e) { if (!quiet) toast(e.message); }
  }
  function renderReviews() {
    const pending = REVIEWS.filter(r => r.status === "pending").length;
    $("#rvBadge").hidden = !pending; $("#rvBadge").textContent = pending;
    $("#rvChips").innerHTML = ["pending", "approved", "rejected", "all"].map(s =>
      `<button class="chip ${rvFilter === s ? "on" : ""}" data-rvs="${s}">${RV_LABEL[s]} ${s === "all" ? REVIEWS.length : REVIEWS.filter(r => r.status === s).length}</button>`).join("");
    const sel = $("#rvProduct"), ids = [...new Set(REVIEWS.map(r => r.productId))].sort((a, b) => pname(a).localeCompare(pname(b)));
    sel.innerHTML = '<option value="">Todos os produtos</option>' + ids.map(id => `<option value="${esc(id)}">${esc(pname(id))}</option>`).join("");
    sel.value = ids.includes(rvProd) ? rvProd : (rvProd = "");
    const list = REVIEWS.filter(r => (rvFilter === "all" || r.status === rvFilter) && (!rvProd || r.productId === rvProd));
    $("#rvAdmin").innerHTML = list.length ? list.map(r => `
      <article class="rva st-${r.status}" data-rid="${r.id}">
        <div>
          <span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span> <b>${esc(pname(r.productId))}</b>
          <p>${esc(r.text)}</p>
          <div class="meta">${esc(r.author)} · ${r.verified ? fmtDate(r.createdAt) + " · encomenda " + esc(r.orderNumber || "") : `${dmyRv(r.createdAt)} · <span class="src">recebida por ${esc(r.sourceLabel || "")}</span>`} · <span class="badge s-${r.status === "approved" ? "delivered" : r.status === "rejected" ? "cancelled" : "pending"}">${RV_LABEL[r.status].replace(/s$/, "").replace(/Pendente$/, "Pendente")}</span></div>
        </div>
        <div class="acts">
          ${r.status !== "approved" ? '<button type="button" class="btn-ok" data-rva="approved">Publicar</button>' : ""}
          ${r.status !== "rejected" ? '<button type="button" class="ghost" data-rva="rejected">Rejeitar</button>' : ""}
          ${r.verified ? "" : '<button type="button" class="ghost" data-rva="edit">Editar</button>'}
          <button type="button" class="ghost danger-ghost" data-rva="delete">Eliminar</button>
        </div>
        <div class="reply"><textarea rows="1" maxlength="1000" placeholder="Resposta pública da loja (opcional)">${esc(r.reply)}</textarea><button type="button" class="ghost" data-rva="reply">Guardar resposta</button></div>
      </article>`).join("") : `<p class="empty" style="background:#fff;border-radius:14px">${rvFilter === "pending" ? "Não há avaliações à espera de revisão." : "Nada para mostrar."}</p>`;
  }
  $("#rvChips").onclick = e => { const b = e.target.closest("[data-rvs]"); if (b) { rvFilter = b.dataset.rvs; renderReviews(); } };
  $("#rvProduct").onchange = e => { rvProd = e.target.value; renderReviews(); };

  // reviews typed in by the admin (sent by a customer through WhatsApp, email, ...)
  const rf = $("#rvform");
  rf.source.innerHTML = '<option value="">Escolher…</option>' + Object.entries(RV_SOURCES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  const rvCount = () => { $("#rvcount").textContent = `(${rf.text.value.length}/1500)`; };
  rf.text.oninput = rvCount;
  function openRvForm(r) {
    rvSel = r ? r.id : null;
    rf.productId.innerHTML = '<option value="">Escolher produto…</option>' + [...PRODUCTS].sort((a, b) => a.name.localeCompare(b.name))
      .map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.sub ? " · " + esc(p.sub) : ""}</option>`).join("");
    rf.reset();
    if (r) {
      rf.productId.value = r.productId; rf.author.value = r.author; rf.rating.value = r.rating; rf.text.value = r.text;
      rf.source.value = r.source || ""; rf.receivedAt.value = String(r.createdAt).slice(0, 10); rf.reply.value = r.reply;
      rf.published.checked = r.status === "approved";
    } else {
      rf.productId.value = rvProd; rf.receivedAt.value = new Date().toISOString().slice(0, 10);
    }
    $("#rvformTitle").textContent = r ? "Editar avaliação" : "Escrever avaliação";
    $("#rvConfirmWrap").hidden = !!r; $("#rvformErr").textContent = "";
    rvCount(); rf.hidden = false; rf.scrollIntoView({ behavior: "smooth", block: "start" }); (r ? rf.text : rf.productId).focus();
  }
  $("#newReview").onclick = () => openRvForm(null);
  $("#rvclose").onclick = () => { rf.hidden = true; rvSel = null; };
  rf.onsubmit = async e => {
    e.preventDefault(); $("#rvformErr").textContent = "";
    const body = { productId: rf.productId.value, author: rf.author.value, rating: rf.rating.value, text: rf.text.value,
      source: rf.source.value, receivedAt: rf.receivedAt.value, reply: rf.reply.value };
    try {
      if (rvSel === null) {
        await api("api/reviews", { method: "POST", body: JSON.stringify({ ...body, published: rf.published.checked, confirmReal: rf.confirmReal.checked }) });
        toast(rf.published.checked ? "Avaliação publicada" : "Avaliação guardada (pendente)");
      } else {
        await api("api/reviews/" + rvSel + "/update", { method: "POST", body: JSON.stringify({ ...body, status: rf.published.checked ? "approved" : "pending" }) });
        toast("Avaliação guardada");
      }
      rf.hidden = true; rvSel = null;
      rvFilter = rf.published.checked ? "approved" : "pending";
      await loadReviews(); loadProducts();
    } catch (err) { $("#rvformErr").textContent = err.message; }
  };
  $("#rvAdmin").onclick = async e => {
    const b = e.target.closest("[data-rva]"); if (!b) return;
    const art = b.closest("[data-rid]"), id = art.dataset.rid, act = b.dataset.rva;
    try {
      if (act === "edit") { openRvForm(REVIEWS.find(r => r.id === +id)); return; }
      if (act === "delete") {
        if (!confirm("Eliminar esta avaliação? O cliente não poderá voltar a avaliar este produto com o mesmo link.")) return;
        await api("api/reviews/" + id + "/delete", { method: "POST" }); REVIEWS = REVIEWS.filter(r => r.id !== +id); toast("Avaliação eliminada");
      } else {
        const body = act === "reply" ? { reply: art.querySelector("textarea").value } : { status: act };
        const r = await api("api/reviews/" + id + "/update", { method: "POST", body: JSON.stringify(body) });
        REVIEWS[REVIEWS.findIndex(x => x.id === r.id)] = r;
        toast(act === "approved" ? "Avaliação publicada" : act === "rejected" ? "Avaliação rejeitada" : "Resposta guardada");
      }
      renderReviews(); loadProducts();
    } catch (err) { toast(err.message); }
  };

  // ---------- testimonials ----------
  const SOURCES = { email: "Email", whatsapp: "WhatsApp", phone: "Telefone", sms: "SMS", in_person: "Presencial", other: "Outro" };
  let TESTI = [], tSel = null, tNew = false;
  const tf = $("#tform");
  tf.source.innerHTML = '<option value="">Escolher…</option>' + Object.entries(SOURCES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  const today = () => new Date().toISOString().slice(0, 10);
  const dmy = d => d ? d.split("-").reverse().join("/") : "";
  async function loadTestimonials() { try { TESTI = await api("api/testimonials/all"); renderTesti(); } catch (e) { toast(e.message); } }
  function renderTesti() {
    $("#tgrid").innerHTML = TESTI.length ? TESTI.map(t => `
      <article class="tcard ${t.published ? "" : "off"} ${tSel === t.id ? "sel" : ""}" data-tid="${t.id}">
        ${t.imageUrl ? `<div class="tc-img" style="background-image:url('${esc(window.Brand.url(t.imageUrl))}')"></div>` : ""}
        <div class="tc-body">
          ${t.rating ? `<span class="stars">${"★".repeat(t.rating)}${"☆".repeat(5 - t.rating)}</span>` : ""}
          <div class="tc-text">“${esc(t.text)}”</div>
          <div class="tc-meta"><span><b>${esc(t.author)}</b>${t.location ? ", " + esc(t.location) : ""}</span><span>${dmy(t.receivedAt)} · ${SOURCES[t.source] || ""}</span></div>
          <span class="badge ${t.published ? "s-delivered" : "s-cancelled"}" style="align-self:flex-start">${t.published ? "Publicado" : "Oculto"}</span>
        </div>
      </article>`).join("") : '<p class="empty">Ainda não há testemunhos. Clique em "+ Novo testemunho" para adicionar uma mensagem que recebeu de um cliente.</p>';
  }
  function showTForm(show) { tf.hidden = !show; $("#tLayout").classList.toggle("with-panel", show); }
  const tCounter = () => { $("#tcount").textContent = `(${tf.text.value.length}/600)`; };
  tf.text.oninput = tCounter;
  function renderTImage(t) {
    $("#timgPrev").innerHTML = t && t.imageUrl ? `<img src="${esc(window.Brand.url(t.imageUrl))}" alt="">` : "Sem foto";
    $("#timgRemove").disabled = !(t && t.imageUrl);
    $("#timgFile").disabled = !t; $("#timgFile").parentElement.style.opacity = t ? "" : ".5";
    $("#timgHint").textContent = t ? "Opcional: foto enviada pelo cliente (ex.: da encomenda recebida). PNG, JPG, WebP ou GIF até 4 MB." : "Guarde o testemunho primeiro para poder carregar a foto.";
  }
  function openTesti(id) {
    const t = TESTI.find(x => x.id === id); if (!t) return;
    tSel = id; tNew = false; renderTesti();
    $("#tformTitle").textContent = "Editar testemunho";
    tf.author.value = t.author; tf.location.value = t.location; tf.text.value = t.text; tf.rating.value = t.rating || "";
    tf.source.value = t.source; tf.receivedAt.value = t.receivedAt; tf.position.value = t.position; tf.published.checked = t.published;
    $("#confirmWrap").hidden = true; $("#tdelete").disabled = false; $("#tformErr").textContent = "";
    tCounter(); renderTImage(t); showTForm(true);
  }
  $("#tgrid").onclick = e => { const c = e.target.closest("[data-tid]"); if (c) openTesti(+c.dataset.tid); };
  $("#newTestimonial").onclick = () => {
    tSel = null; tNew = true; renderTesti(); tf.reset();
    tf.receivedAt.value = today(); tf.receivedAt.max = today(); tf.published.checked = true; tf.position.value = 0;
    $("#tformTitle").textContent = "Novo testemunho"; $("#confirmWrap").hidden = false; $("#tdelete").disabled = true; $("#tformErr").textContent = "";
    tCounter(); renderTImage(null); showTForm(true); tf.author.focus();
  };
  $("#tclose").onclick = () => { tSel = null; tNew = false; showTForm(false); renderTesti(); };
  tf.onsubmit = async e => {
    e.preventDefault(); $("#tformErr").textContent = "";
    const body = { author: tf.author.value, location: tf.location.value, text: tf.text.value, rating: tf.rating.value, source: tf.source.value,
      receivedAt: tf.receivedAt.value, position: tf.position.value || 0, published: tf.published.checked };
    if (tNew) body.confirmReal = tf.confirmReal.checked;
    const creating = tNew;
    try {
      const t = tNew ? await api("api/testimonials", { method: "POST", body: JSON.stringify(body) })
                     : await api("api/testimonials/" + tSel + "/update", { method: "POST", body: JSON.stringify(body) });
      await loadTestimonials(); openTesti(t.id);
      toast(creating ? "Testemunho criado — já pode carregar a foto" : "Testemunho guardado");
    } catch (err) { $("#tformErr").textContent = err.message; }
  };
  $("#timgFile").onchange = async e => {
    const file = e.target.files[0]; e.target.value = ""; if (!file || !tSel) return;
    const fd = new FormData(); fd.append("file", file);
    try { const t = await api("api/testimonials/" + tSel + "/image", { method: "POST", body: fd }); TESTI[TESTI.findIndex(x => x.id === t.id)] = t; renderTImage(t); renderTesti(); toast("Foto atualizada"); }
    catch (err) { toast(err.message); }
  };
  $("#timgRemove").onclick = async () => {
    if (!tSel || !confirm("Remover a foto deste testemunho?")) return;
    try { const t = await api("api/testimonials/" + tSel + "/image/delete", { method: "POST" }); TESTI[TESTI.findIndex(x => x.id === t.id)] = t; renderTImage(t); renderTesti(); toast("Foto removida"); }
    catch (err) { toast(err.message); }
  };
  $("#tdelete").onclick = async () => {
    if (!tSel || !confirm("Eliminar este testemunho? Esta ação não pode ser anulada.")) return;
    try { await api("api/testimonials/" + tSel + "/delete", { method: "POST" }); tSel = null; showTForm(false); await loadTestimonials(); toast("Testemunho eliminado"); }
    catch (err) { toast(err.message); }
  };

  // ---------- goals (Objetivos) ----------
  function renderGoalPick(sel) {
    $("#pformGoals").innerHTML = GOALS.length ? GOALS.map(g => `<label><input type="checkbox" value="${esc(g.id)}" ${sel.includes(g.id) ? "checked" : ""}>${esc(g.name)}</label>`).join("")
      : '<span class="hint" style="margin:0">Crie objetivos em Categorias → Objetivos.</span>';
  }
  let goalDraft = [];
  function renderGoalList(draft) {
    goalDraft = draft || GOALS.map(g => ({ ...g }));
    $("#goalList").innerHTML = goalDraft.map((g, i) => `<li data-gi="${i}">
      <span><button type="button" data-gm="-1" ${i ? "" : "disabled"}>▲</button><button type="button" data-gm="1" ${i < goalDraft.length - 1 ? "" : "disabled"}>▼</button></span>
      <input value="${esc(g.name)}" maxlength="40" data-gn>
      <span class="n">${g.id ? PRODUCTS.filter(p => (p.goals || []).includes(g.id)).length + " prod." : "novo"}</span>
      <button type="button" class="gdel" data-gd aria-label="Remover">✕</button></li>`).join("");
  }
  $("#goalList").addEventListener("input", e => { if (e.target.matches("[data-gn]")) goalDraft[+e.target.closest("li").dataset.gi].name = e.target.value; });
  $("#goalList").addEventListener("click", e => {
    const li = e.target.closest("li"); if (!li) return; const i = +li.dataset.gi;
    const mv = e.target.closest("[data-gm]");
    if (mv && !mv.disabled) { const j = i + +mv.dataset.gm; [goalDraft[i], goalDraft[j]] = [goalDraft[j], goalDraft[i]]; renderGoalList(goalDraft); }
    if (e.target.closest("[data-gd]")) {
      const n = goalDraft[i].id ? PRODUCTS.filter(p => (p.goals || []).includes(goalDraft[i].id)).length : 0;
      if (n && !confirm(`Remover "${goalDraft[i].name}"? Deixa de estar associado a ${n} produto(s).`)) return;
      goalDraft.splice(i, 1); renderGoalList(goalDraft);
    }
  });
  const addGoal = () => { const v = $("#goalNew").value.trim(); if (!v) return; goalDraft.push({ name: v }); $("#goalNew").value = ""; renderGoalList(goalDraft); };
  $("#goalAdd").onclick = addGoal;
  $("#goalNew").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } });
  $("#goalSave").onclick = async () => {
    $("#goalErr").textContent = "";
    try { GOALS = await api("api/goals", { method: "POST", body: JSON.stringify({ goals: goalDraft }) }); await loadProducts(); toast("Objetivos guardados"); }
    catch (err) { $("#goalErr").textContent = err.message; }
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
    window.Brand.apply({ ...window.BRAND, storeName: f.storeName || window.BRAND.storeName, logoText: f.logoText, logoSub: f.logoSub, logoHeight: +f.logoHeight,
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
    bf.paymentInfo.value = PAYMENT_INFO;
    bf.logoHeight.value = b.logoHeight || 52; $("#logoHVal").textContent = bf.logoHeight.value;
    contrastHint(b.primaryColor); renderBrandMedia(); $("#brandErr").textContent = "";
  }
  bf.primaryColor.oninput = () => { bf.primaryHex.value = bf.primaryColor.value; contrastHint(bf.primaryColor.value); previewBrand(); };
  bf.primaryHex.oninput = () => { const v = bf.primaryHex.value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) { bf.primaryColor.value = v; contrastHint(v); previewBrand(); } };
  ["storeName", "logoText", "logoSub"].forEach(n => bf[n].addEventListener("input", () => previewBrand()));
  bf.logoHeight.addEventListener("input", () => { $("#logoHVal").textContent = bf.logoHeight.value; previewBrand(); });
  bf.onsubmit = async e => {
    e.preventDefault(); $("#brandErr").textContent = "";
    const f = Object.fromEntries(new FormData(bf));
    try {
      const b = await api("api/settings", { method: "POST", body: JSON.stringify({ storeName: f.storeName, logoText: f.logoText, logoSub: f.logoSub, primaryColor: f.primaryColor, supportEmail: f.supportEmail, logoHeight: +f.logoHeight, paymentInfo: f.paymentInfo }) });
      PAYMENT_INFO = f.paymentInfo || "";
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
