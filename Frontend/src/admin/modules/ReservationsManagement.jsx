import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  Plus,
  RefreshCw,
  CheckCircle2,
  Check,
  Clock,
  Hourglass,
  Utensils,
  XCircle,
  X,
  Trash2,
  User,
  Phone,
  Users,
  Search,
  ChevronDown,
  Eye,
  Printer,
  MoreHorizontal,
  MapPin,
  Sparkles,
  CreditCard,
  FileText,
  AlertCircle,
  Receipt as ReceiptIcon,
} from "lucide-react";
import {
  apiGetReservations,
  apiCreateReservation,
  apiUpdateReservationStatus,
  apiDeleteReservation,
  getStoredReservations,
  saveStoredReservations,
  getStoredReservationTables,
  saveStoredReservationTables,
} from "../../api/reservationApi";
import { apiGetTables } from "../../api/tableApi";
import { ReceiptModal, formatOrderNumber } from "../../user/ReceiptModal";

const STORAGE_KEY_RESERVATIONS = "bhanu_bistro_reservations_v1";

// ── Default Curated Seed Reservations (matches Takeaway scale & IDs: RES-4964, RES-3884, etc.) ──
const INITIAL_SEED_RESERVATIONS = [
  {
    id: "RES-4964",
    reservationId: "RES-4964",
    customerName: "Priya Sharma",
    phone: "+91 98765 43210",
    email: "priya.sharma@example.com",
    tableId: 3,
    tableName: "Table 3 (Indoor AC)",
    tableNumber: 3,
    guestsCount: 2,
    reservationDate: "2026-11-12",
    reservationTime: "07:30 PM",
    status: "confirmed",
    advanceAmount: 100,
    paymentMethod: "UPI (Google Pay)",
    notes: "Anniversary celebration. Window table preference.",
    createdAt: "2026-11-12T10:30:00",
  },
  {
    id: "RES-3884",
    reservationId: "RES-3884",
    customerName: "Ramesh Kumar",
    phone: "+91 98450 11223",
    email: "ramesh.k@example.com",
    tableId: 5,
    tableName: "Table 5 (Main Hall)",
    tableNumber: 5,
    guestsCount: 4,
    reservationDate: "2026-11-12",
    reservationTime: "08:00 PM",
    status: "confirmed",
    advanceAmount: 200,
    paymentMethod: "UPI (PhonePe)",
    notes: "High chair needed for a child.",
    createdAt: "2026-11-12T11:15:00",
  },
  {
    id: "RES-9156",
    reservationId: "RES-9156",
    customerName: "Vikram Singh",
    phone: "+91 90085 33445",
    email: "vikram.s@example.com",
    tableId: 8,
    tableName: "Table 8 (Outdoor Patio)",
    tableNumber: 8,
    guestsCount: 6,
    reservationDate: "2026-11-12",
    reservationTime: "08:30 PM",
    status: "seated",
    advanceAmount: 300,
    paymentMethod: "Card",
    notes: "Family reunion dinner. Warm lighting preferred.",
    createdAt: "2026-11-12T09:45:00",
  },
  {
    id: "RES-6157",
    reservationId: "RES-6157",
    customerName: "Ananya Reddy",
    phone: "+91 99887 76655",
    email: "ananya.r@example.com",
    tableId: 2,
    tableName: "Table 2 (Indoor AC)",
    tableNumber: 2,
    guestsCount: 2,
    reservationDate: "2026-11-12",
    reservationTime: "07:00 PM",
    status: "confirmed",
    advanceAmount: 100,
    paymentMethod: "UPI (Paytm)",
    notes: "Quiet corner table for birthday celebration.",
    createdAt: "2026-11-12T12:00:00",
  },
  {
    id: "RES-2515",
    reservationId: "RES-2515",
    customerName: "Karthik Mohan",
    phone: "+91 78902 55661",
    email: "karthik.m@example.com",
    tableId: 4,
    tableName: "Table 4 (Indoor AC)",
    tableNumber: 4,
    guestsCount: 4,
    reservationDate: "2026-11-12",
    reservationTime: "09:00 PM",
    status: "pending",
    advanceAmount: 200,
    paymentMethod: "UPI",
    notes: "Please keep dessert menu ready.",
    createdAt: "2026-11-12T13:20:00",
  },
  {
    id: "RES-5306",
    reservationId: "RES-5306",
    customerName: "Suresh Das",
    phone: "+91 99804 22110",
    email: "suresh.das@example.com",
    tableId: 6,
    tableName: "Table 6 (Outdoor Garden)",
    tableNumber: 6,
    guestsCount: 6,
    reservationDate: "2026-11-12",
    reservationTime: "01:30 PM",
    status: "completed",
    advanceAmount: 300,
    paymentMethod: "Cash",
    notes: "Corporate executive lunch meeting.",
    createdAt: "2026-11-12T08:15:00",
  },
  {
    id: "RES-1023",
    reservationId: "RES-1023",
    customerName: "Sneha Reddy",
    phone: "+91 98451 22334",
    email: "sneha.reddy@example.com",
    tableId: 1,
    tableName: "Table 1 (Indoor)",
    tableNumber: 1,
    guestsCount: 2,
    reservationDate: "2026-11-13",
    reservationTime: "08:00 PM",
    status: "confirmed",
    advanceAmount: 100,
    paymentMethod: "UPI",
    notes: "Candlelight arrangement requested.",
    createdAt: "2026-11-11T16:40:00",
  },
  {
    id: "RES-1022",
    reservationId: "RES-1022",
    customerName: "Rahul Verma",
    phone: "+91 98112 44556",
    email: "rahul.v@example.com",
    tableId: 7,
    tableName: "Table 7 (Outdoor)",
    tableNumber: 7,
    guestsCount: 4,
    reservationDate: "2026-11-13",
    reservationTime: "07:30 PM",
    status: "pending",
    advanceAmount: 200,
    paymentMethod: "Card",
    notes: "Non-smoking zone required.",
    createdAt: "2026-11-11T15:20:00",
  },
  {
    id: "RES-1021",
    reservationId: "RES-1021",
    customerName: "Meenakshi Sundaram",
    phone: "+91 97334 55667",
    email: "meenakshi@example.com",
    tableId: 9,
    tableName: "Table 9 (Private Dining)",
    tableNumber: 9,
    guestsCount: 8,
    reservationDate: "2026-11-13",
    reservationTime: "08:30 PM",
    status: "confirmed",
    advanceAmount: 500,
    paymentMethod: "Net Banking",
    notes: "Exclusive private dining booking with custom banquet menu.",
    createdAt: "2026-11-11T14:10:00",
  },
  {
    id: "RES-1020",
    reservationId: "RES-1020",
    customerName: "Aditya Roy",
    phone: "+91 96221 88990",
    email: "aditya.roy@example.com",
    tableId: 3,
    tableName: "Table 3 (Indoor AC)",
    tableNumber: 3,
    guestsCount: 2,
    reservationDate: "2026-11-11",
    reservationTime: "08:00 PM",
    status: "completed",
    advanceAmount: 100,
    paymentMethod: "UPI",
    notes: "Dinner completed happily.",
    createdAt: "2026-11-10T12:00:00",
  },
  {
    id: "RES-1019",
    reservationId: "RES-1019",
    customerName: "Pooja Hegde",
    phone: "+91 95443 22110",
    email: "pooja.h@example.com",
    tableId: 5,
    tableName: "Table 5 (Main Hall)",
    tableNumber: 5,
    guestsCount: 4,
    reservationDate: "2026-11-11",
    reservationTime: "07:30 PM",
    status: "completed",
    advanceAmount: 200,
    paymentMethod: "UPI",
    notes: "",
    createdAt: "2026-11-10T11:00:00",
  },
  {
    id: "RES-1018",
    reservationId: "RES-1018",
    customerName: "Rajesh Varma",
    phone: "+91 91234 56789",
    email: "rajesh@example.com",
    tableId: 8,
    tableName: "Table 8 (Outdoor Patio)",
    tableNumber: 8,
    guestsCount: 4,
    reservationDate: "2026-11-11",
    reservationTime: "08:30 PM",
    status: "completed",
    advanceAmount: 200,
    paymentMethod: "Credit Card",
    notes: "High chair for child.",
    createdAt: "2026-11-09T18:00:00",
  },
  {
    id: "RES-1017",
    reservationId: "RES-1017",
    customerName: "Gautam Rao",
    phone: "+91 94332 11998",
    email: "gautam.rao@example.com",
    tableId: 2,
    tableName: "Table 2 (Indoor AC)",
    tableNumber: 2,
    guestsCount: 2,
    reservationDate: "2026-11-10",
    reservationTime: "08:00 PM",
    status: "completed",
    advanceAmount: 100,
    paymentMethod: "UPI",
    notes: "",
    createdAt: "2026-11-09T14:30:00",
  },
  {
    id: "RES-1016",
    reservationId: "RES-1016",
    customerName: "Divya Nair",
    phone: "+91 94810 77550",
    email: "divya.n@example.com",
    tableId: 6,
    tableName: "Table 6 (Outdoor Garden)",
    tableNumber: 6,
    guestsCount: 6,
    reservationDate: "2026-11-09",
    reservationTime: "01:30 PM",
    status: "completed",
    advanceAmount: 300,
    paymentMethod: "UPI",
    notes: "Team celebration lunch.",
    createdAt: "2026-11-08T16:00:00",
  },
  {
    id: "RES-1015",
    reservationId: "RES-1015",
    customerName: "Manoj Tiwari",
    phone: "+91 97422 88990",
    email: "manoj.t@example.com",
    tableId: 4,
    tableName: "Table 4 (Indoor AC)",
    tableNumber: 4,
    guestsCount: 4,
    reservationDate: "2026-11-08",
    reservationTime: "08:00 PM",
    status: "cancelled",
    advanceAmount: 200,
    paymentMethod: "UPI",
    notes: "Guest cancelled due to travel delay.",
    createdAt: "2026-11-07T10:15:00",
  },
  {
    id: "RES-1014",
    reservationId: "RES-1014",
    customerName: "Kavitha Narayan",
    phone: "+91 93221 00887",
    email: "kavitha.n@example.com",
    tableId: 1,
    tableName: "Table 1 (Indoor)",
    tableNumber: 1,
    guestsCount: 2,
    reservationDate: "2026-11-07",
    reservationTime: "07:30 PM",
    status: "completed",
    advanceAmount: 100,
    paymentMethod: "Cash",
    notes: "",
    createdAt: "2026-11-06T15:00:00",
  },
  {
    id: "RES-1013",
    reservationId: "RES-1013",
    customerName: "Arun Kumar",
    phone: "+91 98452 33445",
    email: "arun.k@example.com",
    tableId: 7,
    tableName: "Table 7 (Outdoor)",
    tableNumber: 7,
    guestsCount: 4,
    reservationDate: "2026-11-06",
    reservationTime: "08:00 PM",
    status: "completed",
    advanceAmount: 200,
    paymentMethod: "UPI",
    notes: "",
    createdAt: "2026-11-05T12:00:00",
  },
  {
    id: "RES-1012",
    reservationId: "RES-1012",
    customerName: "Ananya Roy",
    phone: "+91 99887 76655",
    email: "ananya@example.com",
    tableId: 8,
    tableName: "Table 8 (Outdoor Patio)",
    tableNumber: 8,
    guestsCount: 6,
    reservationDate: "2026-11-05",
    reservationTime: "01:30 PM",
    status: "completed",
    advanceAmount: 300,
    paymentMethod: "Net Banking",
    notes: "Family reunion.",
    createdAt: "2026-11-04T16:00:00",
  },
  {
    id: "RES-1011",
    reservationId: "RES-1011",
    customerName: "Deepa Menon",
    phone: "+91 98113 55667",
    email: "deepa.m@example.com",
    tableId: 3,
    tableName: "Table 3 (Indoor AC)",
    tableNumber: 3,
    guestsCount: 2,
    reservationDate: "2026-11-04",
    reservationTime: "08:30 PM",
    status: "completed",
    advanceAmount: 100,
    paymentMethod: "UPI",
    notes: "",
    createdAt: "2026-11-03T11:20:00",
  },
  {
    id: "RES-1010",
    reservationId: "RES-1010",
    customerName: "Kiran Bedi",
    phone: "+91 97335 66778",
    email: "kiran.b@example.com",
    tableId: 5,
    tableName: "Table 5 (Main Hall)",
    tableNumber: 5,
    guestsCount: 4,
    reservationDate: "2026-11-03",
    reservationTime: "07:30 PM",
    status: "completed",
    advanceAmount: 200,
    paymentMethod: "UPI",
    notes: "",
    createdAt: "2026-11-02T17:45:00",
  },
  {
    id: "RES-1009",
    reservationId: "RES-1009",
    customerName: "Sanjay Vyas",
    phone: "+91 96222 99001",
    email: "sanjay.v@example.com",
    tableId: 2,
    tableName: "Table 2 (Indoor AC)",
    tableNumber: 2,
    guestsCount: 2,
    reservationDate: "2026-11-02",
    reservationTime: "08:00 PM",
    status: "cancelled",
    advanceAmount: 100,
    paymentMethod: "UPI",
    notes: "Cancelled by guest.",
    createdAt: "2026-11-01T14:10:00",
  },
  {
    id: "RES-1008",
    reservationId: "RES-1008",
    customerName: "Meera Sengupta",
    phone: "+91 95444 33221",
    email: "meera.s@example.com",
    tableId: 9,
    tableName: "Table 9 (Private Dining)",
    tableNumber: 9,
    guestsCount: 8,
    reservationDate: "2026-11-01",
    reservationTime: "08:30 PM",
    status: "completed",
    advanceAmount: 500,
    paymentMethod: "Card",
    notes: "Anniversary celebration dinner.",
    createdAt: "2026-10-31T18:00:00",
  },
];

