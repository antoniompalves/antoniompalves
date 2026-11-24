"""Cost & nutrition from ingredient lines (uses the committed reference table)."""
import pytest

from app import costing


def line(q, u, n):
    return {"quantity": q, "unit": u, "name": n}


@pytest.mark.parametrize("name,key", [
    ("dentes de alho", "alho"), ("Cebola picada", "cebola"), ("cebolas", "cebola"), ("azeite virgem extra", "azeite"),
    ("esparguete", "esparguete"), ("queijo pecorino", "queijo pecorino"), ("pecorino ralado fino", "queijo pecorino"),
    ("gemas de ovo", "gemas de ovo"), ("ovos", "ovos"), ("Peito de frango", "peito de frango"), ("heavy cream", "natas"), ("gochujang", None),
    ("sal", "sal"), ("pimenta preta moída na hora", "pimenta preta"), ("tomate cereja", "tomate-cereja"),
])
def test_matching(name, key):
    assert costing.match_key(name)[0] == key


@pytest.mark.parametrize("q,u,n,grams", [
    ("200", "g", "esparguete", 200), ("1", "kg", "batata", 1000), ("2", None, "dentes de alho", None),
    ("2", "dentes", "alho", 6), ("1", "c. sopa", "azeite", 13.5), ("1 1/2", "chávenas", "farinha", 125 * 1.5 * 240 / 236.6),
    ("500", "ml", "leite", 500 * 1.031), ("4", None, "ovos", None), ("1", "pitada", "sal", 0.5),
])
def test_grams(q, u, n, grams):
    key, _ = costing.match_key(n)
    item = costing.reference()["by_key"][key]
    g, _ = costing.grams_for(item, costing.amount(q), u)
    if grams is None:
        assert g and g > 0
    else:
        assert g == pytest.approx(grams, rel=0.02)


def test_amount_parsing():
    assert costing.amount("1 1/2") == 1.5 and costing.amount("2,5") == 2.5 and costing.amount("2-3") == 2.5
    assert costing.amount("½") == 0.5 and costing.amount("q.b.") is None


def test_carbonara_totals_are_plausible():
    ings = [line("200", "g", "esparguete"), line("100", "g", "guanciale"), line("3", None, "gemas de ovo"),
            line("50", "g", "queijo pecorino"), line(None, None, "pimenta preta"), line(None, "q.b.", "sal"), line("1", "l", "água")]
    f = costing.compute(ings, 2)
    # 200 g pasta ≈ 740 kcal, 100 g bacon ≈ 420, 3 yolks ≈ 165, 50 g pecorino ≈ 190  -> ~1500 total, ~750/serving
    assert 600 <= f["per_serving"]["kcal"] <= 900
    assert f["coverage"] == 1.0
    low, typ, high = f["per_serving"]["cost"]
    assert 0.5 < low <= typ <= high < 6
    water = next(l for l in f["lines"] if l["name"] == "água")
    assert water.get("free") and water["cost"] == 0


def test_unknown_and_overrides():
    ings = [line("2", "c. sopa", "gochujang"), line("100", "g", "esparguete")]
    f = costing.compute(ings, 1)
    assert f["coverage"] == 0.5 and f["lines"][0]["key"] is None
    f2 = costing.compute(ings, 1, overrides={"gochujang": "ketchup"})
    assert f2["coverage"] == 1.0 and f2["lines"][0]["match"] == "user" and f2["per_serving"]["kcal"] > f["per_serving"]["kcal"]
    f3 = costing.compute(ings, 1, overrides={"gochujang": None})  # "não contar"
    assert f3["coverage"] == 1.0 and f3["lines"][0].get("free")


def test_group_paid_price_wins():
    ings = [line("1", "kg", "arroz")]
    ref = costing.compute(ings, 1)["total"]["cost"][1]
    paid = costing.compute(ings, 1, group_prices={"arroz": 3.0})["total"]["cost"][1]
    assert paid == pytest.approx(3.0) and paid != ref


def test_per_unit_priced_items():
    f = costing.compute([line("6", None, "ovos")], 1)
    assert 0.6 < f["total"]["cost"][1] < 4  # six eggs: cents to a few euros, never per-kg nonsense
