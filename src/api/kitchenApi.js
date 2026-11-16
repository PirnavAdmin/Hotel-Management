import { apiClient } from "./apiConfig";

export function apiGetActiveKitchenTickets() {
  return apiClient("/api/Kitchen/active-tickets");
}

export function apiStartKitchenTicket(ticketId, batch = 1) {
  return apiClient(
    `/api/Kitchen/tickets/${encodeURIComponent(ticketId)}/start-cooking?batch=${encodeURIComponent(batch)}`,
    { method: "POST" },
  );
}

export function apiCompleteKitchenTicket(ticketId, batch = 1) {
  return apiClient(
    `/api/Kitchen/tickets/${encodeURIComponent(ticketId)}/complete?batch=${encodeURIComponent(batch)}`,
    { method: "POST" },
  );
}

export function apiUpdateKitchenItemStatus(itemId, status) {
  return apiClient(
    `/api/Kitchen/items/${encodeURIComponent(itemId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
