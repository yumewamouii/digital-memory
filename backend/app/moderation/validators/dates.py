"""Date validation for memorial cards."""

from __future__ import annotations

from datetime import date

from ...config import get_settings
from ..errors import ModerationIssue


class DateValidator:
    def validate(
        self,
        *,
        birth_date: date | None,
        death_date: date | None,
        today: date | None = None,
    ) -> list[ModerationIssue]:
        issues: list[ModerationIssue] = []
        settings = get_settings()
        now = today or date.today()
        max_age = settings.moderation_max_age_years

        if birth_date and birth_date > now:
            issues.append(
                ModerationIssue(
                    field="birth_date",
                    code="birth_in_future",
                    message="Дата рождения не может быть в будущем.",
                )
            )

        if birth_date and death_date and death_date < birth_date:
            issues.append(
                ModerationIssue(
                    field="death_date",
                    code="death_before_birth",
                    message="Дата смерти не может быть раньше даты рождения.",
                )
            )

        if birth_date:
            end = death_date or now
            years = end.year - birth_date.year
            if (end.month, end.day) < (birth_date.month, birth_date.day):
                years -= 1
            if years > max_age:
                issues.append(
                    ModerationIssue(
                        field="birth_date",
                        code="age_too_high",
                        message=f"Возраст не может превышать {max_age} лет. Проверьте даты.",
                    )
                )

        if death_date and death_date > now:
            issues.append(
                ModerationIssue(
                    field="death_date",
                    code="death_in_future",
                    message="Дата смерти не может быть в будущем.",
                )
            )

        return issues
