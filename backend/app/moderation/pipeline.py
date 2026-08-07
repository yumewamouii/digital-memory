"""Orchestrates brief-page moderation checks."""

from __future__ import annotations

from datetime import date
from typing import Any

from ..config import get_settings
from .errors import ModerationError, ModerationIssue
from .validators.dates import DateValidator
from .validators.name import PersonNameValidator
from .validators.photo import PhotoValidator
from .validators.text import TextContentValidator


def _as_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    if hasattr(value, "year") and hasattr(value, "month") and hasattr(value, "day"):
        try:
            return date(int(value.year), int(value.month), int(value.day))
        except (TypeError, ValueError):
            return None
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _dedupe(issues: list[ModerationIssue]) -> list[ModerationIssue]:
    seen: set[tuple[str, str]] = set()
    unique: list[ModerationIssue] = []
    for issue in issues:
        key = (issue.field, issue.code)
        if key in seen:
            continue
        seen.add(key)
        unique.append(issue)
    return unique


def validate_brief_card_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Validate and sanitize brief card fields. Raises ModerationError. Returns sanitized dict."""
    settings = get_settings()
    if not settings.moderation_enabled:
        return data

    page_kind = str(data.get("page_kind") or "brief").strip().lower()
    if page_kind != "brief":
        return data

    issues: list[ModerationIssue] = []
    sanitized = dict(data)

    issues.extend(
        PersonNameValidator().validate(
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            middle_name=data.get("middle_name"),
        )
    )

    text_validator = TextContentValidator()
    for field in ("epitaph", "biography"):
        if field not in data:
            continue
        cleaned, field_issues = text_validator.validate(data.get(field), field)
        issues.extend(field_issues)
        sanitized[field] = cleaned

    issues.extend(
        DateValidator().validate(
            birth_date=_as_date(data.get("birth_date")),
            death_date=_as_date(data.get("death_date")),
        )
    )

    unique = _dedupe(issues)
    if unique:
        raise ModerationError(issues=unique)
    return sanitized


def validate_brief_photo(content: bytes, filename: str | None = None) -> None:
    settings = get_settings()
    if not settings.moderation_enabled:
        return
    issues = PhotoValidator().validate(content, filename=filename)
    if issues:
        raise ModerationError(issues=_dedupe(issues))
