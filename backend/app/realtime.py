"""Tiny in-process pub/sub for Server-Sent Events.

Each connected client has an asyncio.Queue; publish() may be called from worker threads
(sync endpoints, background jobs), so it hops onto the event loop thread-safely.
"""
from __future__ import annotations

import asyncio
import json
import threading
from collections import defaultdict


class Broker:
    def __init__(self):
        self._subs: dict[str, set[tuple[asyncio.AbstractEventLoop, asyncio.Queue]]] = defaultdict(set)
        self._lock = threading.Lock()

    def subscribe(self, user_id: str) -> tuple[asyncio.AbstractEventLoop, asyncio.Queue]:
        sub = (asyncio.get_running_loop(), asyncio.Queue(maxsize=200))
        with self._lock:
            self._subs[user_id].add(sub)
        return sub

    def unsubscribe(self, user_id: str, sub) -> None:
        with self._lock:
            self._subs[user_id].discard(sub)

    def publish(self, user_ids, event: dict) -> None:
        data = json.dumps(event)
        with self._lock:
            targets = [s for uid in set(user_ids) for s in self._subs.get(uid, ())]
        for loop, queue in targets:
            try:
                loop.call_soon_threadsafe(_put, queue, data)
            except RuntimeError:  # loop closed
                pass


def _put(queue: asyncio.Queue, data: str) -> None:
    if not queue.full():
        queue.put_nowait(data)


broker = Broker()
