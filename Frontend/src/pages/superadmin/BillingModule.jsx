import React, { useCallback, useEffect, useState } from "react";
import { apiGetSaasBillingInvoices } from "../../api/superAdminApi";
import {
  SaDataTable,
  SaModal,
  SaModuleHeader,
  SaStateBanner,
  SaStatusBadge,
} from "../../components/superadmin/SuperAdminUI";

export default function BillingModule() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [state, setState] = useState({ loading: true, res: null });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetSaasBillingInvoices({ status: statusFilter });
    setState({ loading: false, res });
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const data = state.res?.success ? state.res.data : null;
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  const summary = data?.summary || null;

  const columns = [
    { key: "invoiceNumber", label: "SaaS Invoice #", sortable: true },
    { key: "organizationName", label: "Tenant Organization", sortable: true },
    { key: "planName", label: "Plan" },
    { key: "amount", label: "Amount", render: (r) => `₹${Number(r.amount || 0).toLocaleString("en-IN")}` },
    { key: "dueDate", label: "Due Date" },
    { key: "status", label: "Status", render: (r) => <SaStatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setSelectedInvoice(r)}>
          Details
        </button>
      ),
    },
  ];

  return (
    <div>
      <SaModuleHeader
        title="SaaS Billing Management"
        subtitle="Platform subscription invoices and tenant payment history (separate from restaurant customer diner bills)."
        actions={
          <button type="button" className="sa-btn sa-btn-secondary" onClick={load} disabled={state.loading}>
            {state.loading ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      <div className="sa-kpi-grid">
        <div className="sa-card">
          <div className="sa-kpi-label">Total Billed (SaaS)</div>
          <div className="sa-kpi-value">{summary ? `₹${Number(summary.totalBilled || 0).toLocaleString("en-IN")}` : "—"}</div>
        </div>
        <div className="sa-card">
          <div className="sa-kpi-label">Paid Invoices</div>
          <div className="sa-kpi-value">{summary?.paidCount ?? "—"}</div>
        </div>
        <div className="sa-card">
          <div className="sa-kpi-label">Pending Invoices</div>
          <div className="sa-kpi-value">{summary?.pendingCount ?? "—"}</div>
        </div>
        <div className="sa-card">
          <div className="sa-kpi-label">Overdue Invoices</div>
          <div className="sa-kpi-value">{summary?.overdueCount ?? "—"}</div>
        </div>
      </div>

      <SaStateBanner
        loading={state.loading}
        integrationPending={state.res?.integrationPending}
        error={state.res && !state.res.success ? state.res.error : ""}
        endpoint={state.res?.endpoint}
        onRetry={load}
      />

      <SaDataTable
        columns={columns}
        rows={rows}
        searchPlaceholder="Search SaaS invoice # or tenant..."
        filters={
          <select
            className="sa-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter SaaS invoices by status"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        }
      />

      <SaModal isOpen={Boolean(selectedInvoice)} title="SaaS Invoice Details" onClose={() => setSelectedInvoice(null)}>
        {selectedInvoice && (
          <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
            <div><strong>Invoice #:</strong> {selectedInvoice.invoiceNumber}</div>
            <div><strong>Tenant:</strong> {selectedInvoice.organizationName}</div>
            <div><strong>Plan:</strong> {selectedInvoice.planName}</div>
            <div><strong>Amount:</strong> ₹{Number(selectedInvoice.amount || 0).toLocaleString("en-IN")}</div>
            <div><strong>Status:</strong> <SaStatusBadge status={selectedInvoice.status} /></div>
            <div><strong>Payment Reference:</strong> {selectedInvoice.paymentReference || "—"}</div>
          </div>
        )}
      </SaModal>
    </div>
  );
}
