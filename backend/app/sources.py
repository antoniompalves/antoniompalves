"""Turn a shared link into raw material (caption, transcript, frames, structured data).

Pipeline per link:
  1. Detect the platform from the URL.
  2. Recipe blogs: look for schema.org/Recipe JSON-LD (most food blogs ship it).
     If found, it is returned as-is and the LLM only normalises it.
  3. Social video (TikTok, Instagram Reels, YouTube Shorts, Facebook, Pinterest...):
     use yt-dlp to read caption/description, author, thumbnail and subtitles.
     If there are no subtitles, download the audio and transcribe it (optional
     faster-whisper). Optionally grab a few keyframes so on-screen text
     ("2 cups flour") can be read by the vision model.
  4. Caption links: many creators write "full recipe at <link in bio>" or put a blog
     URL in the description, so those links are followed once.
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from typing import Any, Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
)

DESKTOP_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/18.0 Safari/605.1.15"
)

PLATFORMS = {
    "tiktok": ("tiktok.com",),
    "instagram": ("instagram.com",),
    "youtube": ("youtube.com", "youtu.be"),
    "facebook": ("facebook.com", "fb.watch"),
    "pinterest": ("pinterest.", "pin.it"),
    "x": ("twitter.com", "x.com"),
}
VIDEO_PLATFORMS = set(PLATFORMS)

URL_RE = re.compile(r"https?://[^\s<>\"')\]]+")


@dataclass
class SourceMaterial:
    url: str
    platform: str
    title: Optional[str] = None
    author: Optional[str] = None
    caption: Optional[str] = None
    transcript: Optional[str] = None
    page_text: Optional[str] = None
    json_ld_recipe: Optional[dict[str, Any]] = None
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    frames_jpeg_b64: list[str] = field(default_factory=list)
    linked_pages: list["SourceMaterial"] = field(default_factory=list)

    def has_content(self) -> bool:
        return bool(
            self.caption or self.transcript or self.page_text or self.json_ld_recipe
            or self.frames_jpeg_b64 or any(p.has_content() for p in self.linked_pages)
        )


def detect_platform(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    for name, needles in PLATFORMS.items():
        if any(n in host for n in needles):
            return name
    return "web"


def extract_urls(text: str) -> list[str]:
    return [u.rstrip(".,;:!") for u in URL_RE.findall(text or "")]


# --------------------------------------------------------------------------- web


def find_json_ld_recipe(html: str) -> Optional[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or tag.get_text() or "")
        except (json.JSONDecodeError, TypeError):
            continue
        found = _walk_for_recipe(data)
        if found:
            return found
    return None


def _walk_for_recipe(node: Any) -> Optional[dict[str, Any]]:
    if isinstance(node, list):
        for item in node:
            r = _walk_for_recipe(item)
            if r:
                return r
    elif isinstance(node, dict):
        t = node.get("@type")
        types = t if isinstance(t, list) else [t]
        if "Recipe" in types:
            return node
        for key in ("@graph", "mainEntity", "itemListElement"):
            if key in node:
                r = _walk_for_recipe(node[key])
                if r:
                    return r
    return None


def visible_text(html: str, limit: int = 30_000) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "noscript", "svg", "nav", "footer", "header", "form"]):
        t.decompose()
    text = re.sub(r"\n\s*\n+", "\n\n", soup.get_text("\n"))
    return text.strip()[:limit]


def og_meta(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    out = {}
    for m in soup.find_all("meta"):
        k = m.get("property") or m.get("name")
        if k and k.startswith(("og:", "twitter:")) and m.get("content"):
            out[k] = m["content"]
    return out


def fetch_web(url: str, client: Optional[httpx.Client] = None) -> SourceMaterial:
    own = client is None
    client = client or httpx.Client(
        follow_redirects=True, timeout=20, headers={"User-Agent": USER_AGENT}
    )
    try:
        resp = client.get(url)
        if resp.status_code in (403, 429):  # some sites block mobile UAs; retry as desktop
            resp = client.get(url, headers={"User-Agent": DESKTOP_UA, "Accept-Language": "en"})
        resp.raise_for_status()
        html = resp.text
    finally:
        if own:
            client.close()
    meta = og_meta(html)
    return SourceMaterial(
        url=str(resp.url),
        platform=detect_platform(str(resp.url)),
        title=meta.get("og:title"),
        caption=meta.get("og:description"),
        thumbnail_url=meta.get("og:image"),
        json_ld_recipe=find_json_ld_recipe(html),
        page_text=visible_text(html),
    )


# ------------------------------------------------------------------------- video


def _ytdlp_info(url: str) -> dict[str, Any]:
    import yt_dlp

    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "noplaylist": True,
    }
    cookies = os.getenv("YTDLP_COOKIES_FILE")  # Instagram often needs a logged-in cookie jar
    if cookies:
        opts["cookiefile"] = cookies
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


def _subtitle_text(info: dict[str, Any]) -> Optional[str]:
    """Fetch the best subtitle track (manual > automatic, English first) as plain text."""
    for key in ("subtitles", "automatic_captions"):
        tracks = info.get(key) or {}
        langs = sorted(tracks, key=lambda l: (not l.startswith("en"), l))
        for lang in langs:
            for fmt in tracks[lang]:
                if fmt.get("ext") in ("vtt", "srt", "json3") and fmt.get("url"):
                    try:
                        raw = httpx.get(fmt["url"], timeout=20).text
                    except httpx.HTTPError:
                        continue
                    return _clean_subs(raw, fmt["ext"])
    return None


def _clean_subs(raw: str, ext: str) -> str:
    if ext == "json3":
        try:
            data = json.loads(raw)
            return " ".join(
                "".join(s.get("utf8", "") for s in ev.get("segs", []))
                for ev in data.get("events", [])
            ).strip()
        except json.JSONDecodeError:
            return ""
    lines, last = [], None
    for line in raw.splitlines():
        line = re.sub(r"<[^>]+>", "", line).strip()
        if not line or "-->" in line or line.isdigit() or line.startswith(("WEBVTT", "Kind:", "Language:")):
            continue
        if line != last:  # auto-captions repeat each line while it scrolls
            lines.append(line)
        last = line
    return " ".join(lines)


def _download_media(url: str, workdir: str) -> Optional[str]:
    import yt_dlp

    opts = {
        "quiet": True,
        "no_warnings": True,
        "outtmpl": os.path.join(workdir, "media.%(ext)s"),
        "format": "best[height<=720]/best",
        "noplaylist": True,
        "max_filesize": 200 * 1024 * 1024,
    }
    if os.getenv("YTDLP_COOKIES_FILE"):
        opts["cookiefile"] = os.environ["YTDLP_COOKIES_FILE"]
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        path = ydl.prepare_filename(info)
    return path if os.path.exists(path) else None


def transcribe(media_path: str) -> Optional[str]:
    """Speech-to-text with faster-whisper if installed (pip install faster-whisper)."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        log.info("faster-whisper not installed; skipping audio transcription")
        return None
    model = WhisperModel(os.getenv("WHISPER_MODEL", "small"), device="auto", compute_type="int8")
    segments, _ = model.transcribe(media_path, vad_filter=True)
    return " ".join(s.text.strip() for s in segments).strip() or None


