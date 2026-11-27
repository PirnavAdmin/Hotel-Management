import { apiClient } from "./apiConfig";

function wrapWorkspaceResult(res, endpoint, label) {
  if (res?.success) {
    const raw = res.data;
    const unwrapped =
      raw && typeof raw === "object" && !Array.isArray(raw) && "success" in raw && "data" in raw
        ? raw.data
        : raw;
    return {
      success: true,
      integrationPending: false,
      status: res.status || 200,
      data: unwrapped,
      endpoint,
      error: "",
    };
  }
  const status = res?.status || 0;
  const isMissing = status === 404 || status === 405 || status === 501 || status === 0;
  return {
    success: false,
    integrationPending: isMissing,
    status,
    data: null,
    endpoint,
    error: isMissing
      ? `Integration Pending (${endpoint}): ${label} requires ASP.NET Core multi-tenant workspace APIs.`
      : res?.error || `Failed to load ${label}.`,
  };
}

/**
 * Fetch organizations, restaurants, and branches authorized for the signed-in user.
 * GET /api/v1/workspaces/authorized
 */
export async function apiGetAuthorizedWorkspaces() {
  const endpoint = "/api/v1/workspaces/authorized";
  const res = await apiClient(endpoint);
  return wrapWorkspaceResult(res, endpoint, "authorized workspaces");
}

/**
 * Request server-validated active workspace context switch (Organization -> Restaurant -> Branch).
 * Never mutates authorization locally if the backend endpoint is unavailable.
 * POST /api/v1/workspaces/switch-context
 */
export async function apiSwitchWorkspaceContext({ organizationId, restaurantId, branchId }) {
  const endpoint = "/api/v1/workspaces/switch-context";
  const res = await apiClient(endpoint, {
    method: "POST",
    body: JSON.stringify({ organizationId, restaurantId, branchId }),
  });
  return wrapWorkspaceResult(res, endpoint, "workspace context switch");
}

/**
 * Fetch current tenant subscription plan, limits, and module entitlements.
 * GET /api/v1/tenant/subscription
 */
export async function apiGetTenantSubscriptionEntitlement() {
  const endpoint = "/api/v1/tenant/subscription";
  const res = await apiClient(endpoint);
  return wrapWorkspaceResult(res, endpoint, "subscription entitlement");
}
