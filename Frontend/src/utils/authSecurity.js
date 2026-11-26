/**
 * Pure authentication, token-expiration, route-guard, and API-error classification utilities.
 * Note: Client-side checks are for UI presentation only; backend authorization remains mandatory.
 */

export const AUTH_SESSION_STORAGE_KEYS = [
  "avsr_auth_session_v1",
  "auth_user",
  "auth_token_timestamp",
  "avsr_jwt_token",
  "avsr_kitchen_notifications",
  "avsr_latest_kitchen_alert",
  "avsr_pos_session",
  "avsr_kot_session",
  "avsr_admin_session",
  "avsr_active_workspace_v1",
];

export function decodeJwtClaims(token) {
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

/**
 * Returns true when a token is a legacy mock token or a JWT whose `exp` claim is in the past.
 * Returns false when `exp` is absent or not yet expired.
 */
export function isTokenExpired(token, nowMs = Date.now()) {
  if (!token || typeof token !== "string") return true;
  if (token.startsWith("mock-jwt-token")) return true;
  const claims = decodeJwtClaims(token);
  if (!claims || claims.exp === undefined || claims.exp === null) return false;
  const expSeconds = Number(claims.exp);
  if (!Number.isFinite(expSeconds)) return false;
  return expSeconds * 1000 <= nowMs;
}

/**
 * Validate redirect targets so only safe internal app paths are allowed.
 * Rejects external URLs, protocol-relative URLs (//evil.com), backslashes, and javascript: URIs.
 */
export function sanitizeRedirectPath(target, fallback = "/") {
  const raw = String(target || "").trim();
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (/^\/[a-z]+:/i.test(raw)) return fallback;
  return raw;
}

/**
 * Pure frontend route-access check.
 * Unknown or missing roles always fail closed (false).
 */
export function isAllowedForRoute(session, route) {
  if (!session || typeof session !== "object") return false;
  const role = String(session.role || "").trim().toLowerCase();
  const rawRole = String(session.rawRole || session.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (route === "/super-admin" || String(route || "").startsWith("/super-admin/")) {
    return rawRole === "platformsuperadmin" || rawRole === "superadmin";
  }
  if (route === "/admin") {
    return role === "admin" || ["restaurantowner", "restaurantadmin", "branchmanager"].includes(rawRole);
  }
  if (route === "/kot") {
    return role === "kot" || role === "admin" || rawRole === "chef";
  }
  if (route === "/pos" || route === "/staff") {
    return role === "pos" || role === "admin" || ["cashier", "waiter"].includes(rawRole);
  }
  return false;
}

/**
 * Classify HTTP/network API error responses without leaking internal server details.
 */
export function classifyApiError(res) {
  const status = Number(res?.status || 0);
  if (status === 401) {
    return { category: "auth_expired", status, retryable: false, message: "Your session has expired. Please sign in again." };
  }
  if (status === 403) {
    return { category: "forbidden", status, retryable: false, message: "You do not have permission to perform this action." };
  }
  if (status === 404) {
    return { category: "not_found", status, retryable: false, message: res?.error || "Requested resource was not found." };
  }
  if (status === 409) {
    return { category: "conflict", status, retryable: false, message: res?.error || "Conflict with existing record." };
  }
  if (status === 429) {
    const wait = res?.retryAfterSeconds ? ` Try again in ${res.retryAfterSeconds}s.` : "";
    return { category: "rate_limited", status, retryable: false, message: `Too many requests.${wait}` };
  }
  if (status >= 500) {
    return { category: "server_error", status, retryable: false, message: "An unexpected server error occurred. Please try again later." };
  }
  if (status === 0) {
    return { category: "network_error", status: 0, retryable: true, message: res?.error || "Cannot reach the server. Check your connection." };
  }
  return { category: "client_error", status, retryable: false, message: res?.error || `Request failed (HTTP ${status}).` };
}
