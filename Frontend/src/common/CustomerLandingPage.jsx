import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Clock3,
  Mail,
  Minus,
  Plus,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Utensils,
  UserRound,
  Users,
} from "lucide-react";
import { apiClient } from "../api/apiConfig";
import { apiCreateReservation } from "../api/reservationApi";
import { apiCreatePaidTakeawayOrder, apiSendTakeawayOrderToKitchen } from "../api/orderApi";
import { SettlementModal } from "../user/SettlementModal";
import { TableReservationFlow } from "../reservation/TableReservationFlow";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import "./CustomerLandingPage.css";

const formatPrice = (value) =>
  `₹${(Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const FALLBACK_TABLES = [
  { id: 1, name: "T-01", capacity: 2, status: "available", section: "Indoor" },
  { id: 2, name: "T-02", capacity: 4, status: "available", section: "Indoor" },
  { id: 3, name: "T-03", capacity: 2, status: "available", section: "Indoor" },
  { id: 5, name: "T-05", capacity: 4, status: "available", section: "Indoor" },
  { id: 7, name: "T-07", capacity: 4, status: "available", section: "Outdoor" },
  { id: 8, name: "T-08", capacity: 6, status: "available", section: "Indoor" },
  { id: 9, name: "T-09", capacity: 8, status: "available", section: "Garden Area" },
];

const getAvailableTables = (tables, guests) => {
  const source = Array.isArray(tables) && tables.length > 0 ? tables : FALLBACK_TABLES;
  const filtered = source.filter((table) => {
    const status = String(table.status || "").toLowerCase();
    const cap = Number(table.capacity ?? table.capacityChairs ?? 4);
    return ["vacant", "available"].includes(status) && cap >= guests;
  });
  return filtered.length > 0 ? filtered : FALLBACK_TABLES;
};

const todayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const isValidIndianMobileNumber = (phone) => {
  const normalizedPhone = String(phone || "").trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(normalizedPhone)) return false;
  const digits = normalizedPhone.replace(/\D/g, "");
  const mobileNumber = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(mobileNumber);
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

export function CustomerLandingPage({
  restaurantName = "Bhanu Bistro",
  restaurantLogo = "",
  menuItems = [],
  menuLoading = false,
  tables = [],
  onAdminLogin,
}) {
  const [cart, setCart] = useState({});
  const [activeScreen, setActiveScreen] = useState(() => {
    if (window.location.hash === "#menu") return "menu";
    if (window.location.hash === "#reserve") return "reservation";
    return "home";
  });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [reservationDate, setReservationDate] = useState(todayDate);
  const [reservationTime, setReservationTime] = useState("19:00");
  const [reservationGuests, setReservationGuests] = useState(2);
  const [reservationTablePreference, setReservationTablePreference] = useState("Any");
  const [reservationName, setReservationName] = useState("");
  const [reservationPhone, setReservationPhone] = useState("");
  const [reservationPhoneError, setReservationPhoneError] = useState("");
  const [reservationEmail, setReservationEmail] = useState("");
  const [reservationEmailError, setReservationEmailError] = useState("");
  const [reservationNotes, setReservationNotes] = useState("");
  const [reservationMessage, setReservationMessage] = useState("");
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [menuCategory, setMenuCategory] = useState("All");
  const reservationDateRef = useRef(null);
  const reservationTimeRef = useRef(null);

  useEffect(() => {
    const handleHistoryNavigation = () => {
      const screen = window.location.hash === "#menu"
        ? "menu"
        : window.location.hash === "#reserve"
          ? "reservation"
          : window.location.hash === "#confirmation"
            ? "confirmation"
            : "home";
      setActiveScreen(screen);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, []);

  const safeMenuItems = useMemo(
    () =>
      (Array.isArray(menuItems) ? menuItems : []).filter(
        (item) => item && item.isAvailable !== false,
      ),
    [menuItems],
  );
  const categories = useMemo(
    () => ["All", ...new Set(safeMenuItems.map((item) => item.category).filter(Boolean))],
    [safeMenuItems],
  );
  const visibleMenuItems = useMemo(
    () =>
      safeMenuItems
        .filter((item) => menuCategory === "All" || item.category === menuCategory),
    [safeMenuItems, menuCategory],
  );
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, line) => sum + (Number(line.item.price) || 0) * line.quantity,
    0,
  );
  const availableTables = getAvailableTables(tables, Number(reservationGuests));
  const openDateTimePicker = (inputRef) => {
    if (typeof inputRef.current?.showPicker === "function") inputRef.current.showPicker();
    else inputRef.current?.focus();
  };

  const navigateScreen = (screen) => {
    const hash = screen === "reservation" ? "#reserve" : `#${screen}`;
    window.history.pushState(null, "", hash);
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeQuantity = (item, delta) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[item.id]?.quantity || 0) + delta);
      const next = { ...current };
      if (quantity === 0) delete next[item.id];
      else next[item.id] = { item, quantity };
      return next;
    });
  };

  const handleTakeawayPayment = async (settlementData) => {
    const result = await apiCreatePaidTakeawayOrder({
      orderType: "Takeaway",
      tableId: null,
      tableName: "Takeaway",
      serverName: "Online customer",
      guests: 1,
      status: "Settled",
      paymentMethod: settlementData.paymentMethod,
      invoiceNumber: settlementData.invoiceNo,
      discountPercent: 0,
      serviceChargeEnabled: false,
      tipAmount: Number(settlementData.tipAmount) || 0,
      items: settlementData.items.map((line) => ({
        menuItemId: Number(line.menuItemId ?? line.menu_item_id ?? line.id ?? line.backendId) || undefined,
        name: line.name,
        price: line.price,
        quantity: line.quantity,
        notes: line.notes || "",
      })),
    });

    if (!result?.success) {
      return `Payment was not recorded: ${result?.error || "The server could not save your order."}`;
    }

    const order = result.data?.data ?? result.data;
    const orderId = Number(order?.id ?? order?.Id) || null;
    let kitchenNotice = orderId
      ? ""
      : "Payment was saved, but the server didn't return an order number. Please contact the restaurant before placing another order.";
    if (orderId) {
      const kitchenResult = await apiSendTakeawayOrderToKitchen(orderId);
      if (!kitchenResult?.success) {
        kitchenNotice = `Payment was saved, but the kitchen could not be notified: ${kitchenResult?.error || "Please contact the restaurant."}`;
      }
    }

    setOrderConfirmation({
      orderNumber: order?.invoiceNo ?? order?.InvoiceNo ?? orderId,
      kitchenNotice,
    });
    setCart({});
    setPaymentOpen(false);
    navigateScreen("confirmation");
    return true;
  };

  const handleReservationSubmit = async (event) => {
    event.preventDefault();
    setReservationMessage("");
    if (!isValidIndianMobileNumber(reservationPhone)) {
      setReservationPhoneError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setReservationPhoneError("");
    if (reservationEmail.trim() && !isValidEmail(reservationEmail)) {
      setReservationEmailError("Enter a valid email address.");
      return;
    }
    setReservationEmailError("");

    const selectedTable =
      (availableTables && availableTables.length > 0 ? availableTables[0] : null) || {
        id: "T-03",
        name: "T-03",
        section: reservationTablePreference || "Indoor",
      };

    setReservationSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 350));

    const result = await apiCreateReservation({
      customerName: reservationName.trim(),
      phone: reservationPhone.trim(),
      email: reservationEmail.trim() || null,
      tableId: selectedTable.id || "T-03",
      tableName: `${selectedTable.name || selectedTable.tableNumber || "T-03"} (${selectedTable.section || reservationTablePreference || "Indoor"})`,
      section: selectedTable.section || reservationTablePreference || "Indoor",
      branchId: 1,
      guests: Number(reservationGuests),
      tablePreference: reservationTablePreference,
      date: reservationDate,
      time: reservationTime,
      specialRequests: reservationNotes.trim(),
      advanceAmount: 100,
    });
    setReservationSubmitting(false);

    if (!result?.success) {
      setReservationMessage("We couldn't complete your reservation. Please try again.");
      return;
    }

    setReservationMessage(
      `Your reservation (${result.data.id}) is confirmed! Table ${result.data.tableName} has been reserved for ${reservationGuests} guests on ${reservationDate} at ${reservationTime}.`
    );
    setReservationName("");
    setReservationPhone("");
    setReservationPhoneError("");
    setReservationEmail("");
    setReservationEmailError("");
    setReservationNotes("");
  };

  return (
    <div className={`customer-site customer-screen-${activeScreen}`}>
      {activeScreen !== "reservation" && (
        <header className="customer-header">
          <a className="customer-brand" href="#home" aria-label={`${restaurantName} home`} onClick={(event) => {
            event.preventDefault();
            navigateScreen("home");
          }}>
            {restaurantLogo ? (
              <img className="customer-brand-logo" src={restaurantLogo} alt="" />
            ) : (
              <span className="customer-brand-mark"><ChefHat size={25} /></span>
            )}
            <span>
              <strong>{restaurantName}</strong>
              <small>Fine Dining &amp; Takeaway</small>
            </span>
          </a>
          <button className="customer-admin-link" type="button" onClick={onAdminLogin} title="Go to Admin Portal">
            <ShieldCheck size={18} />
            <span>Admin Portal</span>
          </button>
        </header>
      )}

      <main>
        {activeScreen === "home" && (
          <section className="customer-hero" id="home">
            <div className="customer-hero-content">
              <h1>Welcome to <span>{restaurantName}</span></h1>
              <p className="customer-hero-links">
                <a
                  href="#menu"
                  onClick={(event) => {
                    event.preventDefault();
                    navigateScreen("menu");
                  }}
                >
                  Order Takeaway
                </a>
                <i aria-hidden="true">|</i>
                <button
                  type="button"
                  onClick={() => navigateScreen("reservation")}
                >
                  Reserve Your Table
                </button>
              </p>
            </div>

            <div className="customer-action-grid">
              <article className="customer-action-card takeaway-action">
                <div className="customer-action-copy">
                  <span className="customer-action-icon takeaway-icon">
                    <ShoppingBag size={24} />
                  </span>
                  <h2>Order Takeaway Online</h2>
                  <p>Browse our menu, place your order and pick it up at your convenience.</p>
                  <a
                    className="customer-action-button takeaway-button"
                    href="#menu"
                    onClick={(event) => {
                      event.preventDefault();
                      navigateScreen("menu");
                    }}
                  >
                    Order Takeaway <ArrowRight size={18} />
                  </a>
                </div>
              </article>

              <article className="customer-action-card reservation-action">
                <div className="customer-action-copy">
                  <span className="customer-action-icon reservation-icon">
                    <CalendarDays size={24} />
                  </span>
                  <h2>Reserve a Table</h2>
                  <p>Book your table in advance and enjoy a great dining experience.</p>
                  <button
                    className="customer-action-button reservation-button"
                    type="button"
                    onClick={() => navigateScreen("reservation")}
                  >
                    Reserve Table <ArrowRight size={18} />
                  </button>
                </div>
              </article>
            </div>

            {/* Bottom 4-features strip (Matching Image 1) */}
            <div className="customer-features-strip">
              <div className="customer-feature-item">
                <span className="customer-feature-icon">
                  <ChefHat size={26} strokeWidth={1.8} />
                </span>
                <div className="customer-feature-text">
                  <strong>Delicious Food</strong>
                  <small>A wide variety of cuisines</small>
                </div>
              </div>

              <div className="customer-feature-divider" />

              <div className="customer-feature-item">
                <span className="customer-feature-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4v2" />
                    <path d="M4 18h16" />
                    <path d="M20 18a8 8 0 0 0-16 0" />
                  </svg>
                </span>
                <div className="customer-feature-text">
                  <strong>Easy Ordering</strong>
                  <small>Quick &amp; hassle-free takeaway</small>
                </div>
              </div>

              <div className="customer-feature-divider" />

              <div className="customer-feature-item">
                <span className="customer-feature-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10v9" />
                    <path d="M3 14h3" />
                    <path d="M6 10v9" />
                    <path d="M8 12h8" />
                    <path d="M10 12v7" />
                    <path d="M14 12v7" />
                    <path d="M18 10v9" />
                    <path d="M18 14h3" />
                    <path d="M21 10v9" />
                  </svg>
                </span>
                <div className="customer-feature-text">
                  <strong>Table Reservation</strong>
                  <small>Book your table in seconds</small>
                </div>
              </div>

              <div className="customer-feature-divider" />

              <div className="customer-feature-item">
                <span className="customer-feature-icon">
                  <ShieldCheck size={26} strokeWidth={1.8} />
                </span>
                <div className="customer-feature-text">
                  <strong>Secure &amp; Reliable</strong>
                  <small>Your orders and bookings are safe</small>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeScreen === "menu" && <section className="customer-menu-section" id="menu">
          <div className="customer-section-heading">
            <div>
              {activeScreen === "menu" && <button className="customer-back-link" type="button" onClick={() => navigateScreen("home")}><ArrowLeft size={16} /> Back to home</button>}
              <p className="customer-eyebrow">Made fresh for you</p>
              <h2>Explore our menu</h2>
              <p>Choose your favourites, then continue to checkout and payment.</p>
            </div>
            <span className="customer-menu-count">{safeMenuItems.length} menu items</span>
          </div>

          {categories.length > 1 && (
            <div className="customer-category-list" aria-label="Menu categories">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={menuCategory === category ? "is-selected" : ""}
                  onClick={() => setMenuCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {menuLoading && safeMenuItems.length === 0 ? (
            <div className="customer-empty-menu"><p>Loading our menu…</p></div>
          ) : visibleMenuItems.length ? (
            <div className="customer-menu-grid">
              {visibleMenuItems.map((item) => {
                const quantity = cart[item.id]?.quantity || 0;
                return (
                  <article className="customer-menu-card" key={item.id}>
                    <img
                      src={getMenuItemImage(item)}
                      alt={item.name}
                      loading="lazy"
                      onError={(event) => handleDishImageError(event, item)}
                    />
                    <div className="customer-menu-card-body">
                      <span className="customer-menu-category">{item.category || "Chef's selection"}</span>
                      <h3>{item.name}</h3>
                      {item.description && <p>{item.description}</p>}
                      <div className="customer-menu-card-footer">
                        <strong>{formatPrice(item.price)}</strong>
                        {quantity ? (
                          <span className="customer-quantity-control">
                            <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item, -1)}><Minus size={15} /></button>
                            <b>{quantity}</b>
                            <button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQuantity(item, 1)}><Plus size={15} /></button>
                          </span>
                        ) : (
                          <button className="customer-add-button" type="button" onClick={() => changeQuantity(item, 1)}>
                            <Plus size={15} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="customer-empty-menu">
              <Utensils size={28} />
              <p>Our menu is being prepared. Please check back soon or contact us.</p>
            </div>
          )}

          {cartCount > 0 && (
            <div className="customer-cart-panel">
              <div>
                <strong><ShoppingBag size={18} /> Your takeaway order</strong>
                <span>{cartCount} item{cartCount === 1 ? "" : "s"} · {formatPrice(cartTotal)}</span>
              </div>
              <button className="customer-checkout-button" type="button" onClick={() => setPaymentOpen(true)}>
                Checkout &amp; Pay <ArrowRight size={17} />
              </button>
            </div>
          )}
          <p className="customer-order-note">Choose your payment method at checkout to confirm your takeaway order.</p>
        </section>}

        {activeScreen === "reservation" && (
          <div className="customer-reservation-flow-wrapper" style={{ width: "100%", minHeight: "100vh", background: "#0a0403" }}>
            <TableReservationFlow
              onBackToPos={() => navigateScreen("home")}
              onAdminLogin={onAdminLogin}
              backLabel="Back to Home"
            />
          </div>
        )}

        {activeScreen === "confirmation" && (
          <section className="customer-order-confirmation">
            <CheckCircle2 size={54} />
            <p className="customer-eyebrow">Thank you</p>
            <h1>Your takeaway order is confirmed</h1>
            {orderConfirmation?.orderNumber && <p>Order number <strong>{orderConfirmation.orderNumber}</strong></p>}
            <p className="customer-confirmation-note">Your payment has been recorded. Check the update below for any next steps.</p>
            {orderConfirmation?.kitchenNotice && <p className="customer-reservation-message is-error" role="status">{orderConfirmation.kitchenNotice}</p>}
            <button type="button" className="customer-reservation-submit" onClick={() => navigateScreen("home")}>Back to home <ArrowRight size={17} /></button>
          </section>
        )}
      </main>

      {paymentOpen && (
        <SettlementModal
          table={{
            id: "TAKEAWAY",
            name: "Takeaway",
            section: "Takeaway",
            server: "Online customer",
            guests: 1,
            capacity: 1,
            discountPercent: 0,
            serviceCharge: 0,
            items: cartItems.map(({ item, quantity }) => ({
              ...item,
              menuItemId: item.menuItemId ?? item.menu_item_id ?? item.backendId ?? item.id,
              quantity,
            })),
          }}
          menuItems={menuItems}
          confirmLabel="Pay & Place Order"
          onClose={() => setPaymentOpen(false)}
          onConfirmPayment={handleTakeawayPayment}
        />
      )}
    </div>
  );
}
