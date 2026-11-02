import { apiClient } from './apiConfig';

/**
 * Fetch bar tables with optional filtering (search, area, occupancy, minimumCapacity).
 * GET /api/v1/bar/tables
 */
export async function apiGetBarTables(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.area && params.area !== 'all') query.set('area', params.area);
  if (params.occupancy && params.occupancy !== 'all') query.set('occupancy', params.occupancy);
  if (params.minimumCapacity && params.minimumCapacity !== 'all') query.set('minimumCapacity', params.minimumCapacity);

  const qs = query.toString();
  return await apiClient(`/api/v1/bar/tables${qs ? `?${qs}` : ''}`);
}

/**
 * Get single bar table by ID.
 * GET /api/v1/bar/tables/{id}
 */
export async function apiGetBarTableById(id) {
  return await apiClient(`/api/v1/bar/tables/${id}`);
}

/**
 * Create a new bar table.
 * POST /api/v1/bar/tables
 */
export async function apiCreateBarTable(tableData) {
  const tableNum = String(tableData.tableNumber || tableData.name || tableData.tableName || '').trim();
  const area = String(tableData.sectionArea || tableData.section || tableData.area || 'Main Hall').trim();
  const cap = parseInt(tableData.capacity || tableData.capacityChairs || tableData.seatingCapacity || tableData.chairs || 4, 10);
  const status = tableData.status ? String(tableData.status).toLowerCase() : 'available';
  const serverId = tableData.assignedServerId ? Number(tableData.assignedServerId) : null;
  const server = tableData.server || tableData.assignedServer || '';

  return await apiClient('/api/v1/bar/tables', {
    method: 'POST',
    body: JSON.stringify({
      tableNumber: tableNum,
      tableName: tableNum,
      name: tableNum,
      sectionArea: area,
      section: area,
      area: area,
      capacity: cap,
      capacityChairs: cap,
      seatingCapacity: cap,
      chairs: cap,
      status: status,
      occupancyStatus: status,
      assignedServerId: serverId,
      assignedServer: server,
      server: server,
    }),
  });
}

/**
 * Update an existing bar table.
 * PUT /api/v1/bar/tables/{id}
 */
export async function apiUpdateBarTable(id, tableData) {
  const tableNum = String(tableData.tableNumber || tableData.name || tableData.tableName || '').trim();
  const area = String(tableData.sectionArea || tableData.section || tableData.area || 'Main Hall').trim();
  const cap = parseInt(tableData.capacity || tableData.capacityChairs || tableData.seatingCapacity || tableData.chairs || 4, 10);
  const status = tableData.status ? String(tableData.status).toLowerCase() : undefined;
  const serverId = tableData.assignedServerId ? Number(tableData.assignedServerId) : null;
  const server = tableData.server || tableData.assignedServer || '';
  const guests = tableData.guests !== undefined ? Number(tableData.guests) : undefined;

  return await apiClient(`/api/v1/bar/tables/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      tableNumber: tableNum,
      tableName: tableNum,
      name: tableNum,
      sectionArea: area,
      section: area,
      area: area,
      capacity: cap,
      capacityChairs: cap,
      seatingCapacity: cap,
      chairs: cap,
      status: status,
      occupancyStatus: status,
      currentGuests: guests,
      guests: guests,
      assignedServerId: serverId,
      assignedServer: server,
      server: server,
    }),
  });
}

/**
 * Quick status change for bar table (Available, Occupied, Reserved, Billed).
 * PATCH /api/v1/bar/tables/{id}/status
 */
export async function apiUpdateBarTableStatus(id, status, currentGuests = null) {
  return await apiClient(`/api/v1/bar/tables/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      currentGuests,
    }),
  });
}

/**
 * Delete a bar table.
 * DELETE /api/v1/bar/tables/{id}
 */