const DEFAULT_TABLES = [
  { id: 1, tableId: 1, name: "Table 1", section: "Indoor AC", capacity: 2, status: "available" },
  { id: 2, tableId: 2, name: "Table 2", section: "Indoor AC", capacity: 2, status: "reserved" },
  { id: 3, tableId: 3, name: "Table 3", section: "Indoor AC", capacity: 2, status: "reserved" },
  { id: 4, tableId: 4, name: "Table 4", section: "Indoor AC", capacity: 4, status: "available" },
  { id: 5, tableId: 5, name: "Table 5", section: "Main Hall", capacity: 4, status: "reserved" },
  { id: 6, tableId: 6, name: "Table 6", section: "Outdoor Garden", capacity: 6, status: "available" },
  { id: 7, tableId: 7, name: "Table 7", section: "Outdoor Patio", capacity: 4, status: "available" },
  { id: 8, tableId: 8, name: "Table 8", section: "Outdoor Patio", capacity: 6, status: "reserved" },
  { id: 9, tableId: 9, name: "Table 9", section: "Private Dining", capacity: 8, status: "available" },
  { id: 10, tableId: 10, name: "Table 10", section: "Family Lounge", capacity: 6, status: "available" },
];

// Vibrant status tab color themes (matches Takeaway Orders tabs)
const STATUS_TAB_THEMES = {
  all: {
    text: "#ea580c",
    background: "rgba(234, 88, 12, 0.12)",
    border: "rgba(234, 88, 12, 0.35)",
    activeBg: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  },
  confirmed: {
    text: "#16a34a",
    background: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.35)",
    activeBg: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  },
  pending: {
    text: "#d97706",
    background: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
    activeBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  },
  seated: {
    text: "#2563eb",
    background: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.35)",
    activeBg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  },
  completed: {
    text: "#059669",
    background: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.35)",
    activeBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  cancelled: {
    text: "#dc2626",
    background: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.35)",
    activeBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  },
};

