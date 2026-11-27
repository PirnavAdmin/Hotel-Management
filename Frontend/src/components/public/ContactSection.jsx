import React from "react";
import { useNavigate } from "react-router-dom";

export default function ContactSection() {
  const navigate = useNavigate();

  return (
    <section id="contact" className="saas-section saas-section-alt" aria-labelledby="contact-heading">
      <div className="saas-container">
        <div className="saas-grid-2" style={{ alignItems: "center" }}>
          <div className="saas-reveal" data-reveal>
            <span className="saas-eyebrow">About &amp; Contact</span>
            <h2 id="contact-heading" className="saas-h2">
              Ready To Modernize Your Restaurant Operations?
            </h2>
            <p className="saas-lead" style={{ marginBottom: 20 }}>
              Whether you operate a single neighborhood bistro or a multi-city restaurant group,
              our team helps you migrate menus, configure printers, and train staff in days.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button
                type="button"
                className="saas-btn saas-btn-primary"
                onClick={() => navigate("/register-restaurant")}
              >
                Register Restaurant
              </button>
              <button
                type="button"
                className="saas-btn saas-btn-secondary"
                onClick={() => navigate("/demo")}
              >
                Schedule Demo
              </button>
            </div>
          </div>

          <div className="saas-card saas-reveal" data-reveal style={{ "--reveal-delay": "100ms" }}>
            <h3 className="saas-card-title">Direct Onboarding Desk</h3>
            <p className="saas-card-text">
              Reach our hospitality product specialists for multi-branch rollouts, hardware
              compatibility checks, and pricing guidance.
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 6, fontSize: 14, color: "var(--text-main)" }}>
              <div>
                <strong>Company:</strong> PIRNAV Software Solutions
              </div>
              <div>
                <strong>Email:</strong>{" "}
                <a href="mailto:contact@pirnav.com" style={{ color: "var(--pirnav-teal)", fontWeight: 700, textDecoration: "none" }}>
                  contact@pirnav.com
                </a>
              </div>
              <div>
                <strong>Support Hours:</strong> Mon–Sat, 9:00 AM – 8:00 PM IST
              </div>
              <div>
                <strong>Deployment:</strong> Cloud SaaS &amp; Branch LAN Print Ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
