// src/apiHelper.js
import axios from "axios";
import { toast } from "react-toastify";
import { getAuthToken, removeAuthInfo } from "./authHelper";
import ROUTES from "./routesHelper";
import { getDeviceId } from "./deviceHelper";
import { getCurrencySymbol } from "./currencyHelper";
import { getLanguageCode } from "./languageHelper";
import i18n from "../i18n";

const API_URL = (process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:1302")).replace(/\/+$/, "");

const logger = (...params) => {
  if (process.env.REACT_APP_ENVIORNMENT === "development") {
    console.log(...params);
  }
};

const API_REQUEST_TIMEOUT_MS = Number(process.env.REACT_APP_API_TIMEOUT_MS) || 0;

// Create an instance of axios with default settings
const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  ...(API_REQUEST_TIMEOUT_MS > 0 ? { timeout: API_REQUEST_TIMEOUT_MS } : {}),
  headers: {
    "Content-Type": "application/json",
  },
});
let requestInterceptorId = null;
let isForceLoggingOut = false;

const isAuthCredentialRoute = (reqUrl = "") =>
  /users\/login\b/i.test(reqUrl)
  || /users\/register\b/i.test(reqUrl)
  || /users\/verify/i.test(reqUrl)
  || /users\/forgotPassword/i.test(reqUrl)
  || /users\/resetPassword/i.test(reqUrl);

/** Backend locale for INVALID_TOKEN is "Token Expired!" / "Jeton expiré !" */
const isExpiredTokenMessage = (message = "") => {
  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("token expired")
    || normalized.includes("jeton expiré")
    || normalized === "invalid_token"
    || normalized.includes("invalid token")
  );
};

const forceLogoutToSignIn = () => {
  if (isForceLoggingOut || typeof window === "undefined") return;
  isForceLoggingOut = true;
  removeAuthInfo();
  window.location.href = `${ROUTES.HOME}?auth=signin`;
};

// Response interceptor (for handling responses and errors globally)
apiClient.interceptors.response.use(
  (response) => response.data || null,
  (error) => {
    const suppressGlobalErrorToast = !!error?.config?.suppressGlobalErrorToast;
    const isCanceledRequest = axios.isCancel(error)
      || error?.code === "ERR_CANCELED"
      || error?.name === "CanceledError"
      || error?.name === "AbortError";
    if (isCanceledRequest) {
      return Promise.reject(error);
    }

    const isNetworkError = !error?.response;
    const responseData = error?.response?.data;
    const httpStatus = error?.response?.status;
    const bodyStatusCode = Number(responseData?.status_code);
    const message = responseData?.message
      || error?.message
      || i18n.t("common.somethingWentWrong");

    const reqUrl = `${error?.config?.baseURL || ""}${error?.config?.url || ""}`;
    const isAuthRoute = isAuthCredentialRoute(reqUrl);
    const hasToken = !!getAuthToken();

    // Prefer session cleanup over toast when the stored token is no longer valid.
    const shouldForceLogout = !isAuthRoute
      && hasToken
      && (
        httpStatus === 401
        || bodyStatusCode === 401
        || isExpiredTokenMessage(message)
      );

    if (shouldForceLogout) {
      logger("SESSION EXPIRED — forcing logout ::: ", error);
      forceLogoutToSignIn();
      return Promise.reject(responseData || error);
    }

    // Do not show a global toast for network/timeout/offline failures — callers can handle UX; avoids noisy "check backend" toasts.
    if (!suppressGlobalErrorToast && !isNetworkError) {
      toast.error(message);
    }

    logger("ERROR RESPONSE ::: ", error);
    return Promise.reject(responseData || error);
  }
);

export const updateAuthToken = () => {
  // Keep exactly one request interceptor to avoid stacking duplicates.
  if (requestInterceptorId !== null) {
    apiClient.interceptors.request.eject(requestInterceptorId);
  }

  requestInterceptorId = apiClient.interceptors.request.use(
    (config) => {
      // Modify the request config before sending the request
      const token = getAuthToken(); // Example: Get token from localStorage
      config.headers.DeviceId = getDeviceId();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (config.headers?.Authorization) {
        delete config.headers.Authorization;
      }
      config.headers["Accept-Currency"] = getCurrencySymbol(); // Set the custom header for currency
      config.headers["Accept-Language"] = getLanguageCode();
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      }
      return config;
    },
    (error) => {
      // Handle request errors
      return Promise.reject(error);
    }
  );
};
updateAuthToken();

// Basic functions for making API calls
export const apiGet = async (url, params = {}) => {
  const { suppressGlobalErrorToast, signal, ...query } = params || {};
  return apiClient.get(url, {
    params: query,
    ...(signal ? { signal } : {}),
    ...(suppressGlobalErrorToast ? { suppressGlobalErrorToast: true } : {}),
  });
};

export const apiPost = async (url, data = {}, config = {}) => {
  return apiClient.post(url, data, config);
};

export const apiPut = async (url, data = {}) => {
  return apiClient.put(url, data);
};

export const apiDelete = async (url, config = {}) => {
  return apiClient.delete(url, config);
};

// Export the apiClient if you need to use it directly for advanced use cases
export default apiClient;
