import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Trash2, Eye, EyeOff, ShieldCheck,
  Utensils, ChefHat, Key, RefreshCw, UserCheck, X, AlertCircle, Phone
} from 'lucide-react';
import { getUsers, createUser, deleteUser, updateUserPassword } from '../utils/auth';

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
  const [formPass, setFormPass]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [formError, setFormError]   = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Password change modal
  const [changePwUser, setChangePwUser] = useState(null);
  const [newPw, setNewPw]               = useState('');
  const [showNewPw, setShowNewPw]       = useState(false);
  const [pwError, setPwError]           = useState('');
  const [pwSuccess, setPwSuccess]       = useState('');

  const reload = () => setUsers(getUsers());

  useEffect(() => { reload(); }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!formUser.trim() || !formPass.trim()) {
      setFormError('Username and password are required.');
      return;
    }
    if (formPass.length < 4) {
      setFormError('Password must be at least 4 characters.');
      return;
    }
    if (formMobile && !/^\d{10}$/.test(formMobile.replace(/\s+/g, ''))) {
      setFormError('Mobile number must be 10 digits.');
      return;
    }
    const result = createUser({
      username: formUser,
      password: formPass,
      role: formRole,
      name: formName || formUser,
      mobile: formMobile.trim(),
      createdBy: currentAdminSession?.username || 'admin'
    });
    if (result.success) {
      setFormSuccess(`\u2705 ${formRole.toUpperCase()} login "${formUser}" created successfully!`);
      setFormUser(''); setFormPass(''); setFormName(''); setFormMobile('');
      reload();
      setTimeout(() => { setFormSuccess(''); setShowForm(false); }, 2000);
    } else {
      setFormError(result.error);
    }
  };

  const handleDelete = (userId) => {
    const result = deleteUser(userId);
    if (result.success) reload();
    setDeletingId(null);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!newPw.trim() || newPw.length < 4) {
      setPwError('Password must be at least 4 characters.');
      return;
    }
    const result = updateUserPassword(changePwUser.id, newPw);
    if (result.success) {
      setPwSuccess('✅ Password updated!');
      setNewPw('');
      reload();
      setTimeout(() => { setPwSuccess(''); setChangePwUser(null); }, 1500);
    } else {
      setPwError(result.error);
    }
  };

  const posUsers   = users.filter(u => u.role === 'pos');
  const kotUsers   = users.filter(u => u.role === 'kot');
  const adminUsers = users.filter(u => u.role === 'admin');

  const roleConfig = {
    pos: {
      label: 'User POS',
      icon: <Utensils size={15} />,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)'
    },
    kot: {
      label: 'Kitchen KOT',
      icon: <ChefHat size={15} />,
      color: '#fb923c',
      bg: 'rgba(234, 88, 12, 0.15)',
      border: 'rgba(234, 88, 12, 0.4)',
      gradient: 'linear-gradient(135deg, #ea580c, #c2410c)'
    },
    admin: {
      label: 'Admin',
      icon: <ShieldCheck size={15} />,
      color: '#818cf8',
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
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px', padding: '0.7rem 0.9rem',
        transition: 'background 0.15s'
      }}>
        {/* Avatar */}
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: rc.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 3px 10px ${rc.color}40`
        }}>
          <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 900 }}>
            {(user.name || user.username).charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.88rem', fontWeight: 800,
            color: '#ffffff', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {user.name || user.username}
          </div>
          <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 600 }}>
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
                <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  📱 {user.mobile}
                </span>
              )}
              {user.email && (
                <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
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
            onClick={() => { setChangePwUser(user); setNewPw(''); setPwError(''); setPwSuccess(''); }}
            title="Change Password"
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8', padding: '5px 9px', borderRadius: '7px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '0.72rem', fontWeight: 700
            }}
          >
            <Key size={13} />
            <span>Reset PW</span>
          </button>

          {!isSystemAdmin && (
            <button
              onClick={() => setDeletingId(user.id)}
              title="Delete user"
              style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171', padding: '5px 8px', borderRadius: '7px',
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
      background: 'rgba(0,0,0,0.25)',
      border: `1px solid ${color}25`,
      borderRadius: '12px', overflow: 'hidden'
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${color}20`,
        display: 'flex', alignItems: 'center', gap: '0.5rem'
      }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#ffffff' }}>{title}</span>
        <span style={{
          background: `${color}20`, border: `1px solid ${color}40`,
          color, fontSize: '0.68rem', fontWeight: 900,
          padding: '1px 7px', borderRadius: '20px', marginLeft: 'auto'
        }}>
          {list.length} {list.length === 1 ? 'user' : 'users'}
        </span>
      </div>
      <div style={{ padding: '0.65rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
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
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
            🔐 Login Management
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0', fontWeight: 600 }}>
            Create and manage POS & KOT user accounts. Admin creates all logins.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={reload}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8', padding: '0.45rem 0.8rem', borderRadius: '8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => { setShowForm(true); setFormError(''); setFormSuccess(''); }}
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

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
        {[
          { label: 'POS Users', count: posUsers.length, color: '#f59e0b', icon: <Utensils size={18} /> },
          { label: 'KOT Users', count: kotUsers.length, color: '#fb923c', icon: <ChefHat size={18} /> },
          { label: 'Admins', count: adminUsers.length, color: '#818cf8', icon: <ShieldCheck size={18} /> }
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(0,0,0,0.3)',
            border: `1px solid ${stat.color}25`,
            borderRadius: '10px', padding: '0.85rem 1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: `${stat.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: stat.color
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                {stat.count}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Login Form */}
      {showForm && (
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1.5px solid rgba(245,158,11,0.35)',
          borderRadius: '14px', padding: '1.25rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
              ➕ Create New Login
            </h3>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: '#94a3b8', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {formError && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)',
              borderRadius: '8px', padding: '0.55rem 0.85rem',
              color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700,
              marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <AlertCircle size={15} /> {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{
              background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.4)',
              borderRadius: '8px', padding: '0.55rem 0.85rem',
              color: '#6ee7b7', fontSize: '0.8rem', fontWeight: 700,
              marginBottom: '0.85rem'
            }}>
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Role selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Account Role *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {[
                  { value: 'pos', label: '🍽️ User POS', sub: 'Billing & floor orders', color: '#f59e0b' },
                  { value: 'kot', label: '🔥 Kitchen KOT', sub: 'Kitchen display system', color: '#fb923c' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormRole(opt.value)}
                    style={{
                      padding: '0.65rem 0.8rem', borderRadius: '10px', textAlign: 'left',
                      background: formRole === opt.value ? `${opt.color}20` : 'rgba(255,255,255,0.04)',
                      border: formRole === opt.value ? `1.5px solid ${opt.color}` : '1.5px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: formRole === opt.value ? opt.color : '#ffffff' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Display Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Display Name
                </label>
                <input
                  type="text" placeholder="e.g. Ravi Kumar"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                  }}
                />
              </div>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Username *
                </label>
                <input
                  type="text" placeholder="e.g. ravi.kumar"
                  value={formUser}
                  onChange={e => setFormUser(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                📱 Mobile Number (10 digits)
              </label>
              <input
                type="tel" placeholder="e.g. 9876543210" maxLength={10}
                value={formMobile}
                onChange={e => setFormMobile(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${formMobile && formMobile.length === 10 ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, outline: 'none',
                  fontFamily: 'monospace', letterSpacing: '0.05em'
                }}
              />
              {formMobile && (
                <div style={{ marginTop: '3px', fontSize: '0.68rem', fontWeight: 700, color: formMobile.length === 10 ? '#10b981' : '#f59e0b' }}>
                  {formMobile.length === 10 ? '✅ Valid mobile number' : `${formMobile.length}/10 digits entered`}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
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
                    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                  }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.25rem' }}>
              <button
                type="submit"
                style={{
                  flex: 2, padding: '0.65rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.85rem',
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(245,158,11,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <UserCheck size={16} />
                Create Login Account
              </button>
              <button
                type="button" onClick={() => setShowForm(false)}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User sections */}
      <Section
        title="🍽️ User POS Accounts"
        icon={<Utensils size={16} />}
        color="#f59e0b"
        users={posUsers}
        emptyMsg="No POS users yet. Create one above ↑"
      />
      <Section
        title="🔥 Kitchen KOT Accounts"
        icon={<ChefHat size={16} />}
        color="#fb923c"
        users={kotUsers}
        emptyMsg="No KOT users yet. Create one above ↑"
      />
      <Section
        title="⚙️ Admin Accounts"
        icon={<ShieldCheck size={16} />}
        color="#818cf8"
        users={adminUsers}
        emptyMsg="No admin accounts found."
      />

      {/* Delete Confirm Overlay */}
      {deletingId && (
        <div onClick={() => setDeletingId(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 200, padding: '1rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0e1726', border: '1.5px solid rgba(239,68,68,0.45)',
            borderRadius: '16px', padding: '1.5rem', maxWidth: '360px', width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.85rem'
              }}>
                <Trash2 size={22} color="#f87171" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', margin: '0 0 4px' }}>
                Delete User?
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, margin: 0 }}>
                This user will lose access immediately. This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                onClick={() => handleDelete(deletingId)}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.85rem',
                  border: 'none', cursor: 'pointer'
                }}
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeletingId(null)}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Overlay */}
      {changePwUser && (
        <div onClick={() => setChangePwUser(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 200, padding: '1rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0e1726', border: '1.5px solid rgba(245,158,11,0.4)',
            borderRadius: '16px', padding: '1.5rem', maxWidth: '360px', width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                🔑 Reset Password
              </h3>
              <button onClick={() => setChangePwUser(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '1rem' }}>
              Changing password for <strong style={{ color: '#ffffff' }}>@{changePwUser.username}</strong> ({changePwUser.role.toUpperCase()})
            </div>

            {pwError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#fca5a5', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.75rem' }}>
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
                    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px', color: '#ffffff', fontSize: '0.88rem', fontWeight: 600, outline: 'none'
                  }}
                />
                <button type="button" onClick={() => setShowNewPw(p => !p)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
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
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
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
