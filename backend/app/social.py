"""Groups and everything social: sharing, cooks, variations, ratings, dinner polls,
shared shopping lists, activity feed and weekly summary. All user-facing messages in pt-PT.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from fractions import Fraction
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .models import Recipe
from .pipeline import now
from .realtime import broker
from .store import Store, loads
from .util import add_quantities, item_key, scale_quantity

UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.getenv("RECIPES_DB", "recipes.db")) or ".", "uploads"))
MAX_PHOTO_BYTES = 6 * 1024 * 1024


def ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


# --------------------------------------------------------------------------- bodies
class GroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class JoinIn(BaseModel):
    code: str


class SharesIn(BaseModel):
    group_ids: list[str]


class CookIn(BaseModel):
    note: Optional[str] = Field(None, max_length=1000)
    photo: Optional[str] = Field(None, description="data:image/...;base64,...")


class VariationIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    body: str = Field(min_length=1, max_length=4000)


class RatingIn(BaseModel):
    value: Literal[-1, 0, 1]


class EventIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    date: Optional[str] = None
    guests: int = Field(ge=1, le=100)
    recipe_ids: list[str] = Field(min_length=2, max_length=8)


class VoteIn(BaseModel):
    recipe_id: str


class CloseIn(BaseModel):
    recipe_id: Optional[str] = None  # organiser may break a tie


class ListIn(BaseModel):
    title: str = Field(min_length=1, max_length=60)
    group_id: Optional[str] = None


class ItemIn(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    quantity: Optional[str] = None
    unit: Optional[str] = None
    recipe_id: Optional[str] = None
    servings: Optional[int] = None


class ItemPatch(BaseModel):
    checked: Optional[bool] = None
    assign: Optional[Literal["me", "none"]] = None


class RecipePatchIn(BaseModel):
    favorite: Optional[bool] = None
    collections: Optional[list[str]] = None
    title: Optional[str] = None
    servings: Optional[int] = None
    tags: Optional[list[str]] = None


# --------------------------------------------------------------------------- router
def make_router(store: Store, current_user, notifier=None) -> APIRouter:
    r = APIRouter()
    U = Depends(current_user)

    # ---------- access helpers
    def users_by_id(ids) -> dict[str, dict]:
        ids = list({i for i in ids if i})
        if not ids:
            return {}
        rows = store.q(f"SELECT id, name, username, color FROM users WHERE id IN ({','.join('?' * len(ids))})", ids)
        return {x["id"]: dict(x) for x in rows}

    def my_groups(uid: str) -> list[str]:
        return [x["group_id"] for x in store.q("SELECT group_id FROM members WHERE user_id=?", (uid,))]

    def members(gid: str) -> list[str]:
        return [x["user_id"] for x in store.q("SELECT user_id FROM members WHERE group_id=?", (gid,))]

    def require_member(uid: str, gid: str) -> dict:
        row = store.one("SELECT * FROM members WHERE group_id=? AND user_id=?", (gid, uid))
        if not row:
            raise HTTPException(404, "Grupo não encontrado.")
        return dict(row)

    def recipe_groups(rid: str) -> list[str]:
        return [x["group_id"] for x in store.q("SELECT group_id FROM recipe_shares WHERE recipe_id=?", (rid,))]

    def can_view(uid: str, rid: str) -> bool:
        owner = store.recipe_owner(rid)
        if owner is None and not store.one("SELECT 1 FROM recipes WHERE id=?", (rid,)):
            return False
        return owner == uid or bool(set(recipe_groups(rid)) & set(my_groups(uid)))

    def get_visible(uid: str, rid: str) -> Recipe:
        rec = store.get_recipe(rid)
        if not rec or not can_view(uid, rid):
            raise HTTPException(404, "Receita não encontrada.")
        return rec

    def require_owner(uid: str, rid: str) -> Recipe:
        rec = get_visible(uid, rid)
        if store.recipe_owner(rid) != uid:
            raise HTTPException(403, "Só quem importou a receita a pode alterar.")
        return rec

    def audience_for_recipe(rid: str) -> set[str]:
        out = {store.recipe_owner(rid)} - {None}
        for g in recipe_groups(rid):
            out |= set(members(g))
        return out

    def log(group_ids, uid: str, type_: str, rid: Optional[str] = None, data: Optional[dict] = None) -> None:
        stamp = now()
        for gid in set(group_ids):
            store.x("INSERT INTO activity(id, group_id, user_id, type, recipe_id, data, created_at) VALUES (?,?,?,?,?,?,?)",
                    (uuid.uuid4().hex, gid, uid, type_, rid, json.dumps(data or {}, ensure_ascii=False), stamp))
            broker.publish(members(gid), {"kind": "activity", "group_id": gid})
            if notifier:
                notifier.on_activity(gid, uid, type_, rid, data or {})

    # ---------- recipe views (personal state + social stats merged in)
    def views(uid: str, recs: list[Recipe]) -> list[dict]:
        if not recs:
            return []
        ids = [x.id for x in recs]
        ph = ",".join("?" * len(ids))
        owners = {x["id"]: x["owner_id"] for x in store.q(f"SELECT id, owner_id FROM recipes WHERE id IN ({ph})", ids)}
        personal = {x["recipe_id"]: x for x in store.q(f"SELECT * FROM user_recipe WHERE user_id=? AND recipe_id IN ({ph})", [uid, *ids])}
        shares: dict[str, list[str]] = {}
        for x in store.q(f"SELECT recipe_id, group_id FROM recipe_shares WHERE recipe_id IN ({ph})", ids):
            shares.setdefault(x["recipe_id"], []).append(x["group_id"])
        cooks = {x["recipe_id"]: x["c"] for x in store.q(f"SELECT recipe_id, COUNT(*) c FROM cooks WHERE recipe_id IN ({ph}) GROUP BY recipe_id", ids)}
        rates: dict[str, dict] = {}
        for x in store.q(f"SELECT recipe_id, user_id, value FROM ratings WHERE recipe_id IN ({ph}) AND value != 0", ids):
            d = rates.setdefault(x["recipe_id"], {"yes": 0, "no": 0, "mine": 0})
            d["yes" if x["value"] > 0 else "no"] += 1
            if x["user_id"] == uid:
                d["mine"] = x["value"]
        people = users_by_id(owners.values())
        out = []
        for rec in recs:
            d = rec.model_dump()
            p = personal.get(rec.id)
            d["favorite"] = bool(p["favorite"]) if p else False
            d["collections"] = loads(p["collections"], []) if p else []
            d["owner"] = people.get(owners.get(rec.id))
            d["is_owner"] = owners.get(rec.id) == uid
            d["shared_group_ids"] = shares.get(rec.id, [])
            rt = rates.get(rec.id, {"yes": 0, "no": 0, "mine": 0})
            d["stats"] = {"cooks": cooks.get(rec.id, 0), **rt}
            out.append(d)
        return out

    @r.get("/recipes")
    def list_recipes(scope: str = "all", user=U) -> list[dict]:
        uid = user["id"]
        groups = my_groups(uid)
        if scope == "mine":
            rows = store.q("SELECT doc FROM recipes WHERE owner_id=? ORDER BY created_at DESC", (uid,))
        elif scope not in ("all", "mine"):
            if scope not in groups:
                raise HTTPException(404, "Grupo não encontrado.")
            rows = store.q("SELECT r.doc FROM recipes r JOIN recipe_shares s ON s.recipe_id=r.id WHERE s.group_id=? ORDER BY s.shared_at DESC", (scope,))
        else:
            ph = ",".join("?" * len(groups)) or "''"
            rows = store.q(
                f"SELECT DISTINCT r.doc, r.created_at FROM recipes r LEFT JOIN recipe_shares s ON s.recipe_id=r.id "
                f"WHERE r.owner_id=? OR s.group_id IN ({ph}) ORDER BY r.created_at DESC", [uid, *groups])
        return views(uid, [Recipe.model_validate_json(x["doc"]) for x in rows])

    @r.get("/recipes/{rid}")
    def get_recipe(rid: str, user=U) -> dict:
        return views(user["id"], [get_visible(user["id"], rid)])[0]

    @r.patch("/recipes/{rid}")
    def patch_recipe(rid: str, body: RecipePatchIn, user=U) -> dict:
        uid = user["id"]
        rec = get_visible(uid, rid)
        if body.favorite is not None or body.collections is not None:
            cur = store.one("SELECT * FROM user_recipe WHERE user_id=? AND recipe_id=?", (uid, rid))
            fav = body.favorite if body.favorite is not None else (bool(cur["favorite"]) if cur else False)
            cols = body.collections if body.collections is not None else (loads(cur["collections"], []) if cur else [])
            store.x("INSERT OR REPLACE INTO user_recipe(user_id, recipe_id, favorite, collections) VALUES (?,?,?,?)",
                    (uid, rid, int(fav), json.dumps(cols, ensure_ascii=False)))
        content = body.model_dump(exclude_none=True, include={"title", "servings", "tags"})
        if content:
            rec = require_owner(uid, rid).model_copy(update=content)
            store.save_recipe(rec)
            broker.publish(audience_for_recipe(rid), {"kind": "recipe", "id": rid})
        return views(uid, [rec])[0]

    @r.delete("/recipes/{rid}", status_code=204)
    def delete_recipe(rid: str, user=U):
        require_owner(user["id"], rid)
        audience = audience_for_recipe(rid)
        store.delete_recipe(rid)
        broker.publish(audience, {"kind": "recipe", "id": rid})

    @r.get("/recipes/{rid}/scaled")
    def scaled(rid: str, servings: int, user=U) -> dict:
        rec = get_visible(user["id"], rid)
        if not rec.servings or servings <= 0:
            raise HTTPException(400, "Esta receita não indica o número de doses.")
        f = Fraction(servings, rec.servings)
        ings = [i.model_copy(update={"quantity": scale_quantity(i.quantity, f)}) for i in rec.ingredients]
        return views(user["id"], [rec.model_copy(update={"ingredients": ings, "servings": servings})])[0]

    @r.put("/recipes/{rid}/shares")
    def set_shares(rid: str, body: SharesIn, user=U) -> dict:
        uid = user["id"]
        rec = require_owner(uid, rid)
        mine = set(my_groups(uid))
        wanted = set(body.group_ids)
        if not wanted <= mine:
            raise HTTPException(403, "Só podes partilhar com grupos a que pertences.")
        current = set(recipe_groups(rid))
        added, removed = wanted - current, current - wanted
        stmts = [("INSERT OR IGNORE INTO recipe_shares(recipe_id, group_id, shared_by, shared_at) VALUES (?,?,?,?)", (rid, g, uid, now())) for g in added]
        stmts += [("DELETE FROM recipe_shares WHERE recipe_id=? AND group_id=?", (rid, g)) for g in removed]
        if stmts:
            store.xs(stmts)
        log(added, uid, "shared", rid, {"title": rec.title})
        for g in removed:
            broker.publish(members(g), {"kind": "recipe", "id": rid})
        return views(uid, [rec])[0]

    def share_on_import(uid: str, rec: Recipe, group_id: Optional[str]) -> None:
        """Called by the import pipeline once a recipe is saved."""
        if group_id and group_id in my_groups(uid):
            store.x("INSERT OR IGNORE INTO recipe_shares(recipe_id, group_id, shared_by, shared_at) VALUES (?,?,?,?)",
                    (rec.id, group_id, uid, now()))
            log([group_id], uid, "shared", rec.id, {"title": rec.title})

    # ---------- feature 1: "Já fiz isto" (cooks with photo + note)
    def save_photo(data_url: str) -> str:
        try:
            header, b64 = data_url.split(",", 1)
            raw = base64.b64decode(b64, validate=True)
        except (ValueError, TypeError):
            raise HTTPException(400, "Fotografia inválida.")
        if len(raw) > MAX_PHOTO_BYTES:
            raise HTTPException(413, "A fotografia é demasiado grande.")
        if raw[:3] == b"\xff\xd8\xff":
            ext = "jpg"
        elif raw[:8] == b"\x89PNG\r\n\x1a\n":
            ext = "png"
        elif raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
            ext = "webp"
        else:
            raise HTTPException(400, "Formato de imagem não suportado (usa JPEG, PNG ou WebP).")
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        name = f"{secrets.token_urlsafe(16)}.{ext}"
        with open(os.path.join(UPLOAD_DIR, name), "wb") as f:
            f.write(raw)
        return f"/uploads/{name}"

    @r.post("/recipes/{rid}/cooks", status_code=201)
    def add_cook(rid: str, body: CookIn, user=U) -> dict:
        uid = user["id"]
        rec = get_visible(uid, rid)
        photo = save_photo(body.photo) if body.photo else None
        cid = uuid.uuid4().hex
        store.x("INSERT INTO cooks(id, recipe_id, user_id, note, photo, created_at) VALUES (?,?,?,?,?,?)",
                (cid, rid, uid, (body.note or "").strip() or None, photo, now()))
        log(recipe_groups(rid), uid, "cooked", rid, {"title": rec.title, "photo": photo, "note": body.note, "cook_id": cid})
        broker.publish(audience_for_recipe(rid), {"kind": "recipe", "id": rid})
        return {"id": cid, "photo": photo}

    @r.delete("/cooks/{cid}", status_code=204)
    def delete_cook(cid: str, user=U):
        row = store.one("SELECT * FROM cooks WHERE id=?", (cid,))
        if not row or row["user_id"] != user["id"]:
            raise HTTPException(404, "Registo não encontrado.")
        store.x("DELETE FROM cooks WHERE id=?", (cid,))
        store.x("DELETE FROM activity WHERE type='cooked' AND data LIKE ?", (f'%"cook_id": "{cid}"%',))
        broker.publish(audience_for_recipe(row["recipe_id"]), {"kind": "recipe", "id": row["recipe_id"]})

    # ---------- feature 2: personal variations
    @r.post("/recipes/{rid}/variations", status_code=201)
    def add_variation(rid: str, body: VariationIn, user=U) -> dict:
        uid = user["id"]
        rec = get_visible(uid, rid)
        vid = uuid.uuid4().hex
        store.x("INSERT INTO variations(id, recipe_id, user_id, title, body, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
                (vid, rid, uid, body.title.strip(), body.body.strip(), now(), now()))
        log(recipe_groups(rid), uid, "variation", rid, {"title": rec.title, "variation": body.title.strip()})
        broker.publish(audience_for_recipe(rid), {"kind": "recipe", "id": rid})
        return {"id": vid}

    def own_variation(vid: str, uid: str):
        row = store.one("SELECT * FROM variations WHERE id=?", (vid,))
        if not row or row["user_id"] != uid:
            raise HTTPException(404, "Variação não encontrada.")
        return row

    @r.patch("/variations/{vid}")
    def edit_variation(vid: str, body: VariationIn, user=U) -> dict:
        row = own_variation(vid, user["id"])
        store.x("UPDATE variations SET title=?, body=?, updated_at=? WHERE id=?", (body.title.strip(), body.body.strip(), now(), vid))
        broker.publish(audience_for_recipe(row["recipe_id"]), {"kind": "recipe", "id": row["recipe_id"]})
        return {"id": vid}

    @r.delete("/variations/{vid}", status_code=204)
    def delete_variation(vid: str, user=U):
        row = own_variation(vid, user["id"])
        store.x("DELETE FROM variations WHERE id=?", (vid,))
        broker.publish(audience_for_recipe(row["recipe_id"]), {"kind": "recipe", "id": row["recipe_id"]})

    # ---------- feature 7: "Voltava a fazer?"
    @r.put("/recipes/{rid}/rating")
    def rate(rid: str, body: RatingIn, user=U) -> dict:
        uid = user["id"]
        rec = get_visible(uid, rid)
        prev = store.one("SELECT value FROM ratings WHERE recipe_id=? AND user_id=?", (rid, uid))
        store.x("INSERT OR REPLACE INTO ratings(recipe_id, user_id, value, updated_at) VALUES (?,?,?,?)", (rid, uid, body.value, now()))
        if body.value != 0 and (not prev or prev["value"] != body.value):
            log(recipe_groups(rid), uid, "rated", rid, {"title": rec.title, "value": body.value})
        broker.publish(audience_for_recipe(rid), {"kind": "recipe", "id": rid})
        return views(uid, [rec])[0]["stats"]

    @r.get("/recipes/{rid}/social")
    def recipe_social(rid: str, user=U) -> dict:
        get_visible(user["id"], rid)
        cooks = [dict(x) for x in store.q("SELECT * FROM cooks WHERE recipe_id=? ORDER BY created_at DESC", (rid,))]
        variations = [dict(x) for x in store.q("SELECT * FROM variations WHERE recipe_id=? ORDER BY updated_at DESC", (rid,))]
        ratings = [dict(x) for x in store.q("SELECT user_id, value FROM ratings WHERE recipe_id=? AND value != 0", (rid,))]
        people = users_by_id([c["user_id"] for c in cooks] + [v["user_id"] for v in variations] + [x["user_id"] for x in ratings])
        for c in cooks:
            c["user"] = people.get(c["user_id"])
        for v in variations:
            v["user"] = people.get(v["user_id"])
        mine = next((x["value"] for x in ratings if x["user_id"] == user["id"]), 0)
        return {
            "cooks": cooks,
            "variations": variations,
            "rating": {"yes": [people.get(x["user_id"]) for x in ratings if x["value"] > 0],
                       "no": [people.get(x["user_id"]) for x in ratings if x["value"] < 0], "mine": mine},
        }

    # ---------- groups
    def group_view(gid: str, uid: str) -> dict:
        g = dict(store.one("SELECT * FROM groups_ WHERE id=?", (gid,)))
        rows = store.q("SELECT m.role, m.last_seen, u.id, u.name, u.username, u.color FROM members m JOIN users u ON u.id=m.user_id WHERE m.group_id=? ORDER BY m.joined_at", (gid,))
        me = next((x for x in rows if x["id"] == uid), None)
        g["members"] = [{"id": x["id"], "name": x["name"], "username": x["username"], "color": x["color"], "role": x["role"]} for x in rows]
        g["my_role"] = me["role"] if me else None
        g["unseen"] = store.one("SELECT COUNT(*) c FROM activity WHERE group_id=? AND user_id != ? AND created_at > ?",
                                (gid, uid, (me["last_seen"] if me else "") or ""))["c"]
        g["recipe_count"] = store.one("SELECT COUNT(*) c FROM recipe_shares WHERE group_id=?", (gid,))["c"]
        return g

    @r.get("/me")
    def me(user=U) -> dict:
        return {"user": user, "groups": [group_view(g, user["id"]) for g in my_groups(user["id"])]}

    @r.post("/groups", status_code=201)
    def create_group(body: GroupIn, user=U) -> dict:
        gid = uuid.uuid4().hex
        store.xs([
            ("INSERT INTO groups_(id, name, invite_code, created_by, created_at) VALUES (?,?,?,?,?)",
             (gid, body.name.strip(), secrets.token_urlsafe(9), user["id"], now())),
            ("INSERT INTO members(group_id, user_id, role, joined_at, last_seen) VALUES (?,?,?,?,?)", (gid, user["id"], "admin", now(), now())),
        ])
        return group_view(gid, user["id"])

    @r.get("/invites/{code}")
    def invite_preview(code: str) -> dict:  # public: shown on the sign-up screen
        g = store.one("SELECT id, name FROM groups_ WHERE invite_code=?", (code,))
        if not g:
            raise HTTPException(404, "Convite inválido ou expirado.")
        names = [x["name"] for x in store.q("SELECT u.name FROM members m JOIN users u ON u.id=m.user_id WHERE m.group_id=? ORDER BY m.joined_at LIMIT 5", (g["id"],))]
        return {"name": g["name"], "members": names}

    @r.post("/groups/join")
    def join(body: JoinIn, user=U) -> dict:
        g = store.one("SELECT id FROM groups_ WHERE invite_code=?", (body.code.strip(),))
        if not g:
            raise HTTPException(404, "Convite inválido ou expirado.")
        new = store.x("INSERT OR IGNORE INTO members(group_id, user_id, role, joined_at, last_seen) VALUES (?,?,?,?,?)",
                      (g["id"], user["id"], "member", now(), now()))
        if new:
            log([g["id"]], user["id"], "joined")
        return group_view(g["id"], user["id"])

    @r.post("/groups/{gid}/invite/reset")
    def reset_invite(gid: str, user=U) -> dict:
        if require_member(user["id"], gid)["role"] != "admin":
            raise HTTPException(403, "Só o administrador pode renovar o convite.")
        store.x("UPDATE groups_ SET invite_code=? WHERE id=?", (secrets.token_urlsafe(9), gid))
        return group_view(gid, user["id"])

    @r.patch("/groups/{gid}")
    def rename_group(gid: str, body: GroupIn, user=U) -> dict:
        if require_member(user["id"], gid)["role"] != "admin":
            raise HTTPException(403, "Só o administrador pode mudar o nome.")
        store.x("UPDATE groups_ SET name=? WHERE id=?", (body.name.strip(), gid))
        return group_view(gid, user["id"])

    @r.post("/groups/{gid}/leave", status_code=204)
    def leave(gid: str, user=U):
        require_member(user["id"], gid)
        store.x("DELETE FROM members WHERE group_id=? AND user_id=?", (gid, user["id"]))
        # the recipes this person shared leave with them
        store.x("DELETE FROM recipe_shares WHERE group_id=? AND recipe_id IN (SELECT id FROM recipes WHERE owner_id=?)", (gid, user["id"]))
        rest = store.q("SELECT user_id, role FROM members WHERE group_id=? ORDER BY joined_at", (gid,))
        if rest and not any(x["role"] == "admin" for x in rest):  # hand over admin
            store.x("UPDATE members SET role='admin' WHERE group_id=? AND user_id=?", (gid, rest[0]["user_id"]))

    # ---------- feature 8: activity feed + weekly summary
    @r.get("/groups/{gid}/activity")
    def activity(gid: str, limit: int = 40, user=U) -> list[dict]:
        require_member(user["id"], gid)
        rows = [dict(x) for x in store.q("SELECT * FROM activity WHERE group_id=? ORDER BY created_at DESC LIMIT ?", (gid, min(limit, 100)))]
        people = users_by_id(x["user_id"] for x in rows)
        thumbs = {}
        rids = list({x["recipe_id"] for x in rows if x["recipe_id"]})
        if rids:
            for x in store.q(f"SELECT id, doc FROM recipes WHERE id IN ({','.join('?' * len(rids))})", rids):
                d = json.loads(x["doc"])
                thumbs[x["id"]] = {"title": d.get("title"), "thumbnail_url": d.get("thumbnail_url")}
        for x in rows:
            x["user"] = people.get(x["user_id"])
            x["data"] = loads(x["data"], {})
            x["recipe"] = thumbs.get(x["recipe_id"])
        return rows

    @r.post("/groups/{gid}/seen", status_code=204)
    def seen(gid: str, user=U):
        require_member(user["id"], gid)
        store.x("UPDATE members SET last_seen=? WHERE group_id=? AND user_id=?", (now(), gid, user["id"]))

    @r.get("/groups/{gid}/summary")
    def summary(gid: str, days: int = 7, user=U) -> dict:
        require_member(user["id"], gid)
        return compute_summary(gid, days)

    def compute_summary(gid: str, days: int = 7) -> dict:
        since = ago(days)
        acts = store.q("SELECT * FROM activity WHERE group_id=? AND created_at > ?", (gid, since))
        by_type: dict[str, int] = {}
        by_user: dict[str, int] = {}
        for a in acts:
            by_type[a["type"]] = by_type.get(a["type"], 0) + 1
            by_user[a["user_id"]] = by_user.get(a["user_id"], 0) + 1
        cooked = store.q(
            "SELECT c.recipe_id, COUNT(*) n FROM cooks c JOIN recipe_shares s ON s.recipe_id=c.recipe_id AND s.group_id=? "
            "WHERE c.created_at > ? GROUP BY c.recipe_id ORDER BY n DESC LIMIT 1", (gid, since))
        photos = [x["photo"] for x in store.q(
            "SELECT c.photo FROM cooks c JOIN recipe_shares s ON s.recipe_id=c.recipe_id AND s.group_id=? "
            "WHERE c.created_at > ? AND c.photo IS NOT NULL ORDER BY c.created_at DESC LIMIT 4", (gid, since))]
        top_user = max(by_user, key=by_user.get) if by_user else None
        top_recipe = None
        if cooked:
            rec = store.get_recipe(cooked[0]["recipe_id"])
            if rec:
                top_recipe = {"id": rec.id, "title": rec.title, "thumbnail_url": rec.thumbnail_url, "times": cooked[0]["n"]}
        open_events = store.one("SELECT COUNT(*) c FROM events WHERE group_id=? AND status='open'", (gid,))["c"]
        return {
            "days": days,
            "new_recipes": by_type.get("shared", 0),
            "cooks": by_type.get("cooked", 0),
            "variations": by_type.get("variation", 0),
            "new_members": by_type.get("joined", 0),
            "open_events": open_events,
            "top_recipe": top_recipe,
            "most_active": users_by_id([top_user]).get(top_user) if top_user else None,
            "photos": photos,
        }

    # ---------- feature 7: group ranking
    @r.get("/groups/{gid}/ranking")
    def ranking(gid: str, user=U) -> dict:
        require_member(user["id"], gid)
        rows = store.q(
            "SELECT s.recipe_id, SUM(CASE WHEN r.value > 0 THEN 1 ELSE 0 END) yes, SUM(CASE WHEN r.value < 0 THEN 1 ELSE 0 END) no "
            "FROM recipe_shares s JOIN ratings r ON r.recipe_id=s.recipe_id WHERE s.group_id=? GROUP BY s.recipe_id", (gid,))
        def score(x):  # lower bound-ish: favours many yes votes over a single one
            n = x["yes"] + x["no"]
            return (x["yes"] + 1) / (n + 2)
        top = sorted([x for x in rows if x["yes"]], key=lambda x: (-score(x), -x["yes"]))[:5]
        month = store.q(
            "SELECT c.recipe_id, COUNT(*) n FROM cooks c JOIN recipe_shares s ON s.recipe_id=c.recipe_id AND s.group_id=? "
            "WHERE c.created_at > ? GROUP BY c.recipe_id ORDER BY n DESC LIMIT 5", (gid, ago(30)))
        def brief(rid):
            rec = store.get_recipe(rid)
            return {"id": rec.id, "title": rec.title, "thumbnail_url": rec.thumbnail_url} if rec else None
        return {
            "would_make_again": [{"recipe": brief(x["recipe_id"]), "yes": x["yes"], "no": x["no"]} for x in top if brief(x["recipe_id"])],
            "most_cooked_month": [{"recipe": brief(x["recipe_id"]), "times": x["n"]} for x in month if brief(x["recipe_id"])],
        }

    # ---------- feature 3: dinner polls
    def event_view(eid: str, uid: str) -> dict:
        e = store.one("SELECT * FROM events WHERE id=?", (eid,))
        if not e:
            raise HTTPException(404, "Jantar não encontrado.")
        require_member(uid, e["group_id"])
        e = dict(e)
        opts = store.q("SELECT recipe_id FROM event_options WHERE event_id=? ORDER BY position", (eid,))
        votes = store.q("SELECT user_id, recipe_id FROM votes WHERE event_id=?", (eid,))
        people = users_by_id([v["user_id"] for v in votes] + [e["created_by"]])
        options = []
        for o in opts:
            rec = store.get_recipe(o["recipe_id"])
            if not rec:
                continue
            voters = [people.get(v["user_id"]) for v in votes if v["recipe_id"] == rec.id]
            options.append({"recipe": {"id": rec.id, "title": rec.title, "thumbnail_url": rec.thumbnail_url,
                                       "total_minutes": rec.total_minutes, "servings": rec.servings},
                            "votes": len(voters), "voters": voters})
        e["options"] = options
        e["my_vote"] = next((v["recipe_id"] for v in votes if v["user_id"] == uid), None)
        e["voters_count"] = len(votes)
        e["members_count"] = len(members(e["group_id"]))
        e["organiser"] = people.get(e["created_by"])
        e["can_close"] = e["created_by"] == uid or require_member(uid, e["group_id"])["role"] == "admin"
        return e

    @r.get("/groups/{gid}/events")
    def list_events(gid: str, user=U) -> list[dict]:
        require_member(user["id"], gid)
        rows = store.q("SELECT id FROM events WHERE group_id=? ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC LIMIT 20", (gid,))
        return [event_view(x["id"], user["id"]) for x in rows]

    @r.post("/groups/{gid}/events", status_code=201)
    def create_event(gid: str, body: EventIn, user=U) -> dict:
        uid = user["id"]
        require_member(uid, gid)
        shared = set(x["recipe_id"] for x in store.q("SELECT recipe_id FROM recipe_shares WHERE group_id=?", (gid,)))
        ids = list(dict.fromkeys(body.recipe_ids))
        if len(ids) < 2 or not set(ids) <= shared:
            raise HTTPException(400, "Escolhe pelo menos duas receitas partilhadas com o grupo.")
        eid = uuid.uuid4().hex
        stmts = [("INSERT INTO events(id, group_id, title, date, guests, created_by, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
                  (eid, gid, body.title.strip(), body.date, body.guests, uid, "open", now()))]
        stmts += [("INSERT INTO event_options(event_id, recipe_id, position) VALUES (?,?,?)", (eid, rid, i)) for i, rid in enumerate(ids)]
        store.xs(stmts)
        log([gid], uid, "event_created", None, {"event_id": eid, "title": body.title.strip(), "date": body.date})
        broker.publish(members(gid), {"kind": "event", "id": eid, "group_id": gid})
        return event_view(eid, uid)

    @r.get("/events/{eid}")
    def get_event(eid: str, user=U) -> dict:
        return event_view(eid, user["id"])

    @r.put("/events/{eid}/vote")
    def vote(eid: str, body: VoteIn, user=U) -> dict:
        e = event_view(eid, user["id"])
        if e["status"] != "open":
            raise HTTPException(409, "A votação já terminou.")
        if body.recipe_id not in [o["recipe"]["id"] for o in e["options"]]:
            raise HTTPException(400, "Essa receita não está nesta votação.")
        store.x("INSERT OR REPLACE INTO votes(event_id, user_id, recipe_id) VALUES (?,?,?)", (eid, user["id"], body.recipe_id))
        broker.publish(members(e["group_id"]), {"kind": "event", "id": eid, "group_id": e["group_id"]})
        return event_view(eid, user["id"])

    @r.post("/events/{eid}/close")
    def close_event(eid: str, body: CloseIn, user=U) -> dict:
        uid = user["id"]
        e = event_view(eid, uid)
        if not e["can_close"]:
            raise HTTPException(403, "Só quem organizou pode fechar a votação.")
        if e["status"] != "open":
            raise HTTPException(409, "A votação já terminou.")
        if body.recipe_id:
            winner = body.recipe_id
            if winner not in [o["recipe"]["id"] for o in e["options"]]:
                raise HTTPException(400, "Essa receita não está nesta votação.")
        else:  # most votes; ties go to the earliest option
            winner = max(e["options"], key=lambda o: o["votes"])["recipe"]["id"]
        rec = store.get_recipe(winner)
        lid = new_list(f"{e['title']}: {rec.title}", uid, e["group_id"], eid)
        add_recipe_to_list(lid, rec, e["guests"])
        store.x("UPDATE events SET status='decided', winner_recipe_id=?, list_id=? WHERE id=?", (winner, lid, eid))
        log([e["group_id"]], uid, "event_decided", winner, {"event_id": eid, "title": e["title"], "recipe": rec.title, "guests": e["guests"]})
        broker.publish(members(e["group_id"]), {"kind": "event", "id": eid, "group_id": e["group_id"]})
        broker.publish(members(e["group_id"]), {"kind": "lists"})
        return event_view(eid, uid)

    @r.delete("/events/{eid}", status_code=204)
    def delete_event(eid: str, user=U):
        e = event_view(eid, user["id"])
        if not e["can_close"]:
            raise HTTPException(403, "Só quem organizou pode apagar este jantar.")
        store.xs([("DELETE FROM events WHERE id=?", (eid,)), ("DELETE FROM event_options WHERE event_id=?", (eid,)),
                  ("DELETE FROM votes WHERE event_id=?", (eid,))])
        broker.publish(members(e["group_id"]), {"kind": "event", "id": eid, "group_id": e["group_id"]})

    # ---------- feature 4: shared shopping lists
    def new_list(title: str, owner: str, group_id: Optional[str], event_id: Optional[str] = None) -> str:
        lid = uuid.uuid4().hex
        store.x("INSERT INTO lists(id, title, owner_id, group_id, event_id, created_at) VALUES (?,?,?,?,?,?)",
                (lid, title, owner, group_id, event_id, now()))
        return lid

    def list_audience(lst) -> list[str]:
        return members(lst["group_id"]) if lst["group_id"] else [lst["owner_id"]]

    def get_list_row(lid: str, uid: str):
        lst = store.one("SELECT * FROM lists WHERE id=?", (lid,))
        if not lst or (lst["group_id"] and lst["group_id"] not in my_groups(uid)) or (not lst["group_id"] and lst["owner_id"] != uid):
            raise HTTPException(404, "Lista não encontrada.")
        return lst

    def add_recipe_to_list(lid: str, rec: Recipe, servings: Optional[int]) -> None:
        f = Fraction(servings, rec.servings) if servings and rec.servings else Fraction(1)
        existing = {item_key(x["name"], x["unit"]): x for x in store.q("SELECT * FROM list_items WHERE list_id=? AND checked=0", (lid,))}
        pos = store.one("SELECT COALESCE(MAX(position), 0) p FROM list_items WHERE list_id=?", (lid,))["p"]
        stmts = []
        for ing in rec.ingredients:
            qty = scale_quantity(ing.quantity, f)
            k = item_key(ing.name, ing.unit)
            if k in existing:
                row = existing[k]
                srcs = loads(row["sources"], [])
                if rec.title not in srcs:
                    srcs.append(rec.title)
                stmts.append(("UPDATE list_items SET quantity=?, sources=? WHERE id=?",
                              (add_quantities(row["quantity"], qty), json.dumps(srcs, ensure_ascii=False), row["id"])))
            else:
                pos += 1
                iid = uuid.uuid4().hex
                stmts.append(("INSERT INTO list_items(id, list_id, name, quantity, unit, sources, position, created_at) VALUES (?,?,?,?,?,?,?,?)",
                              (iid, lid, ing.name, qty, ing.unit, json.dumps([rec.title], ensure_ascii=False), pos, now())))
                existing[k] = {"id": iid, "name": ing.name, "unit": ing.unit, "quantity": qty, "sources": json.dumps([rec.title])}
        store.xs(stmts)

    def list_view(lst, uid: str, with_items: bool = True) -> dict:
        d = dict(lst)
        counts = store.one("SELECT COUNT(*) total, SUM(checked) done FROM list_items WHERE list_id=?", (lst["id"],))
        d["total"], d["done"] = counts["total"], counts["done"] or 0
        if lst["group_id"]:
            g = store.one("SELECT name FROM groups_ WHERE id=?", (lst["group_id"],))
            d["group_name"] = g["name"] if g else None
        if with_items:
            items = [dict(x) for x in store.q("SELECT * FROM list_items WHERE list_id=? ORDER BY checked, position", (lst["id"],))]
            people = users_by_id([x["assigned_to"] for x in items] + [x["checked_by"] for x in items])
            for x in items:
                x["sources"] = loads(x["sources"], [])
                x["checked"] = bool(x["checked"])
                x["assignee"] = people.get(x["assigned_to"])
                x["checked_by_user"] = people.get(x["checked_by"])
            d["items"] = items
        return d

    @r.get("/lists")
    def lists(user=U) -> list[dict]:
        uid = user["id"]
        groups = my_groups(uid)
        ph = ",".join("?" * len(groups)) or "''"
        rows = store.q(f"SELECT * FROM lists WHERE (group_id IS NULL AND owner_id=?) OR group_id IN ({ph}) ORDER BY created_at DESC", [uid, *groups])
        return [list_view(x, uid, with_items=False) for x in rows]

    @r.post("/lists", status_code=201)
    def create_list(body: ListIn, user=U) -> dict:
        if body.group_id:
            require_member(user["id"], body.group_id)
        lid = new_list(body.title.strip(), user["id"], body.group_id)
        lst = store.one("SELECT * FROM lists WHERE id=?", (lid,))
        broker.publish(list_audience(lst), {"kind": "lists"})
        return list_view(lst, user["id"])

    @r.get("/lists/{lid}")
    def get_list(lid: str, user=U) -> dict:
        return list_view(get_list_row(lid, user["id"]), user["id"])

    @r.delete("/lists/{lid}", status_code=204)
    def delete_list(lid: str, user=U):
        lst = get_list_row(lid, user["id"])
        audience = list_audience(lst)
        store.xs([("DELETE FROM list_items WHERE list_id=?", (lid,)), ("DELETE FROM lists WHERE id=?", (lid,))])
        broker.publish(audience, {"kind": "lists"})

    @r.post("/lists/{lid}/items", status_code=201)
    def add_items(lid: str, body: ItemIn, user=U) -> dict:
        lst = get_list_row(lid, user["id"])
        if body.recipe_id:
            add_recipe_to_list(lid, get_visible(user["id"], body.recipe_id), body.servings)
        elif body.name and body.name.strip():
            pos = store.one("SELECT COALESCE(MAX(position), 0) p FROM list_items WHERE list_id=?", (lid,))["p"] + 1
            store.x("INSERT INTO list_items(id, list_id, name, quantity, unit, sources, position, created_at) VALUES (?,?,?,?,?,?,?,?)",
                    (uuid.uuid4().hex, lid, body.name.strip(), body.quantity, body.unit, "[]", pos, now()))
        else:
            raise HTTPException(400, "Indica um artigo ou uma receita.")
        broker.publish(list_audience(lst), {"kind": "list", "id": lid})
        return list_view(lst, user["id"])

    @r.patch("/items/{iid}")
    def patch_item(iid: str, body: ItemPatch, user=U) -> dict:
        item = store.one("SELECT * FROM list_items WHERE id=?", (iid,))
        if not item:
            raise HTTPException(404, "Artigo não encontrado.")
        lst = get_list_row(item["list_id"], user["id"])
        if body.checked is not None:
            store.x("UPDATE list_items SET checked=?, checked_by=? WHERE id=?", (int(body.checked), user["id"] if body.checked else None, iid))
        if body.assign == "me":
            store.x("UPDATE list_items SET assigned_to=? WHERE id=?", (user["id"], iid))
        elif body.assign == "none":
            store.x("UPDATE list_items SET assigned_to=NULL WHERE id=? AND (assigned_to=? OR assigned_to IS NULL)", (iid, user["id"]))
        broker.publish(list_audience(lst), {"kind": "list", "id": lst["id"]})
        return list_view(lst, user["id"])

    @r.delete("/items/{iid}", status_code=204)
    def delete_item(iid: str, user=U):
        item = store.one("SELECT * FROM list_items WHERE id=?", (iid,))
        if not item:
            raise HTTPException(404, "Artigo não encontrado.")
        lst = get_list_row(item["list_id"], user["id"])
        store.x("DELETE FROM list_items WHERE id=?", (iid,))
        broker.publish(list_audience(lst), {"kind": "list", "id": lst["id"]})

    @r.post("/lists/{lid}/clear-checked")
    def clear_checked(lid: str, user=U) -> dict:
        lst = get_list_row(lid, user["id"])
        store.x("DELETE FROM list_items WHERE list_id=? AND checked=1", (lid,))
        broker.publish(list_audience(lst), {"kind": "list", "id": lid})
        return list_view(lst, user["id"])

    # ---------- realtime stream
    @r.get("/stream")
    async def stream(request: Request, user=U):
        sub = broker.subscribe(user["id"])
        _, queue = sub

        async def gen():
            try:
                yield "retry: 3000\n\n"
                while not await request.is_disconnected():
                    try:
                        data = await asyncio.wait_for(queue.get(), timeout=20)
                        yield f"data: {data}\n\n"
                    except asyncio.TimeoutError:
                        yield ": ping\n\n"  # keeps proxies from closing the connection
            finally:
                broker.unsubscribe(user["id"], sub)

        return StreamingResponse(gen(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    r.share_on_import = share_on_import  # used by the import pipeline
    r.compute_summary = compute_summary  # used by the weekly push digest
    return r
