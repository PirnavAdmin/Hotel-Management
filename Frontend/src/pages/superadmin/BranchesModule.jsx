import React, { useCallback, useEffect, useState } from "react";
import { apiGetBranches, apiSaveBranch } from "../../api/superAdminApi";
import {
  SaDataTable,
  SaModal,
  SaModuleHeader,
  SaStateBanner,
  SaStatusBadge,
} from "../../components/superadmin/SuperAdminUI";

const EMPTY_BRANCH = {
  branchName: "",
  branchCode: "",
  restaurantName: "",
  city: "",
  address: "",
  phone: "",
  isActive: true,
};

export default function BranchesModule() {
  const [state, setState] = useState({ loading: true, res: null });
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_BRANCH);
  const [saveBanner, setSaveBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetBranches({ status: statusFilter });
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaveBanner(null);
    try {
      const res = await apiSaveBranch(editing?.id, form);
      setSaveBanner(res);
      if (res.success) {
        setModalOpen(false);
        setEditing(null);
        setForm(EMPTY_BRANCH);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "branchName", label: "Branch Name", sortable: true },
    { key: "branchCode", label: "Branch Code", sortable: true },
    { key: "restaurantName", label: "Restaurant", sortable: true },
    { key: "city", label: "City", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (b) => <SaStatusBadge status={b.isActive === false ? "Inactive" : b.status || "Active"} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (b) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setSelected(b)}>
            Details
          </button>
          <button
            type="button"
            className="sa-btn sa-btn-secondary"
            onClick={() => {
              setEditing(b);
              setForm({ ...EMPTY_BRANCH, ...b });
              setModalOpen(true);
            }}
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <SaModuleHeader
        title="Branch Management"
        subtitle="Directory of restaurant branches, QR menu branch codes (/r/:branchCode/menu), and activation state."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sa-btn sa-btn-secondary" onClick={load} disabled={state.loading}>
              {state.loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              className="sa-btn sa-btn-primary"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY_BRANCH);
                setModalOpen(true);
              }}
            >
              + Add Branch
            </button>
          </div>
        }
      />

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

      <SaDataTable
        columns={columns}
        rows={rows}
        searchPlaceholder="Search branches, codes, or cities..."
        filters={
          <select
            className="sa-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter branches by status"
          >
            <option value="all">All Branches</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        }
      />

      <SaModal isOpen={Boolean(selected)} title="Branch Details" onClose={() => setSelected(null)}>
        {selected && (
          <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
            <div><strong>Branch:</strong> {selected.branchName} ({selected.branchCode})</div>
            <div><strong>Restaurant:</strong> {selected.restaurantName}</div>
            <div><strong>City &amp; Address:</strong> {selected.city} — {selected.address}</div>
            <div><strong>Phone:</strong> {selected.phone || "—"}</div>
            <div><strong>QR Menu URL:</strong> <code>/r/{selected.branchCode}/menu</code></div>
          </div>
        )}
      </SaModal>

      <SaModal isOpen={modalOpen} title={editing ? "Edit Branch" : "Add Branch"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="sa-form-grid">
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-br-name">Branch Name *</label>
            <input
              id="sa-br-name"
              className="sa-input"
              required
              value={form.branchName}
              onChange={(e) => setForm((p) => ({ ...p, branchName: e.target.value }))}
            />
          </div>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-br-code">Branch Code *</label>
            <input
              id="sa-br-code"
              className="sa-input"
              required
              value={form.branchCode}
              onChange={(e) => setForm((p) => ({ ...p, branchCode: e.target.value }))}
              placeholder="e.g. blr-indiranagar"
            />
          </div>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-br-rest">Restaurant Association *</label>
            <input
              id="sa-br-rest"
              className="sa-input"
              required
              value={form.restaurantName}
              onChange={(e) => setForm((p) => ({ ...p, restaurantName: e.target.value }))}
            />
          </div>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-br-city">City *</label>
            <input
              id="sa-br-city"
              className="sa-input"
              required
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            />
          </div>
          <div className="sa-field sa-field-full">
            <label className="sa-label" htmlFor="sa-br-addr">Address *</label>
            <textarea
              id="sa-br-addr"
              className="sa-textarea"
              required
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div className="sa-field sa-field-full" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Branch Active
            </label>
            <button type="submit" className="sa-btn sa-btn-primary" disabled={busy}>
              {busy ? "Saving..." : editing ? "Update Branch" : "Create Branch"}
            </button>
          </div>
        </form>
      </SaModal>
    </div>
  );
}
