import { apiClient } from "./apiConfig";

export async function apiGetOrders() {
  return await apiClient("/api/v1/orders");
}

export async function apiGetActiveOrders() {
  return await apiClient("/api/v1/orders/active");
}

export async function apiGetTakeawayOrders() {
  return await apiClient("/api/v1/orders/takeaway", { remoteOnly: true });
}

export async function apiGetTakeawayOrder(orderId) {
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}`, { remoteOnly: true });
}

export async function apiCancelTakeawayOrder(orderId) {
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    remoteOnly: true,
  });
}

export async function apiGetTakeawayOrderBillSummary(orderId) {
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}/bill-summary`, { remoteOnly: true });
}

export async function apiGetTakeawayOrderReceipt(orderId) {
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}/receipt`, { remoteOnly: true });
}

export async function apiDispatchTakeawayOrder(orderId) {
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}/dispatch`, { method: "POST", remoteOnly: true });
}

export async function apiCreatePaidTakeawayOrder(orderData) {
  return await apiClient("/api/v1/orders", { method: "POST", remoteOnly: true, body: JSON.stringify(orderData) });
}

export async function apiCreatePaidSelfServiceOrder(orderData) {
  return await apiClient("/api/v1/orders", {
    method: "POST",
    remoteOnly: true,
    body: JSON.stringify({
      ...orderData,
      orderType: "SelfService",
      tableName: orderData?.tableName || "Self Service",
    }),
  });
}

/**
 * Create a dedicated Self Service Order (Phase 2B.1 Backend API)
 * Dispatches to POST /api/v1/orders/self-service with authenticated JWT and authoritative recalculation
 * @param {Object} orderData
 * @param {Array<{menuItemId: number, quantity: number, notes?: string}>} orderData.items
 * @param {string} [orderData.customerName]
 * @param {string} [orderData.customerPhone]
 * @param {string} [orderData.customerEmail]
 * @param {string} [orderData.specialInstructions]
 * @param {string} [orderData.idempotencyKey]
 * @param {string} [orderData.discountCode]
 * @param {number|string} [branchId]
 * @returns {Promise<{success: boolean, data?: Object, error?: string, status?: number, isNetworkError?: boolean}>}
 */
export async function apiCreateSelfServiceOrder(orderData, branchId = null) {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const payload = {
    items: Array.isArray(orderData?.items)
      ? orderData.items.map((i) => {
          const rawId = i.menuItemId ?? i.id ?? 0;
          const cleanId = typeof rawId === "string" ? rawId.replace(/^m-/, "") : rawId;
          const numId = parseInt(cleanId, 10);
          return {
            menuItemId: !isNaN(numId) && numId > 0 ? numId : 0,
            name: i.name || i.dishName || undefined,
            quantity: Math.max(1, parseInt(i.quantity || 1, 10) || 1),
            notes: i.notes ? String(i.notes).trim() : "Self Service Order",
          };
        })
      : [],
    customerName: orderData?.customerName ? String(orderData.customerName).trim() : undefined,
    customerPhone: orderData?.customerPhone ? String(orderData.customerPhone).trim() : undefined,
    customerEmail: orderData?.customerEmail ? String(orderData.customerEmail).trim() : undefined,
    specialInstructions: orderData?.specialInstructions ? String(orderData.specialInstructions).trim() : undefined,
    idempotencyKey: orderData?.idempotencyKey ? String(orderData.idempotencyKey).trim() : undefined,
    discountCode: orderData?.discountCode ? String(orderData.discountCode).trim() : undefined,
    // Authoritative calculations are strictly performed on the backend; client values are omitted.
  };

  return await apiClient(`/api/v1/orders/self-service${query}`, {
    method: "POST",
    remoteOnly: true,
    body: JSON.stringify(payload),
  });
}

/**
 * Track a Self Service Order (Phase 2B.14 Backend API)
 * GET /api/v1/orders/self-service/{id}
 */
export async function apiGetSelfServiceOrder(orderId, branchId = null) {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return await apiClient(`/api/v1/orders/self-service/${encodeURIComponent(orderId)}${query}`, {
    remoteOnly: true,
  });
}

