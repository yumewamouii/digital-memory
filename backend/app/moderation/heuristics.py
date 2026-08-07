"""Shared text heuristics: repeats and gibberish."""

from __future__ import annotations

import re

from ..config import get_settings
from .errors import ModerationIssue

_VOWELS = set("аеёиоуыэюяaeiouy")
_KEYBOARD_FRAGMENTS = (
    "asdf",
    "qwer",
    "qwerty",
    "zxcv",
    "йцук",
    "йцукен",
    "фыва",
    "ячсм",
    "лолол",
    "хахаха",
    "ааааа",
    "ооооо",
    "uuuu",
    "aaaa",
)


def _max_repeat(settings_max: int | None = None) -> int:
    return settings_max if settings_max is not None else get_settings().moderation_max_repeat_chars


def check_repeated_chars(value: str, field: str, *, max_repeat: int | None = None) -> ModerationIssue | None:
    if not value:
        return None
    limit = _max_repeat(max_repeat)
    pattern = re.compile(rf"(.)\1{{{limit},}}", re.IGNORECASE)
    if pattern.search(value):
        return ModerationIssue(
            field=field,
            code="repeated_chars",
            message=f"Слишком много одинаковых букв подряд. Исправьте поле.",
        )
    return None


def check_gibberish(value: str, field: str) -> ModerationIssue | None:
    if not value:
        return None
    compact = re.sub(r"\s+", "", value.lower().replace("ё", "е"))
    if len(compact) < 4:
        return None

    for frag in _KEYBOARD_FRAGMENTS:
        if frag in compact:
            return ModerationIssue(
                field=field,
                code="gibberish",
                message="Похоже на бессмысленный набор символов. Введите осмысленный текст.",
            )

    # Repeated short syllable: лололол, ахахаха
    if re.search(r"(.{2,4})\1{2,}", compact):
        return ModerationIssue(
            field=field,
            code="gibberish",
            message="Похоже на бессмысленный набор символов. Введите осмысленный текст.",
        )

    letters = [ch for ch in compact if ch.isalpha()]
    if len(letters) >= 8:
        vowels = sum(1 for ch in letters if ch in _VOWELS)
        ratio = vowels / len(letters)
        if ratio < 0.15 or ratio > 0.85:
            return ModerationIssue(
                field=field,
                code="gibberish",
                message="Похоже на бессмысленный набор символов. Введите осмысленный текст.",
            )

    return None
