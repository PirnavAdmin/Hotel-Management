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

export function formatCurrencyInt(amount) {
  const num = Number(amount) || 0;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}
