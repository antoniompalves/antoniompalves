"""Glue: URL or pasted text -> SourceMaterial -> RecipeDraft -> saved Recipe."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Callable, Optional

from . import sources
from .extractor import extract_recipe
from .models import ImportJob, Recipe
from .store import Store

log = logging.getLogger(__name__)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def import_recipe(
    store: Store,
    url: Optional[str] = None,
    text: Optional[str] = None,
    on_status: Callable[[str], None] = lambda s: None,
    gather=sources.gather,
    extract=extract_recipe,
) -> Recipe:
    if url:
        url = url.strip()
        existing = store.find_by_source(url)
        if existing:
            return existing
        on_status("fetching")
        mat = gather(url)
    elif text:
        mat = sources.SourceMaterial(url="", platform="text", caption=text)
        # A pasted caption may include a blog link; follow it like we do for videos.
        for link in sources.extract_urls(text)[:2]:
            try:
                mat.linked_pages.append(sources.fetch_web(link))
            except Exception:
                pass
    else:
        raise ValueError("É necessário um URL ou texto.")

    if not mat.has_content():
        raise ValueError("Não foi possível ler nada dessa ligação (publicação privada ou requer sessão iniciada?)")

    on_status("extracting")
    draft = extract(mat)
    if not draft.is_recipe:
        raise ValueError("Não foi encontrada nenhuma receita nessa publicação.")

    recipe = Recipe(
        **draft.model_dump(),
        id=uuid.uuid4().hex,
        source_url=mat.url or (url or ""),
        source_platform=mat.platform,
        author=mat.author,
        thumbnail_url=mat.thumbnail_url or next((p.thumbnail_url for p in mat.linked_pages if p.thumbnail_url), None),
        video_url=mat.video_url,
        created_at=now(),
    )
    store.save_recipe(recipe)
    return recipe


def run_job(store: Store, job: ImportJob, text: Optional[str] = None, **kw) -> None:
    def status(s: str) -> None:
        job.status = s
        store.save_job(job)

    try:
        recipe = import_recipe(store, url=job.url, text=text, on_status=status, **kw)
        job.recipe_id = recipe.id
        status("done")
    except Exception as e:
        log.exception("import failed")
        job.error = str(e)
        status("failed")
