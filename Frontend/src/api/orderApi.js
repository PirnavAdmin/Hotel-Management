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

export async function apiSendTakeawayOrderToKitchen(orderId) {
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}/send-kot`, { method: "POST", remoteOnly: true });
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
  return await apiClient(`/api/v1/orders/${encodeURIComponent(orderId)}/send-kot`, {
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
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export async function apiRemoveOrderItem(orderId, itemId) {
  return await apiClient(`/api/v1/orders/${orderId}/items/${itemId}`, {
    method: "DELETE",
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
  const orders = response.data.orders.filter((order) => String(order.orderType ?? order.OrderType ?? "").toLowerCase() === "takeaway");
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
