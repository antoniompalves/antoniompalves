"""SQLite persistence. Recipes are stored as JSON documents plus a few indexed columns."""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from typing import Optional

from .models import ImportJob, Recipe

_lock = threading.Lock()


class Store:
    def __init__(self, path: Optional[str] = None):
        self.path = path or os.getenv("RECIPES_DB", "recipes.db")
        self.db = sqlite3.connect(self.path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        with _lock:
            self.db.executescript(
                """
                CREATE TABLE IF NOT EXISTS recipes (
                    id TEXT PRIMARY KEY,
                    source_url TEXT,
                    title TEXT,
                    created_at TEXT,
                    doc TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS recipes_source ON recipes(source_url);
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    doc TEXT NOT NULL
                );
                """
            )
            self.db.commit()

    # recipes
    def save_recipe(self, r: Recipe) -> None:
        with _lock:
            self.db.execute(
                "INSERT OR REPLACE INTO recipes(id, source_url, title, created_at, doc) VALUES (?,?,?,?,?)",
                (r.id, r.source_url, r.title, r.created_at, r.model_dump_json()),
            )
            self.db.commit()

    def get_recipe(self, rid: str) -> Optional[Recipe]:
        row = self.db.execute("SELECT doc FROM recipes WHERE id=?", (rid,)).fetchone()
        return Recipe.model_validate_json(row["doc"]) if row else None

    def find_by_source(self, url: str) -> Optional[Recipe]:
        row = self.db.execute("SELECT doc FROM recipes WHERE source_url=?", (url,)).fetchone()
        return Recipe.model_validate_json(row["doc"]) if row else None

    def list_recipes(self, q: Optional[str] = None, collection: Optional[str] = None) -> list[Recipe]:
        rows = self.db.execute("SELECT doc FROM recipes ORDER BY created_at DESC").fetchall()
        out = [Recipe.model_validate_json(r["doc"]) for r in rows]
        if collection:
            out = [r for r in out if collection in r.collections]
        if q:
            ql = q.lower()
            out = [
                r for r in out
                if ql in r.title.lower()
                or any(ql in i.name.lower() for i in r.ingredients)
                or any(ql in t for t in r.tags)
                or ql in (r.cuisine or "").lower()
            ]
        return out

    def delete_recipe(self, rid: str) -> bool:
        with _lock:
            cur = self.db.execute("DELETE FROM recipes WHERE id=?", (rid,))
            self.db.commit()
        return cur.rowcount > 0

    # jobs
    def save_job(self, j: ImportJob) -> None:
        with _lock:
            self.db.execute("INSERT OR REPLACE INTO jobs(id, doc) VALUES (?,?)", (j.id, j.model_dump_json()))
            self.db.commit()

    def get_job(self, jid: str) -> Optional[ImportJob]:
        row = self.db.execute("SELECT doc FROM jobs WHERE id=?", (jid,)).fetchone()
        return ImportJob.model_validate_json(row["doc"]) if row else None
