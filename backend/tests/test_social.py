"""End-to-end API tests for accounts, groups and the six social features (no network, no LLM)."""
import asyncio
import base64
import os

import pytest
from fastapi.testclient import TestClient

from app import sources
from app.main import create_app
from app.models import Ingredient, RecipeDraft, Step
from app.pipeline import run_job
from app.realtime import Broker

TINY_JPEG = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff\xe0" + b"\x00" * 64).decode()


def fake_extract(mat):
    title = (mat.caption or "Receita").split("|")[0]
    return RecipeDraft(
        is_recipe=True, title=title, servings=2, confidence=0.9,
        ingredients=[Ingredient(quantity="200", unit="g", name="massa"), Ingredient(quantity="2", name="ovos")],
        steps=[Step(text="Cozer."), Step(text="Servir.")],
    )


def fake_runner(store, job, text, on_saved, on_failed=lambda e: None):
    gather = lambda url: sources.SourceMaterial(url=url, platform="tiktok", caption=url.rsplit("/", 1)[-1])
    run_job(store, job, text, on_saved, on_failed, gather=gather, extract=fake_extract)


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setattr("app.social.UPLOAD_DIR", str(tmp_path / "uploads"))
    app = create_app(str(tmp_path / "t.db"), runner=fake_runner, weekly=False)
    c = TestClient(app)

    class Env:
        client = c

        def signup(self, name, invite=None):
            r = c.post("/auth/signup", json={"name": name, "username": name.lower(), "password": "segredo123", "invite_code": invite})
            assert r.status_code == 201, r.text
            return {"Authorization": "Bearer " + r.json()["token"]}

    return Env()


def setup_group(env):
    ana = env.signup("Ana")
    g = env.client.post("/groups", json={"name": "Amigos"}, headers=ana).json()
    bruno = env.signup("Bruno", invite=g["invite_code"])
    return ana, bruno, g


def import_recipe(env, h, slug, group_id=None):
    job = env.client.post("/imports", json={"url": f"https://tiktok.com/v/{slug}", "group_id": group_id}, headers=h).json()
    job = env.client.get(f"/imports/{job['id']}", headers=h).json()
    assert job["status"] == "done", job
    return job["recipe_id"]


def test_signup_requires_invite_after_first_user(env):
    env.signup("Ana")
    r = env.client.post("/auth/signup", json={"name": "X", "username": "xpto", "password": "segredo123"})
    assert r.status_code == 403
    assert env.client.get("/me").status_code == 401
    bad = env.client.post("/auth/login", json={"username": "ana", "password": "errada"})
    assert bad.status_code == 401 and "incorretos" in bad.json()["detail"]


def test_private_vs_shared_and_permissions(env):
    ana, bruno, g = setup_group(env)
    assert env.client.get("/invites/" + g["invite_code"]).json()["name"] == "Amigos"
    rid = import_recipe(env, ana, "Carbonara")
    assert env.client.get(f"/recipes/{rid}", headers=bruno).status_code == 404  # private by default
    assert env.client.get("/recipes", headers=bruno).json() == []
    shared = env.client.put(f"/recipes/{rid}/shares", json={"group_ids": [g["id"]]}, headers=ana).json()
    assert shared["shared_group_ids"] == [g["id"]]
    seen = env.client.get(f"/recipes?scope={g['id']}", headers=bruno).json()
    assert [r["id"] for r in seen] == [rid] and seen[0]["owner"]["name"] == "Ana" and not seen[0]["is_owner"]
    # Bruno can favourite (personal) but not edit or delete Ana's recipe
    assert env.client.patch(f"/recipes/{rid}", json={"favorite": True}, headers=bruno).json()["favorite"] is True
    assert env.client.get(f"/recipes/{rid}", headers=ana).json()["favorite"] is False
    assert env.client.patch(f"/recipes/{rid}", json={"title": "Hack"}, headers=bruno).status_code == 403
    assert env.client.delete(f"/recipes/{rid}", headers=bruno).status_code == 403
    assert env.client.put(f"/recipes/{rid}/shares", json={"group_ids": []}, headers=bruno).status_code == 403
    assert env.client.get("/recipes?scope=mine", headers=bruno).json() == []


def test_import_straight_into_group_logs_activity(env):
    ana, bruno, g = setup_group(env)
    rid = import_recipe(env, ana, "Bolo", group_id=g["id"])
    feed = env.client.get(f"/groups/{g['id']}/activity", headers=bruno).json()
    assert any(a["type"] == "shared" and a["recipe_id"] == rid for a in feed)
    me = env.client.get("/me", headers=bruno).json()
    assert me["groups"][0]["unseen"] >= 1
    env.client.post(f"/groups/{g['id']}/seen", headers=bruno)
    assert env.client.get("/me", headers=bruno).json()["groups"][0]["unseen"] == 0


