(() => {
  const P = window.PROJECTS;

  // ---------- Hero floating shapes ----------
  SL.floaters(document.getElementById("floaters"), [
    // [type, left%, top%, size(vw), light, dark, rotation]
    ["s", 4, 8, 15, "#f6efe7", "#d9cbbb", -20],
    ["p", 70, 4, 11, "#f8f2ea", "#d6c8b8", 10],
    ["s", 78, 52, 19, "#f7eee6", "#d8c7b7", 35],
    ["p", 12, 66, 13, "#f5ede4", "#d4c4b2", -15],
    ["s", 44, 72, 10, "#ffd9cf", "#e0604c", 160],
    ["p", 88, 26, 7, "#ffe2da", "#e7907f", 40],
    ["s", 30, -4, 9, "#f3ebe2", "#d3c3b1", 80],
    ["p", 52, 30, 5, "#f7f0e8", "#d8cab9", 0],
    ["p", -2, 34, 8, "#f4ece3", "#d6c6b4", 60]
  ]);

  // ---------- Work: sliding rows of project names ----------
  const rows = document.getElementById("rows");
  const title = (p, lang) => (lang === "en" && p.titleEn) || p.title;
  function buildRows(lang) {
    rows.innerHTML = P.map((p, i) => {
      const unit = `<span class="row-unit"><span class="row-thumb" style="--c:${p.color}"><img src="${p.thumb}" alt="" onerror="this.remove()"></span><span class="row-name">${title(p, lang)}</span></span>`;
      return `<a class="row ${i % 2 ? "rev" : ""}" href="case.html?p=${p.id}" aria-label="${title(p, lang)}">
        <span class="row-track">${unit.repeat(6)}</span></a>`;
    }).join("");
  }
  buildRows(SL.lang);
  SL.onLang(buildRows);

  // Cursor follower over the rows
  const work = document.getElementById("work");
  const cursor = document.getElementById("cursor");
  let cx = 0, cy = 0, tx = 0, ty = 0;
  work.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
  rows.addEventListener("mouseenter", () => cursor.classList.add("on"));
  rows.addEventListener("mouseleave", () => cursor.classList.remove("on"));
  (function loop() {
    cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();

  // ---------- Shop filters ----------
  const filters = document.querySelectorAll(".filter");
  const products = document.querySelectorAll(".product");
  filters.forEach((f) =>
    f.addEventListener("click", () => {
      filters.forEach((x) => { x.classList.toggle("active", x === f); x.setAttribute("aria-pressed", x === f); });
      const cat = f.dataset.filter;
      products.forEach((p) => p.classList.toggle("hide", !(cat === "all" || p.dataset.cat === cat || p.dataset.cat === "all")));
    })
  );
  const select = document.getElementById("f-app");
  document.querySelectorAll("[data-product]").forEach((a) =>
    a.addEventListener("click", () => { select.value = a.dataset.product; })
  );

  // ---------- Active nav link ----------
  const links = [...document.querySelectorAll(".nav nav a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) links.forEach((a, i) => a.classList.toggle("active", sections[i] === e.target)); });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => s && navIO.observe(s));

  SL.init();
  SL.reveal(".intro p, .statement-text > *, .section-head, .product, .tier, .steps li, .faq details, .contact-grid > *");
})();
