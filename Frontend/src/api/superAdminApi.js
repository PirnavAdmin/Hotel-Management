import { apiClient } from "./apiConfig";
import { apiGetUsers, apiCreateUser, apiUpdateUser } from "./userApi";
import { apiGetRoles } from "./roleApi";
import { apiGetAuditLogs } from "./auditApi";

function wrapSuperAdminResponse(res, endpoint, label) {
  if (res?.success) {
    return {
      success: true,
      integrationPending: false,
      status: res.status || 200,
      data: res.data,
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
      ? `Integration Pending (${endpoint}): ${label} requires the ASP.NET Core Super Admin API.`
      : res?.error || `Failed to load ${label}.`,
  };
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") {
      qs.set(k, String(v));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

// 1. Platform Dashboard
export async function apiGetSuperAdminDashboard() {
  const endpoint = "/api/v1/super-admin/dashboard/summary";
  const res = await apiClient(endpoint);
  return wrapSuperAdminResponse(res, endpoint, "platform dashboard summary");
}

// 2. Tenant Management
export async function apiGetTenants(params = {}) {
  const endpoint = `/api/v1/super-admin/tenants${buildQuery(params)}`;
  const res = await apiClient(endpoint);
  return wrapSuperAdminResponse(res, "/api/v1/super-admin/tenants", "tenant directory");
}

export async function apiCreateTenant(payload) {
  const endpoint = "/api/v1/super-admin/tenants";
  const res = await apiClient(endpoint, { method: "POST", body: JSON.stringify(payload) });
  return wrapSuperAdminResponse(res, endpoint, "create tenant");
}

export async function apiUpdateTenant(tenantId, payload) {
  const endpoint = `/api/v1/super-admin/tenants/${encodeURIComponent(tenantId)}`;
  const res = await apiClient(endpoint, { method: "PUT", body: JSON.stringify(payload) });
  return wrapSuperAdminResponse(res, endpoint, "update tenant");
}

export async function apiSetTenantStatus(tenantId, status, reason = "") {
  const endpoint = `/api/v1/super-admin/tenants/${encodeURIComponent(tenantId)}/status`;
  const res = await apiClient(endpoint, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
  return wrapSuperAdminResponse(res, endpoint, "update tenant status");
}

// 3. Restaurant Registration Approvals
export async function apiGetRegistrations(params = {}) {
  const endpoint = `/api/v1/super-admin/registrations${buildQuery(params)}`;
  const res = await apiClient(endpoint);
  return wrapSuperAdminResponse(res, "/api/v1/super-admin/registrations", "registration queue");
}

export async function apiApproveRegistration(registrationId) {
  const endpoint = `/api/v1/super-admin/registrations/${encodeURIComponent(registrationId)}/approve`;
  const res = await apiClient(endpoint, { method: "POST", body: JSON.stringify({}) });
  return wrapSuperAdminResponse(res, endpoint, "approve registration");
}

export async function apiRejectRegistration(registrationId, reason) {
  const endpoint = `/api/v1/super-admin/registrations/${encodeURIComponent(registrationId)}/reject`;
  const res = await apiClient(endpoint, { method: "POST", body: JSON.stringify({ reason }) });
  return wrapSuperAdminResponse(res, endpoint, "reject registration");
}

// 4. Admin & User Management (reuses confirmed /api/v1/users contract)
export async function apiGetSuperAdminUsers() {
  const res = await apiGetUsers();
  if (res?.success) {
    const raw = res.data;
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.users)
        ? raw.users
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
    return {
      success: true,
      integrationPending: false,
      status: res.status || 200,
      data: list,
      endpoint: "/api/v1/users",
      error: "",
    };
  }
  return wrapSuperAdminResponse(res, "/api/v1/users", "admin & user directory");
}

export async function apiSaveSuperAdminUser(userId, payload) {
  const res = userId ? await apiUpdateUser(userId, payload) : await apiCreateUser(payload);
  return wrapSuperAdminResponse(res, "/api/v1/users", userId ? "update user" : "create user");
}

// 5. Branch Management
export async function apiGetBranches(params = {}) {
  const endpoint = `/api/v1/super-admin/branches${buildQuery(params)}`;
  const res = await apiClient(endpoint);
  return wrapSuperAdminResponse(res, "/api/v1/super-admin/branches", "branch directory");
}

export async function apiSaveBranch(branchId, payload) {
  const endpoint = branchId
    ? `/api/v1/super-admin/branches/${encodeURIComponent(branchId)}`
    : "/api/v1/super-admin/branches";
  const res = await apiClient(endpoint, {
    method: branchId ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
  return wrapSuperAdminResponse(res, "/api/v1/super-admin/branches", branchId ? "update branch" : "create branch");
}

// 6. Roles & Permissions (reuses confirmed GET /api/v1/roles + super-admin matrix endpoint)
export async function apiGetPlatformRoles() {
  const res = await apiGetRoles();
  if (res?.success) {
    const raw = res.data;
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.roles) ? raw.roles : [];
    return {
      success: true,
      integrationPending: false,
      status: res.status || 200,
      data: list,
      endpoint: "/api/v1/roles",
      error: "",
    };
  }
  return wrapSuperAdminResponse(res, "/api/v1/roles", "platform roles");
}

export async function apiSaveRolePermissions(roleKey, permissionsPayload) {
  const endpoint = `/api/v1/super-admin/roles/${encodeURIComponent(roleKey)}/permissions`;
  const res = await apiClient(endpoint, { method: "PUT", body: JSON.stringify(permissionsPayload) });
  return wrapSuperAdminResponse(res, endpoint, "save role permissions");
}

// 7. Subscription Management
export async function apiGetSubscriptions(params = {}) {
  const endpoint = `/api/v1/super-admin/subscriptions${buildQuery(params)}`;
  const res = await apiClient(endpoint);
  return wrapSuperAdminResponse(res, "/api/v1/super-admin/subscriptions", "tenant subscriptions");
}

export async function apiUpdateTenantSubscription(subscriptionId, payload) {
  const endpoint = `/api/v1/super-admin/subscriptions/${encodeURIComponent(subscriptionId)}`;
  const res = await apiClient(endpoint, { method: "PUT", body: JSON.stringify(payload) });
  return wrapSuperAdminResponse(res, endpoint, "update subscription plan");
}

// 8. SaaS Billing Management
export async function apiGetSaasBillingInvoices(params = {}) {
  const endpoint = `/api/v1/super-admin/billing/invoices${buildQuery(params)}`;
  const res = await apiClient(endpoint);
  return wrapSuperAdminResponse(res, "/api/v1/super-admin/billing/invoices", "SaaS billing invoices");
}

// 9. Audit Logs (reuses confirmed GET /api/v1/audit/logs)
export async function apiGetPlatformAuditLogs(params = {}) {
  const res = await apiGetAuditLogs(params);
  if (res?.success) {
    return {
      success: true,
      integrationPending: false,
      status: res.status || 200,
      data: res.data,
      endpoint: "/api/v1/audit/logs",
      error: "",
    };
  }
  return wrapSuperAdminResponse(res, "/api/v1/audit/logs", "platform audit logs");
}

// 10. Support Management
export async function apiGetSupportTickets(params = {}) {
  const endpoint = `/api/v1/super-admin/support-tickets${buildQuery(params)}`;
  const res = await apiClient(endpoint);
  return wrapSuperAdminResponse(res, "/api/v1/super-admin/support-tickets", "support tickets");
}

export async function apiAddTicketNote(ticketId, note) {
  const endpoint = `/api/v1/super-admin/support-tickets/${encodeURIComponent(ticketId)}/notes`;
  const res = await apiClient(endpoint, { method: "POST", body: JSON.stringify({ note }) });
  return wrapSuperAdminResponse(res, endpoint, "save internal support note");
}

// 11. Platform Settings
export async function apiGetPlatformSettings() {
  const endpoint = "/api/v1/super-admin/settings";
  const res = await apiClient(endpoint);
  return wrapSuperAdminResponse(res, endpoint, "platform settings");
}

export async function apiSavePlatformSettings(payload) {
  const endpoint = "/api/v1/super-admin/settings";
  const res = await apiClient(endpoint, { method: "PUT", body: JSON.stringify(payload) });
  return wrapSuperAdminResponse(res, endpoint, "save platform settings");
}
