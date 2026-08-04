"""Memorial card use-cases."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..audit.service import log_action
from ..domain.enums import ClaimStatus, MemorialStatus, MemorialVisibility, PermissionCode
from ..models import MemorialCard, OrganizationMember, OwnershipClaim, User
from ..rbac import service as rbac_service
from ..schemas import MemorialCardCreate, MemorialCardOut, MemorialCardUpdate
from . import policies


def _card_snapshot(card: MemorialCard) -> dict:
    return {
        "id": card.id,
        "owner_id": card.owner_id,
        "created_by": card.created_by,
        "organization_id": card.organization_id,
        "first_name": card.first_name,
        "last_name": card.last_name,
        "middle_name": card.middle_name,
        "visibility": card.visibility,
        "status": card.status,
        "deleted_at": card.deleted_at.isoformat() if card.deleted_at else None,
    }


def enrich_card(db: Session, user: User | None, card: MemorialCard) -> MemorialCardOut:
    data = MemorialCardOut.model_validate(card)
    if not user:
        return data
    return data.model_copy(
        update={
            "can_edit": policies.can_edit_memorial(db, user, card),
            "can_delete": policies.can_delete_memorial(db, user, card),
            "can_transfer": policies.can_transfer_memorial(db, user, card),
            "can_assign_owner": policies.can_assign_owner(db, user, card),
        }
    )


def create_card(
    db: Session,
    user: User,
    payload: MemorialCardCreate,
    request: Request | None = None,
) -> MemorialCard:
    org_id = payload.organization_id
    owner_id = payload.owner_id or user.id

    if org_id is not None:
        if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_CREATE_ORG):
            raise HTTPException(status_code=403, detail="Нет права создавать карточки организации")
        membership = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == "active",
            )
            .first()
        )
        if not membership and not rbac_service.user_has_permission(
            db, user, PermissionCode.ORG_MANAGE_ANY
        ):
            raise HTTPException(status_code=403, detail="Вы не состоите в этой организации")
    else:
        if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_CREATE):
            raise HTTPException(status_code=403, detail="Нет права создавать карточки")

    if payload.owner_id and payload.owner_id != user.id:
        if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_ASSIGN_OWNER):
            raise HTTPException(status_code=403, detail="Нет права назначать владельца")
        if not db.query(User).filter(User.id == payload.owner_id).first():
            raise HTTPException(status_code=404, detail="Владелец не найден")

    card = MemorialCard(
        owner_id=owner_id,
        created_by=user.id,
        organization_id=org_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        middle_name=payload.middle_name,
        birth_date=payload.birth_date,
        death_date=payload.death_date,
        biography=payload.biography,
        photo_url=payload.photo_url,
        cemetery_name=payload.cemetery_name,
        cemetery_location=payload.cemetery_location,
        visibility=payload.visibility or MemorialVisibility.PRIVATE,
        status=payload.status or MemorialStatus.PUBLISHED,
    )
    db.add(card)
    db.flush()
    log_action(
        db,
        action="memorial.create",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def list_accessible_cards(db: Session, user: User, *, include_deleted: bool = False) -> list[MemorialCard]:
    q = db.query(MemorialCard)
    if not include_deleted:
        q = q.filter(MemorialCard.deleted_at.is_(None))

    if rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_READ_ANY):
        return q.order_by(MemorialCard.created_at.desc()).all()

    org_ids = [
        m.organization_id
        for m in db.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == "active",
        )
        .all()
    ]
    clauses = [MemorialCard.owner_id == user.id]
    if org_ids:
        clauses.append(MemorialCard.organization_id.in_(org_ids))
    return q.filter(or_(*clauses)).order_by(MemorialCard.created_at.desc()).all()


def search_public_cards(
    db: Session,
    *,
    query: str | None = None,
    limit: int = 50,
) -> list[MemorialCard]:
    q = db.query(MemorialCard).filter(
        MemorialCard.deleted_at.is_(None),
        MemorialCard.visibility == MemorialVisibility.PUBLIC,
        MemorialCard.status == MemorialStatus.PUBLISHED,
    )
    if query:
        like = f"%{query.strip()}%"
        q = q.filter(
            or_(
                MemorialCard.first_name.ilike(like),
                MemorialCard.last_name.ilike(like),
                MemorialCard.middle_name.ilike(like),
                MemorialCard.cemetery_name.ilike(like),
            )
        )
    return q.order_by(MemorialCard.created_at.desc()).limit(limit).all()


def get_card_or_404(db: Session, card_id: int, *, include_deleted: bool = False) -> MemorialCard:
    q = db.query(MemorialCard).filter(MemorialCard.id == card_id)
    if not include_deleted:
        q = q.filter(MemorialCard.deleted_at.is_(None))
    card = q.first()
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")
    return card


def update_card(
    db: Session,
    user: User,
    card: MemorialCard,
    payload: MemorialCardUpdate,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    old = _card_snapshot(card)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(card, field, value)
    db.flush()
    log_action(
        db,
        action="memorial.update",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def soft_delete_card(
    db: Session,
    user: User,
    card: MemorialCard,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_delete_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на удаление")
    old = _card_snapshot(card)
    card.deleted_at = datetime.now(timezone.utc)
    card.deleted_by = user.id
    db.flush()
    log_action(
        db,
        action="memorial.soft_delete",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def restore_card(
    db: Session,
    user: User,
    card: MemorialCard,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_restore_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на восстановление")
    old = _card_snapshot(card)
    card.deleted_at = None
    card.deleted_by = None
    db.flush()
    log_action(
        db,
        action="memorial.restore",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def transfer_ownership(
    db: Session,
    user: User,
    card: MemorialCard,
    new_owner_id: int,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_transfer_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на передачу владения")
    new_owner = db.query(User).filter(User.id == new_owner_id).first()
    if not new_owner:
        raise HTTPException(status_code=404, detail="Новый владелец не найден")
    old = _card_snapshot(card)
    card.owner_id = new_owner_id
    db.flush()
    log_action(
        db,
        action="memorial.transfer_ownership",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def assign_owner(
    db: Session,
    user: User,
    card: MemorialCard,
    owner_id: int,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_assign_owner(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав назначать владельца")
    if not db.query(User).filter(User.id == owner_id).first():
        raise HTTPException(status_code=404, detail="Владелец не найден")
    old = _card_snapshot(card)
    card.owner_id = owner_id
    db.flush()
    log_action(
        db,
        action="memorial.assign_owner",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def create_ownership_claim(
    db: Session,
    user: User,
    card: MemorialCard,
    message: str | None,
    request: Request | None = None,
) -> OwnershipClaim:
    if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_CLAIM_REQUEST):
        raise HTTPException(status_code=403, detail="Нет права подавать запрос")
    if card.owner_id == user.id:
        raise HTTPException(status_code=400, detail="Вы уже владелец карточки")
    existing = (
        db.query(OwnershipClaim)
        .filter(
            OwnershipClaim.memorial_id == card.id,
            OwnershipClaim.requester_id == user.id,
            OwnershipClaim.status == ClaimStatus.PENDING,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Запрос уже отправлен")

    claim = OwnershipClaim(
        memorial_id=card.id,
        requester_id=user.id,
        message=message,
        status=ClaimStatus.PENDING,
    )
    db.add(claim)
    db.flush()
    log_action(
        db,
        action="memorial.claim_request",
        entity_type="ownership_claim",
        entity_id=claim.id,
        user=user,
        request=request,
        new_value={"memorial_id": card.id, "requester_id": user.id, "message": message},
    )
    db.commit()
    db.refresh(claim)
    return claim


def review_ownership_claim(
    db: Session,
    user: User,
    claim: OwnershipClaim,
    approve: bool,
    request: Request | None = None,
) -> OwnershipClaim:
    card = get_card_or_404(db, claim.memorial_id)
    if not policies.can_review_claim(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на рассмотрение запроса")
    if claim.status != ClaimStatus.PENDING:
        raise HTTPException(status_code=400, detail="Запрос уже рассмотрен")

    old = {"status": claim.status, "owner_id": card.owner_id}
    claim.reviewed_by = user.id
    claim.reviewed_at = datetime.now(timezone.utc)
    if approve:
        claim.status = ClaimStatus.APPROVED
        card.owner_id = claim.requester_id
    else:
        claim.status = ClaimStatus.REJECTED
    db.flush()
    log_action(
        db,
        action="memorial.claim_review",
        entity_type="ownership_claim",
        entity_id=claim.id,
        user=user,
        request=request,
        old_value=old,
        new_value={
            "status": claim.status,
            "owner_id": card.owner_id,
            "approve": approve,
        },
    )
    db.commit()
    db.refresh(claim)
    return claim
