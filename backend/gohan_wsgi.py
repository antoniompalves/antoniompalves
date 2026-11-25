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
os.environ.setdefault("RECIPES_DB", os.path.join(os.path.expanduser("~"), "gohan-data", "recipes.db"))
os.environ.setdefault("UPLOAD_DIR", os.path.join(os.path.dirname(os.environ["RECIPES_DB"]), "uploads"))
os.makedirs(os.environ["UPLOAD_DIR"], exist_ok=True)

from a2wsgi import ASGIMiddleware  # noqa: E402

from app.main import app as asgi_app  # noqa: E402

application = ASGIMiddleware(asgi_app)
