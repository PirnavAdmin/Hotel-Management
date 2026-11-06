const configuredApiBase = import.meta.env.VITE_API_BASE_URL || "";

// The frontend .env value is the one source of truth for API requests.
export const API_BASE_URL = configuredApiBase.trim().replace(/\/$/, "");

// Actual API calls go directly to the configured server in every mode.
export const API_HTTP_BASE = API_BASE_URL;
// These app-state endpoints are served by Vite's local sync middleware in dev.
export const API_SYNC_BASE = import.meta.env.DEV ? "" : API_BASE_URL;
export const apiUrl = (path) => `${API_HTTP_BASE}${path.startsWith("/") ? path : `/${path}`}`;

// Keep development SSE on Vite for LAN state broadcasts; production uses the API.
const EVENTS_URL = import.meta.env.DEV
  ? "/api/events"
  : `${API_BASE_URL.replace(/\/$/, "")}/api/events`;

export function openOptionalEventStream() {
  if (typeof EventSource === "undefined") return null;

  try {
    const stream = new EventSource(EVENTS_URL);
    // EventSource retries automatically. This stream is an optional UI sync
    // enhancement, so stop after a failure instead of retrying indefinitely.
    stream.onerror = () => stream.close();
    return stream;
  } catch {
    return null;
  }
}

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

const inFlightGetRequests = new Map();

async function performApiRequest(endpoint, options = {}) {
  const { remoteOnly: _remoteOnly, ...requestOptions } = options;
  const url = apiUrl(endpoint);

  try {
    const token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("avsr_jwt_token")
        : null;

    const headers = {
      ...DEFAULT_HEADERS,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const config = {
      ...requestOptions,
      headers,
    };

    const res = await fetch(url, config);

    if (res.status === 401 || res.status === 403) {
      // Handle unauthorized (optional: dispatch event or clear storage)
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // Not JSON
      }

      const validationErrors = errorJson?.errors;
      const validationMessages =
        validationErrors && typeof validationErrors === "object"
          ? Object.entries(validationErrors).flatMap(([field, messages]) =>
              (Array.isArray(messages) ? messages : [messages]).map(
                (message) => `${field}: ${message}`,
              ),
            )
          : [];
      let displayError =
        validationMessages.join("; ") ||
        errorJson?.message ||
        errorJson?.error ||
        errorJson?.detail ||
        errorJson?.title;

      if (!displayError) {
        if (
          errorText.includes("Microsoft.AspNetCore") ||
          errorText.includes("System.") ||
          errorText.includes("Exception")
        ) {
          displayError = `Backend Server Error (500): Unhandled exception in backend controller. Check server logs.`;
        } else if (errorText.length > 200) {
          displayError = `Server Error (${res.status}): ${errorText.substring(0, 150)}...`;
        } else {
          displayError = errorText || `HTTP Error ${res.status}`;
        }
      }

      return {
        success: false,
        error: displayError,
        rawError: errorText,
        status: res.status,
      };
    }

    // Some endpoints might return empty response (like 204 No Content)
    const text = await res.text();
    if (!text) {
      return { success: true, data: null };
    }

    if (text.trim().startsWith('<') || res.headers.get('content-type')?.includes('text/html') || text.includes('ERR_NGROK')) {
      const isNgrok = text.includes('ngrok') || text.includes('ERR_NGROK') || (API_BASE_URL && API_BASE_URL.includes('ngrok'));
      const isViteFallback = text.includes('<!doctype html>') || text.includes('<div id="root">');
      let msg = `Backend API returned HTML instead of JSON (HTTP ${res.status}).`;
      if (isNgrok) {
        msg = 'The ngrok backend tunnel is offline or expired. Make sure ngrok and your backend server are running.';
      } else if (isViteFallback) {
        msg = `The backend API server is offline or route ${endpoint} is unhandled.`;
      }
      return {
        success: false,
        error: msg,
        rawError: text,
        status: res.status,
      };
    }

    try {
      const data = JSON.parse(text);
      return { success: true, data };
    } catch {
      return {
        success: false,
        error: 'Invalid response format: server returned unparseable response.',
        rawError: text,
        status: res.status,
      };
    }
  } catch (err) {
    return { success: false, error: err.message || "Network error occurred" };
  }
}

/** Share concurrent identical GETs (including React StrictMode remounts). */
export function apiClient(endpoint, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET" || options.signal) {
    return performApiRequest(endpoint, options);
  }

  let token = "";
  try {
    token = typeof localStorage !== "undefined"
      ? localStorage.getItem("avsr_jwt_token") || ""
      : "";
  } catch {
    // The request layer still supports environments where storage is blocked.
  }
  const key = JSON.stringify({
    url: `${API_BASE_URL}${endpoint}`,
    token,
    remoteOnly: Boolean(options.remoteOnly),
    headers: options.headers || {},
  });
  const existing = inFlightGetRequests.get(key);
  if (existing) return existing;

  const request = performApiRequest(endpoint, options).finally(() => {
    if (inFlightGetRequests.get(key) === request) inFlightGetRequests.delete(key);
  });
  inFlightGetRequests.set(key, request);
  return request;
}
