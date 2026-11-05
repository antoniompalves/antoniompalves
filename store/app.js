(() => {
  const P = window.PRODUCTS, C = window.CATEGORIES;
  const G = [];                                         // goals ("Objetivos"), loaded from the API
  const PAGE = window.PAGE || { type: "home" };          // set by produto.php on product pages
  const isProduct = PAGE.type === "product";
  const $ = (s, el = document) => el.querySelector(s);
  const purl = id => window.Brand.url("produto/" + encodeURIComponent(id));
  const eur = n => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
  const finalPrice = window.unitPrice;
  const catName = id => (C.find(c => c.id === id) || {}).name || id;
  const brandLabel = () => ((window.BRAND && (window.BRAND.logoText || window.BRAND.storeName)) || "FORGE").toUpperCase().slice(0, 12);
  const vial = (label = brandLabel()) => `<div class="vial" data-label="${label}"></div>`;
  // product picture: uploaded image when available, otherwise the drawn bottle
  const art = (p, label) => p && p.imageUrl ? `<img class="pimg" src="${esc(window.Brand.url(p.imageUrl))}" alt="${esc(p.name)}" loading="lazy">` : vial(label);
  // plain-text description → paragraphs (always escaped, no HTML from the database)
  const md = t => window.Md.render(t);
  // first paragraph of the description (without markdown) for the short "Detalhes" box
  const firstPara = t => (String(t || "").replace(/\r/g, "").split(/\n\s*\n/).map(x => x.trim()).find(x => x && !/^#{1,6}\s/.test(x) && !/^[-*•]\s/.test(x)) || "").replace(/\*\*/g, "");
  const paras = t => String(t || "").trim().split(/\n\s*\n/).map(x => `<p>${esc(x.trim()).replace(/\n/g, "<br>")}</p>`).join("");
  // real reviews from verified buyers (count + average come from the API)
  const num1 = n => String(n).replace(".", ",");
  const ratingMeta = p => p.reviews ? `<span class="rating">★ ${num1(p.rating)}</span><span>${p.reviews} avaliaç${p.reviews === 1 ? "ão" : "ões"}</span>` : "<span>Sem avaliações</span>";
  const starRow = r => `<span class="rating" aria-label="${r} de 5 estrelas">${"★".repeat(r)}<span style="color:#ddd">${"★".repeat(5 - r)}</span></span>`;
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- cart (localStorage, guarded) ----------
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem("forge-cart")) || {}; } catch { cart = {}; }
  const save = () => { try { localStorage.setItem("forge-cart", JSON.stringify(cart)); } catch {} };
  const bulk = window.bulkRate;

  // stock: null = not tracked. Products without stock can still be ordered: delivery up to 3 weeks.
  const tracked = p => p && p.stock !== null && p.stock !== undefined;
  const maxQty = () => 999;
  const soldOut = () => false;
  const inStock = p => tracked(p) ? Math.max(0, p.stock) : Infinity;
  const stockBadge = p => {
    if (!tracked(p)) return "";
    if (p.stock <= 0) return `<span class="stock bo">Por encomenda · até 3 semanas</span>`;
    if (p.stock <= (p.lowStock ?? 5)) return `<span class="stock low">Últimas ${p.stock} em stock · entrega imediata</span>`;
    return `<span class="stock ok">Em stock · entrega imediata</span>`;
  };
  const resellerHint = () => " Em alternativa, pode contactar um <b>revendedor oficial</b>.";
  // delivery box on the product page
  const deliveryBox = p => {
    const line = !tracked(p) ? "Entrega em Portugal: imediata se houver stock, caso contrário até 3 semanas."
      : p.stock > 0 ? `Entrega imediata em Portugal (${p.stock} em stock). Quantidades acima do stock: até 3 semanas.`
      : "Sem stock imediato: entrega em Portugal até 3 semanas.";
    return `<div class="delivery"><p>🚚 ${line}</p><p>📦 Enviado sempre em embalagem discreta.</p><p>💬 Depois de registar, recebe uma mensagem por email ou WhatsApp para confirmar a encomenda e fazer o pagamento; depois, a confirmação do pagamento e o tracking do envio.</p><p>💳 A encomenda só é processada após a validação do pagamento.${resellerHint()}</p></div>`;
  };
  function addToCart(id, qty = 1) {
    const p = P.find(x => x.id === id), max = maxQty(p), have = cart[id] || 0;
    if (have >= max) return toast(max <= 0 ? "Produto esgotado" : `Só há ${max} unidade${max === 1 ? "" : "s"} em stock`);
    const add = Math.min(qty, max - have);
    cart[id] = have + add;
    save(); renderCart();
    toast(add < qty ? `Adicionadas ${add} — limite de stock atingido` : "Adicionado ao carrinho");
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
        <div class="info"><b>${esc(p.name)}</b><small>${eur(finalPrice(p))} cada${bulk(q) ? ` · −${bulk(q) * 100}% por quantidade` : ""}</small>
          ${q > inStock(p) ? `<small class="bo-note">${inStock(p) ? `${inStock(p)} entrega imediata · ${q - inStock(p)} até 3 semanas` : "Por encomenda · até 3 semanas"}</small>` : ""}</div>
        <div class="qty"><button data-q="-1" data-id="${id}">−</button><span>${q}</span><button data-q="1" data-id="${id}" ${q >= maxQty(p) ? "disabled" : ""}>+</button></div></div>`;
    }).join("") : `<p class="muted" style="text-align:center;padding:40px 0">O seu carrinho está vazio.</p>`;
    $("#cartTotal").textContent = eur(total);
    $("#cartDisc").textContent = "−" + eur(disc);
    $("#cartCount").textContent = count;
    if ($("#tabCount")) { $("#tabCount").textContent = count; $("#tabCount").dataset.n = count; }
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
  // optional reseller code: a link that opens the text field
  const setCodeBox = open => {
    $("#codeBox").hidden = !open; $("#codeToggle").setAttribute("aria-expanded", String(open));
    $("#codeToggle").innerHTML = open ? '<span aria-hidden="true">−</span> Não tenho código' : '<span aria-hidden="true">＋</span> Tenho um código do revendedor';
    if (open) setTimeout(() => form.resellerCode.focus(), 50); else form.resellerCode.value = "";
  };
  $("#codeToggle").onclick = () => setCodeBox($("#codeBox").hidden);
  form.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form)), btn = $("#submitOrder");
    $("#formErr").textContent = ""; btn.disabled = true; btn.textContent = "A enviar…";
    try {
      const r = await fetch(window.Brand.url("api/orders"), { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: { name: f.name, email: f.email, phone: f.phone }, resellerCode: $("#codeBox").hidden ? "" : (f.resellerCode || "").trim(), items: Object.entries(cart).map(([id, qty]) => ({ id, qty })) }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409) refreshProducts();
      if (!r.ok) throw new Error(d.error || "Não foi possível registar a encomenda");
      cart = {}; save(); renderCart(); form.reset();
      setTimeout(() => setCodeBox(false), 0); // after the confirmation text was built
      done.innerHTML = `<div class="tick">✓</div><h3>Encomenda registada</h3><p>A sua referência é <b>${esc(d.number)}</b>.</p>
        <p class="muted">Total: ${eur(d.total)}. Vai receber uma mensagem em <b>${esc(f.email)}</b> ou por WhatsApp (<b>${esc(f.phone)}</b>) para confirmar a encomenda e fazer o pagamento. Depois recebe a confirmação do pagamento e o tracking do envio. Nada foi cobrado.</p>
        ${!$("#codeBox").hidden && (f.resellerCode || "").trim() ? `<p class="muted">Código de revendedor: <b>${esc(f.resellerCode.trim().toUpperCase())}</b></p>` : ""}
        <p class="muted"><b>A encomenda só é processada após a validação do pagamento.</b></p>
        <p class="muted">${d.backorder ? "Alguns artigos não têm stock imediato: entrega em até 3 semanas." : "Entrega imediata em Portugal."} Embalagem sempre discreta.</p>
        <button class="btn-orange" id="doneClose">Continuar a comprar</button>`;
      showStep("done");
      $("#doneClose").onclick = () => { openCart(false); showStep("cart"); };
    } catch (err) {
      $("#formErr").textContent = location.protocol === "file:" ? "Abra a loja através do servidor web (não como ficheiro local) para registar encomendas." : err.message;
    } finally { btn.disabled = false; btn.textContent = "Registar encomenda"; }
  };

  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1800); }

  // ---------- cards ----------
  const card = (p, i) => `
    <article class="card">
      <a class="img v${i % 3}" href="${purl(p.id)}" aria-label="${esc(p.name)}">${p.promo ? `<span class="badge">−${p.promo}%</span>` : ""}${art(p)}</a>
      <div class="body">
        <a class="name" href="${purl(p.id)}">${esc(p.name)}</a><span class="sub">${esc(p.sub)}</span>
        <div class="pr"><b>${eur(finalPrice(p))}</b>${p.promo ? `<s>${eur(p.price)}</s>` : ""}</div>
        <div class="meta"><span>⚗ Testado em lab.</span>${ratingMeta(p)}<span>⛟ Entrega PT</span></div>
        ${stockBadge(p)}
        <button class="add" data-add="${p.id}" ${soldOut(p) ? "disabled" : ""}>${soldOut(p) ? "Esgotado" : `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.6l2.4 11.6h11.2l2-8H6.3"/></svg><span>Adicionar<span class="add-x"> ao carrinho</span></span>`}</button>
      </div>
    </article>`;

  // featured hero card
  let feat;
  function renderFeatured() {
    feat = P.find(p => p.best && p.promo) || P.find(p => p.best) || P[0];
    if (!feat || !$("#featCard")) return;
    $("#featCard").innerHTML = `<a class="feat-link" href="${purl(feat.id)}"><div class="thumb"><span class="tag">Mais vendido</span>${art(feat)}</div>
      <h3>${esc(feat.name)}</h3><div class="price">${eur(finalPrice(feat))}</div>
      <small>${esc(feat.sub)}${feat.promo ? ` • −${feat.promo}% sobre ${eur(feat.price)}` : ""}</small></a>`;
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
    const all = [{ id: "all", name: "Todos", count: P.length }, { id: "best", name: "Mais vendidos", count: P.filter(p => p.best).length }, { id: "new", name: "Novidades", count: P.filter(p => p.fresh).length }, { id: "promo", name: "Promoções", count: P.filter(p => p.promo).length },
      ...C.map(c => ({ ...c, count: P.filter(p => p.cat === c.id).length })).filter(c => c.count)];
    if (!$("#chips")) return;
    if (filter.startsWith("goal:")) { const g = G.find(x => x.id === filter.slice(5)); all.push({ id: filter, name: "Objetivo: " + (g ? g.name : filter.slice(5)), count: P.filter(p => (p.goals || []).includes(filter.slice(5))).length }); }
    $("#chips").innerHTML = all.map(c => `<button class="chip ${filter === c.id ? "on" : ""}" data-chip="${c.id}">${c.name}<small>${c.count}</small></button>`).join("");
  }
  function renderGrid() {
    if (!$("#grid")) return;
    const q = query.toLowerCase();
    const goal = filter.startsWith("goal:") ? filter.slice(5) : null;
    const list = P.filter(p => (filter === "all" || p.cat === filter || (filter === "new" && p.fresh) || (filter === "promo" && p.promo) || (filter === "best" && p.best) || (goal && (p.goals || []).includes(goal)))
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
  // ?cat=<id> opens the home page with that category selected (used by the product breadcrumbs)
  const params = new URLSearchParams(location.search);
  const catParam = params.get("cat") || (params.get("goal") ? "goal:" + params.get("goal") : null);
  if (catParam) filter = catParam;
  if (params.get("q") && $("#search")) { query = params.get("q"); $("#search").value = query; }
  if ($("#grid")) {
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
  }

  // real reviews from verified buyers (count + average come from the API)
  async function loadProductReviews(p) {
    const box = $("#detailReviews"); if (!box || !p.reviews) return;
    try {
      const r = await fetch(window.Brand.url(`api/products/${encodeURIComponent(p.id)}/reviews`), { cache: "no-store" });
      if (!r.ok) return;
      const list = await r.json();
      if ($("#detailReviews") !== box) return; // user opened another product meanwhile
      const card = v => `<article class="rv-card">${starRow(v.rating)}<p>${esc(v.text)}</p>
        <div class="who"><span><b>${esc(v.author)}</b></span><span>${esc(String(v.createdAt).slice(0, 10).split("-").reverse().join("/"))}</span></div>
        <span class="verified">✓ Compra verificada</span>
        ${v.reply ? `<div class="rv-reply"><b>Resposta da loja</b>${esc(v.reply)}</div>` : ""}</article>`;
      const show = n => { box.querySelector(".rv-list").innerHTML = list.slice(0, n).map(card).join("");
        const more = box.querySelector(".rv-more"); more.hidden = list.length <= n; more.onclick = () => show(n + 6); };
      show(6);
    } catch {}
  }

  // full-width product information: specifications table + formatted description
  function infoBlock(p) {
    const specs = (p.specs || []).filter(r => r && r[0] && r[1]);
    if (!specs.length && !(p.description && md(p.description))) return "";
    return `<section class="pinfo ${specs.length ? "" : "no-specs"}" id="pinfo">
      ${specs.length ? `<div class="pi-specs"><h3>Especificações</h3><table>${specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table></div>` : ""}
      ${p.description ? `<div class="pi-desc"><h3>Descrição</h3><div class="md">${md(p.description)}</div></div>` : ""}
    </section>`;
  }

  // optional "protection code" + "package sizes" block, filled per product in the backoffice
  function verifyBlock(p) {
    const sec = p.securityImageUrl || p.securityText || p.verifyUrl, pack = p.packageImageUrl;
    if (!sec && !pack) return "";
    const img = (u, alt) => `<img src="${esc(window.Brand.url(u))}" alt="${esc(alt)}" loading="lazy">`;
    return `<div class="verify ${sec && pack ? "" : "single"}">
      ${sec ? `<div class="v-sec">
        <h3>Código de proteção</h3>
        ${p.securityImageUrl ? `<div class="v-img">${img(p.securityImageUrl, "Código de proteção de " + p.name)}</div>` : ""}
        ${p.securityText || p.verifyUrl ? `<h4>Como funciona</h4>${paras(p.securityText)}` : ""}
        ${p.verifyUrl ? `<a class="v-link" href="${esc(p.verifyUrl)}" target="_blank" rel="noopener noreferrer nofollow">Verificar a autenticidade do produto ↗</a>` : ""}
      </div>` : ""}
      ${pack ? `<div class="v-pack"><h3>Tamanhos da embalagem</h3><div class="v-img v-diagram">${img(p.packageImageUrl, "Dimensões da embalagem de " + p.name)}</div></div>` : ""}
    </div>`;
  }

  // ---------- detail ----------
  let dQty = 1, detailObserver = null;
  function renderDetail(id) {
    const p = P.find(x => x.id === id); if (!p || !$("#detail")) return; dQty = 1;
    $("#detail").innerHTML = `
      <div class="hero-img${p.imageUrl ? " has-img" : ""}">${art(p)}</div>
      <div>
        <h1>${esc(p.name)}</h1>
        <div class="meta"><span>⚗ Testado em lab.</span>${ratingMeta(p)}<span>⛟ Entrega PT</span></div>
        <p>${esc(p.sub)}. Categoria: ${catName(p.cat)}.</p>
        <small class="muted">Opções de quantidade</small>
        <div class="opts"><span class="opt on">1 unidade</span><span class="opt">5 unidades · −5%</span><span class="opt">10 unidades · −10%</span></div>
        <div class="buyrow">
          <div><b>${eur(finalPrice(p))}</b>${p.promo ? `<s>${eur(p.price)}</s>` : ""}</div>
          <div class="qty"><button data-dq="-1">−</button><span id="dQty">1</span><button data-dq="1">+</button></div>
        </div>
        ${stockBadge(p)}
        ${deliveryBox(p)}
        <button class="btn-orange" data-dadd="${p.id}" ${soldOut(p) ? "disabled" : ""}>${soldOut(p) ? "Esgotado" : "Adicionar ao carrinho"}</button>
        <details class="acc" open><summary>Detalhes</summary><div>${p.description ? `<p>${esc(firstPara(p.description))}</p><a href="#pinfo" class="more-link" data-scroll="#pinfo">Ver descrição completa ↓</a>` : `${esc(p.name)} — ${esc(p.sub)}. Cada lote é testado em laboratório antes do envio.`}</div></details>
        <details class="acc"><summary>Utilização</summary><div>Leia atentamente as instruções. Não exceda a dose recomendada. Consulte o seu médico antes de utilizar.</div></details>
        <details class="acc"><summary>Pagamento e entrega</summary><div><p>Registe a encomenda com o seu nome, email e telemóvel. Vai receber uma mensagem por email ou WhatsApp para confirmar a encomenda e fazer o pagamento, depois a confirmação do pagamento e, quando a encomenda for enviada, o número de seguimento (tracking).</p><p>A encomenda só é processada após a validação do pagamento.${resellerHint()}</p><p>Entregamos em todo o Portugal, sempre em embalagem discreta. Artigos em stock: entrega imediata. Sem stock imediato: até 3 semanas.</p></div></details>
      </div>
      <div class="buybar" id="buybar"><div class="bb-p"><b>${eur(finalPrice(p))}</b><small>${esc(p.name)}${p.promo ? ` · −${p.promo}%` : ""}</small></div>
        <button class="btn-orange" data-dadd="${p.id}">Adicionar</button></div>${infoBlock(p)}${verifyBlock(p)}
      <div class="reviews-block" id="detailReviews">
        <h3>Avaliações de clientes ${p.reviews ? `<small>${starRow(Math.round(p.rating))} ${num1(p.rating)} de 5 · ${p.reviews} avaliaç${p.reviews === 1 ? "ão" : "ões"}</small>` : ""}</h3>
        ${p.reviews ? '<div class="rv-list"></div><button type="button" class="ghost-btn rv-more" hidden>Ver mais avaliações</button>'
          : '<p class="muted">Ainda não há avaliações. Só clientes com uma encomenda entregue podem avaliar este produto.</p>'}
      </div>`;
    loadProductReviews(p);
    // mobile buy bar: hidden while the main "Adicionar ao carrinho" button is on screen
    document.body.classList.add("has-buybar");
    const main = $("#detail .btn-orange[data-dadd]:not(#buybar *)"), bar = $("#buybar");
    if (window.IntersectionObserver && main && bar) {
      if (detailObserver) detailObserver.disconnect();
      detailObserver = new IntersectionObserver(([en]) => bar.classList.toggle("away", en.isIntersecting), { rootMargin: "0px 0px -80px 0px" });
      detailObserver.observe(main);
    }
    $("#detail .opts").onclick = e => {
      const o = e.target.closest(".opt"); if (!o) return;
      [...$("#detail .opts").children].forEach(x => x.classList.toggle("on", x === o));
      dQty = parseInt(o.textContent); $("#dQty").textContent = dQty;
    };
  }

  document.addEventListener("click", e => {
    const add = e.target.closest("[data-add]"); if (add) return addToCart(add.dataset.add);
    const gt = e.target.closest("[data-goto]");
    if (gt && $(gt.dataset.goto)) { e.preventDefault(); openCart(false); $(gt.dataset.goto).scrollIntoView({ behavior: "smooth" }); return; }
    // in-page anchors on product pages (a <base> is set, so plain "#x" links would go to the home page)
    const sc = e.target.closest("[data-scroll]");
    if (sc) { e.preventDefault(); const t = $(sc.dataset.scroll); if (t) t.scrollIntoView({ behavior: "smooth" }); return; }
    const dq = e.target.closest("[data-dq]");
    if (dq) { const dp = P.find(x => x.id === $("[data-dadd]").dataset.dadd); dQty = Math.min(Math.max(1, maxQty(dp)), Math.max(1, dQty + +dq.dataset.dq)); $("#dQty").textContent = dQty; return; }
    const da = e.target.closest("[data-dadd]"); if (da) addToCart(da.dataset.dadd, dQty);
  });

  // ---------- reviews + faq ----------
  // Testimonials entered in the backoffice (real messages from customers). The section stays hidden until there is one.
  let tList = [], ti = 0, tTimer = null;
  const pad2 = n => String(n).padStart(2, "0");
  const fmtDay = d => { const [y, m, day] = String(d).split("-"); return day && m && y ? `${day}/${m}/${y}` : ""; };
  const stars = r => r ? `<span class="t-stars" aria-label="${r} de 5 estrelas">${"★".repeat(r)}<span>${"★".repeat(5 - r)}</span></span>` : "";
  function showQuote() {
    const t = tList[ti]; if (!t) return;
    const q = $("#quote");
    q.classList.toggle("has-img", !!t.imageUrl);
    q.style.backgroundImage = t.imageUrl ? `linear-gradient(180deg, rgba(10,11,13,.15) 0%, rgba(10,11,13,.55) 45%, rgba(10,11,13,.92) 100%), url("${encodeURI(window.Brand.url(t.imageUrl))}")` : "";
    q.innerHTML = `${stars(t.rating)}<p>“${esc(t.text)}”</p>
      <cite><b>${esc(t.author)}</b>${t.location ? ", " + esc(t.location) : ""}<small>${fmtDay(t.receivedAt)}${t.source ? " · via " + esc(t.source) : ""}</small></cite>`;
    $("#tCount").innerHTML = `${pad2(ti + 1)}<sup>/${pad2(tList.length)}</sup>`;
    $("#tDots").innerHTML = tList.map((_, i) => `<button type="button" data-ti="${i}" class="${i === ti ? "on" : ""}" aria-label="Testemunho ${i + 1}"></button>`).join("");
  }
  const go = i => { ti = (i + tList.length) % tList.length; showQuote(); restart(); };
  function restart() { clearInterval(tTimer); if (tList.length > 1) tTimer = setInterval(() => { ti = (ti + 1) % tList.length; showQuote(); }, 7000); }
  if ($("#reviews")) {
  $("#tNav").addEventListener("click", e => {
    const d = e.target.closest("[data-tdir]"), dot = e.target.closest("[data-ti]");
    if (d) go(ti + +d.dataset.tdir); else if (dot) go(+dot.dataset.ti);
  });
  $("#reviews").addEventListener("mouseenter", () => clearInterval(tTimer));
  $("#reviews").addEventListener("mouseleave", restart);
  (async () => {
    try {
      const r = await fetch(window.Brand.url("api/testimonials"), { cache: "no-store" });
      if (!r.ok) return;
      tList = (await r.json()).filter(t => t && t.text);
      if (!tList.length) return;
      $("#reviews").hidden = false; $("#contact").classList.remove("no-reviews");
      $("#tNav").hidden = tList.length < 2;
      showQuote(); restart();
    } catch {}
  })();
  }
  if ($("#faqList")) $("#faqList").innerHTML = window.FAQ.map(([q, a]) => `<details class="acc"><summary>${q}</summary><div>${a}</div></details>`).join("");

  // ---------- nav ----------
  // ---------- side menu: search, categories (expandable) and goals ----------
  const DOTS = ["#9ff0f5", "#ffd29a", "#a5b1f0", "#b6f3a0", "#f5a3a3", "#f3f59a", "#d8b4fe", "#fbcfe8", "#99f6e4", "#fde68a"];
  const menu = $("#menu");
  const setMenu = open => {
    document.body.classList.toggle("menu-open", open);
    menu.setAttribute("aria-hidden", String(!open)); $("#menuOpen").setAttribute("aria-expanded", String(open));
    if (open) { renderMenu(); menu.classList.remove("in"); void menu.offsetWidth; menu.classList.add("in"); if (matchMedia("(hover: hover)").matches) setTimeout(() => $("#menuSearch").focus(), 280); }
    else setTimeout(() => { menu.classList.remove("sub-open", "in"); $("#mpSub").setAttribute("aria-hidden", "true"); $("#mpRoot").setAttribute("aria-hidden", "false"); }, 320);
  };
  function renderMenu() {
    if (!menu) return;
    const cats = C.map((c, i) => ({ ...c, color: DOTS[i % DOTS.length], items: P.filter(p => p.cat === c.id) })).filter(c => c.items.length);
    const CHEV = '<svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>';
    $("#menuCats").innerHTML = cats.map((c, i) => `<li style="--i:${i}"><button type="button" class="mc-open" data-open-cat="${esc(c.id)}">
      <span class="mc-dot" style="background:${c.color}"></span><span class="mc-name">${esc(c.name)}</span><small>${c.items.length}</small>${CHEV}</button></li>`).join("");
    const goals = G.map(g => ({ ...g, n: P.filter(p => (p.goals || []).includes(g.id)).length })).filter(g => g.n);
    $("#menuGoalsCol").hidden = !goals.length;
    $("#menuGoals").innerHTML = goals.map(g => `<li><button type="button" class="ml-open" data-open-goal="${esc(g.id)}">${esc(g.name)} <small>${g.n}</small></button></li>`).join("");
  }
  // mobile tab bar
  if ($("#tabbar")) {
    const tab = isProduct || PAGE.type === "products" || PAGE.type === "notfound" ? "products" : "home";
    const cur = $(`#tabbar [data-tab="${tab}"]`); if (cur) cur.classList.add("on");
    const ti = [...$("#tabbar").children].indexOf(cur);
    if (ti >= 0) $("#tabbar").style.setProperty("--ti", ti); else $("#tabbar").classList.add("no-ti");
    $("#tabSearch").onclick = () => { setMenu(true); setTimeout(() => $("#menuSearch").focus(), 60); };
    $("#tabCart").onclick = () => openCart(true);
  }
  if (menu) {
    $("#menuOpen").onclick = () => setMenu(true);
    $("#burger").onclick = () => setMenu(true);
    if ($("#headSearch")) $("#headSearch").onclick = () => { setMenu(true); setTimeout(() => $("#menuSearch").focus(), 60); };
    $("#menuClose").onclick = $("#menuOverlay").onclick = () => setMenu(false);
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape" || !document.body.classList.contains("menu-open")) return;
      if (menu.classList.contains("sub-open")) closeSub(); else setMenu(false);
    });
    // second level: products of a category / goal, sliding in from the right
    const CHEV = '<svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>';
    const openSub = (kind, id) => {
      const c = kind === "cat" ? C.find(x => x.id === id) : G.find(x => x.id === id); if (!c) return;
      const items = P.filter(p => kind === "cat" ? p.cat === id : (p.goals || []).includes(id));
      $("#mpTitle").textContent = c.name;
      $("#mpList").innerHTML = items.map((p, i) => `<li style="--i:${Math.min(i, 14)}"><a href="${purl(p.id)}">
          <span class="mp-txt"><small>${esc(kind === "cat" ? c.name : catName(p.cat))}</small>${esc(p.name)}</span><b>${eur(finalPrice(p))}</b>${CHEV}</a></li>`).join("")
        || '<li class="mp-empty">Sem produtos.</li>';
      $("#mpAll").href = window.Brand.url("produtos?" + (kind === "cat" ? "cat=" : "goal=") + encodeURIComponent(id));
      $("#mpFilter").value = ""; $("#mpFilterWrap").hidden = true;
      $("#mpSub").scrollTop = 0;
      menu.classList.remove("sub-anim"); void menu.offsetWidth; menu.classList.add("sub-open", "sub-anim");
      $("#mpSub").setAttribute("aria-hidden", "false"); $("#mpRoot").setAttribute("aria-hidden", "true");
      setTimeout(() => $("#mpBack").focus({ preventScroll: true }), 320);
    };
    const closeSub = () => {
      menu.classList.remove("sub-open");
      $("#mpSub").setAttribute("aria-hidden", "true"); $("#mpRoot").setAttribute("aria-hidden", "false");
    };
    menu.addEventListener("click", e => {
      const oc = e.target.closest("[data-open-cat]"), og = e.target.closest("[data-open-goal]");
      if (oc) openSub("cat", oc.dataset.openCat); else if (og) openSub("goal", og.dataset.openGoal);
    });
    $("#mpBack").onclick = closeSub;
    $("#mpFind").onclick = () => { const w = $("#mpFilterWrap"); w.hidden = !w.hidden; if (!w.hidden) $("#mpFilter").focus(); else { $("#mpFilter").value = ""; $("#mpFilter").dispatchEvent(new Event("input")); } };
    $("#mpFilter").addEventListener("input", () => {
      const q = $("#mpFilter").value.trim().toLowerCase();
      $("#mpList").querySelectorAll("li").forEach(li => { li.hidden = !!q && !li.textContent.toLowerCase().includes(q); });
    });
    // swipe right on the second level goes back (mobile)
    let sx = null, sy = null;
    $("#mpSub").addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    $("#mpSub").addEventListener("touchend", e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = Math.abs(e.changedTouches[0].clientY - sy); sx = null;
      if (dx > 70 && dy < 50) closeSub();
    }, { passive: true });
    // in-menu links to sections of the current page just close the menu and scroll
    menu.addEventListener("click", e => {
      const a = e.target.closest("a[href]"); if (!a) return;
      const u = new URL(a.href, location.href);
      if (u.pathname === location.pathname && u.search === location.search && u.hash && $(u.hash)) { e.preventDefault(); setMenu(false); $(u.hash).scrollIntoView({ behavior: "smooth" }); }
    });
    let kb = -1;
    const results = () => [...$("#menuResults").querySelectorAll("a")];
    $("#menuSearch").addEventListener("input", () => {
      const q = $("#menuSearch").value.trim().toLowerCase(); kb = -1;
      const box = $("#menuResults");
      if (!q) { box.hidden = true; box.innerHTML = ""; return; }
      const found = P.filter(p => (p.name + " " + p.sub + " " + catName(p.cat)).toLowerCase().includes(q));
      box.hidden = false;
      box.innerHTML = found.length ? found.slice(0, 8).map(p => `<a href="${purl(p.id)}"><span class="rt">${p.imageUrl ? `<img src="${esc(window.Brand.url(p.imageUrl))}" alt="">` : "<i></i>"}</span>
          <span>${esc(p.name)}<small>${esc(p.sub || catName(p.cat))}</small></span><b>${eur(finalPrice(p))}</b></a>`).join("")
          + (found.length > 8 ? `<a href="produtos?q=${encodeURIComponent(q)}"><span></span><span>Ver os ${found.length} resultados →</span><b></b></a>` : "")
        : `<div class="none">Sem resultados para “${esc(q)}”.</div>`;
    });
    $("#menuSearch").addEventListener("keydown", e => {
      const list = results(); if (!list.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); kb = (kb + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length; list.forEach((x, i) => x.classList.toggle("kb", i === kb)); }
      if (e.key === "Enter") { e.preventDefault(); (list[kb] || list[0]).click(); }
    });
  }
  $("#navPills").addEventListener("click", e => {
    const a = e.target.closest("a"); if (!a) return;
    [...$("#navPills").children].forEach(x => x.classList.toggle("active", x === a));
    $("#navPills").classList.remove("open");
  });

  // related products on a product page: same category first, then best sellers
  function renderRelated() {
    const box = $("#related"), p = P.find(x => x.id === PAGE.id);
    if (!box || !p) return;
    const same = P.filter(x => x.id !== p.id && x.cat === p.cat), more = P.filter(x => x.id !== p.id && x.cat !== p.cat && x.best);
    const list = [...same, ...more].slice(0, 4);
    box.hidden = !list.length;
    $("#relatedGrid").innerHTML = list.map(card).join("");
  }
  // products page: promotions / best sellers / new arrivals shelves above the full catalogue
  const SHELVES = [["promos", p => p.promo, "promo", "Promoções"], ["bestsellers", p => p.best, "best", "Mais vendidos"], ["newin", p => p.fresh, "new", "Novidades"]];
  function renderShelves() {
    const jump = [];
    for (const [id, test, f, label] of SHELVES) {
      const box = $("#" + id); if (!box) continue;
      const list = P.filter(test);
      box.hidden = !list.length;
      $("#" + id + "Track").innerHTML = list.map(card).join("");
      if (list.length) jump.push(`<button type="button" class="chip" data-scroll="#${id}">${label}<small>${list.length}</small></button>`);
    }
    if ($("#jump")) $("#jump").innerHTML = jump.join("") + `<button type="button" class="chip" data-scroll="#collection">Todos os produtos<small>${P.length}</small></button>`;
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-show]"); if (!b || !$("#grid")) return;
    setFilter(b.dataset.show); $("#collection").scrollIntoView({ behavior: "smooth" });
  });
  function renderPage() {
    if (isProduct) { renderDetail(PAGE.id); renderRelated(); }
    else if (PAGE.type === "products") { renderShelves(); renderChips(); renderGrid(); }
    else { if ($("#prodCount")) $("#prodCount").textContent = P.length; renderChips(); renderGrid(); }
    renderCart();
  }
  // cards rise in as they scroll into view (staggered per batch); skipped when motion is reduced
  if (window.IntersectionObserver && window.MutationObserver && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("js-reveal");
    const io = new IntersectionObserver(entries => {
      let n = 0;
      entries.filter(en => en.isIntersecting).forEach(en => { en.target.style.setProperty("--d", Math.min(n++, 8)); en.target.classList.add("seen"); io.unobserve(en.target); });
    }, { rootMargin: "0px 0px -6% 0px" });
    const watch = () => document.querySelectorAll(".card:not(.seen)").forEach(c => io.observe(c));
    new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
    watch();
  }
  // shelves scroll sideways only: undo any vertical offset Safari may apply (snap, focus, find-in-page)
  document.addEventListener("scroll", e => { const t = e.target; if (t.classList && t.classList.contains("track") && t.scrollTop) t.scrollTop = 0; }, true);
  // mission video: loads and plays only while on screen (saves mobile data); stays still with reduced motion / data saver
  const mv = $("#missionVideo");
  if (mv) {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData);
    if (still) { mv.preload = "metadata"; }
    else if (window.IntersectionObserver) {
      new IntersectionObserver(([en]) => { if (en.isIntersecting) mv.play().catch(() => {}); else mv.pause(); }, { threshold: 0.25 }).observe(mv);
    } else { mv.autoplay = true; }
    mv.addEventListener("playing", () => mv.parentElement.classList.add("playing"));
  }
  renderPage();
  if ((catParam || params.get("q")) && $("#collection")) setTimeout(() => $("#collection").scrollIntoView(), 0);

  // category tiles on the home page follow the first two categories that have products
  function renderTiles() {
    const cats = C.filter(c => P.some(p => p.cat === c.id));
    document.querySelectorAll("[data-tile]").forEach(el => {
      const c = cats[+el.dataset.tile];
      el.hidden = !c;
      if (!c) return;
      const min = Math.min(...P.filter(p => p.cat === c.id).map(finalPrice));
      el.href = window.Brand.url("produtos?cat=" + encodeURIComponent(c.id));
      el.querySelector("h4").textContent = c.name;
      el.querySelector("small").textContent = "desde " + eur(min);
      // picture that matches the category (by name/id); otherwise the first product photo of that category
      const key = (c.id + " " + c.name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const pic = /pept/.test(key) ? "img/promo-peptido.webp" : /inje/.test(key) ? "img/promo-injetavel.webp" : /oral|compr|tab/.test(key) ? "img/promo-oral.webp"
        : ((P.find(p => p.cat === c.id && p.imageUrl) || {}).imageUrl || "");
      const img = el.querySelector(".tile-img");
      if (img && pic) img.src = window.Brand.url(pic);
    });
  }

  // products and categories edited in the backoffice come from the API;
  // products.js is only the fallback when the page is opened without the server.
  async function refreshProducts() {
    try {
      const [rc, r, rg] = await Promise.all([fetch(window.Brand.url("api/categories"), { cache: "no-store" }), fetch(window.Brand.url("api/products"), { cache: "no-store" }), fetch(window.Brand.url("api/goals"), { cache: "no-store" })]);
      if (!r.ok || !rc.ok) return;
      const [cats, list, goals] = await Promise.all([rc.json(), r.json(), rg.ok ? rg.json() : []]);
      if (!Array.isArray(list) || !Array.isArray(cats)) return;
      if (Array.isArray(goals)) G.splice(0, G.length, ...goals);
      C.splice(0, C.length, ...cats);
      P.splice(0, P.length, ...list);
      if (!["all", "new", "promo", "best"].includes(filter) && !filter.startsWith("goal:") && !C.some(c => c.id === filter)) filter = "all";
      renderTiles(); renderFeatured(); renderPage(); renderMenu();
    } catch {}
  }
  refreshProducts();
  // re-render product art once the configured brand is known
  document.addEventListener("brand:applied", () => {
    document.querySelectorAll(".vial[data-label]").forEach(v => { if (v.dataset.label) v.dataset.label = brandLabel(); });
  });
  window.Brand.load(isProduct ? { titlePrefix: PAGE.name } : PAGE.type === "products" ? { titlePrefix: "Produtos" } : PAGE.type === "notfound" ? { titlePrefix: "Produto não encontrado" } : {});
})();
