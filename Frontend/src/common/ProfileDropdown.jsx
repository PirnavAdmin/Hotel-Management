import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, ShieldCheck, Mail, Phone, CheckCircle2, ArrowLeft } from 'lucide-react';
import { apiGetUsers } from '../api/userApi';
import './ProfileDropdown.css';

export function ProfileDropdown({ 
  currentSession = null, 
  onLogout = null,
  onReturnToPOS = null,
  role = 'pos'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [resolvedRegisteredEmail, setResolvedRegisteredEmail] = useState('');

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keep dropdown securely inside visible screen bounds at all times
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(300, window.innerWidth - 24);
    let left = rect.right - width;
    if (left < 12) left = 12;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    setCoords({
      top: rect.bottom + 8,
      left,
      width
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    updatePosition();
    setIsOpen(prev => !prev);
  };

  // Extract user details or fallbacks
  const displayName = currentSession?.name || currentSession?.username || 'User';
  let cachedRegisteredEmail = '';
  try {
    const managedUsers = JSON.parse(localStorage.getItem('avsr_auth_users_v1') || '[]');
    if (Array.isArray(managedUsers)) {
      const sessionId = String(currentSession?.userId || currentSession?.id || '');
      const sessionUsername = String(currentSession?.username || '').trim().toLowerCase();
      const sessionName = String(currentSession?.name || '').trim().toLowerCase();
      const sessionEmail = String(
        currentSession?.loginIdentifier && String(currentSession.loginIdentifier).includes('@')
          ? currentSession.loginIdentifier
          : ''
      ).trim().toLowerCase();
      const registeredUser = managedUsers.find((user) => {
        const userId = String(user?.id || user?.Id || user?.userId || user?.UserId || '');
        const username = String(user?.username || user?.Username || '').trim().toLowerCase();
        const name = String(user?.name || user?.FullName || user?.fullName || '').trim().toLowerCase();
        const managedEmail = String(
          user?.email || user?.Email || user?.emailAddress || user?.EmailAddress || ''
        ).trim().toLowerCase();
        return (sessionId && userId && sessionId === userId) ||
          (sessionUsername && username && sessionUsername === username) ||
          (sessionName && name && sessionName === name) ||
          (sessionEmail && managedEmail && sessionEmail === managedEmail);
      });
      cachedRegisteredEmail = String(
        registeredUser?.email || registeredUser?.Email ||
        registeredUser?.emailAddress || registeredUser?.EmailAddress || ''
      ).trim();
    }
  } catch {}

  useEffect(() => {
    let active = true;
    setResolvedRegisteredEmail('');
    const resolveRegisteredEmail = async () => {
      try {
        const result = await apiGetUsers();
        if (!result?.success || !active) return;

        const extractUsers = (value, depth = 0) => {
          if (Array.isArray(value)) return value;
          if (!value || typeof value !== 'object' || depth > 5) return [];
          for (const key of ['users', 'Users', '$values', 'data', 'Data', 'items', 'Items']) {
            const users = extractUsers(value[key], depth + 1);
            if (users.length) return users;
          }
          return [];
        };

        const users = extractUsers(result.data);
        const sessionId = String(currentSession?.userId || currentSession?.id || '');
        const sessionUsername = String(currentSession?.username || '').trim().toLowerCase();
        const sessionName = String(currentSession?.name || '').trim().toLowerCase();
        const registeredUser = users.find((user) => {
          const userId = String(user?.id || user?.Id || user?.userId || user?.UserId || '');
          const username = String(user?.username || user?.Username || '').trim().toLowerCase();
          const name = String(
            user?.name || user?.FullName || user?.fullName || user?.Name || ''
          ).trim().toLowerCase();
          return (sessionId && userId && sessionId === userId) ||
            (sessionUsername && username && sessionUsername === username) ||
            (sessionName && name && sessionName === name);
        });
        const email = String(
          registeredUser?.email || registeredUser?.Email ||
          registeredUser?.emailAddress || registeredUser?.EmailAddress || ''
        ).trim();
        if (email.includes('@')) setResolvedRegisteredEmail(email);
      } catch {}
    };
    resolveRegisteredEmail();
    return () => { active = false; };
  }, [
    currentSession?.id,
    currentSession?.userId,
    currentSession?.username,
    currentSession?.name
  ]);

  const sessionEmail = String(currentSession?.email || currentSession?.loginEmail || '').trim();
  const registeredEmail = resolvedRegisteredEmail || cachedRegisteredEmail;
  const email = registeredEmail.includes('@') ? registeredEmail : sessionEmail;
  const mobile = currentSession?.mobile || '';
  const userRole = currentSession?.role || role || 'pos';

  // Profile image or 1st letter of profile name
  const profileImage = currentSession?.avatar || currentSession?.image || currentSession?.profileImage || null;
  const firstLetter = (displayName ? displayName.trim().charAt(0) : 'U').toUpperCase();

  // Role badge styling
  const roleConfig = {
    admin: {
      label: 'System Administrator',
      badgeBg: 'rgba(99, 102, 241, 0.12)',
      badgeBorder: 'rgba(99, 102, 241, 0.35)',
      badgeColor: '#4f46e5',
      avatarGradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
      avatarGlow: '0 0 12px rgba(99, 102, 241, 0.25)'
    },
    pos: {
      label: 'POS Billing Operator',
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      badgeBorder: 'rgba(245, 158, 11, 0.35)',
      badgeColor: 'var(--accent-amber)',
      avatarGradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      avatarGlow: '0 0 12px rgba(245, 158, 11, 0.25)'
    },
    kot: {
      label: 'Kitchen Head / Chef',
      badgeBg: 'rgba(234, 88, 12, 0.12)',
      badgeBorder: 'rgba(234, 88, 12, 0.35)',
      badgeColor: '#ea580c',
      avatarGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      avatarGlow: '0 0 12px rgba(234, 88, 12, 0.25)'
    }
  };

  const currentRoleCfg = roleConfig[userRole] || roleConfig.pos;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Avatar Button — Top Right Corner Pill */}
      {/* Trigger Avatar Button — Top Right Circular Avatar (No Name on Top Bar) */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary)',
          border: isOpen ? '2px solid var(--accent-amber)' : '2px solid var(--border-subtle)',
          padding: 0,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-sm)',
          outline: 'none',
          position: 'relative'
        }}
        title={`Profile: ${displayName}`}
      >
        {/* Circular Avatar: Image OR 1st Letter */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: currentRoleCfg.avatarGradient,
          color: '#ffffff',
          fontWeight: 900,
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: currentRoleCfg.avatarGlow,
          overflow: 'hidden'
        }}>
          {profileImage ? (
            <img 
              src={profileImage} 
              alt={displayName} 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
            />
          ) : (
            <span>{firstLetter}</span>
          )}
        </div>

        {/* Green Online Status Indicator — Positioned on button so it is NEVER clipped */}
        <span style={{
          position: 'absolute',
          bottom: '-1px',
          right: '-1px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#10b981',
          border: '2px solid var(--bg-secondary)',
          boxShadow: '0 0 6px #10b981',
          zIndex: 3
        }} />
      </button>

      {/* Profile Dropdown Popover */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: coords ? `${coords.top}px` : '70px',
          left: coords ? `${coords.left}px` : 'auto',
          right: coords ? 'auto' : '16px',
          width: coords ? `${coords.width}px` : '300px',
          maxWidth: 'calc(100vw - 24px)',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 99999,
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease'
        }}>
          {/* Header Card Banner */}
          <div style={{
            padding: '1.25rem 1rem 1rem 1rem',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Big Avatar with Image or 1st Letter and crisp Online Indicator */}
            <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: currentRoleCfg.avatarGradient,
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1.6rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: currentRoleCfg.avatarGlow,
                border: '2.5px solid rgba(255,255,255,0.4)',
                overflow: 'hidden'
              }}>
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt={displayName} 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span>{firstLetter}</span>
                )}
              </div>

              {/* Online indicator dot — completely unclipped */}
              <span style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2.5px solid var(--bg-card)',
                boxShadow: '0 0 8px #10b981',
                zIndex: 3
              }} />
            </div>

            {/* Full Display Name */}
            <div style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              {displayName}
            </div>

            {/* Registered Email in Profile Banner */}
            {email && (
              <div 
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  maxWidth: '100%',
                  padding: '0 8px',
                  boxSizing: 'border-box'
                }}
                title={`Registered Email: ${email}`}
              >
                <Mail size={13} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </span>
              </div>
            )}

            {/* Role Chip */}
            <div style={{
              background: currentRoleCfg.badgeBg,
              border: `1px solid ${currentRoleCfg.badgeBorder}`,
              color: currentRoleCfg.badgeColor,
              padding: '4px 12px',
              borderRadius: '14px',
              fontSize: '0.74rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <ShieldCheck size={14} />
              {currentRoleCfg.label}
            </div>
          </div>

          {/* Profile Details List */}
          <div style={{
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem',
            fontSize: '0.8rem',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            {email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)' }}>
                <Mail size={14} color="var(--accent-amber)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </span>
              </div>
            )}

            {mobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)' }}>
                <Phone size={14} color="var(--accent-amber)" />
                <span>{mobile}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--status-vacant)', fontSize: '0.75rem', fontWeight: 700 }}>
              <CheckCircle2 size={13} color="var(--status-vacant)" />
              <span>Active Session Connected</span>
            </div>
          </div>

          {/* Action / Logout Section */}
          <div style={{
            padding: '0.85rem 1rem',
            background: 'var(--bg-tertiary)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem'
          }}>
            {onReturnToPOS ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onReturnToPOS();
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  background: 'var(--surface-tint)',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '10px',
                  color: 'var(--accent-amber-light)',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--surface-tint)';
                  e.currentTarget.style.color = 'var(--accent-amber-light)';
                }}
              >
                <ArrowLeft size={16} />
                <span>Go to User POS</span>
              </button>
            ) : null}

            {onLogout ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
                className="profile-logout-button"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
