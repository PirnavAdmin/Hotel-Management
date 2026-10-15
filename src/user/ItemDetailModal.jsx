import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  Clock,
  Flame,
  Sparkles,
  FileText,
  Check,
  Trash2,
  Utensils,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { sounds } from "../utils/audio";
import { MENU_CATEGORIES } from "../data/menuData";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";

const PRESET_NOTES = [
  "Extra Spicy 🌶️",
  "Less Spicy / Mild",
  "No Coriander 🌿",
  "Extra Salan & Raita 🥣",
  "No Onion & Garlic 🧅",
  "Well Done / Crispy",
  "Sauce on the Side",
  "Parcel / Takeaway 📦",
];

export function ItemDetailModal({
  item,
  existingCartItem,
  onClose,
  onConfirm,
  onRemove,
}) {
  const [quantity, setQuantity] = useState(
    existingCartItem ? existingCartItem.quantity : 1,
  );
  const [notes, setNotes] = useState(
    existingCartItem ? existingCartItem.notes || "" : "",
  );

  useEffect(() => {
    if (existingCartItem) {
      setQuantity(existingCartItem.quantity);
      setNotes(existingCartItem.notes || "");
    } else {
      setQuantity(1);
      setNotes("");
    }
  }, [item, existingCartItem]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const categoryObj = MENU_CATEGORIES.find((c) => c.id === item.category);
  const totalPrice = item.price * quantity;
  const isAlreadyInCart = !!existingCartItem;

  const handlePresetClick = (preset) => {
    if (!notes.trim()) {
      setNotes(preset);
    } else if (!notes.includes(preset)) {
      setNotes(`${notes.trim()}, ${preset}`);
    }
  };

  const handleSubmit = () => {
    if (quantity <= 0) {
      if (isAlreadyInCart && onRemove) {
        sounds.playRemoveItem();
        onRemove(item.id);
      }
      onClose();
      return;
    }

    sounds.playAddItem();
    onConfirm({
      ...item,
      quantity,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
        animation: "posModalFadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary, #1a1d29)",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 158, 11, 0.15)",
          overflow: "hidden",
          animation: "posModalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style>{`
          @keyframes posModalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes posModalSlideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Modal Image Header Banner */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "190px",
            overflow: "hidden",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            flexShrink: 0,
          }}
        >
          <img
            src={getMenuItemImage(item)}
            alt={item.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => handleDishImageError(e, item)}
          />

          {/* Gradient Overlay for Readable Badges */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, rgba(15,23,42,0.85) 100%)",
            }}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.85)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.65)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <X size={18} />
          </button>

          {/* Badges on Image */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {/* Veg / Non-Veg badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(0, 0, 0, 0.7)",
                backdropFilter: "blur(6px)",
                padding: "3px 8px",
                borderRadius: "6px",
                border: item.isVeg
                  ? "1px solid rgba(16, 185, 129, 0.4)"
                  : "1px solid rgba(239, 68, 68, 0.4)",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: item.isVeg ? "#34d399" : "#f87171",
                letterSpacing: "0.5px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: item.isVeg ? "#10b981" : "#ef4444",
                }}
              />
              {item.isVeg ? "VEG" : "NON-VEG"}
            </div>

            {/* Chef Special Badge */}
            {item.isChefSpecial && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#000000",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.4)",
                }}
              >
                <Sparkles size={11} />
                <span>Chef's Special</span>
              </div>
            )}
          </div>

          {/* Bottom Banner Info */}
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "14px",
              right: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "rgba(255, 255, 255, 0.85)",
            }}
          >
            {categoryObj && (
              <span
                style={{
                  background: "rgba(0, 0, 0, 0.55)",
                  backdropFilter: "blur(4px)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  color: "var(--accent-amber-light, #fcd34d)",
                  fontWeight: 600,
                  fontSize: "0.72rem",
                }}
              >
                {categoryObj.name}
              </span>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {item.prepTime && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(0, 0, 0, 0.55)",
                    backdropFilter: "blur(4px)",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                >
                  <Clock size={11} color="var(--accent-amber)" />
                  <span>{item.prepTime}</span>
                </div>
              )}

              {item.spiceLevel > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px",
                    background: "rgba(0, 0, 0, 0.55)",
                    backdropFilter: "blur(4px)",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    color: "#f87171",
                    fontWeight: 600,
                  }}
                  title={`Spice Level: ${item.spiceLevel}/3`}
                >
                  {[...Array(item.spiceLevel)].map((_, i) => (
                    <Flame key={i} size={11} fill="#ef4444" color="#ef4444" />
                  ))}
                  <span style={{ fontSize: "0.68rem", marginLeft: "2px" }}>
                    {item.spiceLevel === 1
                      ? "Mild"
                      : item.spiceLevel === 2
                      ? "Medium"
                      : "Spicy"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: "1.25rem 1.4rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
          }}
        >
          {/* Title & Price Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.25,
                  margin: 0,
                }}
              >
                {item.name}
              </h3>
              {isAlreadyInCart && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "4px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--accent-amber)",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  ✓ Currently in Table Order ({existingCartItem.quantity}x)
                </span>
              )}
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span
                className="font-mono"
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "var(--accent-amber-light, #fbbf24)",
                }}
              >
                {formatCurrency(item.price)}
              </span>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-dim, #94a3b8)",
                }}
              >
                per portion
              </div>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <p
              style={{
                fontSize: "0.82rem",
                lineHeight: 1.5,
                color: "var(--text-secondary, #cbd5e1)",
                margin: 0,
                background: "rgba(255, 255, 255, 0.03)",
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {item.description}
            </p>
          )}

          {/* Quantity Selector Card */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                Quantity
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-dim, #94a3b8)",
                }}
              >
                {quantity > 0 ? (
                  <>
                    {quantity} × {formatCurrency(item.price)} ={" "}
                    <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>
                      {formatCurrency(totalPrice)}
                    </span>
                  </>
                ) : (
                  <span style={{ color: "#ef4444" }}>Item will be removed</span>
                )}
              </div>
            </div>

            {/* Stepper Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "var(--bg-primary, #0f172a)",
                borderRadius: "8px",
                padding: "4px 6px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  sounds.playRemoveItem();
                  setQuantity((prev) => Math.max(isAlreadyInCart ? 0 : 1, prev - 1));
                }}
                disabled={!isAlreadyInCart && quantity <= 1}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background:
                    quantity <= 1 && isAlreadyInCart
                      ? "rgba(239, 68, 68, 0.2)"
                      : "rgba(255, 255, 255, 0.08)",
                  border:
                    quantity <= 1 && isAlreadyInCart
                      ? "1px solid rgba(239, 68, 68, 0.4)"
                      : "none",
                  color:
                    quantity <= 1 && isAlreadyInCart ? "#ef4444" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: !isAlreadyInCart && quantity <= 1 ? "not-allowed" : "pointer",
                  opacity: !isAlreadyInCart && quantity <= 1 ? 0.4 : 1,
                  transition: "all 0.15s ease",
                }}
                title={quantity === 1 && isAlreadyInCart ? "Remove from order" : "Decrease quantity"}
              >
                {quantity === 1 && isAlreadyInCart ? (
                  <Trash2 size={14} />
                ) : (
                  <Minus size={15} />
                )}
              </button>

              <span
                className="font-mono"
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  minWidth: "32px",
                  textAlign: "center",
                  color: quantity === 0 ? "#ef4444" : "#ffffff",
                }}
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => {
                  sounds.playAddItem();
                  setQuantity((prev) => prev + 1);
                }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: "var(--accent-amber, #f59e0b)",
                  border: "none",
                  color: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontWeight: 800,
                  transition: "all 0.15s ease",
                }}
                title="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Kitchen / Special Request Notes */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginBottom: "6px",
              }}
            >
              <FileText size={13} color="var(--accent-amber)" />
              <label
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--text-secondary, #e2e8f0)",
                }}
              >
                Kitchen Note / Customization
              </label>
            </div>

            <input
              type="text"
              placeholder="e.g. Extra salan, spicy, no coriander..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              style={{
                width: "100%",
                background: "var(--bg-primary, #0f172a)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                borderRadius: "8px",
                padding: "0.6rem 0.8rem",
                color: "#ffffff",
                fontSize: "0.82rem",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--accent-amber)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.14)";
              }}
            />

            {/* Fast Quick-Pick Chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "5px",
                marginTop: "8px",
              }}
            >
              {PRESET_NOTES.map((preset) => {
                const isSelected = notes.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    style={{
                      background: isSelected
                        ? "rgba(245, 158, 11, 0.2)"
                        : "rgba(255, 255, 255, 0.05)",
                      border: isSelected
                        ? "1px solid var(--accent-amber)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      color: isSelected
                        ? "var(--accent-amber)"
                        : "var(--text-dim, #94a3b8)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            padding: "1rem 1.4rem",
            background: "var(--bg-tertiary, #12151e)",
            borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "var(--text-secondary, #cbd5e1)",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            }}
          >
            Cancel
          </button>

          {quantity === 0 && isAlreadyInCart ? (
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                flex: 2,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "#ef4444",
                border: "none",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
              }}
            >
              <Trash2 size={16} />
              <span>Remove from Order</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                flex: 2,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                border: "none",
                color: "#000000",
                fontSize: "0.88rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
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
              {isAlreadyInCart ? (
                <>
                  <Check size={16} />
                  <span>Update Order {formatCurrency(totalPrice)}</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Add to Order {formatCurrency(totalPrice)}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
