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
export const apiGetReservationDetails = (id, token = getReservationCustomerToken()) =>
  guestRequest(`${BASE}/${encodeURIComponent(id)}`, {}, token);
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
  try {
    const remote = await apiClient(BASE, { method: "POST", body: JSON.stringify(reservationData) });
    if (remote?.success) return unwrap(remote);
  } catch {
    // Fallback to local storage when backend is unreachable or offline
  }

  const all = getStoredReservations();
  const nextNum = 1000 + all.length + 1;
  const newReservation = {
    id: `RES-${nextNum}`,
    reservationId: `RES-${nextNum}`,
    ...reservationData,
    advanceAmount: reservationData?.advanceAmount || 100,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  const updated = [newReservation, ...all];
  saveStoredReservations(updated);

  if (reservationData?.tableId) {
    const tables = getStoredReservationTables();
    const updatedTables = tables.map((t) =>
      t.id === reservationData.tableId ? { ...t, status: "reserved" } : t
    );
    saveStoredReservationTables(updatedTables);
  }

  return { success: true, data: newReservation };
}

export async function apiUpdateReservation(id, reservationData) {
  try {
    const res = await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(reservationData)
    });
    if (res?.success) return res;
  } catch {}

  const all = getStoredReservations();
  const updated = all.map((r) => (r.id === id || r.reservationId === id ? { ...r, ...reservationData } : r));
  saveStoredReservations(updated);
  return { success: true, data: updated.find((r) => r.id === id || r.reservationId === id) };
}

export async function apiUpdateReservationStatus(id, status) {
  try {
    const res = await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    if (res?.success) return res;
  } catch {}

  return await apiUpdateReservation(id, { status });
}

export async function apiDeleteReservation(id) {
  try {
    const res = await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (res?.success) return res;
  } catch {}

  const all = getStoredReservations();
  const target = all.find((r) => r.id === id || r.reservationId === id);
  const updated = all.filter((r) => r.id !== id && r.reservationId !== id);
  saveStoredReservations(updated);

  if (target?.tableId) {
    const tables = getStoredReservationTables();
    const updatedTables = tables.map((t) =>
      t.id === target.tableId ? { ...t, status: "available" } : t
    );
    saveStoredReservationTables(updatedTables);
  }

  return { success: true, message: "Reservation deleted successfully." };
}

export const apiCancelReservation = apiDeleteReservation;
