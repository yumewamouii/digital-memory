"""Moderation error types."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ModerationIssue:
    field: str
    code: str
    message: str


@dataclass
class ModerationError(Exception):
    issues: list[ModerationIssue] = field(default_factory=list)

    def __str__(self) -> str:
        if not self.issues:
            return "Ошибка модерации"
        return self.issues[0].message
