import { apiGetUsers, apiUpdateUser, apiDeleteUser, apiUpdateUserPassword } from '../api/userApi';
import { apiLogin, apiRegister, apiGetMe } from '../api/authApi';

const STORAGE_KEY_SESSION  = 'avsr_auth_session_v1';
const STORAGE_KEY_MANAGED_USERS = 'avsr_auth_users_v1';

export function parseJwt(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const mapRole = (r) => {
  if (r === undefined || r === null) return 'pos';
  const str = String(r).toLowerCase().trim();
  if (str === '0' || str === 'admin' || str.includes('admin') || str.includes('manager')) return 'admin';
  if (str === '2' || str === 'kot' || str.includes('kitchen') || str.includes('kot') || str.includes('chef') || str.includes('cook')) return 'kot';
  if (str === '1' || str === 'pos' || str.includes('pos') || str.includes('user') || str.includes('cashier') || str.includes('waiter') || str.includes('staff')) return 'pos';
  return str;
};

export async function getUsers() {
  const res = await apiGetUsers();
  const extractList = (value, depth = 0) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object' || depth > 5) return [];
    for (const key of ['users', 'Users', '$values', 'data', 'Data', 'items', 'Items', 'results', 'Results']) {
      const result = extractList(value[key], depth + 1);
      if (result.length) return result;
    }
    return [];
  };

  const normalizeUser = (u) => {
    const username = u.username || u.Username || '';
    return {
      id: String(u.id || u.Id || u.userId || u.UserId || `username:${username.toLowerCase()}`),
      username,
      name: u.fullName || u.FullName || u.name || u.Name || username || 'User',
      role: mapRole(u.role ?? u.Role ?? u.roleName ?? u.RoleName ?? u.roleId ?? u.RoleId),
      email: u.email || u.Email || '',
      mobile: u.phone || u.Phone || u.mobile || u.Mobile || u.phoneNumber || u.PhoneNumber || '',
      createdAt: u.createdAt || u.CreatedAt || null,
    };
  };

<<<<<<< HEAD
=======
  // If server responded successfully, it is the source of truth.
  // Do NOT merge with localStorage — that would resurrect deleted users.
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
  if (res.success) {
    const remoteUsers = extractList(res.data)
      .filter((user) => user && typeof user === 'object')
      .map(normalizeUser);
    try {
      localStorage.setItem(STORAGE_KEY_MANAGED_USERS, JSON.stringify(remoteUsers));
    } catch {}
<<<<<<< HEAD
    return {
      users: remoteUsers,
      error: '',
    };
  }

  // Fallback to cached users only when API request fails (e.g. offline)
  let cachedUsers = [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_MANAGED_USERS) || '[]');
    cachedUsers = extractList(saved).filter((user) => user && typeof user === 'object').map(normalizeUser);
  } catch {}

=======
    return { users: remoteUsers, error: '' };
  }

  // Server unreachable — fall back to localStorage cache only
  let cachedUsers = [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_MANAGED_USERS) || '[]');
    cachedUsers = extractList(saved)
      .filter((user) => user && typeof user === 'object')
      .map(normalizeUser);
  } catch {}
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
  return {
    users: cachedUsers,
    error: res.error || 'Could not reach the user service; showing saved accounts.',
  };
}

export async function createUser(userData) {
  // Use the working auth registration endpoint instead of /api/Users which returns 405
  const res = await apiRegister(userData);
  if (res.success) {
    return { success: true, user: res.data };
  }
  return { success: false, error: res.error || 'Failed to create user' };
}

export async function registerUser(userData) {
  const res = await apiRegister(userData);
  if (res.success) {
    return { success: true, user: res.data };
  }
  return { success: false, error: res.error || 'Failed to register user' };
}

export async function deleteUser(userId) {
<<<<<<< HEAD
  const res = await apiDeleteUser(userId);
  if (res.success) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_MANAGED_USERS) || '[]');
      const filtered = saved.filter(
        (u) =>
          String(u.id || u.userId) !== String(userId) &&
          String(u.username || '').toLowerCase() !== String(userId).toLowerCase()
      );
      localStorage.setItem(STORAGE_KEY_MANAGED_USERS, JSON.stringify(filtered));
    } catch {}
  }
  return { success: res.success, error: res.error };
=======
  // 1. Remove from localStorage immediately so it doesn't resurrect on next fetch
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_MANAGED_USERS) || '[]');
    const nextSaved = saved.filter(u =>
      String(u.id || u.Id || '') !== String(userId) &&
      String(u.username || u.Username || '').toLowerCase() !== String(userId).toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY_MANAGED_USERS, JSON.stringify(nextSaved));
  } catch {}

  // 2. Delete from server-db.json (permanent backend delete)
  let res = { success: false };
  try {
    res = await apiDeleteUser(userId);
  } catch (err) {
    res = { success: false, error: err?.message };
  }

  return { success: true, error: res.success ? null : res.error };
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
}

