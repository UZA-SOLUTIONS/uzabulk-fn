import moment from "moment";
import DOMPurify from 'dompurify';

export const ENVIRONMENT = process.env.REACT_APP_ENVIORNMENT || "production";

const DEVICE_ID_STORE = "uza-retail-device-id";
const COUPON_CODE = "uza-retail-coupon";

export const logger = (...params) => {
  if (ENVIRONMENT === "development")
    console.log(...params);
};

export const smoothScrollToTop = () => {
  document.body.scrollTo({ top: 0, behavior: "smooth" });
};

export const handlePageClick = ({ setSkip = () => { }, fetchRecords = () => { } }) => (event) => {
  setSkip(event.selected + 1);
  fetchRecords(event.selected + 1);
  smoothScrollToTop();
};
export const fromNow = (date) => {
  const now = moment();
  const createdAtMoment = moment(date);
  const fromNow = now.diff(createdAtMoment, "days");

  return fromNow - (fromNow % 10) + 10;
};

export const isEqualArray = (arr1, arr2) => {
  arr1.sort();
  arr2.sort();
  return JSON.stringify(arr1) === JSON.stringify(arr2);
};

export const fixedNumber = (number, toFix = 2) => {
  return Number(parseFloat(number).toFixed(toFix));
};

export const formatNumber = (number, toFix = 2, isString = false) => {
  return fixedNumber(number, toFix, isString).toLocaleString('en-US');
};

export const scrollToId = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

// Generate a unique identifier (UUID)
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

export const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_STORE);
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(DEVICE_ID_STORE, deviceId);
  }

  return deviceId;
}


export const setCoupon = (coupon = "") => {
  localStorage.setItem(COUPON_CODE, coupon);
}


export const getCoupon = () => {
  return localStorage.getItem(COUPON_CODE) || "";
}

export const parseText = (text) => {
  const formattedDescription = (text || "").replace(/(?:\\r\n|\\r|\\n)/g, ' ');

  return DOMPurify.sanitize(formattedDescription);
}

/** Browser-only; safe when this module is evaluated in Node during tests. */
function getBrowserLocation() {
  if (typeof window === "undefined") return null;
  return window.location;
}

const getMediaOrigin = () => {
  const api = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
  if (api) return api;
  const loc = getBrowserLocation();
  if (loc?.origin) {
    return loc.origin.replace(/\/+$/, "");
  }
  return "";
};

/**
 * Turn API image fields (absolute URL, "/path", or "uploads/…") into a usable <img src>.
 */
export const resolveMediaUrl = (value) => {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    return resolveMediaUrl(
      value.link || value.url || value.src || value.path || ""
    );
  }
  const raw = String(value).trim();
  if (!raw) return "";
  const unquoted = raw.replace(/^['"]+|['"]+$/g, "");
  if (!unquoted) return "";
  if (/^(https?:|data:|blob:)/i.test(unquoted)) return unquoted;
  if (unquoted.startsWith("//")) {
    const loc = getBrowserLocation();
    if (loc?.protocol) {
      return `${loc.protocol}${unquoted}`;
    }
    return `https:${unquoted}`;
  }
  const origin = getMediaOrigin();
  if (!origin) return unquoted.startsWith("/") ? unquoted : "";
  if (unquoted.startsWith("/")) return `${origin}${unquoted}`;
  return `${origin}/${unquoted.replace(/^\/+/, "")}`;
};

export const getProductImageUrl = (product, fallback = "") => {
  const candidates = [];
  if (product?.featured_image != null) candidates.push(product.featured_image);
  if (Array.isArray(product?.images)) {
    candidates.push(...product.images);
  }
  for (const c of candidates) {
    const u = resolveMediaUrl(c);
    if (u) return u;
  }
  return resolveMediaUrl(fallback);
};

export const amountConversion = (amount, config, toFix = 2, isString = false) => {
  let finalAmount = amount;

  // If commission is present in config, adjust the amount accordingly (uncomment if needed)
  // const commission = config?.commission?.per_product || 0;
  // finalAmount = finalAmount + ((commission * finalAmount) / 100);

  // Get the fixed number for the amount, ensuring a non-zero value for very small numbers
  const fixedValue = fixedNumber(finalAmount, toFix, isString);

  // If isString is true, fixedNumber already returns a string, so no need for further formatting
  if (isString) return fixedValue;

  // Convert the fixed amount to a localized string
  return fixedValue.toLocaleString('en-US');
};