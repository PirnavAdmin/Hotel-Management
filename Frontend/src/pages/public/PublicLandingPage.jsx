import React, { useEffect, useRef } from "react";
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
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const targets = Array.from(root.querySelectorAll("[data-reveal]"));
    if (!targets.length) return undefined;

    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("is-revealed"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="saas-page saas-landing-root">
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
