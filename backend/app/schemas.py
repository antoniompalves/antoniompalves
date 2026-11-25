"""Flat output schemas for Claude's structured outputs.

The API rejects schemas that are "too complex" (many optional/nullable fields, nested optional objects).
These mirror RecipeDraft / BimbyConversion with plain strings and numbers ("" / 0 mean "not given"),
and convert to the app's models afterwards.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from .models import BimbySetting, Ingredient, Nutrition, RecipeDraft, Step


class XIngredient(BaseModel):
    quantity: str = Field(description="Amount as written, e.g. '1 1/2' or '200'; empty if none")
    unit: str = Field(description="Unit, e.g. 'g', 'ml', 'cup'; empty if none")
    name: str
    note: str = Field(description="Prep note, e.g. 'picada'; empty if none")
    group: str = Field(description="Section such as 'Molho'; empty if none")


class XStep(BaseModel):
    text: str
    video_second: int = Field(description="Where in the video this step happens, or -1 if unknown")


class XDraft(BaseModel):
    is_recipe: bool
    title: str
    description: str
    servings: int = Field(description="0 if unknown")
    prep_minutes: int = Field(description="0 if unknown")
    cook_minutes: int = Field(description="0 if unknown")
    total_minutes: int = Field(description="0 if unknown")
    cuisine: str
    meal_type: str = Field(description="breakfast, lunch, dinner, snack, dessert, drink, starter, or empty")
    tags: list[str]
    ingredients: list[XIngredient]
    steps: list[XStep]
    kcal_per_serving: int = Field(description="Rough estimate per serving, 0 if you can't estimate")
    confidence: float = Field(description="0-1: how complete the recipe is from the source")
    inferred_fields: list[str]

    def to_draft(self) -> RecipeDraft:
        z = lambda v: v or None  # noqa: E731
        return RecipeDraft(
            is_recipe=self.is_recipe, title=self.title, description=z(self.description.strip()),
            servings=z(self.servings), prep_minutes=z(self.prep_minutes), cook_minutes=z(self.cook_minutes),
            total_minutes=z(self.total_minutes), cuisine=z(self.cuisine.strip()), meal_type=z(self.meal_type.strip()),
            tags=self.tags,
            ingredients=[Ingredient(quantity=z(i.quantity.strip()), unit=z(i.unit.strip()), name=i.name, note=z(i.note.strip()),
                                    group=z(i.group.strip())) for i in self.ingredients],
            steps=[Step(text=s.text, timestamp_seconds=s.video_second if s.video_second >= 0 else None) for s in self.steps],
            nutrition_estimate=Nutrition(calories=self.kcal_per_serving) if self.kcal_per_serving > 0 else None,
            confidence=self.confidence, inferred_fields=self.inferred_fields,
        )


class XBimbyStep(BaseModel):
    text: str
    uses_machine: bool
    time_seconds: int = Field(description="Programmed time in seconds, 0 if none")
    temperature: str = Field(description="'37'..'160' (°C), 'Varoma', or empty for no heat")
    speed: str = Field(description="'colher', '0.5'..'10', 'turbo', a range like '5-10', or empty")
    reverse: bool = Field(description="True for colher inversa")
    mode: str = Field(description="Built-in mode (amassar, alta temperatura, cozedura lenta…) or empty")
    accessory: str = Field(description="borboleta, cesto, Varoma… or empty")


class XBimby(BaseModel):
    title: str
    servings: int
    total_minutes: int
    ingredients: list[XIngredient]
    steps: list[XBimbyStep]
    notes: list[str]

    def to_steps(self) -> list[Step]:
        z = lambda v: v or None  # noqa: E731
        out = []
        for s in self.steps:
            b = BimbySetting(time_seconds=z(s.time_seconds), temperature=z(s.temperature.strip()), speed=z(s.speed.strip()),
                             reverse=s.reverse, mode=z(s.mode.strip()), accessory=z(s.accessory.strip()))
            out.append(Step(text=s.text, bimby=b if s.uses_machine and (b.time_seconds or b.speed or b.temperature or b.mode) else None))
        return out

    def to_ingredients(self) -> list[Ingredient]:
        z = lambda v: v or None  # noqa: E731
        return [Ingredient(quantity=z(i.quantity.strip()), unit=z(i.unit.strip()), name=i.name, note=z(i.note.strip()),
                           group=z(i.group.strip())) for i in self.ingredients]
