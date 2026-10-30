export function DiningRoomBackground() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "16px",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* 1. Upper Cream Wall (0% to 34%) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "34%",
          background: "#f7f4ea",
        }}
      />

      {/* 2. Middle Mint/Sage Green Wainscot Strip (34% to 57%) */}
      <div
        style={{
          position: "absolute",
          top: "34%",
          left: 0,
          right: 0,
          height: "23%",
          background: "#d4e5df",
          borderTop: "2px solid #c7dcd6",
        }}
      />

      {/* 3. Bottom Wooden Floor (57% to 100%) */}
      <div
        style={{
          position: "absolute",
          top: "57%",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#deb887",
          borderTop: "2px solid #cfab7c",
        }}
      >
        {/* Floor Plank Division Lines */}
        <div
          style={{
            position: "absolute",
            top: "36%",
            left: 0,
            right: 0,
            height: "1px",
            background: "rgba(180, 140, 95, 0.4)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "70%",
            left: 0,
            right: 0,
            height: "1px",
            background: "rgba(180, 140, 95, 0.4)",
          }}
        />
      </div>

      {/* Left Window */}
      <div
        style={{
          position: "absolute",
          top: "22px",
          left: "5%",
          width: "84px",
          height: "72px",
          background: "#ffffff",
          border: "4px solid #d3e4f2",
          borderRadius: "4px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "4px",
          padding: "3px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ background: "#bcdbf5", borderRadius: "2px" }} />
        <div style={{ background: "#bcdbf5", borderRadius: "2px" }} />
        <div style={{ background: "#bcdbf5", borderRadius: "2px" }} />
        <div style={{ background: "#bcdbf5", borderRadius: "2px" }} />
      </div>

      {/* Right Window */}
      <div
        style={{
          position: "absolute",
          top: "22px",
          right: "5%",
          width: "84px",
          height: "72px",
          background: "#ffffff",
          border: "4px solid #d3e4f2",
          borderRadius: "4px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "4px",
          padding: "3px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ background: "#bcdbf5", borderRadius: "2px" }} />
        <div style={{ background: "#bcdbf5", borderRadius: "2px" }} />
        <div style={{ background: "#bcdbf5", borderRadius: "2px" }} />
        <div style={{ background: "#bcdbf5", borderRadius: "2px" }} />
      </div>

      {/* 3 Pendant Ceiling Lamps */}
      {[30, 50, 70].map((xPct, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            top: 0,
            left: `${xPct}%`,
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Cord */}
          <div
            style={{
              width: "2px",
              height: "46px",
              background: "#6e5847",
            }}
          />
          {/* Lampshade */}
          <div
            style={{
              width: "42px",
              height: "22px",
              background: "linear-gradient(180deg, #f7b733 0%, #ea9010 100%)",
              clipPath: "polygon(24% 0%, 76% 0%, 100% 100%, 0% 100%)",
              boxShadow: "0 3px 6px rgba(234, 144, 16, 0.4)",
            }}
          />
          {/* Warm Light Glow Cone */}
          <div
            style={{
              width: "84px",
              height: "95px",
              marginTop: "-1px",
              background:
                "linear-gradient(180deg, rgba(247, 183, 51, 0.28) 0%, rgba(247, 183, 51, 0) 100%)",
              clipPath: "polygon(22% 0%, 78% 0%, 100% 100%, 0% 100%)",
              filter: "blur(2px)",
            }}
          />
        </div>
      ))}

      {/* Potted Plant on Bottom Left */}
      <div
        style={{
          position: "absolute",
          bottom: "22px",
          left: "4%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Foliage */}
        <div style={{ position: "relative", width: "36px", height: "36px" }}>
          <div
            style={{
              position: "absolute",
              bottom: "2px",
              left: "4px",
              width: "16px",
              height: "26px",
              borderRadius: "50%",
              background: "#3e8c56",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "4px",
              left: "10px",
              width: "16px",
              height: "30px",
              borderRadius: "50%",
              background: "#4da066",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "2px",
              right: "4px",
              width: "16px",
              height: "26px",
              borderRadius: "50%",
              background: "#3e8c56",
            }}
          />
        </div>
        {/* Pot */}
        <div
          style={{
            width: "28px",
            height: "18px",
            background: "#c36c46",
            borderRadius: "2px",
            clipPath: "polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          }}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Clock,
  Utensils,
  ChevronRight,
  Search,
  Flame,
  Hourglass,
  User,
  X,
  Filter,
  RotateCcw,
  Armchair,
  Edit3,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import {
  parseTimeToSeconds,
  formatElapsedTimer,
  getTimerUrgencyColor,
} from "../utils/timer";
// Dynamic Dining Scene Components matching Image 1
function TopDiningChair({ seat, isSelected, isOccupied, onToggle, isLight }) {
  const gradId = `topChairGrad_${seat.id}`;
  const gradSelId = `topChairGradSel_${seat.id}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isOccupied}
      title={
        isOccupied
          ? "Occupied / Unavailable (Disabled)"
          : isSelected
          ? "Selected (Click to deselect)"
          : "Available (Click to select)"
      }
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        margin: "0 6px",
        outline: "none",
        cursor: isOccupied ? "not-allowed" : "pointer",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
        filter: isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))",
      }}
      onMouseEnter={(e) => {
        if (!isOccupied && !isSelected) {
          e.currentTarget.style.transform = "translateY(-6px) scale(1.06)";
          e.currentTarget.style.filter = "drop-shadow(0 6px 12px rgba(16, 185, 129, 0.4)) drop-shadow(0 3px 6px rgba(0,0,0,0.12))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isSelected ? "scale(1.08)" : "scale(1)";
        e.currentTarget.style.filter = isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))";
      }}
    >
      <svg width="60" height="80" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#965a39" />
            <stop offset="100%" stopColor="#6e3c21" />
          </linearGradient>
          <linearGradient id={gradSelId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Floor shadow */}
        <ellipse cx="30" cy="76" rx="22" ry="4" fill={isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.35)"} />

        {/* Front Tapered Wooden Legs */}
        <polygon points="17,54 14,75 18,75 20,54" fill="#5a3118" />
        <polygon points="40,54 42,75 46,75 43,54" fill="#4d2812" />

        {/* Seat Cushion Top: Green for Available, Orange for Selected, Slate for Occupied */}
        <path
          d="M 12 44 Q 30 41 48 44 L 51 56 Q 30 59 9 56 Z"
          fill={isSelected ? "#ea580c" : isOccupied ? "#475569" : "#10b981"}
        />
        <ellipse
          cx="30"
          cy="50"
          rx="16"
          ry="3.5"
          fill={
            isSelected
              ? "rgba(255,255,255,0.4)"
              : isOccupied
              ? "transparent"
              : "rgba(255,255,255,0.3)"
          }
        />

        {/* Backrest: Warm Chocolate Brown with Green Border (Available) / Full Orange (Selected) */}
        <rect
          x="11"
          y="4"
          width="38"
          height="45"
          rx="8"
          fill={isSelected ? `url(#${gradSelId})` : isOccupied ? "#334155" : `url(#${gradId})`}
          stroke={isSelected ? "#ffffff" : isOccupied ? "#64748b" : "#10b981"}
          strokeWidth={isSelected ? "2.4" : isOccupied ? "1.2" : "2"}
        />
        {/* Subtle contour */}
        <rect
          x="14"
          y="7"
          width="32"
          height="39"
          rx="6"
          fill="none"
          stroke={
            isSelected
              ? "rgba(255,255,255,0.45)"
              : isOccupied
              ? "rgba(255,255,255,0.06)"
              : "rgba(16, 185, 129, 0.4)"
          }
          strokeWidth="1"
        />
      </svg>

      {/* Selected Orange Check Badge */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
            border: "2px solid #ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(245, 158, 11, 0.95)",
            zIndex: 10,
          }}
        >
          <Check size={13} strokeWidth={3.5} color="#ffffff" />
        </div>
      )}

      {/* Available Green Indicator Dot */}
      {!isSelected && !isOccupied && (
        <div
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#10b981",
            border: isLight ? "2px solid #ffffff" : "2px solid #080e1a",
            boxShadow: "0 0 10px #10b981",
            zIndex: 9,
          }}
        />
      )}

      {/* Occupied Grey Dot */}
      {isOccupied && (
        <div
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#64748b",
            border: isLight ? "2px solid #ffffff" : "2px solid #080e1a",
            zIndex: 9,
          }}
        />
      )}
    </button>
  );
}

