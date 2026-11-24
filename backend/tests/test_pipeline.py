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


def test_web_app_and_shortcut(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    import app.main as main

    main.store = Store(str(tmp_path / "w.db"))
    seen = []
    monkeypatch.setattr(main, "run_job", lambda store, job, text=None: seen.append((job.url, text)))
    c = TestClient(main.app)
    assert "RecipeBox" in c.get("/").text
    assert c.get("/sw.js").headers["content-type"].startswith("text/javascript")
    assert c.get("/static/manifest.webmanifest").status_code == 200
    r = c.post("/imports/shortcut", json={"input": "Look at this! https://vm.tiktok.com/ZMabc/"})
    assert r.status_code == 200 and "Saving" in r.text
    assert seen == [("https://vm.tiktok.com/ZMabc/", None)]