/**
 * Initiate payment for a Self Service Order (Phase 2B.14 Backend API)
 * POST /api/v1/orders/self-service/{id}/initiate-payment
 */
export async function apiInitiateSelfServicePayment(orderId, paymentMethod = "UPI", options = {}, branchId = null) {
  let opts = options;
  let resolvedBranch = branchId;
  if (typeof options === "number" || (typeof options === "string" && !isNaN(Number(options)) && branchId === null)) {
    resolvedBranch = options;
    opts = {};
  }
  const query = resolvedBranch ? `?branchId=${encodeURIComponent(resolvedBranch)}` : "";
  const payload = {
    paymentMethod: String(paymentMethod || "UPI").toUpperCase(),
    ...(opts?.transactionReference ? { transactionReference: String(opts.transactionReference).trim() } : {}),
    ...(opts?.notes ? { notes: String(opts.notes).trim() } : {}),
  };
  return await apiClient(`/api/v1/orders/self-service/${encodeURIComponent(orderId)}/initiate-payment${query}`, {
    method: "POST",
    remoteOnly: true,
    body: JSON.stringify(payload),
  });
}

/**
 * Confirm payment and issue official invoice for a Self Service Order (Staff-only, Phase 2B.14 Backend API)
 * POST /api/v1/orders/self-service/{id}/confirm-payment
 */
export async function apiConfirmSelfServicePayment(orderId, { paymentMethod = "CASH", amount = 0, transactionReference } = {}, branchId = null) {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return await apiClient(`/api/v1/orders/self-service/${encodeURIComponent(orderId)}/confirm-payment${query}`, {
    method: "POST",
    remoteOnly: true,
    body: JSON.stringify({
      paymentMethod: String(paymentMethod || "CASH").toUpperCase(),
      amount: Number(amount) || 0,
      ...(transactionReference ? { transactionReference: String(transactionReference).trim() } : {}),
    }),
  });
}

async function dispatchKot(endpoint, options = {}) {
  const result = await apiClient(endpoint, options);
  if (!result?.success) {
    const error = new Error(result?.error || "The backend could not dispatch this order to KOT.");
    error.status = result?.status;
    throw error;
  }
  return result;
}

export async function apiSendTakeawayOrderToKitchen(orderId) {
  return dispatchKot(`/api/v1/orders/${encodeURIComponent(orderId)}/kot`, { method: "POST", remoteOnly: true });
}

export async function apiGetOrder(id) {
  return await apiClient(`/api/v1/orders/${id}`);
}

export async function apiGetOrderForTable(tableId) {
  return await apiClient(`/api/v1/orders/table/${tableId}`);
}

