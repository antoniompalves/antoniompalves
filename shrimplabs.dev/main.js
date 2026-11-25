(() => {
  // ---------- Language (PT default, EN optional) ----------
  const EN = window.I18N_EN || {};
  const META = window.I18N_META;
  const PT = {};
  const textEls = document.querySelectorAll("[data-i18n]");
  const phEls = document.querySelectorAll("[data-i18n-ph]");
  // Capture the Portuguese originals from the HTML
  textEls.forEach((el) => { PT[el.dataset.i18n] ??= el.innerHTML.trim(); });
  phEls.forEach((el) => { PT[el.dataset.i18nPh] ??= el.placeholder; });

  let lang = "pt";
  const store = {
    get() { try { return localStorage.getItem("sl-lang"); } catch { return null; } },
    set(v) { try { localStorage.setItem("sl-lang", v); } catch {} }
  };

  function setLang(next) {
    lang = next === "en" ? "en" : "pt";
    const dict = lang === "en" ? EN : PT;
    textEls.forEach((el) => {
      const v = dict[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    phEls.forEach((el) => {
      const v = dict[el.dataset.i18nPh];
      if (v != null) el.placeholder = v;
    });
    document.documentElement.lang = lang === "en" ? "en" : "pt-PT";
    document.title = META[lang].title;
    document.querySelectorAll(".lang button").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.lang === lang)
    );
    hint.textContent = META[lang].copy;
    wordIdx = 0;
    rotateEl.textContent = META[lang].rotate[0];
    store.set(lang);
  }

  // ---------- Rotating hero word ----------
  const rotateEl = document.getElementById("rotate");
  let wordIdx = 0;
  setInterval(() => {
    rotateEl.classList.add("out");
    setTimeout(() => {
      const words = META[lang].rotate;
      wordIdx = (wordIdx + 1) % words.length;
      rotateEl.textContent = words[wordIdx];
      rotateEl.classList.remove("out");
    }, 300);
  }, 2600);

  // ---------- Case list: accordion + hover blob ----------
  const blob = document.getElementById("blob");
  document.querySelectorAll(".case").forEach((c) => {
    const color = c.dataset.color;
    c.style.setProperty("--case-color", color);
    const row = c.querySelector(".case-row");
    row.addEventListener("click", () => {
      const open = c.classList.toggle("open");
      row.setAttribute("aria-expanded", open);
    });
    c.addEventListener("mouseenter", () => {
      blob.style.setProperty("--blob", color);
      blob.classList.add("on");
    });
    c.addEventListener("mouseleave", () => blob.classList.remove("on"));
  });
  window.addEventListener("mousemove", (e) => {
    blob.style.left = e.clientX + "px";
    blob.style.top = e.clientY + "px";
  });

  // ---------- Shop filters ----------
  const filters = document.querySelectorAll(".filter");
  const products = document.querySelectorAll(".product");
  filters.forEach((f) =>
    f.addEventListener("click", () => {
      filters.forEach((x) => {
        x.classList.toggle("active", x === f);
        x.setAttribute("aria-pressed", x === f);
      });
      const cat = f.dataset.filter;
      products.forEach((p) => {
        const show = cat === "all" || p.dataset.cat === cat || p.dataset.cat === "all";
        p.classList.toggle("hide", !show);
      });
    })
  );

  // "Get it" links preselect the product in the form
  const select = document.getElementById("f-app");
  document.querySelectorAll("[data-product]").forEach((a) =>
    a.addEventListener("click", () => { select.value = a.dataset.product; })
  );

  // ---------- Copy email ----------
  const copy = document.getElementById("copy");
  const hint = document.getElementById("copy-hint");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copy.dataset.mail);
      hint.textContent = META[lang].copied;
    } catch {
      window.location.href = "mailto:" + copy.dataset.mail;
    }
    setTimeout(() => (hint.textContent = META[lang].copy), 2000);
  });

  // ---------- Language switch init ----------
  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang))
  );
  const urlLang = new URLSearchParams(location.search).get("lang");
  const initial = urlLang || store.get();
  if (initial === "en") setLang("en");

  // ---------- Scroll reveal ----------
  const targets = document.querySelectorAll(".section-head, .lead, .case, .product, .tier, .steps li, .faq details, .about > *, .form");
  targets.forEach((t) => t.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  targets.forEach((t) => io.observe(t));

  document.getElementById("year").textContent = new Date().getFullYear();
})();
