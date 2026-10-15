import React, { useState, useRef, useEffect, useMemo } from "react";
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
  X,
  Package,
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

const getInitialSettings = (initialSettings) => {
  const baseDefaults = {
    restaurantName: "",
    tagline: "",
    phone: "",
    address: "",
    gstin: "",
    taxRate: 5,
    serviceChargeRate: 5,
    currency: "â‚¹",
    receiptHeader: "",
    receiptFooter: "",
    selectedQrId: "qr-1",
    paymentQrs: DEFAULT_PAYMENT_QRS,
    showLogoOnReceipt: true,
    showAddressOnReceipt: true,
    showGstBreakdown: true,
    lowStockAlertsEnabled: true,
  };

  try {
    const saved = localStorage.getItem("gourmet_pos_settings_v1");
    const parsedSaved = saved ? JSON.parse(saved) : {};
    const source = {
      ...parsedSaved,
      ...(initialSettings || {}),
    };

    const sourceQrs =
      (Array.isArray(parsedSaved.paymentQrs) && parsedSaved.paymentQrs.length > 0 && parsedSaved.paymentQrs) ||
      (Array.isArray(source.paymentQrs) && source.paymentQrs.length > 0 && source.paymentQrs) ||
      DEFAULT_PAYMENT_QRS;

    let qrs = [0, 1, 2].map((i) => ({
      ...DEFAULT_PAYMENT_QRS[i],
      ...(sourceQrs[i] || {}),
    }));

    const selectedId =
      parsedSaved.selectedQrId ||
      source.selectedQrId ||
      qrs.find((q) => q.active && q.image)?.id ||
      qrs.find((q) => q.image)?.id ||
      "qr-1";

    qrs = qrs.map((q) => ({
      ...q,
      active: q.id === selectedId,
    }));

    return {
      ...baseDefaults,
      ...source,
      ...parsedSaved,
      selectedQrId: selectedId,
      paymentQrs: qrs,
    };
  } catch {
    return baseDefaults;
  }
};

