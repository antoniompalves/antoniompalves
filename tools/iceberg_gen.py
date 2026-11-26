"""Procedural low-poly iceberg for the EQ Training home page.

Builds a displaced icosphere (3D), shapes it into an iceberg (small peaked tip, broad bulging
submerged mass), flat-shades every face with a consistent light, sorts faces back-to-front and
writes SVG polygons. Above-water faces are lit by the sky; below-water faces are lit from the
surface and fade into the water colour with depth (fog), with a small refraction offset.
Output: an SVG fragment (defs + artwork) in viewBox 0 0 1440 2000, waterline at y=720.
"""
import math
import sys
import numpy as np

OUT = sys.argv[1] if len(sys.argv) > 1 else 'iceberg-art.svgfrag'
WATER, PEAK_Y, CX = 720.0, 159.0, 900.0
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- geometry
def icosphere(n):
    t = (1 + 5 ** .5) / 2
    v = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t),
         (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6),
         (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10),
         (8, 6, 7), (9, 8, 1)]
    verts = [np.array(p, float) / np.linalg.norm(p) for p in v]
    for _ in range(n):
        cache, nf = {}, []

        def mid(a, b):
            k = (min(a, b), max(a, b))
            if k not in cache:
                m = verts[a] + verts[b]
                verts.append(m / np.linalg.norm(m))
                cache[k] = len(verts) - 1
            return cache[k]
        for a, b, c in f:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            nf += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        f = nf
    V = np.array(verts)
    r = np.random.default_rng(1000 + n)
    V = V + r.normal(scale=.055 / (n or 1) * 1.6, size=V.shape)
    V /= np.linalg.norm(V, axis=1)[:, None]
    return V, f


def make_noise(octaves, seed):
    r = np.random.default_rng(seed)
    waves = []
    for freq, amp in octaves:
        for _ in range(6):
            k = r.normal(size=3)
            k /= np.linalg.norm(k)
            waves.append((k * freq, amp / 6 ** .5, r.uniform(0, 2 * math.pi)))
    return lambda p: sum(a * math.sin(float(np.dot(k, p)) + ph) for k, a, ph in waves)


def berg_mesh(sub, seed, half_w, depth_z, h_top, h_bot, bulge, lean, peaks, rough=1.0, crag=.22, lobes=.16,
              keels=(), taper=.32):
    """Displaced icosphere shaped as an iceberg. peaks shape the tip; keels push the submerged
    mass outwards in given directions (shelves, keels) so it is irregular, not a ball."""
    V, F = icosphere(sub)
    n1 = make_noise([(1.4, lobes * rough), (3.2, .07 * rough), (6.5, .03 * rough)], seed)
    n2 = make_noise([(2.6, 1.0), (5.2, .5)], seed + 99)
    n3 = make_noise([(1.1, .22 * rough), (2.3, .09 * rough)], seed + 7)
    P = []
    for v in V:
        r = 1 + n1(v)
        if v[1] < 0:
            r += n3(v) * min(1.0, -v[1] * 3)
            for d, a, s in keels:
                r += a * max(0.0, float(np.dot(v, d))) ** s
        p = v * r
        up = p[1]
        if up >= 0:
            for d, a, s in peaks:
                up += a * max(0.0, float(np.dot(v, d))) ** s
            ridge = 1 - abs(n2(v))
            up = max(0.0, up + crag * up * (ridge - .55))
            X = p[0] * half_w * max(.25, 1 - taper * up) + lean * up
            Y = up * h_top
            Z = p[2] * depth_z * max(.3, 1 - .3 * up)
        else:
            t = min(1.25, -p[1])
            b = 1 + bulge * math.sin(math.pi * min(t, 1)) ** .8
            X = p[0] * half_w * b - .35 * lean * t
            Y = -(t ** .95) * h_bot
            Z = p[2] * depth_z * b
        P.append((X, Y, Z))
    P = np.array(P)
    top = P[:, 1] > 0
    P[top, 1] *= h_top / P[top, 1].max()          # exact tip height
    return P, F


def norm(v):
    return v / (np.linalg.norm(v) + 1e-9)


# ---------------------------------------------------------------- colour
def hex2rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def rgb2hex(c):
    c = np.clip(np.round(c), 0, 255).astype(int)
    return '#%02x%02x%02x' % tuple(c)


