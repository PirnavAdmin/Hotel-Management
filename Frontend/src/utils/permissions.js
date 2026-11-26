function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          )
        : Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const ALL_SAAS_PERMISSIONS = [
  "orders.view",
  "orders.create",
  "orders.settle",
  "invoices.view",
  "invoices.void",
  "reports.view",
  "staff.manage",
  "branches.manage",
  "inventory.manage",
  "settings.edit",
  "roles.manage",
];

/**
 * Extract backend-provided permission strings from session or JWT claims.
 * Never invents permissions when the backend has not issued them.
 * @param {object|null} session
 * @returns {string[]}
 */
export function extractSessionPermissions(session) {
  if (!session || typeof session !== "object") return [];

  const fromSession = Array.isArray(session.permissions) ? session.permissions : [];
  let fromJwt = [];

  try {
    const token =
      session.token ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("avsr_jwt_token") : "");
    const jwt = token ? decodeJwtPayload(token) : null;
    const raw = jwt?.permissions ?? jwt?.permission ?? [];
    if (Array.isArray(raw)) {
      fromJwt = raw;
    } else if (typeof raw === "string" && raw.trim()) {
      fromJwt = raw.split(",").map((s) => s.trim());
    }
  } catch {
    // Ignore storage errors in non-browser contexts
  }

  return Array.from(
    new Set(
      [...fromSession, ...fromJwt]
        .map((p) => String(p || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

/**
 * True only if the backend actually supplied granular permission claims.
 * @param {object|null} session
 * @returns {boolean}
 */
export function hasBackendPermissionClaims(session) {
  return extractSessionPermissions(session).length > 0;
}

/**
 * Check if the authenticated user holds a specific permission.
 * Missing permissions NEVER grant access.
 * @param {object|null} session
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(session, permission) {
  const target = String(permission || "").trim().toLowerCase();
  if (!target) return false;
  const perms = extractSessionPermissions(session);
  return perms.includes(target);
}

/**
 * Check if user holds at least one of the specified permissions.
 * @param {object|null} session
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function hasAnyPermission(session, permissions = []) {
  return permissions.some((p) => hasPermission(session, p));
}

const DASHBOARD_ROLE_PROFILES = {
  restaurantowner: {
    title: "Restaurant Owner Dashboard",
    scope: "Organization & All Restaurants / Branches",
    recommendedPermissions: [
      "orders.view",
      "invoices.view",
      "invoices.void",
      "reports.view",
      "staff.manage",
      "branches.manage",
      "settings.edit",
      "roles.manage",
    ],
  },
  restaurantadmin: {
    title: "Restaurant Admin Dashboard",
    scope: "Assigned Restaurant & Branches",
    recommendedPermissions: [
      "orders.view",
      "invoices.view",
      "reports.view",
      "staff.manage",
      "branches.manage",
      "inventory.manage",
      "settings.edit",
    ],
  },
  branchmanager: {
    title: "Branch Manager Dashboard",
    scope: "Assigned Branch Operations",
    recommendedPermissions: [
      "orders.view",
      "orders.create",
      "orders.settle",
      "invoices.view",
      "reports.view",
      "inventory.manage",
      "staff.manage",
    ],
  },
};

/**
 * Return dashboard metadata for RestaurantOwner, RestaurantAdmin, or BranchManager.
 * @param {object|null} session
 */
export function getRoleDashboardProfile(session) {
  const raw = String(session?.rawRole || session?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return (
    DASHBOARD_ROLE_PROFILES[raw] || {
      title: "Admin Operations Dashboard",
      scope: "Current Restaurant Scope",
      recommendedPermissions: ALL_SAAS_PERMISSIONS,
    }
  );
}
