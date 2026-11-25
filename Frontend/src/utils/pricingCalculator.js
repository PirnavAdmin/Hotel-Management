import { roundCurrency } from "./formatCurrency.js";

/**
 * Standard POS Pricing & Financial Calculation Engine
 * Reusable across Dine In, Takeaway, and Self Service.
 *
 * @param {Array} items - List of items with price/unitPrice and quantity/qty
 * @param {Object} options - Configuration and discount options
 * @param {string} [options.orderType] - Order type ('DineIn' | 'Takeaway' | 'SelfService')
 * @param {number} [options.foodGstRate] - GST percentage (e.g. 5 for 5%)
 * @param {boolean} [options.serviceChargeEnabled] - Whether service charge is active
 * @param {number} [options.serviceChargeRate] - Service charge percentage (e.g. 5)
 * @param {string} [options.roundingMode] - 'rupee' | 'five' | 'none' | 'nearest'
 * @param {number} [options.discountPercent] - Order-level discount percentage
 * @param {number} [options.discountAmount] - Order-level explicit discount amount
 * @param {number} [options.tipAmount] - Optional tip
 */
export function calculateOrderFinancials(items = [], options = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  const normalizedOrderType = String(options.orderType || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  const isSelfServiceOrder = normalizedOrderType === "selfservice";

  // 1. Line items with verified unit price and quantity
  const calculatedItems = safeItems.map((item) => {
    const rawPrice = Number(item?.price ?? item?.unitPrice ?? 0);
    const unitPrice = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
    const rawQty = Number(item?.quantity ?? item?.qty ?? 1);
    const quantity = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
    const lineSubtotal = roundCurrency(unitPrice * quantity);

    return {
      ...item,
      unitPrice,
      quantity,
      lineSubtotal,
    };
  });

  // 2. Gross Subtotal
  const subtotal = roundCurrency(
    calculatedItems.reduce((sum, item) => sum + item.lineSubtotal, 0)
  );

  // 3. Discount (Percent or Fixed Amount)
  const discountPercent = Math.max(0, Number(options.discountPercent || 0));
  let discountAmount = 0;
  if (
    options.discountAmount !== undefined &&
    options.discountAmount !== null &&
    Number(options.discountAmount) >= 0
  ) {
    discountAmount = roundCurrency(Math.min(subtotal, Number(options.discountAmount)));
  } else if (discountPercent > 0) {
    discountAmount = roundCurrency(Math.min(subtotal, (subtotal * discountPercent) / 100));
  }

  // 4. Net Taxable Amount
  const taxableAmount = roundCurrency(Math.max(0, subtotal - discountAmount));

  // 5. Configured GST / Food Tax
  const rawGstRate = options.foodGstRate ?? options.taxRate;
  const foodGstRate =
    Number.isFinite(Number(rawGstRate)) && Number(rawGstRate) >= 0
      ? Number(rawGstRate)
      : 5; // Fallback to 5% if not configured

  const taxAmount = roundCurrency(taxableAmount * (foodGstRate / 100));
  const cgstRate = foodGstRate / 2;
  const sgstRate = foodGstRate / 2;
  const cgstAmount = roundCurrency(taxAmount / 2);
  const sgstAmount = roundCurrency(taxAmount - cgstAmount);

  // 6. Service Charge (never applied to Self Service orders)
  const isServiceChargeActive = !isSelfServiceOrder && Boolean(options.serviceChargeEnabled);
  const serviceChargeRate = isServiceChargeActive
    ? Math.max(0, Number(options.serviceChargeRate ?? 0))
    : 0;
  const serviceChargeAmount =
    isServiceChargeActive && serviceChargeRate > 0
      ? roundCurrency(taxableAmount * (serviceChargeRate / 100))
      : 0;

  // 7. Tip Amount
  const tipAmount = Math.max(0, roundCurrency(Number(options.tipAmount || 0)));

  // 8. Unrounded Grand Total
  const unroundedTotal = roundCurrency(
    taxableAmount + taxAmount + serviceChargeAmount + tipAmount
  );

  // 9. Rounding Rules
  const roundingMode = String(options.roundingMode || "nearest").toLowerCase();
  let finalPayable = unroundedTotal;

  if (roundingMode === "rupee" || roundingMode === "nearest") {
    finalPayable = Math.round(unroundedTotal);
  } else if (roundingMode === "five") {
    finalPayable = Math.round(unroundedTotal / 5) * 5;
  } else if (roundingMode === "none") {
    finalPayable = unroundedTotal;
  } else {
    finalPayable = Math.round(unroundedTotal);
  }

  finalPayable = roundCurrency(finalPayable);
  const roundingAdjustment = roundCurrency(finalPayable - unroundedTotal);

  return {
    items: calculatedItems,
    itemCount: calculatedItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    discountPercent,
    discountAmount,
    taxableAmount,
    foodGstRate,
    cgstRate,
    sgstRate,
    cgstAmount,
    sgstAmount,
    taxAmount,
    serviceChargeEnabled: isServiceChargeActive,
    serviceChargeRate,
    serviceChargeAmount,
    tipAmount,
    unroundedTotal,
    roundingMode,
    roundingAdjustment,
    finalPayable,
  };
}
