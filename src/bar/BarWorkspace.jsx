import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, Check, ChevronLeft, ChevronRight, Clock3, Eye,
  FileText, GlassWater, Martini, Package, Pencil, Plus, Printer, Search, RefreshCw,
  Trash2, Wine, X,
} from "lucide-react";
import { apiAddOrderItems, apiCreateOrder, apiGetActiveOrders, apiGetOrderForTable, apiSendOrderKot } from "../api/orderApi";
import { apiAdjustStock, apiCreateInventoryItem, apiGetInventory } from "../api/inventoryApi";
import { createMenuItemLookup, findMenuItem, isBeverageCategory } from "../kot/orderRouting";
import { formatCurrency } from "../utils/formatCurrency";
import { BAR_BILL_DEMO_ORDERS } from "../data/barOrdersMockData";
import { BarKOTView } from "./BarKOTView";
import { AdminInvoices } from "../admin/AdminInvoices";
import "./BarWorkspace.css";

const PAGE_SIZE = 8;
const BAR_AREAS = ["Bar Counter", "Lounge", "Indoor Bar", "Outdoor Bar"];
const BAR_ROLES = ["Bartender", "Head Bartender", "Bar Manager", "Bar Waiter", "Bar Server", "Mixologist", "Bar Assistant"];
const BAR_SHIFTS = ["Morning (10 AM-4 PM)", "Evening (4 PM-10 PM)", "Night (6 PM-Close)"];
const SETTINGS_DEFAULTS = {
  barName: "Telugu Taste Bar", contact: "+91 80 4567 8900", area: "Ground Floor • East Wing",
  opening: "10:00", closing: "23:30", prepTime: 8, kotPrefix: "BKOT", autoPrint: false,
  allowCancellation: true, currency: "INR (₹)", tax: 5, service: 5,
  lowStock: 6, stockTracking: true, stockUnit: "Bottle",
};
const ACCESS_ROLES = ["Bar Manager", "Head Bartender", "Bartender", "Bar Server", "Bar Cashier"];
const ACCESS_PAGES = ["Bar Overview", "Drinks Menu", "Bar Tables", "Bar Staff", "Bar KOT", "Inventory", "Orders", "Reports", "Settings"];
const ACCESS_DEFAULTS = Object.fromEntries(ACCESS_ROLES.map((role, index) => [role, Object.fromEntries(ACCESS_PAGES.map((page) => [page, index === 0 || (index === 1 && page !== "Settings") || (index === 2 && ["Bar Overview", "Drinks Menu", "Bar Tables", "Bar KOT"].includes(page)) || (index === 3 && ["Bar Overview", "Bar Tables", "Bar KOT"].includes(page)) || (index === 4 && ["Bar Overview", "Orders"].includes(page))]))]));

const BAR_DRINK_UNITS = ["Glass", "Bottle", "Can", "Peg", "ml", "Litre"];

export const BAR_CATEGORIES = [
  "Cocktails",
  "Mocktails",
  "Beers",
  "Whiskey",
  "Vodka & Gin",
  "Rum & Brandy",
  "Wine & Champagne",
  "Shots & Shooters",
  "Juices & Shakes",
  "Soft Drinks & Soda",
  "Tea & Coffee",
];

export const BAR_SERVING_MEASURES = [
  "30 ml (Single Peg)",
  "60 ml (Double Peg)",
  "90 ml (Large Peg)",
  "Pint (330 ml)",
  "Bottle (650 ml)",
  "Bottle (750 ml)",
  "Glass (150 ml)",
  "Glass (250 ml)",
  "Can (330 ml)",
  "Can (500 ml)",
  "Peg (60 ml)",
  "Pitcher (1500 ml)",
  "Tower (3000 ml)",
];
const FIELD_SETS = {
  drink: [
    ["name", "Drink Name", "text", true],
    ["category", "Category", "category_selector", true],
    ["drinkType", "Drink Type", "select", false, ["Alcoholic", "Non-Alcoholic"]],
    ["abv", "Alcohol Content (ABV %)", "number", false],
    ["measure", "Serving Measure / Volume", "measure_selector", false],
    ["price", "Selling Price (₹)", "number", true],
    ["isAvailable", "Availability", "select", false, ["Available", "Unavailable"]],
    ["description", "Description", "textarea"],
    ["image", "Choose Image", "image"],
  ],
  table: [
    ["number", "Table Number", "text", true], ["area", "Area / Section", "select", true, BAR_AREAS],
    ["capacity", "Seating Capacity", "number", true], ["guests", "Current Guests", "number"],
    ["status", "Occupancy Status", "select", true, ["Available", "Occupied", "Reserved", "Cleaning", "Inactive"]],
    ["staffId", "Assigned Server", "select", false, []],
  ],
  staff: [
    ["name", "Full Name", "text", true], ["role", "Job Title", "select", true, BAR_ROLES],
    ["phone", "Phone / Contact", "tel", true], ["shift", "Shift", "select", true, BAR_SHIFTS],
    ["tables", "Assigned Tables", "multiselect"],
  ],
  order: [
    ["table", "Table / Order Type", "text", true], ["customer", "Customer", "text", true],
    ["items", "Drinks and Quantities", "textarea", true], ["subtotal", "Subtotal", "number", true],
  ],
};

function SharedBarInventory({ inventory, loading, error, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");
  const [newItem, setNewItem] = useState({ name: "", category: "Wine", unit: "Bottle", stock: "0", minThreshold: "5", unitCost: "0" });
  const rows = (Array.isArray(inventory) ? inventory : []).filter((item) => isBeverageCategory(item.category ?? item.subcategory ?? item.name));
  const setNewItemField = (field, value) => setNewItem((previous) => ({ ...previous, [field]: value }));
  const addInventoryItem = async (event) => {
    event.preventDefault();
    setAddBusy(true);
    setAddError("");
    try {
      const result = await apiCreateInventoryItem(newItem);
      if (!result?.success) throw new Error(result?.error || "Could not add the inventory item.");
      setAddOpen(false);
      setNewItem({ name: "", category: "Wine", unit: "Bottle", stock: "0", minThreshold: "5", unitCost: "0" });
      await onRefresh();
    } catch (requestError) { setAddError(requestError?.message || "Could not add the inventory item."); }
    finally { setAddBusy(false); }
  };
  const adjust = async (item, direction) => {
    const amount = Number(window.prompt(direction > 0 ? "Quantity received" : "Adjustment quantity", "1"));
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    try {
      const response = await apiAdjustStock({ ingredientId: item.id ?? item.ingredientId, quantityChange: amount * direction, reason: "Bar stock adjustment" });
      if (!response?.success) throw new Error(response?.error || "Stock adjustment failed.");
      await onRefresh();
    } catch (requestError) { window.alert(requestError?.message || "Stock adjustment failed."); }
    finally { setBusy(false); }
  };
  return <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Inventory</h2><p>Beverage inventory from the shared restaurant inventory ledger.</p></div><div className="bar-actions"><button className="bar-button primary" type="button" onClick={() => { setAddError(""); setAddOpen(true); }}><Plus size={15} /> Add Inventory</button><button className="bar-button secondary" type="button" onClick={onRefresh} disabled={loading}><RefreshCw size={15} /> Refresh</button></div></div>
    {error && <div className="bar-error" role="alert">{error}</div>}
    {loading ? <div className="bar-empty" role="status">Loading shared inventory…</div> : <div className="bar-table-wrap"><table className="bar-table"><thead><tr><th>Item Name</th><th>Category</th><th>Unit</th><th>Stock</th><th>Threshold</th><th>Unit Cost</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((item) => { const stock = Number(item.stock ?? item.currentStock ?? 0); const threshold = Number(item.minThreshold ?? item.minimumThreshold ?? 0); return <tr key={item.id ?? item.ingredientId}><td><strong>{item.name}</strong></td><td>{item.category || item.subcategory || "—"}</td><td>{item.unit || "—"}</td><td>{stock}</td><td>{threshold}</td><td>{formatCurrency(item.unitCost ?? item.cost ?? 0)}</td><td><Status>{stock <= threshold ? "Low Stock" : "In Stock"}</Status></td><td><div className="bar-actions"><button className="bar-button secondary small" disabled={busy} onClick={() => adjust(item, -1)}>Adjust</button><button className="bar-button secondary small" disabled={busy} onClick={() => adjust(item, 1)}>Receive</button></div></td></tr>; })}</tbody></table>{!rows.length && !error && <div className="bar-empty">No beverage inventory records are configured in the shared inventory.</div>}</div>}
    {addOpen && <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !addBusy && setAddOpen(false)}><section className="bar-modal" role="dialog" aria-modal="true" aria-labelledby="bar-inventory-add-title"><header className="bar-modal-head"><div><span className="bar-kicker">SHARED INVENTORY</span><h2 id="bar-inventory-add-title">Add Inventory</h2></div><button className="bar-icon-button" type="button" aria-label="Close" disabled={addBusy} onClick={() => setAddOpen(false)}><X size={18} /></button></header><form className="bar-form" onSubmit={addInventoryItem}><div className="bar-form-grid"><label className="bar-field"><span>Item Name *</span><input required value={newItem.name} onChange={(event) => setNewItemField("name", event.target.value)} /></label><label className="bar-field"><span>Category *</span><input required value={newItem.category} onChange={(event) => setNewItemField("category", event.target.value)} placeholder="Wine, Beer, Soft Drinks…" /></label><label className="bar-field"><span>Unit *</span><input required value={newItem.unit} onChange={(event) => setNewItemField("unit", event.target.value)} placeholder="Bottle, Can, Litre…" /></label><label className="bar-field"><span>Stock *</span><input required type="number" min="0" step="any" value={newItem.stock} onChange={(event) => setNewItemField("stock", event.target.value)} /></label><label className="bar-field"><span>Threshold *</span><input required type="number" min="0" step="any" value={newItem.minThreshold} onChange={(event) => setNewItemField("minThreshold", event.target.value)} /></label><label className="bar-field"><span>Unit Cost *</span><input required type="number" min="0" step="any" value={newItem.unitCost} onChange={(event) => setNewItemField("unitCost", event.target.value)} /></label></div>{addError && <p className="bar-error" role="alert">{addError}</p>}<footer className="bar-modal-footer"><button className="bar-button secondary" type="button" disabled={addBusy} onClick={() => setAddOpen(false)}>Cancel</button><button className="bar-button primary" type="submit" disabled={addBusy}>{addBusy ? "Adding…" : "Add Inventory"}</button></footer></form></section></div>}
  </section>;
}
function Status({ children }) {
  const cls = String(children || "").toLowerCase().replace(/\s+/g, "-");
  return <span className={`bar-status bar-status-${cls}`}>{children}</span>;
}

