import React, { useCallback, useEffect, useState } from "react";
import { apiAddTicketNote, apiGetSupportTickets } from "../../api/superAdminApi";
import {
  SaDataTable,
  SaModal,
  SaModuleHeader,
  SaStateBanner,
  SaStatusBadge,
} from "../../components/superadmin/SuperAdminUI";

export default function SupportModule() {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [state, setState] = useState({ loading: true, res: null });
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [noteBanner, setNoteBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetSupportTickets({ priority: priorityFilter });
    setState({ loading: false, res });
  }, [priorityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = Array.isArray(state.res?.data)
    ? state.res.data
    : Array.isArray(state.res?.data?.items)
      ? state.res.data.items
      : [];

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selected || !note.trim() || busy) return;
    setBusy(true);
    setNoteBanner(null);
    try {
      const res = await apiAddTicketNote(selected.id, note.trim());
      setNoteBanner(res);
      if (res.success) {
        setNote("");
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "ticketNumber", label: "Ticket #", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "organizationName", label: "Tenant" },
    { key: "priority", label: "Priority", sortable: true },
    { key: "status", label: "Status", render: (r) => <SaStatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setSelected(r)}>
          Open Ticket
        </button>
      ),
    },
  ];

  return (
    <div>
      <SaModuleHeader
        title="Support Management"
        subtitle="Track tenant onboarding tickets, priority queues, and internal support notes."
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

      <SaDataTable
        columns={columns}
        rows={rows}
        searchPlaceholder="Search support tickets..."
        filters={
          <select
            className="sa-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter tickets by priority"
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        }
      />

      <SaModal isOpen={Boolean(selected)} title="Support Ticket Details" onClose={() => setSelected(null)}>
        {selected && (
          <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
            <div><strong>Ticket #:</strong> {selected.ticketNumber}</div>
            <div><strong>Tenant:</strong> {selected.organizationName}</div>
            <div><strong>Priority:</strong> {selected.priority} · <SaStatusBadge status={selected.status} /></div>
            <div><strong>Description:</strong> {selected.description}</div>

            {noteBanner && (
              <div className={`sa-banner ${noteBanner.success ? "sa-banner-success" : noteBanner.integrationPending ? "sa-banner-pending" : "sa-banner-error"}`}>
                {noteBanner.success ? "Internal note saved." : noteBanner.error}
              </div>
            )}

            <form onSubmit={handleAddNote} style={{ display: "grid", gap: 10 }}>
              <label className="sa-label" htmlFor="sa-ticket-note">Internal Support Note</label>
              <textarea
                id="sa-ticket-note"
                className="sa-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add internal troubleshooting or SLA note..."
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={busy || !note.trim()}>
                  {busy ? "Saving..." : "Save Internal Note"}
                </button>
              </div>
            </form>
          </div>
        )}
      </SaModal>
    </div>
  );
}
