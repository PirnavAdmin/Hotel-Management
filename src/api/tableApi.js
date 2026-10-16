import { apiClient } from './apiConfig';

export async function apiGetTables() {
  return await apiClient('/api/v1/tables');
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