function makeId(prefix, rows) {
  const next = rows.reduce((max, row) => Math.max(max, Number(String(row.id).match(/\d+$/)?.[0]) || 0), 0) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function csvDownload(filename, rows) {
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printBill(order) {
  const popup = window.open("", "_blank", "width=480,height=760");
  if (!popup) return false;
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  popup.document.write(`<html><head><title>${safe(order.id)} demo bill</title><style>body{font:14px Arial,sans-serif;padding:24px;color:#172033}h1{font-size:20px;margin:0 0 5px}p{color:#475569}.line{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #e2e8f0}.total{font-weight:700;font-size:17px}</style></head><body><h1>Telugu Taste • Bar</h1><p>DEMO BILL • Not saved to server</p><p><b>${safe(order.id)}</b> • ${safe(order.table)}<br/>${safe(order.customer)} • ${safe(order.time)}</p><div class="line"><span>Items</span><span>${safe(order.items)}</span></div><div class="line"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div><div class="line"><span>Discount</span><span>${formatCurrency(order.discount)}</span></div><div class="line"><span>GST</span><span>${formatCurrency(order.gst)}</span></div><div class="line"><span>Service charge</span><span>${formatCurrency(order.service)}</span></div><div class="line total"><span>Total</span><span>${formatCurrency(order.total)}</span></div><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
  return true;
}

function EntityModal({ kind, initial, tables = [], staff = [], drinks = [], onClose, onSave }) {
  const fields = FIELD_SETS[kind] || [];
  const [values, setValues] = useState(() => ({
    ...(initial || {}),
    ...(kind === "staff" ? { tables: Array.isArray(initial?.tables) ? initial.tables : [] } : {}),
    ...(kind === "table" ? { staffId: initial?.staffId || "" } : {}),
    ...(kind === "drink" && initial ? {
      isAvailable: initial.isAvailable === false || initial.isAvailable === "Unavailable" ? "Unavailable" : "Available",
      active: initial.active === false || initial.active === "Inactive" ? "Inactive" : "Active",
      category: initial.category || "Cocktails",
      drinkType: initial.drinkType || (initial.abv ? "Alcoholic" : "Non-Alcoholic"),
      measure: initial.measure || "",
      abv: initial.abv ?? "",
    } : kind === "drink" ? {
      category: "Cocktails",
      drinkType: "Alcoholic",
      measure: "60 ml (Double Peg)",
      isAvailable: "Available",
      abv: "",
    } : {}),
  }));

  const allKnownCategories = useMemo(() => {
    const list = [...BAR_CATEGORIES];
    if (Array.isArray(drinks)) {
      drinks.forEach((d) => {
        if (d.category && !list.some((c) => c.toLowerCase() === d.category.toLowerCase())) {
          list.push(d.category);
        }
      });
    }
    return list;
  }, [drinks]);

  const [isCustomCategory, setIsCustomCategory] = useState(() => {
    if (kind !== "drink" || !initial?.category) return false;
    return !BAR_CATEGORIES.some((c) => c.toLowerCase() === String(initial.category).toLowerCase());
  });

  const [isCustomMeasure, setIsCustomMeasure] = useState(() => {
    if (kind !== "drink" || !initial?.measure) return false;
    return !BAR_SERVING_MEASURES.some((m) => m.toLowerCase() === String(initial.measure).toLowerCase());
  });

  const [error, setError] = useState("");
  const set = (key, value) => setValues((previous) => ({ ...previous, [key]: value }));

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("image", String(reader.result || ""));
      setError("");
    };
    reader.onerror = () => setError("Could not read this image. Please try another file.");
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    for (const [key, label, type, required] of fields) {
      const value = values[key];
      if (required && (value === undefined || value === null || String(value).trim() === "")) {
        setError(`${label} is required.`);
        return;
      }
      if (type === "number" && value !== undefined && value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        setError(`${label} must be a non-negative number.`);
        return;
      }
    }
    if (kind === "drink" && values.abv !== "" && values.abv !== undefined && (Number(values.abv) < 0 || Number(values.abv) > 100)) {
      setError("Alcohol Percentage (ABV) must be between 0 and 100.");
      return;
    }
    const result = await onSave(values);
    if (result === false) setError("The requested changes were not fully applied. Check the message and try again.");
  };

  return (
    <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="bar-modal" role="dialog" aria-modal="true" aria-labelledby="bar-form-title">
        <header className="bar-modal-head">
          <div>
            <span className="bar-kicker">DEMO DATA • NOT SAVED TO SERVER</span>
            <h2 id="bar-form-title">{initial ? "Edit" : "Add"} {kind === "drink" ? "Drink" : kind === "table" ? "Bar Table" : kind === "staff" ? "Bar Staff Member" : "Bar Order"}</h2>
          </div>
          <button className="bar-icon-button" aria-label="Close" onClick={onClose} type="button"><X size={18} /></button>
        </header>
        <form onSubmit={submit} className="bar-form">
          <div className="bar-form-grid">
            {fields.map(([key, label, type = "text", required, options]) => {
              if (kind === "drink" && key === "abv") {
                const isAlcoholic = values.drinkType === "Alcoholic" || ["Cocktails", "Beers", "Whiskey", "Vodka & Gin", "Rum & Brandy", "Wine & Champagne", "Shots & Shooters"].some((c) => c.toLowerCase() === String(values.category || "").toLowerCase());
                if (!isAlcoholic) return null;
              }

              return (
                <label className={`bar-field ${type === "textarea" || type === "multiselect" ? "wide" : ""}`} key={key}>
                  <span>{label}{required && " *"}</span>
                  {type === "category_selector" ? (
                    isCustomCategory ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          required={required}
                          type="text"
                          placeholder="Type custom category name..."
                          value={values.category ?? ""}
                          onChange={(e) => set("category", e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="bar-button secondary small"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomCategory(false);
                            set("category", allKnownCategories[0] || "Cocktails");
                          }}
                        >
                          Choose from list
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <select
                          required={required}
                          value={values.category ?? ""}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomCategory(true);
                              set("category", "");
                            } else {
                              set("category", e.target.value);
                            }
                          }}
                        >
                          <option value="">Select category</option>
                          {allKnownCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="__custom__">+ Type custom category...</option>
                        </select>
                        <button
                          type="button"
                          className="bar-button secondary small"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomCategory(true);
                            set("category", "");
                          }}
                        >
                          + Custom
                        </button>
                      </div>
                    )
                  ) : type === "measure_selector" ? (
                    isCustomMeasure ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="e.g. 45 ml, 500 ml Pitcher..."
                          value={values.measure ?? ""}
                          onChange={(e) => set("measure", e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="bar-button secondary small"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomMeasure(false);
                            set("measure", BAR_SERVING_MEASURES[0]);
                          }}
                        >
                          Choose from list
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <select
                          value={values.measure ?? ""}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomMeasure(true);
                              set("measure", "");
                            } else {
                              set("measure", e.target.value);
                            }
                          }}
                        >
                          <option value="">Select serving measure</option>
                          {BAR_SERVING_MEASURES.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="__custom__">+ Custom Measure...</option>
                        </select>
                        <button
                          type="button"
                          className="bar-button secondary small"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomMeasure(true);
                            set("measure", "");
                          }}
                        >
                          + Custom
                        </button>
                      </div>
                    )
                  ) : type === "image" ? (
                    <div className="bar-image-picker">
                      {values[key] && <img className="bar-image-preview" src={values[key]} alt="Selected drink preview" />}
                      <label className="bar-button secondary bar-image-choose">
                        <Plus size={15} />
                        {values[key] ? "Change Image" : "Choose Image"}
                        <input type="file" accept="image/*" onChange={chooseImage} />
                      </label>
                    </div>
                  ) : type === "select" ? (
                    <select
                      required={required}
                      value={values[key] ?? (key === "isAvailable" ? "Available" : key === "active" ? "Active" : "")}
                      onChange={(event) => set(key, event.target.value)}
                    >
                      <option value="">{key === "staffId" ? "Unassigned" : `Select ${label.toLowerCase()}`}</option>
                      {(key === "staffId"
                        ? staff.map((member) => ({ value: member.id, label: `${member.name} (${member.id})` }))
                        : kind === "table" && key === "area"
                        ? [...new Set([...BAR_AREAS, ...tables.map((table) => table.area)])]
                        : kind === "staff" && key === "role"
                        ? [...new Set([...options, ...staff.map((person) => person.role)])]
                        : kind === "staff" && key === "shift"
                        ? [...new Set([...options, ...staff.map((person) => person.shift).filter(Boolean)])]
                        : options
                      ).map((option) => {
                        const val = typeof option === "string" ? option : option.value;
                        const text = typeof option === "string" ? option : option.label;
                        return <option key={val} value={val}>{text}</option>;
                      })}
                    </select>
                  ) : type === "multiselect" ? (
                    <select
                      multiple
                      aria-label={label}
                      value={(Array.isArray(values[key]) ? values[key] : []).map(String).filter((tableId) => tables.some((table) => String(table.id) === tableId))}
                      onChange={(event) => set(key, [...new Set(Array.from(event.target.selectedOptions, (option) => option.value))])}
                    >
                      {tables.map((table) => (
                        <option key={table.id} value={String(table.id)}>
                          {table.number} • {table.area}
                        </option>
                      ))}
                    </select>
                  ) : type === "textarea" ? (
                    <textarea rows="3" required={required} value={values[key] ?? ""} onChange={(event) => set(key, event.target.value)} />
                  ) : (
                    <input
                      type={type}
                      min={type === "number" ? "0" : undefined}
                      max={type === "number" && key === "abv" ? "100" : undefined}
                      step={type === "number" ? (key === "abv" ? "0.1" : "any") : undefined}
                      required={required}
                      value={values[key] ?? ""}
                      onChange={(event) => set(key, event.target.value)}
                    />
                  )}
                </label>
              );
            })}
          </div>
          {error && <p className="bar-error" role="alert">{error}</p>}
          <footer className="bar-modal-footer">
            <button className="bar-button secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="bar-button primary" type="submit">Save Demo Changes</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function DetailsModal({ item, onClose }) {
  if (!item) return null;
  return <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="bar-modal" role="dialog" aria-modal="true" aria-labelledby="bar-details-title"><header className="bar-modal-head"><div><span className="bar-kicker">DEMO DETAILS</span><h2 id="bar-details-title">{item.name || item.id || "Details"}</h2></div><button className="bar-icon-button" aria-label="Close details" onClick={onClose} type="button"><X size={18} /></button></header><dl className="bar-details-grid">{Object.entries(item).filter(([key, value]) => !["image"].includes(key) && value !== "" && value !== undefined && value !== null).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd></div>)}</dl><footer className="bar-modal-footer"><button type="button" className="bar-button secondary" onClick={onClose}>Close</button></footer></section></div>;
}

function OrderItemsModal({ order, onClose }) {
  if (!order) return null;
  const items = Array.isArray(order.items) ? order.items : [];
  const amountOf = (item) => Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? item.qty ?? 1);
  const orderDate = order.time || order.createdAt || order.orderTime || "—";
  return <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="bar-modal bar-order-items-modal" role="dialog" aria-modal="true" aria-labelledby="bar-order-items-title">
      <header className="bar-modal-head"><div><span className="bar-kicker">ORDER ITEMS</span><h2 id="bar-order-items-title">Order {order.id}</h2></div><button className="bar-icon-button" aria-label="Close order items" onClick={onClose} type="button"><X size={18} /></button></header>
      <div className="bar-order-meta"><div><span>Table</span><strong>{order.table || "Takeaway"}</strong></div><div><span>Order date</span><strong>{String(orderDate)}</strong></div><div><span>Order status</span><Status>{order.status || "Pending"}</Status></div></div>
      <div className="bar-table-wrap bar-order-items-wrap"><table className="bar-table bar-order-items-table"><thead><tr><th>Item Name</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id ?? `${order.id}-${item.name ?? item.dishName}-${index}`}><td><strong>{item.name || item.dishName || item.menuItemName || "Item"}</strong></td><td>{item.categoryLabel || item.category || item.categoryName || "Beverage"}</td><td>{Number(item.quantity ?? item.qty ?? 1)}</td><td>{formatCurrency(item.unitPrice ?? item.price ?? 0)}</td><td><strong>{formatCurrency(amountOf(item))}</strong></td></tr>)}</tbody></table>{!items.length && <div className="bar-empty">No items are available for this order.</div>}</div>
      <footer className="bar-order-total"><span>Total order amount</span><strong>{formatCurrency(items.reduce((sum, item) => sum + amountOf(item), 0))}</strong></footer>
      <footer className="bar-modal-footer"><button type="button" className="bar-button secondary" onClick={onClose}>Close</button></footer>
    </section>
  </div>;
}

export function BarWorkspace({
  activeTab = "bar-overview",
  onNavigate,
  tables: dineTables = [],
  staffList: dineStaff = [],
  menuItems = [],
  sharedRecordLoad = { tables: "ready", staff: "ready" },
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onSetMenuAvailability,
  onOrderUpdated,
  onBarOrderItemStatusUpdated,
  inventory: sharedInventory = [],
  pastOrders = [],
  restaurantName = "Restaurant",
  restaurantSettings = {},
  onUpdateInvoiceDiscount = null,
}) {
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [inventory, setInventory] = useState(sharedInventory);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [busyItems, setBusyItems] = useState(() => new Set());
  const [orderComposerOpen, setOrderComposerOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [pendingBarKot, setPendingBarKot] = useState(null);
  const [orderError, setOrderError] = useState("");
  const [orderTableId, setOrderTableId] = useState("");
  const [orderDrinkId, setOrderDrinkId] = useState("");
  const [orderMenuCategory, setOrderMenuCategory] = useState("all");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState("");
  const [orderServing, setOrderServing] = useState("");
  const [orderIce, setOrderIce] = useState("");
  const [orderMixer, setOrderMixer] = useState("");
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);
  const [savedSettings, setSavedSettings] = useState(SETTINGS_DEFAULTS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [extraFilter, setExtraFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pricePreset, setPricePreset] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [details, setDetails] = useState(null);
  const [itemsOrder, setItemsOrder] = useState(null);
  const [tableItems, setTableItems] = useState(null);
  const [toast, setToast] = useState("");
  const [reportPeriod, setReportPeriod] = useState("Today");
  const [reportCategory, setReportCategory] = useState("All Categories");
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const route = activeTab || "bar-overview";

  const menuLookup = useMemo(() => createMenuItemLookup(menuItems), [menuItems]);
  const drinks = useMemo(() => (Array.isArray(menuItems) ? menuItems : []).filter((item) => isBeverageCategory(item.category ?? item.categoryName) || item.isBeverage || item.isBarDrink || item.category === "bar"), [menuItems]);
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await apiGetActiveOrders();
      const raw = response?.data;
      const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.orders) ? raw.orders : null;
      if (!response?.success || !rows) throw new Error(response?.error || "Active orders response was invalid.");
      setOrders(rows);
      setOrdersError("");
    } catch (error) {
      setOrdersError(error?.message || "Could not load shared restaurant orders.");
    } finally { setOrdersLoading(false); }
  }, []);
  useEffect(() => {
    loadOrders();
    const timer = window.setInterval(loadOrders, 15000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);
  useEffect(() => { setInventory(Array.isArray(sharedInventory) ? sharedInventory : []); }, [sharedInventory]);
  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const response = await apiGetInventory();
      const raw = response?.data;
      const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.ingredients) ? raw.ingredients : null;
      if (!response?.success || !rows) throw new Error(response?.error || "Inventory response was invalid.");
      setInventory(rows);
      window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: rows }));
      setInventoryError("");
    } catch (error) { setInventoryError(error?.message || "Could not load shared inventory."); }
    finally { setInventoryLoading(false); }
  }, []);
  useEffect(() => { if (route === "bar-inventory") loadInventory(); }, [route, loadInventory]);
  const apiBarOrders = useMemo(() => orders.map((order) => {
    const items = (Array.isArray(order.items) ? order.items : []).filter((item) => {
      const menuItem = findMenuItem(menuLookup, item);
      return isBeverageCategory(menuItem?.category ?? menuItem?.categoryName ?? item.category);
    });
    if (!items.length) return null;
    const amount = items.reduce((sum, item) => sum + Number(item.price ?? item.unitPrice ?? 0) * Number(item.quantity ?? 0), 0);
    return { ...order, id: order.orderId ?? order.id, table: order.tableName || order.tableNumber || (order.tableId ? `Table ${order.tableId}` : "Takeaway"), customer: order.customerName || order.serverName || "—", items: Array.isArray(order.items) ? order.items : [], beverageItems: items, quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), itemLabel: items.map((item) => `${item.quantity} × ${item.dishName || item.name || "Drink"}`).join(", "), total: Number(order.totalAmount ?? order.total ?? amount), status: order.status || order.orderStatus || "Pending", time: order.createdAt || order.orderTime || "—" };
  }).filter(Boolean), [orders, menuLookup]);
  const barOrders = useMemo(() => {
    const demoOrders = BAR_BILL_DEMO_ORDERS.map((order) => ({ ...order, total: order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), quantity: order.items.reduce((sum, item) => sum + item.quantity, 0), itemLabel: order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ") }));
    return [...apiBarOrders, ...demoOrders];
  }, [apiBarOrders]);
  const inventoryRows = useMemo(() => inventory.filter((item) => isBeverageCategory(item.category ?? item.subcategory ?? item.name)), [inventory]);
  const barInvoices = useMemo(() => (Array.isArray(pastOrders) ? pastOrders : []).filter((order) => {
    const allItems = Array.isArray(order.items) ? order.items : [];
    return allItems.some((item) => {
      const name = item.name || item.dishName || item.menuItemName || "";
      const menuItem = findMenuItem(menuLookup, { ...item, menuItemId: item.menuItemId ?? item.menu_item_id ?? item.id }) || menuItems.find((candidate) =>
        String(candidate.name || "").trim().toLowerCase() === String(name).trim().toLowerCase());
      return isBeverageCategory(menuItem?.category ?? menuItem?.categoryName ?? item.category ?? item.categoryName ?? item.subcategory ?? name);
    });
  }), [pastOrders, menuItems, menuLookup]);
  const demoTableItems = useMemo(() => {
    const demosByNumber = { "Table-4": BAR_BILL_DEMO_ORDERS[0].items, "Table 4": BAR_BILL_DEMO_ORDERS[0].items, "Table-2": BAR_BILL_DEMO_ORDERS[1].items, "Table 2": BAR_BILL_DEMO_ORDERS[1].items, "Table-8": BAR_BILL_DEMO_ORDERS[2].items, "Table 8": BAR_BILL_DEMO_ORDERS[2].items };
    return demosByNumber;
  }, []);

  const staffIdOf = (person) => person?.staffId ?? person?.id;
  const staffNameOf = (person) => person?.fullName || person?.name || person?.FullName || "";
  const tables = (Array.isArray(dineTables) ? dineTables : []).map((source) => {
    const sourceTableId = source.backendTableId ?? source.tableId ?? source.id;
    const activeOrder = orders.find((order) => String(order.tableId ?? order.TableId) === String(sourceTableId))
      || orders.find((order) => String(order.tableId ?? order.TableId) === String(source.id));
    const serverName = source.server || source.assignedServerName || "";
    const assigned = dineStaff.find((person) => String(staffIdOf(person)) === String(source.assignedServerId ?? source.serverId))
      || dineStaff.find((person) => staffNameOf(person).trim().toLowerCase() === serverName.trim().toLowerCase());
    const rawStatus = String(source.status || "vacant").toLowerCase();
    const status = rawStatus === "reserved" ? "Reserved" : rawStatus === "cleaning" ? "Cleaning" : rawStatus === "inactive" ? "Inactive" : ["occupied", "dining", "billed"].includes(rawStatus) ? "Occupied" : "Available";
    const sourceItems = Array.isArray(source.items) ? source.items.filter((entry) => entry?.status !== "cancelled" && entry?.kotStatus !== "cancelled" && entry?.itemStatus !== "cancelled") : [];
    const orderItems = Array.isArray(activeOrder?.items) ? activeOrder.items : [];
    const items = (sourceItems.length ? sourceItems : orderItems).filter((entry) => entry?.status !== "cancelled" && entry?.kotStatus !== "cancelled" && entry?.itemStatus !== "cancelled");
    const currentOrder = items.map((entry) => {
      const name = entry.name || entry.dishName || entry.menuItemName || "Item";
      const quantity = Number(entry.quantity ?? entry.qty ?? 1) || 1;
      return `${quantity} × ${name}`;
    }).join(", ");
    return {
      ...source,
      id: source.id ?? source.tableId,
      number: source.name || source.tableName || source.tableNumber || `Table ${source.id}`,
      area: source.sectionArea || source.section || source.location || "—",
      capacity: Number(source.capacityChairs ?? source.capacity ?? 0),
      guests: Number(source.guests ?? source.occupiedChairs ?? 0),
      status,
      order: currentOrder || source.order || "—",
      amount: items.length
        ? items.reduce((sum, entry) => sum + Number(entry.price ?? entry.unitPrice ?? 0) * (Number(entry.quantity ?? entry.qty) || 1), 0)
        : Number(source.orderAmount ?? source.amount ?? source.totalAmount ?? activeOrder?.totalAmount ?? activeOrder?.total ?? 0),
      staffId: String(assigned ? staffIdOf(assigned) : source.assignedServerId ?? source.serverId ?? ""),
      _source: source,
    };
  });
  const staff = (Array.isArray(dineStaff) ? dineStaff : []).map((source) => {
    const id = staffIdOf(source);
    const assignedTables = tables.filter((table) => String(table.staffId) === String(id));
    return {
      ...source,
      id,
      name: staffNameOf(source),
      role: source.roleTitle || source.role || "Waiter",
      phone: source.phone || source.contact || "",
      shift: source.shift || "",
      area: [...new Set(assignedTables.map((table) => table.area))].join(", ") || "—",
      tables: assignedTables.map((table) => String(table.id)),
      status: source.status || (source.isActive === true ? "Active" : source.isActive === false ? "Inactive" : "—"),
      _source: source,
    };
  });

  const submitBarOrder = async (event) => {
    event.preventDefault();
    if (orderSubmitting) return;
    const table = tables.find((row) => String(row.id) === String(orderTableId));
    const selectedItem = menuItems.find((row) => String(row.id) === String(orderDrinkId));
    const tableId = Number(table?._source?.backendTableId ?? table?._source?.tableId ?? table?.id);
    const menuItemId = Number(String(selectedItem?.id ?? "").replace(/^m-/, ""));
    if (!table || !selectedItem || !Number.isFinite(tableId) || !Number.isFinite(menuItemId)) {
      setOrderError("Select a valid shared table and menu item with backend IDs.");
      return;
    }
    setOrderSubmitting(true);
    setOrderError("");
    try {
      const notes = [orderServing && `Serving: ${orderServing}`, orderIce && `Ice: ${orderIce}`, orderMixer && `Mixer: ${orderMixer}`, orderNotes.trim()].filter(Boolean).join("; ");
      const itemPayload = [{ menuItemId, id: menuItemId, name: selectedItem.name, price: Number(selectedItem.price) || 0, quantity: Math.max(1, Math.floor(Number(orderQuantity) || 1)), notes }];
      let orderId = pendingBarKot?.orderId;
      let itemToSync = pendingBarKot?.item || itemPayload[0];
      let activeTableId = pendingBarKot?.tableId || tableId;
      if (!pendingBarKot) {
        const existingResponse = await apiGetOrderForTable(tableId);
        const tableMustBeRegisteredByCreate = !existingResponse?.success
          && existingResponse.status === 404
          && /table not found/i.test(existingResponse.error || "");
        if (!existingResponse?.success && !tableMustBeRegisteredByCreate) throw new Error(existingResponse?.error || "The existing shared table order could not be checked safely.");
        const existingData = tableMustBeRegisteredByCreate ? null : existingResponse.data?.data ?? existingResponse.data;
        const existingStatus = String(existingData?.status || "").toLowerCase();
        orderId = ["billed", "settled", "completed"].includes(existingStatus) ? null : Number(existingData?.id ?? existingData?.orderId);
        if (Number.isFinite(orderId)) {
          const added = await apiAddOrderItems(orderId, itemPayload);
          if (!added?.success) throw new Error(added?.error || "The item could not be added to the existing shared order.");
        } else {
          const created = await apiCreateOrder({ tableId, tableName: table.number, tableNumber: table.number, serverName: table.server || "Server", guests: Number(table.guests) || 1, status: "Active", items: itemPayload });
          if (!created?.success) throw new Error(created?.error || "The shared order could not be created.");
          const data = created.data?.data ?? created.data;
          orderId = Number(data?.id ?? data?.orderId);
          if (!Number.isFinite(orderId)) throw new Error("The order API did not return an order ID.");
        }
        setPendingBarKot({ orderId, tableId, item: itemPayload[0] });
      }
      const sent = await apiSendOrderKot(orderId);
      if (!sent?.success) throw new Error(sent?.error || `Order ${orderId} was created but its KOT was not confirmed. Retry from POS before creating another order.`);
      onOrderUpdated?.({ tableId: activeTableId, orderId, item: itemToSync });
      setPendingBarKot(null);
      setOrderComposerOpen(false);
      setOrderTableId(""); setOrderDrinkId(""); setOrderMenuCategory("all"); setOrderQuantity(1); setOrderNotes(""); setOrderServing(""); setOrderIce(""); setOrderMixer("");
      setToast(`Item added to shared order ${orderId}; KOT dispatch confirmed.`);
      await loadOrders();
    } catch (error) { setOrderError(error?.message || "Could not submit the Bar order."); }
    finally { setOrderSubmitting(false); }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => { setQuery(""); setFilter("all"); setExtraFilter("all"); setCapacityFilter("all"); setAssignmentFilter("all"); setStockFilter("all"); setMinPrice(""); setMaxPrice(""); setPaymentFilter("all"); setPage(1); }, [activeTab]);

  const go = (next) => { onNavigate?.(next); setQuery(""); setFilter("all"); setPage(1); };
  const openForm = (kind, item = null) => setModal({ kind, item });
  const toDineStatus = (status, originalStatus) => {
    if (status === "Available") return "vacant";
    if (status === "Reserved") return "reserved";
    if (status === "Cleaning") return "cleaning";
    if (status === "Inactive") return "inactive";
    return ["dining", "billed"].includes(String(originalStatus).toLowerCase()) ? originalStatus : "occupied";
  };
  const saveSharedTable = async (values, item = null) => {
    const original = item?._source;
    const number = String(values.number || "").trim();
    const numberUnchanged = Boolean(item && number === String(item.number));
    const persistedNumber = numberUnchanged ? original?.tableNumber || original?.tableName || original?.name || number : number;
    const displayName = numberUnchanged ? original?.name || item.number : number;
    const staffPerson = staff.find((person) => String(person.id) === String(values.staffId));
    if (!number) { setToast("Table number is required."); return false; }
    const numericLabel = number.match(/\d+/)?.[0];
    const duplicate = tables.find((table) => table.id !== item?.id && (table.number.trim().toLowerCase() === number.toLowerCase() || (!item && numericLabel && table.number.match(/\d+/)?.[0] === numericLabel)));
    if (duplicate) { setToast(`Table ${number} already exists in the shared hotel table list.`); return false; }
    const common = {
      ...(original || {}),
      name: displayName,
      tableName: persistedNumber,
      tableNumber: persistedNumber,
      section: values.area || original?.section || "Main Hall",
      sectionArea: values.area || original?.sectionArea || original?.section || "Main Hall",
      capacity: Number(values.capacity ?? original?.capacity ?? 0),
      capacityChairs: Number(values.capacity ?? original?.capacityChairs ?? original?.capacity ?? 0),
      guests: Number(values.guests ?? original?.guests ?? original?.occupiedChairs ?? 0),
      occupiedChairs: Number(values.guests ?? original?.occupiedChairs ?? original?.guests ?? 0),
      status: toDineStatus(values.status || item?.status || "Available", original?.status),
      server: staffPerson ? staffNameOf(staffPerson) : (values.staffId ? original?.server || original?.assignedServerName || "" : ""),
      assignedServerName: staffPerson ? staffNameOf(staffPerson) : (values.staffId ? original?.assignedServerName || original?.server || "" : ""),
      assignedServerId: staffPerson ? staffIdOf(staffPerson) : (values.staffId ? original?.assignedServerId ?? original?.serverId ?? null : null),
    };
    try {
      const result = item
        ? await onUpdateTable?.({ ...common, id: original?.id ?? item.id, backendTableId: original?.backendTableId })
        : await onAddTable?.({ ...common, id: Math.max(0, ...tables.map((table) => Number(table.id) || 0)) + 1, items: [], status: "vacant", guests: 0, occupiedChairs: 0 });
      if (result === false || result?.success === false) {
        setToast(result?.error || "The shared table record could not be saved.");
        return false;
      }
      return true;
    } catch (error) {
      setToast(error?.message || "The shared table record could not be saved.");
      return false;
    }
  };
  const syncStaffAssignments = async (personOrId, selectedTableIds) => {
    const personId = typeof personOrId === "object" ? staffIdOf(personOrId) : personOrId;
    const assignedPerson = typeof personOrId === "object" ? personOrId : staff.find((person) => String(person.id) === String(personId));
    const selected = new Set(selectedTableIds.map(String));
    for (const table of tables) {
      const shouldAssign = selected.has(String(table.id));
      if ((shouldAssign && String(table.staffId) === String(personId)) || (!shouldAssign && String(table.staffId) !== String(personId))) continue;
      const currentStaff = shouldAssign ? assignedPerson : null;
      const original = table._source;
      const result = await onUpdateTable?.({
        ...original,
        id: original?.id ?? table.id,
        backendTableId: original?.backendTableId,
        server: currentStaff ? staffNameOf(currentStaff) : "",
        assignedServerName: currentStaff ? staffNameOf(currentStaff) : "",
        assignedServerId: currentStaff ? staffIdOf(currentStaff) : null,
      });
      if (result === false || result?.success === false) return false;
    }
    return true;
  };
  const saveSharedStaff = async (values, item = null) => {
    const payload = {
      ...(item?._source || {}),
      name: String(values.name || "").trim(),
      role: values.role || "Waiter",
      phone: values.phone || "",
      shift: values.shift || "",
    };
    if (!payload.name) { setToast("Staff name is required."); return false; }
    const normalizedName = payload.name.trim().toLowerCase();
    const normalizedPhone = String(payload.phone || "").replace(/\D/g, "");
    const duplicate = !item && staff.some((person) => person.name.trim().toLowerCase() === normalizedName && (!normalizedPhone || !String(person.phone || "").replace(/\D/g, "") || String(person.phone || "").replace(/\D/g, "") === normalizedPhone));
    if (duplicate) { setToast("This staff member already exists in the shared hotel staff list."); return false; }
    try {
      const result = item ? await onUpdateStaff?.({ ...payload, id: item.id }) : await onAddStaff?.(payload);
      if (result === false || result?.success === false) {
        setToast(result?.error || "The shared staff record could not be saved.");
        return false;
      }
      const savedPerson = result && typeof result === "object" ? result : (item?._source || staff.find((person) => String(person.id) === String(item?.id)));
      const personId = staffIdOf(savedPerson);
      if (personId == null) {
        setToast("The staff record was saved, but no backend staff ID is available for table assignment.");
        return false;
      }
      const assignmentsSaved = await syncStaffAssignments(savedPerson, Array.isArray(values.tables) ? values.tables : []);
      if (!assignmentsSaved) setToast("Staff details were saved, but one or more table assignment changes were not applied.");
      return assignmentsSaved;
    } catch (error) {
      setToast(error?.message || "The shared staff record could not be saved.");
      return false;
    }
  };
  const saveEntity = async (values) => {
    const { kind, item } = modal;
    const id = item?.id || makeId(kind === "drink" ? "DR" : kind === "table" ? "BT" : kind === "staff" ? "BS" : "BO", kind === "drink" ? drinks : kind === "table" ? tables : kind === "staff" ? staff : orders);
    const saved = { ...item, ...values, id };
    if (kind === "drink") {
      saved.price = Number(saved.price || 0);
      saved.isAvailable = saved.isAvailable === true || saved.isAvailable === "Available";
    }
    if (kind === "order" && saved.subtotal !== undefined) saved.subtotal = Number(saved.subtotal);
    if (kind === "drink") {
      const payload = {
        ...item,
        ...values,
        id: item?.id,
        name: String(values.name || "").trim(),
        category: values.category || "Cocktails",
        price: Number(values.price),
        isAvailable: values.isAvailable === true || values.isAvailable === "Available",
        drinkType: values.drinkType || (values.abv ? "Alcoholic" : "Non-Alcoholic"),
        measure: values.measure || "",
        abv: values.abv !== undefined && values.abv !== "" ? Number(values.abv) : undefined,
        isBeverage: true,
        isBarDrink: true,
      };
      const result = item ? await onUpdateMenuItem?.(payload) : await onAddMenuItem?.(payload);
      if (result === false || result?.success === false) { setToast(result?.error || "The shared menu item could not be be saved."); return false; }
    }
    if (kind === "table" && !(await saveSharedTable(values, item))) return false;
    if (kind === "staff" && !(await saveSharedStaff(values, item))) return false;
    if (kind === "order") setOrders((rows) => [{ ...saved, time: "Just now", discount: 0, gst: Number(saved.subtotal) * 0.05, service: Number(saved.subtotal) * 0.05, total: Number(saved.subtotal) * 1.1, payment: "Pending", status: "Pending" }, ...rows]);
    setPage(1);
    if (kind === "drink") setToast(`${saved.name} ${item ? "updated" : "added"} in the shared menu.`);
    setModal(null);
    return true;
  };
  const deleteItem = async (kind, item) => {
    if (!window.confirm(`Delete ${item.name || item.number || item.id} from the shared hotel records?`)) return;
    if (kind === "table") {
      const result = await onDeleteTable?.(item._source?.id ?? item.id);
      if (result === false || result?.success === false) { setToast(result?.error || "The shared table could not be deleted."); return; }
      setAssignmentFilter((current) => current === item.id ? "all" : current);
    } else if (kind === "staff") {
      if (!(await syncStaffAssignments(item._source || item, []))) { setToast("Could not clear this staff member's table assignments."); return; }
      const result = await onDeleteStaff?.(item._source?.id ?? item.id);
      if (result === false || result?.success === false) { setToast(result?.error || "The shared staff record could not be deleted."); return; }
    } else if (kind === "drink") {
      const result = await onDeleteMenuItem?.(item.id);
      if (result === false || result?.success === false) { setToast(result?.error || "The shared menu item could not be deleted."); return; }
    }
    setPage(1);
    if (kind === "drink") setToast("Menu item deleted.");
  };
  const patchOrder = (id, patch) => { setOrders((rows) => rows.map((order) => order.id === id ? { ...order, ...patch } : order)); setPage(1); };

  const completedDrinkSales = (Array.isArray(pastOrders) ? pastOrders : []).reduce((sum, order) => {
    const items = (Array.isArray(order.items) ? order.items : []).filter((item) => {
      const menuItem = findMenuItem(menuLookup, item);
      return isBeverageCategory(menuItem?.category ?? menuItem?.categoryName ?? item.category);
    });
    return sum + items.reduce((itemSum, item) => itemSum + Number(item.price ?? item.unitPrice ?? 0) * Number(item.quantity ?? 0), 0);
  }, 0);
  const dashboard = [
    ["Total Drinks", drinks.length, Martini, "orange"],
    ["Active Bar Orders", barOrders.filter((order) => !["Served", "Cancelled"].includes(String(order.status))).length, FileText, "blue"],
    ["Pending Orders", barOrders.filter((order) => String(order.status).toLowerCase().includes("pending")).length, Clock3, "amber"],
    ["Preparing Drinks", barOrders.filter((order) => String(order.status).toLowerCase().includes("prepar")).length, GlassWater, "purple"],
    ["Ready to Serve", barOrders.filter((order) => String(order.status).toLowerCase().includes("ready")).length, Check, "green"],
    ["Completed Drink Sales", formatCurrency(completedDrinkSales), Wine, "orange"],
  ];

  const listConfig = {
    "bar-drinks": { title: "Drinks Menu", description: "Beverage items from the shared restaurant menu.", rows: drinks, kind: "drink", columns: ["Drink Name", "Category", "Serving / Measure", "Price", "Availability", "Actions"] },
    "bar-tables": { title: "Bar Tables", description: "The shared hotel table records and complete food-and-drink orders.", rows: tables, kind: "table", columns: ["Table #", "Area", "Chairs / Capacity", "Assigned Server", "Status", "Guests", "Current Order", "Order Amount", "Actions"] },
    "bar-staff": { title: "Bar Staff & Persons", description: "Shared hotel staff records • changes appear in Dine mode too.", rows: staff, kind: "staff", columns: ["Staff ID", "Full Name", "Job Title", "Phone / Contact", "Shift", "Bar Area", "Assigned Tables", "Status", "Actions"] },
  }[route];

  const filterChoices = route === "bar-drinks" ? ["all", ...new Set([...BAR_CATEGORIES, ...drinks.map((drink) => drink.category).filter(Boolean)])] : route === "bar-tables" ? ["all", ...new Set(tables.map((table) => table.area))] : route === "bar-staff" ? ["all", ...new Set([...BAR_ROLES, ...staff.map((person) => person.role)])] : ["all"];
  const listRows = (() => {
    if (!listConfig) return [];
    return listConfig.rows.filter((row) => {
      const matchesQuery = !query.trim() || JSON.stringify(row).toLowerCase().includes(query.trim().toLowerCase());
      const matchesFilter = route === "bar-drinks" ? (filter === "all" || String(row.category || "").toLowerCase() === filter.toLowerCase()) && (minPrice === "" || Number(row.price) >= Number(minPrice)) && (maxPrice === "" || Number(row.price) <= Number(maxPrice)) && (stockFilter === "all" || (stockFilter === "low" ? Number(row.currentStock) <= Number(row.minimumStock) : Number(row.currentStock) > Number(row.minimumStock)))
        : route === "bar-tables" ? (filter === "all" || row.area === filter) && (extraFilter === "all" || row.status === extraFilter) && (capacityFilter === "all" || Number(row.capacity) >= Number(capacityFilter))
        : route === "bar-staff" ? (filter === "all" || row.role === filter) && (extraFilter === "all" || row.shift === extraFilter) && (assignmentFilter === "all" || (Array.isArray(row.tables) && row.tables.includes(assignmentFilter)))
        : true;
      const matchesExtra = route === "bar-drinks" ? extraFilter === "all" || (extraFilter === "available" ? row.isAvailable !== false && row.isAvailable !== "Unavailable" : row.isAvailable === false || row.isAvailable === "Unavailable") : true;
      return matchesQuery && matchesFilter && matchesExtra;
    });
  })();
  const pageCount = Math.max(1, Math.ceil(listRows.length / PAGE_SIZE));
  const visibleRows = listRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sharedListKey = route === "bar-tables" ? "tables" : route === "bar-staff" ? "staff" : null;
  const sharedListStatus = sharedListKey
    ? [sharedRecordLoad?.tables, sharedRecordLoad?.staff].includes("error")
      ? "error"
      : [sharedRecordLoad?.tables, sharedRecordLoad?.staff].includes("loading")
        ? "loading"
        : "ready"
    : "ready";
  const sharedListError = [sharedRecordLoad?.tableError, sharedRecordLoad?.staffError].filter(Boolean).join(" ");
  const filteredOrders = barOrders.filter((order) => (!query || JSON.stringify(order).toLowerCase().includes(query.toLowerCase())) && (filter === "all" || String(order.status).toLowerCase() === filter.toLowerCase()) && (paymentFilter === "all" || order.payment === paymentFilter));
  const visibleOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const primaryActions = (kind, row) => <div className="bar-actions"><button className="bar-icon-button" title="View" aria-label="View details" onClick={() => setDetails(row)}><Eye size={15} /></button><button className="bar-icon-button" title="Edit" aria-label="Edit" onClick={() => openForm(kind, row)}><Pencil size={15} /></button>{kind === "table" && <button className="bar-button secondary small" title="Change occupancy status" onClick={() => saveSharedTable({ ...row, status: ({ Available: "Occupied", Occupied: "Reserved", Reserved: "Available" })[row.status] || "Available" }, row)}>Status</button>}{kind === "drink" && <button type="button" className={`bar-button small ${row.isAvailable !== false && row.isAvailable !== "Unavailable" ? "warning" : "success"}`} title={row.isAvailable !== false && row.isAvailable !== "Unavailable" ? "Click to Disable drink" : "Click to Enable drink"} aria-label={row.isAvailable !== false && row.isAvailable !== "Unavailable" ? `Disable ${row.name}` : `Enable ${row.name}`} onClick={() => onSetMenuAvailability?.(row.id, row.isAvailable === false || row.isAvailable === "Unavailable")}>{row.isAvailable !== false && row.isAvailable !== "Unavailable" ? "Disable" : "Enable"}</button>}<button className="bar-icon-button danger" title="Delete" aria-label="Delete" onClick={() => deleteItem(kind, row)}><Trash2 size={15} /></button></div>;

  const renderListCell = (column, row, kind) => {
    if (column === "Actions") return primaryActions(kind, row);
    if (column === "Current Order" && kind === "table") {
      const sourceItems = Array.isArray(row.items) && row.items.length ? row.items : demoTableItems[row.number] || [];
      return <button className="bar-button secondary small" type="button" onClick={() => {
      const items = sourceItems.map((item) => {
        const menuItem = findMenuItem(menuLookup, item);
        const category = menuItem?.category ?? menuItem?.categoryName ?? item.category ?? item.subcategory;
        return { ...item, categoryLabel: isBeverageCategory(category) ? "Beverage" : "Food" };
      });
      setTableItems({ id: row.orderId ?? row.activeOrderId ?? `Table ${row.number}`, table: row.number, time: row.orderTime ?? row.createdAt ?? "—", status: row.status, items });
      }}>View Items ({sourceItems.length})</button>;
    }
    if (column === "Drink Name") return <><strong>{row.name}</strong>{row.description && <small>{row.description}</small>}</>;
    if (column === "Price" || column === "Order Amount") return formatCurrency(row.price ?? row.amount ?? 0);
    if (column === "Stock") return <span className={`bar-stock-chip ${Number(row.currentStock) <= Number(row.minimumStock) ? "low" : ""}`}>{row.currentStock} {Number(row.currentStock) <= Number(row.minimumStock) ? "• Low" : ""}</span>;
    if (column === "Availability") return <Status>{row.isAvailable === false || row.isAvailable === "Unavailable" ? "Unavailable" : "Available"}</Status>;
    if (column === "Status") return <Status>{row.status}</Status>;
    const map = {
      "Table": "number", "Table #": "number", "Area / Section": "area", "Area": "area", "Capacity": "capacity", "Chairs / Capacity": "capacity", "Guests": "guests", "Current Order": "order",
      "Staff ID": "id", "Full Name": "name", "Job Title": "role", "Phone / Contact": "phone", "Shift": "shift", "Bar Area": "area", "Assigned Tables": "tables",
      "Category": "category", SKU: "sku", Brand: "brand", Unit: "unit",
    };
    if (column === "Assigned Server" || column === "Assigned Staff") return staff.find((member) => String(member.id) === String(row.staffId))?.name || row.server || "Unassigned";
    if (column === "Assigned Tables") return (Array.isArray(row.tables) ? row.tables : []).map((tableId) => tables.find((table) => String(table.id) === String(tableId))?.number).filter(Boolean).join(", ") || "—";
    return row[map[column] || column.toLowerCase()] ?? "—";
  };

  const renderStaticTable = (columns, rows, cell, className = "") => <div className={`bar-table-wrap ${className}-wrap`}><table className={`bar-table ${className}`}><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column}>{cell(column, row)}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <div className="bar-empty">No results found. Adjust your search or filters.</div>}</div>;

  const listPage = listConfig && <section className="bar-page-card">
    <div className="bar-section-head"><div><h2>{listConfig.title}</h2><p>{listConfig.description}</p></div><button className="bar-button primary" disabled={sharedListKey && sharedListStatus !== "ready"} onClick={() => openForm(listConfig.kind)}><Plus size={16} /> Add {listConfig.kind === "drink" ? "Drink" : listConfig.kind === "table" ? "Table" : "Staff"}</button></div>
    <div className="bar-list-tools"><label className="bar-search"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`Search ${listConfig.title.toLowerCase()}...`} /></label><label className="bar-select-label"><span>{route === "bar-staff" ? "Role" : route === "bar-tables" ? "Area" : "Category"}</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">All {route === "bar-staff" ? "Roles" : route === "bar-tables" ? "Areas" : "Categories"}</option>{filterChoices.slice(1).map((choice) => <option key={choice}>{choice}</option>)}</select></label>
      {route === "bar-drinks" && (
        <>
          <label className="bar-select-label">
            <span>Availability</span>
            <select value={extraFilter} onChange={(event) => { setExtraFilter(event.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
          <label className="bar-select-label">
            <span>Stock</span>
            <select value={stockFilter} onChange={(event) => { setStockFilter(event.target.value); setPage(1); }}>
              <option value="all">All stock</option>
              <option value="low">Low stock</option>
              <option value="healthy">In stock</option>
            </select>
          </label>
          <label className="bar-select-label">
            <span>Price Range</span>
            <select
              value={pricePreset}
              onChange={(e) => {
                const val = e.target.value;
                setPricePreset(val);
                if (val === "all") {
                  setMinPrice("");
                  setMaxPrice("");
                } else if (val === "under-150") {
                  setMinPrice("");
                  setMaxPrice("150");
                } else if (val === "150-300") {
                  setMinPrice("150");
                  setMaxPrice("300");
                } else if (val === "300-500") {
                  setMinPrice("300");
                  setMaxPrice("500");
                } else if (val === "above-500") {
                  setMinPrice("500");
                  setMaxPrice("");
                }
                setPage(1);
              }}
            >
              <option value="all">All Prices</option>
              <option value="under-150">Under ₹150</option>
              <option value="150-300">₹150 – ₹300</option>
              <option value="300-500">₹300 – ₹500</option>
              <option value="above-500">Above ₹500</option>
              </select>
          </label>
          
        </>
      )}
      {route === "bar-tables" && <><label className="bar-select-label"><span>Occupancy</span><select value={extraFilter} onChange={(event) => { setExtraFilter(event.target.value); setPage(1); }}><option value="all">Any status</option>{[...new Set(tables.map((table) => table.status))].map((status) => <option key={status}>{status}</option>)}</select></label><label className="bar-select-label"><span>Minimum Capacity</span><select value={capacityFilter} onChange={(event) => { setCapacityFilter(event.target.value); setPage(1); }}><option value="all">Any capacity</option>{[2, 4, 6].map((size) => <option key={size} value={size}>{size}+ guests</option>)}</select></label></>}
      {route === "bar-staff" && <label className="bar-select-label"><span>Shift</span><select value={extraFilter} onChange={(event) => { setExtraFilter(event.target.value); setPage(1); }}><option value="all">All shifts</option>{BAR_SHIFTS.map((shift) => <option key={shift}>{shift}</option>)}</select></label>}
      {route === "bar-staff" && <label className="bar-select-label"><span>Table Assignment</span><select value={assignmentFilter} onChange={(event) => { setAssignmentFilter(event.target.value); setPage(1); }}><option value="all">All assignments</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.number}</option>)}</select></label>}
    </div>
    {sharedListStatus === "loading" ? <div className="bar-empty" role="status">Loading shared hotel {sharedListKey}...</div> : sharedListStatus === "error" ? <div className="bar-error" role="alert">{sharedListError || `Could not load shared hotel ${sharedListKey}. The Bar page is not showing demo records.`}</div> : <>{renderStaticTable(listConfig.columns, visibleRows, (column, row) => renderListCell(column, row, listConfig.kind), `bar-${listConfig.kind}-table`)}
    <footer className="bar-pagination"><span>Showing {listRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, listRows.length)} of {listRows.length}</span><div><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft size={16} /></button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} aria-label="Next page"><ChevronRight size={16} /></button></div></footer>
    </>}
  </section>;

  const reportData = [["Active Beverage Orders", String(barOrders.length), "Shared active orders API"], ["Menu Beverage Items", String(drinks.length), "Shared menu API"], ["Beverage Inventory Records", String(inventoryRows.length), "Shared inventory API"], ["Completed Drink Sales", formatCurrency(completedDrinkSales), "Calculated from loaded shared order items"]].filter((row) => reportCategory === "All Categories" || row.join(" ").toLowerCase().includes(reportCategory.toLowerCase()));

  return (
    <main className="bar-workspace">
      <div className="bar-page-title"><div><span className="bar-kicker">TELUGU TASTE • BAR OPERATIONS</span><h1>{({ "bar-overview": "Bar Overview", "bar-drinks": "Drinks Menu", "bar-tables": "Bar Tables", "bar-staff": "Bar Staff & Persons", "bar-kot": "Bar KOT", "bar-inventory": "Bar Inventory", "bar-orders": "Bar Orders / Bills", "bar-reports": "Bar Reports", "bar-access": "Bar Access Management", "bar-settings": "Bar Settings" })[route] || (route === "bar-invoices" ? "Invoices" : "Bar Overview")}</h1><p>{["bar-tables", "bar-staff"].includes(route) ? "Shared hotel records • same tables and staff as Dine mode." : route === "bar-kot" ? "Persisted beverage tickets • live statuses from the KOT service." : "Independent Bar workspace • drink and order records are demo data."}</p></div><span className="bar-demo-banner">{["bar-tables", "bar-staff"].includes(route) ? "SHARED HOTEL DATA" : route === "bar-kot" ? "LIVE KOT DATA" : "DEMO DATA • SESSION ONLY"}</span></div>

      {route === "bar-overview" && <>
        <section className="bar-dashboard-grid" aria-label="Bar summary">{dashboard.map(([label, value, Icon, tone]) => <article className="bar-stat-card" key={label}><span className={`bar-stat-icon tone-${tone}`}><Icon size={19} /></span><div><span>{label}</span><strong>{value}</strong></div></article>)}</section><div className="bar-overview-grid"><section className="bar-page-card"><div className="bar-section-head"><div><h2>Recent Bar Orders</h2><p>Recent beverage items from shared restaurant orders.</p></div><button className="bar-button secondary" onClick={() => go("bar-orders")}>All Orders</button></div>{ordersLoading ? <div className="bar-empty" role="status">Loading shared orders…</div> : ordersError ? <div className="bar-error" role="alert">{ordersError}</div> : renderStaticTable(["Order Number", "Table", "Drink Items", "Quantity", "Amount", "Time", "Status"], barOrders.slice(0, 5), (column, order) => ({ "Order Number": <strong>{order.id}</strong>, Table: order.table, "Drink Items": order.itemLabel, Quantity: order.quantity, Amount: formatCurrency(order.total), Time: order.time, Status: <Status>{order.status}</Status> })[column])}</section><section className="bar-page-card"><div className="bar-section-head"><div><h2>Quick Actions</h2><p>Common Bar tasks</p></div></div><div className="bar-quick-actions"><button className="bar-button primary" onClick={() => { go("bar-drinks"); openForm("drink"); }}><Plus size={16} /> Add Drink</button><button className="bar-button secondary" onClick={() => { go("bar-orders"); setOrderComposerOpen(true); }}><FileText size={16} /> New Bar Order</button><button className="bar-button secondary" onClick={() => go("bar-inventory")}><Package size={16} /> View Inventory</button><button className="bar-button secondary" onClick={() => go("bar-reports")}><BarChart3 size={16} /> View Reports</button></div></section></div>
      </>}

      {listPage}

      {route === "bar-kot" && <BarKOTView menuItems={menuItems} tables={tables} staffList={dineStaff} onItemsUpdated={onBarOrderItemStatusUpdated} />}

      {route === "bar-invoices" && <AdminInvoices pastOrders={barInvoices} restaurantName={restaurantName} restaurantSettings={restaurantSettings} onUpdateInvoiceDiscount={onUpdateInvoiceDiscount} />}

      {route === "bar-inventory" && <SharedBarInventory inventory={inventory} loading={inventoryLoading} error={inventoryError} onRefresh={loadInventory} />}

      {route === "bar-orders" && <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Orders / Bills</h2><p>Shared restaurant orders with beverage summaries, plus static demo examples.</p></div><div className="bar-actions"><button className="bar-button secondary" onClick={loadOrders} disabled={ordersLoading}><RefreshCw size={15} /> Refresh</button><button className="bar-button primary" onClick={() => setOrderComposerOpen(true)}><Plus size={16} /> New Bar Order</button></div></div><div className="bar-list-tools"><label className="bar-search"><Search size={16} /><input placeholder="Search orders, tables, customers…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><label className="bar-select-label"><span>Order Status</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">All statuses</option>{[...new Set(barOrders.map((order) => order.status))].map((status) => <option key={status}>{status}</option>)}</select></label></div>{ordersLoading ? <div className="bar-empty" role="status">Loading shared orders…</div> : <>{ordersError && <div className="bar-error" role="status">{ordersError} Static demo orders are still available below.</div>}{renderStaticTable(["Order ID", "Table / Order Type", "Customer / Server", "Drinks and Quantities", "Order Time", "Total", "Order Status", "Actions"], visibleOrders, (column, order) => ({ "Order ID": <strong className="bar-order-id" title={String(order.id)}>{order.id}</strong>, "Table / Order Type": order.table, "Customer / Server": order.customer, "Drinks and Quantities": order.itemLabel, "Order Time": order.time, Total: <strong>{formatCurrency(order.total)}</strong>, "Order Status": <Status>{order.status}</Status>, Actions: <div className="bar-actions bar-order-actions"><button className="bar-button secondary small" title="View all items in this order" onClick={() => setItemsOrder(order)}>View Items</button><button className="bar-icon-button" aria-label={`Print order ${order.id}`} title="Print order details" onClick={() => printBill({ ...order, subtotal: order.total, discount: 0, gst: 0, service: 0, items: order.itemLabel }) || setToast("Allow pop-ups to print the order details.")}><Printer size={15} /></button></div> })[column], "bar-orders-table")}<footer className="bar-pagination"><span>Showing {filteredOrders.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}</span><div><button disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))}><ChevronLeft size={16} /></button><span>Page {page} of {Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))}</span><button disabled={page >= Math.ceil(filteredOrders.length / PAGE_SIZE)} onClick={() => setPage((n) => n + 1)}><ChevronRight size={16} /></button></div></footer></>}</section>}
      <OrderItemsModal order={itemsOrder} onClose={() => setItemsOrder(null)} />
      <OrderItemsModal order={tableItems} onClose={() => setTableItems(null)} />

      {route === "bar-reports" && <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Reports</h2><p>Summary calculated from the shared menu, active orders, inventory, and loaded order history.</p></div><button className="bar-button secondary" onClick={() => csvDownload("bar-report.csv", [["Report", "Value", "Source"], ...reportData])}>Export CSV</button></div><div className="bar-report-summary">{reportData.map(([label,value,note])=><article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>{renderStaticTable(["Report","Value","Source"],reportData.map((row,index)=>({id:index,name:row[0],value:row[1],source:row[2]})),(column,row)=>({Report:row.name,Value:row.value,Source:row.source})[column])}</section>}

      {route === "bar-access" && <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Access Management</h2><p>Access changes use the application authorization system.</p></div></div><div className="bar-empty">No Bar-specific access management API is configured. Existing application roles and permissions remain authoritative.</div></section>}

      {route === "bar-settings" && <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Settings</h2><p>Settings must be stored by the restaurant configuration service to persist across sessions.</p></div></div><div className="bar-empty">No Bar-specific settings API is configured. No local demo values are being presented as saved settings.</div></section>}

      {orderComposerOpen && <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !orderSubmitting && setOrderComposerOpen(false)}><section className="bar-modal" role="dialog" aria-modal="true" aria-labelledby="bar-order-title"><header className="bar-modal-head"><div><span className="bar-kicker">SHARED RESTAURANT ORDER</span><h2 id="bar-order-title">New Bar Order</h2></div><button className="bar-icon-button" type="button" aria-label="Close" disabled={orderSubmitting} onClick={() => setOrderComposerOpen(false)}><X size={18} /></button></header><form className="bar-form" onSubmit={submitBarOrder}><div className="bar-form-grid"><label className="bar-field"><span>Table *</span><select required value={orderTableId} onChange={(event) => setOrderTableId(event.target.value)}><option value="">Select a shared table</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.number}</option>)}</select></label><label className="bar-field"><span>Category</span><select value={orderMenuCategory} onChange={(event) => { setOrderMenuCategory(event.target.value); setOrderDrinkId(""); }}><option value="all">All categories</option>{[...new Set(menuItems.map((item) => item.category).filter(Boolean))].map((category) => <option key={category}>{category}</option>)}</select></label><label className="bar-field"><span>Food or Drink *</span><select required value={orderDrinkId} onChange={(event) => setOrderDrinkId(event.target.value)}><option value="">Select food or drink</option>{menuItems.filter((item) => item.isAvailable !== false && (orderMenuCategory === "all" || item.category === orderMenuCategory)).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category} · {formatCurrency(item.price)}</option>)}</select></label><label className="bar-field"><span>Quantity</span><input type="number" min="1" step="1" value={orderQuantity} onChange={(event) => setOrderQuantity(event.target.value)} /></label><label className="bar-field"><span>Serving Type</span><input value={orderServing} onChange={(event) => setOrderServing(event.target.value)} placeholder="Regular / large / peg" /></label><label className="bar-field"><span>Ice Preference</span><select value={orderIce} onChange={(event) => setOrderIce(event.target.value)}><option value="">No preference</option><option>With ice</option><option>No ice</option><option>Extra ice</option></select></label><label className="bar-field"><span>Mixer</span><input value={orderMixer} onChange={(event) => setOrderMixer(event.target.value)} placeholder="Soda, tonic, juice…" /></label><label className="bar-field wide"><span>Special Notes</span><textarea rows="2" value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} /></label></div>{orderError && <p className="bar-error" role="alert">{orderError}</p>}<footer className="bar-modal-footer"><button className="bar-button secondary" type="button" disabled={orderSubmitting} onClick={() => setOrderComposerOpen(false)}>Cancel</button><button className="bar-button primary" type="submit" disabled={orderSubmitting || !tables.length || !menuItems.length}>{orderSubmitting ? "Sending…" : "Create & Send KOT"}</button></footer></form></section></div>}
      {modal && <EntityModal kind={modal.kind} initial={modal.item} tables={tables} staff={staff} drinks={drinks} onClose={() => setModal(null)} onSave={saveEntity} />}
      <DetailsModal item={details} onClose={() => setDetails(null)} />
      {toast && <div className="bar-toast" role="status">{toast}</div>}
    </main>
  );
}
