// ============================================================
// AVSR FOOD COURT — Live Backend API Integration Service
// Base URL: https://cultivate-suitable-manmade.ngrok-free.dev
// ============================================================

const API_BASE_URL = 'https://cultivate-suitable-manmade.ngrok-free.dev';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true'
};

// Helper fetch wrapper
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('avsr_jwt_token') : null;
    
    const headers = {
      ...DEFAULT_HEADERS,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    const res = await fetch(url, config);
    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, error: errorText || `HTTP Error ${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn(`[API Integration Warning] Failed request to ${endpoint}:`, err);
    return { success: false, error: err.message };
  }
}

// ── TABLES API ────────────────────────────────────────────────
export async function apiGetTables() {
  const res = await apiRequest('/api/v1/tables');
  if (res && res.data && Array.isArray(res.data)) {
    return res.data.map(t => ({
      id: t.tableId || t.id,
      name: t.tableName || `Table ${t.tableId}`,
      section: t.sectionArea || 'Main Hall',
      capacity: t.capacityChairs || 4,
      status: String(t.status || 'VACANT').toLowerCase(),
      server: t.assignedServerName || 'Unassigned',
      guests: t.occupiedChairs || 0,
      items: Array.isArray(t.items) ? t.items : [],
      orderTime: t.orderTime || null,
      discountPercent: t.discountPercent || 0,
      serviceCharge: t.serviceCharge !== undefined ? t.serviceCharge : 5,
      occupiedSince: t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10 min',
      order: null
    }));
  }
  return null;
}


export async function apiCreateTable(tableData) {
  return await apiRequest('/api/v1/tables', {
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
  return await apiRequest(`/api/v1/tables/${id}`, {
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
  return await apiRequest(`/api/v1/tables/${id}`, {
    method: 'DELETE'
  });
}

// ── MENU ITEMS API ─────────────────────────────────────────────
export async function apiGetMenuItems() {
  const res = await apiRequest('/api/v1/menu-items');
  if (res && res.data && Array.isArray(res.data)) {
    return res.data.map(m => ({
      id: `m-${m.menuItemId || m.id}`,
      backendId: m.menuItemId || m.id,
      name: m.dishName || 'Unnamed Dish',
      category: String(m.category || 'mains').toLowerCase(),
      price: parseFloat(m.price || 0),
      isVeg: String(m.dietaryType || '').toUpperCase() === 'VEG',
      isChefSpecial: !!m.isChefsSpecial,
      spiceLevel: m.spiceLevel || 1,
      prepTime: `${m.prepTimeMinutes || 15} min`,
      description: m.shortDescription || 'Delicious authentic preparation.',
      image: m.imageUrl || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80',
      isAvailable: m.isAvailable !== false
    }));
  }
  return null;
}

export async function apiCreateMenuItem(itemData) {
  return await apiRequest('/api/v1/menu-items', {
    method: 'POST',
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category || 'Main Course',
      price: parseFloat(itemData.price || 0),
      dietaryType: itemData.isVeg ? 'VEG' : 'NON-VEG',
      spiceLevel: itemData.spiceLevel || 1,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || '',
      imageUrl: itemData.image || '',
      isChefsSpecial: !!itemData.isChefSpecial,
      isAvailable: true
    })
  });
}

export async function apiUpdateMenuItem(id, itemData) {
  const cleanId = String(id).replace('m-', '');
  return await apiRequest(`/api/v1/menu-items/${cleanId}`, {
    method: 'PUT',
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category,
      price: parseFloat(itemData.price || 0),
      dietaryType: itemData.isVeg ? 'VEG' : 'NON-VEG',
      spiceLevel: itemData.spiceLevel || 1,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || '',
      imageUrl: itemData.image || '',
      isChefsSpecial: !!itemData.isChefSpecial,
      isAvailable: itemData.isAvailable !== false
    })
  });
}

export async function apiDeleteMenuItem(id) {
  const cleanId = String(id).replace('m-', '');
  return await apiRequest(`/api/v1/menu-items/${cleanId}`, {
    method: 'DELETE'
  });
}

// ── KOT ORDERS API ─────────────────────────────────────────────
export async function apiGetKotOrders() {
  const res = await apiRequest('/api/v1/kot/orders');
  if (res && res.data && Array.isArray(res.data)) {
    return res.data;
  }
  return null;
}

export async function apiCreateKotOrder(kotData) {
  return await apiRequest('/api/v1/kot/orders', {
    method: 'POST',
    body: JSON.stringify(kotData)
  });
}

export async function apiUpdateKotStatus(kotId, status) {
  return await apiRequest(`/api/v1/kot/orders/${kotId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
}

// ── STAFF API ──────────────────────────────────────────────────
export async function apiGetStaff() {
  const res = await apiRequest('/api/v1/staff');
  if (res && res.data && Array.isArray(res.data)) {
    return res.data;
  }
  return null;
}

export async function apiCreateStaff(staffData) {
  return await apiRequest('/api/v1/staff', {
    method: 'POST',
    body: JSON.stringify({
      name: staffData.name,
      role: staffData.role || 'Waiter',
      phone: staffData.phone || '',
      email: staffData.email || '',
      shift: staffData.shift || 'Full Day'
    })
  });
}

export async function apiDeleteStaff(id) {
  return await apiRequest(`/api/v1/staff/${id}`, {
    method: 'DELETE'
  });
}

// ── ORDERS & BILLING API ───────────────────────────────────────
export async function apiGetOrders() {
  const res = await apiRequest('/api/v1/orders');
  if (res && res.data && Array.isArray(res.data)) {
    return res.data;
  }
  return null;
}

export async function apiCreateOrder(orderData) {
  return await apiRequest('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

// ── AUTH API ───────────────────────────────────────────────────
export async function apiLogin(username, password) {
  return await apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function apiRegister(regData) {
  return await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(regData)
  });
}

export async function apiForgotPassword(email) {
  return await apiRequest('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function apiSendOtp(email) {
  return await apiRequest('/api/v1/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function apiVerifyOtp(email, otp) {
  return await apiRequest('/api/v1/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  });
}

export async function apiResetPassword(email, otp, newPassword) {
  return await apiRequest('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword })
  });
}


