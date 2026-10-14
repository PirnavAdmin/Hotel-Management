import React, { useState, useRef } from "react";
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  Store,
  Receipt,
  Percent,
  Palette,
  QrCode,
  Upload,
  Trash2,
} from "lucide-react";
import defaultPaymentQr from "../assets/payment-qr.png";

const DEFAULT_PAYMENT_QRS = [
  {
    id: "qr-1",
    label: "Main Counter UPI",
    image: defaultPaymentQr,
    active: true,
  },
  {
    id: "qr-2",
    label: "Counter 2 / Bar UPI",
    image: null,
    active: false,
  },
  {
    id: "qr-3",
    label: "Counter 3 / Takeaway UPI",
    image: null,
    active: false,
  },
];

export function AdminSettings({
  currentTheme = "royal-saffron",
  onChangeTheme,
}) {
  const [settings, setSettings] = useState(() => {
    const baseDefaults = {
      restaurantName: "AVSR FOOD COURT",
      tagline: "Restaurant Management & Fine Dining",
      phone: "+91 98450 12345",
      address: "Main Road, Near Tech Park, Hyderabad, India",
      gstin: "36AABCA1234F1Z5",
      taxRate: 5,
      serviceChargeRate: 5,
      currency: "₹",
      receiptHeader: "Welcome to AVSR Food Court!",
      receiptFooter: "Thank you for dining with us. Visit again!",
      selectedQrId: "qr-1",
      paymentQrs: DEFAULT_PAYMENT_QRS,
    };

    try {
      const saved = localStorage.getItem("gourmet_pos_settings_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        let qrs = DEFAULT_PAYMENT_QRS;
        if (Array.isArray(parsed.paymentQrs) && parsed.paymentQrs.length > 0) {
          qrs = [0, 1, 2].map((i) => ({
            ...DEFAULT_PAYMENT_QRS[i],
            ...(parsed.paymentQrs[i] || {}),
          }));
        }
        const activeQr = qrs.find((q) => q.active) || qrs[0];
        const selectedId = parsed.selectedQrId || activeQr.id || "qr-1";
        qrs = qrs.map((q) => ({
          ...q,
          active: q.id === selectedId,
        }));
        return {
          ...baseDefaults,
          ...parsed,
          selectedQrId: selectedId,
          paymentQrs: qrs,
        };
      }
      return baseDefaults;
    } catch {
      return baseDefaults;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef0 = useRef(null);
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const fileInputRefs = [fileInputRef0, fileInputRef1, fileInputRef2];

  const selectActiveQr = (selectedIndex) => {
    const currentQrs = settings.paymentQrs || DEFAULT_PAYMENT_QRS;
    const targetQr = currentQrs[selectedIndex];

    // Restrict selection if container does not have an uploaded image
    if (!targetQr?.image) {
      return;
    }

    setSettings((prev) => {
      const qrs = prev.paymentQrs || DEFAULT_PAYMENT_QRS;
      const targetId = targetQr?.id || `qr-${selectedIndex + 1}`;
      const nextQrs = qrs.map((q, idx) => ({
        ...q,
        active: idx === selectedIndex,
      }));
      return {
        ...prev,
        selectedQrId: targetId,
        paymentQrs: nextQrs,
      };
    });
  };

  const processImageFile = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL("image/png", 0.9));
      };
      img.onerror = () => callback(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = (index, file) => {
    if (!file) return;
    processImageFile(file, (dataUrl) => {
      setSettings((prev) => {
        const nextQrs = [...(prev.paymentQrs || DEFAULT_PAYMENT_QRS)];
        nextQrs[index] = {
          ...nextQrs[index],
          image: dataUrl,
        };
        return { ...prev, paymentQrs: nextQrs };
      });
    });
  };

  const updateQrLabel = (index, newLabel) => {
    setSettings((prev) => {
      const nextQrs = [...(prev.paymentQrs || DEFAULT_PAYMENT_QRS)];
      nextQrs[index] = {
        ...nextQrs[index],
        label: newLabel,
      };
      return { ...prev, paymentQrs: nextQrs };
    });
  };

  const removeQrImage = (index) => {
    setSettings((prev) => {
      const nextQrs = [...(prev.paymentQrs || DEFAULT_PAYMENT_QRS)];
      const wasActive =
        nextQrs[index]?.active || prev.selectedQrId === nextQrs[index]?.id;
      nextQrs[index] = {
        ...nextQrs[index],
        image: null,
      };
      let nextSelectedId = prev.selectedQrId;
      if (wasActive) {
        const fallbackIdx = nextQrs.findIndex((q, i) => i !== index && q.image);
        const activeIdx = fallbackIdx !== -1 ? fallbackIdx : 0;
        nextQrs.forEach((q, i) => {
          q.active = i === activeIdx;
        });
        nextSelectedId = nextQrs[activeIdx]?.id || "qr-1";
      }
      return { ...prev, selectedQrId: nextSelectedId, paymentQrs: nextQrs };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Outer Card Matching Design */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        {/* Header Strip inside Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Left Title with Orange Squircle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              }}
            >
              <Settings size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  Restaurant Configuration & Settings
                </h2>
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-dim)",
                  margin: "3px 0 0 0",
                }}
              >
                Customize brand profile, tax & service charges, receipt templates and display theme
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#10b981",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <CheckCircle2 size={15} />
              <span>Settings Saved Successfully</span>
            </div>
          )}
        </div>

        {/* Configuration Form */}
        <form
          onSubmit={handleSave}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* Section 1: Business Identity */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "1rem",
              }}
            >
              <Store size={18} color="#f59e0b" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Restaurant Brand Identity
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={settings.restaurantName}
                  onChange={(e) =>
                    setSettings({ ...settings, restaurantName: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) =>
                    setSettings({ ...settings, tagline: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Contact Number
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  GSTIN / Tax Identification
                </label>
                <input
                  type="text"
                  value={settings.gstin}
                  onChange={(e) =>
                    setSettings({ ...settings, gstin: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax & Rates */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "1rem",
              }}
            >
              <Percent size={18} color="#10b981" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Taxes & Service Charges
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Food GST / Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.taxRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      taxRate: Number(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Service Charge Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.serviceChargeRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      serviceChargeRate: Number(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings({ ...settings, currency: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Payment QR Codes Configuration */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            {/* Section Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "1.15rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <QrCode size={18} color="#f59e0b" />
                <div>
                  <h3
                    style={{
                      fontSize: "0.98rem",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      margin: 0,
                    }}
                  >
                    Payment QR Codes Configuration
                  </h3>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Click on any QR card below to select which QR should be active for POS settlements. Save configuration to apply.
                  </p>
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#f59e0b",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}
              >
                3 QR Slots (Click to Select Active)
              </span>
            </div>

            {/* 3 Upload Cards Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
                gap: "1.1rem",
              }}
            >
              {(settings.paymentQrs || DEFAULT_PAYMENT_QRS).map((qr, index) => {
                const hasImage = Boolean(qr.image);
                const isSelected = Boolean(
                  hasImage &&
                  (qr.active ||
                    settings.selectedQrId === qr.id ||
                    (!settings.selectedQrId && index === 0))
                );

                return (
                  <div
                    key={qr.id || index}
                    onClick={() => {
                      if (hasImage) selectActiveQr(index);
                    }}
                    title={
                      isSelected
                        ? "Currently active in POS settlement"
                        : hasImage
                        ? "Click to select this QR for POS"
                        : "Upload QR image first"
                    }
                    style={{
                      background: isSelected
                        ? "linear-gradient(145deg, rgba(245, 158, 11, 0.12) 0%, rgba(20, 24, 33, 0.95) 100%)"
                        : "var(--bg-secondary)",
                      border: isSelected
                        ? "2px solid #f59e0b"
                        : hasImage
                        ? "1px solid rgba(255, 255, 255, 0.14)"
                        : "1px dashed rgba(255, 255, 255, 0.18)",
                      boxShadow: isSelected
                        ? "0 0 20px rgba(245, 158, 11, 0.28), 0 4px 14px rgba(0, 0, 0, 0.5)"
                        : "0 2px 8px rgba(0, 0, 0, 0.2)",
                      borderRadius: "14px",
                      padding: "1.05rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                      cursor: hasImage ? "pointer" : "default",
                      position: "relative",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: isSelected ? "scale(1.015)" : "scale(1)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && hasImage) {
                        e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.6)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = hasImage
                          ? "rgba(255, 255, 255, 0.14)"
                          : "rgba(255, 255, 255, 0.18)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {/* Slot Header with Radio & Active Status */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Radio Disc Indicator */}
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            border: isSelected
                              ? "5px solid #10b981"
                              : hasImage
                              ? "2px solid rgba(255, 255, 255, 0.3)"
                              : "1.5px dashed rgba(255, 255, 255, 0.2)",
                            background: isSelected ? "#ffffff" : "transparent",
                            boxShadow: isSelected ? "0 0 10px rgba(16, 185, 129, 0.7)" : "none",
                            transition: "all 0.15s ease",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            color: isSelected ? "#10b981" : "var(--text-main)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          QR Slot #{index + 1}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isSelected ? (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              padding: "2.5px 9px",
                              borderRadius: "12px",
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "#ffffff",
                              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
                              border: "1px solid rgba(16, 185, 129, 0.6)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              letterSpacing: "0.04em",
                            }}
                          >
                            <CheckCircle2 size={11} strokeWidth={3} />
                            ACTIVE
                          </span>
                        ) : hasImage ? (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: "12px",
                              background: "rgba(255, 255, 255, 0.06)",
                              color: "var(--text-dim)",
                              border: "1px dashed rgba(255, 255, 255, 0.2)",
                            }}
                          >
                            Click to Select
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Editable Label */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.73rem",
                          color: "var(--text-dim)",
                          marginBottom: "4px",
                          fontWeight: 600,
                        }}
                      >
                        QR / Counter Label
                      </label>
                      <input
                        type="text"
                        value={qr.label || ""}
                        placeholder={`e.g. Counter ${index + 1} UPI`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateQrLabel(index, e.target.value)}
                        style={{
                          width: "100%",
                          background: "var(--bg-tertiary)",
                          border: isSelected
                            ? "1px solid rgba(245, 158, 11, 0.4)"
                            : "1px solid var(--border-card)",
                          borderRadius: "8px",
                          padding: "0.55rem 0.75rem",
                          color: "var(--text-main)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* QR Image Preview Area */}
                    <div
                      style={{
                        background: "var(--bg-tertiary)",
                        border: qr.image
                          ? "1px solid rgba(255, 255, 255, 0.08)"
                          : "1.5px dashed rgba(255, 255, 255, 0.16)",
                        borderRadius: "10px",
                        minHeight: "155px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.85rem",
                      }}
                    >
                      {qr.image ? (
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "6px",
                            borderRadius: "8px",
                            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
                            display: "inline-flex",
                          }}
                        >
                          <img
                            src={qr.image}
                            alt={qr.label || `QR ${index + 1}`}
                            style={{
                              width: "120px",
                              height: "120px",
                              objectFit: "contain",
                              display: "block",
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                            color: "var(--text-dim)",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "42px",
                              height: "42px",
                              borderRadius: "10px",
                              background: "rgba(255, 255, 255, 0.04)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <QrCode size={22} color="var(--text-dim)" />
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                            No QR Image Uploaded
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            Click upload below (PNG / JPG)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRefs[index]}
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleQrUpload(index, file);
                        e.target.value = "";
                      }}
                    />

                    {/* Upload & Action Buttons */}
                    <div style={{ display: "flex", gap: "0.45rem", marginTop: "auto" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs[index].current?.click();
                        }}
                        style={{
                          flex: 1,
                          background: qr.image
                            ? "rgba(245, 158, 11, 0.14)"
                            : "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                          border: qr.image
                            ? "1px solid rgba(245, 158, 11, 0.35)"
                            : "none",
                          borderRadius: "8px",
                          padding: "0.55rem 0.75rem",
                          color: "#ffffff",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.92";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <Upload size={13} />
                        <span>{qr.image ? "Change QR Image" : "Upload QR Image"}</span>
                      </button>

                      {qr.image && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQrImage(index);
                          }}
                          style={{
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.28)",
                            borderRadius: "8px",
                            padding: "0.55rem 0.65rem",
                            color: "#ef4444",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}
                          title="Remove this QR image"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)")}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Receipt Template */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "1rem",
              }}
            >
              <Receipt size={18} color="#38bdf8" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Customer Receipt Messages
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Header Welcome Text
                </label>
                <input
                  type="text"
                  value={settings.receiptHeader}
                  onChange={(e) =>
                    setSettings({ ...settings, receiptHeader: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Footer Greeting Text
                </label>
                <input
                  type="text"
                  value={settings.receiptFooter}
                  onChange={(e) =>
                    setSettings({ ...settings, receiptFooter: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "0.7rem 1.75rem",
                fontSize: "0.88rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                boxShadow: "0 3px 14px rgba(245, 158, 11, 0.4)",
              }}
            >
              <Save size={16} />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