def ramp(stops, x):
    x = float(x)
    if x <= stops[0][0]:
        return hex2rgb(stops[0][1])
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if x <= b:
            t = (x - a) / (b - a)
            return hex2rgb(ca) * (1 - t) + hex2rgb(cb) * t
    return hex2rgb(stops[-1][1])


SEA = [(0, '#1670bd'), (.06, '#0d5ea9'), (.3, '#073f7c'), (.62, '#042346'), (1, '#030d1f')]   # y 720→2000
ICE_UP = [(.05, '#2d5f92'), (.28, '#5f8fc0'), (.5, '#9dc1e4'), (.7, '#cfe2f4'), (.86, '#eef5fc'), (1.0, '#ffffff')]
ICE_DN = [(0, '#0b3768'), (.3, '#145c9c'), (.55, '#2c8fc8'), (.78, '#5fc0e4'), (1, '#a8e3f3')]


def sea_at(y):
    return ramp(SEA, (y - WATER) / 1280)


# ---------------------------------------------------------------- render
def shade_faces(P, F, offset_x, refract=9.0, scale=1.0, light_jitter_seed=1):
    """Return (above_polys, below_polys, waterline_xs) as lists of (z, points, fill)."""
    jit = np.random.default_rng(light_jitter_seed)
    L_air = norm(np.array([-.5, .72, .55]))
    L_sea = norm(np.array([.18, 1, .32]))
    centre = P.mean(axis=0)
    above, below, wl = [], [], []
    for (a, b, c) in F:
        A, B, C = P[a], P[b], P[c]
        n = norm(np.cross(B - A, C - A))
        cen = (A + B + C) / 3
        if np.dot(n, cen - centre) < 0:
            n = -n
            B, C = C, B
        if n[2] <= 0.02:                      # back-facing (camera looks along -Z)
            continue
        ys = (A[1], B[1], C[1])
        j = jit.uniform(-.025, .025)
        pts = [(offset_x + p[0] * scale, WATER - p[1] * scale) for p in (A, B, C)]
        if max(ys) > 0:
            diff = max(0.0, float(np.dot(n, L_air)))
            hemi = .5 + .5 * n[1]
            col = ramp(ICE_UP, .1 + .74 * diff + .2 * hemi + j)
            above.append((cen[2], pts, rgb2hex(col)))
        if min(ys) < 0:
            diff = max(0.0, float(np.dot(n, L_sea)))
            col = ramp(ICE_DN, .1 + .9 * diff ** .9 + j)
            y_svg = WATER - cen[1] * scale
            d = min(1.0, max(0.0, (y_svg - WATER) / 880))
            fog = .1 + .86 * d ** .85
            col = col * (1 - fog) + sea_at(y_svg) * fog
            below.append((cen[2], [(x + refract, y) for x, y in pts], rgb2hex(col)))
        # waterline crossings of this face's edges
        for p, q in ((A, B), (B, C), (C, A)):
            if (p[1] > 0) != (q[1] > 0):
                t = p[1] / (p[1] - q[1])
                wl.append(offset_x + (p[0] + (q[0] - p[0]) * t) * scale)
    above.sort(key=lambda r: r[0])
    below.sort(key=lambda r: r[0])
    return above, below, wl


def poly(pts, fill, extra=''):
    d = 'M' + 'L'.join('%.0f %.0f' % p for p in pts) + 'Z'
    return '<path d="%s" fill="%s" stroke="%s"%s/>' % (d, fill, fill, extra)


