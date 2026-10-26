import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Mail,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { apiSendOtp, apiVerifyOtp } from "../api/authApi";

export function UpiOtpVerificationModal({
  isOpen,
  onClose,
  onVerified,
  actionDetails, // { type: 'select_active' | 'upload_image' | 'remove_image', index, targetQr, currentActiveQr, currentActiveIndex }
  adminEmail,
  adminName = "Admin",
  isLight = false,
}) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [customEmail, setCustomEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  const targetEmail = (customEmail || adminEmail || "").trim();

  // Mask email for display: "admin2@gmail.com" -> "ad***2@gmail.com"
  const maskEmail = (mail) => {
    if (!mail || !mail.includes("@")) return mail || "admin@registered.mail";
    const [user, domain] = mail.split("@");
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    const start = user.slice(0, 2);
    const end = user.slice(-1);
    return `${start}${"*".repeat(Math.max(3, user.length - 3))}${end}@${domain}`;
  };

  // Trigger send OTP when modal opens
  useEffect(() => {
    if (isOpen && targetEmail) {
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setSuccessMsg("");
      handleSendOtp(targetEmail);
    }
  }, [isOpen]);

  // Countdown timer for Resend button
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs[0]?.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendOtp = async (emailToUse) => {
    const finalEmail = (emailToUse || targetEmail).trim();
    if (!finalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
      setError("Please provide a valid registered admin email address.");
      return;
    }

    setIsSending(true);
    setError("");
    setSuccessMsg("");
    setPreviewUrl(null);
    setDevOtp(null);

    try {
      const res = await apiSendOtp(finalEmail, "", adminName);
      if (res && res.success) {
        setCountdown(60);
        setSuccessMsg(
          res.message || `Verification OTP sent to ${maskEmail(finalEmail)}`
        );
        if (res.previewUrl) setPreviewUrl(res.previewUrl);
        if (res.otp) setDevOtp(res.otp);
      } else {
        setError(res?.error || "Failed to send OTP to admin email. Please try again.");
      }
    } catch (err) {
      console.error("Error dispatching UPI OTP:", err);
      setError("Could not reach the email service. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      return;
    }

    // Single digit entry
    const char = cleanVal.slice(-1);
    const updated = [...otp];
    updated[index] = char;
    setOtp(updated);
    setError("");

    // Auto move to next input
    if (index < 5 && char) {
      inputRefs[index + 1]?.current?.focus();
    }

    // Auto submit if all 6 digits entered
    if (index === 5 && char) {
      const fullCode = updated.join("");
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs[index + 1]?.current?.focus();
    } else if (e.key === "Enter") {
      const fullCode = otp.join("");
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const digits = pasted.split("");
    const updated = [...otp];
    digits.forEach((d, i) => {
      if (i < 6) updated[i] = d;
    });
    setOtp(updated);
    setError("");

    const nextFocus = Math.min(digits.length, 5);
    inputRefs[nextFocus]?.current?.focus();

    if (pasted.length === 6) {
      verifyCode(pasted);
    }
  };

  const verifyCode = async (codeToVerify) => {
    const code = (codeToVerify || otp.join("")).trim();
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    if (!targetEmail) {
      setError("Admin registered email is missing.");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const res = await apiVerifyOtp(targetEmail, code);
      if (res && res.success) {
        setSuccessMsg("✅ OTP verified successfully! Applying UPI stream change...");
        setTimeout(() => {
          if (onVerified) {
            onVerified(actionDetails);
          }
          onClose();
        }, 600);
      } else {
        setError(
          res?.error ||
            "❌ Invalid or expired OTP code. Change was not allowed. Please check your email."
        );
        // Highlight inputs by resetting
        inputRefs[0]?.current?.focus();
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError("Verification failed due to a network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  // Describe the change for the banner
  const getActionDescription = () => {
    if (!actionDetails) return "Payment QR Configuration Change";
    const { type, index, targetQr, currentActiveIndex, currentActiveQr } = actionDetails;
    if (type === "select_active") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "0.83rem" }}>
          <span>Switch active UPI from</span>
          <span style={{ fontWeight: 800, color: "var(--text-main, #ffffff)" }}>
            Slot #{ (currentActiveIndex ?? 0) + 1 } ({currentActiveQr?.label || "Current Active"})
          </span>
          <ArrowRight size={13} color="#f59e0b" />
          <span style={{ fontWeight: 800, color: "#10b981" }}>
            Slot #{ (index ?? 0) + 1 } ({targetQr?.label || "New Selected"})
          </span>
        </div>
      );
    }
    if (type === "upload_image") {
      return (
        <div style={{ fontSize: "0.83rem" }}>
          <span>Upload/replace QR image for </span>
          <span style={{ fontWeight: 800, color: "#f59e0b" }}>
            Slot #{ (index ?? 0) + 1 } ({targetQr?.label || "Counter UPI"})
          </span>
        </div>
      );
    }
    if (type === "remove_image") {
      return (
        <div style={{ fontSize: "0.83rem" }}>
          <span>Remove QR code image from </span>
          <span style={{ fontWeight: 800, color: "#ef4444" }}>
            Slot #{ (index ?? 0) + 1 } ({targetQr?.label || "Counter UPI"})
          </span>
        </div>
      );
    }
    return "Switching active payment QR stream";
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: isLight ? "rgba(15, 23, 42, 0.45)" : "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: isLight
            ? "var(--bg-secondary, #ffffff)"
            : "linear-gradient(180deg, #131b2e 0%, #0d1322 100%)",
          border: isLight
            ? "1.5px solid var(--border-subtle, #e2e8f0)"
            : "1px solid rgba(245, 158, 11, 0.35)",
          boxShadow: isLight
            ? "0 20px 40px rgba(0, 0, 0, 0.15)"
            : "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(245, 158, 11, 0.15)",
          borderRadius: "18px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.4rem",
            borderBottom: isLight
              ? "1px solid #e2e8f0"
              : "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(234, 88, 12, 0.35)",
                flexShrink: 0,
              }}
            >
              <Lock size={19} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 800,
                    margin: 0,
                    color: "var(--text-main, #ffffff)",
                  }}
                >
                  Verify UPI Stream Change
                </h3>
              </div>
              <p
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-dim, #94a3b8)",
                  margin: "2px 0 0 0",
                }}
              >
                High-security action • Admin registered mail OTP required
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "none",
              background: isLight ? "#f1f5f9" : "rgba(255, 255, 255, 0.06)",
              color: "var(--text-dim, #94a3b8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            title="Cancel & Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.35rem 1.4rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Action Context Card */}
          <div
            style={{
              background: isLight ? "#f8fafc" : "rgba(15, 23, 42, 0.65)",
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "0.85rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "0.68rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 700,
                color: "#f59e0b",
              }}
            >
              Requested Action:
            </span>
            <div style={{ color: "var(--text-main, #cbd5e1)" }}>
              {getActionDescription()}
            </div>
          </div>

          {/* Email Recipient Info Box */}
          <div
            style={{
              background: isLight ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "12px",
              padding: "0.85rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
              <Mail size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim, #94a3b8)", fontWeight: 600 }}>
                  OTP Dispatched To Admin Registered Mail:
                </div>
                {!isEditingEmail ? (
                  <div
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      color: "var(--text-main, #ffffff)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: "1px",
                    }}
                    title={targetEmail}
                  >
                    {maskEmail(targetEmail)}
                  </div>
                ) : (
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="Enter registered admin email"
                    style={{
                      width: "100%",
                      background: "var(--bg-card, #0f172a)",
                      border: "1px solid #f59e0b",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "0.82rem",
                      color: "#ffffff",
                      outline: "none",
                      marginTop: "4px",
                    }}
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isEditingEmail && customEmail) {
                  setIsEditingEmail(false);
                  handleSendOtp(customEmail);
                } else {
                  setIsEditingEmail(!isEditingEmail);
                }
              }}
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#f59e0b",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                flexShrink: 0,
              }}
            >
              {isEditingEmail ? "Save & Send" : "Change"}
            </button>
          </div>

          {/* 6-Digit OTP Inputs */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-dim, #94a3b8)",
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              Enter 6-Digit Verification Code
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  style={{
                    width: "48px",
                    height: "54px",
                    borderRadius: "10px",
                    border: error
                      ? "1.5px solid #ef4444"
                      : digit
                      ? "1.5px solid #f59e0b"
                      : isLight
                      ? "1.5px solid #cbd5e1"
                      : "1.5px solid rgba(255, 255, 255, 0.15)",
                    background: isLight ? "#ffffff" : "rgba(15, 23, 42, 0.8)",
                    color: "var(--text-main, #ffffff)",
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    textAlign: "center",
                    outline: "none",
                    fontFamily: "monospace",
                    boxShadow: digit
                      ? "0 0 12px rgba(245, 158, 11, 0.25)"
                      : "none",
                    transition: "all 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#f59e0b";
                    e.currentTarget.style.boxShadow = "0 0 14px rgba(245, 158, 11, 0.35)";
                  }}
                  onBlur={(e) => {
                    if (!digit && !error) {
                      e.currentTarget.style.borderColor = isLight
                        ? "#cbd5e1"
                        : "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Validation Feedback */}
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "10px",
                padding: "0.65rem 0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#ef4444",
                fontSize: "0.78rem",
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderRadius: "10px",
                padding: "0.65rem 0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#10b981",
                fontSize: "0.78rem",
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Dev helper preview link if Ethereal SMTP is used */}
          {previewUrl && (
            <div
              style={{
                fontSize: "0.73rem",
                textAlign: "center",
                color: "var(--text-dim, #94a3b8)",
              }}
            >
              <span>Development Test Email: </span>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#38bdf8",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  textDecoration: "underline",
                }}
              >
                <span>View Inbox Preview</span>
                <ExternalLink size={11} />
              </a>
              {devOtp && (
                <span style={{ marginLeft: "8px", color: "#f59e0b", fontWeight: 800 }}>
                  (OTP: {devOtp})
                </span>
              )}
            </div>
          )}

          {/* Resend OTP Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.76rem",
              paddingTop: "0.2rem",
            }}
          >
            <span style={{ color: "var(--text-dim, #94a3b8)" }}>
              Didn't receive the email code?
            </span>
            <button
              type="button"
              disabled={countdown > 0 || isSending || isVerifying}
              onClick={() => handleSendOtp(targetEmail)}
              style={{
                background: "transparent",
                border: "none",
                color: countdown > 0 ? "var(--text-dim, #64748b)" : "#f59e0b",
                fontWeight: 700,
                fontSize: "0.76rem",
                cursor: countdown > 0 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                textDecoration: countdown > 0 ? "none" : "underline",
              }}
            >
              <RefreshCw
                size={12}
                style={{
                  animation: isSending ? "spin 1s linear infinite" : "none",
                }}
              />
              <span>{countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.4rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "10px",
                border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255, 255, 255, 0.12)",
                background: isLight ? "#f1f5f9" : "rgba(255, 255, 255, 0.05)",
                color: "var(--text-main, #e2e8f0)",
                fontSize: "0.86rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => verifyCode()}
              disabled={isVerifying || otp.join("").length !== 6}
              style={{
                flex: 2,
                padding: "0.75rem",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                color: "#ffffff",
                fontSize: "0.88rem",
                fontWeight: 800,
                cursor:
                  isVerifying || otp.join("").length !== 6
                    ? "not-allowed"
                    : "pointer",
                opacity: isVerifying || otp.join("").length !== 6 ? 0.6 : 1,
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Validating OTP...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Verify & Change UPI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
