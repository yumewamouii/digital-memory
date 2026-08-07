"""Text field validation (epitaph, biography)."""

from __future__ import annotations

from ..errors import ModerationIssue
from ..heuristics import check_gibberish, check_repeated_chars
from ..profanity import contains_profanity
from ..sanitize import check_no_html_js, collapse_whitespace


class TextContentValidator:
    def validate(self, value: str | None, field: str) -> tuple[str | None, list[ModerationIssue]]:
        issues: list[ModerationIssue] = []
        if value is None:
            return None, issues
        text = collapse_whitespace(str(value))
        if not text:
            return "", issues

        html_issue = check_no_html_js(text, field)
        if html_issue:
            issues.append(html_issue)

        if contains_profanity(text):
            issues.append(
                ModerationIssue(
                    field=field,
                    code="profanity",
                    message="Обнаружена недопустимая лексика. Измените текст.",
                )
            )

        issue = check_repeated_chars(text, field)
        if issue:
            issues.append(issue)
        issue = check_gibberish(text, field)
        if issue:
            issues.append(issue)

        return text, issues
