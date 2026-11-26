import { apiClient } from "./apiConfig";

export const SAAS_PUBLIC_ENDPOINTS = {
  RESTAURANT_REGISTRATIONS: "/api/v1/public/restaurant-registrations",
  DEMO_REQUESTS: "/api/v1/public/demo-requests",
};

function formatIntegrationResult(res, endpoint, actionLabel) {
  if (res?.success) {
    return {
      success: true,
      blocked: false,
      status: res.status || 200,
      data: res.data,
      endpoint,
    };
  }

  const status = res?.status || 0;
  const isBackendMissing = status === 404 || status === 405 || status === 501 || status === 0;

  return {
    success: false,
    blocked: isBackendMissing,
    status,
    endpoint,
    error: isBackendMissing
      ? `Backend integration pending (${endpoint}): ${actionLabel} could not be submitted because the SaaS public API is not yet live on the server.`
      : res?.error || `Unable to complete ${actionLabel}. Please verify your details and try again.`,
  };
}

/**
 * Submit a new restaurant / organization registration request.
 * Note: Backend endpoint /api/v1/public/restaurant-registrations is not yet implemented
 * in Phase 3.2; this integration point calls the contract honestly and surfaces a BLOCKED
 * notice if the server returns 404/unavailable without simulating success.
 */
export async function apiRegisterRestaurant(payload) {
  const res = await apiClient(SAAS_PUBLIC_ENDPOINTS.RESTAURANT_REGISTRATIONS, {
    method: "POST",
    skipDefaultAuth: true,
    body: JSON.stringify({
      organizationName: String(payload.organizationName || "").trim(),
      restaurantName: String(payload.restaurantName || "").trim(),
      branchName: String(payload.branchName || "").trim(),
      ownerName: String(payload.ownerName || "").trim(),
      email: String(payload.email || "").trim().toLowerCase(),
      phone: String(payload.phone || "").trim(),
      password: payload.password,
      city: String(payload.city || "").trim(),
      address: String(payload.address || "").trim(),
      gstin: String(payload.gstin || "").trim().toUpperCase() || null,
    }),
  });

  return formatIntegrationResult(res, SAAS_PUBLIC_ENDPOINTS.RESTAURANT_REGISTRATIONS, "restaurant registration");
}

/**
 * Submit a SaaS product demo request.
 * Note: Backend endpoint /api/v1/public/demo-requests is not yet implemented in Phase 3.2;
 * this integration point calls the contract honestly and surfaces a BLOCKED notice if unavailable.
 */
export async function apiSubmitDemoRequest(payload) {
  const res = await apiClient(SAAS_PUBLIC_ENDPOINTS.DEMO_REQUESTS, {
    method: "POST",
    skipDefaultAuth: true,
    body: JSON.stringify({
      name: String(payload.name || "").trim(),
      restaurantOrOrg: String(payload.restaurantOrOrg || "").trim(),
      email: String(payload.email || "").trim().toLowerCase(),
      phone: String(payload.phone || "").trim(),
      branchCount: Number(payload.branchCount) || 1,
      message: String(payload.message || "").trim(),
    }),
  });

  return formatIntegrationResult(res, SAAS_PUBLIC_ENDPOINTS.DEMO_REQUESTS, "demo request");
}
