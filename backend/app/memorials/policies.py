"""Resource-scoped memorial access policies."""

from __future__ import annotations

from sqlalchemy.orm import Session

from ..domain.enums import PermissionCode
from ..models import MemorialCard, OrganizationMember, User
from ..rbac import service as rbac_service


def _active_org_ids(db: Session, user: User) -> set[int]:
    rows = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == "active",
        )
        .all()
    )
    return {r.organization_id for r in rows}


def is_org_member_for_card(db: Session, user: User, card: MemorialCard) -> bool:
    if not card.organization_id:
        return False
    return card.organization_id in _active_org_ids(db, user)


def can_view_memorial(db: Session, user: User | None, card: MemorialCard) -> bool:
    if card.deleted_at is not None:
        if user and rbac_service.user_has_permission(
            db, user, PermissionCode.MEMORIAL_READ_ANY
        ):
            return True
        if user and rbac_service.user_has_permission(
            db, user, PermissionCode.MEMORIAL_RESTORE
        ):
            return True
        return False

    if card.visibility == "public":
        return True
    if card.visibility == "unlisted":
        return True

    if not user:
        return False
    if rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_READ_ANY):
        return True
    if card.owner_id == user.id:
        return True
    if is_org_member_for_card(db, user, card):
        return True
    return False


def can_edit_memorial(db: Session, user: User, card: MemorialCard) -> bool:
    if card.deleted_at is not None:
        return False
    if rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_UPDATE_ANY):
        return True
    if card.owner_id == user.id and rbac_service.user_has_permission(
        db, user, PermissionCode.MEMORIAL_UPDATE_OWN
    ):
        return True
    if is_org_member_for_card(db, user, card) and rbac_service.user_has_permission(
        db, user, PermissionCode.MEMORIAL_UPDATE_ORG
    ):
        return True
    return False


def can_delete_memorial(db: Session, user: User, card: MemorialCard) -> bool:
    if card.deleted_at is not None:
        return False
    if rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_DELETE_ANY):
        return True
    if card.owner_id == user.id and rbac_service.user_has_permission(
        db, user, PermissionCode.MEMORIAL_DELETE_OWN
    ):
        return True
    if is_org_member_for_card(db, user, card) and rbac_service.user_has_permission(
        db, user, PermissionCode.MEMORIAL_DELETE_ORG
    ):
        return True
    return False


def can_transfer_memorial(db: Session, user: User, card: MemorialCard) -> bool:
    if card.deleted_at is not None:
        return False
    if rbac_service.user_has_permission(
        db, user, PermissionCode.MEMORIAL_TRANSFER_OWNERSHIP
    ):
        if card.owner_id == user.id or rbac_service.user_has_permission(
            db, user, PermissionCode.MEMORIAL_UPDATE_ANY
        ):
            return True
    return False


def can_assign_owner(db: Session, user: User, card: MemorialCard) -> bool:
    if card.deleted_at is not None:
        return False
    if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_ASSIGN_OWNER):
        return False
    if rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_UPDATE_ANY):
        return True
    return is_org_member_for_card(db, user, card)


def can_restore_memorial(db: Session, user: User, card: MemorialCard) -> bool:
    if card.deleted_at is None:
        return False
    return rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_RESTORE)


def can_review_claim(db: Session, user: User, card: MemorialCard) -> bool:
    if rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_CLAIM_REVIEW):
        return True
    if card.owner_id == user.id:
        return True
    if rbac_service.user_has_permission(db, user, PermissionCode.CONTENT_MODERATE):
        return True
    return False
