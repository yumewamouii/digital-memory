"""Person name (FIO) validation."""

from __future__ import annotations

import re

from ..errors import ModerationIssue
from ..heuristics import check_gibberish, check_repeated_chars
from ..profanity import contains_profanity

_NAME_ALLOWED = re.compile(r"^[A-Za-zА-Яа-яЁё\- ]+$")
_HAS_DIGIT = re.compile(r"\d")


class PersonNameValidator:
    def validate_part(self, value: str | None, field: str, *, required: bool = False) -> list[ModerationIssue]:
        issues: list[ModerationIssue] = []
        if value is None or not str(value).strip():
            if required:
                issues.append(
                    ModerationIssue(
                        field=field,
                        code="required",
                        message="Заполните это поле.",
                    )
                )
            return issues

        text = str(value).strip()
        if _HAS_DIGIT.search(text):
            issues.append(
                ModerationIssue(
                    field=field,
                    code="name_digits",
                    message="В ФИО не должно быть цифр.",
                )
            )
        if not _NAME_ALLOWED.match(text):
            issues.append(
                ModerationIssue(
                    field=field,
                    code="name_special",
                    message="В ФИО допустимы только буквы, пробел и дефис.",
                )
            )
        if contains_profanity(text):
            issues.append(
                ModerationIssue(
                    field=field,
                    code="profanity",
                    message="В ФИО обнаружена недопустимая лексика. Исправьте имя.",
                )
            )
        issue = check_repeated_chars(text, field)
        if issue:
            issues.append(issue)
        issue = check_gibberish(text, field)
        if issue:
            issues.append(issue)
        return issues

    def validate(
        self,
        *,
        first_name: str | None,
        last_name: str | None,
        middle_name: str | None = None,
    ) -> list[ModerationIssue]:
        issues: list[ModerationIssue] = []
        issues.extend(self.validate_part(last_name, "last_name", required=True))
        issues.extend(self.validate_part(first_name, "first_name", required=True))
        if middle_name is not None and str(middle_name).strip():
            issues.extend(self.validate_part(middle_name, "middle_name", required=False))
        return issues
