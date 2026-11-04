/**
 * Comprehensive Console Logging & Debugging System for AVSR Gourmet POS
 * 
 * Provides centralized, structured, color-coded logging for:
 * - [API REQUEST]: Outgoing HTTP calls with method, url, redacted headers & body
 * - [API RESPONSE]: Incoming HTTP responses with status, duration (ms), redacted data
 * - [API ERROR]: Network failures, 4xx/5xx errors, timeouts, invalid formats
 * - [ROUTE CHANGE]: Page navigation & tab switching
 * - [FORM SUBMISSION]: Form submissions & field validation failures
 * - [USER ACTION]: Important user interactions (orders, KOT, settlement, inventory, etc.)
 * - [APP ERROR]: Unhandled exceptions, promise rejections & React ErrorBoundary events
 * - [STATE]: Component state transitions (when debugging)
 * 
 * Security:
 * - Automatically redacts passwords, PINs, tokens, secrets, auth headers, and payment info.
 * - Non-intrusive: Will never crash the application or alter business logic.
 * - Configurable: Enabled in DEV by default. In production, toggleable via localStorage
 *   or window.enablePosLogging() / window.disablePosLogging().
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "oldpassword",
  "confirmpassword",
  "pass",
  "pin",
  "token",
  "jwt",
  "jwt_token",
  "authorization",
  "auth",
  "secret",
  "apikey",
  "api_key",
  "key",
  "cookie",
  "set-cookie",
  "cvv",
  "cvc",
  "cardnumber",
  "card_number",
  "creditcard",
  "accno",
  "accountnumber",
  "otp",
  "access_token",
  "refresh_token",
  "bearer",
]);

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

/** Check if debugging/logging is enabled */
export function isLoggingEnabled() {
  if (typeof window === "undefined") return true;
  if (window.__ENABLE_LOGS__ === true) return true;
  if (window.__ENABLE_LOGS__ === false) return false;
  try {
    const stored = window.localStorage?.getItem("DEBUG_LOGGING");
    if (stored === "true" || stored === "1") return true;
    if (stored === "false" || stored === "0") return false;
  } catch {}
  return Boolean(import.meta?.env?.DEV);
}

/** Expose global console helper controls in window */
if (typeof window !== "undefined") {
  window.enablePosLogging = () => {
    try {
      window.localStorage?.setItem("DEBUG_LOGGING", "true");
    } catch {}
    window.__ENABLE_LOGS__ = true;
    console.log("%c[LOGGER] POS Debug Logging ENABLED across the application.", "color: #10b981; font-weight: bold; font-size: 1.1em;");
  };
  window.disablePosLogging = () => {
    try {
      window.localStorage?.setItem("DEBUG_LOGGING", "false");
    } catch {}
    window.__ENABLE_LOGS__ = false;
    console.log("%c[LOGGER] POS Debug Logging DISABLED.", "color: #ef4444; font-weight: bold; font-size: 1.1em;");
  };
}

/** Recursively deep-clone and redact sensitive keys from any object/array */
export function redactSensitiveData(data, seen = new WeakSet()) {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  // Prevent circular reference infinite loops
  if (seen.has(data)) return "[CIRCULAR_REFERENCE]";
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, seen));
  }

  // Handle FormData
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    const redactedForm = {};
    for (const [key, val] of data.entries()) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        redactedForm[key] = "[REDACTED]";
      } else if (val instanceof File) {
        redactedForm[key] = `[File: ${val.name} (${val.size} bytes, ${val.type})]`;
      } else {
        redactedForm[key] = val;
      }
    }
    return redactedForm;
  }

  // Handle URLSearchParams
  if (typeof URLSearchParams !== "undefined" && data instanceof URLSearchParams) {
    const redactedParams = {};
    for (const [key, val] of data.entries()) {
      redactedParams[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : val;
    }
    return redactedParams;
  }

  const redacted = {};
  for (const key of Object.keys(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = redactSensitiveData(data[key], seen);
    }
  }
  return redacted;
}

