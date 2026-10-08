import React, { useState, useEffect, useRef } from 'react';
import {
  ChefHat, Lock, User, Eye, EyeOff,
  Utensils, MonitorCheck, ShieldCheck,
  UserPlus, LogIn, CheckCircle, Mail,
  Phone, Send, RefreshCw, ArrowLeft,
  KeyRound
} from 'lucide-react';
import { loginUser, createUser } from '../utils/auth';

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

  // OTP state
  const [otpStep,      setOtpStep]      = useState(false);   // true = show OTP entry
  const [generatedOtp, setGeneratedOtp] = useState('');       // the OTP we generated
  const [otpInput,     setOtpInput]     = useState(['','','','','','']); // 6 boxes
  const [otpVerified,  setOtpVerified]  = useState(false);
  const [otpSent,      setOtpSent]      = useState(false);
  const [otpError,     setOtpError]     = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const countdownRef = useRef(null);
  const otpRefs      = useRef([]);

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
    setOtpStep(false); setOtpInput(['','','','','','']);
    setGeneratedOtp(''); setOtpVerified(false); setOtpSent(false);
    setOtpError(''); setOtpCountdown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };
  const clearAll = () => { setError(''); setSuccess(''); setUsername(''); setPassword(''); clearRegForm(); };

  // ── Generate & "send" OTP ─────────────────────────────────
  const handleSendOtp = () => {
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setError('Please enter a valid email address first.'); triggerShake(); return;
    }
    setError('');
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(otp);
    setOtpStep(true);
    setOtpSent(true);
    setOtpInput(['','','','','','']);
    setOtpVerified(false);
    setOtpError('');
    // Countdown 120s
    setOtpCountdown(120);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    // Focus first OTP box
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (idx, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...otpInput];
    next[idx] = v;
    setOtpInput(next);
    setOtpError('');
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otpInput[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) return; // allow paste
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['','','','','',''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpInput(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = () => {
    const entered = otpInput.join('');
    if (entered.length < 6) { setOtpError('Enter all 6 digits.'); return; }
    if (entered === generatedOtp) {
      setOtpVerified(true);
      setOtpError('');
    } else {
      setOtpError('❌ Incorrect OTP. Please try again.');
      setOtpInput(['','','','','','']);
      otpRefs.current[0]?.focus();
    }
  };

  // ── LOGIN ─────────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please enter username and password.'); triggerShake(); return; }
    setLoading(true); setError('');
    setTimeout(() => {
      const r = loginUser(username.trim(), password.trim(), currentRole);
      setLoading(false);
      if (r.success) onLoginSuccess(r.session, currentRole);
      else { setError(r.error || 'Login failed.'); triggerShake(); }
    }, 380);
  };

  // ── REGISTER ──────────────────────────────────────────────
  const handleRegister = (e) => {
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
    if (!otpVerified) { setError('Please verify your email with OTP first.'); triggerShake(); return; }
    if (regPass.length < 6) { setError('Password must be at least 6 characters.'); triggerShake(); return; }
    if (regPass !== regConfirm) { setError('Passwords do not match.'); triggerShake(); return; }

    setLoading(true);
    setTimeout(() => {
      const r = createUser({
        username: regUser.trim(),
        password: regPass.trim(),
        role: 'admin',
        name: regName.trim(),
        mobile: regMobile.trim(),
        email: regEmail.trim(),
        createdBy: 'self-register'
      });
      setLoading(false);
      if (r.success) {
        // ✅ AUTO-LOGIN immediately after registration
        setSuccess(`✅ Account created! Signing you in as "${regName.trim()}"...`);
        setTimeout(() => {
          const loginResult = loginUser(regUser.trim(), regPass.trim(), 'admin');
          if (loginResult.success) {
            onLoginSuccess(loginResult.session, 'admin');
          } else {
            // Fallback: switch to login tab with fields pre-filled
            setSuccess('');
            setMode('login');
            setUsername(regUser.trim());
            setPassword(regPass.trim());
            clearRegForm();
          }
        }, 1000);
      } else { setError(r.error || 'Registration failed.'); triggerShake(); }
    }, 450);
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
            {mode === 'register' ? 'Create Admin Account' : loginTitle}
          </h1>
          <p style={{ fontSize: '0.67rem', color: '#64748b', margin: 0, fontWeight: 600 }}>
            {mode === 'register' ? 'Set up your administrator account with OTP verification' : loginSub}
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
            <Fld label="Password" icon={<Lock size={13} color="#475569" />} mb="0.65rem">
              <input id="login-password" type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                style={inp(password, { paddingRight: '2.5rem' })} autoComplete="current-password"
                onFocus={e => e.target.style.borderColor = cfg.accent}
                onBlur={e => e.target.style.borderColor = password ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
              />
              <PwEye show={showPw} toggle={() => setShowPw(p => !p)} />
            </Fld>
            <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Sign In" icon={<MonitorCheck size={16} />} />
            <div style={{ marginTop: '0.55rem', padding: '0.35rem 0.55rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700 }}>
                {cfg.hint} • Sign in with username <strong style={{color:'#64748b'}}>or</strong> email
              </div>
            </div>
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

              {/* ─ Row 2 Right: Email + OTP button */}
              <div>
                <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.24rem' }}>
                  Email * {otpVerified && <span style={{ color: '#10b981', fontSize: '0.6rem', textTransform: 'none' }}>✓ Verified</span>}
                </label>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'stretch' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Mail size={13} color="#475569" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="email" placeholder="your@email.com"
                      value={regEmail} onChange={e => { setRegEmail(e.target.value); setError(''); setOtpVerified(false); setOtpStep(false); setOtpSent(false); }}
                      disabled={otpVerified}
                      style={{
                        ...inp(regEmail),
                        borderColor: otpVerified ? '#10b981' : (regEmail ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'),
                        opacity: otpVerified ? 0.7 : 1
                      }}
                      onFocus={e => e.target.style.borderColor = cfg.accent}
                      onBlur={e => e.target.style.borderColor = otpVerified ? '#10b981' : (regEmail ? cfg.accent + '70' : 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                  {!otpVerified && (
                    <button type="button" onClick={handleSendOtp}
                      disabled={!regEmail || otpCountdown > 0}
                      style={{
                        padding: '0 0.6rem', borderRadius: '8px', flexShrink: 0,
                        background: (!regEmail || otpCountdown > 0) ? 'rgba(255,255,255,0.06)' : cfg.btnBg,
                        border: (!regEmail || otpCountdown > 0) ? '1.5px solid rgba(255,255,255,0.1)' : 'none',
                        color: (!regEmail || otpCountdown > 0) ? '#475569' : '#fff',
                        fontSize: '0.7rem', fontWeight: 800, cursor: (!regEmail || otpCountdown > 0) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
                        boxShadow: (!regEmail || otpCountdown > 0) ? 'none' : cfg.btnShadow,
                        transition: 'all 0.2s'
                      }}
                    >
                      {otpCountdown > 0 ? `${otpCountdown}s` : (otpSent ? 'Resend' : 'Send OTP')}
                    </button>
                  )}
                  {otpVerified && (
                    <div style={{
                      padding: '0 0.5rem', borderRadius: '8px', flexShrink: 0,
                      background: 'rgba(16,185,129,0.15)', border: '1.5px solid rgba(16,185,129,0.4)',
                      color: '#10b981', fontSize: '0.68rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', gap: '3px'
                    }}>
                      ✓ Verified
                    </div>
                  )}
                </div>
              </div>

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

            {/* OTP Step Box */}
            {otpStep && !otpVerified && (
              <div style={{
                marginTop: '0.2rem',
                background: 'rgba(0,0,0,0.4)',
                border: `1.5px solid ${cfg.accent}40`,
                borderRadius: '8px', padding: '0.45rem 0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <div style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: 800 }}>
                    📧 Demo OTP: <strong style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '0.85rem', marginLeft: '4px' }}>{generatedOtp}</strong>
                  </div>
                  <button type="button" onClick={handleVerifyOtp} disabled={otpInput.join('').length < 6}
                    style={{
                      padding: '3px 10px', borderRadius: '5px',
                      background: otpInput.join('').length === 6 ? cfg.btnBg : 'rgba(255,255,255,0.08)',
                      color: '#fff', fontSize: '0.68rem', fontWeight: 800, border: 'none', cursor: 'pointer'
                    }}>
                    Verify OTP
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }} onPaste={handleOtpPaste}>
                  {otpInput.map((digit, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      style={{
                        width: '30px', height: '32px', textAlign: 'center', fontSize: '1rem', fontWeight: 900,
                        fontFamily: 'monospace', color: '#fff', background: digit ? `${cfg.accent}20` : 'rgba(255,255,255,0.06)',
                        border: `1.5px solid ${digit ? cfg.accent : 'rgba(255,255,255,0.15)'}`, borderRadius: '6px', outline: 'none'
                      }}
                    />
                  ))}
                </div>
                {otpError && <div style={{ color: '#f87171', fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', marginTop: '2px' }}>{otpError}</div>}
              </div>
            )}

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
