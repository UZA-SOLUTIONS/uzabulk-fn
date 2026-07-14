import moment from "moment";
import DOMPurify from 'dompurify';
import ROUTES from "./routesHelper";
import { apiGet } from "./apiHelper";
import { PRODUCTS } from "./urlHelper";

export const ENVIRONMENT = process.env.REACT_APP_ENVIORNMENT || "production";

const COUPON_CODE = "uza-retail-coupon";

export { generateUUID, getDeviceId } from "./deviceHelper";
export { bumpHomeFeedRefreshToken, bumpHomeFeedRefreshTokenOnReload, getHomeFeedRefreshToken } from "./homeFeedHelper";

export const logger = (...params) => {
  if (ENVIRONMENT === "development")
    console.log(...params);
};

export const scrollToTop = (behavior = "auto") => {
  if (typeof window === "undefined") return;
  try {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  } catch (_) {
    /* ignore */
  }
  window.scrollTo({ top: 0, left: 0, behavior });
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
};

export const smoothScrollToTop = () => {
  scrollToTop("smooth");
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

/** Stable key for deduplicating catalog rows (_id, id, productId, offerId). */
export const getProductDedupeKey = (item) => {
  const id = String(item?._id || item?.id || item?.productId || "").trim();
  if (id) return `id:${id}`;
  const offer = String(item?.offerId || item?.topIds || "").trim();
  if (offer) return `offer:${offer}`;
  return "";
};

const normalizeCatalogText = (value = "") =>
  String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

const collectCatalogText = (item) => {
  if (!item) return "";
  const categoryNames = []
    .concat(item?.category?.name, item?.category?.catName)
    .concat(
      Array.isArray(item?.categories)
        ? item.categories.map((cat) => (typeof cat === "string" ? "" : cat?.name || cat?.catName))
        : []
    )
    .filter(Boolean)
    .join(" ");

  return [
    item?.name,
    item?.title,
    item?.short_description,
    item?.description,
    categoryNames,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
};

const SENSITIVE_CATALOG_PATTERNS = [
  /\bunderwear\b/i,
  /\bunderwears\b/i,
  /\blingerie\b/i,
  /\bintimates?\b/i,
  /\bpanties\b/i,
  /\bpanty\b/i,
  /\bbriefs\b/i,
  /\bthong\b/i,
  /\bthongs\b/i,
  /\bunderpants\b/i,
  /\bknickers\b/i,
  /\bboxer\s+shorts\b/i,
  /\bmen['']s\s+underwear\b/i,
  /\bwomen['']s\s+underwear\b/i,
  /\bladies['']?\s+underwear\b/i,
  /\bsexy\s+lingerie\b/i,
  /\bsexy\s+underwear\b/i,
  /\blace\s+bra\b/i,
  /\bbra\s+set\b/i,
  /\bsports?\s+bra\b/i,
  /\bbra\s+and\s+panty\b/i,
  /\bqqny\b/i,
  /\bphysiological\s+pants\b/i,
  /\bperiod\s+panties\b/i,
  /\bnightwear\b/i,
  /\bsleepwear\b/i,
  /内衣/u,
  /内裤/u,
  /文胸/u,
  /情趣/u,
  /生理裤/u,
];

const EXPLICIT_SENSITIVE_SEARCH_PATTERNS = [
  /\bunderwear\b/i,
  /\blingerie\b/i,
  /\bintimates?\b/i,
  /\bpanties\b/i,
  /\bpanty\b/i,
  /\bbriefs\b/i,
  /\bthong\b/i,
  /\bbra\b/i,
  /\bboxers?\b/i,
  /内衣/u,
  /内裤/u,
  /文胸/u,
];

const matchesSensitivePatterns = (text = "", patterns = SENSITIVE_CATALOG_PATTERNS) => {
  const normalized = normalizeCatalogText(text);
  if (!normalized) return false;
  return patterns.some((pattern) => pattern.test(normalized) || pattern.test(text));
};

export const isBlockedCatalogProduct = (item) => {
  if (!item) return true;
  const combined = collectCatalogText(item);
  if (!combined || /\btest\b/i.test(combined)) return true;
  return false;
};

export const isSensitiveCatalogProduct = (item) => {
  if (!item) return false;
  return matchesSensitivePatterns(collectCatalogText(item));
};

export const isExplicitSensitiveSearch = (search = "") => matchesSensitivePatterns(
  String(search || ""),
  EXPLICIT_SENSITIVE_SEARCH_PATTERNS
);

export const isRestrictedCatalogProduct = (item) => isBlockedCatalogProduct(item);

const resolveCatalogVisibilityOptions = (options = {}) => {
  const search = String(options?.search || "").trim();
  const categoryLabels = [
    options?.categoryName,
    ...(Array.isArray(options?.categoryNames) ? options.categoryNames : []),
  ]
    .map((label) => String(label || "").trim())
    .filter(Boolean);

  if (isExplicitSensitiveSearch(search) || categoryLabels.some((label) => matchesSensitivePatterns(label))) {
    return { ...options, search, maxSensitive: Number.MAX_SAFE_INTEGER };
  }

  const maxSensitive = Number.isFinite(Number(options?.maxSensitive))
    ? Math.max(0, Number(options.maxSensitive))
    : 0;

  return { ...options, search, maxSensitive };
};

export const balanceCatalogProducts = (items = [], options = {}) => {
  if (!Array.isArray(items) || !items.length) return [];

  const { maxSensitive } = resolveCatalogVisibilityOptions(options);
  const usable = items.filter((item) => !isBlockedCatalogProduct(item));

  if (maxSensitive === Number.MAX_SAFE_INTEGER) return usable;

  const regular = [];
  const sensitive = [];

  usable.forEach((item) => {
    if (isSensitiveCatalogProduct(item)) sensitive.push(item);
    else regular.push(item);
  });

  const cap = Math.max(0, Number(maxSensitive) || 0);
  if (!cap) return regular;

  return [...regular, ...sensitive.slice(0, cap)];
};

export const isValidHomeCatalogProduct = (item) => {
  if (!item) return false;
  if (!getProductDedupeKey(item)) return false;
  if (isBlockedCatalogProduct(item)) return false;
  if (isSensitiveCatalogProduct(item)) return false;
  const name = (item?.name || "").trim();
  if (!name || name.toLowerCase().includes("test")) return false;
  return true;
};

export const dedupeProducts = (items = []) => {
  const seen = new Set();
  const unique = [];
  (items || []).forEach((item) => {
    const key = getProductDedupeKey(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  return unique;
};

export const mergeUniqueProducts = (existing = [], incoming = []) => {
  const seen = new Set((existing || []).map(getProductDedupeKey).filter(Boolean));
  const merged = [...(existing || [])];
  (incoming || []).forEach((item) => {
    const key = getProductDedupeKey(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
};

export const normalizeHomeCatalogProducts = (items = [], { excludeKeys = null } = {}) => {
  const exclude = excludeKeys instanceof Set ? excludeKeys : null;
  const balanced = balanceCatalogProducts(dedupeProducts(items));
  return balanced.filter((item) => {
    if (!isValidHomeCatalogProduct(item)) return false;
    if (!exclude?.size) return true;
    const key = getProductDedupeKey(item);
    return key && !exclude.has(key);
  });
};


export const setCoupon = (coupon = "") => {
  localStorage.setItem(COUPON_CODE, coupon);
}


export const getCoupon = () => {
  return localStorage.getItem(COUPON_CODE) || "";
}

export const parseText = (text) => {
  const formattedDescription = (text || "").replace(/(?:\\r\n|\\r|\\n)/g, ' ');

  return DOMPurify.sanitize(formattedDescription);
};

const DESCRIPTION_API_BASE = (
  process.env.REACT_APP_API_URL || "http://localhost:1302"
).replace(/\/+$/, "");

const EXTERNAL_DESCRIPTION_IMAGE_RE = /alicdn\.com|alibaba\.com|1688\.com/i;
const PROXIED_DESCRIPTION_IMAGE_RE = /\/products\/description-image(?:\/|\?url=)/i;

const normalizeExternalImageUrl = (raw = "") => {
  let value = String(raw || "").trim().replace(/^['"]+|['"]+$/g, "");
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  return value;
};

const encodeImageUrlParam = (url = "") => {
  const bytes = new TextEncoder().encode(String(url || ""));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const buildDescriptionImageProxyUrl = (rawUrl = "") => {
  const imageUrl = normalizeExternalImageUrl(rawUrl);
  if (!imageUrl || !EXTERNAL_DESCRIPTION_IMAGE_RE.test(imageUrl)) return imageUrl;
  if (PROXIED_DESCRIPTION_IMAGE_RE.test(imageUrl)) return imageUrl;
  if (!DESCRIPTION_API_BASE) return imageUrl;
  return `${DESCRIPTION_API_BASE}/api/v1/products/description-image/${encodeImageUrlParam(imageUrl)}`;
};

const stripEmptyDescriptionTemplates = (html = "") => (
  String(html || "")
    .replace(/<div[^>]*id=["']offer-template-0["'][^>]*>\s*<\/div>/gi, "")
);

const rewriteDescriptionImages = (html = "") => {
  if (!html) return html;

  return html.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawSrc = srcMatch ? (srcMatch[2] || srcMatch[3] || srcMatch[4] || "") : "";
    const proxied = buildDescriptionImageProxyUrl(rawSrc);

    let next = attrs;
    if (proxied && proxied !== normalizeExternalImageUrl(rawSrc)) {
      next = attrs.replace(
        /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i,
        `src="${proxied}"`
      );
    }
    if (!/referrerpolicy\s*=/i.test(next)) {
      next += ' referrerpolicy="no-referrer"';
    }
    if (!/loading\s*=/i.test(next)) {
      next += ' loading="lazy"';
    }
    if (!/decoding\s*=/i.test(next)) {
      next += ' decoding="async"';
    }
    return `<img${next}>`;
  });
};

export const parseProductDescription = (text) => {
  const formatted = String(text || "").replace(/(?:\\r\n|\\r|\\n)/g, " ");
  if (!formatted.trim()) return "";

  const proxied = rewriteDescriptionImages(formatted);
  const cleaned = stripEmptyDescriptionTemplates(proxied);
  if (!cleaned.trim()) return "";

  // Catalog HTML is trusted API content — DOMPurify was stripping 1688 image markup.
  return cleaned;
};

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

const pickMediaField = (obj) => {
  if (!obj || typeof obj !== "object") return "";
  const fields = [obj.link, obj.url, obj.src, obj.path, obj.default];
  for (const field of fields) {
    if (typeof field === "string" && field.trim()) return field.trim();
  }
  return "";
};

/**
 * Turn API image fields (absolute URL, "/path", or "uploads/…") into a usable <img src>.
 */
export const resolveMediaUrl = (value) => {
  if (value == null || value === "") return "";
  if (typeof value === "function") return "";
  if (typeof value === "object") {
    return resolveMediaUrl(pickMediaField(value));
  }
  const raw = String(value).trim();
  if (!raw || /^function\s+\w*\s*\(\)\s*\{\s*\[native code\]\s*\}$/i.test(raw)) return "";
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

export const getUserAvatarUrl = (user) => {
  if (!user) return "";
  return resolveMediaUrl(user.profileImage);
};

export const getUserInitials = (user) => {
  const name = String(user?.name || user?.hintName || user?.email || "U").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/** MongoDB ObjectId string (24 hex). */
export const looksLikeMongoProductId = (value) =>
  /^[a-fA-F0-9]{24}$/.test(String(value || "").trim());

/** 1688 numeric offer id (not a Mongo ObjectId). */
export const looksLike1688OfferId = (value) => {
  const s = String(value || "").trim();
  if (!/^\d+$/.test(s) || s.length < 4 || s.length > 30) return false;
  if (s.length === 24 && /^[a-fA-F0-9]{24}$/.test(s)) return false;
  return true;
};

export const extractMongoProductId = (item) => {
  const raw = item?._id ?? item?.id ?? item?.productId;
  if (raw && typeof raw === "object" && raw.$oid) {
    return String(raw.$oid).trim();
  }
  return String(raw || "").trim();
};

/** Resolve canonical Mongo _id (via by-offer when needed). */
export const resolveCatalogProductId = async (item) => {
  const offerId = String(item?.offerId || item?.topIds || "").trim();
  const mongoId = extractMongoProductId(item);

  if (looksLike1688OfferId(offerId)) {
    try {
      const res = await apiGet(`${PRODUCTS.BY_OFFER}/${encodeURIComponent(offerId)}`, {
        suppressGlobalErrorToast: true,
      });
      const resolved = String(res?.data?._id || "").trim();
      if (looksLikeMongoProductId(resolved)) {
        return { mongoId: resolved, offerId };
      }
    } catch {
      // fall through
    }
  }

  if (looksLikeMongoProductId(mongoId)) {
    return { mongoId, offerId: offerId || undefined };
  }

  if (looksLike1688OfferId(mongoId)) {
    try {
      const res = await apiGet(`${PRODUCTS.BY_OFFER}/${encodeURIComponent(mongoId)}`, {
        suppressGlobalErrorToast: true,
      });
      const resolved = String(res?.data?._id || "").trim();
      if (looksLikeMongoProductId(resolved)) {
        return { mongoId: resolved, offerId: mongoId };
      }
    } catch {
      // fall through
    }
  }

  return null;
};

/** Product detail URL: prefers catalog _id; always passes offerId when known. */
export const buildProductDetailUrl = (item, options = {}) => {
  const offerId = String(item?.offerId || item?.topIds || "").trim();
  const mongoId = extractMongoProductId(item);
  let pathId = "";

  if (looksLikeMongoProductId(mongoId)) {
    pathId = mongoId;
  } else if (looksLike1688OfferId(offerId)) {
    pathId = offerId;
  } else if (looksLike1688OfferId(mongoId)) {
    pathId = mongoId;
  } else {
    pathId = mongoId || offerId;
  }

  if (!pathId) return null;

  const params = new URLSearchParams();
  if (offerId) {
    params.set("offerId", offerId);
  }
  if (options.redirectUrl) {
    params.set("redirectUrl", options.redirectUrl);
  }
  const qs = params.toString();
  return `${ROUTES.PRODUCT_DETAIL}/${encodeURIComponent(pathId)}${qs ? `?${qs}` : ""}`;
};

export const buildProductDetailUrlFromResolved = ({ mongoId, offerId } = {}, options = {}) => {
  if (!looksLikeMongoProductId(mongoId)) return null;
  const params = new URLSearchParams();
  if (offerId) params.set("offerId", String(offerId));
  if (options.redirectUrl) params.set("redirectUrl", options.redirectUrl);
  const qs = params.toString();
  return `${ROUTES.PRODUCT_DETAIL}/${encodeURIComponent(mongoId)}${qs ? `?${qs}` : ""}`;
};

/** Open product detail in a new tab (falls back to in-app navigate when newTab is false). */
export const openProductDetail = (navigate, item, options = {}) => {
  if (!item) return false;
  const path = buildProductDetailUrl(item, options);
  if (!path) return false;
  const openInNewTab = options.newTab !== false;
  if (openInNewTab && typeof window !== "undefined") {
    window.open(path, "_blank", "noopener,noreferrer");
    return true;
  }
  if (typeof navigate !== "function") return false;
  navigate(path);
  if (options.scrollTop !== false) {
    smoothScrollToTop();
  }
  return true;
};

export const getProductImageUrl = (product, fallback = "") => {
  const candidates = [];
  if (product?.featured_image != null) candidates.push(product.featured_image);
  if (product?.image != null) candidates.push(product.image);
  if (product?.imageUrl != null) candidates.push(product.imageUrl);
  if (product?.thumbnail != null) candidates.push(product.thumbnail);
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