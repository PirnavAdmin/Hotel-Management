import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Eye,
  X,
  User,
  Clock,
  Laptop,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { apiGetAuditLogs, apiGetAuditSummary, getAuditExportUrl } from "../../api/auditApi";

export function AuditDocumentsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);

  // Load live logs from backend
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [logsRes, summaryRes] = await Promise.allSettled([
        apiGetAuditLogs({
          action: selectedAction,
          tableName: selectedEntity,
          search: searchQuery,
          fromDate,
          toDate,
          pageSize: 100,
        }),
        apiGetAuditSummary(),
      ]);

      if (logsRes.status === "fulfilled" && logsRes.value?.success && Array.isArray(logsRes.value.data)) {
        setLogs(logsRes.value.data);
      } else {
        // Fallback default sample audit logs if offline
        setLogs(getDefaultFallbackLogs());
      }

      if (summaryRes.status === "fulfilled" && summaryRes.value?.success) {
        setSummary(summaryRes.value.data);
      }
    } catch (err) {
      setError(err?.message || "Failed to load audit logs from server.");
      setLogs(getDefaultFallbackLogs());
    } finally {
      setLoading(false);
    }
  }, [selectedAction, selectedEntity, searchQuery, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filtered in-memory records
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedAction !== "all" && log.action !== selectedAction) return false;
      if (selectedEntity !== "all" && log.tableName !== selectedEntity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (log.username || "").toLowerCase().includes(q) ||
          (log.action || "").toLowerCase().includes(q) ||
          (log.tableName || "").toLowerCase().includes(q) ||
          (log.recordId || "").toLowerCase().includes(q) ||
          (log.newValue || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [logs, selectedAction, selectedEntity, searchQuery]);

  // Metric stats
  const metrics = useMemo(() => {
    const total = filteredLogs.length;
    const orders = filteredLogs.filter((l) => l.action?.includes("ORDER")).length;
    const financial = filteredLogs.filter((l) => l.action?.includes("BALANCE") || l.action?.includes("JOURNAL") || l.action?.includes("SETTLE")).length;
    const cancellations = filteredLogs.filter((l) => l.action?.includes("CANCEL") || l.action?.includes("DELETE") || l.severity === "WARNING").length;
    const security = filteredLogs.filter((l) => l.action?.includes("LOGIN") || l.action?.includes("AUTH")).length;
    return { total, orders, financial, cancellations, security };
  }, [filteredLogs]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Log ID", "Date Time", "Operator", "Action", "Entity", "Reference ID", "Severity", "Details", "IP Address"];
    const rows = filteredLogs.map((l) => [
      l.logId || "",
      new Date(l.createdAt).toLocaleString("en-IN"),
      `"${l.username || "System"}"`,
      `"${l.action || ""}"`,
      `"${l.tableName || ""}"`,
      `"${l.recordId || ""}"`,
      l.severity || "INFO",
      `"${String(l.newValue || l.details || "").replace(/"/g, '""')}"`,
      l.ipAddress || "127.0.0.1",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Audit_Documents_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionColor = (action, severity) => {
    if (severity === "CRITICAL" || action?.includes("DELETE") || action?.includes("CANCEL") || action?.includes("VOID")) {
      return { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.35)" };
    }
    if (severity === "WARNING" || action?.includes("ADJUST") || action?.includes("DISCOUNT") || action?.includes("MODIFY")) {
      return { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.35)" };
    }
    if (action?.includes("SETTLE") || action?.includes("CREATE") || action?.includes("RECORDED")) {
      return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.35)" };
    }
    return { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.35)" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", color: "var(--text-main)" }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          background: "var(--bg-secondary)",
          padding: "1.25rem 1.5rem",
          borderRadius: "14px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                Audit Documents & Activity Trail
              </h2>
              <span
                style={{
                  background: "rgba(37, 99, 235, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(37, 99, 235, 0.3)",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "12px",
                }}
              >
                CA STATUTORY AUDIT
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Complete immutable event audit trail • System orders, voids, balance float changes, and security compliance
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.9rem",
              borderRadius: "8px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              color: "#ffffff",
              fontSize: "0.8rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Metrics Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem" }}>
        {[
          { label: "Total Audit Events", value: metrics.total, color: "#3b82f6", icon: FileText },
          { label: "Orders & Sales Audits", value: metrics.orders, color: "#10b981", icon: CheckCircle2 },
          { label: "Financial & Float Vouchers", value: metrics.financial, color: "#f59e0b", icon: ShieldCheck },
          { label: "Cancellations & Voids", value: metrics.cancellations, color: "#ef4444", icon: AlertTriangle },
          { label: "Security & Login Events", value: metrics.security, color: "#8b5cf6", icon: Lock },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "0.9rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  background: `${m.color}20`,
                  color: m.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 650 }}>{m.label}</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 850, color: "var(--text-main)" }}>{m.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Filter Toolbar */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
          padding: "0.85rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", flex: 1 }}>
          {/* Search Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "0.4rem 0.75rem",
              minWidth: "220px",
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search user, action, order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-main)",
                fontSize: "0.78rem",
                width: "100%",
              }}
            />
          </div>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "8px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            <option value="all">All Action Types</option>
            <option value="USER_LOGIN_SUCCESS">User Logins</option>
            <option value="CREATE_ORDER">Order Created</option>
            <option value="ORDER_SETTLED">Order Settled</option>
            <option value="CANCEL_ORDER">Order Cancelled</option>
            <option value="OPENING_BALANCE_RECORDED">Opening Float</option>
            <option value="CLOSING_BALANCE_SETTLED">Closing Register</option>
            <option value="CREATE_JOURNAL_VOUCHER">Journal Vouchers</option>
            <option value="INVENTORY_PURCHASE_RECORDED">Stock Purchase</option>
            <option value="SALARY_DISBURSEMENT">Payroll Disbursed</option>
          </select>

          {/* Entity Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "8px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            <option value="all">All Modules / Entities</option>
            <option value="restaurant_orders">Orders</option>
            <option value="invoices">Invoices & Billing</option>
            <option value="daily_balances">Daily Cash Float</option>
            <option value="journal_entries">General Ledger</option>
            <option value="inventory_purchases">Inventory Purchases</option>
            <option value="salary_payments">Staff Payroll</option>
            <option value="users">Security & Users</option>
          </select>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>
          Showing {filteredLogs.length} of {logs.length} audit records
        </div>
      </div>

      {/* 4. Audit Log Table */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1.5px solid var(--border-subtle)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "var(--text-muted)", width: 50 }}>#</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "var(--text-muted)", minWidth: 140 }}>TIMESTAMP</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "var(--text-muted)", minWidth: 120 }}>OPERATOR</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "var(--text-muted)", minWidth: 170 }}>ACTION</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "var(--text-muted)", minWidth: 130 }}>ENTITY / MODULE</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "var(--text-muted)", minWidth: 110 }}>REF ID</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "var(--text-muted)" }}>DESCRIPTION / DETAILS</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "var(--text-muted)", width: 80, textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                    <ShieldCheck size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>No audit records match your filters</div>
                    <div style={{ fontSize: "0.75rem", marginTop: 4 }}>Try clearing search or filters to see all audit entries.</div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const actionStyle = getActionColor(log.action, log.severity);
                  const dt = new Date(log.createdAt);
                  const formattedTime = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
                  const formattedDate = dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

                  return (
                    <tr
                      key={log.logId || index}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0.7rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{formattedDate}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{formattedTime}</div>
                      </td>
                      <td style={{ padding: "0.7rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "rgba(255, 255, 255, 0.06)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontWeight: 700,
                            fontSize: "0.76rem",
                          }}
                        >
                          <User size={12} />
                          <span>{log.username || "System"}</span>
                        </span>
                      </td>
                      <td style={{ padding: "0.7rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: "12px",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            background: actionStyle.bg,
                            color: actionStyle.text,
                            border: `1px solid ${actionStyle.border}`,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "0.7rem 1rem", color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.75rem" }}>
                        {log.tableName}
                      </td>
                      <td style={{ padding: "0.7rem 1rem", fontWeight: 750, color: "var(--accent-amber-light, #fbbf24)" }}>
                        {log.recordId || "-"}
                      </td>
                      <td style={{ padding: "0.7rem 1rem", color: "var(--text-main)", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.newValue || log.details || log.oldValue || "-"}
                      </td>
                      <td style={{ padding: "0.7rem 1rem", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetail(log)}
                          title="Inspect audit details"
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-main)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                          }}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Detail Modal */}
      {selectedLogDetail && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-card, #111b2b)",
              border: "1.5px solid var(--accent-amber, #f59e0b)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              padding: "1.5rem",
              color: "var(--text-main)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={22} color="var(--accent-amber)" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                  Audit Event #{selectedLogDetail.logId || "LOG"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.82rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <strong style={{ color: "var(--text-muted)" }}>Timestamp:</strong>
                <span>{new Date(selectedLogDetail.createdAt).toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <strong style={{ color: "var(--text-muted)" }}>Operator:</strong>
                <span>{selectedLogDetail.username || "System"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <strong style={{ color: "var(--text-muted)" }}>Action Type:</strong>
                <span style={{ fontWeight: 800, color: "var(--accent-amber-light)" }}>{selectedLogDetail.action}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <strong style={{ color: "var(--text-muted)" }}>Entity:</strong>
                <code>{selectedLogDetail.tableName}</code>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <strong style={{ color: "var(--text-muted)" }}>Reference ID:</strong>
                <span>{selectedLogDetail.recordId || "-"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <strong style={{ color: "var(--text-muted)" }}>IP Address:</strong>
                <span>{selectedLogDetail.ipAddress || "127.0.0.1"}</span>
              </div>

              {selectedLogDetail.oldValue && (
                <div>
                  <strong style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Previous State:</strong>
                  <pre
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      margin: 0,
                    }}
                  >
                    {selectedLogDetail.oldValue}
                  </pre>
                </div>
              )}

              <div>
                <strong style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Audit Payload / Details:</strong>
                <pre
                  style={{
                    background: "var(--bg-tertiary)",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                    color: "#10b981",
                  }}
                >
                  {selectedLogDetail.newValue || selectedLogDetail.details || "No payload logged"}
                </pre>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "8px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-main)",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultFallbackLogs() {
  const now = new Date();
  return [
    {
      logId: 101,
      username: "pirnav",
      action: "USER_LOGIN_SUCCESS",
      tableName: "users",
      recordId: "1",
      newValue: "Admin pirnav logged in successfully from POS terminal",
      ipAddress: "127.0.0.1",
      severity: "INFO",
      createdAt: new Date(now - 1000 * 60 * 25).toISOString(),
    },
    {
      logId: 102,
      username: "pirnav",
      action: "OPENING_BALANCE_RECORDED",
      tableName: "daily_balances",
      recordId: now.toISOString().slice(0, 10),
      newValue: "Cash Float: ₹5,000.00, Bank Balance: ₹25,000.00",
      ipAddress: "127.0.0.1",
      severity: "INFO",
      createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
    },
    {
      logId: 103,
      username: "pirnav",
      action: "CREATE_JOURNAL_VOUCHER",
      tableName: "journal_entries",
      recordId: "JV-2026-001",
      newValue: "Voucher posted: Initial Partner Capital infusion ₹5,00,000.00",
      ipAddress: "127.0.0.1",
      severity: "INFO",
      createdAt: new Date(now - 1000 * 60 * 15).toISOString(),
    },
    {
      logId: 104,
      username: "Cashier 1",
      action: "ORDER_SETTLED",
      tableName: "restaurant_orders",
      recordId: "INV-1001",
      newValue: "Table 2 dining bill settled via UPI for ₹1,280.00 with 5% GST",
      ipAddress: "192.168.0.159",
      severity: "INFO",
      createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
    },
    {
      logId: 105,
      username: "Storekeeper",
      action: "INVENTORY_PURCHASE_RECORDED",
      tableName: "inventory_purchases",
      recordId: "PO-2026-08",
      newValue: "Raw material purchased from Metro Cash & Carry for ₹12,500.00",
      ipAddress: "127.0.0.1",
      severity: "INFO",
      createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
    },
  ];
}
export default AuditDocumentsView;
