import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PirnavBrandMark, { PIRNAV_BRAND } from "./PirnavBrandMark";

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const goToSection = (sectionId) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 80);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const goToRoute = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="saas-navbar">
      <div className="saas-container saas-navbar-inner">
        <button
          type="button"
          className="saas-brand"
          onClick={() => goToRoute("/")}
          aria-label={`${PIRNAV_BRAND.name} SaaS Home`}
        >
          <PirnavBrandMark />
          <span>{PIRNAV_BRAND.name}</span>
        </button>

        <nav className="saas-nav-links" aria-label="Primary navigation">
          <button type="button" className="saas-nav-link" onClick={() => goToSection("features")}>
            Features
          </button>
          <button type="button" className="saas-nav-link" onClick={() => goToSection("showcase")}>
            Product
          </button>
          <button
            type="button"
            className={`saas-nav-link ${location.pathname === "/pricing" ? "active" : ""}`}
            onClick={() => goToRoute("/pricing")}
          >
            Pricing
          </button>
          <button
            type="button"
            className={`saas-nav-link ${location.pathname === "/demo" ? "active" : ""}`}
            onClick={() => goToRoute("/demo")}
          >
            Book Demo
          </button>
          <button type="button" className="saas-nav-link" onClick={() => goToSection("about")}>
            About
          </button>
          <button type="button" className="saas-nav-link" onClick={() => goToSection("contact")}>
            Contact
          </button>
        </nav>

        <div className="saas-nav-actions">
          <button
            type="button"
            className="saas-btn saas-btn-ghost"
            onClick={() => goToRoute("/login")}
          >
            Staff Login
          </button>
          <button
            type="button"
            className="saas-btn saas-btn-primary"
            onClick={() => goToRoute("/register-restaurant")}
          >
            Register Restaurant
          </button>
        </div>

        <button
          type="button"
          className="saas-mobile-toggle"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      <div className={`saas-mobile-drawer ${mobileOpen ? "open" : ""}`}>
        <button type="button" className="saas-nav-link" onClick={() => goToSection("features")}>
          Features
        </button>
        <button type="button" className="saas-nav-link" onClick={() => goToSection("showcase")}>
          Product
        </button>
        <button type="button" className="saas-nav-link" onClick={() => goToRoute("/pricing")}>
          Pricing
        </button>
        <button type="button" className="saas-nav-link" onClick={() => goToRoute("/demo")}>
          Book Demo
        </button>
        <button type="button" className="saas-nav-link" onClick={() => goToSection("about")}>
          About
        </button>
        <button type="button" className="saas-nav-link" onClick={() => goToSection("contact")}>
          Contact
        </button>
        <button
          type="button"
          className="saas-btn saas-btn-secondary"
          onClick={() => goToRoute("/login")}
        >
          Staff Login
        </button>
        <button
          type="button"
          className="saas-btn saas-btn-primary"
          onClick={() => goToRoute("/register-restaurant")}
        >
          Register Restaurant
        </button>
      </div>
    </header>
  );
}
