(() => {
  const P = window.PRODUCTS, C = window.CATEGORIES;
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
      <a class="img v${i % 3}" href="${purl(p.id)}" aria-label="${esc(p.name)}">${p.promo ? `<span class="badge">−${p.promo}%</span>` : ""}${art(p)}</a>
      <div class="body">
        <a class="name" href="${purl(p.id)}">${esc(p.name)}</a><span class="sub">${esc(p.sub)}</span>
        <div class="pr"><b>${eur(finalPrice(p))}</b>${p.promo ? `<s>${eur(p.price)}</s>` : ""}</div>
        <div class="meta"><span>⚗ Testado em lab.</span>${ratingMeta(p)}<span>⛟ Stock UE</span></div>
        ${stockBadge(p)}
        <button class="add" data-add="${p.id}" ${soldOut(p) ? "disabled" : ""}>${soldOut(p) ? "Esgotado" : "Adicionar ao carrinho"}</button>
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
    const all = [{ id: "all", name: "Todos", count: P.length }, { id: "new", name: "Novidades", count: P.filter(p => p.fresh).length }, { id: "promo", name: "Promoções", count: P.filter(p => p.promo).length },
      ...C.map(c => ({ ...c, count: P.filter(p => p.cat === c.id).length })).filter(c => c.count)];
    if (!$("#chips")) return;
    $("#chips").innerHTML = all.map(c => `<button class="chip ${filter === c.id ? "on" : ""}" data-chip="${c.id}">${c.name}<small>${c.count}</small></button>`).join("");
  }
  function renderGrid() {
    if (!$("#grid")) return;
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
  // ?cat=<id> opens the home page with that category selected (used by the product breadcrumbs)
  const catParam = new URLSearchParams(location.search).get("cat");
  if (catParam) filter = catParam;
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
  let dQty = 1;
  function renderDetail(id) {
    const p = P.find(x => x.id === id); if (!p || !$("#detail")) return; dQty = 1;
    $("#detail").innerHTML = `
      <div class="hero-img${p.imageUrl ? " has-img" : ""}">${art(p)}</div>
      <div>
        <h1>${esc(p.name)}</h1>
        <div class="meta"><span>⚗ Testado em lab.</span>${ratingMeta(p)}<span>⛟ Stock UE</span></div>
        <p>${esc(p.sub)}. Categoria: ${catName(p.cat)}. Enviado de forma discreta a partir de stock na UE, com entrega rastreada.</p>
        <small class="muted">Opções de quantidade</small>
        <div class="opts"><span class="opt on">1 unidade</span><span class="opt">5 unidades · −5%</span><span class="opt">10 unidades · −10%</span></div>
        <div class="buyrow">
          <div><b>${eur(finalPrice(p))}</b>${p.promo ? `<s>${eur(p.price)}</s>` : ""}</div>
          <div class="qty"><button data-dq="-1">−</button><span id="dQty">1</span><button data-dq="1">+</button></div>
        </div>
        ${stockBadge(p)}
        <button class="btn-orange" data-dadd="${p.id}" ${soldOut(p) ? "disabled" : ""}>${soldOut(p) ? "Esgotado" : "Adicionar ao carrinho"}</button>
        <details class="acc" open><summary>Detalhes</summary><div>${p.description ? `<p>${esc(firstPara(p.description))}</p><a href="#pinfo" class="more-link" data-scroll="#pinfo">Ver descrição completa ↓</a>` : `${esc(p.name)} — ${esc(p.sub)}. Cada lote é testado em laboratório antes do envio.`}</div></details>
        <details class="acc"><summary>Utilização</summary><div>Leia atentamente as instruções. Não exceda a dose recomendada. Consulte o seu médico antes de utilizar.</div></details>
        <details class="acc"><summary>Envio</summary><div>Embalagem discreta, envio rastreado a partir de stock na UE.</div></details>
      </div>${infoBlock(p)}${verifyBlock(p)}
      <div class="reviews-block" id="detailReviews">
        <h3>Avaliações de clientes ${p.reviews ? `<small>${starRow(Math.round(p.rating))} ${num1(p.rating)} de 5 · ${p.reviews} avaliaç${p.reviews === 1 ? "ão" : "ões"}</small>` : ""}</h3>
        ${p.reviews ? '<div class="rv-list"></div><button type="button" class="ghost-btn rv-more" hidden>Ver mais avaliações</button>'
          : '<p class="muted">Ainda não há avaliações. Só clientes com uma encomenda entregue podem avaliar este produto.</p>'}
      </div>`;
    loadProductReviews(p);
    $("#detail .opts").onclick = e => {
      const o = e.target.closest(".opt"); if (!o) return;
      [...$("#detail .opts").children].forEach(x => x.classList.toggle("on", x === o));
      dQty = parseInt(o.textContent); $("#dQty").textContent = dQty;
    };
  }

  document.addEventListener("click", e => {
    const add = e.target.closest("[data-add]"); if (add) return addToCart(add.dataset.add);
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
  $("#burger").onclick = () => $("#navPills").classList.toggle("open");
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
  function renderPage() {
    if (isProduct) { renderDetail(PAGE.id); renderRelated(); }
    else { if ($("#prodCount")) $("#prodCount").textContent = P.length; renderChips(); renderGrid(); }
    renderCart();
  }
  renderPage();

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
      renderTiles(); renderFeatured(); renderPage();
    } catch {}
  }
  refreshProducts();
  // re-render product art once the configured brand is known
  document.addEventListener("brand:applied", () => document.querySelectorAll(".vial[data-label]").forEach(v => { if (v.dataset.label) v.dataset.label = brandLabel(); }));
  window.Brand.load(isProduct ? { titlePrefix: PAGE.name } : PAGE.type === "notfound" ? { titlePrefix: "Produto não encontrado" } : {});
})();
