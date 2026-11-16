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
  Calendar,
  ShoppingCart,
  Heart,
  Camera,
  Crown,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { CustomerProfileDropdown } from "./CustomerProfileDropdown";

/**
 * CustomerProfilePage - Dedicated My Profile page (Route: /profile)
 * Matches Image 2 UI:
 * - Wide horizontal card layout with warm ambient gradient and subtle decorative elements
 * - Centered avatar circle with camera badge
 * - 3-column contact info row (Full Name, Mobile Number, Email Address)
 * - 3-column Account Overview row (Customer Since, Total Orders, Favorite Cuisine)
 * - Full-width "Edit Profile" action button
 * - Completely compact and fitted to viewport without vertical scroll
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
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        overflow: "hidden",
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
              <img src={restaurantLogo} alt={restaurantName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <ChefHat size={18} />
            )}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "15px", color: "#ffffff", fontWeight: 800, lineHeight: 1.15 }}>
              {restaurantName}
            </strong>
            <small style={{ color: "#f59e0b", fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Fine Dining &amp; Takeaway
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

          <CustomerProfileDropdown
            customerUser={customerUser}
            onNavigate={onNavigate}
            onLogout={onLogout}
            currentRoute="/profile"
          />
        </div>
      </header>

      {/* ── Page Content (Fitted to Screen - No Scroll) ────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 16px",
          overflow: "hidden",
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

        {/* ── Wide Landscape Profile Card Matching Image 2 ────── */}
        <div
          style={{
            width: "100%",
            maxWidth: "760px",
            background: "linear-gradient(145deg, #fffcf7 0%, #fff7ee 60%, #ffeedc 100%)",
            borderRadius: "20px",
            padding: "18px 26px 20px",
            color: "#1c1109",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.65), 0 0 25px rgba(245, 158, 11, 0.15)",
            border: "1.5px solid rgba(245, 158, 11, 0.45)",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle Decorative Arc Overlay (Matching Mockup Art) */}
          <div
            style={{
              position: "absolute",
              top: "-50px",
              left: "-50px",
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              border: "1.5px solid rgba(245, 158, 11, 0.25)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-20px",
              left: "-20px",
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Decorative Chef Hat Outline in Top Right */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              right: "24px",
              color: "rgba(245, 158, 11, 0.3)",
              pointerEvents: "none",
            }}
          >
            <ChefHat size={48} strokeWidth={1.2} />
          </div>

          {/* Card Top Branding & Avatar */}
          <div style={{ textAlign: "center", marginBottom: "12px", position: "relative" }}>
            <div style={{ position: "relative", display: "inline-block", margin: "0 auto 6px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
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
              {/* Camera icon badge */}
              <div
                title="Profile Photo"
                style={{
                  position: "absolute",
                  bottom: "0px",
                  right: "-2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#1e130c",
                  border: "1.5px solid #ffffff",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                  cursor: "pointer",
                }}
              >
                <Camera size={10} />
              </div>
            </div>

            <h1
              style={{
                fontSize: "19px",
                fontWeight: 800,
                color: "#1c1109",
                margin: "0 0 2px 0",
                lineHeight: 1.2,
              }}
            >
              {name}
            </h1>
            <p style={{ fontSize: "11.5px", color: "#786556", margin: 0, fontWeight: 500 }}>
              A valued customer of {restaurantName}
            </p>
          </div>

          {/* Faint Divider */}
          <div
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.35) 50%, transparent 100%)",
              margin: "0 0 12px 0",
            }}
          />

          {!isEditing ? (
            /* ── VIEW MODE: 3-COLUMNS ROWS ─────────────────────── */
            <div>
              {/* 1. Contact Information Row (3-Columns) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginBottom: "12px",
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
                    <small
                      style={{
                        display: "block",
                        fontSize: "10px",
                        color: "#8c786a",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      Full Name
                    </small>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "12.5px",
                        color: "#1c1109",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {name}
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
                    <small
                      style={{
                        display: "block",
                        fontSize: "10px",
                        color: "#8c786a",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      Mobile Number
                    </small>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "12.5px",
                        color: "#1c1109",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {phone}
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
                    <small
                      style={{
                        display: "block",
                        fontSize: "10px",
                        color: "#8c786a",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      Email Address
                    </small>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "12.5px",
                        color: "#1c1109",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {email}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2. Account Overview Section Header */}
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
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#1c1109",
                      letterSpacing: "0.2px",
                    }}
                  >
                    Account Overview
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "rgba(245, 158, 11, 0.25)",
                  }}
                />
              </div>

              {/* 3. Account Overview Stats (3-Columns) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                {/* Customer Since */}
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
                    <Calendar size={15} />
                  </div>
                  <div>
                    <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700 }}>
                      Customer Since
                    </small>
                    <strong style={{ fontSize: "12.5px", color: "#1c1109", fontWeight: 800 }}>
                      Nov 2025
                    </strong>
                  </div>
                </div>

                {/* Total Orders */}
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
                    <ShoppingCart size={15} />
                  </div>
                  <div>
                    <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700 }}>
                      Total Orders
                    </small>
                    <strong style={{ fontSize: "12.5px", color: "#1c1109", fontWeight: 800 }}>
                      12
                    </strong>
                  </div>
                </div>

                {/* Favorite Cuisine */}
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
                      background: "#fee2e2",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Heart size={15} fill="#ef4444" />
                  </div>
                  <div>
                    <small style={{ display: "block", fontSize: "10px", color: "#8c786a", fontWeight: 700 }}>
                      Favorite Cuisine
                    </small>
                    <strong style={{ fontSize: "12.5px", color: "#1c1109", fontWeight: 800 }}>
                      Biryani
                    </strong>
                  </div>
                </div>
              </div>

              {/* 4. Full Width Edit Profile Button */}
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
                  transition: "transform 0.15s ease, filter 0.15s ease",
                }}
              >
                <Edit2 size={14} />
                <span>Edit Profile</span>
                <ChevronRight size={15} style={{ marginLeft: "4px" }} />
              </button>
            </div>
          ) : (
            /* ── EDIT MODE ─────────────────────────────────────── */
            <form onSubmit={handleSave}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#4a3b32",
                      marginBottom: "4px",
                    }}
                  >
                    Full Name *
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "10px", color: "#ea580c" }}>
                      <User size={14} />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "0 10px 0 32px",
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

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#4a3b32",
                      marginBottom: "4px",
                    }}
                  >
                    Mobile Number *
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "10px", color: "#ea580c" }}>
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "0 10px 0 32px",
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

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#4a3b32",
                      marginBottom: "4px",
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "10px", color: "#ea580c" }}>
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "0 10px 0 32px",
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
              </div>

              {/* Edit Mode Buttons: Save Changes and Cancel */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    height: "38px",
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  <Save size={15} /> Save Changes
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    height: "38px",
                    background: "#f3f4f6",
                    color: "#4b5563",
                    border: "1px solid #d1d5db",
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
                  <X size={15} /> Cancel
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
