import { apiClient } from './apiConfig';

export async function apiGetTables() {
  const res = await apiClient('/api/v1/tables');
  if (res.success && res.data) {
    const list = Array.isArray(res.data) 
      ? res.data 
      : (res.data.tables || res.data.data || []);
    return list.map(t => ({
      id: t.tableId || t.id,
      name: t.tableName || t.name || `Table ${t.tableId || t.id}`,
      section: t.sectionArea || t.section || 'Main Hall',
      capacity: t.capacityChairs || t.capacity || 4,
      status: (t.status || 'vacant').toLowerCase(),
      server: t.assignedServerName || t.server || 'Staff',
      guests: t.occupiedChairs || t.guests || 0,
      items: Array.isArray(t.items) ? t.items : [],
      orderTime: t.orderTime || null,
      discountPercent: t.discountPercent || 0,
      serviceCharge: t.serviceCharge || 5,
      occupiedSince: t.occupiedSince || '10:00 AM'
    }));
  }
  return [];
}

export async function apiCreateTable(tableData) {
  return await apiClient('/api/v1/tables', {
    method: 'POST',
    body: JSON.stringify({
      tableName: tableData.name,
      sectionArea: tableData.section || 'Main Hall',
      capacityChairs: parseInt(tableData.capacity || 4, 10),
      status: 'VACANT'
    })
  });
}

export async function apiUpdateTable(id, tableData) {
  return await apiClient(`/api/v1/tables/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      tableName: tableData.name,
      sectionArea: tableData.section,
      capacityChairs: parseInt(tableData.capacity || 4, 10),
      status: tableData.status ? String(tableData.status).toUpperCase() : 'VACANT'
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
