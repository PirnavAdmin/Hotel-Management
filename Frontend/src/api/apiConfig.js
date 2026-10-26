export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "";

// The Vite dev server provides its own same-origin SSE endpoint for local
// cross-tab/device synchronization. Production can use the configured API.
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

export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

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
      ...options,
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

    const data = JSON.parse(text);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || "Network error occurred" };
  }
}
