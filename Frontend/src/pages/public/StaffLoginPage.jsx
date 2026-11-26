import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/publicSaas.css";
import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";
import { LoginPage } from "../../common/LoginPage";

export default function StaffLoginPage({
  currentTheme,
  onChangeTheme,
  onLoginSuccess,
  restaurantName,
  restaurantLogo,
}) {
  const navigate = useNavigate();

  return (
    <div className="saas-page" style={{ display: "flex", flexDirection: "column" }}>
      <PublicNavbar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
      <PublicFooter />
    </div>
  );
}
