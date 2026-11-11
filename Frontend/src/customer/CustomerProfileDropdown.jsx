import React, { useState, useEffect, useRef } from "react";
import {
  UserRound,
  ChevronDown,
  ShoppingBag,
  CalendarDays,
  User,
  LogOut,
  Calendar,
} from "lucide-react";

/**
 * CustomerProfileDropdown - Reusable customer profile pill & dropdown menu
 * Matches Screenshot 2:
 * - Pill: (P) Priya Sharma ▾
 * - Dropdown:
 *   - Avatar + Name + Phone
 *   - 📋 My Orders
 *   - 📅 My Reservations
 *   - 👤 My Profile
 *   - 🚪 Logout
 * Clicking outside automatically closes the dropdown.
 * Clicking the pill ONLY toggles the dropdown, never auto-navigates.
 */
export function CustomerProfileDropdown({
  customerUser,
  onNavigate,
  onLogout,
  currentRoute = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayName = customerUser?.name || "Priya Sharma";
  const displayPhone = customerUser?.phone || "+91 98765 43210";
  const avatarLetter = (displayName[0] || "P").toUpperCase();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleOptionClick = (route) => {
    setIsOpen(false);
    if (onNavigate) {
      onNavigate(route);
    }
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="customer-profile-menu-container"
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* ── Profile Pill Button (Matches Screenshot 2) ────────────────── */}
      <button
        type="button"
        className="customer-profile-pill-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Account Menu"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          minHeight: "38px",
          padding: "4px 14px 4px 6px",
          border: "1.5px solid #f59e0b",
          borderRadius: "24px",
          background: "rgba(25, 16, 12, 0.9)",
          color: "#ffffff",
          fontSize: "13.5px",
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: isOpen
            ? "0 0 0 3px rgba(245, 158, 11, 0.35), 0 4px 14px rgba(0,0,0,0.5)"
            : "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          {avatarLetter}
        </div>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
          {displayName}
        </span>
        <ChevronDown
          size={14}
          color="#f59e0b"
          style={{
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* ── Dropdown Menu (Matches Screenshot 2 Exactly) ─────────────── */}
      {isOpen && (
        <div
          className="customer-profile-dropdown-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "240px",
            background: "#19110d",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "16px",
            boxShadow: "0 20px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            padding: "10px",
            zIndex: 9999,
            animation: "authCardFadeIn 0.18s ease-out",
          }}
        >
          {/* Header with Avatar, Full Name & Phone */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 10px 12px 10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                color: "#ffffff",
                fontSize: "17px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(234, 88, 12, 0.35)",
                flexShrink: 0,
              }}
            >
              {avatarLetter}
            </div>
            <div style={{ overflow: "hidden" }}>
              <strong
                style={{
                  display: "block",
                  fontSize: "14px",
                  color: "#ffffff",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {displayName}
              </strong>
              <small
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  color: "#f59e0b",
                  fontWeight: 600,
                  marginTop: "2px",
                }}
              >
                {displayPhone}
              </small>
            </div>
          </div>

          {/* Option 1: My Orders */}
          <button
            type="button"
            className="customer-profile-menu-item"
            onClick={() => handleOptionClick("/my-orders")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              width: "100%",
              padding: "10px 12px",
              background: currentRoute === "/my-orders" ? "rgba(245, 158, 11, 0.18)" : "transparent",
              border: "none",
              borderRadius: "10px",
              color: currentRoute === "/my-orders" ? "#f59e0b" : "#e5d7cc",
              fontSize: "13.5px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>📋</span>
            <span>My Orders</span>
          </button>

          {/* Option 2: My Reservations */}
          <button
            type="button"
            className="customer-profile-menu-item"
            onClick={() => handleOptionClick("/my-reservations")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              width: "100%",
              padding: "10px 12px",
              background: currentRoute === "/my-reservations" ? "rgba(245, 158, 11, 0.18)" : "transparent",
              border: "none",
              borderRadius: "10px",
              color: currentRoute === "/my-reservations" ? "#f59e0b" : "#e5d7cc",
              fontSize: "13.5px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>📅</span>
            <span>My Reservations</span>
          </button>

          {/* Option 3: My Profile */}
          <button
            type="button"
            className="customer-profile-menu-item"
            onClick={() => handleOptionClick("/profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              width: "100%",
              padding: "10px 12px",
              background: currentRoute === "/profile" ? "rgba(245, 158, 11, 0.18)" : "transparent",
              border: "none",
              borderRadius: "10px",
              color: currentRoute === "/profile" ? "#f59e0b" : "#e5d7cc",
              fontSize: "13.5px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>👤</span>
            <span>My Profile</span>
          </button>

          <div
            style={{
              height: "1px",
              background: "rgba(255, 255, 255, 0.08)",
              margin: "6px 0",
            }}
          />

          {/* Option 4: Logout */}
          <button
            type="button"
            className="customer-profile-menu-item is-logout"
            onClick={handleLogoutClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              width: "100%",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              borderRadius: "10px",
              color: "#ef4444",
              fontSize: "13.5px",
              fontWeight: 700,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default CustomerProfileDropdown;
