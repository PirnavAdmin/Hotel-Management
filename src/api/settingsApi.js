import { apiClient, API_BASE_URL } from "./apiConfig";

const RESTAURANT_SETTINGS_KEY = "gourmet_pos_settings_v1";

/**
 * Normalizes backend restaurant settings into frontend-friendly camelCase structure
 */
export function normalizeRestaurantSettings(raw = {}) {
  if (!raw || typeof raw !== "object") return {};
  const data = raw.data || raw;

  return {
    restaurantName: data.restaurantName || data.name || "AVSR FOOD COURT",
    tagline: data.tagline || "Restaurant Management & Fine Dining",
    phone: data.phone || data.contactNumber || "+91 98450 12345",
    address: data.address || "Main Road, Near Tech Park, Hyderabad, India",
    gstin: data.gstin || "36AABCA1234F1Z5",
    logo: data.logo || data.restaurantLogo || "",
    restaurantLogo: data.restaurantLogo || data.logo || "",
    taxRate: Number(data.taxRate ?? data.foodGstRate ?? 5),
    foodGstRate: Number(data.foodGstRate ?? data.taxRate ?? 5),
    serviceChargeRate: Number(data.serviceChargeRate ?? 5),
    serviceChargeEnabled: data.serviceChargeEnabled !== false,
    roundingMode: data.roundingMode || "nearest",
    currency: data.currency || "₹",
    receiptHeader: data.receiptHeader || "Welcome to AVSR Food Court!",
    receiptFooter: data.receiptFooter || "Thank you for dining with us. Visit again!",
    selectedQrId: data.selectedQrId || "qr-1",
    paymentQrs: Array.isArray(data.paymentQrs) ? data.paymentQrs : undefined,
    showLogoOnReceipt: data.showLogoOnReceipt !== false,
    showAddressOnReceipt: data.showAddressOnReceipt !== false,
    showGstBreakdown: data.showGstBreakdown !== false,
    lowStockAlertsEnabled: data.lowStockAlertsEnabled !== false,
    showBarHeaderToggle: data.showBarHeaderToggle !== false,
    theme: data.theme || data.displayTheme || "royal-saffron",
    displayTheme: data.displayTheme || data.theme || "royal-saffron",
  };
}

/**
 * Retrieves saved restaurant settings from the backend REST API
 */
export async function apiGetRestaurantSettings() {
  const primaryResult = await apiClient("/api/v1/restaurant-settings");
  if (primaryResult?.success && primaryResult.data) {
    const normalized = normalizeRestaurantSettings(primaryResult.data);
    return { success: true, data: normalized };
  }

  // Fallback 1: legacy route /api/restaurant-settings
  const legacyResult = await apiClient("/api/restaurant-settings");
  if (legacyResult?.success && legacyResult.data) {
    const normalized = normalizeRestaurantSettings(legacyResult.data);
    return { success: true, data: normalized };
  }

  // Fallback 2: /api/state
  try {
    const stateRes = await fetch(`${API_BASE_URL}/api/state`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (stateRes.ok) {
      const stateData = await stateRes.json();
      const settings = stateData?.[RESTAURANT_SETTINGS_KEY] || stateData?.data?.[RESTAURANT_SETTINGS_KEY];
      if (settings) {
        return { success: true, data: normalizeRestaurantSettings(settings) };
      }
    }
  } catch {}

  return primaryResult?.error ? primaryResult : { success: false, error: "Could not retrieve settings from backend." };
}

/**
 * Updates restaurant settings in MySQL database via REST API
 */
export async function apiUpdateRestaurantSettings(settings) {
  const payload = {
    restaurantName: settings.restaurantName || "AVSR FOOD COURT",
    tagline: settings.tagline || "",
    contactNumber: settings.phone || settings.contactNumber || "",
    phone: settings.phone || settings.contactNumber || "",
    address: settings.address || "",
    gstin: settings.gstin || "",
    restaurantLogo: settings.logo || settings.restaurantLogo || "",
    logo: settings.logo || settings.restaurantLogo || "",
    foodGstRate: Number(settings.taxRate ?? settings.foodGstRate ?? 5),
    taxRate: Number(settings.taxRate ?? settings.foodGstRate ?? 5),
    serviceChargeRate: Number(settings.serviceChargeRate ?? 5),
    serviceChargeEnabled: settings.serviceChargeEnabled !== false,
    roundingMode: settings.roundingMode || "nearest",
    currency: settings.currency || "₹",
    receiptHeader: settings.receiptHeader || "",
    receiptFooter: settings.receiptFooter || "",
    selectedQrId: settings.selectedQrId || "qr-1",
    paymentQrs: settings.paymentQrs || null,
    showLogoOnReceipt: settings.showLogoOnReceipt !== false,
    showAddressOnReceipt: settings.showAddressOnReceipt !== false,
    showGstBreakdown: settings.showGstBreakdown !== false,
    lowStockAlertsEnabled: settings.lowStockAlertsEnabled !== false,
    showBarHeaderToggle: settings.showBarHeaderToggle !== false,
    displayTheme: settings.theme || settings.displayTheme || "royal-saffron",
    theme: settings.theme || settings.displayTheme || "royal-saffron",
  };

  const primaryResult = await apiClient("/api/v1/restaurant-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (primaryResult?.success) {
    // Broadcast sync to server state / events
    try {
      await fetch(`${API_BASE_URL}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ [RESTAURANT_SETTINGS_KEY]: payload }),
      });
    } catch {}

    return {
      success: true,
      data: normalizeRestaurantSettings(primaryResult.data || payload),
    };
  }

  // Fallback: sync via /api/sync if endpoint returns 404 or backend is in development mode
  try {
    const syncRes = await fetch(`${API_BASE_URL}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ [RESTAURANT_SETTINGS_KEY]: payload }),
    });

    if (syncRes.ok) {
      return { success: true, data: normalizeRestaurantSettings(payload) };
    }
  } catch {}

  return primaryResult;
}
