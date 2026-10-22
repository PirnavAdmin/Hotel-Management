import { apiClient } from "./apiConfig";

export async function apiGetOrders() {
  return await apiClient("/api/v1/orders");
}

export async function apiGetActiveOrders() {
  return await apiClient("/api/v1/orders/active");
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

export async function apiUpdateOrderItem(orderId, itemId, updates) {
  return await apiClient(`/api/v1/orders/${orderId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
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

export async function apiGetOrderHistory() {
  const pageSize = 100;
  const firstResponse = await apiClient(
    `/api/v1/orders/history?page=1&pageSize=${pageSize}`,
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
      `/api/v1/orders/history?page=${page}&pageSize=${pageSize}`,
    );
    const pageOrders = pageResponse?.data?.orders;
    if (!pageResponse?.success || !Array.isArray(pageOrders)) break;
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

export async function apiGetOrderReceipt(orderId) {
  return await apiClient(`/api/v1/orders/${orderId}/receipt`);
}
