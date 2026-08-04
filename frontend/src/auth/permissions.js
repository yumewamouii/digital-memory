/** @typedef {string} PermissionCode */

/** Mirrors backend PermissionCode */
export const Permission = Object.freeze({
  MEMORIAL_CREATE: "memorial:create",
  MEMORIAL_READ_PUBLIC: "memorial:read_public",
  MEMORIAL_READ_OWN: "memorial:read_own",
  MEMORIAL_UPDATE_OWN: "memorial:update_own",
  MEMORIAL_DELETE_OWN: "memorial:delete_own",
  MEMORIAL_CREATE_ORG: "memorial:create_org",
  MEMORIAL_UPDATE_ORG: "memorial:update_org",
  MEMORIAL_DELETE_ORG: "memorial:delete_org",
  MEMORIAL_ASSIGN_OWNER: "memorial:assign_owner",
  MEMORIAL_TRANSFER_OWNERSHIP: "memorial:transfer_ownership",
  MEMORIAL_CLAIM_REQUEST: "memorial:claim_request",
  MEMORIAL_CLAIM_REVIEW: "memorial:claim_review",
  MEMORIAL_RESTORE: "memorial:restore",
  MEMORIAL_DELETE_ANY: "memorial:delete_any",
  MEMORIAL_READ_ANY: "memorial:read_any",
  MEMORIAL_UPDATE_ANY: "memorial:update_any",
  TREE_CREATE: "tree:create",
  TREE_READ: "tree:read",
  TREE_UPDATE: "tree:update",
  TREE_INVITE: "tree:invite",
  TREE_MANAGE_ACCESS: "tree:manage_access",
  TREE_READ_ANY: "tree:read_any",
  TREE_UPDATE_ANY: "tree:update_any",
  TREE_DELETE_ANY: "tree:delete_any",
  ORG_READ: "org:read",
  ORG_UPDATE: "org:update",
  ORG_INVITE_EMPLOYEE: "org:invite_employee",
  ORG_MANAGE_SUBSCRIPTION: "org:manage_subscription",
  ORG_DELETE: "org:delete",
  ORG_STATS: "org:stats",
  ORG_MANAGE_ANY: "org:manage_any",
  ORG_CREATE: "org:create",
  USER_MANAGE: "user:manage",
  ROLE_MANAGE: "role:manage",
  CONTENT_MODERATE: "content:moderate",
  AUDIT_READ: "audit:read",
  ADMIN_ACCESS: "admin:access",
});

/**
 * @param {string[]|undefined|null} permissions
 * @param {string} code
 */
export function hasPermission(permissions, code) {
  if (!permissions || !code) return false;
  return permissions.includes(code);
}

/**
 * @param {string[]|undefined|null} permissions
 * @param {string[]} codes
 */
export function hasAnyPermission(permissions, codes) {
  if (!permissions?.length || !codes?.length) return false;
  return codes.some((code) => permissions.includes(code));
}
