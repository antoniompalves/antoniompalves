"""Quantity maths shared by scaling, dinner polls and shopping lists."""
from __future__ import annotations

import re
from fractions import Fraction
from typing import Optional

_NUM = re.compile(r"^\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?)\s*$")


def parse_qty(q: Optional[str]) -> Optional[Fraction]:
    """'1 1/2' -> 3/2, '3/4', '200', '2,5' (PT decimal comma). Ranges/words -> None."""
    if not q or not _NUM.match(q):
        return None
    s = q.strip().replace(",", ".")
    if " " in s:
        whole, frac = s.split()
        return int(whole) + Fraction(frac)
    return Fraction(s)


def fmt_qty(val: Fraction) -> str:
    if val.denominator == 1:
        return str(val.numerator)
    if val.denominator in (2, 3, 4, 8):
        w, rem = divmod(val.numerator, val.denominator)
        return f"{w} {rem}/{val.denominator}" if w else f"{rem}/{val.denominator}"
    return f"{float(val):.2f}".rstrip("0").rstrip(".").replace(".", ",")


METRIC_UNITS = {"g", "gr", "grama", "gramas", "kg", "ml", "l", "lt", "litro", "litros", "cl", "dl"}


def scale_quantity(q: Optional[str], factor: Fraction, unit: Optional[str] = None) -> Optional[str]:
    """Scale '1 1/2', '3/4', '200', '2.5'. Leaves ranges/words ('a pinch') untouched.
    Grams/ml round to readable values (333,3 g -> 335 g); counts keep kitchen fractions (1 1/2)."""
    val = parse_qty(q)
    if val is None:
        return q
    out = val * factor
    if (unit or "").strip().lower().rstrip(".") in METRIC_UNITS and out.denominator != 1:
        v = float(out)
        v = round(v / 5) * 5 if v >= 100 else round(v) if v >= 10 else round(v, 1)
        return (f"{v:.1f}".rstrip("0").rstrip(".")).replace(".", ",")
    if out.denominator not in (1, 2, 3, 4, 8) and out > 0:
        # 7/3 eggs -> "2 1/3"; awkward fractions snap to the nearest quarter
        quarters = round(float(out) * 4) / 4 or 0.25
        out = Fraction(quarters).limit_denominator(4)
    return fmt_qty(out)


def add_quantities(a: Optional[str], b: Optional[str]) -> Optional[str]:
    """Sum when both are numbers; otherwise keep both readable ('2 + q.b.')."""
    if not a:
        return b
    if not b:
        return a
    va, vb = parse_qty(a), parse_qty(b)
    if va is not None and vb is not None:
        return fmt_qty(va + vb)
    return f"{a} + {b}"


BIMBY_RE = re.compile(r"\b(bimby|thermomix|tm\s?[3-7]\b|varoma|colher inversa|vel(?:\.|ocidade)\s*(?:\d|colher)|velocidade colher|modo (?:amassar|turbo|espiga))", re.I)


def is_bimby(title: str, steps: list[str], tags: list[str]) -> bool:
    """Recipes written for a Bimby/Thermomix: speed settings, Varoma, reverse blade, or the brand itself."""
    if any(t.lower() in ("bimby", "thermomix") for t in tags):
        return True
    hits = sum(1 for s in steps if BIMBY_RE.search(s))
    return bool(BIMBY_RE.search(title)) or hits >= 2 or (hits == 1 and len(steps) <= 3)


def item_key(name: str, unit: Optional[str]) -> tuple[str, str]:
    return (name.strip().lower(), (unit or "").strip().lower())


# Portuguese titles use sentence case ("Arroz de pato à moda de Braga"), not Title Case.
KEEP_CAPS = {"Brás", "Gomes", "Sá", "Bulhão", "Pato", "Porto", "Lisboa", "Braga", "Alentejo", "Minho", "Algarve", "Madeira",
             "Açores", "Coimbra", "Aveiro", "Bimby", "Thermomix", "Nutella", "Oreo", "Kinder", "Bairrada", "Setúbal", "Viseu", "Tomar"}


def sentence_case(title: str) -> str:
    """'Taça de Tofu Teriyaki' -> 'Taça de tofu teriyaki'. Only rewrites titles that look Title Cased; keeps
    acronyms (BBQ), mixed-case brands (TikTok), place and people names in KEEP_CAPS, and text in brackets."""
    if not title:
        return title
    words = title.split(" ")
    caps = [w for w in words[1:] if len(w) > 2 and w[:1].isupper() and w[1:].islower()]
    if len(caps) < 1 or len([w for w in words[1:] if len(w) > 2]) == 0:
        return title
    out, bracket = [words[0]], False
    for w in words[1:]:
        if w.startswith("("):
            bracket = True
        core = w.strip("()[],.:;!?\"'«»")
        keep = (bracket or not core or core.isupper() or not core[1:].islower() or core in KEEP_CAPS
                or (out and out[-1].endswith((":", ".", "!", "?"))))
        out.append(w if keep else w[:1].lower() + w[1:])
        if w.endswith(")"):
            bracket = False
    return " ".join(out)
