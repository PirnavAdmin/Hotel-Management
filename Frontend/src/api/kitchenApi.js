import { apiClient } from "./apiConfig";

async function kitchenRequest(endpoint, options) {
  const result = await apiClient(endpoint, options);
  if (!result?.success) {
    const error = new Error(result?.error || `Kitchen API request failed for ${endpoint}.`);
    error.status = result?.status;
    throw error;
  }
  return result;
}

export function apiGetActiveKitchenTickets() {
  return kitchenRequest("/api/v1/kitchen/active-tickets");
}

export function apiStartKitchenTicket(ticketId, batch = 1) {
  return kitchenRequest(
    `/api/v1/kitchen/tickets/${encodeURIComponent(ticketId)}/start-cooking?batch=${encodeURIComponent(batch)}`,
    { method: "POST" },
  );
}

export function apiCompleteKitchenTicket(ticketId, batch = 1) {
  return kitchenRequest(
    `/api/v1/kitchen/tickets/${encodeURIComponent(ticketId)}/complete?batch=${encodeURIComponent(batch)}`,
    { method: "POST" },
  );
}

export function apiUpdateKitchenItemStatus(itemId, status) {
  return kitchenRequest(
    `/api/v1/kitchen/items/${encodeURIComponent(itemId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
