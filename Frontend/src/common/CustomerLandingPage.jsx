import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ConciergeBell,
  Clock3,
  Clock,
  Circle,
  Receipt,
  Mail,
  Minus,
  Plus,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Utensils,
  UserRound,
  Users,
  Search,
  Trash2,
  CreditCard,
  Building,
  Wallet,
  Smartphone,
  Check,
  Bell,
  BellRing,
  MapPin,
  Tag,
  Star,
  FileText,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Flame,
  Heart,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";
import {
  apiCheckReservationAvailability,
  apiGetAvailableReservationTables,
  apiGetReservationTableDetails,
  apiCreatePublicReservation,
  apiSendReservationOtp,
  apiVerifyReservationOtp,
  apiGetCustomerReservations,
  apiGetReservationDetails,
  apiGetCustomerProfile,
  apiGetCustomerTakeawayOrder,
  apiCreateCustomerTakeawayOrder,
  apiModifyReservation,
  apiCancelCustomerReservation,
  apiGetReservationPaymentStatus,
  getReservationCustomerToken,
  setReservationCheckoutToken,
  setReservationCustomerToken,
} from "../api/reservationApi";
import { apiCustomerLogout, getCustomerRefreshToken, setCustomerRefreshToken } from "../api/customerAuthApi";
import { ReceiptModal } from "../user/ReceiptModal";
import { TableReservationFlow } from "../reservation/TableReservationFlow";
import { CustomerAuthFlow } from "../customer/CustomerAuthFlow";
import { CustomerOrdersPage } from "../customer/CustomerOrdersPage";
import { CustomerProfilePage } from "../customer/CustomerProfilePage";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import {
  cleanNotificationText,
  getCleanAlertMessage,
  getCleanAlertTimestamp,
  getCleanAlertTitle,
} from "../utils/notificationHelper";
import "./CustomerLandingPage.css";

const CUSTOMER_SESSION_KEY = "bhanu_bistro_customer_v1";

