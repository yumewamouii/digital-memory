"""Local NSFW detection via NudeNet."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from threading import Lock

from ..config import get_settings
from .errors import ModerationIssue

logger = logging.getLogger(__name__)

_LOCK = Lock()
_DETECTOR = None
_LOAD_ATTEMPTED = False
_LOAD_ERROR: str | None = None


def _get_detector():
    global _DETECTOR, _LOAD_ATTEMPTED, _LOAD_ERROR
    with _LOCK:
        if _LOAD_ATTEMPTED:
            return _DETECTOR
        _LOAD_ATTEMPTED = True
        try:
            from nudenet import NudeDetector  # type: ignore

            _DETECTOR = NudeDetector()
            logger.info("NudeNet detector loaded")
        except Exception as exc:  # noqa: BLE001 — surface as moderation failure later
            _DETECTOR = None
            _LOAD_ERROR = str(exc)
            logger.exception("Failed to load NudeNet: %s", exc)
        return _DETECTOR


class NsfwChecker:
    """Classify image bytes; raises ModerationIssue via return value."""

    NSFW_LABELS = frozenset(
        {
            "FEMALE_GENITALIA_EXPOSED",
            "MALE_GENITALIA_EXPOSED",
            "FEMALE_BREAST_EXPOSED",
            "ANUS_EXPOSED",
            "BUTTOCKS_EXPOSED",
        }
    )

    def check_bytes(self, content: bytes, field: str = "photo") -> ModerationIssue | None:
        settings = get_settings()
        if not settings.moderation_nsfw_enabled:
            return None
        detector = _get_detector()
        if detector is None:
            return ModerationIssue(
                field=field,
                code="nsfw_unavailable",
                message="Проверка фотографии временно недоступна. Попробуйте позже или обратитесь в поддержку.",
            )

        suffix = ".jpg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            path = tmp.name
        try:
            detections = detector.detect(path)
        except Exception:  # noqa: BLE001
            logger.exception("NudeNet detect failed")
            return ModerationIssue(
                field=field,
                code="nsfw_failed",
                message="Не удалось проверить фотографию. Попробуйте другой файл.",
            )
        finally:
            try:
                Path(path).unlink(missing_ok=True)
            except OSError:
                pass

        threshold = settings.moderation_nsfw_threshold
        for item in detections or []:
            label = str(item.get("class") or item.get("label") or "")
            score = float(item.get("score") or item.get("confidence") or 0)
            if label in self.NSFW_LABELS and score >= threshold:
                return ModerationIssue(
                    field=field,
                    code="nsfw_photo",
                    message="Фотография не подходит для публикации. Загрузите другое изображение.",
                )
        return None
