(() => {
  const P = window.PROJECTS;
  const id = new URLSearchParams(location.search).get("p");
  let i = Math.max(0, P.findIndex((p) => p.id === id));
  const p = P[i];
  const prev = P[(i - 1 + P.length) % P.length];
  const next = P[(i + 1) % P.length];
  const $ = (s) => document.getElementById(s);
  const pad = (n) => String(n).padStart(2, "0");
  const title = (x, lang) => (lang === "en" && x.titleEn) || x.title;

  document.documentElement.style.setProperty("--case", p.color);

  // Static media (doesn't change with language)
  $("c-hero").innerHTML = SL.img(p.hero, p.title, p.color, "screen");
  $("c-wide").innerHTML = SL.img(p.wide, p.title, p.color, "wide");
  $("c-pages").innerHTML = p.pages.map((src) => `<div class="device small">${SL.img(src, p.title, p.color, "screen")}</div>`).join("");
  $("c-no").textContent = pad(i + 1);
  $("prev").href = `case.html?p=${prev.id}`;
  $("next").href = `case.html?p=${next.id}`;
  $("c-nextlink").href = `case.html?p=${next.id}`;

  SL.swim($("floaters"), [
    ["cream", 16, 82, 62, 0.9],
    ["peach", 10, 14, 20, 0.6],
    ["cream", 7, 70, 14, 0.35]
  ]);

  function render(lang) {
    const t = p[lang];
    document.title = `${title(p, lang)} | Shrimp Labs`;
    $("c-title").textContent = title(p, lang);
    $("c-count").textContent = `( ${pad(i + 1)}/${pad(P.length)} ) ${p.year}`;
    $("c-headline").textContent = t.headline;
    $("c-text").textContent = t.text;
    $("c-type").textContent = t.type;
    $("c-overview").textContent = t.overview;
    $("c-features").innerHTML = t.features.map((f, k) => `<li><span>${pad(k + 1)}</span>${f}</li>`).join("");
    $("c-nextname").textContent = title(next, lang);
    const link = $("c-link");
    link.hidden = !p.url;
    if (p.url) { link.href = p.url; link.textContent = SL.META[lang].open + " ↗"; }
  }
  SL.onLang(render);
  SL.init();
  SL.reveal(".case-block > *, .case-device, .case-wide, .next-case, .case-cta");
})();
