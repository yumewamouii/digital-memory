"""Parse Rutube / VK video URLs into embeddable form."""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

from fastapi import HTTPException


def parse_video_url(raw: str) -> dict:
    """Return {source, url, embed_url} for a supported external video link."""
    url = (raw or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Укажите ссылку на видео")

    if not re.match(r"^https?://", url, re.I):
        url = f"https://{url}"

    parsed = urlparse(url)
    host = (parsed.netloc or "").lower().removeprefix("www.")
    path = parsed.path or ""

    # Rutube: rutube.ru/video/{id}/ or /play/embed/{id}
    if host.endswith("rutube.ru"):
        m = re.search(r"/(?:video|play/embed)/([a-zA-Z0-9]+)", path)
        if not m:
            raise HTTPException(status_code=400, detail="Не удалось разобрать ссылку Rutube")
        vid = m.group(1)
        return {
            "source": "rutube",
            "url": f"https://rutube.ru/video/{vid}/",
            "embed_url": f"https://rutube.ru/play/embed/{vid}",
        }

    # VK Video: vk.com/video{oid}_{id}, vk.com/video-{oid}_{id}, vkvideo.ru/...
    if host.endswith("vk.com") or host.endswith("vk.ru") or host.endswith("vkvideo.ru"):
        oid = None
        vid = None
        m = re.search(r"/video(-?\d+)_(\d+)", path)
        if m:
            oid, vid = m.group(1), m.group(2)
        else:
            qs = parse_qs(parsed.query)
            z = (qs.get("z") or [None])[0]
            if z:
                mz = re.search(r"video(-?\d+)_(\d+)", z)
                if mz:
                    oid, vid = mz.group(1), mz.group(2)
            if not oid:
                oid = (qs.get("oid") or [None])[0]
                vid = (qs.get("id") or [None])[0]
        if not oid or not vid:
            raise HTTPException(status_code=400, detail="Не удалось разобрать ссылку VK Видео")
        return {
            "source": "vk",
            "url": f"https://vk.com/video{oid}_{vid}",
            "embed_url": f"https://vk.com/video_ext.php?oid={oid}&id={vid}&hd=2",
        }

    raise HTTPException(
        status_code=400,
        detail="Поддерживаются ссылки Rutube и VK Видео",
    )
