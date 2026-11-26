import React from "react";

export const PIRNAV_BRAND = {
  name: "PIRNAV",
  company: "PIRNAV Software Solutions",
  email: "contact@pirnav.com",
  // Drop the official PIRNAV logo image path (e.g. "/pirnav-logo.png") here when available.
  logoSrc: "",
};

export default function PirnavBrandMark({ compact = false, badgeClassName = "saas-brand-mark" }) {
  if (PIRNAV_BRAND.logoSrc) {
    return (
      <span className={badgeClassName} style={{ background: "transparent", padding: 0, overflow: "hidden" }}>
        <img
          src={PIRNAV_BRAND.logoSrc}
          alt={PIRNAV_BRAND.name}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </span>
    );
  }

  return (
    <span className={badgeClassName} aria-hidden="true">
      {compact ? "P" : "P"}
    </span>
  );
}
