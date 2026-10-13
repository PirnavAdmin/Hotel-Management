import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";

/**
 * CustomCreatableDropdown
 * Allows user to type freely from keyboard OR select from existing options.
 * Supports custom entries, keyboard navigation, and theme variables.
 */
export function CustomCreatableDropdown({
  value = "",
  onChange,
  options = [],
  placeholder = "Type or select...",
  required = false,
  allowCustom = true,
  onSaveCustomOption = null,
  style = {},
  inputStyle = {},
  name = undefined,
  id = undefined,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize options to { value, label }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return {
      value: opt.id || opt.value || opt.name,
      label: opt.name || opt.label || opt.value,
    };
  });

  // Current display label
  const matchedOpt = normalizedOptions.find(
    (o) => String(o.value).toLowerCase() === String(value).toLowerCase()
  );
  const displayValue = value || "";

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (val) => {
    onChange(val);
    if (onSaveCustomOption) {
      onSaveCustomOption(val);
    }
    setIsOpen(false);
  };

  // Filter options based on current typed input
  const query = String(displayValue).trim().toLowerCase();
  const filteredOptions = normalizedOptions.filter((opt) =>
    String(opt.label).toLowerCase().includes(query)
  );

  const isExactMatch = normalizedOptions.some(
    (opt) => String(opt.label).toLowerCase() === query || String(opt.value).toLowerCase() === query
  );

  const showCustomOption =
    allowCustom && query.length > 0 && !isExactMatch;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        ...style,
      }}
    >
      {/* Input wrapper */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
        }}
      >
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          required={required}
          value={displayValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (displayValue.trim()) {
                handleSelect(displayValue.trim());
              }
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          style={{
            width: "100%",
            background: "var(--bg-tertiary)",
            border: isOpen
              ? "1.5px solid var(--accent-amber)"
              : "1.5px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "0.65rem 2.2rem 0.65rem 0.85rem",
            color: "var(--text-main)",
            fontWeight: 600,
            fontSize: "0.92rem",
            outline: "none",
            transition: "all 0.15s ease",
            boxSizing: "border-box",
            ...inputStyle,
          }}
        />

        {/* Dropdown toggle button (chevron) */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen && inputRef.current) {
              inputRef.current.focus();
            }
          }}
          style={{
            position: "absolute",
            right: "8px",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            borderRadius: "4px",
            transition: "transform 0.15s ease, color 0.15s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          title="Toggle dropdown options"
        >
          <ChevronDown size={17} />
        </button>
      </div>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 5px)",
            left: 0,
            right: 0,
            maxHeight: "220px",
            overflowY: "auto",
            background: "var(--bg-card)",
            border: "1.5px solid var(--border-card)",
            borderRadius: "10px",
            boxShadow: "var(--shadow-lg)",
            zIndex: 9999,
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            animation: "fadeIn 0.12s ease",
          }}
        >
          {/* Custom entry button if typed value doesn't match an existing option */}
          {showCustomOption && (
            <div
              onClick={() => handleSelect(displayValue.trim())}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.55rem 0.75rem",
                borderRadius: "6px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px dashed var(--accent-amber)",
                color: "var(--accent-amber)",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                marginBottom: "4px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-amber)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(245, 158, 11, 0.12)";
                e.currentTarget.style.color = "var(--accent-amber)";
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>
                Use custom: <strong>"{displayValue.trim()}"</strong>
              </span>
            </div>
          )}

          {/* List of matching options */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected =
                String(opt.value).toLowerCase() === String(displayValue).toLowerCase() ||
                String(opt.label).toLowerCase() === String(displayValue).toLowerCase();

              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "6px",
                    background: isSelected
                      ? "rgba(245, 158, 11, 0.15)"
                      : "transparent",
                    color: isSelected
                      ? "var(--accent-amber)"
                      : "var(--text-main)",
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: "0.86rem",
                    cursor: "pointer",
                    transition: "background 0.12s ease, color 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "var(--bg-tertiary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opt.label}
                  </span>
                  {isSelected && <Check size={14} color="var(--accent-amber)" strokeWidth={2.5} />}
                </div>
              );
            })
          ) : !showCustomOption ? (
            <div
              style={{
                padding: "0.75rem",
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                textAlign: "center",
              }}
            >
              No options found. Type to add custom value.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
