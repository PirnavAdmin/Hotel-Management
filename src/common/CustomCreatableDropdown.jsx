import React, { useState } from "react";
import { Plus, Check, X } from "lucide-react";

/**
 * CustomCreatableDropdown
 * Renders a standard native <select> dropdown as usual.
 * Adds "+ Add Custom..." at the bottom of the dropdown items,
 * and renders a perfectly contained, cleanly aligned custom input
 * so users can type custom data from keyboard without layout overflow.
 */
export function CustomCreatableDropdown({
  value = "",
  onChange,
  options = [],
  placeholder = "Select an option...",
  required = false,
  allowCustom = true,
  onSaveCustomOption = null,
  style = {},
  selectStyle = {},
  name = undefined,
  id = undefined,
  customPlaceholder = "Type custom name...",
}) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");

  // Normalize options to { value, label }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return {
      value: opt.value ?? opt.id ?? opt.name,
      label: opt.label ?? opt.name ?? opt.value,
    };
  });

  // Check if current value already exists in normalized options
  const valueExists = normalizedOptions.some(
    (opt) => String(opt.value).toLowerCase() === String(value).toLowerCase()
  );

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === "__custom__") {
      setIsCustomMode(true);
      setCustomText("");
    } else {
      setIsCustomMode(false);
      onChange?.(val);
    }
  };

  const handleApplyCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;

    // Save to persistent storage / custom list
    if (onSaveCustomOption) {
      onSaveCustomOption(trimmed);
    }

    // Set as the current selected value
    onChange?.(trimmed);
    setIsCustomMode(false);
    setCustomText("");
  };

  const handleCancelCustom = () => {
    setIsCustomMode(false);
    setCustomText("");
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", ...style }}>
      {/* Standard / usual native dropdown */}
      <select
        id={id}
        name={name}
        required={required}
        value={isCustomMode ? "__custom__" : (value || "")}
        onChange={handleSelectChange}
        style={{
          width: "100%",
          height: "38px",
          background: "var(--bg-tertiary)",
          border: isCustomMode
            ? "1.5px solid var(--accent-amber)"
            : "1.5px solid var(--border-subtle)",
          borderRadius: "8px",
          padding: "0 0.85rem",
          color: "var(--text-main)",
          fontWeight: 600,
          fontSize: "0.9rem",
          outline: "none",
          cursor: "pointer",
          boxSizing: "border-box",
          ...selectStyle,
        }}
      >
        {/* If current value is custom and not yet in normalizedOptions, include it */}
        {value && !valueExists && !isCustomMode && (
          <option value={value}>{value}</option>
        )}

        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}

        {allowCustom && (
          <option
            value="__custom__"
            style={{
              color: "var(--accent-amber)",
              fontWeight: 700,
              background: "var(--bg-secondary)",
            }}
          >
            + Add Custom...
          </option>
        )}
      </select>

      {/* Custom input at the bottom of the dropdown item */}
      {isCustomMode ? (
        <div
          style={{
            marginTop: "6px",
            display: "flex",
            alignItems: "center",
            height: "36px",
            width: "100%",
            background: "var(--bg-tertiary)",
            border: "1.5px solid var(--accent-amber)",
            borderRadius: "8px",
            padding: "2px 4px 2px 8px",
            boxSizing: "border-box",
            overflow: "hidden",
            boxShadow: "0 0 0 2px rgba(245, 158, 11, 0.15)",
          }}
        >
          <input
            type="text"
            autoFocus
            placeholder={customPlaceholder}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApplyCustom();
              } else if (e.key === "Escape") {
                e.preventDefault();
                handleCancelCustom();
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              height: "100%",
              background: "transparent",
              border: "none",
              color: "var(--text-main)",
              fontWeight: 600,
              fontSize: "0.84rem",
              outline: "none",
              padding: 0,
            }}
          />
          <button
            type="button"
            onClick={handleApplyCustom}
            style={{
              height: "28px",
              padding: "0 9px",
              background: "linear-gradient(135deg, #f59e0b, #ea580c)",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 800,
              fontSize: "0.76rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              flexShrink: 0,
              boxShadow: "0 1px 4px rgba(234, 88, 12, 0.3)",
              whiteSpace: "nowrap",
            }}
            title="Add custom option"
          >
            <Check size={12} strokeWidth={3} />
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={handleCancelCustom}
            style={{
              height: "28px",
              width: "24px",
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginLeft: "2px",
            }}
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      ) : allowCustom ? (
        <div
          style={{
            marginTop: "3px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(true);
              setCustomText("");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent-amber)",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
              padding: "2px 4px",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              opacity: 0.85,
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
          >
            <Plus size={11} />
            <span>Type custom</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
