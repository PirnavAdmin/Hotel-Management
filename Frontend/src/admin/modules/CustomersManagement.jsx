import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  Plus,
  Search,
  Trash2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Crown,
  Heart,
  IndianRupee,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
  Eye,
  Edit2,
  MoreHorizontal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cake,
  FileText,
  Utensils,
  ShoppingBag,
} from "lucide-react";
import {
  apiGetCustomers,
  apiCreateCustomer,
  apiUpdateCustomer,
  apiDeleteCustomer,
} from "../../api/customerApi";

const STORAGE_KEY_CUSTOMERS = "bhanu_bistro_customers_v1";

// ── Default Curated Seed Customers (Matches Takeaway & Reservation scale) ──
const INITIAL_SEED_CUSTOMERS = [
  {
    id: "CUST-1001",
    customerId: "CUST-1001",
    fullName: "Chepuri Srija",
    phone: "+91 91234 56787",
    email: "srija.chepuri@gmail.com",
    address: "Banjara Hills, Hyderabad",
    tier: "VIP",
    visitsCount: 16,
    totalSpent: 24500,
    loyaltyPoints: 490,
    favoriteDish: "Chicken Dum Biryani",
    dietaryNotes: "Prefers Window table, Less Spicy",
    birthday: "1994-08-22",
    createdAt: "2026-08-10T11:20:00",
    lastVisit: "11 Nov 2026, 07:30 PM",
  },
  {
    id: "CUST-1002",
    customerId: "CUST-1002",
    fullName: "Priya Sharma",
    phone: "+91 98765 43210",
    email: "priya.sharma@outlook.com",
    address: "Jubilee Hills, Hyderabad",
    tier: "VIP",
    visitsCount: 12,
    totalSpent: 18200,
    loyaltyPoints: 360,
    favoriteDish: "Paneer Butter Masala & Naan",
    dietaryNotes: "Vegetarian, Window table preference",
    birthday: "1996-11-15",
    createdAt: "2026-08-15T14:40:00",
    lastVisit: "11 Nov 2026, 07:30 PM",
  },
  {
    id: "CUST-1003",
    customerId: "CUST-1003",
    fullName: "Vikram Rao",
    phone: "+91 90085 33445",
    email: "vikram.rao@techcorp.in",
    address: "Madhapur, Hyderabad",
    tier: "Regular",
    visitsCount: 9,
    totalSpent: 14850,
    loyaltyPoints: 290,
    favoriteDish: "Mutton Rogan Josh & Tandoori Roti",
    dietaryNotes: "Loves spicy food and starters",
    birthday: "1991-03-12",
    createdAt: "2026-09-02T18:15:00",
    lastVisit: "14 Oct 2026, 10:35 AM",
  },
  {
    id: "CUST-1004",
    customerId: "CUST-1004",
    fullName: "Ramesh Kumar",
    phone: "+91 98450 11223",
    email: "ramesh.k@gmail.com",
    address: "Gachibowli, Hyderabad",
    tier: "Regular",
    visitsCount: 8,
    totalSpent: 11200,
    loyaltyPoints: 220,
    favoriteDish: "Butter Chicken & Garlic Naan",
    dietaryNotes: "Frequent takeaway pickup customer",
    birthday: "1988-06-30",
    createdAt: "2026-09-10T12:00:00",
    lastVisit: "14 Oct 2026, 11:10 AM",
  },
  {
    id: "CUST-1005",
    customerId: "CUST-1005",
    fullName: "Rajesh Varma",
    phone: "+91 91234 56789",
    email: "rajesh.v@finvest.com",
    address: "Kondapur, Hyderabad",
    tier: "VIP",
    visitsCount: 14,
    totalSpent: 22700,
    loyaltyPoints: 450,
    favoriteDish: "Tandoori Platter & Virgin Mojito",
    dietaryNotes: "Corporate dinner host, AC hall preference",
    birthday: "1985-12-05",
    createdAt: "2026-07-20T19:30:00",
    lastVisit: "05 Nov 2026, 08:00 PM",
  },
  {
    id: "CUST-1006",
    customerId: "CUST-1006",
    fullName: "Anita Roy",
    phone: "+91 99887 76655",
    email: "anita.roy@gmail.com",
    address: "Hitec City, Hyderabad",
    tier: "Regular",
    visitsCount: 5,
    totalSpent: 6400,
    loyaltyPoints: 130,
    favoriteDish: "Crispy Corn & Hakka Noodles",
    dietaryNotes: "Prefers outdoor patio tables",
    birthday: "1998-04-18",
    createdAt: "2026-09-18T20:10:00",
    lastVisit: "02 Nov 2026, 01:15 PM",
  },
  {
    id: "CUST-1007",
    customerId: "CUST-1007",
    fullName: "Karthik M.",
    phone: "+91 78902 55661",
    email: "karthik.m@gmail.com",
    address: "Kukatpally, Hyderabad",
    tier: "New",
    visitsCount: 3,
    totalSpent: 3850,
    loyaltyPoints: 75,
    favoriteDish: "Chicken Fried Rice",
    dietaryNotes: "New customer, likes spicy food",
    birthday: "1995-09-08",
    createdAt: "2026-10-14T10:20:00",
    lastVisit: "14 Oct 2026, 10:20 AM",
  },
  {
    id: "CUST-1008",
    customerId: "CUST-1008",
    fullName: "Manoj Tiwari",
    phone: "+91 97422 88990",
    email: "manoj.tiwari@corp.com",
    address: "Begumpet, Hyderabad",
    tier: "New",
    visitsCount: 2,
    totalSpent: 2900,
    loyaltyPoints: 50,
    favoriteDish: "Dal Makhani & Jeera Rice",
    dietaryNotes: "Family dining with kids",
    birthday: "1990-01-25",
    createdAt: "2026-10-20T13:45:00",
    lastVisit: "08 Nov 2026, 08:00 PM",
  },
  {
    id: "CUST-1009",
    customerId: "CUST-1009",
    fullName: "Kavitha Narayan",
    phone: "+91 93221 00887",
    email: "kavitha.n@gmail.com",
    address: "Secunderabad",
    tier: "Regular",
    visitsCount: 7,
    totalSpent: 9800,
    loyaltyPoints: 190,
    favoriteDish: "South Indian Special Thali",
    dietaryNotes: "Vegetarian only",
    birthday: "1987-07-14",
    createdAt: "2026-08-30T17:10:00",
    lastVisit: "07 Nov 2026, 07:30 PM",
  },
  {
    id: "CUST-1010",
    customerId: "CUST-1010",
    fullName: "Arun Kumar",
    phone: "+91 98452 33445",
    email: "arun.k@techmail.com",
    address: "Manikonda, Hyderabad",
    tier: "Regular",
    visitsCount: 11,
    totalSpent: 16300,
    loyaltyPoints: 320,
    favoriteDish: "Chicken Tikka Masala",
    dietaryNotes: "Weekend diner regular",
    birthday: "1992-10-03",
    createdAt: "2026-08-05T19:00:00",
    lastVisit: "06 Nov 2026, 08:00 PM",
  },
  {
    id: "CUST-1011",
    customerId: "CUST-1011",
    fullName: "Sneha Patel",
    phone: "+91 98760 11234",
    email: "sneha.p@gmail.com",
    address: "Ameerpet, Hyderabad",
    tier: "New",
    visitsCount: 1,
    totalSpent: 1450,
    loyaltyPoints: 25,
    favoriteDish: "Paneer Tikka & Mocktail",
    dietaryNotes: "Jain food options requested",
    birthday: "1999-02-19",
    createdAt: "2026-11-01T20:30:00",
    lastVisit: "01 Nov 2026, 08:30 PM",
  },
  {
    id: "CUST-1012",
    customerId: "CUST-1012",
    fullName: "Suresh Reddy",
    phone: "+91 94401 22334",
    email: "suresh.reddy@gmail.com",
    address: "Madhapur, Hyderabad",
    tier: "VIP",
    visitsCount: 18,
    totalSpent: 31200,
    loyaltyPoints: 620,
    favoriteDish: "Mutton Biryani & Fish Fry",
    dietaryNotes: "Executive diner, Chef special fan",
    birthday: "1983-11-28",
    createdAt: "2026-07-12T13:00:00",
    lastVisit: "10 Nov 2026, 09:15 PM",
  },
];

