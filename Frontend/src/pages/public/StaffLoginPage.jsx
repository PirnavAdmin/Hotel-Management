import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/publicSaas.css";
import PirnavBrandMark, { PIRNAV_BRAND } from "../../components/public/PirnavBrandMark";
import { LoginPage } from "../../common/LoginPage";

const COPYRIGHT_YEAR = new Date().getFullYear();

export default function StaffLoginPage({
  currentTheme,
  onChangeTheme,
  onLoginSuccess,
  restaurantName,
  restaurantLogo,
}) {
  const navigate = useNavigate();

  return (
    <div className="saas-page saas-auth-shell">
      <header className="saas-auth-header">
        <div className="saas-container saas-auth-header-inner">
          <button
            type="button"
            className="saas-brand"
            onClick={() => navigate("/")}
            aria-label={`${PIRNAV_BRAND.name} Home`}
          >
            <PirnavBrandMark />
            <span className="saas-auth-brand-text">
              <span>{PIRNAV_BRAND.name}</span>
              <span className="saas-auth-brand-sub">{PIRNAV_BRAND.company}</span>
            </span>
          </button>

          <div className="saas-auth-header-actions">
            <a
              href={`mailto:${PIRNAV_BRAND.email}?subject=PIRNAV%20Login%20Support`}
              className="saas-auth-support-link"
            >
              Contact Support
            </a>
          </div>
        </div>
      </header>

      <main className="saas-auth-main">
        <LoginPage
          currentTheme={currentTheme}
          onChangeTheme={onChangeTheme}
          role="pos"
          onLoginSuccess={onLoginSuccess}
          restaurantName={restaurantName}
          restaurantLogo={restaurantLogo}
          onBackToLanding={() => navigate("/")}
        />
      </main>

      <footer className="saas-auth-footer">
        <div className="saas-container saas-auth-footer-inner">
          <span>© {COPYRIGHT_YEAR} {PIRNAV_BRAND.company}</span>
          <a
            href={`mailto:${PIRNAV_BRAND.email}?subject=PIRNAV%20Login%20Support`}
            className="saas-auth-support-link"
          >
            Contact Support ({PIRNAV_BRAND.email})
          </a>
        </div>
      </footer>
    </div>
  );
}
