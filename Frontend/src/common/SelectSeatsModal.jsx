import React, { useState, useEffect } from "react";
import { Armchair, Check, Edit3, X, CheckCircle2 } from "lucide-react";

export function TopDiningChair({ seat, isSelected, isOccupied, onToggle, isLight }) {
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
          : isLight
          ? "drop-shadow(0 0 10px rgba(16, 185, 129, 0.75)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))"
          : "drop-shadow(0 0 10px rgba(16, 185, 129, 0.65)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))",
      }}
      onMouseEnter={(e) => {
        if (!isOccupied && !isSelected) {
          e.currentTarget.style.transform = "translateY(-6px) scale(1.06)";
          e.currentTarget.style.filter =
            "drop-shadow(0 0 20px rgba(16, 185, 129, 0.95)) drop-shadow(0 10px 18px rgba(0,0,0,0.3))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isSelected ? "scale(1.08)" : "scale(1)";
        e.currentTarget.style.filter = isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : isLight
          ? "drop-shadow(0 0 10px rgba(16, 185, 129, 0.75)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))"
          : "drop-shadow(0 0 10px rgba(16, 185, 129, 0.65)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))";
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

        {/* Seat Cushion Top */}
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

        {/* Backrest */}
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

export function BottomDiningChair({ seat, isSelected, isOccupied, onToggle, isLight }) {
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
          : isLight
          ? "drop-shadow(0 0 10px rgba(16, 185, 129, 0.75)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))"
          : "drop-shadow(0 0 10px rgba(16, 185, 129, 0.65)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))",
      }}
      onMouseEnter={(e) => {
        if (!isOccupied && !isSelected) {
          e.currentTarget.style.transform = "translateY(-6px) scale(1.06)";
          e.currentTarget.style.filter =
            "drop-shadow(0 0 20px rgba(16, 185, 129, 0.95)) drop-shadow(0 10px 18px rgba(0,0,0,0.3))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isSelected ? "scale(1.08)" : "scale(1)";
        e.currentTarget.style.filter = isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : isLight
          ? "drop-shadow(0 0 10px rgba(16, 185, 129, 0.75)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))"
          : "drop-shadow(0 0 10px rgba(16, 185, 129, 0.65)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))";
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

        {/* 4 Tapered Wooden Legs */}
        <polygon points="17,56 14,88 18,88 20,56" fill="#522b14" />
        <polygon points="46,56 48,88 52,88 49,56" fill="#46230f" />
        <polygon points="13,60 8,93 13,93 17,60" fill="#754124" />
        <polygon points="49,60 53,93 58,93 53,60" fill="#67391f" />

        {/* Seat cushion underside */}
        <path
          d="M 10 50 Q 33 46 56 50 L 54 62 Q 33 65 12 62 Z"
          fill={isSelected ? "#ea580c" : isOccupied ? "#475569" : "#10b981"}
        />

        {/* Backrest viewed from rear */}
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

export function SideDiningChair({ seat, side, isSelected, isOccupied, onToggle, isLight }) {
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
          : isLight
          ? "drop-shadow(0 0 10px rgba(16, 185, 129, 0.75)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))"
          : "drop-shadow(0 0 10px rgba(16, 185, 129, 0.65)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))",
      }}
      onMouseEnter={(e) => {
        if (!isOccupied && !isSelected) {
          e.currentTarget.style.transform = "translateY(-6px) scale(1.06)";
          e.currentTarget.style.filter =
            "drop-shadow(0 0 20px rgba(16, 185, 129, 0.95)) drop-shadow(0 10px 18px rgba(0,0,0,0.3))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isSelected ? "scale(1.08)" : "scale(1)";
        e.currentTarget.style.filter = isOccupied
          ? "grayscale(0.7) opacity(0.4)"
          : isSelected
          ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
          : isLight
          ? "drop-shadow(0 0 10px rgba(16, 185, 129, 0.75)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))"
          : "drop-shadow(0 0 10px rgba(16, 185, 129, 0.65)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))";
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

        {/* Seat Cushion */}
        <path
          d="M 14 38 Q 32 37 46 41 L 43 51 Q 30 48 13 47 Z"
          fill={isSelected ? "#ea580c" : isOccupied ? "#475569" : "#10b981"}
        />

        {/* Backrest on the side */}
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

export function DynamicDiningTableComponent({ width, height, topCount, bottomCount, isLight }) {
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

        {/* 3 Tapered Wooden Table Legs */}
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

        {/* Table Top Surface */}
        <path
          d={`M 26,12 L ${width - 26},12 Q ${width - 12},12 ${width - 14},24 L ${width - 20},80 Q ${width - 24},90 ${width - 38},90 L 38,90 Q 24,90 20,80 L 14,24 Q 12,12 26,12 Z`}
          fill="url(#tableTopGrad)"
          stroke="#ddcaa9"
          strokeWidth="1.2"
        />

        {/* Center Bread Basket */}
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

        {/* Salt & Pepper Shakers */}
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

export function SelectSeatsModal({
  table,
  isOpen,
  onClose,
  onUpdateTable,
  isLight = false,
  role = "user",
}) {
  const [currentTable, setCurrentTable] = useState(table);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [isEditingSeats, setIsEditingSeats] = useState(false);
  const [customSeatLabels, setCustomSeatLabels] = useState({});

  useEffect(() => {
    if (table) {
      setCurrentTable(table);
      setCustomSeatLabels(table.seatLabels || {});
      if (Array.isArray(table.selectedSeats) && table.selectedSeats.length > 0) {
        setSelectedSeatIds([...table.selectedSeats]);
      } else if (Number(table.guests) > 0) {
        const initial = [];
        for (let i = 1; i <= Math.min(Number(table.capacity) || 4, Number(table.guests)); i++) {
          initial.push(`S${i}`);
        }
        setSelectedSeatIds(initial);
      } else {
        setSelectedSeatIds([]);
      }
    }
  }, [table]);

  if (!isOpen || !currentTable) return null;

  const capacity = Number(currentTable.capacity || 4);
  const seats = Array.from({ length: capacity }, (_, i) => {
    const defaultSeatId = `S${i + 1}`;
    const seatId =
      (currentTable.seatLabels && currentTable.seatLabels[defaultSeatId]) ||
      (customSeatLabels[defaultSeatId] !== undefined ? customSeatLabels[defaultSeatId] : defaultSeatId);
    const isSelected = selectedSeatIds.includes(seatId) || selectedSeatIds.includes(defaultSeatId);
    return { id: seatId, defaultId: defaultSeatId, isOccupied: false, isSelected };
  });

  const availableCount = Math.max(0, capacity - selectedSeatIds.length);

  // Seat positioning matching Image 1
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

  const handleToggleSeat = (seatId) => {
    if (isEditingSeats) return;
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  };

  const handleSaveSeatConfig = (newCapacity, newLabels = customSeatLabels) => {
    const updatedCap = Math.max(1, Math.min(24, Number(newCapacity) || 4));
    const updated = {
      ...currentTable,
      capacity: updatedCap,
      seatLabels: newLabels,
    };
    setCurrentTable(updated);

    try {
      const rawTables = localStorage.getItem("gourmet_pos_tables_v2_inr");
      if (rawTables) {
        const parsed = JSON.parse(rawTables);
        if (Array.isArray(parsed)) {
          const up = parsed.map((t) =>
            String(t.id) === String(currentTable.id)
              ? { ...t, capacity: updatedCap, seatLabels: newLabels }
              : t
          );
          localStorage.setItem("gourmet_pos_tables_v2_inr", JSON.stringify(up));
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: up }));
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (onUpdateTable) {
      onUpdateTable(updated);
    }
  };

  const handleConfirmSeats = () => {
    const count =
      selectedSeatIds.length > 0
        ? selectedSeatIds.length
        : Number(currentTable.guests) > 0
        ? Number(currentTable.guests)
        : Number(currentTable.capacity) || 2;

    const finalStatus = count > 0 ? "occupied" : currentTable.status;
    const finalSeats =
      selectedSeatIds.length > 0
        ? [...selectedSeatIds]
        : Array.from({ length: count }, (_, i) => `S${i + 1}`);

    const finalTable = {
      ...currentTable,
      capacity: currentTable.capacity,
      seatLabels: currentTable.seatLabels || customSeatLabels,
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
          const up = parsed.map((t) =>
            String(t.id) === String(currentTable.id)
              ? {
                  ...t,
                  capacity: currentTable.capacity,
                  seatLabels: currentTable.seatLabels || customSeatLabels,
                  guests: count,
                  occupiedChairs: count,
                  selectedSeats: finalSeats,
                  status: finalStatus,
                }
              : t
          );
          localStorage.setItem("gourmet_pos_tables_v2_inr", JSON.stringify(up));
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: up }));
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (onUpdateTable) {
      onUpdateTable(finalTable);
    }

    onClose();
  };

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
          onClose();
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
            ? "0 25px 60px -12px rgba(0, 0, 0, 0.18)"
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
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
                {currentTable.name || `Table ${currentTable.id}`} — Select Seats
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
                <span>{currentTable.section || "Main Hall"}</span>
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
                onClose();
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

        {/* Edit Seats Config Panel */}
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
              background: isLight
                ? "radial-gradient(circle at 50% 50%, #fbf8f2 0%, #f1eae0 100%)"
                : "radial-gradient(circle at 50% 50%, #151e2f 0%, #090e18 100%)",
              borderRadius: "16px",
              border: isLight ? "1px solid #e5dccf" : "1px solid rgba(var(--surface-rgb),0.08)",
              boxShadow: isLight
                ? "inset 0 0 35px rgba(220, 205, 185, 0.45)"
                : "inset 0 0 45px rgba(0, 0, 0, 0.65)",
              padding: "1.75rem 1rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              minHeight: "410px",
              overflow: "auto",
            }}
          >
            {/* Atmospheric Background Accents from Image 1 */}
            <div
              style={{
                position: "absolute",
                top: "22px",
                left: "20%",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#d96b34",
                opacity: isLight ? 0.75 : 0.35,
                filter: "blur(1px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "28px",
                right: "20%",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#dc7f48",
                opacity: isLight ? 0.75 : 0.35,
                filter: "blur(1px)",
                pointerEvents: "none",
              }}
            />

            {/* Ground Oval Glow / Rug from Image 1 */}
            <div
              style={{
                position: "absolute",
                width: `${dynamicTableWidth + 160}px`,
                height: "320px",
                borderRadius: "50%",
                background: isLight
                  ? "radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.95) 0%, rgba(243, 230, 212, 0.65) 60%, transparent 75%)"
                  : "radial-gradient(ellipse at 50% 50%, rgba(246, 239, 227, 0.08) 0%, rgba(246, 239, 227, 0.02) 60%, transparent 75%)",
                pointerEvents: "none",
                transition: "width 0.35s ease",
              }}
            />

            {/* Interactive Dynamic Dining Cluster */}
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

                <DynamicDiningTableComponent
                  width={dynamicTableWidth}
                  height={dynamicTableHeight}
                  topCount={topSeats.length}
                  bottomCount={bottomSeats.length}
                  isLight={isLight}
                />

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
                    T{currentTable.name ? currentTable.name.replace(/^(?:table|t)\s*[-–—]?\s*/i, "") : currentTable.id}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)" }}>Area:</span>
                  <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                    {currentTable.section || "Main Hall"}
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
                    {currentTable.server || currentTable.waiter || "Staff"}
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
                onClose();
                setIsEditingSeats(false);
              }}
              style={{
                padding: "0.65rem 1.45rem",
                borderRadius: "10px",
                background: "transparent",
                border: "1px solid var(--border-focus)",
                color: "var(--text-main)",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
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
                padding: "0.65rem 1.65rem",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "0.88rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <CheckCircle2 size={16} />
              <span>Confirm Seats</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