export async function apiCreateOrder(orderData) {
  return await apiClient("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  });
}

export async function apiSendOrderKot(orderId) {
  return dispatchKot(`/api/v1/orders/${encodeURIComponent(orderId)}/kot`, {
    method: "POST",
  });
}

export async function apiAddOrderItems(orderId, items) {
  return await apiClient(`/api/v1/orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function apiUpdateOrderItems(orderId, items) {
  return await apiClient(`/api/v1/orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function apiRemoveOrderItem(orderId, itemId) {
  return await apiClient(`/api/v1/orders/${orderId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function apiDeleteOrder(orderId) {
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
    method: "DELETE",
  });
}

export async function apiBillOrder(orderId) {
  return apiClient(`/api/v1/orders/${orderId}/bill`, {
    method: "POST",
  });
}

export async function apiSettleOrder(orderId, settlementData = {}) {
  return apiClient(`/api/v1/orders/${orderId}/settle`, {
    method: "POST",
    body: JSON.stringify({
      discountPercent: Number(settlementData.discountPercent ?? 0) || 0,
      serviceChargeEnabled: settlementData.serviceChargeEnabled !== false,
      tipAmount: Number(settlementData.tipAmount ?? 0) || 0,
      paymentMethod: settlementData.paymentMethod || "Cash",
      invoiceNumber: settlementData.invoiceNumber || null,
    }),
  });
}

export async function apiSettleTakeawayOrder(orderId, settlementData = {}) {
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}/settle`, {
    method: "POST",
    remoteOnly: true,
    body: JSON.stringify({
      discountPercent: Number(settlementData.discountPercent ?? 0) || 0,
      serviceChargeEnabled: settlementData.serviceChargeEnabled !== false,
      tipAmount: Number(settlementData.tipAmount ?? 0) || 0,
      paymentMethod: settlementData.paymentMethod || "Cash",
      invoiceNumber: settlementData.invoiceNumber || null,
    }),
  });
}

export async function apiUpdateOrderGuests(orderId, guests) {
  return await apiClient(`/api/v1/orders/${orderId}/guests`, {
    method: "PATCH",
    body: JSON.stringify({ guests }),
  });
}

export async function apiUpdateOrderDiscount(orderId, discountPercent) {
  return await apiClient(`/api/v1/orders/${orderId}/discount`, {
    method: "PATCH",
    body: JSON.stringify({ discountPercent: Number(discountPercent) }),
  });
}

export async function apiUpdateOrderServiceCharge(orderId, serviceCharge) {
  return await apiClient(`/api/v1/orders/${orderId}/service-charge`, {
    method: "PATCH",
    body: JSON.stringify({ serviceCharge }),
  });
}

export async function apiUpdateOrderItemNotes(orderId, itemId, notes) {
  return await apiClient(`/api/v1/orders/${orderId}/items/${itemId}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });
}

export async function apiGetOrderBillSummary(orderId) {
  return await apiClient(`/api/v1/orders/${orderId}/bill-summary`);
}

export async function apiGetOrderHistory({ orderType, remoteOnly = false } = {}) {
  const pageSize = 100;
  const query = new URLSearchParams({ page: "1", pageSize: String(pageSize) });
  if (orderType) query.set("orderType", orderType);
  const firstResponse = await apiClient(
    `/api/v1/orders/history?${query.toString()}`,
    { remoteOnly },
  );
  const firstPage = firstResponse?.data;
  if (
    !firstResponse?.success ||
    !firstPage ||
    !Array.isArray(firstPage.orders)
  ) {
    return firstResponse;
  }

  const orders = [...firstPage.orders];
  const totalPages = Math.max(1, Number(firstPage.totalPages) || 1);
  for (let page = 2; page <= totalPages; page += 1) {
    const pageResponse = await apiClient(
      `/api/v1/orders/history?page=${page}&pageSize=${pageSize}${orderType ? `&orderType=${encodeURIComponent(orderType)}` : ""}`,
      { remoteOnly },
    );
    const pageOrders = pageResponse?.data?.orders;
    if (!pageResponse?.success || !Array.isArray(pageOrders)) {
      return {
        ...firstResponse,
        success: false,
        error: pageResponse?.error || `Unable to load order history page ${page}.`,
      };
    }
    orders.push(...pageOrders);
  }

  return {
    ...firstResponse,
    data: {
      ...firstPage,
      orders,
      totalCount: Math.max(Number(firstPage.totalCount) || 0, orders.length),
      page: 1,
      pageSize,
      totalPages: Math.ceil(
        Math.max(Number(firstPage.totalCount) || 0, orders.length) / pageSize,
      ),
    },
  };
}

export async function apiGetTakeawayOrderHistory() {
  const response = await apiGetOrderHistory({ orderType: "Takeaway", remoteOnly: true });
  if (!response?.success || !Array.isArray(response.data?.orders)) return response;
  const orders = response.data.orders.filter((order) => String(order.orderType ?? order.OrderType ?? "").trim().toLowerCase() === "takeaway");
  return {
    ...response,
    data: {
      ...response.data,
      orders,
      totalCount: orders.length,
      totalPages: orders.length ? 1 : 0,
    },
  };
}

export async function apiGetOrderReceipt(orderId) {
  return await apiClient(`/api/v1/orders/${orderId}/receipt`);
}
