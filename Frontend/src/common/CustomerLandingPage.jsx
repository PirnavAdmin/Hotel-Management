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
import { apiCreatePaidTakeawayOrder, apiSendTakeawayOrderToKitchen } from "../api/orderApi";
import { SettlementModal } from "../user/SettlementModal";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import "./CustomerLandingPage.css";

const formatPrice = (value) =>
  `₹${(Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getAvailableTables = (tables, guests) =>
  (Array.isArray(tables) ? tables : []).filter((table) => {
    const status = String(table.status || "").toLowerCase();
    const id = Number(table.backendTableId ?? table.tableId ?? table.id);
    return (
      Number.isFinite(id) &&
      id > 0 &&
      ["vacant", "available"].includes(status) &&
      Number(table.capacity ?? table.capacityChairs ?? 4) >= guests
    );
  });

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

    const selectedTable = availableTables[0];
    if (!selectedTable) {
      setReservationMessage("No available table can fit your party. Please choose fewer guests or contact the restaurant.");
      return;
    }

    setReservationSubmitting(true);
    const result = await apiClient("/api/v1/reservations", {
      method: "POST",
      body: JSON.stringify({
        customerName: reservationName.trim(),
        phone: reservationPhone.trim(),
        email: reservationEmail.trim() || null,
        tableId: Number(selectedTable.backendTableId ?? selectedTable.tableId ?? selectedTable.id),
        branchId: Number(selectedTable.branchId) || 1,
        guestsCount: Number(reservationGuests),
        tablePreference: reservationTablePreference,
        reservationDate,
        reservationTime,
        notes: reservationNotes.trim(),
      }),
    });
    setReservationSubmitting(false);

    if (!result?.success) {
      setReservationMessage(result?.error || "We couldn't complete your reservation. Please try again.");
      return;
    }
    setReservationMessage("Your reservation request has been received. We look forward to seeing you!");
    setReservationName("");
    setReservationPhone("");
    setReservationPhoneError("");
    setReservationEmail("");
    setReservationEmailError("");
    setReservationNotes("");
  };

  return (
    <div className={`customer-site customer-screen-${activeScreen}`}>
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
        <button className="customer-admin-link" type="button" onClick={onAdminLogin}>
          <ShieldCheck size={18} />
          <span>Admin Login</span>
        </button>
      </header>

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
          <section className="customer-reservation-page">
            <div className="customer-reservation-layout">
              <div className="customer-reservation-copy">
                <span className="customer-reservation-kicker"><CalendarDays size={24} /> Table Reservation</span>
                <h1>Reserve Your <span>Table</span></h1>
                <p>Book a table in advance and enjoy a great dining experience at {restaurantName}.</p>
                <div className="customer-reservation-perks">
                  <div><CheckCircle2 /><strong>Confirmed<br />Reservation</strong></div>
                  <div><span className="customer-guests-icon">♧</span><strong>Perfect for<br />Families &amp; Groups</strong></div>
                  <div><span className="customer-star-icon">☆</span><strong>Great<br />Dining Experience</strong></div>
                </div>
              </div>

              <div className="customer-reservation-card">
                <h2><CalendarDays size={26} /> Book a Table</h2>
                <form onSubmit={handleReservationSubmit}>
                  <div className="customer-reservation-fields">
                    <label>Date <span>*</span>
                      <span className="customer-date-time-control">
                        <input ref={reservationDateRef} type="date" required min={todayDate()} value={reservationDate} onChange={(event) => setReservationDate(event.target.value)} />
                        <button className="customer-picker-button" type="button" aria-label="Open reservation date picker" onClick={() => openDateTimePicker(reservationDateRef)}><CalendarDays size={18} /></button>
                      </span>
                    </label>
                    <label>Time <span>*</span>
                      <span className="customer-date-time-control">
                        <input ref={reservationTimeRef} type="time" required value={reservationTime} onChange={(event) => setReservationTime(event.target.value)} />
                        <button className="customer-picker-button" type="button" aria-label="Open reservation time picker" onClick={() => openDateTimePicker(reservationTimeRef)}><Clock3 size={18} /></button>
                      </span>
                    </label>
                  </div>
                  <div className="customer-reservation-fields">
                    <label>Guests <span>*</span>
                      <span className="customer-guest-control">
                        <button type="button" aria-label="Decrease guest count" disabled={reservationGuests <= 1} onClick={() => setReservationGuests((guests) => Math.max(1, guests - 1))}><Minus size={17} /></button>
                        <output aria-live="polite" aria-label="Number of guests"><Users size={17} /> {reservationGuests} {reservationGuests === 1 ? "Guest" : "Guests"}</output>
                        <button type="button" aria-label="Increase guest count" disabled={reservationGuests >= 8} onClick={() => setReservationGuests((guests) => Math.min(8, guests + 1))}><Plus size={17} /></button>
                      </span>
                    </label>
                    <label>Table Preference <span className="customer-optional-label-inline">(Optional)</span>
                      <select value={reservationTablePreference} onChange={(event) => setReservationTablePreference(event.target.value)}>
                        <option value="Any">Any table</option>
                        <option value="Garden Area">Garden Area</option>
                        <option value="Lounge">Lounge</option>
                        <option value="Main Hall">Main Hall</option>
                        <option value="Outdoor Patio">Outdoor Patio</option>
                        <option value="Window Side">Window Side</option>
                      </select>
                    </label>
                  </div>
                  <div className="customer-reservation-fields customer-reservation-contact-fields">
                    <label>Full Name <span>*</span><span className="customer-input-control"><UserRound size={15} /><input required autoComplete="name" value={reservationName} onChange={(event) => setReservationName(event.target.value)} placeholder="Your name" /></span></label>
                    <label>Mobile Number <span>*</span><span className="customer-input-control"><Phone size={15} /><input required autoComplete="tel" inputMode="tel" value={reservationPhone} onChange={(event) => {
                      const phone = event.target.value;
                      setReservationPhone(phone);
                      setReservationPhoneError(
                        !phone.trim() || isValidIndianMobileNumber(phone)
                          ? ""
                          : "Enter a valid 10-digit Indian mobile number.",
                      );
                    }} onBlur={() => {
                      if (reservationPhone.trim() && !isValidIndianMobileNumber(reservationPhone)) {
                        setReservationPhoneError("Enter a valid 10-digit Indian mobile number.");
                      }
                    }} aria-invalid={Boolean(reservationPhoneError)} aria-describedby={reservationPhoneError ? "reservation-phone-error" : undefined} placeholder="e.g. +91 98765 43210" /></span>
                      {reservationPhoneError && <p id="reservation-phone-error" className="customer-reservation-message is-error customer-phone-error" role="alert">{reservationPhoneError}</p>}
                    </label>
                    <label>Email <span className="customer-optional-label-inline">(Optional)</span><span className="customer-input-control"><Mail size={15} /><input type="email" maxLength={100} autoComplete="email" value={reservationEmail} onChange={(event) => {
                      const email = event.target.value;
                      setReservationEmail(email);
                      setReservationEmailError(!email.trim() || isValidEmail(email) ? "" : "Enter a valid email address.");
                    }} onBlur={() => {
                      if (reservationEmail.trim() && !isValidEmail(reservationEmail)) {
                        setReservationEmailError("Enter a valid email address.");
                      }
                    }} aria-invalid={Boolean(reservationEmailError)} aria-describedby={reservationEmailError ? "reservation-email-error" : undefined} placeholder="you@example.com" /></span>
                      {reservationEmailError && <p id="reservation-email-error" className="customer-reservation-message is-error customer-phone-error" role="alert">{reservationEmailError}</p>}
                    </label>
                  </div>
                  <label><span className="customer-optional-label">Special Requests <small>(Optional)</small></span><textarea rows={3} value={reservationNotes} onChange={(event) => setReservationNotes(event.target.value)} placeholder="Birthday celebration, anniversary, high chair, etc." /></label>
                  {availableTables.length === 0 && <p className="customer-reservation-message is-error">No available tables for this party size. Please choose fewer guests or contact the restaurant.</p>}
                  {reservationMessage && <p className={`customer-reservation-message ${reservationMessage.startsWith("Your reservation") ? "is-success" : "is-error"}`} role="status">{reservationMessage}</p>}
                  <button className="customer-reservation-submit" type="submit" disabled={reservationSubmitting || availableTables.length === 0}>
                    <CalendarDays size={19} /> {reservationSubmitting ? "Reserving…" : "Reserve Table"}
                  </button>
                </form>
              </div>
            </div>
          </section>
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
