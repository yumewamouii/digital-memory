"""Portrait photo validation for brief memorial pages."""

from __future__ import annotations

from ...config import get_settings
from ...services.uploads import sniff_image_mime
from ..errors import ModerationIssue
from ..nsfw import NsfwChecker

ALLOWED_BRIEF_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class PhotoValidator:
    def __init__(self, nsfw: NsfwChecker | None = None) -> None:
        self.nsfw = nsfw or NsfwChecker()

    def validate(self, content: bytes, filename: str | None = None) -> list[ModerationIssue]:
        issues: list[ModerationIssue] = []
        settings = get_settings()
        field = "photo"

        if not content:
            issues.append(
                ModerationIssue(
                    field=field,
                    code="photo_empty",
                    message="Файл фотографии пуст.",
                )
            )
            return issues

        if len(content) > settings.moderation_max_photo_bytes:
            mb = settings.moderation_max_photo_bytes // (1024 * 1024)
            issues.append(
                ModerationIssue(
                    field=field,
                    code="photo_too_large",
                    message=f"Размер фотографии не должен превышать {mb} МБ.",
                )
            )
            return issues

        mime = sniff_image_mime(content)
        if mime not in ALLOWED_BRIEF_MIME:
            issues.append(
                ModerationIssue(
                    field=field,
                    code="photo_format",
                    message="Разрешены только JPG, JPEG, PNG и WEBP.",
                )
            )
            return issues

        if filename:
            lower = filename.lower()
            if not any(lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp")):
                issues.append(
                    ModerationIssue(
                        field=field,
                        code="photo_extension",
                        message="Расширение файла должно быть .jpg, .jpeg, .png или .webp.",
                    )
                )
                return issues

        nsfw_issue = self.nsfw.check_bytes(content, field=field)
        if nsfw_issue:
            issues.append(nsfw_issue)

        return issues
