import { apiClient } from "./apiConfig";

const BASE = "/api/v1/takeaway";
const queryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
};
const unwrap = async (request) => {
  const result = await request;
  if (!result?.success) return result;
  const payload = result.data;
  return payload && Object.hasOwn(payload, "data")
    ? { ...result, data: payload.data }
    : result;
};
const remote = { remoteOnly: true };

export const apiGetAdminTakeawayOrders = (params = {}) =>
  unwrap(apiClient(`${BASE}/orders${queryString(params)}`, remote));
export async function apiGetAllAdminTakeawayOrders() {
  const pageSize = 100;
  const first = await apiGetAdminTakeawayOrders({ page: 1, pageSize });
  if (!first?.success) return first;
  const pageData = first.data || {};
  const all = Array.isArray(pageData) ? pageData : (pageData.data || []);
  const totalPages = Math.max(1, Number(pageData.totalPages) || Math.ceil((Number(pageData.totalCount) || all.length) / pageSize));
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await apiGetAdminTakeawayOrders({ page, pageSize });
    if (!next?.success) return next;
    const nextData = next.data || {};
    all.push(...(Array.isArray(nextData) ? nextData : (nextData.data || [])));
  }
  return { ...first, data: all };
}
export const apiGetAdminTakeawaySummary = (params = {}) =>
  unwrap(apiClient(`${BASE}/orders/summary${queryString(params)}`, remote));
export const apiGetAdminTakeawayOrder = (id) =>
  unwrap(apiClient(`${BASE}/orders/${encodeURIComponent(id)}`, remote));
export const apiUpdateAdminTakeawayStatus = (id, status) =>
  unwrap(apiClient(`${BASE}/orders/${encodeURIComponent(id)}/status`, {
    ...remote,
    method: "PATCH",
    body: JSON.stringify({ status }),
  }));
export const apiCancelAdminTakeawayOrder = (id, reason) =>
  unwrap(apiClient(`${BASE}/orders/${encodeURIComponent(id)}/cancel`, {
    ...remote,
    method: "POST",
    body: JSON.stringify({ reason }),
  }));
export const apiGetAdminTakeawayMenu = (params = {}) =>
  unwrap(apiClient(`${BASE}/menu${queryString(params)}`, remote));
export const apiSearchAdminTakeawayMenu = (query, category) =>
  unwrap(apiClient(`${BASE}/menu/search${queryString({ query, category })}`, remote));
export const apiGetAdminTakeawayCategories = () =>
  unwrap(apiClient(`${BASE}/categories`, remote));
export const apiCalculateAdminTakeawayCart = (payload) =>
  unwrap(apiClient(`${BASE}/calculate`, {
    ...remote,
    method: "POST",
    body: JSON.stringify(payload),
  }));
export const apiCreateAdminTakeawayOrder = (payload) =>
  unwrap(apiClient(`${BASE}/orders`, {
    ...remote,
    method: "POST",
    body: JSON.stringify(payload),
  }));
export const apiGetAdminTakeawayInvoice = (id) =>
  unwrap(apiClient(`${BASE}/invoices/${encodeURIComponent(id)}`, remote));