def keyframes(media_path: str, count: int = 6) -> list[str]:
    """Evenly spaced JPEG frames (base64) so the model can read on-screen text."""
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        return []
    try:
        dur = float(
            subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=nw=1:nk=1", media_path],
                capture_output=True, text=True, timeout=30, check=True,
            ).stdout.strip()
        )
    except (subprocess.SubprocessError, ValueError):
        return []
    frames = []
    outdir = os.path.dirname(media_path)
    for i in range(count):
        t = dur * (i + 0.5) / count
        out = os.path.join(outdir, f"frame{i}.jpg")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", media_path,
             "-frames:v", "1", "-vf", "scale=512:-2", "-q:v", "4", out],
            capture_output=True, timeout=30,
        )
        if os.path.exists(out):
            with open(out, "rb") as f:
                frames.append(base64.b64encode(f.read()).decode())
    return frames


def fetch_video(url: str, platform: str, with_media: bool = True) -> SourceMaterial:
    info = _ytdlp_info(url)
    mat = SourceMaterial(
        url=info.get("webpage_url") or url,
        platform=platform,
        title=info.get("title") or info.get("fulltitle"),
        author=info.get("uploader") or info.get("channel") or info.get("creator"),
        caption=info.get("description"),
        thumbnail_url=info.get("thumbnail"),
        video_url=info.get("url"),
        duration_seconds=int(info["duration"]) if info.get("duration") else None,
        transcript=_subtitle_text(info),
    )
    if with_media and (info.get("duration") or 0) <= int(os.getenv("MAX_VIDEO_SECONDS", "1200")):
        workdir = tempfile.mkdtemp(prefix="recipe-")
        try:
            path = _download_media(url, workdir)
            if path:
                if not mat.transcript:
                    mat.transcript = transcribe(path)
                if os.getenv("EXTRACT_FRAMES", "1") == "1":
                    mat.frames_jpeg_b64 = keyframes(path)
        except Exception as e:  # media download is best-effort
            log.warning("media download failed for %s: %s", url, e)
        finally:
            shutil.rmtree(workdir, ignore_errors=True)
    return mat


# -------------------------------------------------------------------------- main


SKIP_LINK_HOSTS = ("instagram.com", "tiktok.com", "linktr.ee", "amazon.", "amzn.", "ltk.")


def gather(url: str, with_media: bool = True) -> SourceMaterial:
    platform = detect_platform(url)
    if platform in VIDEO_PLATFORMS:
        try:
            mat = fetch_video(url, platform, with_media=with_media)
        except Exception as e:
            log.warning("yt-dlp failed for %s (%s); falling back to page meta", url, e)
            mat = fetch_web(url)
            mat.platform = platform
    else:
        mat = fetch_web(url)
        if mat.json_ld_recipe:
            return mat  # structured data is authoritative; no need to dig further

    # Follow up to two recipe links mentioned in the caption ("full recipe: https://...").
    for link in extract_urls(mat.caption or "")[:5]:
        host = (urlparse(link).hostname or "").lower()
        if any(h in host for h in SKIP_LINK_HOSTS) or detect_platform(link) != "web":
            continue
        try:
            page = fetch_web(link)
        except httpx.HTTPError:
            continue
        if page.json_ld_recipe or "ingredient" in (page.page_text or "").lower():
            mat.linked_pages.append(page)
        if len(mat.linked_pages) >= 2:
            break
    return mat
