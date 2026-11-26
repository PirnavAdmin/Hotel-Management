import React, { useCallback, useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, RefreshCw } from "lucide-react";
import {
  apiGetAuthorizedWorkspaces,
  apiSwitchWorkspaceContext,
} from "../../api/tenantWorkspaceApi";

export function WorkspaceSwitcher({ currentSession, onContextSwitched }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading: false, res: null, loadedOnce: false });
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRestId, setSelectedRestId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [switchResult, setSwitchResult] = useState(null);
  const [switching, setSwitching] = useState(false);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const loadWorkspaces = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetAuthorizedWorkspaces();
    setState({ loading: false, res, loadedOnce: true });
    if (res.success && Array.isArray(res.data?.organizations) && res.data.organizations.length > 0) {
      const firstOrg = res.data.organizations[0];
      const firstRest = firstOrg.restaurants?.[0];
      const firstBranch = firstRest?.branches?.[0];
      setSelectedOrgId(String(res.data.activeOrganizationId || firstOrg.id || ""));
      setSelectedRestId(String(res.data.activeRestaurantId || firstRest?.id || ""));
      setSelectedBranchId(String(res.data.activeBranchId || firstBranch?.id || ""));
    }
  }, []);

  useEffect(() => {
    if (open && !state.loadedOnce && !state.loading) {
      loadWorkspaces();
    }
  }, [open, state.loadedOnce, state.loading, loadWorkspaces]);

  const orgs = Array.isArray(state.res?.data?.organizations) ? state.res.data.organizations : [];
  const activeOrg = orgs.find((o) => String(o.id) === String(selectedOrgId)) || orgs[0];
  const restaurants = Array.isArray(activeOrg?.restaurants) ? activeOrg.restaurants : [];
  const activeRest = restaurants.find((r) => String(r.id) === String(selectedRestId)) || restaurants[0];
  const branches = Array.isArray(activeRest?.branches) ? activeRest.branches : [];

  const activeLabel =
    currentSession?.branchName ||
    currentSession?.restaurantName ||
    "Default Workspace";

  const handleSwitch = async () => {
    if (!selectedOrgId || !selectedRestId || !selectedBranchId || switching) return;
    setSwitching(true);
    setSwitchResult(null);
    try {
      const res = await apiSwitchWorkspaceContext({
        organizationId: selectedOrgId,
        restaurantId: selectedRestId,
        branchId: selectedBranchId,
      });
      setSwitchResult(res);
      if (res.success) {
        onContextSwitched?.(res.data);
        setOpen(false);
      }
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-label="Workspace switcher"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid var(--border-subtle, rgba(148,163,184,0.28))",
          background: "var(--bg-secondary, rgba(30,41,59,0.75))",
          color: "var(--text-main, #f8fafc)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          maxWidth: 220,
        }}
      >
        <Building2 size={14} aria-hidden="true" />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeLabel}
        </span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Switch organization, restaurant, or branch"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            zIndex: 80,
            width: "min(340px, 92vw)",
            padding: 14,
            borderRadius: 12,
            background: "var(--bg-card, #0f172a)",
            border: "1px solid var(--border-subtle, rgba(148,163,184,0.28))",
            boxShadow: "0 18px 40px rgba(2,6,23,0.45)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 13 }}>Tenant Workspace Switcher</strong>
            <button
              type="button"
              onClick={loadWorkspaces}
              aria-label="Refresh workspaces"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {state.loading ? (
            <div style={{ fontSize: 12.5, color: "var(--text-muted, #94a3b8)" }}>
              Loading authorized organizations &amp; branches...
            </div>
          ) : state.res && !state.res.success ? (
            <div
              role="status"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.45,
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.38)",
                color: "#fde68a",
              }}
            >
              <strong>{state.res.integrationPending ? "Integration Pending: " : "Error: "}</strong>
              {state.res.error}
            </div>
          ) : orgs.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--text-muted, #94a3b8)" }}>
              No multi-branch workspace assignments returned for this account.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                Organization
                <select
                  value={selectedOrgId}
                  onChange={(e) => {
                    const nextOrg = orgs.find((o) => String(o.id) === e.target.value);
                    const nextRest = nextOrg?.restaurants?.[0];
                    const nextBr = nextRest?.branches?.[0];
                    setSelectedOrgId(e.target.value);
                    setSelectedRestId(String(nextRest?.id || ""));
                    setSelectedBranchId(String(nextBr?.id || ""));
                  }}
                  style={{ width: "100%", marginTop: 4, padding: 6, borderRadius: 6 }}
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                Restaurant
                <select
                  value={selectedRestId}
                  onChange={(e) => {
                    const nextRest = restaurants.find((r) => String(r.id) === e.target.value);
                    const nextBr = nextRest?.branches?.[0];
                    setSelectedRestId(e.target.value);
                    setSelectedBranchId(String(nextBr?.id || ""));
                  }}
                  style={{ width: "100%", marginTop: 4, padding: 6, borderRadius: 6 }}
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                Branch
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  style={{ width: "100%", marginTop: 4, padding: 6, borderRadius: 6 }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>

              {switchResult && !switchResult.success && (
                <div style={{ fontSize: 12, color: "#fca5a5" }}>{switchResult.error}</div>
              )}

              <button
                type="button"
                disabled={switching || !selectedBranchId}
                onClick={handleSwitch}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent-amber, #f59e0b)",
                  color: "#0b1120",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {switching ? "Switching..." : "Switch Active Branch"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
