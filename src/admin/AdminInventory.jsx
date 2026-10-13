import React, { useState } from "react";
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
} from "lucide-react";

const INITIAL_INVENTORY = [
  {
    id: "inv-1",
    name: "Hyderabadi Basmati Rice",
    category: "Grains & Rice",
    stock: 85,
    minThreshold: 20,
    unit: "KG",
    supplier: "Deccan Grain Mills",
    lastRestocked: "12 Oct 2026",
  },
  {
    id: "inv-2",
    name: "Fresh Tender Chicken Cuts",
    category: "Meats & Poultry",
    stock: 42,
    minThreshold: 15,
    unit: "KG",
    supplier: "Royal Poultry Farms",
    lastRestocked: "13 Oct 2026",
  },
  {
    id: "inv-3",
    name: "Baby Goat Mutton Cuts",
    category: "Meats & Poultry",
    stock: 12,
    minThreshold: 15,
    unit: "KG",
    supplier: "City Prime Meat Hub",
    lastRestocked: "11 Oct 2026",
  },
  {
    id: "inv-4",
    name: "Malai Paneer Fresh Blocks",
    category: "Dairy",
    stock: 18,
    minThreshold: 8,
    unit: "KG",
    supplier: "Heritage Dairy",
    lastRestocked: "13 Oct 2026",
  },
  {
    id: "inv-5",
    name: "Shahi Biryani Garam Masala",
    category: "Spices & Oils",
    stock: 9.5,
    minThreshold: 4,
    unit: "KG",
    supplier: "Old City Spice Traders",
    lastRestocked: "10 Oct 2026",
  },
  {
    id: "inv-6",
    name: "Pure Desi Ghee",
    category: "Spices & Oils",
    stock: 24,
    minThreshold: 10,
    unit: "Litres",
    supplier: "Amul Fresh Supplies",
    lastRestocked: "12 Oct 2026",
  },
  {
    id: "inv-7",
    name: "Kashmiri Mogra Saffron",
    category: "Spices & Oils",
    stock: 0.35,
    minThreshold: 0.1,
    unit: "KG",
    supplier: "Kashmir Organic Hub",
    lastRestocked: "05 Oct 2026",
  },
  {
    id: "inv-8",
    name: "Takeaway Handi Containers (1L)",
    category: "Packaging",
    stock: 350,
    minThreshold: 100,
    unit: "Pcs",
    supplier: "Apex Eco Packs",
    lastRestocked: "09 Oct 2026",
  },
  {
    id: "inv-9",
    name: "Cold Beverage Cans (300ml)",
    category: "Beverages",
    stock: 8,
    minThreshold: 24,
    unit: "Cans",
    supplier: "Coca Cola Distributors",
    lastRestocked: "08 Oct 2026",
  },
];

