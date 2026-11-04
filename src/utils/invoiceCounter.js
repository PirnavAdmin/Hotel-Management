// ============================================================
// Daily invoice sequence follows the restaurant business day (04:00 to 03:59).
// ============================================================

const LAST_DATE_KEY = 'avsr_last_invoice_date_v2';
const DAILY_COUNTER_PREFIX = 'avsr_daily_inv_cnt_';
const LEGACY_STORAGE_ORDERS = 'gourmet_pos_past_orders_v2_inr';

// Format helper to get date string in Indian locale: e.g. "12 Oct 2026"
export function getTodayDateString(dateObj = new Date()) {
  try {
    const businessDate = new Date(dateObj);
    if (businessDate.getHours() < 4) businessDate.setDate(businessDate.getDate() - 1);
    return businessDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')} Oct ${d.getFullYear()}`;
  }
}

// Convert "12 Oct 2026" into a safe key "12_Oct_2026"
function getDateKey(dateStr) {
  return String(dateStr || getTodayDateString()).trim().replace(/\s+/g, '_');
}

/** Return canonical YYYY-MM-DD for the restaurant business day (4:00 AM cutoff). */
export function getBusinessDayKey(dateInput = new Date()) {
  try {
    let d;
    if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      d = new Date(dateInput);
      if (isNaN(d.getTime())) d = new Date();
    } else if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      d = new Date();
    }
    const businessDate = new Date(d);
    if (businessDate.getHours() < 4) businessDate.setDate(businessDate.getDate() - 1);
    return `${businessDate.getFullYear()}-${String(businessDate.getMonth() + 1).padStart(2, '0')}-${String(businessDate.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/**
 * Scans past orders from localStorage to find the highest serial invoice number for a given date.
 */
function getHighestSerialFromExistingOrders(targetDateStr) {
  let highest = 0;
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_ORDERS);
    if (!raw) return 0;
    const orders = JSON.parse(raw);
    if (!Array.isArray(orders)) return 0;

    const targetKey = getBusinessDayKey(targetDateStr);

    orders.forEach(o => {
      const status = String(o.status || o.Status || "").toLowerCase();
      if (status === "active" || status === "dining" || status === "vacant") return;

      const orderKey = getBusinessDayKey(o.settledDate || o.date || o.settledAt || o.createdAt || o.orderTimestamp);
      const isDateMatch = (o.date === targetDateStr) || (o.settledDate === targetDateStr) || (orderKey === targetKey);

      if (isDateMatch && o.invoiceNo) {
        const match = String(o.invoiceNo).match(/INV-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > highest && num < 100000) {
            highest = num;
          }
        }
      }
    });
  } catch {}
  return highest;
}

/**
 * Generate next sequential invoice number for today (or specified date).
 * Resets daily to INV-001 on each new date!
 */
export function getNextInvoiceNumber(targetDateStr) {
  try {
    const today = targetDateStr || getTodayDateString();
    const dateKey = getDateKey(today);
    const storageCounterKey = `${DAILY_COUNTER_PREFIX}${dateKey}`;

    let currentCounter = 0;

    if (typeof localStorage !== 'undefined') {
      // 1. Check if we have a recorded counter for this day
      const savedCount = localStorage.getItem(storageCounterKey);
      if (savedCount && !isNaN(parseInt(savedCount, 10))) {
        currentCounter = parseInt(savedCount, 10);
      }

      // 2. Cross-check against actual past orders for this day (in case of sync or reset)
      const existingHighest = getHighestSerialFromExistingOrders(today);
      if (existingHighest > currentCounter) {
        currentCounter = existingHighest;
      }
    }

    const nextCounter = currentCounter + 1;

    // Save updated counter for this day and record last date
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_DATE_KEY, today);
      localStorage.setItem(storageCounterKey, nextCounter.toString());
    }

    // Broadcast update across LAN / other terminals
    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [LAST_DATE_KEY]: today,
          [storageCounterKey]: nextCounter.toString()
        })
      }).catch(() => {});
    } catch {}

    // Format as 3-digit padded sequential serial (INV-001, INV-002, ..., INV-999, INV-1000)
    const padded = String(nextCounter).padStart(3, '0');
    return `INV-${padded}`;
  } catch {
    return 'INV-001';
  }
}

/** Return the start timestamp for the current restaurant business day. */
export function getBusinessDayStart(dateObj = new Date()) {
  const start = new Date(dateObj);
  start.setHours(4, 0, 0, 0);
  if (dateObj.getHours() < 4) start.setDate(start.getDate() - 1);
  return start;
}

/**
 * Peek at what the next invoice number will be without incrementing the counter.
 */
export function peekNextInvoiceNumber(targetDateStr) {
  try {
    const today = targetDateStr || getTodayDateString();
    const dateKey = getDateKey(today);
    const storageCounterKey = `${DAILY_COUNTER_PREFIX}${dateKey}`;

    let currentCounter = 0;
    if (typeof localStorage !== 'undefined') {
      const savedCount = localStorage.getItem(storageCounterKey);
      if (savedCount && !isNaN(parseInt(savedCount, 10))) {
        currentCounter = parseInt(savedCount, 10);
      }
      const existingHighest = getHighestSerialFromExistingOrders(today);
      if (existingHighest > currentCounter) {
        currentCounter = existingHighest;
      }
    }
    const nextCounter = currentCounter + 1;
    return `INV-${String(nextCounter).padStart(3, '0')}`;
  } catch {
    return 'INV-001';
  }
}

/**
 * Manually reset daily counter for a date back to 0 (so next is INV-001).
 */
export function resetDailyInvoiceCounter(targetDateStr) {
  try {
    const today = targetDateStr || getTodayDateString();
    const dateKey = getDateKey(today);
    const storageCounterKey = `${DAILY_COUNTER_PREFIX}${dateKey}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageCounterKey, '0');
    }
  } catch {}
}
