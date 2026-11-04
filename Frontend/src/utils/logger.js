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

export const API_LOGGING_CONFIG = Object.freeze({
  enabled: import.meta.env.VITE_API_LOGGING_ENABLED !== "false",
  includeRequestData: import.meta.env.VITE_API_LOGGING_INCLUDE_REQUEST_DATA !== "false",
  includeResponseData: import.meta.env.VITE_API_LOGGING_INCLUDE_RESPONSE_DATA !== "false",
  maxDataChars: 12000,
});

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
  "email",
  "phone",
  "phonenumber",
  "mobile",
  "name",
  "customer",
  "contact",
  "fullname",
  "firstname",
  "lastname",
  "customername",
  "username",
  "address",
  "dateofbirth",
  "dob",
  "nationalid",
  "aadhaar",
  "pan",
  "emailaddress",
  "contactnumber",
  "emergencycontact",
]);

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "x-refresh-token",
]);

const normalizeSensitiveKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
const isSensitiveKey = (key) => {
  const normalized = normalizeSensitiveKey(key);
  return SENSITIVE_KEYS.has(normalized) ||
    normalized.endsWith("password") ||
    normalized.endsWith("token") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("email") ||
    normalized.endsWith("phone") ||
    normalized.endsWith("mobile");
};

export function isApiLoggingEnabled() {
  if (typeof window !== "undefined") {
    if (typeof window.__API_LOGGING_ENABLED__ === "boolean") return window.__API_LOGGING_ENABLED__;
    try {
      const stored = window.localStorage?.getItem("API_LOGGING_ENABLED");
      if (stored === "true" || stored === "1") return true;
      if (stored === "false" || stored === "0") return false;
    } catch {}
  }
  return API_LOGGING_CONFIG.enabled;
}

function safeApiLogData(value, include = true) {
  if (!include || value === undefined) return undefined;
  if (typeof value === "string" && value.length > API_LOGGING_CONFIG.maxDataChars) {
    return "[omitted; " + value.length + " characters]";
  }
  if (value && typeof value === "object" &&
      !(typeof FormData !== "undefined" && value instanceof FormData) &&
      !(typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams)) {
    try {
      const rawSize = JSON.stringify(value)?.length || 0;
      if (rawSize > API_LOGGING_CONFIG.maxDataChars) return "[omitted; " + rawSize + " characters]";
    } catch {}
  }
  const parsed = typeof value === "string" ? safeParseJson(value) : value;
  const redacted = typeof parsed === "string" ? redactText(parsed) : redactSensitiveData(parsed);
  let serialized;
  try {
    serialized = typeof redacted === "string" ? redacted : JSON.stringify(redacted);
  } catch {
    serialized = String(redacted);
  }
  if (serialized.length <= API_LOGGING_CONFIG.maxDataChars) return redacted;
  return serialized.slice(0, API_LOGGING_CONFIG.maxDataChars) + "… [truncated; " + serialized.length + " characters]";
}

function redactUrl(url) {
  try {
    const parsed = new URL(String(url), typeof location !== "undefined" ? location.origin : "http://localhost");
    parsed.searchParams.forEach((value, key) => {
      parsed.searchParams.set(key, isSensitiveKey(key) ? "[REDACTED]" : redactText(value));
    });
    return parsed.href;
  } catch {
    return String(url || "").replace(/([?&](?:token|access_token|refresh_token|password|email|phone|mobile|otp)=)[^&]*/gi, "$1[REDACTED]");
  }
}

