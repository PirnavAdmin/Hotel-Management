import React, { useState } from "react";
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  Store,
  Receipt,
  Percent,
  Palette,
} from "lucide-react";

export function AdminSettings({
  currentTheme = "royal-saffron",
  onChangeTheme,
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
