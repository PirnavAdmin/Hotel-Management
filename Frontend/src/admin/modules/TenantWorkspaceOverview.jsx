import React, { useEffect, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { apiGetTenantSubscriptionEntitlement } from "../../api/tenantWorkspaceApi";
import { PermissionGuard } from "../../components/tenant/PermissionGuard";
import {
  getRoleDashboardProfile,
  hasBackendPermissionClaims,
} from "../../utils/permissions";

export function TenantWorkspaceOverview({ currentSession }) {
  const [subState, setSubState] = useState({ loading: true, res: null });
  const profile = getRoleDashboardProfile(currentSession);
  const hasPerms = hasBackendPermissionClaims(currentSession);

  useEffect(() => {
    let active = true;
    apiGetTenantSubscriptionEntitlement().then((res) => {
      if (active) setSubState({ loading: false, res });
    });
    return () => {
      active = false;
    };
  }, []);

  const subData = subState.res?.success ? subState.res.data : null;

  return (
    <section
      aria-label="Role-based dashboard and subscription entitlements"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 14,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={17} color="var(--accent-amber)" aria-hidden="true" />
          <strong style={{ fontSize: 14, color: "var(--text-main)" }}>{profile.title}</strong>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 10 }}>
          Scope: {profile.scope}
        </div>
        {!hasPerms ? (
          <div style={{ fontSize: 12, color: "#fde68a", background: "rgba(245,158,11,0.1)", padding: "8px 10px", borderRadius: 8 }}>
            Granular backend permission claims are not yet emitted in the JWT; permission-gated
            SaaS widgets remain locked until backend claims are active.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {profile.recommendedPermissions.map((perm) => (
              <PermissionGuard key={perm} session={currentSession} permission={perm}>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "rgba(34,197,94,0.15)",
                    color: "#86efac",
                    fontWeight: 600,
                  }}
                >
                  ✓ {perm}
                </span>
              </PermissionGuard>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Sparkles size={17} color="var(--accent-amber)" aria-hidden="true" />
          <strong style={{ fontSize: 14, color: "var(--text-main)" }}>Subscription Entitlements</strong>
        </div>
        {subState.loading ? (
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Checking tenant subscription...</div>
        ) : subData ? (
          <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <div><strong>Plan:</strong> {subData.planName} ({subData.status})</div>
            <div><strong>Limits:</strong> {subData.branchLimit} branches · {subData.userLimit} users</div>
            <div><strong>Enabled Modules:</strong> {(subData.enabledModules || []).join(", ") || "—"}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#fde68a", background: "rgba(245,158,11,0.1)", padding: "8px 10px", borderRadius: 8 }}>
            <strong>{subState.res?.integrationPending ? "Integration Pending: " : "Unavailable: "}</strong>
            {subState.res?.error || "Subscription entitlement endpoint not connected."}
          </div>
        )}
      </div>
    </section>
  );
}
