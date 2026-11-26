import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiCreateUser, apiGetUsers, apiUpdateUser } from "../../api/userApi";
import { apiGetRoles } from "../../api/roleApi";
import { useDialogAccessibility } from "../../utils/useDialogAccessibility";

const STANDARD_SAAS_ROLES = [
  "RestaurantOwner",
  "RestaurantAdmin",
  "BranchManager",
  "Cashier",
  "Waiter",
  "Chef",
];

const EMPTY_FORM = {
  username: "",
  fullName: "",
  email: "",
  phone: "",
  role: "RestaurantAdmin",
  customRoleName: "",
  restaurantName: "",
  branchName: "",
  password: "",
  isActive: true,
};

export function MultiAdminManagement({ showToast }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(STANDARD_SAAS_ROLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const viewDialogRef = useRef(null);
  const formDialogRef = useRef(null);

  useDialogAccessibility({
    isOpen: Boolean(viewUser),
    onClose: () => setViewUser(null),
    dialogRef: viewDialogRef,
  });

  useDialogAccessibility({
    isOpen: modalOpen,
    onClose: () => setModalOpen(false),
    dialogRef: formDialogRef,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, rolesRes] = await Promise.all([apiGetUsers(), apiGetRoles()]);
      if (usersRes?.success) {
        const raw = usersRes.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.users)
            ? raw.users
            : Array.isArray(raw?.data)
              ? raw.data
              : Array.isArray(raw?.items)
                ? raw.items
                : [];
        setUsers(list);
      } else {
        setError(usersRes?.error || "Unable to load users from /api/v1/users.");
      }

      if (rolesRes?.success && Array.isArray(rolesRes.data)) {
        const merged = [...STANDARD_SAAS_ROLES];
        rolesRes.data.forEach((r) => {
          const name = String(r.roleName || r.name || "").trim();
          if (name && !merged.some((m) => m.toLowerCase() === name.toLowerCase())) {
            merged.push(name);
          }
        });
        setRoles(merged);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const uname = String(u.username || u.Username || "").toLowerCase();
      const fname = String(u.fullName || u.name || u.FullName || "").toLowerCase();
      const email = String(u.email || u.Email || "").toLowerCase();
      const role = String(u.role || u.Role || u.roleName || "").toLowerCase();
      const active = u.isActive !== false;

      if (q && !uname.includes(q) && !fname.includes(q) && !email.includes(q)) return false;
      if (roleFilter !== "all" && role !== roleFilter.toLowerCase()) return false;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      username: u.username || u.Username || "",
      fullName: u.fullName || u.name || u.FullName || "",
      email: u.email || u.Email || "",
      phone: u.phone || u.mobile || "",
      role: u.role || u.Role || "RestaurantAdmin",
      customRoleName: "",
      restaurantName: u.restaurantName || "",
      branchName: u.branchName || "",
      password: "",
      isActive: u.isActive !== false,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!form.username.trim() || !form.fullName.trim() || !form.email.trim()) {
      setFormError("Username, Full Name, and Email are required.");
      return;
    }
    if (!editingUser && form.password.length < 6) {
      setFormError("Initial password must be at least 6 characters.");
      return;
    }

    const effectiveRole =
      form.role === "__custom__" && form.customRoleName.trim()
        ? form.customRoleName.trim()
        : form.role;

    const payload = {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: effectiveRole,
      restaurantName: form.restaurantName.trim() || undefined,
      branchName: form.branchName.trim() || undefined,
      isActive: form.isActive,
      ...(form.password ? { password: form.password } : {}),
    };

    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");
    try {
      const uid = editingUser?.id || editingUser?.userId;
      const res = uid ? await apiUpdateUser(uid, payload) : await apiCreateUser(payload);
      if (res?.success) {
        setModalOpen(false);
        showToast?.(uid ? "Admin/user updated." : "Admin/user created.");
        loadData();
      } else {
        setFormError(res?.error || "Failed to save user.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u) => {
    const uid = u.id || u.userId;
    if (!uid) return;
    const res = await apiUpdateUser(uid, { ...u, isActive: u.isActive === false });
    if (res?.success) {
      showToast?.(`User ${u.isActive === false ? "activated" : "deactivated"}.`);
      loadData();
    } else {
      showToast?.(res?.error || "Unable to update user status.");
    }
  };

  return (
    <section style={{ padding: "1.25rem", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)" }}>
            Multiple Admin &amp; Branch Staff Management
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Manage Restaurant Owners, multiple Restaurant Admins, Branch Managers, Cashiers, Waiters, Chefs, and custom roles.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{
            padding: "9px 16px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent-amber, #f59e0b)",
            color: "#0b1120",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Add Admin / Staff
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search username, name, or email..."
          aria-label="Search users"
          style={{ flex: "1 1 220px", maxWidth: 320, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-main)" }}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          aria-label="Filter by role"
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-main)" }}
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
          <option value="admin">admin (legacy)</option>
          <option value="pos">pos (legacy)</option>
          <option value="kot">kot (legacy)</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by activation status"
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-main)" }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Loading users...</div>
      ) : error ? (
        <div role="alert" style={{ padding: 14, borderRadius: 10, background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>
          {error}
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: 12, background: "var(--bg-card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                <th style={{ padding: 12 }}>Username</th>
                <th style={{ padding: 12 }}>Name</th>
                <th style={{ padding: 12 }}>Role</th>
                <th style={{ padding: 12 }}>Restaurant / Branch</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
                    No matching users found.
                  </td>
                </tr>
              ) : (
                paged.map((u) => {
                  const active = u.isActive !== false;
                  return (
                    <tr key={u.id || u.userId || u.username} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: 12, fontWeight: 600 }}>{u.username || u.Username}</td>
                      <td style={{ padding: 12 }}>{u.fullName || u.name || "—"}</td>
                      <td style={{ padding: 12 }}>{u.role || u.Role || "—"}</td>
                      <td style={{ padding: 12, color: "var(--text-muted)" }}>
                        {u.restaurantName || u.branchName
                          ? `${u.restaurantName || "—"} / ${u.branchName || "—"}`
                          : "Default Outlet"}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{ fontWeight: 700, color: active ? "#4ade80" : "#fca5a5" }}>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => setViewUser(u)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-main)", cursor: "pointer" }}>
                          View
                        </button>
                        <button type="button" onClick={() => openEdit(u)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-main)", cursor: "pointer" }}>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleToggleActive(u)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-subtle)", background: "transparent", color: active ? "#fca5a5" : "#4ade80", cursor: "pointer" }}>
                          {active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
        <span>Page {safePage} of {totalPages} ({filtered.length} users)</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>

      {viewUser && (
        <div role="presentation" onClick={() => setViewUser(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(2,6,23,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div ref={viewDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="User details" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "var(--bg-card, #0f172a)", borderRadius: 14, padding: 20, border: "1px solid var(--border-subtle)" }}>
            <h3 style={{ marginTop: 0 }}>User Details</h3>
            <p><strong>Username:</strong> {viewUser.username || viewUser.Username}</p>
            <p><strong>Full Name:</strong> {viewUser.fullName || viewUser.name}</p>
            <p><strong>Email:</strong> {viewUser.email || "—"}</p>
            <p><strong>Role:</strong> {viewUser.role || viewUser.Role}</p>
            <p><strong>Restaurant:</strong> {viewUser.restaurantName || "Pending multi-tenant assignment API"}</p>
            <p><strong>Branch:</strong> {viewUser.branchName || "Pending multi-tenant assignment API"}</p>
            <button type="button" onClick={() => setViewUser(null)}>Close</button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div role="presentation" onClick={() => !submitting && setModalOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(2,6,23,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <form ref={formDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={editingUser ? "Edit user" : "Create user"} onClick={(e) => e.stopPropagation()} onSubmit={handleSave} style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", background: "var(--bg-card, #0f172a)", borderRadius: 14, padding: 20, border: "1px solid var(--border-subtle)", display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>{editingUser ? "Edit Admin / Staff" : "Create Admin / Staff"}</h3>
            {formError && <div role="alert" style={{ color: "#fca5a5", fontSize: 13 }}>{formError}</div>}
            <label htmlFor="mam-username" style={{ fontSize: 12, color: "var(--text-muted)" }}>Username *</label>
            <input id="mam-username" placeholder="Username *" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            <label htmlFor="mam-fullname" style={{ fontSize: 12, color: "var(--text-muted)" }}>Full Name *</label>
            <input id="mam-fullname" placeholder="Full Name *" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
            <label htmlFor="mam-email" style={{ fontSize: 12, color: "var(--text-muted)" }}>Email *</label>
            <input id="mam-email" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <label htmlFor="mam-role" style={{ fontSize: 12, color: "var(--text-muted)" }}>Role *</label>
            <select id="mam-role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="__custom__">Custom Role...</option>
            </select>
            {form.role === "__custom__" && (
              <>
                <label htmlFor="mam-custom-role" style={{ fontSize: 12, color: "var(--text-muted)" }}>Custom Role Name *</label>
                <input id="mam-custom-role" placeholder="Custom Role Name *" value={form.customRoleName} onChange={(e) => setForm((p) => ({ ...p, customRoleName: e.target.value }))} />
              </>
            )}
            <label htmlFor="mam-restaurant" style={{ fontSize: 12, color: "var(--text-muted)" }}>Assigned Restaurant</label>
            <input id="mam-restaurant" placeholder="Assigned Restaurant (Multi-tenant)" value={form.restaurantName} onChange={(e) => setForm((p) => ({ ...p, restaurantName: e.target.value }))} />
            <label htmlFor="mam-branch" style={{ fontSize: 12, color: "var(--text-muted)" }}>Assigned Branch</label>
            <input id="mam-branch" placeholder="Assigned Branch (Multi-tenant)" value={form.branchName} onChange={(e) => setForm((p) => ({ ...p, branchName: e.target.value }))} />
            {!editingUser && (
              <>
                <label htmlFor="mam-password" style={{ fontSize: 12, color: "var(--text-muted)" }}>Initial Password *</label>
                <input id="mam-password" type="password" placeholder="Initial Password *" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              </>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Account Active
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
              <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save User"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
