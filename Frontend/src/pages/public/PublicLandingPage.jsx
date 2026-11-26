import React from "react";
import "../../styles/publicSaas.css";
import PublicNavbar from "../../components/public/PublicNavbar";
import HeroSection from "../../components/public/HeroSection";
import FeaturesSection from "../../components/public/FeaturesSection";
import ProductShowcase from "../../components/public/ProductShowcase";
import HowItWorksSection from "../../components/public/HowItWorksSection";
import PricingSection from "../../components/public/PricingSection";
import AboutSection from "../../components/public/AboutSection";
import ContactSection from "../../components/public/ContactSection";
import PublicFooter from "../../components/public/PublicFooter";

export default function PublicLandingPage() {
  return (
    <div className="saas-page">
      <PublicNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ProductShowcase />
        <HowItWorksSection />
        <PricingSection />
        <AboutSection />
        <ContactSection />
      </main>
      <PublicFooter />
    </div>
  );
}
