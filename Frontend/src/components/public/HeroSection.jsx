import React from "react";
import { useNavigate } from "react-router-dom";

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="saas-hero" aria-labelledby="hero-heading">
      <div className="saas-container saas-hero-grid">
        <div>
          <span className="saas-eyebrow">Multi-Branch Restaurant SaaS Platform</span>
          <h1 id="hero-heading" className="saas-h1">
            Run Dine-In, Kitchen KOT, Takeaway &amp; QR Ordering From One Cloud POS
          </h1>
          <p className="saas-lead">
            Built for independent restaurants and growing hospitality chains. Manage live table
            floors, instant kitchen tickets, GST-compliant cashier billing, and self-service QR
            menus across every branch.
          </p>

          <div className="saas-hero-actions">
            <button
              type="button"
              className="saas-btn saas-btn-primary"
              onClick={() => navigate("/register-restaurant")}
            >
              Register Your Restaurant
            </button>
            <button
              type="button"
              className="saas-btn saas-btn-secondary"
              onClick={() => navigate("/demo")}
            >
              Book a Live Demo
            </button>
            <button
              type="button"
              className="saas-btn saas-btn-ghost"
              onClick={() => navigate("/login")}
            >
              Staff Login
            </button>
          </div>

          <div className="saas-hero-trust">
            <span>✓ Single Restaurant &amp; Multi-Branch Ready</span>
            <span>✓ Role-Based POS, KOT &amp; Admin</span>
            <span>✓ GST-Ready Thermal Receipts</span>
          </div>
        </div>

        <div className="saas-hero-card" aria-label="Platform live operations preview">
          <div className="saas-mock-topbar">
            <span>Operations Console · Preview Layout</span>
            <span style={{ color: "#34d399", fontWeight: 700 }}>● POS + KOT Sync</span>
          </div>

          <div className="saas-kpi-row">
            <div className="saas-kpi-box">
              <div className="saas-kpi-label">Active Tables</div>
              <div className="saas-kpi-val">14 / 20</div>
            </div>
            <div className="saas-kpi-box">
              <div className="saas-kpi-label">Open KOT Tickets</div>
              <div className="saas-kpi-val">7 Active</div>
            </div>
            <div className="saas-kpi-box">
              <div className="saas-kpi-label">Channels</div>
              <div className="saas-kpi-val">4 Modes</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {[
              { title: "Dine-In Floor & Table Split", tag: "Waiter POS", status: "Running" },
              { title: "Kitchen KOT Live Queue", tag: "Chef KDS", status: "Preparing" },
              { title: "QR Self-Service + Counter Pay", tag: "Guest App", status: "Active" },
              { title: "Invoice Ledger & Tax Summary", tag: "Admin BI", status: "Audited" },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(30, 41, 59, 0.55)",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#f8fafc" }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{item.tag}</div>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(245, 158, 11, 0.14)",
                    color: "#fbbf24",
                  }}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
