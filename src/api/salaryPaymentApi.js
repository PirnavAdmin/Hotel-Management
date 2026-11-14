import { apiClient } from "./apiConfig";

export function apiGetSalaryPayments(staffId) {
  const query = new URLSearchParams();
  if (staffId != null) query.set("staffId", String(staffId));
  const queryString = query.toString();
  return apiClient(`/api/v1/salary-payments${queryString ? `?${queryString}` : ""}`);
}

export function apiCreateSalaryPayment(payment) {
  const staffId = Number(payment.staffId);
  return apiClient("/api/v1/salary-payments", {
    method: "POST",
    body: JSON.stringify({
      staffId: Number.isInteger(staffId) && staffId > 0 ? staffId : null,
      staffName: String(payment.staffName || "").trim(),
      amount: Number(payment.amount),
      paidOn: payment.paidOn,
      salaryPeriod: payment.salaryPeriod,
      paymentMethod: String(payment.paymentMethod || "").trim(),
      notes: String(payment.notes || "").trim(),
    }),
  });
}
