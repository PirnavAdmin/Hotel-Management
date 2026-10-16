import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Clock,
  Utensils,
  ChevronRight,
  Search,
  Flame,
  Hourglass,
  User,
  X,
  Filter,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import {
  parseTimeToSeconds,
  formatElapsedTimer,
  getTimerUrgencyColor,
} from "../utils/timer";

export function TableView({ tables, onSelectTable }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serverFilter, setServerFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Extract distinct servers dynamically from tables
  const uniqueServers = useMemo(() => {
    const set = new Set();
    tables.forEach((t) => {
      const s = (t.server || t.waiter || t.assignedServer || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [tables]);

  // Extract distinct table list sorted numerically
  const uniqueTableNumbers = useMemo(() => {
    return [...tables].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }, [tables]);

  // Dynamic sections list based on active tables
  const sections = useMemo(() => {
    const defaultSections = ["Main Hall", "Window Side", "Garden Terrace", "VIP Lounge"];
    const foundSections = new Set(defaultSections);
    tables.forEach((t) => {
      if (t.section && typeof t.section === "string") foundSections.add(t.section);
    });
    return [
      { id: "all", name: `All Areas (${tables.length} Tables)` },
      ...Array.from(foundSections).map((s) => ({ id: s, name: s })),
    ];
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // 1. Section Filter
      const matchesSection =
        sectionFilter === "all" || t.section === sectionFilter;

      // 2. Status Filter
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;

      // 3. Server Dropdown Filter
      const tServer = (t.server || t.waiter || t.assignedServer || "Staff").trim();
      const matchesServerDropdown =
        serverFilter === "all" ||
        tServer.toLowerCase() === serverFilter.toLowerCase();

      // 4. Table Number Dropdown Filter
      const matchesTableDropdown =
        tableFilter === "all" ||
        String(t.id) === String(tableFilter) ||
        String(t.name).toLowerCase() === String(tableFilter).toLowerCase();

      // 5. Search Query Filter (Searches Table Number OR Server Name OR Section)
      let matchesSearch = true;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const tIdStr = String(t.id ?? "");
        const tName = String(t.name ?? "").toLowerCase();
        const tSec = String(t.section ?? "").toLowerCase();
        const sName = tServer.toLowerCase();

        // Check for table number patterns (e.g. "1", "t1", "t 1", "table 1", "#1")
        const cleanNum = q.replace(/^(table\s*|t\s*|#\s*)/i, "").trim();
        const isPureNumber = cleanNum !== "" && !isNaN(cleanNum);

        let tableMatch = false;
        if (isPureNumber) {
          // Exact table ID match or word-bounded number in table name
          const numRegex = new RegExp(`(^|\\b)${cleanNum}(\\b|$)`, "i");
          tableMatch =
            tIdStr === cleanNum ||
            numRegex.test(tName) ||
            tName === `table ${cleanNum}`;
        } else {
          tableMatch =
            tName.includes(q) ||
            `t${tIdStr}` === q ||
            `t ${tIdStr}` === q;
        }

        // Check for server name match (safe substring)
        const serverMatch = sName.includes(q);

        // Check for section match
        const sectionMatch = tSec.includes(q);

        matchesSearch = tableMatch || serverMatch || sectionMatch;
      }

      return (
        matchesSection &&
        matchesStatus &&
        matchesServerDropdown &&
        matchesTableDropdown &&
        matchesSearch
      );
    });
  }, [tables, sectionFilter, statusFilter, serverFilter, tableFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery !== "" ||
    serverFilter !== "all" ||
    tableFilter !== "all" ||
    statusFilter !== "all" ||
    sectionFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setServerFilter("all");
    setTableFilter("all");
    setStatusFilter("all");
    setSectionFilter("all");
  };

  return (
    <div
      className="mobile-container"
      style={{ padding: "1.25rem 1.5rem", maxWidth: "100%", margin: "0 auto" }}
    >
      {/* Floor Plan Title & Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--text-main)",
                letterSpacing: "-0.02em",
              }}
            >
              Restaurant Floor Plan & Tables
            </h2>
            <span
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--accent-amber-light)",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 700,
                border: "1px solid var(--border-subtle)",
              }}
            >
              {tables.length} Tables Active
            </span>
          </div>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.88rem",
              marginTop: "3px",
            }}
          >
            Select any table to take orders, add food or beverages, and generate
            bills in <strong>Rupees (₹)</strong>.
          </p>
        </div>

        {/* Search & Status Filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {/* Quick Search with Clear */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={16}
              color="var(--text-dim)"
              style={{ position: "absolute", left: "12px", pointerEvents: "none" }}
            />
            <input
              type="text"
              placeholder="Search table or server..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                border: searchQuery ? "1px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-main)",
                padding: "0.55rem 2rem 0.55rem 2.25rem",
                fontSize: "0.85rem",
                width: "210px",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2px",
                  borderRadius: "50%",
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter by Table Number Dropdown */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "10px",
                fontSize: "0.78rem",
                fontWeight: 900,
                color: tableFilter !== "all" ? "var(--accent-amber-light)" : "var(--text-dim)",
                pointerEvents: "none",
              }}
            >
              #
            </span>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              title="Filter by Table Number"
              style={{
                background: tableFilter !== "all" ? "rgba(245, 158, 11, 0.16)" : "var(--bg-secondary)",
                border: tableFilter !== "all" ? "1px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: tableFilter !== "all" ? "var(--accent-amber-light)" : "var(--text-main)",
                padding: "0.52rem 0.85rem 0.52rem 1.85rem",
                fontSize: "0.82rem",
                fontWeight: tableFilter !== "all" ? 700 : 500,
                cursor: "pointer",
                outline: "none",
                height: "36px",
              }}
            >
              <option value="all" style={{ background: "#18181b", color: "#f4f4f5" }}>
                All Tables ({tables.length})
              </option>
              {uniqueTableNumbers.map((tbl) => (
                <option key={tbl.id} value={tbl.id} style={{ background: "#18181b", color: "#f4f4f5" }}>
                  Table {tbl.id} {tbl.section ? `• ${tbl.section}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Server Name Dropdown */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <User
              size={14}
              color={serverFilter !== "all" ? "var(--accent-amber-light)" : "var(--text-dim)"}
              style={{ position: "absolute", left: "10px", pointerEvents: "none" }}
            />
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              title="Filter by Server Name"
              style={{
                background: serverFilter !== "all" ? "rgba(245, 158, 11, 0.16)" : "var(--bg-secondary)",
                border: serverFilter !== "all" ? "1px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: serverFilter !== "all" ? "var(--accent-amber-light)" : "var(--text-main)",
                padding: "0.52rem 0.85rem 0.52rem 1.95rem",
                fontSize: "0.82rem",
                fontWeight: serverFilter !== "all" ? 700 : 500,
                cursor: "pointer",
                outline: "none",
                height: "36px",
              }}
            >
              <option value="all" style={{ background: "#18181b", color: "#f4f4f5" }}>
                All Servers ({uniqueServers.length})
              </option>
              {uniqueServers.map((srv) => (
                <option key={srv} value={srv} style={{ background: "#18181b", color: "#f4f4f5" }}>
                  👤 {srv}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button (visible when any filter active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all search & filter conditions"
              style={{
                background: "rgba(239, 68, 68, 0.14)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#f87171",
                borderRadius: "var(--radius-md)",
                padding: "0.45rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                height: "36px",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          {/* Status Filters */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-secondary)",
              padding: "3px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {[
              { id: "all", label: `All (${tables.length})` },
              { id: "vacant", label: "Available", dot: "var(--status-vacant)" },
              {
                id: "occupied",
                label: "Occupied",
                dot: "var(--status-occupied)",
              },
              { id: "billed", label: "Billed", dot: "var(--status-billed)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  background:
                    statusFilter === tab.id
                      ? "var(--bg-tertiary)"
                      : "transparent",
                  color:
                    statusFilter === tab.id
                      ? "var(--text-main)"
                      : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                {tab.dot && (
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: tab.dot,
                    }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          overflowX: "auto",
          paddingBottom: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        {sections.map((sec) => {
          const isSelected = sectionFilter === sec.id;
          const count =
            sec.id === "all"
              ? tables.length
              : tables.filter((t) => t.section === sec.id).length;

          return (
            <button
              key={sec.id}
              onClick={() => setSectionFilter(sec.id)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.84rem",
                fontWeight: isSelected ? 700 : 500,
                background: isSelected
                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)"
                  : "var(--bg-secondary)",
                color: isSelected
                  ? "var(--accent-amber-light)"
                  : "var(--text-muted)",
                border: isSelected
                  ? "1px solid var(--accent-amber)"
                  : "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                whiteSpace: "nowrap",
              }}
            >
              <span>{sec.name}</span>
              <span
                style={{
                  background: isSelected
                    ? "var(--accent-amber)"
                    : "var(--bg-tertiary)",
                  color: isSelected ? "#000000" : "var(--text-dim)",
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tables Grid or Empty Filter State */}
      {filteredTables.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 1.5rem",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-subtle)",
            margin: "1rem 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-amber-light)",
              marginBottom: "0.5rem",
            }}
          >
            <Search size={24} />
          </div>
          <h3
            style={{
              fontSize: "1.15rem",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            No Matching Tables Found
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              maxWidth: "420px",
              margin: "0.25rem 0 1rem",
              lineHeight: 1.4,
            }}
          >
            No tables matched your filter criteria
            {searchQuery ? ` for "${searchQuery}"` : ""}
            {serverFilter !== "all" ? ` (Server: ${serverFilter})` : ""}
            {tableFilter !== "all" ? ` (Table: #${tableFilter})` : ""}
            {statusFilter !== "all" ? ` (Status: ${statusFilter})` : ""}
            {sectionFilter !== "all" ? ` (Area: ${sectionFilter})` : ""}.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#000000",
              fontWeight: 800,
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "0.6rem 1.4rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.25)",
            }}
          >
            <RotateCcw size={14} />
            <span>Clear All Filters</span>
          </button>
        </div>
      ) : (
        <div
          className="responsive-table-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {filteredTables.map((table) => {
            const items = Array.isArray(table?.items) ? table.items : [];
            const subtotal = items.reduce(
              (sum, item) =>
                sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 1),
              0,
            );
            const totalItemsCount = items.reduce(
              (sum, item) => sum + (Number(item?.quantity) || 1),
              0,
            );

            let statusColor = "var(--status-vacant)";
            let statusText = "Available";
            let statusBg = "var(--status-vacant-bg)";

            if (table.status === "occupied") {
              statusColor = "var(--status-occupied)";
              statusText = "Dining";
              statusBg = "var(--status-occupied-bg)";
            } else if (table.status === "billed") {
              statusColor = "var(--status-billed)";
              statusText = "Billed";
              statusBg = "var(--status-billed-bg)";
            }

            const isOccupied = table.status !== "vacant";
            const hasCooking =
              isOccupied && items.some((i) => i.kotStatus === "cooking");
            const allReady =
              isOccupied &&
              items.length > 0 &&
              items.every(
                (i) =>
                  i.kotStatus === "ready" ||
                  i.kotStatus === "served" ||
                  i.kotStatus === "completed",
              );
            const hasReady =
              isOccupied && items.some((i) => i.kotStatus === "ready");
            const readyCount = isOccupied
              ? items.filter(
                (i) => i.kotStatus === "ready" || i.kotStatus === "served",
              ).length
              : 0;

            const isTable5 = table.id === 5;

            const cardBorderColor = !isOccupied
              ? "var(--border-subtle)"
              : allReady
                ? "#10b981"
                : hasCooking
                  ? "#ea580c"
                  : "rgba(245, 158, 11, 0.7)";
            const cardShadow = !isOccupied
              ? "var(--shadow-sm)"
              : allReady
                ? "0 4px 16px rgba(16, 185, 129, 0.25)"
                : hasCooking
                  ? "0 4px 16px rgba(234, 88, 12, 0.22)"
                  : "0 4px 14px rgba(245, 158, 11, 0.16)";

            return (
              <div
                key={table.id}
                onClick={() => onSelectTable(table.id)}
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${cardBorderColor}`,
                  padding: "0.75rem 0.85rem",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  boxShadow: cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.45rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.3)";
                  e.currentTarget.style.borderColor = "var(--accent-amber)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = cardShadow;
                  e.currentTarget.style.borderColor = cardBorderColor;
                }}
              >
                {/* Table Card Header: Big, Bold, Crystal Clear Table Number */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "nowrap",
                      gap: "0.25rem",
                      marginBottom: "0.2rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        flex: "0 1 auto",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          background:
                            table.status !== "vacant"
                              ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                              : "var(--bg-tertiary)",
                          color:
                            table.status !== "vacant"
                              ? "#ffffff"
                              : "var(--text-main)",
                          border:
                            table.status !== "vacant"
                              ? "none"
                              : "1px solid var(--border-subtle)",
                          fontWeight: 900,
                          fontSize: "0.74rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          letterSpacing: "0.03em",
                          flexShrink: 0,
                        }}
                      >
                        T{table.id}
                      </span>
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: 900,
                          color:
                            table.status !== "vacant"
                              ? "var(--accent-amber-light)"
                              : "var(--text-main)",
                          margin: 0,
                          lineHeight: 1.1,
                          letterSpacing: "-0.02em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Table {table.id}
                      </h3>
                    </div>
                    <span
                      title={statusText}
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: statusColor,
                        boxShadow: `0 0 6px ${statusColor}80`,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                      className={
                        table.status !== "vacant" ? "pulse-indicator" : ""
                      }
                    />
                  </div>

                  {/* Section & Capacity */}
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--text-dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      paddingBottom: "0.35rem",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {table.section}
                    </span>
                    <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                      {table.capacity} Seats ·{" "}
                      {table.status !== "vacant"
                        ? `${table.guests} Seated`
                        : "Vacant"}
                    </span>
                  </div>

                  {/* Assigned Server Badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.25rem 0.45rem",
                      marginTop: "0.32rem",
                      background:
                        (serverFilter !== "all" &&
                          (table.server || "Staff").toLowerCase() ===
                          serverFilter.toLowerCase()) ||
                          (searchQuery &&
                            (table.server || "Staff")
                              .toLowerCase()
                              .includes(searchQuery.trim().toLowerCase()))
                          ? "rgba(245, 158, 11, 0.22)"
                          : "rgba(255, 255, 255, 0.04)",
                      border:
                        (serverFilter !== "all" &&
                          (table.server || "Staff").toLowerCase() ===
                          serverFilter.toLowerCase()) ||
                          (searchQuery &&
                            (table.server || "Staff")
                              .toLowerCase()
                              .includes(searchQuery.trim().toLowerCase()))
                          ? "1px solid var(--accent-amber)"
                          : "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "5px",
                      fontSize: "0.68rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        fontSize: "0.66rem",
                      }}
                    >
                      <User size={11} color="var(--text-dim)" /> Server:
                    </span>
                    <strong
                      style={{
                        color:
                          (serverFilter !== "all" &&
                            (table.server || "Staff").toLowerCase() ===
                            serverFilter.toLowerCase()) ||
                            (searchQuery &&
                              (table.server || "Staff")
                                .toLowerCase()
                                .includes(searchQuery.trim().toLowerCase()))
                            ? "var(--accent-amber-light)"
                            : "var(--text-main)",
                        fontWeight: 700,
                        maxWidth: "105px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {table.server || "Staff"}
                    </strong>
                  </div>

                  {/* Kitchen Cooking Status Live Badge */}
                  {isOccupied && items.length > 0 && (
                    <div style={{ marginTop: "0.32rem" }}>
                      {allReady ? (
                        <div
                          style={{
                            background: "rgba(16, 185, 129, 0.16)",
                            border: "1.5px solid #10b981",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            boxShadow: "0 0 10px rgba(16, 185, 129, 0.25)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 900,
                              color: "#34d399",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: "#10b981",
                                display: "inline-block",
                              }}
                              className="pulse-indicator"
                            />
                            🔔 Ready to Serve
                          </span>
                          <span
                            style={{
                              fontSize: "0.6rem",
                              color: "#6ee7b7",
                              fontWeight: 800,
                            }}
                          >
                            Hot!
                          </span>
                        </div>
                      ) : hasCooking ? (
                        <div
                          style={{
                            background: "rgba(234, 88, 12, 0.15)",
                            border: "1px solid #ea580c",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              color: "#fb923c",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            {readyCount > 0
                              ? `🔥 Cooking (${readyCount}/${items.length} Ready)`
                              : "🔥 Cooking in Kitchen"}
                          </span>
                        </div>
                      ) : hasReady ? (
                        <div
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.4)",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              color: "#34d399",
                            }}
                          >
                            🔔 Dishes Ready ({readyCount}/{items.length})
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            background: "rgba(59, 130, 246, 0.1)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: "#93c5fd",
                            }}
                          >
                            📥 Order in Kitchen
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Order Status & Financial Snapshot */}
                <div>
                  {table.status !== "vacant" && (
                    <div style={{ marginTop: "0.25rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.2rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Items ({totalItemsCount}):
                        </span>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: "0.96rem",
                            fontWeight: 800,
                            color: "var(--accent-amber-light)",
                          }}
                        >
                          {formatCurrency(subtotal)}
                        </span>
                      </div>

                      {/* Compact Item Preview List */}
                      <div
                        style={{
                          background: "var(--bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.25rem 0.45rem",
                          fontSize: "0.68rem",
                          color: "var(--text-main)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.15rem",
                        }}
                      >
                        {items.slice(0, 1).map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "0.3rem",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {item.quantity}x {item.name}
                            </span>
                            <span
                              className="font-mono"
                              style={{ flexShrink: 0, fontSize: "0.7rem" }}
                            >
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                        {items.length > 1 && (
                          <div
                            style={{
                              color: "var(--text-dim)",
                              fontSize: "0.64rem",
                              fontStyle: "italic",
                            }}
                          >
                            + {items.length - 1} more dish
                            {items.length > 2 ? "es" : ""}...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Action Button */}
                  <button
                    style={{
                      width: "100%",
                      marginTop: "0.45rem",
                      padding: "0.42rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      background:
                        table.status === "vacant"
                          ? "rgba(255, 255, 255, 0.05)"
                          : "linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(245, 158, 11, 0.12))",
                      color:
                        table.status === "vacant"
                          ? "var(--text-main)"
                          : "var(--accent-amber-light)",
                      border:
                        table.status === "vacant"
                          ? "1px solid var(--border-subtle)"
                          : "1px solid var(--accent-amber)",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    <Utensils size={12} />
                    <span>
                      {table.status === "vacant" ? "Take Order" : "Manage Bill"}
                    </span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
