(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let token = new URLSearchParams(location.search).get("t") || "";
  try { if (token) sessionStorage.setItem("review-token", token); else token = sessionStorage.getItem("review-token") || ""; } catch {}
  window.Brand.load({ titleSuffix: "· Avaliar encomenda" });
  // keep the token out of the address bar/history once read
  try { history.replaceState(null, "", location.pathname); } catch {}

  const thumb = it => it.imageUrl ? `<img src="${esc(window.Brand.url(it.imageUrl))}" alt="">` : '<div class="vial vial-sm"></div>';
  function itemHtml(it, name) {
    if (it.reviewed) return `<article class="rv-item done"><div class="rv-thumb">${thumb(it)}</div><div><h3>${esc(it.name)}</h3><p class="muted">${esc(it.sub)}</p><p class="rv-ok">✓ Avaliação enviada. Obrigado!</p></div></article>`;
    return `<article class="rv-item" data-pid="${esc(it.id)}">
      <div class="rv-thumb">${thumb(it)}</div>
      <form class="rv-form">
        <h3>${esc(it.name)}</h3><p class="muted">${esc(it.sub)}</p>
        <fieldset class="rv-stars" aria-label="Classificação">
          ${[5, 4, 3, 2, 1].map(n => `<input type="radio" name="rating" value="${n}" id="r-${esc(it.id)}-${n}" required><label for="r-${esc(it.id)}-${n}" title="${n} de 5">★</label>`).join("")}
        </fieldset>
        <label>A sua opinião<textarea name="text" rows="4" minlength="10" maxlength="1500" required placeholder="O que achou do produto e da encomenda?"></textarea></label>
        <label>Nome a mostrar<input name="name" maxlength="40" value="${esc(name)}"></label>
        <p class="form-err"></p>
        <button class="btn-orange">Enviar avaliação</button>
      </form>
    </article>`;
  }
  async function load() {
    try {
      const r = await fetch(window.Brand.url("api/review/" + encodeURIComponent(token)), { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Link inválido");
      $("#rvTitle").textContent = `Avaliar a encomenda ${d.number}`;
      const pending = d.items.filter(i => !i.reviewed).length;
      $("#rvIntro").textContent = pending ? "Obrigado pela sua compra! Diga-nos o que achou. As avaliações são publicadas na loja depois de revistas, com a indicação \"Compra verificada\"."
        : "Já avaliou todos os produtos desta encomenda. Obrigado!";
      $("#rvItems").innerHTML = d.items.map(it => itemHtml(it, d.defaultName)).join("");
    } catch (e) {
      $("#rvIntro").textContent = e.message + ". Se recebeu este link por email, confirme que o copiou completo.";
    }
  }
  $("#rvItems").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target, art = form.closest("[data-pid]"), btn = form.querySelector("button"), err = form.querySelector(".form-err");
    const f = Object.fromEntries(new FormData(form));
    err.textContent = ""; btn.disabled = true; btn.textContent = "A enviar…";
    try {
      const r = await fetch(window.Brand.url("api/review/" + encodeURIComponent(token)), { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: art.dataset.pid, rating: +f.rating, text: f.text, name: f.name }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 409) throw new Error(d.error || "Não foi possível enviar");
      art.classList.add("done");
      form.outerHTML = `<div><h3>${esc(form.querySelector("h3").textContent)}</h3><p class="rv-ok">✓ ${r.status === 409 ? esc(d.error) : "Obrigado! A sua avaliação será publicada depois de revista."}</p></div>`;
    } catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = "Enviar avaliação"; }
  });
  if (!/^[a-f0-9]{40}$/.test(token)) $("#rvIntro").textContent = "Link de avaliação inválido. Use o link completo que recebeu.";
  else load();
})();
