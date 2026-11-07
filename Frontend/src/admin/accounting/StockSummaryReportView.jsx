import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building,
} from "lucide-react";
import { formatCurrency, roundCurrency } from "../../utils/formatCurrency";
import { exportToCSV, printFinancialReport } from "./accountingService";

export function StockSummaryReportView({ inventoryItems = [], inventoryPurchases = [] }) {
  const [dateRange, setDateRange] = useState("01 Nov 2026 - 30 Nov 2026");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGodown, setSelectedGodown] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Extract unique categories and godowns
  const categories = useMemo(() => {
    const set = new Set();
    inventoryItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [inventoryItems]);

  const godowns = ["All", "Main Godown", "Kitchen Store", "Bar Counter", "Cold Storage"];

  // Map inventory items to comprehensive stock movements
  const stockRows = useMemo(() => {
    return inventoryItems.map((item, idx) => {
      const code = item.itemCode || `ITM-${String(idx + 1).padStart(4, "0")}`;
      const name = item.name || `Inventory Item ${idx + 1}`;
      const category = item.category || "General";
      const godown = item.location || (category.toLowerCase().includes("beverage") ? "Bar Counter" : "Main Godown");

      const closingStock = Number(item.stock || 0);
      const inward = Number(item.totalRestocked || 0);
      const outward = Number(item.totalUsed || 0);
      const openingStock = Math.max(0, closingStock + outward - inward);

      const unitCost = Number(item.unitCost || item.mrp || 35);
      const stockValue = roundCurrency(closingStock * unitCost);

      const threshold = Number(item.minThreshold || 10);
      let status = "In Stock";
      if (closingStock <= 0) {
        status = "Out of Stock";
      } else if (closingStock <= threshold) {
        status = "Low Stock";
      }

      return {
        id: item.id || code,
        index: idx + 1,
        code,
        name,
        category,
        godown,
        openingStock,
        inward,
        outward,
        closingStock,
        unitCost,
        stockValue,
        status,
        unit: item.unit || "Units",
      };
    });
  }, [inventoryItems]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return stockRows.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === "All" || row.category === selectedCategory;
      const matchesGodown = selectedGodown === "All" || row.godown === selectedGodown;
      const matchesStatus = selectedStatus === "All" || row.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesGodown && matchesStatus;
    });
  }, [stockRows, searchQuery, selectedCategory, selectedGodown, selectedStatus]);

  // Aggregate KPI summary metrics
  const totals = useMemo(() => {
    const currentStock = filteredRows.reduce((sum, r) => sum + r.closingStock, 0);
    const inwardQty = filteredRows.reduce((sum, r) => sum + r.inward, 0);
    const outwardQty = filteredRows.reduce((sum, r) => sum + r.outward, 0);
    const stockValue = roundCurrency(filteredRows.reduce((sum, r) => sum + r.stockValue, 0));
    const lowStockItems = filteredRows.filter((r) => r.status === "Low Stock" || r.status === "Out of Stock").length;

    return {
      currentStock,
      inwardQty,
      outwardQty,
      stockValue,
      lowStockItems,
    };
  }, [filteredRows]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "#",
      "Item Code",
      "Item Name",
      "Category",
      "Godown",
      "Opening Stock",
      "Inward Qty",
      "Outward Qty",
      "Closing Stock",
      "Stock Value (₹)",
      "Stock Status",
    ];
    const dataRows = filteredRows.map((r, i) => [
      i + 1,
      r.code,
      r.name,
      r.category,
      r.godown,
      r.openingStock,
      r.inward,
      r.outward,
      r.closingStock,
      r.stockValue,
      r.status,
    ]);
    exportToCSV("Stock_Summary_Report", headers, dataRows);
  };

  // Export PDF / Print
  const handlePrint = () => {
    const html = `
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:15px; font-size:11px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>#</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>Category</th>
            <th>Godown</th>
            <th class="text-right">Opening Qty</th>
            <th class="text-right">Inward Qty</th>
            <th class="text-right">Outward Qty</th>
            <th class="text-right">Closing Stock</th>
            <th class="text-right">Stock Value (₹)</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRows
            .map(
              (r, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="font-bold">${r.code}</td>
              <td>${r.name}</td>
              <td>${r.category}</td>
              <td>${r.godown}</td>
              <td class="text-right">${r.openingStock}</td>
              <td class="text-right">${r.inward}</td>
              <td class="text-right">${r.outward}</td>
              <td class="text-right font-bold">${r.closingStock} ${r.unit}</td>
              <td class="text-right">₹${Number(r.stockValue).toLocaleString("en-IN")}</td>
              <td class="text-center">${r.status}</td>
            </tr>
          `
            )
            .join("")}
          <tr class="bg-total font-bold" style="font-size:12px;">
            <td colspan="5" class="text-center">Total Stock Valuation</td>
            <td colspan="4" class="text-right">Total Qty: ${totals.currentStock}</td>
            <td class="text-right font-bold">₹${Number(totals.stockValue).toLocaleString("en-IN")}</td>
            <td class="text-center">${totals.lowStockItems} Low Items</td>
          </tr>
        </tbody>
      </table>
    `;
    printFinancialReport("Stock Summary Report", `Period: ${dateRange}`, html);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Top Header Card (Matches Screenshot 3) */}
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
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "3px" }}>
            Reports &gt; <span style={{ color: "var(--text-main)", fontWeight: 700 }}>Stock Summary</span>
          </div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
            Stock Summary Report
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
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
            <Printer size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filter Row (Matches Screenshot 3) */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "0.85rem",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
            Date Range
          </label>
          <input
            type="text"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "7px",
              padding: "0.4rem 0.75rem",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              fontWeight: 600,
              width: "190px",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "7px",
              padding: "0.4rem 0.75rem",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              minWidth: "140px",
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
            Godown / Location
          </label>
          <select
            value={selectedGodown}
            onChange={(e) => { setSelectedGodown(e.target.value); setCurrentPage(1); }}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "7px",
              padding: "0.4rem 0.75rem",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              minWidth: "140px",
            }}
          >
            {godowns.map((g) => (
              <option key={g} value={g}>{g === "All" ? "All Godowns" : g}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
            Stock Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "7px",
              padding: "0.4rem 0.75rem",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              minWidth: "130px",
            }}
          >
            <option value="All">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory("All");
            setSelectedGodown("All");
            setSelectedStatus("All");
            setSearchQuery("");
            setCurrentPage(1);
          }}
          style={{
            padding: "0.42rem 0.95rem",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "7px",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(59, 130, 246, 0.3)",
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* 5 KPI Stat Cards with Sparklines (Matches Screenshot 3) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* 1. Current Stock */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "14px",
            padding: "1.1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>Current Stock</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--text-main)", marginTop: "1px" }}>
                {totals.currentStock.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Total Qty on Hand</span>
            <svg width="60" height="20">
              <path d="M 2 15 Q 20 5, 40 12 T 58 4" fill="none" stroke="#3b82f6" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* 2. Inward Quantity */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "14px",
            padding: "1.1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowDownLeft size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>Inward Quantity</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#10b981", marginTop: "1px" }}>
                {totals.inwardQty.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Total Restocked</span>
            <svg width="60" height="20">
              <path d="M 2 18 Q 15 8, 35 14 T 58 2" fill="none" stroke="#10b981" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* 3. Outward Quantity */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "14px",
            padding: "1.1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(168, 85, 247, 0.12)", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUpRight size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>Outward Quantity</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#a855f7", marginTop: "1px" }}>
                {totals.outwardQty.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Kitchen Consumed</span>
            <svg width="60" height="20">
              <path d="M 2 8 Q 20 18, 40 10 T 58 16" fill="none" stroke="#a855f7" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* 4. Stock Value */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "14px",
            padding: "1.1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>Stock Value</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#f59e0b", marginTop: "1px" }}>
                {formatCurrency(totals.stockValue)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Asset Valuation</span>
            <svg width="60" height="20">
              <path d="M 2 12 Q 18 4, 38 14 T 58 6" fill="none" stroke="#f59e0b" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* 5. Low Stock Items */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "14px",
            padding: "1.1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>Low Stock Items</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#ef4444", marginTop: "1px" }}>
                {totals.lowStockItems}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Reorder Alerts</span>
            <svg width="60" height="20">
              <path d="M 2 16 Q 16 6, 36 12 T 58 4" fill="none" stroke="#ef4444" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Item-wise Stock Details Table (Matches Screenshot 3) */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>
            Item-wise Stock Details
          </h3>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              width: "240px",
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search Item..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "center", padding: "0.7rem 0.5rem", color: "var(--text-muted)", fontWeight: 700, width: "35px" }}>#</th>
                <th style={{ textAlign: "left", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700, width: "95px" }}>Item Code</th>
                <th style={{ textAlign: "left", padding: "0.7rem 0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Item Name</th>
                <th style={{ textAlign: "left", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>Category</th>
                <th style={{ textAlign: "left", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>Godown</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>Opening Stock</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>Inward</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>Outward</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>Closing Stock</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>Stock Value</th>
                <th style={{ textAlign: "center", padding: "0.7rem 0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    No stock inventory items found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                    }}
                  >
                    <td style={{ textAlign: "center", padding: "0.6rem 0.5rem", color: "var(--text-dim)" }}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td style={{ padding: "0.6rem 0.6rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "monospace" }}>
                      {item.code}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: "var(--text-main)" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "0.6rem 0.6rem", color: "var(--text-muted)" }}>
                      {item.category}
                    </td>
                    <td style={{ padding: "0.6rem 0.6rem", color: "var(--text-muted)" }}>
                      {item.godown}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", color: "var(--text-muted)" }}>
                      {item.openingStock}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", color: "#10b981", fontWeight: 600 }}>
                      {item.inward}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", color: "#ef4444", fontWeight: 600 }}>
                      {item.outward}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", fontWeight: 700, color: "var(--text-main)" }}>
                      {item.closingStock} <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{item.unit}</span>
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", fontWeight: 700, color: "#f59e0b" }}>
                      {formatCurrency(item.stockValue)}
                    </td>
                    <td style={{ textAlign: "center", padding: "0.6rem 0.6rem" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          display: "inline-block",
                          background:
                            item.status === "In Stock"
                              ? "rgba(16, 185, 129, 0.15)"
                              : item.status === "Low Stock"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                          color:
                            item.status === "In Stock"
                              ? "#10b981"
                              : item.status === "Low Stock"
                              ? "#f59e0b"
                              : "#ef4444",
                          border: `1px solid ${
                            item.status === "In Stock"
                              ? "rgba(16, 185, 129, 0.3)"
                              : item.status === "Low Stock"
                              ? "rgba(245, 158, 11, 0.3)"
                              : "rgba(239, 68, 68, 0.3)"
                          }`,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (Matches Screenshot 3) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} entries
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "2px 6px",
                color: "var(--text-main)",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>

            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-tertiary)",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                opacity: currentPage <= 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
              <button
                key={i + 1}
                type="button"
                onClick={() => setCurrentPage(i + 1)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  border: "none",
                  background: currentPage === i + 1 ? "#3b82f6" : "var(--bg-tertiary)",
                  color: currentPage === i + 1 ? "#ffffff" : "var(--text-main)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                {i + 1}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-tertiary)",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.4 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
