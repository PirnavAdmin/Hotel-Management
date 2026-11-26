import React, { useCallback, useEffect, useState } from "react";
import { apiGetSuperAdminUsers, apiSaveSuperAdminUser } from "../../api/superAdminApi";
import {
  SaDataTable,
  SaModal,
  SaModuleHeader,
  SaStateBanner,
  SaStatusBadge,
} from "../../components/superadmin/SuperAdminUI";

const EMPTY_USER = {
  username: "",
  fullName: "",
  email: "",
  phone: "",
  role: "RestaurantAdmin",
  restaurantName: "",
  branchName: "",
  password: "",
  isActive: true,
};

export default function UsersModule() {
  const [state, setState] = useState({ loading: true, res: null });
  const [roleFilter, setRoleFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(EMPTY_USER);
  const [saveBanner, setSaveBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetSuperAdminUsers();
    setState({ loading: false, res });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rawRows = Array.isArray(state.res?.data) ? state.res.data : [];
  const rows = rawRows.filter((u) => {
    if (roleFilter === "all") return true;
    return String(u.role || u.Role || "").toLowerCase() === roleFilter.toLowerCase();
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaveBanner(null);
    try {
      const res = await apiSaveSuperAdminUser(editing?.id || editing?.userId, form);
      setSaveBanner(res);
      if (res.success) {
        setModalOpen(false);
        setEditing(null);
        setForm(EMPTY_USER);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "username", label: "Username", sortable: true, render: (u) => u.username || u.Username || "—" },
    { key: "fullName", label: "Name", sortable: true, render: (u) => u.fullName || u.name || u.FullName || "—" },
    { key: "email", label: "Email", render: (u) => u.email || u.Email || "—" },
    { key: "role", label: "Role", render: (u) => u.role || u.Role || "—" },
    {
      key: "status",
      label: "Status",
      render: (u) => <SaStatusBadge status={u.isActive === false ? "Inactive" : "Active"} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (u) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setSelectedUser(u)}>
            Details
          </button>
          <button
            type="button"
            className="sa-btn sa-btn-secondary"
            onClick={() => {
              setEditing(u);
              setForm({
                username: u.username || u.Username || "",
                fullName: u.fullName || u.name || "",
                email: u.email || "",
                phone: u.phone || u.mobile || "",
                role: u.role || "RestaurantAdmin",
                restaurantName: u.restaurantName || "",
                branchName: u.branchName || "",
                password: "",
                isActive: u.isActive !== false,
              });
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
        title="Admin & User Management"
        subtitle="Manage multiple Admin accounts, assign roles, and associate users with restaurants and branches (connected to /api/v1/users)."
        actions={
          <button
            type="button"
            className="sa-btn sa-btn-primary"
            onClick={() => {
              setEditing(null);
              setForm(EMPTY_USER);
              setModalOpen(true);
            }}
          >
            + Add Admin / User
          </button>
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
        rowKey={(u) => u.id || u.userId || u.username}
        searchPlaceholder="Search admins or users..."
        filters={
          <select
            className="sa-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter users by role"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="pos">POS / Cashier</option>
            <option value="kot">Kitchen KOT</option>
          </select>
        }
      />

      <SaModal isOpen={Boolean(selectedUser)} title="User Details" onClose={() => setSelectedUser(null)}>
        {selectedUser && (
          <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
            <div><strong>Username:</strong> {selectedUser.username || selectedUser.Username}</div>
            <div><strong>Name:</strong> {selectedUser.fullName || selectedUser.name}</div>
            <div><strong>Email:</strong> {selectedUser.email || "—"}</div>
            <div><strong>Role:</strong> {selectedUser.role || "—"}</div>
            <div><strong>Restaurant Assignment:</strong> {selectedUser.restaurantName || "Pending multi-tenant schema"}</div>
            <div><strong>Branch Assignment:</strong> {selectedUser.branchName || "Pending multi-tenant schema"}</div>
          </div>
        )}
      </SaModal>

      <SaModal isOpen={modalOpen} title={editing ? "Edit Admin / User" : "Add Admin / User"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="sa-form-grid">
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-usr-username">Username *</label>
            <input
              id="sa-usr-username"
              className="sa-input"
              required
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            />
          </div>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-usr-name">Full Name *</label>
            <input
              id="sa-usr-name"
              className="sa-input"
              required
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            />
          </div>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-usr-email">Email *</label>
            <input
              id="sa-usr-email"
              type="email"
              className="sa-input"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-usr-role">Role *</label>
            <select
              id="sa-usr-role"
              className="sa-select"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="RestaurantOwner">Restaurant Owner</option>
              <option value="RestaurantAdmin">Restaurant Admin</option>
              <option value="BranchManager">Branch Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="Waiter">Waiter</option>
              <option value="Chef">Chef</option>
            </select>
          </div>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-usr-rest">Assigned Restaurant</label>
            <input
              id="sa-usr-rest"
              className="sa-input"
              value={form.restaurantName}
              onChange={(e) => setForm((p) => ({ ...p, restaurantName: e.target.value }))}
              placeholder="Pending multi-tenant API"
            />
          </div>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-usr-branch">Assigned Branch</label>
            <input
              id="sa-usr-branch"
              className="sa-input"
              value={form.branchName}
              onChange={(e) => setForm((p) => ({ ...p, branchName: e.target.value }))}
              placeholder="Pending multi-tenant API"
            />
          </div>
          {!editing && (
            <div className="sa-field sa-field-full">
              <label className="sa-label" htmlFor="sa-usr-pwd">Initial Password *</label>
              <input
                id="sa-usr-pwd"
                type="password"
                className="sa-input"
                required
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
          )}
          <div className="sa-field sa-field-full" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Account Active
            </label>
            <button type="submit" className="sa-btn sa-btn-primary" disabled={busy}>
              {busy ? "Saving..." : editing ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </SaModal>
    </div>
  );
}
