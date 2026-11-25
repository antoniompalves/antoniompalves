"""Weekly plan, pantry, aisles, scaling and metric conversion."""
from datetime import date, timedelta

from tests.test_social import env, import_recipe, setup_group  # noqa: F401  (fixture)


def monday():
    d = date.today()
    return d - timedelta(days=d.weekday())


def test_scaling_by_servings_and_factor(env):
    ana = env.signup("Ana")
    rid = import_recipe(env, ana, "Massa")  # fake recipe: 200 g massa + 2 ovos, serves 2
    r = env.client.get(f"/recipes/{rid}/scaled?servings=3", headers=ana).json()
    assert r["servings"] == 3 and r["ingredients"][0]["quantity"] == "300" and r["ingredients"][1]["quantity"] == "3"
    r = env.client.get(f"/recipes/{rid}/scaled?factor=0.5", headers=ana).json()
    assert r["ingredients"][0]["quantity"] == "100" and r["ingredients"][1]["quantity"] == "1" and r["scale"] == 0.5
    r = env.client.get(f"/recipes/{rid}/scaled?servings=5", headers=ana).json()
    assert r["ingredients"][0]["quantity"] == "500" and r["ingredients"][1]["quantity"] == "5"
    assert env.client.get(f"/recipes/{rid}/scaled", headers=ana).status_code == 400
    assert "metric" in r and len(r["metric"]) == 2


def test_pantry_skips_items_and_item_to_pantry(env):
    ana = env.signup("Ana")
    rid = import_recipe(env, ana, "Massa")
    env.client.post("/pantry", json={"name": "Ovos"}, headers=ana)
    p = env.client.get("/pantry", headers=ana).json()
    assert [x["key"] for x in p["items"]] == ["ovos"] and "ovos" not in p["suggestions"]
    lst = env.client.post("/lists", json={"title": "Casa"}, headers=ana).json()
    out = env.client.post(f"/lists/{lst['id']}/items", json={"recipe_id": rid}, headers=ana).json()
    assert out["skipped_pantry"] == ["ovos"] and [i["name"] for i in out["items"]] == ["massa"]
    item = out["items"][0]
    assert item["aisle"] == "Mercearia"
    env.client.post(f"/items/{item['id']}/pantry", headers=ana)
    assert env.client.get(f"/lists/{lst['id']}", headers=ana).json()["items"] == []
    assert {x["key"] for x in env.client.get("/pantry", headers=ana).json()["items"]} == {"ovos", "massa"}
    env.client.delete("/pantry/ovos", headers=ana)
    out = env.client.post(f"/lists/{lst['id']}/items", json={"recipe_id": rid}, headers=ana).json()
    assert [i["name"] for i in out["items"]] == ["ovos"]


def test_list_sorted_by_aisle_and_merged_by_ingredient(env):
    ana = env.signup("Ana")
    lst = env.client.post("/lists", json={"title": "X"}, headers=ana).json()
    for name, q in [("Sal", None), ("salmão", "300"), ("cebola", "1"), ("cebolas", "2"), ("bifes de frango", "500")]:
        env.client.post(f"/lists/{lst['id']}/items", json={"name": name, "quantity": q}, headers=ana)
    items = env.client.get(f"/lists/{lst['id']}", headers=ana).json()["items"]
    assert [i["aisle"] for i in items] == ["Frutas e legumes", "Frutas e legumes", "Talho", "Peixaria", "Temperos e especiarias"]