export function AdminSettings({
  currentTheme = "royal-saffron",
  onChangeTheme,
  initialSettings,
  onSaveSettings,
}) {
  const [settings, setSettings] = useState(() => getInitialSettings(initialSettings));
  const [lastSavedSettings, setLastSavedSettings] = useState(() => getInitialSettings(initialSettings));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [logoError, setLogoError] = useState("");

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(lastSavedSettings);
  }, [settings, lastSavedSettings]);

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    const input = event.currentTarget;
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file for the restaurant logo.");
      return;
    }
    if (file.size > 350 * 1024) {
      setLogoError(
        "Logo must be 350 KB or smaller so it can be saved reliably in browser storage.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSettings((current) => ({ ...current, logo: reader.result }));
      }
      input.value = "";
    };
    reader.onerror = () => {
      setLogoError("Could not read this image. Please try another file.");
      input.value = "";
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (initialSettings && Object.keys(initialSettings).length > 0) {
      setSettings((prev) => {
        let localSaved = {};
        try {
          localSaved = JSON.parse(localStorage.getItem("gourmet_pos_settings_v1") || "{}");
        } catch {}

        const sourceQrs =
          (Array.isArray(localSaved.paymentQrs) && localSaved.paymentQrs.length > 0 && localSaved.paymentQrs) ||
          (Array.isArray(initialSettings.paymentQrs) && initialSettings.paymentQrs.length > 0 && initialSettings.paymentQrs) ||
          prev.paymentQrs ||
          DEFAULT_PAYMENT_QRS;

        let qrs = [0, 1, 2].map((i) => ({
          ...DEFAULT_PAYMENT_QRS[i],
          ...(sourceQrs[i] || {}),
        }));

        const selectedId =
          localSaved.selectedQrId ||
          initialSettings.selectedQrId ||
          prev.selectedQrId ||
          qrs.find((q) => q.active && q.image)?.id ||
          qrs.find((q) => q.image)?.id ||
          "qr-1";

        qrs = qrs.map((q) => ({
          ...q,
          active: q.id === selectedId,
        }));

        const nextSettings = {
          ...prev,
          ...initialSettings,
          ...localSaved,
          selectedQrId: selectedId,
          paymentQrs: qrs,
        };

        setLastSavedSettings((prevSaved) => {
          if (JSON.stringify(prev) === JSON.stringify(prevSaved)) {
            return nextSettings;
          }
          return prevSaved;
        });

        return nextSettings;
      });
    }
  }, [initialSettings]);

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

    const targetId = targetQr?.id || `qr-${selectedIndex + 1}`;
    const nextQrs = currentQrs.map((q, idx) => ({
      ...q,
      active: idx === selectedIndex,
    }));

    const updated = {
      ...settings,
      selectedQrId: targetId,
      paymentQrs: nextQrs,
    };

    setSettings(updated);

    // Persist immediately to localStorage so POS billing and page refresh reflect it instantly
    try {
      const saved = localStorage.getItem("gourmet_pos_settings_v1");
      const parsed = saved ? JSON.parse(saved) : {};
      const toSave = {
        ...parsed,
        ...updated,
        selectedQrId: targetId,
        paymentQrs: nextQrs,
      };
      localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(toSave));
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      console.error("Failed to save active QR to localStorage:", err);
    }

    if (onSaveSettings) {
      onSaveSettings(updated).catch(() => {});
    }
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
        const updated = { ...prev, paymentQrs: nextQrs };
        try {
          const saved = localStorage.getItem("gourmet_pos_settings_v1");
          const parsed = saved ? JSON.parse(saved) : {};
          localStorage.setItem(
            "gourmet_pos_settings_v1",
            JSON.stringify({ ...parsed, ...updated, paymentQrs: nextQrs })
          );
          window.dispatchEvent(new Event("storage"));
        } catch (err) {
          console.error("Failed to save uploaded QR:", err);
        }
        if (onSaveSettings) {
          onSaveSettings(updated).catch(() => {});
        }
        return updated;
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
      const updated = { ...prev, paymentQrs: nextQrs };
      try {
        const saved = localStorage.getItem("gourmet_pos_settings_v1");
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          "gourmet_pos_settings_v1",
          JSON.stringify({ ...parsed, ...updated, paymentQrs: nextQrs })
        );
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        console.error("Failed to save updated QR label:", err);
      }
      return updated;
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
      const updated = {
        ...prev,
        selectedQrId: nextSelectedId,
        paymentQrs: nextQrs,
      };
      try {
        const saved = localStorage.getItem("gourmet_pos_settings_v1");
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          "gourmet_pos_settings_v1",
          JSON.stringify({ ...parsed, ...updated })
        );
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        console.error("Failed to save removed QR:", err);
      }
      if (onSaveSettings) {
        onSaveSettings(updated).catch(() => {});
      }
      return updated;
    });
  };

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    setSaveError("");

    try {
      localStorage.setItem(
        "gourmet_pos_settings_v1",
        JSON.stringify(settings),
      );
      window.dispatchEvent(new Event("storage"));

      if (onSaveSettings) {
        try {
          await onSaveSettings(settings);
        } catch (syncErr) {
          console.warn("Server sync error (local settings saved successfully):", syncErr);
        }
      }

      setLastSavedSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (error) {
      setSavedSuccess(false);
      setSaveError(
        error?.name === "QuotaExceededError"
          ? "Browser storage is full. Try a smaller logo image."
          : error?.message ||
              "Could not save settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
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
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}
          >
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
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
                Customize brand profile, tax & service charges, receipt
                templates and display theme
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
          {saveError && (
            <div
              role="alert"
              style={{ color: "#f87171", fontSize: "0.8rem", fontWeight: 700 }}
            >
              {saveError}
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

              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Restaurant Logo
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    flexWrap: "wrap",
                  }}
                >
                  {settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="Restaurant logo preview"
                      style={{
                        width: "64px",
                        height: "64px",
                        objectFit: "contain",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-card)",
                        borderRadius: "10px",
                        padding: "5px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--text-dim)",
                        background: "var(--bg-secondary)",
                        border: "1px dashed var(--border-card)",
                        borderRadius: "10px",
                      }}
                    >
                      <Store size={22} />
                    </div>
                  )}
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.58rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-card)",
                      color: "var(--text-main)",
                      background: "var(--bg-secondary)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Upload size={15} />
                    Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  {settings.logo && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettings((current) => ({ ...current, logo: "" }));
                        setLogoError("");
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.58rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        color: "#f87171",
                        background: "transparent",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <X size={15} /> Remove
                    </button>
                  )}
                  <span
                    style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}
                  >
                    Image file, up to 350 KB. Save settings to share it with your other devices.
                  </span>
                </div>
                {logoError && (
                  <div
                    role="alert"
                    style={{
                      color: "#f87171",
                      fontSize: "0.75rem",
                      marginTop: "0.4rem",
                    }}
                  >
                    {logoError}
                  </div>
                )}
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

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.serviceChargeEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      serviceChargeEnabled: e.target.checked,
                    })
                  }
                  style={{ accentColor: "#f59e0b" }}
                />
                Enable service charge option on orders
              </label>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Bill Total Rounding
                </label>
                <select
                  value={settings.roundingMode}
                  onChange={(e) =>
                    setSettings({ ...settings, roundingMode: e.target.value })
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
                >
                  <option value="rupee">Nearest â‚¹1</option>
                  <option value="five">Nearest â‚¹5</option>
                  <option value="none">No rounding</option>
                </select>
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
                  (settings.selectedQrId
                    ? qr.id === settings.selectedQrId
                    : qr.active)
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

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                {[
                  ["receiptShowLogo", "Show restaurant logo"],
                  ["receiptShowContact", "Show address, phone and GSTIN"],
                  ["receiptShowTaxBreakdown", "Show GST breakdown"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      color: "var(--text-main)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) =>
                        setSettings({ ...settings, [key]: e.target.checked })
                      }
                      style={{ accentColor: "#f59e0b" }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Inventory Alerts */}
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
              <Package size={18} color="#f59e0b" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Inventory Alerts
              </h3>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={settings.lowStockAlertsEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lowStockAlertsEnabled: e.target.checked,
                  })
                }
                style={{ accentColor: "#f59e0b" }}
              />
              Show low-stock alert in Inventory when items reach their
              individual thresholds
            </label>
          </div>

          {/* Submit Action */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "1rem",
              paddingTop: "0.5rem",
              flexWrap: "wrap",
            }}
          >



            {saveError && (
              <div
                role="alert"
                style={{
                  color: "#f87171",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                }}
              >
                {saveError}
              </div>
            )}

            <button
              type="submit"
              disabled={!isDirty || isSaving}
              style={{
                background: savedSuccess
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : isDirty && !isSaving
                  ? "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
                  : "rgba(255, 255, 255, 0.05)",
                color: savedSuccess || (isDirty && !isSaving) ? "#ffffff" : "#64748b",
                border: savedSuccess
                  ? "1px solid rgba(16, 185, 129, 0.6)"
                  : isDirty && !isSaving
                  ? "1px solid rgba(245, 158, 11, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "0.72rem 1.85rem",
                fontSize: "0.88rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                cursor: !isDirty || isSaving ? "not-allowed" : "pointer",
                boxShadow: savedSuccess
                  ? "0 4px 16px rgba(16, 185, 129, 0.35)"
                  : isDirty && !isSaving
                  ? "0 4px 18px rgba(245, 158, 11, 0.45)"
                  : "none",
                opacity: !isDirty && !savedSuccess && !isSaving ? 0.6 : 1,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              title={
                !isDirty && !savedSuccess
                  ? "No changes to save"
                  : "Click to save all configuration changes"
              }
            >
              {isSaving ? (
                <>
                  <RotateCcw
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span>Saving...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
