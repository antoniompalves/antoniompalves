"""Entry point for cPanel "Setup Python App" (Phusion Passenger, WSGI). Set it as the *startup file*.

Use gohan_wsgi.py (not passenger_wsgi.py) as the startup file: cPanel writes its own passenger_wsgi.py
that loads the startup file, and a file loading itself recurses forever.

Passenger speaks WSGI; the app is ASGI (FastAPI), so a2wsgi bridges them. Settings come from the
environment variables set in cPanel and/or a `.env` file next to this one.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def _load_env(path):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env(os.path.join(HERE, ".env"))
# Shared-hosting defaults: no long-lived stream or background scheduler (cron does the weekly summary)
os.environ.setdefault("REALTIME", "poll")
os.environ.setdefault("WEEKLY_DIGEST", "0")
os.environ.setdefault("MEDIA_MODE", "light")          # skip the video when the caption has the recipe
os.environ.setdefault("MEDIA_BUDGET_SECONDS", "75")   # never spend more than this on video frames
os.environ.setdefault("FRAME_COUNT", "4")
os.environ.setdefault("RECIPES_DB", os.path.join(os.path.expanduser("~"), "gohan-data", "recipes.db"))
os.environ.setdefault("UPLOAD_DIR", os.path.join(os.path.dirname(os.environ["RECIPES_DB"]), "uploads"))
os.makedirs(os.environ["UPLOAD_DIR"], exist_ok=True)

# Build the app lazily, inside the process that serves requests. LiteSpeed (and Passenger "smart"
# spawning) import this file once and then fork workers: threads started at import (a2wsgi's event
# loop, thread pools) and the open SQLite connection don't survive the fork, and every request would
# hang without an error. So nothing is created until the first request, and again after a fork.
_state = {"pid": None, "wsgi": None, "asgi": None}


def _get():
    if _state["pid"] != os.getpid():
        from a2wsgi import ASGIMiddleware
        import app.main as main

        # first time in this process: the module's app; after a fork from a process that had one: a fresh app
        asgi = main.app if _state["pid"] is None else main.create_app()
        _state.update(pid=os.getpid(), asgi=asgi, wsgi=ASGIMiddleware(asgi))
    return _state["wsgi"]


def application(environ, start_response):
    return _get()(environ, start_response)


def asgi_app():
    """The FastAPI app for this process (used by cron.py and diagnostics)."""
    _get()
    return _state["asgi"]