def main():
    # ---- main berg
    peaks = [(norm(np.array([.22, 1, .05])), 1.05, 6), (norm(np.array([-.52, .8, .22])), .42, 9),
             (norm(np.array([.66, .7, -.12])), .2, 10), (norm(np.array([-.1, .85, -.5])), .14, 12)]
    keels = [(norm(np.array([-.92, -.28, .25])), .38, 5),     # shelf jutting left, just under the surface
             (norm(np.array([.55, -.82, .12])), .34, 4),       # deep keel down-right
             (norm(np.array([-.25, -.96, -.1])), .22, 6),      # spur at the bottom
             (norm(np.array([.95, -.2, -.2])), .18, 6)]        # small ledge right
    P, F = berg_mesh(3, 11, half_w=360, depth_z=250, h_top=WATER - PEAK_Y, h_bot=930, bulge=.3, lean=40,
                     peaks=peaks, crag=.24, lobes=.18, keels=keels, taper=.3)
    # centre the tip on CX at the waterline
    ab0, be0, wl0 = shade_faces(P, F, 0)
    off = CX - (min(wl0) + max(wl0)) / 2
    above, below, wl = shade_faces(P, F, off)
    wl_min, wl_max = min(wl), max(wl)

    # ---- two small floes
    floes = []
    for seed, x, s, hw, ht, hb in ((23, 408, 1.0, 74, 26, 92), (31, 1372, 1.0, 50, 17, 64)):
        fp, ff = berg_mesh(2, seed, half_w=hw, depth_z=hw * .6, h_top=ht, h_bot=hb, bulge=.3, lean=10,
                           peaks=[(norm(np.array([.3, 1, .1])), .2, 5)], rough=1.6, crag=.15, lobes=.22)
        fa, fb, fw = shade_faces(fp, ff, x, refract=5, light_jitter_seed=seed)
        floes.append((fa, fb, min(fw), max(fw)))

    out = []
    out.append('''<defs>
  <linearGradient id="ib-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f7fb"/><stop offset=".7" stop-color="#e2ecf6"/><stop offset="1" stop-color="#d3e3f2"/></linearGradient>
  <linearGradient id="ib-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient>
  <linearGradient id="ib-sea" x1="0" y1="0" x2="0" y2="1">%s</linearGradient>
  <linearGradient id="ib-surface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8fb" stop-opacity=".55"/><stop offset=".35" stop-color="#9fd0f5" stop-opacity=".16"/><stop offset="1" stop-color="#9fd0f5" stop-opacity="0"/></linearGradient>
  <linearGradient id="ib-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeaff" stop-opacity=".32"/><stop offset=".55" stop-color="#cfeaff" stop-opacity=".08"/><stop offset="1" stop-color="#cfeaff" stop-opacity="0"/></linearGradient>
  <radialGradient id="ib-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#5fb4ef" stop-opacity=".28"/><stop offset="1" stop-color="#5fb4ef" stop-opacity="0"/></radialGradient>
  <filter id="ib-soft" x="-20%%" y="-5%%" width="140%%" height="110%%"><feGaussianBlur stdDeviation="12"/></filter>
  <clipPath id="ib-air"><rect x="-4000" y="-200" width="9440" height="%d"/></clipPath>
  <clipPath id="ib-sub"><rect x="-4000" y="%d" width="9440" height="2000"/></clipPath>
</defs>''' % (''.join('<stop offset="%g" stop-color="%s"/>' % (o, c) for o, c in SEA), 200 + WATER + .5, WATER - .5))

    # sky + horizon haze
    out.append('<rect x="-4000" y="-200" width="9440" height="%d" fill="url(#ib-sky)"/>' % (200 + WATER))
    out.append('<rect x="-4000" y="560" width="9440" height="%d" fill="url(#ib-haze)"/>' % (WATER - 560))
    # sea
    out.append('<rect x="-4000" y="%d" width="9440" height="1280" fill="url(#ib-sea)"/>' % WATER)
    out.append('<rect x="-4000" y="3280" width="9440" height="4000" fill="#030d1f"/>'.replace('3280', '%d' % (WATER + 1280 - 1)))
    out.append('<ellipse cx="%.0f" cy="960" rx="820" ry="420" fill="url(#ib-glow)"/>' % CX)

    # god rays: soft, slanted, from the surface
    rays = []
    for x0, w0, w1, slant, length, op in ((-420, 70, 260, 230, 1150, .8), (90, 46, 190, 210, 1000, .7),
                                         (360, 36, 150, 190, 900, .55), (690, 60, 220, 220, 1100, .65),
                                         (1150, 50, 200, 230, 1050, .7), (1560, 70, 260, 240, 1150, .8),
                                         (1980, 60, 240, 240, 1100, .7)):
        y0 = WATER + 2
        rays.append('<path d="M%d %d L%d %d L%d %d L%d %dZ" fill="url(#ib-ray)" opacity="%.2f"/>' % (
            x0, y0, x0 + w0, y0, x0 + slant + w1, y0 + length, x0 + slant, y0 + length, op))
    out.append('<g class="ib-rays" filter="url(#ib-soft)">%s</g>' % ''.join(rays))

    # marine snow behind the berg
    def specks(n, seed, front):
        r = np.random.default_rng(seed)
        s = []
        for _ in range(n):
            u = r.uniform() ** 1.7
            y = WATER + 30 + u * 1180
            x = r.uniform(-700, 2140)
            rad = r.uniform(.8, 2.4) * (1.25 if front else 1)
            op = (.38 - .26 * u) * r.uniform(.5, 1)
            s.append('<circle cx="%.0f" cy="%.0f" r="%.1f" opacity="%.2f"/>' % (x, y, rad, op))
        return '<g fill="#d8eeff">%s</g>' % ''.join(s)
    out.append(specks(70, 3, False))

    # submerged ice (clipped below the surface, refracted)
    out.append('<g clip-path="url(#ib-sub)" stroke-width=".9" stroke-linejoin="round">')
    for fa, fb, _, _ in floes:
        out.append(''.join(poly(p, c) for _, p, c in fb))
    out.append(''.join(poly(p, c) for _, p, c in below))
    out.append('</g>')
    out.append(specks(26, 5, True))

    # bright surface band + ripples
    out.append('<rect x="-4000" y="%d" width="9440" height="70" fill="url(#ib-surface)"/>' % WATER)
    rip = []
    r = np.random.default_rng(9)
    for _ in range(34):
        y = WATER + 10 + r.uniform() ** 1.6 * 120
        x = r.uniform(-500, 1950)
        w = r.uniform(40, 220)
        a = r.uniform(1.5, 3.5)
        rip.append('<path d="M%.0f %.1f q%.0f %.1f %.0f 0 t%.0f 0" opacity="%.2f"/>' % (
            x, y, w / 4, -a, w / 2, w / 2, r.uniform(.08, .26) * (1 - (y - WATER) / 160)))
    out.append('<g fill="none" stroke="#e8f5ff" stroke-width="1.6" stroke-linecap="round">%s</g>' % ''.join(rip))

    # ice above the surface
    out.append('<g clip-path="url(#ib-air)" stroke-width=".9" stroke-linejoin="round">')
    out.append(''.join(poly(p, c) for _, p, c in above))
    for fa, fb, _, _ in floes:
        out.append(''.join(poly(p, c) for _, p, c in fa))
    out.append('</g>')

    # foam where ice meets water
    def foam(x0, x1, seed, thick=4.0):
        r = np.random.default_rng(seed)
        n = max(6, int((x1 - x0) / 28))
        xs = np.linspace(x0 - 8, x1 + 8, n)
        top = [(x, WATER - r.uniform(.5, thick * .55)) for x in xs]
        bot = [(x, WATER + r.uniform(1, thick)) for x in xs[::-1]]
        d = 'M' + ' L'.join('%.1f %.1f' % p for p in top + bot) + 'Z'
        bits = []
        for _ in range(int((x1 - x0) / 40) + 4):
            side = r.choice([-1, 1])
            x = (x0 - r.uniform(6, 60)) if side < 0 else (x1 + r.uniform(6, 70))
            bits.append('<rect x="%.0f" y="%.1f" width="%.0f" height="1.6" rx=".8" opacity="%.2f"/>' % (
                x, WATER + r.uniform(-.5, 2.5), r.uniform(6, 26), r.uniform(.3, .75)))
        return '<path d="%s" opacity=".92"/>%s' % (d, ''.join(bits))
    f = [foam(wl_min, wl_max, 41)] + [foam(a, b, 50 + i, 2.6) for i, (_, _, a, b) in enumerate(floes)]
    out.append('<g fill="#ffffff">%s</g>' % ''.join(f))

    svg = '\n'.join(out)
    open(OUT, 'w').write(svg)
    print('faces above', len(above), 'below', len(below), 'waterline x %.0f..%.0f' % (wl_min, wl_max),
          'bytes', len(svg))
    tip_top = min(y for _, pts, _ in above for _, y in pts)
    sub_bot = max(y for _, pts, _ in below for _, y in pts)
    xs_below = [x for _, pts, _ in below for x, _ in pts]
    print('tip top y %.0f  submerged bottom y %.0f  submerged x %.0f..%.0f' % (tip_top, sub_bot, min(xs_below), max(xs_below)))


main()
