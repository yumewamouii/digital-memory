"""Domain enums for RBAC, memorials, organizations, and trees."""

from __future__ import annotations

from enum import StrEnum


class RoleCode(StrEnum):
    USER = "user"
    PARTNER = "partner"
    PARTNER_EMPLOYEE = "partner_employee"
    SUPER_ADMIN = "super_admin"


class PermissionCode(StrEnum):
    # Memorials
    MEMORIAL_CREATE = "memorial:create"
    MEMORIAL_READ_PUBLIC = "memorial:read_public"
    MEMORIAL_READ_OWN = "memorial:read_own"
    MEMORIAL_UPDATE_OWN = "memorial:update_own"
    MEMORIAL_DELETE_OWN = "memorial:delete_own"
    MEMORIAL_CREATE_ORG = "memorial:create_org"
    MEMORIAL_UPDATE_ORG = "memorial:update_org"
    MEMORIAL_DELETE_ORG = "memorial:delete_org"
    MEMORIAL_ASSIGN_OWNER = "memorial:assign_owner"
    MEMORIAL_TRANSFER_OWNERSHIP = "memorial:transfer_ownership"
    MEMORIAL_CLAIM_REQUEST = "memorial:claim_request"
    MEMORIAL_CLAIM_REVIEW = "memorial:claim_review"
    MEMORIAL_RESTORE = "memorial:restore"
    MEMORIAL_DELETE_ANY = "memorial:delete_any"
    MEMORIAL_READ_ANY = "memorial:read_any"
    MEMORIAL_UPDATE_ANY = "memorial:update_any"

    # Trees
    TREE_CREATE = "tree:create"
    TREE_READ = "tree:read"
    TREE_UPDATE = "tree:update"
    TREE_INVITE = "tree:invite"
    TREE_MANAGE_ACCESS = "tree:manage_access"
    TREE_READ_ANY = "tree:read_any"
    TREE_UPDATE_ANY = "tree:update_any"
    TREE_DELETE_ANY = "tree:delete_any"

    # Organizations
    ORG_READ = "org:read"
    ORG_UPDATE = "org:update"
    ORG_INVITE_EMPLOYEE = "org:invite_employee"
    ORG_MANAGE_SUBSCRIPTION = "org:manage_subscription"
    ORG_DELETE = "org:delete"
    ORG_STATS = "org:stats"
    ORG_MANAGE_ANY = "org:manage_any"
    ORG_CREATE = "org:create"

    # Admin
    USER_MANAGE = "user:manage"
    ROLE_MANAGE = "role:manage"
    CONTENT_MODERATE = "content:moderate"
    AUDIT_READ = "audit:read"
    ADMIN_ACCESS = "admin:access"


class MemorialVisibility(StrEnum):
    PRIVATE = "private"
    UNLISTED = "unlisted"
    PUBLIC = "public"


class MemorialStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    NEEDS_REVIEW = "needs_review"


class ReportReason(StrEnum):
    FALSE_INFO = "false_info"
    PROFANITY = "profanity"
    OFFENSIVE = "offensive"
    NSFW_PHOTO = "nsfw_photo"
    OTHER = "other"


class ClaimStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class OrgMemberRole(StrEnum):
    OWNER = "owner"
    EMPLOYEE = "employee"


class OrgMemberStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    REVOKED = "revoked"


class SubscriptionPlan(StrEnum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(StrEnum):
    ACTIVE = "active"
    TRIAL = "trial"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class TreeAccessLevel(StrEnum):
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class TreeVisibility(StrEnum):
    PRIVATE = "private"
    LINK = "link"
    PUBLIC = "public"


PERMISSION_CATEGORIES: dict[PermissionCode, str] = {
    PermissionCode.MEMORIAL_CREATE: "memorial",
    PermissionCode.MEMORIAL_READ_PUBLIC: "memorial",
    PermissionCode.MEMORIAL_READ_OWN: "memorial",
    PermissionCode.MEMORIAL_UPDATE_OWN: "memorial",
    PermissionCode.MEMORIAL_DELETE_OWN: "memorial",
    PermissionCode.MEMORIAL_CREATE_ORG: "memorial",
    PermissionCode.MEMORIAL_UPDATE_ORG: "memorial",
    PermissionCode.MEMORIAL_DELETE_ORG: "memorial",
    PermissionCode.MEMORIAL_ASSIGN_OWNER: "memorial",
    PermissionCode.MEMORIAL_TRANSFER_OWNERSHIP: "memorial",
    PermissionCode.MEMORIAL_CLAIM_REQUEST: "memorial",
    PermissionCode.MEMORIAL_CLAIM_REVIEW: "memorial",
    PermissionCode.MEMORIAL_RESTORE: "memorial",
    PermissionCode.MEMORIAL_DELETE_ANY: "memorial",
    PermissionCode.MEMORIAL_READ_ANY: "memorial",
    PermissionCode.MEMORIAL_UPDATE_ANY: "memorial",
    PermissionCode.TREE_CREATE: "tree",
    PermissionCode.TREE_READ: "tree",
    PermissionCode.TREE_UPDATE: "tree",
    PermissionCode.TREE_INVITE: "tree",
    PermissionCode.TREE_MANAGE_ACCESS: "tree",
    PermissionCode.TREE_READ_ANY: "tree",
    PermissionCode.TREE_UPDATE_ANY: "tree",
    PermissionCode.TREE_DELETE_ANY: "tree",
    PermissionCode.ORG_READ: "org",
    PermissionCode.ORG_UPDATE: "org",
    PermissionCode.ORG_INVITE_EMPLOYEE: "org",
    PermissionCode.ORG_MANAGE_SUBSCRIPTION: "org",
    PermissionCode.ORG_DELETE: "org",
    PermissionCode.ORG_STATS: "org",
    PermissionCode.ORG_MANAGE_ANY: "org",
    PermissionCode.ORG_CREATE: "org",
    PermissionCode.USER_MANAGE: "admin",
    PermissionCode.ROLE_MANAGE: "admin",
    PermissionCode.CONTENT_MODERATE: "admin",
    PermissionCode.AUDIT_READ: "admin",
    PermissionCode.ADMIN_ACCESS: "admin",
}
