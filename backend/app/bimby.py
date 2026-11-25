"""AI converter: any recipe -> exact Bimby (Thermomix) steps, in pt-PT.

Every step carries the machine settings the way the display shows them (time / temperature /
speed, colher inversa, Varoma, modes and accessories), plus the usual written form
"5 min/100 °C/vel. 1". Ingredients come back in metric weights, in the order they go into the bowl.
"""
from __future__ import annotations

import json
import os
from typing import Literal, Optional

import anthropic
from pydantic import BaseModel, Field

from .extractor import MODEL, ExtractionError
from .models import Ingredient, Recipe, Step
from .schemas import XBimby

Model = Literal["TM5", "TM6", "TM7"]

LIMITS = {
    "TM5": "TM5: bowl 2.2 L; max 120 °C and Varoma; modes: amassar, turbo. No alta temperatura, no sous-vide, no fermentar.",
    "TM6": "TM6: bowl 2.2 L; up to 160 °C with Alta temperatura mode (browning); modes: amassar, turbo, cozedura lenta, sous-vide, fermentar, espiga (dough), alta temperatura, aquecer.",
    "TM7": "TM7: bowl 2.2 L; same temperatures and modes as TM6 (up to 160 °C, alta temperatura, cozedura lenta, sous-vide, fermentar).",
}

SYSTEM = """You are a Bimby (Thermomix) recipe developer for Vorwerk Portugal. Convert the given \
recipe into a Bimby recipe that a home cook can follow exactly on a {model}.

Machine facts:
- {limits}
- Speeds: vel. colher (stirring, ~40 rpm), 0.5-10, Turbo. Chop: 3-5 s/vel. 5. Mince garlic/onion: 5 s/vel. 5. \
Grate cheese/bread: 10-15 s/vel. 10. Purée soups: 1 min/vel. 5-10 progressively. Emulsify: vel. 3-4. \
Whip with the borboleta (max vel. 4). Knead: modo amassar (Espiga on TM6/TM7).
- Colher inversa (reverse rotation) whenever pieces must stay whole: risotto, stews, meat, cooked vegetables, \
pasta in sauce. Use vel. colher or vel. 1 with colher inversa for those.
- Sauté: 3-5 min/120 °C/vel. 1 (TM6/TM7 can use alta temperatura for browning). Simmer: 100 °C. \
Steam: Varoma temperature with the Varoma (and tabuleiro) on top, water or broth in the bowl (500 g for ~30 min). \
Max bowl fill 2.2 L; with heat keep under ~1.8 L. Pasta/rice cook in the bowl with the cesto when draining is needed.
- Times are realistic for the machine (it heats more slowly than a large pan; reduce liquid evaporation).

Rules:
- Keep the dish faithful; adjust only what the machine needs (liquid, order, cut sizes, batch size). \
If it exceeds the bowl, split into batches and say so in a step.
- Ingredients: metric weights (g, ml as g for water/milk/broth), in the order they go in.
- Each step: imperative, informal "tu" in European Portuguese (e.g. "Coloca", "Programa", "Retira"), \
ending with the exact program written the Bimby way, e.g. "Programa 5 min/100 °C/colher inversa/vel. colher." \
For every step set uses_machine; when it uses the machine fill time_seconds, temperature, speed, reverse, \
mode and accessory (empty text or 0 when not used). Steps without the machine (plating, oven, resting) have \
uses_machine false.
- notes: short practical tips (what changed from the original, tricks, what to watch).
- Write everything in European Portuguese (pt-PT). Never use "você"."""


class BimbyConversion(BaseModel):
    title: str = Field(description="Recipe title in pt-PT, without the word Bimby")
    servings: Optional[int] = None
    total_minutes: Optional[int] = None
    ingredients: list[Ingredient]
    steps: list[Step]
    notes: list[str] = Field(default_factory=list, description="Short tips about the conversion")


def convert(recipe: Recipe, model: Model = "TM6", client: Optional[anthropic.Anthropic] = None) -> BimbyConversion:
    client = client or anthropic.Anthropic()
    src = recipe.model_dump(include={"title", "description", "servings", "prep_minutes", "cook_minutes", "total_minutes", "ingredients", "steps"})
    for s in src["steps"]:
        s.pop("bimby", None); s.pop("timestamp_seconds", None)
    response = client.beta.messages.parse(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM.format(model=model, limits=LIMITS[model]),
        thinking={"type": "adaptive"},
        output_config={"effort": os.getenv("BIMBY_EFFORT", "medium")},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": f"Converte esta receita para a Bimby {model}:\n\n<recipe>\n{json.dumps(src, ensure_ascii=False)}\n</recipe>"}],
        output_format=XBimby,
    )
    if response.stop_reason == "refusal":
        raise ExtractionError("O modelo recusou converter esta receita.")
    if response.stop_reason == "max_tokens":
        raise ExtractionError("A conversão ficou incompleta. Tenta novamente.")
    flat = response.parsed_output
    out = BimbyConversion(title=flat.title, servings=flat.servings or None, total_minutes=flat.total_minutes or None,
                          ingredients=flat.to_ingredients(), steps=flat.to_steps(), notes=flat.notes) if flat is not None else None
    if out is None or not out.steps:
        raise ExtractionError("Não foi possível converter esta receita.")
    return out
