import React, { useState, useEffect } from "react";
import {
  ChefHat,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Edit2,
  CheckCircle,
  X,
  Save,
  Calendar,
  CreditCard,
  Crown,
  ChevronRight,
  ShoppingBag,
  Info,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Check,
  History,
  CalendarDays,
} from "lucide-react";
import { CustomerProfileDropdown } from "./CustomerProfileDropdown";
import {
  apiGetCustomerDashboard,
  apiGetCustomerProfile,
  getReservationCustomerToken,
} from "../api/reservationApi";

/**
 * CustomerProfilePage - Customer Profile & History Dashboard
 * Displays:
 * - Live Contact info (Full Name, Phone, Email)
 * - Welcome banner: "Welcome! You haven't completed any stays with us yet." for new customers
 * - Live Statistics:
 *     - Total Visits (0 for new customers, count of completed stays)
 *     - Total Amount Spent (₹0 for new customers, sum of eligible successful payments)
 *     - Previous Visit ("No previous visits" for new customers, latest completed stay date)
 *     - Last Booking ("No bookings found" for new customers, latest booking date/details)
 * - Customer Type ("New Customer" vs "Returning Customer")
 * - Tabs for Overview, Booking History, and Visit History with clean empty-state UI
 */
export function CustomerProfilePage({
  customerUser,
  onUpdateUser,
  onNavigate,
  onLogout,
  restaurantName = "The Rustic Spin",
  restaurantLogo = "",
}) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "bookings" | "visits"
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  const initialName =
    customerUser?.fullName ||
    customerUser?.name ||
    customerUser?.customer?.fullName ||
    "";
  const initialPhone =
    customerUser?.mobileNumber ||
    customerUser?.phone ||
    customerUser?.customer?.phone ||
    "";
  const initialEmail =
    customerUser?.email || customerUser?.customer?.email || "";

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiGetCustomerDashboard();
      if (res?.success && res?.data?.data) {
        const payload = res.data.data;
        setDashboardData(payload);
        if (payload.customer) {
          if (payload.customer.fullName && !isEditing) setName(payload.customer.fullName);
          if (payload.customer.mobileNumber && !isEditing) setPhone(payload.customer.mobileNumber);
          if (payload.customer.email && !isEditing) setEmail(payload.customer.email);
        }
      } else {
        // Fallback to customer profile if dashboard endpoint is unavailable
        const profileRes = await apiGetCustomerProfile();
        if (profileRes?.success && profileRes?.data?.data) {
          const cust = profileRes.data.data;
          setDashboardData({
            customer: cust,
            statistics: {
              totalVisits: cust.totalVisits ?? 0,
              totalAmountSpent: cust.totalAmountSpent ?? 0,
              previousVisit: cust.previousVisit || "No previous visits",
              lastBooking: cust.lastBooking || "No bookings found",
              customerType: cust.customerType || (cust.totalVisits > 0 ? "Returning Customer" : "New Customer"),
              welcomeMessage:
                cust.welcomeMessage ||
                (cust.totalVisits > 0
                  ? `Welcome back, ${cust.fullName || "Customer"}!`
                  : "Welcome! You haven't completed any stays with us yet."),
              totalOrders: cust.totalOrders ?? 0,
              totalReservations: cust.totalReservations ?? 0,
              loyaltyPoints: cust.loyaltyPoints ?? 0,
            },
            recentBookings: [],
            visitHistory: [],
          });
          if (!isEditing) {
            if (cust.fullName) setName(cust.fullName);
            if (cust.mobileNumber) setPhone(cust.mobileNumber);
            if (cust.email) setEmail(cust.email);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load customer profile dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const updated = {
      ...customerUser,
      fullName: name.trim() || initialName || "Customer",
      name: name.trim() || initialName || "Customer",
      phone: phone.trim() || initialPhone,
      mobileNumber: phone.trim() || initialPhone,
      email: email.trim() || initialEmail,
    };
    if (onUpdateUser) {
      onUpdateUser(updated);
    }
    setIsEditing(false);
    setSuccessToast("Profile details updated successfully!");
    setTimeout(() => setSuccessToast(""), 3500);
  };

  const handleCancel = () => {
    setName(dashboardData?.customer?.fullName || initialName);
    setPhone(dashboardData?.customer?.mobileNumber || initialPhone);
    setEmail(dashboardData?.customer?.email || initialEmail);
    setIsEditing(false);
  };

  const displayName = name || dashboardData?.customer?.fullName || initialName || "Customer";
  const displayPhone = phone || dashboardData?.customer?.mobileNumber || initialPhone || "—";
  const displayEmail = email || dashboardData?.customer?.email || initialEmail || "—";
  const avatarLetter = (displayName[0] || "C").toUpperCase();

  const stats = dashboardData?.statistics || {
    totalVisits: 0,
    totalAmountSpent: 0,
    previousVisit: "No previous visits",
    lastBooking: "No bookings found",
    customerType: "New Customer",
    welcomeMessage: "Welcome! You haven't completed any stays with us yet.",
    totalOrders: 0,
    totalReservations: 0,
    loyaltyPoints: 0,
  };

  const recentBookings = dashboardData?.recentBookings || [];
  const visitHistory = dashboardData?.visitHistory || [];
  const isNewCustomer = (stats.totalVisits || 0) === 0;

  const memberSince = dashboardData?.customer?.createdAt
    ? new Date(dashboardData.customer.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "Member";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#0c0705",
        backgroundImage:
          "radial-gradient(circle at 50% 20%, rgba(234, 88, 12, 0.14) 0%, transparent 60%), url('/assets/login-restaurant.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        color: "#f7efe8",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 24px",
          minHeight: "52px",
          background: "rgba(16, 9, 7, 0.94)",
          borderBottom: "1px solid rgba(245, 158, 11, 0.25)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={() => onNavigate("/")}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "1.5px solid #f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              overflow: "hidden",
            }}
          >
            {restaurantLogo ? (
              <img
                src={restaurantLogo}
                alt={restaurantName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <ChefHat size={18} />
            )}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "15px", color: "#ffffff", fontWeight: 800, lineHeight: 1.15 }}>
              {restaurantName}
            </strong>
            <small style={{ color: "#f59e0b", fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Fine Dining &amp; Reservations
            </small>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => onNavigate("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f5ede6",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <ArrowLeft size={13} /> Back to Home
          </button>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh statistics"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "#f59e0b",
              padding: "5px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={12} className={refreshing ? "spin-icon" : ""} />
            <span>Refresh</span>
          </button>

          <CustomerProfileDropdown
            customerUser={customerUser}
            onNavigate={onNavigate}
            onLogout={onLogout}
            currentRoute="/profile"
          />
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 16px 40px",
          overflowY: "auto",
        }}
      >
        {successToast && (
          <div
            style={{
              position: "fixed",
              top: "62px",
              zIndex: 999,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#166534",
              color: "#ffffff",
              padding: "8px 18px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            }}
          >
            <CheckCircle size={16} />
            <span>{successToast}</span>
          </div>
        )}

        {/* ── Profile Card Container ──────────────────────────── */}
        <div
          style={{
            width: "100%",
            maxWidth: "820px",
            background: "linear-gradient(145deg, #fffcf7 0%, #fff7ee 60%, #ffeedc 100%)",
            borderRadius: "20px",
            padding: "20px 26px 24px",
            color: "#1c1109",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.65), 0 0 25px rgba(245, 158, 11, 0.15)",
            border: "1.5px solid rgba(245, 158, 11, 0.45)",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {/* Header Profile Section */}
          <div style={{ textAlign: "center", marginBottom: "14px", position: "relative" }}>
            <div style={{ position: "relative", display: "inline-block", margin: "0 auto 6px" }}>
              <div
                style={{
                  width: "62px",
                  height: "62px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  border: "3px solid #ffedd5",
                  boxShadow: "0 0 0 2px #f59e0b",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: 800,
                }}
              >
                {avatarLetter}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#1c1109",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </h1>
              <span
                style={{
                  background: isNewCustomer ? "#eff6ff" : "#f0fdf4",
                  border: `1px solid ${isNewCustomer ? "#93c5fd" : "#86efac"}`,
                  color: isNewCustomer ? "#1e40af" : "#166534",
                  fontSize: "11px",
                  fontWeight: 750,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {stats.customerType || (isNewCustomer ? "New Customer" : "Returning Customer")}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#786556", margin: "3px 0 0 0", fontWeight: 500 }}>
              Member of {restaurantName} • Joined {memberSince}
            </p>
          </div>

          {/* ── Welcome Banner ─────────────────────────────────── */}
          <div
            style={{
              background: isNewCustomer
                ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
                : "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
              border: `1.5px solid ${isNewCustomer ? "#86efac" : "#fdba74"}`,
              color: isNewCustomer ? "#14532d" : "#9a3412",
              borderRadius: "12px",
              padding: "10px 16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Sparkles size={18} color={isNewCustomer ? "#16a34a" : "#ea580c"} />
              <div>
                <strong style={{ display: "block", fontSize: "13px", fontWeight: 750 }}>
                  {isNewCustomer
                    ? "Welcome! You haven't completed any stays with us yet."
                    : stats.welcomeMessage || "Welcome back to your member dashboard!"}
                </strong>
                <small style={{ fontSize: "11px", opacity: 0.9 }}>
                  {isNewCustomer
                    ? "Make your first table booking to begin earning loyalty points and tracking your stay history."
                    : `You have completed ${stats.totalVisits} visit(s) with total spent ₹${(stats.totalAmountSpent || 0).toLocaleString("en-IN")}.`}
                </small>
              </div>
            </div>

            {isNewCustomer && (
              <button
                type="button"
                onClick={() => onNavigate("/reserve")}
                style={{
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(234, 88, 12, 0.35)",
                }}
              >
                Book a Table Now
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              borderBottom: "1.5px solid rgba(245, 158, 11, 0.25)",
              paddingBottom: "10px",
              marginBottom: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              style={{
                background: activeTab === "overview" ? "#ea580c" : "rgba(255,255,255,0.7)",
                color: activeTab === "overview" ? "#ffffff" : "#6b5d52",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <User size={13} />
              <span>Overview &amp; Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("bookings")}
              style={{
                background: activeTab === "bookings" ? "#ea580c" : "rgba(255,255,255,0.7)",
                color: activeTab === "bookings" ? "#ffffff" : "#6b5d52",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <CalendarDays size={13} />
              <span>Booking History ({recentBookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("visits")}
              style={{
                background: activeTab === "visits" ? "#ea580c" : "rgba(255,255,255,0.7)",
                color: activeTab === "visits" ? "#ffffff" : "#6b5d52",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <History size={13} />
              <span>Visit History ({visitHistory.length})</span>
            </button>
          </div>

          {/* ── TAB 1: OVERVIEW & PROFILE ────────────────────────── */}
          {activeTab === "overview" && (
            <div>
              {/* Contact Information Row (3-Columns) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                {/* Full Name Box */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.88)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                    borderRadius: "12px",
                    padding: "9px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#ffedd5",
                      color: "#ea580c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <User size={15} />
                  </div>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700, textTransform: "uppercase" }}>
                      Full Name
                    </small>
                    <strong style={{ display: "block", fontSize: "12.5px", color: "#1c1109", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayName}
                    </strong>
                  </div>
                </div>

                {/* Mobile Number Box */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.88)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                    borderRadius: "12px",
                    padding: "9px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#ffedd5",
                      color: "#ea580c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Phone size={15} />
                  </div>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700, textTransform: "uppercase" }}>
                      Mobile Number
                    </small>
                    <strong style={{ display: "block", fontSize: "12.5px", color: "#1c1109", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayPhone}
                    </strong>
                  </div>
                </div>

                {/* Email Address Box */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.88)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                    borderRadius: "12px",
                    padding: "9px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#ffedd5",
                      color: "#ea580c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Mail size={15} />
                  </div>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700, textTransform: "uppercase" }}>
                      Email Address
                    </small>
                    <strong style={{ display: "block", fontSize: "12.5px", color: "#1c1109", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayEmail}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Account Statistics Grid (4 Key Required Metrics) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Crown size={15} color="#ea580c" />
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#1c1109" }}>
                    Customer Stay &amp; Spend Statistics
                  </span>
                </div>
                <div style={{ flex: 1, height: "1px", background: "rgba(245, 158, 11, 0.25)" }} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                {/* 1. Total Visits */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700, textTransform: "uppercase" }}>
                    Total Visits
                  </small>
                  <strong style={{ fontSize: "18px", color: "#ea580c", fontWeight: 800, display: "block", marginTop: "2px" }}>
                    {stats.totalVisits ?? 0}
                  </strong>
                  <span style={{ fontSize: "10px", color: "#786556" }}>
                    {stats.totalVisits === 1 ? "1 completed stay" : `${stats.totalVisits ?? 0} completed stays`}
                  </span>
                </div>

                {/* 2. Total Amount Spent */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700, textTransform: "uppercase" }}>
                    Total Amount Spent
                  </small>
                  <strong style={{ fontSize: "18px", color: "#166534", fontWeight: 800, display: "block", marginTop: "2px" }}>
                    ₹{(stats.totalAmountSpent || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </strong>
                  <span style={{ fontSize: "10px", color: "#786556" }}>
                    Eligible settled payments
                  </span>
                </div>

                {/* 3. Previous Visit */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700, textTransform: "uppercase" }}>
                    Previous Visit
                  </small>
                  <strong
                    style={{
                      fontSize: "13px",
                      color: stats.previousVisit === "No previous visits" ? "#6b7280" : "#1c1109",
                      fontWeight: 750,
                      display: "block",
                      marginTop: "4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {stats.previousVisit || "No previous visits"}
                  </strong>
                  <span style={{ fontSize: "10px", color: "#786556" }}>
                    Latest completed checkout
                  </span>
                </div>

                {/* 4. Last Booking */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700, textTransform: "uppercase" }}>
                    Last Booking
                  </small>
                  <strong
                    style={{
                      fontSize: "13px",
                      color: stats.lastBooking === "No bookings found" ? "#6b7280" : "#1c1109",
                      fontWeight: 750,
                      display: "block",
                      marginTop: "4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {stats.lastBooking || "No bookings found"}
                  </strong>
                  <span style={{ fontSize: "10px", color: "#786556" }}>
                    Most recent reservation
                  </span>
                </div>
              </div>

              {/* Edit Mode Toggle / Form */}
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    width: "100%",
                    height: "38px",
                    background: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 750,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  <Edit2 size={14} />
                  <span>Edit Profile Details</span>
                  <ChevronRight size={15} style={{ marginLeft: "4px" }} />
                </button>
              ) : (
                <form onSubmit={handleSave} style={{ background: "#ffffff", padding: "14px", borderRadius: "12px", border: "1.5px solid #fed7aa" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "10px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "8px",
                          border: "1.5px solid #fed7aa",
                          background: "#ffffff",
                          fontSize: "12.5px",
                          color: "#1a100b",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Mobile Number *
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "8px",
                          border: "1.5px solid #fed7aa",
                          background: "#ffffff",
                          fontSize: "12.5px",
                          color: "#1a100b",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "8px",
                          border: "1.5px solid #fed7aa",
                          background: "#ffffff",
                          fontSize: "12.5px",
                          color: "#1a100b",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        height: "36px",
                        background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Save size={14} /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      style={{
                        flex: 1,
                        height: "36px",
                        background: "#f3f4f6",
                        color: "#4b5563",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── TAB 2: BOOKING HISTORY ──────────────────────────── */}
          {activeTab === "bookings" && (
            <div>
              {recentBookings.length === 0 ? (
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.88)",
                    border: "1.5px dashed rgba(245, 158, 11, 0.4)",
                    borderRadius: "14px",
                    padding: "36px 20px",
                    textAlign: "center",
                  }}
                >
                  <CalendarDays size={38} color="#ea580c" style={{ margin: "0 auto 10px" }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1c1109", margin: "0 0 6px" }}>
                    Welcome! You haven't completed any stays with us yet.
                  </h3>
                  <p style={{ fontSize: "12.5px", color: "#786556", margin: "0 0 16px" }}>
                    No bookings found for your customer account. All upcoming and past reservations will appear here.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("/reserve")}
                    style={{
                      background: "linear-gradient(135deg, #f97316, #ea580c)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 20px",
                      fontSize: "13px",
                      fontWeight: 750,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(234, 88, 12, 0.35)",
                    }}
                  >
                    Book a Table Now
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recentBookings.map((b) => (
                    <div
                      key={b.reservationId}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #fed7aa",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "13px", color: "#ea580c" }}>{b.reservationNumber}</strong>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "6px",
                              background: b.status === "COMPLETED" ? "#dcfce7" : b.status === "CONFIRMED" ? "#ffedd5" : "#f1f5f9",
                              color: b.status === "COMPLETED" ? "#166534" : b.status === "CONFIRMED" ? "#9a3412" : "#475569",
                            }}
                          >
                            {b.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#6b5d52", marginTop: "3px" }}>
                          Date: {new Date(b.reservationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • Time: {b.reservationTime} • Guests: {b.guestsCount}
                          {b.tableName ? ` • ${b.tableName}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13px", fontWeight: 800, color: "#1c1109" }}>
                          ₹{(b.totalAmount || 0).toLocaleString("en-IN")}
                        </div>
                        <small style={{ fontSize: "10.5px", color: b.paymentStatus === "PAID" ? "#16a34a" : "#ea580c", fontWeight: 700 }}>
                          {b.paymentStatus || "UNPAID"}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: VISIT HISTORY ────────────────────────────── */}
          {activeTab === "visits" && (
            <div>
              {visitHistory.length === 0 ? (
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.88)",
                    border: "1.5px dashed rgba(245, 158, 11, 0.4)",
                    borderRadius: "14px",
                    padding: "36px 20px",
                    textAlign: "center",
                  }}
                >
                  <History size={38} color="#ea580c" style={{ margin: "0 auto 10px" }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1c1109", margin: "0 0 6px" }}>
                    No previous visits
                  </h3>
                  <p style={{ fontSize: "12.5px", color: "#786556", margin: "0 0 16px" }}>
                    You have no completed hotel stays or visits yet. Once a booking is completed or checked out, your stay records will appear here.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("/reserve")}
                    style={{
                      background: "linear-gradient(135deg, #f97316, #ea580c)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 20px",
                      fontSize: "13px",
                      fontWeight: 750,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(234, 88, 12, 0.35)",
                    }}
                  >
                    Plan Your First Visit
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {visitHistory.map((v) => (
                    <div
                      key={v.visitId}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #bbf7d0",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "13px", color: "#166534" }}>{v.visitNumber}</strong>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "6px",
                              background: "#dcfce7",
                              color: "#166534",
                            }}
                          >
                            COMPLETED STAY
                          </span>
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#6b5d52", marginTop: "3px" }}>
                          Visit Date: {new Date(v.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • {v.details}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13px", fontWeight: 800, color: "#166534" }}>
                          ₹{(v.amountSpent || 0).toLocaleString("en-IN")}
                        </div>
                        <small style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: 700 }}>
                          Eligible Spent
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CustomerProfilePage;
