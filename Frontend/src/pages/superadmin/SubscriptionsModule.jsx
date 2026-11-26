import React, { useCallback, useEffect, useState } from "react";
import { apiGetSubscriptions, apiUpdateTenantSubscription } from "../../api/superAdminApi";
import {
  SaDataTable,
  SaModal,
  SaModuleHeader,
  SaStateBanner,
  SaStatusBadge,
} from "../../components/superadmin/SuperAdminUI";

const PLANS = [
  {
    id: "single-outlet",
    name: "Single Outlet",
    price: "₹2,499/mo",
    branchLimit: 1,
    userLimit: 15,
    entitlements: ["Dine-In POS", "Takeaway", "Kitchen KOT", "QR Self-Service"],
  },
  {
    id: "growth-multi",
    name: "Growth Multi-Branch",
    price: "₹4,999/mo",
    branchLimit: 5,
    userLimit: 60,
    entitlements: ["Multi-Branch POS", "KOT", "QR Menus", "Centralized Reports"],
  },
  {
    id: "enterprise",
    name: "Enterprise Chain",
    price: "Custom",
    branchLimit: "Unlimited",
    userLimit: "Unlimited",
    entitlements: ["Multi-Brand", "Custom RBAC", "Audit Logs", "Priority SLA"],
  },
];

export default function SubscriptionsModule() {
  const [state, setState] = useState({ loading: true, res: null });
  const [selectedSub, setSelectedSub] = useState(null);
  const [targetPlan, setTargetPlan] = useState("growth-multi");
  const [saveBanner, setSaveBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetSubscriptions();
    setState({ loading: false, res });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = Array.isArray(state.res?.data)
    ? state.res.data
    : Array.isArray(state.res?.data?.items)
      ? state.res.data.items
      : [];

  const handlePlanChange = async (e) => {
    e.preventDefault();
    if (!selectedSub || busy) return;
    setBusy(true);
    setSaveBanner(null);
    try {
      const res = await apiUpdateTenantSubscription(selectedSub.id, { planId: targetPlan });
      setSaveBanner(res);
      if (res.success) {
        setSelectedSub(null);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "organizationName", label: "Tenant", sortable: true },
    { key: "planName", label: "Plan", sortable: true },
    { key: "trialStatus", label: "Trial", render: (r) => <SaStatusBadge status={r.trialStatus || "None"} /> },
    { key: "expiresAt", label: "Expiry Date" },
    { key: "branchLimit", label: "Branch Limit" },
    { key: "userLimit", label: "User Limit" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setSelectedSub(r)}>
          Upgrade / Downgrade
        </button>
      ),
    },
  ];

  return (
    <div>
      <SaModuleHeader
        title="Subscription Management"
        subtitle="SaaS plan tiers, branch & user limits, module entitlements, trial statuses, and expiry tracking."
      />

      <div className="sa-kpi-grid" style={{ marginBottom: 20 }}>
        {PLANS.map((plan) => (
          <article key={plan.id} className="sa-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{plan.name}</h2>
              <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>{plan.price}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", margin: "8px 0" }}>
              Limits: {plan.branchLimit} branch(es) · {plan.userLimit} users
            </div>
            <div style={{ fontSize: 12.5, color: "#cbd5e1" }}>
              {plan.entitlements.join(" · ")}
            </div>
          </article>
        ))}
      </div>

      {saveBanner && !saveBanner.success && (
        <div className={`sa-banner ${saveBanner.integrationPending ? "sa-banner-pending" : "sa-banner-error"}`} role="alert">
          {saveBanner.error}
        </div>
      )}

      <SaStateBanner
        loading={state.loading}
        integrationPending={state.res?.integrationPending}
        error={state.res && !state.res.success ? state.res.error : ""}
        endpoint={state.res?.endpoint}
        onRetry={load}
      />

      <SaDataTable columns={columns} rows={rows} searchPlaceholder="Search tenant subscriptions..." />

      <SaModal isOpen={Boolean(selectedSub)} title="Change Tenant Subscription Plan" onClose={() => setSelectedSub(null)}>
        {selectedSub && (
          <form onSubmit={handlePlanChange} style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 14 }}>
              <strong>Tenant:</strong> {selectedSub.organizationName} (Current: {selectedSub.planName})
            </div>
            <div className="sa-field">
              <label className="sa-label" htmlFor="sa-sub-plan">Target Plan</label>
              <select
                id="sa-sub-plan"
                className="sa-select"
                value={targetPlan}
                onChange={(e) => setTargetPlan(e.target.value)}
              >
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.price})</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setSelectedSub(null)}>
                Cancel
              </button>
              <button type="submit" className="sa-btn sa-btn-primary" disabled={busy}>
                {busy ? "Updating..." : "Confirm Plan Change"}
              </button>
            </div>
          </form>
        )}
      </SaModal>
    </div>
  );
}
