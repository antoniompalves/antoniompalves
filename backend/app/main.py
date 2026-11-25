"""HTTP API for the web app, the iOS app and the iOS Shortcut.

Accounts:   POST /auth/signup  /auth/login  /auth/logout,  GET /me
Imports:    POST /imports {url|text, group_id?} -> job (poll GET /imports/{id}), POST /imports/shortcut
Recipes:    GET /recipes?scope=all|mine|<group_id>, GET/PATCH/DELETE /recipes/{id}, /scaled, /shares,
            /cooks, /variations, /rating, /social
Groups:     /groups, /invites/{code}, /groups/join, /groups/{id}/activity|summary|ranking|events
Dinners:    /events/{id}, /vote, /close
Lists:      /lists, /lists/{id}/items, /items/{id}
Realtime:   GET /stream (Server-Sent Events)
"""
from __future__ import annotations

import os
import uuid
from typing import Optional

from fastapi import BackgroundTasks, Body, Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from . import social
from .auth import make_auth
from .notify import Notifier
from . import mapper
from .models import ImportJob, ImportRequest
from .pipeline import now, run_job
from .realtime import broker
from .sources import extract_urls
from .store import Store
from .util import scale_quantity  # noqa: F401  (re-exported for tests/back-compat)

def create_app(db_path: Optional[str] = None, runner=run_job, notifier_factory=Notifier, weekly: bool = True) -> FastAPI:
    docs = os.getenv("ENABLE_DOCS") == "1"  # API docs off in production unless asked for
    app = FastAPI(title="Gohan", docs_url="/docs" if docs else None, redoc_url=None, openapi_url="/openapi.json" if docs else None)
    store = Store(db_path)
    current_user, signup, login, logout = make_auth(store)
    U = Depends(current_user)

    STATIC = os.path.join(os.path.dirname(__file__), "static")
    app.mount("/static", StaticFiles(directory=STATIC), name="static")
    os.makedirs(social.UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=social.UPLOAD_DIR), name="uploads")


    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(os.path.join(STATIC, "index.html"), headers={"Cache-Control": "no-cache"})


    @app.get("/sw.js", include_in_schema=False)
    def service_worker():
        # Served from the root so the worker's scope covers the whole app.
        return FileResponse(os.path.join(STATIC, "sw.js"), media_type="text/javascript",
                            headers={"Cache-Control": "no-cache"})


    @app.get("/health")
    def health():
        return {"ok": True}


    app.post("/auth/signup", status_code=201)(signup)
    app.post("/auth/login")(login)
    app.post("/auth/logout", status_code=204)(logout)

    notifier = notifier_factory(store)
    router = social.make_router(store, current_user, notifier)
    app.include_router(router)
    app.include_router(notifier.router(current_user))
    if weekly:
        notifier.start_weekly_scheduler(router.compute_summary)


    def _start_import(req: ImportRequest, bg: BackgroundTasks, user: dict) -> ImportJob:
        if not req.url and not req.text:
            raise HTTPException(400, "É necessário um URL ou texto.")
        job = ImportJob(id=uuid.uuid4().hex, status="queued", url=req.url, created_at=now(),
                        owner_id=user["id"], group_id=req.group_id)
        store.save_job(job)

        def on_saved(recipe):
            router.share_on_import(user["id"], recipe, req.group_id)
            broker.publish([user["id"]], {"kind": "import", "id": job.id})
            notifier.on_import_done(user["id"], recipe.id, recipe.title)
            if os.getenv("INGREDIENT_LLM_MAPPING", "1") == "1":
                mapper.map_with_llm(store, [i.name for i in recipe.ingredients])

        def on_failed(error):
            notifier.on_import_failed(user["id"], error)

        bg.add_task(runner, store, job, req.text, on_saved, on_failed)
        return job


    @app.post("/imports", status_code=202)
    def create_import(req: ImportRequest, bg: BackgroundTasks, user=U) -> ImportJob:
        return _start_import(req, bg, user)


    @app.post("/imports/shortcut", response_class=PlainTextResponse)
    def shortcut_import(bg: BackgroundTasks, input: str = Body(..., embed=True), user=U) -> str:
        """For the iOS Shortcut: takes whatever the share sheet passed (URL or text) and
        replies with a one-line message for the notification."""
        urls = extract_urls(input)
        req = ImportRequest(url=urls[0]) if urls and len(input) < 300 else ImportRequest(text=input)
        _start_import(req, bg, user)
        return "A guardar a receita no Gohan…"


    @app.get("/imports/{jid}")
    def get_import(jid: str, user=U) -> ImportJob:
        job = store.get_job(jid)
        if not job or (job.owner_id and job.owner_id != user["id"]):
            raise HTTPException(404, "Não encontrado.")
        return job

    app.state.store = store
    app.state.notifier = notifier
    return app


app = create_app()
