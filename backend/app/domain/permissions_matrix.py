"""Role → permission matrix. Source of truth for RBAC seed."""

from __future__ import annotations

from .enums import PermissionCode, RoleCode

P = PermissionCode

USER_PERMISSIONS: frozenset[PermissionCode] = frozenset(
    {
        P.MEMORIAL_CREATE,
        P.MEMORIAL_READ_PUBLIC,
        P.MEMORIAL_READ_OWN,
        P.MEMORIAL_UPDATE_OWN,
        P.MEMORIAL_DELETE_OWN,
        P.MEMORIAL_TRANSFER_OWNERSHIP,
        P.MEMORIAL_CLAIM_REQUEST,
        P.TREE_CREATE,
        P.TREE_READ,
        P.TREE_UPDATE,
        P.TREE_INVITE,
        P.TREE_MANAGE_ACCESS,
        # Partner onboarding: first organization upgrades role via sync_org_role
        P.ORG_CREATE,
    }
)

PARTNER_EMPLOYEE_PERMISSIONS: frozenset[PermissionCode] = USER_PERMISSIONS | frozenset(
    {
        P.MEMORIAL_CREATE_ORG,
        P.MEMORIAL_UPDATE_ORG,
        P.MEMORIAL_DELETE_ORG,
        P.ORG_READ,
        P.ORG_STATS,
    }
)

PARTNER_PERMISSIONS: frozenset[PermissionCode] = PARTNER_EMPLOYEE_PERMISSIONS | frozenset(
    {
        P.MEMORIAL_ASSIGN_OWNER,
        P.ORG_CREATE,
        P.ORG_UPDATE,
        P.ORG_INVITE_EMPLOYEE,
        P.ORG_MANAGE_SUBSCRIPTION,
        P.ORG_DELETE,
    }
)

SUPER_ADMIN_PERMISSIONS: frozenset[PermissionCode] = frozenset(PermissionCode)

ROLE_PERMISSIONS: dict[RoleCode, frozenset[PermissionCode]] = {
    RoleCode.USER: USER_PERMISSIONS,
    RoleCode.PARTNER: PARTNER_PERMISSIONS,
    RoleCode.PARTNER_EMPLOYEE: PARTNER_EMPLOYEE_PERMISSIONS,
    RoleCode.SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
}

ROLE_META: dict[RoleCode, dict[str, str | bool]] = {
    RoleCode.USER: {
        "name": "Пользователь",
        "description": "Базовый пользователь платформы",
        "is_system": True,
    },
    RoleCode.PARTNER: {
        "name": "Партнёр",
        "description": "Владелец партнёрской организации",
        "is_system": True,
    },
    RoleCode.PARTNER_EMPLOYEE: {
        "name": "Сотрудник партнёра",
        "description": "Сотрудник партнёрской организации",
        "is_system": True,
    },
    RoleCode.SUPER_ADMIN: {
        "name": "Суперадминистратор",
        "description": "Полный административный доступ",
        "is_system": True,
    },
}
