import React from "react";
import "../../styles/publicSaas.css";
import PublicNavbar from "../../components/public/PublicNavbar";
import PricingSection from "../../components/public/PricingSection";
import PublicFooter from "../../components/public/PublicFooter";

export default function PricingPage() {
  return (
    <div className="saas-page" style={{ display: "flex", flexDirection: "column" }}>
      <PublicNavbar />
      <main style={{ flex: 1 }}>
        <PricingSection />
      </main>
      <PublicFooter />
    </div>
  );
}
