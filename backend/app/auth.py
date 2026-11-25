"""Accounts and sessions: username + password (scrypt), long-lived bearer session tokens.

Sign-up is open only to people holding a group invite code, or the SIGNUP_CODE set on the
server (for the first person). Without SIGNUP_CODE and with no users yet, the very first
sign-up is allowed so a fresh install can be bootstrapped.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import random
import secrets
import uuid
from typing import Optional

from fastapi import Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

from .pipeline import now

COLORS = ["#e2531d", "#d9466f", "#7c5cff", "#2f8fdd", "#16a37f", "#c98a12", "#8f5b3a", "#0f8a9d"]


def hash_password(pw: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt${salt.hex()}${dk.hex()}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        _, salt, dk = stored.split("$")
        test = hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1, dklen=32)
        return hmac.compare_digest(test.hex(), dk)
    except (ValueError, TypeError):
        return False


class SignUp(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=6, max_length=200)
    invite_code: Optional[str] = None
    signup_code: Optional[str] = None


class Login(BaseModel):
    username: str
    password: str


def public_user(row) -> dict:
    return {"id": row["id"], "name": row["name"], "username": row["username"], "color": row["color"]}


def make_auth(store):
    def current_user(
        authorization: Optional[str] = Header(None),
        token: Optional[str] = Query(None, include_in_schema=False),  # EventSource can't send headers
    ) -> dict:
        tok = (authorization or "").removeprefix("Bearer ").strip() or (token or "")
        row = store.one(
            "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=?", (tok,)
        ) if tok else None
        if not row:
            raise HTTPException(401, "Sessão inválida. Inicia sessão novamente.")
        return public_user(row)

    def signup(body: SignUp) -> dict:
        n_users = store.one("SELECT COUNT(*) c FROM users")["c"]
        group = None
        server_code = (os.getenv("SIGNUP_CODE") or "").strip()
        # One field in the app takes either a group invite or the server's sign-up code.
        typed = {c.strip() for c in (body.invite_code, body.signup_code) if c and c.strip()}
        is_server_code = bool(server_code) and server_code in typed
        if body.invite_code and not is_server_code:
            group = store.one("SELECT * FROM groups_ WHERE invite_code=?", (body.invite_code.strip(),))
            if not group:
                raise HTTPException(400, "Código inválido: não corresponde a um convite nem ao código de registo.")
        allowed = group is not None or is_server_code or (not server_code and n_users == 0)
        if not allowed:
            raise HTTPException(403, "Para criar conta precisas de um convite de um grupo.")
        if store.one("SELECT 1 FROM users WHERE username=?", (body.username,)):
            raise HTTPException(409, "Esse nome de utilizador já existe.")
        uid = uuid.uuid4().hex
        store.x(
            "INSERT INTO users(id, username, name, pw_hash, color, created_at) VALUES (?,?,?,?,?,?)",
            (uid, body.username, body.name.strip(), hash_password(body.password), random.choice(COLORS), now()),
        )
        if n_users == 0:  # first account inherits recipes imported before accounts existed
            store.x("UPDATE recipes SET owner_id=? WHERE owner_id IS NULL", (uid,))
        if group:
            store.x("INSERT OR IGNORE INTO members(group_id, user_id, role, joined_at, last_seen) VALUES (?,?,?,?,?)",
                    (group["id"], uid, "member", now(), now()))
            store.x("INSERT INTO activity(id, group_id, user_id, type, recipe_id, data, created_at) VALUES (?,?,?,?,?,?,?)",
                    (uuid.uuid4().hex, group["id"], uid, "joined", None, "{}", now()))
        return _session(uid)

    def login(body: Login) -> dict:
        row = store.one("SELECT * FROM users WHERE username=?", (body.username.strip(),))
        if not row or not verify_password(body.password, row["pw_hash"]):
            raise HTTPException(401, "Utilizador ou palavra-passe incorretos.")
        return _session(row["id"])

    def logout(authorization: Optional[str] = Header(None)) -> None:
        tok = (authorization or "").removeprefix("Bearer ").strip()
        store.x("DELETE FROM sessions WHERE token=?", (tok,))

    def _session(uid: str) -> dict:
        tok = secrets.token_urlsafe(32)
        store.x("INSERT INTO sessions(token, user_id, created_at) VALUES (?,?,?)", (tok, uid, now()))
        return {"token": tok, "user": public_user(store.one("SELECT * FROM users WHERE id=?", (uid,)))}

    return current_user, signup, login, logout
