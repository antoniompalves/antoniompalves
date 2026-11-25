"""Push notifications: subscriptions, per-person preferences, fan-out and the weekly summary.

Messages are in pt-PT (tratamento por "tu"). Nobody is notified about their own actions.
Sends run on a small thread pool so API requests never wait on push services.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from . import push
from .pipeline import now

log = logging.getLogger(__name__)
LISBON = ZoneInfo("Europe/Lisbon")

# kind -> (label shown in settings, default on)
KINDS = {
    "recipes": ("Receitas novas e variações no grupo", True),
    "cooks": ("Quando alguém faz uma receita", True),
    "dinners": ("Jantares: novas votações e resultado", True),
    "members": ("Novos membros no grupo", True),
    "imports": ("Quando uma receita que importaste fica pronta", True),
    "weekly": ("Resumo semanal ao domingo", True),
}
ACTIVITY_KIND = {"shared": "recipes", "variation": "recipes", "cooked": "cooks", "event_created": "dinners",
                 "event_decided": "dinners", "joined": "members", "trip_created": "dinners"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS push_subs (
    endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
    user_agent TEXT, created_at TEXT, last_ok TEXT
);
CREATE TABLE IF NOT EXISTS push_prefs (user_id TEXT, kind TEXT, enabled INTEGER, PRIMARY KEY (user_id, kind));
"""


class SubIn(BaseModel):
    endpoint: str = Field(max_length=2000)
    keys: dict[str, str]
    user_agent: Optional[str] = Field(None, max_length=300)


class EndpointIn(BaseModel):
    endpoint: str


