"""Super-admin / moderation API. Guards use permissions, not role names."""

from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from ..audit.service import log_action
from ..database import get_db
from ..domain.enums import ClaimStatus, MemorialStatus, PermissionCode, RoleCode
from ..models import (
    AuditLog,
    MemorialCard,
    Organization,
    OwnershipClaim,
    Permission,
    Role,
    User,
)
from ..memorials import service as memorial_service
from ..moderation.reports import count_reports, resolve_needs_review_card
from ..rbac import service as rbac_service
from ..rbac.deps import require_any_permission, require_permission
from ..rbac.user_payload import build_user_out
from ..schemas import UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])

T = TypeVar("T")


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    roles: list[str] | None = None


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None = None
    is_system: bool
    permissions: list[str] = []


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    description: str | None = None
    category: str


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    ip_address: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime


class AdminOrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo: str | None = None
    subscription_plan: str
    subscription_status: str
    created_at: datetime
    deleted_at: datetime | None = None


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class AdminStatsOut(BaseModel):
    users_total: int | None = None
    orgs_active: int | None = None
    moderation_pending: int | None = None
    review_queue: int | None = None
    trash_total: int | None = None
    audit_total: int | None = None


class AdminClaimOut(BaseModel):
    id: int
    memorial_id: int
    memorial_name: str
    requester_id: int
    requester_contact: str | None = None
    message: str | None = None
    status: str
    created_at: datetime


class AdminClaimReview(BaseModel):
    approve: bool


class AdminReviewCardOut(BaseModel):
    id: int
    memorial_name: str
    page_kind: str
    status: str
    visibility: str
    report_count: int
    updated_at: datetime | None = None


class AdminReviewResolve(BaseModel):
    approve: bool


def _can_review_claims(db: Session, user: User) -> bool:
    return rbac_service.user_has_any_permission(
        db,
        user,
        [PermissionCode.MEMORIAL_CLAIM_REVIEW, PermissionCode.CONTENT_MODERATE],
    )


def _claim_to_out(db: Session, claim: OwnershipClaim) -> AdminClaimOut:
    card = db.query(MemorialCard).filter(MemorialCard.id == claim.memorial_id).first()
    requester = db.query(User).filter(User.id == claim.requester_id).first()
    name = "—"
    if card:
        parts = [card.last_name or "", card.first_name or "", card.middle_name or ""]
        name = " ".join(p for p in parts if p).strip() or f"#{card.id}"
    contact = None
    if requester:
        contact = requester.email or requester.phone
    return AdminClaimOut(
        id=claim.id,
        memorial_id=claim.memorial_id,
        memorial_name=name,
        requester_id=claim.requester_id,
        requester_contact=contact,
        message=claim.message,
        status=claim.status,
        created_at=claim.created_at,
    )


def _paginate(page: int, page_size: int) -> tuple[int, int]:
    safe_page = max(1, page)
    safe_size = min(max(1, page_size), 100)
    return safe_page, safe_size


@router.get("/stats", response_model=AdminStatsOut)
def admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(
            PermissionCode.ADMIN_ACCESS,
            PermissionCode.USER_MANAGE,
            PermissionCode.AUDIT_READ,
            PermissionCode.ORG_MANAGE_ANY,
            PermissionCode.MEMORIAL_RESTORE,
            PermissionCode.MEMORIAL_CLAIM_REVIEW,
            PermissionCode.CONTENT_MODERATE,
        )
    ),
):
    out = AdminStatsOut()
    if rbac_service.user_has_permission(db, current_user, PermissionCode.USER_MANAGE):
        out.users_total = db.query(User).count()
    if rbac_service.user_has_permission(db, current_user, PermissionCode.ORG_MANAGE_ANY):
        out.orgs_active = (
            db.query(Organization).filter(Organization.deleted_at.is_(None)).count()
        )
    if _can_review_claims(db, current_user):
        pending_claims = (
            db.query(OwnershipClaim)
            .filter(OwnershipClaim.status == ClaimStatus.PENDING)
            .count()
        )
        review_queue = (
            db.query(MemorialCard)
            .filter(
                MemorialCard.status == MemorialStatus.NEEDS_REVIEW,
                MemorialCard.deleted_at.is_(None),
            )
            .count()
        )
        out.moderation_pending = pending_claims + review_queue
        out.review_queue = review_queue
    if rbac_service.user_has_permission(
        db, current_user, PermissionCode.MEMORIAL_RESTORE
    ):
        out.trash_total = (
            db.query(MemorialCard).filter(MemorialCard.deleted_at.isnot(None)).count()
        )
    if rbac_service.user_has_permission(db, current_user, PermissionCode.AUDIT_READ):
        out.audit_total = db.query(AuditLog).count()
    return out