def test_weekly_plan_personal_and_group_with_shopping(env):
    ana, bruno, g = setup_group(env)
    rid = import_recipe(env, ana, "Massa")
    wk = monday()
    days = [(wk + timedelta(days=i)).isoformat() for i in range(7)]
    env.client.post("/plan", json={"day": days[0], "slot": "jantar", "recipe_id": rid, "servings": 4}, headers=ana)
    env.client.post("/plan", json={"day": days[2], "slot": "almoco", "recipe_id": rid}, headers=ana)
    plan = env.client.get(f"/plan?week={days[3]}", headers=ana).json()  # any day of the week works
    assert plan["week_start"] == days[0] and plan["totals"]["meals"] == 2
    assert plan["days"][0]["entries"][0]["servings"] == 4 and plan["days"][0]["entries"][0]["recipe"]["title"] == "Massa"
    assert env.client.get(f"/plan?week={days[0]}", headers=bruno).json()["totals"]["meals"] == 0  # personal plan is private

    # group plan: Ana's own private recipe gets shared with the group when planned there
    e = env.client.post("/plan", json={"day": days[5], "recipe_id": rid, "servings": 6, "scope": g["id"]}, headers=ana).json()
    assert env.client.get(f"/plan?week={days[0]}&scope={g['id']}", headers=bruno).json()["totals"]["meals"] == 1
    assert env.client.get(f"/recipes/{rid}", headers=bruno).status_code == 200
    env.client.patch(f"/plan/{e['id']}", json={"day": days[6], "servings": 8}, headers=bruno)
    gp = env.client.get(f"/plan?week={days[0]}&scope={g['id']}", headers=ana).json()
    assert gp["days"][6]["entries"][0]["servings"] == 8

    # week shopping list: 4 + 2 servings of a 2-serving recipe = 3x -> 600 g massa, 6 ovos
    env.client.post("/pantry", json={"name": "ovos"}, headers=ana)
    shop = env.client.post("/plan/shopping", json={"week": days[0]}, headers=ana).json()
    assert shop["skipped_pantry"] == ["ovos"] and shop["title"].startswith("Semana de ")
    lst = env.client.get(f"/lists/{shop['list_id']}", headers=ana).json()
    assert [(i["name"], i["quantity"]) for i in lst["items"]] == [("massa", "600")]
    gshop = env.client.post("/plan/shopping", json={"week": days[0], "scope": g["id"]}, headers=bruno).json()
    glist = env.client.get(f"/lists/{gshop['list_id']}", headers=ana).json()
    assert glist["group_id"] == g["id"] and {(i["name"], i["quantity"]) for i in glist["items"]} == {("massa", "800"), ("ovos", "8")}
    env.client.delete(f"/plan/{e['id']}", headers=ana)
    assert env.client.post("/plan/shopping", json={"week": days[0], "scope": g["id"]}, headers=ana).status_code == 400


def test_metric_conversion_in_views(env):
    from app import costing
    assert costing.to_metric({"quantity": "1", "unit": "cup", "name": "all-purpose flour"}) == {"quantity": "125", "unit": "g"}
    assert costing.to_metric({"quantity": "2", "unit": "cups", "name": "milk"}) == {"quantity": "480", "unit": "ml"}
    assert costing.to_metric({"quantity": "1", "unit": "lb", "name": "ground beef"}) == {"quantity": "455", "unit": "g"}
    assert costing.to_metric({"quantity": "4", "unit": "cups", "name": "chicken stock"}) == {"quantity": "960", "unit": "ml"}
    assert costing.to_metric({"quantity": "200", "unit": "g", "name": "esparguete"}) is None
    assert costing.to_metric({"quantity": "2", "unit": None, "name": "ovos"}) is None


def test_trip_plan_for_group_holidays(env):
    ana, bruno, g = setup_group(env)
    rid = import_recipe(env, ana, "Massa", group_id=g["id"])
    t = env.client.post("/trips", json={"group_id": g["id"], "name": "Férias no Algarve", "start": "2027-08-02",
                                       "end": "2027-08-04", "people": 6}, headers=ana).json()
    assert [d["date"] for d in t["days"]] == ["2027-08-02", "2027-08-03", "2027-08-04"] and t["nights"] == 2
    e = env.client.post("/plan", json={"day": "2027-08-02", "slot": "pequeno", "recipe_id": rid, "trip_id": t["id"]}, headers=bruno).json()
    env.client.post("/plan", json={"day": "2027-08-03", "slot": "jantar", "recipe_id": rid, "trip_id": t["id"], "servings": 8}, headers=ana)
    trip = env.client.get(f"/trips/{t['id']}", headers=ana).json()
    entries = [x for d in trip["days"] for x in d["entries"]]
    assert [x["servings"] for x in entries] == [6, 8]  # defaults to the trip's head count
    assert trip["totals"]["meals"] == 2 and entries[0]["slot"] == "pequeno"
    # trip meals stay out of the weekly plans
    assert env.client.get("/plan?week=2027-08-02", headers=ana).json()["totals"]["meals"] == 0
    assert env.client.get(f"/plan?week=2027-08-02&scope={g['id']}", headers=ana).json()["totals"]["meals"] == 0
    # one shopping list for the whole trip: (6 + 8) / 2 = 7x -> 1400 g massa, 14 ovos
    shop = env.client.post("/plan/shopping", json={"trip_id": t["id"]}, headers=bruno).json()
    lst = env.client.get(f"/lists/{shop['list_id']}", headers=ana).json()
    assert shop["title"] == "Compras: Férias no Algarve" and lst["group_id"] == g["id"]
    assert {(i["name"], i["quantity"]) for i in lst["items"]} == {("massa", "1400"), ("ovos", "14")}
    feed = env.client.get(f"/groups/{g['id']}/activity", headers=bruno).json()
    assert any(a["type"] == "trip_created" for a in feed)
    assert env.client.patch(f"/trips/{t['id']}", json={"end": "2027-07-01"}, headers=ana).status_code == 400
    assert env.client.post("/trips", json={"group_id": g["id"], "name": "X", "start": "2027-01-01", "end": "2027-03-01", "people": 2}, headers=ana).status_code == 400
    assert [x["name"] for x in env.client.get("/trips", headers=bruno).json()] == ["Férias no Algarve"]
    env.client.delete(f"/trips/{t['id']}", headers=bruno)
    assert env.client.get(f"/trips/{t['id']}", headers=ana).status_code == 404
    assert env.client.patch(f"/plan/{e['id']}", json={"servings": 2}, headers=ana).status_code == 404  # entries went with it


