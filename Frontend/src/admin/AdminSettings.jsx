import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  Store,
  Receipt,
  Percent,
  Palette,
  QrCode,
  Upload,
  Trash2,
  X,
  Package,
  Wine,
  Lock,
  Copy,
} from "lucide-react";
import { UpiOtpVerificationModal } from "../common/UpiOtpVerificationModal";
import { getUsers } from "../utils/auth";
import { processLogoImage, detectImageBgColor } from "../utils/logoHelper";
import { applyAccent, getSavedAccent, hexToHsl, hexToHsv, hsvToHex } from "../utils/accentColor";
import { apiClient } from "../api/apiConfig";

const DEFAULT_PAYMENT_QRS = [
  {
    id: "qr-1",
    label: "QR 1",
    image: null,
    active: false,
  },
  {
    id: "qr-2",
    label: "QR 2",
    image: null,
    active: false,
  },
  {
    id: "qr-3",
    label: "QR 3",
    image: null,
    active: false,
  },
];

const getInitialSettings = (initialSettings) => {
  const baseDefaults = {
    restaurantName: "The Rustic Spin",
    tagline: "Restaurant Management and Fine Dining",
    phone: "",
    address: "",
    gstin: "",
    logo: "/restaurant-logo.png",
    restaurantLogo: "/restaurant-logo.png",
    logoBg: "",
    taxRate: 5,
    serviceChargeRate: 5,
    currency: "₹",
    receiptHeader: "",
    receiptFooter: "",
    selectedQrId: "",
    paymentQrs: DEFAULT_PAYMENT_QRS,
    showLogoOnReceipt: true,
    showAddressOnReceipt: true,
    showGstBreakdown: true,
    lowStockAlertsEnabled: true,
    showBarHeaderToggle: false,
  };

  try {
    const saved = localStorage.getItem("gourmet_pos_settings_v1");
    const parsedSaved = saved ? JSON.parse(saved) : {};
    const source = {
      ...parsedSaved,
      ...(initialSettings || {}),
    };

    const sourceQrs =
      (Array.isArray(parsedSaved.paymentQrs) && parsedSaved.paymentQrs.length > 0 && parsedSaved.paymentQrs) ||
      (Array.isArray(source.paymentQrs) && source.paymentQrs.length > 0 && source.paymentQrs) ||
      DEFAULT_PAYMENT_QRS;

    let qrs = [0, 1, 2].map((i) => ({
      ...DEFAULT_PAYMENT_QRS[i],
      ...(sourceQrs[i] || {}),
    }));

    const selectedId =
      parsedSaved.selectedQrId ||
      source.selectedQrId ||
      qrs.find((q) => q.active && q.image)?.id ||
      qrs.find((q) => q.image)?.id ||
      "";

    qrs = qrs.map((q) => ({
      ...q,
      active: q.id === selectedId,
    }));

    const rawCurrency = source.currency || parsedSaved.currency || "₹";
    const cleanCurrency = rawCurrency.includes("â") || rawCurrency === "?" ? "₹" : rawCurrency;

    return {
      ...baseDefaults,
      ...parsedSaved,
      ...(initialSettings || {}),
      currency: cleanCurrency,
      selectedQrId: selectedId,
      paymentQrs: qrs,
    };
  } catch {
    return baseDefaults;
  }
};