function BottomDiningChair({ seat, isSelected, isOccupied, onToggle, isLight }) {
  const gradId = `bottomChairGrad_${seat.id}`;
  const gradSelId = `bottomChairGradSel_${seat.id}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isOccupied}
      title={
        isOccupied
          ? "Occupied / Unavailable (Disabled)"
          : isSelected
          ? "Selected (Click to deselect)"
          : "Available (Click to select)"
      }
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        margin: "0 6px",
        outline: "none",
        cursor: isOccupied ? "not-allowed" : "pointer",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
        filter: isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))",
      }}
      onMouseEnter={(e) => {
        if (!isOccupied && !isSelected) {
          e.currentTarget.style.transform = "translateY(-6px) scale(1.06)";
          e.currentTarget.style.filter = "drop-shadow(0 6px 12px rgba(16, 185, 129, 0.4)) drop-shadow(0 3px 6px rgba(0,0,0,0.12))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isSelected ? "scale(1.08)" : "scale(1)";
        e.currentTarget.style.filter = isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))";
      }}
    >
      <svg width="66" height="96" viewBox="0 0 66 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#965a39" />
            <stop offset="100%" stopColor="#67391f" />
          </linearGradient>
          <linearGradient id={gradSelId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Floor shadow */}
        <ellipse cx="33" cy="92" rx="26" ry="4" fill={isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.35)"} />

        {/* 4 Tapered Wooden Legs matching Image 1 */}
        <polygon points="17,56 14,88 18,88 20,56" fill="#522b14" />
        <polygon points="46,56 48,88 52,88 49,56" fill="#46230f" />
        <polygon points="13,60 8,93 13,93 17,60" fill="#754124" />
        <polygon points="49,60 53,93 58,93 53,60" fill="#67391f" />

        {/* Seat cushion underside: Green for Available, Orange for Selected, Slate for Occupied */}
        <path
          d="M 10 50 Q 33 46 56 50 L 54 62 Q 33 65 12 62 Z"
          fill={isSelected ? "#ea580c" : isOccupied ? "#475569" : "#10b981"}
        />

        {/* Backrest viewed from rear: Green Border for Available, Full Orange for Selected */}
        <rect
          x="12"
          y="4"
          width="42"
          height="50"
          rx="9"
          fill={isSelected ? `url(#${gradSelId})` : isOccupied ? "#334155" : `url(#${gradId})`}
          stroke={isSelected ? "#ffffff" : isOccupied ? "#64748b" : "#10b981"}
          strokeWidth={isSelected ? "2.4" : isOccupied ? "1.2" : "2"}
        />
        {/* Inner stitch contour */}
        <rect
          x="15"
          y="7"
          width="36"
          height="44"
          rx="7"
          fill="none"
          stroke={
            isSelected
              ? "rgba(255,255,255,0.45)"
              : isOccupied
              ? "rgba(255,255,255,0.06)"
              : "rgba(16, 185, 129, 0.4)"
          }
          strokeWidth="1"
        />
      </svg>

      {/* Selected Orange Check Badge */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
            border: "2px solid #ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(245, 158, 11, 0.95)",
            zIndex: 10,
          }}
        >
          <Check size={13} strokeWidth={3.5} color="#ffffff" />
        </div>
      )}

      {/* Available Green Indicator Dot */}
      {!isSelected && !isOccupied && (
        <div
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#10b981",
            border: isLight ? "2px solid #ffffff" : "2px solid #080e1a",
            boxShadow: "0 0 10px #10b981",
            zIndex: 9,
          }}
        />
      )}

      {/* Occupied Grey Dot */}
      {isOccupied && (
        <div
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#64748b",
            border: isLight ? "2px solid #ffffff" : "2px solid #080e1a",
            zIndex: 9,
          }}
        />
      )}
    </button>
  );
}

function SideDiningChair({ seat, side, isSelected, isOccupied, onToggle, isLight }) {
  const isLeft = side === "left";
  const gradId = `sideChairGrad_${seat.id}`;
  const gradSelId = `sideChairGradSel_${seat.id}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isOccupied}
      title={
        isOccupied
          ? "Occupied / Unavailable (Disabled)"
          : isSelected
          ? "Selected (Click to deselect)"
          : "Available (Click to select)"
      }
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        margin: "0 6px",
        outline: "none",
        cursor: isOccupied ? "not-allowed" : "pointer",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
        filter: isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))",
      }}
      onMouseEnter={(e) => {
        if (!isOccupied && !isSelected) {
          e.currentTarget.style.transform = "translateY(-6px) scale(1.06)";
          e.currentTarget.style.filter = "drop-shadow(0 6px 12px rgba(16, 185, 129, 0.4)) drop-shadow(0 3px 6px rgba(0,0,0,0.12))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isSelected ? "scale(1.08)" : "scale(1)";
        e.currentTarget.style.filter = isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))";
      }}
    >
      <svg
        width="60"
        height="86"
        viewBox="0 0 60 86"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: isLeft ? "none" : "scaleX(-1)" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#965a39" />
            <stop offset="100%" stopColor="#67391f" />
          </linearGradient>
          <linearGradient id={gradSelId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Floor drop shadow */}
        <ellipse cx="28" cy="82" rx="20" ry="4" fill={isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.35)"} />

        {/* Tapered legs */}
        <polygon points="12,50 8,80 12,80 15,50" fill="#522b14" />
        <polygon points="36,50 40,80 44,80 39,50" fill="#67391f" />

        {/* Seat Cushion: Green for Available, Orange for Selected, Slate for Occupied */}
        <path
          d="M 14 38 Q 32 37 46 41 L 43 51 Q 30 48 13 47 Z"
          fill={isSelected ? "#ea580c" : isOccupied ? "#475569" : "#10b981"}
        />

        {/* Backrest on the left: Green Border for Available, Full Orange for Selected */}
        <rect
          x="6"
          y="4"
          width="18"
          height="48"
          rx="7"
          transform="rotate(6 6 4)"
          fill={isSelected ? `url(#${gradSelId})` : isOccupied ? "#334155" : `url(#${gradId})`}
          stroke={isSelected ? "#ffffff" : isOccupied ? "#64748b" : "#10b981"}
          strokeWidth={isSelected ? "2.4" : isOccupied ? "1.2" : "2"}
        />
      </svg>

      {/* Selected Orange Check Badge */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
            border: "2px solid #ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(245, 158, 11, 0.95)",
            zIndex: 10,
          }}
        >
          <Check size={13} strokeWidth={3.5} color="#ffffff" />
        </div>
      )}

      {/* Available Green Indicator Dot */}
      {!isSelected && !isOccupied && (
        <div
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#10b981",
            border: isLight ? "2px solid #ffffff" : "2px solid #080e1a",
            boxShadow: "0 0 10px #10b981",
            zIndex: 9,
          }}
        />
      )}

      {/* Occupied Grey Dot */}
      {isOccupied && (
        <div
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#64748b",
            border: isLight ? "2px solid #ffffff" : "2px solid #080e1a",
            zIndex: 9,
          }}
        />
      )}
    </button>
  );
}

