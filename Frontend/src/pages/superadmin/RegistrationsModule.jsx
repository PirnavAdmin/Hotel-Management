import React, { useCallback, useEffect, useState } from "react";
import {
  apiApproveRegistration,
  apiGetRegistrations,
  apiRejectRegistration,
} from "../../api/superAdminApi";
import {
  SaConfirmDialog,
  SaDataTable,
  SaModal,
  SaModuleHeader,
  SaStateBanner,
  SaStatusBadge,
} from "../../components/superadmin/SuperAdminUI";

export default function RegistrationsModule() {
  const [tab, setTab] = useState("Pending");
  const [state, setState] = useState({ loading: true, res: null });
  const [selected, setSelected] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionBanner, setActionBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetRegistrations({ status: tab });
    setState({ loading: false, res });
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = Array.isArray(state.res?.data)
    ? state.res.data
    : Array.isArray(state.res?.data?.items)
      ? state.res.data.items
      : [];

  const handleApprove = async () => {
    if (!approveTarget || busy) return;
    setBusy(true);
    setActionBanner(null);
    try {
      const res = await apiApproveRegistration(approveTarget.id);
      setActionBanner(res);
      if (res.success) {
        setApproveTarget(null);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget || busy) return;
    setBusy(true);
    setActionBanner(null);
    try {
      const res = await apiRejectRegistration(rejectTarget.id, reason);
      setActionBanner(res);
      if (res.success) {
        setRejectTarget(null);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "organizationName", label: "Organization", sortable: true },
    { key: "restaurantName", label: "Restaurant", sortable: true },
    { key: "branchName", label: "Primary Branch" },
    { key: "ownerName", label: "Owner" },
    { key: "city", label: "City", sortable: true },
    { key: "status", label: "Status", render: (r) => <SaStatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setSelected(r)}>
            Details
          </button>
          {String(r.status || "").toLowerCase().includes("pending") && (
            <>
              <button type="button" className="sa-btn sa-btn-primary" onClick={() => setApproveTarget(r)}>
                Approve
              </button>
              <button type="button" className="sa-btn sa-btn-danger" onClick={() => setRejectTarget(r)}>
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <SaModuleHeader
        title="Restaurant Registration Approvals"
        subtitle="Review incoming restaurant onboarding requests, verify GSTIN/details, and approve or reject with audit reason."
        actions={
          <div style={{ display: "flex", gap: 6 }}>
            {["Pending", "Approved", "Rejected"].map((t) => (
              <button
                key={t}
                type="button"
                className={`sa-btn ${tab === t ? "sa-btn-primary" : "sa-btn-secondary"}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />

      {actionBanner && !actionBanner.success && (
        <div className={`sa-banner ${actionBanner.integrationPending ? "sa-banner-pending" : "sa-banner-error"}`} role="alert">
          {actionBanner.error}
        </div>
      )}

      {actionBanner?.success && (
        <div className="sa-banner sa-banner-success" role="status">
          Registration status updated successfully.
        </div>
      )}

      <SaStateBanner
        loading={state.loading}
        integrationPending={state.res?.integrationPending}
        error={state.res && !state.res.success ? state.res.error : ""}
        endpoint={state.res?.endpoint}
        onRetry={load}
      />

      <SaDataTable columns={columns} rows={rows} searchPlaceholder="Search registrations..." />

      <SaModal isOpen={Boolean(selected)} title="Registration Details" onClose={() => setSelected(null)}>
        {selected && (
          <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
            <div><strong>Organization:</strong> {selected.organizationName}</div>
            <div><strong>Restaurant:</strong> {selected.restaurantName}</div>
            <div><strong>Branch:</strong> {selected.branchName}</div>
            <div><strong>Owner:</strong> {selected.ownerName} ({selected.email}, {selected.phone})</div>
            <div><strong>City &amp; Address:</strong> {selected.city} — {selected.address}</div>
            <div><strong>GSTIN:</strong> {selected.gstin || "Not provided"}</div>
            <div><strong>Status:</strong> <SaStatusBadge status={selected.status} /></div>
            {selected.rejectionReason && <div><strong>Rejection Reason:</strong> {selected.rejectionReason}</div>}
          </div>
        )}
      </SaModal>

      <SaConfirmDialog
        isOpen={Boolean(approveTarget)}
        title="Confirm Registration Approval"
        message={`Approve "${approveTarget?.restaurantName}" (${approveTarget?.organizationName}) and provision their tenant & branch?`}
        confirmLabel="Approve Registration"
        busy={busy}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleApprove}
      />

      <SaConfirmDialog
        isOpen={Boolean(rejectTarget)}
        title="Reject Registration"
        message={`Provide a mandatory rejection reason for "${rejectTarget?.restaurantName}".`}
        confirmLabel="Reject Registration"
        danger
        requireReason
        reasonLabel="Mandatory Rejection Reason *"
        busy={busy}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
