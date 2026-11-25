"""Recipe schema shared by the extractor, the database and the API."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class Ingredient(BaseModel):
    quantity: Optional[str] = Field(None, description="Amount as written, e.g. '1 1/2' or '200'")
    unit: Optional[str] = Field(None, description="Unit, e.g. 'cup', 'g', 'tbsp'")
    name: str = Field(description="Ingredient name, e.g. 'brown sugar'")
    note: Optional[str] = Field(None, description="Prep note, e.g. 'finely chopped'")
    group: Optional[str] = Field(None, description="Section such as 'Sauce' or 'Marinade'")


class BimbySetting(BaseModel):
    """Machine settings for one Bimby/Thermomix step, as shown on the display."""
    time_seconds: Optional[int] = Field(None, description="Programmed time in seconds, e.g. 300")
    temperature: Optional[str] = Field(None, description="'37'..'160' in °C, 'Varoma', or null for no heat")
    speed: Optional[str] = Field(None, description="'colher' (stirring speed), '0.5'..'10', 'turbo', or a range like '5-10' (progressive)")
    reverse: bool = Field(False, description="True for colher inversa (reverse blade rotation)")
    mode: Optional[str] = Field(None, description="Built-in mode if used: amassar, turbo, espiga, cozedura lenta, sous-vide, fermentar, alta temperatura, aquecer, pesar")
    accessory: Optional[str] = Field(None, description="borboleta, cesto, Varoma, tabuleiro Varoma, copo fechado sem copo medida, espátula")


class Step(BaseModel):
    text: str
    bimby: Optional[BimbySetting] = None
    timestamp_seconds: Optional[int] = Field(
        None, description="Where in the video this step happens, if known"
    )


class Nutrition(BaseModel):
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class RecipeDraft(BaseModel):
    """What the LLM returns. Kept free of server-only fields."""

    is_recipe: bool = Field(description="False if the content does not contain a recipe")
    title: str
    description: Optional[str] = None
    servings: Optional[int] = None
    prep_minutes: Optional[int] = None
    cook_minutes: Optional[int] = None
    total_minutes: Optional[int] = None
    cuisine: Optional[str] = None
    meal_type: Optional[str] = Field(None, description="breakfast, lunch, dinner, snack, dessert, drink")
    tags: list[str] = Field(default_factory=list)
    ingredients: list[Ingredient] = Field(default_factory=list)
    steps: list[Step] = Field(default_factory=list)
    nutrition_estimate: Optional[Nutrition] = None
    confidence: float = Field(
        description="0-1: how complete the recipe is from the source (1 = fully stated, low = inferred)"
    )
    @field_validator("title")
    @classmethod
    def _sentence_case(cls, v: str) -> str:
        from .util import sentence_case
        return sentence_case(v)

    inferred_fields: list[str] = Field(
        default_factory=list,
        description="Fields guessed rather than stated in the source, e.g. ['quantities', 'servings']",
    )


class Recipe(RecipeDraft):
    id: str
    source_url: str
    source_platform: str
    author: Optional[str] = None
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None
    created_at: str
    collections: list[str] = Field(default_factory=list)
    favorite: bool = False
    converted_from: Optional[str] = None  # id of the recipe this Bimby version was made from


class ImportRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = Field(None, description="Pasted caption / recipe text instead of a URL")
    group_id: Optional[str] = Field(None, description="Share the imported recipe with this group")


class ImportJob(BaseModel):
    id: str
    status: str  # queued | fetching | transcribing | extracting | done | failed
    url: Optional[str] = None
    recipe_id: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    owner_id: Optional[str] = None
    group_id: Optional[str] = None
    updated_at: Optional[str] = None  # heartbeat: last time the worker touched this job


class RecipePatch(BaseModel):
    title: Optional[str] = None
    collections: Optional[list[str]] = None
    favorite: Optional[bool] = None
    ingredients: Optional[list[Ingredient]] = None
    steps: Optional[list[Step]] = None
    servings: Optional[int] = None
    tags: Optional[list[str]] = None
