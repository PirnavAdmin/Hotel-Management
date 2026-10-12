import { apiGetUsers, apiCreateUser, apiDeleteUser, apiUpdateUserPassword } from '../api/userApi';
import { apiLogin, apiRegister, apiGetMe } from '../api/authApi';

const STORAGE_KEY_SESSION  = 'avsr_auth_session_v1';

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

const STORAGE_KEY_USERS = 'avsr_auth_users_v1';

const DEFAULT_USERS = [
  {
    id: 'admin-001',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Administrator',
    email: 'admin@avsr.com',
    createdAt: '2026-10-05T11:21:12.371Z',
    createdBy: 'system'
  },
  {
    id: 'admin-1791459600601',
    username: 'pirnav',
    password: 'Admin@123',
    role: 'admin',
    name: 'pirnav',
    mobile: '9876543456',
    email: 'pasupuleti.bhanu7@gmail.com',
    createdAt: '2026-10-08T11:40:00.601Z',
    createdBy: 'system'
  },
  {
    id: 'admin-1791199351632',
    username: 'Pasupuleti',
    password: 'Bhanu@001',
    role: 'admin',
    name: 'Pasupuleti Bhanuprakash',
    mobile: '9032037787',
    email: 'pasupuleti.bhanu7@gmail.com',
    createdAt: '2026-10-05T11:22:31.633Z',
    createdBy: 'system'
  },
  {
    id: 'kot-001',
    username: 'kot',
    password: 'kot123',
    role: 'kot',
    name: 'Kitchen Chef (KOT)',
    email: 'kot@avsr.com',
    createdAt: '2026-10-08T12:04:01.389Z',
    createdBy: 'system'
  },
  {
    id: 'pos-001',
    username: 'pos',
    password: 'pos123',
    role: 'pos',
    name: 'Pasupuleti Bhanu (POS)',
    email: 'pos@avsr.com',
    createdAt: '2026-10-08T12:04:01.389Z',
    createdBy: 'system'
  },
  {
    id: 'user-001',
    username: 'user',
    password: 'user123',
    role: 'pos',
    name: 'Floor Staff User',
    email: 'user@avsr.com',
    createdAt: '2026-10-08T12:04:01.389Z',
    createdBy: 'system'
  }
];

export function getLocalUsers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        DEFAULT_USERS.forEach(def => {
          if (!parsed.some(u => String(u.username || '').toLowerCase() === def.username.toLowerCase())) {
            parsed.push(def);
          }
        });
        return parsed;
      }
    }
  } catch {}
  return [...DEFAULT_USERS];
}

export function saveLocalUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch {}
}

export async function getUsers() {
  let list = [];
  try {
    const res = await apiGetUsers();
    if (res.success && res.data) {
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data.$values && Array.isArray(res.data.$values)) {
        list = res.data.$values;
      } else if (res.data.users && Array.isArray(res.data.users)) {
        list = res.data.users;
      } else if (res.data.Users && Array.isArray(res.data.Users)) {
        list = res.data.Users;
      } else if (res.data.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      }
    }
  } catch {}

  if (!list || list.length === 0) {
    list = getLocalUsers();
  }

  return list.map(u => ({
    id: u.id || u.Id || u.userId || u.UserId || String(Math.random()),
    username: u.username || u.Username || '',
    name: u.fullName || u.FullName || u.name || u.Name || u.username || u.Username || 'User',
    role: mapRole(u.role ?? u.Role ?? u.roleName ?? u.RoleName ?? u.roleId ?? u.RoleId),
    email: u.email || u.Email || '',
    mobile: u.phone || u.Phone || u.mobile || u.Mobile || u.phoneNumber || u.PhoneNumber || '',
    createdAt: u.createdAt || u.CreatedAt || null,
    raw: u
  }));
}

