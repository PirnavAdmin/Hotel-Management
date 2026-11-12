import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowRight,
  LogIn,
  UserPlus,
  CheckCircle2,
  Send,
  RefreshCw,
  ChefHat,
  ArrowLeft,
  X,
  Check,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import "./CustomerAuthFlow.css";
import { apiCustomerForgotPassword, apiCustomerLogin, apiCustomerRegister, apiCustomerResendOtp, apiCustomerResetPassword, apiCustomerVerifyOtp } from "../api/customerAuthApi";

/**
 * CustomerAuthFlow - customer authentication screens backed by the customer auth API
 * Screens:
 * 1. Login (Customer)
 * 2. Create Account
 * 3. OTP Verification
 * 4. Forgot Password
 * 5. Reset Password
 * 6. Login Success
 */
export function CustomerAuthFlow({
  onLoginSuccess,
  onBackToHome,
  intendedDestination = "home",
  restaurantName = "Bhanu Bistro",
  restaurantLogo = "",
}) {
  // Current screen: "login" | "register" | "otp" | "forgot" | "reset" | "success"
  const [activeStep, setActiveStep] = useState("login");

  // Destination friendly label
  const getDestinationLabel = () => {
    if (intendedDestination === "menu" || intendedDestination === "takeaway") return "Takeaway Menu";
    if (intendedDestination === "reservation" || intendedDestination === "table") return "Table Reservation";
    if (intendedDestination === "cart") return "Your Cart";
    if (intendedDestination === "checkout") return "Checkout";
    return "Home";
  };

  // ── Screen 1: Login Form State ──────────────────────────────────────────
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState("");

  // ── Screen 2: Registration Form State ───────────────────────────────────
  const [regFullName, setRegFullName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState("");

  // ── Screen 3: OTP State ─────────────────────────────────────────────────
  const [otpPurpose, setOtpPurpose] = useState("ACCOUNT_VERIFY");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(30);
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const otpInputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // ── Screen 4: Forgot Password State ─────────────────────────────────────
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotSentMessage, setForgotSentMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  // ── Screen 5: Reset Password State ──────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");
  const [resetError, setResetError] = useState("");

  // ── Active Authenticated User Profile ───────────────────────────────────
  const [currentUserData, setCurrentUserData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const registerInFlightRef = useRef(false);

  // Countdown for OTP resend
  useEffect(() => {
    if (activeStep !== "otp") return;
    if (resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStep, resendTimer]);

  // Screen 6 Auto-redirect timer
  useEffect(() => {
    if (activeStep !== "success") return;

    const timer = setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess(currentUserData, intendedDestination);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeStep, currentUserData, intendedDestination, onLoginSuccess]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  // Screen 1: Submit Login (Existing/already registered user - Direct Login without OTP!)
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoginError("");

    if (!loginIdentifier.trim()) {
      setLoginError("Please enter your email or mobile number.");
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError("Please enter your password.");
      return;
    }

    setBusy(true);
    const result = await apiCustomerLogin(loginIdentifier.trim(), loginPassword, rememberMe);
    setBusy(false);
    if (!result.success) return setLoginError(result.error || "Unable to sign in. Please try again.");
    const payload = result.data?.data || result.data;
    const userData = payload?.user || payload?.customer || {};
    const token = payload?.accessToken || payload?.token || payload?.jwt;
    if (!token) return setLoginError("The server response did not include an access token.");
    setCurrentUserData({
      name: userData.fullName || userData.name || userData.customerName || loginIdentifier.trim(),
      email: userData.email || (loginIdentifier.includes("@") ? loginIdentifier.trim() : ""),
      phone: userData.mobile || userData.phone || (!loginIdentifier.includes("@") ? loginIdentifier.trim() : ""),
      token,
      refreshToken: payload?.refreshToken || "",
      rememberMe,
    });
    setActiveStep("success");
  };

  // Screen 2: Submit Register (New user signup - Generates dynamic auto-increment OTP!)
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (registerInFlightRef.current) return;
    setRegError("");

    if (!regFullName.trim()) {
      setRegError("Please enter your full name.");
      return;
    }
    if (!regMobile.trim() && !regEmail.trim()) {
      setRegError("Please enter an email address or mobile number.");
      return;
    }
    if (!regPassword.trim()) {
      setRegError("Please enter a password.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match. Please verify.");
      return;
    }

    registerInFlightRef.current = true;
    setBusy(true);
    let result;
    try {
      result = await apiCustomerRegister({
        fullName: regFullName.trim(),
        mobile: regMobile.trim(),
        email: regEmail.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });
    } catch (error) {
      setRegError(error?.message || "Unable to create the account. Please try again.");
      return;
    } finally {
      registerInFlightRef.current = false;
      setBusy(false);
    }
    if (!result?.success) {
      const apiError = result?.error;
      const isGenericConflict = result?.status === 409 && (!apiError || /^HTTP Error 409$|^Conflict$/i.test(apiError));
      setRegError(result?.status === 409
        ? (isGenericConflict
          ? "An account with this email address or mobile number may already exist. Sign in or use different contact details."
          : apiError)
        : apiError || "Unable to create the account.");
      return;
    }
    const response = result.data?.data || result.data;
    setCurrentUserData({ name: regFullName.trim(), phone: regMobile.trim(), email: regEmail.trim() });
    setOtpPurpose("ACCOUNT_VERIFY");
    setOtpDigits(["", "", "", "", "", ""]);
    setResendTimer(30);
    setOtpError("");
    setOtpMessage(response?.message || "Registration was accepted. Check your inbox and Spam/Junk folder; if the code does not arrive, use Resend OTP after the cooldown.");
    setActiveStep("otp");
  };

  // Screen 3: OTP Input Handling
  const handleOtpChange = (index, value) => {
    const val = value.slice(-1); // Only take latest char
    const newOtp = [...otpDigits];
    newOtp[index] = val;
    setOtpDigits(newOtp);

    // Auto-advance to next input if digit entered
    if (val && index < 5 && otpInputRefs[index + 1].current) {
      otpInputRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      if (otpInputRefs[index - 1].current) {
        otpInputRefs[index - 1].current.focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtpDigits(newOtp);
    if (otpInputRefs[Math.min(pasted.length, 5)].current) {
      otpInputRefs[Math.min(pasted.length, 5)].current.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError("");
    const code = otpDigits.join("");
    if (code.length < 6) {
      setOtpError("Please enter the complete 6-digit OTP.");
      return;
    }

    setBusy(true);
    const identifier = currentUserData.email || currentUserData.phone;
    const result = await apiCustomerVerifyOtp(identifier, code, otpPurpose);
    setBusy(false);
    if (!result.success) return setOtpError(result.error || "OTP verification failed.");
    const payload = result.data?.data || result.data;
    if (otpPurpose === "PASSWORD_RESET") {
      if (!payload?.resetToken) return setOtpError("The server response did not include a reset token.");
      setResetToken(payload.resetToken);
      setActiveStep("reset");
      return;
    }
    const token = payload?.accessToken || payload?.token || payload?.jwt;
    if (!token) return setOtpError("The server response did not include an access token.");
    setCurrentUserData((user) => ({ ...user, token, refreshToken: payload?.refreshToken || "" }));
    setActiveStep("success");
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setBusy(true);
    const result = await apiCustomerResendOtp(currentUserData.email || currentUserData.phone, otpPurpose);
    setBusy(false);
    if (!result.success) {
      if (result.status === 429) setResendTimer(result.retryAfterSeconds ?? 30);
      return setOtpError(result.error || "Unable to resend the OTP.");
    }
    const response = result.data?.data || result.data;
    setOtpDigits(["", "", "", "", "", ""]);
    setResendTimer(30);
    setOtpError("");
    setOtpMessage(response?.message || "OTP resend request was accepted. Check your inbox and Spam/Junk folder.");
  };

  // Screen 4: Send Reset Link
  const handleForgotSubmit = async (e) => {
    if (e) e.preventDefault();
    setForgotError("");
    if (!forgotIdentifier.trim()) {
      setForgotError("Please enter your registered email or mobile number.");
      return;
    }

    setBusy(true);
    const result = await apiCustomerForgotPassword(forgotIdentifier.trim());
    setBusy(false);
    if (!result.success) return setForgotError(result.error || "Unable to start password recovery.");
    setCurrentUserData({ name: "", phone: forgotIdentifier.trim(), email: forgotIdentifier.trim() });
    setForgotSentMessage("If an account matches those details, a verification code has been sent.");
    setOtpPurpose("PASSWORD_RESET");
    setOtpDigits(["", "", "", "", "", ""]);
    setResendTimer(30);
    setOtpMessage(result.data?.data?.message || result.data?.message || "If an account matches those details, a verification code was requested. Check your inbox and Spam/Junk folder.");
    setActiveStep("otp");
  };

  // Screen 5: Submit New Password
  const handleResetSubmit = async (e) => {
    if (e) e.preventDefault();
    setResetError("");
    if (!newPassword.trim()) {
      setResetError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const result = await apiCustomerResetPassword(resetToken
      ? { resetToken, newPassword, confirmPassword: confirmNewPassword }
      : { emailOrMobile: currentUserData.email || currentUserData.phone, otp: otpDigits.join(""), newPassword, confirmPassword: confirmNewPassword });
    setBusy(false);
    if (!result.success) return setResetError(result.error || "Unable to reset the password.");
    setResetSuccessMessage("Password reset successfully. You can now sign in.");
    setResetToken("");
    setTimeout(() => {
      setResetSuccessMessage("");
      setActiveStep("login");
    }, 1200);
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="customer-auth-page">
      <div className="customer-auth-backdrop" />

      <div className="customer-auth-container">
        {/* ── Top Header Navigation ────────────────────────────────────── */}
        <header className="customer-auth-topbar">
          <div className="customer-auth-brand" onClick={onBackToHome}>
            <div className="customer-auth-brand-logo">
              {restaurantLogo ? (
                <img src={restaurantLogo} alt={restaurantName} />
              ) : (
                <ChefHat size={22} />
              )}
            </div>
            <div className="customer-auth-brand-text">
              <strong>{restaurantName}</strong>
              <small>Fine Dining &amp; Takeaway</small>
            </div>
          </div>

          <button
            type="button"
            className="customer-auth-exit-btn"
            onClick={onBackToHome}
          >
            <ArrowLeft size={15} />
            <span>Back to Home</span>
          </button>
        </header>

        {/* ── Main Body with Centered White Card ────────────────────────── */}
        <div className="customer-auth-body">
          <div className="customer-auth-card">
            {/* Top Emblem */}
            <div className="customer-auth-card-emblem">
              {restaurantLogo ? (
                <img src={restaurantLogo} alt="Logo" />
              ) : (
                <ChefHat size={24} strokeWidth={2.2} />
              )}
            </div>

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SCREEN 1: CUSTOMER LOGIN                                     */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeStep === "login" && (
              <div>
                <div className="customer-auth-card-header">
                  <h2>
                    Customer <span>Login</span>
                  </h2>
                  <p>
                    Sign in to order takeaway, reserve a table and enjoy a great dining experience.
                  </p>
                </div>

                {loginError && (
                  <div className="customer-auth-banner-error">
                    <AlertCircle size={16} />
                    <span>{loginError}</span>
                  </div>
                )}

                <form className="customer-auth-form" onSubmit={handleLoginSubmit}>
                  {/* Email / Mobile Field */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        type="text"
                        className="customer-auth-input"
                        placeholder="Email address or Mobile number"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        className="customer-auth-input"
                        placeholder="Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="customer-auth-eye-btn"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Aux Row: Remember Me & Forgot Password */}
                  <div className="customer-auth-aux-row">
                    <label className="customer-auth-remember">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember Me</span>
                    </label>

                    <button
                      type="button"
                      className="customer-auth-link-forgot"
                      onClick={() => setActiveStep("forgot")}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Sign In Button */}
                  <button type="submit" disabled={busy} className="customer-auth-primary-btn">
                    <LogIn size={18} />
                    <span>Sign In</span>
                  </button>

                  {/* Divider */}
                  <div className="customer-auth-divider">
                    <span>New to {restaurantName}?</span>
                  </div>

                  {/* Create Account Secondary Button */}
                  <button
                    type="button"
                    className="customer-auth-secondary-btn"
                    onClick={() => setActiveStep("register")}
                  >
                    <UserPlus size={17} />
                    <span>Create Account</span>
                  </button>
                </form>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SCREEN 2: CREATE ACCOUNT                                     */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeStep === "register" && (
              <div>
                <div className="customer-auth-card-header">
                  <h2>
                    Create Your <span>Account</span>
                  </h2>
                  <p>
                    Join {restaurantName} and enjoy takeaway and table reservation.
                  </p>
                </div>

                {regError && (
                  <div className="customer-auth-banner-error">
                    <AlertCircle size={16} />
                    <span>{regError}</span>
                  </div>
                )}

                <form className="customer-auth-form" onSubmit={handleRegisterSubmit}>
                  {/* Full Name */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <User size={18} />
                      </span>
                      <input
                        type="text"
                        className="customer-auth-input"
                        placeholder="Full Name *"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Phone size={18} />
                      </span>
                      <input
                        type="tel"
                        className="customer-auth-input"
                        placeholder="Mobile Number *"
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        type="email"
                        className="customer-auth-input"
                        placeholder="Email Address (Optional)"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        type={showRegPassword ? "text" : "password"}
                        className="customer-auth-input"
                        placeholder="Password *"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="customer-auth-eye-btn"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                      >
                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        type={showRegConfirmPassword ? "text" : "password"}
                        className="customer-auth-input"
                        placeholder="Confirm Password *"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="customer-auth-eye-btn"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      >
                        {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Create Account Button */}
                  <button type="submit" disabled={busy} className="customer-auth-primary-btn">
                    <UserPlus size={18} />
                    <span>Create Account</span>
                  </button>

                  {/* Footer Link to Sign In */}
                  <div className="customer-auth-footer-nav">
                    <span>Already have an account?</span>{" "}
                    <button
                      type="button"
                      className="customer-auth-footer-link"
                      onClick={() => setActiveStep("login")}
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SCREEN 3: OTP VERIFICATION                                   */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeStep === "otp" && (
              <div>
                <div className="customer-auth-card-header">
                  <h2>
                    Verify Your <span>Account</span>
                  </h2>
                  <p>
                    A verification code was requested for{" "}
                    <strong>{currentUserData.email || currentUserData.phone}</strong>.
                  </p>
                </div>

                {otpError && (
                  <div className="customer-auth-banner-error">
                    <AlertCircle size={16} />
                    <span>{otpError}</span>
                  </div>
                )}

                {otpMessage && (
                  <div className="customer-auth-banner-alert" role="status">
                    <CheckCircle2 size={16} />
                    <span>{otpMessage}</span>
                  </div>
                )}

                <form className="customer-auth-form" onSubmit={handleVerifyOtp}>
                  {/* 6 Digit OTP Input Boxes */}
                  <div className="customer-auth-otp-row" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={otpInputRefs[idx]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="customer-auth-otp-box"
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      />
                    ))}
                  </div>

                  {/* Resend Countdown */}
                  <div className="customer-auth-resend-row">
                    Didn't receive the OTP?{" "}
                    {resendTimer > 0 ? (
                      <span style={{ color: "#ea580c", fontWeight: 700 }}>
                        Resend OTP (00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer})
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        className="customer-auth-resend-btn"
                        onClick={handleResendOtp}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  {/* Verify & Continue Button */}
                  <button type="submit" disabled={busy} className="customer-auth-primary-btn">
                    <CheckCircle2 size={18} />
                    <span>Verify &amp; Continue</span>
                  </button>

                  <div className="customer-auth-footer-nav">
                    <button
                      type="button"
                      className="customer-auth-footer-link"
                      onClick={() => setActiveStep("login")}
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SCREEN 4: FORGOT PASSWORD                                    */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeStep === "forgot" && (
              <div>
                <div className="customer-auth-card-header">
                  <h2>
                    Forgot <span>Password?</span>
                  </h2>
                  <p>
                    Enter your registered email or mobile number to receive a password reset link.
                  </p>
                </div>

                {forgotSentMessage && (
                  <div className="customer-auth-banner-alert">
                    <CheckCircle2 size={16} />
                    <span>{forgotSentMessage}</span>
                  </div>
                )}

                {forgotError && (
                  <div className="customer-auth-banner-error">
                    <AlertCircle size={16} />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form className="customer-auth-form" onSubmit={handleForgotSubmit}>
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        type="text"
                        className="customer-auth-input"
                        placeholder="Email address or Mobile number"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={busy} className="customer-auth-primary-btn">
                    <Send size={17} />
                    <span>Send Reset Link</span>
                  </button>

                  <div className="customer-auth-footer-nav">
                    <span>Remembered your password?</span>{" "}
                    <button
                      type="button"
                      className="customer-auth-footer-link"
                      onClick={() => setActiveStep("login")}
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SCREEN 5: RESET PASSWORD                                     */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeStep === "reset" && (
              <div>
                <div className="customer-auth-card-header">
                  <h2>
                    Reset Your <span>Password</span>
                  </h2>
                  <p>Set a new password for your account.</p>
                </div>

                {resetSuccessMessage && (
                  <div className="customer-auth-banner-alert">
                    <CheckCircle2 size={16} />
                    <span>{resetSuccessMessage}</span>
                  </div>
                )}

                {resetError && (
                  <div className="customer-auth-banner-error">
                    <AlertCircle size={16} />
                    <span>{resetError}</span>
                  </div>
                )}

                <form className="customer-auth-form" onSubmit={handleResetSubmit}>
                  {/* New Password */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="customer-auth-input"
                        placeholder="New Password *"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="customer-auth-eye-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="customer-auth-field">
                    <div className="customer-auth-input-wrapper">
                      <span className="customer-auth-field-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        type={showConfirmNewPassword ? "text" : "password"}
                        className="customer-auth-input"
                        placeholder="Confirm New Password *"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="customer-auth-eye-btn"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      >
                        {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={busy} className="customer-auth-primary-btn">
                    <RefreshCw size={17} />
                    <span>Reset Password</span>
                  </button>

                  <div className="customer-auth-footer-nav">
                    <button
                      type="button"
                      className="customer-auth-footer-link"
                      onClick={() => setActiveStep("login")}
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SCREEN 6: LOGIN SUCCESS                                      */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeStep === "success" && (
              <div className="customer-auth-success-screen">
                <div className="customer-auth-success-icon">
                  <Check size={42} strokeWidth={3} />
                </div>

                <div className="customer-auth-success-title">Login Successful!</div>
                <div className="customer-auth-success-subtitle">
                  Welcome back to {restaurantName}, <strong>{currentUserData.name}</strong>.
                </div>

                <div className="customer-auth-redirect-status">
                  <RefreshCw size={16} className="auth-spinner" />
                  <span>Redirecting to {getDestinationLabel()}...</span>
                </div>

                <div className="customer-auth-progress-track">
                  <div className="customer-auth-progress-bar" />
                </div>

                <div style={{ marginTop: "24px" }}>
                  <button
                    type="button"
                    className="customer-auth-secondary-btn"
                    style={{ fontSize: "13px", height: "38px" }}
                    onClick={() => onLoginSuccess(currentUserData, intendedDestination)}
                  >
                    Click if not redirected automatically →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerAuthFlow;

