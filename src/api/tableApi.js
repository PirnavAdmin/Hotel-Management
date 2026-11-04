import { apiClient } from './apiConfig';

export async function apiGetTables() {
  return await apiClient('/api/v1/tables');
}

export async function apiCreateTable(tableData) {
  const tableNum = String(tableData.tableNumber || tableData.name || tableData.tableName || "").trim();
  const branch = Number(tableData.branchId) || 1;
  const section = String(tableData.section || tableData.sectionArea || tableData.location || "Main Hall").trim();
  const cap = parseInt(tableData.capacity || tableData.capacityChairs || 4, 10);
  const status = tableData.status ? String(tableData.status).toLowerCase() : "vacant";
  const serverId = tableData.assignedServerId ? Number(tableData.assignedServerId) : null;
  const serverName = tableData.server || tableData.assignedServerName || null;

  return await apiClient('/api/v1/tables', {
    method: 'POST',
    body: JSON.stringify({
      tableNumber: tableNum,
      tableName: tableNum,
      name: tableNum,
      branchId: branch,
      sectionArea: section,
      section: section,
      location: section,
      capacityChairs: cap,
      capacity: cap,
      status: status,
      assignedServerId: serverId,
      server: serverName,
      assignedServerName: serverName,
      qrCodeUrl: tableData.qrCodeUrl || null
    })
  });
}

export async function apiUpdateTable(id, tableData) {
  const tableNum = String(tableData.tableNumber || tableData.name || tableData.tableName || "").trim();
  const branch = Number(tableData.branchId) || 1;
  const section = String(tableData.section || tableData.sectionArea || tableData.location || "Main Hall").trim();
  const cap = parseInt(tableData.capacity || tableData.capacityChairs || 4, 10);
  const items = Array.isArray(tableData.items) ? tableData.items : [];
  const hasItems = items.some((i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled");
  const guests = Number(tableData.guests) || (Array.isArray(tableData.selectedSeats) ? tableData.selectedSeats.length : 0);
  const occupiedChairs = Number(tableData.occupiedChairs ?? tableData.guests) || guests;
  const selectedSeats = Array.isArray(tableData.selectedSeats) ? tableData.selectedSeats : [];
  const status = (guests > 0 || selectedSeats.length > 0 || hasItems)
    ? (tableData.status === "dining" || tableData.status === "billed" ? tableData.status : "occupied")
    : (tableData.status ? String(tableData.status).toLowerCase() : "vacant");
  const serverId = tableData.assignedServerId ? Number(tableData.assignedServerId) : null;
  const serverName = tableData.server || tableData.assignedServerName || null;

  return await apiClient(`/api/v1/tables/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      tableNumber: tableNum,
      tableName: tableNum,
      name: tableNum,
      branchId: branch,
      sectionArea: section,
      section: section,
      location: section,
      capacityChairs: cap,
      capacity: cap,
      status: status,
      guests: guests,
      occupiedChairs: occupiedChairs,
      selectedSeats: selectedSeats,
      items: items,
      orderTime: tableData.orderTime || null,
      orderTimestamp: tableData.orderTimestamp || null,
      assignedServerId: serverId,
      server: serverName,
      assignedServerName: serverName,
      qrCodeUrl: tableData.qrCodeUrl || null
    })
  });
}

export async function apiDeleteTable(id) {
  return await apiClient(`/api/v1/tables/${id}`, {
    method: 'DELETE'
  });
}

export async function apiTransferTable(fromId, toId) {
  return await apiClient('/api/v1/tables/transfer', {
    method: 'POST',
    body: JSON.stringify({ fromTableId: fromId, toTableId: toId })
  });
}

export async function apiVacateTable(id) {
  return await apiClient(`/api/v1/tables/${id}/vacate`, {
    method: 'POST'
  });
}

export async function apiUpdateTableStatus(id, status) {
  return await apiClient(`/api/v1/tables/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}