def test_cooks_variations_and_ratings(env, tmp_path):
    ana, bruno, g = setup_group(env)
    rid = import_recipe(env, ana, "Arroz", group_id=g["id"])
    cook = env.client.post(f"/recipes/{rid}/cooks", json={"note": "Pus metade do sal", "photo": TINY_JPEG}, headers=bruno)
    assert cook.status_code == 201
    assert os.path.exists(tmp_path / "uploads" / os.path.basename(cook.json()["photo"]))
    assert env.client.post(f"/recipes/{rid}/cooks", json={"photo": "data:image/gif;base64,R0lGOD"}, headers=bruno).status_code == 400

    v = env.client.post(f"/recipes/{rid}/variations", json={"title": "Sem glúten", "body": "Trocar a massa"}, headers=bruno).json()
    assert env.client.patch(f"/variations/{v['id']}", json={"title": "x", "body": "y"}, headers=ana).status_code == 404
    env.client.put(f"/recipes/{rid}/rating", json={"value": 1}, headers=bruno)
    env.client.put(f"/recipes/{rid}/rating", json={"value": 1}, headers=ana)

    social = env.client.get(f"/recipes/{rid}/social", headers=ana).json()
    assert social["cooks"][0]["user"]["name"] == "Bruno" and social["cooks"][0]["note"] == "Pus metade do sal"
    assert social["variations"][0]["title"] == "Sem glúten"
    assert len(social["rating"]["yes"]) == 2 and social["rating"]["mine"] == 1
    stats = env.client.get(f"/recipes/{rid}", headers=ana).json()["stats"]
    assert stats == {"cooks": 1, "yes": 2, "no": 0, "mine": 1}

    rank = env.client.get(f"/groups/{g['id']}/ranking", headers=ana).json()
    assert rank["would_make_again"][0]["recipe"]["id"] == rid
    assert rank["most_cooked_month"][0]["times"] == 1
    summary = env.client.get(f"/groups/{g['id']}/summary", headers=ana).json()
    assert summary["cooks"] == 1 and summary["variations"] == 1 and summary["top_recipe"]["id"] == rid
    assert summary["photos"] and summary["most_active"]["name"] == "Bruno"
    types = {a["type"] for a in env.client.get(f"/groups/{g['id']}/activity", headers=ana).json()}
    assert {"shared", "cooked", "variation", "rated", "joined"} <= types


def test_dinner_poll_creates_scaled_group_list(env):
    ana, bruno, g = setup_group(env)
    a = import_recipe(env, ana, "Carbonara", group_id=g["id"])
    b = import_recipe(env, bruno, "Lasanha", group_id=g["id"])
    private = import_recipe(env, ana, "Segredo")
    bad = env.client.post(f"/groups/{g['id']}/events", json={"title": "Sábado", "guests": 6, "recipe_ids": [a, private]}, headers=ana)
    assert bad.status_code == 400
    e = env.client.post(f"/groups/{g['id']}/events", json={"title": "Sábado", "guests": 6, "recipe_ids": [a, b]}, headers=ana).json()
    env.client.put(f"/events/{e['id']}/vote", json={"recipe_id": b}, headers=ana)
    e = env.client.put(f"/events/{e['id']}/vote", json={"recipe_id": b}, headers=bruno).json()
    assert e["voters_count"] == 2 and e["my_vote"] == b and e["options"][1]["votes"] == 2
    assert env.client.post(f"/events/{e['id']}/close", json={}, headers=bruno).status_code == 403  # only organiser/admin
    closed = env.client.post(f"/events/{e['id']}/close", json={}, headers=ana).json()
    assert closed["status"] == "decided" and closed["winner_recipe_id"] == b
    lst = env.client.get(f"/lists/{closed['list_id']}", headers=bruno).json()
    massa = next(i for i in lst["items"] if i["name"] == "massa")
    assert massa["quantity"] == "600"  # 200 g for 2 -> 6 guests
    assert env.client.put(f"/events/{e['id']}/vote", json={"recipe_id": a}, headers=ana).status_code == 409


def test_shared_list_assign_check_and_merge(env):
    ana, bruno, g = setup_group(env)
    rid = import_recipe(env, ana, "Massa", group_id=g["id"])
    personal = env.client.post("/lists", json={"title": "Minha"}, headers=ana).json()
    assert env.client.get(f"/lists/{personal['id']}", headers=bruno).status_code == 404
    lst = env.client.post("/lists", json={"title": "Jantar", "group_id": g["id"]}, headers=ana).json()
    env.client.post(f"/lists/{lst['id']}/items", json={"recipe_id": rid}, headers=ana)
    lst = env.client.post(f"/lists/{lst['id']}/items", json={"recipe_id": rid}, headers=bruno).json()
    massa = next(i for i in lst["items"] if i["name"] == "massa")
    assert massa["quantity"] == "400" and lst["total"] == 2  # merged, not duplicated
    lst = env.client.patch(f"/items/{massa['id']}", json={"assign": "me"}, headers=bruno).json()
    item = next(i for i in lst["items"] if i["id"] == massa["id"])
    assert item["assignee"]["name"] == "Bruno"
    env.client.patch(f"/items/{massa['id']}", json={"assign": "none"}, headers=ana)  # can't unassign someone else
    lst = env.client.patch(f"/items/{massa['id']}", json={"checked": True}, headers=ana).json()
    item = next(i for i in lst["items"] if i["id"] == massa["id"])
    assert item["assignee"]["name"] == "Bruno" and item["checked"] and item["checked_by_user"]["name"] == "Ana"
    assert lst["done"] == 1
    lst = env.client.post(f"/lists/{lst['id']}/clear-checked", headers=bruno).json()
    assert lst["total"] == 1
    assert {x["title"] for x in env.client.get("/lists", headers=bruno).json()} == {"Jantar"}


def test_leave_group_hands_over_admin(env):
    ana, bruno, g = setup_group(env)
    env.client.post(f"/groups/{g['id']}/leave", headers=ana)
    me = env.client.get("/me", headers=bruno).json()
    assert me["groups"][0]["my_role"] == "admin"


def test_broker_delivers_only_to_target_users():
    async def run():
        b = Broker()
        s1, s2 = b.subscribe("u1"), b.subscribe("u2")
        b.publish(["u1"], {"kind": "list", "id": "x"})
        await asyncio.sleep(0.01)
        return s1[1].qsize(), s2[1].qsize()
    assert asyncio.run(run()) == (1, 0)
