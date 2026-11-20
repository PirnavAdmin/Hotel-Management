import { apiCreateCustomer, apiUpdateCustomer } from "../api/customerApi";

export const STORAGE_KEY_CUSTOMERS = "bhanu_bistro_customers_v1";

/**
 * Normalizes phone numbers for fast, lenient lookup (e.g. "+91 98450 12345" -> "9845012345")
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "").slice(-10);
}

/**
 * Reads customers stored in localStorage
 */
export function getStoredCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("[CustomerStorage] Error reading customers from storage:", err);
  }
  return [];
}

/**
 * Finds an existing customer by phone number
 */
export function findCustomerByPhone(phone) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 5) return null;
  const customers = getStoredCustomers();
  return (
    customers.find((c) => {
      const cPhone = normalizePhone(c.phone);
      return cPhone && (cPhone === cleanPhone || cPhone.endsWith(cleanPhone) || cleanPhone.endsWith(cPhone));
    }) || null
  );
}

/**
 * Finds customer suggestions matching input (phone or name)
 */
export function searchCustomerSuggestions(term) {
  const clean = String(term || "").trim().toLowerCase();
  if (!clean) return [];
  const cleanDigits = clean.replace(/\D/g, "");
  const customers = getStoredCustomers();

  return customers.filter((c) => {
    const nameMatch = String(c.fullName || c.name || "").toLowerCase().includes(clean);
    const phoneDigits = normalizePhone(c.phone);
    const phoneMatch = cleanDigits && phoneDigits && phoneDigits.includes(cleanDigits);
    return nameMatch || phoneMatch;
  }).slice(0, 5);
}

/**
 * Saves or updates a customer record in storage, dispatches events, and syncs to backend API.
 */
export async function saveOrUpdateCustomer({
  fullName = "",
  phone = "",
  email = "",
  address = "",
  amountSpent = 0,
  notes = "",
}) {
  const cleanName = String(fullName || "").trim();
  const cleanPhone = String(phone || "").trim();
  if (!cleanName && !cleanPhone) return null;

  const digits = normalizePhone(cleanPhone);
  const customers = getStoredCustomers();
  let existingIndex = -1;

  if (digits && digits.length >= 7) {
    existingIndex = customers.findIndex((c) => normalizePhone(c.phone) === digits);
  } else if (cleanName) {
    existingIndex = customers.findIndex(
      (c) => String(c.fullName || c.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
    );
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + ", " + now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let savedCustomer = null;
  const spend = Number(amountSpent) || 0;

  if (existingIndex >= 0) {
    const existing = customers[existingIndex];
    const newVisits = (Number(existing.visitsCount) || 1) + 1;
    const newTotal = (Number(existing.totalSpent) || 0) + spend;
    const newTier = newTotal > 20000 ? "VIP" : newVisits > 4 ? "Regular" : (existing.tier || "Regular");

    savedCustomer = {
      ...existing,
      fullName: cleanName || existing.fullName,
      phone: cleanPhone || existing.phone,
      email: email || existing.email,
      address: address || existing.address,
      visitsCount: newVisits,
      totalSpent: newTotal,
      tier: newTier,
      lastVisit: dateStr,
    };
    customers[existingIndex] = savedCustomer;
  } else {
    const randId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
    savedCustomer = {
      id: randId,
      customerId: randId,
      fullName: cleanName || "Guest Customer",
      phone: cleanPhone || "—",
      email: email || "",
      address: address || "",
      tier: spend > 20000 ? "VIP" : "New",
      visitsCount: 1,
      totalSpent: spend,
      loyaltyPoints: Math.floor(spend / 50),
      createdAt: now.toISOString(),
      lastVisit: dateStr,
    };
    customers.unshift(savedCustomer);
  }

  // Persist locally & broadcast
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("avsr-customers-updated", { detail: customers }));
  } catch (err) {
    console.warn("[CustomerStorage] Storage persist error:", err);
  }

  // Sync with backend API in background
  try {
    if (savedCustomer.backendId || savedCustomer.customerId?.startsWith?.("API-")) {
      await apiUpdateCustomer(savedCustomer.backendId || savedCustomer.customerId, {
        fullName: savedCustomer.fullName,
        phone: savedCustomer.phone,
        email: savedCustomer.email,
      });
    } else {
      const apiResult = await apiCreateCustomer({
        fullName: savedCustomer.fullName,
        phone: savedCustomer.phone,
        email: savedCustomer.email,
        outletId: 1,
      });
      if (apiResult?.success && apiResult.data?.customerId) {
        savedCustomer.backendId = apiResult.data.customerId;
        localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
      }
    }
  } catch (err) {
    console.warn("[CustomerStorage] Backend customer sync skipped/offline:", err?.message);
  }

  return savedCustomer;
}