const getInitialCustomer = () => {
  try {
    if (!getReservationCustomerToken()) return null;
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

const formatPrice = (value) =>
  `₹${(Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getAvailableTables = (tables, guests) => {
  const filtered = (Array.isArray(tables) ? tables : []).filter((table) => {
    const status = String(table.status || "").toLowerCase();
    const cap = Number(table.capacity ?? table.capacityChairs ?? 4);
    return ["vacant", "available"].includes(status) && cap >= guests;
  });
  return filtered.length > 0 ? filtered : FALLBACK_TABLES;
};
function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const getFormattedPickupDate = () => {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const isValidIndianMobileNumber = (phone) => {
  const normalizedPhone = String(phone || "").trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(normalizedPhone)) return false;
  const digits = normalizedPhone.replace(/\D/g, "");
  const mobileNumber = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(mobileNumber);
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

// Deterministic dish rating helper matching mockup e.g. ★ 4.6 (128)
const getItemRating = (item) => {
  const str = String(item?.name || "Dish");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const rating = (4.5 + (positive % 5) * 0.1).toFixed(1);
  const reviews = 80 + (positive % 150);
  return { rating, reviews };
};

export function CustomerLandingPage({
  restaurantName = "Bhanu Bistro",
  restaurantLogo = "",
  menuItems = [],
  menuLoading = false,
  menuError = "",
  onHotelLogin,
  onAdminLogin,
  kitchenNotifications = [],
  onClearNotifications,
}) {
  // --- Cart & Navigation State ---
  const [cart, setCart] = useState({});
  // Customer Authentication & Profile State (Frontend-Only)
  const [customerUser, setCustomerUser] = useState(getInitialCustomer);
  const [intendedDestination, setIntendedDestination] = useState("home");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [reservationInitialStep, setReservationInitialStep] = useState(1);

  const [activeScreen, setActiveScreen] = useState(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    const user = getInitialCustomer();
    if (hash === "#auth") return "auth";
    if (hash === "#menu" || path === "/menu") return user ? "menu" : "auth";
    if (hash === "#cart") return user ? "cart" : "auth";
    if (hash === "#checkout") return user ? "checkout" : "auth";
    if (hash === "#payment") return user ? "payment" : "auth";
    if (hash === "#orders" || hash === "#my-orders" || path === "/my-orders") return user ? "orders" : "auth";
    if (hash === "#profile" || path === "/profile") return user ? "profile" : "auth";
    if (hash === "#reserve" || hash === "#my-reservations" || path === "/reserve" || path === "/my-reservations") {
      if (hash === "#my-reservations" || path === "/my-reservations") {
        setReservationInitialStep(6);
      }
      return user ? "reservation" : "auth";
    }
    return "home";
  });

  // --- Menu Filters & Category State (Matches POS Screen Template) ---
  const [orderMode, setOrderMode] = useState("kitchen"); // "kitchen" | "bar"
  const [dietaryFilter, setDietaryFilter] = useState("all"); // "all" | "veg" | "non-veg" | "special"
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // --- Checkout Details State ---
  const [pickupDate, setPickupDate] = useState(getFormattedPickupDate);
  const [pickupTime, setPickupTime] = useState("08:00 PM");
  const [customerName, setCustomerName] = useState(() => customerUser?.name || "");
  const [customerPhone, setCustomerPhone] = useState(() => customerUser?.phone || "");
  const [customerPhoneError, setCustomerPhoneError] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Sync customer details when customerUser changes
  useEffect(() => {
    if (customerUser) {
      if (customerUser.name) setCustomerName(customerUser.name);
      if (customerUser.phone) setCustomerPhone(customerUser.phone);
    }
  }, [customerUser]);

  // --- Coupon State ---
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");

  // --- Payment State ---
  const [paymentMethod, setPaymentMethod] = useState("upi"); // 'upi' | 'cash' (Matches POS Screen Payment Modes)
  const [takeawayPaymentQr, setTakeawayPaymentQr] = useState(null);
  const [processingStage, setProcessingStage] = useState(1); // 1: Initiating, 2: Processing, 3: Confirming
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const checkoutInFlightRef = useRef(false);
  const takeawayIdempotencyRef = useRef({ signature: "", key: "" });

  // --- Placed Order & Tracking State ---
  const [placedOrder, setPlacedOrder] = useState(null);
  const [trackingStage, setTrackingStage] = useState(2); // 1: Confirmed, 2: Preparing, 3: Ready for Pickup, 4: Picked Up
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // --- Table Reservation State ---
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
  const [reservationAvailability, setReservationAvailability] = useState(null);
  const [reservationTables, setReservationTables] = useState([]);
  const [reservationTableId, setReservationTableId] = useState("");
  const [reservationTableDetail, setReservationTableDetail] = useState(null);
  const [reservationAvailabilityLoading, setReservationAvailabilityLoading] = useState(false);
  const [reservationAvailabilityError, setReservationAvailabilityError] = useState("");
  const [createdReservation, setCreatedReservation] = useState(null);
  const [reservationOtpSent, setReservationOtpSent] = useState(false);
  const [reservationOtp, setReservationOtp] = useState("");
  const [reservationOtpBusy, setReservationOtpBusy] = useState(false);
  const [reservationOtpCooldown, setReservationOtpCooldown] = useState(0);
  const [reservationDevOtp, setReservationDevOtp] = useState("");
  const [reservationCustomerAuthed, setReservationCustomerAuthed] = useState(Boolean(getReservationCustomerToken()));
  const [myReservations, setMyReservations] = useState([]);
  const [reservationTab, setReservationTab] = useState("upcoming");
  const [reservationPage, setReservationPage] = useState(1);
  const [reservationTotal, setReservationTotal] = useState(0);
  const [reservationUpcomingCount, setReservationUpcomingCount] = useState(0);
  const [reservationPastCount, setReservationPastCount] = useState(0);
  const [reservationListLoading, setReservationListLoading] = useState(false);
  const [reservationListError, setReservationListError] = useState("");
  const reservationSessionExpiredRef = useRef(false);
  const [reservationAccountOpen, setReservationAccountOpen] = useState(false);
  const [selectedReservationDetails, setSelectedReservationDetails] = useState(null);
  const [reservationPaymentStatus, setReservationPaymentStatus] = useState(null);
  const [reservationActionBusy, setReservationActionBusy] = useState(false);
  const [reservationAccountMessage, setReservationAccountMessage] = useState("");
  const reservationDateRef = useRef(null);
  const reservationTimeRef = useRef(null);
  const reservationIdempotencyKeyRef = useRef("");

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const effectiveNotifications = Array.isArray(kitchenNotifications)
    ? kitchenNotifications
    : [];
  const handleClearAllNotifs = () => {
    onClearNotifications?.();
    setIsNotifOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  // Sync hash with browser history
  useEffect(() => {
    const handleHistoryNavigation = () => {
      const hash = window.location.hash;
      const user = getInitialCustomer();
      if (hash === "#menu") {
        if (user) setActiveScreen("menu");
        else {
          setIntendedDestination("menu");
          setActiveScreen("auth");
        }
      } else if (hash === "#cart") {
        if (user) setActiveScreen("cart");
        else {
          setIntendedDestination("cart");
          setActiveScreen("auth");
        }
      } else if (hash === "#checkout") {
        if (user) setActiveScreen("checkout");
        else {
          setIntendedDestination("checkout");
          setActiveScreen("auth");
        }
      } else if (hash === "#payment") {
        if (user) setActiveScreen("payment");
        else {
          setIntendedDestination("payment");
          setActiveScreen("auth");
        }
      } else if (hash === "#orders" || hash === "#my-orders") {
        if (user) setActiveScreen("orders");
        else {
          setIntendedDestination("orders");
          setActiveScreen("auth");
        }
      } else if (hash === "#profile") {
        if (user) setActiveScreen("profile");
        else {
          setIntendedDestination("profile");
          setActiveScreen("auth");
        }
      } else if (hash === "#my-reservations") {
        setReservationInitialStep(6);
        if (user) setActiveScreen("reservation");
        else {
          setIntendedDestination("reservation");
          setActiveScreen("auth");
        }
      } else if (hash === "#reserve") {
        if (user) setActiveScreen("reservation");
        else {
          setIntendedDestination("reservation");
          setActiveScreen("auth");
        }
      } else if (hash === "#admin" || hash === "#login") {
        if (typeof onHotelLogin === "function") {
          onHotelLogin();
        } else {
          window.location.href = "/admin";
        }
      } else if (hash === "#auth") {
        setActiveScreen("auth");
      } else if (hash === "#tracking") {
        setActiveScreen("tracking");
      } else if (hash === "#ready") {
        setActiveScreen("ready");
      } else if (hash === "#confirmation") {
        setActiveScreen("confirmation");
      } else {
        setActiveScreen("home");
      }
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, []);

  const navigateScreen = (screen) => {
    const targetScreen = screen === "cart" ? "menu" : screen;
    const hash =
      targetScreen === "reservation"
        ? "#reserve"
        : targetScreen === "home"
        ? "#home"
        : screen === "auth"
        ? "#auth"
        : targetScreen === "orders" || targetScreen === "my-orders"
        ? "#my-orders"
        : targetScreen === "profile"
        ? "#profile"
        : `#${screen}`;
    window.history.pushState(null, "", hash);
    setActiveScreen(targetScreen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Mandatory Authentication Guard
  const requireAuth = (targetScreen) => {
    if (customerUser) {
      if (targetScreen === "reservation") {
        setReservationInitialStep(1);
      }
      navigateScreen(targetScreen);
    } else {
      setIntendedDestination(targetScreen);
      navigateScreen("auth");
    }
  };

  // Auth Success Callback
  const handleLoginSuccess = (user, destination) => {
    reservationSessionExpiredRef.current = false;
    setCustomerUser(user);
    if (user?.token) setReservationCustomerToken(user.token);
    setReservationCustomerAuthed(Boolean(user?.token));
    if (user?.refreshToken) setCustomerRefreshToken(user.refreshToken, user.rememberMe);
    try {
      const { token, refreshToken, ...profile } = user || {};
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(profile));
    } catch (e) {}
    if (user?.name) setCustomerName(user.name);
    if (user?.phone) setCustomerPhone(user.phone);

    const dest = destination || intendedDestination || "home";
    if (dest === "reservation") {
      setReservationInitialStep(1);
    }
    navigateScreen(dest);
  };

  // Logout Handler
  const handleLogout = () => {
    const accessToken = getReservationCustomerToken();
    const refreshToken = customerUser?.refreshToken || getCustomerRefreshToken();
    if (accessToken || refreshToken) apiCustomerLogout(refreshToken, false, accessToken);
    setCustomerRefreshToken("");
    setReservationCustomerToken("");
    setReservationCheckoutToken("");
    setCustomerUser(null);
    try {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
    } catch (e) {}
    setShowProfileDropdown(false);
    navigateScreen("home");
  };

  const handleReservationSessionExpired = () => {
    if (reservationSessionExpiredRef.current) return;
    reservationSessionExpiredRef.current = true;
    setReservationCustomerAuthed(false);
    handleLogout();
    navigateScreen("auth");
  };

  // Takeaway uses the same API-backed menu items as POS Dine In.
  const combinedMenuItems = useMemo(() => {
    return Array.isArray(menuItems) ? menuItems.filter(Boolean) : [];
  }, [menuItems]);

  const takeawayCategories = useMemo(() => [
    { id: "all", label: "All Items", icon: Utensils },
    ...Array.from(new Set(combinedMenuItems.map((item) => String(item.category || "").trim()).filter(Boolean)))
      .map((categoryName) => ({ id: `category:${categoryName}`, categoryName, label: categoryName, icon: Utensils })),
  ], [combinedMenuItems]);
  const activeCategory = takeawayCategories.find((category) => category.id === selectedCategory) || takeawayCategories[0];
  const activeCategoryId = activeCategory.id;

  useEffect(() => {
    setCart((current) => {
      let changed = false;
      const next = {};
      Object.entries(current).forEach(([id, line]) => {
        const latestItem = combinedMenuItems.find((item) => String(item.id) === String(id));
        if (!latestItem || latestItem.isAvailable === false) {
          changed = true;
          return;
        }
        if (latestItem !== line.item) changed = true;
        next[id] = { ...line, item: latestItem };
      });
      return changed ? next : current;
    });
  }, [combinedMenuItems]);

  // Filtered menu items by station, category, dietary type, and search (Exact POS Template Logic)
  const visibleMenuItems = useMemo(() => {
    return combinedMenuItems.filter((item) => {
      if (activeCategoryId !== "all" && String(item.category || "").trim() !== activeCategory.categoryName) return false;

      // 3. Dietary filter
      const isVeg = item.isVeg === true || String(item.dietaryType || "").toUpperCase() === "VEG";
      if (dietaryFilter === "veg" && !isVeg) return false;
      if (dietaryFilter === "non-veg" && isVeg) return false;
      if (dietaryFilter === "special" && !item.isChefSpecial) return false;

      // 4. Search query
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesName = String(item.name || "").toLowerCase().includes(query);
        const matchesDesc = String(item.description || "").toLowerCase().includes(query);
        const matchesCategory = String(item.category || "").toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
      }

      return true;
    });
  }, [combinedMenuItems, activeCategoryId, activeCategory.categoryName, dietaryFilter, searchQuery]);

  // Cart calculations matching screenshot financial breakdown:
  // Subtotal ₹640 + Packaging Charge ₹20 + GST (5%) ₹33 = Total Amount ₹693
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, line) => sum + line.quantity, 0);
  const itemsSubtotal = cartItems.reduce(
    (sum, line) => sum + (Number(line.item.price) || 0) * line.quantity,
    0,
  );
  const packingCharges = cartItems.length > 0 ? 20.0 : 0.0;
  const taxRate = 0.05; // 5% GST
  const taxes = itemsSubtotal > 0 ? Math.round((itemsSubtotal + packingCharges) * taxRate) : 0;
  const discount = couponApplied ? couponDiscount : 0;
  const totalAmount = Math.max(0, itemsSubtotal - discount + packingCharges + taxes);

  useEffect(() => {
    if (activeScreen !== "reservation" || !reservationCustomerAuthed) return undefined;
    const timer = window.setTimeout(async () => {
      setReservationAvailabilityLoading(true);
      setReservationAvailabilityError("");
      const params = {
        date: reservationDate,
        time: reservationTime,
        guests: Number(reservationGuests),
        preference: reservationTablePreference,
        branchId: 1,
      };
      const [availabilityResult, tablesResult] = await Promise.all([
        apiCheckReservationAvailability(params),
        apiGetAvailableReservationTables(params),
      ]);
      const availability = availabilityResult?.data?.data ?? availabilityResult?.data;
      const tableData = tablesResult?.data?.data ?? tablesResult?.data;
      if (availabilityResult?.success) setReservationAvailability(availability);
      if (tablesResult?.success) {
        const rows = Array.isArray(tableData?.tables)
          ? tableData.tables
          : Array.isArray(tableData?.availableTables) ? tableData.availableTables : [];
        setReservationTables(rows);
        setReservationTableId((current) => rows.some((row) => String(row.tableId) === current)
          ? current
          : "");
      }
      if (!availabilityResult?.success || !tablesResult?.success) {
        setReservationAvailabilityError(availabilityResult?.error || tablesResult?.error || "Live availability could not be loaded.");
      }
      setReservationAvailabilityLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeScreen, reservationCustomerAuthed, reservationDate, reservationTime, reservationGuests, reservationTablePreference]);

  useEffect(() => {
    if (!reservationOtpCooldown) return undefined;
    const timer = window.setTimeout(() => setReservationOtpCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [reservationOtpCooldown]);

  const changeQuantity = (item, delta) => {
    if (delta > 0 && item?.isAvailable === false) return;
    setCart((current) => {
      const quantity = Math.max(0, (current[item.id]?.quantity || 0) + delta);
      const next = { ...current };
      if (quantity === 0) delete next[item.id];
      else next[item.id] = { item, quantity };
      return next;
    });
  };

  const handleReorderCustomerOrder = async (orderId) => {
    const result = await apiGetCustomerTakeawayOrder(orderId);
    const response = result?.data?.data ?? result?.data;
    if (!result?.success || response?.success === false) {
      const error = new Error(result?.error || response?.message || "Could not retrieve this order.");
      error.status = result?.status;
      throw error;
    }
    const orderLines = Array.isArray(response?.items) ? response.items : [];
    const nextCart = {};
    let skipped = 0;
    orderLines.forEach((line) => {
      const id = line.itemId ?? line.menuItemId;
      const menuItem = combinedMenuItems.find((item) => String(item.id) === String(id));
      const quantity = Number(line.quantity);
      if (!menuItem || menuItem.isAvailable === false || !Number.isInteger(quantity) || quantity < 1) {
        skipped += 1;
        return;
      }
      nextCart[menuItem.id] = { item: menuItem, quantity };
    });
    if (!Object.keys(nextCart).length) {
      throw new Error("None of the dishes in this order are currently available to reorder.");
    }
    setCart(nextCart);
    navigateScreen("menu");
    return skipped ? `${skipped} unavailable item(s) were left out of your cart.` : "Order items added to your cart.";
  };

  const removeFromCart = (itemId) => {
    setCart((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError("");
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (code === "BHANU10" || code === "WELCOME10") {
      const disc = Math.round(itemsSubtotal * 0.1 * 100) / 100;
      setCouponDiscount(disc);
      setCouponApplied(true);
    } else if (code === "BHANU50" || code === "SAVE50") {
      setCouponDiscount(50);
      setCouponApplied(true);
    } else {
      setCouponError("Invalid coupon code. Try BHANU10 or SAVE50.");
      setCouponApplied(false);
      setCouponDiscount(0);
    }
  };

  // Submit once at checkout confirmation. The backend creates the KOT as part of this request.
  const handleStartPayment = async () => {
    if (checkoutInFlightRef.current) return;
    setCheckoutError("");
    if (cartItems.length === 0) {
      setCheckoutError("Add at least one available dish before confirming your order.");
      return;
    }
    if (!customerName.trim() || !isValidIndianMobileNumber(customerPhone)) {
      setCheckoutError("Enter your name and a valid mobile number to place the order.");
      return;
    }

    const requestItems = cartItems.map(({ item, quantity }) => {
      const rawId = item?.menuItemId ?? item?.menu_item_id ?? item?.id;
      const itemId = Number(rawId);
      return { itemId, menuItemId: itemId, quantity: Number(quantity), notes: "" };
    });
    if (requestItems.some((item, index) => !Number.isSafeInteger(item.itemId) || item.itemId <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1 || cartItems[index].item?.isAvailable === false)) {
      setCheckoutError("One or more dishes are no longer available. Refresh the menu and try again.");
      return;
    }

    const signature = JSON.stringify({
      items: requestItems,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerUser?.email || "",
      paymentMethod,
      notes: customerNotes.trim(),
      discount,
      packingCharges,
    });
    if (takeawayIdempotencyRef.current.signature !== signature) {
      takeawayIdempotencyRef.current = {
        signature,
        key: globalThis.crypto?.randomUUID?.() || `takeaway-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    }

    checkoutInFlightRef.current = true;
    setCheckoutSubmitting(true);
    setActiveScreen("processing");
    setProcessingStage(1);
    try {
      const result = await apiCreateCustomerTakeawayOrder({
        orderType: "TAKEAWAY",
        items: requestItems,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerUser?.email || null,
        paymentMethod: paymentMethod === "cash" ? "Cash" : "UPI",
        paymentStatus: "Pending",
        isPaid: false,
        paidAmount: 0,
        discountAmount: discount,
        packagingCharge: packingCharges,
        notes: customerNotes.trim() || null,
        specialInstructions: customerNotes.trim() || null,
        idempotencyKey: takeawayIdempotencyRef.current.key,
      });
      const response = result?.data?.data ?? result?.data;
      if (!result?.success || response?.success === false) {
        throw new Error(result?.error || response?.message || "The server could not create your takeaway order.");
      }
      if (!response?.orderId || !response?.orderNumber) {
        throw new Error(response?.message || "The server response did not confirm the created order.");
      }
      const kitchenKot = response?.kitchenKot ?? response?.KitchenKot;
      const barKot = response?.barKot ?? response?.BarKot;
      if (!kitchenKot && !barKot) {
        throw new Error("The order was saved, but the server did not confirm a kitchen ticket. Retry safely; duplicate orders are prevented.");
      }

      setProcessingStage(3);
      const now = new Date(response.createdAt || Date.now());
      const orderItems = Array.isArray(response.items) ? response.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: Number(item.unitPrice) || 0,
        notes: item.notes || "",
      })) : cartItems.map(({ item, quantity }) => ({ name: item.name, quantity, price: Number(item.price) || 0 }));
      const financials = response.financials || {};
      const newOrderData = {
        id: response.orderId,
        orderId: response.orderId,
        orderNumber: response.orderNumber,
        orderType: "TAKEAWAY",
        tableName: "Takeaway",
        customerName: response.customerName || customerName.trim(),
        customerPhone: response.customerPhone || customerPhone.trim(),
        itemsCount: orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        items: orderItems,
        itemsSubtotal: Number(financials.subtotal ?? itemsSubtotal),
        packingCharges: Number(financials.packagingCharge ?? packingCharges),
        taxes: Number(financials.gstAmount ?? financials.taxAmount ?? taxes),
        discount: Number(financials.discountAmount ?? discount),
        totalAmount: Number(financials.totalAmount ?? totalAmount),
        amount: Number(financials.totalAmount ?? totalAmount),
        status: response.orderStatus || "Active",
        paymentStatus: response.paymentStatus || "Pending",
        paymentMethod: response.paymentMethod || (paymentMethod === "cash" ? "Cash" : "UPI"),
        date: now.toISOString(),
        orderTime: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        pickupDate,
        pickupTime,
        notes: customerNotes.trim(),
        kitchenKot,
        barKot,
      };

      try {
        const key = "avsr_admin_takeaway_orders_v1";
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const withoutDuplicate = Array.isArray(existing) ? existing.filter((order) => String(order.orderId ?? order.id) !== String(response.orderId)) : [];
        localStorage.setItem(key, JSON.stringify([newOrderData, ...withoutDuplicate]));
      } catch { /* The backend remains the source of truth. */ }

      setPlacedOrder(newOrderData);
      setTrackingStage(2);
      setCart({});
      takeawayIdempotencyRef.current = { signature: "", key: "" };
      navigateScreen("confirmation");
    } catch (error) {
      setCheckoutError(error?.message || "Unable to place the order. Please try again.");
      navigateScreen("payment");
    } finally {
      checkoutInFlightRef.current = false;
      setCheckoutSubmitting(false);
    }
  };

  // Table reservation handler
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

    if (!reservationAvailability?.isAvailable || !reservationTableId || reservationTables.length === 0) {
      setReservationMessage("Choose an available table after checking live availability.");
      return;
    }
    const selectedTable = reservationTables.find((table) => String(table.tableId) === reservationTableId);
    if (!selectedTable || selectedTable.isAvailableForSlot === false || (selectedTable.slotStatus && String(selectedTable.slotStatus).toLowerCase() !== "available")) {
      setReservationMessage("That table is no longer available. Please choose another table.");
      return;
    }

    setReservationSubmitting(true);
    const tableCheck = await apiGetReservationTableDetails(selectedTable.tableId, {
      date: reservationDate,
      time: reservationTime,
      guests: Number(reservationGuests),
    });
    const tableDetails = tableCheck?.data?.data ?? tableCheck?.data;
    if (!tableCheck?.success || tableDetails?.isAvailableForSlot === false) {
      setReservationSubmitting(false);
      setReservationMessage(tableCheck?.error || tableDetails?.conflictReason || "That table is no longer available. Please select another.");
      return;
    }

    if (!reservationIdempotencyKeyRef.current) {
      reservationIdempotencyKeyRef.current = globalThis.crypto?.randomUUID?.() || `reservation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    const result = await apiCreatePublicReservation({
      idempotencyKey: reservationIdempotencyKeyRef.current,
      source: "PUBLIC",
      customerName: reservationName.trim(),
      phone: reservationPhone.trim(),
      email: reservationEmail.trim() || null,
      tableId: Number(selectedTable.tableId),
      branchId: 1,
      guestsCount: Number(reservationGuests),
      reservationDate,
      reservationTime,
      seatingPreference: reservationTablePreference,
      tablePreference: reservationTablePreference,
      notes: reservationNotes.trim(),
      specialRequests: reservationNotes.trim(),
    });
    setReservationSubmitting(false);

    if (!result?.success) {
      setReservationMessage(result?.error || "We couldn't complete your reservation. Please try again.");
      return;
    }
    const reservation = result.data?.reservation ?? result.data?.data ?? result.data;
    reservationIdempotencyKeyRef.current = "";
    const reservationNumber = reservation?.reservationNumber || `RES-${reservation?.reservationId ?? ""}`;
    if (reservation?.guestToken) setReservationCheckoutToken(reservation.guestToken);
    setCreatedReservation(reservation);
    const otpResult = await apiSendReservationOtp(reservationPhone.trim());
    setReservationOtpSent(Boolean(otpResult?.success));
    setReservationOtpCooldown(otpResult?.success ? 60 : 0);
    const otpPayload = otpResult?.data?.data ?? otpResult?.data;
    setReservationDevOtp(import.meta.env.DEV && otpPayload?.devOtp ? String(otpPayload.devOtp) : "");
    setReservationAccountMessage(otpResult?.success ? "" : otpResult?.error || "Try sending the verification code again.");
    setReservationMessage(otpResult?.success
      ? `Reservation ${reservationNumber} is on hold pending advance payment. Verify your mobile number to manage it.`
      : `Reservation ${reservationNumber} was created, but we couldn't send the verification code: ${otpResult?.error || "Please try again."}`);
  };

  const handleVerifyReservationOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(reservationOtp)) {
      setReservationMessage("Enter the six-digit verification code.");
      return;
    }
    setReservationOtpBusy(true);
    const result = await apiVerifyReservationOtp(reservationPhone.trim(), reservationOtp);
    setReservationOtpBusy(false);
    if (!result?.success) {
      setReservationAccountMessage(result?.error || "The verification code could not be confirmed.");
      return;
    }
    const verified = result.data?.data ?? result.data;
    reservationSessionExpiredRef.current = false;
    if (verified?.token) setReservationCustomerToken(verified.token);
    setReservationCustomerAuthed(true);
    setReservationOtpSent(false);
    setReservationDevOtp("");
    setReservationOtp("");
    setReservationAccountOpen(true);
    await loadCustomerReservations("upcoming");
    setReservationAccountMessage(verified?.message || "Mobile number verified.");
  };

  const startReservationAccountOtp = async () => {
    if (!isValidIndianMobileNumber(reservationPhone)) {
      setReservationPhoneError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setReservationPhoneError("");
    setReservationOtpBusy(true);
    const result = await apiSendReservationOtp(reservationPhone.trim());
    setReservationOtpBusy(false);
    const payload = result?.data?.data ?? result?.data;
    setReservationOtpSent(Boolean(result?.success));
    setReservationOtpCooldown(result?.success ? 60 : 0);
    setReservationDevOtp(import.meta.env.DEV && payload?.devOtp ? String(payload.devOtp) : "");
    setReservationAccountMessage(result?.success ? "A verification code was sent to your mobile number." : result?.error || "The verification code could not be sent.");
  };

  async function loadCustomerReservations(tab = reservationTab, requestedPage = reservationPage) {
    setReservationListLoading(true);
    setReservationListError("");
    if (!getReservationCustomerToken()) {
      setReservationListLoading(false);
      handleReservationSessionExpired();
      return false;
    }
    const result = await apiGetCustomerReservations({ tab, page: requestedPage, pageSize: 20 });
    const payload = result?.data?.data ?? result?.data;
    if (!result?.success || payload?.success === false) {
      const message = result?.error || payload?.message || "Your reservations could not be loaded.";
      setReservationListError(message);
      setReservationAccountMessage(message);
      setReservationListLoading(false);
      if (result?.status === 401 || result?.status === 403) handleReservationSessionExpired();
      return false;
    }
    setMyReservations(Array.isArray(payload?.items) ? payload.items : []);
    setReservationTotal(Number(payload?.total) || 0);
    setReservationUpcomingCount(Number(payload?.upcomingCount) || 0);
    setReservationPastCount(Number(payload?.pastAndCancelledCount) || 0);
    setReservationTab(tab);
    setReservationPage(requestedPage);
    setReservationListLoading(false);
    return true;
  }

  useEffect(() => {
    if (activeScreen === "reservation" && reservationCustomerAuthed) {
      setReservationAccountOpen(true);
      setReservationTab("upcoming");
      setReservationPage(1);
      loadCustomerReservations("upcoming", 1);
    }
  }, [activeScreen, reservationCustomerAuthed]);

  useEffect(() => {
    if (activeScreen !== "reservation") return;
    if (!getReservationCustomerToken()) {
      handleReservationSessionExpired();
      return;
    }
    let cancelled = false;
    apiGetCustomerProfile().then((result) => {
      if (cancelled) return;
      const response = result?.data?.data ?? result?.data;
      if (!result?.success || response?.success === false) {
        if (result?.status === 401 || result?.status === 403) handleReservationSessionExpired();
        else setReservationListError(result?.error || response?.message || "Customer profile could not be loaded.");
        return;
      }
      const profile = response?.data ?? response;
      if (!profile) return;
      setCustomerUser((current) => ({
        ...current,
        name: profile.fullName,
        phone: profile.mobileNumber || profile.phone,
        email: profile.email || current?.email || "",
      }));
    }).catch((error) => {
      if (!cancelled) setReservationListError(error?.message || "Customer profile could not be loaded.");
    });
    return () => { cancelled = true; };
  }, [activeScreen]);

  const openCustomerReservation = async (reservation) => {
    setReservationActionBusy(true);
    const id = reservation.reservationId || reservation.reservationNumber;
    const detailsResult = await apiGetReservationDetails(id, getReservationCustomerToken());
    setReservationActionBusy(false);
    if (!detailsResult?.success) {
      if (detailsResult?.status === 401 || detailsResult?.status === 403) handleReservationSessionExpired();
      throw new Error(detailsResult?.error || "Reservation details could not be loaded.");
    }
    const details = detailsResult.data?.data ?? detailsResult.data;
    setSelectedReservationDetails(details);
    if (details?.reservationDate) setReservationDate(String(details.reservationDate).slice(0, 10));
    if (details?.reservationTime) setReservationTime(String(details.reservationTime).slice(0, 5));
    if (details?.guestsCount) setReservationGuests(Number(details.guestsCount));
    if (details?.seatingPreference) setReservationTablePreference(details.seatingPreference);
    if (details?.notes) setReservationNotes(details.notes);
    if (details?.tableId) setReservationTableId(String(details.tableId));
    return details;
  };

  const cancelCustomerReservation = async (reservation) => {
    const id = reservation.reservationId || reservation.reservationNumber;
    setReservationActionBusy(true);
    const result = await apiCancelCustomerReservation(id, { cancellationReason: "Cancelled by customer" });
    setReservationActionBusy(false);
    if (!result?.success) {
      if (result?.status === 401 || result?.status === 403) handleReservationSessionExpired();
      throw new Error(result?.error || "Reservation cancellation failed.");
    }
    const response = result.data?.data ?? result.data;
    setReservationAccountMessage(`${response?.message || "Reservation cancelled."} Refund: ${formatPrice(response?.refundAmount)} (${response?.refundStatus || "status unavailable"}).`);
    setSelectedReservationDetails(response?.reservation || null);
    await loadCustomerReservations(reservationTab, reservationPage);
    return response;
  };

  const inspectReservationTable = async (table) => {
    setReservationTableDetail(null);
    const result = await apiGetReservationTableDetails(table.tableId, {
      date: reservationDate,
      time: reservationTime,
      guests: Number(reservationGuests),
    });
    if (!result?.success) {
      setReservationAvailabilityError(result?.error || "Table details could not be loaded.");
      return;
    }
    const details = result.data?.data ?? result.data;
    setReservationTableDetail(details);
    if (details?.isAvailableForSlot) setReservationTableId(String(details.tableId));
  };

  const saveReservationChanges = async (draft = selectedReservationDetails) => {
    if (!draft) throw new Error("Select a reservation before saving changes.");
    const tableId = draft.tableId || selectedReservationDetails?.tableId;
    setReservationActionBusy(true);
    const result = await apiModifyReservation(draft.reservationId || draft.reservationNumber, {
      reservationDate: draft.date,
      reservationTime: draft.time,
      guestsCount: Number(draft.guests),
      tableId: Number(tableId),
      seatingPreference: draft.seatingPreference || selectedReservationDetails?.seatingPreference,
      specialRequests: String(draft.specialRequests || "").trim(),
    });
    setReservationActionBusy(false);
    if (!result?.success) {
      if (result?.status === 401 || result?.status === 403) handleReservationSessionExpired();
      throw new Error(result?.error || "Reservation changes could not be saved.");
    }
    const updated = result.data?.data ?? result.data;
    setSelectedReservationDetails(updated?.reservation ?? updated);
    setReservationAccountMessage(updated?.message || "Reservation updated.");
    await loadCustomerReservations(reservationTab, reservationPage);
    return updated;
  };

  // Format data for standard POS ReceiptModal
  const receiptTableData = useMemo(() => {
    if (!placedOrder) return null;
    const items = (Array.isArray(placedOrder.items) ? placedOrder.items : []).map((it) => ({
      name: it.name,
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
    }));
    const subtotal = Number(placedOrder.itemsSubtotal || items.reduce((s, it) => s + it.price * it.quantity, 0));
    const taxAmount = Number(placedOrder.taxes || Math.round(subtotal * 0.05 * 100) / 100);
    const packing = Number(placedOrder.packingCharges || 20);
    const grandTotal = Number(placedOrder.totalAmount || subtotal + taxAmount + packing);

    return {
      id: placedOrder.id || placedOrder.orderNumber,
      invoiceNo: placedOrder.orderNumber,
      name: "Takeaway",
      tableName: "Takeaway",
      section: "Takeaway",
      server: "Online Takeaway",
      guests: 1,
      date: placedOrder.date || new Date().toISOString(),
      orderTime: placedOrder.orderTime || new Date().toLocaleTimeString(),
      status: "Completed",
      isPaid: true,
      settled: true,
      settledAt: placedOrder.date || new Date().toISOString(),
      paymentMethod: (placedOrder.paymentMethod || "UPI").toUpperCase(),
      customer: placedOrder.customerName || "Customer",
      customerPhone: placedOrder.customerPhone || "",
      items,
      subtotal,
      taxAmount,
      serviceCharge: 0,
      serviceChargeAmount: packing,
      grandTotal,
    };
  }, [placedOrder]);

  return (
    <div className={`customer-site customer-screen-${activeScreen}`}>
      {/* ── Global Header ─────────────────────────────────── */}
      {activeScreen !== "reservation" &&
        activeScreen !== "auth" &&
        activeScreen !== "orders" &&
        activeScreen !== "my-orders" &&
        activeScreen !== "profile" && (
        <header className={`customer-header ${activeScreen === "menu" ? "is-takeaway-header" : ""}`}>
          <a
            className="customer-brand"
            href="#home"
            aria-label={`${restaurantName} home`}
            onClick={(event) => {
              event.preventDefault();
              navigateScreen("home");
            }}
          >
            {restaurantLogo ? (
              <img className="customer-brand-logo" src={restaurantLogo} alt="" />
            ) : (
              <span className="customer-brand-mark">
                <ChefHat size={25} />
              </span>
            )}
            <span>
              <strong>{restaurantName}</strong>
              <small>{activeScreen === "menu" ? "Takeaway Ordering" : "Fine Dining & Takeaway"}</small>
            </span>
          </a>

          {/* Center Pill: Takeaway Only (Matches Mockup) */}
          {activeScreen === "menu" && (
            <div className="takeaway-header-center-pill">
              <ShoppingBag size={15} color="#f59e0b" />
              <span>Takeaway Only</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            {/* Kitchen Cooking Status Notification Bell (Matches POS Header) */}
            {activeScreen !== "home" && activeScreen !== "reservation" && activeScreen !== "auth" && (
              <div className="takeaway-header-notif-wrap" ref={notifRef}>
                <button
                  type="button"
                  className={`takeaway-header-notif-btn ${effectiveNotifications.length > 0 ? "has-alerts" : ""}`}
                  aria-label={`Kitchen status updates${effectiveNotifications.length ? `, ${effectiveNotifications.length} updates` : ""}`}
                  aria-expanded={isNotifOpen}
                  aria-haspopup="true"
                  title="Kitchen Cooking Status Updates"
                  onClick={() => setIsNotifOpen((open) => !open)}
                >
                  {Array.isArray(effectiveNotifications) && effectiveNotifications.some(
                    (n) => n.type === "cooking_completed"
                  ) ? (
                    <BellRing size={16} className="takeaway-bell-ring-active" />
                  ) : (
                    <Bell size={16} />
                  )}
                  {Array.isArray(effectiveNotifications) && effectiveNotifications.length > 0 && (
                    <span className="takeaway-notif-badge">
                      {effectiveNotifications.length > 9 ? "9+" : effectiveNotifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {isNotifOpen && (
                  <div className="takeaway-notif-panel" role="dialog" aria-label="Kitchen Status Notifications">
                    <div className="takeaway-notif-header">
                      <div className="takeaway-notif-header-title">
                        <Bell size={14} color="#f59e0b" />
                        <span>Kitchen Status Updates</span>
                        {effectiveNotifications.length > 0 && (
                          <span className="takeaway-notif-count-tag">
                            {effectiveNotifications.length}
                          </span>
                        )}
                      </div>
                      {effectiveNotifications.length > 0 && (
                        <button
                          type="button"
                          className="takeaway-notif-clear-btn"
                          title="Clear all updates"
                          onClick={handleClearAllNotifs}
                        >
                          <Trash2 size={12} />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    {effectiveNotifications.length === 0 ? (
                      <div className="takeaway-notif-empty">
                        <span style={{ fontSize: "1.4rem", display: "block", marginBottom: "4px" }}>📭</span>
                        <p>No kitchen status updates yet.</p>
                      </div>
                    ) : (
                      <div className="takeaway-notif-list">
                        {effectiveNotifications.map((notification, index) => {
                          const isCompleted = notification.type === "cooking_completed";
                          return (
                            <div
                              key={notification.id || index}
                              className={`takeaway-notif-item ${isCompleted ? "is-ready" : ""}`}
                            >
                              <div className={`takeaway-notif-icon-circle ${isCompleted ? "is-ready" : ""}`}>
                                {isCompleted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                              </div>
                              <div className="takeaway-notif-item-body">
                                <div className="takeaway-notif-item-top">
                                  <strong>{getCleanAlertTitle(notification)}</strong>
                                  <span>{getCleanAlertTimestamp(notification)}</span>
                                </div>
                                <p>{getCleanAlertMessage(notification)}</p>
                                {notification.tableId && (
                                  <small className="takeaway-notification-table">
                                    <MapPin size={10} />
                                    {cleanNotificationText(notification.tableName) || `Table ${notification.tableId}`}
                                  </small>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Redesigned Modern Cart Pill Button */}
            {activeScreen !== "home" && activeScreen !== "reservation" && activeScreen !== "auth" && (
              <button
                type="button"
                className={`takeaway-header-cart-btn ${cartCount > 0 ? "has-items" : ""}`}
                onClick={() => {
                  if (activeScreen === "menu") {
                    const el = document.getElementById("takeaway-order-sidebar");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  } else {
                    navigateScreen("menu");
                  }
                }}
                title={cartCount > 0 ? `Your Cart: ${cartCount} item${cartCount === 1 ? "" : "s"} (${formatPrice(totalAmount)})` : "Your Cart is Empty"}
              >
                <div className="takeaway-cart-btn-icon-wrapper">
                  <ConciergeBell size={17} />
                  {cartCount > 0 && (
                    <span className="takeaway-cart-count-badge">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </div>
              </button>
            )}

            {/* Hotel / Admin Login Button */}
            {!customerUser ? (
              <button
                className="customer-login-pill-btn"
                type="button"
                onClick={() => {
                  if (typeof onHotelLogin === "function") {
                    onHotelLogin();
                  } else if (typeof onAdminLogin === "function") {
                    onAdminLogin();
                  } else {
                    window.location.href = "/admin";
                  }
                }}
                title="Login"
              >
                <UserRound size={16} />
                <span>Login</span>
              </button>
            ) : (
              <div className="customer-profile-menu-container" style={{ position: "relative" }}>
                <button
                  className="customer-profile-pill-btn"
                  type="button"
                  onClick={() => setShowProfileDropdown((prev) => !prev)}
                >
                  <div className="customer-avatar-badge">
                    {(customerUser.name || "Priya")[0].toUpperCase()}
                  </div>
                  <span className="customer-profile-name">
                    {customerUser.name || ""}
                  </span>
                  <ChevronDown size={14} />
                </button>

                {showProfileDropdown && (
                  <div className="customer-profile-dropdown-menu">
                    <div className="customer-profile-dropdown-header">
                      <div className="customer-dropdown-avatar">
                        {(customerUser.name || "Priya")[0].toUpperCase()}
                      </div>
                      <div>
                        <strong>{customerUser.name || ""}</strong>
                        <small>{customerUser.phone || customerUser.email || "+91 98765 43210"}</small>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="customer-profile-menu-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigateScreen("orders");
                      }}
                    >
                      <ShoppingBag size={17} color="#d4c5b9" />
                      <span style={{ fontSize: "15px" }}>📋</span>
                      <span>My Orders</span>
                    </button>

                    <button
                      type="button"
                      className="customer-profile-menu-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setReservationInitialStep(6);
                        navigateScreen("reservation");
                      }}
                    >
                      <CalendarDays size={17} color="#d4c5b9" />
                      <span style={{ fontSize: "15px" }}>📅</span>
                      <span>My Reservations</span>
                    </button>

                    <button
                      type="button"
                      className="customer-profile-menu-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigateScreen("profile");
                      }}
                    >
                      <User size={17} color="#d4c5b9" />
                      <span style={{ fontSize: "15px" }}>👤</span>
                      <span>My Profile</span>
                    </button>

                    <div className="customer-profile-dropdown-divider" />

                    <button
                      type="button"
                      className="customer-profile-menu-item is-logout"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} />
                      <span>🚪 Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      <main>
        {/* ========================================================= */}
        {/* STEP 1: Takeaway Home (Landing Page)                     */}
        {/* ========================================================= */}
        {activeScreen === "home" && (
          <section className="customer-hero" id="home">
            <div className="customer-hero-content">
              <h1>
                Welcome to <span>{restaurantName}</span>
              </h1>
              <p className="customer-hero-links">
                <a
                  href="#menu"
                  onClick={(event) => {
                    event.preventDefault();
                    requireAuth("menu");
                  }}
                >
                  Order Takeaway
                </a>
                <i aria-hidden="true">|</i>
                <button
                  type="button"
                  onClick={() => requireAuth("reservation")}
                >
                  Reserve Your Table
                </button>
              </p>
            </div>

            <div className="customer-action-grid">
              <article className="customer-action-card takeaway-action">
                <div className="customer-action-copy">
                  <span className="customer-action-icon takeaway-icon">
                    <ShoppingBag size={20} />
                  </span>
                  <h2>Order Takeaway Online</h2>
                  <p>Browse our menu, place your order and pick it up at your convenience.</p>
                  <button
                    className="customer-action-button takeaway-button"
                    type="button"
                    onClick={() => requireAuth("menu")}
                  >
                    Order Takeaway <ArrowRight size={15} />
                  </button>
                </div>
              </article>

              <article className="customer-action-card reservation-action">
                <div className="customer-action-copy">
                  <span className="customer-action-icon reservation-icon">
                    <CalendarDays size={20} />
                  </span>
                  <h2>Reserve a Table</h2>
                  <p>Book your table in advance and enjoy a great dining experience.</p>
                  <button
                    className="customer-action-button reservation-button"
                    type="button"
                    onClick={() => requireAuth("reservation")}
                  >
                    Reserve Table <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            </div>

            {/* Bottom 4-features strip */}
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

        {/* ========================================================= */}
        {/* STEP 2: Browse Menu & Cart - POS Template (Sidebar + Grid + Slip) */}
        {/* ========================================================= */}
        {(activeScreen === "menu" || activeScreen === "cart") && (
          <div className="pos-takeaway-app" id="menu">
            {/* Top Table Switcher / Counter Strip (matches POS screen sub-strip) */}
            <div className="pos-takeaway-substrip">
              <div className="pos-takeaway-substrip-left">
                <button
                  type="button"
                  className="pos-takeaway-back-btn"
                  onClick={() => navigateScreen("home")}
                >
                  <ArrowLeft size={14} /> Back to Home
                </button>
                <div className="pos-takeaway-status-tag">
                  <span className="pos-status-indicator" />
                  <strong>Takeaway Counter</strong>
                  <span className="pos-tag-label">ORDERING</span>
                </div>
              </div>

              <div className="pos-takeaway-substrip-right">
                <div className="pos-takeaway-info-chip">
                  <Clock size={13} color="var(--accent-amber)" />
                  <span>Est. Prep: 15–20 Mins</span>
                </div>
                <div className="pos-takeaway-info-chip is-highlight">
                  <ShoppingBag size={13} />
                  <span>{cartCount} item{cartCount === 1 ? "" : "s"}</span>
                  <span className="pos-chip-sep">•</span>
                  <strong className="font-mono">{formatPrice(totalAmount)}</strong>
                </div>
              </div>
            </div>

            {/* 3-Panel Main Workspace (Full viewport height, exact POS template) */}
            <div className="pos-takeaway-workspace">
              {/* ── Left Sidebar: Categories Navigation ── */}
              <aside className="pos-takeaway-sidebar" aria-label="Menu Categories">
                <div className="pos-takeaway-sidebar-header">
                  <h4>CATEGORIES</h4>
                </div>
                <div className="pos-takeaway-categories-list">
                  {takeawayCategories.map((cat) => {
                    const IconComp = cat.icon || Utensils;
                    const isSelected = activeCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`pos-takeaway-cat-btn ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          if (cat.id === "beverages") setOrderMode("bar");
                          else if (orderMode === "bar" && cat.id !== "all") setOrderMode("kitchen");
                        }}
                      >
                        <IconComp size={16} className="pos-cat-icon" />
                        <span className="pos-cat-label">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* ── Center Area: Interactive Menu Catalog ── */}
              <div className="pos-takeaway-center">
                {/* Catalog Controls Bar */}
                <div className="pos-takeaway-controls-bar">
                  {/* Station Toggle */}
                  <div className="pos-station-group">
                    <button
                      type="button"
                      className={`pos-station-btn ${orderMode === "kitchen" ? "is-active" : ""}`}
                      onClick={() => {
                        setOrderMode("kitchen");
                        if (selectedCategory === "beverages") setSelectedCategory("all");
                      }}
                    >
                      <ChefHat size={14} />
                      <span>Kitchen / Food</span>
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="pos-search-box">
                    <Search size={15} className="pos-search-icon" />
                    <input
                      type="text"
                      placeholder="Search dishes by name, description, or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="pos-search-clear-btn"
                        onClick={() => setSearchQuery("")}
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Categories Filter Dropdown (Matches Template Controls) */}
                  <div className="pos-category-select-wrapper">
                    <Utensils size={14} className="pos-category-select-icon" />
                    <select
                      className="pos-category-select"
                      value={activeCategoryId}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      aria-label="Filter by category"
                    >
                      {takeawayCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dietary Filter Buttons: Veg, Non-Veg, Specials */}
                  <div className="pos-dietary-group">
                    <button
                      type="button"
                      className={`pos-dietary-btn ${dietaryFilter === "veg" ? "is-active" : ""}`}
                      onClick={() => setDietaryFilter(dietaryFilter === "veg" ? "all" : "veg")}
                    >
                      <Circle size={13} fill="#16a34a" color="#16a34a" />
                      <span>Veg</span>
                    </button>
                    <button
                      type="button"
                      className={`pos-dietary-btn ${dietaryFilter === "non-veg" ? "is-active" : ""}`}
                      onClick={() => setDietaryFilter(dietaryFilter === "non-veg" ? "all" : "non-veg")}
                    >
                      <Circle size={13} fill="#dc2626" color="#dc2626" />
                      <span>Non-Veg</span>
                    </button>
                    <button
                      type="button"
                      className={`pos-dietary-btn ${dietaryFilter === "special" ? "is-active" : ""}`}
                      onClick={() => setDietaryFilter(dietaryFilter === "special" ? "all" : "special")}
                    >
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                      <span>Specials</span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Quick Category Filter Strip */}
                <div className="pos-takeaway-category-strip">
                  {takeawayCategories.map((cat) => {
                    const IconComp = cat.icon || Utensils;
                    const isSelected = activeCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`pos-category-strip-btn ${isSelected ? "is-active" : ""}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        <IconComp size={13} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Compact POS Menu Grid */}
                <div className="pos-takeaway-grid">
                  {menuLoading ? (
                    <div className="pos-takeaway-empty" role="status">
                      <h4>Loading menu…</h4>
                    </div>
                  ) : menuError ? (
                    <div className="pos-takeaway-empty" role="alert">
                      <h4>Menu unavailable</h4>
                      <p>{menuError}</p>
                    </div>
                  ) : visibleMenuItems.length === 0 ? (
                    <div className="pos-takeaway-empty">
                      <Flame size={40} color="var(--accent-amber)" />
                      <h4>{combinedMenuItems.length === 0 ? "No dishes available" : "No dishes found"}</h4>
                      <p>{combinedMenuItems.length === 0 ? "No dishes were returned by the menu API." : "Try searching with another keyword or resetting the category filter."}</p>
                      {combinedMenuItems.length > 0 && (
                        <button
                          type="button"
                          className="pos-takeaway-empty-reset"
                          onClick={() => {
                            setSelectedCategory("all");
                            setSearchQuery("");
                            setDietaryFilter("all");
                          }}
                        >
                          Show All Dishes
                        </button>
                      )}
                    </div>
                  ) : (
                    visibleMenuItems.map((item) => {
                      const qty = cart[item.id]?.quantity || 0;
                      const isVeg = item.isVeg || item.dietaryType === "VEG";
                      const isAvailable = item.isAvailable !== false;
                      return (
                        <article
                          key={item.id}
                          className={`pos-takeaway-card ${qty > 0 ? "has-qty" : ""}`}
                        >
                          {/* Image Box */}
                          <div className="pos-takeaway-card-image">
                            <img
                              src={item.image || getMenuItemImage(item)}
                              alt={item.name}
                              loading="lazy"
                              onError={(e) => handleDishImageError(e, item)}
                            />

                            {/* Veg / Non-Veg Indicator Badge */}
                            <div className="pos-takeaway-badge">
                              <span
                                className="pos-badge-dot"
                                style={{ background: isVeg ? "#10b981" : "#ef4444" }}
                              />
                              <span>{isVeg ? "VEG" : "NON-VEG"}</span>
                            </div>

                            {/* Prep Time Badge */}
                            <div className="pos-takeaway-time">
                              <Clock size={10} />
                              <span>{item.prepTime || "—"}</span>
                            </div>
                          </div>

                          {/* Body Content */}
                          <div className="pos-takeaway-card-body">
                            <div className="pos-takeaway-card-title-row">
                              <h4 className="pos-takeaway-card-title" title={item.name}>
                                {item.name}
                              </h4>
                              {item.isChefSpecial && (
                                <Star size={13} fill="#f59e0b" color="#f59e0b" title="Chef special" aria-label="Chef special" />
                              )}
                              {item.spiceLevel > 0 && (
                                <div className="pos-takeaway-spices" title={`Spicy Level: ${item.spiceLevel}`}>
                                  {[...Array(item.spiceLevel)].map((_, i) => (
                                    <Flame key={i} size={11} fill="#ef4444" color="#ef4444" />
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="pos-takeaway-card-desc">{item.description}</p>
                          </div>

                          {/* Footer Actions */}
                          <div className="pos-takeaway-card-footer">
                            <span className="font-mono pos-takeaway-card-price">
                              {formatPrice(item.price)}
                            </span>

                            {qty === 0 ? (
                              <button
                                type="button"
                                className="pos-takeaway-add-btn"
                                disabled={!isAvailable}
                                onClick={() => changeQuantity(item, 1)}
                                title={isAvailable ? "Add to Order" : "Currently unavailable"}
                              >
                                {isAvailable ? <><Plus size={12} /><span>Add</span></> : <span>Unavailable</span>}
                              </button>
                            ) : (
                              <div className="pos-takeaway-qty-stepper">
                                <button
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() => changeQuantity(item, -1)}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="font-mono pos-takeaway-qty-count">{qty}</span>
                                <button
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() => changeQuantity(item, 1)}
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Right Sidebar: Takeaway Order Slip (Live Cart) ── */}
              <aside className="pos-takeaway-slip-sidebar" id="takeaway-order-sidebar">
                {/* Header */}
                <div className="pos-slip-header">
                  <div className="pos-slip-header-title">
                    <div className="pos-slip-title-row">
                      <Receipt size={15} color="var(--accent-amber)" />
                      <h3>Takeaway — Order Slip</h3>
                    </div>
                    <div className="pos-slip-subtext">
                      <span>{cartCount} item{cartCount === 1 ? "" : "s"}</span>
                      <span>•</span>
                      <span className="pos-slip-time">
                        <Clock size={10} color="var(--accent-amber)" />
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <div className="pos-slip-tag">#TK-101</div>
                </div>

                {/* Takeaway Info Notice Banner */}
                <div className="pos-slip-notice-box">
                  <div className="pos-slip-notice-icon">🛍️</div>
                  <div>
                    <div className="pos-slip-notice-heading">TAKEAWAY ORDER</div>
                    <div className="pos-slip-notice-sub">Dishes freshly packed for counter pickup</div>
                  </div>
                </div>

                {/* Ordered Items List */}
                <div className="pos-slip-items-list">
                  {cartItems.length === 0 ? (
                    <div className="pos-slip-empty">
                      <ShoppingBag size={34} color="var(--text-dim)" />
                      <h5>Your order slip is empty</h5>
                      <p>Click <strong>+ Add</strong> on dishes to build your takeaway order.</p>
                    </div>
                  ) : (
                    cartItems.map(({ item, quantity }) => (
                      <div key={item.id} className="pos-slip-item-card">
                        <div className="pos-slip-item-top">
                          <div className="pos-slip-item-title-group">
                            <span className="pos-slip-item-name">{item.name}</span>
                            <span
                              className={`pos-slip-item-station ${
                                item.station === "bar" ? "is-bar" : "is-kitchen"
                              }`}
                            >
                              {item.station === "bar" ? "Bar" : "Kitchen"}
                            </span>
                          </div>
                          <span className="font-mono pos-slip-item-total">
                            {formatPrice((Number(item.price) || 0) * quantity)}
                          </span>
                        </div>

                        <div className="pos-slip-item-bottom">
                          <span className="font-mono pos-slip-item-rate">
                            {formatPrice(item.price)} × {quantity}
                          </span>

                          <div className="pos-slip-item-actions">
                            <div className="pos-slip-stepper">
                              <button
                                type="button"
                                onClick={() => changeQuantity(item, -1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="font-mono pos-slip-stepper-val">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => changeQuantity(item, 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            <button
                              type="button"
                              className="pos-slip-remove-btn"
                              onClick={() => removeFromCart(item.id)}
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Financial Summary & Checkout Action */}
                <div className="pos-slip-financials">
                  <div className="pos-slip-fin-row">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatPrice(itemsSubtotal)}</span>
                  </div>
                  <div className="pos-slip-fin-row">
                    <span>Packaging Charge</span>
                    <span className="font-mono">{formatPrice(packingCharges)}</span>
                  </div>
                  <div className="pos-slip-fin-row">
                    <span>GST (5%)</span>
                    <span className="font-mono">{formatPrice(taxes)}</span>
                  </div>
                  {couponApplied && (
                    <div className="pos-slip-fin-row is-discount">
                      <span>Discount (Coupon)</span>
                      <span className="font-mono">-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}

                  <div className="pos-slip-total-row">
                    <span className="pos-slip-total-label">TOTAL</span>
                    <span className="font-mono pos-slip-total-amount">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>

                  {/* Proceed to Checkout CTA Button */}
                  <button
                    type="button"
                    className="pos-slip-checkout-btn"
                    disabled={cartCount === 0}
                    onClick={() => navigateScreen("checkout")}
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}



        {/* ========================================================= */}
        {/* STEP 4: Checkout Details - Add pickup time & contact     */}
        {/* ========================================================= */}
        {activeScreen === "checkout" && (
          <section className="customer-flow-section" id="checkout">
            <div className="customer-flow-topbar">
              <button
                className="customer-back-btn"
                type="button"
                onClick={() => navigateScreen("menu")}
              >
                <ArrowLeft size={16} /> Back to Cart
              </button>
            </div>

            <div className="customer-two-column-layout">
              {/* Left Column: Form Details */}
              <div className="customer-layout-main">
                <div className="customer-card-box">
                  <div className="customer-card-header">
                    <MapPin size={20} color="#ea580c" />
                    <h2>Checkout</h2>
                  </div>

                  {/* Section 1: Pickup Details */}
                  <div className="customer-form-section">
                    <div className="customer-form-section-title">
                      <MapPin size={17} color="#ea580c" />
                      <span>Pickup Details</span>
                    </div>

                    <div className="customer-checkout-grid">
                      <div className="customer-field-group">
                        <label>Pickup Date <span style={{ color: "#ea580c" }}>*</span></label>
                        <div className="customer-field-control">
                          <CalendarDays size={16} />
                          <input
                            type="text"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            placeholder="e.g. Wed, 11 Nov 2026"
                          />
                        </div>
                      </div>

                      <div className="customer-field-group">
                        <label>Pickup Time <span style={{ color: "#ea580c" }}>*</span></label>
                        <div className="customer-field-control">
                          <Clock3 size={16} />
                          <select
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                          >
                            <option value="In 20 mins (ASAP)">In 20 mins (ASAP)</option>
                            <option value="In 30 mins">In 30 mins</option>
                            <option value="In 45 mins">In 45 mins</option>
                            <option value="07:30 PM">07:30 PM</option>
                            <option value="08:00 PM">08:00 PM</option>
                            <option value="08:30 PM">08:30 PM</option>
                            <option value="09:00 PM">09:00 PM</option>
                            <option value="09:30 PM">09:30 PM</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Your Details */}
                  <div className="customer-form-section" style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.2rem" }}>
                    <div className="customer-form-section-title">
                      <UserRound size={17} color="#ea580c" />
                      <span>Your Details</span>
                    </div>

                    <div className="customer-checkout-grid">
                      <div className="customer-field-group">
                        <label>Full Name <span style={{ color: "#ea580c" }}>*</span></label>
                        <div className="customer-field-control">
                          <UserRound size={16} />
                          <input
                            type="text"
                            required
                            placeholder="Your name"
                            value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setCheckoutError(""); }}
                          />
                        </div>
                      </div>

                      <div className="customer-field-group">
                        <label>Mobile Number <span style={{ color: "#ea580c" }}>*</span></label>
                        <div className="customer-field-control">
                          <Phone size={16} />
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +91 98765 43210"
                            value={customerPhone}
                            onChange={(e) => {
                              setCustomerPhone(e.target.value);
                              setCustomerPhoneError("");
                              setCheckoutError("");
                            }}
                          />
                        </div>
                        {customerPhoneError && (
                          <span style={{ fontSize: "0.76rem", color: "#dc2626", marginTop: "3px" }}>
                            {customerPhoneError}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="customer-field-group" style={{ marginTop: "1rem" }}>
                      <label>Special Instructions (Optional)</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Extra spicy, pack gravy separately"
                        value={customerNotes}
                        onChange={(e) => { setCustomerNotes(e.target.value); setCheckoutError(""); }}
                        className="customer-field-textarea"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="customer-layout-sidebar">
                <div className="customer-card-box customer-summary-card">
                  <h3>Order Summary</h3>
                  <div className="customer-summary-lines">
                    <div className="customer-summary-line">
                      <span>Items ({cartCount})</span>
                      <span>{formatPrice(itemsSubtotal)}</span>
                    </div>
                    <div className="customer-summary-line">
                      <span>Packing Charges</span>
                      <span>{formatPrice(packingCharges)}</span>
                    </div>
                    <div className="customer-summary-line">
                      <span>Taxes (5%)</span>
                      <span>{formatPrice(taxes)}</span>
                    </div>
                    {couponApplied && (
                      <div className="customer-summary-line" style={{ color: "#16a34a", fontWeight: 700 }}>
                        <span>Discount</span>
                        <span>-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="customer-summary-divider" />
                    <div className="customer-summary-total">
                      <strong>Total Amount</strong>
                      <strong>{formatPrice(totalAmount)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="customer-proceed-cta-btn"
                    onClick={() => {
                      if (!customerName.trim()) {
                        alert("Please enter your name");
                        return;
                      }
                      navigateScreen("payment");
                    }}
                  >
                    Continue to Payment <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STEP 5: Payment - Choose a payment method                 */}
        {/* ========================================================= */}
        {activeScreen === "payment" && (
          <section className="customer-flow-section" id="payment">
            <div className="customer-flow-topbar">
              <button
                className="customer-back-btn"
                type="button"
                onClick={() => navigateScreen("checkout")}
              >
                <ArrowLeft size={14} /> Back to Checkout Details
              </button>
            </div>

            <div className="customer-two-column-layout">
              {/* Left Column: Payment Methods (UPI & Cash Tender Only - Matching POS Screen) */}
              <div className="customer-layout-main">
                <div className="customer-card-box">
                  <div className="customer-card-header">
                    <Receipt size={17} color="#ea580c" />
                    <h2>Select Payment Method</h2>
                  </div>

                  <div className="customer-payment-options-list">
                    {/* Option 1: UPI */}
                    <label
                      className={`customer-payment-option-card ${paymentMethod === "upi" ? "is-selected" : ""}`}
                      onClick={() => setPaymentMethod("upi")}
                    >
                      <div className="customer-payment-badge">UPI</div>
                      <div className="customer-payment-option-info">
                        <strong>UPI Payment</strong>
                        <small>Google Pay, PhonePe, Paytm, BHIM UPI</small>
                      </div>
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === "upi"}
                        onChange={() => setPaymentMethod("upi")}
                      />
                    </label>

                    {/* Option 2: Cash Tender (Matching POS Screen Settlement) */}
                    <label
                      className={`customer-payment-option-card ${paymentMethod === "cash" ? "is-selected" : ""}`}
                      onClick={() => setPaymentMethod("cash")}
                    >
                      <div className="customer-payment-badge is-cash">CASH</div>
                      <div className="customer-payment-option-info">
                        <strong>Cash Tender</strong>
                        <small>Pay with cash at counter upon pickup</small>
                      </div>
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                      />
                    </label>
                  </div>

                  {/* Cash Tender / UPI Details Notice Box */}
                  {paymentMethod === "cash" ? (
                    <div className="customer-cash-tender-notice">
                      <div className="customer-cash-tender-header">
                        <Receipt size={14} color="#059669" />
                        <span>Cash Tendered at Pickup Counter: <strong>{formatPrice(totalAmount)}</strong></span>
                      </div>
                      <p>Please keep exact cash ready at the takeaway billing counter for speedy parcel handover.</p>
                    </div>
                  ) : (
                    <div className="customer-cash-tender-notice is-upi">
                      <div className="customer-cash-tender-header">
                        <Smartphone size={14} color="#ea580c" />
                        <span>UPI Fast Pay: <strong>{formatPrice(totalAmount)}</strong></span>
                      </div>
                      <p>Instant UPI payment confirmation with digital tax invoice receipt.</p>
                    </div>
                  )}

                  {paymentMethod === "upi" && (
                    <div className="customer-takeaway-upi-qr">
                      {takeawayPaymentQr?.image ? (
                        <img
                          src={takeawayPaymentQr.image}
                          alt={takeawayPaymentQr.label || "Scan to pay with UPI"}
                        />
                      ) : (
                        <div role="status" className="customer-takeaway-upi-qr-empty">
                          No UPI QR is configured. Add one in Admin Settings.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="customer-layout-sidebar">
                <div className="customer-card-box customer-summary-card">
                  <h3>Order Summary</h3>
                  <div className="customer-summary-lines">
                    <div className="customer-summary-line">
                      <span>Items ({cartCount})</span>
                      <span className="font-mono">{formatPrice(itemsSubtotal)}</span>
                    </div>
                    <div className="customer-summary-line">
                      <span>Packing Charges</span>
                      <span className="font-mono">{formatPrice(packingCharges)}</span>
                    </div>
                    <div className="customer-summary-line">
                      <span>Taxes (5%)</span>
                      <span className="font-mono">{formatPrice(taxes)}</span>
                    </div>
                    {couponApplied && (
                      <div className="customer-summary-line" style={{ color: "#16a34a", fontWeight: 700 }}>
                        <span>Discount</span>
                        <span className="font-mono">-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="customer-summary-divider" />
                    <div className="customer-summary-total">
                      <span>Total Amount</span>
                      <strong className="font-mono">{formatPrice(totalAmount)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="customer-proceed-cta-btn"
                    onClick={handleStartPayment}
                    disabled={checkoutSubmitting}
                  >
                    {checkoutSubmitting ? "Submitting order…" : paymentMethod === "cash" ? (
                      <>
                        <Check size={15} /> Confirm Order (Cash Tender)
                      </>
                    ) : (
                      <>
                        <span>🔒 Pay {formatPrice(totalAmount)} via UPI</span>
                      </>
                    )}
                  </button>
                  {checkoutError && <p role="alert" style={{ color: "#dc2626", fontSize: "0.82rem", marginTop: "0.75rem" }}>{checkoutError}</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STEP 6: Payment Processing - Verifying payment            */}
        {/* ========================================================= */}
        {activeScreen === "processing" && (
          <section className="customer-flow-section customer-centered-screen" id="processing">
            <div className="customer-card-box customer-processing-card">
              <div className="customer-processing-icon-wrap">
                <div className="customer-pulse-ring" />
                {paymentMethod === "cash" ? (
                  <Receipt size={26} color="#059669" />
                ) : (
                  <CreditCard size={26} color="#ea580c" />
                )}
              </div>

              <h2>Submitting Takeaway Order...</h2>
              <p>Saving your order and sending the kitchen ticket.</p>

              {/* 3-Step Progress Track */}
              <div className="customer-processing-stepper">
                <div className={`customer-proc-step ${processingStage >= 1 ? "is-done" : ""}`}>
                  <div className="customer-proc-circle">
                    <Check size={13} />
                  </div>
                  <span>Creating Order</span>
                </div>

                <div className={`customer-proc-line ${processingStage >= 2 ? "is-done" : ""}`} />

                <div className={`customer-proc-step ${processingStage >= 2 ? (processingStage === 2 ? "is-active" : "is-done") : ""}`}>
                  <div className="customer-proc-circle">
                    {processingStage > 2 ? <Check size={13} /> : <div className="customer-spinner-dot" />}
                  </div>
                  <span>Kitchen Ticket</span>
                </div>

                <div className={`customer-proc-line ${processingStage >= 3 ? "is-done" : ""}`} />

                <div className={`customer-proc-step ${processingStage >= 3 ? "is-active" : ""}`}>
                  <div className="customer-proc-circle">
                    {processingStage >= 3 ? <div className="customer-spinner-dot" /> : <div />}
                  </div>
                  <span>KOT Created</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STEP 7: Order Confirmed - Takeaway order placed            */}
        {/* ========================================================= */}
        {activeScreen === "confirmation" && placedOrder && (
          <section className="customer-flow-section customer-centered-screen" id="confirmation">
            <div className="customer-card-box customer-confirmed-card">
              <div className="customer-confirmed-badge">
                <Check size={36} color="#ffffff" strokeWidth={3} />
              </div>

              <h2>Order Confirmed!</h2>
              <p className="customer-confirmed-sub">
                Your takeaway order has been placed successfully.
              </p>

              {/* Details Box */}
              <div className="customer-confirmed-details-box">
                <div className="customer-confirmed-detail-item">
                  <div className="customer-conf-icon"><ShoppingBag size={20} color="#ea580c" /></div>
                  <div>
                    <small>Order ID</small>
                    <strong>{placedOrder.orderNumber}</strong>
                  </div>
                </div>

                <div className="customer-confirmed-detail-item">
                  <div className="customer-conf-icon"><CalendarDays size={20} color="#ea580c" /></div>
                  <div>
                    <small>Pickup Date</small>
                    <strong>{placedOrder.pickupDate}</strong>
                  </div>
                </div>

                <div className="customer-confirmed-detail-item">
                  <div className="customer-conf-icon"><Clock3 size={20} color="#ea580c" /></div>
                  <div>
                    <small>Pickup Time</small>
                    <strong>{placedOrder.pickupTime}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="customer-confirmed-buttons-row">
                <button
                  type="button"
                  className="customer-btn-outline"
                  onClick={() => navigateScreen("tracking")}
                >
                  <FileText size={16} /> View Order Details / Track
                </button>
                <button
                  type="button"
                  className="customer-btn-primary"
                  onClick={() => navigateScreen("home")}
                >
                  Back to Home
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STEP 8: Track Order - Real-time order status              */}
        {/* ========================================================= */}
        {activeScreen === "tracking" && placedOrder && (
          <section className="customer-flow-section" id="tracking">
            <div className="customer-flow-topbar">
              <button
                className="customer-back-btn"
                type="button"
                onClick={() => navigateScreen("home")}
              >
                <ArrowLeft size={16} /> Back to Home
              </button>
            </div>

            <div className="customer-two-column-layout">
              {/* Left Column: Timeline */}
              <div className="customer-layout-main">
                <div className="customer-card-box">
                  <div className="customer-card-header">
                    <ShoppingBag size={20} color="#ea580c" />
                    <div>
                      <h2>Track Your Takeaway Order</h2>
                      <span className="customer-tracking-orderid">
                        Order ID: <strong>{placedOrder.orderNumber}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Vertical Timeline */}
                  <div className="customer-tracking-timeline">
                    {/* Stage 1 */}
                    <div className={`customer-timeline-item ${trackingStage >= 1 ? "is-completed" : ""}`}>
                      <div className="customer-timeline-bullet">
                        <Check size={14} />
                      </div>
                      <div className="customer-timeline-content">
                        <div className="customer-timeline-header">
                          <strong>Order Confirmed</strong>
                          <span className="customer-timeline-time">{placedOrder.orderTime}</span>
                        </div>
                        <p>Your order has been received and sent to the kitchen.</p>
                      </div>
                    </div>

                    {/* Stage 2 */}
                    <div className={`customer-timeline-item ${trackingStage >= 2 ? (trackingStage === 2 ? "is-current" : "is-completed") : ""}`}>
                      <div className="customer-timeline-bullet">
                        {trackingStage > 2 ? <Check size={14} /> : <div className="customer-timeline-pulse" />}
                      </div>
                      <div className="customer-timeline-content">
                        <div className="customer-timeline-header">
                          <strong>Preparing</strong>
                          <span className="customer-timeline-time">Just now</span>
                        </div>
                        <p>Our kitchen is preparing your order with fresh ingredients.</p>
                      </div>
                    </div>

                    {/* Stage 3 */}
                    <div className={`customer-timeline-item ${trackingStage >= 3 ? (trackingStage === 3 ? "is-current" : "is-completed") : ""}`}>
                      <div className="customer-timeline-bullet">
                        {trackingStage > 3 ? <Check size={14} /> : <div />}
                      </div>
                      <div className="customer-timeline-content">
                        <div className="customer-timeline-header">
                          <strong>Ready for Pickup</strong>
                        </div>
                        <p>Your order will be ready soon at the counter.</p>
                      </div>
                    </div>

                    {/* Stage 4 */}
                    <div className={`customer-timeline-item ${trackingStage >= 4 ? "is-completed" : ""}`}>
                      <div className="customer-timeline-bullet">
                        <div />
                      </div>
                      <div className="customer-timeline-content">
                        <div className="customer-timeline-header">
                          <strong>Picked Up</strong>
                        </div>
                        <p>Order completed.</p>
                      </div>
                    </div>
                  </div>

                  {/* Controls to test flow */}
                  <div className="customer-tracking-actions-bar">
                    <button
                      type="button"
                      className="customer-btn-outline"
                      onClick={() => setShowReceiptModal(true)}
                    >
                      <Printer size={15} /> View Bill / Receipt
                    </button>

                    <button
                      type="button"
                      className="customer-simulate-ready-btn"
                      onClick={() => {
                        setTrackingStage(3);
                        navigateScreen("ready");
                      }}
                      title="Simulate Step 9"
                    >
                      <Bell size={15} /> Simulate "Ready for Pickup"
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Visual & Bag */}
              <div className="customer-layout-sidebar">
                <div className="customer-card-box customer-tracking-image-card">
                  <img
                    src="/assets/takeaway-bag-art.png"
                    alt="Takeaway package"
                    className="customer-tracking-bag-img"
                  />
                  <div style={{ marginTop: "1rem" }}>
                    <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Order Items</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
                      {(placedOrder.items || []).map((it, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", color: "#334155" }}>
                          <span>{it.name} × {it.quantity}</span>
                          <strong>{formatPrice((Number(it.price) || 0) * (it.quantity || 1))}</strong>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem", marginTop: "0.2rem", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span>Total Paid</span>
                        <span style={{ color: "#ea580c" }}>{formatPrice(placedOrder.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STEP 9: Order Ready - Notification for pickup             */}
        {/* ========================================================= */}
        {activeScreen === "ready" && placedOrder && (
          <section className="customer-flow-section customer-centered-screen" id="ready">
            <div className="customer-card-box customer-ready-card">
              <div className="customer-ready-bell-wrap">
                <Bell size={42} color="#ffffff" />
              </div>

              <h2>Your Order is Ready for Pickup!</h2>
              <span className="customer-ready-orderid">Order ID: {placedOrder.orderNumber}</span>
              <p className="customer-ready-sub">
                Please collect your order from the takeaway counter at Bhanu Bistro.
              </p>

              <div className="customer-ready-info-strip">
                <div className="customer-ready-info-item">
                  <Clock3 size={17} color="#ea580c" />
                  <span>Pickup Time: <strong>{placedOrder.pickupTime}</strong></span>
                </div>
                <div className="customer-ready-info-item">
                  <MapPin size={17} color="#ea580c" />
                  <span>Bhanu Bistro, Main Road, Hyderabad</span>
                </div>
              </div>

              <div className="customer-ready-buttons-row">
                <button
                  type="button"
                  className="customer-btn-primary"
                  onClick={() => setShowReceiptModal(true)}
                >
                  <FileText size={16} /> View Order Details / Receipt
                </button>
                <button
                  type="button"
                  className="customer-btn-outline"
                  onClick={() => navigateScreen("home")}
                >
                  Back to Home
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* CUSTOMER AUTHENTICATION FLOW SCREEN                       */}
        {/* ========================================================= */}
        {activeScreen === "auth" && (
          <CustomerAuthFlow
            onLoginSuccess={handleLoginSuccess}
            onBackToHome={() => navigateScreen("home")}
            intendedDestination={intendedDestination}
            restaurantName={restaurantName}
            restaurantLogo={restaurantLogo}
          />
        )}

        {/* ========================================================= */}
        {/* TABLE RESERVATION SCREEN                                  */}
        {/* ========================================================= */}
        {activeScreen === "reservation" && (
          <div className="customer-reservation-flow-wrapper" style={{ width: "100%", minHeight: "100vh", background: "#0a0403" }}>
            <TableReservationFlow
              onBackToPos={() => navigateScreen("home")}
              backLabel="Back to Home"
              initialStep={reservationInitialStep}
              customerUser={customerUser}
              customerReservations={myReservations}
              customerReservationTab={reservationTab}
              customerReservationPage={reservationPage}
              customerReservationTotal={reservationTotal}
              customerUpcomingCount={reservationUpcomingCount}
              customerPastCount={reservationPastCount}
              customerReservationsLoading={reservationListLoading}
              customerReservationsError={reservationListError}
              customerReservationActionBusy={reservationActionBusy}
              customerAvailableTables={reservationTables}
              onCustomerReservationTabChange={(tab) => { setReservationTab(tab); setReservationPage(1); loadCustomerReservations(tab, 1); }}
              onCustomerReservationPageChange={(page) => loadCustomerReservations(reservationTab, page)}
              onCustomerReservationsRetry={() => loadCustomerReservations(reservationTab, reservationPage)}
              onLoadCustomerReservation={openCustomerReservation}
              onSaveCustomerReservation={saveReservationChanges}
              onCancelCustomerReservation={cancelCustomerReservation}
              onCustomerSessionExpired={handleReservationSessionExpired}
              onLogout={handleLogout}
              onNavigate={(route) => {
                if (route === "/my-reservations" || route === "my-reservations" || route === "reservation") {
                  setReservationInitialStep(6);
                  navigateScreen("reservation");
                } else if (route === "/my-orders" || route === "orders" || route === "my-orders") {
                  navigateScreen("orders");
                } else if (route === "/profile" || route === "profile") {
                  navigateScreen("profile");
                } else if (route === "/" || route === "home") {
                  navigateScreen("home");
                } else if (route === "/menu" || route === "menu") {
                  navigateScreen("menu");
                } else {
                  navigateScreen(route.replace(/^\//, ""));
                }
              }}
              onOpenProfile={() => navigateScreen("profile")}
              onOpenOrders={() => navigateScreen("orders")}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* DEDICATED MY ORDERS SCREEN                                */}
        {/* ========================================================= */}
        {(activeScreen === "orders" || activeScreen === "my-orders") && (
          <CustomerOrdersPage
            customerUser={customerUser}
            menuItems={combinedMenuItems}
            onReorderOrder={handleReorderCustomerOrder}
            onSessionExpired={() => { handleLogout(); navigateScreen("auth"); }}
            onNavigate={(route) => {
              if (route === "/my-reservations" || route === "my-reservations" || route === "reservation") {
                setReservationInitialStep(6);
                navigateScreen("reservation");
              } else if (route === "/my-orders" || route === "orders" || route === "my-orders") {
                navigateScreen("orders");
              } else if (route === "/profile" || route === "profile") {
                navigateScreen("profile");
              } else if (route === "/" || route === "home") {
                navigateScreen("home");
              } else if (route === "/menu" || route === "menu") {
                navigateScreen("menu");
              } else {
                navigateScreen(route.replace(/^\//, ""));
              }
            }}
            onLogout={handleLogout}
            restaurantName={restaurantName}
            restaurantLogo={restaurantLogo}
          />
        )}

        {/* ========================================================= */}
        {/* DEDICATED MY PROFILE SCREEN                               */}
        {/* ========================================================= */}
        {activeScreen === "profile" && (
          <CustomerProfilePage
            customerUser={customerUser}
            onUpdateUser={(updated) => {
              setCustomerUser(updated);
              try {
                localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updated));
              } catch (e) {}
            }}
            onNavigate={(route) => {
              if (route === "/my-reservations" || route === "my-reservations" || route === "reservation") {
                setReservationInitialStep(6);
                navigateScreen("reservation");
              } else if (route === "/my-orders" || route === "orders" || route === "my-orders") {
                navigateScreen("orders");
              } else if (route === "/profile" || route === "profile") {
                navigateScreen("profile");
              } else if (route === "/" || route === "home") {
                navigateScreen("home");
              } else if (route === "/menu" || route === "menu") {
                navigateScreen("menu");
              } else {
                navigateScreen(route.replace(/^\//, ""));
              }
            }}
            onLogout={handleLogout}
            restaurantName={restaurantName}
            restaurantLogo={restaurantLogo}
          />
        )}
      </main>

      {/* ── Customer Profile Modal ──────────────────────────── */}
      {showProfileModal && (
        <div className="customer-profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="customer-profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1a100b" }}>
                Customer Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#665449" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", padding: "12px", background: "#faf7f4", borderRadius: "12px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "20px", fontWeight: 800 }}>
                {(customerUser?.name || "P")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "#1a100b" }}>{customerUser?.name || ""}</div>
                <div style={{ fontSize: "13px", color: "#6f6158" }}>{customerUser?.phone || ""}</div>
                <div style={{ fontSize: "12px", color: "#ea580c" }}>{customerUser?.email || "priya@example.com"}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>Full Name</label>
                <input
                  type="text"
                  value={customerUser?.name || ""}
                  onChange={(e) => {
                    const updated = { ...customerUser, name: e.target.value };
                    setCustomerUser(updated);
                    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updated));
                  }}
                  style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #e0d4cc", background: "#faf7f4", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>Mobile Number</label>
                <input
                  type="text"
                  value={customerUser?.phone || ""}
                  onChange={(e) => {
                    const updated = { ...customerUser, phone: e.target.value };
                    setCustomerUser(updated);
                    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updated));
                  }}
                  style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #e0d4cc", background: "#faf7f4", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>Email Address</label>
                <input
                  type="text"
                  value={customerUser?.email || "priya@example.com"}
                  onChange={(e) => {
                    const updated = { ...customerUser, email: e.target.value };
                    setCustomerUser(updated);
                    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updated));
                  }}
                  style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #e0d4cc", background: "#faf7f4", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ flex: 1, height: "42px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── POS Tax Invoice / Receipt Modal ─────────────────── */}
      {showReceiptModal && receiptTableData && (
        <ReceiptModal
          table={receiptTableData}
          restaurantSettings={{
            restaurantName,
            logo: restaurantLogo,
            tagline: "Fine Dining & POS Management",
            address: "Main Road, Near Tech Park, Hyderabad, India",
            phone: "+91 98450 12345",
            gstin: "36AABCA1234F1Z5",
          }}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