class Notifier:
    def __init__(self, store, sender=push.send):
        self.store = store
        with store.lock:
            store.db.executescript(SCHEMA)
            store.db.commit()
        self.vapid = push.Vapid(store)
        self.sender = sender
        self.pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="push")
        self.http = httpx.Client(timeout=10)
        self.sync = False  # tests: deliver inline

    # ------------------------------------------------------------ preferences
    def prefs(self, uid: str) -> dict[str, bool]:
        rows = {r["kind"]: bool(r["enabled"]) for r in self.store.q("SELECT kind, enabled FROM push_prefs WHERE user_id=?", (uid,))}
        return {k: rows.get(k, default) for k, (_, default) in KINDS.items()}

    def wants(self, uid: str, kind: str) -> bool:
        return self.prefs(uid).get(kind, True)

    # ------------------------------------------------------------ delivery
    def to_users(self, user_ids, kind: str, message: dict) -> None:
        targets = [u for u in set(user_ids) if u and self.wants(u, kind)]
        if not targets:
            return
        ph = ",".join("?" * len(targets))
        subs = [dict(r) for r in self.store.q(f"SELECT * FROM push_subs WHERE user_id IN ({ph})", targets)]
        for sub in subs:
            if self.sync:
                self._deliver(sub, message)
            else:
                self.pool.submit(self._deliver, sub, message)

    def _deliver(self, sub: dict, message: dict) -> None:
        try:
            status = self.sender(self.vapid, sub, message, client=self.http)
        except Exception as e:  # network errors: keep the subscription, try next time
            log.warning("push failed: %s", e)
            return
        if status in (404, 410):  # unsubscribed / expired on the device
            self.store.x("DELETE FROM push_subs WHERE endpoint=?", (sub["endpoint"],))
        elif 200 <= status < 300:
            self.store.x("UPDATE push_subs SET last_ok=? WHERE endpoint=?", (now(), sub["endpoint"]))

    # ------------------------------------------------------------ triggers
    def on_activity(self, group_id: str, actor_id: str, type_: str, recipe_id: Optional[str], data: dict) -> None:
        kind = ACTIVITY_KIND.get(type_)
        if not kind:
            return  # ratings etc. stay in the feed only, to avoid noise
        g = self.store.one("SELECT name FROM groups_ WHERE id=?", (group_id,))
        actor = self.store.one("SELECT name FROM users WHERE id=?", (actor_id,))
        who = (actor["name"] if actor else "Alguém").split(" ")[0]
        gname = g["name"] if g else "o grupo"
        title_ = data.get("title") or "uma receita"
        url = f"/#/r/{recipe_id}" if recipe_id else "/#/group"
        if type_ == "shared":
            msg = {"title": gname, "body": f"{who} partilhou {title_}"}
        elif type_ == "variation":
            msg = {"title": gname, "body": f"{who} criou a variação “{data.get('variation')}” de {title_}"}
        elif type_ == "cooked":
            note = f": “{data['note']}”" if data.get("note") else ""
            msg = {"title": f"{who} fez {title_} {'📸' if data.get('photo') else '🍳'}", "body": f"{gname}{note}"}
            if data.get("photo"):
                msg["image"] = data["photo"]
        elif type_ == "event_created":
            msg = {"title": f"Novo jantar em {gname}", "body": f"{who} criou “{data.get('title')}”. Vai votar!"}
            url = f"/#/event/{data.get('event_id')}"
        elif type_ == "event_decided":
            msg = {"title": f"{data.get('title')}: está decidido!", "body": f"Ganhou {data.get('recipe')}. A lista de compras para {data.get('guests')} já está pronta."}
            url = f"/#/event/{data.get('event_id')}"
        elif type_ == "trip_created":
            msg = {"title": f"Nova viagem em {gname} 🧳", "body": f"{who} criou “{data.get('title')}”. Ajuda a planear as refeições!"}
            url = f"/#/trip/{data.get('trip_id')}"
        else:  # joined
            msg = {"title": gname, "body": f"{who} juntou-se ao grupo 👋"}
            url = "/#/group"
        msg.update({"url": url, "tag": f"{type_}-{recipe_id or data.get('event_id') or group_id}"})
        members = [r["user_id"] for r in self.store.q("SELECT user_id FROM members WHERE group_id=?", (group_id,))]
        self.to_users([m for m in members if m != actor_id], kind, msg)

    def on_import_done(self, user_id: str, recipe_id: str, title_: str) -> None:
        self.to_users([user_id], "imports", {"title": "Receita pronta ✨", "body": title_, "url": f"/#/r/{recipe_id}", "tag": f"import-{recipe_id}"})

    def on_import_failed(self, user_id: str, error: str) -> None:
        self.to_users([user_id], "imports", {"title": "Não foi possível importar", "body": error[:180], "url": "/#/", "tag": "import-failed"})

    # ------------------------------------------------------------ weekly summary
    def weekly_digest(self, summary_fn) -> int:
        """Send each group's 7-day summary to members who want it. Returns messages queued."""
        sent = 0
        for g in self.store.q("SELECT id, name FROM groups_"):
            s = summary_fn(g["id"])
            parts = []
            if s["new_recipes"]:
                parts.append(f"{s['new_recipes']} receita{'s' if s['new_recipes'] != 1 else ''} nova{'s' if s['new_recipes'] != 1 else ''}")
            if s["cooks"]:
                parts.append(f"cozinharam {s['cooks']}×")
            if s["open_events"]:
                parts.append(f"{s['open_events']} jantar{'es' if s['open_events'] != 1 else ''} por votar")
            if not parts:
                continue  # quiet weeks don't deserve a notification
            body = ", ".join(parts).capitalize() + "."
            if s.get("top_recipe"):
                body += f" A mais feita: {s['top_recipe']['title']}."
            members = [r["user_id"] for r in self.store.q("SELECT user_id FROM members WHERE group_id=?", (g["id"],))]
            self.to_users(members, "weekly", {"title": f"A semana em {g['name']}", "body": body, "url": "/#/group", "tag": f"weekly-{g['id']}"})
            sent += 1
        return sent

    def run_weekly_if_due(self, summary_fn, force: bool = False) -> int:
        """For cron: send this week's summary once (Sundays from 18:00 Lisbon, or now with force)."""
        t = datetime.now(LISBON)
        week = t.strftime("%G-W%V")
        last = self.store.one("SELECT value FROM kv WHERE key='weekly_sent'")
        if not force and (t.weekday() != 6 or t.hour < 18 or (last and last["value"] == week)):
            return 0
        self.store.x("INSERT OR REPLACE INTO kv(key, value) VALUES ('weekly_sent', ?)", (week,))
        return self.weekly_digest(summary_fn)

    def start_weekly_scheduler(self, summary_fn) -> None:
        """Sundays at 18:00 Lisbon time; remembers the last run so restarts don't double-send."""
        if os.getenv("WEEKLY_DIGEST", "1") != "1":
            return

        def loop():
            while True:
                try:
                    t = datetime.now(LISBON)
                    week = t.strftime("%G-W%V")
                    last = self.store.one("SELECT value FROM kv WHERE key='weekly_sent'")
                    if t.weekday() == 6 and t.hour >= 18 and (not last or last["value"] != week):
                        self.store.x("INSERT OR REPLACE INTO kv(key, value) VALUES ('weekly_sent', ?)", (week,))
                        self.weekly_digest(summary_fn)
                except Exception:
                    log.exception("weekly digest failed")
                time.sleep(600)

        threading.Thread(target=loop, name="weekly-digest", daemon=True).start()

    # ------------------------------------------------------------ API
    def router(self, current_user) -> APIRouter:
        r = APIRouter(prefix="/push")
        U = Depends(current_user)

        @r.get("/config")
        def config(user=U) -> dict:
            n = self.store.one("SELECT COUNT(*) c FROM push_subs WHERE user_id=?", (user["id"],))["c"]
            return {"public_key": self.vapid.public_key, "devices": n, "prefs": self.prefs(user["id"]),
                    "kinds": [{"kind": k, "label": v[0]} for k, v in KINDS.items()]}

        @r.post("/subscribe", status_code=201)
        def subscribe(body: SubIn, user=U) -> dict:
            if not body.endpoint.startswith("https://") or not body.keys.get("p256dh") or not body.keys.get("auth"):
                raise HTTPException(400, "Subscrição inválida.")
            self.store.x("INSERT OR REPLACE INTO push_subs(endpoint, user_id, p256dh, auth, user_agent, created_at) VALUES (?,?,?,?,?,?)",
                         (body.endpoint, user["id"], body.keys["p256dh"], body.keys["auth"], body.user_agent, now()))
            return {"ok": True}

        @r.post("/unsubscribe", status_code=204)
        def unsubscribe(body: EndpointIn, user=U):
            self.store.x("DELETE FROM push_subs WHERE endpoint=? AND user_id=?", (body.endpoint, user["id"]))

        @r.put("/prefs")
        def set_prefs(body: dict[str, bool], user=U) -> dict:
            for k, v in body.items():
                if k in KINDS:
                    self.store.x("INSERT OR REPLACE INTO push_prefs(user_id, kind, enabled) VALUES (?,?,?)", (user["id"], k, int(bool(v))))
            return self.prefs(user["id"])

        @r.post("/test")
        def test(user=U) -> dict:
            n = self.store.one("SELECT COUNT(*) c FROM push_subs WHERE user_id=?", (user["id"],))["c"]
            if not n:
                raise HTTPException(400, "Ainda não ativaste as notificações neste dispositivo.")
            subs = [dict(x) for x in self.store.q("SELECT * FROM push_subs WHERE user_id=?", (user["id"],))]
            msg = {"title": "Gohan 🔔", "body": "As notificações estão a funcionar.", "url": "/#/settings", "tag": "test"}
            for sub in subs:  # bypasses preferences on purpose: it's an explicit test
                self._deliver(sub, msg) if self.sync else self.pool.submit(self._deliver, sub, msg)
            return {"devices": n}

        return r