export function ReservationsManagement({
  isLight = false,
  showToast = alert,
  tables = [],
  restaurantName = "Bhanu Bistro",
  restaurantSettings = {},
}) {
  // ── 1. Reservations & Tables State with Local Storage fallback ────────
  const [reservations, setReservations] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const customerRaw = localStorage.getItem("avsr_customer_reservations");
      if (customerRaw) {
        const parsedCustomer = JSON.parse(customerRaw);
        if (Array.isArray(parsedCustomer) && parsedCustomer.length > 0) {
          return [...parsedCustomer, ...INITIAL_SEED_RESERVATIONS];
        }
      }
    } catch (e) {
      console.warn("Could not read local reservations, using seed data:", e);
    }
    return INITIAL_SEED_RESERVATIONS;
  });

  const [tablesList, setTablesList] = useState(() => {
    if (Array.isArray(tables) && tables.length > 0) return tables;
    const stored = getStoredReservationTables();
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return DEFAULT_TABLES;
  });

  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── 2. Filters & Search State ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today" | "tomorrow" | "7days" | "month" | "custom"
  const [particularDate, setParticularDate] = useState(""); // For custom single date picking
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customDateRangeOpen, setCustomDateRangeOpen] = useState(false);
  const [secondaryStatusFilter, setSecondaryStatusFilter] = useState("all");

  // ── 3. Modals & Actions Menu State ─────────────────────────────────────
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [viewingReservation, setViewingReservation] = useState(null);
  const [printReceiptReservation, setPrintReceiptReservation] = useState(null);
  const [saving, setSaving] = useState(false);

  // New Booking Form State
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    tableId: 3,
    guestsCount: 2,
    reservationDate: new Date().toISOString().split("T")[0],
    reservationTime: "07:30 PM",
    notes: "",
    advanceAmount: 100,
  });

  // Action Menu outside click ref
  const actionMenuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenuOpenId(null);
      }
    };
    if (actionMenuOpenId) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [actionMenuOpenId]);

  // Sync state to localStorage whenever reservations change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
    } catch (e) {
      console.warn("Storage sync failed:", e);
    }
  }, [reservations]);

  // ── 4. Fetch / Refresh Reservations ────────────────────────────────────
  const fetchReservations = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [resRes, tblRes] = await Promise.allSettled([
        apiGetReservations(),
        apiGetTables(),
      ]);

      if (resRes.status === "fulfilled" && resRes.value?.success && Array.isArray(resRes.value.data)) {
        const serverData = resRes.value.data;
        if (serverData.length > 0) {
          setReservations((prev) => {
            const serverIds = new Set(serverData.map((r) => String(r.reservationId || r.id)));
            const localOnly = prev.filter((r) => !serverIds.has(String(r.reservationId || r.id)));
            return [...localOnly, ...serverData];
          });
        }
      }

      if (tblRes.status === "fulfilled" && tblRes.value?.success && Array.isArray(tblRes.value.data)) {
        if (tblRes.value.data.length > 0) {
          setTablesList(tblRes.value.data);
        }
      }
      if (!silent) {
        showToast("✅ Table reservations refreshed successfully.");
      }
    } catch (err) {
      console.warn("API refresh fallback to local state:", err);
      if (!silent) {
        showToast("ℹ️ Loaded current table reservations.");
      }
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations(true);
  }, []);

  // ── 5. Status Update Handler ───────────────────────────────────────────
  const handleStatusUpdate = async (reservationId, newStatus) => {
    setReservations((prev) =>
      prev.map((r) =>
        String(r.reservationId || r.id) === String(reservationId)
          ? { ...r, status: newStatus, updatedAt: new Date().toISOString() }
          : r
      )
    );
    setActionMenuOpenId(null);
    if (viewingReservation && String(viewingReservation.reservationId || viewingReservation.id) === String(reservationId)) {
      setViewingReservation((prev) => ({ ...prev, status: newStatus }));
    }

    try {
      await apiUpdateReservationStatus(reservationId, newStatus);
    } catch (e) {
      console.warn("Backend status update offline, state kept locally:", e);
    }
    showToast(`✅ Reservation marked as ${newStatus.toUpperCase()}`);
  };

  // ── 6. Delete / Cancel Handler ─────────────────────────────────────────
  const handleDelete = async (reservationId) => {
    if (!window.confirm("Are you sure you want to remove this reservation?")) return;
    setReservations((prev) =>
      prev.filter((r) => String(r.reservationId || r.id) !== String(reservationId))
    );
    setActionMenuOpenId(null);
    if (viewingReservation && String(viewingReservation.reservationId || viewingReservation.id) === String(reservationId)) {
      setViewingReservation(null);
    }
    try {
      await apiDeleteReservation(reservationId);
    } catch (e) {
      console.warn("Backend delete offline, removed locally:", e);
    }
    showToast("✅ Reservation removed.");
  };

  // ── 7. Create New Reservation ──────────────────────────────────────────
  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim()) {
      showToast("❌ Customer name and phone number are required.");
      return;
    }
    setSaving(true);
    const chosenTable = tablesList.find(
      (t) => (t.id || t.tableId) === Number(form.tableId)
    );
    const nextIdNum = 5000 + Math.floor(Math.random() * 4000);
    const newReservation = {
      id: `RES-${nextIdNum}`,
      reservationId: `RES-${nextIdNum}`,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      tableId: Number(form.tableId),
      tableName: chosenTable ? (chosenTable.name || chosenTable.tableName || `Table ${chosenTable.id}`) : `Table ${form.tableId}`,
      tableNumber: chosenTable ? (chosenTable.tableNumber || chosenTable.id) : form.tableId,
      guestsCount: Number(form.guestsCount) || 2,
      reservationDate: form.reservationDate,
      reservationTime: form.reservationTime,
      status: "confirmed",
      advanceAmount: Number(form.advanceAmount) || 100,
      paymentMethod: "Advance (Cash / Counter)",
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setReservations((prev) => [newReservation, ...prev]);
    setIsNewBookingModalOpen(false);
    setForm({
      customerName: "",
      phone: "",
      email: "",
      tableId: tablesList[0]?.id || 1,
      guestsCount: 2,
      reservationDate: new Date().toISOString().split("T")[0],
      reservationTime: "07:30 PM",
      notes: "",
      advanceAmount: 100,
    });
    setSaving(false);

    try {
      await apiCreateReservation(newReservation);
    } catch (e) {
      console.warn("Backend reservation create offline, preserved locally:", e);
    }
    showToast("🎉 Table reserved successfully!");
  };

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── 8. Robust Filter Logic (Safe String Conversions to Prevent .toLowerCase Crashes) ──
  const filteredReservations = useMemo(() => {
    let list = [...reservations];

    // Status Tab Filter
    if (activeStatusTab !== "all") {
      list = list.filter(
        (r) => String(r.status || "").toLowerCase() === activeStatusTab.toLowerCase()
      );
    }

    // Secondary Status Dropdown Filter
    if (secondaryStatusFilter !== "all") {
      list = list.filter(
        (r) => String(r.status || "").toLowerCase() === secondaryStatusFilter.toLowerCase()
      );
    }

    // Date Range / Particular Date Filter
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (dateFilter === "today") {
      list = list.filter((r) => String(r.reservationDate || r.date || "").startsWith(todayStr));
    } else if (dateFilter === "tomorrow") {
      list = list.filter((r) => String(r.reservationDate || r.date || "").startsWith(tomorrowStr));
    } else if (dateFilter === "7days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
      list = list.filter((r) => {
        const d = String(r.reservationDate || r.date || "");
        return d >= sevenDaysAgoStr && d <= todayStr;
      });
    } else if (dateFilter === "month") {
      const currentMonth = todayStr.slice(0, 7);
      list = list.filter((r) => String(r.reservationDate || r.date || "").startsWith(currentMonth));
    } else if (dateFilter === "custom") {
      if (particularDate) {
        list = list.filter((r) => String(r.reservationDate || r.date || "").startsWith(particularDate));
      } else if (customStartDate && customEndDate) {
        list = list.filter((r) => {
          const d = String(r.reservationDate || r.date || "");
          return d >= customStartDate && d <= customEndDate;
        });
      }
    }

    // Text Search Filter with 100% Safe String Conversion
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const idStr = String(r.reservationId ?? r.id ?? "").toLowerCase();
        const nameStr = String(r.customerName ?? r.name ?? r.customer ?? "").toLowerCase();
        const phoneStr = String(r.phone ?? r.customerPhone ?? "").toLowerCase();
        const tableStr = String(r.tableName ?? (r.tableNumber ? `Table ${r.tableNumber}` : r.tableId ? `Table ${r.tableId}` : "")).toLowerCase();
        const notesStr = String(r.notes ?? r.specialRequests ?? "").toLowerCase();
        const statusStr = String(r.status ?? "").toLowerCase();
        const dateStr = String(r.reservationDate ?? r.date ?? "").toLowerCase();
        const timeStr = String(r.reservationTime ?? r.time ?? "").toLowerCase();
        return (
          idStr.includes(q) ||
          nameStr.includes(q) ||
          phoneStr.includes(q) ||
          tableStr.includes(q) ||
          notesStr.includes(q) ||
          statusStr.includes(q) ||
          dateStr.includes(q) ||
          timeStr.includes(q)
        );
      });
    }

    return list;
  }, [
    reservations,
    activeStatusTab,
    secondaryStatusFilter,
    dateFilter,
    particularDate,
    customStartDate,
    customEndDate,
    searchQuery,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedReservations = useMemo(
    () => filteredReservations.slice(pageStart, pageStart + PAGE_SIZE),
    [filteredReservations, pageStart]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, secondaryStatusFilter, dateFilter, particularDate, customStartDate, customEndDate, searchQuery]);

  // ── 9. KPI Metrics Calculation ─────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = reservations.length;
    const confirmed = reservations.filter(
      (r) => String(r.status || "").toLowerCase() === "confirmed"
    ).length;
    const pending = reservations.filter(
      (r) => String(r.status || "").toLowerCase() === "pending"
    ).length;
    const seatedOrCompleted = reservations.filter((r) => {
      const s = String(r.status || "").toLowerCase();
      return s === "seated" || s === "completed";
    }).length;

    return { total, confirmed, pending, seatedOrCompleted };
  }, [reservations]);

  // Tab badge counts
  const tabCounts = useMemo(() => {
    return {
      all: reservations.length,
      confirmed: reservations.filter((r) => String(r.status).toLowerCase() === "confirmed").length,
      pending: reservations.filter((r) => String(r.status).toLowerCase() === "pending").length,
      seated: reservations.filter((r) => String(r.status).toLowerCase() === "seated").length,
      completed: reservations.filter((r) => String(r.status).toLowerCase() === "completed").length,
      cancelled: reservations.filter((r) => String(r.status).toLowerCase() === "cancelled").length,
    };
  }, [reservations]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "confirmed":
        return {
          label: "Confirmed",
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.35)",
          icon: CheckCircle2,
        };
      case "seated":
        return {
          label: "Seated",
          color: "#3b82f6",
          bg: "rgba(59, 130, 246, 0.12)",
          border: "rgba(59, 130, 246, 0.35)",
          icon: Utensils,
        };
      case "completed":
        return {
          label: "Completed",
          color: "#059669",
          bg: "rgba(5, 150, 105, 0.12)",
          border: "rgba(5, 150, 105, 0.35)",
          icon: Check,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: "#ef4444",
          bg: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.35)",
          icon: XCircle,
        };
      case "pending":
      default:
        return {
          label: "Pending",
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.35)",
          icon: Hourglass,
        };
    }
  };

  // ── 10. Table Data Prepared for ReceiptModal (Invoice & Bill Print) ───
  const receiptTableData = useMemo(() => {
    if (!printReceiptReservation) return null;
    const r = printReceiptReservation;

    const resId = String(r.reservationId || r.id || "RES-1000");
    const tableName = String(
      r.tableName || (r.tableNumber ? `Table ${r.tableNumber}` : `Table ${r.tableId || 1}`)
    );
    const advancePaid = Number(r.advanceAmount) || 100;

    const items = [
      {
        name: `Table Reservation Booking Deposit (${tableName})`,
        quantity: 1,
        price: advancePaid,
      },
    ];

    const subtotal = advancePaid;
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const serviceChargeAmount = 0;
    const grandTotal = subtotal;

    return {
      id: resId,
      invoiceNo: formatOrderNumber(resId),
      name: tableName,
      tableName: tableName,
      tableNumber: r.tableNumber || r.tableId || 1,
      section: r.section || "Fine Dining",
      server: "Host Staff",
      guests: Number(r.guestsCount || r.guests || 2),
      date: r.reservationDate || r.date || new Date().toISOString().split("T")[0],
      orderTime: r.reservationTime || r.time || "07:30 PM",
      status: r.status === "cancelled" ? "Cancelled" : "Completed",
      isPaid: true,
      settled: true,
      settledAt: r.createdAt || new Date().toISOString(),
      paymentMethod: String(r.paymentMethod || "UPI (PAID)").toUpperCase(),
      customer: String(r.customerName || "Guest"),
      customerPhone: String(r.phone || r.customerPhone || ""),
      items,
      subtotal,
      taxAmount,
      serviceCharge: 0,
      serviceChargeAmount: 0,
      grandTotal,
    };
  }, [printReceiptReservation]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.15rem",
        padding: "1.25rem",
        color: "var(--text-main, #f8fafc)",
        background: "transparent",
      }}
    >
      {/* ── 1. Top Header Banner (Matches Takeaway Orders Banner) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.3)",
              flexShrink: 0,
            }}
          >
            <Calendar size={24} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.45rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--text-main, #f8fafc)",
                lineHeight: 1.2,
              }}
            >
              Table Reservations
            </h1>
            <p
              style={{
                margin: "0.2rem 0 0",
                fontSize: "0.84rem",
                color: "var(--text-muted, #94a3b8)",
              }}
            >
              Schedule dining room bookings, manage guest arrivals, and track table allocations
            </p>
          </div>
        </div>

        {/* Top Right Controls: Date Range Selector & + Book Table Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Date Selector Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
                height: "42px",
                padding: "0 1rem",
                borderRadius: "10px",
                border: "1px solid var(--border-card, #27272a)",
                background: "var(--bg-card, #18181b)",
                color: "var(--text-main, #f8fafc)",
                fontSize: "0.84rem",
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <Calendar size={15} color="#ea580c" />
              <span>{dateRangeLabel}</span>
              <ChevronDown size={14} style={{ opacity: 0.6 }} />
            </button>

            {dateDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  background: "var(--bg-card, #18181b)",
                  border: "1px solid var(--border-card, #27272a)",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                  padding: "0.4rem",
                  zIndex: 50,
                  minWidth: "220px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                {[
                  { label: "All Dates", value: "all" },
                  { label: "Today", value: "today" },
                  { label: "Tomorrow", value: "tomorrow" },
                  { label: "Last 7 Days", value: "7days" },
                  { label: "This Month (Nov 2026)", value: "month" },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setDateFilter(preset.value);
                      setDateRangeLabel(preset.label);
                      setParticularDate("");
                      setDateDropdownOpen(false);
                      setCustomDateRangeOpen(false);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "0.55rem 0.85rem",
                      borderRadius: "6px",
                      border: "none",
                      background: dateFilter === preset.value && !particularDate ? "rgba(234, 88, 12, 0.15)" : "transparent",
                      color: dateFilter === preset.value && !particularDate ? "#ea580c" : "var(--text-main, #f8fafc)",
                      fontSize: "0.82rem",
                      fontWeight: dateFilter === preset.value && !particularDate ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCustomDateRangeOpen((open) => !open)}
                  style={{
                    textAlign: "left",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "6px",
                    border: "none",
                    background: customDateRangeOpen || dateFilter === "custom" ? "rgba(234, 88, 12, 0.15)" : "transparent",
                    color: customDateRangeOpen || dateFilter === "custom" ? "#ea580c" : "var(--text-main, #f8fafc)",
                    fontSize: "0.82rem",
                    fontWeight: customDateRangeOpen || dateFilter === "custom" ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  📅 Pick Particular Date / Range
                </button>

                {customDateRangeOpen && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      padding: "0.5rem 0.45rem 0.35rem",
                      borderTop: "1px solid var(--border-card, #27272a)",
                    }}
                  >
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", color: "var(--text-muted, #94a3b8)", fontSize: "0.72rem" }}>
                      Exact Date
                      <input
                        type="date"
                        value={particularDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParticularDate(val);
                          setDateFilter("custom");
                          setDateRangeLabel(val ? `Date: ${val}` : "Particular Date");
                          setDateDropdownOpen(false);
                        }}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.45rem",
                          border: "1px solid var(--border-card, #27272a)",
                          borderRadius: "6px",
                          background: "var(--bg-secondary, #27272a)",
                          color: "var(--text-main, #f8fafc)",
                          cursor: "pointer",
                        }}
                      />
                    </label>

                    <div style={{ height: "1px", background: "var(--border-card, #27272a)", margin: "2px 0" }} />

                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted, #94a3b8)" }}>Or Date Range:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem" }}>
                      <input
                        type="date"
                        value={customStartDate}
                        placeholder="From"
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.35rem",
                          border: "1px solid var(--border-card, #27272a)",
                          borderRadius: "6px",
                          background: "var(--bg-secondary, #27272a)",
                          color: "var(--text-main, #f8fafc)",
                          fontSize: "0.75rem",
                        }}
                      />
                      <input
                        type="date"
                        value={customEndDate}
                        placeholder="To"
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.35rem",
                          border: "1px solid var(--border-card, #27272a)",
                          borderRadius: "6px",
                          background: "var(--bg-secondary, #27272a)",
                          color: "var(--text-main, #f8fafc)",
                          fontSize: "0.75rem",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!customStartDate || !customEndDate || customStartDate > customEndDate}
                      onClick={() => {
                        setDateFilter("custom");
                        setDateRangeLabel(`${customStartDate} to ${customEndDate}`);
                        setParticularDate("");
                        setDateDropdownOpen(false);
                      }}
                      style={{
                        padding: "0.45rem",
                        borderRadius: "6px",
                        border: "none",
                        background: "linear-gradient(135deg, #f97316, #ea580c)",
                        color: "#fff",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Apply Range
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* + Book Table Button */}
          <button
            type="button"
            onClick={() => setIsNewBookingModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              height: "42px",
              padding: "0 1.25rem",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: "#fff",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(234, 88, 12, 0.35)",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Book Table</span>
          </button>
        </div>
      </div>

      {/* ── 2. Key Metrics / KPI Summary Cards (4 Cards, exact Takeaway layout) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {/* Card 1: Total Reservations */}
        <div
          style={{
            background: "var(--bg-card, #18181b)",
            border: "1px solid var(--border-card, #27272a)",
            borderRadius: "12px",
            padding: "0.4rem 0.45rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(249, 115, 22, 0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ea580c",
              flexShrink: 0,
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>
              Total Reservations
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "0.1rem", color: "var(--text-main, #f8fafc)", letterSpacing: "-0.02em" }}>
              {metrics.total}
            </div>
          </div>
        </div>

        {/* Card 2: Confirmed Bookings */}
        <div
          style={{
            background: "var(--bg-card, #18181b)",
            border: "1px solid var(--border-card, #27272a)",
            borderRadius: "12px",
            padding: "0.4rem 0.45rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>
              Confirmed Bookings
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "0.1rem", color: "#16a34a", letterSpacing: "-0.02em" }}>
              {metrics.confirmed}
            </div>
          </div>
        </div>

        {/* Card 3: Pending Bookings */}
        <div
          style={{
            background: "var(--bg-card, #18181b)",
            border: "1px solid var(--border-card, #27272a)",
            borderRadius: "12px",
            padding: "0.4rem 0.45rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d97706",
              flexShrink: 0,
            }}
          >
            <Hourglass size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>
              Pending Bookings
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "0.1rem", color: "#d97706", letterSpacing: "-0.02em" }}>
              {metrics.pending}
            </div>
          </div>
        </div>

        {/* Card 4: Seated / Completed */}
        <div
          style={{
            background: "var(--bg-card, #18181b)",
            border: "1px solid var(--border-card, #27272a)",
            borderRadius: "12px",
            padding: "0.4rem 0.45rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(59, 130, 246, 0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3b82f6",
              flexShrink: 0,
            }}
          >
            <Utensils size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>
              Seated & Completed
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "0.1rem", color: "#3b82f6", letterSpacing: "-0.02em" }}>
              {metrics.seatedOrCompleted}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Status Filter Tabs (Vibrant Colors for Each Status) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          overflowX: "auto",
          paddingBottom: "0.2rem",
        }}
      >
        {[
          { key: "all", label: "All Bookings", count: tabCounts.all, icon: Calendar },
          { key: "confirmed", label: "Confirmed", count: tabCounts.confirmed, icon: CheckCircle2 },
          { key: "pending", label: "Pending", count: tabCounts.pending, icon: Hourglass },
          { key: "seated", label: "Seated", count: tabCounts.seated, icon: Utensils },
          { key: "completed", label: "Completed", count: tabCounts.completed, icon: Check },
          { key: "cancelled", label: "Cancelled", count: tabCounts.cancelled, icon: XCircle },
        ].map((tab) => {
          const isActive = activeStatusTab.toLowerCase() === tab.key.toLowerCase();
          const Icon = tab.icon;
          const theme = STATUS_TAB_THEMES[tab.key] || STATUS_TAB_THEMES.all;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatusTab(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.48rem 0.95rem",
                borderRadius: "10px",
                border: isActive
                  ? "1px solid transparent"
                  : `1px solid ${theme.border}`,
                background: isActive
                  ? theme.activeBg
                  : theme.background,
                color: isActive ? "#ffffff" : theme.text,
                fontSize: "0.82rem",
                fontWeight: isActive ? 750 : 650,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 3px 10px rgba(0, 0, 0, 0.3)" : "none",
              }}
            >
              <Icon size={14} />
              <span>
                {tab.label} ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. Search & Filter Controls Bar ──────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        {/* Search input with 100% crash protection */}
        <div
          style={{
            position: "relative",
            flex: "1 1 320px",
            maxWidth: "480px",
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.95rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted, #94a3b8)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Reservation ID, Guest, Phone or Table..."
            style={{
              width: "100%",
              height: "42px",
              padding: "0 0.95rem 0 2.5rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card, #27272a)",
              background: "var(--bg-card, #18181b)",
              color: "var(--text-main, #f8fafc)",
              fontSize: "0.84rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Filters, Particular Date Picker, and Refresh Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* Quick Date Select */}
          <select
            value={dateFilter}
            onChange={(e) => {
              const val = e.target.value;
              setDateFilter(val);
              if (val === "custom") {
                if (!particularDate) {
                  setParticularDate(new Date().toISOString().split("T")[0]);
                }
                setDateRangeLabel("Custom Date");
              } else {
                setParticularDate("");
                const labelMap = {
                  all: "All Dates",
                  today: "Today",
                  tomorrow: "Tomorrow",
                  "7days": "Last 7 Days",
                  month: "This Month",
                };
                setDateRangeLabel(labelMap[val] || "All Dates");
              }
            }}
            style={{
              height: "42px",
              padding: "0 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card, #27272a)",
              background: "var(--bg-card, #18181b)",
              color: "var(--text-main, #f8fafc)",
              fontSize: "0.83rem",
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="7days">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="custom">📅 Particular Date...</option>
          </select>

          {/* Particular Date Picker (Appears when Particular Date is selected) */}
          {dateFilter === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <input
                type="date"
                value={particularDate}
                onChange={(e) => {
                  setParticularDate(e.target.value);
                  setDateRangeLabel(e.target.value ? `Date: ${e.target.value}` : "Custom Date");
                }}
                style={{
                  height: "42px",
                  padding: "0 0.85rem",
                  borderRadius: "10px",
                  border: "1.5px solid #ea580c",
                  background: "var(--bg-card, #18181b)",
                  color: "var(--text-main, #f8fafc)",
                  fontSize: "0.83rem",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 10px rgba(234, 88, 12, 0.25)",
                }}
                title="Select specific reservation date"
              />
              {particularDate && (
                <button
                  type="button"
                  onClick={() => {
                    setParticularDate("");
                    setDateFilter("all");
                    setDateRangeLabel("All Dates");
                  }}
                  title="Clear specific date"
                  style={{
                    height: "42px",
                    width: "36px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-card, #27272a)",
                    background: "var(--bg-card, #18181b)",
                    color: "var(--text-muted, #94a3b8)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Secondary Status Filter */}
          <select
            value={secondaryStatusFilter}
            onChange={(e) => setSecondaryStatusFilter(e.target.value)}
            style={{
              height: "42px",
              padding: "0 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card, #27272a)",
              background: "var(--bg-card, #18181b)",
              color: "var(--text-main, #f8fafc)",
              fontSize: "0.83rem",
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="seated">Seated</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchReservations(false)}
            title="Refresh reservations from server"
            style={{
              height: "42px",
              width: "42px",
              borderRadius: "10px",
              border: "1px solid var(--border-card, #27272a)",
              background: "var(--bg-card, #18181b)",
              color: "var(--text-main, #f8fafc)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.2s ease",
            }}
          >
            <RefreshCw
              size={16}
              style={{
                animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* ── 5. Main Table: Table Reservations ────────────────── */}
      <div
        style={{
          background: "var(--bg-card, #18181b)",
          border: "1px solid var(--border-card, #27272a)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.7rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--bg-secondary, #202024)",
                  borderBottom: "1px solid var(--border-card, #27272a)",
                  color: "var(--text-muted, #94a3b8)",
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <th style={{ padding: "0.4rem 0.45rem", width: "40px" }}>#</th>
                <th style={{ padding: "0.4rem 0.45rem" }}>RESERVATION ID</th>
                <th style={{ padding: "0.4rem 0.45rem" }}>GUEST NAME</th>
                <th style={{ padding: "0.4rem 0.45rem" }}>PHONE</th>
                <th style={{ padding: "0.4rem 0.45rem" }}>TABLE</th>
                <th style={{ padding: "0.4rem 0.45rem" }}>GUESTS</th>
                <th style={{ padding: "0.4rem 0.45rem" }}>DATE & TIME</th>
                <th style={{ padding: "0.4rem 0.45rem" }}>STATUS</th>
                <th style={{ padding: "0.4rem 0.45rem", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReservations.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "3.5rem 1rem",
                      textAlign: "center",
                      color: "var(--text-muted, #94a3b8)",
                    }}
                  >
                    <Calendar size={36} color="#ea580c" style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.8 }} />
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main, #f8fafc)", marginBottom: "0.25rem" }}>
                      No reservations found
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem" }}>
                      Try adjusting your search query, status filters or date range.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedReservations.map((r, index) => {
                  const resId = String(r.reservationId || r.id || `RES-${index + 1000}`);
                  const badge = getStatusBadge(r.status);
                  const BadgeIcon = badge.icon;
                  const isMenuOpen = actionMenuOpenId === resId;

                  return (
                    <tr
                      key={resId || index}
                      onClick={() => {
                        setActionMenuOpenId(null);
                        setViewingReservation(r);
                      }}
                      style={{
                        borderBottom: "1px solid var(--border-card, #27272a)",
                        transition: "background 0.15s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary, #27272a)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Row Index */}
                      <td style={{ padding: "0.4rem 0.45rem", color: "var(--text-muted, #94a3b8)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                        {pageStart + index + 1}
                      </td>

                      {/* Reservation ID */}
                      <td style={{ padding: "0.4rem 0.45rem", fontWeight: 700, color: "var(--text-main, #f8fafc)", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            letterSpacing: "-0.01em",
                            color: "#ea580c",
                          }}
                        >
                          {resId}
                        </span>
                      </td>

                      {/* Guest Name */}
                      <td style={{ padding: "0.4rem 0.45rem", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 650, color: "var(--text-main, #f8fafc)", display: "inline-flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: "rgba(249, 115, 22, 0.15)",
                              color: "#ea580c",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {(String(r.customerName || "G"))[0].toUpperCase()}
                          </div>
                          <span>{r.customerName || "Guest"}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: "0.4rem 0.45rem", color: "var(--text-muted, #94a3b8)", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <Phone size={13} color="#94a3b8" />
                          {r.phone || r.customerPhone || "—"}
                        </span>
                      </td>

                      {/* Table */}
                      <td style={{ padding: "0.4rem 0.45rem", fontWeight: 600, color: "var(--text-main, #f8fafc)", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid var(--border-card, #27272a)",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <MapPin size={12} color="#ea580c" style={{ flexShrink: 0 }} />
                          {r.tableName || (r.tableNumber ? `Table #${r.tableNumber}` : `Table ${r.tableId}`)}
                        </span>
                      </td>

                      {/* Guests Count */}
                      <td style={{ padding: "0.4rem 0.45rem", color: "var(--text-main, #f8fafc)", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <Users size={14} color="#f59e0b" />
                          <strong>{r.guestsCount || r.guests || 2}</strong> Guests
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: "0.4rem 0.45rem", color: "var(--text-main, #f8fafc)", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" }}>
                          <span>{r.reservationDate || r.date || "Today"}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #94a3b8)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <Clock size={12} color="#ea580c" />
                            {r.reservationTime || r.time || "07:30 PM"}
                          </span>
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: "0.4rem 0.45rem", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.28rem 0.65rem",
                            borderRadius: "999px",
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          <BadgeIcon size={12} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions: Eye Icon (Opens ReceiptModal Bill), Printer, More Menu */}
                      <td onClick={(e) => e.stopPropagation()} style={{ padding: "0.4rem 0.45rem", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                          {/* Eye Icon -> Opens the 5th picture Invoice & Bill Print (ReceiptModal) */}
                          <button
                            type="button"
                            onClick={() => setPrintReceiptReservation(r)}
                            title="View / Print Tax Invoice Bill"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-card, #27272a)",
                              background: "rgba(255, 255, 255, 0.04)",
                              color: "var(--text-main, #f8fafc)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#ea580c";
                              e.currentTarget.style.color = "#ea580c";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-card, #27272a)";
                              e.currentTarget.style.color = "var(--text-main, #f8fafc)";
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Print Icon -> Opens the same Invoice & Bill Print (ReceiptModal) */}
                          <button
                            type="button"
                            onClick={() => setPrintReceiptReservation(r)}
                            title="Print Tax Invoice Bill"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-card, #27272a)",
                              background: "rgba(255, 255, 255, 0.04)",
                              color: "var(--text-main, #f8fafc)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#ea580c";
                              e.currentTarget.style.color = "#ea580c";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-card, #27272a)";
                              e.currentTarget.style.color = "var(--text-main, #f8fafc)";
                            }}
                          >
                            <Printer size={15} />
                          </button>

                          {/* More Horizontal Dropdown Button */}
                          <div style={{ position: "relative" }}>
                            <button
                              type="button"
                              onClick={() => setActionMenuOpenId(isMenuOpen ? null : resId)}
                              title="Actions"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-card, #27272a)",
                                background: isMenuOpen ? "rgba(234, 88, 12, 0.15)" : "rgba(255, 255, 255, 0.04)",
                                color: isMenuOpen ? "#ea580c" : "var(--text-main, #f8fafc)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {/* Dropdown Menu (Matches Takeaway Actions Dropdown) */}
                            {isMenuOpen && (
                              <div
                                ref={actionMenuRef}
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "calc(100% + 5px)",
                                  background: "#18181b",
                                  border: "1px solid #27272a",
                                  borderRadius: "10px",
                                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.75)",
                                  padding: "0.35rem",
                                  minWidth: "195px",
                                  zIndex: 100,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.15rem",
                                  textAlign: "left",
                                }}
                              >

                                {r.status !== "confirmed" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(resId, "confirmed")}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#10b981",
                                      fontSize: "0.8rem",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16, 185, 129, 0.12)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                  >
                                    <CheckCircle2 size={14} />
                                    <span>Mark as Confirmed</span>
                                  </button>
                                )}

                                {r.status !== "seated" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(resId, "seated")}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#3b82f6",
                                      fontSize: "0.8rem",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59, 130, 246, 0.12)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                  >
                                    <Utensils size={14} />
                                    <span>Mark as Seated</span>
                                  </button>
                                )}

                                {r.status !== "completed" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(resId, "completed")}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#059669",
                                      fontSize: "0.8rem",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(5, 150, 105, 0.12)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                  >
                                    <Check size={14} />
                                    <span>Mark as Completed</span>
                                  </button>
                                )}

                                {r.status !== "cancelled" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(resId, "cancelled")}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#ef4444",
                                      fontSize: "0.8rem",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                  >
                                    <XCircle size={14} />
                                    <span>Cancel Reservation</span>
                                  </button>
                                )}

                                <div style={{ height: "1px", background: "#27272a", margin: "0.2rem 0" }} />

                                <button
                                  type="button"
                                  onClick={() => handleDelete(resId)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "transparent",
                                    color: "#94a3b8",
                                    fontSize: "0.78rem",
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                                >
                                  <Trash2 size={13} />
                                  <span>Delete Record</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredReservations.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              padding: "0.65rem 1rem",
              borderTop: "1px solid var(--border-card, #27272a)",
              background: "var(--bg-secondary, #202024)",
              fontSize: "0.7rem",
              color: "var(--text-muted, #94a3b8)",
            }}
          >
            <span>
              Showing <strong style={{ color: "var(--text-main, #f8fafc)" }}>{pageStart + 1}</strong>–
              <strong style={{ color: "var(--text-main, #f8fafc)" }}>{Math.min(pageStart + PAGE_SIZE, filteredReservations.length)}</strong> of{" "}
              <strong style={{ color: "var(--text-main, #f8fafc)" }}>{filteredReservations.length}</strong> reservations
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "0.3rem 0.65rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-card, #27272a)",
                  background: "var(--bg-card, #18181b)",
                  color: safePage <= 1 ? "var(--text-dim, #52525b)" : "var(--text-main, #f8fafc)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: safePage <= 1 ? "not-allowed" : "pointer",
                }}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((pNum) => pNum === 1 || pNum === totalPages || Math.abs(pNum - safePage) <= 1)
                .map((pNum, idx, arr) => (
                  <React.Fragment key={pNum}>
                    {idx > 0 && arr[idx - 1] !== pNum - 1 && (
                      <span style={{ padding: "0 0.25rem", color: "var(--text-dim, #52525b)" }}>…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      style={{
                        minWidth: "28px",
                        padding: "0.3rem 0.5rem",
                        borderRadius: "6px",
                        border: pNum === safePage ? "1px solid #ea580c" : "1px solid var(--border-card, #27272a)",
                        background: pNum === safePage ? "#ea580c" : "var(--bg-card, #18181b)",
                        color: pNum === safePage ? "#ffffff" : "var(--text-main, #f8fafc)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {pNum}
                    </button>
                  </React.Fragment>
                ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: "0.3rem 0.65rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-card, #27272a)",
                  background: "var(--bg-card, #18181b)",
                  color: safePage >= totalPages ? "var(--text-dim, #52525b)" : "var(--text-main, #f8fafc)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. Modal: "+ Book Table" (New Reservation Modal) ── */}
      {isNewBookingModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.1rem 1.4rem",
                background: "linear-gradient(135deg, rgba(234, 88, 12, 0.18) 0%, rgba(245, 158, 11, 0.08) 100%)",
                borderBottom: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Calendar size={20} color="#ea580c" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc" }}>
                    New Table Reservation
                  </h3>
                  <small style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                    Reserve a dining table at {restaurantName}
                  </small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBookingModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateReservation} style={{ padding: "1.25rem 1.4rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                    Guest Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      background: "#27272a",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "0.84rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      background: "#27272a",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "0.84rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                    Dining Table *
                  </label>
                  <select
                    value={form.tableId}
                    onChange={(e) => setForm({ ...form, tableId: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      background: "#27272a",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "0.84rem",
                      boxSizing: "border-box",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {tablesList.map((tbl) => (
                      <option key={tbl.id || tbl.tableId} value={tbl.id || tbl.tableId}>
                        {tbl.name || tbl.tableName || `Table ${tbl.id}`} ({tbl.section || "Indoor"} • {tbl.capacity || tbl.seatingCapacity || 4} Guests)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.guestsCount}
                    onChange={(e) => setForm({ ...form, guestsCount: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      background: "#27272a",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "0.84rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                    Reservation Date
                  </label>
                  <input
                    type="date"
                    value={form.reservationDate}
                    onChange={(e) => setForm({ ...form, reservationDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      background: "#27272a",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "0.84rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                    Time Slot
                  </label>
                  <select
                    value={form.reservationTime}
                    onChange={(e) => setForm({ ...form, reservationTime: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      background: "#27272a",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "0.84rem",
                      boxSizing: "border-box",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {[
                      "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM",
                      "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM"
                    ].map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                  Special Requests / Occasion (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Birthday arrangement, quiet window corner, high chair required"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    background: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "0.84rem",
                    boxSizing: "border-box",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => setIsNewBookingModalOpen(false)}
                  style={{
                    padding: "0.6rem 1.15rem",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    cursor: "pointer",
                    fontSize: "0.84rem",
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "0.6rem 1.4rem",
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.84rem",
                    boxShadow: "0 2px 8px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  {saving ? "Confirming..." : "Confirm Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. Modal: View Booking Information Breakdown ────── */}
      {viewingReservation && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1.1rem 1.4rem",
                background: "linear-gradient(135deg, rgba(234, 88, 12, 0.18) 0%, rgba(245, 158, 11, 0.08) 100%)",
                borderBottom: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Calendar size={20} color="#ea580c" />
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc" }}>
                  Reservation {viewingReservation.reservationId || viewingReservation.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingReservation(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Guest & Table Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "0.4rem 0.45rem",
                  borderRadius: "10px",
                  border: "1px solid #27272a",
                }}
              >
                <div>
                  <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Guest Name</small>
                  <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "0.95rem" }}>
                    {viewingReservation.customerName || "Guest"}
                  </div>
                </div>
                <div>
                  <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Contact Phone</small>
                  <div style={{ color: "#f8fafc", fontSize: "0.9rem" }}>
                    {viewingReservation.phone || viewingReservation.customerPhone || "—"}
                  </div>
                </div>
                <div>
                  <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Assigned Table</small>
                  <div style={{ fontWeight: 650, color: "#ea580c", fontSize: "0.9rem" }}>
                    {viewingReservation.tableName || `Table ${viewingReservation.tableId}`}
                  </div>
                </div>
                <div>
                  <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Guest Count</small>
                  <div style={{ fontWeight: 650, color: "#f8fafc", fontSize: "0.9rem" }}>
                    {viewingReservation.guestsCount || 2} Persons
                  </div>
                </div>
              </div>

              {/* Timing & Advance Paid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Date & Time</small>
                  <div style={{ color: "#f8fafc", fontWeight: 600 }}>
                    {viewingReservation.reservationDate || viewingReservation.date} at {viewingReservation.reservationTime || viewingReservation.time}
                  </div>
                </div>
                <div>
                  <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Advance Paid</small>
                  <div style={{ color: "#10b981", fontWeight: 700 }}>
                    ₹ {Number(viewingReservation.advanceAmount || 100).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Special Requests & Notes</small>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #27272a",
                    color: "#cbd5e1",
                    fontSize: "0.82rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {viewingReservation.notes || "No special requests mentioned."}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    const r = viewingReservation;
                    setViewingReservation(null);
                    setPrintReceiptReservation(r);
                  }}
                  style={{ flex: 1, padding: "0.55rem", borderRadius: "8px", border: "1px solid #ea580c", background: "rgba(234, 88, 12, 0.15)", color: "#ea580c", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                >
                  <ReceiptIcon size={14} />
                  <span>View / Print Bill</span>
                </button>
                {viewingReservation.status !== "confirmed" && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(viewingReservation.reservationId || viewingReservation.id, "confirmed")}
                    style={{ flex: 1, padding: "0.55rem", borderRadius: "8px", border: "none", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
                  >
                    Confirm Booking
                  </button>
                )}
                {viewingReservation.status !== "seated" && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(viewingReservation.reservationId || viewingReservation.id, "seated")}
                    style={{ flex: 1, padding: "0.55rem", borderRadius: "8px", border: "none", background: "rgba(59, 130, 246, 0.2)", color: "#3b82f6", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
                  >
                    Seat Guests
                  </button>
                )}
                {viewingReservation.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(viewingReservation.reservationId || viewingReservation.id, "completed")}
                    style={{ flex: 1, padding: "0.55rem", borderRadius: "8px", border: "none", background: "rgba(5, 150, 105, 0.2)", color: "#059669", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
                  >
                    Complete Visit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. MODAL 3: Tax Invoice & Bill Print (ReceiptModal - Matches Image 5) ── */}
      {receiptTableData && (
        <ReceiptModal
          table={receiptTableData}
          restaurantSettings={{
            restaurantName: restaurantName || "Bhanu Bistro",
            tagline: "Fine Dining & POS Management",
            address: "Main Road, Near Tech Park, Hyderabad, India",
            phone: "+91 98450 12345",
            gstin: "36AABCA1234F1Z5",
            ...restaurantSettings,
          }}
          onClose={() => setPrintReceiptReservation(null)}
        />
      )}
    </div>
  );
}