export async function apiDeleteBarTable(id) {
  return await apiClient(`/api/v1/bar/tables/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get distinct table areas/sections for Bar tables.
 * GET /api/v1/bar/tables/areas
 */
export async function apiGetBarTableAreas() {
  return await apiClient('/api/v1/bar/tables/areas');
}


/**
 * ============================================================================
 * Screen 2 & 3: Bar Drinks Menu & Add/Edit Drink APIs
 * ============================================================================
 */

/**
 * Fetch drinks list with optional query filters (search, category, availability, minPrice, maxPrice, priceRange).
 * GET /api/v1/bar/drinks
 */
export async function apiGetBarDrinks(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category && params.category !== 'all') query.set('category', params.category);
  if (params.availability && params.availability !== 'all') query.set('availability', params.availability);
  if (params.minPrice !== undefined && params.minPrice !== null && params.minPrice !== '') query.set('minPrice', params.minPrice);
  if (params.maxPrice !== undefined && params.maxPrice !== null && params.maxPrice !== '') query.set('maxPrice', params.maxPrice);
  if (params.priceRange && params.priceRange !== 'all') query.set('priceRange', params.priceRange);

  const qs = query.toString();
  return await apiClient(`/api/v1/bar/drinks${qs ? `?${qs}` : ''}`);
}

/**
 * Get single drink by ID or identifier.
 * GET /api/v1/bar/drinks/{id}
 */
export async function apiGetBarDrinkById(id) {
  return await apiClient(`/api/v1/bar/drinks/${encodeURIComponent(id)}`);
}

/**
 * Create a new bar drink.
 * POST /api/v1/bar/drinks
 */
export async function apiCreateBarDrink(drinkData) {
  const name = String(drinkData.name || drinkData.dishName || drinkData.drinkName || '').trim();
  const category = String(drinkData.category || 'Cocktails').trim();
  const measure = String(drinkData.measure || drinkData.servingMeasure || drinkData.servingVolume || '30 ml (Single Peg)').trim();
  const price = Number(drinkData.price ?? drinkData.sellingPrice ?? 0);
  const isAvail = drinkData.isAvailable !== false && drinkData.isAvailable !== 'Unavailable';
  const drinkType = String(drinkData.drinkType || (drinkData.abv ? 'Alcoholic' : 'Non-Alcoholic')).trim();
  const abv = drinkData.abv !== undefined && drinkData.abv !== null && drinkData.abv !== ''
    ? Number(drinkData.abv)
    : (drinkData.alcoholContent !== undefined ? Number(drinkData.alcoholContent) : (drinkType === 'Alcoholic' ? 40 : 0));
  const isSpecial = Boolean(
    drinkData.isSpecial ||
    drinkData.isBartenderSpecial ||
    drinkData.isChefSpecial ||
    drinkData.isChefsSpecial
  );
  const prepTime = String(drinkData.prepTime || '15 min');
  const prepMinutes = parseInt(drinkData.prepTimeMinutes || prepTime, 10) || 15;
  const desc = String(drinkData.description || drinkData.shortDescription || '').trim();
  const image = String(drinkData.image || drinkData.imageUrl || '').trim();

  return await apiClient('/api/v1/bar/drinks', {
    method: 'POST',
    body: JSON.stringify({
      drinkName: name,
      name: name,
      dishName: name,
      category: category,
      servingMeasure: measure,
      measure: measure,
      servingVolume: measure,
      price: price,
      sellingPrice: price,
      isAvailable: isAvail,
      drinkType: drinkType,
      alcoholContent: abv,
      abv: abv,
      alcoholPct: abv,
      isSpecial: isSpecial,
      isBartenderSpecial: isSpecial,
      isChefsSpecial: isSpecial,
      prepTimeMinutes: prepMinutes,
      prepTime: prepTime,
      description: desc,
      shortDescription: desc,
      imageUrl: image,
      image: image,
      isVeg: drinkData.isVeg !== undefined ? Boolean(drinkData.isVeg) : drinkType !== 'Alcoholic',
    }),
  });
}

/**
 * Update an existing bar drink.
 * PUT /api/v1/bar/drinks/{id}
 */
export async function apiUpdateBarDrink(id, drinkData) {
  const name = String(drinkData.name || drinkData.dishName || drinkData.drinkName || '').trim();
  const category = String(drinkData.category || 'Cocktails').trim();
  const measure = String(drinkData.measure || drinkData.servingMeasure || drinkData.servingVolume || '30 ml (Single Peg)').trim();
  const price = Number(drinkData.price ?? drinkData.sellingPrice ?? 0);
  const isAvail = drinkData.isAvailable !== false && drinkData.isAvailable !== 'Unavailable';
  const drinkType = String(drinkData.drinkType || (drinkData.abv ? 'Alcoholic' : 'Non-Alcoholic')).trim();
  const abv = drinkData.abv !== undefined && drinkData.abv !== null && drinkData.abv !== ''
    ? Number(drinkData.abv)
    : (drinkData.alcoholContent !== undefined ? Number(drinkData.alcoholContent) : (drinkType === 'Alcoholic' ? 40 : 0));
  const isSpecial = Boolean(
    drinkData.isSpecial ||
    drinkData.isBartenderSpecial ||
    drinkData.isChefSpecial ||
    drinkData.isChefsSpecial
  );
  const prepTime = String(drinkData.prepTime || '15 min');
  const prepMinutes = parseInt(drinkData.prepTimeMinutes || prepTime, 10) || 15;
  const desc = String(drinkData.description || drinkData.shortDescription || '').trim();
  const image = String(drinkData.image || drinkData.imageUrl || '').trim();

  return await apiClient(`/api/v1/bar/drinks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      drinkName: name,
      name: name,
      dishName: name,
      category: category,
      servingMeasure: measure,
      measure: measure,
      servingVolume: measure,
      price: price,
      sellingPrice: price,
      isAvailable: isAvail,
      drinkType: drinkType,
      alcoholContent: abv,
      abv: abv,
      alcoholPct: abv,
      isSpecial: isSpecial,
      isBartenderSpecial: isSpecial,
      isChefsSpecial: isSpecial,
      prepTimeMinutes: prepMinutes,
      prepTime: prepTime,
      description: desc,
      shortDescription: desc,
      imageUrl: image,
      image: image,
      isVeg: drinkData.isVeg !== undefined ? Boolean(drinkData.isVeg) : drinkType !== 'Alcoholic',
    }),
  });
}

