"""RBAC service: resolve roles and permissions for users."""

from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ..domain.enums import RoleCode
from ..models import OrganizationMember, Permission, Role, RolePermission, User, UserRole


def get_user_roles(db: Session, user: User) -> list[Role]:
    rows = (
        db.query(UserRole)
        .options(joinedload(UserRole.role))
        .filter(UserRole.user_id == user.id)
        .all()
    )
    return [row.role for row in rows if row.role]


def get_user_role_codes(db: Session, user: User) -> list[str]:
    return [role.code for role in get_user_roles(db, user)]


def get_user_permissions(db: Session, user: User) -> set[str]:
    cached = getattr(user, "_cached_permissions", None)
    if cached is not None:
        return cached

    role_ids = [
        r.role_id for r in db.query(UserRole).filter(UserRole.user_id == user.id).all()
    ]
    if not role_ids:
        permissions: set[str] = set()
        user._cached_permissions = permissions  # type: ignore[attr-defined]
        return permissions

    perms = (
        db.query(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id.in_(role_ids))
        .distinct()
        .all()
    )
    permissions = {code for (code,) in perms}
    user._cached_permissions = permissions  # type: ignore[attr-defined]
    return permissions


def user_has_permission(db: Session, user: User, permission_code: str) -> bool:
    return permission_code in get_user_permissions(db, user)


def user_has_any_permission(db: Session, user: User, permission_codes: list[str]) -> bool:
    perms = get_user_permissions(db, user)
    return any(code in perms for code in permission_codes)


def ensure_user_has_role(db: Session, user: User, role_code: str) -> UserRole | None:
    role = db.query(Role).filter(Role.code == role_code).first()
    if not role:
        return None
    existing = (
        db.query(UserRole)
        .filter(UserRole.user_id == user.id, UserRole.role_id == role.id)
        .first()
    )
    if existing:
        return existing
    row = UserRole(user_id=user.id, role_id=role.id)
    db.add(row)
    db.flush()
    if hasattr(user, "_cached_permissions"):
        delattr(user, "_cached_permissions")
    return row


def set_user_roles(db: Session, user: User, role_codes: list[str]) -> list[str]:
    """Replace user roles with the given codes."""
    roles = db.query(Role).filter(Role.code.in_(role_codes)).all()
    by_code = {r.code: r for r in roles}
    missing = [c for c in role_codes if c not in by_code]
    if missing:
        raise ValueError(f"Unknown roles: {', '.join(missing)}")

    db.query(UserRole).filter(UserRole.user_id == user.id).delete()
    for code in role_codes:
        db.add(UserRole(user_id=user.id, role_id=by_code[code].id))
    db.flush()
    if hasattr(user, "_cached_permissions"):
        delattr(user, "_cached_permissions")
    return role_codes


def assign_role_if_missing(db: Session, user: User, role_code: str = RoleCode.USER) -> None:
    ensure_user_has_role(db, user, role_code)


def get_active_organization_membership(
    db: Session, user: User
) -> OrganizationMember | None:
    return (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == "active",
        )
        .first()
    )


def sync_org_role(db: Session, user: User, member_role: str) -> None:
    """Grant org-aligned RBAC role without wiping existing roles (e.g. user)."""
    target = RoleCode.PARTNER if member_role == "owner" else RoleCode.PARTNER_EMPLOYEE
    ensure_user_has_role(db, user, RoleCode.USER)
    ensure_user_has_role(db, user, target)
