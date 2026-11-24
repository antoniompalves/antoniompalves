"""HTTP API used by the iOS app and its Share Extension.

POST /imports         {url} or {text}  -> 202 job (poll GET /imports/{id})
GET  /recipes?q=&collection=
GET/PATCH/DELETE /recipes/{id}
GET  /recipes/{id}/scaled?servings=N
GET  /grocery-list?ids=a,b,c
"""
from __future__ import annotations

import os
import re
import uuid
from fractions import Fraction
from typing import Optional

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException

from .models import ImportJob, ImportRequest, Recipe, RecipePatch
from .pipeline import now, run_job
from .store import Store

app = FastAPI(title="Recipe Importer")
store = Store()


def auth(authorization: Optional[str] = Header(None)) -> None:
    token = os.getenv("API_TOKEN")
    if token and authorization != f"Bearer {token}":
        raise HTTPException(401, "bad token")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/imports", status_code=202, dependencies=[Depends(auth)])
def create_import(req: ImportRequest, bg: BackgroundTasks) -> ImportJob:
    if not req.url and not req.text:
        raise HTTPException(400, "url or text required")
    job = ImportJob(id=uuid.uuid4().hex, status="queued", url=req.url, created_at=now())
    store.save_job(job)
    bg.add_task(run_job, store, job, req.text)
    return job


@app.get("/imports/{jid}", dependencies=[Depends(auth)])
def get_import(jid: str) -> ImportJob:
    job = store.get_job(jid)
    if not job:
        raise HTTPException(404)
    return job


@app.get("/recipes", dependencies=[Depends(auth)])
def list_recipes(q: Optional[str] = None, collection: Optional[str] = None) -> list[Recipe]:
    return store.list_recipes(q, collection)


@app.get("/recipes/{rid}", dependencies=[Depends(auth)])
def get_recipe(rid: str) -> Recipe:
    r = store.get_recipe(rid)
    if not r:
        raise HTTPException(404)
    return r


@app.patch("/recipes/{rid}", dependencies=[Depends(auth)])
def patch_recipe(rid: str, patch: RecipePatch) -> Recipe:
    r = get_recipe(rid)
    updated = r.model_copy(update=patch.model_dump(exclude_none=True))
    store.save_recipe(updated)
    return updated


@app.delete("/recipes/{rid}", status_code=204, dependencies=[Depends(auth)])
def delete_recipe(rid: str):
    if not store.delete_recipe(rid):
        raise HTTPException(404)


_NUM = re.compile(r"^\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)\s*$")


def scale_quantity(q: Optional[str], factor: Fraction) -> Optional[str]:
    """Scale '1 1/2', '3/4', '200', '2.5'. Leaves ranges/words ('a pinch') untouched."""
    if not q or not _NUM.match(q):
        return q
    s = q.strip()
    if " " in s:
        whole, frac = s.split()
        val = int(whole) + Fraction(frac)
    else:
        val = Fraction(s)
    out = val * factor
    if out.denominator == 1:
        return str(out.numerator)
    if out.denominator in (2, 3, 4, 8):
        w, rem = divmod(out.numerator, out.denominator)
        return f"{w} {rem}/{out.denominator}" if w else f"{rem}/{out.denominator}"
    return f"{float(out):.2f}".rstrip("0").rstrip(".")


@app.get("/recipes/{rid}/scaled", dependencies=[Depends(auth)])
def scaled(rid: str, servings: int) -> Recipe:
    r = get_recipe(rid)
    if not r.servings or servings <= 0:
        raise HTTPException(400, "recipe has no servings to scale from")
    f = Fraction(servings, r.servings)
    ings = [i.model_copy(update={"quantity": scale_quantity(i.quantity, f)}) for i in r.ingredients]
    return r.model_copy(update={"ingredients": ings, "servings": servings})


@app.get("/grocery-list", dependencies=[Depends(auth)])
def grocery_list(ids: str) -> list[dict]:
    merged: dict[tuple[str, str], dict] = {}
    for rid in ids.split(","):
        r = store.get_recipe(rid.strip())
        if not r:
            continue
        for i in r.ingredients:
            key = (i.name.lower().strip(), (i.unit or "").lower())
            item = merged.setdefault(key, {"name": i.name, "unit": i.unit, "quantities": [], "recipes": []})
            if i.quantity:
                item["quantities"].append(i.quantity)
            if r.title not in item["recipes"]:
                item["recipes"].append(r.title)
    return sorted(merged.values(), key=lambda x: x["name"].lower())
