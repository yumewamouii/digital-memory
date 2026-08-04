"""Audit log writer."""

from __future__ import annotations

import json
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from ..models import AuditLog, User


def _client_ip(request: Request | None) -> str | None:
    if not request:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _serialize(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, ensure_ascii=False, default=str)
    except TypeError:
        return str(value)


def log_action(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str | int | None = None,
    user: User | None = None,
    request: Request | None = None,
    old_value: Any = None,
    new_value: Any = None,
) -> AuditLog:
    row = AuditLog(
        user_id=user.id if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        ip_address=_client_ip(request),
        old_value=_serialize(old_value),
        new_value=_serialize(new_value),
    )
    db.add(row)
    db.flush()
    return row
