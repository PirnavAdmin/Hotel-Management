import React, { useState, useMemo, useEffect } from "react";
import {
  Smartphone,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  RotateCcw,
  Sparkles,
  UtensilsCrossed,
  Printer,
  FileText,
  AlertCircle,
  Clock,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import { getNextInvoiceNumber, getTodayDateString } from "../utils/invoiceCounter";
import { apiCreatePaidSelfServiceOrder } from "../api/orderApi";
import QRCode from "../utils/qrCode";
import "./SelfServiceView.css";

const GST_RATE = 0.05; // 5% GST (2.5% CGST + 2.5% SGST)

export function SelfServiceView({
  menuItems = [],
  menuLoading = false,
  restaurantSettings = {},
  onShowReceipt = null,
  onOrderPlaced = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dietaryFilter, setDietaryFilter] = useState("all"); // 'all' | 'veg' | 'non-veg' | 'special'
  const [cart, setCart] = useState([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi"); // 'upi' | 'cash' | 'card'
  const [cashTendered, setCashTendered] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState(null);
  const [generatedOrderNumber, setGeneratedOrderNumber] = useState("");

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set();
    menuItems.forEach((item) => {
      const cat = item.category || item.categoryName || item.dishCategory;
      if (cat && typeof cat === "string" && cat.trim()) {
        set.add(cat.trim());
      }
    });
    return Array.from(set).sort();
  }, [menuItems]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      // 1. Availability check (treat items without isAvailable explicit false as available)
      const isAvail = item.isAvailable !== false && item.available !== false && item.status !== "inactive";
      if (!isAvail) return false;

      // 2. Category check
      if (selectedCategory !== "all") {
        const cat = item.category || item.categoryName || item.dishCategory || "";
        if (cat.trim().toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 3. Dietary check
      if (dietaryFilter === "veg") {
        const d = String(item.dietary || item.dietaryType || "").toLowerCase();
        if (d !== "veg" && d !== "vegetarian") return false;
      } else if (dietaryFilter === "non-veg") {
        const d = String(item.dietary || item.dietaryType || "").toLowerCase();
        if (!d.includes("non")) return false;
      } else if (dietaryFilter === "special") {
        if (!item.isSpecial && !item.special) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = String(item.name || item.dishName || "").toLowerCase();
        const desc = String(item.description || "").toLowerCase();
        const cat = String(item.category || item.categoryName || "").toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [menuItems, selectedCategory, dietaryFilter, searchQuery]);

  // Cart operations
  const addToCart = (item) => {
    setCart((prev) => {
      const itemId = item.id || item.menuItemId || item.backendId;
      const existing = prev.find((i) => (i.id || i.menuItemId) === itemId);
      if (existing) {
        return prev.map((i) =>
          (i.id || i.menuItemId) === itemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          menuItemId: itemId,
          name: item.name || item.dishName || "Item",
          price: Number(item.price || item.unitPrice || 0),
          quantity: 1,
          category: item.category || "",
          image: item.image || item.imageUrl || "",
          dietary: item.dietary || item.dietaryType || "veg",
        },
      ];
    });
  };

  const updateCartQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if ((item.id || item.menuItemId) === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((item) => (item.id || item.menuItemId) !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    return Math.round(subtotal * GST_RATE * 100) / 100;
  }, [subtotal]);

  const discountAmount = 0; // standard 0 discount on self service unless configured
  const grandTotal = useMemo(() => {
    return Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;
  }, [subtotal, taxAmount, discountAmount]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Generate order number when opening payment
  const handleProceedToPayment = () => {
    if (cart.length === 0) return;
    const timestampStr = Date.now().toString().slice(-6);
    const orderNo = `SS-${timestampStr}`;
    setGeneratedOrderNumber(orderNo);
    setCashTendered(String(Math.ceil(grandTotal)));
    setPaymentError("");
    setIsPaymentOpen(true);
  };

  // Confirm payment and create invoice
  const handleConfirmPayment = async () => {
    if (cart.length === 0) return;
    setIsProcessingPayment(true);
    setPaymentError("");

    try {
      const today = getTodayDateString();
      const invoiceNo = getNextInvoiceNumber(today);
      const orderId = `SS-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const orderPayload = {
        orderType: "SelfService",
        tableName: "Self Service",
        serverName: "Self Service Kiosk",
        guests: 1,
        status: "Settled",
        fulfillmentStatus: "Completed",
        paymentMethod: paymentMethod.toUpperCase(),
        paymentStatus: "Paid",
        invoiceNumber: invoiceNo,
        invoiceNo: invoiceNo,
        orderNumber: generatedOrderNumber || orderId,
        subtotal: subtotal,
        taxAmount: taxAmount,
        discountPercent: 0,
        discountAmount: 0,
        serviceChargeAmount: 0,
        grandTotal: grandTotal,
        date: today,
        createdAt: nowIso,
        orderTimestamp: Date.now(),
        isSelfService: true,
        items: cart.map((i) => ({
          menuItemId: Number(i.menuItemId || i.id) || undefined,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          notes: "Self Service Order",
        })),
        payments: [
          {
            paymentMode: paymentMethod.toUpperCase(),
            amount: grandTotal,
            status: "Success",
            createdAt: nowIso,
          },
        ],
      };

      // 1. Call API to persist in backend
      let returnedId = orderId;
      try {
        const res = await apiCreatePaidSelfServiceOrder(orderPayload);
        if (res?.success && res.data) {
          const bData = res.data.data ?? res.data;
          if (bData?.id || bData?.Id) returnedId = String(bData.id || bData.Id);
        }
      } catch (apiErr) {
        console.warn("SelfService backend API sync note:", apiErr?.message);
      }

      // 2. Save locally for instant live reflection across all tabs & Admin
      try {
        const storedKey = "gourmet_pos_past_orders_v2_inr";
        const existing = JSON.parse(localStorage.getItem(storedKey) || "[]");
        const orderRecord = {
          ...orderPayload,
          id: returnedId,
          orderId: returnedId,
        };
        const updated = [orderRecord, ...existing];
        localStorage.setItem(storedKey, JSON.stringify(updated));
      } catch (storageErr) {
        console.warn("Storage sync error:", storageErr);
      }

      // 3. Dispatch real-time events for Admin and Invoice views
      window.dispatchEvent(new CustomEvent("avsr-orders-updated", { detail: [orderPayload] }));
      window.dispatchEvent(new CustomEvent("avsr-invoices-updated", { detail: [orderPayload] }));

      // 4. Construct receipt object matching ReceiptModal expectations
      const receiptData = {
        id: returnedId,
        name: "Self Service",
        tableName: "Self Service",
        section: "Self Service Kiosk",
        server: "Self Service Kiosk",
        guests: 1,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: subtotal,
        taxAmount: taxAmount,
        serviceCharge: 0,
        serviceChargeAmount: 0,
        tipAmount: 0,
        grandTotal: grandTotal,
        paymentMethod: paymentMethod.toUpperCase(),
        invoiceNo: invoiceNo,
        orderNumber: generatedOrderNumber || orderId,
        date: today,
        createdAt: nowIso,
        orderType: "SelfService",
        isSelfService: true,
      };

      setPaymentSuccessOrder(receiptData);
      setIsPaymentOpen(false);
      clearCart();

      if (typeof onOrderPlaced === "function") {
        onOrderPlaced(receiptData);
      }

      // Automatically trigger Receipt View / Print / PDF modal
      if (typeof onShowReceipt === "function") {
        onShowReceipt(receiptData, returnedId);
      }
    } catch (err) {
      console.error("Payment confirmation failed:", err);
      setPaymentError(err?.message || "Failed to confirm payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getCartItemQuantity = (itemId) => {
    const found = cart.find((i) => (i.id || i.menuItemId) === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="self-service-section">
      {/* 1. Header Banner */}
      <div className="self-service-header-banner">
        <div className="self-service-title-wrap">
          <div className="self-service-icon-box">
            <Smartphone size={24} />
          </div>
          <div className="self-service-title-text">
            <h2>Self Service Kiosk</h2>
            <p>Select your favorite dishes, review your cart, and make an instant contactless payment.</p>
          </div>
        </div>

        <div className="self-service-banner-actions">
          <button
            type="button"
            className="self-service-nav-pill-btn"
            onClick={() => {
              setSelectedCategory("all");
              setDietaryFilter("all");
              setSearchQuery("");
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* 2. Success Banner if an order was just paid */}
      {paymentSuccessOrder && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1.5px solid var(--success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <CheckCircle2 size={22} color="var(--success)" />
            <div>
              <div style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "0.88rem" }}>
                Order #{paymentSuccessOrder.orderNumber || paymentSuccessOrder.id} successfully paid!
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                Invoice No: <strong style={{ color: "var(--accent-amber)" }}>{paymentSuccessOrder.invoiceNo}</strong> • ORDER TYPE: SELF SERVICE
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {typeof onShowReceipt === "function" && (
              <button
                type="button"
                className="self-service-nav-pill-btn is-active"
                onClick={() => onShowReceipt(paymentSuccessOrder, paymentSuccessOrder.id)}
              >
                <Printer size={14} />
                <span>Print / View Invoice</span>
              </button>
            )}
            <button
              type="button"
              className="self-service-nav-pill-btn"
              onClick={() => setPaymentSuccessOrder(null)}
            >
              <X size={14} />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Two-Column Layout */}
      <div className="self-service-layout">
        {/* Left Column: Menu Catalog */}
        <div className="self-service-catalog">
          {/* Filter Bar */}
          <div className="self-service-filter-bar">
            {/* Search Input Row */}
            <div className="self-service-search-row">
              <div className="self-service-search-input-wrap">
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search food, beverage, snacks by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Dietary Filter Row */}
            <div className="self-service-dietary-row">
              {[
                { id: "all", label: "All Items" },
                { id: "veg", label: "🌱 Pure Veg" },
                { id: "non-veg", label: "🍗 Non-Veg" },
                { id: "special", label: "⭐ Chef Specials" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`self-service-filter-chip ${dietaryFilter === chip.id ? "is-active" : ""}`}
                  onClick={() => setDietaryFilter(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Category Pills */}
            <div className="self-service-category-pills">
              <button
                type="button"
                className={`self-service-category-pill ${selectedCategory === "all" ? "is-active" : ""}`}
                onClick={() => setSelectedCategory("all")}
              >
                All Categories ({menuItems.length})
              </button>
              {categories.map((cat) => {
                const count = menuItems.filter(
                  (i) => (i.category || i.categoryName || "").trim().toLowerCase() === cat.toLowerCase()
                ).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`self-service-category-pill ${selectedCategory === cat ? "is-active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Items Grid */}
          {menuLoading && menuItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              Loading Self Service Menu...
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                background: "var(--bg-secondary)",
                borderRadius: "12px",
                border: "1px dashed var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              <UtensilsCrossed size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                No dishes found
              </div>
              <div style={{ fontSize: "0.78rem", marginTop: "4px" }}>
                Try adjusting your search query or selecting a different category.
              </div>
            </div>
          ) : (
            <div className="self-service-grid">
              {filteredMenuItems.map((dish) => {
                const dishId = dish.id || dish.menuItemId || dish.backendId;
                const qty = getCartItemQuantity(dishId);
                const isVeg = String(dish.dietary || dish.dietaryType || "").toLowerCase() === "veg";

                return (
                  <div key={dishId} className="self-service-dish-card">
                    <div className="self-service-dish-img-wrap">
                      <img
                        src={getMenuItemImage(dish)}
                        alt={dish.name || dish.dishName}
                        onError={handleDishImageError}
                        loading="lazy"
                      />
                      <span className="self-service-dietary-tag">
                        {isVeg ? (
                          <span style={{ color: "#10b981" }}>● VEG</span>
                        ) : (
                          <span style={{ color: "#ef4444" }}>▲ NON-VEG</span>
                        )}
                        {(dish.isSpecial || dish.special) && (
                          <span style={{ color: "var(--accent-amber)", marginLeft: "4px" }}>★ SPECIAL</span>
                        )}
                      </span>
                    </div>

                    <div className="self-service-dish-body">
                      <div className="self-service-dish-name" title={dish.name || dish.dishName}>
                        {dish.name || dish.dishName}
                      </div>
                      <div className="self-service-dish-desc">
                        {dish.description || `${dish.category || "Delicious food item"} prepared fresh.`}
                      </div>

                      <div className="self-service-dish-footer">
                        <div className="self-service-dish-price">
                          {formatCurrency(dish.price || dish.unitPrice || 0)}
                        </div>

                        {qty === 0 ? (
                          <button
                            type="button"
                            className="self-service-add-btn"
                            onClick={() => addToCart(dish)}
                          >
                            <Plus size={13} />
                            <span>Add</span>
                          </button>
                        ) : (
                          <div className="self-service-qty-stepper">
                            <button
                              type="button"
                              className="self-service-stepper-btn"
                              onClick={() => updateCartQuantity(dishId, -1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="self-service-stepper-qty">{qty}</span>
                            <button
                              type="button"
                              className="self-service-stepper-btn"
                              onClick={() => updateCartQuantity(dishId, 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Cart & Order Summary */}
        <div className="self-service-cart-panel">
          <div className="self-service-cart-header">
            <h3>
              <ShoppingCart size={18} color="var(--accent-amber)" />
              <span>Cart &amp; Order Summary</span>
            </h3>
            {cart.length > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 750,
                  background: "var(--surface-tint)",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  color: "var(--accent-amber)",
                }}
              >
                {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>

          {/* Cart Items List */}
          {cart.length === 0 ? (
            <div className="self-service-cart-empty-state">
              <ShoppingCart size={38} style={{ opacity: 0.3 }} />
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)" }}>
                Your cart is empty
              </div>
              <div style={{ fontSize: "0.74rem" }}>
                Add dishes from the menu to build your self service order.
              </div>
            </div>
          ) : (
            <div className="self-service-cart-items-list">
              {cart.map((item) => {
                const itemId = item.id || item.menuItemId;
                return (
                  <div key={itemId} className="self-service-cart-item-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="self-service-cart-item-title" title={item.name}>
                        {item.name}
                      </div>
                      <div className="self-service-cart-item-unit-price">
                        {formatCurrency(item.price)} × {item.quantity}
                      </div>
                    </div>

                    <div className="self-service-qty-stepper">
                      <button
                        type="button"
                        className="self-service-stepper-btn"
                        onClick={() => updateCartQuantity(itemId, -1)}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="self-service-stepper-qty">{item.quantity}</span>
                      <button
                        type="button"
                        className="self-service-stepper-btn"
                        onClick={() => updateCartQuantity(itemId, 1)}
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span className="self-service-cart-item-total">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(itemId)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "2px",
                        }}
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pricing Breakdown */}
          {cart.length > 0 && (
            <div className="self-service-pricing-breakdown">
              <div className="self-service-pricing-row">
                <span>Subtotal ({totalItemCount} items)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="self-service-pricing-row">
                <span>GST Tax (5%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="self-service-pricing-row" style={{ color: "var(--success)" }}>
                  <span>Discount</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="self-service-pricing-row total-row">
                <span>Grand Total</span>
                <span style={{ color: "var(--accent-amber-light)" }}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Cart Actions */}
          <div className="self-service-cart-actions">
            {cart.length > 0 && (
              <button
                type="button"
                className="self-service-btn-clear"
                onClick={clearCart}
                title="Clear all items in cart"
              >
                Clear Cart
              </button>
            )}
            <button
              type="button"
              className="self-service-btn-proceed"
              disabled={cart.length === 0}
              onClick={handleProceedToPayment}
            >
              <span>Proceed to Payment</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Payment Screen Modal */}
      {isPaymentOpen && (
        <div className="self-service-modal-overlay">
          <div className="self-service-payment-modal">
            <div className="self-service-payment-header">
              <h3>
                <CreditCard size={20} color="var(--accent-amber)" />
                <span>Complete Self Service Payment</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="self-service-payment-body">
              {/* Order Number & Items Summary */}
              <div className="self-service-payment-order-summary">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Order Reference:</span>
                  <span style={{ fontWeight: 800, color: "var(--accent-amber)" }}>
                    #{generatedOrderNumber}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Order Type:</span>
                  <span style={{ fontWeight: 700, color: "var(--text-main)" }}>SELF SERVICE</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Items Selected:</span>
                  <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                    {totalItemCount} items ({cart.map((c) => `${c.name} ×${c.quantity}`).join(", ")})
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.1rem",
                    fontWeight: 850,
                    marginTop: "0.35rem",
                    paddingTop: "0.4rem",
                    borderTop: "1px dashed var(--border-subtle)",
                  }}
                >
                  <span>Total Payable:</span>
                  <span style={{ color: "var(--accent-amber-light)" }}>
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 750,
                    color: "var(--text-muted)",
                    marginBottom: "0.45rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Select Payment Method
                </label>
                <div className="self-service-payment-methods-grid">
                  <div
                    className={`self-service-payment-method-card ${
                      paymentMethod === "upi" ? "is-selected" : ""
                    }`}
                    onClick={() => setPaymentMethod("upi")}
                  >
                    <QrCode size={24} />
                    <span style={{ fontSize: "0.78rem", fontWeight: 750 }}>UPI / QR</span>
                  </div>
                  <div
                    className={`self-service-payment-method-card ${
                      paymentMethod === "card" ? "is-selected" : ""
                    }`}
                    onClick={() => setPaymentMethod("card")}
                  >
                    <CreditCard size={24} />
                    <span style={{ fontSize: "0.78rem", fontWeight: 750 }}>Debit / Credit</span>
                  </div>
                  <div
                    className={`self-service-payment-method-card ${
                      paymentMethod === "cash" ? "is-selected" : ""
                    }`}
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <Banknote size={24} />
                    <span style={{ fontSize: "0.78rem", fontWeight: 750 }}>Cash Counter</span>
                  </div>
                </div>
              </div>

              {/* Method Detail Sub-Panel */}
              <div
                style={{
                  padding: "0.85rem",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                }}
              >
                {paymentMethod === "upi" && (
                  <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ background: "#ffffff", padding: "8px", borderRadius: "8px", display: "inline-block" }}>
                      <QRCode
                        value={`upi://pay?pa=restaurant@upi&pn=${encodeURIComponent(
                          restaurantSettings.restaurantName || "Restaurant"
                        )}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(generatedOrderNumber)}`}
                        size={135}
                      />
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)" }}>
                      Scan QR code with GPay, PhonePe, or Paytm
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                      Amount: {formatCurrency(grandTotal)} • Status: Awaiting Instant Confirmation
                    </div>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <div style={{ textAlign: "center", padding: "0.85rem 0" }}>
                    <CreditCard size={36} color="var(--accent-amber)" style={{ margin: "0 auto 0.5rem" }} />
                    <div style={{ fontSize: "0.82rem", fontWeight: 750, color: "var(--text-main)" }}>
                      Tap, Dip or Swipe Card on POS Terminal
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      Accepts Visa, Mastercard, RuPay &amp; Amex cards.
                    </div>
                  </div>
                )}

                {paymentMethod === "cash" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Amount Tendered:</span>
                      <input
                        type="number"
                        min={grandTotal}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        style={{
                          width: "120px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid var(--border-subtle)",
                          background: "var(--bg-tertiary)",
                          color: "var(--text-main)",
                          fontSize: "0.85rem",
                          fontWeight: 750,
                          textAlign: "right",
                        }}
                      />
                    </div>
                    {Number(cashTendered) > grandTotal && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--success)" }}>
                        <span>Change Due to Customer:</span>
                        <strong style={{ fontSize: "0.9rem" }}>
                          {formatCurrency(Number(cashTendered) - grandTotal)}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {paymentError && (
                <div
                  style={{
                    padding: "0.65rem 0.85rem",
                    borderRadius: "6px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid var(--danger)",
                    color: "var(--danger)",
                    fontSize: "0.75rem",
                  }}
                >
                  {paymentError}
                </div>
              )}
            </div>

            <div className="self-service-payment-footer">
              <button
                type="button"
                className="self-service-btn-clear"
                onClick={() => setIsPaymentOpen(false)}
                disabled={isProcessingPayment}
              >
                Cancel Payment
              </button>
              <button
                type="button"
                className="self-service-btn-proceed"
                style={{ flex: "0 0 auto", minWidth: "180px" }}
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Payment (Paid)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
