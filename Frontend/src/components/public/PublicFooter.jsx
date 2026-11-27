import React from "react";
import { useNavigate } from "react-router-dom";
import PirnavBrandMark, { PIRNAV_BRAND } from "./PirnavBrandMark";

const COPYRIGHT_YEAR = new Date().getFullYear();

export default function PublicFooter() {
  const navigate = useNavigate();

  return (
    <footer className="saas-footer saas-reveal" data-reveal>
      <div className="saas-container">
        <div className="saas-footer-grid">
          <div>
            <div className="saas-brand saas-brand-on-dark" style={{ marginBottom: 10 }}>
              <PirnavBrandMark />
              <span>{PIRNAV_BRAND.name}</span>
            </div>
            <p className="saas-footer-text">
              Unified restaurant operations platform by {PIRNAV_BRAND.company}, built for
              independent dining rooms and multi-branch hospitality brands.
            </p>
          </div>

          <div>
            <h3 className="saas-footer-heading">Platform</h3>
            <ul className="saas-footer-list">
              <li>
                <button type="button" className="saas-nav-link" onClick={() => navigate("/#features")}>
                  Dine-In &amp; Floor POS
                </button>
              </li>
              <li>
                <button type="button" className="saas-nav-link" onClick={() => navigate("/#showcase")}>
                  Kitchen KOT Display
                </button>
              </li>
              <li>
                <button type="button" className="saas-nav-link" onClick={() => navigate("/menu")}>
                  QR Self-Service Menu
                </button>
              </li>
              <li>
                <button type="button" className="saas-nav-link" onClick={() => navigate("/pricing")}>
                  Plans &amp; Pricing
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="saas-footer-heading">Get Started</h3>
            <ul className="saas-footer-list">
              <li>
                <button type="button" className="saas-nav-link" onClick={() => navigate("/register-restaurant")}>
                  Register Restaurant
                </button>
              </li>
              <li>
                <button type="button" className="saas-nav-link" onClick={() => navigate("/demo")}>
                  Request Live Demo
                </button>
              </li>
              <li>
                <button type="button" className="saas-nav-link" onClick={() => navigate("/login")}>
                  Staff &amp; Admin Login
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="saas-footer-heading">Support</h3>
            <ul className="saas-footer-list">
              <li>
                <a className="saas-footer-link" href={`mailto:${PIRNAV_BRAND.email}`}>
                  {PIRNAV_BRAND.email}
                </a>
              </li>
              <li>
                <span className="saas-footer-text">Mon–Sat · 9:00 AM – 8:00 PM IST</span>
              </li>
              <li>
                <span className="saas-footer-text">GST-Ready Billing &amp; Audit Logs</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(109, 199, 211, 0.22)",
            paddingTop: 18,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 12.5,
            color: "#cbd5e1",
          }}
        >
          <span>© {COPYRIGHT_YEAR} {PIRNAV_BRAND.company}. All rights reserved.</span>
          <span>{PIRNAV_BRAND.name} · Multi-Tenant Restaurant POS, KOT, QR Ordering &amp; Branch Analytics</span>
        </div>
      </div>
    </footer>
  );
}
