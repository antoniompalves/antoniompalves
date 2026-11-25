// Procedural shrimp illustration (SVG string). Head faces +x (right).
// Works in the browser (window.makeShrimp) and in Node (module.exports).
(function (root) {
  const PALETTES = {
    coral: { light: "#ffc2b3", mid: "#f27a62", dark: "#b8432f", leg: "#d8604b", eye: "#231c1a" },
    peach: { light: "#ffe4d9", mid: "#f3a993", dark: "#c47a66", leg: "#dc8d78", eye: "#2a2220" },
    cream: { light: "#fbf5ee", mid: "#ead9c8", dark: "#bfa38c", leg: "#cdb39d", eye: "#2a2522" }
  };
  let uid = 0;
  const f = (n) => Math.round(n * 10) / 10;
  const rad = (d) => (d * Math.PI) / 180;

  function makeShrimp(paletteName = "coral", opts = {}) {
    const c = PALETTES[paletteName] || PALETTES.coral;
    const id = "shr" + (opts.id || uid++);
    const CX = 100, CY = 82, R = 42;
    const A0 = -100, A1 = -292, N = 6;
    const span = (A0 - A1) / N;
    const thick = (a) => 34 + ((a - A0) / (A1 - A0)) * (14 - 34);
    const pt = (r, a) => [CX + r * Math.cos(rad(a)), CY + r * Math.sin(rad(a))];

    // Abdominal plates (tail first so front plates overlap)
    let plates = "", highlights = "", pleopods = "";
    for (let i = N - 1; i >= 0; i--) {
      const s = A0 - i * span + 3, e = A0 - (i + 1) * span - 3;
      const steps = 10, outer = [], inner = [];
      for (let k = 0; k <= steps; k++) {
        const u = k / steps, a = s + (e - s) * u, t = thick(a);
        const bulge = 2.2 * Math.sin(Math.PI * u);
        outer.push(pt(R + t / 2 + bulge, a));
        inner.push(pt(R - t / 2 + bulge * 0.3, a));
      }
      const pts = outer.concat(inner.reverse());
      plates += `<path class="plate" d="M${pts.map((p) => f(p[0]) + " " + f(p[1])).join("L")}Z" fill="url(#${id}b)" stroke="${c.dark}" stroke-opacity=".45" stroke-width=".8"/>`;
      // highlight along the outer edge
      const hs = s - span * 0.2, he = e + span * 0.25, hr = (a) => R + thick(a) / 2 - 3;
      const h0 = pt(hr(hs), hs), h1 = pt(hr(he), he);
      highlights += `<path d="M${f(h0[0])} ${f(h0[1])}A${f(hr(hs))} ${f(hr(hs))} 0 0 0 ${f(h1[0])} ${f(h1[1])}" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round" fill="none"/>`;
      // swimmeret under the plate, pointing toward the curl centre
      if (i < N - 1) {
        const am = (s + e) / 2, ri = R - thick(am) / 2 + 1;
        const b = pt(ri, am), tip = pt(ri - 11, am + 6);
        pleopods += `<path class="leg" style="--ox:${f(b[0])}px;--oy:${f(b[1])}px;--i:${i}" d="M${f(b[0])} ${f(b[1])}Q${f((b[0] + tip[0]) / 2 + 2)} ${f((b[1] + tip[1]) / 2)} ${f(tip[0])} ${f(tip[1])}" stroke="${c.leg}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
      }
    }

    // Tail fan at the end of the curl
    const end = A1 + 4, tb = pt(R, end);
    const dir = Math.atan2(-Math.cos(rad(end)), Math.sin(rad(end)));
    let fan = "";
    [-34, -14, 0, 14, 34].forEach((d, k) => {
      const a = dir + rad(d), len = k === 2 ? 27 : 30, w = k === 2 ? 7 : 9;
      const tip = [tb[0] + Math.cos(a) * len, tb[1] + Math.sin(a) * len];
      const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      const m = [tb[0] + Math.cos(a) * len * 0.55, tb[1] + Math.sin(a) * len * 0.55];
      fan += `<path d="M${f(tb[0])} ${f(tb[1])}Q${f(m[0] + nx)} ${f(m[1] + ny)} ${f(tip[0])} ${f(tip[1])}Q${f(m[0] - nx)} ${f(m[1] - ny)} ${f(tb[0])} ${f(tb[1])}Z" fill="url(#${id}t)" stroke="${c.dark}" stroke-opacity=".4" stroke-width=".7"/>`;
    });

    // Walking legs under the head
    let walk = "";
    [[114, 56], [124, 54], [134, 51], [143, 47]].forEach(([x, y], k) => {
      walk += `<path class="leg walk" style="--ox:${x}px;--oy:${y}px;--i:${k}" d="M${x} ${y}q4 9 10 ${13 - k}" stroke="${c.leg}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
    });

    const svg = `<svg class="shrimp" viewBox="-6 -24 262 184" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <linearGradient id="${id}b" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
  <linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset="1" stop-color="${c.mid}"/></linearGradient>
  <radialGradient id="${id}h" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${c.light}"/><stop offset=".6" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
</defs>
<g class="antennae">
  <path class="ant a1" d="M152 32C178 8 206 -6 248 -14" stroke="${c.dark}" stroke-width="1.4" stroke-linecap="round" fill="none"/>
  <path class="ant a2" d="M154 36C186 24 214 22 246 30" stroke="${c.dark}" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <path class="ant a3" d="M160 34C176 30 188 34 196 40" stroke="${c.dark}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
</g>
<g class="body">
  <g class="tail">${fan}</g>
  <g class="pleopods">${pleopods}</g>
  ${plates}
  ${highlights}
  <g class="walks">${walk}</g>
  <path class="head" d="M88 24C112 13 146 15 166 25L180 26C171 31 163 34 156 36C153 49 135 60 110 60C97 59 89 50 87 40C86 33 86 28 88 24Z" fill="url(#${id}h)" stroke="${c.dark}" stroke-opacity=".45" stroke-width=".8"/>
  <path d="M98 27C118 20 142 20 160 27" stroke="#fff" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M104 52C120 55 136 50 146 42" stroke="${c.dark}" stroke-opacity=".3" stroke-width="1" fill="none"/>
  <circle cx="146" cy="31" r="5" fill="${c.eye}"/>
  <circle cx="147.6" cy="29.4" r="1.5" fill="#fff" fill-opacity=".9"/>
</g>
</svg>`;
    return svg;
  }

  root.makeShrimp = makeShrimp;
  if (typeof module !== "undefined") module.exports = { makeShrimp };
})(typeof window !== "undefined" ? window : globalThis);
