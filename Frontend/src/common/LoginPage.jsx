import React, { useState, useEffect } from 'react';
import { Utensils, CheckCircle, ArrowLeft } from 'lucide-react';
import { loginUser, createUser, registerUser, updateUserPassword, getUsers } from '../utils/auth';
import { apiForgotPassword, apiResetPassword, apiSendOtp, apiVerifyOtp } from '../api/authApi';

const RESTAURANT_SETTINGS_KEY = 'gourmet_pos_settings_v1';

const getStoredRestaurantName = () => {
  try {
    const raw = localStorage.getItem(RESTAURANT_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.restaurantName === 'string' && parsed.restaurantName.trim()) {
        return parsed.restaurantName.trim();
      }
    }
  } catch {}
  return '';
};

const resolveRestaurantName = (propVal) => {
  if (propVal && typeof propVal === 'string' && propVal.trim() && propVal.trim().toLowerCase() !== 'restaurant') {
    return propVal.trim();
  }
  const fromStorage = getStoredRestaurantName();
  if (fromStorage) return fromStorage;
  if (propVal && typeof propVal === 'string' && propVal.trim()) return propVal.trim();
  return 'Restaurant';
};

/**
 * FoodPlateSvg - Vector illustration replicating the gourmet dish
 * from the reference design (plate with noodles, tomato, fried egg, basil, and side cutlery).
 */
function FoodPlateSvg({ style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="48 72 444 396"
      style={style}
      aria-label="Restaurant dish illustration"
    >
      {/* ── Left Cutlery: Fork Outline ── */}
      <g stroke="#ffffff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
        {/* Handle */}
        <line x1="72" y1="245" x2="72" y2="395" />
        {/* Tines base curve */}
        <path d="M 54,215 C 54,236 72,245 72,245 C 72,245 90,236 90,215" />
        {/* 4 Tines */}
        <line x1="54" y1="215" x2="54" y2="162" />
        <line x1="66" y1="228" x2="66" y2="162" />
        <line x1="78" y1="228" x2="78" y2="162" />
        <line x1="90" y1="215" x2="90" y2="162" />
      </g>

      {/* ── Right Cutlery: Knife Outline ── */}
      <g stroke="#ffffff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
        {/* Handle */}
        <line x1="468" y1="245" x2="468" y2="395" />
        {/* Straight inner edge & curved blade */}
        <path d="M 468,395 L 468,245 L 468,162 C 468,162 485,178 485,212 C 485,236 468,245 468,245" />
      </g>

      {/* ── The Plate ── */}
      {/* Outer Biscuit / Tan Rim */}
      <circle cx="270" cy="270" r="195" fill="#e9dbcb" />
      {/* Inner Rim Depth Ring */}
      <circle cx="270" cy="270" r="174" fill="#dfd0bd" />
      {/* Inner Cream Bowl */}
      <circle cx="270" cy="270" r="158" fill="#fcf9f4" />

      {/* ── Dish Contents ── */}

      {/* 1. Tomato Slice (Top-Left) */}
      <g id="tomato-slice">
        <circle cx="206" cy="194" r="33" fill="#d34032" />
        <circle cx="206" cy="194" r="26" fill="#e04e40" />
        <circle cx="206" cy="194" r="7" fill="#d34032" />
        {/* Seed Chambers */}
        <path d="M 206,172 C 201,176 201,185 206,187 C 211,185 211,176 206,172 Z" fill="#d34032" />
        <circle cx="206" cy="179" r="2" fill="#fae5e1" />

        <path d="M 206,216 C 201,212 201,203 206,201 C 211,203 211,212 206,216 Z" fill="#d34032" />
        <circle cx="206" cy="209" r="2" fill="#fae5e1" />

        <path d="M 184,194 C 188,189 197,189 199,194 C 197,199 188,199 184,194 Z" fill="#d34032" />
        <circle cx="191" cy="194" r="2" fill="#fae5e1" />

        <path d="M 228,194 C 224,189 215,189 213,194 C 215,199 224,199 228,194 Z" fill="#d34032" />
        <circle cx="221" cy="194" r="2" fill="#fae5e1" />
      </g>

      {/* 2. Fried Egg (Top-Right) */}
      <g id="fried-egg">
        {/* Egg White Albumin */}
        <path
          d="M 326,146 C 352,146 368,162 366,188 C 364,212 346,226 324,224 C 298,222 286,204 288,182 C 290,160 302,146 326,146 Z"
          fill="#ffffff"
        />
        {/* Yolk */}
        <circle cx="326" cy="185" r="17" fill="#e5a73b" />
        {/* Soft Highlight */}
        <circle cx="321" cy="180" r="3.2" fill="#ffffff" opacity="0.65" />
      </g>

      {/* 3. Golden Noodle Ribbons */}
      <g stroke="#e5a73b" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Upper wave ribbon */}
        <path d="M 175,248 C 195,268 215,268 235,240 C 255,212 280,248 305,248 C 325,248 340,228 355,238" />
        {/* Middle wave ribbon */}
        <path d="M 160,282 C 180,312 215,312 240,272 C 265,232 295,282 320,282 C 338,282 350,268 362,278" />
        {/* Lower loop ribbon */}
        <path d="M 172,322 C 195,338 225,328 245,298 C 265,268 288,302 324,312" />
      </g>

      {/* 4. Green Basil Leaves (Bottom) */}
      <g id="basil-leaves" fill="#487b47">
        {/* Left leaf */}
        <path d="M 265,340 C 235,325 218,335 218,346 C 218,358 245,362 265,340 Z" />
        {/* Center down leaf */}
        <path d="M 265,340 C 255,372 268,386 278,386 C 288,386 288,364 265,340 Z" />
        {/* Right leaf */}
        <path d="M 265,340 C 285,332 314,342 318,358 C 322,374 290,374 265,340 Z" />
        {/* Leaf center veins */}
        <path
          d="M 265,340 C 245,342 228,346 228,346 M 265,340 C 268,360 274,374 274,374 M 265,340 C 282,346 304,356 304,356"
          stroke="#3b683a"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* 5. Green Peas / Seasoning Accents */}
      <g fill="#487b47">
        <circle cx="358" cy="304" r="5.5" />
        <circle cx="348" cy="326" r="5.5" />
        <circle cx="366" cy="268" r="5.5" />
      </g>
    </svg>
  );
}

