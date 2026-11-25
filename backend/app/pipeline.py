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
    owner_id: Optional[str] = None,
) -> Recipe:
    if url:
        url = url.strip()
        existing = store.find_by_source(url, owner_id)
        if existing:
            return existing
        on_status("fetching")
        try:
            mat = gather(url, on_status=on_status)
        except TypeError:  # test doubles with the old signature
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

    from .util import is_bimby
    if is_bimby(draft.title, [s.text for s in draft.steps], draft.tags):
        draft.tags = ["bimby", *[t for t in draft.tags if t.lower() not in ("bimby", "thermomix")]]
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
    store.save_recipe(recipe, owner_id)
    return recipe


def friendly_error(e: Exception, url: str) -> str:
    """Turn network/site errors into something a person can act on (pt-PT)."""
    msg = str(e)
    low = msg.lower()
    site = "Instagram" if "instagram" in url else "TikTok" if "tiktok" in url else "Facebook" if "facebook" in url else "o site"
    if "accounts/login" in low or "login required" in low or "429" in low or "rate-limit" in low or "rate limit" in low:
        return (f"{site} pediu sessão iniciada e não deixou ler a publicação. Abre o Reel, copia a legenda "
                "(⋯ → Copiar) e cola-a no campo de texto da importação.")
    if "private" in low or "not available" in low or "404" in low:
        return "A publicação não está disponível (pode ser privada ou ter sido apagada)."
    if "timed out" in low or "timeout" in low:
        return "O site demorou demasiado a responder. Tenta outra vez daqui a pouco."
    if "anthropic" in low or "api_key" in low or "authentication" in low or "401" in low:
        return "A ligação à IA falhou. Confirma a ANTHROPIC_API_KEY no servidor."
    if any(ch in msg for ch in "ãçõéáí"):
        return msg
    detail = " ".join(msg.split())[:160] or type(e).__name__
    return f"Não foi possível importar esta receita. Tenta outra vez ou cola o texto. (Detalhe: {type(e).__name__}: {detail})"


def run_job(store: Store, job: ImportJob, text: Optional[str] = None,
            on_saved: Callable[[Recipe], None] = lambda r: None,
            on_failed: Callable[[str], None] = lambda e: None, **kw) -> None:
    def status(s: str) -> None:
        job.status = s
        job.updated_at = now()
        store.save_job(job)

    status("queued")  # a worker picked it up

    try:
        recipe = import_recipe(store, url=job.url, text=text, on_status=status, owner_id=job.owner_id, **kw)
        on_saved(recipe)
        job.recipe_id = recipe.id
        status("done")
    except Exception as e:
        log.exception("import failed")
        job.error = friendly_error(e, job.url or "")
        on_failed(job.error)
        status("failed")
