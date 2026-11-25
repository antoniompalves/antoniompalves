// Shared by every page: language switch, copy-email, floating shapes, reveal.
window.SL = (() => {
  const EN = window.I18N_EN || {};
  const META = window.I18N_META;
  const PT = {};
  const listeners = [];
  let lang = "pt";

  const store = {
    get() { try { return localStorage.getItem("sl-lang"); } catch { return null; } },
    set(v) { try { localStorage.setItem("sl-lang", v); } catch {} }
  };

  function collect() {
    document.querySelectorAll("[data-i18n]").forEach((el) => { PT[el.dataset.i18n] ??= el.innerHTML.trim(); });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { PT[el.dataset.i18nPh] ??= el.placeholder; });
  }

  function apply() {
    const dict = lang === "en" ? EN : PT;
    document.querySelectorAll("[data-i18n]").forEach((el) => { const v = dict[el.dataset.i18n]; if (v != null) el.innerHTML = v; });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { const v = dict[el.dataset.i18nPh]; if (v != null) el.placeholder = v; });
    document.documentElement.lang = lang === "en" ? "en" : "pt-PT";
    const btn = document.getElementById("lang");
    if (btn) { btn.textContent = META[lang].switchTo; btn.setAttribute("aria-label", META[lang].switchLabel); }
    const hint = document.getElementById("copy-hint");
    if (hint) hint.textContent = META[lang].copy;
    listeners.forEach((fn) => fn(lang));
  }

  function setLang(next) { lang = next === "en" ? "en" : "pt"; store.set(lang); apply(); }

  function init() {
    collect();
    document.getElementById("lang")?.addEventListener("click", () => setLang(lang === "pt" ? "en" : "pt"));
    const copy = document.getElementById("copy");
    if (copy) copy.addEventListener("click", async () => {
      const hint = document.getElementById("copy-hint");
      try { await navigator.clipboard.writeText(copy.dataset.mail); hint.textContent = META[lang].copied; }
      catch { location.href = "mailto:" + copy.dataset.mail; }
      setTimeout(() => (hint.textContent = META[lang].copy), 2000);
    });
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
    const initial = new URLSearchParams(location.search).get("lang") || store.get();
    lang = initial === "en" ? "en" : "pt";
    apply();
  }

  // Soft clay-like shrimp and pebbles floating behind a section
  let gid = 0;
  function shrimp(light, dark) {
    const id = "sg" + gid++;
    return `<svg viewBox="0 0 64 64"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
      <path d="M46 14c-9-6-24-3-30 8-6 11-1 24 10 28 6 2 12 0 15-4" stroke="url(#${id})" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="M41 46l9 2-3 7z" fill="${dark}"/>
      <path d="M48 13c5-4 9-5 13-4M47 16c6-1 10 0 13 3" stroke="${dark}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
      <circle cx="44" cy="17" r="2.4" fill="#2a2522"/></svg>`;
  }
  function pebble(light, dark) {
    const id = "sg" + gid++;
    return `<svg viewBox="0 0 100 80"><defs><radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>
      <path d="M12 44C6 22 30 6 54 8s40 18 36 38-30 30-52 26S16 58 12 44z" fill="url(#${id})"/></svg>`;
  }
  function floaters(container, shapes) {
    shapes.forEach(([t, x, y, s, l, d, r], i) => {
      const el = document.createElement("div");
      el.className = "floater";
      el.style.cssText = `left:${x}%;top:${y}%;width:${s}vw;min-width:${s * 5}px;--r0:${r}deg;--r1:${r + (i % 2 ? 10 : -10)}deg;--dx:${(i % 3 - 1) * 24}px;--dy:${i % 2 ? -28 : 22}px;--d:${11 + i * 1.7}s`;
      el.dataset.depth = (0.4 + (i % 4) * 0.25).toFixed(2);
      el.innerHTML = t === "s" ? shrimp(l, d) : pebble(l, d);
      container.appendChild(el);
    });
    const host = container.parentElement;
    host.addEventListener("mousemove", (e) => {
      const cx = e.clientX / innerWidth - 0.5, cy = e.clientY / innerHeight - 0.5;
      container.querySelectorAll(".floater").forEach((f) => {
        const k = f.dataset.depth * 30;
        f.style.transform = `translate(${-cx * k}px, ${-cy * k}px)`;
      });
    });
  }

  function reveal(selector) {
    const targets = document.querySelectorAll(selector);
    targets.forEach((t) => t.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    targets.forEach((t) => io.observe(t));
  }

  // Image with automatic coloured fallback
  function img(src, alt, color, cls = "") {
    return `<div class="media ${cls}" style="--c:${color}"><img src="${src}" alt="${alt}" loading="lazy" onerror="this.remove()"><img class="media-ph" src="assets/logo.svg" alt=""></div>`;
  }

  return {
    init, setLang, floaters, reveal, img,
    onLang(fn) { listeners.push(fn); },
    get lang() { return lang; },
    META
  };
})();
