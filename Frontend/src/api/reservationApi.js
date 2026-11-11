// Pure Frontend Mock Reservation Service - ZERO API / Backend dependencies
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
    advanceAmount: 100,
    paymentMethod: "UPI (Google Pay)",
    status: "confirmed", // confirmed | cancelled
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
    advanceAmount: 100,
    paymentMethod: "Credit Card",
    status: "completed",
    createdAt: "2026-11-04T10:00:00Z",
  },
  {
    id: "RES-1012",
    reservationId: "RES-1012",
    customerName: "Ananya Roy",
    phone: "+91 99887 76655",
    email: "ananya@example.com",
    guests: 6,
    date: "2026-10-28",
    time: "01:30 PM",
    tableId: "T-08",
    tableName: "T-08 (Outdoor)",
    section: "Outdoor",
    specialRequests: "Family lunch reunion.",
    estimatedAmount: 5000,
    advanceAmount: 100,
    paymentMethod: "Net Banking",
    status: "completed",
    createdAt: "2026-10-27T16:00:00Z",
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

// Pure mock API functions that resolve immediately with NO network calls
export async function apiGetReservations() {
  return { success: true, data: getStoredReservations() };
}

export async function apiCreateReservation(data) {
  const all = getStoredReservations();
  const nextNum = 1000 + all.length + 1;
  const newReservation = {
    id: `RES-${nextNum}`,
    reservationId: `RES-${nextNum}`,
    ...data,
    advanceAmount: data?.advanceAmount || 100,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  const updated = [newReservation, ...all];
  saveStoredReservations(updated);

  // Mark table as reserved
  const tables = getStoredReservationTables();
  const updatedTables = tables.map((t) =>
    t.id === data.tableId ? { ...t, status: "reserved" } : t
  );
  saveStoredReservationTables(updatedTables);

  return { success: true, data: newReservation };
}

export async function apiUpdateReservation(id, data) {
  const all = getStoredReservations();
  const updated = all.map((r) => (r.id === id || r.reservationId === id ? { ...r, ...data } : r));
  saveStoredReservations(updated);
  return { success: true, data: updated.find((r) => r.id === id || r.reservationId === id) };
}

export async function apiUpdateReservationStatus(id, status) {
  const all = getStoredReservations();
  const updated = all.map((r) => (r.id === id || r.reservationId === id ? { ...r, status } : r));
  saveStoredReservations(updated);
  return { success: true, data: updated.find((r) => r.id === id || r.reservationId === id) };
}

export async function apiDeleteReservation(id) {
  return await apiCancelReservation(id);
}

export async function apiCancelReservation(id) {
  const all = getStoredReservations();
  const target = all.find((r) => r.id === id || r.reservationId === id);
  const updated = all.map((r) =>
    r.id === id || r.reservationId === id ? { ...r, status: "cancelled" } : r
  );
  saveStoredReservations(updated);

  // Free table
  if (target?.tableId) {
    const tables = getStoredReservationTables();
    const updatedTables = tables.map((t) =>
      t.id === target.tableId ? { ...t, status: "available" } : t
    );
    saveStoredReservationTables(updatedTables);
  }

  return { success: true, message: "Reservation cancelled successfully." };
}
