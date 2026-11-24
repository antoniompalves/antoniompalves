"""Web Push without third-party push libraries.

- Payload encryption: RFC 8291 (Message Encryption for Web Push) with the aes128gcm
  content coding from RFC 8188.
- Server identification: VAPID, RFC 8292 (ES256-signed JWT).
Works with Apple (iOS/iPadOS 16.4+ for Home Screen web apps, macOS Safari), Google (FCM) and Mozilla.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import struct
import time
from typing import Optional
from urllib.parse import urlparse

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

log = logging.getLogger(__name__)


def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64u_dec(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _hmac(key: bytes, msg: bytes) -> bytes:
    return hmac.new(key, msg, hashlib.sha256).digest()


def public_bytes(key: ec.EllipticCurvePrivateKey | ec.EllipticCurvePublicKey) -> bytes:
    pub = key.public_key() if isinstance(key, ec.EllipticCurvePrivateKey) else key
    return pub.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)


def encrypt(payload: bytes, p256dh: str, auth: str, *, salt: Optional[bytes] = None,
            server_key: Optional[ec.EllipticCurvePrivateKey] = None, record_size: int = 4096) -> bytes:
    """Encrypt a push message body (RFC 8291 §3.4). `salt`/`server_key` are injectable for test vectors."""
    ua_public = b64u_dec(p256dh)
    auth_secret = b64u_dec(auth)
    salt = salt or os.urandom(16)
    as_key = server_key or ec.generate_private_key(ec.SECP256R1())
    as_public = public_bytes(as_key)
    ua_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_public)
    ecdh_secret = as_key.exchange(ec.ECDH(), ua_key)
    # HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0x00 || ua_public || as_public, 32)
    prk_key = _hmac(auth_secret, ecdh_secret)
    ikm = _hmac(prk_key, b"WebPush: info\x00" + ua_public + as_public + b"\x01")[:32]
    prk = _hmac(salt, ikm)
    cek = _hmac(prk, b"Content-Encoding: aes128gcm\x00\x01")[:16]
    nonce = _hmac(prk, b"Content-Encoding: nonce\x00\x01")[:12]
    if len(payload) + 17 > record_size:
        raise ValueError("payload too large for a single record")
    ciphertext = AESGCM(cek).encrypt(nonce, payload + b"\x02", None)  # 0x02 = last-record delimiter
    header = salt + struct.pack("!IB", record_size, len(as_public)) + as_public
    return header + ciphertext


class Vapid:
    """ES256 keypair persisted in the app database so subscriptions survive restarts."""

    def __init__(self, store):
        self.subject = os.getenv("VAPID_SUBJECT", "mailto:admin@localhost")
        row = store.one("SELECT value FROM kv WHERE key='vapid_private_pem'")
        if row:
            self.key = serialization.load_pem_private_key(row["value"].encode(), password=None)
        else:
            self.key = ec.generate_private_key(ec.SECP256R1())
            pem = self.key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                         serialization.NoEncryption()).decode()
            store.x("INSERT OR REPLACE INTO kv(key, value) VALUES ('vapid_private_pem', ?)", (pem,))
        self.public_key = b64u(public_bytes(self.key))  # applicationServerKey for the browser

    def header(self, endpoint: str) -> str:
        u = urlparse(endpoint)
        claims = {"aud": f"{u.scheme}://{u.netloc}", "exp": int(time.time()) + 12 * 3600, "sub": self.subject}
        signing_input = b64u(json.dumps({"typ": "JWT", "alg": "ES256"}, separators=(",", ":")).encode()) + "." + \
            b64u(json.dumps(claims, separators=(",", ":")).encode())
        r, s = decode_dss_signature(self.key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256())))
        jwt = signing_input + "." + b64u(r.to_bytes(32, "big") + s.to_bytes(32, "big"))
        return f"vapid t={jwt}, k={self.public_key}"


def send(vapid: Vapid, sub: dict, message: dict, ttl: int = 86400, urgency: str = "normal",
         client: Optional[httpx.Client] = None) -> int:
    """POST one encrypted message. Returns the push service's HTTP status (201 = accepted,
    404/410 = subscription is gone and should be deleted)."""
    body = encrypt(json.dumps(message, ensure_ascii=False).encode(), sub["p256dh"], sub["auth"])
    headers = {
        "Authorization": vapid.header(sub["endpoint"]),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": str(ttl),
        "Urgency": urgency,
    }
    if message.get("tag"):
        headers["Topic"] = "".join(c for c in message["tag"] if c.isalnum())[:32]  # newer replaces older, while undelivered
    own = client is None
    client = client or httpx.Client(timeout=10)
    try:
        resp = client.post(sub["endpoint"], content=body, headers=headers)
        if resp.status_code >= 400 and resp.status_code not in (404, 410):
            log.warning("push %s -> %s %s", urlparse(sub["endpoint"]).netloc, resp.status_code, resp.text[:200])
        return resp.status_code
    finally:
        if own:
            client.close()
