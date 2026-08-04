import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { hasAnyPermission, hasPermission } from "./permissions";

export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];

  return useMemo(
    () => ({
      permissions,
      roles,
      has: (code) => hasPermission(permissions, code),
      hasAny: (...codes) => hasAnyPermission(permissions, codes),
      organization: user?.organization || null,
    }),
    [permissions, roles, user?.organization],
  );
}
