"""Estimated cost and nutrition of a recipe, computed from its ingredient lines.

Each line ("200 g de esparguete", "2 dentes de alho", "1 c. sopa de azeite", "sal q.b.")
is matched to a reference ingredient (app/data/ingredients_pt.json: USDA nutrition +
shelf prices), converted to grams, then summed. Matching order:
  1. a person's correction for this group/name (ingredient_map table)
  2. exact alias, 3. longest alias contained in the name, 4. LLM mapping cached at import.
Everything is an estimate and is labelled as such in the UI.
"""
from __future__ import annotations

import json
import os
import re
import statistics
import unicodedata
from functools import lru_cache
from typing import Iterable, Optional

from .util import parse_qty

DATA = os.path.join(os.path.dirname(__file__), "data", "ingredients_pt.json")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def singular(w: str) -> str:
    for suf, rep in (("oes", "ao"), ("aes", "ao"), ("ns", "m"), ("is", "l"), ("es", ""), ("s", "")):
        if w.endswith(suf) and len(w) > len(suf) + 2:
            return w[: -len(suf)] + rep
    return w


def sing_phrase(s: str) -> str:
    return " ".join(singular(w) for w in s.split())


@lru_cache(maxsize=1)
def reference() -> dict:
    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)
    by_key = {it["key"]: it for it in data["items"]}
    alias: dict[str, str] = {}
    for it in data["items"]:
        for a in [it["key"], *it.get("aliases", [])]:
            for form in {norm(a), sing_phrase(norm(a))}:
                alias.setdefault(form, it["key"])
    data["by_key"], data["alias"] = by_key, alias
    data["alias_sorted"] = sorted(alias, key=len, reverse=True)
    return data


# ----------------------------------------------------------------------------- units
CUP_ML, TBSP_ML, TSP_ML = 240.0, 15.0, 5.0
UNITS = [  # (regex on normalised unit text, canonical)
    (r"^(kg|kgs|quilo|quilos|kilo|kilos)$", "kg"), (r"^(g|gr|grs|grama|gramas)$", "g"), (r"^(mg)$", "mg"),
    (r"^(l|lt|litro|litros)$", "l"), (r"^(dl|decilitro)$", "dl"), (r"^(cl)$", "cl"), (r"^(ml|mililitro|mililitros)$", "ml"),
    (r"^(chavena|chavenas|xicara|xicaras|cup|cups|copo|copos|caneca|canecas)$", "cup"),
    (r"^(c sopa|cs|colher de sopa|colheres de sopa|colher sopa|tbsp|tablespoon|tablespoons|colher|colheres)$", "tbsp"),
    (r"^(c sobremesa|colher de sobremesa|colheres de sobremesa)$", "dsp"),
    (r"^(c cha|cc|colher de cha|colheres de cha|colher cha|tsp|teaspoon|teaspoons|c cafe|colher de cafe)$", "tsp"),
    (r"^(dente|dentes|clove|cloves)$", "clove"), (r"^(fatia|fatias|slice|slices)$", "slice"),
    (r"^(pitada|pitadas|pinch)$", "pinch"), (r"^(q b|qb|a gosto|to taste)$", "qb"),
    (r"^(lata|latas|can|cans|frasco|frascos)$", "can"), (r"^(pacote|pacotes|embalagem|embalagens|saqueta|saquetas|cubo|cubos)$", "pack"),
    (r"^(molho|molhos|ramo|ramos|bunch|punhado|punhados|handful)$", "bunch"), (r"^(raminho|raminhos|folha|folhas|sprig|leaves|pe|pes)$", "leaf"),
    (r"^(un|und|unid|unidade|unidades|unit|units|peca|pecas|bola|bolas|lombo|lombos|posta|postas|file|filete|filetes)$", "unit"),
]
CAN_G = {"tomate pelado": 400, "grão-de-bico": 260, "feijão": 260, "milho doce": 285, "atum em lata": 80, "leite de coco": 400,
         "concentrado de tomate": 70, "sardinhas": 85, "azeitonas": 150}
PACK_G = {"caldo de legumes": 10, "fermento de padeiro": 11, "fermento em pó": 16, "gelatina": 2, "natas": 200, "bacon": 150,
          "massa": 500, "esparguete": 500, "mozzarella": 125, "queijo mozzarella": 125, "lasanha": 500}
