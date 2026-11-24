"""Build app/data/ingredients_pt.json from:
  - tools/reference_seed.py           curated Portuguese ingredients
  - USDA FoodData Central SR Legacy   nutrition per 100 g + measured portion weights (public domain / CC0)
  - continente_prices.json, auchan_prices.json   shelf prices collected once from category pages
    (first page only on continente.pt, whose robots.txt disallows pagination; auchan.pt allows page size)

Usage:
  python tools/build_reference.py --usda DIR --prices continente_prices.json auchan_prices.json
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import statistics
import sys
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from reference_seed import SEED  # noqa: E402

NUTRIENTS = {"1008": "kcal", "1003": "protein_g", "1004": "fat_g", "1005": "carbs_g", "1079": "fiber_g", "2000": "sugars_g", "1093": "sodium_mg"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9%,./ ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# ----------------------------------------------------------------------------- USDA
def load_usda(d: Path):
    foods = {}
    with open(d / "food.csv", newline="") as f:
        for r in csv.DictReader(f):
            foods[r["description"].strip().lower()] = r["fdc_id"]
    nutr = defaultdict(dict)
    with open(d / "food_nutrient.csv", newline="") as f:
        for r in csv.DictReader(f):
            if r["nutrient_id"] in NUTRIENTS and r["amount"]:
                nutr[r["fdc_id"]][NUTRIENTS[r["nutrient_id"]]] = round(float(r["amount"]), 2)
    portions = defaultdict(list)
    with open(d / "food_portion.csv", newline="") as f:
        for r in csv.DictReader(f):
            try:
                amount = float(r["amount"] or 1) or 1
                portions[r["fdc_id"]].append(((r["modifier"] or r["portion_description"] or "").lower(), float(r["gram_weight"]) / amount))
            except ValueError:
                pass
    return foods, nutr, portions


def portion_grams(plist):
    """Pick grams for household measures from USDA portion descriptions."""
    out = {}
    def first(pred):
        for desc, g in plist:
            if pred(desc):
                return round(g, 1)
    out["cup"] = first(lambda d: re.match(r"cup\b", d) and "pieces" not in d) or first(lambda d: d.startswith("cup"))
    out["tbsp"] = first(lambda d: d.startswith("tbsp") or "tablespoon" in d)
    out["tsp"] = first(lambda d: d.startswith("tsp") or "teaspoon" in d)
    out["clove"] = first(lambda d: "clove" in d)
    out["slice"] = first(lambda d: "slice" in d)
    out["unit"] = (first(lambda d: d.startswith("medium") or " medium" in d) or first(lambda d: d.startswith("large"))
                   or first(lambda d: d in ("each", "whole", "fruit", "item")))
    return {k: v for k, v in out.items() if v}


# ----------------------------------------------------------------------------- prices
UNIT_RE = re.compile(r"([\d.,]+)\s*(?:€|&euro;)?\s*/\s*(kg|lt|l|un|doz|dz|100 ?g|100 ?ml)", re.I)
PACK_RE = re.compile(r"([\d.,]+)\s*(kg|gr|g|lt|l|ml|cl)\b", re.I)


def pack_size(qty: str):
    """'emb. 680 gr (aprox.)' -> (0.68, 'kg'); 'emb. 1 lt' -> (1.0, 'l'); 'emb. 3 x 250 ml' -> (0.75, 'l')."""
    q = (qty or "").lower().replace("&nbsp;", " ")
    mult = re.search(r"(\d+)\s*x\s*[\d.,]+\s*(?:kg|gr|g|lt|l|ml|cl)", q)
    m = PACK_RE.search(q)
    if not m:
        return None
    raw = m.group(1).strip(".,")
    try:
        v = float(raw.replace(".", "").replace(",", ".") if "," in raw else raw)
    except ValueError:
        return None
    u = m.group(2)
    size = {"kg": (v, "kg"), "gr": (v / 1000, "kg"), "g": (v / 1000, "kg"), "lt": (v, "l"), "l": (v, "l"), "ml": (v / 1000, "l"), "cl": (v / 100, "l")}[u]
    return (size[0] * int(mult.group(1)), size[1]) if mult else size


def parse_unit_price(text: str):
    """'9,58€/kg' | '1.79 €/Kg' | '1,20€/un' | '2,10 €/Lt' -> (value, 'kg'|'l'|'un')."""
    if not text:
        return None
    m = UNIT_RE.search(text.replace("&euro;", "€"))
    if not m:
        return None
    raw = m.group(1)
    raw = raw.replace(".", "").replace(",", ".") if "," in raw else raw  # "1.799,00" (PT) vs "1.79" (Auchan)
    try:
        v = float(raw)
    except ValueError:
        return None
    u = m.group(2).lower().replace(" ", "")
    if u in ("lt", "l"):
        return v, "l"
    if u in ("dz", "doz"):
        return v / 12, "un"
    if u == "100g":
        return v * 10, "kg"
    if u == "100ml":
        return v * 10, "l"
    return v, u


def load_prices(paths):
    products = []
    collected = []
    for p in paths:
        data = json.load(open(p))
        store = "Continente" if "continente" in data["source"] else "Auchan"
        collected.append(data["collected"])
        for it in data["products"]:
            up = parse_unit_price(it.get("unit_price") or "")
            if up and up[1] == "un" and it.get("qty"):
                # Continente "€/un": with "emb. 680 gr" it's the pack price; with "600 gr (3 un)" it's per piece.
                ps = pack_size(it["qty"])
                cnt = re.search(r"\((\d+) un\)", it["qty"])
                if ps:
                    pieces = int(cnt.group(1)) if cnt and not it["qty"].lower().startswith("emb") else 1
                    up = (up[0] * pieces / ps[0], ps[1])
            if up:
                products.append({"store": store, "name": it["name"], "n": norm(it["name"]), "value": up[0], "unit": up[1]})
    return products, max(collected) if collected else None


def pct(xs, q):
    xs = sorted(xs)
    if len(xs) == 1:
        return xs[0]
    k = (len(xs) - 1) * q
    lo, hi = int(k), min(int(k) + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)


GLOBAL_AVOID = ["preparado", "mistura", "tosta", "snack", "biscoit", "wafer", "tremoco", "focaccia", "pizza", "bolo", "iogurte",
                "bebida", "sobremesa", "recheado", "recheada", "panado", "com molho", "salada", "creme de", "pate", "chips", "infantil",
                "vegan", "vegetal", "mortadela", "tarallini", "torresmo", "sumo", "nectar", "compota", "gelado", "quinoa"]
PREFIX = re.compile(r"^(miolo|filetes?|lombos?|lombinhos?|postas?|tiras|cubos|dentes|folhas|floretes|rabos?|medalhoes|fatias|"
                    r"cabeca|molho|ramo|saco|cuvete|pack|embalagem)( de| do| da| dos| das)? ")


def price_for(seed, density, products):
    if not seed.get("match"):
        return None
    inc = re.compile(seed["match"].lstrip("^"))
    exc = re.compile(seed["avoid"]) if seed.get("avoid") else None
    gav = re.compile("|".join(w for w in GLOBAL_AVOID if w not in seed["match"]))
    basis = seed.get("basis", "kg")
    unit_g = seed.get("unit_g")
    vals, samples, stores = [], [], set()
    for p in products:
        core = PREFIX.sub("", p["n"])
        if not (inc.match(p["n"]) or inc.match(core)) or (exc and exc.search(p["n"])) or gav.search(p["n"]):
            continue
        v, u = p["value"], p["unit"]
        if basis == "un":
            if u == "kg" and unit_g:
                v = v * unit_g / 1000
            elif u != "un":
                continue
        else:
            if u == "l":
                v = v / (density or 1.0)  # €/l -> €/kg
            elif u == "un":
                if not unit_g:
                    continue
                v = v / unit_g * 1000
        if v <= 0 or v > 400:  # parsing noise / gift boxes
            continue
        vals.append(v)
        stores.add(p["store"])
        samples.append(f"{p['store']}: {p['name']}")
    if not vals:
        return None
    med = statistics.median(vals)
    vals = [v for v in vals if med / 4 <= v <= med * 4]  # drop extreme outliers (premium/novelty items)
    return {
        "basis": basis,
        "low": round(pct(vals, 0.25), 2), "typical": round(statistics.median(vals), 2), "high": round(pct(vals, 0.75), 2),
        "n": len(vals), "stores": sorted(stores), "samples": samples[:4],
    }


# ----------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--usda", required=True)
    ap.add_argument("--prices", nargs="+", required=True)
    ap.add_argument("--out", default=str(Path(__file__).parent.parent / "app" / "data" / "ingredients_pt.json"))
    a = ap.parse_args()

    foods, nutr, portions = load_usda(Path(a.usda))
    products, collected = load_prices(a.prices)
    items, missing_usda, missing_price = [], [], []
    for s in SEED:
        entry = {"key": s["key"], "aliases": s.get("aliases", []), "aisle": s.get("aisle")}
        if s.get("free"):
            entry.update(free=True)
            items.append(entry)
            continue
        fid = foods.get((s.get("usda") or "").lower())
        if not fid:
            missing_usda.append(f"{s['key']}: {s.get('usda')}")
            continue
        por = portion_grams(portions.get(fid, []))
        density = round(por["cup"] / 236.6, 3) if por.get("cup") else None  # g per ml
        entry.update(
            nutrition=nutr.get(fid, {}),
            usda={"fdc_id": int(fid), "description": s["usda"]},
            portions=por,
            density=density,
            unit_g=por.get("unit") or s.get("unit_g") if s.get("basis") != "un" else (s.get("unit_g") or por.get("unit")),
        )
        price = price_for(s, density, products)
        if price:
            entry["price"] = price
        else:
            missing_price.append(s["key"])
        items.append(entry)

    out = {
        "version": date.today().isoformat(),
        "sources": {
            "nutrition": "USDA FoodData Central, SR Legacy (April 2018), public domain (CC0)",
            "prices": f"Preços de prateleira em continente.pt e auchan.pt recolhidos em {collected}",
            "price_collected": collected,
        },
        "items": items,
    }
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(out, open(a.out, "w"), ensure_ascii=False, indent=1)
    print(f"{len(items)} items -> {a.out}")
    print(f"missing USDA ({len(missing_usda)}):", *missing_usda, sep="\n  ")
    print(f"missing price ({len(missing_price)}):", ", ".join(missing_price))


if __name__ == "__main__":
    main()
