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
  FileText,
  AlertCircle,
  Clock,
  IndianRupee,
  Building2,
  ShieldCheck,
  Package,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { calculateOrderFinancials } from "../utils/pricingCalculator";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import {
  apiCreateSelfServiceOrder,
  apiGetSelfServiceOrder,
  apiInitiateSelfServicePayment,
} from "../api/orderApi";
import { parseJwt } from "../utils/auth";
import QRCode from "../utils/qrCode";
import { SelfServicePreviewModal } from "./SelfServicePreviewModal";
import { SelfServiceOrderTracking } from "./SelfServiceOrderTracking";
import "./SelfServiceView.css";

export function SelfServiceView({
  currentSession = null,
  menuItems = [],
  menuLoading = false,
  menuError = null,
  onRetryMenu = null,
  restaurantSettings = {},
  onShowReceipt = null,
  onOrderPlaced = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dietaryFilter, setDietaryFilter] = useState("all"); // 'all' | 'veg' | 'non-veg' | 'special'

  // Tenant & branch isolation: resolve BOTH restaurant ID and branch ID from authenticated context
  const cartStorageKey = useMemo(() => {
    let tokenClaims = null;
    try {
      const token = localStorage.getItem("avsr_jwt_token") || localStorage.getItem("token");
      if (token) tokenClaims = parseJwt(token);
    } catch {}

    const rawRestId =
      restaurantSettings?.restaurantId ??
      restaurantSettings?.RestaurantId ??
      currentSession?.restaurantId ??
      currentSession?.restaurant_id ??
      tokenClaims?.restaurantId ??
      tokenClaims?.restaurant_id ??
      "";

    const rawBranchId =
      restaurantSettings?.branchId ??
      restaurantSettings?.BranchId ??
      currentSession?.branchId ??
      currentSession?.branch_id ??
      tokenClaims?.branchId ??
      tokenClaims?.branch_id ??
      "";

    const cleanRest = String(rawRestId || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanBranch = String(rawBranchId || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");

    if (cleanRest && cleanBranch) {
      return `gourmet_pos_self_service_cart_r_${cleanRest}_b_${cleanBranch}_v1`;
    }
    if (cleanBranch) {
      return `gourmet_pos_self_service_cart_b_${cleanBranch}_v1`;
    }
    if (cleanRest) {
      return `gourmet_pos_self_service_cart_r_${cleanRest}_v1`;
    }

    // When tenant context is completely missing/unauthenticated, scope to an isolated ephemeral guest key
    // so it never silently restores or leaks an authenticated restaurant or branch cart.
    return "gourmet_pos_self_service_cart_guest_unscoped_v1";
  }, [
    restaurantSettings?.restaurantId,
    restaurantSettings?.RestaurantId,
    restaurantSettings?.branchId,
    restaurantSettings?.BranchId,
    currentSession?.restaurantId,
    currentSession?.restaurant_id,
    currentSession?.branchId,
    currentSession?.branch_id,
  ]);

  const [cart, setCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem(cartStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Customer contact details & idempotency key for Self Service order
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  // Order submission, error handling & confirmed order display states (Phase 2B.1)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Phase 2B.2 Payment UI States (awaiting authenticated backend payment gateway integration)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("upi"); // 'upi' | 'cash' | 'card'
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [upiUtr, setUpiUtr] = useState("");

  // Phase 2B.3 Invoice & Receipt Preview State (preview only, no official issuance)
  const [previewOrder, setPreviewOrder] = useState(null);

  // Phase 2B.4 Order Tracking State (authoritative backend-confirmed order only)
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  // Resolved branch context for API scoping
  const resolvedBranchId = useMemo(() => {
    let tokenClaims = null;
    try {
      const token = localStorage.getItem("avsr_jwt_token") || localStorage.getItem("token");
      if (token) tokenClaims = parseJwt(token);
    } catch {}
    const raw =
      restaurantSettings?.branchId ??
      restaurantSettings?.BranchId ??
      currentSession?.branchId ??
      currentSession?.branch_id ??
      tokenClaims?.branchId ??
      tokenClaims?.branch_id ??
      null;
    if (!raw) return null;
    const sanitized = String(raw).replace("restaurant_", "").trim();
    const num = Number(sanitized);
    return Number.isFinite(num) && num > 0 ? num : null;
  }, [
    restaurantSettings?.branchId,
    restaurantSettings?.BranchId,
    currentSession?.branchId,
    currentSession?.branch_id,
  ]);

  // When branch or restaurant context switches, immediately load the active branch's cart
  useEffect(() => {
    if (!cartStorageKey) return;
    try {
      const saved = sessionStorage.getItem(cartStorageKey);
      setCart(saved ? JSON.parse(saved) : []);
    } catch {
      setCart([]);
    }
  }, [cartStorageKey]);

  // Synchronize cart with sessionStorage whenever cart changes for the active branch context
  useEffect(() => {
    if (!cartStorageKey) return;
    try {
      sessionStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch (err) {
      console.warn("Failed to persist self service cart to sessionStorage:", err);
    }
  }, [cart, cartStorageKey]);

  // Cart Price & Product Integrity: Reconcile cart items against live backend menu
  // 1. Never trust old/tampered stored prices - always override with current menu price
  // 2. Safely remove products that were deleted or became unavailable
  useEffect(() => {
    if (!Array.isArray(menuItems) || menuItems.length === 0) return;

    setCart((prevCart) => {
      if (!Array.isArray(prevCart) || prevCart.length === 0) return prevCart;

      let hasModifications = false;
      const verifiedCart = [];

      for (const item of prevCart) {
        const liveDish = menuItems.find(
          (m) => String(m.id || m.menuItemId) === String(item.id || item.menuItemId)
        );

        // Safe drop if item no longer exists in menu or is marked unavailable
        const isStillAvailable =
          liveDish &&
          liveDish.isAvailable !== false &&
          liveDish.available !== false &&
          liveDish.status !== "inactive";

        if (!isStillAvailable) {
          hasModifications = true;
          continue;
        }

        const freshPrice = Number(liveDish.price || liveDish.unitPrice || 0);
        const freshName = liveDish.name || liveDish.dishName || item.name;

        if (item.price !== freshPrice || item.name !== freshName) {
          hasModifications = true;
          verifiedCart.push({
            ...item,
            name: freshName,
            price: freshPrice,
          });
        } else {
          verifiedCart.push(item);
        }
      }

      return hasModifications ? verifiedCart : prevCart;
    });
  }, [menuItems]);


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
      // 1. Category check
      if (selectedCategory !== "all") {
        const cat = item.category || item.categoryName || item.dishCategory || "";
        if (cat.trim().toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 2. Dietary check
      if (dietaryFilter === "veg") {
        const d = String(item.dietary || item.dietaryType || "").toLowerCase();
        if (d !== "veg" && d !== "vegetarian") return false;
      } else if (dietaryFilter === "non-veg") {
        const d = String(item.dietary || item.dietaryType || "").toLowerCase();
        if (!d.includes("non")) return false;
      } else if (dietaryFilter === "special") {
        if (!item.isSpecial && !item.special) return false;
      }

      // 3. Search query
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

  // Cart operations (modifying cart invalidates pending idempotency key to prevent key reuse on changed carts)
  const addToCart = (item) => {
    // Prevent adding unavailable items
    const isAvail = item.isAvailable !== false && item.available !== false && item.status !== "inactive";
    if (!isAvail) return;

    setIdempotencyKey("");
    setOrderError("");

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
    setIdempotencyKey("");
    setOrderError("");

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
    setIdempotencyKey("");
    setOrderError("");
    setCart((prev) => prev.filter((item) => (item.id || item.menuItemId) !== itemId));
  };

  const clearCart = () => {
    setIdempotencyKey("");
    setOrderError("");
    setCart([]);
    if (cartStorageKey) {
      try {
        sessionStorage.removeItem(cartStorageKey);
      } catch {}
    }
  };

  // Financial calculation integrated with POS rules and active restaurant settings
  // Service charge is strictly excluded for Self Service orders.
  const financials = useMemo(() => {
    return calculateOrderFinancials(cart, {
      orderType: "SelfService",
      foodGstRate: restaurantSettings?.foodGstRate ?? restaurantSettings?.taxRate ?? 5,
      serviceChargeEnabled: false,
      serviceChargeRate: 0,
      roundingMode: restaurantSettings?.roundingMode ?? "nearest",
      discountPercent: 0,
      discountAmount: 0,
      tipAmount: 0,
    });
  }, [cart, restaurantSettings]);

  const {
    subtotal,
    taxableAmount,
    foodGstRate,
    cgstRate,
    sgstRate,
    cgstAmount,
    sgstAmount,
    taxAmount,
    serviceChargeEnabled,
    serviceChargeRate,
    serviceChargeAmount,
    discountAmount,
    discountPercent,
    unroundedTotal,
    roundingMode,
    roundingAdjustment,
    finalPayable,
    itemCount: totalItemCount,
  } = financials;
  const grandTotal = finalPayable;

  // Proceed Button: Open a new order review with a newly generated idempotency key
  const handleProceedClick = () => {
    if (cart.length === 0) return;
    const newKey = `ss_order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setIdempotencyKey(newKey);
    setOrderError("");
    setIsReviewOpen(true);
  };

  // Submit Self Service Order to Phase 2B.1 Backend API
  const handleSubmitSelfServiceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;

    setIsSubmittingOrder(true);
    setOrderError("");

    // Preserve existing idempotency key across retries, or initialize if empty
    const activeKey = idempotencyKey || `ss_order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (!idempotencyKey) {
      setIdempotencyKey(activeKey);
    }

    try {
      const orderPayload = {
        items: cart.map((item) => {
          const rawId = item.menuItemId ?? item.id ?? item.backendId ?? 0;
          const cleanId = typeof rawId === "string" ? rawId.replace(/^m-/, "") : rawId;
          const numId = parseInt(cleanId, 10);
          return {
            menuItemId: !isNaN(numId) && numId > 0 ? numId : 0,
            name: item.name || item.dishName || undefined,
            quantity: Math.max(1, parseInt(item.quantity || 1, 10) || 1),
            notes: item.notes || "Self Service Order",
          };
        }),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        idempotencyKey: activeKey,
      };

      const res = await apiCreateSelfServiceOrder(orderPayload, resolvedBranchId);

      if (res?.success && res.data) {
        const orderData = res.data.data ?? res.data;
        setIsReviewOpen(false);
        clearCart();
        setIdempotencyKey("");
        setCustomerName("");
        setCustomerPhone("");
        setSpecialInstructions("");
        setSelectedPaymentMethod("upi");
        setConfirmedOrder(orderData);
        setPaymentOrder(orderData);
        setIsPaymentOpen(true);
        if (typeof onOrderPlaced === "function") {
          onOrderPlaced(orderData);
        }
      } else {
        // Cart is strictly preserved on error
        setOrderError(res?.error || "Failed to create order. Please verify your connection and try again.");
      }
    } catch (err) {
      // Cart is strictly preserved on network/server failure
      setOrderError(err?.message || "Cannot connect to the server. Please verify the backend is running and retry.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Close order confirmation modal and discard its associated order/modal context
  const handleCloseConfirmedOrder = () => {
    setConfirmedOrder(null);
    setIsPaymentOpen(false);
    setPaymentOrder(null);
    setPreviewOrder(null);
    setTrackingOrder(null);
  };

  // Close payment modal while preserving confirmedOrder summary underneath
  const handleClosePaymentModal = () => {
    setIsPaymentOpen(false);
    setPaymentOrder(null);
    setPaymentMessage("");
    setPaymentSuccess(false);
    setUpiUtr("");
  };

  const handleConfirmPaymentMethod = async () => {
    const orderId = paymentOrder?.orderId ?? paymentOrder?.id;
    if (!orderId || paymentSubmitting) return;
    setPaymentSubmitting(true);
    setPaymentMessage("");
    try {
      const res = await apiInitiateSelfServicePayment(
        orderId,
        selectedPaymentMethod.toUpperCase(),
        {
          transactionReference: selectedPaymentMethod === "upi" ? upiUtr.trim() : undefined,
          notes: selectedPaymentMethod === "cash"
            ? "Pay at cashier counter requested"
            : selectedPaymentMethod === "card"
              ? "Card machine payment requested at counter"
              : "UPI payment submitted",
        },
        resolvedBranchId
      );
      if (res?.success && res.data) {
        const data = res.data?.data ?? res.data;
        setPaymentSuccess(true);
        setPaymentMessage(data.message || "Payment method registered successfully.");
        setPaymentOrder((prev) =>
          prev
            ? {
                ...prev,
                paymentMethod: selectedPaymentMethod === "cash" ? "Cash" : selectedPaymentMethod === "card" ? "Card" : "UPI",
                qrPayload: data.qrPayload || prev.qrPayload,
                gatewayConfigured: data.gatewayConfigured,
              }
            : prev
        );
      } else {
        setPaymentSuccess(false);
        setPaymentMessage(res?.error || "Could not register payment. Please try again.");
      }
    } catch (err) {
      setPaymentSuccess(false);
      setPaymentMessage(err?.message || "Payment registration failed. Please try again.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Active payable amount & order number from backend-confirmed Phase 2B.1 order
  const activePayableAmount = useMemo(() => {
    if (paymentOrder?.financials?.finalPayable != null) {
      return Number(paymentOrder.financials.finalPayable);
    }
    if (paymentOrder?.grandTotal != null) {
      return Number(paymentOrder.grandTotal);
    }
    return Number(finalPayable || 0);
  }, [paymentOrder, finalPayable]);

  const activeOrderNumber = useMemo(() => {
    if (paymentOrder?.orderNumber) return paymentOrder.orderNumber;
    if (confirmedOrder?.orderNumber) return confirmedOrder.orderNumber;
    return paymentOrder?.orderId ? `ORD-${paymentOrder.orderId}` : "";
  }, [paymentOrder, confirmedOrder]);

  // Initiate payment with backend when payment modal opens or payment method changes
  useEffect(() => {
    const orderId = paymentOrder?.orderId ?? paymentOrder?.id;
    if (!isPaymentOpen || !orderId) return;
    let cancelled = false;
    apiInitiateSelfServicePayment(orderId, selectedPaymentMethod.toUpperCase(), resolvedBranchId)
      .then((res) => {
        if (cancelled || !res?.success || !res.data) return;
        const initData = res.data?.data ?? res.data;
        if (initData?.qrPayload) {
          setPaymentOrder((prev) =>
            prev ? { ...prev, qrPayload: initData.qrPayload, gatewayConfigured: initData.gatewayConfigured } : prev
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isPaymentOpen, paymentOrder?.orderId, selectedPaymentMethod, resolvedBranchId]);

  const handleRefreshTracking = async () => {
    const orderId = trackingOrder?.orderId ?? trackingOrder?.id;
    if (!orderId) return;
    setTrackingLoading(true);
    setTrackingError("");
    try {
      const res = await apiGetSelfServiceOrder(orderId, resolvedBranchId);
      if (res?.success && res.data) {
        const fresh = res.data?.data ?? res.data;
        setTrackingOrder(fresh);
      } else {
        setTrackingError(res?.error || "Could not refresh order status from backend.");
      }
    } catch (err) {
      setTrackingError(err?.message || "Could not refresh order status from backend.");
    } finally {
      setTrackingLoading(false);
    }
  };

  // Prepared to render a genuine QR payload received from a future authenticated backend API.
  // Never generate production payment QR codes from locally configured merchant details.
  const backendQrPayload = paymentOrder?.qrPayload || paymentOrder?.upiQrPayload || "";

  useEffect(() => {
    if (!isPaymentOpen || selectedPaymentMethod !== "upi" || !backendQrPayload) {
      setQrDataUrl("");
      return;
    }
    let isMounted = true;
    QRCode.toDataURL(backendQrPayload, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Backend UPI QR rendering error:", err);
        if (isMounted) setQrDataUrl("");
      });
    return () => {
      isMounted = false;
    };
  }, [isPaymentOpen, selectedPaymentMethod, backendQrPayload]);

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
          {menuError ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1.5rem",
                background: "var(--bg-secondary)",
                borderRadius: "12px",
                border: "1px dashed var(--danger, #ef4444)",
                color: "var(--text-muted)",
              }}
            >
              <AlertCircle size={38} color="var(--danger, #ef4444)" style={{ margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                Failed to load menu items
              </div>
              <div style={{ fontSize: "0.78rem", marginTop: "4px" }}>
                {menuError || "An error occurred while fetching the restaurant menu. Please try again."}
              </div>
              {typeof onRetryMenu === "function" && (
                <button
                  type="button"
                  className="self-service-nav-pill-btn"
                  onClick={onRetryMenu}
                  style={{ marginTop: "1rem" }}
                >
                  <RotateCcw size={14} />
                  <span>Retry Loading</span>
                </button>
              )}
            </div>
          ) : menuLoading && menuItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-muted)" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "3px solid var(--border-subtle)",
                  borderTopColor: "var(--accent-amber)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 1rem",
                }}
              />
              <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-main)" }}>
                Loading Self Service Menu...
              </div>
              <div style={{ fontSize: "0.78rem", marginTop: "4px" }}>
                Fetching latest dishes and category availability
              </div>
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
              {(searchQuery || selectedCategory !== "all" || dietaryFilter !== "all") && (
                <button
                  type="button"
                  className="self-service-nav-pill-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setDietaryFilter("all");
                  }}
                  style={{ marginTop: "1rem" }}
                >
                  <RotateCcw size={14} />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="self-service-grid">
              {filteredMenuItems.map((dish) => {
                const dishId = dish.id || dish.menuItemId || dish.backendId;
                const qty = getCartItemQuantity(dishId);
                const isVeg = String(dish.dietary || dish.dietaryType || "").toLowerCase() === "veg";
                const isAvailable = dish.isAvailable !== false && dish.available !== false && dish.status !== "inactive";

                return (
                  <div
                    key={dishId}
                    className="self-service-dish-card"
                    style={!isAvailable ? { opacity: 0.65 } : undefined}
                  >
                    <div className="self-service-dish-img-wrap">
                      <img
                        src={getMenuItemImage(dish)}
                        alt={dish.name || dish.dishName}
                        onError={handleDishImageError}
                        loading="lazy"
                      />
                      <span className="self-service-dietary-tag">
                        {!isAvailable ? (
                          <span style={{ color: "var(--danger, #ef4444)", fontWeight: 800 }}>✕ OUT OF STOCK</span>
                        ) : isVeg ? (
                          <span style={{ color: "#10b981" }}>● VEG</span>
                        ) : (
                          <span style={{ color: "#ef4444" }}>▲ NON-VEG</span>
                        )}
                        {isAvailable && (dish.isSpecial || dish.special) && (
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

                        {!isAvailable ? (
                          <button
                            type="button"
                            className="self-service-add-btn"
                            disabled
                            style={{
                              opacity: 0.5,
                              cursor: "not-allowed",
                              background: "var(--bg-tertiary)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border-subtle)",
                            }}
                            title="This item is currently unavailable"
                          >
                            <span>Unavailable</span>
                          </button>
                        ) : qty === 0 ? (
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
                <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? "item" : "items"})</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="self-service-pricing-row" style={{ color: "var(--success)" }}>
                  <span>Discount {discountPercent > 0 ? `(${discountPercent}%)` : ""}</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="self-service-pricing-row">
                <span>GST Tax ({foodGstRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div
                className="self-service-pricing-row"
                style={{ fontSize: "0.68rem", color: "var(--text-muted)", paddingLeft: "0.5rem" }}
              >
                <span>CGST ({cgstRate}%): {formatCurrency(cgstAmount)}</span>
                <span>SGST ({sgstRate}%): {formatCurrency(sgstAmount)}</span>
              </div>
              {serviceChargeEnabled && serviceChargeAmount > 0 && (
                <div className="self-service-pricing-row">
                  <span>Service Charge ({serviceChargeRate}%)</span>
                  <span>{formatCurrency(serviceChargeAmount)}</span>
                </div>
              )}
              {Math.abs(roundingAdjustment) > 0 && (
                <div className="self-service-pricing-row" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  <span>Rounding Adjustment ({roundingMode})</span>
                  <span>
                    {roundingAdjustment > 0
                      ? `+${formatCurrency(roundingAdjustment)}`
                      : `-${formatCurrency(Math.abs(roundingAdjustment))}`}
                  </span>
                </div>
              )}
              <div className="self-service-pricing-row total-row">
                <span>Final Payable</span>
                <span style={{ color: "var(--accent-amber-light)" }}>
                  {formatCurrency(finalPayable)}
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
              onClick={handleProceedClick}
            >
              <span>Proceed</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Order Review Modal (Phase 1) */}
      {isReviewOpen && (
        <div className="self-service-modal-overlay">
          <div className="self-service-payment-modal" style={{ maxWidth: "520px" }}>
            <div className="self-service-payment-header">
              <h3>
                <ShoppingCart size={20} color="var(--accent-amber)" />
                <span>Self Service Order Review</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
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
              {/* Items List */}
              <div style={{ maxHeight: "240px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {financials.items.map((item) => (
                  <div
                    key={item.id || item.menuItemId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.55rem 0.75rem",
                      background: "var(--bg-primary)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.82rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{item.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Unit: {formatCurrency(item.unitPrice)} × Qty: {item.quantity}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--accent-amber)", textAlign: "right" }}>
                      <div style={{ fontSize: "0.86rem" }}>{formatCurrency(item.lineSubtotal)}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
                        Item Total
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Complete POS Financial Summary */}
              <div className="self-service-payment-order-summary" style={{ marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Subtotal ({totalItemCount} {totalItemCount === 1 ? "item" : "items"}):</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--success)" }}>
                    <span>Discount {discountPercent > 0 ? `(${discountPercent}%)` : ""}:</span>
                    <span style={{ fontWeight: 700 }}>- {formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>GST / Food Tax ({foodGstRate}%):</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(taxAmount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", paddingLeft: "0.75rem" }}>
                  <span>CGST ({cgstRate}%): {formatCurrency(cgstAmount)}</span>
                  <span>SGST ({sgstRate}%): {formatCurrency(sgstAmount)}</span>
                </div>

                {serviceChargeEnabled && serviceChargeAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Service Charge ({serviceChargeRate}%):</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(serviceChargeAmount)}</span>
                  </div>
                )}

                {Math.abs(roundingAdjustment) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    <span>Rounding Adjustment ({roundingMode}):</span>
                    <span style={{ fontWeight: 700 }}>
                      {roundingAdjustment > 0
                        ? `+${formatCurrency(roundingAdjustment)}`
                        : `-${formatCurrency(Math.abs(roundingAdjustment))}`}
                    </span>
                  </div>
                )}

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
                  <span>Estimated Payable Amount:</span>
                  <span style={{ color: "var(--accent-amber-light)" }}>
                    {formatCurrency(finalPayable)}
                  </span>
                </div>
              </div>

              {/* Customer Contact Details (Optional) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  background: "var(--bg-primary)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Customer Details (Optional)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={customerName}
                    disabled={isSubmittingOrder}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      padding: "0.45rem 0.65rem",
                      fontSize: "0.78rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-surface)",
                      color: "var(--text-main)",
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone (for SMS update)"
                    value={customerPhone}
                    disabled={isSubmittingOrder}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{
                      padding: "0.45rem 0.65rem",
                      fontSize: "0.78rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-surface)",
                      color: "var(--text-main)",
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Special instructions (e.g. less spicy, extra napkins)"
                  value={specialInstructions}
                  disabled={isSubmittingOrder}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  style={{
                    padding: "0.45rem 0.65rem",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-surface)",
                    color: "var(--text-main)",
                  }}
                />
              </div>

              {/* Error Alert Box (Offline / Server Unavailable / Validation) */}
              {orderError && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid var(--danger, #ef4444)",
                    color: "var(--danger, #ef4444)",
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.6rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{orderError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitSelfServiceOrder}
                    disabled={isSubmittingOrder}
                    style={{
                      background: "var(--danger, #ef4444)",
                      color: "#fff",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      flexShrink: 0,
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>

            <div className="self-service-payment-footer">
              <button
                type="button"
                className="self-service-btn-clear"
                disabled={isSubmittingOrder}
                onClick={() => setIsReviewOpen(false)}
              >
                Continue Browsing
              </button>
              <button
                type="button"
                className="self-service-btn-proceed"
                style={{ flex: "0 0 auto", minWidth: "170px" }}
                disabled={isSubmittingOrder || cart.length === 0}
                onClick={handleSubmitSelfServiceOrder}
              >
                {isSubmittingOrder ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Place Order</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Customer Order Confirmation Modal (Phase 2B.1 Backend API) */}
      {confirmedOrder && (
        <div className="self-service-modal-overlay">
          <div className="self-service-payment-modal" style={{ maxWidth: "540px" }}>
            <div className="self-service-payment-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={22} color="var(--success, #10b981)" />
                <h3 style={{ margin: 0 }}>Self Service Order Confirmed</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseConfirmedOrder}
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
              {/* Order Meta Card */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: "var(--bg-primary)",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Order Number
                  </div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--accent-amber-light)" }}>
                    {confirmedOrder.orderNumber || `ORD-${confirmedOrder.orderId}`}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "var(--accent-amber, #f59e0b)",
                    }}
                  >
                    <Clock size={12} />
                    <span>{confirmedOrder.status || "PendingPayment"}</span>
                  </span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                    }}
                  >
                    Payment: {confirmedOrder.paymentStatus || "Pending"}
                  </span>
                </div>
              </div>

              {/* Status Notice (Awaiting Payment) */}
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  fontSize: "0.76rem",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <Clock size={18} color="var(--accent-amber, #f59e0b)" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Order Status: Awaiting Payment.</strong> Your order has been registered in the kitchen queue. Payment processing and automated KOT printing will be integrated in Phase 2B.2.
                </div>
              </div>

              {/* Confirmed Ordered Items List */}
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Ordered Items ({confirmedOrder.items?.length || 0})
                </div>
                <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {(confirmedOrder.items || []).map((item, idx) => (
                    <div
                      key={item.orderItemId || item.menuItemId || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.45rem 0.65rem",
                        background: "var(--bg-primary)",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                          {formatCurrency(item.unitPrice || item.price)} × {item.quantity}
                        </span>
                      </div>
                      <div style={{ fontWeight: 750 }}>
                        {formatCurrency(item.lineSubtotal || (item.unitPrice || item.price) * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backend-Confirmed Financial Breakdown */}
              {confirmedOrder.financials && (
                <div className="self-service-payment-order-summary" style={{ marginTop: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Backend-Confirmed Subtotal:</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(confirmedOrder.financials.subtotal)}</span>
                  </div>

                  {confirmedOrder.financials.discountAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--success)" }}>
                      <span>Discount ({confirmedOrder.financials.discountPercent}%):</span>
                      <span style={{ fontWeight: 700 }}>- {formatCurrency(confirmedOrder.financials.discountAmount)}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>GST Tax ({confirmedOrder.financials.foodGstRate}%):</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(confirmedOrder.financials.taxAmount)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", paddingLeft: "0.75rem" }}>
                    <span>CGST ({confirmedOrder.financials.cgstRate}%): {formatCurrency(confirmedOrder.financials.cgstAmount)}</span>
                    <span>SGST ({confirmedOrder.financials.sgstRate}%): {formatCurrency(confirmedOrder.financials.sgstAmount)}</span>
                  </div>

                  {confirmedOrder.financials.serviceChargeEnabled && confirmedOrder.financials.serviceChargeAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Service Charge ({confirmedOrder.financials.serviceChargeRate}%):</span>
                      <span style={{ fontWeight: 700 }}>{formatCurrency(confirmedOrder.financials.serviceChargeAmount)}</span>
                    </div>
                  )}

                  {Math.abs(confirmedOrder.financials.roundingAdjustment || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      <span>Rounding Adjustment:</span>
                      <span style={{ fontWeight: 700 }}>
                        {confirmedOrder.financials.roundingAdjustment > 0
                          ? `+${formatCurrency(confirmedOrder.financials.roundingAdjustment)}`
                          : `-${formatCurrency(Math.abs(confirmedOrder.financials.roundingAdjustment))}`}
                      </span>
                    </div>
                  )}

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
                    <span>Final Payable:</span>
                    <span style={{ color: "var(--accent-amber-light)" }}>
                      {formatCurrency(confirmedOrder.financials.finalPayable)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="self-service-payment-footer" style={{ flexWrap: "wrap" }}>
              <button
                type="button"
                className="self-service-btn-clear"
                onClick={handleCloseConfirmedOrder}
              >
                Close
              </button>
              <button
                type="button"
                className="self-service-btn-clear"
                onClick={() => setPreviewOrder(confirmedOrder)}
              >
                <FileText size={14} style={{ marginRight: "4px", verticalAlign: "-2px" }} />
                Preview Invoice &amp; Receipt
              </button>
              <button
                type="button"
                className="self-service-btn-clear"
                onClick={() => setTrackingOrder(confirmedOrder)}
              >
                <Package size={14} style={{ marginRight: "4px", verticalAlign: "-2px" }} />
                Track Order
              </button>
              <button
                type="button"
                className="self-service-btn-proceed"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  setPaymentOrder(confirmedOrder);
                  setIsPaymentOpen(true);
                }}
              >
                <span>Proceed to Payment ({formatCurrency(confirmedOrder.financials?.finalPayable || confirmedOrder.grandTotal)})</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Self Service Payment Modal (Phase 2B.2 - Awaiting Backend Payment Gateway) */}
      {isPaymentOpen && paymentOrder && (
        <div className="self-service-modal-overlay">
          <div className="self-service-payment-modal" style={{ maxWidth: "560px" }}>
            {/* Modal Header */}
            <div className="self-service-payment-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-amber)",
                  }}
                >
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Select Payment Method</h3>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Order: {activeOrderNumber}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePaymentModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="self-service-payment-body">
              {/* Total Payable Banner */}
              <div
                style={{
                  padding: "0.85rem 1.15rem",
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-amber) 15%, transparent), var(--bg-primary))",
                  border: "1.5px solid var(--accent-amber)",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                    Total Payable Amount
                  </div>
                  <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "var(--accent-amber-light)", lineHeight: 1.2 }}>
                    {formatCurrency(activePayableAmount)}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  <div>{paymentOrder?.items?.length || 0} item(s)</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--accent-amber, #f59e0b)", fontWeight: 700, marginTop: "2px" }}>
                    <Clock size={13} />
                    <span>{paymentOrder?.paymentStatus || "Pending"}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="self-service-payment-methods-grid">
                <button
                  type="button"
                  className={`self-service-payment-method-card ${selectedPaymentMethod === "upi" ? "is-selected" : ""}`}
                  onClick={() => setSelectedPaymentMethod("upi")}
                >
                  <QrCode size={22} />
                  <span style={{ fontSize: "0.76rem", fontWeight: 750 }}>UPI / QR Code</span>
                </button>

                <button
                  type="button"
                  className={`self-service-payment-method-card ${selectedPaymentMethod === "cash" ? "is-selected" : ""}`}
                  onClick={() => setSelectedPaymentMethod("cash")}
                >
                  <Banknote size={22} />
                  <span style={{ fontSize: "0.76rem", fontWeight: 750 }}>Pay at Counter</span>
                </button>

                <button
                  type="button"
                  className={`self-service-payment-method-card ${selectedPaymentMethod === "card" ? "is-selected" : ""}`}
                  onClick={() => setSelectedPaymentMethod("card")}
                >
                  <CreditCard size={22} />
                  <span style={{ fontSize: "0.76rem", fontWeight: 750 }}>Card Machine</span>
                </button>
              </div>

              {/* Dynamic Content Per Method */}
              {selectedPaymentMethod === "upi" && (
                <div className="self-service-qr-wrapper">
                  {/* QR Display Area */}
                  <div className="self-service-qr-card" style={{ flexDirection: "column", gap: "0.45rem" }}>
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt={`Backend UPI QR for ${formatCurrency(activePayableAmount)}`} />
                    ) : (
                      <>
                        <img
                          src="/dummy-upi-qr.png"
                          alt={`Demo UPI QR Code for ${activeOrderNumber} - Not a real payment`}
                        />
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 900,
                            color: "#dc2626",
                            letterSpacing: "0.04em",
                            textAlign: "center",
                          }}
                        >
                          DEMO QR – NOT A REAL PAYMENT
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#334155",
                            textAlign: "center",
                          }}
                        >
                          Order: {activeOrderNumber} • Amount: {formatCurrency(activePayableAmount)}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Demo QR Notice (Payment stays Pending; never marks Paid) */}
                  {!qrDataUrl && (
                    <div
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "8px",
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        fontSize: "0.76rem",
                        color: "var(--text-main)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        boxSizing: "border-box",
                      }}
                    >
                      <AlertCircle size={16} color="var(--accent-amber, #f59e0b)" style={{ flexShrink: 0 }} />
                      <span>
                        <strong>DEMO QR – NOT A REAL PAYMENT.</strong> Payment status remains <strong>{paymentOrder?.paymentStatus || "Pending"}</strong> for {activeOrderNumber}; scanning this demo QR does not confirm payment or issue an official invoice.
                      </span>
                    </div>
                  )}

                  {/* UPI Apps Badges */}
                  <div className="self-service-qr-badges">
                    <span className="self-service-qr-badge">Google Pay</span>
                    <span className="self-service-qr-badge">PhonePe</span>
                    <span className="self-service-qr-badge">Paytm</span>
                    <span className="self-service-qr-badge">BHIM</span>
                    <span className="self-service-qr-badge">Cred</span>
                    <span className="self-service-qr-badge">Any UPI App</span>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === "cash" && (
                <div className="self-service-info-panel">
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: "rgba(245, 158, 11, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-amber)",
                      flexShrink: 0,
                    }}
                  >
                    <Building2 size={26} />
                  </div>
<div style={{ maxWidth: "420px", width: "100%" }}>
                    <h4 style={{ margin: "0 0 0.4rem", fontSize: "1.02rem", fontWeight: 800, color: "var(--text-main)" }}>
                      Pay at Cashier Counter
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-main)", fontWeight: 600, lineHeight: 1.45 }}>
                      Please pay at the cashier counter.
                    </p>
                    <p style={{ margin: "0.3rem 0 0", fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      Share the order reference below with the cashier so they can identify and verify your order.
                    </p>
                  </div>
                  <div className="self-service-counter-ref-box">
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Order Reference
                    </div>
                    <div className="self-service-counter-ref-value">
                      {activeOrderNumber || "—"}
                    </div>
                    <div className="self-service-counter-meta">
                      <span>
                        Payable: <strong style={{ color: "var(--text-main)" }}>{formatCurrency(activePayableAmount)}</strong>
                      </span>
                      <span>
                        Status:{" "}
                        <strong style={{ color: "var(--accent-amber, #f59e0b)" }}>
                          {paymentOrder?.paymentStatus || "Pending"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {paymentMessage && (
                    <div
                      style={{
                        padding: "0.65rem 0.95rem",
                        borderRadius: "8px",
                        background: paymentSuccess ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        border: paymentSuccess ? "1px solid rgba(34, 197, 94, 0.35)" : "1px solid rgba(239, 68, 68, 0.35)",
                        color: paymentSuccess ? "#16a34a" : "#dc2626",
                        fontSize: "0.82rem",
                        fontWeight: 650,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        textAlign: "left",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {paymentSuccess ? <ShieldCheck size={16} style={{ flexShrink: 0 }} /> : <AlertCircle size={16} style={{ flexShrink: 0 }} />}
                      <span>{paymentMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedPaymentMethod === "card" && (
                <div className="self-service-info-panel">
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: "rgba(59, 130, 246, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#3b82f6",
                    }}
                  >
                    <CreditCard size={26} />
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.98rem", fontWeight: 800 }}>Card / POS Terminal Payment</h4>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, maxWidth: "420px" }}>
                      Present your <strong>Order Reference</strong> at the counter to tap or swipe your Credit/Debit card on the POS machine.
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "0.65rem 1.25rem",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1.5px dashed #3b82f6",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Order Reference</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 850, color: "#3b82f6" }}>
                      {activeOrderNumber}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center" }}>
                    <span className="self-service-qr-badge">Visa</span>
                    <span className="self-service-qr-badge">Mastercard</span>
                    <span className="self-service-qr-badge">RuPay</span>
                    <span className="self-service-qr-badge">Amex</span>
                    <span className="self-service-qr-badge">Contactless Tap</span>
                  </div>
                  {paymentMessage && (
                    <div
                      style={{
                        padding: "0.65rem 0.95rem",
                        borderRadius: "8px",
                        background: paymentSuccess ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        border: paymentSuccess ? "1px solid rgba(34, 197, 94, 0.35)" : "1px solid rgba(239, 68, 68, 0.35)",
                        color: paymentSuccess ? "#16a34a" : "#dc2626",
                        fontSize: "0.82rem",
                        fontWeight: 650,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        textAlign: "left",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {paymentSuccess ? <ShieldCheck size={16} style={{ flexShrink: 0 }} /> : <AlertCircle size={16} style={{ flexShrink: 0 }} />}
                      <span>{paymentMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="self-service-payment-footer" style={{ flexWrap: "wrap" }}>
              <button
                type="button"
                className="self-service-btn-clear"
                onClick={handleClosePaymentModal}
              >
                Back to Order Summary
              </button>

              <button
                type="button"
                className="self-service-btn-clear"
                onClick={() => setPreviewOrder(paymentOrder)}
              >
                <FileText size={14} style={{ marginRight: "4px", verticalAlign: "-2px" }} />
                Preview Invoice &amp; Receipt
              </button>

              <button
                type="button"
                className="self-service-btn-clear"
                onClick={() => setTrackingOrder(paymentOrder)}
              >
                <Package size={14} style={{ marginRight: "4px", verticalAlign: "-2px" }} />
                Track Order
              </button>

              <button
                type="button"
                className="self-service-btn-proceed"
                style={{
                  flex: 1,
                  minWidth: "220px",
                  justifyContent: "center",
                  background: paymentSuccess ? "var(--color-primary-green, #16a34a)" : undefined,
                  borderColor: paymentSuccess ? "var(--color-primary-green, #16a34a)" : undefined,
                  cursor: paymentSubmitting ? "wait" : "pointer",
                }}
                onClick={handleConfirmPaymentMethod}
                disabled={paymentSubmitting}
                title="Register payment choice with Cashier"
              >
                {paymentSubmitting ? (
                  <span>Registering...</span>
                ) : paymentSuccess ? (
                  <>
                    <ShieldCheck size={16} />
                    <span>Payment Choice Registered</span>
                  </>
                ) : selectedPaymentMethod === "cash" ? (
                  <>
                    <Banknote size={16} />
                    <span>Confirm Pay at Counter</span>
                  </>
                ) : selectedPaymentMethod === "card" ? (
                  <>
                    <CreditCard size={16} />
                    <span>Request Card Terminal</span>
                  </>
                ) : (
                  <>
                    <QrCode size={16} />
                    <span>Confirm UPI Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Self Service Invoice & Receipt Preview Modal (Phase 2B.3) */}
      {previewOrder && (
        <SelfServicePreviewModal
          order={previewOrder}
          restaurantSettings={restaurantSettings}
          onClose={() => setPreviewOrder(null)}
        />
      )}

      {/* 8. Self Service Order Tracking Modal (Phase 2B.4) */}
      {trackingOrder && (
        <SelfServiceOrderTracking
          order={trackingOrder}
          isLoading={trackingLoading}
          error={trackingError}
          hasTrackingApi={true}
          onRefresh={handleRefreshTracking}
          onClose={() => {
            setTrackingOrder(null);
            setTrackingError("");
          }}
        />
      )}
    </div>
  );
}
