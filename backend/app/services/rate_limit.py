"""Simple in-process rate limiter (per-IP). Good enough for single-worker deploys."""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_buckets: dict[str, deque[float]] = defaultdict(deque)


def client_ip(request: Request | None) -> str:
    if request is None:
        return "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def enforce_rate_limit(
    key: str,
    *,
    max_calls: int,
    window_seconds: int,
    detail: str = "Слишком много запросов. Попробуйте позже.",
) -> None:
    now = time.time()
    bucket = _buckets[key]
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= max_calls:
        raise HTTPException(status_code=429, detail=detail)
    bucket.append(now)
