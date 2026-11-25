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

  // ---------- Swimming shrimp ----------
  // configs: [palette, size (vw), start x %, start y %, depth 0..1]
  // Shrimp wander slowly head-first, paddle their legs, and when the cursor
  // gets close they flick their tail and dart away backwards, like real shrimp.
  function swim(container, configs) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fish = configs.map(([pal, size, x, y, depth], i) => {
      const el = document.createElement("div");
      el.className = "swimmer";
      el.style.width = `max(${size}vw, ${size * 6}px)`;
      el.style.setProperty("--depth", depth);
      el.style.zIndex = Math.round(depth * 10);
      el.innerHTML = window.makeShrimp(pal);
      el.style.setProperty("--speed", (0.7 + depth * 0.5).toFixed(2));
      container.appendChild(el);
      return {
        el, depth, x, y, px: 0, py: 0,
        h: (i * 137) % 360 * Math.PI / 180,    // heading
        phase: i * 1.7, dvx: 0, dvy: 0, cool: 0, shown: 0
      };
    });

    let W = 0, H = 0, mx = -9999, my = -9999, running = false, t = 0;
    const size = () => {
      const r = container.getBoundingClientRect();
      W = r.width; H = r.height;
      fish.forEach((s) => { if (!s.shown) { s.px = s.x / 100 * W; s.py = s.y / 100 * H; s.shown = 1; } });
    };
    size();
    addEventListener("resize", size);
    addEventListener("mousemove", (e) => {
      const r = container.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });

    // Face the direction of travel: mirror when going left, tilt at most ±22°
    const draw = (s) => {
      const vx = Math.cos(s.h), vy = Math.sin(s.h) * 0.45;
      const dir = vx < 0 ? -1 : 1;
      const tilt = Math.max(-22, Math.min(22, Math.atan2(vy, Math.abs(vx)) * 180 / Math.PI));
      s.el.style.transform = `translate(${s.px}px, ${s.py}px) translate(-50%, -50%) scaleX(${dir}) rotate(${tilt}deg)`;
    };

    function flick(s) {
      s.el.classList.remove("flick"); void s.el.offsetWidth; s.el.classList.add("flick");
      setTimeout(() => s.el.classList.remove("flick"), 450);
    }

    function step() {
      if (!running) return;
      t += 1;
      fish.forEach((s) => {
        const w = s.el.offsetWidth;
        const cruise = 0.25 + s.depth * 0.45;
        // gentle wandering
        s.h += Math.sin(t * 0.008 + s.phase) * 0.006 + Math.sin(t * 0.021 + s.phase * 2) * 0.003;
        // steer back inside the box
        const m = w * 0.3;
        if (s.px < -m || s.px > W + m || s.py < -m * 0.5 || s.py > H + m * 0.5) {
          const target = Math.atan2(H / 2 - s.py, W / 2 - s.px);
          let d = target - s.h; d = Math.atan2(Math.sin(d), Math.cos(d));
          s.h += d * 0.03;
        }
        // cursor: tail-flick escape
        s.cool = Math.max(0, s.cool - 1);
        const dx = s.px - mx, dy = s.py - my, dist = Math.hypot(dx, dy);
        if (dist < w * 0.75 + 60 && !s.cool) {
          const k = 9 + s.depth * 5;
          s.dvx = dx / dist * k; s.dvy = dy / dist * k;
          s.cool = 70; flick(s);
        } else if (!s.cool && Math.random() < 0.0012) {
          // spontaneous little backward flick
          s.dvx = -Math.cos(s.h) * 5; s.dvy = -Math.sin(s.h) * 5;
          s.cool = 90; flick(s);
        }
        s.dvx *= 0.94; s.dvy *= 0.94;
        s.px += Math.cos(s.h) * cruise + s.dvx;
        s.py += Math.sin(s.h) * cruise * 0.45 + s.dvy;
        draw(s);
      });
      requestAnimationFrame(step);
    }

    fish.forEach(draw);
    if (reduce) return;
    new IntersectionObserver(([e]) => {
      const was = running; running = e.isIntersecting;
      if (running && !was) requestAnimationFrame(step);
    }).observe(container);
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
    init, setLang, swim, reveal, img,
    onLang(fn) { listeners.push(fn); },
    get lang() { return lang; },
    META
  };
})();
