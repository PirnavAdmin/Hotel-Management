// ============================================================
// AVSR FOOD COURT — Authentication Utility
// Stores user accounts & session in localStorage (no backend)
// Roles: 'admin' | 'pos' | 'kot'
// ============================================================

const STORAGE_KEY_USERS    = 'avsr_auth_users_v1';
const STORAGE_KEY_SESSION  = 'avsr_auth_session_v1';

// ── Default system accounts (always present across all devices) ──────────────────
const DEFAULT_USERS = [
  {
    id: 'admin-001',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Administrator',
    email: 'admin@avsr.com',
    createdAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    id: 'pos-001',
    username: 'pos',
    password: 'pos123',
    role: 'pos',
    name: 'Pasupuleti Bhanu (POS)',
    email: 'pos@avsr.com',
    createdAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    id: 'kot-001',
    username: 'kot',
    password: 'kot123',
    role: 'kot',
    name: 'Kitchen Chef (KOT)',
    email: 'kot@avsr.com',
    createdAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    id: 'user-001',
    username: 'user',
    password: 'user123',
    role: 'pos',
    name: 'Floor Staff User',
    email: 'user@avsr.com',
    createdAt: new Date().toISOString(),
    createdBy: 'system'
  }
];

// ── Load all users from storage ──────────────────────────────
export function getUsers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Ensure default system accounts exist
        DEFAULT_USERS.forEach(defUser => {
          if (!parsed.some(u => u.username.toLowerCase() === defUser.username.toLowerCase())) {
            parsed.unshift(defUser);
          }
        });
        saveUsers(parsed);
        return parsed;
      }
    }
  } catch {}
  const initial = [...DEFAULT_USERS];
  saveUsers(initial);
  return initial;
}

// ── Save users list ──────────────────────────────────────────
export function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    // Push to server for global network sync across all connected LAN devices
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avsr_auth_users_v1: users })
    }).catch(() => {});
  } catch {}
}

// ── Create a new user (called by Admin) ─────────────────────
export function createUser({ username, password, role, name, mobile = '', email = '', createdBy = 'admin' }) {
  const users = getUsers();
  // Check duplicate username
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'Username already exists.' };
  }
  if (!['pos', 'kot', 'admin'].includes(role)) {
    return { success: false, error: 'Invalid role.' };
  }
  const newUser = {
    id: `${role}-${Date.now()}`,
    username: username.trim(),
    password: password.trim(),
    role,
    name: name?.trim() || username.trim(),
    mobile: mobile?.trim() || '',
    email:  email?.trim() || '',
    createdAt: new Date().toISOString(),
    createdBy
  };
  users.push(newUser);
  saveUsers(users);
  return { success: true, user: newUser };
}

// ── Delete a user (Admin only, cannot delete self/admin) ─────
export function deleteUser(userId) {
  let users = getUsers();
  const target = users.find(u => u.id === userId);
  if (!target) return { success: false, error: 'User not found.' };
  if (target.role === 'admin' && target.id === 'admin-001') {
    return { success: false, error: 'Cannot delete the default admin account.' };
  }
  users = users.filter(u => u.id !== userId);
  saveUsers(users);
  return { success: true };
}

// ── Update user password ─────────────────────────────────────
export function updateUserPassword(userId, newPassword) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'User not found.' };
  users[idx].password = newPassword.trim();
  saveUsers(users);
  return { success: true };
}

// ── Attempt login (accepts username OR email) ───────────────
export function loginUser(usernameOrEmail, password, expectedRole) {
  const users = getUsers();
  const input = usernameOrEmail.trim().toLowerCase();
  const user = users.find(
    u => (
      u.username.toLowerCase() === input ||
      (u.email && u.email.toLowerCase() === input)    // also match by email
    ) &&
    u.password === password &&
    (!expectedRole || u.role === expectedRole || u.role === 'admin')
  );
  if (!user) {
    return { success: false, error: 'Invalid username/email or password.' };
  }
  const session = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email || '',
    mobile: user.mobile || '',
    loginAt: new Date().toISOString()
  };
  setSession(session);
  return { success: true, session };
}

// ── Get current session ──────────────────────────────────────
export function getSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

// ── Save session ─────────────────────────────────────────────
export function setSession(session) {
  try {
    if (session) {
      const sessStr = JSON.stringify(session);
      localStorage.setItem(STORAGE_KEY_SESSION, sessStr);
      localStorage.setItem('auth_user', sessStr);
      localStorage.setItem('auth_token_timestamp', Date.now().toString());
      
      const mockHeader = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const mockPayload = btoa(JSON.stringify({ 
        sub: session.userId, 
        role: session.role, 
        name: session.name, 
        exp: Math.floor(Date.now() / 1000) + 86400 
      }));
      const mockSig = "avsr_signature";
      localStorage.setItem('avsr_jwt_token', `${mockHeader}.${mockPayload}.${mockSig}`);

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

// ── Clear session (logout) ───────────────────────────────────
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

// ── Check if a role is allowed on a given route ──────────────
export function isAllowedForRoute(session, route) {
  if (!session) return false;
  if (route === '/admin') return session.role === 'admin';
  if (route === '/kot')   return session.role === 'kot' || session.role === 'admin';
  if (route === '/')      return session.role === 'pos' || session.role === 'admin';
  return false;
}
