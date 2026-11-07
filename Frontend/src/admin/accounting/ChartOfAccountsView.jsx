import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getChartOfAccounts,
  saveChartOfAccounts,
  exportToCSV,
  printFinancialReport,
} from "./accountingService";

export function ChartOfAccountsView() {
  const [accounts, setAccounts] = useState(() => getChartOfAccounts());
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for new account
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("Assets");
  const [newType, setNewType] = useState("Current Asset");
  const [newNormalBalance, setNewNormalBalance] = useState("Debit");
  const [newDescription, setNewDescription] = useState("");
  const [formError, setFormError] = useState("");

  const filteredAccounts = accounts.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.group.toLowerCase().includes(q);
    const matchesGroup = groupFilter === "All" || a.group === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const handleCreateAccount = (e) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      setFormError("Account Code and Account Name are required.");
      return;
    }
    if (accounts.some((a) => a.code.trim().toLowerCase() === newCode.trim().toLowerCase())) {
      setFormError(`Account Code "${newCode}" already exists.`);
      return;
    }

    const newAcc = {
      code: newCode.trim(),
      name: newName.trim(),
      group: newGroup,
      type: newType,
      normalBalance: newNormalBalance,
      description: newDescription.trim() || `${newName} Ledger Account`,
    };

    const nextAccounts = [...accounts, newAcc].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    setAccounts(nextAccounts);
    saveChartOfAccounts(nextAccounts);
    setIsAddModalOpen(false);
    setNewCode("");
    setNewName("");
    setNewDescription("");
    setFormError("");
  };

  const handleExportCSV = () => {
    const headers = ["Account Code", "Account Name", "Group", "Account Type", "Normal Balance", "Description"];
    const rows = filteredAccounts.map((a) => [a.code, a.name, a.group, a.type, a.normalBalance, a.description]);
    exportToCSV("Chart_of_Accounts", headers, rows);
  };

  const handlePrint = () => {
    const html = `
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:15px; font-size:11.5px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>Code</th>
            <th>Account Name</th>
            <th>Group</th>
            <th>Type</th>
            <th>Normal Balance</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAccounts
            .map(
              (a) => `
            <tr>
              <td class="font-bold">${a.code}</td>
              <td>${a.name}</td>
              <td>${a.group}</td>
              <td>${a.type}</td>
              <td class="text-center">${a.normalBalance}</td>
              <td>${a.description || "-"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
    printFinancialReport("Chart of Accounts (COA)", "Bhanu Fine Dining & POS Management", html);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Header */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
              Chart of Accounts (COA)
            </h2>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#8b5cf6",
                background: "rgba(139, 92, 246, 0.15)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                padding: "2px 8px",
                borderRadius: "20px",
              }}
            >
              Accounting Masters
            </span>
          </div>
          <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Standard 5-Group General Ledger Framework (Assets, Liabilities, Equity, Income, Expenses)
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.45rem 0.95rem",
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(139, 92, 246, 0.3)",
            }}
          >
            <Plus size={14} /> Add Ledger Account
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.45rem 0.85rem",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <FileSpreadsheet size={14} /> Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.45rem 0.85rem",
              background: "var(--bg-tertiary)",
              color: "var(--text-main)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {["All", "Assets", "Liabilities", "Equity", "Income", "Expenses"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupFilter(g)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "7px",
                fontSize: "0.76rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: groupFilter === g ? "var(--accent, #f59e0b)" : "var(--bg-secondary)",
                color: groupFilter === g ? "#ffffff" : "var(--text-muted)",
              }}
            >
              {g}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "0.35rem 0.75rem",
            width: "240px",
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search account code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              width: "100%",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "110px" }}>Code</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>Account Name</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "120px" }}>Group</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "140px" }}>Account Type</th>
                <th style={{ textAlign: "center", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "110px" }}>Normal Balance</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((a, idx) => (
                <tr
                  key={a.code}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                  }}
                >
                  <td style={{ padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "monospace" }}>
                    {a.code}
                  </td>
                  <td style={{ padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {a.name}
                  </td>
                  <td style={{ padding: "0.65rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "5px",
                        background:
                          a.group === "Assets"
                            ? "rgba(59, 130, 246, 0.12)"
                            : a.group === "Liabilities"
                            ? "rgba(239, 68, 68, 0.12)"
                            : a.group === "Income"
                            ? "rgba(16, 185, 129, 0.12)"
                            : a.group === "Expenses"
                            ? "rgba(245, 158, 11, 0.12)"
                            : "rgba(168, 85, 247, 0.12)",
                        color:
                          a.group === "Assets"
                            ? "#3b82f6"
                            : a.group === "Liabilities"
                            ? "#ef4444"
                            : a.group === "Income"
                            ? "#10b981"
                            : a.group === "Expenses"
                            ? "#f59e0b"
                            : "#a855f7",
                      }}
                    >
                      {a.group}
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem 1rem", color: "var(--text-muted)" }}>{a.type}</td>
                  <td style={{ textAlign: "center", padding: "0.65rem 1rem", color: a.normalBalance === "Debit" ? "#3b82f6" : "#10b981", fontWeight: 700 }}>
                    {a.normalBalance}
                  </td>
                  <td style={{ padding: "0.65rem 1rem", color: "var(--text-dim)", fontSize: "0.78rem" }}>
                    {a.description || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-card)",
              borderRadius: "16px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
              Add New General Ledger Account
            </h3>

            {formError && (
              <div style={{ padding: "0.6rem 0.8rem", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", fontSize: "0.8rem", marginBottom: "1rem", fontWeight: 600 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                  Account Code (e.g. 1005, 5010)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5010"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.5rem 0.75rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen Uniforms & Laundry"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.5rem 0.75rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                    Group
                  </label>
                  <select
                    value={newGroup}
                    onChange={(e) => {
                      const grp = e.target.value;
                      setNewGroup(grp);
                      setNewNormalBalance(grp === "Assets" || grp === "Expenses" ? "Debit" : "Credit");
                    }}
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Assets">Assets</option>
                    <option value="Liabilities">Liabilities</option>
                    <option value="Equity">Equity</option>
                    <option value="Income">Income</option>
                    <option value="Expenses">Expenses</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                    Normal Balance
                  </label>
                  <select
                    value={newNormalBalance}
                    onChange={(e) => setNewNormalBalance(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                  Description / Purpose
                </label>
                <input
                  type="text"
                  placeholder="Brief note about what transactions go here"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.5rem 0.75rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.5rem 1.25rem",
                    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(139, 92, 246, 0.35)",
                  }}
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
