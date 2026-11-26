import React, { useCallback, useEffect, useState } from "react";
import { apiGetSuperAdminDashboard } from "../../api/superAdminApi";
import { SaModuleHeader, SaStateBanner, SaStatusBadge } from "../../components/superadmin/SuperAdminUI";

export default function DashboardModule() {
  const [state, setState] = useState({ loading: true, res: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetSuperAdminDashboard();
    setState({ loading: false, res });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = state.res?.success ? state.res.data : null;
  const activities = Array.isArray(data?.recentActivities) ? data.recentActivities : [];

  return (
    <div>
      <SaModuleHeader
        title="Platform Dashboard"
        subtitle="Multi-tenant SaaS overview across organizations, restaurants, branches, and subscriptions."
        actions={
          <button type="button" className="sa-btn sa-btn-secondary" onClick={load} disabled={state.loading}>
            Refresh
          </button>
        }
      />

      <SaStateBanner
        loading={state.loading}
        integrationPending={state.res?.integrationPending}
        error={state.res && !state.res.success ? state.res.error : ""}
        endpoint={state.res?.endpoint}
        onRetry={load}
      />

      <div className="sa-kpi-grid">
        {[
          { label: "Total Tenants", value: data?.totalTenants ?? "—" },
          { label: "Active Restaurants", value: data?.activeRestaurants ?? "—" },
          { label: "Pending Registrations", value: data?.pendingRegistrations ?? "—" },
          { label: "Suspended Tenants", value: data?.suspendedTenants ?? "—" },
          { label: "Total Branches", value: data?.totalBranches ?? "—" },
          { label: "Active Subscriptions", value: data?.activeSubscriptions ?? "—" },
          ...(data?.monthlyRecurringRevenue !== undefined
            ? [{ label: "Monthly Recurring Revenue", value: `₹${Number(data.monthlyRecurringRevenue).toLocaleString("en-IN")}` }]
            : []),
        ].map((kpi) => (
          <div key={kpi.label} className="sa-card">
            <div className="sa-kpi-label">{kpi.label}</div>
            <div className="sa-kpi-value">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <section className="sa-card" aria-label="Registration approval statistics">
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Registration Approval Statistics</h2>
          {data?.approvalStats ? (
            <div style={{ display: "grid", gap: 8, fontSize: 13.5 }}>
              <div>Pending Review: <strong>{data.approvalStats.pending ?? 0}</strong></div>
              <div>Approved: <strong>{data.approvalStats.approved ?? 0}</strong></div>
              <div>Rejected: <strong>{data.approvalStats.rejected ?? 0}</strong></div>
            </div>
          ) : (
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13.5 }}>
              Approval statistics appear once the backend dashboard summary endpoint is connected.
            </p>
          )}
        </section>

        <section className="sa-card" aria-label="Recent platform activities">
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Recent Platform Activities</h2>
          {activities.length === 0 ? (
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13.5 }}>
              No live platform activity events available yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {activities.map((act, idx) => (
                <div
                  key={act.id || idx}
                  style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}
                >
                  <span>{act.description || act.action}</span>
                  <SaStatusBadge status={act.status || "Logged"} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
