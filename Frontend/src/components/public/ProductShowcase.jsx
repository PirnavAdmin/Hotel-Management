import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SHOWCASE_TABS = [
  {
    id: "pos",
    label: "POS Floor & Billing",
    headline: "Fast Dine-In & Takeaway Order Execution",
    summary:
      "Waiters and cashiers manage live tables, modifiers, KOT dispatches, and multi-mode settlements in seconds.",
    highlights: [
      "Live floor map with Occupied, Available, and Reserved statuses",
      "Instant KOT dispatch per course or add-on round",
      "One-click Settlement Modal with thermal receipt printing",
    ],
    routeHint: "/pos",
  },
  {
    id: "kot",
    label: "Kitchen KOT Display",
    headline: "Zero-Paper Kitchen Coordination",
    summary:
      "Chefs see incoming Dine-In, Takeaway, and Self-Service tickets sorted by prep state and elapsed time.",
    highlights: [
      "Clear Accepted → Preparing → Ready → Completed progression",
      "Urgent item visibility and order-type badges",
      "Synchronized updates back to waiter and guest tracking",
    ],
    routeHint: "/kot",
  },
  {
    id: "qr",
    label: "QR Self-Service Menu",
    headline: "Branded Guest Menu & Order Tracking",
    summary:
      "Guests scan a table QR code to browse dishes, submit orders, and track kitchen progress in real time.",
    highlights: [
      "Branch-scoped menu route (/r/:branchCode/menu & /menu)",
      "Live order status tracker with UPI / Counter payment display",
      "Mobile-first responsive layout built for 390px+ screens",
    ],
    routeHint: "/menu",
  },
  {
    id: "admin",
    label: "Admin & Analytics",
    headline: "Invoices, Menu Control & Daily Reports",
    summary:
      "Managers and owners monitor daily revenue, GST breakdowns, menu availability, and self-service queues.",
    highlights: [
      "Searchable Invoice Ledger with receipt inspection",
      "Menu, category, tax, and table configuration panels",
      "Role-isolated operational access across staff accounts",
    ],
    routeHint: "/admin",
  },
];

export default function ProductShowcase() {
  const [activeId, setActiveId] = useState("pos");
  const navigate = useNavigate();
  const activeTab = SHOWCASE_TABS.find((t) => t.id === activeId) || SHOWCASE_TABS[0];

  return (
    <section id="showcase" className="saas-section" aria-labelledby="showcase-heading">
      <div className="saas-container">
        <div className="saas-section-header">
          <span className="saas-eyebrow">Product Walkthrough</span>
          <h2 id="showcase-heading" className="saas-h2">
            Explore Each Operational Workspace
          </h2>
          <p className="saas-lead">
            Purpose-built screens for every station in your restaurant — no cluttered spreadsheets.
          </p>
        </div>

        <div className="saas-tabs" role="tablist" aria-label="Product workspace tabs">
          {SHOWCASE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === activeTab.id}
              className={`saas-tab-btn ${tab.id === activeTab.id ? "active" : ""}`}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div key={activeTab.id} className="saas-showcase-frame saas-panel-enter" role="tabpanel">
          <div className="saas-grid-2" style={{ alignItems: "center" }}>
            <div>
              <h3 className="saas-h2" style={{ fontSize: 26 }}>
                {activeTab.headline}
              </h3>
              <p className="saas-lead" style={{ fontSize: 15.5, marginBottom: 18 }}>
                {activeTab.summary}
              </p>
              <ul className="saas-feature-list">
                {activeTab.highlights.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="saas-btn saas-btn-primary"
                  onClick={() => navigate("/demo")}
                >
                  Request Guided Demo
                </button>
                <button
                  type="button"
                  className="saas-btn saas-btn-secondary"
                  onClick={() => navigate(activeTab.routeHint)}
                >
                  Open {activeTab.label}
                </button>
              </div>
            </div>

            <div className="saas-showcase-preview">
              <div className="saas-mock-topbar">
                <span>Workspace Module: {activeTab.label}</span>
                <span>Route: {activeTab.routeHint}</span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {activeTab.highlights.map((item, idx) => (
                  <div
                    key={item}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(109, 199, 211, 0.22)",
                      fontSize: 13.5,
                      color: "#f8fafc",
                    }}
                  >
                    <strong style={{ color: "#6dc7d3", marginRight: 8 }}>0{idx + 1}.</strong>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
