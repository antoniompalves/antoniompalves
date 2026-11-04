(() => {
  const P = window.PRODUCTS, C = window.CATEGORIES;
  const $ = (s, el = document) => el.querySelector(s);
  const eur = n => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
  const finalPrice = window.unitPrice;
  const catName = id => (C.find(c => c.id === id) || {}).name || id;
  const vial = (label = "FORGE") => `<div class="vial" data-label="${label}"></div>`;
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- cart (localStorage, guarded) ----------
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem("forge-cart")) || {}; } catch { cart = {}; }
  const save = () => { try { localStorage.setItem("forge-cart", JSON.stringify(cart)); } catch {} };
  const bulk = window.bulkRate;

  function addToCart(id, qty = 1) {
    cart[id] = (cart[id] || 0) + qty;
    save(); renderCart(); toast("Adicionado! Precisa de mais?");
  }
  function renderCart() {
    const ids = Object.keys(cart).filter(id => cart[id] > 0 && P.find(p => p.id === id));
    let total = 0, disc = 0, count = 0;
    $("#cartItems").innerHTML = ids.length ? ids.map(id => {
      const p = P.find(x => x.id === id), q = cart[id];
      const line = finalPrice(p) * q, d = line * bulk(q);
      total += line - d; disc += d; count += q;
      return `<div class="ci"><div class="th">${vial("")}</div>
        <div class="info"><b>${esc(p.name)}</b><small>${eur(finalPrice(p))} cada${bulk(q) ? ` · −${bulk(q) * 100}% por quantidade` : ""}</small></div>
        <div class="qty"><button data-q="-1" data-id="${id}">−</button><span>${q}</span><button data-q="1" data-id="${id}">+</button></div></div>`;
    }).join("") : `<p class="muted" style="text-align:center;padding:40px 0">O seu carrinho está vazio.</p>`;
    $("#cartTotal").textContent = eur(total);
    $("#cartDisc").textContent = "−" + eur(disc);
    $("#cartCount").textContent = count;
  }
  $("#cartItems").addEventListener("click", e => {
    const b = e.target.closest("[data-q]"); if (!b) return;
    cart[b.dataset.id] = Math.max(0, (cart[b.dataset.id] || 0) + +b.dataset.q);
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
      const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: f, notes: f.notes, items: Object.entries(cart).map(([id, qty]) => ({ id, qty })) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível enviar a pré-encomenda");
      cart = {}; save(); renderCart(); form.reset();
      done.innerHTML = `<div class="tick">✓</div><h3>Pré-encomenda recebida</h3><p>A sua referência é <b>${esc(d.number)}</b>.</p>
        <p class="muted">Total estimado: ${eur(d.total)}. Entraremos em contacto para confirmar — não foi efetuado qualquer pagamento.</p>
        <button class="btn-orange" id="doneClose">Continuar a comprar</button>`;
      showStep("done");
      $("#doneClose").onclick = () => { openCart(false); showStep("cart"); };
    } catch (err) {
      $("#formErr").textContent = location.protocol === "file:" ? "Execute `node server.js` e abra http://localhost:3000 para enviar pré-encomendas." : err.message;
    } finally { btn.disabled = false; btn.textContent = "Enviar pré-encomenda"; }
  };

  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1800); }

  // ---------- cards ----------
  const card = (p, i) => `
    <article class="card">
      <div class="img v${i % 3}" data-open="${p.id}">${p.promo ? `<span class="badge">−${p.promo}%</span>` : ""}${vial()}</div>
      <div class="body">
        <span class="name">${esc(p.name)}</span><span class="sub">${esc(p.sub)}</span>
        <div class="pr"><b>${eur(finalPrice(p))}</b>${p.promo ? `<s>${eur(p.price)}</s>` : ""}</div>
        <div class="meta"><span>⚗ Testado em lab.</span><span>★ ${p.reviews} avaliações</span><span>⛟ Stock UE</span></div>
        <button class="add" data-add="${p.id}">Adicionar ao carrinho</button>
      </div>
    </article>`;

  // featured hero card
  const feat = P.find(p => p.best && p.promo) || P[0];
  $("#featCard").innerHTML = `<div class="thumb"><span class="tag">Mais vendido</span>${vial()}</div>
    <h3>${esc(feat.name)}</h3><div class="price">${eur(finalPrice(feat))}</div>
    <small>${esc(feat.sub)}${feat.promo ? ` • −${feat.promo}% sobre ${eur(feat.price)}` : ""}</small>`;
  $("#featCard").dataset.open = feat.id;

  $("#bestTrack").innerHTML = P.filter(p => p.best).map(card).join("");
  document.querySelectorAll(".arrow").forEach(a => a.onclick = () => {
    const t = $("#bestTrack"); t.scrollBy({ left: +a.dataset.dir * t.clientWidth / 1.5, behavior: "smooth" });
  });

  // ---------- collection ----------
  let filter = "all", query = "";
  function renderChips() {
    const all = [{ id: "all", name: "Todos", count: P.length }, { id: "new", name: "Novidades", count: P.filter(p => p.fresh).length }, { id: "promo", name: "Promoções", count: P.filter(p => p.promo).length },
      ...C.map(c => ({ ...c, count: P.filter(p => p.cat === c.id).length })).filter(c => c.count)];
    $("#chips").innerHTML = all.map(c => `<button class="chip ${filter === c.id ? "on" : ""}" data-chip="${c.id}">${c.name}<small>${c.count}</small></button>`).join("");
  }
  function renderGrid() {
    const q = query.toLowerCase();
    const list = P.filter(p => (filter === "all" || p.cat === filter || (filter === "new" && p.fresh) || (filter === "promo" && p.promo))
      && (!q || (p.name + " " + p.sub + " " + catName(p.cat)).toLowerCase().includes(q)));
    $("#grid").innerHTML = list.length ? list.map(card).join("") : `<div class="empty">Sem resultados</div>`;
  }
  const setFilter = f => { filter = f; renderChips(); renderGrid(); };
  $("#chips").addEventListener("click", e => { const c = e.target.closest("[data-chip]"); if (c) setFilter(c.dataset.chip); });
  $("#search").addEventListener("input", e => { query = e.target.value; renderGrid(); });
  document.querySelectorAll("[data-filter]").forEach(el => el.addEventListener("click", () => {
    setFilter(el.dataset.filter); $("#collection").scrollIntoView({ behavior: "smooth" });
  }));

  // ---------- detail ----------
  let dQty = 1;
  function renderDetail(id) {
    const p = P.find(x => x.id === id) || P[0]; dQty = 1;
    $("#detail").innerHTML = `
      <div class="hero-img">${vial()}</div>
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
        <button class="btn-orange" data-dadd="${p.id}">Adicionar ao carrinho</button>
        <details class="acc" open><summary>Detalhes</summary><div>${esc(p.name)} — ${esc(p.sub)}. Cada lote é testado em laboratório antes do envio.</div></details>
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
    if (dq) { dQty = Math.max(1, dQty + +dq.dataset.dq); $("#dQty").textContent = dQty; return; }
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
  renderChips(); renderGrid(); renderDetail(feat.id); renderCart();
})();