/** Redact sensitive headers (Authorization, Cookie, etc.) */
export function redactHeaders(headers) {
  if (!headers) return {};
  const clean = {};
  try {
    if (typeof Headers !== "undefined" && headers instanceof Headers) {
      headers.forEach((value, key) => {
        clean[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? "[REDACTED]" : value;
      });
      return clean;
    }
    if (typeof headers === "object") {
      for (const [key, value] of Object.entries(headers)) {
        clean[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? "[REDACTED]" : value;
      }
      return clean;
    }
  } catch {}
  return headers;
}

/** Safely parse string to JSON or return raw string */
function safeParseJson(str) {
  if (typeof str !== "string") return str;
  const trimmed = str.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }
  return str;
}

// -------------------------------------------------------------
// 1. API REQUEST & RESPONSE & ERROR LOGGERS
// -------------------------------------------------------------

/** Log outgoing API Request */
export function logApiRequest({ method = "GET", url, headers, body, params, requestId, timestamp }) {
  if (!isLoggingEnabled()) return;
  try {
    const timeStr = timestamp || new Date().toLocaleTimeString();
    const cleanMethod = String(method).toUpperCase();
    const cleanHeaders = redactHeaders(headers);
    let cleanBody = body;
    if (typeof body === "string") {
      const parsed = safeParseJson(body);
      cleanBody = redactSensitiveData(parsed);
    } else if (body) {
      cleanBody = redactSensitiveData(body);
    }

    const badgeStyle = "background: #1e3a8a; color: #60a5fa; font-weight: 800; padding: 2px 6px; border-radius: 4px;";
    const methodStyle = "color: #38bdf8; font-weight: 900;";
    const urlStyle = "color: #f8fafc; font-weight: 600;";
    const metaStyle = "color: #94a3b8; font-weight: normal; font-size: 0.9em;";

    console.groupCollapsed(
      `%c[API REQUEST]%c ${cleanMethod} %c${url} %c(${timeStr})`,
      badgeStyle,
      methodStyle,
      urlStyle,
      metaStyle
    );

    console.log("%cEndpoint:", "color: #94a3b8; font-weight: bold;", url);
    console.log("%cMethod:", "color: #94a3b8; font-weight: bold;", cleanMethod);
    console.log("%cTimestamp:", "color: #94a3b8; font-weight: bold;", new Date().toISOString());
    if (requestId) {
      console.log("%cRequest ID:", "color: #94a3b8; font-weight: bold;", requestId);
    }
    if (params) {
      console.log("%cQuery Parameters:", "color: #94a3b8; font-weight: bold;", redactSensitiveData(params));
    }
    if (cleanHeaders && Object.keys(cleanHeaders).length > 0) {
      console.log("%cHeaders (Redacted):", "color: #94a3b8; font-weight: bold;", cleanHeaders);
    }
    if (cleanBody !== undefined && cleanBody !== null) {
      console.log("%cPayload / Body (Redacted):", "color: #94a3b8; font-weight: bold;", cleanBody);
    }

    console.groupEnd();
  } catch (err) {
    console.warn("Logger error in logApiRequest:", err);
  }
}

/** Log incoming API Response */
export function logApiResponse({ method = "GET", url, status = 200, data, durationMs, requestId, timestamp }) {
  if (!isLoggingEnabled()) return;
  try {
    const timeStr = timestamp || new Date().toLocaleTimeString();
    const cleanMethod = String(method).toUpperCase();
    const isSuccess = Number(status) >= 200 && Number(status) < 300;
    const badgeColor = isSuccess ? "#065f46" : "#7c2d12";
    const textColor = isSuccess ? "#34d399" : "#fb923c";

    const badgeStyle = `background: ${badgeColor}; color: ${textColor}; font-weight: 800; padding: 2px 6px; border-radius: 4px;`;
    const statusStyle = `color: ${textColor}; font-weight: 900;`;
    const urlStyle = "color: #f8fafc; font-weight: 600;";
    const durationStyle = "color: #fbbf24; font-weight: 700;";
    const metaStyle = "color: #94a3b8; font-weight: normal; font-size: 0.9em;";

    const cleanData = redactSensitiveData(data);

    console.groupCollapsed(
      `%c[API RESPONSE]%c ${status} %c${cleanMethod} ${url} %c${durationMs != null ? `${durationMs}ms` : ""} %c(${timeStr})`,
      badgeStyle,
      statusStyle,
      urlStyle,
      durationStyle,
      metaStyle
    );

    console.log("%cStatus Code:", "color: #94a3b8; font-weight: bold;", status);
    console.log("%cDuration:", "color: #94a3b8; font-weight: bold;", `${durationMs}ms`);
    console.log("%cTimestamp:", "color: #94a3b8; font-weight: bold;", new Date().toISOString());
    if (requestId) {
      console.log("%cRequest ID:", "color: #94a3b8; font-weight: bold;", requestId);
    }
    if (cleanData !== undefined) {
      console.log("%cResponse Data:", "color: #94a3b8; font-weight: bold;", cleanData);
    }

    console.groupEnd();
  } catch (err) {
    console.warn("Logger error in logApiResponse:", err);
  }
}

/** Log API Error or Failed Request */
export function logApiError({ method = "GET", url, status, error, durationMs, requestId, rawResponse, stack, timestamp }) {
  if (!isLoggingEnabled()) return;
  try {
    const timeStr = timestamp || new Date().toLocaleTimeString();
    const cleanMethod = String(method).toUpperCase();
    const displayStatus = status || "NETWORK_FAILURE";

    const badgeStyle = "background: #7f1d1d; color: #f87171; font-weight: 800; padding: 2px 6px; border-radius: 4px;";
    const statusStyle = "color: #f87171; font-weight: 900;";
    const urlStyle = "color: #fca5a5; font-weight: 600;";
    const metaStyle = "color: #cbd5e1; font-weight: normal; font-size: 0.9em;";

    const cleanError = typeof error === "object" ? redactSensitiveData(error) : error;

    console.groupCollapsed(
      `%c[API ERROR]%c ${displayStatus} %c${cleanMethod} ${url} %c(${timeStr})`,
      badgeStyle,
      statusStyle,
      urlStyle,
      metaStyle
    );

    console.error("%cError Details:", "color: #ef4444; font-weight: bold;", cleanError);
    console.log("%cStatus Code:", "color: #94a3b8; font-weight: bold;", displayStatus);
    if (durationMs != null) {
      console.log("%cDuration:", "color: #94a3b8; font-weight: bold;", `${durationMs}ms`);
    }
    console.log("%cEndpoint:", "color: #94a3b8; font-weight: bold;", url);
    console.log("%cTimestamp:", "color: #94a3b8; font-weight: bold;", new Date().toISOString());
    if (requestId) {
      console.log("%cRequest ID:", "color: #94a3b8; font-weight: bold;", requestId);
    }
    if (rawResponse) {
      console.log("%cRaw Error Response:", "color: #94a3b8; font-weight: bold;", rawResponse);
    }
    if (stack) {
      console.log("%cStack Trace:", "color: #94a3b8; font-weight: bold;", stack);
    }

    console.groupEnd();
  } catch (err) {
    console.warn("Logger error in logApiError:", err);
  }
}

// -------------------------------------------------------------
// 2. APPLICATION ACTIVITIES (ROUTES, FORMS, USER ACTIONS, ERRORS)
// -------------------------------------------------------------

/** Log Page Navigation & Route Changes */
export function logRouteChange(from, to, meta = {}) {
  if (!isLoggingEnabled()) return;
  try {
    const badgeStyle = "background: #4c1d95; color: #c084fc; font-weight: 800; padding: 2px 6px; border-radius: 4px;";
    const routeStyle = "color: #e9d5ff; font-weight: 700;";
    console.log(
      `%c[ROUTE CHANGE]%c ${from || "(initial)"} ➔ ${to}`,
      badgeStyle,
      routeStyle,
      Object.keys(meta).length ? meta : ""
    );
  } catch {}
}

/** Log Form Submissions & Validation Failures */
export function logFormSubmission(formName, data = {}, isValid = true, validationErrors = null) {
  if (!isLoggingEnabled()) return;
  try {
    const timeStr = new Date().toLocaleTimeString();
    const cleanData = redactSensitiveData(data);
    const badgeColor = isValid ? "#14532d" : "#7f1d1d";
    const textColor = isValid ? "#4ade80" : "#f87171";
    const statusText = isValid ? "VALID / SUBMITTED" : "VALIDATION FAILED";

    const badgeStyle = `background: ${badgeColor}; color: ${textColor}; font-weight: 800; padding: 2px 6px; border-radius: 4px;`;
    const nameStyle = "color: #f8fafc; font-weight: 800;";
    const statusStyle = `color: ${textColor}; font-weight: 700;`;

    console.groupCollapsed(
      `%c[FORM SUBMISSION]%c ${formName} %c[${statusText}] (${timeStr})`,
      badgeStyle,
      nameStyle,
      statusStyle
    );

    console.log("%cForm Name:", "color: #94a3b8; font-weight: bold;", formName);
    console.log("%cSubmitted Values (Redacted):", "color: #94a3b8; font-weight: bold;", cleanData);

    if (!isValid && validationErrors) {
      console.warn("%cValidation Errors:", "color: #ef4444; font-weight: bold;", validationErrors);
      if (Array.isArray(validationErrors)) {
        try { console.table(validationErrors); } catch {}
      } else if (typeof validationErrors === "object") {
        try { console.table(validationErrors); } catch {}
      }
    }

    console.groupEnd();
  } catch (err) {
    console.warn("Logger error in logFormSubmission:", err);
  }
}

/** Log Significant User Actions */
export function logUserAction(actionName, details = {}) {
  if (!isLoggingEnabled()) return;
  try {
    const badgeStyle = "background: #78350f; color: #fbbf24; font-weight: 800; padding: 2px 6px; border-radius: 4px;";
    const actionStyle = "color: #fef3c7; font-weight: 700;";
    const cleanDetails = redactSensitiveData(details);
    console.log(
      `%c[USER ACTION]%c ${actionName}`,
      badgeStyle,
      actionStyle,
      cleanDetails && Object.keys(cleanDetails).length ? cleanDetails : ""
    );
  } catch {}
}

/** Log Component / View State Transitions */
export function logAppState(scope, stateName, value) {
  if (!isLoggingEnabled()) return;
  try {
    const badgeStyle = "background: #831843; color: #f472b6; font-weight: 800; padding: 2px 6px; border-radius: 4px;";
    const scopeStyle = "color: #fbcfe8; font-weight: 700;";
    console.log(
      `%c[APP STATE]%c [${scope}] ${stateName}:`,
      badgeStyle,
      scopeStyle,
      redactSensitiveData(value)
    );
  } catch {}
}

/** Log Unexpected Application Errors & React ErrorBoundary Catches */
export function logAppError(source, error, errorInfo = null) {
  if (!isLoggingEnabled()) return;
  try {
    const timeStr = new Date().toLocaleTimeString();
    const badgeStyle = "background: #881337; color: #fb7185; font-weight: 800; padding: 2px 6px; border-radius: 4px;";
    const sourceStyle = "color: #fecdd3; font-weight: 800;";

    console.groupCollapsed(
      `%c[APP ERROR]%c ${source} (${timeStr})`,
      badgeStyle,
      sourceStyle
    );

    console.error("%cError Object:", "color: #f43f5e; font-weight: bold;", error);
    if (error?.message) {
      console.log("%cMessage:", "color: #94a3b8; font-weight: bold;", error.message);
    }
    if (error?.stack) {
      console.log("%cStack:", "color: #94a3b8; font-weight: bold;", error.stack);
    }
    if (errorInfo) {
      console.log("%cComponent Stack / Info:", "color: #94a3b8; font-weight: bold;", errorInfo);
    }

    console.groupEnd();
  } catch (err) {
    console.warn("Logger error in logAppError:", err);
  }
}

// -------------------------------------------------------------
// 3. GLOBAL FETCH INTERCEPTOR (COVERS 100% OF OUTGOING NETWORK CALLS)
// -------------------------------------------------------------

let isInterceptorInstalled = false;

/**
 * Transparently wraps window.fetch so that every HTTP call across all components,
 * services, and modules is logged automatically without duplicating logs or altering responses.
 */
export function installGlobalFetchInterceptor() {
  if (typeof window === "undefined" || !window.fetch) return;
  if (isInterceptorInstalled) return;
  isInterceptorInstalled = true;

  const originalFetch = window.fetch;

  window.fetch = async function interceptedFetch(input, init = {}) {
    const startTime = performance.now();
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toLocaleTimeString();

    // Determine target URL and HTTP method
    let url = typeof input === "string" ? input : (input instanceof Request ? input.url : String(input));
    let method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

    // Skip internal browser telemetry or noise if any
    const isViteHmr = url.includes("/@vite/") || url.includes("/@react-refresh");
    if (isViteHmr) {
      return originalFetch.apply(this, arguments);
    }

    // Extract headers
    let headers = init?.headers || (input instanceof Request ? input.headers : {});

    // Extract body
    let body = init?.body || (input instanceof Request ? input.body : null);

    // Check if this request is already handled by custom manual logger flag
    const skipLogging = init?.headers?.["x-skip-logging"] || (headers instanceof Headers && headers.get("x-skip-logging"));

    if (!skipLogging && isLoggingEnabled()) {
      logApiRequest({
        method,
        url,
        headers,
        body,
        requestId,
        timestamp,
      });
    }

    try {
      const response = await originalFetch.apply(this, arguments);
      const durationMs = Math.round(performance.now() - startTime);

      if (!skipLogging && isLoggingEnabled()) {
        // Clone response to safely inspect body without locking the stream for caller
        try {
          const clone = response.clone();
          const contentType = clone.headers.get("content-type") || "";
          
          if (contentType.includes("application/json") || contentType.includes("text/")) {
            clone.text().then((text) => {
              const data = safeParseJson(text);
              if (response.ok) {
                logApiResponse({
                  method,
                  url,
                  status: response.status,
                  data,
                  durationMs,
                  requestId,
                  timestamp: new Date().toLocaleTimeString(),
                });
              } else {
                logApiError({
                  method,
                  url,
                  status: response.status,
                  error: data?.message || data?.error || data || response.statusText,
                  durationMs,
                  requestId,
                  rawResponse: text,
                  timestamp: new Date().toLocaleTimeString(),
                });
              }
            }).catch(() => {
              if (response.ok) {
                logApiResponse({ method, url, status: response.status, durationMs, requestId });
              } else {
                logApiError({ method, url, status: response.status, error: response.statusText, durationMs, requestId });
              }
            });
          } else {
            // Binary or stream data (PDFs, images)
            if (response.ok) {
              logApiResponse({
                method,
                url,
                status: response.status,
                data: `[Binary/Blob: ${contentType || "unknown"}]`,
                durationMs,
                requestId,
              });
            } else {
              logApiError({
                method,
                url,
                status: response.status,
                error: `HTTP Error ${response.status} ${response.statusText}`,
                durationMs,
                requestId,
              });
            }
          }
        } catch {
          if (response.ok) {
            logApiResponse({ method, url, status: response.status, durationMs, requestId });
          } else {
            logApiError({ method, url, status: response.status, error: response.statusText, durationMs, requestId });
          }
        }
      }

      return response;
    } catch (networkError) {
      const durationMs = Math.round(performance.now() - startTime);
      if (!skipLogging && isLoggingEnabled()) {
        logApiError({
          method,
          url,
          status: "NETWORK_ERROR",
          error: networkError.message || "Failed to fetch / Connection refused",
          durationMs,
          requestId,
          stack: networkError.stack,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      throw networkError;
    }
  };
}

// -------------------------------------------------------------
// 4. GLOBAL ERROR LISTENERS (CATCHES UNHANDLED PROMISES & JS ERRORS)
// -------------------------------------------------------------

let isGlobalErrorsInstalled = false;

export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") return;
  if (isGlobalErrorsInstalled) return;
  isGlobalErrorsInstalled = true;

  window.addEventListener("error", (event) => {
    logAppError("Window Unhandled Error", event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logAppError("Unhandled Promise Rejection", event.reason || "Promise rejected without reason", {
      reason: event.reason,
    });
  });
}

export default {
  isLoggingEnabled,
  redactSensitiveData,
  redactHeaders,
  logApiRequest,
  logApiResponse,
  logApiError,
  logRouteChange,
  logFormSubmission,
  logUserAction,
  logAppState,
  logAppError,
  installGlobalFetchInterceptor,
  installGlobalErrorHandlers,
};
