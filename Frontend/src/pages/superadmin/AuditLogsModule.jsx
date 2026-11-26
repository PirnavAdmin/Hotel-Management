import React, { useCallback, useEffect, useState } from "react";
import { apiGetPlatformAuditLogs } from "../../api/superAdminApi";
import { SaDataTable, SaModuleHeader, SaStateBanner } from "../../components/superadmin/SuperAdminUI";

export default function AuditLogsModule() {
  const [actionFilter, setActionFilter] = useState("all");
  const [state, setState] = useState({ loading: true, res: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetPlatformAuditLogs({ action: actionFilter, pageSize: 50 });
    setState({ loading: false, res });
  }, [actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const raw = state.res?.data;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.logs)
      ? raw.logs
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

  const columns = [
    { key: "timestamp", label: "Timestamp", sortable: true, render: (r) => r.timestamp || r.createdAt || "—" },
    { key: "actor", label: "Actor", sortable: true, render: (r) => r.performedBy || r.actor || r.username || "—" },
    { key: "action", label: "Action", sortable: true, render: (r) => r.action || "—" },
    { key: "tenant", label: "Tenant", render: (r) => r.tenantName || "Single-Tenant Scope" },
    { key: "entity", label: "Entity", render: (r) => r.tableName || r.entity || r.entityName || "—" },
  ];

  return (
    <div>
      <SaModuleHeader
        title="Platform Audit Logs"
        subtitle="Activity history across actors, actions, entities, and timestamps (connected to /api/v1/audit/logs)."
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

      <SaDataTable
        columns={columns}
        rows={rows}
        searchPlaceholder="Search actor, action, or entity..."
        filters={
          <select
            className="sa-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter audit logs by action"
          >
            <option value="all">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
          </select>
        }
      />
    </div>
  );
}
