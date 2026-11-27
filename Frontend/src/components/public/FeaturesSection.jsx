import React from "react";

const CORE_FEATURES = [
  {
    icon: "🍽️",
    title: "Dine-In Table & Floor POS",
    description:
      "Visual table status tracking, instant item additions, running order edits, and fast settlement workflows built for busy floor staff.",
  },
  {
    icon: "🔥",
    title: "Real-Time Kitchen KOT",
    description:
      "Structured Kitchen Order Tickets flow straight from POS and QR orders to kitchen stations with Accept, Preparing, Ready, and Completed states.",
  },
  {
    icon: "🛍️",
    title: "Takeaway Counter Speed",
    description:
      "Rapid counter order entry with instant token receipts, customer phone lookup, and clear pickup tracking without blocking dining tables.",
  },
  {
    icon: "📱",
    title: "QR Self-Service Ordering",
    description:
      "Table-aware digital menus let guests browse categories, place orders, track live status, and choose UPI, Card, or Pay at Counter.",
  },
  {
    icon: "🧾",
    title: "Cashier & GST Invoicing",
    description:
      "Unified invoice numbering, split/multi-mode settlement, print-ready thermal receipts, and complete invoice audit history.",
  },
  {
    icon: "🏢",
    title: "Multi-Branch Architecture",
    description:
      "Designed for Organization → Restaurant → Branch hierarchy so owners can expand from one dining room to multiple cities.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="saas-section saas-section-alt" aria-labelledby="features-heading">
      <div className="saas-container">
        <div className="saas-section-header">
          <span className="saas-eyebrow">Everything In One Suite</span>
          <h2 id="features-heading" className="saas-h2">
            Built For Front-of-House Speed &amp; Back-of-House Control
          </h2>
          <p className="saas-lead">
            Every role — Waiter, Chef, Cashier, Branch Manager, and Owner — works on the same
            synchronized order pipeline.
          </p>
        </div>

        <div className="saas-grid-3">
          {CORE_FEATURES.map((feature, idx) => (
            <article
              key={feature.title}
              className="saas-card saas-reveal"
              data-reveal
              style={{ "--reveal-delay": `${idx * 70}ms` }}
            >
              <div className="saas-icon-badge" aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className="saas-card-title">{feature.title}</h3>
              <p className="saas-card-text">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
