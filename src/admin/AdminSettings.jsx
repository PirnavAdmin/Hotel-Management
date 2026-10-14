import React, { useEffect, useState } from "react";
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  Store,
  Receipt,
  Percent,
  Palette,
  Upload,
  X,
} from "lucide-react";

export function AdminSettings({
  currentTheme = "royal-saffron",
  onChangeTheme,
  initialSettings = null,
  onSaveSettings,
}) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("gourmet_pos_settings_v1");
      return saved
        ? JSON.parse(saved)
        : {
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
          };
    } catch {
      return {
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
      };
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (initialSettings && typeof initialSettings === "object") {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

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
      setLogoError("Logo must be 350 KB or smaller so it can be saved reliably in browser storage.");
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (onSaveSettings) {
        await onSaveSettings(settings);
      } else {
        localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(settings));
      }
      setSaveError("");
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (error) {
      setSavedSuccess(false);
      setSaveError(error?.name === "QuotaExceededError"
        ? "Browser storage is full. Try a smaller logo image."
        : error?.message || "Could not sync settings. Check the server connection and try again.");
    }
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
          {saveError && (
            <div role="alert" style={{ color: "#f87171", fontSize: "0.8rem", fontWeight: 700 }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                  {settings.logo ? (
                    <img src={settings.logo} alt="Restaurant logo preview" style={{ width: "64px", height: "64px", objectFit: "contain", background: "var(--bg-secondary)", border: "1px solid var(--border-card)", borderRadius: "10px", padding: "5px" }} />
                  ) : (
                    <div style={{ width: "64px", height: "64px", display: "grid", placeItems: "center", color: "var(--text-dim)", background: "var(--bg-secondary)", border: "1px dashed var(--border-card)", borderRadius: "10px" }}>
                      <Store size={22} />
                    </div>
                  )}
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.58rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-secondary)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                    <Upload size={15} />
                    Upload logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                  </label>
                  {settings.logo && (
                    <button type="button" onClick={() => { setSettings((current) => ({ ...current, logo: "" })); setLogoError(""); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.58rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#f87171", background: "transparent", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                      <X size={15} /> Remove
                    </button>
                  )}
                  <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>Image file, up to 350 KB. Save settings to keep the logo.</span>
                </div>
                {logoError && <div role="alert" style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.4rem" }}>{logoError}</div>}
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

          {/* Section 3: Receipt Template */}
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