export function AdminSettings({
  currentTheme = "royal-saffron",
  initialSettings,
  onSaveSettings,
  showBarHeaderToggle,
  onToggleShowBarHeader,
  currentAdminSession = null,
}) {
  const isLight = currentTheme === "light-bistro";
  const [selectedAccent, setSelectedAccent] = useState(getSavedAccent);
  const [savedAccent, setSavedAccent] = useState(getSavedAccent);
  const [hexInput, setHexInput] = useState(getSavedAccent);
  const [hue, setHue] = useState(() => hexToHsl(getSavedAccent()).h);
  const savedAccentRef = useRef(savedAccent);
  const colorAreaRef = useRef(null);
  const isDraggingRef = useRef(false);
  const selectedRgb = selectedAccent.match(/[\da-f]{2}/gi).map((channel) => parseInt(channel, 16));

  const previewAccent = (hex, updateHue = true) => {
    const normalized = /^#[\da-f]{6}$/i.test(hex) ? hex.toLowerCase() : null;
    if (!normalized) return;
    setSelectedAccent(normalized);
    setHexInput(normalized);
    if (updateHue) {
      setHue(hexToHsl(normalized).h);
    }
    // Preview globally at once; the restaurant-wide value is committed by the
    // existing Save Changes action so other devices update after persistence.
    applyAccent(normalized, { persist: false });
  };

  useEffect(() => {
    const handleSynchronizedAccent = (event) => {
      const accent = event.detail;
      if (!/^#[\da-f]{6}$/i.test(String(accent || ""))) return;
      const normalized = accent.toLowerCase();
      savedAccentRef.current = normalized;
      setSavedAccent(normalized);
      setSelectedAccent(normalized);
      setHexInput(normalized);
      setHue(hexToHsl(normalized).h);
    };
    window.addEventListener("accent-synchronized", handleSynchronizedAccent);
    return () => window.removeEventListener("accent-synchronized", handleSynchronizedAccent);
  }, []);

  const pickColorAtPoint = (clientX, clientY, updateHue = false) => {
    const bounds = colorAreaRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
    const saturation = Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100));
    const value = Math.max(0, Math.min(100, (1 - (clientY - bounds.top) / bounds.height) * 100));
    previewAccent(hsvToHex(hue, saturation, value), updateHue);
  };

  const [settings, setSettings] = useState(() => getInitialSettings(initialSettings));
  const [lastSavedSettings, setLastSavedSettings] = useState(() => getInitialSettings(initialSettings));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [logoError, setLogoError] = useState("");

  // OTP Verification state for UPI stream change
  const [upiOtpModalOpen, setUpiOtpModalOpen] = useState(false);
  const [pendingUpiAction, setPendingUpiAction] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    let resolvedEmail = "";
    let resolvedName = "Admin";

    const getActiveSession = () => {
      if (currentAdminSession && typeof currentAdminSession === "object") return currentAdminSession;
      try {
        const raw =
          localStorage.getItem("avsr_admin_session") ||
          localStorage.getItem("avsr_auth_session_v1") ||
          localStorage.getItem("auth_user");
        if (raw) return JSON.parse(raw);
      } catch {}
      return null;
    };

    const sess = getActiveSession();

    if (sess?.email && sess.email.includes("@")) {
      resolvedEmail = sess.email.trim();
    } else if (sess?.loginEmail && sess.loginEmail.includes("@")) {
      resolvedEmail = sess.loginEmail.trim();
    } else if (sess?.loginIdentifier && sess.loginIdentifier.includes("@")) {
      resolvedEmail = sess.loginIdentifier.trim();
    }

    if (sess?.name || sess?.username) {
      resolvedName = sess.name || sess.username || "Admin";
    }

    // Only query database to match the active logged-in user if email wasn't directly in session
    if (!resolvedEmail && sess && (sess.userId || sess.id || sess.username || sess.name)) {
      getUsers().then(({ users }) => {
        if (Array.isArray(users)) {
          const match = users.find(
            (u) =>
              (sess.userId && String(u.id || u.Id || u.userId) === String(sess.userId)) ||
              (sess.id && String(u.id || u.Id || u.userId) === String(sess.id)) ||
              (sess.username && String(u.username || u.Username || "").toLowerCase() === String(sess.username).toLowerCase()) ||
              (sess.name && String(u.name || u.FullName || u.fullName || "").toLowerCase() === String(sess.name).toLowerCase())
          );
          if (match?.email && match.email.includes("@")) {
            setAdminEmail(match.email.trim());
            setAdminName(match.name || match.username || resolvedName);
            return;
          }
        }
      }).catch(() => {});
    }

    if (!resolvedEmail && settings?.email && settings.email.includes("@")) {
      resolvedEmail = settings.email.trim();
    }

    if (resolvedEmail) {
      setAdminEmail(resolvedEmail);
      setAdminName(resolvedName);
    }
  }, [currentAdminSession, settings?.email]);

  const isBarToggleOn =
    showBarHeaderToggle !== undefined
      ? Boolean(showBarHeaderToggle)
      : settings.showBarHeaderToggle ?? true;

  const handleToggleBarHeader = (nextVal) => {
    setSettings((prev) => ({
      ...prev,
      showBarHeaderToggle: nextVal,
    }));
    onToggleShowBarHeader?.(nextVal);
  };

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(lastSavedSettings) || selectedAccent !== savedAccent;
  }, [settings, lastSavedSettings, selectedAccent, savedAccent]);

  const processImageFile = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (!dataUrl) return;
      if (file.type === "image/svg+xml" || file.size < 250 * 1024) {
        callback(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL("image/png", 0.92));
      };
      img.onerror = () => callback(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    const input = event.currentTarget;
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file for the restaurant logo.");
      return;
    }
    processLogoImage(file, ({ dataUrl, bgColor }) => {
      setSettings((current) => {
        const next = {
          ...current,
          logo: dataUrl,
          restaurantLogo: dataUrl,
          logoBg: bgColor,
          updatedAt: new Date().toISOString(),
          isUserConfigured: true,
        };
        setLastSavedSettings(next);
        // Auto-save immediately to server so all desktops / devices get the change globally
        if (onSaveSettings) {
          onSaveSettings(next).catch((err) => {
            console.warn("Auto-save logo to server warning:", err);
          });
        }
        try {
          localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(next));
        } catch {
          try {
            localStorage.removeItem("gourmet_pos_inventory_deductions_v1");
            const lean = { ...next, restaurantLogo: undefined };
            localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(lean));
          } catch {}
        }
        try {
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new Event("restaurant-settings-updated"));
          window.dispatchEvent(new CustomEvent("avsr-settings-updated", { detail: next }));
        } catch {}
        return next;
      });
      input.value = "";
    });
  };

  useEffect(() => {
    if (initialSettings && Object.keys(initialSettings).length > 0) {
      setSettings((prev) => {
        // Guard: If user has unsaved edits in progress, do not overwrite with stale initialSettings
        const isCurrentlyDirty = JSON.stringify(prev) !== JSON.stringify(lastSavedSettings);
        if (isCurrentlyDirty) {
          return prev;
        }

        let localSaved = {};
        try {
          localSaved = JSON.parse(localStorage.getItem("gourmet_pos_settings_v1") || "{}");
        } catch {}

        const localTime = localSaved.updatedAt ? new Date(localSaved.updatedAt).getTime() : 0;
        const initialTime = initialSettings.updatedAt ? new Date(initialSettings.updatedAt).getTime() : 0;
        const isLocalNewer = localSaved.isUserConfigured && localTime > 0 && localTime >= initialTime;

        const sourceQrs =
          (Array.isArray(localSaved.paymentQrs) && localSaved.paymentQrs.length > 0 && localSaved.paymentQrs) ||
          (Array.isArray(initialSettings.paymentQrs) && initialSettings.paymentQrs.length > 0 && initialSettings.paymentQrs) ||
          prev.paymentQrs ||
          DEFAULT_PAYMENT_QRS;

        let qrs = [0, 1, 2].map((i) => ({
          ...DEFAULT_PAYMENT_QRS[i],
          ...(sourceQrs[i] || {}),
        }));

        const selectedId =
          localSaved.selectedQrId ||
          initialSettings.selectedQrId ||
          prev.selectedQrId ||
          qrs.find((q) => q.active && q.image)?.id ||
          qrs.find((q) => q.image)?.id ||
          "";

        qrs = qrs.map((q) => ({
          ...q,
          active: q.id === selectedId,
        }));

        const nextSettings = {
          ...prev,
          ...localSaved,
          ...initialSettings,
          restaurantName: isLocalNewer && localSaved.restaurantName
            ? localSaved.restaurantName
            : (initialSettings.restaurantName && !/bhanu|avsr/i.test(initialSettings.restaurantName)
                ? initialSettings.restaurantName
                : localSaved.restaurantName || "The Rustic Spin"),
          tagline: isLocalNewer && localSaved.tagline !== undefined
            ? localSaved.tagline
            : (initialSettings.tagline !== undefined && initialSettings.tagline !== ""
                ? initialSettings.tagline
                : (localSaved.tagline || prev.tagline || "")),
          logo: isLocalNewer && localSaved.logo !== undefined
            ? localSaved.logo
            : (initialSettings.logo || initialSettings.restaurantLogo || localSaved.logo || prev.logo || "/restaurant-logo.png"),
          restaurantLogo: isLocalNewer && (localSaved.restaurantLogo !== undefined || localSaved.logo !== undefined)
            ? (localSaved.restaurantLogo || localSaved.logo)
            : (initialSettings.restaurantLogo || initialSettings.logo || localSaved.restaurantLogo || prev.restaurantLogo || "/restaurant-logo.png"),
          logoBg: initialSettings.logoBg || localSaved.logoBg || prev.logoBg || "",
          selectedQrId: selectedId,
          paymentQrs: qrs,
        };

        setLastSavedSettings((prevSaved) => {
          if (JSON.stringify(prev) === JSON.stringify(prevSaved)) {
            return nextSettings;
          }
          return prevSaved;
        });

        return nextSettings;
      });
    }
  }, [initialSettings]);

  const fileInputRef0 = useRef(null);
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const fileInputRefs = [fileInputRef0, fileInputRef1, fileInputRef2];

  const executeSelectActiveQr = (selectedIndex) => {
    const currentQrs = settings.paymentQrs || DEFAULT_PAYMENT_QRS;
    const targetQr = currentQrs[selectedIndex];

    // Restrict selection if container does not have an uploaded image
    if (!targetQr?.image) {
      return;
    }

    const targetId = targetQr?.id || `qr-${selectedIndex + 1}`;
    const nextQrs = currentQrs.map((q, idx) => ({
      ...q,
      active: idx === selectedIndex,
    }));

    const updated = {
      ...settings,
      selectedQrId: targetId,
      paymentQrs: nextQrs,
    };

    setSettings(updated);

    // Persist immediately to localStorage so POS billing and page refresh reflect it instantly
    try {
      const saved = localStorage.getItem("gourmet_pos_settings_v1");
      const parsed = saved ? JSON.parse(saved) : {};
      const toSave = {
        ...parsed,
        ...updated,
        selectedQrId: targetId,
        paymentQrs: nextQrs,
      };
      localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(toSave));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("restaurant-settings-updated"));
      window.dispatchEvent(new CustomEvent("avsr-settings-updated", { detail: toSave }));
    } catch (err) {
      console.error("Failed to save active QR to localStorage:", err);
    }

    if (onSaveSettings) {
      onSaveSettings(updated).catch(() => {});
    }
  };

  const executeQrUpload = (index, file) => {
    if (!file) return;
    processImageFile(file, (dataUrl) => {
      setSettings((prev) => {
        const nextQrs = [...(prev.paymentQrs || DEFAULT_PAYMENT_QRS)];
        nextQrs[index] = {
          ...nextQrs[index],
          image: dataUrl,
        };
        const updated = { ...prev, paymentQrs: nextQrs };
        try {
          const saved = localStorage.getItem("gourmet_pos_settings_v1");
          const parsed = saved ? JSON.parse(saved) : {};
          const savedObj = { ...parsed, ...updated, paymentQrs: nextQrs };
          localStorage.setItem(
            "gourmet_pos_settings_v1",
            JSON.stringify(savedObj)
          );
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new Event("restaurant-settings-updated"));
          window.dispatchEvent(new CustomEvent("avsr-settings-updated", { detail: savedObj }));
        } catch (err) {
          console.error("Failed to save uploaded QR:", err);
        }
        if (onSaveSettings) {
          onSaveSettings(updated).catch(() => {});
        }
        return updated;
      });
    });
  };

  const updateQrLabel = (index, newLabel) => {
    setSettings((prev) => {
      const nextQrs = [...(prev.paymentQrs || DEFAULT_PAYMENT_QRS)];
      nextQrs[index] = {
        ...nextQrs[index],
        label: newLabel,
      };
      const updated = { ...prev, paymentQrs: nextQrs };
      try {
        const saved = localStorage.getItem("gourmet_pos_settings_v1");
        const parsed = saved ? JSON.parse(saved) : {};
        const savedObj = { ...parsed, ...updated, paymentQrs: nextQrs };
        localStorage.setItem(
          "gourmet_pos_settings_v1",
          JSON.stringify(savedObj)
        );
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("restaurant-settings-updated"));
        window.dispatchEvent(new CustomEvent("avsr-settings-updated", { detail: savedObj }));
      } catch (err) {
        console.error("Failed to save updated QR label:", err);
      }
      if (onSaveSettings) {
        onSaveSettings(updated).catch(() => {});
      }
      return updated;
    });
  };

  const executeRemoveQrImage = (index) => {
    setSettings((prev) => {
      const nextQrs = [...(prev.paymentQrs || DEFAULT_PAYMENT_QRS)];
      const wasActive =
        nextQrs[index]?.active || prev.selectedQrId === nextQrs[index]?.id;
      nextQrs[index] = {
        ...nextQrs[index],
        image: null,
      };
      let nextSelectedId = prev.selectedQrId;
      if (wasActive) {
        const fallbackIdx = nextQrs.findIndex((q, i) => i !== index && q.image);
        const activeIdx = fallbackIdx !== -1 ? fallbackIdx : 0;
        nextQrs.forEach((q, i) => {
          q.active = i === activeIdx;
        });
        nextSelectedId = nextQrs[activeIdx]?.id || "qr-1";
      }
      const updated = {
        ...prev,
        selectedQrId: nextSelectedId,
        paymentQrs: nextQrs,
      };
      try {
        const saved = localStorage.getItem("gourmet_pos_settings_v1");
        const parsed = saved ? JSON.parse(saved) : {};
        const savedObj = { ...parsed, ...updated };
        localStorage.setItem(
          "gourmet_pos_settings_v1",
          JSON.stringify(savedObj)
        );
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("restaurant-settings-updated"));
        window.dispatchEvent(new CustomEvent("avsr-settings-updated", { detail: savedObj }));
      } catch (err) {
        console.error("Failed to save removed QR:", err);
      }
      if (onSaveSettings) {
        onSaveSettings(updated).catch(() => {});
      }
      return updated;
    });
  };

  // Intercept changing the UPI stream (active slot, upload, or remove) and require registered admin OTP
  const requestUpiChange = (action) => {
    const currentQrs = settings.paymentQrs || DEFAULT_PAYMENT_QRS;
    const currentActiveIdx = currentQrs.findIndex((q) =>
      settings.selectedQrId ? q.id === settings.selectedQrId : q.active
    );
    action.currentActiveIndex = currentActiveIdx !== -1 ? currentActiveIdx : 0;
    action.currentActiveQr = currentQrs[action.currentActiveIndex];
    action.targetQr = currentQrs[action.index];

    // If clicking the slot that is already active, no change is made
    if (action.type === "select_active") {
      if (action.index === action.currentActiveIndex) return;
      if (!action.targetQr?.image) return;
    }

    setPendingUpiAction(action);
    setUpiOtpModalOpen(true);
  };

  const handleUpiOtpVerified = (action) => {
    if (!action) return;
    if (action.type === "select_active") {
      executeSelectActiveQr(action.index);
    } else if (action.type === "upload_image") {
      executeQrUpload(action.index, action.file);
    } else if (action.type === "remove_image") {
      executeRemoveQrImage(action.index);
    }
    setPendingUpiAction(null);
  };

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    setSaveError("");

    const resolvedLogo = settings.logo !== undefined ? settings.logo : (settings.restaurantLogo || "");
    const settingsToSave = {
      ...settings,
      logo: resolvedLogo,
      restaurantLogo: resolvedLogo,
      accentColor: selectedAccent,
      updatedAt: new Date().toISOString(),
      isUserConfigured: true,
    };

    // 1. LocalStorage with quota protection (never block save)
    try {
      localStorage.setItem(
        "gourmet_pos_settings_v1",
        JSON.stringify(settingsToSave),
      );
    } catch (storageErr) {
      console.warn("Storage quota warning, clearing non-critical keys:", storageErr);
      try {
        localStorage.removeItem("gourmet_pos_inventory_deductions_v1");
        const lean = { ...settingsToSave, restaurantLogo: undefined };
        localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(lean));
      } catch {}
    }

    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("restaurant-settings-updated"));
      window.dispatchEvent(new CustomEvent("avsr-settings-updated", { detail: settingsToSave }));
    } catch {}

    // 2. Save the restaurant-wide accent through its dedicated endpoint. The
    // request is made once, from the existing Save Changes action.
    let saveFailed = false;
    if (selectedAccent !== savedAccentRef.current) {
      try {
        const themeResponse = await apiClient("/api/v1/settings/theme", {
          method: "PUT",
          body: JSON.stringify({ accentColor: selectedAccent }),
        });
        const themeBody = themeResponse?.data?.data ?? themeResponse?.data?.Data ?? themeResponse?.data;
        const savedHex = themeBody?.accentColor ?? themeBody?.AccentColor ?? selectedAccent;
        if (!themeResponse?.success || !/^#[\da-f]{6}$/i.test(String(savedHex || ""))) {
          // If dedicated theme endpoint returned a failure, do not falsely report success.
          // Keep user's chosen color in the preview picker rather than reverting to black.
          saveFailed = true;
          setSaveError(themeResponse?.error || "Theme color could not be saved to server.");
        } else {
          const normalized = applyAccent(savedHex);
          savedAccentRef.current = normalized;
          setSavedAccent(normalized);
          setSelectedAccent(normalized);
          setHexInput(normalized);
          setHue(hexToHsl(normalized).h);
        }
      } catch (themeError) {
        saveFailed = true;
        setSaveError(themeError?.message || "Server error while saving theme color.");
      }
    }

    // 3. Existing restaurant settings save (one call, same handler).
    if (onSaveSettings) {
      try {
        const syncRes = await onSaveSettings(settingsToSave);
        if (syncRes && syncRes.success === false) {
          saveFailed = true;
          setSaveError(syncRes.error || "Failed to sync settings to server.");
        }
      } catch (syncErr) {
        console.warn("Server sync error:", syncErr);
        saveFailed = true;
        setSaveError(syncErr?.message || "Server connection error while saving.");
      }
    }

    if (!saveFailed) {
      setLastSavedSettings(settingsToSave);
      setSettings(settingsToSave);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
    setIsSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {/* Outer Card Matching Design */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        {/* Header Strip inside Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Left Title with Orange Squircle */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "var(--primary-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px var(--accent-amber-glow)",
              }}
            >
              <Settings size={22} color="#ffffff" />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  Restaurant Configuration & Settings
                </h2>
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-dim)",
                  margin: "3px 0 0 0",
                }}
              >
                Customize brand profile, tax & service charges, receipt
                templates and display theme
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {savedSuccess && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "var(--success)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={15} />
                <span>Settings Saved Successfully</span>
              </div>
            )}
            <button
              type="submit"
              form="restaurant-settings-form"
              disabled={!isDirty || isSaving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.58rem 1.35rem",
                borderRadius: "9px",
                background: savedSuccess
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : isDirty && !isSaving
                  ? "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-saffron) 100%)"
                  : "rgba(var(--surface-rgb),0.06)",
                color: savedSuccess || (isDirty && !isSaving) ? "#ffffff" : "#64748b",
                border: isDirty && !isSaving ? "1px solid color-mix(in srgb, var(--accent-amber) 50%, transparent)" : "1px solid rgba(255, 255, 255, 0.08)",
                fontWeight: 800,
                fontSize: "0.86rem",
                cursor: !isDirty || isSaving ? "not-allowed" : "pointer",
                boxShadow: isDirty && !isSaving ? "0 4px 16px color-mix(in srgb, var(--accent-amber) 45%, transparent)" : "none",
                opacity: !isDirty && !savedSuccess && !isSaving ? 0.6 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {isSaving ? (
                <>
                  <RotateCcw size={15} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Saving...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        <form
          id="restaurant-settings-form"
          onSubmit={handleSave}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <section
            aria-labelledby="appearance-theme-title"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.45rem" }}>
              <Palette size={18} color="var(--accent-amber)" />
              <h3 id="appearance-theme-title" style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                Appearance &amp; Theme
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "0 0 1rem" }}>
              Choose an accent color to preview it. Save Changes applies it to every user in this restaurant, independently of Light or Dark mode.
            </p>
            <div className="accent-picker-layout">
              <div className="accent-picker-controls">
                <div
                  ref={colorAreaRef}
                  className="accent-picker-saturation"
                  role="slider"
                  tabIndex={0}
                  aria-label="Color saturation and brightness"
                  aria-valuetext={selectedAccent}
                  style={{ "--picker-hue": `hsl(${hue} 100% 50%)` }}
                  onPointerDown={(event) => {
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId);
                    } catch {}
                    isDraggingRef.current = true;
                    pickColorAtPoint(event.clientX, event.clientY, false);
                  }}
                  onPointerMove={(event) => {
                    if (isDraggingRef.current && (event.buttons === 1 || event.pressure > 0)) {
                      pickColorAtPoint(event.clientX, event.clientY, false);
                    }
                  }}
                  onPointerUp={(event) => {
                    isDraggingRef.current = false;
                    try {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    } catch {}
                  }}
                  onPointerCancel={(event) => {
                    isDraggingRef.current = false;
                    try {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    } catch {}
                  }}
                  onLostPointerCapture={() => {
                    isDraggingRef.current = false;
                  }}
                  onKeyDown={(event) => {
                    const step = event.shiftKey ? 10 : 2;
                    const hsv = hexToHsv(selectedAccent);
                    let saturation = hsv.s;
                    let brightness = hsv.v;
                    if (event.key === "ArrowLeft") saturation -= step;
                    else if (event.key === "ArrowRight") saturation += step;
                    else if (event.key === "ArrowUp") brightness += step;
                    else if (event.key === "ArrowDown") brightness -= step;
                    else return;
                    event.preventDefault();
                    previewAccent(hsvToHex(hue, Math.max(0, Math.min(100, saturation)), Math.max(0, Math.min(100, brightness))));
                  }}
                >
                  <span className="accent-picker-handle" style={{ left: `${hexToHsv(selectedAccent).s}%`, top: `${100 - hexToHsv(selectedAccent).v}%` }} />
                </div>
                <label className="accent-picker-hue-label">
                  <span>Hue</span>
                  <input aria-label="Hue" type="range" min="0" max="359" value={hue} onChange={(event) => {
                    const nextHue = Number(event.target.value);
                    const hsv = hexToHsv(selectedAccent);
                    setHue(nextHue);
                    previewAccent(hsvToHex(nextHue, hsv.s, hsv.v));
                  }} />
                </label>
              </div>
              <div className="accent-picker-preview">
                <div className="accent-picker-preview-color" style={{ background: selectedAccent }} aria-label={`Selected color ${selectedAccent}`} />
                <label className="accent-picker-value-field">
                  <span>HEX</span>
                  <input value={hexInput} maxLength={7} spellCheck="false" aria-label="HEX color value" onChange={(event) => {
                    let value = event.target.value;
                    if (!value.startsWith("#")) value = `#${value}`;
                    if (/^#[\da-f]{0,6}$/i.test(value)) {
                      setHexInput(value.toLowerCase());
                      if (/^#[\da-f]{6}$/i.test(value)) previewAccent(value);
                    }
                  }} />
                </label>
                <button type="button" className="accent-picker-copy" aria-label="Copy HEX color" title="Copy HEX" onClick={() => navigator.clipboard?.writeText(selectedAccent)}><Copy size={16} /></button>
                <div className="accent-picker-rgb">RGB <strong>{selectedRgb.join(", ")}</strong></div>
                <label className="accent-picker-native" title="Choose any color">
                  <input type="color" aria-label="Choose any color" value={selectedAccent} onChange={(event) => previewAccent(event.target.value)} />
                  <span>Open color picker</span>
                </label>
                <div className="accent-picker-actions">
                  <button type="button" onClick={() => {
                    const reset = applyAccent("#f59e0b", { persist: false });
                    setSelectedAccent(reset);
                    setHexInput(reset);
                    setHue(hexToHsl(reset).h);
                  }}>Reset</button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 1: Business Identity */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "1rem",
              }}
            >
              <Store size={18} color="var(--accent-amber)" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Restaurant Brand Identity
              </h3>
            </div>

            <div className="responsive-card-grid" style={{ "--responsive-card-min": "280px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={settings.restaurantName}
                  onChange={(e) =>
                    setSettings({ ...settings, restaurantName: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={settings.tagline || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, tagline: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Contact Number
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  GSTIN / Tax Identification
                </label>
                <input
                  type="text"
                  value={settings.gstin}
                  onChange={(e) =>
                    setSettings({ ...settings, gstin: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Restaurant Logo
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    flexWrap: "wrap",
                  }}
                >
                  {settings.logo ? (
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1.5px solid var(--border-card)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: settings.logoBg || "var(--bg-secondary)",
                        flexShrink: 0,
                        padding: "0",
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      <img
                        src={settings.logo}
                        alt="Restaurant logo preview"
                        onLoad={(e) => {
                          const detected = detectImageBgColor(e.target);
                          if (detected && detected !== "transparent") {
                            e.target.parentElement.style.backgroundColor = detected;
                            if (!settings.logoBg) {
                              setSettings((s) => ({ ...s, logoBg: detected }));
                            }
                          }
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--text-dim)",
                        background: "var(--bg-secondary)",
                        border: "1px dashed var(--border-card)",
                        borderRadius: "10px",
                        flexShrink: 0,
                      }}
                    >
                      <Store size={22} />
                    </div>
                  )}
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.58rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-card)",
                      color: "var(--text-main)",
                      background: "var(--bg-secondary)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Upload size={15} />
                    Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  {settings.logo && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettings((current) => {
                          const next = {
                            ...current,
                            logo: "",
                            restaurantLogo: "",
                            logoBg: "",
                            updatedAt: new Date().toISOString(),
                            isUserConfigured: true,
                          };
                          setLastSavedSettings(next);
                          if (onSaveSettings) {
                            onSaveSettings(next).catch((err) => {
                              console.warn("Auto-save remove logo warning:", err);
                            });
                          }
                          try {
                            localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(next));
                            window.dispatchEvent(new Event("storage"));
                            window.dispatchEvent(new Event("restaurant-settings-updated"));
                            window.dispatchEvent(new CustomEvent("avsr-settings-updated", { detail: next }));
                          } catch {}
                          return next;
                        });
                        setLogoError("");
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.58rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        color: "var(--danger)",
                        background: "transparent",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <X size={15} /> Remove
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.58rem 1.15rem",
                      borderRadius: "8px",
                      border: isDirty && !isSaving ? "1px solid color-mix(in srgb, var(--accent-amber) 60%, transparent)" : "1px solid var(--border-card)",
                      color: isDirty && !isSaving ? "#ffffff" : "var(--text-dim)",
                      background: isDirty && !isSaving
                        ? "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-saffron) 100%)"
                        : "var(--bg-secondary)",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: !isDirty || isSaving ? "not-allowed" : "pointer",
                      boxShadow: isDirty && !isSaving ? "0 4px 14px color-mix(in srgb, var(--accent-amber) 45%, transparent)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isSaving ? (
                      <>
                        <RotateCcw size={14} style={{ animation: "spin 1s linear infinite" }} />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Save Logo</span>
                      </>
                    )}
                  </button>
                  <span
                    style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}
                  >
                    Image file, up to 350 KB. Save settings to share it with your other devices.
                  </span>
                </div>
                {logoError && (
                  <div
                    role="alert"
                    style={{
                      color: "var(--danger)",
                      fontSize: "0.75rem",
                      marginTop: "0.4rem",
                    }}
                  >
                    {logoError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Tax & Rates */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "1rem",
              }}
            >
              <Percent size={18} color="var(--success)" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Taxes & Service Charges
              </h3>
            </div>

            <div className="responsive-card-grid" style={{ "--responsive-card-min": "240px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Food GST / Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.taxRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      taxRate: Number(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Service Charge Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.serviceChargeRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      serviceChargeRate: Number(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.serviceChargeEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      serviceChargeEnabled: e.target.checked,
                    })
                  }
                  style={{ accentColor: "var(--accent-amber)" }}
                />
                Enable service charge option on orders
              </label>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Bill Total Rounding
                </label>
                <select
                  value={settings.roundingMode}
                  onChange={(e) =>
                    setSettings({ ...settings, roundingMode: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                >
                  <option value="rupee">Nearest ₹1</option>
                  <option value="five">Nearest ₹5</option>
                  <option value="none">No rounding</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings({ ...settings, currency: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Payment QR Codes Configuration */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            {/* Section Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "1.15rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <QrCode size={18} color="var(--accent-amber)" />
                <div>
                  <h3
                    style={{
                      fontSize: "0.98rem",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      margin: 0,
                    }}
                  >
                    Payment QR Codes Configuration
                  </h3>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Click on any QR card below to select which QR should be active for POS settlements. Save configuration to apply.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#10b981",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Lock size={11} strokeWidth={2.4} />
                  OTP Protected Stream
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--accent-amber)",
                    background: "color-mix(in srgb, var(--accent-amber) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent)",
                    padding: "3px 10px",
                    borderRadius: "20px",
                  }}
                >
                  3 QR Slots (Click to Select Active)
                </span>
              </div>
            </div>

            {/* 3 Upload Cards Grid */}
            <div className="responsive-card-grid" style={{ "--responsive-card-min": "270px", "--responsive-card-gap": "1.1rem" }}>
              {(settings.paymentQrs || DEFAULT_PAYMENT_QRS).map((qr, index) => {
                const hasImage = Boolean(qr.image);
                const isSelected = Boolean(
                  hasImage &&
                  (settings.selectedQrId
                    ? qr.id === settings.selectedQrId
                    : qr.active)
                );

                return (
                  <div
                    key={qr.id || index}
                    onClick={() => {
                      if (hasImage && !isSelected) {
                        requestUpiChange({ type: "select_active", index });
                      }
                    }}
                    title={
                      isSelected
                        ? "Currently active in POS settlement"
                        : hasImage
                        ? "Click to select this QR for POS"
                        : "Upload QR image first"
                    }
                    style={{
                      background: isSelected
                        ? "linear-gradient(145deg, color-mix(in srgb, var(--accent-amber) 12%, transparent) 0%, var(--bg-card) 100%)"
                        : "var(--bg-secondary)",
                      border: isSelected
                        ? "2px solid var(--accent-amber)"
                        : hasImage
                        ? "1px solid rgba(var(--surface-rgb),0.14)"
                        : "1px dashed rgba(var(--surface-rgb),0.18)",
                      boxShadow: isSelected
                        ? "0 0 20px color-mix(in srgb, var(--accent-amber) 28%, transparent), 0 4px 14px rgba(0, 0, 0, 0.5)"
                        : "0 2px 8px rgba(0, 0, 0, 0.2)",
                      borderRadius: "14px",
                      padding: "1.05rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                      cursor: hasImage ? "pointer" : "default",
                      position: "relative",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: isSelected ? "scale(1.015)" : "scale(1)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && hasImage) {
                        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent-amber) 60%, transparent)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = hasImage
                          ? "rgba(var(--surface-rgb),0.14)"
                          : "rgba(var(--surface-rgb),0.18)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {/* Slot Header with Radio & Active Status */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Radio Disc Indicator */}
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            border: isSelected
                              ? "5px solid #10b981"
                              : hasImage
                              ? "2px solid rgba(var(--surface-rgb),0.3)"
                              : "1.5px dashed rgba(var(--surface-rgb),0.2)",
                            background: isSelected ? "#ffffff" : "transparent",
                            boxShadow: isSelected ? "0 0 10px rgba(16, 185, 129, 0.7)" : "none",
                            transition: "all 0.15s ease",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            color: isSelected ? "var(--success)" : "var(--text-main)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          QR Slot #{index + 1}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isSelected ? (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              padding: "2.5px 9px",
                              borderRadius: "12px",
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "#ffffff",
                              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
                              border: "1px solid rgba(16, 185, 129, 0.6)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              letterSpacing: "0.04em",
                            }}
                          >
                            <CheckCircle2 size={11} strokeWidth={3} />
                            ACTIVE
                          </span>
                        ) : hasImage ? (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: "12px",
                              background: "var(--surface-tint)",
                              color: "var(--text-dim)",
                              border: "1px dashed rgba(var(--surface-rgb),0.2)",
                            }}
                          >
                            Click to Select
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Editable Label */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.73rem",
                          color: "var(--text-dim)",
                          marginBottom: "4px",
                          fontWeight: 600,
                        }}
                      >
                        QR / Counter Label
                      </label>
                      <input
                        type="text"
                        value={qr.label || ""}
                        placeholder={`e.g. Counter ${index + 1} UPI`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateQrLabel(index, e.target.value)}
                        style={{
                          width: "100%",
                          background: "var(--bg-tertiary)",
                          border: isSelected
                            ? "1px solid color-mix(in srgb, var(--accent-amber) 40%, transparent)"
                            : "1px solid var(--border-card)",
                          borderRadius: "8px",
                          padding: "0.55rem 0.75rem",
                          color: "var(--text-main)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* QR Image Preview Area */}
                    <div
                      style={{
                        background: "var(--bg-tertiary)",
                        border: qr.image
                          ? "1px solid rgba(var(--surface-rgb),0.08)"
                          : "1.5px dashed rgba(var(--surface-rgb),0.16)",
                        borderRadius: "10px",
                        minHeight: "155px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.85rem",
                      }}
                    >
                      {qr.image ? (
                        <div
                          style={{
                            background: "var(--bg-card)",
                            padding: "6px",
                            borderRadius: "8px",
                            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
                            display: "inline-flex",
                          }}
                        >
                          <img
                            src={qr.image}
                            alt={qr.label || `QR ${index + 1}`}
                            style={{
                              width: "120px",
                              height: "120px",
                              objectFit: "contain",
                              display: "block",
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                            color: "var(--text-dim)",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "42px",
                              height: "42px",
                              borderRadius: "10px",
                              background: "var(--surface-tint)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <QrCode size={22} color="var(--text-dim)" />
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                            No QR Image Uploaded
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            Click upload below (PNG / JPG)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRefs[index]}
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          requestUpiChange({ type: "upload_image", index, file });
                        }
                        e.target.value = "";
                      }}
                    />

                    {/* Upload & Action Buttons */}
                    <div style={{ display: "flex", gap: "0.45rem", marginTop: "auto" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs[index].current?.click();
                        }}
                        style={{
                          flex: 1,
                          background: qr.image
                            ? "color-mix(in srgb, var(--accent-amber) 14%, transparent)"
                            : "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-saffron) 100%)",
                          border: qr.image
                            ? "1px solid color-mix(in srgb, var(--accent-amber) 35%, transparent)"
                            : "none",
                          borderRadius: "8px",
                          padding: "0.55rem 0.75rem",
                          color: qr.image ? "var(--accent-amber-light)" : "var(--text-on-accent)",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.92";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <Upload size={13} />
                        <span>{qr.image ? "Change QR Image" : "Upload QR Image"}</span>
                      </button>

                      {qr.image && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestUpiChange({ type: "remove_image", index });
                          }}
                          style={{
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.28)",
                            borderRadius: "8px",
                            padding: "0.55rem 0.65rem",
                            color: "var(--danger)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}
                          title="Remove this QR image"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)")}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Receipt Template */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "1rem",
              }}
            >
              <Receipt size={18} color="var(--info)" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Customer Receipt Messages
              </h3>
            </div>

            <div className="responsive-card-grid" style={{ "--responsive-card-min": "280px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Header Welcome Text
                </label>
                <input
                  type="text"
                  value={settings.receiptHeader}
                  onChange={(e) =>
                    setSettings({ ...settings, receiptHeader: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Footer Greeting Text
                </label>
                <input
                  type="text"
                  value={settings.receiptFooter}
                  onChange={(e) =>
                    setSettings({ ...settings, receiptFooter: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                {[
                  ["receiptShowLogo", "Show restaurant logo"],
                  ["receiptShowContact", "Show address, phone and GSTIN"],
                  ["receiptShowTaxBreakdown", "Show GST breakdown"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      color: "var(--text-main)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) =>
                        setSettings({ ...settings, [key]: e.target.checked })
                      }
                      style={{ accentColor: "var(--accent-amber)" }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Inventory Alerts */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "1rem",
              }}
            >
              <Package size={18} color="var(--accent-amber)" />
              <h3
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Inventory Alerts
              </h3>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={settings.lowStockAlertsEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lowStockAlertsEnabled: e.target.checked,
                  })
                }
                style={{ accentColor: "var(--accent-amber)" }}
              />
              Show low-stock alert in Inventory when items reach their
              individual thresholds
            </label>
          </div>

          {/* ================= BAR & DINE HEADER TOGGLE SWITCH ================= */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "12px",
              padding: "1.15rem 1.35rem",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1.25rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                flex: 1,
                minWidth: "260px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: isBarToggleOn
                    ? "color-mix(in srgb, var(--accent-amber) 15%, transparent)"
                    : "var(--bg-tertiary)",
                  color: isBarToggleOn ? "var(--accent-saffron)" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <Wine size={22} />
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      margin: 0,
                    }}
                  >
                    Dine & Bar Mode Header Switcher
                  </h3>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: isBarToggleOn
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(100, 116, 139, 0.15)",
                      color: isBarToggleOn ? "var(--success)" : "#64748b",
                      border: isBarToggleOn
                        ? "1px solid rgba(16, 185, 129, 0.3)"
                        : "1px solid rgba(100, 116, 139, 0.2)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isBarToggleOn ? "ENABLED (SHOWN)" : "DISABLED (HIDDEN)"}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    margin: "4px 0 0 0",
                    lineHeight: 1.45,
                  }}
                >
                  Turn ON to show the [Dine | Bar] toggle button in the top header. Turn OFF to hide it from the header.
                </p>
              </div>
            </div>

            {/* Interactive Toggle Switch Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: isBarToggleOn ? "var(--accent-saffron)" : "var(--text-muted)",
                }}
              >
                {isBarToggleOn ? "On" : "Off"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isBarToggleOn}
                onClick={() => handleToggleBarHeader(!isBarToggleOn)}
                style={{
                  width: "56px",
                  height: "30px",
                  borderRadius: "30px",
                  background: isBarToggleOn
                    ? "linear-gradient(135deg, var(--accent-amber), var(--accent-saffron))"
                    : "var(--border-subtle)",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.25s ease, box-shadow 0.25s ease",
                  boxShadow: isBarToggleOn
                    ? "0 2px 10px color-mix(in srgb, var(--accent-saffron) 40%, transparent)"
                    : "inset 0 1px 3px rgba(0,0,0,0.2)",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: isBarToggleOn ? "29px" : "3px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--bg-card)",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                    transition: "left 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </button>
            </div>
          </div>

          {saveError && (
            <div
              role="alert"
              style={{
                color: "var(--danger)",
                fontSize: "0.82rem",
                fontWeight: 700,
              }}
            >
              {saveError}
            </div>
          )}
        </form>
      </div>
      {/* High-Security OTP Verification Modal for Changing UPI Stream */}
      <UpiOtpVerificationModal
        isOpen={upiOtpModalOpen}
        onClose={() => {
          setUpiOtpModalOpen(false);
          setPendingUpiAction(null);
        }}
        onVerified={handleUpiOtpVerified}
        actionDetails={pendingUpiAction}
        adminEmail={adminEmail}
        adminName={adminName}
        isLight={isLight}
      />
    </div>
  );
}