export async function createUser(userData) {
  let res = null;
  try {
    res = await apiRegister(userData);
  } catch (err) {
    res = { success: false, error: err.message };
  }

  if (res && res.success) {
    return { success: true, user: res.data };
  }

  // Fallback to local storage if network error
  const isNetworkFailure = !res || !res.status || String(res.error || '').toLowerCase().includes('connect') || String(res.error || '').toLowerCase().includes('network') || String(res.error || '').toLowerCase().includes('offline') || String(res.error || '').toLowerCase().includes('tunnel') || String(res.error || '').toLowerCase().includes('fetch');

  if (isNetworkFailure) {
    const localUsers = getLocalUsers();
    const username = (userData.Username || userData.username || '').trim();
    if (localUsers.some(u => String(u.username || '').toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username already exists.' };
    }
    const newUser = {
      id: `user-${Date.now()}`,
      username,
      password: (userData.Password || userData.password || '').trim(),
      role: mapRole(userData.Role || userData.role || 'admin'),
      name: (userData.FullName || userData.fullName || username).trim(),
      email: (userData.Email || userData.email || '').trim(),
      mobile: (userData.Phone || userData.phone || '').trim(),
      createdAt: new Date().toISOString(),
      createdBy: 'self-register'
    };
    localUsers.push(newUser);
    saveLocalUsers(localUsers);
    return { success: true, user: newUser };
  }

  return { success: false, error: res?.error || 'Failed to create user' };
}

export async function registerUser(userData) {
  let res = null;
  try {
    res = await apiRegister(userData);
  } catch (err) {
    res = { success: false, error: err.message };
  }

  if (res && res.success) {
    return { success: true, user: res.data };
  }

  // If backend returned business validation error like duplicate user
  if (res && res.status && res.status < 500) {
    return { success: false, error: res.error || 'Failed to register user' };
  }

  // Fallback to local storage if network error
  const isNetworkFailure = !res || !res.status || String(res.error || '').toLowerCase().includes('connect') || String(res.error || '').toLowerCase().includes('network') || String(res.error || '').toLowerCase().includes('offline') || String(res.error || '').toLowerCase().includes('tunnel') || String(res.error || '').toLowerCase().includes('fetch');

  if (isNetworkFailure) {
    const localUsers = getLocalUsers();
    const username = (userData.Username || userData.username || '').trim();
    if (localUsers.some(u => String(u.username || '').toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username already exists.' };
    }
    const newUser = {
      id: `user-${Date.now()}`,
      username,
      password: (userData.Password || userData.password || '').trim(),
      role: mapRole(userData.Role || userData.role || 'admin'),
      name: (userData.FullName || userData.fullName || username).trim(),
      email: (userData.Email || userData.email || '').trim(),
      mobile: (userData.Phone || userData.phone || '').trim(),
      createdAt: new Date().toISOString(),
      createdBy: 'self-register'
    };
    localUsers.push(newUser);
    saveLocalUsers(localUsers);
    return { success: true, user: newUser };
  }

  return { success: false, error: res?.error || 'Failed to register user' };
}

export async function deleteUser(userId) {
  const res = await apiDeleteUser(userId);
  return { success: res.success, error: res.error };
}

export async function updateUserPassword(userId, newPassword) {
  const res = await apiUpdateUserPassword(userId, newPassword);
  return { success: res.success, error: res.error };
}

export async function fetchCurrentAuthUser() {
  const res = await apiGetMe();
  if (res.success && res.data) {
    return { success: true, user: res.data };
  }
  return { success: false, error: res.error || 'Failed to fetch user profile' };
}

export async function loginUser(usernameOrEmail, password, expectedRole) {
  const trimmedInput = usernameOrEmail.trim();
  const trimmedPassword = password.trim();

  let res = null;
  try {
    res = await apiLogin(trimmedInput, trimmedPassword);
  } catch (err) {
    res = { success: false, error: err.message };
  }

  if (res && res.success) {
    const token = res.data?.token || res.data?.Token;
    const user = res.data?.user || res.data?.User || res.data;
    const jwt = token ? parseJwt(token) : null;

    if (token) {
      const rawRole = user?.role ?? user?.Role ?? user?.roleName ?? user?.RoleName ?? user?.roleId ?? user?.RoleId ?? jwt?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? jwt?.role ?? jwt?.Role;
      const actualRole = mapRole(rawRole);
      const targetExpected = expectedRole ? mapRole(expectedRole) : null;
      
      if (targetExpected && actualRole !== targetExpected && actualRole !== 'admin') {
        return { success: false, error: `Unauthorized. Required role: ${expectedRole}` };
      }

      const session = {
        userId: user?.id || user?.userId || user?.Id || user?.UserId || jwt?.nameid || jwt?.sub || '1',
        username: user?.username || user?.Username || jwt?.unique_name || jwt?.name || trimmedInput,
        name: user?.name || user?.FullName || user?.fullName || jwt?.name || trimmedInput,
        role: actualRole,
        email: user?.email || user?.Email || jwt?.email || '',
        mobile: user?.mobile || user?.Phone || user?.PhoneNumber || '',
        loginAt: new Date().toISOString()
      };
      
      setSession(session, token);
      return { success: true, session };
    }
  }

  // If backend was unreachable or returned network error, seamlessly fallback to local users
  const isNetworkFailure = !res || !res.status || String(res.error || '').toLowerCase().includes('connect') || String(res.error || '').toLowerCase().includes('network') || String(res.error || '').toLowerCase().includes('offline') || String(res.error || '').toLowerCase().includes('tunnel') || String(res.error || '').toLowerCase().includes('fetch');

  if (isNetworkFailure) {
    const localUsers = getLocalUsers();
    const inputLower = trimmedInput.toLowerCase();
    const matched = localUsers.find(u => 
      ((u.username && u.username.toLowerCase() === inputLower) || (u.email && u.email.toLowerCase() === inputLower)) &&
      u.password === trimmedPassword
    );

    if (matched) {
      const actualRole = mapRole(matched.role);
      const targetExpected = expectedRole ? mapRole(expectedRole) : null;
      if (targetExpected && actualRole !== targetExpected && actualRole !== 'admin') {
        return { success: false, error: `Unauthorized. Required role: ${expectedRole}` };
      }

      const session = {
        userId: matched.id || String(Date.now()),
        username: matched.username,
        name: matched.name || matched.username,
        role: actualRole,
        email: matched.email || '',
        mobile: matched.mobile || '',
        loginAt: new Date().toISOString(),
        isOfflineMode: true
      };
      setSession(session, 'offline_token');
      return { success: true, session };
    }
  }

  return { success: false, error: res?.error || 'Invalid credentials' };
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
