import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiClient } from "../api/apiConfig";
import { applyAccent } from "../utils/accentColor";
import {
  startRealtimeSession,
  stopRealtimeSession,
  subscribeToRealtimeEvents,
  subscribeToRealtimeStatus,
} from "./realtimeService";

const RealTimeContext = createContext(null);

function getCurrentSession(pathname) {
  const key = pathname.startsWith("/admin")
    ? "avsr_admin_session"
    : pathname.startsWith("/kot")
      ? "avsr_kot_session"
      : "avsr_pos_session";
  try {
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem("avsr_auth_session_v1") || "null");
  } catch {
    return null;
  }
}

function getConnectionRole(pathname, session) {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/kot")) return "kot";
  return String(session?.role || "pos").toLowerCase();
}

export function RealTimeProvider({ children }) {
  const location = useLocation();
  const [authVersion, setAuthVersion] = useState(0);
  const [status, setStatus] = useState({ state: "disconnected", connected: false, hub: "disconnected", sse: "disconnected" });
  const token = typeof localStorage === "undefined" ? "" : localStorage.getItem("avsr_jwt_token") || "";
  const session = getCurrentSession(location.pathname);
  const role = getConnectionRole(location.pathname, session);

  useEffect(() => subscribeToRealtimeStatus((nextStatus) => {
    setStatus(nextStatus);
  }), []);
  useEffect(() => {
    const refreshAuth = (event) => {
      // The app emits synthetic storage events for its local caches. Only a
      // real cross-tab storage update should restart authenticated realtime.
      if (event?.type === "storage" && !event.isTrusted) return;
      setAuthVersion((version) => version + 1);
    };
    window.addEventListener("avsr-auth-changed", refreshAuth);
    window.addEventListener("storage", refreshAuth);
    return () => {
      window.removeEventListener("avsr-auth-changed", refreshAuth);
      window.removeEventListener("storage", refreshAuth);
    };
  }, []);

  // The restaurant theme is shared by every staff session. The backend GET is
  // authoritative; localStorage is only the synchronous startup cache.
  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    let inFlight = null;
    const refreshRestaurantTheme = () => {
      if (inFlight) return inFlight;
      inFlight = apiClient("/api/v1/settings/theme")
        .then((response) => {
          if (!active || !response?.success) return;
          const body = response.data?.data ?? response.data?.Data ?? response.data;
          const accent = body?.accentColor ?? body?.AccentColor;
          if (/^#[\da-f]{6}$/i.test(String(accent || ""))) {
            const normalized = applyAccent(accent);
            console.info("[ThemeSync] Restaurant accent restored from API", {
              restaurantId: body?.restaurantId ?? body?.RestaurantId,
              accentColor: normalized,
            });
            window.dispatchEvent(new CustomEvent("accent-synchronized", { detail: normalized }));
          }
        })
        .catch(() => {})
        .finally(() => { inFlight = null; });
      return inFlight;
    };

    const handleThemeEvent = ({ name, payload }) => {
      if (name !== "restaurantSetting:updated") return;
      // RealtimeEvent.Data is the controller's { restaurantId, accentColor,
      // updatedAt, updatedBy } object. Keep support for both serializer cases.
      const data = payload?.data ?? payload?.Data ?? payload;
      const tenantId = payload?.branchId ?? payload?.BranchId;
      const dataTenantId = data?.restaurantId ?? data?.RestaurantId;
      if (tenantId != null && dataTenantId != null && String(tenantId) !== String(dataTenantId)) return;
      const accent = data?.accentColor ?? data?.AccentColor;
      if (!/^#[\da-f]{6}$/i.test(String(accent || ""))) return;
      console.info("[ThemeSync] restaurantSetting:updated received", {
        restaurantId: dataTenantId ?? tenantId,
        accentColor: String(accent).toLowerCase(),
      });
      const normalized = applyAccent(accent);
      console.info("[ThemeSync] Global theme provider updated", {
        restaurantId: dataTenantId ?? tenantId,
        accentColor: normalized,
      });
      window.dispatchEvent(new CustomEvent("accent-synchronized", { detail: normalized }));
    };

    const unsubscribe = subscribeToRealtimeEvents(handleThemeEvent);
    window.addEventListener("avsr:realtime-reconnected", refreshRestaurantTheme);
    refreshRestaurantTheme();
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("avsr:realtime-reconnected", refreshRestaurantTheme);
    };
  }, [token, authVersion]);

  useEffect(() => {
    if (token) {
      startRealtimeSession(token, role);
      return () => {
        stopRealtimeSession();
      };
    }
    stopRealtimeSession();
    return () => {
      stopRealtimeSession();
    };
  }, [token, role, authVersion]);

  const value = useMemo(() => ({ status, subscribe: subscribeToRealtimeEvents }), [status]);
  return (
    <RealTimeContext.Provider value={value}>
      {children}
      {token && status.state !== "connected" && (
        <div className={`realtime-connection-indicator is-${status.state}`} role="status" aria-live="polite">
          <span className="realtime-connection-dot" aria-hidden="true" />
          <span>
            {status.state === "reconnecting"
              ? "Reconnecting..."
              : status.state === "offline"
                ? "Backend Offline"
                : "Disconnected"}
          </span>
          {status.state === "offline" && (
            <button
              type="button"
              onClick={() => {
                startRealtimeSession(token, role);
              }}
              style={{
                marginLeft: "8px",
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "3px",
                color: "#fff",
                padding: "2px 6px",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </RealTimeContext.Provider>
  );
}

export function useRealTime() {
  return useContext(RealTimeContext) || { status: { state: "disconnected", connected: false }, subscribe: subscribeToRealtimeEvents };
}

export function useRealtimeEvent(eventNames, callback, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const names = Array.isArray(eventNames) ? eventNames : [eventNames];
  const nameKey = names.filter(Boolean).join("|");

  useEffect(() => {
    if (!enabled || !nameKey) return undefined;
    const acceptedNames = new Set(nameKey.split("|"));
    return subscribeToRealtimeEvents((event) => {
      if (acceptedNames.has(event.name)) callbackRef.current(event.payload, event);
    });
  }, [enabled, nameKey]);
}
