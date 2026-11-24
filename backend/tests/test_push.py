"""Web Push: RFC 8291 encryption, VAPID signing, and who gets notified about what."""
import base64
import json
import struct

import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi.testclient import TestClient

from app import push
from app.main import create_app
from app.notify import Notifier
from tests.test_social import fake_runner, import_recipe


def test_rfc8291_vector():
    as_priv = ec.derive_private_key(int.from_bytes(push.b64u_dec("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw"), "big"), ec.SECP256R1())
    body = push.encrypt(b"When I grow up, I want to be a watermelon",
                        p256dh="BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
                        auth="BTBZMqHH6r4Tts7J_aSIgg", salt=push.b64u_dec("DGv6ra1nlYgDCS1FRnbzlw"), server_key=as_priv)
    assert push.b64u(body) == ("DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_"
                               "yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN")


def browser_keys():
    ua = ec.generate_private_key(ec.SECP256R1())
    auth = b"0123456789abcdef"
    return ua, {"p256dh": push.b64u(push.public_bytes(ua)), "auth": push.b64u(auth)}, auth


def decrypt(body: bytes, ua: ec.EllipticCurvePrivateKey, auth: bytes) -> bytes:
    """What the browser does (RFC 8291 receiver side)."""
    salt, rs, idlen = body[:16], *struct.unpack("!IB", body[16:21])
    as_public = body[21:21 + idlen]
    ct = body[21 + idlen:]
    secret = ua.exchange(ec.ECDH(), ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), as_public))
    ua_public = push.public_bytes(ua)
    ikm = push._hmac(push._hmac(auth, secret), b"WebPush: info\x00" + ua_public + as_public + b"\x01")[:32]
    prk = push._hmac(salt, ikm)
    cek = push._hmac(prk, b"Content-Encoding: aes128gcm\x00\x01")[:16]
    nonce = push._hmac(prk, b"Content-Encoding: nonce\x00\x01")[:12]
    pt = AESGCM(cek).decrypt(nonce, ct, None)
    assert pt.endswith(b"\x02")
    return pt[:-1]


def test_roundtrip_and_vapid_signature(tmp_path):
    app = create_app(str(tmp_path / "p.db"), weekly=False)
    vapid = app.state.notifier.vapid
    ua, keys, auth = browser_keys()
    msg = {"title": "Olá", "body": "Ação com acentos ✨"}
    body = push.encrypt(json.dumps(msg, ensure_ascii=False).encode(), keys["p256dh"], keys["auth"])
    assert json.loads(decrypt(body, ua, auth)) == msg

    hdr = vapid.header("https://web.push.apple.com/QGuQyavXutnMH")
    t = hdr.split("t=")[1].split(",")[0]
    k = hdr.split("k=")[1]
    h64, c64, s64 = t.split(".")
    claims = json.loads(push.b64u_dec(c64))
    assert claims["aud"] == "https://web.push.apple.com" and claims["sub"].startswith("mailto:")
    sig = push.b64u_dec(s64)
    pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), push.b64u_dec(k))
    pub.verify(encode_dss_signature(int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big")),
               f"{h64}.{c64}".encode(), ec.ECDSA(hashes.SHA256()))  # raises if invalid
    # keys persist across restarts
    assert create_app(str(tmp_path / "p.db"), weekly=False).state.notifier.vapid.public_key == vapid.public_key


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setattr("app.social.UPLOAD_DIR", str(tmp_path / "uploads"))
    sent = []
    status = {"code": 201}

    def fake_send(vapid, sub, message, client=None):
        sent.append((sub["user_id"], message))
        return status["code"]

    def factory(store):
        n = Notifier(store, sender=fake_send)
        n.sync = True
        return n

    app = create_app(str(tmp_path / "t.db"), runner=fake_runner, notifier_factory=factory, weekly=False)
    c = TestClient(app)

    def signup(name, invite=None):
        r = c.post("/auth/signup", json={"name": name, "username": name.lower(), "password": "segredo123", "invite_code": invite})
        return {"Authorization": "Bearer " + r.json()["token"]}, r.json()["user"]["id"]

    def subscribe(h, n=1):
        _, keys, _ = browser_keys()
        assert c.post("/push/subscribe", json={"endpoint": f"https://push.example/{n}", "keys": keys}, headers=h).status_code == 201

    class E: pass
    e = E(); e.c, e.sent, e.status, e.signup, e.subscribe, e.app = c, sent, status, signup, subscribe, app
    return e


def test_group_activity_notifies_others_not_actor(env):
    ana, ana_id = env.signup("Ana")
    g = env.c.post("/groups", json={"name": "Amigos"}, headers=ana).json()
    rui, rui_id = env.signup("Rui", g["invite_code"])
    env.subscribe(ana, 1); env.subscribe(rui, 2)
    env.sent.clear()

    class Shim:  # reuse the import helper from test_social
        client = env.c
    rid = import_recipe(Shim, ana, "Carbonara", group_id=g["id"])
    to = {(u, m["title"]) for u, m in env.sent}
    assert (ana_id, "Receita pronta ✨") in to                      # importer hears their import finished
    assert any(u == rui_id and "partilhou Carbonara" in m["body"] for u, m in env.sent)
    assert not any(u == ana_id and "partilhou" in m["body"] for u, m in env.sent)  # never your own action

    env.sent.clear()
    env.c.put(f"/recipes/{rid}/rating", json={"value": 1}, headers=rui)
    assert env.sent == []                                          # ratings don't buzz phones

    env.c.put("/push/prefs", json={"cooks": False}, headers=ana)
    env.c.post(f"/recipes/{rid}/cooks", json={"note": "Top"}, headers=rui)
    assert env.sent == []                                          # Ana muted cooks
    assert env.c.get("/push/config", headers=ana).json()["prefs"]["cooks"] is False


def test_dead_subscription_removed_and_weekly_digest(env):
    ana, ana_id = env.signup("Ana")
    g = env.c.post("/groups", json={"name": "Amigos"}, headers=ana).json()
    rui, rui_id = env.signup("Rui", g["invite_code"])
    env.subscribe(rui, 7)
    notifier = env.app.state.notifier
    summary = lambda gid: {"new_recipes": 0, "cooks": 0, "open_events": 0, "top_recipe": None}
    assert notifier.weekly_digest(summary) == 0                    # quiet week: no push
    busy = lambda gid: {"new_recipes": 3, "cooks": 2, "open_events": 1, "top_recipe": {"title": "Carbonara"}}
    env.sent.clear()
    assert notifier.weekly_digest(busy) == 1
    assert env.sent[0][1]["body"] == "3 receitas novas, cozinharam 2×, 1 jantar por votar. A mais feita: Carbonara."
    env.status["code"] = 410                                       # device unsubscribed
    notifier.weekly_digest(busy)
    assert env.c.get("/push/config", headers=rui).json()["devices"] == 0


def test_subscribe_validation_and_test_endpoint(env):
    ana, _ = env.signup("Ana")
    assert env.c.post("/push/test", headers=ana).status_code == 400
    bad = env.c.post("/push/subscribe", json={"endpoint": "http://insecure", "keys": {"p256dh": "x", "auth": "y"}}, headers=ana)
    assert bad.status_code == 400
    env.subscribe(ana, 9)
    assert env.c.post("/push/test", headers=ana).json() == {"devices": 1}
    env.c.post("/push/unsubscribe", json={"endpoint": "https://push.example/9"}, headers=ana)
    assert env.c.get("/push/config", headers=ana).json()["devices"] == 0