export function AdminInventory() {
  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem("gourmet_pos_inventory_v1");
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [exportMessage, setExportMessage] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "Grains & Rice",
    stock: 10,
    minThreshold: 5,
    unit: "KG",
    supplier: "Local Supplier",
  });

  const saveInventory = (updated) => {
    setInventory(updated);
    try {
      localStorage.setItem("gourmet_pos_inventory_v1", JSON.stringify(updated));
    } catch {}
  };

  const handleAdjustStock = (id, delta) => {
    const updated = inventory.map((item) => {
      if (item.id === id) {
        const nextStock = Math.max(0, Number((item.stock + delta).toFixed(2)));
        const adjustedAmount = Math.abs(nextStock - item.stock);
        return {
          ...item,
          stock: nextStock,
          totalUsed: Number(item.totalUsed || 0) + (delta < 0 ? adjustedAmount : 0),
          totalRestocked: Number(item.totalRestocked || 0) + (delta > 0 ? adjustedAmount : 0),
          lastRestocked: delta > 0 ? new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : item.lastRestocked,
        };
      }
      return item;
    });
    saveInventory(updated);
  };

  const exportInventory = () => {
    const csvCell = (value) => {
      const text = String(value ?? "");
      const safeText = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const rows = [
      ["Item", "Category", "Supplier", "Available Quantity", "Unit", "Quantity Used (tracked)", "Quantity Restocked (tracked)", "Low Stock Threshold", "Status", "Last Restocked"],
      ...inventory.map((item) => [
        item.name,
        item.category,
        item.supplier,
        item.stock,
        item.unit,
        Number(item.totalUsed || 0),
        Number(item.totalRestocked || 0),
        item.minThreshold,
        item.stock <= 0 ? "Out of Stock" : item.stock <= item.minThreshold ? "Low Stock" : "In Stock",
        item.lastRestocked,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMessage("Inventory exported. Usage and restock totals track adjustments from this update onward.");
    window.setTimeout(() => setExportMessage(""), 5000);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const itemToAdd = {
      id: `inv-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category,
      stock: Number(newItem.stock) || 0,
      totalUsed: 0,
      totalRestocked: Number(newItem.stock) || 0,
      minThreshold: Number(newItem.minThreshold) || 5,
      unit: newItem.unit,
      supplier: newItem.supplier || "Local Vendor",
      lastRestocked: "Today",
    };

    saveInventory([itemToAdd, ...inventory]);
    setNewItem({
      name: "",
      category: "Grains & Rice",
      stock: 10,
      minThreshold: 5,
      unit: "KG",
      supplier: "Local Supplier",
    });
    setIsAddModalOpen(false);
  };

  const handleDeleteItem = (id) => {
    if (window.confirm("Remove this item from restaurant inventory?")) {
      saveInventory(inventory.filter((item) => item.id !== id));
    }
  };

  const categories = [
    "all",
    "Grains & Rice",
    "Meats & Poultry",
    "Dairy",
    "Spices & Oils",
    "Packaging",
    "Beverages",
  ];
  const suppliers = [...new Set(inventory.map((item) => item.supplier))].sort();
  const inStockCount = inventory.filter(
    (item) => item.stock > item.minThreshold,
  ).length;
  const outOfStockCount = inventory.filter((item) => item.stock <= 0).length;

  const filtered = inventory.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "in-stock" && item.stock > item.minThreshold) ||
      (selectedStatus === "low-stock" &&
        item.stock > 0 &&
        item.stock <= item.minThreshold) ||
      (selectedStatus === "out-of-stock" && item.stock <= 0);
    const matchesSupplier =
      selectedSupplier === "all" || item.supplier === selectedSupplier;
    return matchesCategory && matchesSearch && matchesStatus && matchesSupplier;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageStart = (visiblePage - 1) * itemsPerPage;
  const visibleItems = filtered.slice(pageStart, pageStart + itemsPerPage);

  const lowStockCount = inventory.filter(
    (item) => item.stock > 0 && item.stock <= item.minThreshold,
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Outer Card Matching Design */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "16px",
          padding: "1.1rem",
        }}
      >
        {/* Header Strip inside Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {/* Left Title with Orange Squircle */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              }}
            >
              <Package size={19} color="#ffffff" />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <h2
                  style={{
                    fontSize: "1.18rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  Raw Inventory & Supplies
                </h2>
                <span
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#f59e0b",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {inventory.length} items
                </span>
                {lowStockCount > 0 && (
                  <span
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#ef4444",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: "20px",
                    }}
                  >
                    {lowStockCount} low stock
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-dim)",
                  margin: "3px 0 0 0",
                }}
              >
                Track restaurant raw ingredients, meat stock, spices and
                packaging units
              </p>
            </div>
          </div>

          {/* Right Controls: Search & Add Item Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
              flex: "1 1 100%",
              width: "100%",
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: "relative",
                width: "230px",
                height: "36px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={16}
                color="var(--text-dim)"
                style={{
                  position: "absolute",
                  left: "12px",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Search raw items or suppliers..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "9px",
                  padding: "0 12px 0 36px",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Inventory Filters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                flex: "1 1 480px",
                gap: "0.65rem",
                minWidth: 0,
              }}
            >
              {[
                {
                  label: "Filter by category",
                  value: selectedCategory,
                  onChange: setSelectedCategory,
                  options: categories.map((category) => ({
                    value: category,
                    label: category === "all" ? "All Categories" : category,
                  })),
                },
                {
                  label: "Filter by status",
                  value: selectedStatus,
                  onChange: setSelectedStatus,
                  options: [
                    { value: "all", label: "All Status" },
                    { value: "in-stock", label: "In Stock" },
                    { value: "low-stock", label: "Low Stock" },
                    { value: "out-of-stock", label: "Out of Stock" },
                  ],
                },
                {
                  label: "Filter by supplier",
                  value: selectedSupplier,
                  onChange: setSelectedSupplier,
                  options: [
                    { value: "all", label: "All Suppliers" },
                    ...suppliers.map((supplier) => ({
                      value: supplier,
                      label: supplier,
                    })),
                  ],
                },
              ].map(({ label, value, onChange, options }) => (
                <div key={label} style={{ position: "relative", minWidth: 0 }}>
                  <select
                    aria-label={label}
                    value={value}
                    onChange={(e) => {
                      onChange(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      height: "36px",
                      padding: "0 2.25rem 0 0.85rem",
                      color: "var(--text-main)",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      cursor: "pointer",
                      transition:
                        "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    strokeWidth={2.2}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "0.75rem",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.55rem", marginLeft: "auto", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={exportInventory}
                title="Download all inventory as an Excel-compatible CSV"
                style={{
                  height: "33px", background: "var(--bg-tertiary)", color: "#34d399",
                  border: "1px solid rgba(52, 211, 153, 0.4)", borderRadius: "9px", padding: "0 0.8rem",
                  fontWeight: 700, fontSize: "0.78rem", display: "flex", alignItems: "center",
                  gap: "0.4rem", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                <Download size={15} />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  height: "33px", background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                  color: "#ffffff", border: "none", borderRadius: "9px", padding: "0 0.9rem",
                  fontWeight: 700, fontSize: "0.78rem", display: "flex", alignItems: "center",
                  gap: "0.45rem", cursor: "pointer", boxShadow: "0 3px 12px rgba(245, 158, 11, 0.35)",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={15} />
                <span>Add Stock Item</span>
              </button>
            </div>
          </div>
        </div>

        {exportMessage && (
          <div role="status" style={{ color: "#34d399", fontSize: "0.76rem", fontWeight: 600, margin: "-0.75rem 0 1rem" }}>
            {exportMessage}
          </div>
        )}

        {/* Stock Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.6rem",
            marginBottom: "0.9rem",
          }}
        >
          {[
            {
              label: "Total Items",
              value: inventory.length,
              color: "#38bdf8",
              icon: Package,
            },
            {
              label: "In Stock",
              value: inStockCount,
              color: "#10b981",
              icon: CheckCircle2,
            },
            {
              label: "Low Stock",
              value: lowStockCount,
              color: "#f59e0b",
              icon: AlertTriangle,
            },
            {
              label: "Out of Stock",
              value: outOfStockCount,
              color: "#ef4444",
              icon: TrendingDown,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                minWidth: 0,
                padding: "0.65rem 0.8rem",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  color,
                  background: `${color}20`,
                  borderRadius: "9px",
                }}
              >
                <Icon size={17} />
              </div>
              <div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
                <div style={{ color, fontSize: "1rem", fontWeight: 800 }}>
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Inventory Items Table */}
        <div
          style={{
            overflowX: "auto",
            borderRadius: "12px",
            border: "1px solid var(--border-card)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: "0.65rem 0.8rem" }}>Ingredient / Supply</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>Category</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>In-Stock Level</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>Threshold</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>Status</th>
                <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>
                  Quick Adjust & Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const isOutOfStock = item.stock <= 0;
                const isLowStock =
                  !isOutOfStock && item.stock <= item.minThreshold;
                const statusColor = isOutOfStock
                  ? "#ef4444"
                  : isLowStock
                    ? "#f59e0b"
                    : "#10b981";
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-tertiary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Item Name */}
                    <td style={{ padding: "0.7rem 0.8rem" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: "var(--text-main)",
                          fontSize: "0.84rem",
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        Supplier: {item.supplier}
                      </div>
                    </td>

                    {/* Category */}
                    <td
                      style={{
                        padding: "0.7rem 0.8rem",
                        color: "var(--text-main)",
                        fontWeight: 600,
                      }}
                    >
                      {item.category}
                    </td>

                    {/* In-Stock */}
                    <td style={{ padding: "0.7rem 0.8rem" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: isOutOfStock
                            ? "#ef4444"
                            : isLowStock
                              ? "#f59e0b"
                              : "#10b981",
                          fontSize: "0.85rem",
                        }}
                      >
                        {item.stock} {item.unit}
                      </div>
                    </td>

                    {/* Min Threshold */}
                    <td
                      style={{
                        padding: "0.7rem 0.8rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {item.minThreshold} {item.unit}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "0.7rem 0.8rem" }}>
                      <span
                        style={{
                          background: `${statusColor}1f`,
                          border: `1px solid ${statusColor}4d`,
                          color: statusColor,
                          borderRadius: "20px",
                          padding: "3px 10px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: statusColor,
                          }}
                        />
                        {isOutOfStock
                          ? "Out of Stock"
                          : isLowStock
                            ? "Low Stock"
                            : "In Stock"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "0.7rem 0.8rem", textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                        }}
                      >
                        <button
                          onClick={() => handleAdjustStock(item.id, -5)}
                          style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Consume -5 units"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleAdjustStock(item.id, 10)}
                          style={{
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            color: "#f59e0b",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Restock +10 units"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#ef4444",
                            borderRadius: "6px",
                            padding: "5px 7px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                          title="Delete item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "2rem 1rem",
                      color: "#94a3b8",
                      textAlign: "center",
                    }}
                  >
                    No inventory items match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem 0.85rem",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--bg-tertiary)",
              fontSize: "0.74rem",
              color: "var(--text-muted)",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span>
              Showing{" "}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {filtered.length === 0 ? 0 : pageStart + 1}
              </strong>
              –
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {Math.min(pageStart + itemsPerPage, filtered.length)}
              </strong>{" "}
              of{" "}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {filtered.length}
              </strong>{" "}
              items
            </span>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <span
                  style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                >
                  Per page:
                </span>
                <select
                  aria-label="Items per page"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "5px",
                    padding: "2px 6px",
                    fontSize: "0.72rem",
                    outline: "none",
                    cursor: "pointer",
                    height: "24px",
                  }}
                >
                  {[5, 6, 8, 10, 20].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={visiblePage === 1}
                  style={{
                    height: "24px",
                    padding: "0 6px",
                    borderRadius: "5px",
                    background:
                      visiblePage === 1
                        ? "rgba(255, 255, 255, 0.02)"
                        : "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: visiblePage === 1 ? "#475569" : "#cbd5e1",
                    cursor: visiblePage === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (page) => {
                    const isActive = page === visiblePage;
                    return (
                      <button
                        key={page}
                        type="button"
                        aria-label={`Page ${page}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          height: "24px",
                          minWidth: "24px",
                          padding: "0 5px",
                          borderRadius: "5px",
                          background: isActive
                            ? "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
                            : "transparent",
                          border: isActive
                            ? "none"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          color: isActive ? "#ffffff" : "#94a3b8",
                          cursor: "pointer",
                          fontSize: "0.72rem",
                          fontWeight: isActive ? 800 : 500,
                          boxShadow: isActive
                            ? "0 2px 8px rgba(245, 158, 11, 0.35)"
                            : "none",
                        }}
                      >
                        {page}
                      </button>
                    );
                  },
                )}
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(pageCount, page + 1))
                  }
                  disabled={visiblePage === pageCount}
                  style={{
                    height: "24px",
                    padding: "0 6px",
                    borderRadius: "5px",
                    background:
                      visiblePage === pageCount
                        ? "rgba(255, 255, 255, 0.02)"
                        : "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: visiblePage === pageCount ? "#475569" : "#cbd5e1",
                    cursor:
                      visiblePage === pageCount ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 150,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "16px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "var(--text-main)",
                marginBottom: "1rem",
              }}
            >
              Add New Inventory Supply
            </h3>

            <form
              onSubmit={handleAddItem}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Item / Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Saffron"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                    }}
                  >
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  >
                    <option value="Grains & Rice">Grains & Rice</option>
                    <option value="Meats & Poultry">Meats & Poultry</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Spices & Oils">Spices & Oils</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                    }}
                  >
                    Unit
                  </label>
                  <select
                    value={newItem.unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  >
                    <option value="KG">KG</option>
                    <option value="Litres">Litres</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Bags">Bags</option>
                    <option value="Cans">Cans</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                    }}
                  >
                    Starting Stock
                  </label>
                  <input
                    type="number"
                    value={newItem.stock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, stock: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                    }}
                  >
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={newItem.minThreshold}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minThreshold: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "0.75rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "0.65rem",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
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
                    flex: 2,
                    padding: "0.65rem",
                    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
