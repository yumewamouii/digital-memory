"""HMAC-signed media URLs so private files are not world-readable by path guess."""

from __future__ import annotations

import hashlib
import hmac
import time
from urllib.parse import quote

from ..config import get_settings

DEFAULT_TTL_SECONDS = 60 * 60 * 6  # 6 hours
MEDIA_API_PREFIX = "/api/media"


def _secret() -> bytes:
    return get_settings().secret_key.encode("utf-8")


def normalize_media_rel(path_or_url: str | None) -> str | None:
    """Extract relative path under media/ from stored URL or path."""
    if not path_or_url:
        return None
    value = str(path_or_url).strip()
    if not value:
        return None
    if "://" in value:
        # Absolute URL — leave unsigned; callers should prefer relative storage.
        return None
    if value.startswith(MEDIA_API_PREFIX + "/"):
        value = value[len(MEDIA_API_PREFIX) + 1 :]
        value = value.split("?", 1)[0]
    elif value.startswith("/media/"):
        value = value[len("/media/") :]
    elif value.startswith("media/"):
        value = value[len("media/") :]
    value = value.lstrip("/")
    if not value or ".." in value.split("/"):
        return None
    return value


def sign_media_rel(rel_path: str, *, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> str:
    exp = int(time.time()) + max(60, ttl_seconds)
    msg = f"{rel_path}:{exp}".encode("utf-8")
    sig = hmac.new(_secret(), msg, hashlib.sha256).hexdigest()
    encoded = quote(rel_path, safe="/")
    return f"{MEDIA_API_PREFIX}/{encoded}?exp={exp}&sig={sig}"


def sign_media_url(path_or_url: str | None, *, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> str | None:
    """Turn a stored /media/... path into a signed /api/media/... URL."""
    if not path_or_url:
        return None
    value = str(path_or_url).strip()
    if not value:
        return None
    if value.startswith("http://") or value.startswith("https://"):
        return value
    rel = normalize_media_rel(value)
    if not rel:
        return value
    return sign_media_rel(rel, ttl_seconds=ttl_seconds)


def verify_media_signature(rel_path: str, exp: int | str | None, sig: str | None) -> bool:
    if not rel_path or not sig or exp is None:
        return False
    try:
        exp_i = int(exp)
    except (TypeError, ValueError):
        return False
    if exp_i < int(time.time()):
        return False
    if ".." in rel_path.split("/"):
        return False
    msg = f"{rel_path}:{exp_i}".encode("utf-8")
    expected = hmac.new(_secret(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, str(sig))
