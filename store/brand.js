// Applies the brand configured in the backoffice (name, logo, favicon, colour, support email).
// Used by the storefront and the backoffice. Works without a server: defaults stay in place.
(function () {
  const DEFAULTS = { logoHeight: 52, storeName: "Forge Labs", logoText: "FORGE", logoSub: "LABS", primaryColor: "#f26b1d", supportEmail: "support@forgelabs.example", logoUrl: null, faviconUrl: null };
  // Base URL of the site, derived from where brand.js is served (works in a subfolder too).
  const BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/brand\.js(\?.*)?$/, "") : "./";
  const url = p => (/^(https?:|data:|blob:)/.test(p) ? p : BASE + String(p).replace(/^\//, ""));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function shade(hex, amt) { // amt > 0 lightens, < 0 darkens
    const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
    return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("");
  }

  function apply(b, opts = {}) {
    b = { ...DEFAULTS, ...b };
    if (b.logoUrl) b.logoUrl = url(b.logoUrl);
    if (b.faviconUrl) b.faviconUrl = url(b.faviconUrl);
    if (!opts.skipColor) {
      const root = document.documentElement.style;
      root.setProperty("--orange", b.primaryColor);
      root.setProperty("--orange-2", shade(b.primaryColor, 0.18));
      root.setProperty("--orange-dark", shade(b.primaryColor, -0.08));
      root.setProperty("--logo-h", (+b.logoHeight || 52) + "px");
    }

    document.title = opts.titleSuffix ? `${b.storeName} ${opts.titleSuffix}` : b.storeName;

    let fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement("link"); fav.rel = "icon"; document.head.appendChild(fav); }
    fav.href = b.faviconUrl || url("favicon.svg");

    document.querySelectorAll("[data-brand-logo]").forEach(el => {
      const sub = el.dataset.brandLogo || b.logoSub;
      el.classList.toggle("has-img", !!b.logoUrl);
      el.innerHTML = b.logoUrl
        ? `<img src="${esc(b.logoUrl)}" alt="${esc(b.storeName)}">`
        : `<span>${esc(b.logoText || b.storeName)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}`;
    });
    document.querySelectorAll("[data-brand-name]").forEach(el => { el.textContent = b.storeName; });
    document.querySelectorAll("[data-brand-email]").forEach(el => { el.textContent = b.supportEmail; el.closest("[data-brand-email-wrap]")?.toggleAttribute("hidden", !b.supportEmail); });
    document.querySelectorAll("[data-brand-label]").forEach(el => { el.dataset.label = (b.logoText || b.storeName).toUpperCase().slice(0, 12); });
    window.BRAND = b;
    if (!opts.preview) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)); } catch {} }
    document.dispatchEvent(new CustomEvent("brand:applied", { detail: b }));
    return b;
  }

  // Apply the last known brand immediately (name, logo, favicon) so returning visitors see no flicker;
  // the colour itself comes from the render-blocking api/brand.css.
  const CACHE_KEY = "brand-cache";
  function applyCached(opts) {
    try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); if (c && c.storeName) apply(c, { ...opts, preview: true, skipColor: true }); } catch {}
  }

  async function load(opts) {
    applyCached(opts);
    try {
      const r = await fetch(url("api/settings"), { cache: "no-store" });
      if (r.ok) return apply(await r.json(), opts);
    } catch {}
    return apply({}, opts);
  }

  window.Brand = { apply, load, shade, url, DEFAULTS };

  // Minimal, safe Markdown for product texts (store + backoffice preview):
  // "## title", "- item", "**bold**", blank line = new paragraph. Everything is escaped first.
  const inlineMd = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  function render(t) {
    let html = "", list = null, para = [];
    const flushP = () => { if (para.length) { html += `<p>${para.map(inlineMd).join("<br>")}</p>`; para = []; } };
    const flushL = () => { if (list) { html += `<ul>${list.map(x => `<li>${inlineMd(x)}</li>`).join("")}</ul>`; list = null; } };
    for (const raw of String(t || "").replace(/\r/g, "").split("\n")) {
      const l = raw.trim(); let m;
      if (!l) { flushP(); flushL(); continue; }
      if ((m = l.match(/^#{1,6}\s+(.*)$/))) { flushP(); flushL(); html += `<h4>${inlineMd(m[1])}</h4>`; continue; }
      if ((m = l.match(/^[-*•]\s+(.*)$/))) { flushP(); (list ||= []).push(m[1]); continue; }
      flushL(); para.push(l);
    }
    flushP(); flushL();
    return html;
  }
  window.Md = { render };
})();
