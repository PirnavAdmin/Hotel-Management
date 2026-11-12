import React, { useState } from "react";
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
  ShieldCheck,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import { CustomerProfileDropdown } from "./CustomerProfileDropdown";

/**
 * CustomerProfilePage - Dedicated My Profile page (Route: /profile)
 * Displays:
 * - Customer profile icon/avatar
 * - Full Name
 * - Mobile Number
 * - Email Address
 * - Edit Profile button
 * - Save Changes and Cancel buttons
 */
export function CustomerProfilePage({
  customerUser,
  onUpdateUser,
  onNavigate,
  onLogout,
  restaurantName = "Bhanu Bistro",
  restaurantLogo = "",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(customerUser?.name || "Priya Sharma");
  const [phone, setPhone] = useState(customerUser?.phone || "+91 98765 43210");
  const [email, setEmail] = useState(customerUser?.email || "priya@example.com");
  const [successToast, setSuccessToast] = useState("");

  const handleSave = (e) => {
    e.preventDefault();
    const updated = {
      ...customerUser,
      name: name.trim() || "Priya Sharma",
      phone: phone.trim() || "+91 98765 43210",
      email: email.trim() || "priya@example.com",
    };
    if (onUpdateUser) {
      onUpdateUser(updated);
    }
    setIsEditing(false);
    setSuccessToast("Profile details updated successfully!");
    setTimeout(() => setSuccessToast(""), 3500);
  };

  const handleCancel = () => {
    setName(customerUser?.name || "Priya Sharma");
    setPhone(customerUser?.phone || "+91 98765 43210");
    setEmail(customerUser?.email || "priya@example.com");
    setIsEditing(false);
  };

  const avatarLetter = (name[0] || "P").toUpperCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#0c0705",
        backgroundImage:
          "radial-gradient(circle at 50% 20%, rgba(234, 88, 12, 0.12) 0%, transparent 60%), url('/assets/login-restaurant.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        display: "flex",
        flexDirection: "column",
        color: "#f7efe8",
      }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px clamp(20px, 4vw, 64px)",
          minHeight: "72px",
          background: "rgba(16, 9, 7, 0.78)",
          borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={() => onNavigate("/")}
          style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "2px solid #f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              overflow: "hidden",
            }}
          >
            {restaurantLogo ? (
              <img src={restaurantLogo} alt={restaurantName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <ChefHat size={24} />
            )}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "18px", color: "#ffffff", fontWeight: 800 }}>
              {restaurantName}
            </strong>
            <small style={{ color: "#f59e0b", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px" }}>
              Fine Dining &amp; Takeaway
            </small>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Back to Home
          </button>

          <CustomerProfileDropdown
            customerUser={customerUser}
            onNavigate={onNavigate}
            onLogout={onLogout}
            currentRoute="/profile"
          />
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "36px 16px",
        }}
      >
        {successToast && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#166534",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "13.5px",
              fontWeight: 600,
              marginBottom: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <CheckCircle size={18} />
            <span>{successToast}</span>
          </div>
        )}

        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "32px 36px",
            color: "#1a100b",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65), 0 2px 10px rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            boxSizing: "border-box",
          }}
        >
          {/* Card Top Branding & Avatar */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                border: "3px solid #f59e0b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 800,
                margin: "0 auto 12px auto",
                boxShadow: "0 8px 24px rgba(234, 88, 12, 0.35)",
              }}
            >
              {avatarLetter}
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#1a100b", margin: "0 0 4px 0" }}>
              My Profile
            </h1>
            <p style={{ fontSize: "13px", color: "#6f6158", margin: 0 }}>
              Manage your Bhanu Bistro customer account details.
            </p>
          </div>

          {!isEditing ? (
            /* ── VIEW MODE ─────────────────────────────────────── */
            <div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  background: "#faf7f4",
                  padding: "18px 20px",
                  borderRadius: "14px",
                  border: "1px solid #ebdcd1",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <User size={18} color="#ea580c" />
                  <div>
                    <small style={{ display: "block", fontSize: "11px", color: "#8c7b70", fontWeight: 700 }}>
                      FULL NAME
                    </small>
                    <strong style={{ fontSize: "15px", color: "#1a100b" }}>{name}</strong>
                  </div>
                </div>

                <div style={{ height: "1px", background: "#e8ded6" }} />

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Phone size={18} color="#ea580c" />
                  <div>
                    <small style={{ display: "block", fontSize: "11px", color: "#8c7b70", fontWeight: 700 }}>
                      MOBILE NUMBER
                    </small>
                    <strong style={{ fontSize: "15px", color: "#1a100b" }}>{phone}</strong>
                  </div>
                </div>

                <div style={{ height: "1px", background: "#e8ded6" }} />

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Mail size={18} color="#ea580c" />
                  <div>
                    <small style={{ display: "block", fontSize: "11px", color: "#8c7b70", fontWeight: 700 }}>
                      EMAIL ADDRESS
                    </small>
                    <strong style={{ fontSize: "15px", color: "#1a100b" }}>{email}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    width: "100%",
                    height: "44px",
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "14.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 6px 18px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  <Edit2 size={16} /> Edit Profile
                </button>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => onNavigate("/my-orders")}
                    style={{
                      height: "40px",
                      background: "transparent",
                      border: "1.5px solid #ea580c",
                      color: "#ea580c",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ShoppingBag size={15} /> My Orders
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate("/my-reservations")}
                    style={{
                      height: "40px",
                      background: "transparent",
                      border: "1.5px solid #ea580c",
                      color: "#ea580c",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Calendar size={15} /> My Reservations
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── EDIT MODE ─────────────────────────────────────── */
            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                    Full Name *
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "12px", color: "#9c8b80" }}>
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        height: "42px",
                        padding: "0 14px 0 38px",
                        borderRadius: "9px",
                        border: "1.5px solid #e5dad3",
                        background: "#faf7f4",
                        fontSize: "14px",
                        color: "#1a100b",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                    Mobile Number *
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "12px", color: "#9c8b80" }}>
                      <Phone size={16} />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        height: "42px",
                        padding: "0 14px 0 38px",
                        borderRadius: "9px",
                        border: "1.5px solid #e5dad3",
                        background: "#faf7f4",
                        fontSize: "14px",
                        color: "#1a100b",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                    Email Address
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "12px", color: "#9c8b80" }}>
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: "100%",
                        height: "42px",
                        padding: "0 14px 0 38px",
                        borderRadius: "9px",
                        border: "1.5px solid #e5dad3",
                        background: "#faf7f4",
                        fontSize: "14px",
                        color: "#1a100b",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Edit Mode Buttons: Save Changes and Cancel */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    height: "44px",
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  <Save size={16} /> Save Changes
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    height: "44px",
                    background: "#f3f4f6",
                    color: "#4b5563",
                    border: "1px solid #d1d5db",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default CustomerProfilePage;
