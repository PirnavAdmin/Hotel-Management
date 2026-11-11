import { apiClient } from './apiConfig';

const STORAGE_KEY = "bhanu_bistro_reservations_v1";
const TABLES_STORAGE_KEY = "bhanu_bistro_reservation_tables_v1";

const INITIAL_RESERVATIONS = [
  {
    id: "RES-1023",
    reservationId: "RES-1023",
    customerName: "Priya Sharma",
    phone: "+91 98765 43210",
    email: "priya@example.com",
    guests: 2,
    date: "2026-11-11",
    time: "07:30 PM",
    tableId: "T-03",
    tableName: "T-03 (Indoor)",
    section: "Indoor",
    specialRequests: "Anniversary celebration, window table preference.",
    estimatedAmount: 2000,
    advanceAmount: 400,
    paymentMethod: "UPI (Google Pay)",
    status: "confirmed",
    createdAt: "2026-11-10T14:30:00Z",
  },
  {
    id: "RES-1018",
    reservationId: "RES-1018",
    customerName: "Rajesh Varma",
    phone: "+91 91234 56789",
    email: "rajesh@example.com",
    guests: 4,
    date: "2026-11-05",
    time: "08:00 PM",
    tableId: "T-05",
    tableName: "T-05 (Indoor)",
    section: "Indoor",
    specialRequests: "High chair needed for child.",
    estimatedAmount: 3500,
    advanceAmount: 700,
    paymentMethod: "Credit Card",
    status: "completed",
    createdAt: "2026-11-04T10:00:00Z",
  }
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

export function getStoredReservations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RESERVATIONS));
      return INITIAL_RESERVATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RESERVATIONS;
  }
}

export function saveStoredReservations(reservations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  } catch (e) {
    console.warn("localStorage write error:", e);
  }
}

export function getStoredReservationTables() {
  try {
    const raw = localStorage.getItem(TABLES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(INITIAL_TABLES));
      return INITIAL_TABLES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TABLES;
  }
}

export function saveStoredReservationTables(tables) {
  try {
    localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(tables));
  } catch (e) {
    console.warn("localStorage write error:", e);
  }
}

/**
 * Fetch table reservations from backend or fallback to local storage
 * GET /api/v1/reservations?branchId=...&date=...&status=...
 */
export async function apiGetReservations(params = {}) {
  try {
    const queryParts = [];
    if (params.branchId) queryParts.push(`branchId=${encodeURIComponent(params.branchId)}`);
    if (params.date) queryParts.push(`date=${encodeURIComponent(params.date)}`);
    if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await apiClient(`/api/v1/reservations${query}`);
    if (res?.success && Array.isArray(res.data)) {
      return res;
    }
  } catch {}
  return { success: true, data: getStoredReservations() };
}

export async function apiGetReservationById(id) {
  try {
    const res = await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}`);
    if (res?.success) return res;
  } catch {}
  const all = getStoredReservations();
  const found = all.find((r) => r.id === id || r.reservationId === id);
  return { success: !!found, data: found };
}

export async function apiCreateReservation(reservationData) {
  try {
    const res = await apiClient('/api/v1/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
    if (res?.success) return res;
  } catch {}

  const all = getStoredReservations();
  const nextNum = 1000 + all.length + 1;
  const newReservation = {
    id: `RES-${nextNum}`,
    reservationId: `RES-${nextNum}`,
    ...reservationData,
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

export async function apiGetAvailableReservationTables(date, time, guests, branchId = 1) {
  const query = new URLSearchParams({
    date,
    time,
    guests: String(guests),
    branchId: String(branchId)
  }).toString();
  return await apiClient(`/api/v1/reservations/available-tables?${query}`);
}
