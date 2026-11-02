import React, { useMemo, useState } from "react";
import { Search, ShoppingBag, Plus, Minus } from "lucide-react";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";

export function TakeawayView({ menuItems = [], menuLoading = false, onCheckout }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState({});
  const categories = useMemo(() => [...new Set((Array.isArray(menuItems) ? menuItems : []).map((item) => item.category).filter(Boolean))], [menuItems]);
  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (Array.isArray(menuItems) ? menuItems : []).filter((item) =>
      (category === "all" || item.category === category) &&
      (!term || `${item.name || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase().includes(term))
    );
  }, [menuItems, query, category]);
  const changeQty = (item, delta) => setCart((current) => {
    const qty = Math.max(0, (current[item.id]?.quantity || 0) + delta);
    const next = { ...current };
    if (!qty) delete next[item.id];
    else next[item.id] = { item, quantity: qty };
    return next;
  });
  const count = Object.values(cart).reduce((sum, line) => sum + line.quantity, 0);
  const total = Object.values(cart).reduce((sum, line) => sum + Number(line.item.price || 0) * line.quantity, 0);

  return (
    <section className="takeaway-section" style={{ padding: "1.25rem 2rem", color: "var(--text-main)", minHeight: "calc(100vh - 130px)" }}>
      <style>{`
        .takeaway-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(290px, 340px); gap: 1rem; align-items: start; }
        .takeaway-menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 155px), 1fr)); gap: .6rem; min-width: 0; align-content: start; }
        .takeaway-menu-card { box-sizing: border-box; display: flex; flex-direction: column; height: auto; min-height: 0; min-width: 0; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--bg-secondary); }
        .takeaway-menu-card img { display: block; width: 100%; height: 64px; flex: 0 0 64px; object-fit: cover; background: var(--bg-tertiary); }
        .takeaway-menu-card-body { display: flex; flex-direction: column; gap: .35rem; padding: .38rem; }
        .takeaway-menu-card-name { display: -webkit-box; min-height: 0; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-height: 1.1; font-size: .8rem; }
        .takeaway-menu-description { display: none; }
        .takeaway-add-button, .takeaway-qty-button { display: inline-flex; align-items: center; justify-content: center; gap: .2rem; min-height: 27px; padding: .25rem .45rem; border: 1px solid rgba(245,158,11,.45); border-radius: 6px; background: linear-gradient(135deg,#f59e0b,#ea580c); color: #111827; font-size: .76rem; font-weight: 800; cursor: pointer; }
        .takeaway-qty-button { width: 26px; min-height: 26px; padding: 0; background: rgba(245,158,11,.14); color: var(--accent-amber-light); }
        .takeaway-order-panel { position: sticky; top: 100px; box-sizing: border-box; width: 100%; min-width: 0; padding: 1rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--bg-secondary); }
        @media (max-width: 900px) { .takeaway-layout { grid-template-columns: minmax(0, 1fr); } .takeaway-order-panel { position: static; } }
        @media (max-width: 600px) { .takeaway-section { padding: 1rem !important; } }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: "1.5rem" }}>Takeaway Menu</h2><p style={{ margin: "0.3rem 0 0", color: "var(--text-muted)" }}>Choose items for a takeaway order.</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: ".6rem .8rem" }}><ShoppingBag size={18}/><strong>{count} items</strong><span style={{ color: "var(--accent-amber-light)" }}>₹{total.toFixed(2)}</span></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: ".6rem", width: "min(100%, 350px)", padding: ".55rem .75rem", border: "1px solid var(--border-subtle)", borderRadius: 9, background: "var(--bg-secondary)" }}><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search menu items" style={{ background: "transparent", border: 0, outline: 0, color: "inherit", width: "100%" }}/></label>
        <select aria-label="Filter menu by category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 180, padding: ".62rem .75rem", border: "1px solid var(--border-subtle)", borderRadius: 9, background: "var(--bg-secondary)", color: "var(--text-main)" }}><option value="all">All Categories</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      </div>
      <div className="takeaway-layout">
      {menuLoading ? <p>Loading menu…</p> : <div className="takeaway-menu-grid">
        {items.map((item) => {
          const quantity = cart[item.id]?.quantity || 0;
          return <article key={item.id} className="takeaway-menu-card">
            <img src={getMenuItemImage(item)} alt={item.name} onError={handleDishImageError}/>
            <div className="takeaway-menu-card-body"><strong className="takeaway-menu-card-name">{item.name}</strong><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".4rem" }}><b style={{ color: "var(--accent-amber-light)", whiteSpace: "nowrap" }}>₹{Number(item.price || 0).toFixed(2)}</b>{quantity ? <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><button className="takeaway-qty-button" aria-label={`Remove one ${item.name}`} onClick={() => changeQty(item, -1)}><Minus size={14}/></button><b>{quantity}</b><button className="takeaway-qty-button" aria-label={`Add one ${item.name}`} onClick={() => changeQty(item, 1)}><Plus size={14}/></button></span> : <button className="takeaway-add-button" onClick={() => changeQty(item, 1)}><Plus size={14}/> Add</button>}</div></div>
          </article>;
        })}
        {!items.length && <p style={{ color: "var(--text-muted)" }}>No menu items found.</p>}
      </div>}
      <aside className="takeaway-order-panel">
        <h3 style={{ margin: "0 0 .8rem" }}>Takeaway Order</h3>
        {!count ? <p style={{ color: "var(--text-muted)" }}>Add menu items to start an order.</p> : <div style={{ display: "grid", gap: ".7rem", maxHeight: "45vh", overflowY: "auto" }}>
          {Object.values(cart).map(({ item, quantity }) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: ".55rem" }}><div><strong>{item.name}</strong><div style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>₹{Number(item.price || 0).toFixed(2)} × {quantity}</div></div><span>₹{(Number(item.price || 0) * quantity).toFixed(2)}</span></div>)}
        </div>}
        <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: ".8rem", paddingTop: ".7rem", display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>₹{total.toFixed(2)}</strong></div>
        <div style={{ marginTop: ".45rem", display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}><span>GST (5%)</span><span>₹{(total * .05).toFixed(2)}</span></div>
        <div style={{ marginTop: ".55rem", display: "flex", justifyContent: "space-between", fontSize: "1.1rem" }}><strong>Total</strong><strong style={{ color: "var(--accent-amber-light)" }}>₹{Math.round(total * 1.05).toFixed(2)}</strong></div>
        <button disabled={!count} onClick={() => onCheckout?.(Object.values(cart).map(({ item, quantity }) => ({ ...item, quantity })))} style={{ width: "100%", marginTop: ".9rem", padding: ".75rem", border: 0, borderRadius: 9, background: count ? "var(--accent-amber)" : "var(--bg-tertiary)", color: count ? "#111" : "var(--text-muted)", fontWeight: 800, cursor: count ? "pointer" : "not-allowed" }}>Create Invoice &amp; Checkout</button>
      </aside>
      </div>
    </section>
  );
}
