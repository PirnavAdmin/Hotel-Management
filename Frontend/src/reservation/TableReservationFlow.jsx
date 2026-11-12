import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Phone,
  Mail,
  Edit3,
  Trash2,
  Home,
  Check,
  Compass,
  LayoutGrid,
  Info,
} from "lucide-react";
import {
  getStoredReservations,
  saveStoredReservations,
  getStoredReservationTables,
  saveStoredReservationTables,
} from "../api/reservationApi";
import { CustomerProfileDropdown } from "../customer/CustomerProfileDropdown";
import "./TableReservationFlow.css";

export function TableReservationFlow({
  onBackToPos,
  backLabel = "Back to Home",
  initialStep = 1,
  customerUser,
  onLogout,
  onAdminLogin,
  onHotelLogin,
  onNavigate,
  onOpenProfile,
  onOpenOrders,
}) {
  // Navigation: step 1 to 9, or "overview" for the 9-screen poster
  const [currentStep, setCurrentStep] = useState(initialStep || 1);
  const [viewMode, setViewMode] = useState("interactive"); // "interactive" | "poster"
  const [toast, setToast] = useState(null);

  // Standalone profile & orders modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [profileUserData, setProfileUserData] = useState(() => ({
    name: customerUser?.name || "Priya Sharma",
    phone: customerUser?.phone || "+91 98765 43210",
    email: customerUser?.email || "priya@example.com",
  }));

  useEffect(() => {
    if (customerUser) {
      setProfileUserData({
        name: customerUser.name || "Priya Sharma",
        phone: customerUser.phone || "+91 98765 43210",
        email: customerUser.email || "priya@example.com",
      });
    }
  }, [customerUser]);

  const handleDropdownNavigate = (route) => {
    // When "My Reservations" is clicked, display Step 6 (1st image: My Reservations)
    if (route === "/my-reservations" || route === "my-reservations" || route === "reservation") {
      setCurrentStep(6);
      setViewMode("interactive");
      setShowProfileModal(false);
      setShowOrdersModal(false);
      return;
    }

    if (onNavigate) {
      onNavigate(route);
      return;
    }

    if (route === "/profile" || route === "profile") {
      if (onOpenProfile) {
        onOpenProfile();
      } else {
        setShowProfileModal(true);
      }
    } else if (route === "/my-orders" || route === "my-orders" || route === "orders") {
      if (onOpenOrders) {
        onOpenOrders();
      } else {
        setShowOrdersModal(true);
      }
    }
  };

  const handleDropdownLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("bhanu_customer_session");
      localStorage.removeItem("customer_session");
      if (onBackToPos) {
        onBackToPos();
      } else {
        window.location.reload();
      }
    }
  };

  useEffect(() => {
    if (initialStep) setCurrentStep(initialStep);
  }, [initialStep]);

  // Reservations & Tables state from localStorage
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);

  // Active reservation booking state
  const [bookingForm, setBookingForm] = useState({
    date: "2026-11-11",
    time: "07:30 PM",
    guests: 2,
    tablePreference: "Indoor",
    fullName: customerUser?.name || "Priya Sharma",
    mobileNumber: customerUser?.phone
      ? customerUser.phone.replace(/\D/g, "").slice(-10)
      : "9876543210",
    email: customerUser?.email || "priya@example.com",
    specialRequests: "Anniversary celebration, window table preference.",
  });

  useEffect(() => {
    if (customerUser) {
      setBookingForm((prev) => ({
        ...prev,
        fullName: customerUser.name || prev.fullName,
        mobileNumber: customerUser.phone
          ? customerUser.phone.replace(/\D/g, "").slice(-10)
          : prev.mobileNumber,
        email: customerUser.email || prev.email,
      }));
    }
  }, [customerUser]);

  const [selectedTable, setSelectedTable] = useState(null);
  const [tableFilter, setTableFilter] = useState("all"); // "all" | "indoor" | "outdoor"
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [confirmedReservation, setConfirmedReservation] = useState(null);

  // Reservation management (Step 6, 7, 8)
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" | "past"
  const [selectedResForModify, setSelectedResForModify] = useState(null);
  const [selectedResForCancel, setSelectedResForCancel] = useState(null);
  const [cancelledResInfo, setCancelledResInfo] = useState(null);

  // Form errors
  const [formErrors, setFormErrors] = useState({});

  // Load from localStorage on mount
  useEffect(() => {
    const loadedRes = getStoredReservations();
    const loadedTables = getStoredReservationTables();
    setReservations(loadedRes);
    setTables(loadedTables);
    // Pre-select T-03 by default
    const defaultTable =
      loadedTables.find((t) => t.id === "T-03") || loadedTables[0];
    setSelectedTable(defaultTable);
  }, []);

  // Show Toast
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Step 4 simulated payment processing
  useEffect(() => {
    let timer;
    if (currentStep === 4) {
      timer = setTimeout(() => {
        // Complete payment & create reservation in frontend state
        const nextId = `RES-${1020 + reservations.length + 1}`;
        const newRes = {
          id: nextId,
          reservationId: nextId,
          customerName: bookingForm.fullName,
          phone: bookingForm.mobileNumber,
          email: bookingForm.email,
          guests: bookingForm.guests,
          date: bookingForm.date,
          time: bookingForm.time,
          tableId: selectedTable?.id || "T-03",
          tableName: `${selectedTable?.name || "T-03"} (${selectedTable?.section || "Indoor"})`,
          section: selectedTable?.section || "Indoor",
          specialRequests: bookingForm.specialRequests,
          estimatedAmount: 2000,
          advanceAmount: 100,
          paymentMethod:
            paymentMethod === "upi"
              ? "UPI (Google Pay)"
              : paymentMethod === "card"
                ? "Credit/Debit Card"
                : paymentMethod === "netbanking"
                  ? "Net Banking"
                  : "Wallet",
          status: "confirmed",
          createdAt: new Date().toISOString(),
        };

        const updated = [newRes, ...reservations];
        setReservations(updated);
        saveStoredReservations(updated);

        // Update table to reserved
        const updatedTables = tables.map((t) =>
          t.id === newRes.tableId ? { ...t, status: "reserved" } : t,
        );
        setTables(updatedTables);
        saveStoredReservationTables(updatedTables);

        setConfirmedReservation(newRes);
        setCurrentStep(5);
        showToast(`Table reserved successfully! ID: ${newRes.id}`, "success");
      }, 1800);
    }
    return () => clearTimeout(timer);
  }, [
    currentStep,
    reservations,
    bookingForm,
    selectedTable,
    paymentMethod,
    tables,
  ]);

  // Validation for Step 1
  const validateStep1 = () => {
    const errors = {};
    if (!bookingForm.date) errors.date = "Please select date";
    if (!bookingForm.time) errors.time = "Please select time";
    if (!bookingForm.fullName.trim()) errors.fullName = "Full name is required";
    if (!bookingForm.mobileNumber.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else if (
      !/^\+?[0-9]{10,12}$/.test(bookingForm.mobileNumber.replace(/\s+/g, ""))
    ) {
      errors.mobileNumber = "Please enter a valid 10-digit mobile number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
      showToast("Reservation details saved! Choose your table.", "info");
    } else {
      showToast("Please fill in all mandatory fields.", "error");
    }
  };

  // Step 2 Continue to Payment
  const handleStep2Submit = () => {
    if (!selectedTable) {
      showToast("Please select an available table.", "error");
      return;
    }
    if (selectedTable.status === "reserved") {
      showToast(
        "This table is already reserved. Please pick an available table.",
        "error",
      );
      return;
    }
    setCurrentStep(3);
  };

  // Step 7: Update reservation
  const handleUpdateReservation = () => {
    if (!selectedResForModify) return;
    const updated = reservations.map((r) =>
      r.id === selectedResForModify.id ? selectedResForModify : r,
    );
    setReservations(updated);
    saveStoredReservations(updated);
    showToast(
      `Reservation ${selectedResForModify.id} updated successfully!`,
      "success",
    );
    setCurrentStep(6);
  };

  // Step 8: Confirm Cancellation
  const handleConfirmCancellation = () => {
    if (!selectedResForCancel) return;
    const targetId = selectedResForCancel.id;
    const updated = reservations.map((r) =>
      r.id === targetId ? { ...r, status: "cancelled" } : r,
    );
    setReservations(updated);
    saveStoredReservations(updated);

    // Free table
    if (selectedResForCancel.tableId) {
      const updatedTables = tables.map((t) =>
        t.id === selectedResForCancel.tableId
          ? { ...t, status: "available" }
          : t,
      );
      setTables(updatedTables);
      saveStoredReservationTables(updatedTables);
    }

    setCancelledResInfo(selectedResForCancel);
    showToast(
      `Reservation ${targetId} cancelled. Refund of ₹100.00 initiated.`,
      "info",
    );
    setCurrentStep(9);
  };

  // Filter tables
  const filteredTables = tables.filter((t) => {
    if (tableFilter === "indoor") return t.section.toLowerCase() === "indoor";
    if (tableFilter === "outdoor") return t.section.toLowerCase() === "outdoor";
    return true;
  });

  const activeReservationsList = reservations.filter((r) =>
    activeTab === "upcoming"
      ? r.status === "confirmed"
      : r.status !== "confirmed",
  );

  return (
    <div
      className="table-reservation-flow"
      style={{
        minHeight: "100vh",
        backgroundColor: "#0d0604",
        backgroundImage: `radial-gradient(ellipse at 50% 12%, rgba(95, 42, 19, 0.55) 0%, rgba(20, 10, 6, 0.95) 60%, #0a0403 100%), url('/assets/dining-table.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
        color: "#f5ede6",
        padding: "10px 16px 20px",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            background:
              toast.type === "error"
                ? "#dc2626"
                : toast.type === "info"
                  ? "#ea580c"
                  : "#16a34a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 700,
            fontSize: "13.5px",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toast.type === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div
        style={{
          maxWidth: "1480px",
          margin: "0 auto 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 20px",
          minHeight: "52px",
          background: "rgba(23, 11, 7, 0.92)",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          backdropFilter: "blur(14px)",
          borderRadius: "14px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid #fbbf24",
              boxShadow: "0 0 10px rgba(245, 158, 11, 0.35)",
            }}
          >
            <Compass size={20} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: "16px",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: "1.1",
              }}
            >
              Bhanu Bistro
            </div>
            <div
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                color: "#f59e0b",
                fontWeight: 700,
              }}
            >
              Fine Dining & Takeaway
            </div>
          </div>
        </div>

{/* Action Controls (Profile Pill & Dropdown matching Screenshot 2) */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {(onHotelLogin || onAdminLogin) && (
            <button
              onClick={() => {
                if (onHotelLogin) onHotelLogin();
                else if (onAdminLogin) onAdminLogin();
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#f5ede6",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hotel Login
            </button>
          )}
          {onBackToPos && (
            <button
              type="button"
              onClick={onBackToPos}
              title={backLabel}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f5ede6",
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              <ArrowLeft size={13} />
              <span>{backLabel}</span>
            </button>
          )}

          <CustomerProfileDropdown
            customerUser={{
              name: profileUserData.name || customerUser?.name || bookingForm.fullName || "Priya Sharma",
              phone: profileUserData.phone || customerUser?.phone || (bookingForm.mobileNumber ? `+91 ${bookingForm.mobileNumber}` : "+91 98765 43210"),
              email: profileUserData.email || customerUser?.email || bookingForm.email || "priya@example.com",
            }}
            onNavigate={handleDropdownNavigate}
            onLogout={handleDropdownLogout}
            currentRoute={currentStep === 6 ? "/my-reservations" : ""}
          />
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        {viewMode === "interactive" ? (
          /* ======================================================= */
          /* INTERACTIVE STEP CONTAINER                              */
          /* ======================================================= */
          <div
            style={{
              maxWidth:
                currentStep === 1
                  ? "1180px"
                  : currentStep === 2 || currentStep === 3 || currentStep === 6
                    ? "1060px"
                    : "680px",
              margin: "0 auto",
            }}
          >
            {/* STEP 1: Book a Table */}
            {currentStep === 1 && (
              <Step1BookTable
                form={bookingForm}
                setForm={setBookingForm}
                errors={formErrors}
                onSubmit={handleStep1Submit}
              />
            )}

            {/* STEP 2: Select Your Table */}
            {currentStep === 2 && (
              <Step2SelectTable
                bookingForm={bookingForm}
                tables={filteredTables}
                selectedTable={selectedTable}
                onSelectTable={setSelectedTable}
                tableFilter={tableFilter}
                setTableFilter={setTableFilter}
                onBack={() => setCurrentStep(1)}
                onContinue={handleStep2Submit}
              />
            )}

            {/* STEP 3: Payment */}
            {currentStep === 3 && (
              <Step3Payment
                bookingForm={bookingForm}
                selectedTable={selectedTable}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                onBack={() => setCurrentStep(2)}
                onPayNow={() => setCurrentStep(4)}
              />
            )}

            {/* STEP 4: Payment Processing */}
            {currentStep === 4 && <Step4PaymentProcessing />}

            {/* STEP 5: Reservation Confirmed */}
            {currentStep === 5 && (
              <Step5ReservationConfirmed
                reservation={confirmedReservation || reservations[0]}
                onViewReservation={() => setCurrentStep(6)}
                onBackToHome={() => {
                  setCurrentStep(1);
                  setBookingForm({
                    date: "2026-11-11",
                    time: "07:30 PM",
                    guests: 2,
                    tablePreference: "Indoor",
                    fullName: "",
                    mobileNumber: "",
                    email: "",
                    specialRequests: "",
                  });
                }}
              />
            )}

            {/* STEP 6: My Reservations */}
            {currentStep === 6 && (
              <Step6MyReservations
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                reservations={activeReservationsList}
                allReservationsCount={reservations.length}
                upcomingCount={
                  reservations.filter((r) => r.status === "confirmed").length
                }
                pastCount={
                  reservations.filter((r) => r.status !== "confirmed").length
                }
                onModify={(res) => {
                  setSelectedResForModify(res);
                  setCurrentStep(7);
                }}
                onCancel={(res) => {
                  setSelectedResForCancel(res);
                  setCurrentStep(8);
                }}
                onNewBooking={() => setCurrentStep(1)}
              />
            )}

            {/* STEP 7: Modify Reservation */}
            {currentStep === 7 && (
              <Step7ModifyReservation
                reservation={selectedResForModify || reservations[0]}
                setReservation={setSelectedResForModify}
                tables={tables}
                onCancel={() => setCurrentStep(6)}
                onSave={handleUpdateReservation}
              />
            )}

            {/* STEP 8: Cancel Reservation */}
            {currentStep === 8 && (
              <Step8CancelReservation
                reservation={selectedResForCancel || reservations[0]}
                onKeep={() => setCurrentStep(6)}
                onConfirm={handleConfirmCancellation}
              />
            )}

            {/* STEP 9: Cancellation Confirmed */}
            {currentStep === 9 && (
              <Step9CancellationConfirmed
                reservation={cancelledResInfo || reservations[0]}
                onBackToReservations={() => setCurrentStep(6)}
              />
            )}
          </div>
        ) : (
          /* ======================================================= */
          /* 9-SCREEN VISUAL POSTER (Reference Design Presentation)   */
          /* ======================================================= */
          <ReservationFlowPoster
            bookingForm={bookingForm}
            selectedTable={selectedTable}
            reservations={reservations}
            onSelectStep={(step) => {
              setCurrentStep(step);
              setViewMode("interactive");
            }}
          />
        )}
      </div>

      {/* ── Standalone Customer Profile Modal Fallback ── */}
      {showProfileModal && (
        <div
          className="customer-profile-modal-overlay"
          onClick={() => setShowProfileModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="customer-profile-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "#ffffff",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
              color: "#1a100b",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1a100b" }}>
                Customer Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#665449" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", padding: "12px", background: "#faf7f4", borderRadius: "12px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "20px", fontWeight: 800 }}>
                {(profileUserData.name || "P")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "#1a100b" }}>{profileUserData.name}</div>
                <div style={{ fontSize: "13px", color: "#6f6158" }}>{profileUserData.phone}</div>
                <div style={{ fontSize: "12px", color: "#ea580c" }}>{profileUserData.email}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>Full Name</label>
                <input
                  type="text"
                  value={profileUserData.name}
                  onChange={(e) => setProfileUserData((p) => ({ ...p, name: e.target.value }))}
                  style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #e0d4cc", background: "#faf7f4", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>Mobile Number</label>
                <input
                  type="text"
                  value={profileUserData.phone}
                  onChange={(e) => setProfileUserData((p) => ({ ...p, phone: e.target.value }))}
                  style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #e0d4cc", background: "#faf7f4", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>Email Address</label>
                <input
                  type="text"
                  value={profileUserData.email}
                  onChange={(e) => setProfileUserData((p) => ({ ...p, email: e.target.value }))}
                  style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #e0d4cc", background: "#faf7f4", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem("bhanu_customer_session", JSON.stringify(profileUserData));
                    setBookingForm((prev) => ({
                      ...prev,
                      fullName: profileUserData.name,
                      mobileNumber: profileUserData.phone.replace(/\D/g, "").slice(-10),
                      email: profileUserData.email,
                    }));
                  } catch (e) {}
                  setShowProfileModal(false);
                  showToast("Profile updated successfully!", "success");
                }}
                style={{ flex: 1, height: "42px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Standalone Customer Orders Modal Fallback ── */}
      {showOrdersModal && (
        <div
          className="customer-profile-modal-overlay"
          onClick={() => setShowOrdersModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="customer-profile-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#ffffff",
              borderRadius: "18px",
              padding: "26px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
              color: "#1a100b",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>📋</span>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#1a100b" }}>
                  My Orders
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOrdersModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#665449" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "360px", overflowY: "auto" }}>
              <div style={{ padding: "14px", border: "1px solid #fed7aa", borderRadius: "12px", background: "#fffaf5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 800, color: "#ea580c" }}>ORD-9421</span>
                  <span style={{ fontSize: "12px", background: "#ffedd5", color: "#c2410c", padding: "2px 8px", borderRadius: "12px", fontWeight: 700 }}>
                    Preparing
                  </span>
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#292524" }}>
                  Hyderabadi Chicken Dum Biryani x 1, Crispy Corn x 1
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#78716c", marginTop: "8px" }}>
                  <span>Pickup: Today at 08:15 PM</span>
                  <span style={{ fontWeight: 800, color: "#1c1917" }}>Total: ₹580.00</span>
                </div>
              </div>

              <div style={{ padding: "14px", border: "1px solid #e7e5e4", borderRadius: "12px", background: "#fafaf9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 800, color: "#57534e" }}>ORD-8812</span>
                  <span style={{ fontSize: "12px", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontWeight: 700 }}>
                    Completed
                  </span>
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#292524" }}>
                  Paneer Butter Masala x 1, Butter Naan x 2
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#78716c", marginTop: "8px" }}>
                  <span>2026-11-09 at 07:30 PM</span>
                  <span style={{ fontWeight: 800, color: "#1c1917" }}>Total: ₹450.00</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setShowOrdersModal(false)}
                style={{ width: "100%", height: "40px", background: "#f4eee7", color: "#4a3b32", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
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

/* ===================================================================== */
/* STEP 1: BOOK A TABLE                                                  */
/* ===================================================================== */
function Step1BookTable({ form, setForm, errors, onSubmit }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "24px",
        alignItems: "center",
      }}
    >
      {/* Left Column: Hero branding, Ambiance & 3 Perks */}
      <div style={{ color: "#f5ede6" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#f59e0b",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px",
            background: "rgba(245, 158, 11, 0.12)",
            padding: "4px 10px",
            borderRadius: "16px",
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          <Calendar size={14} color="#f59e0b" /> Table Reservation
        </div>

        <h1
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: "28px",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 6px",
            lineHeight: 1.15,
            letterSpacing: "0.5px",
          }}
        >
          Reserve <span style={{ color: "#f59e0b" }}>Your Table</span>
        </h1>

        <p
          style={{
            fontSize: "12.5px",
            color: "#d4c5b9",
            lineHeight: 1.45,
            marginBottom: "12px",
            maxWidth: "440px",
          }}
        >
          Book a table in advance and enjoy a great dining experience at Bhanu
          Bistro.
        </p>

        {/* Dining Table Ambiance Preview */}
        <div
          style={{
            width: "100%",
            height: "115px",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "12px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            position: "relative",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80"
            alt="Fine Dining Ambiance at Bhanu Bistro"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(10,4,3,0.85) 0%, rgba(10,4,3,0.2) 60%, transparent 100%)",
            }}
          />
        </div>

        {/* 3 Perks */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(245, 158, 11, 0.22)",
              borderRadius: "8px",
              padding: "8px 4px",
              backdropFilter: "blur(6px)",
            }}
          >
            <CheckCircle2
              size={16}
              color="#f59e0b"
              style={{ margin: "0 auto 4px" }}
            />
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.25,
              }}
            >
              Confirmed<br />Reservation
            </div>
          </div>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(245, 158, 11, 0.22)",
              borderRadius: "8px",
              padding: "8px 4px",
              backdropFilter: "blur(6px)",
            }}
          >
            <Users size={16} color="#f59e0b" style={{ margin: "0 auto 4px" }} />
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.25,
              }}
            >
              Perfect For<br />Groups
            </div>
          </div>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(245, 158, 11, 0.22)",
              borderRadius: "8px",
              padding: "8px 4px",
              backdropFilter: "blur(6px)",
            }}
          >
            <Sparkles
              size={16}
              color="#f59e0b"
              style={{ margin: "0 auto 4px" }}
            />
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.25,
              }}
            >
              Fine Dining<br />Experience
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: White Content Card */}
      <div
        style={{
          background: "#ffffff",
          color: "#1f1610",
          borderRadius: "14px",
          padding: "16px 20px",
          boxShadow: "0 14px 35px rgba(0,0,0,0.45)",
          border: "1px solid #e8ded6",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <Calendar size={18} color="#ea580c" />
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 800,
              margin: 0,
              color: "#1f1610",
            }}
          >
            Book a Table
          </h2>
        </div>

        <form onSubmit={onSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            {/* Date */}
            <div>
              <label
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#4b3f36",
                  display: "block",
                  marginBottom: "3px",
                }}
              >
                Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 8px",
                  border: errors.date
                    ? "1px solid #dc2626"
                    : "1px solid #d4c8bd",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  background: "#faf7f2",
                  color: "#1f1610",
                  colorScheme: "light",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {errors.date && (
                <span style={{ color: "#dc2626", fontSize: "9px" }}>
                  {errors.date}
                </span>
              )}
            </div>

            {/* Time */}
            <div>
              <label
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#4b3f36",
                  display: "block",
                  marginBottom: "3px",
                }}
              >
                Time *
              </label>
              <select
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 8px",
                  border: errors.time
                    ? "1px solid #dc2626"
                    : "1px solid #d4c8bd",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  background: "#faf7f2",
                  color: "#1f1610",
                  colorScheme: "light",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="12:30 PM">12:30 PM (Lunch)</option>
                <option value="01:00 PM">01:00 PM (Lunch)</option>
                <option value="01:30 PM">01:30 PM (Lunch)</option>
                <option value="07:00 PM">07:00 PM (Dinner)</option>
                <option value="07:30 PM">07:30 PM (Dinner)</option>
                <option value="08:00 PM">08:00 PM (Dinner)</option>
                <option value="08:30 PM">08:30 PM (Dinner)</option>
                <option value="09:00 PM">09:00 PM (Dinner)</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            {/* Guests count */}
            <div>
              <label
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#4b3f36",
                  display: "block",
                  marginBottom: "3px",
                }}
              >
                Guests *
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid #d4c8bd",
                  borderRadius: "6px",
                  background: "#faf7f2",
                  padding: "2px 6px",
                  height: "32px",
                  boxSizing: "border-box",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, guests: Math.max(1, form.guests - 1) })
                  }
                  style={{
                    width: "22px",
                    height: "22px",
                    border: "none",
                    background: "#eee4da",
                    color: "#1f1610",
                    borderRadius: "4px",
                    fontWeight: 800,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  -
                </button>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    color: "#1f1610",
                  }}
                >
                  <Users size={13} color="#ea580c" />
                  <span style={{ color: "#1f1610" }}>{form.guests} Guests</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, guests: form.guests + 1 })}
                  style={{
                    width: "22px",
                    height: "22px",
                    border: "none",
                    background: "#eee4da",
                    color: "#1f1610",
                    borderRadius: "4px",
                    fontWeight: 800,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Table Preference */}
            <div>
              <label
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#4b3f36",
                  display: "block",
                  marginBottom: "3px",
                }}
              >
                Table Preference (Optional)
              </label>
              <select
                value={form.tablePreference}
                onChange={(e) =>
                  setForm({ ...form, tablePreference: e.target.value })
                }
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 8px",
                  border: "1px solid #d4c8bd",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  background: "#faf7f2",
                  color: "#1f1610",
                  colorScheme: "light",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="Indoor">Indoor (Air Conditioned)</option>
                <option value="Outdoor">Outdoor / Courtyard</option>
                <option value="Garden Area">Garden Area</option>
                <option value="Window Side">Window Side Table</option>
                <option value="Family Section">Family Section</option>
              </select>
            </div>
          </div>

          {/* Name and Mobile */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#4b3f36",
                  display: "block",
                  marginBottom: "3px",
                }}
              >
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Priya Sharma"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 8px",
                  border: errors.fullName
                    ? "1px solid #dc2626"
                    : "1px solid #d4c8bd",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  background: "#faf7f2",
                  color: "#1f1610",
                  colorScheme: "light",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {errors.fullName && (
                <span style={{ color: "#dc2626", fontSize: "9px" }}>
                  {errors.fullName}
                </span>
              )}
            </div>

            <div>
              <label
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#4b3f36",
                  display: "block",
                  marginBottom: "3px",
                }}
              >
                Mobile Number *
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={form.mobileNumber}
                onChange={(e) =>
                  setForm({ ...form, mobileNumber: e.target.value })
                }
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 8px",
                  border: errors.mobileNumber
                    ? "1px solid #dc2626"
                    : "1px solid #d4c8bd",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  background: "#faf7f2",
                  color: "#1f1610",
                  colorScheme: "light",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {errors.mobileNumber && (
                <span style={{ color: "#dc2626", fontSize: "9px" }}>
                  {errors.mobileNumber}
                </span>
              )}
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#4b3f36",
                display: "block",
                marginBottom: "3px",
              }}
            >
              Email (Optional)
            </label>
            <input
              type="email"
              placeholder="e.g. priya@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{
                width: "100%",
                height: "32px",
                padding: "0 8px",
                border: "1px solid #d4c8bd",
                borderRadius: "6px",
                fontSize: "11.5px",
                background: "#faf7f2",
                color: "#1f1610",
                colorScheme: "light",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Special Requests */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#4b3f36",
                display: "block",
                marginBottom: "3px",
              }}
            >
              Special Requests (Optional)
            </label>
            <input
              type="text"
              placeholder="Birthday celebration, window table preference, etc."
              value={form.specialRequests}
              onChange={(e) =>
                setForm({ ...form, specialRequests: e.target.value })
              }
              style={{
                width: "100%",
                height: "32px",
                padding: "0 8px",
                border: "1px solid #d4c8bd",
                borderRadius: "6px",
                fontSize: "11.5px",
                background: "#faf7f2",
                color: "#1f1610",
                colorScheme: "light",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            style={{
              width: "100%",
              height: "36px",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.4)",
            }}
          >
            <Calendar size={15} />
            Book Table
          </button>
        </form>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* STEP 2: SELECT YOUR TABLE                                             */
/* ===================================================================== */
function Step2SelectTable({
  bookingForm,
  tables,
  selectedTable,
  onSelectTable,
  tableFilter,
  setTableFilter,
  onBack,
  onContinue,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1f1610",
        borderRadius: "18px",
        padding: "26px 30px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        border: "1px solid #e8ded6",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={20} color="#ea580c" />
            <h2
              style={{
                fontSize: "19px",
                fontWeight: 800,
                margin: 0,
                color: "#1f1610",
              }}
            >
              Select Your Table
            </h2>
          </div>
          <p style={{ fontSize: "12px", color: "#6b5d52", margin: "4px 0 0" }}>
            Choose from available tables for <strong>{bookingForm.date}</strong>{" "}
            at <strong>{bookingForm.time}</strong> ({bookingForm.guests} Guests)
          </p>
        </div>

        {/* Section Filters */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "all", label: "All Tables" },
            { id: "indoor", label: "Indoor" },
            { id: "outdoor", label: "Outdoor" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTableFilter(f.id)}
              style={{
                background: tableFilter === f.id ? "#ea580c" : "#f4eee7",
                color: tableFilter === f.id ? "#fff" : "#4b3f36",
                border: "none",
                borderRadius: "16px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "14px",
          margin: "20px 0 24px",
        }}
      >
        {tables.map((table) => {
          const isSelected = selectedTable?.id === table.id;
          const isReserved = table.status === "reserved";

          return (
            <div
              key={table.id}
              onClick={() => {
                if (!isReserved) onSelectTable(table);
              }}
              style={{
                border: isSelected
                  ? "2px solid #ea580c"
                  : isReserved
                    ? "1px solid #e5ded5"
                    : "1px solid #d4c8bd",
                background: isSelected
                  ? "#fff8f3"
                  : isReserved
                    ? "#f9f7f4"
                    : "#ffffff",
                borderRadius: "12px",
                padding: "16px 14px",
                cursor: isReserved ? "not-allowed" : "pointer",
                opacity: isReserved ? 0.65 : 1,
                position: "relative",
                boxShadow: isSelected
                  ? "0 6px 18px rgba(234, 88, 12, 0.25)"
                  : "0 2px 6px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
            >
              {/* Checkmark when selected */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ea580c",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </div>
              )}

              <div
                style={{ fontSize: "16px", fontWeight: 800, color: "#1f1610" }}
              >
                {table.name}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b5d52",
                  margin: "2px 0 6px",
                }}
              >
                {table.capacity} Guests • {table.section}
              </div>

              {/* Status Badge */}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: isReserved ? "#fee2e2" : "#dcfce7",
                  color: isReserved ? "#dc2626" : "#166534",
                  display: "inline-block",
                }}
              >
                {isReserved ? "Reserved" : "Available"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "#ffffff",
            border: "1px solid #d4c8bd",
            color: "#4b3f36",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <button
          type="button"
          onClick={onContinue}
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(234, 88, 12, 0.4)",
          }}
        >
          Continue to Payment <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* STEP 3: PAYMENT                                                       */
/* ===================================================================== */
function Step3Payment({
  bookingForm,
  selectedTable,
  paymentMethod,
  setPaymentMethod,
  onBack,
  onPayNow,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1f1610",
        borderRadius: "16px",
        padding: "16px 24px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        border: "1px solid #e8ded6",
      }}
    >
      {/* Header with Breadcrumb Stepper */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontSize: "11px",
          fontWeight: 700,
          marginBottom: "12px",
          borderBottom: "1px solid #f2ece6",
          paddingBottom: "8px",
        }}
      >
        <span style={{ color: "#166534" }}>✓ Book a Table</span>
        <span style={{ color: "#c4b5a6" }}>→</span>
        <span style={{ color: "#166534" }}>✓ Select Table</span>
        <span style={{ color: "#c4b5a6" }}>→</span>
        <span
          style={{
            color: "#ea580c",
            background: "#fff5ee",
            padding: "2px 8px",
            borderRadius: "12px",
          }}
        >
          3. Payment
        </span>
        <span style={{ color: "#c4b5a6" }}>→</span>
        <span style={{ color: "#8c7f74" }}>Confirmation</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: "20px",
        }}
      >
        {/* Left: Reservation Details & Advance Breakdown */}
        <div>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 800,
              margin: "0 0 4px",
              color: "#1f1610",
            }}
          >
            Complete Your Booking
          </h3>
          <p style={{ fontSize: "11.5px", color: "#786c62", margin: "0 0 10px" }}>
            Pay a small advance to confirm your table reservation.
          </p>

          <div
            style={{
              background: "#faf7f2",
              border: "1px solid #e7ded4",
              borderRadius: "10px",
              padding: "10px 12px",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "#8c7f74",
                marginBottom: "6px",
              }}
            >
              Reservation Details
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: "#6b5d52" }}>Date:</span>{" "}
                <strong>{bookingForm.date}</strong>
              </div>
              <div>
                <span style={{ color: "#6b5d52" }}>Time:</span>{" "}
                <strong>{bookingForm.time}</strong>
              </div>
              <div>
                <span style={{ color: "#6b5d52" }}>Guests:</span>{" "}
                <strong>{bookingForm.guests} Guests</strong>
              </div>
              <div>
                <span style={{ color: "#6b5d52" }}>Table:</span>{" "}
                <strong style={{ color: "#ea580c" }}>
                  {selectedTable?.name || "T-03"} (
                  {selectedTable?.section || "Indoor"})
                </strong>
              </div>
            </div>
          </div>

          {/* Advance Payment breakdown */}
          <div
            style={{
              background: "#fff9f5",
              border: "1px solid #fed7aa",
              borderRadius: "10px",
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "#ea580c",
                marginBottom: "6px",
              }}
            >
              Advance Payment
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                padding: "2px 0",
                color: "#ea580c",
                fontWeight: 700,
              }}
            >
              <span>Advance (to lock table):</span>
              <span>₹100.00</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13.5px",
                fontWeight: 800,
                borderTop: "1px solid #fed7aa",
                paddingTop: "5px",
                marginTop: "4px",
                color: "#1f1610",
              }}
            >
              <span>Payable Now:</span>
              <span style={{ color: "#ea580c" }}>₹100.00</span>
            </div>
          </div>
        </div>

        {/* Right: Select Payment Method */}
        <div>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 800,
              margin: "0 0 10px",
              color: "#1f1610",
            }}
          >
            Select Payment Method
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginBottom: "10px",
            }}
          >
            {[
              {
                id: "upi",
                title: "UPI (Google Pay, PhonePe, Paytm)",
                desc: "Instant confirmation via UPI QR / VPA",
              },
              {
                id: "card",
                title: "Credit / Debit Card",
                desc: "Visa, Mastercard, RuPay",
              },
              {
                id: "netbanking",
                title: "Net Banking",
                desc: "All Major Indian Banks",
              },
              {
                id: "wallet",
                title: "Wallets",
                desc: "Paytm, Amazon Pay, etc.",
              },
            ].map((m) => (
              <label
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "7px 11px",
                  borderRadius: "9px",
                  border:
                    paymentMethod === m.id
                      ? "1.5px solid #ea580c"
                      : "1px solid #e7ded4",
                  background: paymentMethod === m.id ? "#fff8f3" : "#faf7f2",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === m.id}
                  onChange={() => setPaymentMethod(m.id)}
                  style={{ accentColor: "#ea580c", marginTop: "2px" }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1f1610",
                      lineHeight: 1.25,
                    }}
                  >
                    {m.title}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#786c62", lineHeight: 1.2 }}>
                    {m.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Secure badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10.5px",
              color: "#6b5d52",
              marginBottom: "10px",
            }}
          >
            <ShieldCheck size={14} color="#16a34a" />
            <span>Secure 256-Bit SSL Encrypted Payment Simulation</span>
          </div>

          <button
            type="button"
            onClick={onPayNow}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#ffffff",
              border: "none",
              borderRadius: "9px",
              padding: "10px 0",
              fontSize: "13.5px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.45)",
            }}
          >
            Pay ₹100.00 & Confirm Booking
          </button>

          <div style={{ textAlign: "center", marginTop: "7px" }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                background: "none",
                border: "none",
                fontSize: "11.5px",
                color: "#6b5d52",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              ← Back to Table Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* STEP 4: PAYMENT PROCESSING                                            */
/* ===================================================================== */
function Step4PaymentProcessing() {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1f1610",
        borderRadius: "18px",
        padding: "40px 32px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        border: "1px solid #e8ded6",
        textAlign: "center",
      }}
    >
      {/* Animated icon */}
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "#fff7ed",
          border: "2.5px solid #ea580c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <CreditCard size={30} color="#ea580c" />
      </div>

      <h2
        style={{
          fontSize: "21px",
          fontWeight: 800,
          color: "#1f1610",
          margin: "0 0 6px",
        }}
      >
        Processing Payment...
      </h2>
      <p style={{ fontSize: "13px", color: "#6b5d52", margin: "0 0 24px" }}>
        Please do not close or refresh this window.
      </p>

      {/* 3-Step Process Stepper */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          margin: "20px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#16a34a",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            ✓
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a" }}>
            Initiating
          </span>
        </div>

        <div style={{ width: "40px", height: "2px", background: "#ea580c" }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#ea580c",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 800,
              boxShadow: "0 0 0 4px #fed7aa",
            }}
          >
            ⏳
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#ea580c" }}>
            Processing with Bank
          </span>
        </div>

        <div style={{ width: "40px", height: "2px", background: "#e5ded5" }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#e5ded5",
              color: "#786c62",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            3
          </div>
          <span style={{ fontSize: "11px", color: "#8c7f74" }}>Confirming</span>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* STEP 5: RESERVATION CONFIRMED                                         */
/* ===================================================================== */
function Step5ReservationConfirmed({
  reservation,
  onViewReservation,
  onBackToHome,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1f1610",
        borderRadius: "18px",
        padding: "32px 30px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        border: "1px solid #e8ded6",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#16a34a",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
          fontSize: "28px",
          fontWeight: 800,
          boxShadow: "0 6px 16px rgba(22, 163, 74, 0.35)",
        }}
      >
        ✓
      </div>

      <h2
        style={{
          fontSize: "23px",
          fontWeight: 800,
          color: "#166534",
          margin: "0 0 4px",
        }}
      >
        Reservation Confirmed!
      </h2>
      <p style={{ fontSize: "13px", color: "#6b5d52", margin: "0 0 20px" }}>
        Your table has been successfully reserved at Bhanu Bistro.
      </p>

      {/* Confirmation details grid */}
      <div
        style={{
          background: "#faf7f2",
          border: "1px solid #e7ded4",
          borderRadius: "12px",
          padding: "18px 20px",
          textAlign: "left",
          margin: "0 0 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            borderBottom: "1px dashed #d4c8bd",
            paddingBottom: "8px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b5d52" }}>
            Reservation ID:
          </span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 800,
              color: "#ea580c",
              background: "#ffedd5",
              padding: "2px 10px",
              borderRadius: "6px",
            }}
          >
            {reservation?.id || "RES-1023"}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            fontSize: "13px",
          }}
        >
          <div>
            <span style={{ color: "#6b5d52" }}>Date:</span>{" "}
            <strong>{reservation?.date || "2026-11-11"}</strong>
          </div>
          <div>
            <span style={{ color: "#6b5d52" }}>Time:</span>{" "}
            <strong>{reservation?.time || "07:30 PM"}</strong>
          </div>
          <div>
            <span style={{ color: "#6b5d52" }}>Guests:</span>{" "}
            <strong>{reservation?.guests || 2} Guests</strong>
          </div>
          <div>
            <span style={{ color: "#6b5d52" }}>Table:</span>{" "}
            <strong style={{ color: "#ea580c" }}>
              {reservation?.tableName || "T-03 (Indoor)"}
            </strong>
          </div>
          <div>
            <span style={{ color: "#6b5d52" }}>Customer:</span>{" "}
            <strong>{reservation?.customerName || "Priya Sharma"}</strong>
          </div>
          <div>
            <span style={{ color: "#6b5d52" }}>Phone:</span>{" "}
            <strong>{reservation?.phone || "+91 98765 43210"}</strong>
          </div>
          <div>
            <span style={{ color: "#6b5d52" }}>Advance Paid:</span>{" "}
            <strong style={{ color: "#166534" }}>
              ₹{reservation?.advanceAmount || 100}.00 (UPI ✓)
            </strong>
          </div>
          <div>
            <span style={{ color: "#6b5d52" }}>Status:</span>{" "}
            <span
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "1px 6px",
                borderRadius: "4px",
                fontWeight: 700,
                fontSize: "11px",
              }}
            >
              Confirmed
            </span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <button
          type="button"
          onClick={onViewReservation}
          style={{
            background: "#ffffff",
            border: "1.5px solid #ea580c",
            color: "#ea580c",
            padding: "10px 22px",
            borderRadius: "8px",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          👁️ View Reservation
        </button>

        <button
          type="button"
          onClick={onBackToHome}
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 24px",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(234, 88, 12, 0.4)",
          }}
        >
          <Home size={16} /> Back to Home
        </button>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* STEP 6: MY RESERVATIONS                                               */
/* ===================================================================== */
function Step6MyReservations({
  activeTab,
  setActiveTab,
  reservations,
  allReservationsCount,
  upcomingCount,
  pastCount,
  onModify,
  onCancel,
  onNewBooking,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1f1610",
        borderRadius: "18px",
        padding: "26px 30px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        border: "1px solid #e8ded6",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={20} color="#ea580c" />
            <h2
              style={{
                fontSize: "19px",
                fontWeight: 800,
                margin: 0,
                color: "#1f1610",
              }}
            >
              My Reservations
            </h2>
          </div>
          <p style={{ fontSize: "12px", color: "#6b5d52", margin: "4px 0 0" }}>
            View, manage and track your table reservations at Bhanu Bistro.
          </p>
        </div>

        <button
          onClick={onNewBooking}
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "12.5px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          + Book Another Table
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
        <button
          onClick={() => setActiveTab("upcoming")}
          style={{
            background: activeTab === "upcoming" ? "#ea580c" : "#f4eee7",
            color: activeTab === "upcoming" ? "#ffffff" : "#4b3f36",
            border: "none",
            borderRadius: "20px",
            padding: "6px 18px",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Upcoming ({upcomingCount})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          style={{
            background: activeTab === "past" ? "#ea580c" : "#f4eee7",
            color: activeTab === "past" ? "#ffffff" : "#4b3f36",
            border: "none",
            borderRadius: "20px",
            padding: "6px 18px",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Past / Cancelled ({pastCount})
        </button>
      </div>

      {/* Reservations List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {reservations.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              background: "#faf7f2",
              borderRadius: "12px",
              color: "#8c7f74",
            }}
          >
            <p
              style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 10px" }}
            >
              No {activeTab} reservations found.
            </p>
            <button
              onClick={onNewBooking}
              style={{
                background: "#ea580c",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Book a Table Now
            </button>
          </div>
        ) : (
          reservations.map((res) => (
            <div
              key={res.id}
              style={{
                border: "1px solid #e7ded4",
                borderRadius: "12px",
                background: "#ffffff",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "18px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                flexWrap: "wrap",
              }}
            >
              {/* Photo */}
              <div
                style={{
                  position: "relative",
                  width: "110px",
                  height: "80px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <img
                  src="/assets/dining-table.jpg"
                  alt="Dining Table"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: "4px",
                    left: "4px",
                    background: "rgba(0,0,0,0.75)",
                    color: "#fff",
                    fontSize: "9.5px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontWeight: 700,
                  }}
                >
                  {res.id}
                </span>
              </div>

              {/* Details */}
              <div style={{ flexGrow: 1, minWidth: "200px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#1f1610",
                    }}
                  >
                    Table {res.tableName}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background:
                        res.status === "confirmed" ? "#dcfce7" : "#fee2e2",
                      color: res.status === "confirmed" ? "#166534" : "#dc2626",
                    }}
                  >
                    {res.status === "confirmed" ? "✓ Confirmed" : "Cancelled"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                    fontSize: "12px",
                    color: "#5d5046",
                  }}
                >
                  <div>
                    📅 {res.date} at {res.time}
                  </div>
                  <div>👥 {res.guests} Guests</div>
                  <div>
                    👤 {res.customerName} ({res.phone})
                  </div>
                  <div>💰 Paid Advance: ₹{res.advanceAmount || 100}.00</div>
                </div>
              </div>

              {/* Action buttons */}
              {res.status === "confirmed" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={() => onModify(res)}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #ea580c",
                      color: "#ea580c",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Edit3 size={13} /> Modify
                  </button>

                  <button
                    onClick={() => onCancel(res)}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #dc2626",
                      color: "#dc2626",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <X size={13} /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ===================================================================== */
/* STEP 7: MODIFY RESERVATION                                            */
/* ===================================================================== */
function Step7ModifyReservation({
  reservation,
  setReservation,
  tables,
  onCancel,
  onSave,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1f1610",
        borderRadius: "18px",
        padding: "28px 32px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        border: "1px solid #e8ded6",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "6px",
        }}
      >
        <Calendar size={22} color="#ea580c" />
        <h2
          style={{
            fontSize: "19px",
            fontWeight: 800,
            margin: 0,
            color: "#1f1610",
          }}
        >
          Modify Reservation
        </h2>
      </div>
      <p style={{ fontSize: "12px", color: "#6b5d52", margin: "0 0 20px" }}>
        Update your reservation details for ID:{" "}
        <strong>{reservation?.id}</strong>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#4b3f36",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Date *
          </label>
          <input
            type="date"
            value={reservation?.date || ""}
            onChange={(e) =>
              setReservation({ ...reservation, date: e.target.value })
            }
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d4c8bd",
              borderRadius: "8px",
              fontSize: "13px",
              background: "#faf7f2",
              color: "#1f1610",
              colorScheme: "light",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#4b3f36",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Time *
          </label>
          <select
            value={reservation?.time || "07:30 PM"}
            onChange={(e) =>
              setReservation({ ...reservation, time: e.target.value })
            }
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d4c8bd",
              borderRadius: "8px",
              fontSize: "13px",
              background: "#faf7f2",
              color: "#1f1610",
              colorScheme: "light",
              outline: "none",
            }}
          >
            <option value="12:30 PM">12:30 PM</option>
            <option value="01:00 PM">01:00 PM</option>
            <option value="07:00 PM">07:00 PM</option>
            <option value="07:30 PM">07:30 PM</option>
            <option value="08:00 PM">08:00 PM</option>
            <option value="08:30 PM">08:30 PM</option>
            <option value="09:00 PM">09:00 PM</option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#4b3f36",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Guests *
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #d4c8bd",
              borderRadius: "8px",
              background: "#faf7f2",
              padding: "4px 8px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setReservation({
                  ...reservation,
                  guests: Math.max(1, (reservation.guests || 2) - 1),
                })
              }
              style={{
                width: "28px",
                height: "28px",
                border: "none",
                background: "#eee4da",
                color: "#1f1610",
                borderRadius: "6px",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              -
            </button>
            <span
              style={{ fontWeight: 700, fontSize: "13px", color: "#1f1610" }}
            >
              {reservation?.guests || 2} Guests
            </span>
            <button
              type="button"
              onClick={() =>
                setReservation({
                  ...reservation,
                  guests: (reservation.guests || 2) + 1,
                })
              }
              style={{
                width: "28px",
                height: "28px",
                border: "none",
                background: "#eee4da",
                color: "#1f1610",
                borderRadius: "6px",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#4b3f36",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Table Assignment
          </label>
          <select
            value={reservation?.tableId || "T-03"}
            onChange={(e) => {
              const matched = tables.find((t) => t.id === e.target.value);
              setReservation({
                ...reservation,
                tableId: e.target.value,
                tableName: matched
                  ? `${matched.name} (${matched.section})`
                  : e.target.value,
                section: matched?.section || "Indoor",
              });
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d4c8bd",
              borderRadius: "8px",
              fontSize: "13px",
              background: "#faf7f2",
              color: "#1f1610",
              colorScheme: "light",
              outline: "none",
            }}
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.capacity} Guests • {t.section})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: "22px" }}>
        <label
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#4b3f36",
            display: "block",
            marginBottom: "6px",
          }}
        >
          Special Requests (Optional)
        </label>
        <textarea
          rows={2}
          value={reservation?.specialRequests || ""}
          onChange={(e) =>
            setReservation({ ...reservation, specialRequests: e.target.value })
          }
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #d4c8bd",
            borderRadius: "8px",
            fontSize: "12.5px",
            background: "#faf7f2",
            color: "#1f1610",
            colorScheme: "light",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "#ffffff",
            border: "1px solid #d4c8bd",
            color: "#4b3f36",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onSave}
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(234, 88, 12, 0.4)",
          }}
        >
          Update Reservation
        </button>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* STEP 8: CANCEL RESERVATION                                            */
/* ===================================================================== */
function Step8CancelReservation({ reservation, onKeep, onConfirm }) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1f1610",
        borderRadius: "18px",
        padding: "32px 30px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        border: "1px solid #e8ded6",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#fee2e2",
          color: "#dc2626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
        }}
      >
        <Trash2 size={26} />
      </div>

      <h2
        style={{
          fontSize: "21px",
          fontWeight: 800,
          color: "#991b1b",
          margin: "0 0 6px",
        }}
      >
        Cancel Reservation?
      </h2>
      <p style={{ fontSize: "13px", color: "#6b5d52", margin: "0 0 18px" }}>
        Are you sure you want to cancel table reservation{" "}
        <strong>{reservation?.id}</strong>?
      </p>

      {/* Snapshot */}
      <div
        style={{
          background: "#faf7f2",
          border: "1px solid #e7ded4",
          borderRadius: "10px",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "0 auto 18px",
          maxWidth: "480px",
          fontSize: "12.5px",
        }}
      >
        <div>
          <strong>{reservation?.tableName}</strong> • {reservation?.guests}{" "}
          Guests
        </div>
        <div style={{ color: "#6b5d52" }}>
          {reservation?.date} at {reservation?.time}
        </div>
      </div>

      {/* Alert Warning Box */}
      <div
        style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "10px",
          padding: "12px 16px",
          color: "#991b1b",
          fontSize: "12px",
          lineHeight: "1.4",
          textAlign: "left",
          margin: "0 auto 24px",
          maxWidth: "500px",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong>Cancellation cannot be undone.</strong> Once cancelled, this
          reservation will be removed and the table will be made available to
          other guests.
        </div>
      </div>

      <div style={{ display: "flex", gap: "14px", justifyContent: "center" }}>
        <button
          type="button"
          onClick={onKeep}
          style={{
            background: "#ffffff",
            border: "1px solid #d4c8bd",
            color: "#4b3f36",
            padding: "10px 22px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Keep Reservation
        </button>

        <button
          type="button"
          onClick={onConfirm}
          style={{
            background: "#dc2626",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 24px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
          }}
        >
          Confirm Cancellation
        </button>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* STEP 9: CANCELLATION CONFIRMED                                        */
/* ===================================================================== */
function Step9CancellationConfirmed({ reservation, onBackToReservations }) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1f1610",
        borderRadius: "18px",
        padding: "36px 30px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        border: "1px solid #e8ded6",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#16a34a",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
          fontSize: "26px",
          fontWeight: 800,
        }}
      >
        ✓
      </div>

      <h2
        style={{
          fontSize: "22px",
          fontWeight: 800,
          color: "#166534",
          margin: "0 0 6px",
        }}
      >
        Reservation Cancelled
      </h2>
      <p style={{ fontSize: "13px", color: "#6b5d52", margin: "0 0 20px" }}>
        Your table reservation ({reservation?.id || "RES-1023"}) has been
        successfully cancelled.
      </p>

      {/* Refund details card */}
      <div
        style={{
          background: "#faf7f2",
          border: "1px solid #e7ded4",
          borderRadius: "12px",
          padding: "16px 20px",
          textAlign: "left",
          maxWidth: "480px",
          margin: "0 auto 20px",
          fontSize: "13px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span>Reservation ID:</span>
          <strong>{reservation?.id || "RES-1023"}</strong>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span>Cancelled Date & Time:</span>
          <span>
            {reservation?.date} at {reservation?.time}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px dashed #d4c8bd",
            paddingTop: "8px",
            fontWeight: 800,
          }}
        >
          <span>Refund Status:</span>
          <span style={{ color: "#16a34a" }}>
            ₹{reservation?.advanceAmount || 100}.00 (Processed)
          </span>
        </div>
      </div>

      {/* Info notice */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "10px",
          padding: "10px 16px",
          color: "#1e40af",
          fontSize: "12px",
          maxWidth: "480px",
          margin: "0 auto 24px",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Info size={18} style={{ flexShrink: 0 }} />
        <span>
          The advance payment of ₹{reservation?.advanceAmount || 100}.00 will be
          refunded to your original payment method within 3-5 business days.
        </span>
      </div>

      <button
        type="button"
        onClick={onBackToReservations}
        style={{
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          color: "#ffffff",
          border: "none",
          borderRadius: "8px",
          padding: "10px 24px",
          fontSize: "14px",
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(234, 88, 12, 0.4)",
        }}
      >
        Back to My Reservations
      </button>
    </div>
  );
}

/* ===================================================================== */
/* 9-SCREEN VISUAL POSTER PRESENTATION (Matches user's reference image)   */
/* ===================================================================== */
function ReservationFlowPoster({
  bookingForm,
  selectedTable,
  reservations,
  onSelectStep,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Row 1: Steps 1, 2, 3 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr auto 1fr",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <PosterScreenCard
          step={1}
          title="Book a Table – Enter reservation details"
          onClick={() => onSelectStep(1)}
        >
          <div style={{ fontSize: "9px" }}>
            <div
              style={{ fontWeight: 800, fontSize: "11px", marginBottom: "4px" }}
            >
              Reserve Your Table
            </div>
            <div style={{ color: "#786c62", marginBottom: "8px" }}>
              Enjoy fine dining at Bhanu Bistro
            </div>
            <div
              style={{
                background: "#faf7f2",
                padding: "6px",
                borderRadius: "6px",
                fontSize: "8.5px",
              }}
            >
              <div>📅 11/11/2026 • 07:30 PM</div>
              <div>👥 2 Guests • Indoor Area</div>
              <div>👤 Priya Sharma (+91 98765 43210)</div>
            </div>
          </div>
        </PosterScreenCard>

        <PosterArrow />

        <PosterScreenCard
          step={2}
          title="Select Table – Choose an available table"
          onClick={() => onSelectStep(2)}
        >
          <div style={{ fontSize: "9px" }}>
            <div
              style={{ fontWeight: 800, fontSize: "11px", marginBottom: "4px" }}
            >
              Select Your Table
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
                marginTop: "6px",
              }}
            >
              <div
                style={{
                  background: "#fff7ed",
                  border: "1.5px solid #ea580c",
                  padding: "4px",
                  borderRadius: "4px",
                }}
              >
                <strong>T-03 ✓</strong>
                <div>2 Guests • Indoor</div>
              </div>
              <div
                style={{
                  background: "#f9f7f4",
                  opacity: 0.6,
                  padding: "4px",
                  borderRadius: "4px",
                }}
              >
                <strong>T-04</strong>
                <div>4 Guests (Reserved)</div>
              </div>
            </div>
          </div>
        </PosterScreenCard>

        <PosterArrow />

        <PosterScreenCard
          step={3}
          title="Payment – Pay advance to confirm"
          onClick={() => onSelectStep(3)}
        >
          <div style={{ fontSize: "9px" }}>
            <div
              style={{ fontWeight: 800, fontSize: "11px", marginBottom: "4px" }}
            >
              Complete Booking
            </div>
            <div
              style={{
                background: "#faf7f2",
                padding: "5px",
                borderRadius: "6px",
                marginBottom: "4px",
              }}
            >
              <div>Estimated Total: ₹2,000.00</div>
              <div style={{ fontWeight: 800, color: "#ea580c" }}>
                Advance: ₹100.00
              </div>
            </div>
            <div
              style={{
                background: "#fff7ed",
                padding: "3px 6px",
                borderRadius: "4px",
                color: "#ea580c",
                fontWeight: 700,
              }}
            >
              Payable: ₹100.00 via UPI
            </div>
          </div>
        </PosterScreenCard>
      </div>

      {/* Row 2: Steps 4, 5, 6 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr auto 1fr",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <PosterScreenCard
          step={4}
          title="Payment Processing – Verifying payment"
          onClick={() => onSelectStep(4)}
        >
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <CreditCard
              size={22}
              color="#ea580c"
              style={{ margin: "0 auto 4px" }}
            />
            <div style={{ fontWeight: 800, fontSize: "11px" }}>
              Processing Payment...
            </div>
            <div style={{ fontSize: "8px", color: "#786c62" }}>
              Please do not close window
            </div>
          </div>
        </PosterScreenCard>

        <PosterArrow />

        <PosterScreenCard
          step={5}
          title="Booking Confirmed – Reservation successful"
          onClick={() => onSelectStep(5)}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{ color: "#16a34a", fontSize: "16px", fontWeight: 800 }}
            >
              ✓
            </div>
            <div
              style={{ fontWeight: 800, fontSize: "11px", color: "#166534" }}
            >
              Reservation Confirmed!
            </div>
            <div
              style={{
                fontSize: "9px",
                background: "#faf7f2",
                padding: "4px",
                borderRadius: "4px",
                marginTop: "4px",
                textAlign: "left",
              }}
            >
              <div>
                ID: <strong>RES-1023</strong>
              </div>
              <div>Table T-03 (Indoor) • 2 Guests</div>
              <div>Paid: ₹100.00 (UPI)</div>
            </div>
          </div>
        </PosterScreenCard>

        <PosterArrow />

        <PosterScreenCard
          step={6}
          title="My Reservations – View and manage bookings"
          onClick={() => onSelectStep(6)}
        >
          <div style={{ fontSize: "9px" }}>
            <div
              style={{ fontWeight: 800, fontSize: "11px", marginBottom: "4px" }}
            >
              My Reservations
            </div>
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                padding: "4px",
                borderRadius: "4px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>RES-1023</strong>
                <span style={{ color: "#166534", fontWeight: 700 }}>
                  Confirmed
                </span>
              </div>
              <div>T-03 • 11/11/2026, 07:30 PM</div>
              <div style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
                <span
                  style={{
                    background: "#ea580c",
                    color: "#fff",
                    padding: "1px 4px",
                    borderRadius: "3px",
                  }}
                >
                  Modify
                </span>
                <span
                  style={{
                    border: "1px solid #fca5a5",
                    color: "#dc2626",
                    padding: "1px 4px",
                    borderRadius: "3px",
                  }}
                >
                  Cancel
                </span>
              </div>
            </div>
          </div>
        </PosterScreenCard>
      </div>

      {/* Row 3: Steps 7, 8, 9 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr auto 1fr",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <PosterScreenCard
          step={7}
          title="Modify Reservation – Change date, time, guests or table"
          onClick={() => onSelectStep(7)}
        >
          <div style={{ fontSize: "9px" }}>
            <div
              style={{ fontWeight: 800, fontSize: "11px", marginBottom: "4px" }}
            >
              Modify Reservation
            </div>
            <div
              style={{
                background: "#faf7f2",
                padding: "4px",
                borderRadius: "4px",
              }}
            >
              <div>Change Date: 11/11/2026</div>
              <div>Change Time: 08:00 PM</div>
              <div>Guests: 4 Guests • Table T-05</div>
            </div>
          </div>
        </PosterScreenCard>

        <PosterArrow />

        <PosterScreenCard
          step={8}
          title="Cancel Reservation – Confirm cancellation"
          onClick={() => onSelectStep(8)}
        >
          <div style={{ textAlign: "center" }}>
            <Trash2
              size={18}
              color="#dc2626"
              style={{ margin: "0 auto 2px" }}
            />
            <div
              style={{ fontWeight: 800, fontSize: "11px", color: "#991b1b" }}
            >
              Cancel Reservation?
            </div>
            <div
              style={{
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: "7.5px",
                padding: "3px",
                borderRadius: "4px",
                marginTop: "4px",
              }}
            >
              Cancellation cannot be undone.
            </div>
          </div>
        </PosterScreenCard>

        <PosterArrow />

        <PosterScreenCard
          step={9}
          title="Cancellation Confirmed – Reservation cancelled with refund details"
          onClick={() => onSelectStep(9)}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{ color: "#16a34a", fontSize: "16px", fontWeight: 800 }}
            >
              ✓
            </div>
            <div
              style={{ fontWeight: 800, fontSize: "11px", color: "#166534" }}
            >
              Reservation Cancelled
            </div>
            <div
              style={{
                fontSize: "8.5px",
                background: "#faf7f2",
                padding: "4px",
                borderRadius: "4px",
                marginTop: "4px",
                textAlign: "left",
              }}
            >
              <div>RES-1023</div>
              <div style={{ color: "#16a34a", fontWeight: 700 }}>
                Refund: ₹100.00 (Processed)
              </div>
            </div>
          </div>
        </PosterScreenCard>
      </div>
    </div>
  );
}

function PosterArrow() {
  return (
    <div
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #f97316, #ea580c)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        boxShadow: "0 4px 12px rgba(234, 88, 12, 0.4)",
        border: "2px solid rgba(255, 255, 255, 0.35)",
      }}
    >
      <ArrowRight size={16} strokeWidth={2.8} />
    </div>
  );
}

function PosterScreenCard({ step, title, children, onClick }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <div
        onClick={onClick}
        style={{
          width: "100%",
          height: "240px",
          background: "#140905",
          backgroundImage: `radial-gradient(circle at 50% 30%, rgba(55, 24, 13, 0.65) 0%, rgba(18, 9, 5, 0.96) 80%), url('/assets/dining-table.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "16px",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          boxShadow: "0 14px 32px rgba(0,0,0,0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.transform = "translateY(-3px)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.transform = "translateY(0)")
        }
      >
        {/* Mock topbar */}
        <div
          style={{
            height: "30px",
            background: "rgba(18, 9, 6, 0.94)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
          }}
        >
          <span
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "10px",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            Bhanu Bistro
          </span>
          <div
            style={{
              display: "flex",
              gap: "8px",
              fontSize: "8.5px",
              color: "#c9bbae",
            }}
          >
            <span>Home</span>
            <span>Menu</span>
          </div>
          <span style={{ fontSize: "8.5px", color: "#f59e0b" }}>Hi, Priya</span>
        </div>

        {/* Inner Card */}
        <div
          style={{
            flexGrow: 1,
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#1f1610",
              borderRadius: "10px",
              padding: "10px",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Step Pill */}
      <div
        style={{
          background: "#ffffff",
          color: "#1f1610",
          padding: "6px 14px 6px 8px",
          borderRadius: "30px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          maxWidth: "95%",
        }}
      >
        <span
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {step}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}
