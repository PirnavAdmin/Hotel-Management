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
          gap: "7px",
          minHeight: "34px",
          padding: "3px 12px 3px 5px",
          border: "1.5px solid #f59e0b",
          borderRadius: "20px",
          background: "rgba(25, 16, 12, 0.92)",
          color: "#ffffff",
          fontSize: "12.5px",
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: isOpen
            ? "0 0 16px rgba(245, 158, 11, 0.5), 0 0 0 2px #f59e0b"
            : "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
            color: "#ffffff",
            fontSize: "11.5px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            flexShrink: 0,
          }}
        >
          {avatarLetter}
        </div>
        <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#ffffff" }}>
          {displayName}
        </span>
        <ChevronDown
          size={13}
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
            top: "calc(100% + 8px)",
            right: 0,
            width: "230px",
            background: "#160f0b",
            border: "1.5px solid rgba(245, 158, 11, 0.45)",
            borderRadius: "14px",
            boxShadow: "0 20px 48px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            padding: "8px",
            zIndex: 9999,
            animation: "authCardFadeIn 0.18s ease-out",
          }}
        >
          {/* Header with Avatar, Full Name & Phone */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 8px 10px 8px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                color: "#ffffff",
                fontSize: "16px",
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
                  fontSize: "13.5px",
                  color: "#ffffff",
                  fontWeight: 800,
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
                  fontSize: "11px",
                  color: "#f59e0b",
                  fontWeight: 600,
                  marginTop: "1px",
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
              gap: "9px",
              width: "100%",
              padding: "8px 10px",
              background: currentRoute === "/my-orders" ? "rgba(245, 158, 11, 0.18)" : "transparent",
              border: "none",
              borderRadius: "8px",
              color: currentRoute === "/my-orders" ? "#f59e0b" : "#f1e5dc",
              fontSize: "12.5px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <ShoppingBag size={15} color="#d4c5b9" />
            <span style={{ fontSize: "14px" }}>📋</span>
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
              gap: "9px",
              width: "100%",
              padding: "8px 10px",
              background: currentRoute === "/my-reservations" ? "rgba(245, 158, 11, 0.18)" : "transparent",
              border: "none",
              borderRadius: "8px",
              color: currentRoute === "/my-reservations" ? "#f59e0b" : "#f1e5dc",
              fontSize: "12.5px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <CalendarDays size={15} color="#d4c5b9" />
            <span style={{ fontSize: "14px" }}>📅</span>
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
              gap: "9px",
              width: "100%",
              padding: "8px 10px",
              background: currentRoute === "/profile" ? "rgba(245, 158, 11, 0.18)" : "transparent",
              border: "none",
              borderRadius: "8px",
              color: currentRoute === "/profile" ? "#f59e0b" : "#f1e5dc",
              fontSize: "12.5px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <User size={15} color="#d4c5b9" />
            <span style={{ fontSize: "14px" }}>👤</span>
            <span>My Profile</span>
          </button>

          <div
            style={{
              height: "1px",
              background: "rgba(255, 255, 255, 0.08)",
              margin: "5px 0",
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
              gap: "9px",
              width: "100%",
              padding: "8px 10px",
              background: "transparent",
              border: "none",
              borderRadius: "8px",
              color: "#ef4444",
              fontSize: "12.5px",
              fontWeight: 700,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <LogOut size={15} color="#ef4444" />
            <span style={{ fontSize: "14px" }}>🚪</span>
            <span style={{ color: "#ef4444" }}>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default CustomerProfileDropdown;
