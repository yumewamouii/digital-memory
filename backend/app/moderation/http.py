"""HTTP helpers for moderation errors."""

from __future__ import annotations

from fastapi import HTTPException

from .errors import ModerationError


def moderation_http_exception(exc: ModerationError) -> HTTPException:
    return HTTPException(
        status_code=422,
        detail=[
            {"field": i.field, "code": i.code, "message": i.message}
            for i in exc.issues
        ],
    )
