"""Profanity dictionary lookup with light normalization."""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

_DICT_PATH = Path(__file__).resolve().parent / "data" / "profanity_ru.txt"
_REPEAT_RE = re.compile(r"(.)\1{2,}", re.IGNORECASE)


def normalize_for_profanity(text: str) -> str:
    value = (text or "").lower().replace("ё", "е")
    # Latin lookalikes commonly used to bypass filters
    trans = str.maketrans(
        {
            "a": "а",
            "e": "е",
            "o": "о",
            "p": "р",
            "c": "с",
            "y": "у",
            "x": "х",
            "k": "к",
            "m": "м",
            "t": "т",
            "b": "в",
            "h": "н",
            "@": "а",
            "0": "о",
            "3": "з",
            "6": "б",
        }
    )
    value = value.translate(trans)
    value = _REPEAT_RE.sub(r"\1\1", value)
    value = re.sub(r"[^a-zа-я0-9]+", " ", value)
    return value.strip()


@lru_cache(maxsize=1)
def load_profanity_stems() -> tuple[str, ...]:
    if not _DICT_PATH.exists():
        return ()
    stems: list[str] = []
    for line in _DICT_PATH.read_text(encoding="utf-8").splitlines():
        stem = line.strip().lower().replace("ё", "е")
        if stem and not stem.startswith("#"):
            stems.append(stem)
    return tuple(sorted(set(stems), key=len, reverse=True))


def contains_profanity(text: str) -> bool:
    if not text or not text.strip():
        return False
    normalized = normalize_for_profanity(text)
    if not normalized:
        return False
    compact = normalized.replace(" ", "")
    for stem in load_profanity_stems():
        if stem and (stem in compact or stem in normalized):
            return True
    return False
