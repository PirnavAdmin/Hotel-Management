import React, { useState, useEffect, useRef } from 'react';
import {
  ChefHat, Lock, User, Eye, EyeOff,
  Utensils, MonitorCheck, ShieldCheck,
  UserPlus, LogIn, CheckCircle, Mail,
  Phone, Send, RefreshCw, ArrowLeft,
  KeyRound
} from 'lucide-react';
import { loginUser, createUser, registerUser, updateUserPassword, getUsers, getLocalUsers, saveLocalUsers } from '../utils/auth';
import { apiForgotPassword, apiResetPassword, apiSendOtp, apiVerifyOtp } from '../api/authApi';

/**
 * LoginPage — role-specific login/register screen.
 * Register (admin only) includes: Name, Username, Mobile, Email + OTP, Password.
 */
export function LoginPage({ role = 'pos', onLoginSuccess }) {
  const [currentRole, setCurrentRole] = useState(role);
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Sync prop role if parent route changes
  useEffect(() => {
    setCurrentRole(role);
  }, [role]);

  // Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  // Register — step 1: info
  const [regName,    setRegName]    = useState('');
  const [regUser,    setRegUser]    = useState('');
  const [regMobile,  setRegMobile]  = useState('');
  const [regEmail,   setRegEmail]   = useState('');
  const [regPass,    setRegPass]    = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPw,  setShowRegPw]  = useState(false);

  // Forgot Password state
  const [forgotEmail,        setForgotEmail]        = useState('');
  const [generatedOtp,       setGeneratedOtp]       = useState('');
  const [forgotOtp,          setForgotOtp]          = useState('');
  const [isOtpVerified,      setIsOtpVerified]      = useState(false);
  const [newPassword,        setNewPassword]        = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPw,          setShowNewPw]          = useState(false);
  const [showConfirmNewPw,   setShowConfirmNewPw]   = useState(false);

  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);

  // ── Role config ───────────────────────────────────────────
  const cfgMap = {
    pos: {
      icon: <Utensils size={24} color="#fff" />,
      iconBg: 'linear-gradient(135deg,#f59e0b,#ea580c)',
      iconGlow: 'rgba(245,158,11,0.5)',
      accent: '#f59e0b', accentLight: '#fbbf24',
      btnBg: 'linear-gradient(135deg,#f59e0b,#ea580c)',
      btnShadow: '0 4px 18px rgba(245,158,11,0.45)',
      badge: '🍽️ POS TERMINAL',
      badgeBg: 'rgba(245,158,11,0.15)', badgeBorder: 'rgba(245,158,11,0.4)',
      hint: 'Access: Billing, Table orders, Settlements'
    },
    kot: {
      icon: <ChefHat size={24} color="#fff" />,
      iconBg: 'linear-gradient(135deg,#ea580c,#c2410c)',
      iconGlow: 'rgba(234,88,12,0.5)',
      accent: '#ea580c', accentLight: '#fb923c',
      btnBg: 'linear-gradient(135deg,#ea580c,#c2410c)',
      btnShadow: '0 4px 18px rgba(234,88,12,0.45)',
      badge: '🔥 KITCHEN TERMINAL',
      badgeBg: 'rgba(234,88,12,0.15)', badgeBorder: 'rgba(234,88,12,0.4)',
      hint: 'Access: KOT view, Order preparation status'
    },
    admin: {
      icon: <ShieldCheck size={24} color="#fff" />,
      iconBg: 'linear-gradient(135deg,#6366f1,#4f46e5)',
      iconGlow: 'rgba(99,102,241,0.5)',
      accent: '#6366f1', accentLight: '#818cf8',
      btnBg: 'linear-gradient(135deg,#6366f1,#4f46e5)',
      btnShadow: '0 4px 18px rgba(99,102,241,0.45)',
      badge: '⚙️ ADMIN PORTAL',
      badgeBg: 'rgba(99,102,241,0.15)', badgeBorder: 'rgba(99,102,241,0.4)',
      hint: 'Access: Menu, Tables, Staff, User management'
    }
  };
  const cfg = cfgMap[currentRole] || cfgMap.pos;
  const loginTitle = currentRole === 'admin' ? 'Admin Panel Login'
    : currentRole === 'kot' ? 'Kitchen KOT Login' : 'User POS Login';
  const loginSub   = currentRole === 'admin' ? 'Restaurant Management Portal'
    : currentRole === 'kot' ? 'Kitchen Display System (KDS)' : 'Dining Floor & Billing Station';

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 600); };

  const clearRegForm = () => {
    setRegName(''); setRegUser(''); setRegMobile(''); setRegEmail('');
    setRegPass(''); setRegConfirm('');
  };
  const clearAll = () => { setError(''); setSuccess(''); setUsername(''); setPassword(''); clearRegForm(); };

  // ── LOGIN ─────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please enter username and password.'); triggerShake(); return; }
    setLoading(true); setError('');
    const r = await loginUser(username.trim(), password.trim(), currentRole);
    setLoading(false);
    if (r.success) onLoginSuccess(r.session, currentRole);
    else { setError(r.error || 'Login failed.'); triggerShake(); }
  };

  // ── REGISTER ──────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!regName.trim())   { setError('Full name is required.'); triggerShake(); return; }
    if (!regUser.trim())   { setError('Username is required.'); triggerShake(); return; }
    if (!regMobile.trim() || !/^\d{10}$/.test(regMobile.replace(/\s+/g, ''))) {
      setError('Enter a valid 10-digit mobile number.'); triggerShake(); return;
    }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setError('Enter a valid email address.'); triggerShake(); return;
    }
    if (regPass.length < 6) { setError('Password must be at least 6 characters.'); triggerShake(); return; }
    if (regPass !== regConfirm) { setError('Passwords do not match.'); triggerShake(); return; }

    setLoading(true);
    const r = await registerUser({
      Username: regUser.trim(),
      Email: regEmail.trim(),
      Phone: regMobile.trim(),
      FullName: regName.trim(),
      Password: regPass.trim(),
      ConfirmPassword: regConfirm.trim(),
      Role: 'admin'
    });
    setLoading(false);
    if (r.success) {
      setSuccess(`✅ Account created! Signing you in as "${regName.trim()}"...`);
      setTimeout(async () => {
        const loginResult = await loginUser(regUser.trim(), regPass.trim(), 'admin');
        if (loginResult.success) {
          onLoginSuccess(loginResult.session, 'admin');
        } else {
          setSuccess('');
          setMode('login');
          setUsername(regUser.trim());
          setPassword(regPass.trim());
          clearRegForm();
        }
      }, 1000);
    } else { setError(r.error || 'Registration failed.'); triggerShake(); }
  };

  // ── FORGOT PASSWORD HANDLERS (AUTO-GENERATE OTP & CHANGE PASSWORD) ──────
  const handleAutoGenerateOtp = async () => {
    const input = forgotEmail.trim();
    if (!input) {
      setError('Please enter your registered email address or username first.');
      triggerShake();
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await apiForgotPassword(input);
      let otpCode = '';
      if (res && res.success && res.otp) {
        otpCode = res.otp;
      } else {
        otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      }
      setGeneratedOtp(otpCode);
      setSuccess(`🔑 Auto-Generated OTP: ${otpCode} (Click 'Auto-Fill OTP' or enter below)`);
    } catch {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);
      setSuccess(`🔑 Auto-Generated OTP: ${otpCode} (Click 'Auto-Fill OTP' or enter below)`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillOtp = () => {
    if (generatedOtp) {
      setForgotOtp(generatedOtp);
      setIsOtpVerified(true);
      setError('');
      setSuccess(`✅ OTP ${generatedOtp} entered! Please enter your new password below.`);
    }
  };

  const handleOtpChange = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setForgotOtp(digitsOnly);
    setError('');
    if (digitsOnly.length === 6) {
      if (!generatedOtp || digitsOnly === generatedOtp) {
        setIsOtpVerified(true);
        setSuccess('✅ OTP verified successfully! Enter your new password below.');
      } else {
        setIsOtpVerified(false);
        setError('Invalid OTP code. Please enter the generated OTP.');
      }
    } else {
      setIsOtpVerified(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const input = forgotEmail.trim();
    if (!input) {
      setError('Please enter your email or username.');
      triggerShake();
      return;
    }
    if (!isOtpVerified && forgotOtp !== generatedOtp) {
      setError('Please enter the 6-digit OTP code to verify.');
      triggerShake();
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters long.');
      triggerShake();
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiResetPassword(input, forgotOtp, newPassword.trim());
    } catch {}

    // Update in local users database as well
    try {
      const localUsers = getLocalUsers();
      const query = input.toLowerCase();
      const idx = localUsers.findIndex(u => 
        (u.username && u.username.toLowerCase() === query) || (u.email && u.email.toLowerCase() === query)
      );
      if (idx !== -1) {
        localUsers[idx].password = newPassword.trim();
        saveLocalUsers(localUsers);
      }
    } catch {}

    setLoading(false);
    setSuccess('✅ Password changed successfully! Signing you in with new password...');

    setTimeout(async () => {
      const loginRes = await loginUser(input, newPassword.trim(), currentRole);
      if (loginRes.success && onLoginSuccess) {
        onLoginSuccess(loginRes.session, currentRole);
      } else {
        setMode('login');
        setUsername(input);
        setPassword(newPassword.trim());
        setSuccess('Password updated. You can now sign in.');
      }
    }, 1200);
  };

  // Password strength
  const pwScore = (() => {
    let s = 0;
    if (regPass.length >= 6) s++;
    if (regPass.length >= 10) s++;
    if (/[A-Z]/.test(regPass)) s++;
    if (/[0-9]/.test(regPass)) s++;
    if (/[^A-Za-z0-9]/.test(regPass)) s++;
    return s;
  })();
  const pwColors = ['#ef4444','#f97316','#eab308','#22c55e','#10b981'];
  const pwLabels = ['Very Weak','Weak','Fair','Strong','Very Strong'];
  const pwC = pwColors[Math.min(pwScore - 1, 4)] || '#ef4444';
  const pwL = pwLabels[Math.min(pwScore - 1, 4)] || 'Very Weak';

  // Input style
  const inp = (val, extraStyle = {}) => ({
    width: '100%',
    padding: '0.42rem 0.75rem 0.42rem 2.2rem',
    background: 'rgba(255,255,255,0.05)',
    border: `1.5px solid ${val ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '8px', color: '#ffffff',
    fontSize: '0.8rem', fontWeight: 600,
    outline: 'none', transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
    ...extraStyle
  });

  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      boxSizing: 'border-box',
      background: 'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(15,23,42,0.98) 0%, #0a0f1e 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0.5rem 1rem', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter','Outfit',system-ui,sans-serif"
    }}>
      {/* BG decoration */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: `radial-gradient(circle, ${cfg.iconGlow} 0%, transparent 70%)`,
          opacity: 0.35
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-10%',
          width: '420px', height: '420px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          opacity: 0.35
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: '0.4rem', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg,#f59e0b,#ea580c)', padding: '5px',
            borderRadius: '8px', boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ChefHat size={18} color="#fff" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              AVSR FOOD COURT
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Restaurant Management System
            </div>
          </div>
        </div>
      </div>

      {/* Global 3-Terminal Role Selector Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '5px',
        background: 'rgba(14,22,40,0.92)',
        padding: '4px',
        borderRadius: '12px',
        border: '1.5px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '0.45rem',
        maxWidth: '400px',
        width: '100%',
        position: 'relative',
        zIndex: 2,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
      }}>
        {[
          { id: 'pos', label: 'User POS', icon: '🍽️', accent: '#f59e0b', shadow: '0 4px 14px rgba(245,158,11,0.35)' },
          { id: 'kot', label: 'Kitchen KOT', icon: '🔥', accent: '#ea580c', shadow: '0 4px 14px rgba(234,88,12,0.35)' },
          { id: 'admin', label: 'Admin Portal', icon: '⚙️', accent: '#6366f1', shadow: '0 4px 14px rgba(99,102,241,0.35)' }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setCurrentRole(t.id);
              if (t.id !== 'admin' && mode === 'register') setMode('login');
              setError('');
              setSuccess('');
            }}
            style={{
              padding: '0.42rem 0.35rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: currentRole === t.id ? 800 : 600,
              background: currentRole === t.id ? cfgMap[t.id].btnBg : 'transparent',
              color: currentRole === t.id ? '#ffffff' : '#94a3b8',
              border: currentRole === t.id ? `1.5px solid ${t.accent}` : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              transition: 'all 0.2s ease',
              boxShadow: currentRole === t.id ? t.shadow : 'none'
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '400px',
        maxHeight: 'calc(100vh - 125px)',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(14,22,40,0.93)', backdropFilter: 'blur(20px)',
        border: `1.5px solid ${cfg.accent}45`, borderRadius: '16px',
        boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
        overflow: 'hidden', position: 'relative', zIndex: 2,
        animation: shake ? 'shakeCard 0.5s ease' : 'none'
      }}>
        {/* Top accent bar */}
        <div style={{ height: '3px', background: cfg.btnBg, boxShadow: `0 0 16px ${cfg.iconGlow}`, flexShrink: 0 }} />

        {/* Card header */}
        <div style={{ padding: '0.55rem 1rem 0.35rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '38px', height: '38px', borderRadius: '10px',
            background: cfg.iconBg,
            boxShadow: `0 6px 20px ${cfg.iconGlow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
            marginBottom: '0.3rem'
          }}>
            {cfg.icon}
          </div>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: cfg.badgeBg, border: `1px solid ${cfg.badgeBorder}`,
              color: cfg.accentLight, fontSize: '0.6rem', fontWeight: 800,
              letterSpacing: '0.06em', padding: '1px 7px', borderRadius: '20px',
              marginBottom: '0.25rem'
            }}>
              {cfg.badge}
            </span>
          </div>
          <h1 style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
            {mode === 'register' ? 'Create Admin Account' : mode === 'forgot' ? (forgotOtpStep ? 'Set New Password' : 'Reset Password') : loginTitle}
          </h1>
          <p style={{ fontSize: '0.67rem', color: '#64748b', margin: 0, fontWeight: 600 }}>
            {mode === 'register' ? 'Set up your administrator account' : mode === 'forgot' ? (forgotOtpStep ? 'Enter verification OTP & set new password' : 'Enter email to receive OTP verification code') : loginSub}
          </p>
        </div>

        {/* Tab toggle — Admin only */}
        {currentRole === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '0.5rem 1.25rem 0' }}>
            {[
              { key: 'login',    label: 'Sign In',  icon: <LogIn size={13} /> },
              { key: 'register', label: 'Register', icon: <UserPlus size={13} /> }
            ].map(t => (
              <button key={t.key} type="button"
                onClick={() => { setMode(t.key); clearAll(); }}
                style={{
                  padding: '0.42rem', borderRadius: '8px',
                  fontSize: '0.78rem', fontWeight: 800,
                  background: mode === t.key ? cfg.btnBg : 'rgba(255,255,255,0.04)',
                  color: mode === t.key ? '#fff' : '#475569',
                  border: mode === t.key ? `1.5px solid ${cfg.accent}` : '1.5px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  transition: 'all 0.2s', boxShadow: mode === t.key ? cfg.btnShadow : 'none'
                }}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ padding: '0.65rem 1rem 0.85rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {error && <Err msg={error} />}
            <Fld label="Username or Email" icon={<User size={13} color="#475569" />} mb="0.45rem">
              <input id="login-username" type="text" placeholder="Username or Email address"
                value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                style={inp(username)} autoComplete="username"
                onFocus={e => e.target.style.borderColor = cfg.accent}
                onBlur={e => e.target.style.borderColor = username ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
              />
            </Fld>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.24rem' }}>
                <label style={{ fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setSuccess('');
                    setForgotEmail(username.trim());
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: cfg.accentLight || '#fbbf24',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={13} color="#475569" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input id="login-password" type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  style={inp(password, { paddingRight: '2.5rem' })} autoComplete="current-password"
                  onFocus={e => e.target.style.borderColor = cfg.accent}
                  onBlur={e => e.target.style.borderColor = password ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                />
                <PwEye show={showPw} toggle={() => setShowPw(p => !p)} />
              </div>
            </div>

            <div style={{ marginTop: '0.65rem' }}>
              <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Sign In" icon={<MonitorCheck size={16} />} />
            </div>

            <div style={{ marginTop: '0.55rem', padding: '0.35rem 0.55rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700 }}>
                {cfg.hint} • Sign in with username <strong style={{color:'#64748b'}}>or</strong> email
              </div>
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD FORM (AUTO-GENERATE OTP & CHANGE PASSWORD) ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleResetPasswordSubmit} style={{ padding: '0.65rem 1.15rem 0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.42rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); setGeneratedOtp(''); setForgotOtp(''); setIsOtpVerified(false); }}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.74rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: 0
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
              <span style={{ fontSize: '0.66rem', color: cfg.accentLight, fontWeight: 700 }}>
                Password Recovery
              </span>
            </div>

            {error   && <Err msg={error} />}
            {success && <Suc msg={success} />}

            {/* 1. Email or Username Input */}
            <Fld label="Registered Email or Username *" icon={<Mail size={13} color="#475569" />} mb="0.3rem">
              <input
                type="text"
                placeholder="Enter email or username (e.g. pirnav)"
                value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setError(''); }}
                style={inp(forgotEmail)}
                onFocus={e => e.target.style.borderColor = cfg.accent}
                onBlur={e => e.target.style.borderColor = forgotEmail ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
              />
            </Fld>

            {/* 2. Auto-Generate OTP Box */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px dashed rgba(245, 158, 11, 0.35)',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 700 }}>
                  Verification OTP
                </span>
                <button
                  type="button"
                  onClick={handleAutoGenerateOtp}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.28) 0%, rgba(234, 88, 12, 0.22) 100%)',
                    border: '1px solid var(--accent-amber)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    color: 'var(--accent-amber-light)',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={11} />
                  <span>{generatedOtp ? 'Regenerate OTP' : '⚡ Auto-Generate OTP'}</span>
                </button>
              </div>

              {generatedOtp && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.16)',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '0.74rem', color: '#6ee7b7', fontWeight: 800 }}>
                    Auto-OTP: <strong style={{ letterSpacing: '2px', fontSize: '0.85rem', color: '#ffffff' }}>{generatedOtp}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoFillOtp}
                    style={{
                      background: '#10b981',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Auto-Fill OTP ✓
                  </button>
                </div>
              )}
            </div>

            {/* 3. Enter OTP input */}
            <Fld label="Enter 6-Digit OTP *" icon={<KeyRound size={13} color="#475569" />} mb="0.3rem">
              <input
                type="text"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={forgotOtp}
                onChange={e => handleOtpChange(e.target.value)}
                style={inp(forgotOtp, {
                  letterSpacing: forgotOtp ? '3px' : 'normal',
                  fontWeight: 800,
                  borderColor: isOtpVerified ? '#10b981' : (forgotOtp ? cfg.accent : 'rgba(255,255,255,0.1)')
                })}
              />
            </Fld>

            {/* 4. Change Password Fields (Unlocks upon entering OTP) */}
            {(isOtpVerified || forgotOtp.length === 6) ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '9px',
                padding: '0.55rem 0.65rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                animation: 'fadeIn 0.2s ease'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-amber-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🔑 Change Password
                </div>

                <Fld label="New Password *" icon={<Lock size={13} color="#475569" />} mb="0.2rem">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Min 6 chars"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    style={inp(newPassword, { paddingRight: '2.2rem' })}
                  />
                  <PwEye show={showNewPw} toggle={() => setShowNewPw(p => !p)} />
                </Fld>

                <Fld label="Confirm New Password *" icon={<Lock size={13} color="#475569" />} mb="0.2rem">
                  <input
                    type={showConfirmNewPw ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmNewPassword}
                    onChange={e => { setConfirmNewPassword(e.target.value); setError(''); }}
                    style={inp(confirmNewPassword, {
                      paddingRight: '2.2rem',
                      borderColor: confirmNewPassword ? (confirmNewPassword === newPassword ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.1)'
                    })}
                  />
                  <PwEye show={showConfirmNewPw} toggle={() => setShowConfirmNewPw(p => !p)} />
                </Fld>

                <div style={{ marginTop: '0.35rem' }}>
                  <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Change Password & Sign In" icon={<CheckCircle size={16} />} />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '0.3rem', color: '#64748b', fontSize: '0.68rem' }}>
                💡 Click <strong>⚡ Auto-Generate OTP</strong> above and enter it to unlock Change Password
              </div>
            )}
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {mode === 'register' && currentRole === 'admin' && (
          <form onSubmit={handleRegister} style={{ padding: '0.55rem 1rem 0.65rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', overflow: 'hidden' }}>
            {error   && <Err msg={error} />}
            {success && <Suc msg={success} />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem 0.65rem' }}>
              {/* ─ Row 1 Left: Full Name */}
              <Fld label="Full Name *" icon={<User size={13} color="#475569" />} mb="0">
                <input type="text" placeholder="e.g. SURESH REDDY"
                  value={regName} onChange={e => { setRegName(e.target.value); setError(''); }}
                  style={inp(regName)}
                  onFocus={e => e.target.style.borderColor = cfg.accent}
                  onBlur={e => e.target.style.borderColor = regName ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                />
              </Fld>

              {/* ─ Row 1 Right: Username */}
              <Fld label="Username *" icon={<User size={13} color="#475569" />} mb="0">
                <input type="text" placeholder="Choose username"
                  value={regUser} onChange={e => { setRegUser(e.target.value); setError(''); }}
                  style={inp(regUser)} autoComplete="username"
                  onFocus={e => e.target.style.borderColor = cfg.accent}
                  onBlur={e => e.target.style.borderColor = regUser ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                />
              </Fld>

              {/* ─ Row 2 Left: Mobile Number */}
              <Fld label="Mobile Number *" icon={<Phone size={13} color="#475569" />} mb="0">
                <input type="tel" placeholder="10-digit mobile" maxLength={10}
                  value={regMobile} onChange={e => { setRegMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                  style={inp(regMobile)}
                  onFocus={e => e.target.style.borderColor = cfg.accent}
                  onBlur={e => e.target.style.borderColor = regMobile ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                />
              </Fld>

              {/* ─ Row 2 Right: Email */}
              <Fld label="Email *" icon={<Mail size={13} color="#475569" />} mb="0">
                <input type="email" placeholder="your@email.com"
                  value={regEmail} onChange={e => { setRegEmail(e.target.value); setError(''); }}
                  style={inp(regEmail)}
                  onFocus={e => e.target.style.borderColor = cfg.accent}
                  onBlur={e => e.target.style.borderColor = regEmail ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                />
              </Fld>

              {/* ─ Row 3 Left: Password */}
              <Fld label="Password *" icon={<Lock size={13} color="#475569" />} mb="0">
                <input type={showRegPw ? 'text' : 'password'} placeholder="Min 6 chars"
                  value={regPass} onChange={e => { setRegPass(e.target.value); setError(''); }}
                  style={inp(regPass, { paddingRight: '2.2rem' })} autoComplete="new-password"
                  onFocus={e => e.target.style.borderColor = cfg.accent}
                  onBlur={e => e.target.style.borderColor = regPass ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                />
                <PwEye show={showRegPw} toggle={() => setShowRegPw(p => !p)} />
              </Fld>

              {/* ─ Row 3 Right: Confirm Password */}
              <Fld label="Confirm Password *" icon={<Lock size={13} color="#475569" />} mb="0">
                <input type={showRegPw ? 'text' : 'password'} placeholder="Re-enter password"
                  value={regConfirm} onChange={e => { setRegConfirm(e.target.value); setError(''); }}
                  style={inp(regConfirm, {
                    paddingRight: '2.2rem',
                    borderColor: regConfirm ? (regConfirm === regPass ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.1)'
                  })}
                  autoComplete="new-password"
                />
              </Fld>
            </div>

            <div style={{ marginTop: '0.35rem' }}>
              <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Create Admin Account" icon={<UserPlus size={15} />} />
            </div>

            <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Already have an account? </span>
              <button type="button" onClick={() => { setMode('login'); clearAll(); }}
                style={{ background: 'none', border: 'none', color: cfg.accentLight, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}>
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '0.45rem', textAlign: 'center', color: '#334155', fontSize: '0.64rem', fontWeight: 700, position: 'relative', zIndex: 2 }}>
        © 2026 AVSR Food Court • Secured by Restaurant Auth System
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shakeCard {
          0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(8px)}
          45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)}
        }
        input::placeholder { color: #334155; }
        input[type=tel]::-webkit-inner-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}

// ── Tiny shared sub-components ────────────────────────────────
function Err({ msg }) {
  return (
    <div style={{
      background:'rgba(239,68,68,0.12)', border:'1.5px solid rgba(239,68,68,0.4)',
      borderRadius:'8px', padding:'0.45rem 0.75rem',
      color:'#fca5a5', fontSize:'0.76rem', fontWeight:700,
      marginBottom:'0.65rem', display:'flex', alignItems:'center', gap:'0.4rem'
    }}>
      <span>⚠️</span><span>{msg}</span>
    </div>
  );
}
function Suc({ msg }) {
  return (
    <div style={{
      background:'rgba(16,185,129,0.12)', border:'1.5px solid rgba(16,185,129,0.4)',
      borderRadius:'8px', padding:'0.45rem 0.75rem',
      color:'#6ee7b7', fontSize:'0.76rem', fontWeight:700,
      marginBottom:'0.65rem', display:'flex', alignItems:'center', gap:'0.4rem'
    }}>
      <CheckCircle size={14}/><span>{msg}</span>
    </div>
  );
}
function Fld({ label, icon, children, mb='0.65rem' }) {
  return (
    <div style={{ marginBottom: mb }}>
      <label style={{ display:'block', fontSize:'0.66rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.24rem' }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)' }}>{icon}</div>
        {children}
      </div>
    </div>
  );
}
function PwEye({ show, toggle }) {
  return (
    <button type="button" onClick={toggle}
      style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center' }}>
      {show ? <EyeOff size={14}/> : <Eye size={14}/>}
    </button>
  );
}
function Btn({ loading, bg, shadow, label, icon }) {
  return (
    <button type="submit" disabled={loading} style={{
      width:'100%', padding:'0.62rem', borderRadius:'9px',
      background: loading ? 'rgba(255,255,255,0.08)' : bg,
      color:'#fff', fontWeight:900, fontSize:'0.85rem',
      border:'none', cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : shadow,
      display:'flex', alignItems:'center', justifyContent:'center', gap:'0.45rem',
      transition:'all 0.2s', letterSpacing:'0.02em'
    }}>
      {loading
        ? <><div style={{ width:'16px',height:'16px',borderRadius:'50%',border:'2px solid rgba(255,255,255,0.25)',borderTopColor:'#fff',animation:'spin 0.7s linear infinite' }}/><span>Please wait...</span></>
        : <>{icon}<span>{label}</span></>
      }
    </button>
  );
}
