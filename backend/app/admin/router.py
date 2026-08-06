"""Super-admin / moderation API. Guards use permissions, not role names."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from ..audit.service import log_action
from ..database import get_db
from ..domain.enums import PermissionCode, RoleCode
from ..models import AuditLog, Organization, Permission, Role, User
from ..rbac import service as rbac_service
from ..rbac.deps import require_permission
from ..rbac.user_payload import build_user_out
from ..schemas import UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


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


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(PermissionCode.USER_MANAGE)),
    q: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
):
    query = db.query(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (User.email.ilike(like))
            | (User.phone.ilike(like))
        )
    users = query.limit(limit).all()
    return [build_user_out(db, u) for u in users]


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


@router.get("/audit-logs", response_model=list[AuditLogOut])
def list_audit_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(PermissionCode.AUDIT_READ)),
    entity_type: str | None = None,
    action: str | None = None,
    limit: int = Query(default=100, le=500),
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if action:
        q = q.filter(AuditLog.action == action)
    return q.limit(limit).all()
