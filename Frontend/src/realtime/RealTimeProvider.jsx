import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const wasConnectedRef = useRef(false);
  const token = typeof localStorage === "undefined" ? "" : localStorage.getItem("avsr_jwt_token") || "";
  const session = getCurrentSession(location.pathname);
  const role = getConnectionRole(location.pathname, session);

  useEffect(() => subscribeToRealtimeStatus((nextStatus) => {
    setStatus(nextStatus);
    if (nextStatus.connected && !wasConnectedRef.current) {
      window.dispatchEvent(new Event("avsr:realtime-reconnected"));
    }
    wasConnectedRef.current = nextStatus.connected;
  }), []);
  useEffect(() => {
    const refreshAuth = () => setAuthVersion((version) => version + 1);
    window.addEventListener("avsr-auth-changed", refreshAuth);
    window.addEventListener("storage", refreshAuth);
    return () => {
      window.removeEventListener("avsr-auth-changed", refreshAuth);
      window.removeEventListener("storage", refreshAuth);
    };
  }, []);

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
          <span>{status.state === "reconnecting" ? "Reconnecting..." : "Offline"}</span>
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
