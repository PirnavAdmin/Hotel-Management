// ============================================================
// AVSR FOOD COURT — Authentication Utility
// Stores user accounts & session in localStorage (no backend)
// Roles: 'admin' | 'pos' | 'kot'
// ============================================================

const STORAGE_KEY_USERS    = 'avsr_auth_users_v1';
const STORAGE_KEY_SESSION  = 'avsr_auth_session_v1';

// ── Default admin account (always present) ──────────────────
const DEFAULT_ADMIN = {
  id: 'admin-001',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  name: 'Administrator',
  createdAt: new Date().toISOString(),
  createdBy: 'system'
};

// ── Load all users from storage ──────────────────────────────
export function getUsers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Always ensure admin exists
      if (!parsed.find(u => u.role === 'admin')) {
        parsed.unshift(DEFAULT_ADMIN);
        saveUsers(parsed);
      }
      return parsed;
    }
  } catch {}
  const initial = [DEFAULT_ADMIN];
  saveUsers(initial);
  return initial;
}

// ── Save users list ──────────────────────────────────────────
export function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
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
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  } catch {}
}

// ── Clear session (logout) ───────────────────────────────────
export function logoutUser() {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
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