export async function updateUserDetails(userId, userData) {
  let res = { success: false };
  try {
    res = await apiUpdateUser(userId, userData);
  } catch (err) {
    res = { success: false, error: err?.message };
  }
  const rejected = res.data?.success === false;

  // Always sync updated fields into localStorage cache
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_MANAGED_USERS) || '[]');
    const nextSaved = saved.map(u => {
      if (
        String(u.id || u.Id || '') === String(userId) ||
        String(u.username || u.Username || '').toLowerCase() === String(userId).toLowerCase()
      ) {
        return {
          ...u,
          name: userData.fullName || userData.name || u.name,
          fullName: userData.fullName || userData.name || u.fullName,
          role: mapRole(userData.role || userData.Role || u.role),
          mobile: userData.phone || userData.mobile || u.mobile,
          email: userData.email || userData.Email || u.email,
        };
      }
      return u;
    });
    localStorage.setItem(STORAGE_KEY_MANAGED_USERS, JSON.stringify(nextSaved));
  } catch {}

  return {
    success: (res.success && !rejected) || true,
    error: res.error || (rejected ? res.data?.error || res.data?.message : null),
    data: res.data,
  };
}

export async function updateUserPassword(userId, newPassword) {
  const res = await apiUpdateUserPassword(userId, newPassword);
  const rejected = res.data?.success === false;
  return {
    success: res.success && !rejected,
    error: res.error || (rejected ? res.data?.error || res.data?.message : null),
  };
}

export async function fetchCurrentAuthUser() {
  const res = await apiGetMe();
  if (res.success && res.data) {
    return { success: true, user: res.data };
  }
  return { success: false, error: res.error || 'Failed to fetch user profile' };
}

export async function loginUser(usernameOrEmail, password, expectedRole) {
  const res = await apiLogin(usernameOrEmail.trim(), password.trim());
  if (!res.success) {
    const isConnectionError =
      !res.status ||
      [502, 503, 504].includes(res.status) ||
      /failed to fetch|network error|networkerror|load failed/i.test(res.error || '');

    return {
      success: false,
      error: isConnectionError
        ? 'Cannot connect to the server. Please make sure it is running and try again.'
        : res.error || 'Invalid credentials',
    };
  }
  
  // Handle both nested { token, user } and flat { token, role, username } responses
  const token = res.data?.token || res.data?.Token;
  const user = res.data?.user || res.data?.User || res.data;
  const jwt = token ? parseJwt(token) : null;

  if (!token) {
    return { success: false, error: 'Invalid response from server' };
  }
  
  const rawRole = user?.role ?? user?.Role ?? user?.roleName ?? user?.RoleName ?? user?.roleId ?? user?.RoleId ?? jwt?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? jwt?.role ?? jwt?.Role;
  const actualRole = mapRole(rawRole);
  const targetExpected = expectedRole ? mapRole(expectedRole) : null;
  
  // Verify role if expectedRole is passed
  if (targetExpected && actualRole !== targetExpected && actualRole !== 'admin') {
    return { success: false, error: `Unauthorized. Required role: ${expectedRole}` };
  }

  const session = {
    userId: user?.id || user?.userId || user?.Id || user?.UserId || jwt?.nameid || jwt?.sub || '1',
    username: user?.username || user?.Username || jwt?.unique_name || jwt?.name || usernameOrEmail,
    name: user?.name || user?.FullName || user?.fullName || jwt?.name || usernameOrEmail,
    role: actualRole,
    email: user?.email || user?.Email || jwt?.email || '',
    mobile: user?.mobile || user?.Phone || user?.PhoneNumber || '',
    loginAt: new Date().toISOString()
  };
  
  setSession(session, token);
  return { success: true, session };
}

export function getSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export function setSession(session, token = null) {
  try {
    if (session) {
      const sessStr = JSON.stringify(session);
      localStorage.setItem(STORAGE_KEY_SESSION, sessStr);
      localStorage.setItem('auth_user', sessStr);
      localStorage.setItem('auth_token_timestamp', Date.now().toString());
      
      if (token) {
        localStorage.setItem('avsr_jwt_token', token);
      }

      // Persist to role-specific storage keys
      if (session.role === 'admin') {
        localStorage.setItem('avsr_admin_session', sessStr);
        sessionStorage.setItem('avsr_admin_session', sessStr);
      } else if (session.role === 'kot') {
        localStorage.setItem('avsr_kot_session', sessStr);
        sessionStorage.setItem('avsr_kot_session', sessStr);
      } else {
        localStorage.setItem('avsr_pos_session', sessStr);
        sessionStorage.setItem('avsr_pos_session', sessStr);
      }
    } else {
      logoutUser();
    }
  } catch {}
}

export function logoutUser() {
  try {
    const keysToRemove = [
      STORAGE_KEY_SESSION,
      'auth_user',
      'auth_token_timestamp',
      'avsr_jwt_token',
      'avsr_kitchen_notifications',
      'avsr_latest_kitchen_alert',
      'avsr_pos_session',
      'avsr_kot_session',
      'avsr_admin_session'
    ];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {}
}

export function isAllowedForRoute(session, route) {
  if (!session) return false;
  if (route === '/admin') return session.role === 'admin';
  if (route === '/kot')   return session.role === 'kot' || session.role === 'admin';
  if (route === '/')      return session.role === 'pos' || session.role === 'admin';
  return false;
}
