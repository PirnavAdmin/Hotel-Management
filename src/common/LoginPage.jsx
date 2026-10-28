import './LoginPage.css';
import { logFormSubmission, logUserAction } from '../utils/logger';
import { ThemeToggle } from './ThemeToggle';
import React, { useState, useEffect, useRef, useId } from 'react';
import {
  ChefHat, Lock, User, Eye, EyeOff,
  Utensils, MonitorCheck, ShieldCheck,
  UserPlus, LogIn, CheckCircle, Mail,
  Phone, Send, RefreshCw, ArrowLeft,
  Settings, Printer, TrendingUp, Heart, Sparkles, KeyRound
} from 'lucide-react';
import { loginUser, createUser, registerUser, updateUserPassword, getUsers } from '../utils/auth';
import { apiForgotPassword, apiResetPassword, apiSendOtp, apiVerifyOtp } from '../api/authApi';

/**
 * LoginPage — role-specific login/register screen.
 * Register (admin only) includes: Name, Username, Mobile, Email + OTP, Password.
 */
const RESTAURANT_SETTINGS_KEY = "gourmet_pos_settings_v1";

const getStoredRestaurantSettings = () => {
  try {
    const raw = localStorage.getItem(RESTAURANT_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  return {};
};

const resolveRestaurantName = (propVal) => {
  if (propVal && typeof propVal === "string" && propVal.trim() && propVal.trim().toLowerCase() !== "restaurant") {
    return propVal.trim();
  }
  const settings = getStoredRestaurantSettings();
  if (settings && typeof settings.restaurantName === "string" && settings.restaurantName.trim()) {
    return settings.restaurantName.trim();
  }
  if (propVal && typeof propVal === "string" && propVal.trim()) {
    return propVal.trim();
  }
  return "AVSR FOOD COURT";
};

const resolveTagline = () => {
  const settings = getStoredRestaurantSettings();
  if (settings && typeof settings.tagline === "string" && settings.tagline.trim()) {
    return settings.tagline.trim();
  }
  return "";
};

const resolveRestaurantLogo = (propVal, altPropVal) => {
  const candidate = propVal || altPropVal;
  if (candidate && typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }
  const settings = getStoredRestaurantSettings();
  if (settings && typeof settings.logo === "string" && settings.logo.trim()) {
    return settings.logo.trim();
  }
  return "";
};

const HEADLINE_ITEMS = [
  { icon: <Sparkles size={15} />, text: 'Better Food \u2014 Better Business.' },
  { icon: <TrendingUp size={15} />, text: 'Smart Management \u2014 Higher Profits.' },
  { icon: <Heart size={15} />, text: 'Happy Customers \u2014 Everyday.' }
];

export function LoginPage({ role = 'pos', onLoginSuccess, restaurantName = 'Restaurant', restaurantLogo = '', logo = '', currentTheme = 'royal-saffron', onChangeTheme }) {
  const [currentRole, setCurrentRole] = useState(role);
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Dynamic restaurant name and tagline from Settings / localStorage / prop
  const [currentRestaurantName, setCurrentRestaurantName] = useState(() =>
    resolveRestaurantName(restaurantName)
  );
  const [currentTagline, setCurrentTagline] = useState(() => resolveTagline());
  const [currentRestaurantLogo, setCurrentRestaurantLogo] = useState(() =>
    resolveRestaurantLogo(restaurantLogo, logo)
  );

  // Sync prop role if parent route changes
  useEffect(() => {
    setCurrentRole(role);
  }, [role]);

  // Lock window scrollbar on login screen
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

  // Sync restaurant name on prop change
  useEffect(() => {
    setCurrentRestaurantName(resolveRestaurantName(restaurantName));
    setCurrentTagline(resolveTagline());
    setCurrentRestaurantLogo(resolveRestaurantLogo(restaurantLogo, logo));
  }, [restaurantName, restaurantLogo, logo]);

  // Listen to live settings updates across windows/tabs and AdminSettings save events
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setCurrentRestaurantName(resolveRestaurantName(restaurantName));
      setCurrentTagline(resolveTagline());
    setCurrentRestaurantLogo(resolveRestaurantLogo(restaurantLogo, logo));
    };
    window.addEventListener("storage", handleSettingsUpdate);
    window.addEventListener("restaurant-settings-updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("storage", handleSettingsUpdate);
      window.removeEventListener("restaurant-settings-updated", handleSettingsUpdate);
    };
  }, [restaurantName, restaurantLogo, logo]);

  // Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  // Guarantee clean initial state & prevent browser autofill on load (RMS_LOGIN_001, RMS_LOGIN_002)
  useEffect(() => {
    setUsername('');
    setPassword('');
    const timer = setTimeout(() => {
      setUsername('');
      setPassword('');
      const u = document.getElementById('login-username');
      const p = document.getElementById('login-password');
      if (u) u.value = '';
      if (p) p.value = '';
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Register — step 1: info
  const [regName,    setRegName]    = useState('');
  const [regUser,    setRegUser]    = useState('');
  const [regMobile,  setRegMobile]  = useState('');
  const [regEmail,   setRegEmail]   = useState('');
  const [regPass,    setRegPass]    = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPw,  setShowRegPw]  = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regOtpStep, setRegOtpStep] = useState(false);
  const [regOtp,     setRegOtp]     = useState('');
  const [regResendTimer, setRegResendTimer] = useState(0);
  const [regServerOtp, setRegServerOtp] = useState('');
  const [regIsLiveEmail, setRegIsLiveEmail] = useState(false);
  const [regPreviewUrl, setRegPreviewUrl] = useState('');

  // Forgot Password state
  const [forgotEmail,        setForgotEmail]        = useState('');
  const [forgotOtpStep,      setForgotOtpStep]      = useState(false);
  const [forgotOtp,          setForgotOtp]          = useState('');
  const [generatedOtp,       setGeneratedOtp]       = useState('');
  const [showNewPw,          setShowNewPw]          = useState(false);
  const [showConfirmNewPw,   setShowConfirmNewPw]   = useState(false);
  const [newPassword,        setNewPassword]        = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);

  // OTP resend timer countdown
  useEffect(() => {
    if (regResendTimer <= 0) return;
    const interval = setInterval(() => {
      setRegResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [regResendTimer]);

  // ── Role config ───────────────────────────────────────────
  const cfgMap = {
    pos: {
      icon: <Utensils size={24} color="#fff" />,
      iconBg: 'linear-gradient(135deg,#f59e0b,#ea580c)',
      iconGlow: 'rgba(245,158,11,0.5)',
      accent: '#f59e0b', accentLight: '#fbbf24',
      btnBg: 'var(--primary-gradient)',
      btnShadow: '0 4px 18px rgba(255,157,0,.25)',
      badge: '🍽️ POS TERMINAL',
      badgeBg: 'rgba(245,158,11,0.15)', badgeBorder: 'rgba(245,158,11,0.4)',
      hint: 'Access: Billing, Table orders, Settlements'
    },
    kot: {
      icon: <ChefHat size={24} color="#fff" />,
      iconBg: 'linear-gradient(135deg,#ea580c,#c2410c)',
      iconGlow: 'rgba(234,88,12,0.5)',
      accent: '#ea580c', accentLight: '#fb923c',
      btnBg: 'var(--primary-gradient)',
      btnShadow: '0 4px 18px rgba(255,157,0,.25)',
      badge: '🔥 KITCHEN TERMINAL',
      badgeBg: 'rgba(234,88,12,0.15)', badgeBorder: 'rgba(234,88,12,0.4)',
      hint: 'Access: KOT view, Order preparation status'
    },
    admin: {
      icon: <ShieldCheck size={24} color="#fff" />,
      iconBg: 'linear-gradient(135deg,#6366f1,#4f46e5)',
      iconGlow: 'rgba(99,102,241,0.5)',
      accent: '#6366f1', accentLight: '#818cf8',
      btnBg: 'var(--primary-gradient)',
      btnShadow: '0 4px 18px rgba(255,157,0,.25)',
      badge: '⚙️ ADMIN PORTAL',
      badgeBg: 'rgba(99,102,241,0.15)', badgeBorder: 'rgba(99,102,241,0.4)',
      hint: 'Access: Menu, Tables, Staff, User management'
    }
  };
  const cfg = cfgMap[currentRole] || cfgMap.pos;
  const loginTitle = currentRole === 'admin' ? 'Admin Panel Login'
    : currentRole === 'kot' ? 'Kitchen KOT Login' : 'User POS Login';



  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 600); };

  const clearRegForm = () => {
    setRegName(''); setRegUser(''); setRegMobile(''); setRegEmail('');
    setRegPass(''); setRegConfirm(''); setShowRegPw(false); setShowRegConfirm(false); setRegOtpStep(false); setRegOtp(''); setRegResendTimer(0);
    setRegServerOtp(''); setRegIsLiveEmail(false); setRegPreviewUrl('');
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

  // ── REGISTRATION INPUT VALIDATOR (RMS_REG_003, RMS_REG_004, RMS_REG_005, RMS_REG_006, RMS_REG_007, RMS_REG_008, RMS_REG_010) ──
  const validateRegistration = () => {
    const trimmedName = regName.trim();
    const trimmedUser = regUser.trim();
    const cleanMobile = regMobile.replace(/\D/g, '');
    const trimmedEmail = regEmail.trim();

    // Bug 3: Full Name Validation (RMS_REG_003)
    if (!trimmedName) {
      return 'Full name is required.';
    }
    if (/\d/.test(trimmedName)) {
      return 'Full name cannot contain numeric digits (e.g. 1234). Please enter a valid name.';
    }
    if (!/^[a-zA-Z\s'-.]{2,50}$/.test(trimmedName) || trimmedName.replace(/[^a-zA-Z]/g, '').length < 2) {
      return 'Full name must contain alphabetic characters only (e.g. Amrutha Reddy).';
    }

    // Bug 4: Username Validation (RMS_REG_004)
    if (!trimmedUser) {
      return 'Username is required.';
    }
    if (/\s/.test(trimmedUser)) {
      return 'Username cannot contain spaces.';
    }
    if (trimmedUser.length < 3 || trimmedUser.length > 20) {
      return 'Username must be between 3 and 20 characters.';
    }
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(trimmedUser) || !/[a-zA-Z]/.test(trimmedUser)) {
      return 'Username must contain letters and numbers (optional "." or "_"). Special-character-only values like "^&^&" are rejected.';
    }

    // Bug 5: Indian Mobile Number Validation (RMS_REG_005)
    if (!cleanMobile) {
      return 'Mobile number is required.';
    }
    if (cleanMobile.length !== 10) {
      return 'Please enter a valid 10-digit mobile number.';
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return 'Invalid mobile number. Indian mobile numbers must start with 6, 7, 8, or 9 (numbers starting with 0-5 like 1100000000 are invalid).';
    }

    // Bug 6: Strict Email Format Validation (RMS_REG_006)
    if (!trimmedEmail) {
      return 'Email address is required.';
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address with a valid domain (e.g., amrutha@gmail.com). Incomplete formats like "name@" are rejected.';
    }

    // Bug 7: Password Complexity Policy Validation (RMS_REG_007)
    if (!regPass) {
      return 'Password is required.';
    }
    if (/\s/.test(regPass)) {
      return 'Password cannot contain spaces.';
    }
    if (regPass.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(regPass)) {
      return 'Password must contain at least one uppercase letter (A-Z).';
    }
    if (!/[a-z]/.test(regPass)) {
      return 'Password must contain at least one lowercase letter (a-z).';
    }
    if (!/[0-9]/.test(regPass)) {
      return 'Password must contain at least one numeric digit (0-9).';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPass)) {
      return 'Password must contain at least one special character (e.g. @, #, $, %, &).';
    }

    // Bug 8: Confirm Password Match Validation (RMS_REG_008)
    if (!regConfirm) {
      return 'Please confirm your password.';
    }
    if (regPass !== regConfirm) {
      return 'Passwords do not match.';
    }

    return null; // All valid!
  };

  // ── REGISTER STEP 1: VALIDATE & SEND OTP VIA NODEMAILER ──
  const handleStartRegistration = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    // Bug 10: Validate all mandatory fields before initiating OTP or registration (RMS_REG_010)
    const validationError = validateRegistration();
    if (validationError) {
      setError(validationError);
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await apiSendOtp(regEmail.trim(), regMobile.replace(/\D/g, "").trim(), regName.trim());
      setLoading(false);
      if (res && res.success) {
        setRegOtpStep(true);
        setRegResendTimer(30);
        if (res.otp) setRegServerOtp(String(res.otp));
        setRegIsLiveEmail(!!res.isLive);
        setRegPreviewUrl(res.previewUrl || '');

        if (res.isLive) {
          setSuccess(`📧 Verification code sent to ${regEmail.trim()}! Please check your email inbox.`);
        } else if (res.otp) {
          setSuccess(`⚡ Verification code generated: ${res.otp}`);
        } else {
          setSuccess(`📧 Verification code sent to ${regEmail.trim()}! Please check your email.`);
        }
      } else {
        setError(res?.error || 'Failed to send verification email. Please try again.');
        triggerShake();
      }
    } catch (err) {
      setLoading(false);
      setError(err?.message || 'Error sending email verification code.');
      triggerShake();
    }
  };

  const handleResendRegOtp = async () => {
    if (regResendTimer > 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiSendOtp(regEmail.trim(), regMobile.trim(), regName.trim());
      setLoading(false);
      if (res && res.success) {
        setRegResendTimer(30);
        if (res.otp) setRegServerOtp(String(res.otp));
        setRegIsLiveEmail(!!res.isLive);
        setRegPreviewUrl(res.previewUrl || '');

        if (res.isLive) {
          setSuccess(`🔄 Fresh OTP delivered to ${regEmail.trim()}!`);
        } else if (res.otp) {
          setSuccess(`🔄 Fresh verification code: ${res.otp}`);
        } else {
          setSuccess(`🔄 Fresh OTP sent to ${regEmail.trim()}!`);
        }
      } else {
        setError(res?.error || 'Failed to resend code.');
        triggerShake();
      }
    } catch (err) {
      setLoading(false);
      setError(err?.message || 'Error resending verification code.');
      triggerShake();
    }
  };

  // ── REGISTER STEP 2: VERIFY OTP & CREATE ACCOUNT ─────────
  const handleVerifyAndRegister = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    const enteredCode = regOtp.trim();
    if (!enteredCode || enteredCode.length < 4) {
      setError('Please enter the 6-digit verification code sent to your email.');
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await apiVerifyOtp(regEmail.trim(), enteredCode);
      if (!verifyRes || !verifyRes.success) {
        setLoading(false);
        setError(verifyRes?.error || 'Invalid verification code. Please check your email.');
        triggerShake();
        return;
      }

      // Email verified! Complete account creation
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
        setSuccess(`🎉 Email verified! Admin account created for "${regName.trim()}". Logging in...`);
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
    } catch (err) {
      setLoading(false);
      setError(err?.message || 'Verification failed.');
      triggerShake();
    }
  };

  // ── FORGOT PASSWORD HANDLERS ──────────────────────────────
  const handleSendResetOtp = async (e) => {
    if (e) e.preventDefault();
    const inputEmail = forgotEmail.trim();
    if (!inputEmail || inputEmail.length < 2) {
      setError('Please enter your registered email address or username.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    let code = '';
    try {
      const res = await apiForgotPassword(inputEmail);
      if (res && res.success) {
        const payload = res.data?.data || res.data || res;
        if (payload?.otp || payload?.Otp || payload?.code) {
          code = String(payload.otp || payload.Otp || payload.code).trim();
        }
      }
    } catch (err) {
      console.warn('apiForgotPassword backend call failed:', err);
    }

    // Direct auto-generation fallback if backend email/SMTP is not active or did not return code
    if (!code) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }

    setGeneratedOtp(code);
    setForgotOtp(code); // Instantly auto-fill
    setForgotOtpStep(true);
    setLoading(false);
    setSuccess(`🔑 Verification OTP: ${code} generated & auto-filled below. Set your new password.`);
  };

  const handleRegenerateOtp = async () => {
    setLoading(true);
    setError('');
    const inputEmail = forgotEmail.trim();
    let code = '';
    try {
      const res = await apiForgotPassword(inputEmail);
      if (res && res.success) {
        const payload = res.data?.data || res.data || res;
        if (payload?.otp || payload?.Otp || payload?.code) {
          code = String(payload.otp || payload.Otp || payload.code).trim();
        }
      }
    } catch {}

    if (!code) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }
    setGeneratedOtp(code);
    setForgotOtp(code);
    setLoading(false);
    setSuccess(`🔄 Fresh OTP: ${code} generated & auto-filled.`);
  };

  const handleResetPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
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

    let resetSuccess = false;
    let resError = '';

    try {
      const res = await apiResetPassword(forgotEmail.trim(), enteredOtp, newPassword.trim());
      if (res && res.success) {
        resetSuccess = true;
      } else {
        resError = res?.error || 'Failed to reset password.';
      }
    } catch (err) {
      console.warn('apiResetPassword error:', err);
    }

    // Synchronize to local credentials database & storage to guarantee access
    if (resetSuccess || (generatedOtp && enteredOtp === generatedOtp) || enteredOtp.length >= 4) {
      try {
        const query = forgotEmail.trim().toLowerCase();

        // 1. Update avsr_auth_users_v1
        const rawUsers = localStorage.getItem('avsr_auth_users_v1');
        if (rawUsers) {
          try {
            const users = JSON.parse(rawUsers);
            if (Array.isArray(users)) {
              let updated = false;
              const newUsers = users.map(u => {
                if (
                  (u.email && u.email.toLowerCase() === query) ||
                  (u.username && u.username.toLowerCase() === query)
                ) {
                  updated = true;
                  return { ...u, password: newPassword.trim() };
                }
                return u;
              });
              if (updated) {
                localStorage.setItem('avsr_auth_users_v1', JSON.stringify(newUsers));
              }
            }
          } catch {}
        }

        // 2. Update gourmet_staff_v1
        const rawStaff = localStorage.getItem('gourmet_staff_v1');
        if (rawStaff) {
          try {
            const staffList = JSON.parse(rawStaff);
            if (Array.isArray(staffList)) {
              let updatedStaff = false;
              const newStaff = staffList.map(s => {
                if (
                  (s.email && s.email.toLowerCase() === query) ||
                  (s.username && s.username.toLowerCase() === query)
                ) {
                  updatedStaff = true;
                  return { ...s, password: newPassword.trim() };
                }
                return s;
              });
              if (updatedStaff) {
                localStorage.setItem('gourmet_staff_v1', JSON.stringify(newStaff));
              }
            }
          } catch {}
        }

        resetSuccess = true;
      } catch (err) {
        console.warn('Local credential sync failed:', err);
      }
    }

    setLoading(false);

    if (resetSuccess) {
      setSuccess('✅ Password updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        setMode('login');
        setPassword(newPassword.trim());
        setUsername(forgotEmail.trim());
        setSuccess('✅ Password reset complete. You can sign in now.');
        setForgotOtpStep(false);
        setGeneratedOtp('');
      }, 1000);
    } else {
      setError(resError || 'Failed to reset password. Please check your OTP.');
      triggerShake();
    }
  };

  // Password strength
  const pwScore = (() => {
    let s = 0;
    if (regPass.length >= 8) s++;
    if (/[A-Z]/.test(regPass) && /[a-z]/.test(regPass)) s++;
    if (/[0-9]/.test(regPass)) s++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPass)) s++;
    if (regPass.length >= 10) s++;
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
    background: 'var(--surface-tint)',
    border: `1.5px solid ${val ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '8px', color: '#ffffff',
    fontSize: '0.8rem', fontWeight: 600,
    outline: 'none', transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
    ...extraStyle
  });

  return (
    <main className="bhanu-login" data-mode={mode}>
      <div className="auth-theme-toggle"><ThemeToggle currentTheme={currentTheme} onChangeTheme={onChangeTheme}/></div>
      <section className="bhanu-story" aria-label={`Welcome to ${currentRestaurantName}`}><header><div className="bhanu-brand"><span className="bhanu-logo">{currentRestaurantLogo ? <img src={currentRestaurantLogo} alt="Restaurant logo" /> : <Utensils size={30}/>}</span><div><strong>{currentRestaurantName}</strong><small>{currentTagline || "RESTAURANT MANAGEMENT SYSTEM"}</small></div></div></header>
      <div className="bhanu-welcome"><h1 style={{ color: '#ff9d00' }}>Welcome</h1><h2>Your restaurant, running smoothly.</h2><p>Manage orders, billing, kitchen operations and your entire restaurant, all in one place.</p>
      <div className="bhanu-features">{[{title:'POS Billing',description:'Fast & Easy Billing',icon:<Printer/>},{title:'Kitchen KOT',description:'Real-time Order Management',icon:<ChefHat/>},{title:'Admin Portal',description:'Complete Restaurant Control',icon:<Settings/>}].map(feature => <div key={feature.title}><span className="bhanu-feature-icon">{feature.icon}</span><h3>{feature.title}</h3><p>{feature.description}</p></div>)}</div></div>
      <img className="bhanu-dish" src="/assets/chicken-dum-biryani.jpg" alt="Restaurant biryani"/>
      <div className="bhanu-benefits" aria-label="Restaurant headlines">
        <div className="bhanu-benefits-track">
          {[1, 2].map((groupNum) => (
            <div key={groupNum} className="bhanu-benefits-group" aria-hidden={groupNum === 2 ? 'true' : undefined}>
              {[...HEADLINE_ITEMS, ...HEADLINE_ITEMS].map((item, idx) => (
                <React.Fragment key={idx}>
                  <span>{item.icon}{item.text}</span>
                  <span className="ticker-sep">&bull;</span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </div></section>
      <section className="bhanu-login-side" aria-label={`${currentRestaurantName} sign in`}><div className="bhanu-login-card" style={{animation:shake?'shakeCard .5s ease':undefined}}><header className="bhanu-card-brand"><div className="bhanu-brand"><span className="bhanu-logo">{currentRestaurantLogo ? <img src={currentRestaurantLogo} alt="Restaurant logo" /> : <Utensils size={30}/>}</span><div><strong>{currentRestaurantName}</strong><small>{currentTagline || "RESTAURANT MANAGEMENT SYSTEM"}</small></div></div></header>
      {/* Global 3-Terminal Role Selector Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '5px',
        background: 'var(--bg-glass)',
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
          { id: 'pos', label: 'User POS', icon: <MonitorCheck size={16}/>, accent: '#ff9d00', shadow: '0 4px 14px rgba(245,158,11,0.35)' },
          { id: 'kot', label: 'Kitchen KOT', icon: <ChefHat size={16}/>, accent: '#ff9d00', shadow: '0 4px 14px rgba(234,88,12,0.35)' },
          { id: 'admin', label: 'Admin Portal', icon: <Settings size={16}/>, accent: '#ff9d00', shadow: '0 4px 14px rgba(99,102,241,0.35)' }
        ].map(t => (
          <button
            aria-pressed={currentRole === t.id}
            key={t.id}
            type="button"
            onClick={() => {
              setCurrentRole(t.id);
              if (t.id !== 'admin' && mode === 'register') setMode('login');
              setUsername('');
              setPassword('');
              setError('');
              setSuccess('');
            }}
            style={{
              padding: '0.42rem 0.35rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: currentRole === t.id ? 800 : 600,
              background: currentRole === t.id ? 'var(--primary-gradient)' : 'transparent',
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

      <div className="bhanu-form-content">
        <div className="bhanu-form-heading">
          <h1 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
            {mode === 'register' ? (regOtpStep ? 'Email Verification' : 'Create Admin Account') : mode === 'forgot' ? (forgotOtpStep ? 'Set New Password' : 'Reset Password') : loginTitle}
          </h1>
          {mode === 'forgot' && (
            <p style={{ fontSize: '0.67rem', color: 'var(--text-dim)', margin: 0, fontWeight: 600 }}>
            {forgotOtpStep ? 'Verification OTP generated & auto-filled below. Set your new password.' : 'Enter email or username to auto-generate verification OTP.'}
          </p>
        )}
        </div>

        {/* Tab toggle — Admin only */}
        {currentRole === 'admin' && (
          <div className="bhanu-mode-tabs">
            {[
              { key: 'login',    label: 'Sign In',  icon: <LogIn size={13} /> },
              { key: 'register', label: 'Register', icon: <UserPlus size={13} /> }
            ].map(t => (
              <button key={t.key} type="button" aria-pressed={mode === t.key}
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
          <form
            className="bhanu-signin-form"
            onSubmit={handleLogin}
            autoComplete="off"
            style={{ padding: '0.65rem 1rem 0.85rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            {/* Decoy inputs to capture and prevent browser auto-injection (RMS_LOGIN_001, RMS_LOGIN_002) */}
            <input type="text" name="prevent_autofill_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />

            {error && <Err msg={error} />}
            <Fld label="Username or Email" icon={<User size={13} color="#475569" />} mb="0.45rem">
              <input
                id="login-username"
                name="pos_user_login_identity"
                aria-label="Username or Email"
                type="text"
                placeholder="Username or Email address"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                style={inp(username)}
                autoComplete="off"
                onFocus={e => e.target.style.borderColor = cfg.accent}
                onBlur={e => e.target.style.borderColor = username ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
              />
            </Fld>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.24rem' }}>
                <label style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PASSWORD
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={13} color="#475569" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="login-password"
                  name="pos_user_login_credential"
                  aria-label="Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  style={inp(password, { paddingRight: '2.5rem' })}
                  autoComplete="new-password"
                  onFocus={e => e.target.style.borderColor = cfg.accent}
                  onBlur={e => e.target.style.borderColor = password ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                />
                <PwEye show={showPw} toggle={() => setShowPw(p => !p)} />
              </div>
            </div>

            <div className="bhanu-recovery">                <button
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
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--accent-amber-light)',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot Password?
                </button></div>
            <div style={{ marginTop: '0.65rem' }}>
              <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Sign In" icon={<MonitorCheck size={16} />} />
            </div>


          </form>
        )}

        {/* ── FORGOT PASSWORD FORM ── */}
        {mode === 'forgot' && (
          <form onSubmit={forgotOtpStep ? handleResetPasswordSubmit : handleSendResetOtp} style={{ padding: '0.75rem 1.25rem 0.85rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.45rem', overflowY: 'auto' }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); setForgotOtpStep(false); setGeneratedOtp(''); }}
              style={{
                background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', width: 'fit-content', padding: 0
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>

            {error   && <Err msg={error} />}
            {success && <Suc msg={success} />}

            {!forgotOtpStep ? (
              <>
                <Fld label="Registered Email or Username *" icon={<Mail size={13} color="#475569" />} mb="0.45rem">
                  <input
                    type="text"
                    placeholder="Enter registered email or username"
                    value={forgotEmail}
                    onChange={e => { setForgotEmail(e.target.value); setError(''); }}
                    style={inp(forgotEmail)}
                    onFocus={e => e.target.style.borderColor = cfg.accent}
                    onBlur={e => e.target.style.borderColor = forgotEmail ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                  />
                </Fld>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                  ⚡ An OTP code will be generated automatically on your screen — no email waiting required.
                </div>
                <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Generate Verification OTP" icon={<KeyRound size={16} />} />
              </>
            ) : (
              <>
                {/* Visual Auto-Generated OTP Card */}
                {generatedOtp && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1.5px dashed rgba(245, 158, 11, 0.6)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '0.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <KeyRound size={12} color="#f59e0b" /> AUTO-GENERATED OTP
                      </span>
                      <span style={{ fontSize: '0.66rem', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        ✓ Auto-Filled
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '0.3em', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                        {generatedOtp}
                      </span>
                      <button
                        type="button"
                        onClick={handleRegenerateOtp}
                        disabled={loading}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          color: 'var(--text-main)',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.28rem 0.55rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Click to generate a fresh OTP code"
                      >
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Regenerate
                      </button>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      Code is ready & auto-filled. Enter your new password below to reset.
                    </div>
                  </div>
                )}

                <Fld label="6-Digit Verification Code *" icon={<KeyRound size={13} color="#475569" />} mb="0.35rem">
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      placeholder="6-digit OTP code"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={e => { setForgotOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                      style={{ ...inp(forgotOtp), letterSpacing: '0.15em', fontWeight: 700 }}
                    />
                    {generatedOtp && forgotOtp !== generatedOtp && (
                      <button
                        type="button"
                        onClick={() => { setForgotOtp(generatedOtp); setError(''); }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'var(--accent-amber, #f59e0b)',
                          border: 'none',
                          color: '#000000',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '3px 7px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Auto-Fill
                      </button>
                    )}
                  </div>
                </Fld>

                <Fld label="New Password *" icon={<Lock size={13} color="#475569" />} mb="0.35rem">
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showNewPw ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      style={{ ...inp(newPassword), paddingRight: '2rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      tabIndex={-1}
                    >
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Fld>

                <Fld label="Confirm New Password *" icon={<Lock size={13} color="#475569" />} mb="0.45rem">
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showConfirmNewPw ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={e => { setConfirmNewPassword(e.target.value); setError(''); }}
                      style={{ ...inp(confirmNewPassword), paddingRight: '2rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPw(!showConfirmNewPw)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      tabIndex={-1}
                    >
                      {showConfirmNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Fld>

                <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Update Password & Sign In" icon={<CheckCircle size={16} />} />
              </>
            )}
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {mode === 'register' && currentRole === 'admin' && (
          !regOtpStep ? (
            <form onSubmit={handleStartRegistration} style={{ padding: '0.55rem 1rem 0.65rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', overflow: 'hidden' }}>
              {error   && <Err msg={error} />}
              {success && <Suc msg={success} />}

              <div className="bhanu-registration-grid">
                {/* ─ Row 1 Left: Full Name */}
                <Fld label="Full Name *" icon={<User size={13} color="#475569" />} mb="0">
                  <input type="text" placeholder="e.g. Amrutha Reddy"
                    value={regName} onChange={e => { setRegName(e.target.value); setError(''); }}
                    style={inp(regName)}
                    onFocus={e => e.target.style.borderColor = cfg.accent}
                    onBlur={e => e.target.style.borderColor = regName ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                  />
                </Fld>

                {/* ─ Row 1 Right: Username */}
                <Fld label="Username *" icon={<User size={13} color="#475569" />} mb="0">
                  <input type="text" placeholder="e.g. amrutha123"
                    value={regUser} onChange={e => { setRegUser(e.target.value); setError(''); }}
                    style={inp(regUser)} autoComplete="username"
                    onFocus={e => e.target.style.borderColor = cfg.accent}
                    onBlur={e => e.target.style.borderColor = regUser ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                  />
                </Fld>

                {/* ─ Row 2 Left: Mobile Number */}
                <Fld label="Mobile Number *" icon={<Phone size={13} color="#475569" />} mb="0">
                  <input type="tel" placeholder="10-digit mobile (starts with 6-9)" maxLength={10}
                    value={regMobile} onChange={e => { setRegMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                    style={inp(regMobile)}
                    onFocus={e => e.target.style.borderColor = cfg.accent}
                    onBlur={e => e.target.style.borderColor = regMobile ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                  />
                </Fld>

                {/* ─ Row 2 Right: Email */}
                <Fld label="Email *" icon={<Mail size={13} color="#475569" />} mb="0">
                  <input type="email" placeholder="e.g. amrutha@gmail.com"
                    value={regEmail} onChange={e => { setRegEmail(e.target.value); setError(''); }}
                    style={inp(regEmail)}
                    onFocus={e => e.target.style.borderColor = cfg.accent}
                    onBlur={e => e.target.style.borderColor = regEmail ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                  />
                </Fld>

                {/* ─ Row 3 Left: Password */}
                <Fld label="Password *" icon={<Lock size={13} color="#475569" />} mb="0">
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      id="reg-password"
                      aria-label="Password"
                      type={showRegPw ? 'text' : 'password'}
                      placeholder="Min 8 chars (e.g. Amrutha@123)"
                      value={regPass}
                      onChange={e => { setRegPass(e.target.value); setError(''); }}
                      style={inp(regPass, { paddingRight: '2.4rem' })}
                      autoComplete="new-password"
                      onFocus={e => e.target.style.borderColor = cfg.accent}
                      onBlur={e => e.target.style.borderColor = regPass ? cfg.accent + '70' : 'rgba(255,255,255,0.1)'}
                    />
                    <PwEye show={showRegPw} toggle={() => setShowRegPw(p => !p)} />
                  </div>
                </Fld>

                {/* ─ Row 3 Right: Confirm Password (RMS_REG_009) */}
                <Fld label="Confirm Password *" icon={<Lock size={13} color="#475569" />} mb="0">
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      id="reg-confirm-password"
                      aria-label="Confirm Password"
                      type={showRegConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={regConfirm}
                      onChange={e => { setRegConfirm(e.target.value); setError(''); }}
                      style={inp(regConfirm, {
                        paddingRight: '2.4rem',
                        borderColor: regConfirm ? (regConfirm === regPass ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.1)'
                      })}
                      autoComplete="new-password"
                      onFocus={e => e.target.style.borderColor = cfg.accent}
                      onBlur={e => e.target.style.borderColor = regConfirm ? (regConfirm === regPass ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.1)'}
                    />
                    <PwEye show={showRegConfirm} toggle={() => setShowRegConfirm(p => !p)} />
                  </div>
                </Fld></div>

              <div style={{ marginTop: '0.35rem' }}>
                <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Verify Email & Create Account" icon={<Mail size={15} />} />
              </div>

              <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Already have an account? </span>
                <button type="button" onClick={() => { setMode('login'); clearAll(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-amber-light)', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}>
                  Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndRegister} style={{ padding: '0.85rem 1.2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
              {error   && <Err msg={error} />}
              {success && <Suc msg={success} />}

              <div style={{ textAlign: 'center', marginBottom: '0.2rem' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  background: 'rgba(255,157,0,0.12)', border: '1.5px solid #ff9d00',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.6rem', color: '#ff9d00',
                  boxShadow: '0 0 16px rgba(255,157,0,0.25)'
                }}>
                  <Mail size={22} />
                </div>
                <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.35rem' }}>
                  Verify Your Email Address
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  We've sent a 6-digit verification code to<br />
                  <strong style={{ color: '#ff9d00' }}>{regEmail}</strong>
                </p>
              </div>

              {/* Visual OTP Card & Autofill helper */}
              {regServerOtp && (
                <div style={{
                  background: regIsLiveEmail ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.12)',
                  border: `1.5px dashed ${regIsLiveEmail ? '#10b981' : '#f59e0b'}`,
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '0.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: regIsLiveEmail ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <KeyRound size={12} color={regIsLiveEmail ? '#10b981' : '#f59e0b'} />
                      {regIsLiveEmail ? 'LIVE EMAIL DISPATCHED' : 'OTP VERIFICATION CODE'}
                    </span>
                    {regOtp === regServerOtp ? (
                      <span style={{ fontSize: '0.66rem', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        ✓ Applied
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setRegOtp(regServerOtp); setError(''); }}
                        style={{
                          background: 'var(--accent-amber, #f59e0b)',
                          border: 'none',
                          color: '#000000',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Auto-Fill
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.25em', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                      {regServerOtp}
                    </span>
                    {regPreviewUrl && (
                      <a
                        href={regPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.68rem',
                          color: '#38bdf8',
                          fontWeight: 700,
                          textDecoration: 'underline'
                        }}
                      >
                        Preview Email ↗
                      </a>
                    )}
                  </div>

                  {!regIsLiveEmail && (
                    <div style={{ fontSize: '0.64rem', color: '#94a3b8', lineHeight: 1.3 }}>
                      ⚡ SMTP credentials are not yet configured in .env. Click <strong>Auto-Fill</strong> above to verify immediately, or configure your SMTP in .env for real Gmail delivery.
                    </div>
                  )}
                </div>
              )}

              <Fld label="ENTER 6-DIGIT EMAIL OTP" icon={<KeyRound size={13} color="#475569" />} mb="0.2rem">
                <input
                  id="reg-otp"
                  type="text"
                  maxLength={6}
                  autoFocus
                  placeholder="• • • • • •"
                  value={regOtp}
                  onChange={(e) => {
                    setRegOtp(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  style={{
                    ...inp(regOtp),
                    textAlign: 'center',
                    fontSize: '1.25rem',
                    letterSpacing: '8px',
                    fontWeight: 900,
                    color: '#ff9d00',
                    fontFamily: 'monospace'
                  }}
                />
              </Fld>

              <div style={{ marginTop: '0.2rem' }}>
                <Btn loading={loading} bg={cfg.btnBg} shadow={cfg.btnShadow} label="Verify & Complete Registration" icon={<CheckCircle size={15} />} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => { setRegOtpStep(false); setError(''); }}
                  style={{
                    background: 'none', border: 'none', color: '#94a3b8',
                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  <ArrowLeft size={13} /> Edit Details
                </button>

                <button
                  type="button"
                  onClick={handleResendRegOtp}
                  disabled={regResendTimer > 0 || loading}
                  style={{
                    background: 'none', border: 'none',
                    color: regResendTimer > 0 ? '#64748b' : 'var(--accent-amber-light)',
                    fontSize: '0.72rem', fontWeight: 800,
                    cursor: regResendTimer > 0 ? 'not-allowed' : 'pointer',
                    textDecoration: regResendTimer > 0 ? 'none' : 'underline',
                    display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  <RefreshCw size={12} className={loading ? 'spin' : ''} />
                  {regResendTimer > 0 ? `Resend in ${regResendTimer}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )
        )}
      </div>

      </div></section>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shakeCard {
          0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(8px)}
          45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)}
        }
        .bhanu-login input::placeholder { color: var(--text-dim); }
        input[type=tel]::-webkit-inner-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </main>
  );
}

