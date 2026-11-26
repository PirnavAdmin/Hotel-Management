import React from "react";

const PILLARS = [
  {
    title: "Built For Single & Multi-Branch Operators",
    description:
      "Start with one dining room and scale into multiple brands and city branches under one organization hierarchy.",
  },
  {
    title: "Zero-Friction Kitchen & Floor Sync",
    description:
      "Waiter POS, Cashier Settlement, Kitchen KOT, and Guest QR Self-Service share one live operational state.",
  },
  {
    title: "Audit-Ready GST Invoicing",
    description:
      "Unified invoice numbering, thermal print layouts, and role-gated admin controls designed for Indian hospitality.",
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="saas-section" aria-labelledby="about-heading">
      <div className="saas-container">
        <div className="saas-section-header">
          <span className="saas-eyebrow">About PIRNAV</span>
          <h2 id="about-heading" className="saas-h2">
            Engineered For Real Hospitality Operations
          </h2>
          <p className="saas-lead">
            PIRNAV by PIRNAV Software Solutions unifies floor service, kitchen dispatch, guest QR
            ordering, and branch accounting so teams spend less time reconciling systems and more
            time serving guests.
          </p>
        </div>

        <div className="saas-grid-3">
          {PILLARS.map((item) => (
            <article key={item.title} className="saas-card">
              <h3 className="saas-card-title">{item.title}</h3>
              <p className="saas-card-text">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
