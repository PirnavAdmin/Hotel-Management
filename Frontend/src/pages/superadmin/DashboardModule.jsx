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

  const kpis = [
    { label: "Total Tenants", value: data?.totalTenants ?? "—", hint: "Organizations" },
    { label: "Active Restaurants", value: data?.activeRestaurants ?? "—", hint: "Live brands" },
    { label: "Pending Registrations", value: data?.pendingRegistrations ?? "—", hint: "Awaiting review" },
    { label: "Suspended Tenants", value: data?.suspendedTenants ?? "—", hint: "Compliance / hold" },
    { label: "Total Branches", value: data?.totalBranches ?? "—", hint: "POS locations" },
    { label: "Active Subscriptions", value: data?.activeSubscriptions ?? "—", hint: "Active & trial" },
    {
      label: "Monthly Recurring Revenue",
      value:
        data?.monthlyRecurringRevenue !== undefined && data?.monthlyRecurringRevenue !== null
          ? `₹${Number(data.monthlyRecurringRevenue).toLocaleString("en-IN")}`
          : "—",
      hint: "SaaS MRR",
    },
  ];

  // Derive analytics bars strictly from real API data (never fabricate numbers)
  const mrrSeries = Array.isArray(data?.mrrSeries) ? data.mrrSeries : null;
  const footprintSeries = data
    ? [
        { label: "Tenants", value: Number(data.totalTenants || 0) },
        { label: "Restaurants", value: Number(data.activeRestaurants || 0) },
        { label: "Branches", value: Number(data.totalBranches || 0) },
        { label: "Subscriptions", value: Number(data.activeSubscriptions || 0) },
        { label: "Pending", value: Number(data.pendingRegistrations || 0) },
      ]
    : [];
  const footprintMax = Math.max(1, ...footprintSeries.map((b) => b.value));

  const approvalStats = data?.approvalStats || null;
  const approvalTotal = approvalStats
    ? Math.max(1, Number(approvalStats.pending || 0) + Number(approvalStats.approved || 0) + Number(approvalStats.rejected || 0))
    : 1;

  return (
    <div className="sa-module-enter">
      <SaModuleHeader
        title="Platform Dashboard"
        subtitle="Multi-tenant SaaS overview across organizations, restaurants, branches, MRR, and registration approvals."
        actions={
          <button type="button" className="sa-btn sa-btn-secondary" onClick={load} disabled={state.loading}>
            {state.loading ? "Refreshing..." : "Refresh"}
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
        {kpis.map((kpi, idx) => (
          <div key={kpi.label} className="sa-card sa-kpi-card" style={{ "--sa-stagger": idx }}>
            <div className="sa-kpi-label">{kpi.label}</div>
            {state.loading ? (
              <div className="sa-skeleton" style={{ width: "55%", height: 28, marginBottom: 4 }} />
            ) : (
              <div className="sa-kpi-value">{kpi.value}</div>
            )}
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>{kpi.hint}</div>
          </div>
        ))}
      </div>

      <div className="sa-analytics-grid">
        <section className="sa-card" aria-label="Monthly recurring revenue and tenant growth analytics">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {mrrSeries ? "Monthly Recurring Revenue Trend" : "Tenant & Subscription Footprint"}
            </h2>
            {data?.monthlyRecurringRevenue !== undefined && (
              <span style={{ fontSize: 12.5, color: "#6dc7d3", fontWeight: 700 }}>
                MRR: ₹{Number(data.monthlyRecurringRevenue || 0).toLocaleString("en-IN")}
              </span>
            )}
          </div>

          {mrrSeries && mrrSeries.length > 0 ? (
            <div className="sa-chart-bars">
              {mrrSeries.map((pt, idx) => {
                const maxVal = Math.max(1, ...mrrSeries.map((m) => Number(m.amount || m.value || 0)));
                const pct = Math.max(8, Math.round((Number(pt.amount || pt.value || 0) / maxVal) * 100));
                return (
                  <div key={pt.label || idx} className="sa-chart-col" style={{ "--sa-stagger": idx }}>
                    <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600 }}>
                      ₹{Number(pt.amount || pt.value || 0).toLocaleString("en-IN")}
                    </span>
                    <div className="sa-chart-bar" style={{ height: `${pct}%` }} />
                    <span className="sa-chart-bar-label">{pt.label}</span>
                  </div>
                );
              })}
            </div>
          ) : data ? (
            <div className="sa-chart-bars">
              {footprintSeries.map((item, idx) => {
                const pct = Math.max(8, Math.round((item.value / footprintMax) * 100));
                return (
                  <div key={item.label} className="sa-chart-col" style={{ "--sa-stagger": idx }}>
                    <span style={{ fontSize: 11.5, color: "#cbd5e1", fontWeight: 700 }}>{item.value}</span>
                    <div className="sa-chart-bar" style={{ height: `${pct}%` }} />
                    <span className="sa-chart-bar-label">{item.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: "16px 0 0", color: "#94a3b8", fontSize: 13.5 }}>
              Analytics render from live backend data once authenticated as PlatformSuperAdmin.
            </p>
          )}
        </section>

        <section className="sa-card" aria-label="Approval pipeline visualization">
          <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700 }}>Registration Approval Pipeline</h2>
          {approvalStats ? (
            <div style={{ display: "grid", gap: 14 }}>
              {[
                { label: "Pending Review", count: Number(approvalStats.pending || 0), color: "#f59e0b" },
                { label: "Approved Tenants", count: Number(approvalStats.approved || 0), color: "#22c55e" },
                { label: "Rejected Requests", count: Number(approvalStats.rejected || 0), color: "#ef4444" },
              ].map((stage) => {
                const pct = Math.round((stage.count / approvalTotal) * 100);
                return (
                  <div key={stage.label} className="sa-pipeline-row">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#cbd5e1" }}>{stage.label}</span>
                      <strong>
                        {stage.count} ({pct}%)
                      </strong>
                    </div>
                    <div className="sa-pipeline-track">
                      <div
                        className="sa-pipeline-fill"
                        style={{ width: `${pct}%`, background: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13.5 }}>
              Approval pipeline statistics appear once the backend dashboard summary endpoint is connected.
            </p>
          )}
        </section>
      </div>

      <section className="sa-card" aria-label="Recent platform activities">
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Recent Platform Activity Timeline</h2>
        {activities.length === 0 ? (
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 13.5 }}>
            No live platform activity events available yet.
          </p>
        ) : (
          <div className="sa-timeline">
            {activities.map((act, idx) => (
              <div key={act.id || idx} className="sa-timeline-item">
                <div>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>{act.description || act.action}</div>
                  {act.createdAt && (
                    <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                      {new Date(act.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <SaStatusBadge status={act.status || "Logged"} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
