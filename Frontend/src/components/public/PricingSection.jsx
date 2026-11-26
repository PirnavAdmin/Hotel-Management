import React from "react";
import { useNavigate } from "react-router-dom";

const PLANS = [
  {
    name: "Single Outlet",
    price: "₹2,499",
    period: "/ month per branch",
    description: "Everything an independent restaurant or cafe needs to run floor, kitchen, and billing.",
    highlighted: false,
    ctaLabel: "Register Restaurant",
    ctaRoute: "/register-restaurant",
    features: [
      "1 Restaurant & 1 Branch",
      "Dine-In Floor POS & Takeaway",
      "Live Kitchen KOT Display",
      "QR Self-Service Table Menu",
      "GST Invoice & Thermal Print",
    ],
  },
  {
    name: "Growth Multi-Branch",
    price: "₹4,999",
    period: "/ month (up to 5 branches)",
    description: "Built for growing restaurant brands managing multiple dining rooms and kitchens.",
    highlighted: true,
    ctaLabel: "Start Onboarding",
    ctaRoute: "/register-restaurant",
    features: [
      "1 Organization, Multiple Branches",
      "Role-Based Staff & Branch Managers",
      "Branch-Scoped QR Menus (/r/:branchCode/menu)",
      "Centralized Invoice & Tax Reports",
      "Priority Onboarding & Training",
    ],
  },
  {
    name: "Enterprise Chain",
    price: "Custom",
    period: "tailored annual plan",
    description: "For hospitality groups operating multiple brands, cloud kitchens, and regional hubs.",
    highlighted: false,
    ctaLabel: "Book Enterprise Demo",
    ctaRoute: "/demo",
    features: [
      "Unlimited Restaurants & Branches",
      "Dedicated Account & Migration Support",
      "Custom Role & Approval Workflows",
      "Multi-Brand Consolidated Reporting",
      "SLA & Assisted Rollout",
    ],
  },
];

export default function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="saas-section" aria-labelledby="pricing-heading">
      <div className="saas-container">
        <div className="saas-section-header">
          <span className="saas-eyebrow">Transparent Pricing</span>
          <h2 id="pricing-heading" className="saas-h2">
            Plans That Grow With Your Dining Rooms
          </h2>
          <p className="saas-lead">
            Start with one branch and expand to multi-branch operations whenever you are ready.
          </p>
        </div>

        <div className="saas-grid-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`saas-card ${plan.highlighted ? "saas-card-highlight" : ""}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="saas-card-title" style={{ fontSize: 20 }}>
                  {plan.name}
                </h3>
                {plan.highlighted && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(245, 158, 11, 0.16)",
                      color: "#fbbf24",
                    }}
                  >
                    POPULAR
                  </span>
                )}
              </div>

              <div style={{ marginTop: 6 }}>
                <span className="saas-price">{plan.price}</span>{" "}
                <span className="saas-price-period">{plan.period}</span>
              </div>

              <p className="saas-card-text">{plan.description}</p>

              <ul className="saas-feature-list" style={{ flex: 1 }}>
                {plan.features.map((feat) => (
                  <li key={feat}>✓ {feat}</li>
                ))}
              </ul>

              <button
                type="button"
                className={`saas-btn ${plan.highlighted ? "saas-btn-primary" : "saas-btn-secondary"}`}
                onClick={() => navigate(plan.ctaRoute)}
              >
                {plan.ctaLabel}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