function redactText(value) {
  return String(value ?? "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?\d[\d ()-]{7,}\d)\b/g, "[REDACTED_PHONE]")
    .replace(/((?:password|token|secret|authorization|otp|email|phone|mobile)\s*[:=]\s*)[^,;\s&]+/gi, "$1[REDACTED]");
}

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
    window.__API_LOGGING_ENABLED__ = true;
    console.log("%c[LOGGER] POS Debug Logging ENABLED across the application.", "color: #10b981; font-weight: bold; font-size: 1.1em;");
  };
  window.disablePosLogging = () => {
    try {
      window.localStorage?.setItem("DEBUG_LOGGING", "false");
    } catch {}
    window.__ENABLE_LOGS__ = false;
    window.__API_LOGGING_ENABLED__ = false;
    console.log("%c[LOGGER] POS Debug Logging DISABLED.", "color: #ef4444; font-weight: bold; font-size: 1.1em;");
  };
  window.enableApiLogging = () => {
    try { window.localStorage?.setItem("API_LOGGING_ENABLED", "true"); } catch {}
    window.__API_LOGGING_ENABLED__ = true;
    console.info("[LOGGER] API logging enabled.");
  };
  window.disableApiLogging = () => {
    try { window.localStorage?.setItem("API_LOGGING_ENABLED", "false"); } catch {}
    window.__API_LOGGING_ENABLED__ = false;
    console.info("[LOGGER] API logging disabled.");
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
      if (isSensitiveKey(key)) {
        redactedForm[key] = "[REDACTED]";
      } else if (val instanceof File) {
        redactedForm[key] = `[File upload (${val.size} bytes, ${val.type})]`;
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
      redactedParams[key] = isSensitiveKey(key) ? "[REDACTED]" : redactText(val);
    }
    return redactedParams;
  }

  const redacted = {};
  for (const key of Object.keys(data)) {
    if (isSensitiveKey(key)) {
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
        clean[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) || isSensitiveKey(key) ? "[REDACTED]" : value;
      });
      return clean;
    }
    if (typeof headers === "object") {
      for (const [key, value] of Object.entries(headers)) {
        clean[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) || isSensitiveKey(key) ? "[REDACTED]" : redactText(value);
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
  if (!isApiLoggingEnabled()) return;
  try {
    const timeStr = timestamp || new Date().toLocaleTimeString();
    const cleanMethod = String(method).toUpperCase();
    const cleanHeaders = redactHeaders(headers);
    let cleanBody = body;
    if (typeof body === "string") {
      const parsed = safeParseJson(body);
      cleanBody = safeApiLogData(parsed, API_LOGGING_CONFIG.includeRequestData);
    } else if (body) {
      cleanBody = safeApiLogData(body, API_LOGGING_CONFIG.includeRequestData);
    }
    const cleanUrl = redactUrl(url);

    const badgeStyle = "background: #1e3a8a; color: #60a5fa; font-weight: 800; padding: 2px 6px; border-radius: 4px;";
    const methodStyle = "color: #38bdf8; font-weight: 900;";
    const urlStyle = "color: #f8fafc; font-weight: 600;";
    const metaStyle = "color: #94a3b8; font-weight: normal; font-size: 0.9em;";

    console.groupCollapsed(
      `%c[API REQUEST]%c ${cleanMethod} %c${cleanUrl} %c(${timeStr})`,
      badgeStyle,
      methodStyle,
      urlStyle,
      metaStyle
    );

    console.info("%cAPI:", "color: #94a3b8; font-weight: bold;", cleanUrl);
    console.info("%cMethod:", "color: #94a3b8; font-weight: bold;", cleanMethod);
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
export function logApiResponse({ method = "GET", url, status = 200, statusText = "", message = "", data, durationMs, requestId, timestamp }) {
  if (!isApiLoggingEnabled()) return;
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

    const cleanData = safeApiLogData(data, API_LOGGING_CONFIG.includeResponseData);
    const cleanUrl = redactUrl(url);

    console.groupCollapsed(
      `%c[API RESPONSE]%c ${status} %c${cleanMethod} ${cleanUrl} %c${durationMs != null ? `${durationMs}ms` : ""} %c(${timeStr})`,
      badgeStyle,
      statusStyle,
      urlStyle,
      durationStyle,
      metaStyle
    );

    console.info("%cStatus Code:", "color: #94a3b8; font-weight: bold;", status);
    console.info("%cMessage:", "color: #94a3b8; font-weight: bold;", redactText(message || statusText || "Success"));
    console.info("%cDuration:", "color: #94a3b8; font-weight: bold;", `${durationMs}ms`);
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
export function logApiError({ method = "GET", url, status, error, durationMs, requestId, rawResponse, body, networkDetails, stack, timestamp }) {
  if (!isApiLoggingEnabled()) return;
  try {
    const timeStr = timestamp || new Date().toLocaleTimeString();
    const cleanMethod = String(method).toUpperCase();
    const displayStatus = status || "NETWORK_FAILURE";

    const badgeStyle = "background: #7f1d1d; color: #f87171; font-weight: 800; padding: 2px 6px; border-radius: 4px;";
    const statusStyle = "color: #f87171; font-weight: 900;";
    const urlStyle = "color: #fca5a5; font-weight: 600;";
    const metaStyle = "color: #cbd5e1; font-weight: normal; font-size: 0.9em;";

    const cleanError = error instanceof Error
      ? redactText(error.message)
      : safeApiLogData(error, true);
    const cleanBody = safeApiLogData(body, API_LOGGING_CONFIG.includeRequestData);
    const cleanResponse = safeApiLogData(rawResponse, API_LOGGING_CONFIG.includeResponseData);
    const cleanUrl = redactUrl(url);

    console.groupCollapsed(
      `%c[API ERROR]%c ${displayStatus} %c${cleanMethod} ${cleanUrl} %c(${timeStr})`,
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
    console.warn("%cMessage:", "color: #94a3b8; font-weight: bold;", cleanError);
    console.log("%cEndpoint:", "color: #94a3b8; font-weight: bold;", cleanUrl);
    console.log("%cTimestamp:", "color: #94a3b8; font-weight: bold;", new Date().toISOString());
    if (requestId) {
      console.log("%cRequest ID:", "color: #94a3b8; font-weight: bold;", requestId);
    }
    if (cleanResponse !== undefined && cleanResponse !== null) {
      console.log("%cBackend Error Response (Redacted):", "color: #94a3b8; font-weight: bold;", cleanResponse);
    }
    if (cleanBody !== undefined && cleanBody !== null) {
      console.log("%cRequest Payload (Redacted):", "color: #94a3b8; font-weight: bold;", cleanBody);
    }
    if (networkDetails) {
      console.log("%cNetwork Details:", "color: #94a3b8; font-weight: bold;", safeApiLogData(networkDetails));
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
let isEventSourceInterceptorInstalled = false;

export function installGlobalEventSourceInterceptor() {
  if (typeof window === "undefined" || !window.EventSource) return;
  if (isEventSourceInterceptorInstalled || window.EventSource.__apiLoggingInterceptor === true) return;
  isEventSourceInterceptorInstalled = true;

  const NativeEventSource = window.EventSource;
  window.EventSource = new Proxy(NativeEventSource, {
    construct(target, args) {
      const [url] = args;
      const startedAt = performance.now();
      const requestId = "sse_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
      if (isApiLoggingEnabled()) {
        logApiRequest({ method: "GET", url, requestId, timestamp: new Date().toISOString() });
      }
      const source = Reflect.construct(target, args, target);
      let connectionLogged = false;
      source.addEventListener("open", () => {
        if (connectionLogged) return;
        connectionLogged = true;
        logApiResponse({
          method: "GET",
          url,
          status: 200,
          statusText: "Connected",
          message: "Event stream connected",
          durationMs: Math.round(performance.now() - startedAt),
          requestId,
        });
      }, { once: true });
      source.addEventListener("error", () => {
        if (connectionLogged) return;
        connectionLogged = true;
        logApiError({
          method: "GET",
          url,
          status: "EVENT_STREAM_ERROR",
          error: "Event stream connection failed",
          durationMs: Math.round(performance.now() - startedAt),
          requestId,
        });
      }, { once: true });
      return source;
    },
  });
  window.EventSource.__apiLoggingInterceptor = true;
}

/**
 * Transparently wraps window.fetch so that every HTTP call across all components,
 * services, and modules is logged automatically without duplicating logs or altering responses.
 */
export function installGlobalFetchInterceptor() {
  if (typeof window === "undefined" || !window.fetch) return;
  if (isInterceptorInstalled || window.fetch.__apiLoggingInterceptor === true) return;
  isInterceptorInstalled = true;

  const originalFetch = window.fetch;

  window.fetch = async function interceptedFetch(input, init = {}) {
    const startTime = performance.now();
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toISOString();

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
    let body = init?.body ?? null;
    if (body == null && input instanceof Request && input.body) {
      try {
        const requestCopy = input.clone();
        const contentType = requestCopy.headers.get("content-type") || "";
        if (contentType.includes("application/json") || contentType.includes("text/")) {
          body = await requestCopy.text();
        } else {
          body = `[${contentType || "Request body"} omitted]`;
        }
      } catch {
        body = "[Request body unavailable]";
      }
    }

    // Check if this request is already handled by custom manual logger flag
    const skipLogging = Boolean(
      init?.headers?.["x-skip-logging"] ||
      init?.headers?.["X-Skip-Logging"] ||
      (headers instanceof Headers && headers.get("x-skip-logging"))
    );

    if (!skipLogging && isApiLoggingEnabled()) {
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

      if (!skipLogging && isApiLoggingEnabled()) {
        // Clone response to safely inspect body without locking the stream for caller
        try {
          const clone = response.clone();
          const contentType = clone.headers.get("content-type") || "";
          
          if (contentType.includes("application/json") || contentType.includes("text/")) {
            clone.text().then((text) => {
              const data = safeParseJson(text);
              if (response.ok && data?.success !== false) {
                logApiResponse({
                  method,
                  url,
                  status: response.status,
                  statusText: response.statusText,
                  message: data?.message || data?.data?.message || response.statusText || "Success",
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
                  error: data?.message || data?.error || data || response.statusText || "API request failed",
                  durationMs,
                  requestId,
                  rawResponse: data ?? text,
                  body,
                  timestamp: new Date().toLocaleTimeString(),
                });
              }
            }).catch(() => {
              if (response.ok) {
                logApiResponse({ method, url, status: response.status, statusText: response.statusText, durationMs, requestId });
              } else {
                logApiError({ method, url, status: response.status, error: response.statusText, durationMs, requestId, body });
              }
            });
          } else {
            // Binary or stream data (PDFs, images)
            if (response.ok) {
              logApiResponse({
                method,
                url,
                status: response.status,
                statusText: response.statusText,
                data: `[Binary/Blob: ${contentType || "unknown"}]`,
                durationMs,
                requestId,
              });
            } else {
              logApiError({
                method,
                url,
                status: response.status,
                error: `HTTP Error ${response.status} ${redactText(response.statusText)}`,
                durationMs,
                requestId,
                rawResponse: undefined,
                body,
              });
            }
          }
        } catch {
          if (response.ok) {
            logApiResponse({ method, url, status: response.status, statusText: response.statusText, durationMs, requestId });
          } else {
            logApiError({ method, url, status: response.status, error: response.statusText, durationMs, requestId, body });
          }
        }
      }

      return response;
    } catch (networkError) {
      const durationMs = Math.round(performance.now() - startTime);
      if (!skipLogging && isApiLoggingEnabled()) {
        logApiError({
          method,
          url,
          status: networkError?.name === "AbortError" ? "ABORTED_OR_TIMEOUT" : "NETWORK_ERROR",
          error: networkError.message || "Failed to fetch / Connection refused",
          durationMs,
          requestId,
          body,
          networkDetails: {
            name: networkError?.name,
            message: networkError?.message,
            cause: networkError?.cause?.message,
          },
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      throw networkError;
    }
  };
  window.fetch.__apiLoggingInterceptor = true;
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
  API_LOGGING_CONFIG,
  isApiLoggingEnabled,
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
  installGlobalEventSourceInterceptor,
  installGlobalErrorHandlers,
};
