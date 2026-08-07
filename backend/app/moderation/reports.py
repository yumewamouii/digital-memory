"""User reports and auto needs_review transition."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from ..audit.service import log_action
from ..config import get_settings
from ..domain.enums import MemorialStatus, MemorialVisibility, ReportReason
from ..models import MemorialCard, MemorialReport, User


def count_reports(db: Session, memorial_id: int) -> int:
    return (
        db.query(MemorialReport)
        .filter(MemorialReport.memorial_id == memorial_id)
        .count()
    )


def create_memorial_report(
    db: Session,
    user: User,
    card: MemorialCard,
    reason: str,
    message: str | None = None,
    request: Request | None = None,
) -> MemorialReport:
    try:
        reason_code = ReportReason(reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Некорректная причина жалобы") from exc

    if card.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Карточка не найдена")

    existing = (
        db.query(MemorialReport)
        .filter(
            MemorialReport.memorial_id == card.id,
            MemorialReport.reporter_id == user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Вы уже жаловались на эту страницу")

    report = MemorialReport(
        memorial_id=card.id,
        reporter_id=user.id,
        reason=reason_code.value,
        message=(message or "").strip() or None,
    )
    db.add(report)
    db.flush()

    total = count_reports(db, card.id)
    threshold = get_settings().moderation_report_threshold
    auto_hidden = False
    if total >= threshold and card.status != MemorialStatus.NEEDS_REVIEW:
        card.status = MemorialStatus.NEEDS_REVIEW
        # Keep private/unlisted as-is; public leaves catalog via status filter
        if card.visibility == MemorialVisibility.PUBLIC:
            card.visibility = MemorialVisibility.UNLISTED
        auto_hidden = True

    log_action(
        db,
        action="memorial.report",
        entity_type="memorial_report",
        entity_id=report.id,
        user=user,
        request=request,
        new_value={
            "memorial_id": card.id,
            "reason": reason_code.value,
            "total_reports": total,
            "auto_needs_review": auto_hidden,
        },
    )
    db.commit()
    db.refresh(report)
    return report


def resolve_needs_review_card(
    db: Session,
    admin: User,
    card: MemorialCard,
    *,
    approve: bool,
    request: Request | None = None,
) -> MemorialCard:
    if card.status != MemorialStatus.NEEDS_REVIEW and not approve:
        # Allow archiving from needs_review primarily
        pass

    old = {"status": card.status, "visibility": card.visibility}
    if approve:
        card.status = MemorialStatus.PUBLISHED
    else:
        card.status = MemorialStatus.ARCHIVED
        card.visibility = MemorialVisibility.PRIVATE

    log_action(
        db,
        action="memorial.moderation_resolve",
        entity_type="memorial_card",
        entity_id=card.id,
        user=admin,
        request=request,
        old_value=old,
        new_value={
            "status": card.status,
            "visibility": card.visibility,
            "approve": approve,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    db.commit()
    db.refresh(card)
    return card