function DynamicDiningTableComponent({ width, height, topCount, bottomCount, isLight }) {
  const cx = width / 2;
  const basketX = cx - 12;
  const basketY = 50;

  return (
    <div
      style={{
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
        transition: "width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        flexShrink: 0,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: "block",
          filter: isLight
            ? "drop-shadow(0 14px 22px rgba(180, 150, 120, 0.35))"
            : "drop-shadow(0 18px 30px rgba(0,0,0,0.55))",
          overflow: "visible",
        }}
      >
        <defs>
          <linearGradient id="tableTopGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7efe2" />
            <stop offset="100%" stopColor="#ebdcc7" />
          </linearGradient>
          <linearGradient id="tableBevelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dfceb6" />
            <stop offset="100%" stopColor="#cfbba0" />
          </linearGradient>
          <linearGradient id="tableLegGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#824c2d" />
            <stop offset="100%" stopColor="#552c15" />
          </linearGradient>
          <linearGradient id="soupBowlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e27c3d" />
            <stop offset="100%" stopColor="#b9531b" />
          </linearGradient>
          <linearGradient id="soupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7a84e" />
            <stop offset="100%" stopColor="#e78b27" />
          </linearGradient>
          <linearGradient id="breadGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eb9f46" />
            <stop offset="100%" stopColor="#bd6c1e" />
          </linearGradient>
        </defs>

        {/* 3 Tapered Wooden Table Legs matching Image 1 */}
        <polygon points="34,84 28,150 33,150 39,84" fill="url(#tableLegGrad)" />
        <polygon
          points={`${cx - 5},86 ${cx - 2},154 ${cx + 3},154 ${cx + 6},86`}
          fill="url(#tableLegGrad)"
        />
        <polygon
          points={`${width - 39},84 ${width - 33},150 ${width - 28},150 ${width - 34},84`}
          fill="url(#tableLegGrad)"
        />

        {/* Table Bevel (Lower edge for 3D depth) */}
        <path
          d={`M 14,24 L 20,80 Q 24,90 38,90 L ${width - 38},90 Q ${width - 24},90 ${width - 20},80 L ${width - 14},24 L ${width - 14},34 L ${width - 20},90 Q ${width - 24},100 ${width - 38},100 L 38,100 Q 24,100 20,90 L 14,34 Z`}
          fill="url(#tableBevelGrad)"
        />

        {/* Table Top Surface (Isometric Warm Cream Wood with rounded corners) */}
        <path
          d={`M 26,12 L ${width - 26},12 Q ${width - 12},12 ${width - 14},24 L ${width - 20},80 Q ${width - 24},90 ${width - 38},90 L 38,90 Q 24,90 20,80 L 14,24 Q 12,12 26,12 Z`}
          fill="url(#tableTopGrad)"
          stroke="#ddcaa9"
          strokeWidth="1.2"
        />

        {/* Center Bread Basket matching Image 1 */}
        <ellipse cx={basketX} cy={basketY} rx="26" ry="14" fill="#58311b" />
        <ellipse
          cx={basketX - 11}
          cy={basketY - 4}
          rx="12"
          ry="7"
          transform={`rotate(-24 ${basketX - 11} ${basketY - 4})`}
          fill="url(#breadGrad)"
        />
        <ellipse
          cx={basketX}
          cy={basketY - 6}
          rx="14"
          ry="7.5"
          fill="url(#breadGrad)"
        />
        <ellipse
          cx={basketX + 11}
          cy={basketY - 4}
          rx="12"
          ry="7"
          transform={`rotate(24 ${basketX + 11} ${basketY - 4})`}
          fill="url(#breadGrad)"
        />
        <line x1={basketX - 2} y1={basketY - 10} x2={basketX - 1} y2={basketY - 2} stroke="#85410c" strokeWidth="1.4" />
        <line x1={basketX + 3} y1={basketY - 10} x2={basketX + 4} y2={basketY - 2} stroke="#85410c" strokeWidth="1.4" />

        {/* Salt & Pepper Shakers next to bread basket (from Image 1!) */}
        <rect x={basketX + 30} y={basketY + 6} width="7" height="13" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
        <rect x={basketX + 40} y={basketY + 4} width="7" height="15" rx="2" fill="#693b21" />

        {/* Top Row Place Settings */}
        {Array.from({ length: topCount }).map((_, idx) => {
          const px = (width / (topCount + 1)) * (idx + 1);
          return (
            <g key={`top-place-${idx}`}>
              <ellipse cx={px} cy="26" rx="15" ry="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
              <ellipse cx={px} cy="26" rx="11" ry="6" fill="url(#soupBowlGrad)" />
              <ellipse cx={px} cy="26" rx="8" ry="4" fill="url(#soupGrad)" />
              <path d={`M ${px + 14} 24 Q ${px + 20} 22 ${px + 24} 25`} stroke="#452718" strokeWidth="1.6" strokeLinecap="round" />
              <rect x={px - 22} y="19" width="8" height="12" rx="2" fill="#cdd5df" stroke="#94a3b8" strokeWidth="0.7" />
            </g>
          );
        })}

        {/* Bottom Row Place Settings */}
        {Array.from({ length: bottomCount }).map((_, idx) => {
          const px = (width / (bottomCount + 1)) * (idx + 1);
          return (
            <g key={`bottom-place-${idx}`}>
              <ellipse cx={px} cy="72" rx="15" ry="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
              <ellipse cx={px} cy="72" rx="11" ry="6" fill="url(#soupBowlGrad)" />
              <ellipse cx={px} cy="72" rx="8" ry="4" fill="url(#soupGrad)" />
              <path d={`M ${px + 14} 70 Q ${px + 20} 68 ${px + 24} 71`} stroke="#452718" strokeWidth="1.6" strokeLinecap="round" />
              <rect x={px - 22} y="65" width="8" height="12" rx="2" fill="#cdd5df" stroke="#94a3b8" strokeWidth="0.7" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

import { SkeletonCard } from "../common/Skeletons";

export function TableView({ tables, onSelectTable, onUpdateTable, loading = false }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize with global application theme (e.g. 'light-bistro' vs dark themes)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return (
      document.documentElement.getAttribute("data-theme") ||
      localStorage.getItem("gourmet_pos_theme_v2") ||
      "royal-saffron"
    );
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const th =
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("gourmet_pos_theme_v2") ||
        "royal-saffron";
      setCurrentTheme(th);
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("storage", handleThemeChange);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  const isLight = currentTheme === "light-bistro";

  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serverFilter, setServerFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Interactive Seat Selection & Edit Configuration Modal State
  const [selectedSeatTable, setSelectedSeatTable] = useState(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [isEditingSeats, setIsEditingSeats] = useState(false);
  const [customSeatLabels, setCustomSeatLabels] = useState({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedSeatTable(null);
        setIsEditingSeats(false);
      }
    };
    if (selectedSeatTable) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSeatTable]);

  const handleOpenSeatModal = (table) => {
    setSelectedSeatTable(table);
    setIsEditingSeats(false);
    if (table.seatLabels && typeof table.seatLabels === "object") {
      setCustomSeatLabels({ ...table.seatLabels });
    } else {
      setCustomSeatLabels({});
    }
    if (Array.isArray(table.selectedSeats) && table.selectedSeats.length > 0) {
      setSelectedSeatIds([...table.selectedSeats]);
    } else if (Number(table.guests) > 0) {
      const initialIds = [];
      for (let i = 1; i <= Math.min(Number(table.capacity) || 4, Number(table.guests)); i++) {
        initialIds.push(`S${i}`);
      }
      setSelectedSeatIds(initialIds);
    } else {
      setSelectedSeatIds([]);
    }
  };

  const handleSaveSeatConfig = (newCapacity, newLabels = customSeatLabels) => {
    if (!selectedSeatTable) return;
    const updatedCap = Math.max(1, Math.min(24, Number(newCapacity) || 4));

    const updatedTable = {
      ...selectedSeatTable,
      capacity: updatedCap,
      seatLabels: newLabels,
    };
    setSelectedSeatTable(updatedTable);

    try {
      const rawTables = localStorage.getItem("gourmet_pos_tables_v2_inr");
      if (rawTables) {
        const parsed = JSON.parse(rawTables);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((t) =>
            String(t.id) === String(selectedSeatTable.id)
              ? {
                  ...t,
                  capacity: updatedCap,
                  seatLabels: newLabels,
                }
              : t
          );
          localStorage.setItem("gourmet_pos_tables_v2_inr", JSON.stringify(updated));
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: updated }));
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (onUpdateTable) {
      onUpdateTable(updatedTable);
    }
  };

  const handleToggleSeat = (seatId) => {
    if (isEditingSeats) return;
    setSelectedSeatIds((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    );
  };

  const handleConfirmSeats = () => {
    if (!selectedSeatTable) return;
    const count =
      selectedSeatIds.length > 0
        ? selectedSeatIds.length
        : Number(selectedSeatTable.guests) > 0
        ? Number(selectedSeatTable.guests)
        : Number(selectedSeatTable.capacity) || 2;

    const hasActiveItems = Array.isArray(selectedSeatTable.items) && selectedSeatTable.items.some(
      (i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled"
    );
    const finalStatus = hasActiveItems ? "occupied" : "vacant";
    const finalSeats =
      selectedSeatIds.length > 0
        ? [...selectedSeatIds]
        : Array.from({ length: count }, (_, i) => `S${i + 1}`);

    const finalTable = {
      ...selectedSeatTable,
      capacity: selectedSeatTable.capacity,
      seatLabels: selectedSeatTable.seatLabels || customSeatLabels,
      guests: count,
      occupiedChairs: count,
      selectedSeats: finalSeats,
      status: finalStatus,
    };

    try {
      const rawTables = localStorage.getItem("gourmet_pos_tables_v2_inr");
      if (rawTables) {
        const parsed = JSON.parse(rawTables);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((t) =>
            String(t.id) === String(selectedSeatTable.id)
              ? {
                  ...t,
                  capacity: selectedSeatTable.capacity,
                  seatLabels: selectedSeatTable.seatLabels || customSeatLabels,
                  guests: count,
                  occupiedChairs: count,
                  selectedSeats: finalSeats,
                  status: finalStatus,
                }
              : t
          );
          localStorage.setItem("gourmet_pos_tables_v2_inr", JSON.stringify(updated));
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: updated }));
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (onUpdateTable) {
      onUpdateTable(finalTable);
    }

    const tableId = selectedSeatTable.id;
    setSelectedSeatTable(null);
    setSelectedSeatIds([]);
    setIsEditingSeats(false);

    if (onSelectTable) {
      onSelectTable(tableId);
    }
  };

  const renderTopDownChair = (seat, rotation = 0, isCompact = false) => {
    const isOccupied = seat.isOccupied;
    const isSelected = seat.isSelected;

    let glowFilter = "drop-shadow(0 8px 16px rgba(0,0,0,0.65))";
    let pillBorder = "rgba(var(--surface-rgb),0.22)";
    let pillBg = "rgba(10, 18, 30, 0.88)";
    let pillColor = "#f1f5f9";

    if (isOccupied) {
      glowFilter = "drop-shadow(0 4px 8px rgba(0,0,0,0.5))";
      pillBorder = "rgba(100, 116, 139, 0.35)";
      pillBg = "rgba(30, 41, 59, 0.85)";
      pillColor = "#64748b";
    } else if (isSelected) {
      glowFilter =
        "drop-shadow(0 0 14px rgba(245, 158, 11, 0.85)) drop-shadow(0 8px 16px rgba(0,0,0,0.7))";
      pillBorder = "#f59e0b";
      pillBg = "rgba(245, 158, 11, 0.3)";
      pillColor = "#f59e0b";
    }

    const chairSize = isCompact ? 72 : 86;

    return (
      <div
        key={seat.defaultId || seat.id}
        onClick={() => {
          if (!isEditingSeats) {
            handleToggleSeat(seat.id, isOccupied);
          }
        }}
        style={{
          position: "relative",
          width: `${chairSize}px`,
          height: `${chairSize}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isOccupied ? "not-allowed" : "pointer",
          userSelect: "none",
          transition: "transform 0.18s ease",
        }}
        onMouseEnter={(e) => {
          if (!isOccupied && !isEditingSeats) {
            e.currentTarget.style.transform = "scale(1.08)";
            const svg = e.currentTarget.querySelector("svg");
            if (svg && !isSelected) {
              svg.style.filter =
                "drop-shadow(0 0 14px rgba(16, 185, 129, 0.85)) drop-shadow(0 8px 16px rgba(0,0,0,0.7))";
            }
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          const svg = e.currentTarget.querySelector("svg");
          if (svg) {
            svg.style.filter = glowFilter;
          }
        }}
      >
        {/* Realistic Top-Down Executive / Dining Armchair matching Image 1 */}
        <svg
          width={chairSize}
          height={chairSize}
          viewBox="0 0 90 90"
          style={{
            transform: `rotate(${rotation}deg)`,
            filter: glowFilter,
            opacity: isOccupied ? 0.45 : 1,
            transition: "all 0.2s ease",
            overflow: "visible",
          }}
        >
          <defs>
            <linearGradient id={`chrome-${seat.defaultId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="var(--text-muted)" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="var(--text-dim)" />
            </linearGradient>
            <linearGradient id={`leatherSeat-${seat.defaultId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#373c44" />
              <stop offset="30%" stopColor="#252930" />
              <stop offset="75%" stopColor="#1a1c21" />
              <stop offset="100%" stopColor="#101215" />
            </linearGradient>
            <linearGradient id={`leatherBack-${seat.defaultId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#434954" />
              <stop offset="45%" stopColor="#2b2f37" />
              <stop offset="100%" stopColor="#15171b" />
            </linearGradient>
          </defs>

          {/* Chrome Metal Tubular Legs extending out with glides */}
          <line x1="20" y1="20" x2="11" y2="11" stroke={`url(#chrome-${seat.defaultId})`} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="70" y1="20" x2="79" y2="11" stroke={`url(#chrome-${seat.defaultId})`} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="20" y1="70" x2="11" y2="79" stroke={`url(#chrome-${seat.defaultId})`} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="70" y1="70" x2="79" y2="79" stroke={`url(#chrome-${seat.defaultId})`} strokeWidth="3.5" strokeLinecap="round" />

          {/* Chrome Glides / Feet */}
          <circle cx="11" cy="11" r="3.2" fill="var(--text-muted)" stroke="#334155" strokeWidth="1" />
          <circle cx="79" cy="11" r="3.2" fill="var(--text-muted)" stroke="#334155" strokeWidth="1" />
          <circle cx="11" cy="79" r="3.2" fill="var(--text-muted)" stroke="#334155" strokeWidth="1" />
          <circle cx="79" cy="79" r="3.2" fill="var(--text-muted)" stroke="#334155" strokeWidth="1" />

          {/* Chrome Side Frames */}
          <path
            d="M 17 22 L 17 68 Q 17 72 21 72 L 69 72 Q 73 72 73 68 L 73 22"
            fill="none"
            stroke={`url(#chrome-${seat.defaultId})`}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Seat Cushion (Plump Dark Leather Cushion) */}
          <rect
            x="21"
            y="26"
            width="48"
            height="46"
            rx="11"
            fill={`url(#leatherSeat-${seat.defaultId})`}
            stroke="#0b0d10"
            strokeWidth="1.2"
          />
          {/* Subtle Leather Bevel / Stitch Line */}
          <rect
            x="24"
            y="29"
            width="42"
            height="40"
            rx="8"
            fill="none"
            stroke="rgba(var(--surface-rgb),0.08)"
            strokeWidth="1"
          />

          {/* Chrome Armrests on Left and Right */}
          <rect x="14" y="28" width="5" height="34" rx="2.5" fill={`url(#chrome-${seat.defaultId})`} />
          <rect x="71" y="28" width="5" height="34" rx="2.5" fill={`url(#chrome-${seat.defaultId})`} />
          {/* Dark Leather Padded Arm Tops */}
          <rect x="13.5" y="32" width="6" height="26" rx="3" fill="#14171a" stroke="#000000" strokeWidth="0.8" />
          <rect x="70.5" y="32" width="6" height="26" rx="3" fill="#14171a" stroke="#000000" strokeWidth="0.8" />

          {/* Backrest Cushion (Curved Top Cushion with Chrome Trim) */}
          <rect
            x="18"
            y="13"
            width="54"
            height="17"
            rx="6"
            fill={`url(#leatherBack-${seat.defaultId})`}
            stroke="#090a0d"
            strokeWidth="1.2"
          />
          {/* Top Chrome Rail on Backrest */}
          <rect x="17" y="11" width="56" height="4.5" rx="2" fill={`url(#chrome-${seat.defaultId})`} />
        </svg>

        {/* Floating Glassmorphic Pill Badge with Seat Label (e.g. S1, S2...) */}
        <div
          onClick={(e) => {
            if (isEditingSeats) e.stopPropagation();
          }}
          style={{
            position: "absolute",
            top: "54%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          {isEditingSeats ? (
            <input
              type="text"
              value={
                customSeatLabels[seat.defaultId] !== undefined
                  ? customSeatLabels[seat.defaultId]
                  : seat.id
              }
              onChange={(e) => {
                const val = e.target.value;
                const updated = { ...customSeatLabels, [seat.defaultId]: val };
                setCustomSeatLabels(updated);
                handleSaveSeatConfig(selectedSeatTable?.capacity || 4, updated);
              }}
              title="Click to rename seat number"
              placeholder={seat.defaultId}
              maxLength={8}
              style={{
                width: "44px",
                padding: "2px 4px",
                fontSize: "0.76rem",
                fontWeight: 800,
                textAlign: "center",
                background: "var(--bg-secondary)",
                border: "1.5px solid var(--accent-amber)",
                borderRadius: "20px",
                color: "var(--text-main)",
                outline: "none",
                boxShadow: "0 0 10px rgba(245, 158, 11, 0.35)",
              }}
            />
          ) : (
            <div
              style={{
                padding: "0.22rem 0.75rem",
                borderRadius: "20px",
                background: pillBg,
                border: `1.5px solid ${pillBorder}`,
                backdropFilter: "blur(8px)",
                color: pillColor,
                fontSize: "0.86rem",
                fontWeight: 800,
                letterSpacing: "0.5px",
                boxShadow: isSelected
                  ? "0 0 14px rgba(245, 158, 11, 0.6)"
                  : "0 4px 12px rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "36px",
                pointerEvents: "none",
                transition: "all 0.18s ease",
              }}
            >
              {customSeatLabels[seat.defaultId] !== undefined
                ? customSeatLabels[seat.defaultId]
                : seat.id}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Extract distinct servers dynamically from tables
  const uniqueServers = useMemo(() => {
    const set = new Set();
    tables.forEach((t) => {
      const s = (t.server || t.waiter || t.assignedServer || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [tables]);

  // Extract distinct table list sorted numerically
  const uniqueTableNumbers = useMemo(() => {
    return [...tables].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }, [tables]);

  // Dynamic sections list based on active tables
  const sections = useMemo(() => {
    const defaultSections = ["Main Hall", "Window Side", "Garden Terrace", "VIP Lounge"];
    const foundSections = new Set(defaultSections);
    tables.forEach((t) => {
      if (t.section && typeof t.section === "string") foundSections.add(t.section);
    });
    return [
      { id: "all", name: `All Areas (${tables.length} Tables)` },
      ...Array.from(foundSections).map((s) => ({ id: s, name: s })),
    ];
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // 1. Section Filter
      const matchesSection =
        sectionFilter === "all" || t.section === sectionFilter;

      // 2. Status Filter
      const hasActive = Array.isArray(t.items) && t.items.some((i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled");
      const effectiveStatus = hasActive ? (t.status || "occupied") : "vacant";
      const matchesStatus =
        statusFilter === "all" || effectiveStatus === statusFilter;

      // 3. Server Dropdown Filter
      const tServer = (t.server || t.waiter || t.assignedServer || "Staff").trim();
      const matchesServerDropdown =
        serverFilter === "all" ||
        tServer.toLowerCase() === serverFilter.toLowerCase();

      // 4. Table Number Dropdown Filter
      const tNum = String(t.tableNumber || t.name || "").toLowerCase();
      const matchesTableDropdown =
        tableFilter === "all" ||
        String(t.id) === String(tableFilter) ||
        tNum === String(tableFilter).toLowerCase() ||
        String(t.name).toLowerCase() === String(tableFilter).toLowerCase();

      // 5. Search Query Filter (Searches Table Number OR Server Name OR Section)
      let matchesSearch = true;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const tIdStr = String(t.id || "");
        const tName = String(t.tableNumber || t.name || "").toLowerCase();
        const tSec = String(t.section ?? "").toLowerCase();
        const sName = tServer.toLowerCase();

        // Check for table number patterns (e.g. "1", "t1", "t 1", "table 1", "#1")
        const cleanNum = q.replace(/^(table\s*|t\s*|#\s*)/i, "").trim();
        const isPureNumber = cleanNum !== "" && !isNaN(cleanNum);

        let tableMatch = false;
        if (isPureNumber) {
          // Exact table ID match or word-bounded number in table name
          const numRegex = new RegExp(`(^|\\b)${cleanNum}(\\b|$)`, "i");
          tableMatch =
            tIdStr === cleanNum ||
            numRegex.test(tName) ||
            tName === `table ${cleanNum}` ||
            tName === `t-${cleanNum}` ||
            tName === `t${cleanNum}`;
        } else {
          tableMatch =
            tName.includes(q) ||
            `t${tIdStr}` === q ||
            `t ${tIdStr}` === q;
        }

        // Check for server name match (safe substring)
        const serverMatch = sName.includes(q);

        // Check for section match
        const sectionMatch = tSec.includes(q);

        matchesSearch = tableMatch || serverMatch || sectionMatch;
      }

      return (
        matchesSection &&
        matchesStatus &&
        matchesServerDropdown &&
        matchesTableDropdown &&
        matchesSearch
      );
    });
  }, [tables, sectionFilter, statusFilter, serverFilter, tableFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery !== "" ||
    serverFilter !== "all" ||
    tableFilter !== "all" ||
    statusFilter !== "all" ||
    sectionFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setServerFilter("all");
    setTableFilter("all");
    setStatusFilter("all");
    setSectionFilter("all");
  };

  return (
    <div
      className="mobile-container"
      style={{ padding: "1.25rem 1.5rem", maxWidth: "100%", margin: "0 auto" }}
    >
      {/* Floor Plan Title & Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--text-main)",
                letterSpacing: "-0.02em",
              }}
            >
              Restaurant Floor Plan & Tables
            </h2>
            <span
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--accent-amber-light)",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 700,
                border: "1px solid var(--border-subtle)",
              }}
            >
              {tables.length} Tables Active
            </span>
          </div>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.88rem",
              marginTop: "3px",
            }}
          >
            Select any table to take orders, add food or beverages, and generate
            bills in <strong>Rupees (₹)</strong>.
          </p>
        </div>

        {/* Search & Status Filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {/* Quick Search with Clear */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={16}
              color="var(--text-dim)"
              style={{ position: "absolute", left: "12px", pointerEvents: "none" }}
            />
            <input
              type="text"
              placeholder="Search table or server..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                border: searchQuery ? "1px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-main)",
                padding: "0.55rem 2rem 0.55rem 2.25rem",
                fontSize: "0.85rem",
                width: "210px",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2px",
                  borderRadius: "50%",
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter by Table Number Dropdown */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "10px",
                fontSize: "0.78rem",
                fontWeight: 900,
                color: tableFilter !== "all" ? "var(--accent-amber-light)" : "var(--text-dim)",
                pointerEvents: "none",
              }}
            >
              #
            </span>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              title="Filter by Table Number"
              style={{
                background: tableFilter !== "all" ? "rgba(245, 158, 11, 0.16)" : "var(--bg-secondary)",
                border: tableFilter !== "all" ? "1px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: tableFilter !== "all" ? "var(--accent-amber-light)" : "var(--text-main)",
                padding: "0.52rem 0.85rem 0.52rem 1.85rem",
                fontSize: "0.82rem",
                fontWeight: tableFilter !== "all" ? 700 : 500,
                cursor: "pointer",
                outline: "none",
                height: "36px",
              }}
            >
              <option value="all" style={{ background: "var(--bg-secondary)", color: "var(--text-main)" }}>
                All Tables ({tables.length})
              </option>
              {uniqueTableNumbers.map((tbl) => (
                <option key={tbl.id} value={tbl.id} style={{ background: "var(--bg-secondary)", color: "var(--text-main)" }}>
                  {tbl.name || tbl.tableNumber || `Table ${tbl.id}`} {tbl.section ? `• ${tbl.section}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Server Name Dropdown */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <User
              size={14}
              color={serverFilter !== "all" ? "var(--accent-amber-light)" : "var(--text-dim)"}
              style={{ position: "absolute", left: "10px", pointerEvents: "none" }}
            />
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              title="Filter by Server Name"
              style={{
                background: serverFilter !== "all" ? "rgba(245, 158, 11, 0.16)" : "var(--bg-secondary)",
                border: serverFilter !== "all" ? "1px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: serverFilter !== "all" ? "var(--accent-amber-light)" : "var(--text-main)",
                padding: "0.52rem 0.85rem 0.52rem 1.95rem",
                fontSize: "0.82rem",
                fontWeight: serverFilter !== "all" ? 700 : 500,
                cursor: "pointer",
                outline: "none",
                height: "36px",
              }}
            >
              <option value="all" style={{ background: "var(--bg-secondary)", color: "var(--text-main)" }}>
                All Servers ({uniqueServers.length})
              </option>
              {uniqueServers.map((srv) => (
                <option key={srv} value={srv} style={{ background: "var(--bg-secondary)", color: "var(--text-main)" }}>
                  👤 {srv}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button (visible when any filter active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all search & filter conditions"
              style={{
                background: "rgba(239, 68, 68, 0.14)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "var(--danger)",
                borderRadius: "var(--radius-md)",
                padding: "0.45rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                height: "36px",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          {/* Status Filters */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-secondary)",
              padding: "3px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {[
              { id: "all", label: `All (${tables.length})` },
              { id: "vacant", label: "Vacant", dot: "var(--status-vacant)" },
              {
                id: "occupied",
                label: "Occupied",
                dot: "var(--status-occupied)",
              },
              { id: "billed", label: "Billed", dot: "var(--status-billed)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  background:
                    statusFilter === tab.id
                      ? "var(--bg-tertiary)"
                      : "transparent",
                  color:
                    statusFilter === tab.id
                      ? "var(--text-main)"
                      : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                {tab.dot && (
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: tab.dot,
                    }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          overflowX: "auto",
          paddingBottom: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        {sections.map((sec) => {
          const isSelected = sectionFilter === sec.id;
          const count =
            sec.id === "all"
              ? tables.length
              : tables.filter((t) => t.section === sec.id).length;

          return (
            <button
              key={sec.id}
              onClick={() => setSectionFilter(sec.id)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.84rem",
                fontWeight: isSelected ? 700 : 500,
                background: isSelected
                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)"
                  : "var(--bg-secondary)",
                color: isSelected
                  ? "var(--accent-amber-light)"
                  : "var(--text-muted)",
                border: isSelected
                  ? "1px solid var(--accent-amber)"
                  : "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                whiteSpace: "nowrap",
              }}
            >
              <span>{sec.name}</span>
              <span
                style={{
                  background: isSelected
                    ? "var(--accent-amber)"
                    : "var(--bg-tertiary)",
                  color: isSelected ? "#000000" : "var(--text-dim)",
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tables Grid or Empty Filter State */}
      {loading ? (
        <div role="status" aria-label="Loading tables" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", margin: "1rem 0" }}>
          {Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} lines={3} />)}
        </div>
      ) : filteredTables.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 1.5rem",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-subtle)",
            margin: "1rem 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-amber-light)",
              marginBottom: "0.5rem",
            }}
          >
            <Search size={24} />
          </div>
          <h3
            style={{
              fontSize: "1.15rem",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            No Matching Tables Found
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              maxWidth: "420px",
              margin: "0.25rem 0 1rem",
              lineHeight: 1.4,
            }}
          >
            No tables matched your filter criteria
            {searchQuery ? ` for "${searchQuery}"` : ""}
            {serverFilter !== "all" ? ` (Server: ${serverFilter})` : ""}
            {tableFilter !== "all" ? ` (Table: #${tableFilter})` : ""}
            {statusFilter !== "all" ? ` (Status: ${statusFilter})` : ""}
            {sectionFilter !== "all" ? ` (Area: ${sectionFilter})` : ""}.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#000000",
              fontWeight: 800,
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "0.6rem 1.4rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.25)",
            }}
          >
            <RotateCcw size={14} />
            <span>Clear All Filters</span>
          </button>
        </div>
      ) : (
        <div
          className="responsive-table-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {filteredTables.map((table) => {
            const items = Array.isArray(table?.items) ? table.items : [];
            const hasActiveItems = items.some(
              (i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled",
            );
            const subtotal = items.reduce(
              (sum, item) =>
                sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 1),
              0,
            );
            const totalItemsCount = items.reduce(
              (sum, item) => sum + (Number(item?.quantity) || 1),
              0,
            );

            let statusColor = "var(--status-vacant)";
            let statusText = "Vacant";
            let statusBg = "var(--status-vacant-bg)";

            const isOccupied = hasActiveItems && table.status !== "vacant";

            if (isOccupied) {
              if (table.status === "billed") {
                statusColor = "var(--status-billed)";
                statusText = "Billed";
                statusBg = "var(--status-billed-bg)";
              } else {
                statusColor = "var(--status-occupied)";
                statusText = "Dining";
                statusBg = "var(--status-occupied-bg)";
              }
            }
            const hasCooking =
              isOccupied && items.some((i) => i.kotStatus === "cooking");
            const allReady =
              isOccupied &&
              items.length > 0 &&
              items.every(
                (i) =>
                  i.kotStatus === "ready" ||
                  i.kotStatus === "served" ||
                  i.kotStatus === "completed",
              );
            const hasReady =
              isOccupied && items.some((i) => i.kotStatus === "ready");
            const readyCount = isOccupied
              ? items.filter(
                (i) => i.kotStatus === "ready" || i.kotStatus === "served",
              ).length
              : 0;

            const isTable5 = table.id === 5;

            const cardBorderColor = !isOccupied
              ? "var(--border-subtle)"
              : allReady
                ? "#10b981"
                : hasCooking
                  ? "#ea580c"
                  : "rgba(245, 158, 11, 0.7)";
            const cardShadow = !isOccupied
              ? "var(--shadow-sm)"
              : allReady
                ? "0 4px 16px rgba(16, 185, 129, 0.25)"
                : hasCooking
                  ? "0 4px 16px rgba(234, 88, 12, 0.22)"
                  : "0 4px 14px rgba(245, 158, 11, 0.16)";

            return (
              <div
                key={table.id}
                onClick={() => onSelectTable(table.id)}
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${cardBorderColor}`,
                  padding: "0.75rem 0.85rem",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  boxShadow: cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.45rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.3)";
                  e.currentTarget.style.borderColor = "var(--accent-amber)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = cardShadow;
                  e.currentTarget.style.borderColor = cardBorderColor;
                }}
              >
                {/* Table Card Header: Big, Bold, Crystal Clear Table Number */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "nowrap",
                      gap: "0.25rem",
                      marginBottom: "0.2rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        flex: "0 1 auto",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          background:
                            table.status !== "vacant"
                              ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                              : "var(--bg-tertiary)",
                          color:
                            table.status !== "vacant"
                              ? "#ffffff"
                              : "var(--text-main)",
                          border:
                            table.status !== "vacant"
                              ? "none"
                              : "1px solid var(--border-subtle)",
                          fontWeight: 900,
                          fontSize: "0.74rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          letterSpacing: "0.03em",
                          flexShrink: 0,
                        }}
                      >
                        T{table.name ? table.name.replace(/^(?:table|t)\s*[-–—]?\s*/i, "") : table.id}
                      </span>
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: 900,
                          color:
                            table.status !== "vacant"
                              ? "var(--accent-amber-light)"
                              : "var(--text-main)",
                          margin: 0,
                          lineHeight: 1.1,
                          letterSpacing: "-0.02em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {table.name ? (table.name.trim().match(/^(?:table|t)\s*[-–—]?\s*\d+$/i) ? `Table ${table.name.replace(/^(?:table|t)\s*[-–—]?\s*/i, "")}` : table.name) : `Table ${table.id}`}
                      </h3>
                    </div>
                    <span
                      title={statusText}
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: statusColor,
                        boxShadow: `0 0 6px color-mix(in srgb, ${statusColor} 50.20%, transparent)`,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                      className={
                        table.status !== "vacant" ? "pulse-indicator" : ""
                      }
                    />
                  </div>

                  {/* Section & Capacity */}
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--text-dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      paddingBottom: "0.35rem",
                      borderBottom: "1px solid var(--neutral-border)",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {table.section && !/^[\\|/\s]+$/.test(table.section.trim()) ? table.section : "Main Hall"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSeatModal(table);
                      }}
                      title="Click to view & select seats"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                        borderRadius: "10px",
                        padding: "0.12rem 0.45rem",
                        color: "#f59e0b",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(245, 158, 11, 0.22)";
                        e.currentTarget.style.borderColor = "#f59e0b";
                        e.currentTarget.style.transform = "scale(1.03)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(245, 158, 11, 0.08)";
                        e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.35)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <Armchair size={11} color="#f59e0b" />
                      <span>
                        {table.capacity} Seats ·{" "}
                        {isOccupied && (Number(table.guests) > 0 || (Array.isArray(table.selectedSeats) && table.selectedSeats.length > 0))
                          ? `${Number(table.guests) || table.selectedSeats.length} Seated`
                          : "0 Seated"}
                      </span>
                    </button>
                  </div>

                  {/* Assigned Server Badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.25rem 0.45rem",
                      marginTop: "0.32rem",
                      background:
                        (serverFilter !== "all" &&
                          (table.server || "Staff").toLowerCase() ===
                          serverFilter.toLowerCase()) ||
                          (searchQuery &&
                            (table.server || "Staff")
                              .toLowerCase()
                              .includes(searchQuery.trim().toLowerCase()))
                          ? "rgba(245, 158, 11, 0.22)"
                          : "rgba(var(--surface-rgb),0.04)",
                      border:
                        (serverFilter !== "all" &&
                          (table.server || "Staff").toLowerCase() ===
                          serverFilter.toLowerCase()) ||
                          (searchQuery &&
                            (table.server || "Staff")
                              .toLowerCase()
                              .includes(searchQuery.trim().toLowerCase()))
                          ? "1px solid var(--accent-amber)"
                          : "1px solid rgba(var(--surface-rgb),0.06)",
                      borderRadius: "5px",
                      fontSize: "0.68rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        fontSize: "0.66rem",
                      }}
                    >
                      <User size={11} color="var(--text-dim)" /> Server:
                    </span>
                    <strong
                      style={{
                        color:
                          (serverFilter !== "all" &&
                            (table.server || "Staff").toLowerCase() ===
                            serverFilter.toLowerCase()) ||
                            (searchQuery &&
                              (table.server || "Staff")
                                .toLowerCase()
                                .includes(searchQuery.trim().toLowerCase()))
                            ? "var(--accent-amber-light)"
                            : "var(--text-main)",
                        fontWeight: 700,
                        maxWidth: "105px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {table.server || "Staff"}
                    </strong>
                  </div>

                  {/* Kitchen Cooking Status Live Badge */}
                  {isOccupied && items.length > 0 && (
                    <div style={{ marginTop: "0.32rem" }}>
                      {allReady ? (
                        <div
                          style={{
                            background: "rgba(16, 185, 129, 0.16)",
                            border: "1.5px solid #10b981",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            boxShadow: "0 0 10px rgba(16, 185, 129, 0.25)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 900,
                              color: "var(--success)",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: "#10b981",
                                display: "inline-block",
                              }}
                              className="pulse-indicator"
                            />
                            🔔 Ready to Serve
                          </span>
                          <span
                            style={{
                              fontSize: "0.6rem",
                              color: "var(--success)",
                              fontWeight: 800,
                            }}
                          >
                            Hot!
                          </span>
                        </div>
                      ) : hasCooking ? (
                        <div
                          style={{
                            background: "rgba(234, 88, 12, 0.15)",
                            border: "1px solid #ea580c",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              color: "var(--accent-amber-light)",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            {readyCount > 0
                              ? `🔥 Cooking (${readyCount}/${items.length} Ready)`
                              : "🔥 Cooking in Kitchen"}
                          </span>
                        </div>
                      ) : hasReady ? (
                        <div
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.4)",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              color: "var(--success)",
                            }}
                          >
                            🔔 Dishes Ready ({readyCount}/{items.length})
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            background: "rgba(59, 130, 246, 0.1)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: "var(--info)",
                            }}
                          >
                            📥 Order in Kitchen
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Order Status & Financial Snapshot */}
                <div>
                  {isOccupied && hasActiveItems && (
                    <div style={{ marginTop: "0.25rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.2rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Items ({totalItemsCount}):
                        </span>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: "0.96rem",
                            fontWeight: 800,
                            color: "var(--accent-amber-light)",
                          }}
                        >
                          {formatCurrency(subtotal)}
                        </span>
                      </div>

                      {/* Compact Item Preview List */}
                      <div
                        style={{
                          background: "var(--bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.25rem 0.45rem",
                          fontSize: "0.68rem",
                          color: "var(--text-main)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.15rem",
                        }}
                      >
                        {items.slice(0, 1).map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "0.3rem",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {item.quantity}x {item.name}
                            </span>
                            <span
                              className="font-mono"
                              style={{ flexShrink: 0, fontSize: "0.7rem" }}
                            >
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                        {items.length > 1 && (
                          <div
                            style={{
                              color: "var(--text-dim)",
                              fontSize: "0.64rem",
                              fontStyle: "italic",
                            }}
                          >
                            + {items.length - 1} more dish
                            {items.length > 2 ? "es" : ""}...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Action Button */}
                  <button
                    style={{
                      width: "100%",
                      marginTop: "0.45rem",
                      padding: "0.42rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      background:
                        table.status === "vacant"
                          ? "rgba(var(--surface-rgb),0.05)"
                          : "linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(245, 158, 11, 0.12))",
                      color:
                        table.status === "vacant"
                          ? "var(--text-main)"
                          : "var(--accent-amber-light)",
                      border:
                        table.status === "vacant"
                          ? "1px solid var(--border-subtle)"
                          : "1px solid var(--accent-amber)",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    <Utensils size={12} />
                    <span>
                      {(!isOccupied || !hasActiveItems) ? "Take Order" : "Manage Bill"}
                    </span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Select Seats Modal Popup matching Image 1 with Edit Functionality */}
      {selectedSeatTable && (() => {
        const capacity = Number(selectedSeatTable.capacity || 4);
        const half = Math.ceil(capacity / 2);
        const seats = Array.from({ length: capacity }, (_, i) => {
          const defaultSeatId = `S${i + 1}`;
          const seatId =
            (selectedSeatTable.seatLabels && selectedSeatTable.seatLabels[defaultSeatId]) ||
            (customSeatLabels[defaultSeatId] !== undefined ? customSeatLabels[defaultSeatId] : defaultSeatId);
          const isSelected = selectedSeatIds.includes(seatId) || selectedSeatIds.includes(defaultSeatId);
          return { id: seatId, defaultId: defaultSeatId, isOccupied: false, isSelected };
        });

        const availableCount = Math.max(0, capacity - selectedSeatIds.length);

        // Dynamic seat layout distribution matching 1st image
        let topSeats = [];
        let bottomSeats = [];
        let leftSeats = [];
        let rightSeats = [];

        if (capacity === 2) {
          topSeats = [seats[0]];
          bottomSeats = [seats[1]];
        } else if (capacity === 4) {
          topSeats = [seats[0], seats[1]];
          bottomSeats = [seats[2], seats[3]];
        } else if (capacity === 6) {
          topSeats = [seats[0], seats[1], seats[2]];
          bottomSeats = [seats[3], seats[4], seats[5]];
        } else if (capacity === 8) {
          topSeats = [seats[0], seats[1], seats[2]];
          leftSeats = [seats[3]];
          rightSeats = [seats[4]];
          bottomSeats = [seats[5], seats[6], seats[7]];
        } else {
          // General distribution for capacities > 8
          leftSeats = [seats[0]];
          rightSeats = [seats[1]];
          const remaining = seats.slice(2);
          const half = Math.ceil(remaining.length / 2);
          topSeats = remaining.slice(0, half);
          bottomSeats = remaining.slice(half);
        }

        const maxChairsPerRow = Math.max(2, topSeats.length, bottomSeats.length);
        const dynamicTableWidth = Math.max(260, 60 + maxChairsPerRow * 80);
        const dynamicTableHeight = 160;

        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: isLight ? "rgba(15, 23, 42, 0.45)" : "rgba(3, 7, 18, 0.82)",
              backdropFilter: "blur(7px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedSeatTable(null);
                setIsEditingSeats(false);
              }
            }}
          >
            <div
              style={{
                width: "95%",
                maxWidth: "960px",
                maxHeight: "92vh",
                background: "var(--bg-secondary)",
                borderRadius: "18px",
                border: isLight ? "1.5px solid var(--border-subtle)" : "1.5px solid rgba(37, 99, 235, 0.35)",
                boxShadow: isLight
                  ? "0 25px 60px -12px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0,0,0,0.12)"
                  : "0 25px 65px -10px rgba(0, 0, 0, 0.9), 0 0 35px rgba(16, 185, 129, 0.08)",
                padding: "1.25rem 1.45rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.95rem",
                overflow: "hidden",
                transition: "all 0.2s ease",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: isLight ? "rgba(217, 119, 6, 0.12)" : "rgba(245, 158, 11, 0.12)",
                      border: isLight ? "1px solid rgba(217, 119, 6, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Armchair size={26} color="var(--accent-amber)" strokeWidth={2.4} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        color: "var(--text-main)",
                        margin: 0,
                        lineHeight: 1.25,
                      }}
                    >
                      {selectedSeatTable.name || `Table ${selectedSeatTable.id}`} — Select Seats
                    </h2>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-dim)",
                        marginTop: "0.2rem",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                      }}
                    >
                      <span>{selectedSeatTable.section || "Main Hall"}</span>
                      <span>•</span>
                      <span
                        style={{
                          color: "var(--status-vacant)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: "var(--status-vacant)",
                            display: "inline-block",
                          }}
                        />
                        {availableCount} seats available
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  {/* Edit Seats Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsEditingSeats(!isEditingSeats)}
                    title={isEditingSeats ? "Finish editing seats" : "Edit number of seats or seat numbers"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.42rem 0.85rem",
                      borderRadius: "8px",
                      background: isEditingSeats
                        ? (isLight ? "rgba(217, 119, 6, 0.18)" : "rgba(245, 158, 11, 0.25)")
                        : (isLight ? "rgba(217, 119, 6, 0.08)" : "rgba(245, 158, 11, 0.1)"),
                      border: isEditingSeats
                        ? "1.5px solid var(--accent-amber)"
                        : "1px solid var(--border-focus)",
                      color: "var(--accent-amber)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isEditingSeats ? (
                      <>
                        <Check size={14} color="var(--accent-amber)" strokeWidth={2.5} />
                        <span>Done</span>
                      </>
                    ) : (
                      <>
                        <Edit3 size={14} color="var(--accent-amber)" />
                        <span>Edit Seats</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeatTable(null);
                      setIsEditingSeats(false);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "0.4rem",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-amber)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <X size={22} strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              {/* Edit Seats Config Panel (Displayed when isEditingSeats is active) */}
              {isEditingSeats && (
                <div
                  style={{
                    background: isLight ? "rgba(217, 119, 6, 0.06)" : "rgba(245, 158, 11, 0.08)",
                    border: isLight ? "1.5px solid rgba(217, 119, 6, 0.3)" : "1.5px solid rgba(245, 158, 11, 0.45)",
                    borderRadius: "12px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <Edit3 size={15} color="var(--accent-amber)" />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--accent-amber)" }}>
                        Seats (Chairs) Count:
                      </span>
                    </div>

                    {/* Stepper: - count + */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        background: isLight ? "#ffffff" : "#070e1b",
                        border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(var(--surface-rgb),0.15)",
                        borderRadius: "8px",
                        padding: "2px 4px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSaveSeatConfig(capacity - 1)}
                        disabled={capacity <= 1}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          background: capacity <= 1 ? "transparent" : (isLight ? "rgba(217, 119, 6, 0.12)" : "rgba(245, 158, 11, 0.18)"),
                          border: "none",
                          color: capacity <= 1 ? "var(--text-dim)" : "var(--accent-amber)",
                          fontWeight: 900,
                          fontSize: "1.1rem",
                          cursor: capacity <= 1 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        -
                      </button>
                      <span
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 800,
                          color: "var(--text-main)",
                          minWidth: "36px",
                          textAlign: "center",
                        }}
                      >
                        {capacity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaveSeatConfig(capacity + 1)}
                        disabled={capacity >= 24}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          background: capacity >= 24 ? "transparent" : (isLight ? "rgba(217, 119, 6, 0.12)" : "rgba(245, 158, 11, 0.18)"),
                          border: "none",
                          color: capacity >= 24 ? "var(--text-dim)" : "var(--accent-amber)",
                          fontWeight: 900,
                          fontSize: "1.1rem",
                          cursor: capacity >= 24 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>
                        Presets:
                      </span>
                      {[2, 4, 6, 8, 10, 12].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleSaveSeatConfig(num)}
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "6px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background:
                              capacity === num
                                ? "var(--accent-amber)"
                                : isLight
                                ? "#f1f5f9"
                                : "rgba(var(--surface-rgb),0.06)",
                            color: capacity === num ? "#ffffff" : isLight ? "#334155" : "var(--text-muted)",
                            border:
                              capacity === num
                                ? "1px solid var(--accent-amber)"
                                : isLight
                                ? "1px solid #e2e8f0"
                                : "1px solid rgba(var(--surface-rgb),0.1)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {num} Seats
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Two-Column Body Layout matching Image 1 */}
              <div
                style={{
                  display: "flex",
                  gap: "1.15rem",
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  paddingRight: "2px",
                }}
              >
                {/* Left Column: Dynamic Dining Scene matching Image 1 */}
          <div
            style={{
              flex: 1.5,
              background: "#f7f4ea",
              borderRadius: "16px",
              border: "1.5px solid #dcd3c3",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
              padding: "1.75rem 1rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              minHeight: "410px",
              overflow: "hidden",
            }}
          >
            {/* Dining Room Background matching Image 1 */}
            <DiningRoomBackground />

            {/* Interactive Dynamic Dining Cluster: Top Chairs + Table (+ Side Chairs) + Bottom Chairs */}
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      zIndex: 2,
                    }}
                  >
                    {/* Top Row: Dynamic Chairs */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        gap: "18px",
                        marginBottom: "-12px",
                        zIndex: 1,
                      }}
                    >
                      {topSeats.map((seat) => (
                        <TopDiningChair
                          key={seat.defaultId || seat.id}
                          seat={seat}
                          isSelected={seat.isSelected}
                          isOccupied={false}
                          isLight={isLight}
                          onToggle={() => {
                            if (!isEditingSeats) {
                              handleToggleSeat(seat.id);
                            }
                          }}
                        />
                      ))}
                    </div>

                    {/* Middle Row: Left Chair(s) + Dynamic Table + Right Chair(s) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 3,
                      }}
                    >
                      {/* Left Side Chair(s) */}
                      {leftSeats.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            marginRight: "-8px",
                            zIndex: 4,
                          }}
                        >
                          {leftSeats.map((seat) => (
                            <SideDiningChair
                              key={seat.defaultId || seat.id}
                              seat={seat}
                              side="left"
                              isSelected={seat.isSelected}
                              isOccupied={false}
                              isLight={isLight}
                              onToggle={() => {
                                if (!isEditingSeats) {
                                  handleToggleSeat(seat.id);
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Dynamic Scalable Wooden Dining Table matching Image 1 */}
                      <DynamicDiningTableComponent
                        width={dynamicTableWidth}
                        height={dynamicTableHeight}
                        topCount={topSeats.length}
                        bottomCount={bottomSeats.length}
                        isLight={isLight}
                      />

                      {/* Right Side Chair(s) */}
                      {rightSeats.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            marginLeft: "-8px",
                            zIndex: 4,
                          }}
                        >
                          {rightSeats.map((seat) => (
                            <SideDiningChair
                              key={seat.defaultId || seat.id}
                              seat={seat}
                              side="right"
                              isSelected={seat.isSelected}
                              isOccupied={false}
                              isLight={isLight}
                              onToggle={() => {
                                if (!isEditingSeats) {
                                  handleToggleSeat(seat.id);
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Dynamic Chairs */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        gap: "18px",
                        marginTop: "-16px",
                        zIndex: 5,
                      }}
                    >
                      {bottomSeats.map((seat) => (
                        <BottomDiningChair
                          key={seat.defaultId || seat.id}
                          seat={seat}
                          isSelected={seat.isSelected}
                          isOccupied={false}
                          isLight={isLight}
                          onToggle={() => {
                            if (!isEditingSeats) {
                              handleToggleSeat(seat.id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Two Cards matching Image 1 */}
                <div
                  style={{
                    width: "290px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                    flexShrink: 0,
                  }}
                >
                  {/* Card 1: Table Details */}
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "14px",
                      padding: "1.1rem 1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <Armchair size={19} color="var(--accent-amber)" strokeWidth={2.4} />
                      <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.94rem" }}>
                        Table Details
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-dim)" }}>Table No:</span>
                        <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.88rem" }}>
                          T{selectedSeatTable.name ? selectedSeatTable.name.replace(/^(?:table|t)\s*[-–—]?\s*/i, "") : selectedSeatTable.id}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-dim)" }}>Area:</span>
                        <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                          {selectedSeatTable.section || "Main Hall"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-dim)" }}>Capacity:</span>
                        <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                          {capacity} Chairs
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-dim)" }}>Assigned Server:</span>
                        <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                          {selectedSeatTable.server || selectedSeatTable.waiter || "Vikram S."}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Seat Legend */}
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "14px",
                      padding: "1.1rem 1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.95rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <Armchair size={19} color="var(--accent-amber)" strokeWidth={2.4} />
                      <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.94rem" }}>
                        Seat Legend
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", fontSize: "0.82rem" }}>
                      {/* Available */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span
                            style={{
                              width: "13px",
                              height: "13px",
                              borderRadius: "50%",
                              background: "#10b981",
                              boxShadow: "0 0 10px #10b981",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ color: "var(--text-main)", fontWeight: 600 }}>Available</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>(Click to select)</div>
                          </div>
                        </div>
                        <span style={{ color: "var(--text-main)", fontWeight: 800, fontSize: "0.92rem" }}>
                          {availableCount}
                        </span>
                      </div>

                      {/* Selected */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span
                            style={{
                              width: "13px",
                              height: "13px",
                              borderRadius: "50%",
                              background: "#f59e0b",
                              boxShadow: "0 0 10px #f59e0b",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: "var(--text-main)", fontWeight: 600 }}>Selected</span>
                        </div>
                        <span style={{ color: "var(--text-main)", fontWeight: 800, fontSize: "0.92rem" }}>
                          {selectedSeatIds.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border-subtle)",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Armchair size={30} color="var(--accent-amber)" strokeWidth={2.3} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "var(--text-dim)", fontSize: "0.74rem", fontWeight: 500 }}>
                      Selected Seats
                    </span>
                    <span style={{ color: "var(--text-main)", fontSize: "1.15rem", fontWeight: 800 }}>
                      {selectedSeatIds.length} / {capacity}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeatTable(null);
                      setIsEditingSeats(false);
                    }}
                    style={{
                      background: "transparent",
                      border: isLight ? "1.5px solid var(--accent-amber)" : "1.5px solid rgba(245, 158, 11, 0.65)",
                      color: "var(--accent-amber)",
                      padding: "0.58rem 1.7rem",
                      borderRadius: "8px",
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isLight ? "rgba(217, 119, 6, 0.08)" : "rgba(245, 158, 11, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSeats}
                    style={{
                      background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                      color: "#ffffff",
                      border: "none",
                      padding: "0.6rem 1.8rem",
                      borderRadius: "8px",
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(249, 115, 22, 0.4)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = "brightness(1.1)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = "none";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    Confirm Seats
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
