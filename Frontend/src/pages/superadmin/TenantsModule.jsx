import React, { useCallback, useEffect, useState } from "react";
import {
  apiCreateTenant,
  apiGetTenants,
  apiSetTenantStatus,
  apiUpdateTenant,
} from "../../api/superAdminApi";
import {
  SaConfirmDialog,
  SaDataTable,
  SaModal,
  SaModuleHeader,
  SaStateBanner,
  SaStatusBadge,
} from "../../components/superadmin/SuperAdminUI";

const EMPTY_WIZARD = {
  organizationName: "",
  ownerName: "",
  ownerEmail: "",
  phone: "",
  restaurantName: "",
  branchName: "",
  city: "",
};

export default function TenantsModule() {
  const [state, setState] = useState({ loading: true, res: null });
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState(EMPTY_WIZARD);
  const [editingTenant, setEditingTenant] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [actionBanner, setActionBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetTenants({ status: statusFilter });
    setState({ loading: false, res });
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = Array.isArray(state.res?.data)
    ? state.res.data
    : Array.isArray(state.res?.data?.items)
      ? state.res.data.items
      : [];

  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setActionBanner(null);
    try {
      const res = editingTenant
        ? await apiUpdateTenant(editingTenant.id, wizardForm)
        : await apiCreateTenant(wizardForm);
      setActionBanner(res);
      if (res.success) {
        setWizardOpen(false);
        setEditingTenant(null);
        setWizardForm(EMPTY_WIZARD);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStatusConfirm = async (reason) => {
    if (!confirmTarget || busy) return;
    setBusy(true);
    setActionBanner(null);
    try {
      const nextStatus = confirmTarget.status === "Active" ? "Suspended" : "Active";
      const res = await apiSetTenantStatus(confirmTarget.id, nextStatus, reason);
      setActionBanner(res);
      if (res.success) {
        setConfirmTarget(null);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "organizationName", label: "Organization", sortable: true },
    { key: "restaurantCount", label: "Restaurants", render: (r) => r.restaurantCount ?? r.restaurants?.length ?? 1 },
    { key: "branchCount", label: "Branches", render: (r) => r.branchCount ?? r.branches?.length ?? 1 },
    { key: "ownerEmail", label: "Owner Email", sortable: true },
    { key: "status", label: "Status", render: (r) => <SaStatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setSelectedTenant(r)}>
            Details
          </button>
          <button
            type="button"
            className="sa-btn sa-btn-secondary"
            onClick={() => {
              setEditingTenant(r);
              setWizardForm({ ...EMPTY_WIZARD, ...r });
              setWizardStep(1);
              setWizardOpen(true);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className={`sa-btn ${r.status === "Active" ? "sa-btn-danger" : "sa-btn-primary"}`}
            onClick={() => setConfirmTarget(r)}
          >
            {r.status === "Active" ? "Suspend" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <SaModuleHeader
        title="Tenant Management"
        subtitle="Manage customer organizations, restaurants, branches, and tenant activation status."
        actions={
          <button
            type="button"
            className="sa-btn saas-btn-primary sa-btn-primary"
            onClick={() => {
              setEditingTenant(null);
              setWizardForm(EMPTY_WIZARD);
              setWizardStep(1);
              setWizardOpen(true);
            }}
          >
            + Create Tenant Wizard
          </button>
        }
      />

      {actionBanner && !actionBanner.success && (
        <div className={`sa-banner ${actionBanner.integrationPending ? "sa-banner-pending" : "sa-banner-error"}`} role="alert">
          {actionBanner.error}
        </div>
      )}

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
        searchPlaceholder="Search tenants or owner email..."
        filters={
          <select
            className="sa-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter tenants by status"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
        }
      />

      <SaModal isOpen={Boolean(selectedTenant)} title="Tenant Details" onClose={() => setSelectedTenant(null)}>
        {selectedTenant && (
          <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
            <div><strong>Organization:</strong> {selectedTenant.organizationName}</div>
            <div><strong>Owner:</strong> {selectedTenant.ownerName} ({selectedTenant.ownerEmail})</div>
            <div><strong>Status:</strong> <SaStatusBadge status={selectedTenant.status} /></div>
            <div><strong>Restaurants:</strong> {selectedTenant.restaurantCount ?? 1}</div>
            <div><strong>Branches:</strong> {selectedTenant.branchCount ?? 1}</div>
          </div>
        )}
      </SaModal>

      <SaModal
        isOpen={wizardOpen}
        title={editingTenant ? "Edit Tenant" : `Create Tenant Wizard (Step ${wizardStep} of 2)`}
        onClose={() => setWizardOpen(false)}
      >
        <form onSubmit={handleWizardSubmit}>
          {wizardStep === 1 ? (
            <div className="sa-form-grid">
              <div className="sa-field sa-field-full">
                <label className="sa-label" htmlFor="sa-ten-org">Organization Name *</label>
                <input
                  id="sa-ten-org"
                  className="sa-input"
                  required
                  value={wizardForm.organizationName}
                  onChange={(e) => setWizardForm((p) => ({ ...p, organizationName: e.target.value }))}
                />
              </div>
              <div className="sa-field">
                <label className="sa-label" htmlFor="sa-ten-owner">Owner Name *</label>
                <input
                  id="sa-ten-owner"
                  className="sa-input"
                  required
                  value={wizardForm.ownerName}
                  onChange={(e) => setWizardForm((p) => ({ ...p, ownerName: e.target.value }))}
                />
              </div>
              <div className="sa-field">
                <label className="sa-label" htmlFor="sa-ten-email">Owner Email *</label>
                <input
                  id="sa-ten-email"
                  type="email"
                  className="sa-input"
                  required
                  value={wizardForm.ownerEmail}
                  onChange={(e) => setWizardForm((p) => ({ ...p, ownerEmail: e.target.value }))}
                />
              </div>
              <div className="sa-field sa-field-full" style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="sa-btn sa-btn-primary" onClick={() => setWizardStep(2)}>
                  Next: Restaurant &amp; Branch
                </button>
              </div>
            </div>
          ) : (
            <div className="sa-form-grid">
              <div className="sa-field">
                <label className="sa-label" htmlFor="sa-ten-rest">Restaurant Name *</label>
                <input
                  id="sa-ten-rest"
                  className="sa-input"
                  required
                  value={wizardForm.restaurantName}
                  onChange={(e) => setWizardForm((p) => ({ ...p, restaurantName: e.target.value }))}
                />
              </div>
              <div className="sa-field">
                <label className="sa-label" htmlFor="sa-ten-branch">Primary Branch *</label>
                <input
                  id="sa-ten-branch"
                  className="sa-input"
                  required
                  value={wizardForm.branchName}
                  onChange={(e) => setWizardForm((p) => ({ ...p, branchName: e.target.value }))}
                />
              </div>
              <div className="sa-field sa-field-full">
                <label className="sa-label" htmlFor="sa-ten-city">City *</label>
                <input
                  id="sa-ten-city"
                  className="sa-input"
                  required
                  value={wizardForm.city}
                  onChange={(e) => setWizardForm((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="sa-field sa-field-full" style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setWizardStep(1)}>
                  Back
                </button>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={busy}>
                  {busy ? "Saving..." : editingTenant ? "Save Tenant" : "Create Tenant"}
                </button>
              </div>
            </div>
          )}
        </form>
      </SaModal>

      <SaConfirmDialog
        isOpen={Boolean(confirmTarget)}
        title={confirmTarget?.status === "Active" ? "Suspend Tenant" : "Activate Tenant"}
        message={`Are you sure you want to ${confirmTarget?.status === "Active" ? "suspend" : "activate"} "${confirmTarget?.organizationName}"?`}
        confirmLabel={confirmTarget?.status === "Active" ? "Suspend Tenant" : "Activate Tenant"}
        danger={confirmTarget?.status === "Active"}
        requireReason={confirmTarget?.status === "Active"}
        busy={busy}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
}