SLICE_G = {"pão": 30, "bacon": 15, "fiambre": 15, "presunto": 15, "queijo flamengo": 20, "queijo mozzarella": 20, "limão": 8, "laranja": 15}
BUNCH_G = 25.0
LEAF_G = {"louro": 0.2, "gelatina": 2, "manjericão": 0.5, "hortelã": 0.3, "salsa": 0.5, "coentros": 0.5, "tomilho": 0.3, "alecrim": 0.5}


def canon_unit(u: Optional[str]) -> Optional[str]:
    if not u:
        return None
    n = norm(u.replace(".", " "))
    for pat, c in UNITS:
        if re.match(pat, n):
            return c
    return "other"


def amount(q: Optional[str]) -> Optional[float]:
    """'1 1/2' -> 1.5, '2,5' -> 2.5, '2-3' -> 2.5, '½' -> .5; words -> None."""
    if not q:
        return None
    s = q.strip().replace("½", "1/2").replace("¼", "1/4").replace("¾", "3/4").replace("⅓", "1/3")
    m = re.match(r"^\s*([\d.,/ ]+)\s*(?:-|a|–|to)\s*([\d.,/ ]+)\s*$", s)
    if m:
        a, b = parse_qty(m.group(1).strip()), parse_qty(m.group(2).strip())
        return float((a + b) / 2) if a is not None and b is not None else None
    v = parse_qty(s)
    return float(v) if v is not None else None


# ----------------------------------------------------------------------------- matching
GENERIC_NOTES = re.compile(r"\b(fresc[oa]s?|picad[oa]s?|ralad[oa]s?|moid[oa]s?|cortad[oa]s?|em cubos|em rodelas|q ?b|grande|grandes|medio|media|medias|medios|pequen[oa]s?|maduros?|maduras?|frio|fria|quente|derretid[oa]|amolecid[oa]|a gosto|opcional|bem|sem|com|para|de|do|da|dos|das|e)\b")


def match_key(name: str, overrides: Optional[dict] = None) -> tuple[Optional[str], str]:
    """Return (reference key, how) for an ingredient name."""
    ref = reference()
    n = norm(name)
    if overrides and n in overrides:
        return overrides[n], "user" if overrides[n] else "user-none"
    if n in ref["alias"]:
        return ref["alias"][n], "exact"
    s = sing_phrase(n)
    if s in ref["alias"]:
        return ref["alias"][s], "exact"
    padded, padded_s = f" {n} ", f" {s} "
    for a in ref["alias_sorted"]:  # longest alias that appears as whole words
        if len(a) >= 3 and (f" {a} " in padded or f" {a} " in padded_s):
            return ref["alias"][a], "contains"
    stripped = re.sub(r"\s+", " ", GENERIC_NOTES.sub(" ", n)).strip()
    if stripped and stripped != n:
        k, how = match_key(stripped)
        if k:
            return k, how
    return None, "none"


def grams_for(item: dict, qty: Optional[float], unit: Optional[str]) -> tuple[Optional[float], str]:
    """Convert a quantity + unit of a reference ingredient into grams. Returns (grams, confidence)."""
    u = canon_unit(unit)
    por = item.get("portions") or {}
    dens = item.get("density") or 1.0
    key = item["key"]
    if u == "qb":
        return (1.0 if key in ("sal", "pimenta preta") else 0.0), "low"
    if u == "pinch":
        return 0.5 * (qty or 1), "medium"
    if qty is None:
        if u is None:
            return (item.get("unit_g") or 0) if item.get("unit_g") and key not in ("sal", "pimenta preta") else 1.0, "low"
        qty = 1.0
    if u == "kg":
        return qty * 1000, "high"
    if u == "g":
        return qty, "high"
    if u == "mg":
        return qty / 1000, "high"
    if u in ("l", "dl", "cl", "ml"):
        ml = qty * {"l": 1000, "dl": 100, "cl": 10, "ml": 1}[u]
        return ml * dens, "high"
    if u == "cup":
        return qty * (por.get("cup", 236.6 * dens) * CUP_ML / 236.6), "medium"
    if u == "tbsp":
        return qty * (por.get("tbsp") or TBSP_ML * dens), "medium"
    if u == "dsp":
        return qty * 10 * dens, "medium"
    if u == "tsp":
        return qty * (por.get("tsp") or TSP_ML * dens), "medium"
    if u == "clove":
        return qty * (por.get("clove") or item.get("unit_g") or 4), "medium"
    if u == "slice":
        return qty * (SLICE_G.get(key) or por.get("slice") or 20), "medium"
    if u == "can":
        return qty * CAN_G.get(key, 400), "medium"
    if u == "pack":
        return (qty * PACK_G[key], "medium") if key in PACK_G else (None, "low")
    if u == "bunch":
        return qty * BUNCH_G, "low"
    if u == "leaf":
        return qty * LEAF_G.get(key, 0.5), "medium"
    # unit / no unit: count of pieces
    if item.get("unit_g"):
        return qty * item["unit_g"], "medium"
    return None, "low"


