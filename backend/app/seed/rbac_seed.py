"""Seed roles, permissions, and bootstrap assignments."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from ..config import get_settings
from ..domain.enums import PERMISSION_CATEGORIES, PermissionCode, RoleCode
from ..domain.permissions_matrix import ROLE_META, ROLE_PERMISSIONS
from ..models import Permission, Role, RolePermission, User, UserRole
from ..rbac.service import ensure_user_has_role, set_user_roles

logger = logging.getLogger(__name__)


def seed_rbac(db: Session) -> None:
    permissions_by_code: dict[str, Permission] = {
        p.code: p for p in db.query(Permission).all()
    }
    for code in PermissionCode:
        if code.value not in permissions_by_code:
            perm = Permission(
                code=code.value,
                description=code.value,
                category=PERMISSION_CATEGORIES.get(code, "general"),
            )
            db.add(perm)
            db.flush()
            permissions_by_code[code.value] = perm

    roles_by_code: dict[str, Role] = {r.code: r for r in db.query(Role).all()}
    for role_code, meta in ROLE_META.items():
        role = roles_by_code.get(role_code.value)
        if not role:
            role = Role(
                code=role_code.value,
                name=str(meta["name"]),
                description=str(meta.get("description") or ""),
                is_system=bool(meta.get("is_system", True)),
            )
            db.add(role)
            db.flush()
            roles_by_code[role_code.value] = role
        else:
            role.name = str(meta["name"])
            role.description = str(meta.get("description") or "")

    for role_code, perm_set in ROLE_PERMISSIONS.items():
        role = roles_by_code[role_code.value]
        desired = {p.value for p in perm_set}
        existing_rows = (
            db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
        )
        id_to_code = {p.id: p.code for p in permissions_by_code.values()}
        existing_codes = {
            id_to_code[row.permission_id]
            for row in existing_rows
            if row.permission_id in id_to_code
        }

        for code in desired - existing_codes:
            db.add(
                RolePermission(
                    role_id=role.id,
                    permission_id=permissions_by_code[code].id,
                )
            )
        for row in existing_rows:
            code = id_to_code.get(row.permission_id)
            if code and code not in desired:
                db.delete(row)

    db.flush()

    users = db.query(User).all()
    for user in users:
        has_role = db.query(UserRole).filter(UserRole.user_id == user.id).first()
        if not has_role:
            ensure_user_has_role(db, user, RoleCode.USER)

    settings = get_settings()
    email = (settings.super_admin_email or "").strip().lower()
    if email:
        from sqlalchemy import func

        admin = db.query(User).filter(func.lower(User.email) == email).first()
        if admin:
            set_user_roles(db, admin, [RoleCode.SUPER_ADMIN])
            logger.info("Bootstrap super_admin assigned to %s", email)
        else:
            logger.warning(
                "SUPER_ADMIN_EMAIL=%s, but no user with this email yet. "
                "Register/login once, then restart backend (or open /auth/me).",
                email,
            )

    db.commit()
    logger.info("RBAC seed completed")
