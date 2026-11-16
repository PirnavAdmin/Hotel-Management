/**
 * Formats a number to Indian Rupees (₹) with proper symbol and formatting
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function roundCurrency(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  return Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
}

export function formatCurrencyInt(amount) {
  const num = Number(amount) || 0;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}
