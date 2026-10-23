import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Trash2, Eye, EyeOff, ShieldCheck, Pencil,
  Utensils, ChefHat, Key, RefreshCw, UserCheck, X, AlertCircle, Phone
} from 'lucide-react';
import { getUsers, createUser, deleteUser, updateUserPassword, updateUserDetails } from '../utils/auth';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

/**
 * LoginManagement — Admin panel tab for managing POS & KOT logins.
 * Embedded inside AdminPortal as a tab.
 */
export function LoginManagement({ currentAdminSession }) {
  const [users, setUsers]           = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [formRole, setFormRole]     = useState('pos');
  const [formName, setFormName]     = useState('');
  const [formUser, setFormUser]     = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPass, setFormPass]     = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showPass, setShowPass]     = useState(false);
  const [formError, setFormError]   = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [activeAccountTab, setActiveAccountTab] = useState('pos');

  // Password change modal
  const [changePwUser, setChangePwUser] = useState(null);
  const [newPw, setNewPw]               = useState('');
  const [showNewPw, setShowNewPw]       = useState(false);
  const [pwError, setPwError]           = useState('');
  const [pwSuccess, setPwSuccess]       = useState('');

  const reload = async () => {
    setIsRefreshing(true);
    setRefreshMessage('');
    try {
      const result = await getUsers();
      setUsers(result.users);
      setRefreshMessage(result.error || `Loaded ${result.users.length} account${result.users.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setRefreshMessage(error?.message || 'Could not refresh accounts.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const saveUsersCache = (nextUsers) => {
    try {
      localStorage.setItem('avsr_auth_users_v1', JSON.stringify(nextUsers));
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  const openEditForm = (user) => {
    setEditingUser(user);
    setFormRole(user.role || 'pos');
    setFormName(user.name || '');
    setFormUser(user.username || '');
    setFormMobile(user.mobile || '');
    setFormEmail(user.email || '');
    setFormPass('');
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormError('');
    setFormPass('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!formUser.trim() || (!editingUser && !formPass.trim())) {
      setFormError(editingUser ? 'Username is required.' : 'Username and password are required.');
      return;
    }
    if (!editingUser && formPass.length < 4) {
      setFormError('Password must be at least 4 characters.');
      return;
    }
    if (formMobile && !/^\d{10}$/.test(formMobile.replace(/\s+/g, ''))) {
      setFormError('Mobile number must be 10 digits.');
      return;
    }
    if (editingUser) {
      const displayName = formName.trim() || formUser.trim();
      const phone = formMobile.trim() || '0000000000';
      const updatedUser = {
        name: displayName,
        fullName: displayName,
        role: formRole,
        phone,
        phoneNumber: phone,
        email: formEmail.trim() || editingUser.email || `${editingUser.username}@avsr.com`,
      };
      // Update UI immediately (optimistic update)
      const nextUsers = users.map((user) => user.id === editingUser.id
        ? { ...user, name: displayName, role: formRole, mobile: formMobile.trim(), email: updatedUser.email }
        : user);
      setUsers(nextUsers);
      saveUsersCache(nextUsers);
      setFormSuccess(`Login "${editingUser.username}" updated successfully.`);
      // Fire API in background
      updateUserDetails(editingUser.id, updatedUser).catch(() => {});
      setTimeout(closeForm, 1200);
      return;
    }

    setIsSubmitting(true);
    let result;
    try {
      result = await createUser({
        Username: formUser.trim(),
        Password: formPass,
        ConfirmPassword: formPass,
        Role: formRole,
        FullName: formName.trim() || formUser.trim(),
        Phone: formMobile.trim() || '0000000000',
        Email: `${formUser.trim()}@avsr.com`
      });
    } catch (error) {
      result = { success: false, error: error?.message || 'Could not create this login.' };
    } finally {
      setIsSubmitting(false);
    }
    if (result.success) {
      setFormSuccess(`✅ ${formRole.toUpperCase()} login "${formUser.trim()}" created successfully!`);
      const createdUserObj = {
        id: result.user?.id || result.user?.Id || Date.now().toString(),
        username: formUser.trim(),
        name: formName.trim() || formUser.trim(),
        role: formRole,
        mobile: formMobile.trim(),
        email: `${formUser.trim()}@avsr.com`,
        createdAt: new Date().toISOString()
      };
      const nextUsers = [createdUserObj, ...users.filter(u => u.username.toLowerCase() !== formUser.trim().toLowerCase())];
      setUsers(nextUsers);
      saveUsersCache(nextUsers);
      setFormUser(''); setFormPass(''); setFormName(''); setFormMobile(''); setFormEmail('');
      await reload();
      setTimeout(() => { setFormSuccess(''); setShowForm(false); }, 1500);
    } else {
      setFormError(result.error);
    }
  };

  const handleDelete = async (userId) => {
    // Remove from UI immediately (optimistic)
    const nextUsers = users.filter((user) => user.id !== userId);
    setUsers(nextUsers);
    saveUsersCache(nextUsers);
    setDeletingId(null);
    // Delete permanently from server-db.json
    try { await deleteUser(userId); } catch (_) {}
    // Reload from server to confirm permanent deletion
    await reload();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!newPw.trim() || newPw.length < 4) {
      setPwError('Password must be at least 4 characters.');
      return;
    }
    const result = await updateUserPassword(changePwUser.id, newPw);
    if (result.success) {
      setPwSuccess('✅ Password updated!');
      setNewPw('');
      await reload();
      setTimeout(() => { setPwSuccess(''); setChangePwUser(null); }, 1500);
    } else {
      setPwError(result.error);
    }
  };

  const posUsers   = users.filter(u => (u.role || '').toLowerCase() === 'pos');
  const kotUsers   = users.filter(u => (u.role || '').toLowerCase() === 'kot');
  const adminUsers = users.filter(u => (u.role || '').toLowerCase() === 'admin');

  const roleConfig = {
    pos: {
      label: 'User POS',
      icon: <Utensils size={15} />,
      color: 'var(--accent-amber-light)',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)'
    },
    kot: {
      label: 'Kitchen KOT',
      icon: <ChefHat size={15} />,
      color: 'var(--accent-amber-light)',
      bg: 'rgba(234, 88, 12, 0.15)',
      border: 'rgba(234, 88, 12, 0.4)',
      gradient: 'linear-gradient(135deg, #ea580c, #c2410c)'
    },
    admin: {
      label: 'Admin',
      icon: <ShieldCheck size={15} />,
      color: 'var(--accent-indigo)',
      bg: 'rgba(99, 102, 241, 0.15)',
      border: 'rgba(99, 102, 241, 0.4)',
      gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)'
    }
  };

  const UserRow = ({ user }) => {
    const rc = roleConfig[user.role] || roleConfig.pos;
    const isSystemAdmin = user.id === 'admin-001';
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.85rem',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-card)',
        borderRadius: '10px', padding: '0.7rem 0.9rem',
        transition: 'background 0.15s'
      }}>
        {/* Avatar */}
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: rc.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 3px 10px color-mix(in srgb, ${rc.color} 25.10%, transparent)`
        }}>
          <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 900 }}>
            {(user.name || user.username).charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.88rem', fontWeight: 800,
            color: 'var(--text-main)', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {user.name || user.username}
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            @{user.username}
            {user.createdAt && (
              <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                • Added {new Date(user.createdAt).toLocaleDateString('en-IN')}
              </span>
            )}
          </div>
          {/* Mobile + Email */}
          {(user.mobile || user.email) && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2px', flexWrap: 'wrap' }}>
              {user.mobile && (
                <span style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  📱 {user.mobile}
                </span>
              )}
              {user.email && (
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  ✉️ {user.email}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Role badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: rc.bg, border: `1px solid ${rc.border}`,
          color: rc.color, fontSize: '0.67rem', fontWeight: 800,
          padding: '3px 8px', borderRadius: '20px',
          letterSpacing: '0.04em', flexShrink: 0
        }}>
          {rc.icon}
          <span>{rc.label.toUpperCase()}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.45rem', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => openEditForm(user)}
            title="Edit login details"
            style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              color: 'var(--accent-amber-light)', padding: '5px 8px', borderRadius: '7px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '0.72rem', fontWeight: 700
            }}
          >
            <Pencil size={13} /> <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => { setChangePwUser(user); setNewPw(''); setPwError(''); setPwSuccess(''); }}
            title="Change Password"
            style={{
              background: 'var(--surface-tint)', border: '1px solid var(--neutral-border)',
              color: 'var(--text-dim)', padding: '5px 9px', borderRadius: '7px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '0.72rem', fontWeight: 700
            }}
          >
            <Key size={13} />
            <span>Reset PW</span>
          </button>

          {!isSystemAdmin && (
            <button
              type="button"
              onClick={() => setDeletingId(user.id)}
              title="Delete user"
              style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--danger)', padding: '5px 8px', borderRadius: '7px',
                cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, icon, color, users: list, emptyMsg }) => (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid var(--border-card)`,
      borderRadius: '12px', overflow: 'hidden'
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid var(--border-subtle)`,
        display: 'flex', alignItems: 'center', gap: '0.5rem'
      }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--text-main)' }}>{title}</span>
        <span style={{
          background: `color-mix(in srgb, ${color} 12.55%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25.10%, transparent)`,
          color, fontSize: '0.68rem', fontWeight: 900,
          padding: '1px 7px', borderRadius: '20px', marginLeft: 'auto'
        }}>
          {list.length} {list.length === 1 ? 'user' : 'users'}
        </span>
      </div>
      <div style={{ padding: '0.65rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600 }}>
            {emptyMsg}
          </div>
        ) : (
          list.map(u => <UserRow key={u.id} user={u} />)
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            🔐 Login Management
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '3px 0 0', fontWeight: 600 }}>
            Create and manage POS & KOT user accounts. Admin creates all logins.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={reload}
            disabled={isRefreshing}
            style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-card)',
              color: 'var(--text-dim)', padding: '0.45rem 0.8rem', borderRadius: '8px',
              cursor: isRefreshing ? 'wait' : 'pointer', opacity: isRefreshing ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700
            }}
          >
            <RefreshCw size={14} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => { setEditingUser(null); setFormRole('pos'); setFormName(''); setFormUser(''); setFormMobile(''); setFormEmail(''); setFormPass(''); setShowForm(true); setFormError(''); setFormSuccess(''); }}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              border: 'none', color: '#ffffff',
              padding: '0.45rem 1rem', borderRadius: '8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: '0.4rem', fontSize: '0.82rem', fontWeight: 800,
              boxShadow: '0 3px 12px rgba(245,158,11,0.4)'
            }}
          >
            <Plus size={16} /> Create Login
          </button>
        </div>
      </div>

      {refreshMessage && !refreshMessage.toLowerCase().includes('could not') && !refreshMessage.toLowerCase().includes('failed') && !refreshMessage.toLowerCase().includes('error') && (
        <div role="status" style={{ color: 'var(--text-dim)', fontSize: '0.76rem', fontWeight: 600, marginTop: '-0.75rem' }}>
          {refreshMessage}
        </div>
      )}

      {/* Create Login Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-subtle)',
          borderRadius: '14px', padding: '1.25rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              {editingUser ? 'Edit Login Details' : 'Create New Login'}
            </h3>
            <button
              onClick={closeForm}
              style={{
                background: 'var(--surface-tint)', border: 'none',
                color: 'var(--text-dim)', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {formError && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)',
              borderRadius: '8px', padding: '0.55rem 0.85rem',
              color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700,
              marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <AlertCircle size={15} /> {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{
              background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.4)',
              borderRadius: '8px', padding: '0.55rem 0.85rem',
              color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700,
              marginBottom: '0.85rem'
            }}>
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label htmlFor="new-login-role" style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Account Role *
              </label>
              <select
                id="new-login-role"
                value={formRole}
                onChange={(event) => setFormRole(event.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.8rem', background: 'var(--bg-card)', border: '1.5px solid rgba(245,158,11,0.55)', borderRadius: '9px', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 700, outline: 'none' }}
              >
                <option value="pos">User POS - Billing &amp; floor orders</option>
                <option value="kot">Kitchen KOT - Kitchen display system</option>
                {editingUser?.role === 'admin' && <option value="admin">Admin</option>}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Display Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Display Name
                </label>
                <input
                  type="text" placeholder="e.g. Ravi Kumar"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', boxSizing: 'border-box',
                    background: 'var(--surface-tint)', border: '1.5px solid rgba(var(--surface-rgb),0.1)',
                    borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                  }}
                />
              </div>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Username *
                </label>
                <input
                  type="text" placeholder="e.g. ravi.kumar"
                  value={formUser}
                  onChange={e => setFormUser(e.target.value)}
                  disabled={!!editingUser}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', boxSizing: 'border-box',
                    background: editingUser ? 'rgba(var(--surface-rgb),0.025)' : 'rgba(var(--surface-rgb),0.05)', border: '1.5px solid rgba(var(--surface-rgb),0.1)',
                    borderRadius: '8px', color: editingUser ? 'var(--text-dim)' : 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600, outline: 'none',
                    cursor: editingUser ? 'not-allowed' : 'text'
                  }}
                />
                {editingUser && <div style={{ marginTop: '4px', color: 'var(--text-dim)', fontSize: '0.68rem' }}>Username cannot be changed through the account update endpoint.</div>}
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                📱 Mobile Number (10 digits)
              </label>
              <input
                type="tel" placeholder="e.g. 9876543210" maxLength={10}
                value={formMobile}
                onChange={e => setFormMobile(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', boxSizing: 'border-box',
                  background: 'var(--surface-tint)',
                  border: `1.5px solid ${formMobile && formMobile.length === 10 ? 'rgba(16,185,129,0.5)' : 'rgba(var(--surface-rgb),0.1)'}`,
                  borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600, outline: 'none',
                  fontFamily: 'monospace', letterSpacing: '0.05em'
                }}
              />
              {formMobile && (
                <div style={{ marginTop: '3px', fontSize: '0.68rem', fontWeight: 700, color: formMobile.length === 10 ? 'var(--success)' : 'var(--accent-amber-light)' }}>
                  {formMobile.length === 10 ? '✅ Valid mobile number' : `${formMobile.length}/10 digits entered`}
                </div>
              )}
            </div>

            {editingUser && (
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', boxSizing: 'border-box', background: 'var(--surface-tint)', border: '1.5px solid rgba(var(--surface-rgb),0.1)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                />
              </div>
            )}

            {/* Password */}
            {!editingUser && <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 4 characters"
                  value={formPass}
                  onChange={e => setFormPass(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.75rem', boxSizing: 'border-box',
                    background: 'var(--surface-tint)', border: '1.5px solid rgba(var(--surface-rgb),0.1)',
                    borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                  }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>}

            <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.25rem' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 2, padding: '0.65rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.85rem',
                  border: 'none', cursor: isSubmitting ? 'wait' : 'pointer', opacity: isSubmitting ? 0.75 : 1,
                  boxShadow: '0 3px 12px rgba(245,158,11,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                {editingUser ? <Pencil size={16} /> : <UserCheck size={16} />}
                {isSubmitting ? 'Creating Account...' : editingUser ? 'Save Changes' : 'Create Login Account'}
              </button>
              <button
                type="button" onClick={closeForm}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: '10px',
                  background: 'var(--surface-tint)', border: '1px solid var(--neutral-border)',
                  color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Account types"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '0.4rem',
          padding: '0.35rem',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
        }}
      >
        {[
          { id: 'pos', label: 'User POS Accounts', count: posUsers.length, icon: <Utensils size={16} /> },
          { id: 'kot', label: 'Kitchen KOT Accounts', count: kotUsers.length, icon: <ChefHat size={16} /> },
          { id: 'admin', label: 'Admin Accounts', count: adminUsers.length, icon: <ShieldCheck size={16} /> },
        ].map((tab) => {
          const isActive = activeAccountTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`account-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`account-panel-${tab.id}`}
              onClick={() => setActiveAccountTab(tab.id)}
              style={{
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.7rem 0.55rem',
                border: isActive ? '1px solid var(--border-card)' : '1px solid transparent',
                borderRadius: '9px',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-dim)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                fontSize: '0.78rem',
                fontWeight: isActive ? 800 : 700,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, color: isActive ? 'var(--accent-amber-light)' : 'inherit' }}>{tab.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
              <span style={{
                flexShrink: 0,
                minWidth: '1.4rem',
                padding: '1px 6px',
                borderRadius: '20px',
                background: isActive ? 'var(--surface-tint)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-dim)',
                fontSize: '0.68rem',
                textAlign: 'center',
              }}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`account-panel-${activeAccountTab}`}
        aria-labelledby={`account-tab-${activeAccountTab}`}
        style={{ minWidth: 0 }}
      >
        {activeAccountTab === 'pos' && <Section title="User POS Accounts" icon={<Utensils size={16} />} color="#f59e0b" users={posUsers} emptyMsg="No POS users yet. Create one above." />}
        {activeAccountTab === 'kot' && <Section title="Kitchen KOT Accounts" icon={<ChefHat size={16} />} color="#fb923c" users={kotUsers} emptyMsg="No KOT users yet. Create one above." />}
        {activeAccountTab === 'admin' && <Section title="Admin Accounts" icon={<ShieldCheck size={16} />} color="var(--accent-indigo)" users={adminUsers} emptyMsg="No admin accounts found." />}
      </div>

      {/* Global Delete Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingId)}
        title="Delete User?"
        message="This user will lose access immediately. This action cannot be undone."
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        onConfirm={() => handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      {/* Change Password Overlay */}
      {changePwUser && (
        <div onClick={() => setChangePwUser(null)} style={{
          position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 200, padding: '1rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', border: '1.5px solid rgba(245,158,11,0.4)',
            borderRadius: '16px', padding: '1.5rem', maxWidth: '360px', width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                🔑 Reset Password
              </h3>
              <button onClick={() => setChangePwUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '1rem' }}>
              Changing password for <strong style={{ color: 'var(--text-main)' }}>@{changePwUser.username}</strong> ({changePwUser.role.toUpperCase()})
            </div>

            {pwError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--danger)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--success)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                {pwSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="New password (min. 4 chars)"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  style={{
                    width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.85rem', boxSizing: 'border-box',
                    background: 'var(--surface-tint)', border: '1.5px solid var(--neutral-border)',
                    borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600, outline: 'none'
                  }}
                />
                <button type="button" onClick={() => setShowNewPw(p => !p)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button type="submit" style={{
                  flex: 2, padding: '0.6rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.85rem',
                  border: 'none', cursor: 'pointer'
                }}>
                  Update Password
                </button>
                <button type="button" onClick={() => setChangePwUser(null)} style={{
                  flex: 1, padding: '0.6rem', borderRadius: '10px',
                  background: 'var(--surface-tint)', border: '1px solid var(--neutral-border)',
                  color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
