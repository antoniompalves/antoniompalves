"""SQLite persistence.

Recipes are JSON documents (the extractor's schema) plus indexed columns. Everything social
(users, groups, shares, cooks, variations, ratings, dinner polls, shopping lists, activity)
lives in plain relational tables. One connection guarded by a re-entrant lock: the app is
small, and SQLite serialises writes anyway.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from typing import Any, Iterable, Optional

from .models import ImportJob, Recipe

SCHEMA = """
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY, source_url TEXT, title TEXT, created_at TEXT, doc TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS recipes_source ON recipes(source_url);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, doc TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL COLLATE NOCASE, name TEXT NOT NULL,
    pw_hash TEXT NOT NULL, color TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT);
CREATE TABLE IF NOT EXISTS groups_ (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, invite_code TEXT UNIQUE, created_by TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS members (
    group_id TEXT, user_id TEXT, role TEXT, joined_at TEXT, last_seen TEXT,
    PRIMARY KEY (group_id, user_id)
);
CREATE TABLE IF NOT EXISTS recipe_shares (
    recipe_id TEXT, group_id TEXT, shared_by TEXT, shared_at TEXT, PRIMARY KEY (recipe_id, group_id)
);
CREATE TABLE IF NOT EXISTS user_recipe (
    user_id TEXT, recipe_id TEXT, favorite INTEGER DEFAULT 0, collections TEXT DEFAULT '[]',
    PRIMARY KEY (user_id, recipe_id)
);
CREATE TABLE IF NOT EXISTS cooks (
    id TEXT PRIMARY KEY, recipe_id TEXT, user_id TEXT, note TEXT, photo TEXT, created_at TEXT
);
CREATE INDEX IF NOT EXISTS cooks_recipe ON cooks(recipe_id);
CREATE TABLE IF NOT EXISTS variations (
    id TEXT PRIMARY KEY, recipe_id TEXT, user_id TEXT, title TEXT, body TEXT, created_at TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS ratings (
    recipe_id TEXT, user_id TEXT, value INTEGER, updated_at TEXT, PRIMARY KEY (recipe_id, user_id)
);
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, group_id TEXT, title TEXT, date TEXT, guests INTEGER, created_by TEXT,
    status TEXT, winner_recipe_id TEXT, list_id TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS event_options (event_id TEXT, recipe_id TEXT, position INTEGER, PRIMARY KEY (event_id, recipe_id));
CREATE TABLE IF NOT EXISTS votes (event_id TEXT, user_id TEXT, recipe_id TEXT, PRIMARY KEY (event_id, user_id));
CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY, title TEXT, owner_id TEXT, group_id TEXT, event_id TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS list_items (
    id TEXT PRIMARY KEY, list_id TEXT, name TEXT, quantity TEXT, unit TEXT, sources TEXT DEFAULT '[]',
    checked INTEGER DEFAULT 0, checked_by TEXT, assigned_to TEXT, position INTEGER, created_at TEXT
);
CREATE INDEX IF NOT EXISTS items_list ON list_items(list_id);
CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY, group_id TEXT, user_id TEXT, type TEXT, recipe_id TEXT, data TEXT, created_at TEXT
);
CREATE INDEX IF NOT EXISTS activity_group ON activity(group_id, created_at);
CREATE TABLE IF NOT EXISTS ingredient_map (name_norm TEXT PRIMARY KEY, ref_key TEXT, updated_by TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS paid_prices (
    id TEXT PRIMARY KEY, group_id TEXT, ref_key TEXT, price_per_kg REAL, user_id TEXT, created_at TEXT
);
"""


class Store:
    def __init__(self, path: Optional[str] = None):
        self.path = path or os.getenv("RECIPES_DB", "recipes.db")
        self.db = sqlite3.connect(self.path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        with self.lock:
            self.db.executescript(SCHEMA)
            cols = {r["name"] for r in self.db.execute("PRAGMA table_info(recipes)")}
            if "owner_id" not in cols:  # migration from the single-user version
                self.db.execute("ALTER TABLE recipes ADD COLUMN owner_id TEXT")
            item_cols = {r["name"] for r in self.db.execute("PRAGMA table_info(list_items)")}
            if "paid" not in item_cols:
                self.db.execute("ALTER TABLE list_items ADD COLUMN paid REAL")
            self.db.commit()

    # ------------------------------------------------------------ helpers
    def q(self, sql: str, args: Iterable[Any] = ()) -> list[sqlite3.Row]:
        with self.lock:
            return self.db.execute(sql, tuple(args)).fetchall()

    def one(self, sql: str, args: Iterable[Any] = ()) -> Optional[sqlite3.Row]:
        with self.lock:
            return self.db.execute(sql, tuple(args)).fetchone()

    def x(self, sql: str, args: Iterable[Any] = ()) -> int:
        with self.lock:
            cur = self.db.execute(sql, tuple(args))
            self.db.commit()
            return cur.rowcount

    def xs(self, statements: list[tuple[str, Iterable[Any]]]) -> None:
        """Several writes in one transaction."""
        with self.lock:
            try:
                for sql, args in statements:
                    self.db.execute(sql, tuple(args))
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise

    # ------------------------------------------------------------ recipes
    def save_recipe(self, r: Recipe, owner_id: Optional[str] = None) -> None:
        with self.lock:
            existing = self.one("SELECT owner_id FROM recipes WHERE id=?", (r.id,))
            owner = owner_id or (existing["owner_id"] if existing else None)
            self.x(
                "INSERT OR REPLACE INTO recipes(id, source_url, title, created_at, doc, owner_id) VALUES (?,?,?,?,?,?)",
                (r.id, r.source_url, r.title, r.created_at, r.model_dump_json(), owner),
            )

    def get_recipe(self, rid: str) -> Optional[Recipe]:
        row = self.one("SELECT doc FROM recipes WHERE id=?", (rid,))
        return Recipe.model_validate_json(row["doc"]) if row else None

    def recipe_owner(self, rid: str) -> Optional[str]:
        row = self.one("SELECT owner_id FROM recipes WHERE id=?", (rid,))
        return row["owner_id"] if row else None

    def find_by_source(self, url: str, owner_id: Optional[str] = None) -> Optional[Recipe]:
        if owner_id is None:
            row = self.one("SELECT doc FROM recipes WHERE source_url=?", (url,))
        else:
            row = self.one("SELECT doc FROM recipes WHERE source_url=? AND owner_id=?", (url, owner_id))
        return Recipe.model_validate_json(row["doc"]) if row else None

    def list_recipes(self, q: Optional[str] = None, collection: Optional[str] = None) -> list[Recipe]:
        """Unscoped listing (single-user mode and tests)."""
        rows = self.q("SELECT doc FROM recipes ORDER BY created_at DESC")
        out = [Recipe.model_validate_json(r["doc"]) for r in rows]
        if collection:
            out = [r for r in out if collection in r.collections]
        if q:
            ql = q.lower()
            out = [r for r in out if ql in r.title.lower() or any(ql in i.name.lower() for i in r.ingredients)]
        return out

    def delete_recipe(self, rid: str) -> bool:
        with self.lock:
            n = self.x("DELETE FROM recipes WHERE id=?", (rid,))
            for t in ("recipe_shares", "user_recipe", "cooks", "variations", "ratings", "event_options"):
                self.x(f"DELETE FROM {t} WHERE recipe_id=?", (rid,))
            self.x("DELETE FROM activity WHERE recipe_id=?", (rid,))
        return n > 0

    # ------------------------------------------------------------ jobs
    def save_job(self, j: ImportJob) -> None:
        self.x("INSERT OR REPLACE INTO jobs(id, doc) VALUES (?,?)", (j.id, j.model_dump_json()))

    def get_job(self, jid: str) -> Optional[ImportJob]:
        row = self.one("SELECT doc FROM jobs WHERE id=?", (jid,))
        return ImportJob.model_validate_json(row["doc"]) if row else None


def loads(s: Optional[str], default: Any) -> Any:
    try:
        return json.loads(s) if s else default
    except (json.JSONDecodeError, TypeError):
        return default
