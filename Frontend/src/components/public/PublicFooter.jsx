import React from "react";
import { useNavigate } from "react-router-dom";

const COPYRIGHT_YEAR = new Date().getFullYear();

export default function PublicFooter() {
  const navigate = useNavigate();

  return (
    <footer className="saas-footer">
      <div className="saas-container">
        <div className="saas-footer-grid">
          <div>
            <div className="saas-brand" style={{ marginBottom: 10 }}>
              <span className="saas-brand-mark" aria-hidden="true">RF</span>
              <span>RestroFlow OS</span>
            </div>
            <p className="saas-card-text">
              Unified restaurant operations platform built for independent dining rooms and
              multi-branch hospitality brands.
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
                <span className="saas-card-text">sales@restroflow.local</span>
              </li>
              <li>
                <span className="saas-card-text">Mon–Sat · 9:00 AM – 8:00 PM IST</span>
              </li>
              <li>
                <span className="saas-card-text">GST-Ready Billing &amp; Audit Logs</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(148, 163, 184, 0.14)",
            paddingTop: 18,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 12.5,
            color: "#94a3b8",
          }}
        >
          <span>© {COPYRIGHT_YEAR} RestroFlow OS. All rights reserved.</span>
          <span>Multi-Tenant Restaurant POS, KOT, QR Ordering &amp; Branch Analytics</span>
        </div>
      </div>
    </footer>
  );
}
