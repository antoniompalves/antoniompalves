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


def scale_quantity(q: Optional[str], factor: Fraction) -> Optional[str]:
    """Scale '1 1/2', '3/4', '200', '2.5'. Leaves ranges/words ('a pinch') untouched."""
    val = parse_qty(q)
    return q if val is None else fmt_qty(val * factor)


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


def item_key(name: str, unit: Optional[str]) -> tuple[str, str]:
    return (name.strip().lower(), (unit or "").strip().lower())