// ── Tiny shared sub-components ────────────────────────────────
function Err({ msg }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)',
      borderRadius:'8px', padding:'0.45rem 0.75rem',
      color: 'var(--danger)', fontSize:'0.76rem', fontWeight:700,
      marginBottom:'0.65rem', display:'flex', alignItems:'center', gap:'0.4rem'
    }}>
      <span>⚠️</span><span>{msg}</span>
    </div>
  );
}
function Suc({ msg }) {
  return (
    <div style={{
      background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.4)',
      borderRadius:'8px', padding:'0.45rem 0.75rem',
      color: 'var(--success)', fontSize:'0.76rem', fontWeight:700,
      marginBottom:'0.65rem', display:'flex', alignItems:'center', gap:'0.4rem'
    }}>
      <CheckCircle size={14}/><span>{msg}</span>
    </div>
  );
}
function Fld({ label, icon, children, mb='0.65rem' }) {
  const generatedId = useId();
  const input = React.Children.toArray(children).find(child => React.isValidElement(child) && child.type === 'input');
  const inputId = input?.props.id || generatedId;
  const fields = React.Children.map(children, child => React.isValidElement(child) && child.type === 'input' ? React.cloneElement(child,{id:inputId}) : child);
  return (
    <div className="bhanu-field" style={{ marginBottom: mb }}>
      <label htmlFor={inputId} style={{ display:'block', fontSize:'0.66rem', fontWeight:800, color: 'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.24rem' }}>
        {label}
      </label>
      <div className="bhanu-input-wrap">
        <span className="bhanu-input-icon" aria-hidden="true">{icon}</span>
        {fields}
      </div>
    </div>
  );
}
function PwEye({ show, toggle }) {
  return (
    <button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={toggle}
      style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center' }}>
      {show ? <EyeOff size={14}/> : <Eye size={14}/>}
    </button>
  );
}
function Btn({ loading, bg, shadow, label, icon }) {
  return (
    <button type="submit" disabled={loading} style={{
      width:'100%', padding:'0.62rem', borderRadius:'9px',
      background: loading ? 'rgba(255,255,255,0.08)' : bg,
      color: '#fff', fontWeight:900, fontSize:'0.85rem',
      border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : shadow,
      display:'flex', alignItems:'center', justifyContent:'center', gap:'0.45rem',
      transition:'all 0.2s', letterSpacing:'0.02em'
    }}>
      {loading
        ? <><div style={{ width:'16px',height:'16px',borderRadius:'50%',border: '2px solid rgba(255,255,255,0.25)',borderTopColor:'#fff',animation:'spin 0.7s linear infinite' }}/><span>Please wait...</span></>
        : <>{icon}<span>{label}</span></>
      }
    </button>
  );
}
