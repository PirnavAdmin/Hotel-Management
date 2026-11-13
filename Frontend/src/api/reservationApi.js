import { apiClient, RESERVATION_API_BASE_URL } from "./apiConfig";
import { apiCustomerRefreshToken, getCustomerRefreshToken, setCustomerRefreshToken } from "./customerAuthApi";

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

let customerRefreshInFlight = null;
const guestRequest = async (endpoint, options = {}, token = "") => {
  const requestToken = token || getReservationCustomerToken();
  const request = () => apiClient(endpoint, {
    ...options,
    baseUrl: RESERVATION_API_BASE_URL,
    skipDefaultAuth: true,
    remoteOnly: true,
    ...(requestToken ? { headers: { Authorization: `Bearer ${requestToken}` } } : {}),
  });
  const result = await request();
  if (result.status !== 401 || !getCustomerRefreshToken()) return result;
  if (!customerRefreshInFlight) {
    customerRefreshInFlight = apiCustomerRefreshToken().then((refreshResult) => {
      const payload = refreshResult.data?.data || refreshResult.data;
      const accessToken = payload?.accessToken || payload?.token || payload?.jwt;
      if (refreshResult.success && accessToken) {
        setReservationCustomerToken(accessToken);
        setCustomerRefreshToken(payload?.refreshToken || "");
        return accessToken;
      }
      setReservationCustomerToken("");
      setCustomerRefreshToken("");
      return "";
    }).finally(() => { customerRefreshInFlight = null; });
  }
  const refreshedToken = await customerRefreshInFlight;
  if (!refreshedToken) return result;
  return apiClient(endpoint, {
    ...options,
    baseUrl: RESERVATION_API_BASE_URL,
    skipDefaultAuth: true,
    remoteOnly: true,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${refreshedToken}` },
  });
};
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
export const apiGetCustomerReservations = (params = {}) =>
  guestRequest(`/api/v1/customers/me/reservations${queryString(params)}`, {}, getReservationCustomerToken());
export const apiGetReservationDetails = (id, token = getReservationCustomerToken()) =>
  guestRequest(`${BASE}/${encodeURIComponent(id)}`, {}, token);
export const apiGetCustomerProfile = () =>
  guestRequest("/api/v1/customers/me", {}, getReservationCustomerToken());
export const apiGetMyCustomerOrders = ({ page = 1, pageSize = 20, status } = {}) =>
  guestRequest(`/api/v1/customers/me/orders${queryString({ page, pageSize, status })}`, {}, getReservationCustomerToken());
export const apiGetCustomerTakeawayOrder = (orderId) =>
  guestRequest(`/api/v1/takeaway/orders/${encodeURIComponent(orderId)}`, {}, getReservationCustomerToken());
export const apiCreateCustomerTakeawayOrder = (orderData) =>
  guestRequest("/api/v1/takeaway/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  }, getReservationCustomerToken());
export const apiModifyReservation = (id, data) =>
  guestRequest(`${BASE}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }, getReservationCustomerToken());
export const apiCancelCustomerReservation = (id, data = {}) =>
  post(`${BASE}/${encodeURIComponent(id)}/cancel`, data, getReservationCustomerToken());
export const apiRecordReservationPayment = (id, data) =>
  post(`${BASE}/${encodeURIComponent(id)}/payment`, data, getReservationCheckoutToken());
export const apiGetReservationPaymentStatus = (id) =>
  guestRequest(`${BASE}/${encodeURIComponent(id)}/payment-status`, {}, getReservationCustomerToken());

// Local helpers remain for the legacy POS reservation wizard only.
const STORAGE_KEY = "bhanu_bistro_reservations_v1";
const TABLES_STORAGE_KEY = "bhanu_bistro_reservation_tables_v1";
const INITIAL_RESERVATIONS = [];
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
  return unwrap(await apiClient(`${BASE}${queryString(params)}`, { remoteOnly: true }));
}
export async function apiGetReservationById(id) {
  return unwrap(await apiClient(`${BASE}/${encodeURIComponent(id)}`, { remoteOnly: true }));
}
export async function apiCreateReservation(reservationData) {
  return unwrap(await apiClient(BASE, {
    method: "POST",
    body: JSON.stringify(reservationData),
    remoteOnly: true,
  }));
}

export async function apiUpdateReservation(id, reservationData) {
  return unwrap(await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(reservationData),
    remoteOnly: true,
  }));
}

export async function apiUpdateReservationStatus(id, status) {
  return unwrap(await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
    remoteOnly: true,
  }));
}

export async function apiDeleteReservation(id) {
  return unwrap(await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    remoteOnly: true,
  }));
}

export const apiCancelReservation = apiDeleteReservation;
