import React, { useState } from "react";
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  Edit2,
  Trash2,
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
        return { ...item, stock: nextStock };
      }
      return item;
    });
    saveInventory(updated);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const itemToAdd = {
      id: `inv-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category,
      stock: Number(newItem.stock) || 0,
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

  const filtered = inventory.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const lowStockCount = inventory.filter(
    (item) => item.stock <= item.minThreshold
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Outer Card Matching Design */}
      <div
        style={{
          background: "#0d1527",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        {/* Header Strip inside Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Left Title with Orange Squircle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              }}
            >
              <Package size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: "#ffffff",
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
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                  margin: "3px 0 0 0",
                }}
              >
                Track restaurant raw ingredients, meat stock, spices and packaging units
              </p>
            </div>
          </div>

          {/* Right Controls: Search & Add Item Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: "relative",
                width: "260px",
                height: "40px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={16}
                color="#64748b"
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
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#080d1a",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "9px",
                  padding: "0 12px 0 36px",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Add New Stock Item */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                height: "40px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "9px",
                padding: "0 1.25rem",
                fontWeight: 700,
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                cursor: "pointer",
                boxShadow: "0 3px 12px rgba(245, 158, 11, 0.35)",
              }}
            >
              <Plus size={16} />
              <span>Add Stock Item</span>
            </button>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background:
                  selectedCategory === cat
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgba(255, 255, 255, 0.03)",
                border:
                  selectedCategory === cat
                    ? "1px solid #f59e0b"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                color: selectedCategory === cat ? "#fbbf24" : "#94a3b8",
                padding: "0.35rem 0.85rem",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {cat === "all" ? "All Supplies" : cat}
            </button>
          ))}
        </div>

        {/* Inventory Items Table */}
        <div
          style={{
            overflowX: "auto",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
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
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "#94a3b8",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: "0.85rem 1rem" }}>Ingredient / Supply</th>
                <th style={{ padding: "0.85rem 1rem" }}>Category</th>
                <th style={{ padding: "0.85rem 1rem" }}>In-Stock Level</th>
                <th style={{ padding: "0.85rem 1rem" }}>Threshold</th>
                <th style={{ padding: "0.85rem 1rem" }}>Status</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                  Quick Adjust & Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isCritical = item.stock <= item.minThreshold;
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.02)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Item Name */}
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 700, color: "#ffffff" }}>
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        Supplier: {item.supplier}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: "1rem", color: "#cbd5e1" }}>
                      {item.category}
                    </td>

                    {/* In-Stock */}
                    <td style={{ padding: "1rem" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: isCritical ? "#ef4444" : "#fbbf24",
                          fontSize: "0.95rem",
                        }}
                      >
                        {item.stock} {item.unit}
                      </div>
                    </td>

                    {/* Min Threshold */}
                    <td style={{ padding: "1rem", color: "#94a3b8" }}>
                      {item.minThreshold} {item.unit}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "1rem" }}>
                      {isCritical ? (
                        <span
                          style={{
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#ef4444",
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
                              background: "#ef4444",
                            }}
                          />
                          Low Stock
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#10b981",
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
                              background: "#10b981",
                            }}
                          />
                          In Stock
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "1rem", textAlign: "right" }}>
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
            </tbody>
          </table>
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
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "16px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "1rem",
              }}
            >
              Add New Inventory Supply
            </h3>

            <form
              onSubmit={handleAddItem}
              style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
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
                    background: "#080d1a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "#ffffff",
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
                      color: "#94a3b8",
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
                      background: "#080d1a",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "#ffffff",
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
                      color: "#94a3b8",
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
                      background: "#080d1a",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "#ffffff",
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
                      color: "#94a3b8",
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
                      background: "#080d1a",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "#ffffff",
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
                      color: "#94a3b8",
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
                      background: "#080d1a",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "#ffffff",
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
