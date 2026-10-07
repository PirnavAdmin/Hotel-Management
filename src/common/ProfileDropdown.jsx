import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, ShieldCheck, Mail, Phone, Clock, KeyRound, Sparkles } from 'lucide-react';

export function ProfileDropdown({ 
  currentSession = null, 
  onLogout = null,
  role = 'admin'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState(null);

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

  // Position popover relative to button in viewport (escapes any parent overflow: hidden)
  useEffect(() => {
    if (isOpen) {
      const updatePosition = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const width = 290;
        let left = rect.right - width;
        if (left < 12) left = 12;
        if (left + width > window.innerWidth - 12) {
          left = Math.max(12, window.innerWidth - width - 12);
        }
        setCoords({
          top: rect.bottom + 8,
          left
        });
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isOpen]);

  // Extract user details or fallbacks
  const displayName = currentSession?.name || currentSession?.username || 'Pasupuleti Bhanu';
  const username = currentSession?.username || 'pbhanu';
  const email = currentSession?.email || 'pasupuleti.bhanu@restaurant.com';
  const mobile = currentSession?.mobile || '+91 98765 43210';
  const userRole = currentSession?.role || role || 'admin';

  // Format initials for avatar
  const getInitials = (name) => {
    if (!name) return 'PB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(displayName);

  // Role badge styling
  const roleConfig = {
    admin: {
      label: 'System Administrator',
      badgeBg: 'rgba(99, 102, 241, 0.2)',
      badgeBorder: 'rgba(99, 102, 241, 0.4)',
      badgeColor: '#a5b4fc',
      avatarGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      avatarGlow: '0 0 12px rgba(99, 102, 241, 0.4)'
    },
    pos: {
      label: 'POS Billing Operator',
      badgeBg: 'rgba(245, 158, 11, 0.2)',
      badgeBorder: 'rgba(245, 158, 11, 0.4)',
      badgeColor: '#fbbf24',
      avatarGradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      avatarGlow: '0 0 12px rgba(245, 158, 11, 0.4)'
    },
    kot: {
      label: 'Kitchen Head / Chef',
      badgeBg: 'rgba(234, 88, 12, 0.2)',
      badgeBorder: 'rgba(234, 88, 12, 0.4)',
      badgeColor: '#fb923c',
      avatarGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      avatarGlow: '0 0 12px rgba(234, 88, 12, 0.4)'
    }
  };

  const currentRoleCfg = roleConfig[userRole] || roleConfig.admin;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Avatar Button — Top Right Corner Pill */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          height: '38px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: isOpen ? '#152035' : '#0d1527',
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
          padding: '0 0.8rem 0 0.25rem',
          borderRadius: '30px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 16px rgba(245, 158, 11, 0.3)' : '0 2px 10px rgba(0,0,0,0.35)',
          outline: 'none',
          whiteSpace: 'nowrap'
        }}
        title="View User Profile & Logout"
      >
        {/* Circular Profile Avatar Image / Initials */}
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          letterSpacing: '0.5px'
        }}>
          {initials}
          {/* Green Online Status Indicator */}
          <span style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: '8.5px',
            height: '8.5px',
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #0d1527'
          }} />
        </div>

        {/* User Name & Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#ffffff',
            whiteSpace: 'nowrap',
            maxWidth: '115px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.01em'
          }}>
            {displayName}
          </span>
          <ChevronDown 
            size={14} 
            color="#ffffff" 
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
              transition: 'transform 0.2s ease',
              opacity: 0.9 
            }} 
          />
        </div>
      </button>

      {/* Profile Dropdown Popover (Viewport Fixed Position to prevent overflow clipping) */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: coords ? `${coords.top}px` : '70px',
          left: coords ? `${coords.left}px` : 'auto',
          right: coords ? 'auto' : '16px',
          width: '290px',
          maxWidth: 'calc(100vw - 24px)',
          background: 'linear-gradient(145deg, #0d1527 0%, #152035 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 25px rgba(99, 102, 241, 0.2)',
          zIndex: 99999,
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease'
        }}>
          {/* Header Card Banner */}
          <div style={{
            padding: '1.25rem 1rem 1rem 1rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Big Avatar */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: currentRoleCfg.avatarGradient,
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '1.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.65rem',
              boxShadow: currentRoleCfg.avatarGlow,
              border: '2px solid rgba(255,255,255,0.3)',
              position: 'relative'
            }}>
              {initials}
              <span style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '13px',
                height: '13px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2.5px solid #0d1527'
              }} />
            </div>

            {/* User Name */}
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
              {displayName}
            </div>
            
            {/* Username handle */}
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', fontFamily: 'monospace' }}>
              @{username}
            </div>

            {/* Role Chip */}
            <div style={{
              background: currentRoleCfg.badgeBg,
              border: `1px solid ${currentRoleCfg.badgeBorder}`,
              color: currentRoleCfg.badgeColor,
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <ShieldCheck size={13} />
              {currentRoleCfg.label}
            </div>
          </div>

          {/* Details Section */}
          <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
              <Mail size={14} color="#38bdf8" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
              <Phone size={14} color="#34d399" />
              <span>{mobile}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
              <Clock size={14} color="#fbbf24" />
              <span>Active Session: Logged In</span>
            </div>
          </div>

          {/* Action / Logout Section */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(0,0,0,0.25)',
            borderTop: '1px solid rgba(255,255,255,0.08)'
          }}>
            {onLogout && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  borderRadius: '10px',
                  color: '#f87171',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)';
                  e.currentTarget.style.color = '#f87171';
                }}
              >
                <LogOut size={16} />
                <span>Log Out of Account</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
