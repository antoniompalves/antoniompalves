"""Scheduled jobs for shared hosting (cPanel → Cron Jobs). Uses the same settings as the app.

  python cron.py weekly          # send the Sunday summary (runs only Sundays from 18:00, once a week)
  python cron.py weekly --force  # send it now
  python cron.py backup          # consistent copy of the database + photos into gohan-data/backups (keeps 14)
"""
import os
import sys
import tarfile
import time

import gohan_wsgi  # noqa: F401  (loads .env and the same defaults as the web app)


def weekly(force: bool) -> None:
    from app.auth import make_auth
    from app.notify import Notifier
    from app.social import make_router
    from app.store import Store

    store = Store(os.environ["RECIPES_DB"])
    notifier = Notifier(store)
    notifier.sync = True  # deliver before the process exits
    router = make_router(store, make_auth(store)[0], notifier)
    n = notifier.run_weekly_if_due(router.compute_summary, force=force)
    print(f"weekly: {n} group summaries sent" if n else "weekly: nothing to send now")


def backup() -> None:
    import sqlite3

    db = os.environ["RECIPES_DB"]
    data = os.path.dirname(db)
    out_dir = os.path.join(data, "backups")
    os.makedirs(out_dir, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M")
    snap = os.path.join(out_dir, f"recipes-{stamp}.db")
    src, dst = sqlite3.connect(db), sqlite3.connect(snap)
    src.backup(dst)
    dst.close(); src.close()
    archive = os.path.join(out_dir, f"gohan-{stamp}.tar.gz")
    with tarfile.open(archive, "w:gz") as tar:
        tar.add(snap, arcname="recipes.db")
        uploads = os.environ.get("UPLOAD_DIR")
        if uploads and os.path.isdir(uploads):
            tar.add(uploads, arcname="uploads")
    os.remove(snap)
    old = sorted(f for f in os.listdir(out_dir) if f.startswith("gohan-") and f.endswith(".tar.gz"))[:-14]
    for f in old:
        os.remove(os.path.join(out_dir, f))
    print(archive)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "weekly":
        weekly("--force" in sys.argv)
    elif cmd == "backup":
        backup()
    else:
        print(__doc__)
        sys.exit(1)
