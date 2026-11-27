import React from "react";

const STEPS = [
  {
    step: "01",
    title: "Register Your Restaurant",
    description:
      "Submit your organization, brand, and primary branch details along with your GSTIN and owner contact.",
  },
  {
    step: "02",
    title: "Configure Menu & Tables",
    description:
      "Import categories, dishes, tax slabs, and floor tables for your dining room and QR self-service menu.",
  },
  {
    step: "03",
    title: "Connect Floor & Kitchen",
    description:
      "Assign Waiter POS, Cashier, Chef KOT, and Branch Manager logins with role-scoped permissions.",
  },
  {
    step: "04",
    title: "Scale Across Branches",
    description:
      "Add new outlets under the same organization and monitor unified sales, KOT speed, and GST invoices.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="saas-section saas-section-alt" aria-labelledby="how-heading">
      <div className="saas-container">
        <div className="saas-section-header">
          <span className="saas-eyebrow">Onboarding Flow</span>
          <h2 id="how-heading" className="saas-h2">
            Go Live From Single Outlet To Multi-Branch Chain
          </h2>
          <p className="saas-lead">
            Structured onboarding designed for independent cafes, full-service restaurants, and
            hospitality groups.
          </p>
        </div>

        <div className="saas-grid-4 saas-steps-grid">
          {STEPS.map((item, idx) => (
            <article
              key={item.step}
              className="saas-card saas-step-card saas-reveal"
              data-reveal
              style={{ "--reveal-delay": `${idx * 90}ms` }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: "var(--pirnav-teal, #0b7286)",
                }}
              >
                STEP {item.step}
              </div>
              <h3 className="saas-card-title">{item.title}</h3>
              <p className="saas-card-text">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
