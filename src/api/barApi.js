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