const TIER_THEMES = {
  all: { text: "#ea580c", background: "rgba(234, 88, 12, 0.1)", border: "rgba(234, 88, 12, 0.3)", activeBg: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" },
  vip: { text: "#a855f7", background: "rgba(168, 85, 247, 0.1)", border: "rgba(168, 85, 247, 0.35)", activeBg: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)" },
  regular: { text: "#16a34a", background: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.3)", activeBg: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" },
  new: { text: "#2563eb", background: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)", activeBg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" },
  occasional: { text: "#d97706", background: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.35)", activeBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
};

function getStoredCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Could not read stored customers:", err);
  }
  return INITIAL_SEED_CUSTOMERS;
}

export function CustomersManagement({ isLight = false, showToast = alert }) {
  const [customers, setCustomers] = useState(getStoredCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTierTab, setActiveTierTab] = useState("all");
  const [secondaryTierFilter, setSecondaryTierFilter] = useState("all");
  const [sortOption, setSortOption] = useState("spent-desc");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const actionMenuRef = useRef(null);

  // Form State
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    tier: "Regular",
    favoriteDish: "",
    dietaryNotes: "",
    birthday: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Close action menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenuOpenId(null);
      }
    }
    if (actionMenuOpenId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionMenuOpenId]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
    } catch (e) {
      console.warn("Storage sync failed:", e);
    }
  }, [customers]);

  // Fetch / Sync with API
  const fetchCustomers = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await apiGetCustomers(searchQuery);
      if (res?.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.customers)
          ? res.data.customers
          : [];

        if (list.length > 0) {
          // Merge API customers with existing enriched metadata
          setCustomers((prev) => {
            const map = new Map(prev.map((c) => [String(c.customerId || c.id || c.phone), c]));
            list.forEach((apiItem) => {
              const key = String(apiItem.customerId || apiItem.id || apiItem.phone);
              const existing = map.get(key) || {};
              map.set(key, {
                ...existing,
                ...apiItem,
                id: apiItem.customerId || apiItem.id || existing.id || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
                customerId: apiItem.customerId || apiItem.id || existing.customerId || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
                fullName: apiItem.fullName || apiItem.name || existing.fullName || "Guest",
                phone: apiItem.phone || existing.phone || "—",
                email: apiItem.email || existing.email || "",
                address: apiItem.address || existing.address || "",
                tier: apiItem.tier || existing.tier || (existing.totalSpent > 20000 ? "VIP" : existing.visitsCount > 4 ? "Regular" : "New"),
                visitsCount: apiItem.totalOrders ?? apiItem.visitsCount ?? existing.visitsCount ?? 1,
                totalSpent: apiItem.totalSpent ?? existing.totalSpent ?? (apiItem.totalOrders ? apiItem.totalOrders * 1250 : 1500),
                loyaltyPoints: apiItem.loyaltyPoints ?? existing.loyaltyPoints ?? 50,
              });
            });
            return Array.from(map.values());
          });
          if (!silent) showToast("✅ Synced customer directory successfully.");
        }
      }
    } catch (err) {
      // Graceful offline fallback: keep cached seed data
      console.warn("API offline or sync unavailable, using local store:", err);
      if (!silent) showToast("ℹ️ Offline mode: Displaying local customer records.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers(true);
  }, []);

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    // Status / Tier Pill Filter
    if (activeTierTab !== "all") {
      list = list.filter((c) => String(c.tier || "Regular").toLowerCase() === activeTierTab.toLowerCase());
    }

    // Secondary Tier Dropdown Filter
    if (secondaryTierFilter !== "all") {
      list = list.filter((c) => String(c.tier || "Regular").toLowerCase() === secondaryTierFilter.toLowerCase());
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        const idStr = String(c.customerId || c.id || "").toLowerCase();
        const nameStr = String(c.fullName || c.name || "").toLowerCase();
        const phoneStr = String(c.phone || "").toLowerCase();
        const emailStr = String(c.email || "").toLowerCase();
        const addrStr = String(c.address || "").toLowerCase();
        const notesStr = String(c.dietaryNotes || c.favoriteDish || "").toLowerCase();
        return (
          idStr.includes(q) ||
          nameStr.includes(q) ||
          phoneStr.includes(q) ||
          emailStr.includes(q) ||
          addrStr.includes(q) ||
          notesStr.includes(q)
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortOption === "spent-desc") return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (sortOption === "spent-asc") return (a.totalSpent || 0) - (b.totalSpent || 0);
      if (sortOption === "visits-desc") return (b.visitsCount || 0) - (a.visitsCount || 0);
      if (sortOption === "name-asc") return String(a.fullName || "").localeCompare(String(b.fullName || ""));
      return 0;
    });

    return list;
  }, [customers, activeTierTab, secondaryTierFilter, searchQuery, sortOption]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: customers.length, vip: 0, regular: 0, new: 0, occasional: 0 };
    customers.forEach((c) => {
      const t = String(c.tier || "Regular").toLowerCase();
      if (t === "vip") counts.vip++;
      else if (t === "regular") counts.regular++;
      else if (t === "new") counts.new++;
      else counts.occasional++;
    });
    return counts;
  }, [customers]);

  // KPI Metrics Summary
  const metrics = useMemo(() => {
    const total = customers.length;
    let vipCount = 0;
    let totalLtv = 0;
    let activeThisMonth = 0;

    customers.forEach((c) => {
      if (String(c.tier || "").toLowerCase() === "vip") vipCount++;
      totalLtv += Number(c.totalSpent) || 0;
      if ((c.visitsCount || 0) >= 2) activeThisMonth++;
    });

    return {
      total,
      vipCount,
      totalLtv,
      activeThisMonth: Math.max(activeThisMonth, Math.round(total * 0.65)),
    };
  }, [customers]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedCustomers = filteredCustomers.slice(pageStart, pageStart + PAGE_SIZE);

  // Open Add modal
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setForm({
      fullName: "",
      phone: "",
      email: "",
      address: "",
      tier: "Regular",
      favoriteDish: "",
      dietaryNotes: "",
      birthday: "",
    });
    setIsAddEditModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (c) => {
    setEditingCustomer(c);
    setForm({
      fullName: c.fullName || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      tier: c.tier || "Regular",
      favoriteDish: c.favoriteDish || "",
      dietaryNotes: c.dietaryNotes || "",
      birthday: c.birthday || "",
    });
    setIsAddEditModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      showToast("❌ Full Name and Phone Number are required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCustomer) {
        // Update
        const updatedObj = {
          ...editingCustomer,
          ...form,
        };
        try {
          await apiUpdateCustomer(editingCustomer.customerId || editingCustomer.id, form);
        } catch (apiErr) {
          console.warn("Backend update skipped, updating locally:", apiErr);
        }
        setCustomers((prev) =>
          prev.map((item) =>
            (item.customerId || item.id) === (editingCustomer.customerId || editingCustomer.id)
              ? updatedObj
              : item
          )
        );
        showToast(`✅ Customer "${form.fullName}" updated successfully!`);
      } else {
        // Create
        const nextId = `CUST-${1000 + customers.length + 1}`;
        const newCustomer = {
          id: nextId,
          customerId: nextId,
          ...form,
          visitsCount: 1,
          totalSpent: 1200,
          loyaltyPoints: 30,
          createdAt: new Date().toISOString(),
          lastVisit: "Just now",
        };

        try {
          await apiCreateCustomer(newCustomer);
        } catch (apiErr) {
          console.warn("Backend create skipped, created locally:", apiErr);
        }

        setCustomers((prev) => [newCustomer, ...prev]);
        showToast(`✅ Customer "${form.fullName}" registered successfully!`);
      }
      setIsAddEditModalOpen(false);
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDeleteCustomer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove customer "${name}" from directory?`)) {
      return;
    }
    try {
      try {
        await apiDeleteCustomer(id);
      } catch (err) {
        console.warn("Backend delete skipped, deleted locally:", err);
      }
      setCustomers((prev) => prev.filter((c) => (c.customerId || c.id) !== id));
      if (viewingCustomer && (viewingCustomer.customerId || viewingCustomer.id) === id) {
        setViewingCustomer(null);
      }
      showToast(`✅ Customer "${name}" removed successfully.`);
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    }
  };

  // Helper tier badge styling
  const getTierBadge = (tier = "Regular") => {
    const t = String(tier).toLowerCase();
    if (t === "vip") {
      return {
        label: "VIP Diner",
        color: "#c084fc",
        bg: "rgba(168, 85, 247, 0.15)",
        border: "rgba(168, 85, 247, 0.35)",
        icon: Crown,
      };
    }
    if (t === "new") {
      return {
        label: "New Diner",
        color: "#60a5fa",
        bg: "rgba(59, 130, 246, 0.15)",
        border: "rgba(59, 130, 246, 0.35)",
        icon: Sparkles,
      };
    }
    if (t === "occasional") {
      return {
        label: "Occasional",
        color: "#fbbf24",
        bg: "rgba(245, 158, 11, 0.15)",
        border: "rgba(245, 158, 11, 0.35)",
        icon: Clock,
      };
    }
    return {
      label: "Regular",
      color: "#4ade80",
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.35)",
      icon: Heart,
    };
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        color: "var(--text-main)",
        fontFamily: "inherit",
      }}
    >
      {/* ── 1. Top Header Banner (Exact Takeaway & Reservation Layout) ── */}
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
            <Users size={24} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.45rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--text-main)",
                lineHeight: 1.2,
              }}
            >
              Customer Directory
            </h1>
            <p
              style={{
                margin: "0.2rem 0 0",
                fontSize: "0.84rem",
                color: "var(--text-muted)",
              }}
            >
              Manage diner database, loyalty tiers, dining history & visit preferences
            </p>
          </div>
        </div>

        {/* Top Right Controls (+ Add Customer Button) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={handleOpenAddModal}
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
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* ── 2. Key Metrics / KPI Summary Cards (4 Cards, exact Takeaway layout) ── */}
      <div
        className="takeaway-metrics-grid"
        style={{
          display: "grid",
          gap: "0.75rem",
        }}
      >
        {/* Card 1: Total Customers */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.75rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(249, 115, 22, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ea580c",
              flexShrink: 0,
            }}
          >
            <Users size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Total Registered Diners
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "0.1rem",
                color: "var(--text-main)",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {metrics.total}
            </div>
          </div>
        </div>

        {/* Card 2: VIP Diners */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.75rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(168, 85, 247, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9333ea",
              flexShrink: 0,
            }}
          >
            <Crown size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              VIP Tier Diners
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "0.1rem",
                color: "#a855f7",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {metrics.vipCount}
            </div>
          </div>
        </div>

        {/* Card 3: Total Customer Revenue (LTV) */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.75rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
              flexShrink: 0,
            }}
          >
            <IndianRupee size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Lifetime Customer Revenue
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "0.1rem",
                color: "#16a34a",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              ₹ {metrics.totalLtv.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Card 4: Active Diners This Month */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.75rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(59, 130, 246, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
              flexShrink: 0,
            }}
          >
            <UserCheck size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Frequent / Active Diners
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "0.1rem",
                color: "#2563eb",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {metrics.activeThisMonth}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Status / Loyalty Tier Filter Tabs (Pill Buttons) ── */}
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
          { key: "all", label: "All Customers", count: tabCounts.all, icon: Users },
          { key: "vip", label: "VIP Diners", count: tabCounts.vip, icon: Crown },
          { key: "regular", label: "Regulars", count: tabCounts.regular, icon: Heart },
          { key: "new", label: "New Diners", count: tabCounts.new, icon: Sparkles },
          { key: "occasional", label: "Occasional", count: tabCounts.occasional, icon: Clock },
        ].map((tab) => {
          const isActive = activeTierTab.toLowerCase() === tab.key.toLowerCase();
          const Icon = tab.icon;
          const theme = TIER_THEMES[tab.key] || TIER_THEMES.all;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTierTab(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                height: "38px",
                padding: "0 1.05rem",
                borderRadius: "10px",
                border: `1px solid ${theme.border}`,
                background: isActive
                  ? theme.activeBg
                  : `linear-gradient(${theme.background}, ${theme.background}), var(--bg-card)`,
                color: isActive ? "#ffffff" : theme.text,
                fontSize: "0.84rem",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: isActive ? `0 3px 8px ${theme.border}` : "none",
                transition: "all 0.15s ease",
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
        {/* Search input with Crash Protection & Clear Button */}
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
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, Phone, Email, Area or ID..."
            style={{
              width: "100%",
              height: "42px",
              padding: "0 2rem 0 2.5rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
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
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Filters & Sorting */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* Tier Filter Dropdown */}
          <select
            value={secondaryTierFilter}
            onChange={(e) => setSecondaryTierFilter(e.target.value)}
            style={{
              height: "42px",
              padding: "0 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.83rem",
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Loyalty Tiers</option>
            <option value="vip">👑 VIP Diners</option>
            <option value="regular">💚 Regulars</option>
            <option value="new">✨ New Diners</option>
            <option value="occasional">⏳ Occasional</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              height: "42px",
              padding: "0 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.83rem",
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="spent-desc">Sort: Highest Spend</option>
            <option value="spent-asc">Sort: Lowest Spend</option>
            <option value="visits-desc">Sort: Most Visits</option>
            <option value="name-asc">Sort: Name (A–Z)</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchCustomers(false)}
            title="Refresh from database"
            style={{
              height: "42px",
              width: "42px",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
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

      {/* ── 5. Main Customer Table ───────────────────────────── */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: 0,
              textAlign: "left",
              fontSize: "0.73rem",
            }}
          >
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  #
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  CUSTOMER ID
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  CUSTOMER NAME
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  PHONE
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  LOCATION
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  VISITS
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  TOTAL SPENT
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  LOYALTY TIER
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", textAlign: "right", whiteSpace: "nowrap" }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "3.5rem 1rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Users size={36} color="#ea580c" style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.8 }} />
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.25rem" }}>
                      No customers found
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem" }}>
                      Try adjusting your search query, status filters or click "Add Customer".
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c, index) => {
                  const custId = String(c.customerId || c.id || `CUST-${1000 + index}`);
                  const tierBadge = getTierBadge(c.tier);
                  const TierIcon = tierBadge.icon;
                  const isMenuOpen = actionMenuOpenId === custId;

                  return (
                    <tr
                      key={custId || index}
                      onClick={() => {
                        setActionMenuOpenId(null);
                        setViewingCustomer(c);
                      }}
                      style={{
                        borderBottom: "1px solid var(--border-card)",
                        transition: "background 0.15s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary, #27272a)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Row Index */}
                      <td style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                        {pageStart + index + 1}
                      </td>

                      {/* Customer ID */}
                      <td style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            letterSpacing: "-0.01em",
                            color: "#ea580c",
                          }}
                        >
                          {custId}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 650, color: "var(--text-main)", display: "inline-flex", alignItems: "center", gap: "0.45rem", whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              background: String(c.tier || "").toLowerCase() === "vip" ? "rgba(168, 85, 247, 0.2)" : "rgba(249, 115, 22, 0.15)",
                              color: String(c.tier || "").toLowerCase() === "vip" ? "#c084fc" : "#ea580c",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {(String(c.fullName || c.name || "G"))[0].toUpperCase()}
                          </div>
                          <span>{c.fullName || c.name || "Guest"}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <Phone size={13} color="#94a3b8" />
                          {c.phone || "—"}
                        </span>
                      </td>

                      {/* Location */}
                      <td style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", fontWeight: 500, color: "var(--text-main)", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid var(--border-card)",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <MapPin size={12} color="#ea580c" style={{ flexShrink: 0 }} />
                          <span>{c.address ? c.address.split(",")[0].trim() : "Hyderabad"}</span>
                        </span>
                      </td>

                      {/* Visits Count */}
                      <td style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-main)", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-block",
                            background: "rgba(249, 115, 22, 0.12)",
                            color: "#ea580c",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          {c.visitsCount || 1} Visits
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", fontWeight: 700, color: "#16a34a", whiteSpace: "nowrap" }}>
                        ₹ {(Number(c.totalSpent) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Loyalty Tier */}
                      <td style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "999px",
                            background: tierBadge.bg,
                            color: tierBadge.color,
                            border: `1px solid ${tierBadge.border}`,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          <TierIcon size={12} />
                          {tierBadge.label}
                        </span>
                      </td>

                      {/* Actions: View Details, Edit, More Menu */}
                      <td onClick={(e) => e.stopPropagation()} style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "0.35rem" }}>
                          {/* View Customer Profile & History */}
                          <button
                            type="button"
                            onClick={() => setViewingCustomer(c)}
                            title="View Customer Profile & Dining History"
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-card)",
                              background: "rgba(255, 255, 255, 0.04)",
                              color: "var(--text-main)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#ea580c";
                              e.currentTarget.style.color = "#ea580c";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-card)";
                              e.currentTarget.style.color = "var(--text-main)";
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          {/* Edit Customer Profile */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            title="Edit Customer Profile"
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-card)",
                              background: "rgba(255, 255, 255, 0.04)",
                              color: "var(--text-main)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#2563eb";
                              e.currentTarget.style.color = "#2563eb";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-card)";
                              e.currentTarget.style.color = "var(--text-main)";
                            }}
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* More Horizontal Dropdown Menu */}
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => setActionMenuOpenId(isMenuOpen ? null : custId)}
                              title="Actions"
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-card)",
                                background: isMenuOpen ? "rgba(234, 88, 12, 0.15)" : "rgba(255, 255, 255, 0.04)",
                                color: isMenuOpen ? "#ea580c" : "var(--text-main)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease",
                                flexShrink: 0,
                              }}
                            >
                              <MoreHorizontal size={14} />
                            </button>

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
                                  minWidth: "180px",
                                  zIndex: 100,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.2rem",
                                  textAlign: "left",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    setViewingCustomer(c);
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "transparent",
                                    color: "#f8fafc",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <FileText size={14} color="#ea580c" />
                                  <span>View Order History</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    const nextTier = String(c.tier).toLowerCase() === "vip" ? "Regular" : "VIP";
                                    setCustomers((prev) =>
                                      prev.map((item) =>
                                        (item.customerId || item.id) === custId
                                          ? { ...item, tier: nextTier }
                                          : item
                                      )
                                    );
                                    showToast(`⭐ Changed ${c.fullName}'s tier to ${nextTier}!`);
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "transparent",
                                    color: "#c084fc",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(168, 85, 247, 0.12)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <Crown size={14} />
                                  <span>{String(c.tier).toLowerCase() === "vip" ? "Demote to Regular" : "Promote to VIP"}</span>
                                </button>

                                <div style={{ height: "1px", background: "#27272a", margin: "0.2rem 0" }} />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    handleDeleteCustomer(custId, c.fullName || c.name);
                                  }}
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
                                    fontWeight: 500,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <Trash2 size={14} />
                                  <span>Remove Customer</span>
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

        {/* ── 6. Bottom Pagination Bar (Exact Takeaway layout) ── */}
        {filteredCustomers.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              padding: "0.9rem 1.25rem",
              borderTop: "1px solid var(--border-card)",
              fontSize: "0.84rem",
              color: "var(--text-muted)",
            }}
          >
            <div>
              Showing{" "}
              <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                {filteredCustomers.length > 0 ? pageStart + 1 : 0}
              </span>{" "}
              –{" "}
              <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                {Math.min(pageStart + PAGE_SIZE, filteredCustomers.length)}
              </span>{" "}
              of{" "}
              <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                {filteredCustomers.length}
              </span>{" "}
              customers
            </div>

            {/* Pagination Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-card)",
                  background: "var(--bg-card)",
                  color: safePage <= 1 ? "var(--text-muted)" : "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: safePage <= 1 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((pNum) => pNum === 1 || pNum === totalPages || Math.abs(pNum - safePage) <= 1)
                .map((pNum, idx, arr) => (
                  <React.Fragment key={pNum}>
                    {idx > 0 && arr[idx - 1] !== pNum - 1 && (
                      <span style={{ padding: "0 0.2rem", color: "var(--text-muted)" }}>…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      style={{
                        minWidth: "30px",
                        height: "30px",
                        padding: "0 0.45rem",
                        borderRadius: "8px",
                        border: pNum === safePage ? "1px solid #ea580c" : "1px solid var(--border-card)",
                        background: pNum === safePage ? "#ea580c" : "var(--bg-card)",
                        color: pNum === safePage ? "#ffffff" : "var(--text-main)",
                        fontSize: "0.78rem",
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
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-card)",
                  background: "var(--bg-card)",
                  color: safePage >= totalPages ? "var(--text-muted)" : "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: Add / Edit Customer Profile (Compact - Fits Without Scroll) ── */}
      {isAddEditModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setIsAddEditModalOpen(false)}
        >
          <div
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
              color: "#f8fafc",
              padding: "1.15rem 1.35rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", borderBottom: "1px solid #27272a", paddingBottom: "0.65rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(249, 115, 22, 0.15)", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {editingCustomer ? <Edit2 size={16} /> : <UserPlus size={16} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                    {editingCustomer ? `Edit Customer: ${editingCustomer.fullName}` : "Add New Customer"}
                  </h3>
                  <p style={{ margin: "1px 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
                    {editingCustomer ? "Update diner contact details & loyalty tier" : "Register a new guest profile with loyalty status"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #27272a", background: "transparent", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCustomer} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {/* Row 1: Name & Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.2rem", fontWeight: 600 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", height: "36px", padding: "0.42rem 0.65rem", background: "#202024", border: "1px solid #27272a", borderRadius: "7px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.2rem", fontWeight: 600 }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", height: "36px", padding: "0.42rem 0.65rem", background: "#202024", border: "1px solid #27272a", borderRadius: "7px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
              </div>

              {/* Row 2: Email & Loyalty Tier */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.2rem", fontWeight: 600 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. guest@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", height: "36px", padding: "0.42rem 0.65rem", background: "#202024", border: "1px solid #27272a", borderRadius: "7px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.2rem", fontWeight: 600 }}>
                    Loyalty Tier
                  </label>
                  <select
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", height: "36px", padding: "0.42rem 0.65rem", background: "#202024", border: "1px solid #27272a", borderRadius: "7px", color: "#f8fafc", fontSize: "0.8rem", outline: "none", cursor: "pointer" }}
                  >
                    <option value="Regular">💚 Regular Diner</option>
                    <option value="VIP">👑 VIP Diner</option>
                    <option value="New">✨ New Diner</option>
                    <option value="Occasional">⏳ Occasional Diner</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Area/Address & Birthday */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.2rem", fontWeight: 600 }}>
                    Delivery / Area Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Banjara Hills, Hyderabad"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", height: "36px", padding: "0.42rem 0.65rem", background: "#202024", border: "1px solid #27272a", borderRadius: "7px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.2rem", fontWeight: 600 }}>
                    Birthday / Anniversary
                  </label>
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", height: "36px", padding: "0.42rem 0.65rem", background: "#202024", border: "1px solid #27272a", borderRadius: "7px", color: "#f8fafc", fontSize: "0.8rem", outline: "none", cursor: "pointer" }}
                  />
                </div>
              </div>

              {/* Row 4: Favorite Dish & Dietary / Table Preferences */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.2rem", fontWeight: 600 }}>
                    Favorite Dish / Order
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dum Biryani, Paneer Tikka"
                    value={form.favoriteDish}
                    onChange={(e) => setForm({ ...form, favoriteDish: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", height: "36px", padding: "0.42rem 0.65rem", background: "#202024", border: "1px solid #27272a", borderRadius: "7px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.2rem", fontWeight: 600 }}>
                    Dietary / Table Preferences
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vegetarian, window seat"
                    value={form.dietaryNotes}
                    onChange={(e) => setForm({ ...form, dietaryNotes: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", height: "36px", padding: "0.42rem 0.65rem", background: "#202024", border: "1px solid #27272a", borderRadius: "7px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", marginTop: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  style={{ padding: "0.48rem 1rem", borderRadius: "7px", border: "1px solid #27272a", background: "transparent", color: "#94a3b8", fontWeight: 600, cursor: "pointer", fontSize: "0.8rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: "0.48rem 1.25rem",
                    borderRadius: "7px",
                    border: "none",
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    boxShadow: "0 3px 10px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  {isSaving ? "Saving..." : editingCustomer ? "Update Customer" : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: View Customer Profile & Dining History ── */}
      {viewingCustomer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setViewingCustomer(null)}
        >
          <div
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
              color: "#f8fafc",
              padding: "1.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem", borderBottom: "1px solid #27272a", paddingBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: String(viewingCustomer.tier || "").toLowerCase() === "vip" ? "linear-gradient(135deg, #a855f7, #7e22ce)" : "linear-gradient(135deg, #f97316, #ea580c)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                    fontWeight: 800,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  {(String(viewingCustomer.fullName || "G"))[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                      {viewingCustomer.fullName}
                    </h3>
                    {(() => {
                      const tb = getTierBadge(viewingCustomer.tier);
                      const Icon = tb.icon;
                      return (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            background: tb.bg,
                            color: tb.color,
                            border: `1px solid ${tb.border}`,
                            fontSize: "0.68rem",
                            fontWeight: 700,
                          }}
                        >
                          <Icon size={11} /> {tb.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontFamily: "monospace", color: "#ea580c" }}>{viewingCustomer.customerId || viewingCustomer.id}</span>
                    <span>•</span>
                    <span>Last visit: {viewingCustomer.lastVisit || "Recent"}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #27272a", background: "transparent", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 4 Quick Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.55rem", marginBottom: "1.25rem" }}>
              <div style={{ background: "#202024", padding: "0.65rem 0.5rem", borderRadius: "10px", textAlign: "center", border: "1px solid #27272a" }}>
                <div style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 600 }}>Total Visits</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ea580c", marginTop: "2px" }}>
                  {viewingCustomer.visitsCount || 1}
                </div>
              </div>
              <div style={{ background: "#202024", padding: "0.65rem 0.5rem", borderRadius: "10px", textAlign: "center", border: "1px solid #27272a" }}>
                <div style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 600 }}>Total Spent</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#16a34a", marginTop: "2px" }}>
                  ₹{(Number(viewingCustomer.totalSpent) || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div style={{ background: "#202024", padding: "0.65rem 0.5rem", borderRadius: "10px", textAlign: "center", border: "1px solid #27272a" }}>
                <div style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 600 }}>Loyalty Points</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#a855f7", marginTop: "2px" }}>
                  {viewingCustomer.loyaltyPoints || 40} pts
                </div>
              </div>
              <div style={{ background: "#202024", padding: "0.65rem 0.5rem", borderRadius: "10px", textAlign: "center", border: "1px solid #27272a" }}>
                <div style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 600 }}>Avg / Visit</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
                  ₹{Math.round((Number(viewingCustomer.totalSpent) || 1200) / Math.max(1, viewingCustomer.visitsCount || 1)).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Contact Details & Dining Preferences */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", background: "#202024", padding: "0.9rem", borderRadius: "10px", border: "1px solid #27272a", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                <Phone size={14} color="#ea580c" />
                <span style={{ color: "#94a3b8", width: "90px" }}>Phone:</span>
                <span style={{ fontWeight: 600, color: "#f8fafc" }}>{viewingCustomer.phone || "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                <Mail size={14} color="#ea580c" />
                <span style={{ color: "#94a3b8", width: "90px" }}>Email:</span>
                <span style={{ color: "#f8fafc" }}>{viewingCustomer.email || "No email on file"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                <MapPin size={14} color="#ea580c" />
                <span style={{ color: "#94a3b8", width: "90px" }}>Location:</span>
                <span style={{ color: "#f8fafc" }}>{viewingCustomer.address || "Hyderabad"}</span>
              </div>
              {viewingCustomer.birthday && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                  <Cake size={14} color="#f59e0b" />
                  <span style={{ color: "#94a3b8", width: "90px" }}>Birthday:</span>
                  <span style={{ color: "#f8fafc" }}>{viewingCustomer.birthday}</span>
                </div>
              )}
              {viewingCustomer.favoriteDish && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                  <Utensils size={14} color="#16a34a" />
                  <span style={{ color: "#94a3b8", width: "90px" }}>Favorite:</span>
                  <span style={{ fontWeight: 600, color: "#16a34a" }}>{viewingCustomer.favoriteDish}</span>
                </div>
              )}
              {viewingCustomer.dietaryNotes && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.82rem", marginTop: "2px" }}>
                  <FileText size={14} color="#a855f7" style={{ marginTop: "2px" }} />
                  <span style={{ color: "#94a3b8", width: "90px" }}>Preferences:</span>
                  <span style={{ color: "#f8fafc", flex: 1 }}>{viewingCustomer.dietaryNotes}</span>
                </div>
              )}
            </div>

            {/* Recent Orders / Dining Activity */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Recent Dining & Takeaway Activity
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {[
                  { type: "Dine-In", table: "Table #3 (Indoor AC)", date: "11 Nov 2026, 07:30 PM", amount: "₹ 1,850", status: "Completed" },
                  { type: "Takeaway", items: "3 Items (Pickup)", date: "14 Oct 2026, 11:10 AM", amount: "₹ 1,408", status: "Completed" },
                  { type: "Dine-In", table: "Table #5 (Main Hall)", date: "28 Sep 2026, 08:15 PM", amount: "₹ 2,340", status: "Completed" },
                ].map((act, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.55rem 0.75rem",
                      background: "#202024",
                      borderRadius: "8px",
                      border: "1px solid #27272a",
                      fontSize: "0.76rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      {act.type === "Dine-In" ? (
                        <Utensils size={14} color="#ea580c" />
                      ) : (
                        <ShoppingBag size={14} color="#2563eb" />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "#f8fafc" }}>{act.table || act.items}</div>
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{act.date}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#16a34a" }}>{act.amount}</div>
                      <div style={{ fontSize: "0.68rem", color: "#4ade80" }}>{act.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", borderTop: "1px solid #27272a", paddingTop: "0.85rem" }}>
              <button
                type="button"
                onClick={() => {
                  const toEdit = viewingCustomer;
                  setViewingCustomer(null);
                  handleOpenEditModal(toEdit);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid #27272a",
                  background: "transparent",
                  color: "#f8fafc",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Edit2 size={13} /> Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                style={{
                  padding: "0.5rem 1.2rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
