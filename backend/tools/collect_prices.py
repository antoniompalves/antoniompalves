"""Collect shelf prices from Continente and Auchan category pages (for build_reference.py).

Low-volume and robots.txt-aware:
  - Continente: robots.txt disallows search and pagination (?start=, ?sz=), so only the first page of
    each food sub-category listed in the public category sitemap is read.
  - Auchan: search and price/refinement filters are disallowed, page size is not; one page per category.
One request every 1.5 s. Run occasionally (e.g. quarterly), not on a schedule against the sites.

Usage:  python tools/collect_prices.py continente|auchan [--delay 1.5] [--out FILE]
"""
from __future__ import annotations

import argparse
import html
import json
import re
import time

import httpx

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
SKIP = ("cafe", "cha-e-soluveis", "cereais", "bolacha", "gomas", "bombons", "tabletes", "snack", "aperitivo", "infantil",
        "bebe", "papas", "sobremesa", "gelado", "gelatinas", "barras", "chocolate-soluvel", "bebidas", "natal", "cabazes",
        "sumos", "sushi", "panados", "espetadas", "hamburgueres", "almondegas", "rolos", "pizza", "refeic", "pronto",
        "marcas", "pastelaria", "gastronomia")


def clean(x: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x))).strip()


def leaves(urls: list[str], sections: tuple[str, ...]) -> list[str]:
    sel = [u for u in urls if any(s in u for s in sections)]
    out = [u for u in sel if not any(o != u and o.startswith(u) for o in sel)]
    return [u for u in out if not any(k in u for k in SKIP)]


def sitemap_urls(c: httpx.Client, index: str, kind: str) -> list[str]:
    maps = re.findall(r"<loc>([^<]+)</loc>", c.get(index).text)
    urls = []
    for m in maps:
        if kind in m:
            urls += re.findall(r"<loc>([^<]+)</loc>", c.get(m).text)
    return urls


def continente(c: httpx.Client, delay: float) -> list[dict]:
    urls = sitemap_urls(c, "https://www.continente.pt/sitemap_index.xml", "category")
    cats = leaves(urls, tuple(f"/supermercado/{s}/" for s in ("frutas-e-legumes", "talho", "peixaria", "mercearia",
                                                               "laticinios-e-ovos", "charcutaria-e-queijos", "padaria-e-pastelaria", "congelados")))
    out = []
    for u in cats:
        s = c.get(u).text  # first page only
        for t in s.split('class="product-tile')[1:]:
            name = re.search(r'class="[^"]*(?:pwc-tile--description|ct-tile--description)[^"]*"[^>]*>(.*?)</', t, re.S)
            qty = re.search(r'class="pwc-tile--quantity">(.*?)</', t, re.S)
            sec = re.search(r"pwc-tile--price-secondary[^>]*>(.*?)</", t, re.S)
            if name and sec:
                out.append({"name": clean(name.group(1)), "qty": clean(qty.group(1)) if qty else "",
                            "unit_price": clean(sec.group(1)), "category": u.split("/supermercado/")[1].strip("/")})
        time.sleep(delay)
    return out


def auchan(c: httpx.Client, delay: float) -> list[dict]:
    urls = sitemap_urls(c, "https://www.auchan.pt/sitemap_index.xml", "category")
    cats = leaves(urls, ("/pt/produtos-frescos/", "/pt/alimentacao/mercearia/", "/pt/alimentacao/produtos-lacteos/", "/pt/congelados/"))
    out = []
    for u in cats:
        s = c.get(u, params={"sz": 72}).text
        for t in re.split(r'class="auc-product"', s)[1:]:
            g = next((m for m in re.finditer(r'data-gtm(?:-new)?="([^"]+)"', t) if "&quot;name&quot;" in m.group(1)), None)
            ppu = re.search(r"auc-measures--price-per-unit[^>]*>([^<]+)", t)
            if not g:
                continue
            try:
                d = json.loads(html.unescape(g.group(1)))
            except json.JSONDecodeError:
                continue
            out.append({"name": d.get("name"), "brand": d.get("brand"), "price": d.get("price"),
                        "unit_price": html.unescape(ppu.group(1)).strip() if ppu else None, "category": u.split("/pt/")[1].strip("/")})
        time.sleep(delay)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("store", choices=["continente", "auchan"])
    ap.add_argument("--delay", type=float, default=1.5)
    ap.add_argument("--out")
    a = ap.parse_args()
    with httpx.Client(headers={"User-Agent": UA, "Accept-Language": "pt-PT"}, follow_redirects=True, timeout=30) as c:
        products = (continente if a.store == "continente" else auchan)(c, a.delay)
    src = "continente.pt (category pages, first page only)" if a.store == "continente" else "auchan.pt (category pages)"
    out = a.out or f"{a.store}_prices.json"
    json.dump({"source": src, "collected": time.strftime("%Y-%m-%d"), "products": products}, open(out, "w"), ensure_ascii=False)
    print(len(products), "products ->", out)


if __name__ == "__main__":
    main()