def line_cost(item: dict, grams: float, qty: Optional[float], unit: Optional[str], group_price: Optional[float]):
    """(low, typical, high) in euros for this line, or None without price data."""
    price = item.get("price")
    if group_price is not None:  # what this group actually paid recently, per kg
        t = grams / 1000 * group_price
        return (t * 0.9, t, t * 1.1)
    if not price:
        return None
    if price["basis"] == "un":
        u = canon_unit(unit)
        count = qty if (u in (None, "unit") and qty) else (grams / item["unit_g"] if item.get("unit_g") else None)
        if count is None:
            return None
        return tuple(count * price[k] for k in ("low", "typical", "high"))
    return tuple(grams / 1000 * price[k] for k in ("low", "typical", "high"))


def compute(ingredients: Iterable[dict], servings: Optional[int], overrides: Optional[dict] = None,
            group_prices: Optional[dict] = None) -> dict:
    """ingredients: dicts with quantity/unit/name. Returns totals, per-serving values and per-line detail."""
    ref = reference()
    lines, totals = [], {"kcal": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0}
    cost = [0.0, 0.0, 0.0]
    matched = costed = considered = 0
    for idx, ing in enumerate(ingredients):
        name = ing.get("name") or ""
        key, how = match_key(name, overrides)
        qty = amount(ing.get("quantity"))
        line = {"index": idx, "name": name, "key": key, "match": how, "grams": None, "kcal": None, "cost": None, "confidence": "none"}
        item = ref["by_key"].get(key) if key else None
        if how == "user-none" or (item and item.get("free")):
            line.update(grams=0, kcal=0, cost=0, confidence="high", free=True)
            lines.append(line)
            continue
        considered += 1
        if not item:
            lines.append(line)
            continue
        matched += 1
        grams, conf = grams_for(item, qty, ing.get("unit"))
        if grams is None:
            line["confidence"] = "low"
            lines.append(line)
            continue
        n = item.get("nutrition") or {}
        f = grams / 100
        line["grams"] = round(grams, 1)
        line["kcal"] = round(n.get("kcal", 0) * f)
        for k in totals:
            totals[k] += n.get(k, 0) * f
        c = line_cost(item, grams, qty, ing.get("unit"), (group_prices or {}).get(key))
        if c:
            costed += 1
            cost = [a + b for a, b in zip(cost, c)]
            line["cost"] = round(c[1], 2)
        line["confidence"] = "low" if how in ("contains",) and conf == "low" else conf
        if how == "contains" and conf == "high":
            line["confidence"] = "medium"
        lines.append(line)

    per = max(1, servings or 1)
    coverage = matched / considered if considered else 1.0
    return {
        "servings": servings,
        "coverage": round(coverage, 2),
        "price_coverage": round(costed / considered, 2) if considered else 1.0,
        "total": {"kcal": round(totals["kcal"]), "cost": [round(x, 2) for x in cost]},
        "per_serving": {
            "kcal": round(totals["kcal"] / per),
            "protein_g": round(totals["protein_g"] / per, 1),
            "carbs_g": round(totals["carbs_g"] / per, 1),
            "fat_g": round(totals["fat_g"] / per, 1),
            "fiber_g": round(totals["fiber_g"] / per, 1),
            "cost": [round(x / per, 2) for x in cost],
        },
        "lines": lines,
        "sources": ref["sources"],
    }


def search(q: str, limit: int = 12) -> list[dict]:
    """Reference ingredients for the correction picker."""
    ref = reference()
    nq = norm(q)
    scored = []
    for it in ref["items"]:
        names = [norm(it["key"]), *(norm(a) for a in it.get("aliases", []))]
        score = max((3 if n == nq else 2 if n.startswith(nq) else 1 if nq in n else 0) for n in names) if nq else 1
        if score:
            scored.append((-score, it["key"]))
    scored.sort()
    out = []
    for _, k in scored[:limit]:
        it = ref["by_key"][k]
        out.append({"key": k, "aisle": it.get("aisle"), "kcal": (it.get("nutrition") or {}).get("kcal"),
                    "price": (it.get("price") or {}).get("typical"), "basis": (it.get("price") or {}).get("basis")})
    return out


def median_recent(values: list[float]) -> Optional[float]:
    return statistics.median(values) if values else None
