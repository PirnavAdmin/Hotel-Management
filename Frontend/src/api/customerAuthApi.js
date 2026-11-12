import { apiClient, RESERVATION_API_BASE_URL } from "./apiConfig";

const BASE = "/api/v1/auth/customer";
const REFRESH_TOKEN_KEY = "bhanu_customer_refresh_token";
const sessionStorageSafe = () => {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
};
const localStorageSafe = () => {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
};

export const getCustomerRefreshToken = () =>
  sessionStorageSafe()?.getItem(REFRESH_TOKEN_KEY) || localStorageSafe()?.getItem(REFRESH_TOKEN_KEY) || "";
export const setCustomerRefreshToken = (token, rememberMe) => {
  const session = sessionStorageSafe();
  const local = localStorageSafe();
  if (!token) {
    session?.removeItem(REFRESH_TOKEN_KEY);
    local?.removeItem(REFRESH_TOKEN_KEY);
  } else if (rememberMe === true || (rememberMe === undefined && local?.getItem(REFRESH_TOKEN_KEY))) {
    local?.setItem(REFRESH_TOKEN_KEY, token);
    session?.removeItem(REFRESH_TOKEN_KEY);
  } else {
    session?.setItem(REFRESH_TOKEN_KEY, token);
    local?.removeItem(REFRESH_TOKEN_KEY);
  }
};

const customerAuthRequest = async (path, body, options = {}) => {
  const result = await apiClient(`${BASE}/${path}`, {
    method: "POST",
    baseUrl: RESERVATION_API_BASE_URL,
    skipDefaultAuth: true,
    remoteOnly: true,
    ...options,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const response = result.data?.data || result.data;
  if (result.success && response?.success === false) {
    return { ...result, success: false, error: response.message || response.error || "The request was rejected." };
  }
  return result;
};

export const apiCustomerRegister = (data) => customerAuthRequest("register", data);
export const apiCustomerLogin = (emailOrMobile, password, rememberMe) =>
  customerAuthRequest("login", { emailOrMobile, password, rememberMe });
export const apiCustomerVerifyOtp = (emailOrMobile, otp, purpose, rememberMe = false) =>
  customerAuthRequest("verify-otp", { emailOrMobile, otp, purpose, rememberMe });
export const apiCustomerResendOtp = (emailOrMobile, purpose) =>
  customerAuthRequest("resend-otp", { emailOrMobile, purpose });
export const apiCustomerForgotPassword = (emailOrMobile) =>
  customerAuthRequest("forgot-password", { emailOrMobile });
export const apiCustomerResetPassword = (data) => customerAuthRequest("reset-password", data);
export const apiCustomerRefreshToken = (refreshToken = getCustomerRefreshToken()) =>
  customerAuthRequest("refresh-token", { refreshToken });
export const apiCustomerLogout = (refreshToken, logoutAllSessions = false, accessToken = "") =>
  customerAuthRequest("logout", { refreshToken, logoutAllSessions }, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
