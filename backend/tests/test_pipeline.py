from fractions import Fraction

from app import sources
from app.extractor import build_content
from app.main import scale_quantity
from app.models import Ingredient, RecipeDraft, Step
from app.pipeline import import_recipe
from app.store import Store

BLOG_HTML = """<html><head>
<meta property="og:title" content="Best Banana Bread">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","name":"x"},
 {"@type":"Recipe","name":"Best Banana Bread","recipeIngredient":["3 bananas","2 cups flour"],
  "recipeInstructions":[{"@type":"HowToStep","text":"Mash bananas."}]}]}</script>
</head><body><p>Ingredients</p></body></html>"""


def test_platform_detection():
    assert sources.detect_platform("https://www.tiktok.com/@a/video/1") == "tiktok"
    assert sources.detect_platform("https://www.instagram.com/reel/abc/") == "instagram"
    assert sources.detect_platform("https://youtu.be/xyz") == "youtube"
    assert sources.detect_platform("https://pin.it/abc") == "pinterest"
    assert sources.detect_platform("https://smittenkitchen.com/x") == "web"


def test_json_ld_in_graph():
    r = sources.find_json_ld_recipe(BLOG_HTML)
    assert r and r["name"] == "Best Banana Bread"


def test_caption_url_extraction():
    cap = "So good!! Full recipe: https://blog.example.com/pasta. #pasta"
    assert sources.extract_urls(cap) == ["https://blog.example.com/pasta"]


def test_vtt_cleanup_dedupes():
    vtt = "WEBVTT\n\n00:00.000 --> 00:01.000\nadd <c>two</c> cups\n\n00:01.000 --> 00:02.000\nadd two cups\n\n00:02.000 --> 00:03.000\nof flour"
    assert sources._clean_subs(vtt, "vtt") == "add two cups of flour"


def test_scale_quantity():
    assert scale_quantity("1 1/2", Fraction(2)) == "3"
    assert scale_quantity("3/4", Fraction(1, 2)) == "3/8"
    assert scale_quantity("200", Fraction(3, 2)) == "300"
    assert scale_quantity("a pinch", Fraction(2)) == "a pinch"


def _fake_extract(mat):
    return RecipeDraft(
        is_recipe=True, title="Garlic Noodles", servings=2, confidence=0.8,
        ingredients=[Ingredient(quantity="4", unit="cloves", name="garlic", note="minced")],
        steps=[Step(text="Fry garlic in butter.")],
    )


def test_import_dedupes_by_url(tmp_path):
    store = Store(str(tmp_path / "t.db"))
    mat = sources.SourceMaterial(url="https://tiktok.com/v/1", platform="tiktok", caption="garlic noodles!", author="chef")
    calls = []
    gather = lambda u: calls.append(u) or mat
    r1 = import_recipe(store, url="https://tiktok.com/v/1", gather=gather, extract=_fake_extract)
    r2 = import_recipe(store, url="https://tiktok.com/v/1", gather=gather, extract=_fake_extract)
    assert r1.id == r2.id and len(calls) == 1
    assert r1.author == "chef" and store.list_recipes(q="garlic")[0].id == r1.id


def test_content_includes_frames_and_sources():
    mat = sources.SourceMaterial(url="u", platform="tiktok", caption="cap", transcript="talk", frames_jpeg_b64=["AAAA"])
    content = build_content(mat)
    assert content[1]["type"] == "image"
    assert "<spoken_transcript>" in content[-2]["text"]


def test_flat_schemas_convert_and_stay_simple():
    """The API rejects complex schemas: outputs must have no optional/anyOf fields, and convert back cleanly."""
    import json
    from types import SimpleNamespace
    from app import bimby, extractor
    from app.models import Recipe
    from app.schemas import XBimby, XBimbyStep, XDraft, XIngredient, XStep
    from app.sources import SourceMaterial
    for m in (XDraft, XBimby):
        assert "anyOf" not in json.dumps(m.model_json_schema())

    flat = XDraft(is_recipe=True, title="Bacalhau à Brás", description="", servings=4, prep_minutes=0, cook_minutes=15, total_minutes=0,
                  cuisine="Portuguesa", meal_type="dinner", tags=["bacalhau"],
                  ingredients=[XIngredient(quantity="400", unit="g", name="bacalhau", note="desfiado", group="")],
                  steps=[XStep(text="Refoga a cebola.", video_second=-1), XStep(text="Junta os ovos.", video_second=42)],
                  kcal_per_serving=520, confidence=.9, inferred_fields=[])
    seen = {}

    class FakeBeta:
        class messages:
            @staticmethod
            def parse(**kw):
                seen["fmt"] = kw["output_format"]
                return SimpleNamespace(stop_reason="end_turn", parsed_output=flat if kw["output_format"] is XDraft else xb)
    client = SimpleNamespace(beta=FakeBeta)
    d = extractor.extract_recipe(SourceMaterial(url="https://x", platform="web", caption="..."), client=client)
    assert seen["fmt"] is XDraft and d.description is None and d.prep_minutes is None and d.cook_minutes == 15
    assert d.ingredients[0].group is None and d.steps[0].timestamp_seconds is None and d.steps[1].timestamp_seconds == 42
    assert d.nutrition_estimate.calories == 520

    xb = XBimby(title="Bacalhau à Brás", servings=4, total_minutes=25,
                ingredients=[XIngredient(quantity="400", unit="g", name="bacalhau", note="", group="")],
                steps=[XBimbyStep(text="Pica 5 seg/vel. 5.", uses_machine=True, time_seconds=5, temperature="", speed="5", reverse=False, mode="", accessory=""),
                       XBimbyStep(text="Serve.", uses_machine=False, time_seconds=0, temperature="", speed="", reverse=False, mode="", accessory="")],
                notes=["ok"])
    rec = Recipe(**d.model_dump(), id="r", source_url="", source_platform="web", created_at="2026-01-01")
    out = bimby.convert(rec, "TM6", client=client)
    assert seen["fmt"] is XBimby and out.steps[0].bimby.speed == "5" and out.steps[0].bimby.temperature is None
    assert out.steps[1].bimby is None and out.ingredients[0].note is None
