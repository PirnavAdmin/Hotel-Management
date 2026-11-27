import React, { Suspense, lazy, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/superAdmin.css";
import { ErrorBoundary } from "../../common/ErrorBoundary";
import PirnavBrandMark, { PIRNAV_BRAND } from "../../components/public/PirnavBrandMark";

const DashboardModule = lazy(() => import("../superadmin/DashboardModule"));
const TenantsModule = lazy(() => import("../superadmin/TenantsModule"));
const RegistrationsModule = lazy(() => import("../superadmin/RegistrationsModule"));
const UsersModule = lazy(() => import("../superadmin/UsersModule"));
const BranchesModule = lazy(() => import("../superadmin/BranchesModule"));
const RolesModule = lazy(() => import("../superadmin/RolesModule"));
const SubscriptionsModule = lazy(() => import("../superadmin/SubscriptionsModule"));
const BillingModule = lazy(() => import("../superadmin/BillingModule"));
const AuditLogsModule = lazy(() => import("../superadmin/AuditLogsModule"));
const SupportModule = lazy(() => import("../superadmin/SupportModule"));
const SettingsModule = lazy(() => import("../superadmin/SettingsModule"));

const NAV_ITEMS = [
  { id: "dashboard", label: "Platform Dashboard", path: "/super-admin/dashboard" },
  { id: "tenants", label: "Tenants", path: "/super-admin/tenants" },
  { id: "registrations", label: "Registrations", path: "/super-admin/registrations" },
  { id: "users", label: "Admins & Users", path: "/super-admin/users" },
  { id: "branches", label: "Branches", path: "/super-admin/branches" },
  { id: "roles", label: "Roles & Permissions", path: "/super-admin/roles" },
  { id: "subscriptions", label: "Subscriptions", path: "/super-admin/subscriptions" },
  { id: "billing", label: "SaaS Billing", path: "/super-admin/billing" },
  { id: "audit-logs", label: "Audit Logs", path: "/super-admin/audit-logs" },
  { id: "support", label: "Support", path: "/super-admin/support" },
  { id: "settings", label: "Platform Settings", path: "/super-admin/settings" },
];

function resolveSectionFromPath(pathname) {
  const clean = String(pathname || "").replace(/\/+$/, "").toLowerCase();
  if (clean === "/super-admin" || clean === "/super-admin/dashboard") return "dashboard";
  const seg = clean.replace("/super-admin/", "");
  return NAV_ITEMS.some((n) => n.id === seg) ? seg : "dashboard";
}

export default function SuperAdminPortalPage({ session, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeSection = resolveSectionFromPath(location.pathname);
  const rawRole = String(session?.rawRole || session?.role || "").toLowerCase();
  const isSuperAdmin = rawRole === "platformsuperadmin" || rawRole === "superadmin";

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  const go = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const renderModule = () => {
    switch (activeSection) {
      case "tenants":
        return <TenantsModule />;
      case "registrations":
        return <RegistrationsModule />;
      case "users":
        return <UsersModule />;
      case "branches":
        return <BranchesModule />;
      case "roles":
        return <RolesModule />;
      case "subscriptions":
        return <SubscriptionsModule />;
      case "billing":
        return <BillingModule />;
      case "audit-logs":
        return <AuditLogsModule />;
      case "support":
        return <SupportModule />;
      case "settings":
        return <SettingsModule />;
      case "dashboard":
      default:
        return <DashboardModule />;
    }
  };

  return (
    <div className="sa-shell">
      {sidebarOpen && (
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 45,
            background: "rgba(2, 6, 23, 0.65)",
          }}
        />
      )}
      <aside className={`sa-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Super Admin sidebar">
        <div className="sa-brand">
          <PirnavBrandMark badgeClassName="sa-brand-badge" />
          <span>{PIRNAV_BRAND.name} Super Admin</span>
        </div>

        <nav className="sa-nav" aria-label="Super Admin modules">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sa-nav-btn ${activeSection === item.id ? "active" : ""}`}
              onClick={() => go(item.path)}
              aria-current={activeSection === item.id ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ display: "grid", gap: 8, paddingTop: 10, borderTop: "1px solid rgba(148,163,184,0.14)" }}>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => go("/")}>
            Public SaaS Home
          </button>
          {onLogout && session && (
            <button type="button" className="sa-btn sa-btn-danger" onClick={onLogout}>
              Sign Out
            </button>
          )}
        </div>
      </aside>

      <div className="sa-main-wrap">
        <header className="sa-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="sa-mobile-menu-btn"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((p) => !p)}
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#cbd5e1" }}>
              {PIRNAV_BRAND.company} · Platform Control Panel
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className={`sa-badge ${isSuperAdmin ? "sa-badge-active" : "sa-badge-pending"}`}>
              {isSuperAdmin
                ? `Signed in: ${session?.rawRole || session?.role}`
                : "Backend PlatformSuperAdmin Claim Required"}
            </span>
            {!session && (
              <button type="button" className="sa-btn sa-btn-primary" onClick={() => go("/login")}>
                Staff Login
              </button>
            )}
          </div>
        </header>

        <div className="sa-content">
          {!isSuperAdmin && (
            <div className="sa-banner sa-banner-pending" role="status">
              <strong>Access Notice:</strong> Full platform mutations require an authenticated{" "}
              <code>PlatformSuperAdmin</code> backend JWT claim. Read-only UI shells are shown
              without fabricated data.
            </div>
          )}

          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="sa-card" aria-busy="true">
                  <div className="sa-skeleton" style={{ width: "60%", marginBottom: 10 }} />
                  <div className="sa-skeleton" style={{ width: "100%" }} />
                </div>
              }
            >
              <div key={activeSection} className="sa-module-enter">
                {renderModule()}
              </div>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