def test_bimby_detection():
    from app.util import is_bimby
    steps = ["Coloque a cebola no copo e pique 5 seg/vel. 5.", "Junte o azeite e refogue 3 min/Varoma/vel. 1.", "Sirva."]
    assert is_bimby("Sopa de legumes", steps, [])
    assert is_bimby("Risotto na Bimby", ["Sirva."], [])
    assert is_bimby("Bolo", ["Misture tudo."], ["thermomix"])
    assert not is_bimby("Bacalhau à Brás", ["Frite a batata.", "Junte os ovos a 180 °C."], [])


def test_bimby_conversion(env, monkeypatch):
    from app import bimby
    from app.models import BimbySetting, Ingredient, Step
    c = env.client
    ana, rui, g = setup_group(env)
    rid = import_recipe(env, ana, "Carbonara")
    seen = {}

    def fake(rec, model="TM6", client=None):
        seen["model"], seen["title"] = model, rec.title
        return bimby.BimbyConversion(
            title="Esparguete à carbonara", servings=2, total_minutes=25,
            ingredients=[Ingredient(quantity="200", unit="g", name="esparguete")],
            steps=[Step(text="Coloca o queijo no copo e rala 10 seg/vel. 10.", bimby=BimbySetting(time_seconds=10, speed="10")),
                   Step(text="Programa 12 min/100 °C/colher inversa/vel. colher.", bimby=BimbySetting(time_seconds=720, temperature="100", speed="colher", reverse=True)),
                   Step(text="Serve logo.")],
            notes=["Cozinha a massa no cesto."])
    monkeypatch.setattr(bimby, "convert", fake)
    r = c.post(f"/recipes/{rid}/bimby", json={"model": "TM5"}, headers=ana)
    assert r.status_code == 201, r.text
    new = c.get(f"/recipes/{r.json()['id']}", headers=ana).json()
    assert seen["model"] == "TM5" and new["title"].endswith("(Bimby)")
    assert new["tags"][:2] == ["bimby", "tm5"] and new["converted_from"] == rid
    assert new["steps"][1]["bimby"]["reverse"] is True and new["steps"][2]["bimby"] is None
    # personal: not visible to another member until shared
    assert c.get(f"/recipes/{r.json()['id']}", headers=rui).status_code == 404
    assert c.post(f"/recipes/{rid}/bimby", json={"model": "TM9"}, headers=ana).status_code == 422


def test_custom_ingredient_price_and_kcal(env):
    from app.models import Ingredient, Recipe
    ana = env.signup("Ana")
    c = env.client
    store = c.app.state.store
    uid = c.get("/me", headers=ana).json()["user"]["id"]
    rec = Recipe(id="rx", is_recipe=True, title="Ovos com trufa", servings=2, confidence=1, source_url="", source_platform="web",
                 created_at="2026-01-01", ingredients=[Ingredient(quantity="200", unit="g", name="trufa negra fresca")], steps=[])
    store.save_recipe(rec, uid)
    f = c.get("/recipes/rx/facts", headers=ana).json()
    assert f["price_coverage"] == 0
    assert c.put("/ingredients/custom", json={"name": "trufa negra fresca"}, headers=ana).status_code == 400
    r = c.put("/ingredients/custom", json={"name": "trufa negra fresca", "kcal_per_100g": 400, "price": 30, "basis": "kg"}, headers=ana)
    assert r.status_code == 200
    f = c.get("/recipes/rx/facts", headers=ana).json()
    assert f["price_coverage"] == 1 and round(f["total"]["cost"][1], 2) == 6.0 and round(f["total"]["kcal"]) == 800
    assert c.get("/ingredients/custom?name=trufa negra fresca", headers=ana).json()["price"] == 30
    assert c.get("/ingredients/search?q=trufa", headers=ana).json()[0]["custom"] is True
    # brie is in the reference table now
    from app import costing
    assert costing.match_key("queijo brie", {})[0] == "queijo brie"
