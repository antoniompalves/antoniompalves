(() => {
  const P = window.PRODUCTS, C = window.CATEGORIES;
  const $ = (s, el = document) => el.querySelector(s);
  const eur = n => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
  const finalPrice = window.unitPrice;
  const catName = id => (C.find(c => c.id === id) || {}).name || id;
  const brandLabel = () => ((window.BRAND && (window.BRAND.logoText || window.BRAND.storeName)) || "FORGE").toUpperCase().slice(0, 12);
  const vial = (label = brandLabel()) => `<div class="vial" data-label="${label}"></div>`;
  // product picture: uploaded image when available, otherwise the drawn bottle
  const art = (p, label) => p && p.imageUrl ? `<img class="pimg" src="${esc(window.Brand.url(p.imageUrl))}" alt="${esc(p.name)}" loading="lazy">` : vial(label);
  // plain-text description → paragraphs (always escaped, no HTML from the database)
  const paras = t => String(t || "").trim().split(/\n\s*\n/).map(x => `<p>${esc(x.trim()).replace(/\n/g, "<br>")}</p>`).join("");
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- cart (localStorage, guarded) ----------
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem("forge-cart")) || {}; } catch { cart = {}; }
  const save = () => { try { localStorage.setItem("forge-cart", JSON.stringify(cart)); } catch {} };
  const bulk = window.bulkRate;

  // stock: null = not tracked (unlimited)
  const maxQty = p => (p && p.stock !== null && p.stock !== undefined ? p.stock : 999);
  const soldOut = p => maxQty(p) <= 0;
  const stockBadge = p => {
    if (!p || p.stock === null || p.stock === undefined) return "";
    if (p.stock <= 0) return `<span class="stock out">Esgotado</span>`;
    if (p.stock <= (p.lowStock ?? 5)) return `<span class="stock low">Últimas ${p.stock} unidade${p.stock === 1 ? "" : "s"}</span>`;
    return `<span class="stock ok">Em stock</span>`;
  };
  function addToCart(id, qty = 1) {
    const p = P.find(x => x.id === id), max = maxQty(p), have = cart[id] || 0;
    if (have >= max) return toast(max <= 0 ? "Produto esgotado" : `Só há ${max} unidade${max === 1 ? "" : "s"} em stock`);
    const add = Math.min(qty, max - have);
    cart[id] = have + add;
    save(); renderCart();
    toast(add < qty ? `Adicionadas ${add} — limite de stock atingido` : "Adicionado! Precisa de mais?");
  }
  function renderCart() {
    // drop unknown products and clamp quantities to what is in stock
    Object.keys(cart).forEach(id => { const p = P.find(x => x.id === id); if (!p || soldOut(p)) delete cart[id]; else if (cart[id] > maxQty(p)) cart[id] = maxQty(p); });
    const ids = Object.keys(cart).filter(id => cart[id] > 0);
    let total = 0, disc = 0, count = 0;
    $("#cartItems").innerHTML = ids.length ? ids.map(id => {
      const p = P.find(x => x.id === id), q = cart[id];
      const line = finalPrice(p) * q, d = line * bulk(q);
      total += line - d; disc += d; count += q;
      return `<div class="ci"><div class="th">${art(p, "")}</div>
        <div class="info"><b>${esc(p.name)}</b><small>${eur(finalPrice(p))} cada${bulk(q) ? ` · −${bulk(q) * 100}% por quantidade` : ""}</small></div>
        <div class="qty"><button data-q="-1" data-id="${id}">−</button><span>${q}</span><button data-q="1" data-id="${id}" ${q >= maxQty(p) ? "disabled" : ""}>+</button></div></div>`;
    }).join("") : `<p class="muted" style="text-align:center;padding:40px 0">O seu carrinho está vazio.</p>`;
    $("#cartTotal").textContent = eur(total);
    $("#cartDisc").textContent = "−" + eur(disc);
    $("#cartCount").textContent = count;
  }
  $("#cartItems").addEventListener("click", e => {
    const b = e.target.closest("[data-q]"); if (!b) return;
    const pp = P.find(x => x.id === b.dataset.id);
    cart[b.dataset.id] = Math.min(maxQty(pp), Math.max(0, (cart[b.dataset.id] || 0) + +b.dataset.q));
    if (!cart[b.dataset.id]) delete cart[b.dataset.id];
    save(); renderCart();
  });
  const openCart = v => document.body.classList.toggle("cart-open", v);
  $("#openCart").onclick = () => openCart(true);
  $("#closeCart").onclick = $("#overlay").onclick = () => { openCart(false); if (!$("#orderDone").hidden) showStep("cart"); };
  const form = $("#preorder"), done = $("#orderDone");
  const showStep = step => {
    $("#cartItems").hidden = $(".drawer-foot").hidden = step !== "cart";
    form.hidden = step !== "form"; done.hidden = step !== "done";
  };
  $("#checkout").onclick = () => { if (!Object.keys(cart).length) return toast("O seu carrinho está vazio"); showStep("form"); };
  $("#backToCart").onclick = () => showStep("cart");
  form.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form)), btn = $("#submitOrder");
    $("#formErr").textContent = ""; btn.disabled = true; btn.textContent = "A enviar…";
    try {
      const r = await fetch(window.Brand.url("api/orders"), { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: f, notes: f.notes, items: Object.entries(cart).map(([id, qty]) => ({ id, qty })) }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409) refreshProducts();
      if (!r.ok) throw new Error(d.error || "Não foi possível enviar a pré-encomenda");
      cart = {}; save(); renderCart(); form.reset();
      done.innerHTML = `<div class="tick">✓</div><h3>Pré-encomenda recebida</h3><p>A sua referência é <b>${esc(d.number)}</b>.</p>
        <p class="muted">Total estimado: ${eur(d.total)}. Entraremos em contacto para confirmar — não foi efetuado qualquer pagamento.</p>
        <button class="btn-orange" id="doneClose">Continuar a comprar</button>`;
      showStep("done");
      $("#doneClose").onclick = () => { openCart(false); showStep("cart"); };
    } catch (err) {
      $("#formErr").textContent = location.protocol === "file:" ? "Abra a loja através do servidor web (não como ficheiro local) para enviar pré-encomendas." : err.message;
    } finally { btn.disabled = false; btn.textContent = "Enviar pré-encomenda"; }
  };

  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1800); }

  // ---------- cards ----------
  const card = (p, i) => `
    <article class="card">
      <div class="img v${i % 3}" data-open="${p.id}">${p.promo ? `<span class="badge">−${p.promo}%</span>` : ""}${art(p)}</div>
      <div class="body">
        <span class="name">${esc(p.name)}</span><span class="sub">${esc(p.sub)}</span>
        <div class="pr"><b>${eur(finalPrice(p))}</b>${p.promo ? `<s>${eur(p.price)}</s>` : ""}</div>
        <div class="meta"><span>⚗ Testado em lab.</span><span>★ ${p.reviews} avaliações</span><span>⛟ Stock UE</span></div>
        ${stockBadge(p)}
        <button class="add" data-add="${p.id}" ${soldOut(p) ? "disabled" : ""}>${soldOut(p) ? "Esgotado" : "Adicionar ao carrinho"}</button>
      </div>
    </article>`;

  // featured hero card
  let feat;
  function renderFeatured() {
    feat = P.find(p => p.best && p.promo) || P.find(p => p.best) || P[0];
    if (!feat) return;
    $("#featCard").innerHTML = `<div class="thumb"><span class="tag">Mais vendido</span>${art(feat)}</div>
      <h3>${esc(feat.name)}</h3><div class="price">${eur(finalPrice(feat))}</div>
      <small>${esc(feat.sub)}${feat.promo ? ` • −${feat.promo}% sobre ${eur(feat.price)}` : ""}</small>`;
    $("#featCard").dataset.open = feat.id;
    $("#bestTrack").innerHTML = P.filter(p => p.best).map(card).join("");
  }
  renderFeatured();
  document.querySelectorAll(".arrow").forEach(a => a.onclick = () => {
    const t = $("#bestTrack"); t.scrollBy({ left: +a.dataset.dir * t.clientWidth / 1.5, behavior: "smooth" });
  });

  // ---------- collection ----------
  let filter = "all", query = "", page = 1;
  const PER_PAGE = 12;
  function renderChips() {
    const all = [{ id: "all", name: "Todos", count: P.length }, { id: "new", name: "Novidades", count: P.filter(p => p.fresh).length }, { id: "promo", name: "Promoções", count: P.filter(p => p.promo).length },
      ...C.map(c => ({ ...c, count: P.filter(p => p.cat === c.id).length })).filter(c => c.count)];
    $("#chips").innerHTML = all.map(c => `<button class="chip ${filter === c.id ? "on" : ""}" data-chip="${c.id}">${c.name}<small>${c.count}</small></button>`).join("");
  }
  function renderGrid() {
    const q = query.toLowerCase();
    const list = P.filter(p => (filter === "all" || p.cat === filter || (filter === "new" && p.fresh) || (filter === "promo" && p.promo))
      && (!q || (p.name + " " + p.sub + " " + catName(p.cat)).toLowerCase().includes(q)));
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    page = Math.min(Math.max(1, page), pages);
    const start = (page - 1) * PER_PAGE, shown = list.slice(start, start + PER_PAGE);
    $("#grid").innerHTML = shown.length ? shown.map(card).join("") : `<div class="empty">Sem resultados</div>`;
    renderPager(list.length, pages, start, shown.length);
  }
  function renderPager(total, pages, start, n) {
    const el = $("#pager");
    if (pages <= 1) { el.innerHTML = total ? `<span class="pg-info">${total} produtos</span>` : ""; return; }
    // compact range: 1 … p-1 p p+1 … last
    const nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== "…") nums.push("…");
    el.innerHTML = `<span class="pg-info">${start + 1}–${start + n} de ${total} produtos</span>
      <div class="pg-btns">
        <button data-pg="${page - 1}" ${page === 1 ? "disabled" : ""} aria-label="Página anterior">‹</button>
        ${nums.map(x => x === "…" ? `<span class="pg-gap">…</span>` : `<button data-pg="${x}" class="${x === page ? "on" : ""}" ${x === page ? 'aria-current="page"' : ""}>${x}</button>`).join("")}
        <button data-pg="${page + 1}" ${page === pages ? "disabled" : ""} aria-label="Página seguinte">›</button>
      </div>`;
  }
  const setFilter = f => { filter = f; page = 1; renderChips(); renderGrid(); };
  $("#pager").addEventListener("click", e => {
    const b = e.target.closest("[data-pg]"); if (!b || b.disabled) return;
    page = +b.dataset.pg; renderGrid();
    $("#collection").scrollIntoView({ behavior: "smooth" });
  });
  $("#chips").addEventListener("click", e => { const c = e.target.closest("[data-chip]"); if (c) setFilter(c.dataset.chip); });
  $("#search").addEventListener("input", e => { query = e.target.value; page = 1; renderGrid(); });
  document.querySelectorAll("[data-filter]").forEach(el => el.addEventListener("click", () => {
    setFilter(el.dataset.filter); $("#collection").scrollIntoView({ behavior: "smooth" });
  }));

  // ---------- detail ----------
  let dQty = 1;
  function renderDetail(id) {
    const p = P.find(x => x.id === id) || P[0]; dQty = 1;
    $("#detail").innerHTML = `
      <div class="hero-img${p.imageUrl ? " has-img" : ""}">${art(p)}</div>
      <div>
        <h2>${esc(p.name)}</h2>
        <div class="meta"><span>⚗ Testado em lab.</span><span>★ ${p.reviews} avaliações</span><span>⛟ Stock UE</span></div>
        <p>${esc(p.sub)}. Categoria: ${catName(p.cat)}. Enviado de forma discreta a partir de stock na UE, com entrega rastreada.</p>
        <small class="muted">Opções de quantidade</small>
        <div class="opts"><span class="opt on">1 unidade</span><span class="opt">5 unidades · −5%</span><span class="opt">10 unidades · −10%</span></div>
        <div class="buyrow">
          <div><b>${eur(finalPrice(p))}</b>${p.promo ? `<s>${eur(p.price)}</s>` : ""}</div>
          <div class="qty"><button data-dq="-1">−</button><span id="dQty">1</span><button data-dq="1">+</button></div>
        </div>
        ${stockBadge(p)}
        <button class="btn-orange" data-dadd="${p.id}" ${soldOut(p) ? "disabled" : ""}>${soldOut(p) ? "Esgotado" : "Adicionar ao carrinho"}</button>
        <details class="acc" open><summary>Detalhes</summary><div>${p.description ? paras(p.description) : `${esc(p.name)} — ${esc(p.sub)}. Cada lote é testado em laboratório antes do envio.`}</div></details>
        <details class="acc"><summary>Utilização</summary><div>Leia atentamente as instruções. Não exceda a dose recomendada. Consulte o seu médico antes de utilizar.</div></details>
        <details class="acc"><summary>Envio</summary><div>Embalagem discreta, envio rastreado a partir de stock na UE.</div></details>
      </div>`;
    $("#detail .opts").onclick = e => {
      const o = e.target.closest(".opt"); if (!o) return;
      [...$("#detail .opts").children].forEach(x => x.classList.toggle("on", x === o));
      dQty = parseInt(o.textContent); $("#dQty").textContent = dQty;
    };
  }

  document.addEventListener("click", e => {
    const add = e.target.closest("[data-add]"); if (add) return addToCart(add.dataset.add);
    const op = e.target.closest("[data-open]");
    if (op) { renderDetail(op.dataset.open); $("#detail").scrollIntoView({ behavior: "smooth" }); return; }
    const dq = e.target.closest("[data-dq]");
    if (dq) { const dp = P.find(x => x.id === $("[data-dadd]").dataset.dadd); dQty = Math.min(Math.max(1, maxQty(dp)), Math.max(1, dQty + +dq.dataset.dq)); $("#dQty").textContent = dQty; return; }
    const da = e.target.closest("[data-dadd]"); if (da) addToCart(da.dataset.dadd, dQty);
  });

  // ---------- reviews + faq ----------
  const quotes = [
    ["Entrega rápida na UE e a embalagem era totalmente discreta. Voltarei a encomendar.", "Marco, Itália"],
    ["O desconto por quantidade fez mesmo diferença. O apoio respondeu em menos de uma hora.", "Lukas, Alemanha"],
    ["Chegou em quatro dias, exatamente como descrito. Excelente experiência.", "Sofia, Portugal"],
  ];
  let qi = 1;
  const showQuote = () => { const [t, a] = quotes[qi]; $("#quote").innerHTML = `“${t}”<cite>— ${a}</cite>`; $(".big").innerHTML = `0${qi + 1}<sup>/0${quotes.length}</sup>`; };
  showQuote(); setInterval(() => { qi = (qi + 1) % quotes.length; showQuote(); }, 5000);
  $("#faqList").innerHTML = window.FAQ.map(([q, a]) => `<details class="acc"><summary>${q}</summary><div>${a}</div></details>`).join("");

  // ---------- nav ----------
  $("#burger").onclick = () => $("#navPills").classList.toggle("open");
  $("#navPills").addEventListener("click", e => {
    const a = e.target.closest("a"); if (!a) return;
    [...$("#navPills").children].forEach(x => x.classList.toggle("active", x === a));
    $("#navPills").classList.remove("open");
  });

  $("#prodCount").textContent = P.length;
  renderChips(); renderGrid(); if (feat) renderDetail(feat.id); renderCart();

  // category tiles on the home page follow the first two categories that have products
  function renderTiles() {
    const cats = C.filter(c => P.some(p => p.cat === c.id));
    document.querySelectorAll("[data-tile]").forEach(el => {
      const c = cats[+el.dataset.tile];
      el.hidden = !c;
      if (!c) return;
      const min = Math.min(...P.filter(p => p.cat === c.id).map(finalPrice));
      el.dataset.filter = c.id;
      el.querySelector("h4").textContent = c.name;
      el.querySelector("small").textContent = "desde " + eur(min);
    });
  }

  // products and categories edited in the backoffice come from the API;
  // products.js is only the fallback when the page is opened without the server.
  async function refreshProducts() {
    try {
      const [rc, r] = await Promise.all([fetch(window.Brand.url("api/categories"), { cache: "no-store" }), fetch(window.Brand.url("api/products"), { cache: "no-store" })]);
      if (!r.ok || !rc.ok) return;
      const [cats, list] = await Promise.all([rc.json(), r.json()]);
      if (!Array.isArray(list) || !Array.isArray(cats)) return;
      C.splice(0, C.length, ...cats);
      P.splice(0, P.length, ...list);
      if (filter !== "all" && filter !== "new" && filter !== "promo" && !C.some(c => c.id === filter)) filter = "all";
      renderTiles();
      $("#prodCount").textContent = P.length;
      renderFeatured(); renderChips(); renderGrid(); if (feat) renderDetail(feat.id); renderCart();
    } catch {}
  }
  refreshProducts();
  // re-render product art once the configured brand is known
  document.addEventListener("brand:applied", () => document.querySelectorAll(".vial[data-label]").forEach(v => { if (v.dataset.label) v.dataset.label = brandLabel(); }));
  window.Brand.load();
})();