@router.get("/users", response_model=Page[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(PermissionCode.USER_MANAGE)),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
):
    page, page_size = _paginate(page, page_size)
    query = db.query(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (User.email.ilike(like))
            | (User.phone.ilike(like))
        )
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    return Page(
        items=[build_user_out(db, u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionCode.USER_MANAGE)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    old_roles = rbac_service.get_user_role_codes(db, user)
    old = {"is_active": user.is_active, "roles": old_roles}
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.roles is not None:
        if not rbac_service.user_has_permission(
            db, current_user, PermissionCode.ROLE_MANAGE
        ):
            raise HTTPException(status_code=403, detail="Нет права управлять ролями")
        requested = {str(r) for r in payload.roles}
        actor_roles = set(rbac_service.get_user_role_codes(db, current_user))
        if RoleCode.SUPER_ADMIN in requested and RoleCode.SUPER_ADMIN not in actor_roles:
            raise HTTPException(
                status_code=403,
                detail="Назначать super_admin может только super_admin",
            )
        try:
            rbac_service.set_user_roles(db, user, payload.roles)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    log_action(
        db,
        action="admin.user_update",
        entity_type="user",
        entity_id=user.id,
        user=current_user,
        request=request,
        old_value=old,
        new_value={
            "is_active": user.is_active,
            "roles": rbac_service.get_user_role_codes(db, user),
        },
    )
    db.commit()
    db.refresh(user)
    return build_user_out(db, user)


@router.get("/roles", response_model=list[RoleOut])
def list_roles(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(PermissionCode.ROLE_MANAGE)),
):
    roles = db.query(Role).order_by(Role.id.asc()).all()
    result = []
    for role in roles:
        codes = sorted(
            {
                rp.permission.code
                for rp in role.role_permissions
                if rp.permission
            }
        )
        result.append(
            RoleOut(
                id=role.id,
                code=role.code,
                name=role.name,
                description=role.description,
                is_system=bool(role.is_system),
                permissions=codes,
            )
        )
    return result


@router.get("/permissions", response_model=list[PermissionOut])
def list_permissions(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(PermissionCode.ROLE_MANAGE)),
):
    return db.query(Permission).order_by(Permission.category, Permission.code).all()


@router.get("/organizations", response_model=list[AdminOrgOut])
def list_all_organizations(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(PermissionCode.ORG_MANAGE_ANY)),
    include_deleted: bool = False,
):
    q = db.query(Organization).order_by(Organization.created_at.desc())
    if not include_deleted:
        q = q.filter(Organization.deleted_at.is_(None))
    return q.all()


@router.get("/audit-logs", response_model=Page[AuditLogOut])
def list_audit_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(PermissionCode.AUDIT_READ)),
    entity_type: str | None = None,
    action: str | None = None,
    user_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
):
    page, page_size = _paginate(page, page_size)
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/claims", response_model=Page[AdminClaimOut])
def list_claims(
    db: Session = Depends(get_db),
    _: User = Depends(
        require_any_permission(
            PermissionCode.MEMORIAL_CLAIM_REVIEW,
            PermissionCode.CONTENT_MODERATE,
        )
    ),
    status: str | None = Query(default=ClaimStatus.PENDING),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
):
    page, page_size = _paginate(page, page_size)
    q = db.query(OwnershipClaim).order_by(OwnershipClaim.created_at.desc())
    if status:
        q = q.filter(OwnershipClaim.status == status)
    total = q.count()
    claims = q.offset((page - 1) * page_size).limit(page_size).all()
    return Page(
        items=[_claim_to_out(db, c) for c in claims],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/claims/{claim_id}/review", response_model=AdminClaimOut)
def review_claim(
    claim_id: int,
    payload: AdminClaimReview,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(
            PermissionCode.MEMORIAL_CLAIM_REVIEW,
            PermissionCode.CONTENT_MODERATE,
        )
    ),
):
    claim = db.query(OwnershipClaim).filter(OwnershipClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Запрос не найден")
    reviewed = memorial_service.review_ownership_claim(
        db, current_user, claim, payload.approve, request=request
    )
    return _claim_to_out(db, reviewed)


def _review_card_out(db: Session, card: MemorialCard) -> AdminReviewCardOut:
    parts = [card.last_name or "", card.first_name or "", card.middle_name or ""]
    name = " ".join(p for p in parts if p).strip() or f"#{card.id}"
    return AdminReviewCardOut(
        id=card.id,
        memorial_name=name,
        page_kind=card.page_kind or "brief",
        status=card.status,
        visibility=card.visibility,
        report_count=count_reports(db, card.id),
        updated_at=card.updated_at,
    )


@router.get("/review-queue", response_model=Page[AdminReviewCardOut])
def list_review_queue(
    db: Session = Depends(get_db),
    _: User = Depends(
        require_any_permission(
            PermissionCode.MEMORIAL_CLAIM_REVIEW,
            PermissionCode.CONTENT_MODERATE,
        )
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
):
    page, page_size = _paginate(page, page_size)
    q = (
        db.query(MemorialCard)
        .filter(
            MemorialCard.status == MemorialStatus.NEEDS_REVIEW,
            MemorialCard.deleted_at.is_(None),
        )
        .order_by(MemorialCard.updated_at.desc())
    )
    total = q.count()
    cards = q.offset((page - 1) * page_size).limit(page_size).all()
    return Page(
        items=[_review_card_out(db, c) for c in cards],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/review-queue/{card_id}/resolve", response_model=AdminReviewCardOut)
def resolve_review_card(
    card_id: int,
    payload: AdminReviewResolve,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(
            PermissionCode.MEMORIAL_CLAIM_REVIEW,
            PermissionCode.CONTENT_MODERATE,
        )
    ),
):
    card = (
        db.query(MemorialCard)
        .filter(MemorialCard.id == card_id, MemorialCard.deleted_at.is_(None))
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")
    if card.status != MemorialStatus.NEEDS_REVIEW:
        raise HTTPException(status_code=400, detail="Карточка не в очереди проверки")
    resolved = resolve_needs_review_card(
        db, current_user, card, approve=payload.approve, request=request
    )
    return _review_card_out(db, resolved)
