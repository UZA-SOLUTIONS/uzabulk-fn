// src/apiHelper.js
import axios from "axios";
import { toast } from "react-toastify";
import { getAuthToken, removeAuthInfo } from "./authHelper";
import ROUTES from "./routesHelper";
import { getDeviceId } from "./deviceHelper";
import { getCurrencySymbol } from "./currencyHelper";
import { getLanguageCode } from "./languageHelper";
import i18n from "../i18n";

const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:1302").replace(/\/+$/, "");

const logger = (...params) => {
  if (process.env.REACT_APP_ENVIORNMENT === "development") {
    console.log(...params);
  }
};

// Create an instance of axios with default settings
const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 0,
  headers: {
    "Content-Type": "application/json",
  },
});
let requestInterceptorId = null;

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

    const message = error?.response?.data?.message
      || error?.message
      || i18n.t("common.somethingWentWrong");

    // Do not show a global toast for network/timeout/offline failures — callers can handle UX; avoids noisy "check backend" toasts.
    if (!suppressGlobalErrorToast && !isNetworkError) {
      toast.error(message);
    }

    logger("ERROR RESPONSE ::: ", error);
    // Handle response errors
    if (error.response && error.response.status === 401) {
      const reqUrl = `${error?.config?.baseURL || ""}${error?.config?.url || ""}`;
      const isAuthRoute =
        /users\/login\b/i.test(reqUrl)
        || /users\/register\b/i.test(reqUrl)
        || /users\/verify/i.test(reqUrl)
        || /users\/forgotPassword/i.test(reqUrl)
        || /users\/resetPassword/i.test(reqUrl);
      if (isAuthRoute) {
        return Promise.reject(error?.response?.data || error);
      }
      const hasToken = !!getAuthToken();
      if (hasToken) {
        removeAuthInfo();
        window.location.href = `${ROUTES.HOME}?auth=signin`;
      }
    }
    return Promise.reject(error?.response?.data || error);
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

export const apiPost = async (url, data = {}) => {
  return apiClient.post(url, data);
};

export const apiPut = async (url, data = {}) => {
  return apiClient.put(url, data);
};

export const apiDelete = async (url) => {
  return apiClient.delete(url);
};

// Export the apiClient if you need to use it directly for advanced use cases
export default apiClient;