/**
 * LoginPage - Visual redesign matching reference mockup (media_1792645151692_a8ae5f0e.png)
 *
 * Preserves 100% of existing functionality:
 * - Role selection ('pos' -> Dining POS, 'kot' -> Kitchen, 'admin' -> Admin)
 * - Sign in execution with loginUser
 * - Admin account creation with registerUser
 * - Forgot password OTP workflow (apiForgotPassword, apiResetPassword)
 * - Error/Success alerts, form validation, and shake animation
 * - Dynamic restaurant name from Settings (no hardcoded restaurant name)
 */
export function LoginPage({ role = 'pos', onLoginSuccess, restaurantName = 'Restaurant' }) {
  const [currentRole, setCurrentRole] = useState(role);
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'

  // Dynamic restaurant name loaded from Settings / LocalStorage / Props
  const [currentRestaurantName, setCurrentRestaurantName] = useState(() =>
    resolveRestaurantName(restaurantName)
  );

  // Sync prop changes from parent router
  useEffect(() => {
    setCurrentRole(role);
  }, [role]);

  // Sync restaurant name on prop change
  useEffect(() => {
    setCurrentRestaurantName(resolveRestaurantName(restaurantName));
  }, [restaurantName]);

  // Listen to live settings updates across windows/tabs and AdminSettings save events
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const resolved = resolveRestaurantName(restaurantName);
      setCurrentRestaurantName(resolved);
    };
    window.addEventListener('storage', handleSettingsUpdate);
    window.addEventListener('restaurant-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('storage', handleSettingsUpdate);
      window.removeEventListener('restaurant-settings-updated', handleSettingsUpdate);
    };
  }, [restaurantName]);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  // Register form state (for admin)
  const [regName,    setRegName]    = useState('');
  const [regUser,    setRegUser]    = useState('');
  const [regMobile,  setRegMobile]  = useState('');
  const [regEmail,   setRegEmail]   = useState('');
  const [regPass,    setRegPass]    = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPw,  setShowRegPw]  = useState(false);

  // Forgot password form state
  const [forgotEmail,        setForgotEmail]        = useState('');
  const [forgotOtpStep,      setForgotOtpStep]      = useState(false);
  const [forgotOtp,          setForgotOtp]          = useState('');
  const [newPassword,        setNewPassword]        = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Status state
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const clearRegForm = () => {
    setRegName('');
    setRegUser('');
    setRegMobile('');
    setRegEmail('');
    setRegPass('');
    setRegConfirm('');
  };

  const clearAll = () => {
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
    clearRegForm();
  };

  // ── LOGIN ─────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError('');
    const r = await loginUser(username.trim(), password.trim(), currentRole);
    setLoading(false);
    if (r.success) {
      onLoginSuccess(r.session, currentRole);
    } else {
      setError(r.error || 'Login failed.');
      triggerShake();
    }
  };

  // ── REGISTER (ADMIN ONLY) ─────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!regName.trim()) { setError('Full name is required.'); triggerShake(); return; }
    if (!regUser.trim()) { setError('Username is required.'); triggerShake(); return; }
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
      setSuccess(`Account created! Signing you in as "${regName.trim()}"...`);
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
    } else {
      setError(r.error || 'Registration failed.');
      triggerShake();
    }
  };

  // ── FORGOT PASSWORD ───────────────────────────────────────
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    const inputEmail = forgotEmail.trim();
    if (!inputEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail)) {
      setError('Please enter a valid email address.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await apiForgotPassword(inputEmail);
    setLoading(false);

    if (res.success) {
      setForgotOtpStep(true);
      setSuccess(`OTP sent to ${inputEmail}. Enter code & new password below.`);
    } else {
      setError(res.error || 'Failed to send OTP.');
      triggerShake();
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const enteredOtp = forgotOtp.trim();
    if (!enteredOtp || enteredOtp.length < 4) {
      setError('Please enter the verification OTP code.');
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

    const res = await apiResetPassword(forgotEmail.trim(), enteredOtp, newPassword.trim());
    setLoading(false);

    if (res.success) {
      setSuccess('Password updated successfully! Signing you in with new password...');
      setTimeout(() => {
        setMode('login');
        setPassword(newPassword.trim());
        setUsername(forgotEmail.trim());
        setSuccess('');
        setForgotOtpStep(false);
      }, 1200);
    } else {
      setError(res.error || 'Failed to reset password.');
      triggerShake();
    }
  };

  const registerInpStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #dcd3c6',
    borderRadius: '10px',
    fontSize: '0.9rem',
    color: '#211a16',
    outline: 'none'
  };

  return (
    <div className="login-split-container" style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      minHeight: '100vh',
      backgroundColor: '#211a16',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Google Serif Font for headlines and branding */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shakeForm {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }

        .login-input:focus {
          border-color: #f06437 !important;
          box-shadow: 0 0 0 3px rgba(240, 100, 55, 0.12) !important;
        }

        @media (max-width: 900px) {
          .login-split-container {
            flex-direction: column !important;
            height: auto !important;
            min-height: 100vh !important;
            overflow-y: auto !important;
          }
          .login-left-panel {
            width: 100% !important;
            min-height: 280px !important;
            padding: 32px 24px !important;
            flex: none !important;
          }
          .login-plate-wrapper {
            display: none !important;
          }
          .login-right-panel {
            width: 100% !important;
            min-height: auto !important;
            padding: 36px 20px !important;
            flex: 1 !important;
          }
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: Brand, Large Decorative Circles, Dish Artwork, Quote
         ───────────────────────────────────────────────────────────── */}
      <div className="login-left-panel" style={{
        flex: 1,
        backgroundColor: '#211a16',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(20px, 3vh, 36px) clamp(24px, 3.5vw, 48px)',
        boxSizing: 'border-box',
        minHeight: 0
      }}>
        {/* Top-Right Large Coral Circle */}
        <div style={{
          position: 'absolute',
          top: '-130px',
          right: '-120px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          backgroundColor: '#f06437',
          pointerEvents: 'none',
          zIndex: 1
        }} />

        {/* Bottom-Left Large Coral Circle */}
        <div style={{
          position: 'absolute',
          bottom: '-150px',
          left: '-130px',
          width: '460px',
          height: '460px',
          borderRadius: '50%',
          backgroundColor: '#f06437',
          pointerEvents: 'none',
          zIndex: 1
        }} />

        {/* Top Brand Area: White Badge with Terracotta Icon + Dynamic Restaurant Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 2, flexShrink: 0 }}>
          <div style={{
            width: '42px',
            height: '42px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            flexShrink: 0
          }}>
            <Utensils size={22} color="#f06437" strokeWidth={2.4} />
          </div>
          <span style={{
            color: '#ffffff',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.2rem, 1.6vw, 1.45rem)',
            fontWeight: 800,
            letterSpacing: '-0.01em',
            lineHeight: 1.15
          }}>
            {currentRestaurantName}
          </span>
        </div>

        {/* Center: Gourmet Food Dish Illustration - prominent and well-proportioned */}
        <div className="login-plate-wrapper" style={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          margin: '4px 0'
        }}>
          <FoodPlateSvg style={{
            width: '100%',
            height: '100%',
            maxWidth: 'min(450px, 92%)',
            maxHeight: 'min(420px, 48vh)',
            objectFit: 'contain'
          }} />
        </div>

        {/* Bottom: Editorial Headline */}
        <div style={{ position: 'relative', zIndex: 2, flexShrink: 0, marginTop: '4px' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.6rem, 2.2vw, 2.25rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Every great service<br />starts here.
          </h1>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: Clean Cream Card, Welcome Headline, Role Selector, Form
         ───────────────────────────────────────────────────────────── */}
      <div className="login-right-panel" style={{
        flex: 1,
        backgroundColor: '#fcfaf6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(20px, 3vh, 36px) clamp(20px, 3vw, 36px)',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          animation: shake ? 'shakeForm 0.5s ease' : 'none',
          padding: '8px 0'
        }}>
          {/* Headline */}
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.8rem, 2.4vw, 2.35rem)',
            fontWeight: 800,
            color: '#211a16',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em'
          }}>
            {mode === 'register'
              ? 'Create Account'
              : mode === 'forgot'
                ? (forgotOtpStep ? 'Reset Password' : 'Find Account')
                : 'Welcome back'}
          </h2>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(0.85rem, 1vw, 0.95rem)',
            color: '#766c64',
            margin: '0 0 clamp(14px, 2vh, 22px) 0',
            fontWeight: 400
          }}>
            {mode === 'register'
              ? 'Register a new administrator station login.'
              : mode === 'forgot'
                ? (forgotOtpStep ? 'Enter code and choose a new password.' : 'Enter your registered email to receive a reset code.')
                : 'Sign in to open your station.'}
          </p>

          {/* 3-Terminal Pill Role Switcher */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '4px',
            backgroundColor: '#ebe3d7',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: 'clamp(12px, 1.8vh, 18px)'
          }}>
            {[
              { id: 'pos', label: 'Dining POS' },
              { id: 'kot', label: 'Kitchen' },
              { id: 'admin', label: 'Admin' }
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
                  padding: '10px 0',
                  borderRadius: '9px',
                  fontSize: '0.88rem',
                  fontWeight: currentRole === t.id ? 700 : 500,
                  backgroundColor: currentRole === t.id ? '#ffffff' : 'transparent',
                  color: currentRole === t.id ? '#211a16' : '#766c64',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: currentRole === t.id ? '0 2px 8px rgba(33,26,22,0.06)' : 'none',
                  transition: 'all 0.18s ease',
                  textAlign: 'center'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Admin Mode Sub-toggle (Sign In vs Register) */}
          {currentRole === 'admin' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              marginBottom: '20px',
              backgroundColor: '#f3ece2',
              padding: '3px',
              borderRadius: '9px'
            }}>
              <button
                type="button"
                onClick={() => { setMode('login'); clearAll(); }}
                style={{
                  padding: '7px 0',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: mode === 'login' ? 700 : 500,
                  backgroundColor: mode === 'login' ? '#ffffff' : 'transparent',
                  color: mode === 'login' ? '#211a16' : '#766c64',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: mode === 'login' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); clearAll(); }}
                style={{
                  padding: '7px 0',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: mode === 'register' ? 700 : 500,
                  backgroundColor: mode === 'register' ? '#ffffff' : 'transparent',
                  color: mode === 'register' ? '#211a16' : '#766c64',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: mode === 'register' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Register Admin
              </button>
            </div>
          )}

          {/* ── 1. SIGN IN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {error && <Err msg={error} />}
              {success && <Suc msg={success} />}

              {/* Username or Email Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#211a16', marginBottom: '8px' }}>
                  Username or email
                </label>
                <input
                  id="login-username"
                  className="login-input"
                  type="text"
                  placeholder="Enter username or email"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  autoComplete="username"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '13px 16px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #dcd3c6',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    color: '#211a16',
                    outline: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                />
              </div>

              {/* Password Input + Forgot Password Link */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#211a16' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setSuccess('');
                      setForgotEmail(username.includes('@') ? username : '');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#d34032',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password"
                    className="login-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '13px 64px 13px 16px',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #dcd3c6',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      color: '#211a16',
                      outline: 'none',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#5a524a',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Terracotta Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#f06437',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: '12px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(240,100,55,0.28)',
                  transition: 'all 0.2s ease',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#e05528'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#f06437'; }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                      animation: 'spin 0.7s linear infinite'
                    }} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>
          )}

          {/* ── 2. FORGOT PASSWORD FORM ── */}
          {mode === 'forgot' && (
            <form onSubmit={forgotOtpStep ? handleResetPasswordSubmit : handleSendResetOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); setForgotOtpStep(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#766c64',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                  width: 'fit-content'
                }}
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>

              {error   && <Err msg={error} />}
              {success && <Suc msg={success} />}

              {!forgotOtpStep ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#211a16', marginBottom: '8px' }}>
                      Registered Email Address *
                    </label>
                    <input
                      className="login-input"
                      type="email"
                      placeholder="Enter your registered email"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); setError(''); }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '13px 16px',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #dcd3c6',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        color: '#211a16',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#f06437',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 700,
                      borderRadius: '12px',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 16px rgba(240,100,55,0.28)'
                    }}
                  >
                    {loading ? 'Sending code...' : 'Send Reset Code to Email'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#211a16', marginBottom: '8px' }}>
                      6-Digit Email Code *
                    </label>
                    <input
                      className="login-input"
                      type="text"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={e => { setForgotOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '13px 16px',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #dcd3c6',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        color: '#211a16',
                        outline: 'none',
                        letterSpacing: '2px',
                        fontWeight: 700
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#211a16', marginBottom: '8px' }}>
                      New Password *
                    </label>
                    <input
                      className="login-input"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '13px 16px',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #dcd3c6',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        color: '#211a16',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#211a16', marginBottom: '8px' }}>
                      Confirm New Password *
                    </label>
                    <input
                      className="login-input"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={e => { setConfirmNewPassword(e.target.value); setError(''); }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '13px 16px',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #dcd3c6',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        color: '#211a16',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#f06437',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 700,
                      borderRadius: '12px',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 16px rgba(240,100,55,0.28)'
                    }}
                  >
                    {loading ? 'Updating password...' : 'Update Password & Sign In'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* ── 3. REGISTER FORM (ADMIN ONLY) ── */}
          {mode === 'register' && currentRole === 'admin' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {error   && <Err msg={error} />}
              {success && <Suc msg={success} />}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#211a16', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={regName}
                    onChange={e => { setRegName(e.target.value); setError(''); }}
                    style={registerInpStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#211a16', marginBottom: '6px' }}>
                    Username *
                  </label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Choose username"
                    value={regUser}
                    onChange={e => { setRegUser(e.target.value); setError(''); }}
                    autoComplete="username"
                    style={registerInpStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#211a16', marginBottom: '6px' }}>
                    Mobile Number *
                  </label>
                  <input
                    className="login-input"
                    type="tel"
                    placeholder="10-digit mobile"
                    maxLength={10}
                    value={regMobile}
                    onChange={e => { setRegMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                    style={registerInpStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#211a16', marginBottom: '6px' }}>
                    Email *
                  </label>
                  <input
                    className="login-input"
                    type="email"
                    placeholder="your@email.com"
                    value={regEmail}
                    onChange={e => { setRegEmail(e.target.value); setError(''); }}
                    style={registerInpStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#211a16', marginBottom: '6px' }}>
                    Password *
                  </label>
                  <input
                    className="login-input"
                    type={showRegPw ? 'text' : 'password'}
                    placeholder="Min 6 chars"
                    value={regPass}
                    onChange={e => { setRegPass(e.target.value); setError(''); }}
                    autoComplete="new-password"
                    style={registerInpStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#211a16', marginBottom: '6px' }}>
                    Confirm Password *
                  </label>
                  <input
                    className="login-input"
                    type={showRegPw ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={regConfirm}
                    onChange={e => { setRegConfirm(e.target.value); setError(''); }}
                    autoComplete="new-password"
                    style={{
                      ...registerInpStyle,
                      borderColor: regConfirm ? (regConfirm === regPass ? '#16a34a' : '#dc2626') : '#dcd3c6'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  backgroundColor: '#f06437',
                  color: '#ffffff',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  borderRadius: '12px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(240,100,55,0.28)',
                  marginTop: '6px'
                }}
              >
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#766c64' }}>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => { setMode('login'); clearAll(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#d34032',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* Footer note with dynamic restaurant name */}
          <div style={{
            marginTop: 'clamp(14px, 2.5vh, 28px)',
            textAlign: 'center',
            color: '#9a8f85',
            fontSize: '0.75rem',
            fontWeight: 500
          }}>
            © {new Date().getFullYear()} {currentRestaurantName} • Secured by Restaurant Auth System
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alert Feedback Sub-components ─────────────────────────────
function Err({ msg }) {
  return (
    <div style={{
      backgroundColor: '#fef2f2',
      border: '1.5px solid #fecaca',
      borderRadius: '10px',
      padding: '10px 14px',
      color: '#991b1b',
      fontSize: '0.85rem',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{ fontSize: '1rem' }}>⚠️</span>
      <span>{msg}</span>
    </div>
  );
}

function Suc({ msg }) {
  return (
    <div style={{
      backgroundColor: '#f0fdf4',
      border: '1.5px solid #bbf7d0',
      borderRadius: '10px',
      padding: '10px 14px',
      color: '#166534',
      fontSize: '0.85rem',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <CheckCircle size={16} color="#16a34a" />
      <span>{msg}</span>
    </div>
  );
}
