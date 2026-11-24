"""LLM fallback for ingredient names the rule-based matcher can't place (e.g. 'guanciale',
'heavy cream', 'gochujang'). Runs once per new name at import time; results are cached in
the ingredient_map table, so each name costs at most one small request."""
from __future__ import annotations

import logging
import os
from typing import Optional

import anthropic
from pydantic import BaseModel, Field

from . import costing
from .pipeline import now

log = logging.getLogger(__name__)
MODEL = os.getenv("RECIPE_MODEL", "claude-opus-5-5")


class Mapping(BaseModel):
    name: str
    key: Optional[str] = Field(None, description="Exact key from the reference list, or null if nothing is a reasonable match")


class Mappings(BaseModel):
    items: list[Mapping]


def unmatched_names(store, names: list[str]) -> list[str]:
    known = {x["name_norm"] for x in store.q("SELECT name_norm FROM ingredient_map")}
    out = []
    for n in names:
        nn = costing.norm(n)
        if nn and nn not in known and costing.match_key(n)[0] is None and nn not in {costing.norm(x) for x in out}:
            out.append(n)
    return out


def map_with_llm(store, names: list[str], client: Optional[anthropic.Anthropic] = None) -> int:
    todo = unmatched_names(store, names)
    if not todo:
        return 0
    keys = sorted(costing.reference()["by_key"])
    try:
        client = client or anthropic.Anthropic()
        resp = client.messages.parse(
            model=MODEL, max_tokens=4000,
            output_config={"effort": "low"},
            system=("Map each recipe ingredient name to the closest item from a Portuguese reference list, for estimating "
                    "nutrition and supermarket cost. Pick the item a Portuguese shopper would actually buy as a substitute "
                    "(e.g. 'heavy cream' -> 'natas', 'guanciale' -> 'guanciale', 'scallions' -> 'cebolinho'). Use null only "
                    "when nothing is reasonably close or the line isn't food to buy (e.g. 'água da cozedura'). "
                    "Answer with the exact key strings."),
            messages=[{"role": "user", "content": "Reference keys:\n" + "\n".join(keys) + "\n\nIngredient names:\n" + "\n".join(todo)}],
            output_format=Mappings,
        )
        result = resp.parsed_output
    except Exception as e:  # no API key, network, refusal: costing simply shows these lines as unknown
        log.info("ingredient mapping skipped: %s", e)
        return 0
    if not result:
        return 0
    valid = set(keys)
    n = 0
    for m in result.items:
        if m.name in todo:
            store.x("INSERT OR IGNORE INTO ingredient_map(name_norm, ref_key, updated_by, updated_at) VALUES (?,?,?,?)",
                    (costing.norm(m.name), m.key if m.key in valid else None, "ai", now()))
            n += 1
    return n
