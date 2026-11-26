import React from "react";
import "../../styles/publicSaas.css";
import PublicNavbar from "../../components/public/PublicNavbar";
import DemoRequestForm from "../../components/public/DemoRequestForm";
import PublicFooter from "../../components/public/PublicFooter";

export default function DemoRequestPage() {
  return (
    <div className="saas-page">
      <PublicNavbar />
      <main className="saas-section">
        <div className="saas-container" style={{ maxWidth: 820 }}>
          <div className="saas-section-header" style={{ marginBottom: 32 }}>
            <span className="saas-eyebrow">Live Walkthrough</span>
            <h1 className="saas-h1" style={{ fontSize: "clamp(28px, 3.8vw, 42px)" }}>
              Book a Personalized Restaurant Demo
            </h1>
            <p className="saas-lead">
              See how Dine-In POS, Kitchen KOT, QR Self-Service, and Multi-Branch reporting work
              together for your team.
            </p>
          </div>
          <DemoRequestForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
