import { apiClient } from "./apiConfig";

const BASE = "/api/v1/reservations";
const CHECKOUT_TOKEN_KEY = "bhanu_reservation_checkout_token";
const CUSTOMER_TOKEN_KEY = "bhanu_reservation_otp_token";
const safeStorage = () => {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
};

export const getReservationCheckoutToken = () => safeStorage()?.getItem(CHECKOUT_TOKEN_KEY) || "";
export const setReservationCheckoutToken = (token) => {
  if (token) safeStorage()?.setItem(CHECKOUT_TOKEN_KEY, token);
  else safeStorage()?.removeItem(CHECKOUT_TOKEN_KEY);
};
export const getReservationCustomerToken = () => safeStorage()?.getItem(CUSTOMER_TOKEN_KEY) || "";
export const setReservationCustomerToken = (token) => {
  if (token) safeStorage()?.setItem(CUSTOMER_TOKEN_KEY, token);
  else safeStorage()?.removeItem(CUSTOMER_TOKEN_KEY);
};
export const clearReservationTokens = () => {
  setReservationCheckoutToken("");
  setReservationCustomerToken("");
};

const guestRequest = (endpoint, options = {}, token = "") => apiClient(endpoint, {
  ...options,
  remoteOnly: true,
  ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
});
const queryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
};
const post = (endpoint, data, token) => guestRequest(endpoint, {
  method: "POST",
  body: JSON.stringify(data),
}, token);

export const apiCheckReservationAvailability = (params) =>
  guestRequest(`${BASE}/availability${queryString(params)}`);
export const apiGetAvailableReservationTables = (params) =>
  guestRequest(`${BASE}/available-tables${queryString(params)}`);
export const apiGetReservationTableDetails = (tableId, params) =>
  guestRequest(`${BASE}/tables/${encodeURIComponent(tableId)}${queryString(params)}`);
export const apiCreatePublicReservation = (data) => post(BASE, data);
export const apiSendReservationOtp = (phone) => post(`${BASE}/otp/send`, { phone });
export const apiVerifyReservationOtp = (phone, otp) => post(`${BASE}/otp/verify`, { phone, otp });
export const apiGetMyReservations = (params = {}) =>
  guestRequest(`${BASE}/my${queryString(params)}`, {}, getReservationCustomerToken());
export const apiGetReservationDetails = (id, token = getReservationCheckoutToken() || getReservationCustomerToken()) =>
  guestRequest(`${BASE}/${encodeURIComponent(id)}`, {}, token);
export const apiModifyReservation = (id, data) =>
  guestRequest(`${BASE}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }, getReservationCustomerToken());
export const apiCancelCustomerReservation = (id, data = {}) =>
  post(`${BASE}/${encodeURIComponent(id)}/cancel`, data, getReservationCustomerToken());
export const apiRecordReservationPayment = (id, data) =>
  post(`${BASE}/${encodeURIComponent(id)}/payment`, data, getReservationCheckoutToken());
export const apiGetReservationPaymentStatus = (id) =>
  guestRequest(`${BASE}/${encodeURIComponent(id)}/payment-status`, {}, getReservationCheckoutToken() || getReservationCustomerToken());

// Local helpers remain for the legacy POS reservation wizard only.
const STORAGE_KEY = "bhanu_bistro_reservations_v1";
const TABLES_STORAGE_KEY = "bhanu_bistro_reservation_tables_v1";
const INITIAL_RESERVATIONS = [
  { id: "RES-1023", reservationId: "RES-1023", customerName: "Priya Sharma", phone: "+91 98765 43210", email: "priya@example.com", guests: 2, date: "2026-11-11", time: "07:30 PM", tableId: "T-03", tableName: "T-03 (Indoor)", section: "Indoor", specialRequests: "Anniversary celebration, window table preference.", estimatedAmount: 2000, advanceAmount: 100, paymentMethod: "UPI (Google Pay)", status: "confirmed", createdAt: "2026-11-10T14:30:00Z" },
  { id: "RES-1018", reservationId: "RES-1018", customerName: "Rajesh Varma", phone: "+91 91234 56789", email: "rajesh@example.com", guests: 4, date: "2026-11-05", time: "08:00 PM", tableId: "T-05", tableName: "T-05 (Indoor)", section: "Indoor", specialRequests: "High chair needed for child.", estimatedAmount: 3500, advanceAmount: 100, paymentMethod: "Credit Card", status: "completed", createdAt: "2026-11-04T10:00:00Z" },
  { id: "RES-1012", reservationId: "RES-1012", customerName: "Ananya Roy", phone: "+91 99887 76655", email: "ananya@example.com", guests: 6, date: "2026-10-28", time: "01:30 PM", tableId: "T-08", tableName: "T-08 (Outdoor)", section: "Outdoor", specialRequests: "Family lunch reunion.", estimatedAmount: 5000, advanceAmount: 100, paymentMethod: "Net Banking", status: "completed", createdAt: "2026-10-27T16:00:00Z" },
];
const INITIAL_TABLES = [
  { id: "T-01", name: "T-01", capacity: 2, section: "Indoor", status: "available" },
  { id: "T-02", name: "T-02", capacity: 4, section: "Indoor", status: "reserved" },
  { id: "T-03", name: "T-03", capacity: 2, section: "Indoor", status: "available" },
  { id: "T-04", name: "T-04", capacity: 4, section: "Indoor", status: "reserved" },
  { id: "T-05", name: "T-05", capacity: 4, section: "Indoor", status: "available" },
  { id: "T-06", name: "T-06", capacity: 6, section: "Outdoor", status: "reserved" },
  { id: "T-07", name: "T-07", capacity: 4, section: "Outdoor", status: "available" },
  { id: "T-08", name: "T-08", capacity: 6, section: "Indoor", status: "available" },
  { id: "T-09", name: "T-09", capacity: 8, section: "Indoor", status: "available" },
  { id: "T-10", name: "T-10", capacity: 4, section: "Outdoor", status: "available" },
];
const readStored = (key, initial) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return initial;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initial;
  } catch {
    return initial;
  }
};
export const getStoredReservations = () => readStored(STORAGE_KEY, INITIAL_RESERVATIONS);
export function saveStoredReservations(reservations) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations)); } catch { /* Storage may be unavailable. */ }
}
export const getStoredReservationTables = () => readStored(TABLES_STORAGE_KEY, INITIAL_TABLES);
export function saveStoredReservationTables(tables) {
  try { localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(tables)); } catch { /* Storage may be unavailable. */ }
}

const unwrap = (result) => {
  if (!result?.success) return result;
  const payload = result.data;
  return payload && Object.hasOwn(payload, "data") ? { ...result, data: payload.data } : result;
};

/** Legacy Admin/POS listing contract. Never substitute guest-facing mock records. */
export async function apiGetReservations(params = {}) {
  return unwrap(await apiClient(`${BASE}${queryString(params)}`));
}
export async function apiGetReservationById(id) {
  return unwrap(await apiClient(`${BASE}/${encodeURIComponent(id)}`));
}
export async function apiCreateReservation(reservationData) {
  return unwrap(await apiClient(BASE, { method: "POST", body: JSON.stringify(reservationData) }));
}
export async function apiUpdateReservation(id, data) {
  return unwrap(await apiClient(`${BASE}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }));
}
export async function apiUpdateReservationStatus(id, status) {
  return unwrap(await apiClient(`${BASE}/${encodeURIComponent(id)}/status`, {
    method: "PUT", body: JSON.stringify({ status }),
  }));
}
export async function apiDeleteReservation(id) {
  return apiClient(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export const apiCancelReservation = apiDeleteReservation;
