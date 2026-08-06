"""Organization use-cases."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from ..audit.service import log_action
from ..domain.enums import OrgMemberRole, OrgMemberStatus, PermissionCode, RoleCode
from ..models import MemorialCard, Organization, OrganizationMember, User
from ..rbac import service as rbac_service
from .schemas import OrganizationCreate, OrganizationUpdate, SubscriptionUpdate


def _get_membership(db: Session, org_id: int, user_id: int) -> OrganizationMember | None:
    return (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == OrgMemberStatus.ACTIVE,
        )
        .first()
    )


def require_org_access(
    db: Session,
    user: User,
    org: Organization,
    *,
    need_owner: bool = False,
) -> OrganizationMember | None:
    if rbac_service.user_has_permission(db, user, PermissionCode.ORG_MANAGE_ANY):
        return _get_membership(db, org.id, user.id)
    membership = _get_membership(db, org.id, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Нет доступа к организации")
    if need_owner and membership.member_role != OrgMemberRole.OWNER:
        raise HTTPException(status_code=403, detail="Только владелец организации")
    return membership


def enrich_org(db: Session, org: Organization) -> dict:
    employees = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.status == OrgMemberStatus.ACTIVE,
        )
        .count()
    )
    memorials = (
        db.query(MemorialCard)
        .filter(
            MemorialCard.organization_id == org.id,
            MemorialCard.deleted_at.is_(None),
        )
        .count()
    )
    return {
        "id": org.id,
        "name": org.name,
        "logo": org.logo,
        "subscription_plan": org.subscription_plan,
        "subscription_status": org.subscription_status,
        "created_at": org.created_at,
        "deleted_at": org.deleted_at,
        "employee_count": employees,
        "memorial_count": memorials,
    }


def create_organization(
    db: Session,
    user: User,
    payload: OrganizationCreate,
    request: Request | None = None,
) -> Organization:
    if not rbac_service.user_has_permission(db, user, PermissionCode.ORG_CREATE):
        # Allow first-time partner onboarding for users with create via admin,
        # or elevate: any authenticated user with org:create. Seed partner has it.
        # Also allow users who don't have org yet to create if they have ORG_CREATE
        # or we grant via becoming partner - for bootstrap, also allow if no membership
        # and user has memorial:create (upgrade path). Prefer permission check only.
        raise HTTPException(status_code=403, detail="Нет права создавать организацию")

    existing = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == OrgMemberStatus.ACTIVE,
        )
        .first()
    )
    if existing and not rbac_service.user_has_permission(
        db, user, PermissionCode.ORG_MANAGE_ANY
    ):
        raise HTTPException(status_code=400, detail="Вы уже состоите в организации")

    org = Organization(
        name=payload.name,
        logo=payload.logo,
        subscription_plan=payload.subscription_plan,
        subscription_status="active",
    )
    db.add(org)
    db.flush()
    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        member_role=OrgMemberRole.OWNER,
        status=OrgMemberStatus.ACTIVE,
        invited_by=user.id,
    )
    db.add(member)
    rbac_service.sync_org_role(db, user, OrgMemberRole.OWNER)
    log_action(
        db,
        action="organization.create",
        entity_type="organization",
        entity_id=org.id,
        user=user,
        request=request,
        new_value={"name": org.name, "plan": org.subscription_plan},
    )
    db.commit()
    db.refresh(org)
    return org


def get_org_or_404(db: Session, org_id: int, *, include_deleted: bool = False) -> Organization:
    q = db.query(Organization).filter(Organization.id == org_id)
    if not include_deleted:
        q = q.filter(Organization.deleted_at.is_(None))
    org = q.first()
    if not org:
        raise HTTPException(status_code=404, detail="Организация не найдена")
    return org


def list_my_organizations(db: Session, user: User) -> list[Organization]:
    if rbac_service.user_has_permission(db, user, PermissionCode.ORG_MANAGE_ANY):
        return (
            db.query(Organization)
            .filter(Organization.deleted_at.is_(None))
            .order_by(Organization.created_at.desc())
            .all()
        )
    memberships = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == OrgMemberStatus.ACTIVE,
        )
        .all()
    )
    ids = [m.organization_id for m in memberships]
    if not ids:
        return []
    return db.query(Organization).filter(Organization.id.in_(ids)).all()


def update_organization(
    db: Session,
    user: User,
    org: Organization,
    payload: OrganizationUpdate,
    request: Request | None = None,
) -> Organization:
    require_org_access(db, user, org, need_owner=True)
    if not rbac_service.user_has_any_permission(
        db, user, [PermissionCode.ORG_UPDATE, PermissionCode.ORG_MANAGE_ANY]
    ):
        raise HTTPException(status_code=403, detail="Нет права обновлять организацию")
    old = {"name": org.name, "logo": org.logo}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    log_action(
        db,
        action="organization.update",
        entity_type="organization",
        entity_id=org.id,
        user=user,
        request=request,
        old_value=old,
        new_value={"name": org.name, "logo": org.logo},
    )
    db.commit()
    db.refresh(org)
    return org


def update_subscription(
    db: Session,
    user: User,
    org: Organization,
    payload: SubscriptionUpdate,
    request: Request | None = None,
) -> Organization:
    require_org_access(db, user, org, need_owner=True)
    if not rbac_service.user_has_any_permission(
        db,
        user,
        [PermissionCode.ORG_MANAGE_SUBSCRIPTION, PermissionCode.ORG_MANAGE_ANY],
    ):
        raise HTTPException(status_code=403, detail="Нет права управлять подпиской")
    old = {
        "subscription_plan": org.subscription_plan,
        "subscription_status": org.subscription_status,
    }
    org.subscription_plan = payload.subscription_plan
    if payload.subscription_status:
        org.subscription_status = payload.subscription_status
    log_action(
        db,
        action="organization.subscription_update",
        entity_type="organization",
        entity_id=org.id,
        user=user,
        request=request,
        old_value=old,
        new_value={
            "subscription_plan": org.subscription_plan,
            "subscription_status": org.subscription_status,
        },
    )
    db.commit()
    db.refresh(org)
    return org


def soft_delete_organization(
    db: Session,
    user: User,
    org: Organization,
    request: Request | None = None,
) -> Organization:
    require_org_access(db, user, org, need_owner=True)
    if not rbac_service.user_has_any_permission(
        db, user, [PermissionCode.ORG_DELETE, PermissionCode.ORG_MANAGE_ANY]
    ):
        raise HTTPException(status_code=403, detail="Нет права удалять организацию")
    org.deleted_at = datetime.now(timezone.utc)
    log_action(
        db,
        action="organization.delete",
        entity_type="organization",
        entity_id=org.id,
        user=user,
        request=request,
        new_value={"deleted_at": org.deleted_at.isoformat()},
    )
    db.commit()
    db.refresh(org)
    return org


def invite_employee(
    db: Session,
    user: User,
    org: Organization,
    email: str,
    request: Request | None = None,
) -> OrganizationMember:
    require_org_access(db, user, org, need_owner=True)
    if not rbac_service.user_has_permission(db, user, PermissionCode.ORG_INVITE_EMPLOYEE):
        raise HTTPException(status_code=403, detail="Нет права приглашать сотрудников")

    invitee = db.query(User).filter(User.email == email).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="Пользователь с таким email не найден")

    existing = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == invitee.id,
        )
        .first()
    )
    if existing and existing.status == OrgMemberStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Пользователь уже в организации")

    if existing:
        existing.status = OrgMemberStatus.ACTIVE
        existing.member_role = OrgMemberRole.EMPLOYEE
        existing.invited_by = user.id
        existing.invite_token = None
        member = existing
    else:
        member = OrganizationMember(
            organization_id=org.id,
            user_id=invitee.id,
            member_role=OrgMemberRole.EMPLOYEE,
            status=OrgMemberStatus.ACTIVE,
            invited_by=user.id,
            invite_token=secrets.token_urlsafe(24),
        )
        db.add(member)

    # Additive grant — never wipe existing roles (user, partner of another org, etc.)
    rbac_service.ensure_user_has_role(db, invitee, RoleCode.USER)
    rbac_service.ensure_user_has_role(db, invitee, RoleCode.PARTNER_EMPLOYEE)

    log_action(
        db,
        action="organization.invite_employee",
        entity_type="organization_member",
        entity_id=member.id if member.id else org.id,
        user=user,
        request=request,
        new_value={"org_id": org.id, "user_id": invitee.id, "email": email},
    )
    db.commit()
    db.refresh(member)
    return member


def list_members(db: Session, user: User, org: Organization) -> list[OrganizationMember]:
    require_org_access(db, user, org)
    if not rbac_service.user_has_any_permission(
        db, user, [PermissionCode.ORG_READ, PermissionCode.ORG_MANAGE_ANY]
    ):
        raise HTTPException(status_code=403, detail="Нет доступа")
    return (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org.id)
        .order_by(OrganizationMember.created_at.asc())
        .all()
    )


def org_stats(db: Session, user: User, org: Organization) -> dict:
    require_org_access(db, user, org)
    if not rbac_service.user_has_any_permission(
        db, user, [PermissionCode.ORG_STATS, PermissionCode.ORG_MANAGE_ANY]
    ):
        raise HTTPException(status_code=403, detail="Нет доступа к статистике")
    memorials = db.query(MemorialCard).filter(MemorialCard.organization_id == org.id)
    total = memorials.count()
    published = memorials.filter(
        MemorialCard.deleted_at.is_(None), MemorialCard.status == "published"
    ).count()
    deleted = memorials.filter(MemorialCard.deleted_at.isnot(None)).count()
    employees = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.status == OrgMemberStatus.ACTIVE,
        )
        .count()
    )
    return {
        "organization_id": org.id,
        "memorial_count": total,
        "employee_count": employees,
        "published_count": published,
        "deleted_count": deleted,
    }
