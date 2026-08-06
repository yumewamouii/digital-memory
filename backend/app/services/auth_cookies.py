"""httpOnly auth cookie helpers (cross-site aware for Pages + API split)."""

from __future__ import annotations

from fastapi import Response

from ..config import get_settings

COOKIE_NAME = "access_token"


def _cookie_flags() -> dict:
    settings = get_settings()
    origins = settings.cors_origin_list
    # Cross-origin SPA (e.g. GitHub Pages → Render API) needs SameSite=None; Secure.
    cross_site = any(
        not (o.startswith("http://localhost") or o.startswith("http://127.0.0.1"))
        for o in origins
    )
    return {
        "httponly": True,
        "secure": cross_site,
        "samesite": "none" if cross_site else "lax",
        "max_age": settings.access_token_expire_minutes * 60,
        "path": "/",
    }


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(COOKIE_NAME, token, **_cookie_flags())


def clear_auth_cookie(response: Response) -> None:
    flags = _cookie_flags()
    response.delete_cookie(
        COOKIE_NAME,
        path=flags["path"],
        secure=flags["secure"],
        httponly=True,
        samesite=flags["samesite"],
    )
