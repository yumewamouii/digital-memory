"""Text sanitization: whitespace and HTML/JS rejection."""

from __future__ import annotations

import re

from .errors import ModerationIssue

_HTML_RE = re.compile(
    r"<\s*/?\s*[a-zA-Z!]|javascript\s*:|on\w+\s*=",
    re.IGNORECASE,
)
_MULTI_SPACE_RE = re.compile(r"[ \t\u00a0]+")
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")


def collapse_whitespace(value: str) -> str:
    text = value.replace("\r\n", "\n").replace("\r", "\n")
    text = _MULTI_SPACE_RE.sub(" ", text)
    text = _MULTI_NEWLINE_RE.sub("\n\n", text)
    return text.strip()


def check_no_html_js(value: str, field: str) -> ModerationIssue | None:
    if not value:
        return None
    if "<" in value or ">" in value or _HTML_RE.search(value):
        return ModerationIssue(
            field=field,
            code="html_forbidden",
            message="В этом поле нельзя использовать HTML или скрипты. Уберите символы < и >.",
        )
    return None