/**
 * Toggle drink availability (Available / Unavailable).
 * PATCH /api/v1/bar/drinks/{id}/availability
 */
export async function apiToggleBarDrinkAvailability(id, isAvailable) {
  return await apiClient(`/api/v1/bar/drinks/${encodeURIComponent(id)}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable: Boolean(isAvailable) }),
  });
}

/**
 * Toggle drink Bartender's Special.
 * PATCH /api/v1/bar/drinks/{id}/special
 */
export async function apiToggleBarDrinkSpecial(id, isSpecial) {
  return await apiClient(`/api/v1/bar/drinks/${encodeURIComponent(id)}/special`, {
    method: 'PATCH',
    body: JSON.stringify({ isSpecial: Boolean(isSpecial) }),
  });
}

/**
 * Delete a bar drink item.
 * DELETE /api/v1/bar/drinks/{id}
 */
export async function apiDeleteBarDrink(id) {
  return await apiClient(`/api/v1/bar/drinks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/**
 * Get distinct categories for Bar drinks.
 * GET /api/v1/bar/drinks/categories
 */
export async function apiGetBarDrinkCategories() {
  return await apiClient('/api/v1/bar/drinks/categories');
}

/**
 * Get list of standard serving measures.
 * GET /api/v1/bar/drinks/serving-measures
 */
export async function apiGetBarServingMeasures() {
  return await apiClient('/api/v1/bar/drinks/serving-measures');
}

/**
 * Get list of standard price range filter options.
 * GET /api/v1/bar/drinks/price-ranges
 */
export async function apiGetBarPriceRanges() {
  return await apiClient('/api/v1/bar/drinks/price-ranges');
}

/**
 * Get list of availability filter options.
 * GET /api/v1/bar/drinks/availability-options
 */
export async function apiGetBarAvailabilityOptions() {
  return await apiClient('/api/v1/bar/drinks/availability-options');
}

/**
 * ============================================================================
 * Screen 1: Bar Overview & Recent Orders APIs
 * ============================================================================
 */

/**
 * Fetch Bar Overview dashboard KPIs, live tables, signature drinks, and recent orders.
 * GET /api/v1/bar/overview
 */
export async function apiGetBarOverview(branchId = null) {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  return await apiClient(`/api/v1/bar/overview${query}`);
}

/**
 * Fetch recent Bar orders.
 * GET /api/v1/bar/orders
 */
export async function apiGetBarRecentOrders(limit = 15, branchId = null) {
  const query = new URLSearchParams();
  if (limit) query.set('limit', limit);
  if (branchId) query.set('branchId', branchId);
  const qs = query.toString();
  return await apiClient(`/api/v1/bar/orders${qs ? `?${qs}` : ''}`);
}

/**
 * ============================================================================
 * Screen 6 & 7: Bar Staff & Persons APIs
 * ============================================================================
 */

/**
 * Fetch bar staff members with optional filtering (search, role, shift, assignment).
 * GET /api/v1/bar/staff
 */
export async function apiGetBarStaff(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.role && params.role !== 'all' && params.role !== 'All Roles') query.set('role', params.role);
  if (params.shift && params.shift !== 'all' && params.shift !== 'All Shifts') query.set('shift', params.shift);
  if (params.assignment && params.assignment !== 'all' && params.assignment !== 'All Assignments' && params.assignment !== 'All Tables') {
    query.set('assignment', params.assignment);
  }

  const qs = query.toString();
  return await apiClient(`/api/v1/bar/staff${qs ? `?${qs}` : ''}`);
}

/**
 * Get single staff member by ID.
 * GET /api/v1/bar/staff/{id}
 */
export async function apiGetBarStaffById(id) {
  return await apiClient(`/api/v1/bar/staff/${encodeURIComponent(id)}`);
}

/**
 * Create a new bar staff member.
 * POST /api/v1/bar/staff
 */
export async function apiCreateBarStaff(staffData) {
  const name = String(staffData.fullName || staffData.name || '').trim();
  const role = String(staffData.jobTitle || staffData.roleTitle || staffData.role || 'Server / Waiter').trim();
  const phone = String(staffData.phone || staffData.contact || '').trim();
  const shift = String(staffData.shift || 'Morning Shift (10 AM - 4 PM)').trim();
  const assignedTableIds = Array.isArray(staffData.assignedTableIds) ? staffData.assignedTableIds : [];
  const assignedTables = Array.isArray(staffData.assignedTables) ? staffData.assignedTables : [];
  const isActive = staffData.isActive !== undefined ? Boolean(staffData.isActive) : true;

  return await apiClient('/api/v1/bar/staff', {
    method: 'POST',
    body: JSON.stringify({
      fullName: name,
      name: name,
      jobTitle: role,
      role: role,
      roleTitle: role,
      phone: phone,
      shift: shift,
      assignedTableIds,
      assignedTables,
      isActive,
    }),
  });
}

/**
 * Update an existing bar staff member.
 * PUT /api/v1/bar/staff/{id}
 */
export async function apiUpdateBarStaff(id, staffData) {
  const name = staffData.fullName || staffData.name;
  const role = staffData.jobTitle || staffData.roleTitle || staffData.role;
  const phone = staffData.phone || staffData.contact;
  const shift = staffData.shift;
  const assignedTableIds = staffData.assignedTableIds;
  const assignedTables = staffData.assignedTables;
  const isActive = staffData.isActive;

  const payload = {};
  if (name !== undefined) {
    payload.fullName = String(name).trim();
    payload.name = String(name).trim();
  }
  if (role !== undefined) {
    payload.jobTitle = String(role).trim();
    payload.role = String(role).trim();
    payload.roleTitle = String(role).trim();
  }
  if (phone !== undefined) payload.phone = String(phone).trim();
  if (shift !== undefined) payload.shift = String(shift).trim();
  if (assignedTableIds !== undefined) payload.assignedTableIds = assignedTableIds;
  if (assignedTables !== undefined) payload.assignedTables = assignedTables;
  if (isActive !== undefined) payload.isActive = Boolean(isActive);

  return await apiClient(`/api/v1/bar/staff/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Toggle active status of a staff member.
 * PATCH /api/v1/bar/staff/{id}/toggle-status
 */
export async function apiToggleBarStaffStatus(id) {
  return await apiClient(`/api/v1/bar/staff/${encodeURIComponent(id)}/toggle-status`, {
    method: 'PATCH',
  });
}

/**
 * Delete a bar staff member.
 * DELETE /api/v1/bar/staff/{id}
 */
export async function apiDeleteBarStaff(id) {
  return await apiClient(`/api/v1/bar/staff/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/**
 * Get dropdown filter options for Staff & Persons screen.
 * GET /api/v1/bar/staff/filter-options
 */
export async function apiGetBarStaffFilterOptions() {
  return await apiClient('/api/v1/bar/staff/filter-options');
}

/**
 * Get assignable bar tables for Staff table assignment.
 * GET /api/v1/bar/staff/assignable-tables
 */
export async function apiGetAssignableTables() {
  return await apiClient('/api/v1/bar/staff/assignable-tables');
}

// ============================================================================
// Screen 8: Bar Order Tickets (BOT) Dispatch APIs
// ============================================================================

/**
 * Get active Bar BOT tickets (with drinks list).
 * GET /api/v1/bar/bot/tickets
 */
export async function apiGetBarBotTickets(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.table && filters.table !== 'all') params.append('table', filters.table);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return await apiClient(`/api/v1/bar/bot/tickets${qs}`);
}

/**
 * Get KPI summary metrics for Bar BOT screen.
 * GET /api/v1/bar/bot/summary
 */
export async function apiGetBarBotSummary() {
  return await apiClient('/api/v1/bar/bot/summary');
}

/**
 * Get filter dropdown options (Tables & Statuses) for Bar BOT.
 * GET /api/v1/bar/bot/filter-options
 */
export async function apiGetBarBotFilterOptions() {
  return await apiClient('/api/v1/bar/bot/filter-options');
}

/**
 * Unified Bar BOT Screen Feed (Summary + Tickets + FilterOptions).
 * GET /api/v1/bar/bot/screen-feed
 */
export async function apiGetBarBotScreenFeed(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.table && filters.table !== 'all') params.append('table', filters.table);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return await apiClient(`/api/v1/bar/bot/screen-feed${qs}`);
}

/**
 * Get a single Bar BOT ticket by ID.
 * GET /api/v1/bar/bot/{id}
 */
export async function apiGetBarBotTicketById(id) {
  return await apiClient(`/api/v1/bar/bot/${encodeURIComponent(id)}`);
}

/**
 * Update the overall status of a Bar BOT ticket.
 * PATCH /api/v1/bar/bot/{id}/status
 */
export async function apiUpdateBarBotStatus(id, status) {
  return await apiClient(`/api/v1/bar/bot/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Mark all drinks in a Bar BOT ticket as ready.
 * POST /api/v1/bar/bot/{id}/mark-all-ready
 */
export async function apiMarkAllBarBotReady(id) {
  return await apiClient(`/api/v1/bar/bot/${encodeURIComponent(id)}/mark-all-ready`, {
    method: 'POST',
  });
}

/**
 * Mark all drinks for a specific table as ready.
 * POST /api/v1/bar/bot/tables/{tableId}/mark-all-ready
 */
export async function apiMarkAllBarBotTableReady(tableId) {
  return await apiClient(`/api/v1/bar/bot/tables/${encodeURIComponent(tableId)}/mark-all-ready`, {
    method: 'POST',
  });
}

/**
 * Update the status of an individual drink line item inside a Bar BOT.
 * PATCH /api/v1/bar/bot/items/{orderItemId}/status
 */
export async function apiUpdateBarBotItemStatus(orderItemId, status) {
  return await apiClient(`/api/v1/bar/bot/items/${encodeURIComponent(orderItemId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Advance a drink item to its next status (queued -> cooking -> ready -> served).
 * POST /api/v1/bar/bot/items/{orderItemId}/advance
 */
export async function apiAdvanceBarBotItemStatus(orderItemId) {
  return await apiClient(`/api/v1/bar/bot/items/${encodeURIComponent(orderItemId)}/advance`, {
    method: 'POST',
  });
}

// Aliases for backwards compatibility with KOT terminology
export const apiGetBarKotTickets = apiGetBarBotTickets;
export const apiGetBarKotSummary = apiGetBarBotSummary;
export const apiGetBarKotFilterOptions = apiGetBarBotFilterOptions;
export const apiGetBarKotScreenFeed = apiGetBarBotScreenFeed;
export const apiGetBarKotTicketById = apiGetBarBotTicketById;
export const apiUpdateBarKotStatus = apiUpdateBarBotStatus;
export const apiMarkAllBarKotReady = apiMarkAllBarBotReady;
export const apiUpdateBarKotItemStatus = apiUpdateBarBotItemStatus;
export const apiAdvanceBarKotItemStatus = apiAdvanceBarBotItemStatus;
