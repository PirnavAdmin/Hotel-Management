import React from "react";
import { hasAnyPermission, hasPermission } from "../../utils/permissions";

/**
 * Reusable permission-aware wrapper.
 * Note: UI hiding is for UX only; backend authorization remains mandatory on all APIs.
 */
export function PermissionGuard({ session, permission, anyOf, fallback = null, children }) {
  const allowed = permission
    ? hasPermission(session, permission)
    : Array.isArray(anyOf) && anyOf.length > 0
      ? hasAnyPermission(session, anyOf)
      : false;

  if (!allowed) {
    return fallback;
  }
  return <>{children}</>;
}
