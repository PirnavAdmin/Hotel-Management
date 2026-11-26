import React, { useCallback, useEffect, useState } from "react";
import { apiGetPlatformRoles, apiSaveRolePermissions } from "../../api/superAdminApi";
import { SaModal, SaModuleHeader, SaStateBanner } from "../../components/superadmin/SuperAdminUI";

const DEFAULT_ROLES = [
  { key: "RestaurantOwner", label: "Restaurant Owner" },
  { key: "RestaurantAdmin", label: "Restaurant Admin" },
  { key: "BranchManager", label: "Branch Manager" },
  { key: "Cashier", label: "Cashier" },
  { key: "Waiter", label: "Waiter" },
  { key: "Chef", label: "Chef" },
];

const PERMISSION_MODULES = [
  "Dine-In POS",
  "Takeaway",
  "Self-Service Queue",
  "Kitchen KOT",
  "Menu & Categories",
  "Invoices & Settlement",
  "Reports & Analytics",
  "Staff & Users",
  "Branch Settings",
];

const ACTIONS = ["view", "create", "edit", "delete", "manage"];

export default function RolesModule() {
  const [rolesState, setRolesState] = useState({ loading: true, res: null });
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [selectedRole, setSelectedRole] = useState("RestaurantOwner");
  const [matrix, setMatrix] = useState({});
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");
  const [saveBanner, setSaveBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRolesState((s) => ({ ...s, loading: true }));
    const res = await apiGetPlatformRoles();
    setRolesState({ loading: false, res });
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const apiRoleEntries = res.data.map((r) => ({
        key: r.name || r.roleName || String(r.id),
        label: r.displayName || r.name || r.roleName || `Role ${r.id}`,
      }));
      const merged = [...DEFAULT_ROLES];
      apiRoleEntries.forEach((entry) => {
        if (!merged.some((m) => m.key.toLowerCase() === entry.key.toLowerCase())) {
          merged.push(entry);
        }
      });
      setRoles(merged);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePerm = (moduleName, action) => {
    setMatrix((prev) => {
      const rolePerms = prev[selectedRole] || {};
      const modPerms = rolePerms[moduleName] || {};
      return {
        ...prev,
        [selectedRole]: {
          ...rolePerms,
          [moduleName]: { ...modPerms, [action]: !modPerms[action] },
        },
      };
    });
  };

  const handleSavePermissions = async () => {
    if (busy) return;
    setBusy(true);
    setSaveBanner(null);
    try {
      const res = await apiSaveRolePermissions(selectedRole, matrix[selectedRole] || {});
      setSaveBanner(res);
    } finally {
      setBusy(false);
    }
  };

  const handleAddCustomRole = (e) => {
    e.preventDefault();
    const clean = customRoleName.trim();
    if (clean.length < 2) return;
    const key = clean.replace(/\s+/g, "");
    if (!roles.some((r) => r.key.toLowerCase() === key.toLowerCase())) {
      setRoles((prev) => [...prev, { key, label: clean }]);
    }
    setSelectedRole(key);
    setCustomRoleName("");
    setCustomModalOpen(false);
  };

  return (
    <div>
      <SaModuleHeader
        title="Roles & Permissions"
        subtitle="Configure granular View, Create, Edit, Delete, and Manage permissions across restaurant and branch roles."
        actions={
          <>
            <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setCustomModalOpen(true)}>
              + Custom Role
            </button>
            <button type="button" className="sa-btn sa-btn-primary" onClick={handleSavePermissions} disabled={busy}>
              {busy ? "Saving..." : "Save Permissions"}
            </button>
          </>
        }
      />

      {saveBanner && (
        <div
          className={`sa-banner ${saveBanner.success ? "sa-banner-success" : saveBanner.integrationPending ? "sa-banner-pending" : "sa-banner-error"}`}
          role="alert"
        >
          {saveBanner.success ? "Permissions saved successfully." : saveBanner.error}
        </div>
      )}

      <SaStateBanner
        loading={rolesState.loading}
        integrationPending={rolesState.res?.integrationPending}
        error={rolesState.res && !rolesState.res.success ? rolesState.res.error : ""}
        endpoint={rolesState.res?.endpoint}
        onRetry={load}
      />

      <div className="sa-toolbar" role="tablist" aria-label="Role selector">
        {roles.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={selectedRole === r.key}
            className={`sa-btn ${selectedRole === r.key ? "sa-btn-primary" : "sa-btn-secondary"}`}
            onClick={() => setSelectedRole(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Module</th>
              {ACTIONS.map((a) => (
                <th key={a} style={{ textTransform: "uppercase" }}>{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map((mod) => (
              <tr key={mod}>
                <td style={{ fontWeight: 600 }}>{mod}</td>
                {ACTIONS.map((action) => {
                  const checked = Boolean(matrix[selectedRole]?.[mod]?.[action]);
                  return (
                    <td key={action}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerm(mod, action)}
                        aria-label={`${selectedRole} ${mod} ${action}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SaModal isOpen={customModalOpen} title="Create Custom Role" onClose={() => setCustomModalOpen(false)}>
        <form onSubmit={handleAddCustomRole} style={{ display: "grid", gap: 14 }}>
          <div className="sa-field">
            <label className="sa-label" htmlFor="sa-custom-role">Role Name *</label>
            <input
              id="sa-custom-role"
              className="sa-input"
              required
              value={customRoleName}
              onChange={(e) => setCustomRoleName(e.target.value)}
              placeholder="e.g. Regional Auditor"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setCustomModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="sa-btn sa-btn-primary">
              Add Role to Matrix
            </button>
          </div>
        </form>
      </SaModal>
    </div>
  );
}
